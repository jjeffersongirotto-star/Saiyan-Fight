// scripts/android/copiar-web.js — monta a pasta www/ (a webDir do Capacitor) com o JOGO NOVO já construído
// (novo/dist, feito por `cd novo && npm ci && npm run build`). Desde a v0.121 o app e o site são o jogo novo
// (Phaser + TypeScript, pasta novo/); o jogo antigo (HTML/JS da raiz) continua no site em /antigo/
// (scripts/montar-site.js) e não vai dentro do app (o botão JOGO ANTIGO do app abre o site no navegador).
// Rodar na raiz: `npm run copiar` (ou `node scripts/android/copiar-web.js`). SAIYAN_DIST=<pasta> troca novo/dist.
//
// Versões:
//  - jogo (pacote web): a versão 0.X do novo/package.json ("0.121.0" → "0.121") + BUILD_WEB = número de commits
//    do repositório (sempre sobe a cada merge na main). É isso que a setinha ATUALIZAR do APK compara.
//  - APK (casca nativa): <major>.<minor> do package.json da raiz + <patch> = o mesmo número de commits. O <minor> é
//    a "geração" da casca nativa: suba o minor do package.json (1.0.0 → 1.1.0) quando mudar algo em android/, nos
//    plugins do Capacitor ou no capacitor.config.json. Os pacotes web feitos a partir daí exigem esse APK
//    (nativoMinimo = <major>.<minor>.0 no latest.json) e a setinha oferece baixar o APK novo.
//  SAIYAN_APK_PATCH=<n> no ambiente troca o número de commits. Gera www/versao-apk.js (lido pelo jogo novo em
//  src/app/plataforma.ts, carregado antes do script do jogo) e www/versao-apk.json (lido pelo
//  android/app/build.gradle e pelo scripts/android/pacote-web.py).
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..", "..");
const DESTINO = path.join(RAIZ, "www");
// Jogo antigo: pastas com arquivos que ele carrega (imagens, pacotes de sprites, arenas, efeitos, exemplos de
// formato) e os arquivos soltos da raiz. Usado pelo scripts/montar-site.js para a pasta /antigo/ do site.
const PASTAS = ["icons", "conjuntos", "efeitos", "fases", "minions", "formatos"];
const ARQUIVOS_SOLTOS = ["index.html", "tv.html", "manifest.webmanifest"];

function copiarJogoAntigo(destino) {
    fs.mkdirSync(destino, { recursive: true });
    const soltos = ARQUIVOS_SOLTOS.concat(fs.readdirSync(RAIZ).filter(f => f.endsWith(".js")));
    for (const f of soltos) fs.copyFileSync(path.join(RAIZ, f), path.join(destino, f));
    for (const p of PASTAS) fs.cpSync(path.join(RAIZ, p), path.join(destino, p), { recursive: true });
}

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

// Versão do jogo que vai dentro do APK: major.minor do novo/package.json.
function versaoDoJogo() {
    const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, "novo", "package.json"), "utf8"));
    return String(pkg.version).split(".").slice(0, 2).join(".");
}

function main() {
    const dist = path.resolve(process.env.SAIYAN_DIST || path.join(RAIZ, "novo", "dist"));
    if (!fs.existsSync(path.join(dist, "index.html")))
        throw new Error(`${dist}/index.html não existe: construa o jogo novo antes (cd novo && npm ci && npm run build)`);
    fs.rmSync(DESTINO, { recursive: true, force: true });
    fs.cpSync(dist, DESTINO, { recursive: true });

    const { versao, codigo, build, nativoMinimo } = versaoDoApk();
    const jogo = versaoDoJogo();
    fs.writeFileSync(path.join(DESTINO, "versao-apk.js"),
        `// Gerado por scripts/android/copiar-web.js — só existe dentro do APK.\nvar VERSAO_APK = ${JSON.stringify(versao)};\nvar VERSAO_JOGO_NO_APK = ${JSON.stringify(jogo)};\nvar BUILD_WEB = ${build};\n`);
    fs.writeFileSync(path.join(DESTINO, "versao-apk.json"), JSON.stringify({ versao, codigo, jogo, build, nativoMinimo }, null, 2) + "\n");
    // versao-apk.js (script comum) antes do script do jogo (type="module", que roda depois de qualquer jeito)
    let html = fs.readFileSync(path.join(DESTINO, "index.html"), "utf8");
    const i = html.indexOf('<script type="module"');
    if (i < 0) throw new Error('index.html do jogo novo sem <script type="module">');
    html = html.slice(0, i) + '<script src="versao-apk.js"></script>\n    ' + html.slice(i);
    fs.writeFileSync(path.join(DESTINO, "index.html"), html);
    console.log(`www/ pronta (jogo novo): APK ${versao} (código ${codigo}), jogo ${jogo} build ${build}`);
}

module.exports = { copiarJogoAntigo, versaoDoApk, versaoDoJogo, PASTAS, ARQUIVOS_SOLTOS };
if (require.main === module) main();
