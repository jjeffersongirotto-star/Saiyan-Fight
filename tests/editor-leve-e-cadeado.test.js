// tests/editor-leve-e-cadeado.test.js — com o editor (ou outra janela) aberto fora da luta, o jogo não redesenha a
// tela escondida atrás dele (deixava a rolagem e os toques do editor travados no celular); e no mapa de fases, ao
// liberar uma fase nova, o cadeado dela abre e cai uma única vez.
//
// Uso: node tests/editor-leve-e-cadeado.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
const desenhos = () => h.calls.filter(c => c[0] === "fillRect" || c[0] === "fillText").length;

// ---------- janela aberta: não redesenha o jogo atrás ----------
run("setGameState('database')");
h.calls.length = 0; run("render()");
check("sem janela aberta, a tela do DATABASE é desenhada", desenhos() > 0);
run("openModal(null)");
h.calls.length = 0; run("render()");
check("com o editor aberto, o jogo atrás dele não é redesenhado", desenhos() === 0, String(desenhos()));
run("closeModal()");
h.calls.length = 0; run("render()");
check("fechando o editor, a tela volta a ser desenhada", desenhos() > 0);
run("gameMode = 'singleplayer'; startGame(); document.getElementById('modal-alert').style.display = 'flex'");
h.calls.length = 0; run("render()");
check("durante a luta, um alerta não congela o desenho do jogo", desenhos() > 0);
run("document.getElementById('modal-alert').style.display = 'none'");

// ---------- cadeado abrindo no mapa de fases ----------
run("stageProgress = {}; selectedStage = 'terra'; stageMode = 'normal'; startGame(); resolveStageVictory()");
check("vencer o NORMAL da 1ª fase marca que a próxima acabou de ser liberada", run("stageVictoryStats.justUnlockedNext") === true);
run("setGameState('stage_map'); render()");
check("no mapa, o cadeado da fase 2 começa a abrir", run("stageUnlockAnim && stageUnlockAnim.id") === run("STAGE_PROGRESSION[1].id"));
for (let i = 0; i < 120; i++) run("lastFrameTime = performance.now() - 16; render()");
check("a animação termina sozinha", run("stageUnlockAnim") === null);
run("setGameState('menu'); setGameState('stage_map'); render()");
check("voltando ao mapa depois, o cadeado não abre de novo", run("stageUnlockAnim") === null);

run("setGameState('menu')");
process.exit(summary());
