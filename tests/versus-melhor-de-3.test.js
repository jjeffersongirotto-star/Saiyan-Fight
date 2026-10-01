// tests/versus-melhor-de-3.test.js — o modo de 2 jogadores é VERSUS (o jogador 2 controla o rival) em melhor
// de 3 rodadas: quem cai perde a rodada, a próxima começa com os dois de vida cheia, e quem vencer 2 rodadas
// ganha a partida, com a tela dizendo "JOGADOR 1 VENCEU!" ou "JOGADOR 2 VENCEU!". Antes era "CO-OP LOCAL" e a
// partida não acabava nunca (o rival voltava para sempre).
//
// Uso: node tests/versus-melhor-de-3.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
const semSpawns = "world.pickupSpawnTimer = -1e9; world.saibamanSpawnTimer = -1e9;";
const textosDesenhados = () => { h.calls.length = 0; run("render()"); return h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0])); };
const derrubarRival = () => {
    run(`player2.hp = 1; world.obstacles.push({ x: player2.x + 5, y: player2.y + 5, radius: 20, vx: 0, vy: 0, fromPlayer: true, color: '#0ff', damage: 5 })`);
    run("update(1/60)");   // o golpe acerta e o rival começa a sair voando
    for (let i = 0; i < 120 && run("player2.isDying"); i++) run("update(1/60)");
};
const derrubarJogador1 = () => run(`player.invulnerableTimer = 0; player.shield = false; player.hp = 1; world.obstacles.push({ x: player.x + 5, y: player.y + 5, radius: 20, vx: 0, vy: 0, fromPlayer: false, color: '#f00' }); update(1/60)`);

// ---------- nome do modo ----------
run("setGameState('mode_select')");
check("o botão do modo se chama VERSUS (não mais CO-OP)", textosDesenhados().some(t => t.startsWith("VERSUS")) && !textosDesenhados().some(t => t.includes("CO-OP")));

// ---------- partida: jogador 1 vence a 1ª rodada ----------
run("Object.keys(achievements).forEach(k => achievements[k].unlocked = false); stats.versusWinsTotal = 0; writeStorage('saiyan_ranking', ''); writeStorage('saiyan_stage_ranking', '')");
run("gameMode = 'coop'; startGame(); " + semSpawns);
check("começa na rodada 1 com placar 0 x 0", run("world.versusRound") === 1 && JSON.stringify(run("world.versusScore")) === '{"p1":0,"p2":0}');
let textos = textosDesenhados();
check("a tela da luta mostra RODADA e PLACAR (não 'WAVE')", textos.some(t => t.startsWith("RODADA 1")) && textos.some(t => t.startsWith("PLACAR: J1 0 x 0 J2")) && !textos.some(t => t.startsWith("WAVE")));
derrubarRival();
check("rival derrotado: jogador 1 vence a rodada (1 x 0) e começa a rodada 2", JSON.stringify(run("world.versusScore")) === '{"p1":1,"p2":0}' && run("world.versusRound") === 2);
check("a rodada nova começa com os dois de vida cheia, no lugar", run("player.hp === player.maxHp && player2.hp === player2.maxHp && !player2.isDying && player2.x === 680"));
check("a partida continua (ainda não acabou)", run("gameState") === "playing");

// ---------- jogador 1 cai: Zenkai salva a 1ª vez; na 2ª o jogador 2 vence a rodada ----------
derrubarJogador1();
check("1ª queda do jogador 1: a Zenkai o salva (não perde a rodada)", run("player.zenkaiUsed") && run("player.hp") === 1 && JSON.stringify(run("world.versusScore")) === '{"p1":1,"p2":0}');
derrubarJogador1();
check("2ª queda: o jogador 2 vence a rodada (1 x 1) e vem a rodada decisiva", JSON.stringify(run("world.versusScore")) === '{"p1":1,"p2":1}' && run("world.versusRound") === 3 && run("gameState") === "playing");

// ---------- jogador 2 vence a rodada decisiva: fim de partida ----------
derrubarJogador1();
check("jogador 2 chega a 2 rodadas: a partida acaba", run("gameState") === "gameover" && run("gameOverStats.versusWinner") === "p2");
textos = textosDesenhados();
check("a tela final diz 'JOGADOR 2 VENCEU!' e o placar 1 x 2", textos.includes("JOGADOR 2 VENCEU!") && textos.some(t => t.startsWith("PLACAR FINAL: 1 x 2")) && !textos.includes("VOCÊ FOI DERROTADO!"));
check("jogador 2 vencendo não conta como vitória do jogador 1 nas conquistas", run("stats.versusWinsTotal") === 0 && !run("achievements.versus_win_first.unlocked"));
check("partida do Versus não entra no ranking (o ranking é do modo história)", run("readJsonStorage('saiyan_ranking', []).length") === 0 && run("getStageRecord(selectedStage)") === 0);
run("handleMenuClick(400, 175)");
check("tocar na tela final volta ao menu", run("gameState") === "menu");

// ---------- jogador 1 vence a partida (2 x 0) ----------
run("gameMode = 'coop'; startGame(); " + semSpawns);
derrubarRival();
derrubarRival();
check("jogador 1 vence 2 x 0: fim de partida com 'JOGADOR 1 VENCEU!'", run("gameState") === "gameover" && run("gameOverStats.versusWinner") === "p1" && textosDesenhados().includes("JOGADOR 1 VENCEU!"));
check("vitória do jogador 1 conta nas conquistas do Versus", run("stats.versusWinsTotal") === 1 && run("achievements.versus_win_first.unlocked"));

// ---------- modo história continua igual ----------
run("gameMode = 'singleplayer'; stageMode = 'normal'; startGame(); " + semSpawns);
derrubarJogador1();
check("modo história: cair continua sendo derrota normal ('VOCÊ FOI DERROTADO!')", run("gameState") === "gameover" && !run("gameOverStats.versusWinner") && textosDesenhados().includes("VOCÊ FOI DERROTADO!"));

run("setGameState('menu')");
process.exit(summary());
