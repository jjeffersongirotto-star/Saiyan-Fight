// tests/versao-084.test.js — versão 0.84: vilão de cada fase escolhido na tela ARENAS (só vilões e anti-heróis,
// já numa forma) e usado na luta daquela fase; quadro "i" sem a altura em cm.
//
// Uso: node tests/versao-084.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");
const prog = {}; ["terra", "kaio", "namek", "freeza_ship", "namek_explosao", "time_room", "cell_games", "kaioshin"].forEach(f => prog[f] = { normalDone: true });
run(`stageProgress = ${JSON.stringify(prog)}; gameMode = 'singleplayer'; selectedBoss = 'vegeta'`);

// ---------- ARENAS: tocar na fase abre a escolha do vilão ----------
run("setGameState('stages')");
const card = run("getStageCardRect(1)");
run(`handleMenuClick(${card.x + 30}, ${card.y + 30})`);
check("tocar numa fase liberada abre a escolha do vilão dela", run("gameState") === "characters" && run("selecaoLuta") === "fase" && run("faseEscolhendoVilao") === "kaio");
const lista = run("getFilteredCharacters()");
check("só vilões e anti-heróis na lista", lista.length > 0 && lista.every(k => ["VILÃO", "ANTI-HERÓI"].includes(run(`characterDB['${k}'].alignment`))) && !lista.includes("goku_adult"));
h.calls.length = 0; run("render()");
const textos = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("título VILÃO DA FASE e o nome da fase", textos.includes("VILÃO DA FASE") && textos.includes("PLANETA DO SR. KAIOH") && !textos.includes("LUTAR!"));
const iFreeza = lista.indexOf("freeza_1");
const r = run(`getCharacterCardRect(${iFreeza})`);
run(`handleMenuClick(${r.x + r.w / 2}, ${r.y + r.h / 2})`);
const formas = run("systemChoiceOptions.map(o => o.label)");
check("escolher o personagem pergunta a forma (base e transformações)", formas[0] === "FORMA BASE" && formas.includes("SEGUNDA FORMA") && formas[formas.length - 1] === "CANCELAR");
run("executeSystemChoice(systemChoiceOptions.findIndex(o => o.label === 'SEGUNDA FORMA'))");
check("fica salvo como vilão daquela fase, na forma escolhida", JSON.stringify(run("getVilaoDaFase('kaio')")) === JSON.stringify({ key: "freeza_1", nivel: 1 }) && run("gameState") === "stages");
check("o card da fase mostra o retrato do vilão", fs.readFileSync(__dirname + "/../menu.js", "utf8").includes("drawCharacterPortrait(characterDB[vf.key]"));

// ---------- luta da fase ----------
run("selectedStage = 'kaio'; abrirTelaPersonagens('solo')");
check("seleção antes da luta já vem com o vilão da fase", run("selectedBoss") === "freeza_1");
run("avancarSelecaoLuta()");
check("na luta o vilão começa na forma escolhida (2ª forma, maior)", run("getTransformLevel(player2)") === 1 && run("player2.h") > 56);
run("respawnBoss()");
check("a cada onda ele volta na mesma forma", run("getTransformLevel(player2)") === 1);
run("setGameState('menu'); selectedStage = 'terra'; selecaoLuta = null; startGame()");
check("fase sem vilão escolhido continua como antes", run("getTransformLevel(player2)") === 0);
run("setGameState('menu')");

// ---------- trocar o vilão antes da luta muda o da fase ----------
run("selectedStage = 'kaio'; abrirTelaPersonagens('solo'); currentTab = 'VILÕES'");
const vil = run("getFilteredCharacters()"), iCell = vil.indexOf("cell");
const rc = run(`getCharacterCardRect(${iCell})`);
run(`handleMenuClick(${rc.x + rc.w / 2}, ${rc.y + rc.h / 2})`);
run("executeSystemChoice(systemChoiceOptions.findIndex(o => o.label === 'VILÃO'))");
check("escolher outro VILÃO antes da luta vira o vilão da fase", JSON.stringify(run("getVilaoDaFase('kaio')")) === JSON.stringify({ key: "cell", nivel: 0 }));
run("selecaoLuta = null; setGameState('menu')");

// ---------- quadro "i" sem altura ----------
run("abrirTelaPersonagens(null); infoPersonagemKey = 'cell'"); h.calls.length = 0; run("render()");
check("o quadro \"i\" não mostra mais a altura em cm", !h.calls.some(c => c[0] === "fillText" && / cm$/.test(String(c[1][0]))));

process.exit(summary());
