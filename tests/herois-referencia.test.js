// tests/herois-referencia.test.js — Goku, Vegeta, Trunks e Gohan no visual das referências do jogador (versão 0.74),
// com as transformações do Gohan (SSJ e SSJ2 sem capa) e a troca única dos salvos antigos.
//
// Uso: node tests/herois-referencia.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const ap = (k) => run(`SPRITE_PRESETS.${k}.appearance`);
check("Goku: kanji 悟 e faixa/munhequeiras azul-royal com camiseta azul-marinho", ap("goku").symbol === "go" && ap("goku").secondaryColor !== ap("goku").shirtColor);
check("Vegeta: scouter vermelho e cauda enrolada na cintura", ap("vegeta").accessory === "scouter_vermelho" && ap("vegeta").tail === "cinto_saiyajin");
check("Trunks: calça folgada, regata e botas amarelas", ap("trunks").pants === "larga" && ap("trunks").innerShirt === "regata" && run(`spriteBootSpec(SPRITE_PRESETS.trunks.appearance).color`) === "#f2c21c");
const tg = run(`getCharacterTransformations("gohan").map(t => [t.name, t.diff.cape, t.ssj, t.diff.hairStyle || ""])`);
check("Gohan: T1 Super Saiyajin e T2 Super Saiyajin 2, as duas sem capa", JSON.stringify(tg) === JSON.stringify([["Super Saiyajin", "none", true, ""], ["Super Saiyajin 2", "none", true, "gohan_ssj2"]]));
check("Gohan base tem capa e botas dobradas", ap("gohan").cape === "capa_ombreiras" && ap("gohan").shoes === "botas_dobradas");
const svgs = run(`["goku", "vegeta", "trunks", "gohan"].map(k => generateSpriteFrameSvg(SPRITE_PRESETS[k].appearance, "idle", 0)).concat(getCharacterTransformations("gohan").map(t => generateSpriteFrameSvg(spriteTransformAppearance(SPRITE_PRESETS.gohan.appearance, t), "idle", 0, { ssj: t.ssj })))`);
check("todos os desenhos são SVG válidos (sem atributo repetido)", svgs.every(svg => svg.startsWith("<svg") && !/<[^>]*\bstroke-width="[^"]*"[^>]*\bstroke-width=/.test(svg)));
check("SSJ2 tem raios azulados em volta do cabelo", /#5fc8ff/.test(svgs[svgs.length - 1]) && !/#5fc8ff/.test(svgs[3]));

// salvo antigo (sem edição) passa para o visual novo, uma vez
run(`characterDB.trunks.builderAppearance = normalizeAppearance(Object.assign({}, SPRITE_PRESETS.trunks.appearance, { primaryColor: "#3f66c8" })); characterDB.gohan.transformations = [{ name: "Transformação 1", diff: {}, ssj: true, aura: "amarelo" }]; writeStorage("saiyan_herois_074", ""); atualizarHeroisSalvos()`);
check("Trunks antigo salvo passa para o novo", run(`characterDB.trunks.builderAppearance.primaryColor`) === "#5a4fd0");
check("Gohan com a transformação padrão ganha SSJ e SSJ2", run(`getCharacterTransformations("gohan").length`) === 2);
run(`characterDB.trunks.builderAppearance = normalizeAppearance(Object.assign({}, SPRITE_PRESETS.trunks.appearance, { primaryColor: "#3f66c8" })); atualizarHeroisSalvos()`);
check("só uma vez (um Trunks editado depois fica como está)", run(`characterDB.trunks.builderAppearance.primaryColor`) === "#3f66c8");
process.exit(summary());
