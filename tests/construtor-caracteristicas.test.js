// tests/construtor-caracteristicas.test.js — construtor de personagem: gênero, características separadas da raça
// (orelhas, antenas/chifres, marcas, cicatrizes) e roupa de baixo: sem calça fica de cueca; mulher sem roupa em
// cima fica de top. Personagens salvos antes continuam com o mesmo visual.
//
// Uso: node tests/construtor-caracteristicas.test.js

const fs = require("fs");
const sp = require("../sprites.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const P = sp.SPRITE_PRESETS;
const svg = (a) => sp.generateSpriteFrameSvg(a, "idle", 0);
const nu = { outerShirt: "none", innerShirt: "nenhuma", pants: "nenhuma", shoes: "descalco", gloves: "nenhuma", symbol: "none" };
const homem = Object.assign({}, P.goku.appearance, nu);
const mulher = Object.assign({}, homem, { gender: "feminino" });
const cor = (a, c) => Object.assign({}, a, { secondaryColor: c });

// ---------- roupa de baixo ----------
check("homem sem calça fica de cueca", svg(cor(homem, "#ff0000")) !== svg(cor(homem, "#0000ff")));
check("homem de calça e sem camisa: sem top", svg(cor(Object.assign({}, homem, { pants: "larga" }), "#ff0000")) === svg(cor(Object.assign({}, homem, { pants: "larga" }), "#0000ff")));
check("mulher sem roupa em cima fica de top", svg(cor(Object.assign({}, mulher, { pants: "larga" }), "#ff0000")) !== svg(cor(Object.assign({}, mulher, { pants: "larga" }), "#0000ff")));
// forma final do Freeza (a armadura é o próprio corpo); a 1ª forma usa short preto de propósito
const formaFinal = Object.assign({}, P.freeza.appearance, { build: "normal", headFeature: "none", bodyMarks: "freeza", outerShirt: "armadura_freeza", gloves: "nenhuma", shoes: "pes_garras", skinColor: "" });
check("Freeza (armadura do corpo) não ganha cueca", svg(cor(formaFinal, "#ff0000")) === svg(cor(formaFinal, "#0000ff")));
check("corpo feminino é diferente do masculino", svg(mulher) !== svg(homem));
check("Androide 18 é mulher", sp.normalizeAppearance(P.android18.appearance).gender === "feminino");

// ---------- características separadas da raça (personagens salvos antes continuam iguais) ----------
const velho = (a) => { const b = Object.assign({}, a); delete b.headFeature; delete b.bodyMarks; delete b.gender; return sp.normalizeAppearance(b); };
const pic = velho(Object.assign({}, P.piccolo.appearance, { accessory: "antenas" }));
check("Piccolo salvo antes: antenas viram característica da cabeça", pic.headFeature === "antenas" && pic.accessory === "none");
check("Piccolo salvo antes: orelhas pontudas e linhas na testa", pic.earType === "pontuda" && pic.bodyMarks === "namek");
const buu = velho(Object.assign({}, P.majin.appearance, { accessory: "majin_antena" }));
check("Majin Boo salvo antes: furinhos e antena", buu.earType === "majin" && buu.headFeature === "majin_antena");
const fz = velho(P.freeza.appearance);
check("Freeza salvo antes: sem orelha, domo e placas", fz.earType === "nenhuma" && fz.bodyMarks === "freeza");
check("Cell salvo antes: marcas no rosto", velho(P.cell.appearance).bodyMarks === "cell");
check("Goku salvo antes: nada muda", (() => { const g = velho(P.goku.appearance); return g.earType === "normal" && g.bodyMarks === "none" && g.headFeature === "none" && g.gender === "masculino"; })());
check("Androide 18 salva antes vira mulher", velho(P.android18.appearance).gender === "feminino");
check("escolha nova não é desfeita (Namek de orelha normal continua assim)", sp.normalizeAppearance(Object.assign({}, P.piccolo.appearance, { earType: "normal", bodyMarks: "none", headFeature: "none" })).earType === "normal");
check("dá para misturar: Saiyajin com antenas, furinhos do Majin e marcas do Cell", (() => {
    const base = svg(P.vegeta.appearance);
    return ["headFeature:antenas", "earType:majin", "bodyMarks:cell", "scar:olho", "bodyMarks:freeza"].every(kv => {
        const [k, v] = kv.split(":"); return svg(Object.assign({}, P.vegeta.appearance, { [k]: v })) !== base;
    });
})());

// ---------- construtor (tela) ----------
const html = fs.readFileSync(__dirname + "/../index.html", "utf8");
check("construtor tem GÊNERO, CARACTERÍSTICA DA CABEÇA e MARCAS DA RAÇA", ["build-gender", "build-head-feature", "build-body-marks"].every(id => html.includes(`id="${id}"`)));
check("opções organizadas em grupos (corpo, cabeça, especiais, roupas, acessórios, cores)", ["CORPO", "CABEÇA E ROSTO", "CARACTERÍSTICAS ESPECIAIS", "ROUPAS", "ACESSÓRIOS", "CORES"].every(t => html.includes(`<div class="build-section-title">${t}</div>`)));
check("orelhas: normais, pontudas, furinhos do Majin, sem orelha", ['value="pontuda"', 'value="majin"', 'value="nenhuma">Sem orelha'].every(v => html.includes(v)));
run(`setBuilderFormFromAppearance(SPRITE_PRESETS.android18.appearance)`);
check("ao abrir a Androide 18 no construtor, o gênero aparece como feminino", run(`getBuilderAppearanceFromForm().gender`) === "feminino");

process.exit(summary());
