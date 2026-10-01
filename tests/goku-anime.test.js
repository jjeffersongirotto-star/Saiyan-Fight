// tests/goku-anime.test.js — desenho em pixel art no estilo do anime, o único que existe (o estilo clássico foi
// removido): todos os modelos e personagens usam esse desenho, inclusive os salvos por versões antigas.
//
// Uso: node tests/goku-anime.test.js

const fs = require("fs");
const sprites = require("../sprites.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const goku = sprites.SPRITE_PRESETS.goku.appearance;
check("o modelo do Goku existe", !!goku && goku.hairStyle === "goku");
const svgGoku = sprites.generateSpriteFrameSvg(goku, "idle", 0);
check("o estilo antigo não existe mais (sem campo de estilo na aparência)", !("proporcao" in sprites.SPRITE_DEFAULT_APPEARANCE) && Object.values(sprites.SPRITE_PRESETS).every(p => !("proporcao" in p.appearance)));
check("Goku: desenho nítido de pixel art (sem suavização de borda)", svgGoku.includes('shape-rendering="crispEdges"'));
check("aparência salva com o estilo antigo sai no desenho atual", sprites.generateSpriteFrameSvg(Object.assign({}, goku, { proporcao: "classico" }), "idle", 0) === svgGoku);
check("personagem novo do construtor já sai no desenho atual", sprites.generateSpriteFrameSvg(sprites.SPRITE_DEFAULT_APPEARANCE, "idle", 0).includes('shape-rendering="crispEdges"'));
for (const k of Object.keys(sprites.SPRITE_PRESETS)) {
    const app = sprites.SPRITE_PRESETS[k].appearance;
    check(`${k}: gera todos os movimentos`, sprites.SPRITE_STATES.every(st => sprites.getProceduralFrameUrls(app, st).length === sprites.SPRITE_FRAME_COUNTS[st]));
}
check("Freeza na forma final: sem chifres", sprites.SPRITE_PRESETS.freeza.appearance.accessory !== "chifres");
check("todos os movimentos do Goku são gerados sem erro", sprites.SPRITE_STATES.every(st => sprites.getProceduralFrameUrls(goku, st).length === sprites.SPRITE_FRAME_COUNTS[st]));

const html = fs.readFileSync(__dirname + "/../index.html", "utf8");
check("o construtor não tem mais a opção de estilo (clássico)", !html.includes("build-proporcao") && !html.includes('value="classico"'));
check("o gerador antigo de sprites (8 bits) foi apagado", run("typeof generateDbzSpriteSvg") === "undefined" && run("typeof refreshDefaultCharacterStyle") === "undefined");
check("imagem reserva usa o desenho atual", run("getFallbackSpriteSvg()").startsWith("data:image/svg") && decodeURIComponent(run("getFallbackSpriteSvg()")).includes("crispEdges"));

// perfil antigo: personagem do construtor salvo no estilo antigo passa a usar o desenho atual ao carregar
run(`var __velho = Object.assign({}, SPRITE_PRESETS.goku.appearance, { proporcao: "classico", primaryColor: "#00ff00" });
     writeStorage("saiyan_db_v8_8bit", JSON.stringify({ meu_goku: { name: "MEU GOKU", defaultUrl: "data:image/svg+xml;utf8,antigo", builderAppearance: __velho } }));
     characterDB = {}; loadCharacterData();`);
check("personagem salvo no estilo antigo carrega no desenho atual", run("decodeURIComponent(characterDB.meu_goku.defaultUrl).includes('crispEdges')") && run("characterDB.meu_goku.animations.idle.length") > 0);
check("e mantém as escolhas do jogador (sem o campo de estilo)", run("characterDB.meu_goku.builderAppearance.primaryColor") === "#00ff00" && run("'proporcao' in characterDB.meu_goku.builderAppearance") === false);
check("Majin Boo é o Boo gordo (barriga, colete e luvas)", (() => { const m = sprites.SPRITE_PRESETS.majin.appearance; return m.build === "gordo" && m.outerShirt === "colete_buu"; })());
check("o Cell entra no elenco inicial", run("!!SPRITE_PRESETS.cell && DEFAULT_CHARACTERS.cell.name === 'CELL'"));
check("construtor tem as peças do Cell e do Boo", ["cell_crista", "armadura_cell", "botas_cell", "Bio-Androide", 'value="gordo"', "colete_buu"].every(v => html.includes(v)));

process.exit(summary());
