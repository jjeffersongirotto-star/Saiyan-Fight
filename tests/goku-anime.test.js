// tests/goku-anime.test.js — estilo novo "anime (pixel art)" (Goku, Vegeta, Freeza, Piccolo...): proporções de anime,
// desenho nítido (sem suavização) só para quem usa o estilo, opção no construtor e atualização do Goku já salvo
// no navegador de quem jogou antes (sem mexer em personagem que o jogador personalizou).
//
// Uso: node tests/goku-anime.test.js

const fs = require("fs");
const sprites = require("../sprites.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const goku = sprites.SPRITE_PRESETS.goku.appearance;
check("o modelo do Goku usa o estilo anime", goku.proporcao === "anime");
const svgGoku = sprites.generateSpriteFrameSvg(goku, "idle", 0);
const svgClassico = sprites.generateSpriteFrameSvg(Object.assign({}, sprites.SPRITE_DEFAULT_APPEARANCE, { proporcao: "classico" }), "idle", 0);
check("personagem novo do construtor já começa no estilo anime", sprites.SPRITE_DEFAULT_APPEARANCE.proporcao === "anime");
check("Goku: desenho nítido de pixel art (sem suavização de borda)", svgGoku.includes('shape-rendering="crispEdges"'));
check("quem escolher o estilo Clássico continua com ele", !svgClassico.includes("crispEdges"));
for (const k of Object.keys(sprites.SPRITE_PRESETS)) {
    const app = sprites.SPRITE_PRESETS[k].appearance;
    check(`${k}: usa o estilo anime e gera todos os movimentos`, app.proporcao === "anime" && sprites.SPRITE_STATES.every(st => sprites.getProceduralFrameUrls(app, st).length === sprites.SPRITE_FRAME_COUNTS[st]));
}
check("Freeza na forma final: sem chifres", sprites.SPRITE_PRESETS.freeza.appearance.accessory !== "chifres");
check("todos os movimentos do Goku são gerados sem erro", sprites.SPRITE_STATES.every(st => sprites.getProceduralFrameUrls(goku, st).length === sprites.SPRITE_FRAME_COUNTS[st]));

// construtor: opção ESTILO DO DESENHO
const html = fs.readFileSync(__dirname + "/../index.html", "utf8");
check("o construtor tem a opção ESTILO DO DESENHO (clássico/anime)", html.includes('id="build-proporcao"') && html.includes('value="anime"'));

// perfil antigo: Goku salvo com a aparência antiga passa para o estilo novo
run(`var __velho = Object.assign({}, SPRITE_PRESETS.goku.appearance); delete __velho.proporcao;
     var __c = { builderAppearance: __velho, animations: { idle: ["x"] }, defaultUrl: "antigo" };`);
check("Goku salvo antes da mudança é atualizado para o estilo novo", run("refreshDefaultCharacterStyle('goku_adult', __c)") === true && run("__c.builderAppearance.proporcao") === "anime");
check("e a imagem dele é refeita", run("__c.defaultUrl") !== "antigo");
run(`var __editado = Object.assign({}, __velho, { primaryColor: "#00ff00" }); var __c2 = { builderAppearance: __editado };`);
check("Goku que o jogador personalizou ganha o desenho novo mas mantém as escolhas dele", run("refreshDefaultCharacterStyle('goku_adult', __c2)") === true && run("__c2.builderAppearance.primaryColor") === "#00ff00" && run("__c2.builderAppearance.proporcao") === "anime");
check("e não é atualizado de novo depois", run("refreshDefaultCharacterStyle('goku_adult', __c2)") === false);
run(`var __fz = Object.assign({}, SPRITE_PRESETS.freeza.appearance, { accessory: "chifres" }); delete __fz.proporcao; var __cf = { builderAppearance: __fz };`);
check("Freeza salvo antes (com chifres) também passa para o estilo novo", run("refreshDefaultCharacterStyle('freeza_1', __cf)") === true && run("__cf.builderAppearance.accessory") === "none");
check("Majin Boo é o Boo gordo (barriga, colete e luvas)", (() => { const m = sprites.SPRITE_PRESETS.majin.appearance; return m.build === "gordo" && m.outerShirt === "colete_buu"; })());
run(`var __mb = Object.assign({}, SPRITE_PRESETS.majin.appearance, { build: "gigante", outerShirt: "none", shoes: "botas_marrons", gloves: "nenhuma" }); delete __mb.proporcao; var __cm = { builderAppearance: __mb };`);
check("Majin Boo salvo antes (musculoso) passa para o Boo gordo", run("refreshDefaultCharacterStyle('majin_buu', __cm)") === true && run("__cm.builderAppearance.build") === "gordo");
check("o Cell entra no elenco inicial", run("!!characterDB.cell && characterDB.cell.name === 'CELL'"));
check("construtor tem as peças do Cell e do Boo", ["cell_crista", "armadura_cell", "botas_cell", "Bio-Androide", 'value="gordo"', "colete_buu"].every(v => html.includes(v)));
check("personagem que não é dos iniciais não é tocado", run("refreshDefaultCharacterStyle('meu_personagem', __c)") === false);

process.exit(summary());
