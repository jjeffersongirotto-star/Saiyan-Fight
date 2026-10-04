// tests/pausa-tutorial.test.js — A pausa funciona no tutorial igual à luta: CONTINUAR volta ao mesmo passo,
// OPÇÕES volta para a pausa e SAIR vai para o menu.
//
// Uso: node tests/pausa-tutorial.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run("startTutorial(); isTouchDevice = false;");
h.step(5);
const passo = run("tutorialStepIndex");
run("window.onkeydown({ code: 'Escape', preventDefault() {} });");
check("Esc no tutorial pausa (não sai mais direto para o menu)", run("gameState") === "paused");
h.step(3);
check("na pausa o tutorial fica congelado no mesmo passo", run("tutorialStepIndex") === passo);
run("requestResume();");
check("CONTINUAR volta para o tutorial, no mesmo passo", run("gameState") === "tutorial" && run("tutorialStepIndex") === passo);

run("pauseGame();");
run("optionsReturnState = 'paused'; setGameState('options_main'); setGameState(optionsReturnState);");
check("voltando das OPÇÕES cai na pausa do tutorial", run("gameState") === "paused" && run("pausedFromTutorial") === true);
h.step(2);
run(`(() => { const r = MENU_LAYOUT.paused.exit; handleMenuClick(r.x + r.w / 2, r.y + r.h / 2); })()`);
check("SAIR vai para o menu", run("gameState") === "menu");

run("selectedCharacter = 'goku_adult'; gameMode = 'singleplayer'; startGame(); pauseGame(); requestResume();");
check("na luta a pausa continua voltando para a luta", run("gameState") === "playing");
run("stopBGM();");
summary();
