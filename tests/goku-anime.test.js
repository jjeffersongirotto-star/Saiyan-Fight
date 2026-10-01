// tests/goku-anime.test.js — teste do estilo novo "anime (pixel art)", começando pelo Goku: proporções de anime,
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
const svgVegeta = sprites.generateSpriteFrameSvg(sprites.SPRITE_PRESETS.vegeta.appearance, "idle", 0);
check("Goku: desenho nítido de pixel art (sem suavização de borda)", svgGoku.includes('shape-rendering="crispEdges"'));
check("os outros personagens continuam no estilo clássico por enquanto", !svgVegeta.includes("crispEdges"));
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
check("Goku que o jogador personalizou NÃO é trocado", run("refreshDefaultCharacterStyle('goku_adult', __c2)") === false && run("__c2.builderAppearance.primaryColor") === "#00ff00");
check("personagem que não é dos iniciais não é tocado", run("refreshDefaultCharacterStyle('meu_personagem', __c)") === false);

process.exit(summary());
