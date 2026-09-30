// tests/three-modes-and-hud.test.js — a mecânica de dificuldade mudou de novo, a pedido: em vez de "vença o
// chefe 10 vezes seguidas sem morrer" (considerado difícil demais), agora cada fase tem 3 modos: NORMAL (5
// ondas, dificuldade 1-5, sempre disponível), DIFÍCIL (5 ondas, dificuldade 2-4-6-8-10, libera completando o
// normal) e SEM LIMITE (as 10 ondas reais e continua além, libera completando os dois). Completar o NORMAL já
// libera a próxima fase — não precisa do difícil pra isso. Também cobre o HUD novo (onda atual + recorde da
// fase abaixo da barra de vida do vilão).
//
// Uso: node tests/three-modes-and-hud.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

function killBoss() {
    // Tira os saibamans do caminho: às vezes um nascia bem onde o chefe entra na tela, o golpe acertava o
    // saibaman primeiro e o chefe não morria — o teste falhava de vez em quando (15 ondas em vez de 16).
    run("world.saibamans = []");
    run("player2.hp = 1; world.obstacles.push({ x: player2.x + 5, y: player2.y + 5, radius: 20, vx: 0, vy: 0, fromPlayer: true, color: '#0ff', damage: 5 })");
    run("update(1/60)");
}
function letBossFlyOff() {
    for (let i = 0; i < 30; i++) run("update(1/60)");
}

// ---------- perfil novo: só a 1ª fase liberada, nenhum modo completado em lugar nenhum ----------
run("writeStorage('saiyan_stage_progress', ''); stageProgress = {}");
const freshNodes = run("getStageMapNodes()");
check("perfil novo: só a 1ª fase está liberada", freshNodes[0].unlocked === true && freshNodes.slice(1).every(n => !n.unlocked));
check("DIFÍCIL começa bloqueado em toda fase (precisa completar o normal primeiro)", run("isHardModeUnlocked('terra', {})") === false);
check("SEM LIMITE começa bloqueado também", run("isUnlimitedModeUnlocked('terra', {})") === false);

// ---------- modo NORMAL: 5 ondas, dificuldade 1 a 5, completar já libera a próxima fase (não precisa do difícil) ----------
run("gameMode = 'singleplayer'; selectedStage = 'terra'; stageMode = 'normal'; startGame()");
check("modo normal começa na onda 1 (a mais fácil)", run("waveNumber") === 1);
for (const expectedWave of [2, 3, 4, 5]) {
    killBoss();
    letBossFlyOff();
    if (expectedWave <= 5) check(`modo normal: depois de vencer, vai pra onda ${expectedWave} (sequência 1-5)`, run("waveNumber") === expectedWave || run("gameState") === "stage_victory");
}
// a 5ª vitória fecha o modo
killBoss();
letBossFlyOff();
check("completar as 5 ondas do normal mostra o quadro de vitória", run("gameState") === "stage_victory");
check("o modo concluído registrado é 'normal'", run("stageVictoryStats.mode") === "normal");
check("o quadro avisa que a próxima fase foi liberada", run("stageVictoryStats.justUnlockedNext") === true);
check("NÃO avisa sobre sem limite (só completou o normal, falta o difícil ainda)", run("stageVictoryStats.justUnlockedUnlimited") === false);
check("o progresso fica salvo: normalDone true, hardDone ainda false", run("stageProgress.terra.normalDone") === true && run("stageProgress.terra.hardDone") !== true);
check("isso persiste de verdade no armazenamento", JSON.parse(h.store["saiyan_stage_progress"]).terra.normalDone === true);

const nodesAfterNormal = run("getStageMapNodes()");
check("a 2ª fase já aparece liberada, sem precisar do difícil", nodesAfterNormal[1].unlocked === true);
check("mas o DIFÍCIL da 1ª fase agora está liberado (era bloqueado antes)", run("isHardModeUnlocked('terra', stageProgress)") === true);
check("o SEM LIMITE ainda não (falta completar o difícil também)", run("isUnlimitedModeUnlocked('terra', stageProgress)") === false);

// ---------- modo DIFÍCIL: 5 ondas, mas nos degraus 2,4,6,8,10 — completar libera o SEM LIMITE dessa fase ----------
run("gameMode = 'singleplayer'; selectedStage = 'terra'; stageMode = 'hard'; startGame()");
check("modo difícil já começa na onda 2 (não na 1)", run("waveNumber") === 2);
for (let i = 0; i < 4; i++) { killBoss(); letBossFlyOff(); }
const wavesSeen = [];
run("gameMode = 'singleplayer'; selectedStage = 'terra'; stageMode = 'hard'; startGame()");
for (let i = 0; i < 5; i++) { wavesSeen.push(run("waveNumber")); killBoss(); letBossFlyOff(); }
check("modo difícil percorre exatamente as ondas 2, 4, 6, 8, 10 (pulando os degraus fáceis)", JSON.stringify(wavesSeen) === JSON.stringify([2, 4, 6, 8, 10]), JSON.stringify(wavesSeen));
check("completar o difícil mostra o quadro de vitória", run("gameState") === "stage_victory");
check("dessa vez libera o SEM LIMITE (completou normal e difícil)", run("stageVictoryStats.justUnlockedUnlimited") === true);
check("o SEM LIMITE realmente está liberado agora nessa fase", run("isUnlimitedModeUnlocked('terra', stageProgress)") === true);

// ---------- modo SEM LIMITE: as 10 ondas reais e continua além, sem nunca "completar" sozinho ----------
run("gameMode = 'singleplayer'; selectedStage = 'terra'; stageMode = 'unlimited'; startGame()");
check("modo sem limite começa na onda 1", run("waveNumber") === 1);
for (let i = 0; i < 10; i++) { killBoss(); letBossFlyOff(); }
check("depois de passar da onda 10, continua jogando (nunca mostra o quadro de vitória sozinho)", run("gameState") === "playing" && run("waveNumber") === 11);
for (let i = 0; i < 5; i++) { killBoss(); letBossFlyOff(); }
check("e continua indo além disso também, sempre no teto de dificuldade", run("gameState") === "playing" && run("waveNumber") === 16);

// ---------- recorde de ondas por fase: atualiza a cada chefe derrotado, guarda o maior já alcançado ----------
// (waveNumber=16 é a PRÓXIMA luta; a última onda de verdade DERROTADA foi a 15 — é isso que o recorde guarda)
check("o recorde de ondas da fase reflete a maior onda já derrotada (a 15ª, no sem limite)", run("getStageWaveRecordFor('terra')") === 15);
run("gameMode = 'singleplayer'; selectedStage = 'terra'; stageMode = 'normal'; startGame()"); // uma luta mais fácil depois
killBoss(); letBossFlyOff();
check("uma vitória mais fácil depois não abaixa o recorde (ele só sobe)", run("getStageWaveRecordFor('terra')") === 15);

// ---------- morrer no meio de um modo não guarda progresso parcial daquela tentativa ----------
run("gameMode = 'singleplayer'; selectedStage = 'kaio'; stageMode = 'normal'; startGame()"); // fase ainda intocada
killBoss(); letBossFlyOff(); // 1ª de 5
check("chegou na 2ª luta do normal em kaio", run("waveNumber") === 2);
run("player.hp = 1; world.obstacles.push({ x: player.x+5, y: player.y+5, radius: 20, vx:0, vy:0, fromPlayer:false, color:'#fff', damage:5 })");
run("update(1/60)");
check("morrer no meio do modo é game over de verdade", run("gameState") === "gameover");
check("o modo normal de kaio NÃO fica marcado como completo por causa disso", run("stageProgress.kaio && stageProgress.kaio.normalDone") !== true);
run("gameMode = 'singleplayer'; selectedStage = 'kaio'; stageMode = 'normal'; startGame()");
check("a próxima tentativa começa do zero (onda 1 de novo, não continua da 2ª)", run("waveNumber") === 1);

// ---------- overlay do mapa: DIFÍCIL e SEM LIMITE aparecem apagados até liberar ----------
run("writeStorage('saiyan_stage_progress', ''); stageProgress = {}; setGameState('stage_map')");
run("handleMenuClick(getStageMapNodes()[0].x, getStageMapNodes()[0].y)");
check("clicar numa fase liberada sempre mostra a escolha de modo (não começa direto)", run("stageChoicePendingId") === "terra");
h.calls.length = 0;
run("render()");
const overlayTexts = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("mostra os 3 modos na tela de escolha", overlayTexts.some(t => t.includes("NORMAL")) && overlayTexts.some(t => t === "DIFÍCIL") && overlayTexts.some(t => t === "SEM LIMITE"));
check("DIFÍCIL e SEM LIMITE aparecem marcados como bloqueados quando ainda não liberados", overlayTexts.filter(t => t === "BLOQUEADO").length === 2);

// clicar no NORMAL sempre funciona
run("handleMenuClick(400 - 270 + 85, 140 + 30)");
check("clicar em NORMAL funciona e começa a partida nesse modo", run("stageMode") === "normal" && run("gameState") === "playing");

// clicar onde o DIFÍCIL estaria, enquanto bloqueado, não faz nada (continua no overlay)
run("stageProgress = {}; setGameState('stage_map'); handleMenuClick(getStageMapNodes()[0].x, getStageMapNodes()[0].y)");
run("handleMenuClick(400 - 85 + 85, 140 + 30)"); // onde fica o botão DIFÍCIL
check("clicar no DIFÍCIL bloqueado não inicia partida nenhuma", run("gameState") === "stage_map" && run("stageChoicePendingId") === "terra");

run("setGameState('menu')");
process.exit(summary());
