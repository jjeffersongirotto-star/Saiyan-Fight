// tests/personagens-iniciais.test.js — todo modelo da lista "COMEÇAR A PARTIR DE..." do construtor já vem pronto
// como personagem no Database e na tela PERSONAGENS (perfil novo e perfil antigo). O construtor continua igual
// para criar personagens novos. A tela PERSONAGENS rola quando uma aba passa de 10 personagens.
//
// Uso: node tests/personagens-iniciais.test.js

const { createHarness } = require("./harness.js");
const path = __dirname + "/..";

// ---------- perfil novo: um personagem para cada modelo do construtor ----------
const h = createHarness(path, 800);
const presetCount = h.run("Object.keys(SPRITE_PRESETS).length");
const defaultPresets = h.run("Object.values(DEFAULT_CHARACTERS).map(d => d.presetKey).sort()");
h.check("cada modelo do construtor tem um personagem inicial", JSON.stringify(defaultPresets) === JSON.stringify(h.run("Object.keys(SPRITE_PRESETS).sort()")), JSON.stringify(defaultPresets));
h.check(`perfil novo já vem com os ${presetCount} personagens no Database`, h.run("Object.keys(DEFAULT_CHARACTERS).every(k => !!characterDB[k])"));
h.check("todos os personagens iniciais têm animações de movimento", h.run("Object.keys(DEFAULT_CHARACTERS).every(k => characterDB[k].animations && characterDB[k].animations.flyRight && characterDB[k].animations.flyRight.length > 0)"));
h.check("cada um aparece na aba certa (herói/anti-herói em HERÓIS, vilão/anti-herói em VILÕES; minions em nenhuma)", h.run(`(() => {
    currentTab = "HERÓIS"; const herois = getFilteredCharacters();
    currentTab = "VILÕES"; const viloes = getFilteredCharacters();
    return Object.keys(DEFAULT_CHARACTERS).every(k => DEFAULT_CHARACTERS[k].align === "MINION" ? !herois.includes(k) && !viloes.includes(k) : herois.includes(k) || viloes.includes(k));
})()`));
h.check("o construtor continua oferecendo todos os modelos em 'COMEÇAR A PARTIR DE...'", h.run("(() => { populateBuilderPresetOptions(); return Object.keys(SPRITE_PRESETS).length; })()") === presetCount);

// um personagem inicial pode ser usado numa partida de verdade
h.run("selectedCharacter = 'gogeta'; selectedBoss = 'broly'; gameMode = 'singleplayer'; stageMode = 'normal'; startGame(); for (let i = 0; i < 20; i++) { update(1/60); render(); }");
h.check("dá para jogar com os personagens novos (VEGETTO contra BROLY)", h.run("gameState") === "playing" && h.run("characterDB[selectedCharacter].name") === "VEGETTO");

// ---------- perfil antigo: recebe os novos UMA vez, sem ressuscitar o que o jogador apagou ----------
const antigo = {};
h.run("Object.keys(DEFAULT_CHARACTERS).forEach(k => { if (!['goku_adult', 'piccolo', 'freeza_1'].includes(k)) delete characterDB[k]; }); characterDB.meu_heroi = Object.assign({}, characterDB.goku_adult, { name: 'MEU HEROI', builderAppearance: null }); saveCharacterData();");
antigo.db = h.store["saiyan_db_v8_8bit"];   // perfil antigo: tinha Goku, Piccolo, Freeza e um criado por ele (apagou o Vegeta)

const h2 = createHarness(path, 800);
// versões antigas não tinham a anotação "saiyan_defaults_seeded": perfil antigo = só os personagens salvos
h2.run(`localStorage.setItem("saiyan_db_v8_8bit", ${JSON.stringify(antigo.db)}); localStorage.setItem("saiyan_defaults_seeded", ""); characterDB = {}; loadCharacterData();`);
h2.check("perfil antigo ganha os personagens novos (ex.: GOGETA, BROLY)", h2.run("!!characterDB.gogeta && !!characterDB.broly"));
h2.check("o personagem criado pelo jogador continua lá", h2.run("!!characterDB.meu_heroi"));
h2.check("o VEGETA que o jogador tinha apagado NÃO volta", h2.run("!characterDB.vegeta"));
h2.run("delete characterDB.broly; saveCharacterData(); characterDB = {}; loadCharacterData();");
h2.check("apagar um dos novos (BROLY) também é respeitado: não volta ao reabrir", h2.run("!characterDB.broly") && h2.run("!!characterDB.gogeta"));

// ---------- tela PERSONAGENS rola quando passa de 2 fileiras ----------
h2.run("characterDB.extra_1 = Object.assign({}, characterDB.goku_adult, { name: 'EXTRA 1' }); characterDB.extra_2 = Object.assign({}, characterDB.goku_adult, { name: 'EXTRA 2' });");
h2.run("currentTab = 'HERÓIS'; charactersScrollY = 0; setGameState('characters'); selecaoLuta = 'solo'; render()");
const total = h2.run("getFilteredCharacters().length");
h2.check(`com ${total} heróis a lista passa de 2 fileiras e pode rolar`, total > 10 && h2.run("getCharactersMaxScroll()") > 0);
h2.run("canvas.onwheel({ deltaY: 500, preventDefault() {} })");
h2.check("a roda do mouse rola a lista até o fim", h2.run("charactersScrollY") === h2.run("getCharactersMaxScroll()"));
const ultimo = h2.run("getFilteredCharacters()[getFilteredCharacters().length - 1]");
const r = h2.run("getCharacterCardRect(getFilteredCharacters().length - 1)");
h2.check("depois de rolar, o último cartão fica inteiro dentro da tela", r.y + r.h <= 350);
h2.run(`handleMenuClick(${r.x + r.w / 2}, ${r.y + r.h / 2})`);
h2.run("executeSystemConfirm(true)");   // a seleção pergunta antes de trocar
h2.check("clicar no último cartão (antes escondido) seleciona o personagem certo", h2.run("selectedCharacter") === ultimo);
h2.run("charactersScrollY = 0");
const { fire, touch } = h2;
const c0 = h2.run("getCharacterCardRect(0)");
fire("touchstart", [touch(9, c0.x + 20, c0.y + 20)], [touch(9, c0.x + 20, c0.y + 20)]);
fire("touchmove", [touch(9, c0.x + 20, c0.y - 40)], [touch(9, c0.x + 20, c0.y - 40)]);
fire("touchend", [], [touch(9, c0.x + 20, c0.y - 40)]);
h2.run("flushButtonActions()");
h2.check("arrastar o dedo rola a lista e não seleciona o cartão onde começou", h2.run("charactersScrollY") > 0 && h2.run("selectedCharacter") === ultimo);

h2.run("setGameState('menu')");
const falhas = h.summary() + h2.summary();
process.exit(falhas);
