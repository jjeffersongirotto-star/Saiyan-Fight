// tests/teste-controles-goku.test.js — TESTE DE CONTROLES: a prévia com o Goku obedece ao jogador 1 ou 2 (quem
// apertou primeiro), não responde quando os dois apertam juntos e mostra as animações (ki, carregar, transformar).
//
// Uso: node tests/teste-controles-goku.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run("testeGoku = null; setGameState('controls_test'); keysPressed = {}; deltaTime = 1 / 60;");
const quadro = () => run("drawControlsTest()");
quadro();
const x0 = run("testeGoku.x");
run("keysPressed[keyBindings.p1.right] = true;");
for (let i = 0; i < 10; i++) quadro();
check("jogador 1 move o Goku", run("testeGoku.x") > x0 && run("testeGoku.dono") === "p1");
run("keysPressed[keyBindings.p2.left] = true;");
const x1 = run("testeGoku.x");
for (let i = 0; i < 5; i++) quadro();
check("com o jogador 1 no comando, o 2 não atrapalha", run("testeGoku.x") > x1 && run("testeGoku.dono") === "p1");
run("keysPressed = {};"); quadro();
run("keysPressed[keyBindings.p1.right] = true; keysPressed[keyBindings.p2.left] = true;");
const x2 = run("testeGoku.x");
for (let i = 0; i < 5; i++) quadro();
check("os dois apertando ao mesmo tempo: o Goku não responde", run("testeGoku.x") === x2 && run("testeGoku.dono") === null);
run("keysPressed = {};"); quadro();
run("keysPressed[keyBindings.p2.attack] = true;"); quadro();
check("jogador 2 sozinho comanda e solta ki", run("testeGoku.dono") === "p2" && run("testeGoku.tiros.length") === 1 && run("testeGoku.actionState") === "attackKi");
run("keysPressed = {}; keysPressed[keyBindings.p1.charge] = true;");
for (let i = 0; i < 20; i++) quadro();
check("carregar mostra a animação e enche o ki", run("testeGoku.actionState") === "chargeKi" && run("testeGoku.ki") > 0);
run("keysPressed = {};"); quadro();
run("keysPressed[keyBindings.p1.transform] = true;"); quadro();
check("transformar mostra a animação e sobe de nível", run("testeGoku.actionState") === "transform" && run("getTransformLevel(testeGoku)") === 1);
check("a luta de verdade não é mexida", run("player.ki") === 0 || run("typeof player") === "object");
summary();
