// tests/tutorial-buttons-touch.test.js — verificações desta correção: os botões PULAR/SAIR/VOLTAR AO MENU do
// tutorial não respondiam a um toque de verdade (o touchstart nunca chamava a lógica de clique pra essas telas
// — só funcionava chamando a função por fora, o que escondeu o bug nos testes anteriores). Também: o balão de
// instrução agora se ajusta ao tamanho do texto em vez de ser uma faixa cobrindo a tela inteira.
//
// Uso: node tests/tutorial-buttons-touch.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, fire, touch, summary } = h;

// ---------- o botão SAIR saiu do tutorial (para sair: pausa > SAIR PARA MENU) ----------
run("isTouchDevice = true; startTutorial(); tutorialStepIndex = 1; setupTutorialStep()");
check("o tutorial não tem mais o botão SAIR", run("getTutorialUiLayout().sair") === undefined);
run("pauseGame(); (() => { const r = MENU_LAYOUT.paused.exit; handleMenuClick(r.x + r.w / 2, r.y + r.h / 2); })()");
check("pela pausa, SAIR PARA MENU sai do tutorial", run("gameState") === "menu");

// ---------- toque de verdade no botão PULAR ----------
run("startTutorial()");
const uiWaiting2 = run("getTutorialUiLayout()");
const pularCenter = [uiWaiting2.pular.x + uiWaiting2.pular.w / 2, uiWaiting2.pular.y + uiWaiting2.pular.h / 2];
check("começa no passo 1 (movimento)", run("tutorialStepIndex") === 0);
fire("touchstart", [touch(2, pularCenter[0], pularCenter[1])], [touch(2, pularCenter[0], pularCenter[1])]);
fire("touchend", [], [touch(2, pularCenter[0], pularCenter[1])]);
run("flushButtonActions()");   // a ação acontece depois de o botão subir de volta
check("tocar de verdade no botão PULAR avança o passo (antes não respondia no celular)", run("tutorialStepIndex") === 1);

// ---------- toque de verdade no botão VOLTAR AO MENU (tela de conclusão) ----------
run("startTutorial(); tutorialStepIndex = 7; tutorialPhase = 'finished'");
const uiFinished = run("getTutorialUiLayout()");
check("layout de 'finished' calcula o botão VOLTAR AO MENU", uiFinished.finished === true && uiFinished.voltar.w > 0);
const voltarCenter = [uiFinished.voltar.x + uiFinished.voltar.w / 2, uiFinished.voltar.y + uiFinished.voltar.h / 2];
fire("touchstart", [touch(3, voltarCenter[0], voltarCenter[1])], [touch(3, voltarCenter[0], voltarCenter[1])]);
fire("touchend", [], [touch(3, voltarCenter[0], voltarCenter[1])]);
run("flushButtonActions()");   // a ação acontece depois de o botão subir de volta
check("tocar de verdade em VOLTAR AO MENU funciona (era o bug relatado)", run("gameState") === "menu");

// ---------- o balão se ajusta ao texto (não é mais uma faixa fixa cobrindo a tela) ----------
run("startTutorial(); tutorialStepIndex = 0; setupTutorialStep()");
const uiShort = run("getTutorialUiLayout()");
// (o simulador não mede largura real de texto — só confere que o balão não vira uma faixa de 800px)
check("o balão não ocupa a tela inteira — largura ajustada ao texto, não fixa", uiShort.bubbleW < 800 && uiShort.bubbleW > 0);
check("o balão fica centralizado horizontalmente", Math.abs((uiShort.bubbleX + uiShort.bubbleW / 2) - 400) < 1);
check("o balão fica abaixo do ícone de pausa (y >= 36), não mais colado no topo (y=0)", uiShort.bubbleY >= 36);

// clique fora do balão/botões, na área de jogo, não deve fechar nem pular nada
run("startTutorial()");
fire("touchstart", [touch(4, 400, 200)], [touch(4, 400, 200)]);
fire("touchend", [], [touch(4, 400, 200)]);
check("tocar numa área neutra do jogo não pula nem sai do tutorial", run("gameState") === "tutorial" && run("tutorialStepIndex") === 0);

run("setGameState('menu')");
process.exit(summary());
