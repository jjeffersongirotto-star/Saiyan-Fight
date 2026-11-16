// desktop/atualizador.js — qual jogo o app abre e como troca para uma versão nova (sem Electron: testado em
// desktop/teste.js). Mesma ideia do @capgo/capacitor-updater do app Android:
//  - o jogo que veio no instalador fica em resources/jogo; cada versão baixada fica em <dados>/pacotes/<id>/;
//  - <dados>/atual.json = { pasta, build, anterior, pendente }: a pasta que o app abre;
//  - depois de trocar, a versão nova precisa avisar que abriu (pronto); se o app fechar ou passar o tempo sem
//    isso, volta para a anterior (uma versão quebrada nunca deixa o jogo sem abrir).
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/** Pasta do jogo a abrir: a baixada (se ainda existe e tem index.html) ou a que veio no instalador. */
function pastaAtiva(dados, embutida) {
  const a = lerAtual(dados);
  if (a && a.pasta && fs.existsSync(path.join(a.pasta, "index.html"))) return a.pasta;
  return embutida;
}

function lerAtual(dados) {
  try { return JSON.parse(fs.readFileSync(path.join(dados, "atual.json"), "utf8")); } catch { return null; }
}
function gravarAtual(dados, a) {
  fs.mkdirSync(dados, { recursive: true });
  fs.writeFileSync(path.join(dados, "atual.json"), JSON.stringify(a, null, 2));
}

/** Ao abrir o app: se a troca anterior nunca confirmou (pendente), volta para a pasta de antes. */
function conferirAoAbrir(dados) {
  const a = lerAtual(dados);
  if (a && a.pendente) { voltar(dados); return "voltou"; }
  return "ok";
}
function voltar(dados) {
  const a = lerAtual(dados);
  if (!a) return;
  if (a.anterior) gravarAtual(dados, { ...a.anterior, pendente: false });
  else fs.rmSync(path.join(dados, "atual.json"), { force: true });
}
/** A versão nova abriu de verdade (o menu do jogo chama). */
function confirmar(dados) {
  const a = lerAtual(dados);
  if (a && a.pendente) gravarAtual(dados, { ...a, pendente: false });
}

/** Instala um .zip já baixado (sha256 conferido antes) e marca como a pasta atual, pendente de confirmação. */
function instalarZip(dados, zipBuffer, id, build) {
  const AdmZip = require("adm-zip");
  const destino = path.join(dados, "pacotes", String(id).replace(/[^\w.-]/g, "_"));
  fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(destino, { recursive: true });
  const zip = new AdmZip(zipBuffer);
  for (const e of zip.getEntries()) {
    const alvo = path.resolve(destino, e.entryName);
    if (!alvo.startsWith(path.resolve(destino) + path.sep)) throw new Error("caminho inválido no pacote");
  }
  zip.extractAllTo(destino, true);
  if (!fs.existsSync(path.join(destino, "index.html"))) throw new Error("pacote sem index.html");
  const antes = lerAtual(dados);
  gravarAtual(dados, { pasta: destino, build: Number(build) || 0, id, pendente: true, anterior: antes && !antes.pendente ? { pasta: antes.pasta, build: antes.build, id: antes.id } : null });
  limparPacotes(dados, destino, antes && antes.pasta);
  return destino;
}
/** guarda só a versão atual e a anterior */
function limparPacotes(dados, ...manter) {
  const base = path.join(dados, "pacotes");
  for (const n of fs.existsSync(base) ? fs.readdirSync(base) : []) {
    const p = path.join(base, n);
    if (!manter.filter(Boolean).some((m) => path.resolve(m) === path.resolve(p))) fs.rmSync(p, { recursive: true, force: true });
  }
}

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

/** Arquivo pedido pelo jogo (jogo://local/<caminho>) dentro da pasta, sem sair dela. */
function arquivoDoPedido(pasta, url) {
  let p = decodeURIComponent(new URL(url).pathname || "/");
  if (p === "/" || p === "") p = "/index.html";
  const alvo = path.resolve(pasta, "." + p);
  if (alvo !== path.resolve(pasta) && !alvo.startsWith(path.resolve(pasta) + path.sep)) return null;
  return alvo;
}

module.exports = { pastaAtiva, lerAtual, gravarAtual, conferirAoAbrir, voltar, confirmar, instalarZip, sha256, arquivoDoPedido };
