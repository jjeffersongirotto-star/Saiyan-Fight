// tests/landscape-rotation-fallback.test.js — com o celular em pé, o jogo aparece deitado sozinho (girado 90°
// por CSS), sem o antigo aviso "GIRE O CELULAR"/botão "ATIVAR TELA DEITADA"; ao deitar o celular de verdade a
// rotação por CSS sai (não soma as duas); e os toques com o jogo girado caem no lugar certo. Também confirma que o overlay de escolha de modo ficou sem o texto pequeno embaixo dos
// botões, e que título/subtítulo/botões subiram um pouco, como pedido.
//
// Uso: node tests/landscape-rotation-fallback.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

// ---------- celular em pé: o jogo já aparece deitado sozinho (sem aviso "GIRE O CELULAR" nem botão) ----------
run("isMobileDevice = () => true");
run("innerWidth = 400; innerHeight = 800; fitCanvasToViewport()"); // celular em pé
check("celular em pé: o jogo gira sozinho por CSS, sem precisar apertar nada", run("document.getElementById('game-container').classList.contains('forced-landscape')") === true);
check("o aviso 'GIRE O CELULAR' não existe mais", run("document.getElementById('mobile-orientation-hint')") === null || !require("fs").readFileSync(__dirname + "/../index.html", "utf8").includes("mobile-orientation-hint"));

// ---------- gira o aparelho de verdade depois: a rotação por CSS se desliga sozinha (não soma as duas) ----------
run("innerWidth = 800; innerHeight = 400"); // agora landscape de verdade
run("fitCanvasToViewport()");
check("quando o aparelho gira de verdade, a rotação por CSS se desliga sozinha (não fica dobrado)", run("document.getElementById('game-container').classList.contains('forced-landscape')") === false);
run("innerWidth = 400; innerHeight = 800; fitCanvasToViewport()");
check("voltando a ficar em pé, gira de novo sozinho", run("document.getElementById('game-container').classList.contains('forced-landscape')") === true);

// ---------- toque com o jogo girado: cai no lugar certo do jogo ----------
// Girado 90° (sentido horário): o canvas de 800x350 ocupa na tela uma caixa em pé de 350x800 (largura x altura).
run(`canvas.closest = () => ({}); canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 350, height: 800 })`);
const canto = run("getCanvasCoords(349, 1)");   // canto de cima à direita da tela = canto de cima à esquerda do jogo
check("girado: o canto de cima à direita da tela é o canto de cima à esquerda do jogo", canto.x < 2 && canto.y < 2, JSON.stringify(canto));
const meio = run("getCanvasCoords(175, 400)");
check("girado: o meio da tela é o meio do jogo", Math.abs(meio.x - 400) < 1 && Math.abs(meio.y - 175) < 1, JSON.stringify(meio));
const fundo = run("getCanvasCoords(0, 800)");   // canto de baixo à esquerda da tela = canto de baixo à direita do jogo
check("girado: o canto de baixo à esquerda da tela é o canto de baixo à direita do jogo", Math.abs(fundo.x - 800) < 1 && Math.abs(fundo.y - 350) < 1, JSON.stringify(fundo));
run("innerWidth = 800; innerHeight = 400; fitCanvasToViewport(); canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 350 })");
const normal = run("getCanvasCoords(100, 50)");
check("sem rotação: o toque continua igual", normal.x === 100 && normal.y === 50);

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
check("botão NORMAL, na posição nova (mais acima), ainda funciona", run("stageMode") === "normal" && run("gameState") === "characters" && run("selecaoLuta") === "solo");

run("setGameState('menu')");
process.exit(summary());
