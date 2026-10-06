// tests/cell-formas.test.js — Cell com as 3 formas das referências do jogador (1ª forma de inseto, semi-perfeito e
// perfeito), cada uma com peças próprias do construtor; o Cell antigo salvo passa uma vez para o novo.
//
// Uso: node tests/cell-formas.test.js

const sp = require("../sprites.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const base = sp.SPRITE_PRESETS.cell.appearance;
check("o Cell começa na 1ª forma (capacete de inseto, asas abertas, rabo com ferrão)", base.headFeature === "capacete_cell1" && base.bodyMarks === "cell_imperfeito" && base.wings === "cell_abertas" && base.tail === "cell");
check("2 transformações: semi-perfeito e perfeito", JSON.stringify(run(`getCharacterTransformations("cell").map(t => t.name)`)) === JSON.stringify(["Semi-perfeito", "Perfeito"]));
const desenhos = run(`[SPRITE_PRESETS.cell.appearance].concat(getCharacterTransformations("cell").map(t => spriteTransformAppearance(SPRITE_PRESETS.cell.appearance, t))).map(a => generateSpriteFrameSvg(a, "idle", 0))`);
check("as 3 formas desenham diferente uma da outra", new Set(desenhos).size === 3);
check("SVG de cada forma é válido (sem atributo repetido)", desenhos.every(svg => !/<[^>]*\bstroke-width="[^"]*"[^>]*\bstroke-width=/.test(svg)));
check("pintas pretas no corpo verde", desenhos.every(svg => (svg.match(/fill="#141414"/g) || []).length > 10));
check("perfeito: rosto cinza-claro com contorno amarelo e faixas roxas", desenhos[2].includes("#f2d24a") && desenhos[2].includes("#7a3fb0"));

run(`characterDB.cell.builderAppearance = normalizeAppearance(Object.assign({}, SPRITE_PRESETS.cell.appearance, { hairStyle: "cell_crista", outerShirt: "armadura_cell", headFeature: "none", bodyMarks: "cell" })); writeStorage("saiyan_cell_formas", ""); atualizarCellSalvo()`);
check("Cell antigo (perfeito de armadura) passa para a 1ª forma", run(`characterDB.cell.builderAppearance.headFeature`) === "capacete_cell1");
process.exit(summary());
