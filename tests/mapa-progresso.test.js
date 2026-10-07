// tests/mapa-progresso.test.js — versão 0.84: mapa de progresso linear no lugar da grade de fases. Caminho
// longo rolando na horizontal (fases reais + futuras com cadeado), ambiente por trecho de 10 fases, placa
// "ADVERSÁRIOS MAIS FORTES VIRÃO! PREPARE-SE" só na primeira fase futura.
//
// Uso: node tests/mapa-progresso.test.js

const core = require("../game-logic-core.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

// ---------- geometria pura ----------
check("fases seguem da esquerda para a direita, sempre na faixa do meio da tela",
    Array.from({ length: 60 }, (_, i) => core.getMapaPosicaoFase(i)).every((p, i, a) => (i === 0 || p.x > a[i - 1].x) && p.y >= 120 && p.y <= 270));
check("trechos de 10 fases (1-10 = trecho 0, 11-20 = trecho 1)", core.getMapaTrecho(0) === 0 && core.getMapaTrecho(9) === 0 && core.getMapaTrecho(10) === 1);
check("rolagem limitada entre 0 e o fim do caminho", core.limitarRolagemMapa(-50, 60) === 0 && core.limitarRolagemMapa(1e9, 60) === core.getMapaLargura(60) - 800);
check("rolagemParaFase centraliza a fase (quando dá)", Math.abs(core.getMapaPosicaoFase(20).x - core.rolagemParaFase(20, 60) - 400) < 1 && core.rolagemParaFase(0, 60) === 0);

// ---------- tela ----------
run("deltaTime = 1/60; gameMode = 'singleplayer'; stageProgress = {}; setGameState('stage_map')");
check("abre no começo com só a 1ª fase liberada", run("getMapaRolagem()") === 0);
const futuras = run("getMapaFasesFuturas()");
check("fases futuras até ~60, só a primeira com placa", futuras.length >= 50 && futuras[0].placa && futuras.filter(f => f.placa).length === 1);
h.calls.length = 0; run("render()");
let textos = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("estrada e cenário desenhados (sem a placa fora da tela)", h.calls.some(c => c[0] === "bezierCurveTo") && !textos.includes("PREPARE-SE"));

const prog = {}; ["terra", "kaio", "namek", "freeza_ship", "namek_explosao", "time_room", "cell_games"].forEach(f => prog[f] = { normalDone: true });
run(`stageProgress = ${JSON.stringify(prog)}; setGameState('menu'); setGameState('stage_map')`);
check("reabre centralizado na última fase liberada", run("getMapaRolagem()") === core.rolagemParaFase(7, run("getMapaTotalFases()")));
h.calls.length = 0; run("render()");
textos = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("placa só na primeira fase bloqueada", textos.filter(t => t === "PREPARE-SE").length === 1 && textos.includes("ADVERSÁRIOS MAIS FORTES VIRÃO!"));
const f0 = run("getMapaFasesFuturas()[0]");
run(`stageLockedHintTimer = 0; handleMenuClick(${f0.x}, ${f0.y})`);
check("tocar numa fase futura mostra o aviso e não abre nada", run("stageLockedHintText") === "ADVERSÁRIOS MAIS FORTES VIRÃO! PREPARE-SE" && run("stageChoicePendingId") === null);
const n7 = run("getStageMapNodes()[7]");
run(`handleMenuClick(${n7.x}, ${n7.y})`);
check("fase liberada continua abrindo a escolha de modo", run("stageChoicePendingId") === "kaioshin");
run("stageChoicePendingId = null");

// rolagem: setas, roda do mouse
const antes = run("getMapaRolagem()");
const dir = run("MENU_LAYOUT.stageMap.right");
run(`handleMenuClick(${dir.x + 5}, ${dir.y + 5})`);
for (let i = 0; i < 90; i++) run("render()");
check("seta › desliza o mapa para a direita", run("getMapaRolagem()") > antes + 400);
run("canvas.onwheel({ deltaX: 0, deltaY: -100000, preventDefault() {} })");
check("roda do mouse rola e para no começo", run("getMapaRolagem()") === 0);

summary();
