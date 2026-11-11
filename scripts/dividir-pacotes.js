// scripts/dividir-pacotes.js — divide um pacote de sprites inteiro (conjuntos/<nome>.json, como sai da montagem
// offline das imagens do Gemini) em um arquivo por forma: conjuntos/<nome>/<variante>.json. O jogo baixa só as
// formas que vai usar (v0.118). Cada arquivo leva os dados comuns (pesY, centroX, k, fps, fpsMov, mime, escala,
// variantes) e, de loop/mao/dedo, só a parte daquela forma.
//
// Uso (na raiz): node scripts/dividir-pacotes.js caminho/goku.json [caminho/vegeta.json ...]
// O pacote inteiro NÃO fica no repositório: depois de dividir, só a pasta conjuntos/<nome>/ é publicada.
"use strict";
const fs = require("fs");
const path = require("path");

const POR_FORMA = ["loop", "mao", "dedo"];

function dividir(arquivo, destinoRaiz) {
    const d = JSON.parse(fs.readFileSync(arquivo, "utf8"));
    const nome = path.basename(arquivo, ".json");
    const variantes = d.variantes || ["normal", "ssj"];
    const pasta = path.join(destinoRaiz, nome);
    fs.mkdirSync(pasta, { recursive: true });
    const comum = {};
    for (const k in d) if (!variantes.includes(k) && !POR_FORMA.includes(k)) comum[k] = d[k];
    const feitos = [];
    for (const v of variantes) {
        if (!d[v]) continue;
        const parte = Object.assign({}, comum, { forma: v });
        parte[v] = d[v];
        for (const k of POR_FORMA) if (d[k] && d[k][v] !== undefined) parte[k] = { [v]: d[k][v] };
        fs.writeFileSync(path.join(pasta, v + ".json"), JSON.stringify(parte));
        feitos.push(v);
    }
    return { nome, feitos };
}

if (require.main === module) {
    const raiz = path.resolve(__dirname, "..", "conjuntos");
    for (const a of process.argv.slice(2)) {
        const r = dividir(a, raiz);
        console.log(`${r.nome}: ${r.feitos.join(", ")}`);
    }
}

module.exports = { dividir };
