// tests/controle-navegacao.test.js — Controle (gamepad) nos menus: com o quadro de modo aberto o foco só anda
// pelos botões dele (os círculos de trás não contam), no tutorial o analógico não navega em PULAR/SAIR, e o
// botão de tela cheia também é alcançável.
//
// Uso: node tests/controle-navegacao.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run("stageProgress = {}; setGameState('stage_map'); stageChoicePendingId = null; render();");
const antes = run("menuTargets.length");
run("stageChoicePendingId = 'terra'; padNav.focus = null; render(); render();");
const alvos = run("JSON.stringify(menuTargetsPrev)");
check("quadro de modo aberto: os círculos das fases não são alvos do controle", !JSON.parse(alvos).some(t => t.w === STAGE_MAP_NODE_R_FAKE()), "");
function STAGE_MAP_NODE_R_FAKE() { return run("STAGE_MAP_NODE_R * 2"); }
check("o foco começa no NORMAL", run("(() => { const t = resolvePadFocus(); const n = MENU_LAYOUT.stageMap.normal; return t && t.x === n.x && t.y === n.y; })()"));
check("sem o quadro, os círculos voltam a ser alvos", antes > JSON.parse(alvos).length - 3);
check("o botão de tela cheia é alvo do controle", run("(() => { const r = getFullscreenButtonRect(); return menuTargetsPrev.some(t => t.x === r.x && t.y === r.y); })()"));
check("no tutorial o controle não navega nos botões", run("setGameState('tutorial'); padNavIsActiveState()") === false);
run("setGameState('menu');");
summary();
