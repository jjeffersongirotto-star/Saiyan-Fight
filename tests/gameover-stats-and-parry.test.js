// tests/gameover-stats-and-parry.test.js — verificações desta atualização: a tela de derrota agora mostra o
// que foi feito na tentativa (mesmo sem dominar a fase) e avisa de novo recorde; o parry agora sempre rebate
// rumo ao adversário, com o ângulo controlado por onde o golpe foi pego (estilo "paddle"), em vez de sair pra
// qualquer lado; e o overlay de escolha da fase dominada não tem mais texto em cima do botão VOLTAR.
//
// Uso: node tests/gameover-stats-and-parry.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

// ---------- game over mostra estatísticas mesmo sem dominar a fase ----------
run("writeStorage('saiyan_ranking', ''); writeStorage('saiyan_stage_ranking', '')");
run("gameMode = 'singleplayer'; selectedStage = 'terra'; startGame()");
run("fireKiBarrage(player, false); fireKiBarrage(player, false)");
run(`world.obstacles = [{ x: player.x + player.w/2, y: player.y + player.h/2 - 5, radius: 8, vx: 0, vy: 2, fromPlayer: false, color: '#fff' }]`);
run("tryReflect(player, false)");
run("world.pickups = [{ type: 'capsule', x: player.x, y: player.y, w: 24, h: 24, vy: 0, spin: 0, pulse: 0 }]");
run("update(1/60)");
run("player.hp = 1; player.shield = false; world.obstacles.push({ x: player.x+5, y: player.y+5, radius: 20, vx:0, vy:0, fromPlayer:false, color:'#fff', damage:5 })");
run("update(1/60)");
check("morrer sem dominar a fase ainda é game over de verdade", run("gameState") === "gameover");
const gs = run("gameOverStats");
check("a tela de derrota guarda os ataques feitos na tentativa", gs.attacks === 2, JSON.stringify(gs));
check("a tela de derrota guarda as rebatidas feitas", gs.parries === 1);
check("a tela de derrota guarda os itens coletados, separados por tipo", gs.items.capsule === 1 && gs.items.senzu === 0);
check("a tela de derrota guarda os golpes recebidos", gs.hitsReceived === 1);

// ---------- registra recorde (fase e geral) mesmo perdendo, se a pontuação for a maior até agora ----------
check("1ª partida: já é recorde (fase e geral), pois não havia nenhuma pontuação antes", gs.isNewStageRecord === true && gs.isNewGeneralRecord === true);
check("o recorde da fase já aparece salvo de verdade", run("getStageRecord('terra')") === run("score"));

run("gameMode = 'singleplayer'; selectedStage = 'terra'; startGame(); score = 0");
run("player.hp = 1; player.shield = false; world.obstacles.push({ x: player.x+5, y: player.y+5, radius: 20, vx:0, vy:0, fromPlayer:false, color:'#fff', damage:5 })");
run("update(1/60)");
check("uma pontuação pior (0) NÃO é registrada como novo recorde", run("gameOverStats.isNewStageRecord") === false && run("gameOverStats.isNewGeneralRecord") === false);

// ---------- parry: mecânica simples — devolve em linha reta, rumo ao adversário ----------
run("gameMode = 'singleplayer'; selectedStage = 'terra'; startGame()");
// golpe vindo de cima
run(`world.obstacles = [{ x: player.x + player.w/2, y: player.y + player.h/2 - 40, radius: 8, vx: -3, vy: 5, fromPlayer: false, color: '#fff' }]`);
run("tryReflect(player, false)");
check("parry (golpe vindo de cima): sai sempre rumo ao adversário (vx positivo)", run("world.obstacles[0].vx") > 0);
check("parry: sai em linha reta, sem componente vertical", run("world.obstacles[0].vy") === 0);

// golpe vindo de baixo
run(`world.obstacles = [{ x: player.x + player.w/2, y: player.y + player.h/2 + 40, radius: 8, vx: -3, vy: -5, fromPlayer: false, color: '#fff' }]`);
run("tryReflect(player, false)");
check("parry (golpe vindo de baixo): sai sempre rumo ao adversário (vx positivo)", run("world.obstacles[0].vx") > 0);
check("parry: continua saindo em linha reta, independente de onde veio", run("world.obstacles[0].vy") === 0);

// golpe vindo bem no meio (quase na mesma altura do jogador)
run(`world.obstacles = [{ x: player.x + player.w/2, y: player.y + player.h/2, radius: 8, vx: -3, vy: 0, fromPlayer: false, color: '#fff' }]`);
run("tryReflect(player, false)");
check("parry (golpe no meio): sai reto, sem desvio vertical", run("world.obstacles[0].vy") === 0);

// nenhum caso deveria mandar o golpe de volta pro lado do próprio jogador (vx negativo)
for (const y of [-60, -20, 0, 20, 60]) {
    run(`world.obstacles = [{ x: player.x + player.w/2, y: player.y + player.h/2 + ${y}, radius: 8, vx: -2, vy: 0, fromPlayer: false, color: '#fff' }]`);
    run("tryReflect(player, false)");
    check(`parry a ${y}px do centro nunca manda de volta pro próprio jogador`, run("world.obstacles[0].vx") > 0);
}

// co-op: o parry do jogador 2 manda pro lado oposto (rumo ao jogador 1, que fica à esquerda)
run("gameMode = 'coop'; startGame()");
run(`world.obstacles = [{ x: player2.x - 5, y: player2.y + player2.h/2, radius: 8, vx: 3, vy: 0, fromPlayer: true, color: '#fff' }]`);
run("tryReflect(player2, true)");
check("co-op: o parry do jogador 2 sempre manda o golpe pra esquerda (rumo ao jogador 1)", run("world.obstacles[0].vx") < 0);
run("gameMode = 'singleplayer'");

// ---------- overlay de escolha de modo: sem o texto pequeno embaixo, tudo centralizado mais acima ----------
run("writeStorage('saiyan_stage_progress', JSON.stringify({ terra: { normalDone: true } })); stageProgress = { terra: { normalDone: true } }; setGameState('stage_map')");
run("handleMenuClick(getStageMapNodes()[0].x, getStageMapNodes()[0].y)");
check("mostra o overlay de escolha", run("stageChoicePendingId") === "terra");
h.calls.length = 0;
run("render()");
const textCalls = h.calls.filter(c => c[0] === "fillText");
check("não mostra mais o texto pequeno explicando os modos embaixo dos botões", !textCalls.some(c => String(c[1][0]).startsWith("NORMAL: ondas") || String(c[1][0]).startsWith("SEM LIMITE: todas")));

const voltarRectX = 400 - 70, voltarRectY = 224;
run(`handleMenuClick(${voltarRectX + 70}, ${voltarRectY + 15})`);
check("o botão VOLTAR (na posição nova, mais acima) ainda funciona e fecha o overlay", run("stageChoicePendingId") === null);

run("setGameState('menu')");
process.exit(summary());
