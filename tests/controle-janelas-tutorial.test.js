// tests/controle-janelas-tutorial.test.js — Controle nas janelas (aviso/UPDATES): o jogo lê o controle mesmo com
// a janela aberta, o direcional troca o botão destacado e a CRUZ aperta. Tutorial: mostra só os comandos da
// plataforma em uso e, no fim, o controle volta a navegar. Laranja de "passar o mouse" só com mouse.
//
// Uso: node tests/controle-janelas-tutorial.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

// controle simulado
run(`var __botoes = new Set(); var __eixo = [0, 0];
     navigator.getGamepads = () => [{ connected: true, id: "DualSense", axes: __eixo, buttons: Array.from({ length: 18 }, (_, i) => ({ pressed: __botoes.has(i), value: __botoes.has(i) ? 1 : 0 })) }];`);

// janela de aviso com dois botões
run(`var __clicado = null;
     var __b1 = { style: {}, offsetParent: {}, click() { __clicado = "ok"; } }, __b2 = { style: {}, offsetParent: {}, click() { __clicado = "cancelar"; } };
     var __modal = document.getElementById("modal-alert"); __modal.style.display = "flex"; __modal.querySelectorAll = (sel) => sel === "button" ? [__b1, __b2] : [];
     setGameState("options_main"); padNav.prevConfirm = false; padNav.prevBack = false;`);
run("render()");
check("com a janela aberta o primeiro botão fica destacado", run("__b1.style.outline").includes("solid"));
run("__botoes = new Set([15]); render(); __botoes = new Set(); render();");
check("direcional para a direita destaca o próximo botão", run("__b2.style.outline").includes("solid") && !run("__b1.style.outline"));
run("__botoes = new Set([0]); render(); __botoes = new Set(); render();");
check("CRUZ aperta o botão destacado (mesmo com a janela cobrindo a tela)", run("__clicado") === "cancelar");
run("__modal.style.display = 'none'; render();");

// tutorial: comandos da plataforma em uso
run("startTutorial(); tutorialStepIndex = 1; setupTutorialStep(); lastPadInputAt = 0; lastKeyInputAt = Date.now(); lastInputWasTouch = false; isTouchDevice = false;");
check("no PC o tutorial mostra só teclado/mouse", run("getTutorialInstructionLines('attack').join(' ')").startsWith("TECLADO") && !run("getTutorialInstructionLines('attack').join(' ')").includes("CONTROLE"));
run("lastPadInputAt = Date.now() + 1000;");
check("usando o controle mostra só os botões do controle", run("getTutorialInstructionLines('attack')[0]").startsWith("CONTROLE: QUADRADO"));
run("lastPadInputAt = 0; isTouchDevice = true; lastInputWasTouch = true; lastTouchStartAt = Date.now() + 2000;");
check("no celular mostra só o toque", /TOQUE|SEGURE/.test(run("getTutorialInstructionLines('attack')[0]")));
check("durante os passos o controle não navega", run("padNavIsActiveState()") === false);
run("tutorialPhase = 'finished';");
check("no fim do tutorial o controle volta a navegar (alcança VOLTAR AO MENU)", run("padNavIsActiveState()") === true);

// laranja de passar o mouse só com mouse
run("setGameState('menu'); lastInputWasTouch = true;");
check("depois de um toque nenhum botão fica laranja", run("isMouseHovering()") === false);
run("lastInputWasTouch = false; isTouchDevice = false; padNav.visible = false; lastPadInputAt = 0; lastKeyInputAt = 0;");
check("com o mouse o laranja volta", run("isMouseHovering()") === true);
run("navigator.getGamepads = undefined;");

// TRANSMITIR PARA A TV: sem suporte do navegador (aqui, como no iPhone) mostra a ajuda de espelhamento
run("var __ajuda = 0; var __alertaOriginal = showSystemAlert; showSystemAlert = () => { __ajuda++; }; transmitirParaTV(); showSystemAlert = __alertaOriginal;");
check("TRANSMITIR PARA A TV sem suporte mostra como espelhar pelo aparelho", run("__ajuda") === 1);
summary();
