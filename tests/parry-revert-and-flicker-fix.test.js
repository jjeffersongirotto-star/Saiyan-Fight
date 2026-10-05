// tests/parry-revert-and-flicker-fix.test.js — verificações desta atualização: o parry voltou à mecânica
// simples original (devolve o golpe em linha reta, sem ângulo nenhum) — a versão com mira automática no
// adversário e desvio pelo ponto de impacto foi removida a pedido, por não estar agradando. Também confirma
// que o layout novo da tela de escolha de modo (sem os textos pequenos, botões mais abaixo) continua certo.
// E corrige um bug real: a aura de ki usava o relógio real do computador pra animar, então continuava
// piscando/se mexendo mesmo com o jogo pausado — agora usa um relógio próprio do jogo que congela na pausa.
//
// Uso: node tests/parry-revert-and-flicker-fix.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

// ---------- parry: mecânica simples de volta — sempre em linha reta, rumo ao adversário ----------
run("gameMode = 'singleplayer'; selectedStage = 'terra'; startGame()");

// não importa de onde o golpe vem (cima, baixo, meio) nem onde o vilão está — sempre sai reto (vy = 0)
run("player2.y = 20"); // vilão bem no alto — não deveria influenciar mais nada
for (const offsetY of [-50, -10, 0, 10, 50]) {
    run(`player.parryCooldown = 0; world.obstacles = [{ x: player.x + player.w/2, y: getParryCircle(player).y + ${offsetY}, radius: 8, vx: -3, vy: 7, fromPlayer: false, color: '#fff' }]`);
    run("tryReflect(player, false)");
    check(`parry (golpe a ${offsetY}px do centro): sai em linha reta, sem desvio vertical`, run("world.obstacles[0].vy") === 0);
    check(`parry (golpe a ${offsetY}px do centro): sempre rumo ao adversário (vx positivo)`, run("world.obstacles[0].vx") > 0);
}

// mudar a posição do vilão não muda mais nada no rebote (mira automática foi removida)
run("player2.y = 280");
run(`player.parryCooldown = 0; world.obstacles = [{ x: player.x + player.w/2, y: getParryCircle(player).y, radius: 8, vx: -3, vy: 0, fromPlayer: false, color: '#fff' }]`);
run("tryReflect(player, false)");
check("a posição do vilão não influencia mais o ângulo do rebote (é sempre reto)", run("world.obstacles[0].vy") === 0);

// o rebatido sai mais rápido que veio
run(`player.parryCooldown = 0; world.obstacles = [{ x: player.x + player.w/2, y: getParryCircle(player).y, radius: 8, vx: -5, vy: 0, fromPlayer: false, color: '#fff' }]`);
run("tryReflect(player, false)");
check("o golpe rebatido sai mais rápido do que veio", Math.abs(run("world.obstacles[0].vx")) > 5);

// co-op: o parry do jogador 2 manda reto pro lado oposto (rumo ao jogador 1)
run("gameMode = 'coop'; startGame()");
run(`world.obstacles = [{ x: player2.x - 5, y: player2.y + player2.h/2 - 30, radius: 8, vx: 3, vy: 2, fromPlayer: true, color: '#fff' }]`);
run("tryReflect(player2, true)");
check("co-op: o parry do jogador 2 sai em linha reta rumo ao jogador 1 (vx negativo)", run("world.obstacles[0].vx") < 0);
check("co-op: também sem desvio vertical", run("world.obstacles[0].vy") === 0);
run("gameMode = 'singleplayer'");

// ---------- tela de escolha de modo: sem textos pequenos, botões centralizados mais abaixo (ainda vale) ----------
run("setGameState('mode_select')");
h.calls.length = 0;
run("render()");
const modeTexts = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("não mostra mais o texto explicativo do CO-OP LOCAL", !modeTexts.some(t => t.includes("teclado ou controle")));
check("não mostra mais a contagem de controles conectados", !modeTexts.some(t => t.includes("Controles conectados")));

const singleRect = { x: 175, y: 176, w: 200, h: 58 }, coopRect = { x: 425, y: 176, w: 200, h: 58 };
run(`handleMenuClick(${singleRect.x + 50}, ${singleRect.y + 30})`);
check("botão SINGLEPLAYER, na posição nova (mais abaixo), ainda funciona", run("gameMode") === "singleplayer" && run("gameState") === "stage_map");
run("setGameState('mode_select')");
run(`handleMenuClick(${coopRect.x + 50}, ${coopRect.y + 30})`);
check("botão CO-OP LOCAL, na posição nova, ainda funciona", run("gameMode") === "coop" && run("gameState") === "playing");

// ---------- aura de ki: não pode mais piscar/animar com o jogo pausado (bug real encontrado e corrigido) ----------
// A aura usava o relógio real do computador pra animar — continuava se mexendo mesmo com o jogo pausado.
// Agora usa gameplayClock, que só anda de verdade dentro do render() enquanto gameState === "playing".
run("gameMode = 'singleplayer'; selectedStage = 'terra'; startGame()");
run("render()"); // deixa o relógio avançar um pouco em jogo normal
const clockWhilePlaying = run("gameplayClock");
check("o relógio da aura avança normalmente enquanto o jogo está rodando", clockWhilePlaying > 0);

run("gameState = 'paused'");
for (let i = 0; i < 10; i++) run("render()"); // 10 quadros "pausados" de verdade, chamando o render() real
check("o relógio da aura NÃO avança mais um só quadro com o jogo pausado (antes continuava, causando o piscar)", run("gameplayClock") === clockWhilePlaying);

run("gameState = 'playing'");
for (let i = 0; i < 5; i++) run("render()");
check("e volta a andar normalmente assim que a partida volta a rodar", run("gameplayClock") > clockWhilePlaying);

// ---------- banner de conquista: também não pode mais animar/contar tempo com o jogo pausado ----------
run("achievementBanner = { active: true, title: 'TESTE', timer: 5, maxTimer: 180, yOffset: 10 }");
run("gameState = 'paused'");
for (let i = 0; i < 8; i++) run("render()");
check("o banner de conquista não avança o timer nem desliza com o jogo pausado", run("achievementBanner.timer") === 5 && run("achievementBanner.yOffset") === 10);
run("gameState = 'playing'; lastFrameTime = performance.now() - 16; render()");   // 1 quadro de ~1/60 s (o aviso conta por tempo)
check("mas volta a animar normalmente assim que despausa", run("achievementBanner.timer") > 5);

run("setGameState('menu')");
process.exit(summary());
