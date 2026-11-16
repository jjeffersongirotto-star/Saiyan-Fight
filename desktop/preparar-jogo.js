// desktop/preparar-jogo.js — copia o jogo construído (www/, feito por scripts/android/copiar-web.js a partir de
// novo/dist; ou novo/dist direto) para desktop/jogo/, que vai DENTRO do instalador (extraResources) e é o jogo
// que o app abre sem internet até a primeira atualização pela setinha. Copia também o ícone.
"use strict";
const fs = require("fs");
const path = require("path");
const raiz = path.join(__dirname, "..");
const origem = [path.join(raiz, "www"), path.join(raiz, "novo", "dist")].find((p) => fs.existsSync(path.join(p, "index.html")));
if (!origem) throw new Error("construa o jogo antes: cd novo && npm run build (e node scripts/android/copiar-web.js)");
const destino = path.join(__dirname, "jogo");
fs.rmSync(destino, { recursive: true, force: true });
fs.cpSync(origem, destino, { recursive: true });
fs.copyFileSync(path.join(raiz, "novo", "public", "icons", "icon-512.png"), path.join(__dirname, "icone.png"));
console.log(`jogo copiado de ${path.relative(raiz, origem)} para desktop/jogo/`);
