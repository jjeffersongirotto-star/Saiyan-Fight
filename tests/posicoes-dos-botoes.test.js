// tests/posicoes-dos-botoes.test.js — as posições dos botões dos menus vivem num lugar só (MENU_LAYOUT e as
// funções get...Rect em menu.js), usado pelo desenho E pelo clique. Aqui: clicar no centro de cada botão da
// tabela faz o que o botão diz, e a área invisível que existia embaixo da tela de controles do PC (voltava de
// tela sem ter botão desenhado ali) não existe mais.
//
// Uso: node tests/posicoes-dos-botoes.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run("startGame = () => { gameState = 'playing'; }; startTutorial = () => { gameState = 'tutorial'; }; openUpdatesModal = () => {};");
const center = (expr) => run(`(() => { const r = ${expr}; return [r.x + r.w / 2, r.y + r.h / 2]; })()`);
const clickOn = (state, expr) => { run(`setGameState('${state}')`); const [x, y] = center(expr); run(`handleMenuClick(${x}, ${y})`); };

// ---------- menu principal: cada botão leva à tela certa ----------
const destinos = { play: "mode_select", characters: "characters", stages: "stages", options: "options_main", ranking: "ranking", database: "database", achievements: "achievements", tutorial: "tutorial" };
for (const [key, dest] of Object.entries(destinos)) {
    clickOn("menu", `MENU_LAYOUT.main.${key}`);
    check(`menu principal: botão '${key}' leva para '${dest}'`, run("gameState") === dest, run("gameState"));
}

// ---------- botão voltar (←) usa a mesma posição em todas as telas ----------
for (const [state, dest] of [["mode_select", "menu"], ["characters", "menu"], ["options_controls", "options_main"], ["options_touch", "options_main"], ["options_audio", "options_main"], ["achievements", "menu"]]) {
    clickOn(state, "MENU_LAYOUT.back");
    check(`'${state}': voltar (←) leva para '${dest}'`, run("gameState") === dest);
}

// ---------- telas com botões em grade/lista ----------
run("activeControlProfile = 'p1'; remappingKey = null; startRemapping = (k) => { remappingKey = k; }");
clickOn("options_pc", "getPcKeyRect(4)");
check("controles PC: a 5ª tecla da lista é a de ATAQUE", run("remappingKey") === "p1.attack");

run("currentTab = 'HERÓIS'");
const heroi = run("getFilteredCharacters()[1]");
clickOn("characters", "getCharacterCardRect(1)");
check("personagens: clicar no 2º cartão seleciona o 2º herói", run("selectedCharacter") === heroi);

run("rankingViewMode = 'fase'");
clickOn("ranking", "getRankingStageTabRect(2)");
check("ranking por fase: clicar na 3ª aba escolhe a 3ª fase", run("rankingSelectedStage") === run("STAGE_PROGRESSION[2].id"));

run("stageProgress = {}; stageChoicePendingId = 'terra'");
clickOn("stage_map", "MENU_LAYOUT.back");
check("mapa de fases: a seta ← fecha a escolha de modo", run("stageChoicePendingId") === null && run("gameState") === "stage_map");

// ---------- a área invisível embaixo da tela de controles do PC não existe mais ----------
run("setGameState('options_pc')");
run("handleMenuClick(400, 345)");   // centro embaixo, entre os interruptores: não tem botão desenhado aqui
check("controles PC: clicar embaixo, onde não há botão, não sai mais da tela", run("gameState") === "options_pc");
run("controlSelectionMode = 'auto'; setGameState('options_pc')");
const pc = run("MENU_LAYOUT.optionsPc.toggles.find(t => t.key === 'pc')");
run(`handleMenuClick(${pc.x + 100}, ${pc.y + 26})`);   // parte de baixo do interruptor PC
check("controles PC: a parte de baixo do interruptor PC só liga o PC (não sai da tela junto)", run("controlSelectionMode") === "pc" && run("gameState") === "options_pc");

run("setGameState('menu')");
process.exit(summary());
