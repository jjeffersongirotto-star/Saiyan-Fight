// tests/stage-order-and-tutorial-fix.test.js — verificações da sequência de fases (atualizada de novo desde
// então: Torneio de Cell é a penúltima, Planeta Supremo Kaioh é a última — ver tests/boss-rush-unlock.test.js
// para o sistema de desbloqueio atual, por vitórias) e do painel do tutorial não cobrir os botões de toque.
//
// Uso: node tests/stage-order-and-tutorial-fix.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, fire, touch, summary } = h;

// ---------- ordem das fases ----------
const order = run("STAGE_PROGRESSION.map(s => s.id)");
check("Nave de Freeza é a fase 4", order[3] === "freeza_ship", JSON.stringify(order));
check("Torneio de Cell é a penúltima fase (7ª)", order[6] === "cell_games", JSON.stringify(order));
check("Planeta Supremo Kaioh é a última fase (8ª)", order[7] === "kaioshin", JSON.stringify(order));
check("continuam sendo 8 fases", order.length === 8);

// o mapa de fases usa a mesma ordem — o nó na posição 4 do mapa já é a Nave de Freeza
const nodes = run("getStageMapNodes()");
check("mapa de fases: o 4º nó já é a Nave de Freeza", nodes[3].id === "freeza_ship");
check("mapa de fases: o 8º (último) nó já é o Planeta Supremo Kaioh", nodes[7].id === "kaioshin");
check("mapa de fases: o 7º nó já é o Torneio de Cell", nodes[6].id === "cell_games");

// ---------- tutorial: o balão de instrução não pode cobrir os botões de toque (o bug relatado) ----------
run("isTouchDevice = true; startTutorial(); tutorialStepIndex = 1; setupTutorialStep()");
const ui = run("getTutorialUiLayout()");
const bubbleRect = { x: ui.bubbleX, y: ui.bubbleY, w: ui.bubbleW, h: ui.bubbleH };
const hudButtons = ["attack", "charge", "parry", "special"];
const overlapsBanner = (r) => r.x < bubbleRect.x + bubbleRect.w && r.x + r.w > bubbleRect.x && r.y < bubbleRect.y + bubbleRect.h && r.y + r.h > bubbleRect.y;
hudButtons.forEach(key => {
    const r = run(`getHudButtonRect("${key}")`);
    check(`balão do tutorial não cobre o botão de ${key.toUpperCase()} (o jogador consegue ver e tocar)`, !overlapsBanner(r), JSON.stringify(r));
});

// o balão também não pode cobrir o ícone de pausa (fica sempre no topo-centro, y 8-36)
const pauseRect = { x: 800 / 2 - 22, y: 8, w: 44, h: 28 };
check("balão do tutorial fica abaixo do ícone de pausa, nunca em cima", ui.bubbleY >= pauseRect.y + pauseRect.h);

// os botões PULAR/SAIR do próprio painel também não podem cair em cima dos botões do jogo
const pularRect = ui.pular, sairRect = ui.sair;
const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
hudButtons.forEach(key => {
    const r = run(`getHudButtonRect("${key}")`);
    check(`botão PULAR do tutorial não cai em cima do botão de ${key.toUpperCase()}`, !rectsOverlap(pularRect, r));
    check(`botão SAIR do tutorial não cai em cima do botão de ${key.toUpperCase()}`, !rectsOverlap(sairRect, r));
});

// ---------- tutorial: tocar de verdade no botão de ATAQUE (passo 2) funciona, sem nada bloqueando ----------
run("tutorialStepIndex = 1; setupTutorialStep(); world.obstacles = []");
const [ax, ay] = (() => { const r = run('getHudButtonRect("attack")'); return [r.x + r.w / 2, r.y + r.h / 2]; })();
fire("touchstart", [touch(1, ax, ay)], [touch(1, ax, ay)]);
fire("touchend", [], [touch(1, ax, ay)]);
check("tocar no botão de ATAQUE de verdade funciona e o passo avança (não fica mais travado)", run("world.obstacles.some(o => o.fromPlayer)") && run("tutorialPhase") === "effect");

// ---------- tutorial: tocar no botão de CARREGAR (passo 3) também funciona ----------
run("tutorialStepIndex = 2; setupTutorialStep()");
const [cx, cy] = (() => { const r = run('getHudButtonRect("charge")'); return [r.x + r.w / 2, r.y + r.h / 2]; })();
fire("touchstart", [touch(2, cx, cy)], [touch(2, cx, cy)]);
for (let i = 0; i < 40; i++) run("updateTutorial(1/60)");
fire("touchend", [], [touch(2, cx, cy)]);
check("segurar o botão de CARREGAR de verdade funciona e o ki sobe (não fica mais travado)", run("player.ki") > 0 && run("tutorialPhase") === "effect");

run("setGameState('menu')");
process.exit(summary());
