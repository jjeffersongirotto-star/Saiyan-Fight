// tests/tutorial-doubletap-and-hold.test.js — verificações desta correção: no passo 4/7 (PARRY) do tutorial
// mobile, o botão PARRY fica escondido de propósito quando "duplo toque" está ativado (padrão do jogo) — o
// tutorial instruía tocar num botão que nunca aparecia, e o duplo toque nem avisava o tutorial quando
// funcionava. Também: segurar o dedo (analógico/tela) para atirar sem parar agora funciona dentro do tutorial.
//
// Uso: node tests/tutorial-doubletap-and-hold.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, fire, touch, summary } = h;

// ---------- passo 4/7 (PARRY): o botão realmente não aparece com duplo toque ligado (padrão) ----------
run("isTouchDevice = true; mobileDoubleTapParry = true; startTutorial(); tutorialStepIndex = 3; setupTutorialStep()");
check("confirma o padrão: duplo toque vem ATIVADO de fábrica", run("mobileDoubleTapParry") === true);
const parryBtnCenter = (() => { const r = run('getHudButtonRect("parry")'); return [r.x + r.w / 2, r.y + r.h / 2]; })();
check("tocando exatamente onde o botão PARRY ficaria, o jogo não reconhece como esse botão (ele está desativado)", run(`getHudButtonAt(${parryBtnCenter[0]}, ${parryBtnCenter[1]})`) !== "parry");

// a instrução agora pede duplo toque, não mais o botão que não existe
const lines = run('getTutorialInstructionLines("parry")');
check("a instrução do passo de PARRY (toque, duplo-toque ligado) pede duplo toque, não um botão", /2 VEZES/.test(lines[0]) && !/BOTÃO/.test(lines[0]));

// ---------- o duplo toque de verdade agora avisa o tutorial (antes só o botão/teclado avisavam) ----------
run(`world.obstacles = [{ x: player.x + player.w/2, y: player.y + player.h/2 - 20, radius: 8, vx: 0, vy: 3, fromPlayer: false, color: '#fff' }]`);
run("lastTouchTime = 0");
fire("touchstart", [touch(1, 400, 60)], [touch(1, 400, 60)]);
fire("touchend", [], [touch(1, 400, 60)]);
fire("touchstart", [touch(1, 400, 60)], [touch(1, 400, 60)]);
fire("touchend", [], [touch(1, 400, 60)]);
check("duplo toque numa área livre da tela conta como o parry do tutorial e avança o passo", run("tutorialPhase") === "effect");

// se DESLIGAR o duplo toque (opção do jogador), o botão volta a aparecer e a instrução muda de volta
run("mobileDoubleTapParry = false; tutorialStepIndex = 3; setupTutorialStep()");
const withButton = run('getTutorialInstructionLines("parry")');
check("com duplo toque desligado, o botão PARRY volta a existir", run(`getHudButtonAt(${parryBtnCenter[0]}, ${parryBtnCenter[1]})`) === "parry");
check("e a instrução volta a pedir o botão, não mais o duplo toque", /BOTÃO/.test(withButton[0]) && !/2 VEZES/.test(withButton[0]));
run("mobileDoubleTapParry = true");

// ---------- passo 2/7 (ATAQUE): segurar o dedo (analógico) também atira sem parar, igual no jogo de verdade ----------
run("touchAutoFire = true; tutorialStepIndex = 1; setupTutorialStep(); world.obstacles = []");
fire("touchstart", [touch(2, 100, 262)], [touch(2, 100, 262)]);   // toca e segura no analógico, sem soltar
for (let i = 0; i < 20; i++) run("updateTutorial(1/60)");
check("segurar o dedo no analógico atira sem precisar tocar o botão ATAQUE", run("world.obstacles.some(o => o.fromPlayer)") && run("tutorialPhase") === "effect");
fire("touchend", [], [touch(2, 100, 262)]);

// segurar durante a CARGA não deve atirar (mesma regra do jogo de verdade) — simula estar segurando o botão
// CARREGAR de verdade (touchChargeId), já que isCharging é recalculado todo quadro a partir disso.
run("tutorialStepIndex = 1; setupTutorialStep(); world.obstacles = []; touchChargeId = 99");
fire("touchstart", [touch(3, 100, 262)], [touch(3, 100, 262)]);
for (let i = 0; i < 20; i++) run("updateTutorial(1/60)");
check("segurando durante a carga, não atira sem parar (não atrapalha o carregar)", run("world.obstacles.length") === 0);
fire("touchend", [], [touch(3, 100, 262)]);
run("touchChargeId = null; setGameState('menu')");

process.exit(summary());
