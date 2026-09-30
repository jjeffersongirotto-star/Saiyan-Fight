// tests/boss-rush-unlock.test.js — verificações desta atualização: todas as fases voltam a ficar bloqueadas,
// a próxima só libera depois de vencer o chefe da fase atual 10 vezes (dificuldade sobe progressivamente da
// 1ª vitória, mais fácil, até a 10ª, no teto), e ao vencer aparece um quadro com ataques feitos, rebatidas,
// itens coletados por tipo e golpes recebidos — "continuar" volta pro mapa de fases.
//
// Uso: node tests/boss-rush-unlock.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

// ---------- perfil novo: tudo bloqueado, só a 1ª fase liberada ----------
run("writeStorage('saiyan_stage_defeats', ''); stageBossDefeats = {}");
const freshNodes = run("getStageMapNodes()");
check("perfil novo: só a 1ª fase (Torneio de Artes Marciais) está liberada", freshNodes[0].unlocked === true && freshNodes.slice(1).every(n => !n.unlocked));
check("nenhuma fase começa com vitórias registradas", freshNodes.every(n => n.defeats === 0));

// ---------- dificuldade da luta: fácil na 1ª vez, sobe até o teto na 10ª ----------
check("0 vitórias na fase -> próxima luta é a mais fácil (onda 1)", run("getStageDifficultyWave(0)") === 1);
check("9 vitórias na fase -> a 10ª luta já é no teto de dificuldade", run("getStageDifficultyWave(9)") === run("WAVE_DIFFICULTY_CAP"));
check("depois de 10 vitórias, continua sempre no teto (não fica impossível)", run("getStageDifficultyWave(50)") === run("WAVE_DIFFICULTY_CAP"));

run("gameMode = 'singleplayer'; stageBossDefeats = {}; selectedStage = 'terra'; startGame()");
check("uma fase nunca vencida começa a luta na dificuldade mais fácil", run("waveNumber") === 1);
run("stageBossDefeats = { terra: 9 }; startGame()");
check("uma fase quase dominada (9 vitórias) começa a 10ª luta já no teto", run("waveNumber") === run("WAVE_DIFFICULTY_CAP"));

// ---------- vencer o chefe no modo história: NÃO avança onda automaticamente — mostra o quadro de vitória ----------
run("stageBossDefeats = {}; writeStorage('saiyan_stage_defeats', '')");
run("gameMode = 'singleplayer'; selectedStage = 'terra'; startGame(); player2.hp = 1; world.obstacles = [{ x: player2.x + 5, y: player2.y + 5, radius: 20, vx: 0, vy: 0, fromPlayer: true, color: '#0ff', damage: 5 }]");
const waveBefore = run("waveNumber");
run("update(1/60)");
check("chefe derrotado: o jogo NÃO pula pra uma onda mais difícil sozinho (não é mais infinito)", run("waveNumber") === waveBefore);
check("chefe derrotado: entra numa contagem antes do quadro aparecer (dá tempo da animação de derrota)", run("gameState") === "playing" && run("pendingStageVictoryTimer") > 0);
for (let i = 0; i < 40; i++) run("update(1/60)");
check("depois da contagem, aparece o quadro de vitória da fase", run("gameState") === "stage_victory");
check("a 1ª vitória contra o chefe daquela fase já fica registrada", run("getStageBossDefeats('terra', stageBossDefeats)") === 1);
check("essa vitória persiste no armazenamento (sobrevive a fechar o jogo)", JSON.parse(h.store["saiyan_stage_defeats"]).terra === 1);

// ---------- o quadro de vitória mostra as estatísticas certas da partida ----------
run("stageBossDefeats = {}; gameMode = 'singleplayer'; selectedStage = 'terra'; startGame()");
run("fireKiBarrage(player, false); fireKiBarrage(player, false); fireKiBarrage(player, false)"); // 3 ataques
run(`world.obstacles = [{ x: player.x + player.w/2, y: player.y + player.h/2 - 10, radius: 8, vx: 0, vy: 2, fromPlayer: false, color: '#fff' }]`);
run("tryReflect(player, false)"); // 1 rebatida
run("world.pickups = [{ type: 'senzu', x: player.x, y: player.y, w: 24, h: 24, vy: 0, spin: 0, pulse: 0 }]");
run("update(1/60)"); // coleta o item
run("player2.hp = 6; player.hp = 2; world.obstacles.push({ x: player.x+5, y: player.y+5, radius: 20, vx:0, vy:0, fromPlayer:false, color:'#fff', damage:1 })");
run("update(1/60)"); // leva 1 golpe
run("player2.hp = 1; world.obstacles.push({ x: player2.x+5, y: player2.y+5, radius: 20, vx:0, vy:0, fromPlayer:true, color:'#0ff', damage:5 })");
run("update(1/60)"); // e agora derrota o chefe
for (let i = 0; i < 40; i++) run("update(1/60)");
const stats = run("stageVictoryStats");
check("quadro de vitória: conta os ataques feitos certinho", stats.attacks === 3, JSON.stringify(stats));
check("quadro de vitória: conta as rebatidas certinho", stats.parries === 1);
check("quadro de vitória: conta os golpes recebidos certinho", stats.hitsReceived === 1);
check("quadro de vitória: conta os itens coletados, separados por tipo", stats.items.senzu === 1 && stats.items.staff === 0);

// ---------- clicar em CONTINUAR no quadro de vitória volta pro mapa de fases ----------
run("handleMenuClick(400, 317)");
check("CONTINUAR no quadro de vitória volta pro mapa de fases", run("gameState") === "stage_map");

// ---------- depois de 10 vitórias na fase, a próxima libera de verdade ----------
run("writeStorage('saiyan_stage_defeats', ''); stageBossDefeats = {}");
for (let i = 0; i < 10; i++) {
    run("gameMode = 'singleplayer'; selectedStage = 'terra'; startGame(); player2.hp = 1; world.obstacles = [{ x: player2.x + 5, y: player2.y + 5, radius: 20, vx: 0, vy: 0, fromPlayer: true, color: '#0ff', damage: 5 }]");
    run("update(1/60)");
    for (let f = 0; f < 40; f++) run("update(1/60)");
}
check("10 vitórias contra o chefe de Torneio de Artes Marciais registradas", run("getStageBossDefeats('terra', stageBossDefeats)") === 10);
check("com as 10 vitórias, o quadro avisa que a próxima fase foi liberada", run("stageVictoryStats.justUnlockedNext") === true);
const nodesAfterTen = run("getStageMapNodes()");
check("a 2ª fase (Planeta do Sr. Kaioh) agora aparece liberada no mapa", nodesAfterTen[1].unlocked === true);
check("mas a 3ª fase continua bloqueada (não pula fase)", nodesAfterTen[2].unlocked === false);

run("setGameState('menu')");
process.exit(summary());
