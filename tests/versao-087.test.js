// tests/versao-087.test.js — versão 0.87: Minions no editor. Raça Minion, peças de minion com cores editáveis
// (cabeça de Saibaman, crista de Cell Jr., anéis, manchas, garras nas mãos e nos pés), alinhamento MINION
// (embaixo da divisão MINIONS no gerenciador, fora da escolha de herói/vilão) e minions criados no campo MINION
// das arenas e na luta.
//
// Uso: node tests/versao-087.test.js

const sp = require("../sprites.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- peças e cores ----------
const sai = sp.SPRITE_PRESETS.saibaman.appearance;
const svg = (a) => sp.generateSpriteFrameSvg(a, "idle", 0);
check("Saibaman e Cell Jr. existem como modelos do construtor (raça Minion)", sai.race === "Minion" && sp.SPRITE_PRESETS.celljr.appearance.headFeature === "crista_celljr");
check("cor das veias muda o desenho", svg(Object.assign({}, sai, { minionColor: "#ff00ff" })) !== svg(sai) && svg(Object.assign({}, sai, { minionColor: "#ff00ff" })).includes("#ff00ff"));
check("cor das garras muda o desenho", svg(Object.assign({}, sai, { clawColor: "#00ffff" })).includes("#00ffff"));
check("cor da pele muda a cabeça de Saibaman também", svg(Object.assign({}, sai, { skinColor: "#c07ad8" })) !== svg(sai));
run("setBuilderFormFromAppearance(SPRITE_PRESETS.saibaman.appearance)");
check("o construtor lê e grava as cores das peças de minion", run("getBuilderAppearanceFromForm().minionColor") === sai.minionColor && run("getBuilderAppearanceFromForm().clawColor") === sai.clawColor);

// ---------- personagens MINION ----------
check("Saibaman e Cell Jr. vêm no gerenciador como MINION", run("characterDB.saibaman.alignment") === "MINION" && run("characterDB.celljr.alignment") === "MINION");
run("gameMode = 'singleplayer'; selecaoLuta = 'solo'; currentTab = 'VILÕES'");
check("minion não aparece para escolher vilão", !run("getFilteredCharacters()").includes("saibaman"));
run("gameMode = 'coop'; selecaoLuta = 'p1'");
check("nem no VERSUS", !run("getFilteredCharacters()").includes("celljr"));
run("gameMode = 'singleplayer'; selecaoLuta = null");
const ent = run("getDatabaseEntradas()");
const iMin = ent.itens.findIndex(i => i.minion);
check("gerenciador: minions depois da divisão MINIONS", ent.divisaoY !== null && iMin > 0 && ent.itens.slice(iMin).every(i => i.minion && i.y > ent.divisaoY) && ent.itens.slice(0, iMin).every(i => !i.minion && i.y < ent.divisaoY));
run("setGameState('database'); characterDatabaseScrollY = 99999");
h.calls.length = 0; run("render()");
check("a divisão MINIONS aparece na lista", h.calls.some(c => c[0] === "fillText" && c[1][0] === "MINIONS"));
run("setGameState('menu')");

// ---------- minion criado: arenas e luta ----------
run(`characterDB.meu_minion = Object.assign({}, characterDB.saibaman, { name: "MEU MINION", builderAppearance: Object.assign({}, SPRITE_PRESETS.saibaman.appearance, { skinColor: "#c07ad8" }) })`);
check("minion criado entra na lista do campo MINION das arenas", run("getMinionsDisponiveis().map(m => m.id)").includes("meu_minion"));
check("Saibaman sem edição usa o desenho clássico; minion criado usa o próprio desenho", run("minionUsaDesenhoClassico('saibaman')") === true && run("minionUsaDesenhoClassico('meu_minion')") === false);
run("characterDB.saibaman.builderAppearance = Object.assign({}, SPRITE_PRESETS.saibaman.appearance, { minionColor: '#ffd23f' })");
check("Saibaman editado passa a usar o desenho editado", run("minionUsaDesenhoClassico('saibaman')") === false);
run("setMinionDaFase('kame', 'meu_minion'); selectedStage = 'kame'");
check("a fase usa o minion escolhido", run("getMinionKind()") === "meu_minion");
check("na luta o desenho do minion sai sem erro (clássico enquanto a imagem carrega)", !!run("getSaibamanSprite('voar', 0)"));
run("setMinionDaFase('kame', 'saibaman'); delete characterDB.meu_minion");

process.exit(summary());
