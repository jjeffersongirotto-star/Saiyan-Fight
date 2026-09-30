// tests/landscape-rotation-fallback.test.js — verificações desta atualização: o botão "ATIVAR TELA DEITADA"
// não fazia nada visível em janelas incorporadas (como o visualizador de artefatos do app do Claude), que
// costumam bloquear as APIs de tela cheia e de travar a orientação. Agora, quando essas APIs não funcionam,
// o jogo gira sozinho por CSS (sem depender de nenhuma permissão do sistema) — o botão sempre faz alguma
// coisa visível. Também confirma que o overlay de escolha de modo ficou sem o texto pequeno embaixo dos
// botões, e que título/subtítulo/botões subiram um pouco, como pedido.
//
// Uso: node tests/landscape-rotation-fallback.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

// ---------- botão "ativar tela deitada": sem suporte nativo (como no app do Claude), gira por CSS ----------
run("innerWidth = 400; innerHeight = 800"); // celular em pé
run("activateMobileLandscape()");
check("sem as APIs nativas disponíveis, aplica a rotação por CSS como alternativa", run("document.getElementById('game-container').classList.contains('forced-landscape')") === true);

// o aviso "GIRE O CELULAR" some assim que a rotação por CSS está ativa (senão ficaria um aviso de rotação por
// cima de um jogo que, visualmente, já está rotacionado)
run("updateMobileOrientationHint()");
check("o aviso de girar o celular some depois que a rotação por CSS entrou em ação", run("document.getElementById('mobile-orientation-hint').style.display") === "none");

// ---------- gira o aparelho de verdade depois: a rotação por CSS se desliga sozinha (não soma as duas) ----------
run("innerWidth = 800; innerHeight = 400"); // agora landscape de verdade
run("fitCanvasToViewport()");
check("quando o aparelho gira de verdade, a rotação por CSS se desliga sozinha (não fica dobrado)", run("document.getElementById('game-container').classList.contains('forced-landscape')") === false);

// ---------- sair da tela cheia (ou apertar Escape) também desliga a rotação por CSS ----------
run("innerWidth = 400; innerHeight = 800; document.getElementById('game-container').classList.add('forced-landscape')");
run("toggleFullscreen()");
check("alternar a tela cheia enquanto a rotação por CSS está ativa também desliga ela", run("document.getElementById('game-container').classList.contains('forced-landscape')") === false);

// ---------- overlay de escolha de modo: sem o texto pequeno, título/subtítulo/botões mais acima ----------
run("writeStorage('saiyan_stage_progress', ''); stageProgress = {}; setGameState('stage_map')");
run("handleMenuClick(getStageMapNodes()[0].x, getStageMapNodes()[0].y)");
check("mostra o overlay de escolha", run("stageChoicePendingId") === "terra");
h.calls.length = 0;
run("render()");
const textCalls = h.calls.filter(c => c[0] === "fillText");
check("não sobra texto pequeno explicando os modos embaixo dos botões", !textCalls.some(c => String(c[1][0]).startsWith("NORMAL: ondas") || String(c[1][0]).startsWith("SEM LIMITE: todas")));

// "TORNEIO ARTES MARCIAIS" também aparece como rótulo do nó no mapa (desenhado antes) — pega a ÚLTIMA
// ocorrência, que é a do título do overlay (desenhado por cima, depois).
const titleCall = [...textCalls].reverse().find(c => c[1][0] === "TORNEIO ARTES MARCIAIS");
const subtitleCall = textCalls.find(c => c[1][0] === "ESCOLHA O MODO");
check("o título da fase subiu (fica bem mais acima do que ficava antes)", titleCall && titleCall[1][2] <= 110, `y=${titleCall && titleCall[1][2]}`);
check("o subtítulo também subiu, logo abaixo do título", subtitleCall && subtitleCall[1][2] > titleCall[1][2] && subtitleCall[1][2] <= 130);

// os botões continuam funcionando nas posições novas
run("handleMenuClick(400 - 270 + 85, 140 + 30)"); // NORMAL
check("botão NORMAL, na posição nova (mais acima), ainda funciona", run("stageMode") === "normal" && run("gameState") === "playing");

run("setGameState('menu')");
process.exit(summary());
