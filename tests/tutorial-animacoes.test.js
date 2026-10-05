// tests/tutorial-animacoes.test.js — No tutorial o personagem age como na luta: o tiro de ki voa e aparece,
// carregar mostra a aura e enche o ki, o especial dura, transformar mostra a animação (e o passo avança).
//
// Uso: node tests/tutorial-animacoes.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
const tick = (n) => { for (let i = 0; i < n; i++) run("updateTutorial(1/60); drawTutorialScreen();"); };

run("isTouchDevice = false; startTutorial(); tutorialStepIndex = TUTORIAL_STEPS.findIndex(s => s.key === 'attack'); setupTutorialStep();");
run("triggerAction('attack', player, false)");
const x0 = run("world.obstacles.filter(o => o.fromPlayer)[0].x");
tick(5);
check("ataque: o tiro de ki voa", run("world.obstacles.filter(o => o.fromPlayer)[0] ? world.obstacles.filter(o => o.fromPlayer)[0].x : 9999") > x0);
check("ataque: mostra a animação de soltar ki", run("player.actionState") === "attackKi");

run("tutorialStepIndex = TUTORIAL_STEPS.findIndex(s => s.key === 'parry'); setupTutorialStep(); keysPressed[keyBindings.p1.charge] = true;");
tick(10);
check("carregar fora do passo CARREGAR também mostra a aura e enche o ki", run("player.actionState") === "chargeKi" && run("player.ki") > 0);
run("keysPressed = {};");

run("tutorialStepIndex = TUTORIAL_STEPS.findIndex(s => s.key === 'transform'); setupTutorialStep();");
run("triggerAction('transform', player, false)");
tick(2);
check("transformar: mostra a animação e transforma", run("player.actionState") === "transform" && run("getTransformLevel(player)") >= 1);

run("tutorialStepIndex = TUTORIAL_STEPS.findIndex(s => s.key === 'special'); setupTutorialStep(); player.ki = player.maxKi;");
run("triggerAction('special', player, false)");
const b0 = run("world.beamActive");
tick(5);
check("especial: o feixe aparece e vai acabando", b0 > 0 && run("world.beamActive") < b0);
summary();
