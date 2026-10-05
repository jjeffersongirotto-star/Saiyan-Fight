// tests/freeza-formas.test.js — Freeza com as 5 formas das referências do jogador (1ª forma de armadura, 2ª gigante
// de chifres, 3ª de cabeça alongada, forma final e ciborgue), cada uma com peças próprias do construtor; o
// Freeza antigo salvo passa uma vez para o novo; e as marcas Namek do Piccolo (placas rosadas com estrias).
//
// Uso: node tests/freeza-formas.test.js

const sp = require("../sprites.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const base = sp.SPRITE_PRESETS.freeza.appearance;
check("o Freeza começa na 1ª forma (armadura do exército, capacete com chifres finos)", base.outerShirt === "armadura_exercito" && base.headFeature === "capacete_freeza" && base.bodyMarks === "listras_freeza");
const formas = run(`getCharacterTransformations("freeza_1").map(t => t.name)`);
check("4 transformações na ordem: 2ª, 3ª, final e ciborgue", JSON.stringify(formas) === JSON.stringify(["Segunda forma", "Terceira forma", "Forma final", "Freeza ciborgue"]));
const desenhos = run(`[SPRITE_PRESETS.freeza.appearance].concat(getCharacterTransformations("freeza_1").map(t => spriteTransformAppearance(SPRITE_PRESETS.freeza.appearance, t))).map(a => generateSpriteFrameSvg(a, "idle", 0))`);
check("as 5 formas desenham diferente uma da outra", new Set(desenhos).size === 5);
check("SVG de cada forma é válido (sem atributo repetido)", desenhos.every(svg => !/<[^>]*\bstroke-width="[^"]*"[^>]*\bstroke-width=/.test(svg)));
check("transformar não deixa o cabelo amarelo (o Freeza é careca)", run(`getCharacterTransformations("freeza_1").every(t => t.ssj === false)`));

// ---------- Freeza antigo salvo vira o novo, uma vez ----------
run(`characterDB.freeza_1.builderAppearance = normalizeAppearance(Object.assign({}, SPRITE_PRESETS.freeza.appearance, { outerShirt: "armadura_freeza", bodyMarks: "freeza", headFeature: "none" })); characterDB.freeza_1.name = "FREEZA (FINAL)"; writeStorage("saiyan_freeza_formas", ""); atualizarFreezaSalvo()`);
check("Freeza antigo (forma final) passa para a 1ª forma", run(`characterDB.freeza_1.builderAppearance.outerShirt`) === "armadura_exercito" && run(`characterDB.freeza_1.name`) === "FREEZA");
run(`characterDB.freeza_1.builderAppearance = normalizeAppearance(Object.assign({}, SPRITE_PRESETS.freeza.appearance, { outerShirt: "armadura_freeza", bodyMarks: "freeza" })); atualizarFreezaSalvo()`);
check("só uma vez (um Freeza editado depois fica como está)", run(`characterDB.freeza_1.builderAppearance.outerShirt`) === "armadura_freeza");

// ---------- Namek ----------
const piccolo = sp.generateSpriteFrameSvg(sp.SPRITE_PRESETS.piccolo.appearance, "idle", 0);
const semMarcas = sp.generateSpriteFrameSvg(Object.assign({}, sp.SPRITE_PRESETS.piccolo.appearance, { bodyMarks: "none" }), "idle", 0);
check("Piccolo tem as placas rosadas nos braços", piccolo.includes("#e5938f") && !semMarcas.includes("#e5938f"));
check("e a faixa vermelha no punho", piccolo.includes("#b3262e"));

process.exit(summary());
