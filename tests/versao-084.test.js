// tests/versao-084.test.js — versão 0.84: vilão de cada fase escolhido na tela ARENAS (só vilões e anti-heróis,
// já numa forma) e usado na luta daquela fase; quadro "i" sem a altura em cm.
//
// Uso: node tests/versao-084.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");
const prog = {}; ["kame", "terra", "kaio", "namek", "freeza_ship", "namek_explosao", "time_room", "cell_games", "kaioshin"].forEach(f => prog[f] = { normalDone: true });
run(`stageProgress = ${JSON.stringify(prog)}; gameMode = 'singleplayer'; selectedBoss = 'vegeta'`);

// ---------- ARENAS: tocar na fase abre a escolha do vilão ----------
run("setGameState('stages')");
const card = run("getStageCardRect(2)");
run(`handleMenuClick(${card.x + 30}, ${card.y + 30})`);
check("(0.86) tocar na fase abre o quadro da arena", run("arenaPainel && arenaPainel.id") === "kaio");
const trocar = run("MENU_LAYOUT.arenaPainel.trocarVilao");
run(`handleMenuClick(${trocar.x + 5}, ${trocar.y + 5})`);
check("TROCAR (PERSONAGEM) abre a escolha do vilão dela", run("gameState") === "characters" && run("selecaoLuta") === "fase" && run("faseEscolhendoVilao") === "kaio");
const lista = run("getFilteredCharacters()");
check("só vilões e anti-heróis na lista", lista.length > 0 && lista.every(k => ["VILÃO", "ANTI-HERÓI"].includes(run(`characterDB['${k}'].alignment`))) && !lista.includes("goku_adult"));
h.calls.length = 0; run("render()");
const textos = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("título VILÃO DA FASE e o nome da fase", textos.includes("VILÃO DA FASE") && textos.includes("PLANETA DO SR. KAIOH") && !textos.includes("LUTAR!"));
const iFreeza = lista.indexOf("freeza_1");
const r = run(`getCharacterCardRect(${iFreeza})`);
run(`handleMenuClick(${r.x + r.w / 2}, ${r.y + r.h / 2})`);
const formas = run("getCharacterFormsList(escolhaFormaKey).map(f => f.nome)");
check("escolher o personagem abre o quadro das formas (base e transformações)", run("escolhaFormaKey") === "freeza_1" && formas[0] === "FORMA BASE" && formas.includes("SEGUNDA FORMA"));
h.calls.length = 0; run("render()");
check("o quadro mostra a imagem de cada forma", h.calls.filter(c => c[0] === "drawImage").length >= 3 && h.calls.some(c => c[0] === "fillText" && c[1][0] === "SEGUNDA FORMA"));
const maxRol = run("getFormasLayout('freeza_1', true).maxRolagem");
check("com muitas formas o quadro rola de lado", maxRol > 0 && (run("setEscolhaFormaRolagem(99999), escolhaFormaRolagem") === maxRol));
run("canvas.onwheel({ deltaX: 0, deltaY: -99999, preventDefault() {} })");
check("a roda do mouse volta a rolagem", run("escolhaFormaRolagem") === 0);
const rf = run(`getFormaRect('freeza_1', ${formas.indexOf("SEGUNDA FORMA")}, true)`);
run(`handleMenuClick(${rf.x + rf.w / 2}, ${rf.y + rf.h / 2})`);
check("(0.86) volta ao quadro da arena com o personagem e a forma preenchidos", run("gameState") === "stages" && JSON.stringify(run("arenaPainel.vilao")) === JSON.stringify({ key: "freeza_1", nivel: 1 }));
const salvar = run("MENU_LAYOUT.arenaPainel.salvar");
run(`handleMenuClick(${salvar.x + 5}, ${salvar.y + 5})`);
check("SALVAR guarda como vilão daquela fase, na forma escolhida", JSON.stringify(run("getVilaoDaFase('kaio')")) === JSON.stringify({ key: "freeza_1", nivel: 1 }) && run("gameState") === "stages" && run("arenaPainel") === null);
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
