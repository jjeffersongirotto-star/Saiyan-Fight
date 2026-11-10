// scripts/android/copiar-web.js — monta a pasta www/ (a webDir do Capacitor) com uma cópia dos arquivos do jogo.
// O jogo continua sendo HTML/CSS/JS puro servido direto da raiz pelo GitHub Pages; esta pasta só existe para o
// APK Android (fica no .gitignore). Rodar na raiz: `npm run copiar` (ou `node scripts/android/copiar-web.js`).
//
// Versões:
//  - jogo (pacote web): a versão 0.X do cabeçalho "(ATUAL)" das UPDATES + BUILD_WEB = número de commits do
//    repositório (sempre sobe a cada merge na main). É isso que a setinha ATUALIZAR do APK compara.
//  - APK (casca nativa): <major>.<minor> do package.json + <patch> = o mesmo número de commits. O <minor> é a
//    "geração" da casca nativa: suba o minor do package.json (1.0.0 → 1.1.0) quando mudar algo em android/, nos
//    plugins do Capacitor ou no capacitor.config.json. Os pacotes web feitos a partir daí exigem esse APK
//    (nativoMinimo = <major>.<minor>.0 no latest.json) e a setinha oferece baixar o APK novo.
//  SAIYAN_APK_PATCH=<n> no ambiente troca o número de commits. Gera www/versao-apk.js (lido pelo atualizacao.js)
//  e www/versao-apk.json (lido pelo android/app/build.gradle e pelo scripts/android/pacote-web.py).
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..", "..");
const DESTINO = path.join(RAIZ, "www");
// Pastas com arquivos que o jogo carrega (imagens, pacotes de sprites, arenas, efeitos, exemplos de formato).
const PASTAS = ["icons", "conjuntos", "efeitos", "fases", "minions", "formatos"];
const ARQUIVOS_SOLTOS = ["index.html", "tv.html", "manifest.webmanifest"];

function versaoDoApk() {
    const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, "package.json"), "utf8"));
    const [major, minor] = String(pkg.version).split(".").map(n => parseInt(n, 10) || 0);
    let patch = parseInt(process.env.SAIYAN_APK_PATCH, 10);
    if (!Number.isFinite(patch)) {
        try { patch = parseInt(execSync("git rev-list --count HEAD", { cwd: RAIZ }).toString().trim(), 10) || 0; }
        catch (e) { patch = 0; }
    }
    return { versao: `${major}.${minor}.${patch}`, codigo: major * 1000000 + minor * 10000 + patch, build: patch, nativoMinimo: `${major}.${minor}.0` };
}

// Versão do jogo que vai dentro do APK: o cabeçalho "(ATUAL)" da lista de UPDATES.
function versaoDoJogo(html) {
    const m = /<h3>Versão ([0-9.]+) \(ATUAL\)<\/h3>/.exec(html);
    return m ? m[1] : "";
}

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });
const soltos = ARQUIVOS_SOLTOS.concat(fs.readdirSync(RAIZ).filter(f => f.endsWith(".js")));
for (const f of soltos) fs.copyFileSync(path.join(RAIZ, f), path.join(DESTINO, f));
for (const p of PASTAS) fs.cpSync(path.join(RAIZ, p), path.join(DESTINO, p), { recursive: true });

const { versao, codigo, build, nativoMinimo } = versaoDoApk();
let html = fs.readFileSync(path.join(DESTINO, "index.html"), "utf8");
const jogo = versaoDoJogo(html);
fs.writeFileSync(path.join(DESTINO, "versao-apk.js"),
    `// Gerado por scripts/android/copiar-web.js — só existe dentro do APK.\nvar VERSAO_APK = ${JSON.stringify(versao)};\nvar VERSAO_JOGO_NO_APK = ${JSON.stringify(jogo)};\nvar BUILD_WEB = ${build};\n`);
fs.writeFileSync(path.join(DESTINO, "versao-apk.json"), JSON.stringify({ versao, codigo, jogo, build, nativoMinimo }, null, 2) + "\n");
const tagAtualizacao = '<script src="atualizacao.js"></script>';
if (!html.includes(tagAtualizacao)) throw new Error("index.html sem <script src=\"atualizacao.js\">");
html = html.replace(tagAtualizacao, '<script src="versao-apk.js"></script>\n    ' + tagAtualizacao);
fs.writeFileSync(path.join(DESTINO, "index.html"), html);
console.log(`www/ pronta: APK ${versao} (código ${codigo}), jogo ${jogo || "?"} build ${build}`);
