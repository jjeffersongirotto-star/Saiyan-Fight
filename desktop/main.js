// desktop/main.js — Saiyan Fight para Windows (Electron). Abre o jogo de novo/ que vem dentro do app (sem
// internet) ou a última versão baixada pela setinha ⟳ ATUALIZAR (mesmo pacote da Release "app-bundle" que o app
// Android usa: latest.json + .zip conferido por sha256). Os arquivos são servidos pelo esquema jogo://local/ (o
// jogo usa fetch/XHR e módulos, que não funcionam em file://).
"use strict";
const { app, BrowserWindow, protocol, ipcMain, net, session } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const at = require("./atualizador");

const LATEST_URL = "https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/download/app-bundle/latest.json";
const ESPERA_PRONTO_MS = 20000;

protocol.registerSchemesAsPrivileged([{ scheme: "jogo", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

const dados = () => app.getPath("userData");
const embutida = () => (app.isPackaged ? path.join(process.resourcesPath, "jogo") : path.join(__dirname, "jogo"));
let janela = null;
let vigiaPronto = null;

function abrirJogo() {
  session.defaultSession.clearCache().finally(() => janela && janela.loadURL("jogo://local/index.html"));
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1280, height: 720, minWidth: 800, minHeight: 400, backgroundColor: "#0a0f1f", title: "Saiyan Fight",
    icon: path.join(__dirname, "icone.png"), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  janela.setMenuBarVisibility(false);
  janela.webContents.on("before-input-event", (_e, i) => {
    if (i.type === "keyDown" && i.key === "F11") janela.setFullScreen(!janela.isFullScreen());
  });
  // links de fora (BAIXAR APP etc.) abrem no navegador
  janela.webContents.setWindowOpenHandler(({ url }) => { require("electron").shell.openExternal(url); return { action: "deny" }; });
  janela.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("jogo://")) { e.preventDefault(); require("electron").shell.openExternal(url); } });
  abrirJogo();
}

app.whenReady().then(() => {
  at.conferirAoAbrir(dados());
  protocol.handle("jogo", async (req) => {
    const arq = at.arquivoDoPedido(at.pastaAtiva(dados(), embutida()), req.url);
    if (!arq || !fs.existsSync(arq)) return new Response("não encontrado", { status: 404 });
    // sem cache: ao trocar de versão a mesma URL passa a apontar para outra pasta (e os arquivos já estão no disco)
    const r = await net.fetch(pathToFileURL(arq).toString());
    const h = new Headers(r.headers);
    h.set("Cache-Control", "no-store");
    return new Response(r.body, { status: r.status, headers: h });
  });
  criarJanela();
});
app.on("window-all-closed", () => app.quit());

ipcMain.on("versao-do-app", (e) => { e.returnValue = app.getVersion(); });

ipcMain.handle("procurar", async () => {
  const r = await net.fetch(`${LATEST_URL}?t=${Date.now()}`, { cache: "no-store" });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

// baixa o .zip mandando os bytes REAIS para o jogo, confere o sha256 e instala
ipcMain.handle("baixar", async (e, d) => {
  try {
    const r = await net.fetch(d.url);
    if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
    const total = Number(r.headers.get("content-length")) || Number(d.tamanho) || 0;
    const partes = [];
    let baixados = 0, ultimo = 0;
    const leitor = r.body.getReader();
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      partes.push(Buffer.from(value));
      baixados += value.length;
      const agora = Date.now();
      if (agora - ultimo > 80) { ultimo = agora; e.sender.send("progresso", { baixados, total }); }
    }
    e.sender.send("progresso", { baixados, total: total || baixados });
    const zip = Buffer.concat(partes);
    if (d.sha256 && at.sha256(zip) !== String(d.sha256).toLowerCase()) throw new Error("sha256 não confere");
    at.instalarZip(dados(), zip, d.id, d.build);
    return true;
  } catch (err) {
    console.error("download:", err);
    return false;
  }
});

// troca para a versão nova: abre de novo; se ela não avisar que abriu em 20 s, volta para a anterior
ipcMain.on("reiniciar", () => {
  clearTimeout(vigiaPronto);
  vigiaPronto = setTimeout(() => { at.voltar(dados()); abrirJogo(); }, ESPERA_PRONTO_MS);
  abrirJogo();
});
ipcMain.on("pronto", () => { clearTimeout(vigiaPronto); at.confirmar(dados()); });
