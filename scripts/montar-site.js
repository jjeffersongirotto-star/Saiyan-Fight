// scripts/montar-site.js — monta o site do GitHub Pages (workflow .github/workflows/pages.yml):
//  - raiz: o jogo novo construído (novo/dist, `cd novo && npm ci && npm run build`);
//  - antigo/: o jogo antigo (HTML/JS da raiz do repositório), inteiro, como era servido antes da troca (v0.121).
// Os dois ficam no mesmo endereço (jjeffersongirotto-star.github.io), então o progresso salvo de cada um continua
// no navegador: o jogo novo usa chaves próprias (saiyan-novo-*) e só LÊ as do antigo.
// Uso: node scripts/montar-site.js [saida=_site]
"use strict";
const fs = require("fs");
const path = require("path");
const { copiarJogoAntigo } = require("./android/copiar-web.js");

const RAIZ = path.resolve(__dirname, "..");
const saida = path.resolve(RAIZ, process.argv[2] || "_site");
const dist = path.resolve(process.env.SAIYAN_DIST || path.join(RAIZ, "novo", "dist"));
if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error(`${dist}/index.html não existe: construa o jogo novo antes (cd novo && npm run build)`);
fs.rmSync(saida, { recursive: true, force: true });
fs.cpSync(dist, saida, { recursive: true });
if (fs.existsSync(path.join(saida, "antigo"))) throw new Error("o jogo novo não pode ter uma pasta antigo/");
copiarJogoAntigo(path.join(saida, "antigo"));
fs.writeFileSync(path.join(saida, ".nojekyll"), "");
console.log(`site pronto em ${path.relative(RAIZ, saida) || "."}: jogo novo na raiz, jogo antigo em antigo/`);
