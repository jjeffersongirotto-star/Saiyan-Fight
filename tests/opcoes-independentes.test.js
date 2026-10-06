// tests/opcoes-independentes.test.js — cada opção do construtor muda só a sua parte e muda de verdade:
// camisa mexe só na camisa (tronco/mangas), calça só nas pernas, roupa de cima não pinta calça nem camisa,
// raça só troca a cor da pele; e nenhuma opção desenha igual a outra do mesmo campo.
//
// Uso: node tests/opcoes-independentes.test.js

const fs = require("fs");
const sp = require("../sprites.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const html = fs.readFileSync(__dirname + "/../index.html", "utf8");
const IDS = { "gender": "gender", "race": "race", "build": "build", "hair-style": "hairStyle", "ear-type": "earType", "head-feature": "headFeature",
    "eye-type": "eyeType", "mouth-type": "mouthType", "body-marks": "bodyMarks", "scar": "scar", "tail": "tail", "wings": "wings", "inner-shirt": "innerShirt",
    "outer-shirt": "outerShirt", "pants": "pants", "symbol": "symbol", "shoes": "shoes", "gloves": "gloves", "hat": "hat", "cape": "cape",
    "accessory": "accessory", "back-weapon": "backWeapon", "arm-pose": "armPose" };
const campos = {};
for (const m of html.matchAll(/<select id="build-([a-z-]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    if (IDS[m[1]]) campos[IDS[m[1]]] = [...m[2].matchAll(/value="([^"]*)"/g)].map(x => x[1]);
}
check("todas as opções do construtor estão neste teste", Object.keys(campos).length === Object.keys(IDS).length);

// ---------- cada opção desenha algo diferente das outras do mesmo campo ----------
const base = Object.assign({}, sp.SPRITE_PRESETS.goku.appearance, { outerShirt: "none", innerShirt: "nenhuma", symbol: "none", hairStyle: "careca", mouthType: "serio" });
const desenho = (a) => ["idle", "flyRight", "attackKi"].map(st => [0, 1, 2].map(i => sp.generateSpriteFrameSvg(a, st, i)).join("")).join("");
for (const [campo, vals] of Object.entries(campos)) {
    const vistos = new Map();
    for (const v of vals) {
        const d = desenho(Object.assign({}, base, { [campo]: v }));
        if (!vistos.has(d)) vistos.set(d, []);
        vistos.get(d).push(v);
    }
    const iguais = [...vistos.values()].filter(g => g.length > 1).map(g => g.join(" = "));
    check(`${campo}: cada opção muda o desenho de verdade`, iguais.length === 0, iguais.join("; "));
}

// ---------- cada peça só mexe na sua parte do corpo ----------
const spec = (a) => run(`spriteOutfitSpec(normalizeAppearance(${JSON.stringify(a)}), "#f3c29a")`);
const pernas = (s) => JSON.stringify([s.leg, s.legWide, s.legCover]);
const bracos = (s) => JSON.stringify([s.armUpper, s.armLower, s.sleeve]);
const cheio = Object.assign({}, sp.SPRITE_PRESETS.goku.appearance);
check("roupa de cima não muda a calça", campos.outerShirt.every(o => pernas(spec(Object.assign({}, cheio, { outerShirt: o }))) === pernas(spec(cheio))));
check("camisa não muda a calça", campos.innerShirt.every(o => pernas(spec(Object.assign({}, cheio, { innerShirt: o }))) === pernas(spec(cheio))));
check("calça não muda camisa nem braços", campos.pants.every(o => {
    const s = spec(Object.assign({}, cheio, { pants: o })), b = spec(cheio);
    return s.torso === b.torso && bracos(s) === bracos(b);
}));
check("roupa sem mangas não muda os braços (as mangas são da camisa)", ["kimono", "gi_piccolo", "roupa_kaioshin", "armadura_saiyajin", "colete_fusao", "colete_buu", "armadura_freeza", "none"].every(o =>
    bracos(spec(Object.assign({}, cheio, { innerShirt: "malha", outerShirt: o }))) === bracos(spec(Object.assign({}, cheio, { innerShirt: "malha", outerShirt: "none" })))));
check("cor da calça pinta só a calça", spec(Object.assign({}, cheio, { pantsColor: "#00ff00" })).leg === "#00ff00" && spec(Object.assign({}, cheio, { pantsColor: "#00ff00" })).torso === spec(cheio).torso);
check("cor da camisa pinta a camisa (sem roupa de cima)", spec(Object.assign({}, cheio, { outerShirt: "none", shirtColor: "#00ff00" })).torso === "#00ff00");
check("raça só troca a cor da pele", (() => {
    const g = Object.assign({}, cheio, { skinColor: "#aabbcc" });
    return ["Namekuseijin", "Majin", "Raça Freeza", "Bio-Androide", "Kaioshin"].every(r => sp.generateSpriteFrameSvg(Object.assign({}, g, { race: r }), "idle", 0) === sp.generateSpriteFrameSvg(g, "idle", 0));
})());

// ---------- personagens salvos antes continuam iguais ----------
const antigo = (a) => { const b = Object.assign({}, a); delete b.shirtColor; delete b.pantsColor; return b; };
const vegetaVelho = Object.assign(antigo(sp.SPRITE_PRESETS.vegeta.appearance), { innerShirt: "malha" });
check("Vegeta salvo antes: macacão azul por baixo da armadura vira malha azul", (() => { const a = sp.normalizeAppearance(vegetaVelho); return a.innerShirt === "malha" && a.shirtColor === vegetaVelho.primaryColor && a.pantsColor === vegetaVelho.primaryColor; })());
check("Goku salvo antes: camiseta de manguinha e calça laranja", (() => { const a = sp.normalizeAppearance(Object.assign(antigo(sp.SPRITE_PRESETS.goku.appearance), { innerShirt: "regata" })); return a.innerShirt === "camiseta" && a.pantsColor === "#f2680d"; })());
check("Trunks salvo antes: calça escura do jeito que era", sp.normalizeAppearance(antigo(Object.assign({}, sp.SPRITE_PRESETS.trunks.appearance, { secondaryColor: "#20263a" }))).pantsColor === "#1e2437");
check("construtor tem COR DA CAMISA e COR DA CALÇA", html.includes('id="build-shirt-color"') && html.includes('id="build-pants-color"'));
run(`setBuilderFormFromAppearance(SPRITE_PRESETS.trunks.appearance)`);
check("o construtor lê e grava a cor da calça", run(`getBuilderAppearanceFromForm().pantsColor`) === sp.SPRITE_PRESETS.trunks.appearance.pantsColor);

process.exit(summary());
