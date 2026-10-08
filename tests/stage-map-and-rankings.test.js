// tests/stage-map-and-rankings.test.js — verificações da atualização: mapa de fases no singleplayer,
// recorde/ranking individual por arena, e a divisão GERAL/POR FASE na tela de Ranking.
//
// Uso: node tests/stage-map-and-rankings.test.js
// Autocontido: usa createHarness (tests/harness.js), não depende de nenhum outro arquivo de teste.

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

// ---------- ranking por arena: gravar e ler ----------
run("writeStorage('saiyan_ranking', ''); writeStorage('saiyan_stage_ranking', '')");
run("selectedStage = 'namek'; score = 42; saveRankingScore(score); saveStageRankingScore(selectedStage, score)");
check("saveStageRankingScore grava o score na arena certa", run("getStageRankingList('namek')").some(r => r.score === 42));
check("getStageRecord devolve o melhor score daquela arena", run("getStageRecord('namek')") === 42);
check("arena sem nenhum jogo registrado tem recorde 0", run("getStageRecord('kaioshin')") === 0);

run("saveStageRankingScore('namek', 10); saveStageRankingScore('namek', 99); saveStageRankingScore('namek', 55)");
const namekList = run("getStageRankingList('namek')");
check("lista da arena fica ordenada, maior primeiro", namekList[0].score === 99 && namekList[1].score === 55);
check("lista da arena guarda no máximo 5, igual ao ranking geral", run(`
    for (let i = 0; i < 10; i++) saveStageRankingScore('terra', i);
    getStageRankingList('terra').length
`) === 5);

check("ranking de uma arena não mistura com o de outra", run("getStageRankingList('kaio').some(r => r.score === 99)") === false);

// ---------- fim de partida grava os dois rankings (geral + da arena) ----------
run("writeStorage('saiyan_ranking', ''); writeStorage('saiyan_stage_ranking', '')");
const doneUpToFreeza = { kame: { normalDone: true }, terra: { normalDone: true }, kaio: { normalDone: true }, namek: { normalDone: true } };
run(`gameMode = 'singleplayer'; writeStorage('saiyan_stage_progress', ${JSON.stringify(JSON.stringify(doneUpToFreeza))}); stageProgress = ${JSON.stringify(doneUpToFreeza)}; selectedStage = 'freeza_ship'; startGame(); score = 7; player.hp = 1; world.obstacles = [{ x: player.x + player.w/2, y: player.y + player.h/2, radius: 20, vx: 0, vy: 0, fromPlayer: false, color: '#fff', damage: 5 }]`);
run("update(1/60)");
check("game over grava no ranking GERAL", run("readJsonStorage('saiyan_ranking', [])").some(r => r.score === 7));
check("game over grava no ranking DA ARENA que estava selecionada", run("getStageRankingList('freeza_ship')").some(r => r.score === 7));

// ---------- mapa de fases: abrir o singleplayer leva ao mapa, não direto pro jogo ----------
run("setGameState('mode_select'); handleMenuClick(275, 200)");
check("escolher SINGLEPLAYER abre o mapa de fases (não começa a partida na hora)", run("gameState") === "stage_map" && run("gameMode") === "singleplayer");

// ---------- nós do mapa seguem STAGE_PROGRESSION, com liberado/bloqueado corretos (completar o normal libera a próxima) ----------
run("stageProgress = {}");
let nodes = run("getStageMapNodes()");
check("mapa tem um nó por fase, na mesma ordem/ids de STAGE_PROGRESSION", nodes.length === run("STAGE_PROGRESSION.length") && nodes.every((n, i) => n.id === run("STAGE_PROGRESSION")[i].id));
check("sem nenhum modo normal completado, só a 1ª fase está liberada no mapa", nodes[0].unlocked === true && nodes.slice(1).every(n => !n.unlocked));

const allNormalDone = {}; run("STAGE_PROGRESSION").forEach(s => { allNormalDone[s.id] = { normalDone: true }; });
run(`stageProgress = ${JSON.stringify(allNormalDone)}`);
nodes = run("getStageMapNodes()");
check("com o normal de todas completado, todas as fases aparecem liberadas", nodes.every(n => n.unlocked === true));

// ---------- clicar num nó bloqueado avisa e não muda a fase; num liberado, sempre abre a escolha de modo ----------
run("stageProgress = {}; setGameState('stage_map'); selectedStage = 'kame'; stageLockedHintTimer = 0");
const lockedNode = run("getStageMapNodes()[3]"); // freeza_ship, ainda bloqueada
run(`handleMenuClick(${lockedNode.x}, ${lockedNode.y})`);
check("clicar numa fase bloqueada avisa e mantém a fase atual", run("selectedStage") === "kame" && run("stageLockedHintTimer") > 0 && run("gameState") === "stage_map");

const unlockedNode = run("getStageMapNodes()[0]"); // ilha do Kame, sempre liberada
run(`handleMenuClick(${unlockedNode.x}, ${unlockedNode.y})`);
check("clicar numa fase liberada abre a escolha de modo (não começa direto)", run("stageChoicePendingId") === "kame" && run("gameState") === "stage_map");
run("handleMenuClick(400 - 270 + 85, 140 + 30)"); // botão NORMAL
check("escolher NORMAL seleciona a fase e abre a seleção de personagem (0.81) nesse modo", run("selectedStage") === "kame" && run("stageMode") === "normal" && run("gameState") === "characters" && run("selecaoLuta") === "solo");

// ---------- depois de liberar uma fase nova, dá pra escolher ela OU repetir uma anterior já com normal completo ----------
const upToFour = { kame: { normalDone: true }, terra: { normalDone: true }, kaio: { normalDone: true }, namek: { normalDone: true }, freeza_ship: { normalDone: true } }; // completou o normal das 5 primeiras -> libera até a 6ª (índice 5)
run(`stageProgress = ${JSON.stringify(upToFour)}; setGameState('stage_map')`);
nodes = run("getStageMapNodes()");
check("com progresso parcial, tanto a fase nova quanto as anteriores aparecem liberadas ao mesmo tempo", nodes[5].unlocked === true && nodes[0].unlocked === true && nodes[6].unlocked === false);

// repetir uma fase já com o normal completo também abre a escolha de modo (agora com DIFÍCIL liberado)
run(`handleMenuClick(${nodes[1].x}, ${nodes[1].y})`); // kaio, normal já completo
check("clicar numa fase com o normal completo também abre a escolha de modo", run("stageChoicePendingId") === nodes[1].id && run("gameState") === "stage_map");
run("handleMenuClick(400 - 85 + 85, 140 + 30)"); // botão DIFÍCIL, agora liberado
check("escolher DIFÍCIL funciona quando já liberado", run("selectedStage") === nodes[1].id && run("stageMode") === "hard" && run("gameState") === "characters");

// a fase nova (normal ainda não completo) também abre a escolha — só que só o NORMAL funciona nela
run(`setGameState('stage_map'); handleMenuClick(${nodes[5].x}, ${nodes[5].y})`);
check("fase liberada mas com normal ainda não completo também mostra a escolha", run("stageChoicePendingId") === nodes[5].id);
run("handleMenuClick(400 - 270 + 85, 140 + 30)"); // botão NORMAL
check("e o NORMAL sempre funciona nela", run("selectedStage") === nodes[5].id && run("stageMode") === "normal" && run("gameState") === "characters" && run("selecaoLuta") === "solo");

// ---------- estrada entre as fases (0.84: mapa de progresso; acende só até onde está liberado) ----------
run(`stageProgress = ${JSON.stringify({ kame: { normalDone: true }, terra: { normalDone: true }, kaio: { normalDone: true } })}; setGameState('stage_map')`); // libera até namek (índice 3)
h.calls.length = 0;
run("render()");
check("a estrada liga as fases (faixa do meio tracejada)", h.calls.some(c => c[0] === "setLineDash") && h.calls.filter(c => c[0] === "lineTo").length >= 70);

// ---------- tela de Ranking: geral x por fase ----------
run("setGameState('ranking'); rankingViewMode = 'geral'");
run("handleMenuClick(410 + 40, 52 + 15)"); // aba POR FASE
check("clicar em POR FASE troca a visão do ranking", run("rankingViewMode") === "fase");
run("rankingSelectedStage = 'terra'");
run("handleMenuClick(40 + 92 * 3, 90 + 10)"); // 4ª mini-arena da fileira (freeza_ship)
check("selecionar outra arena na visão por fase troca qual ranking está sendo visto", run("rankingSelectedStage") === run("STAGE_PROGRESSION")[3].id);
run("handleMenuClick(220 + 40, 52 + 15)"); // aba GERAL
check("clicar em GERAL volta pro ranking geral", run("rankingViewMode") === "geral");

process.exit(summary());
