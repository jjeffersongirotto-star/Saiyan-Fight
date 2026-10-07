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

run("currentTab = 'HERÓIS'; selecaoLuta = 'solo'");
const heroi = run("getFilteredCharacters()[1]");
clickOn("characters", "getCharacterCardRect(1)");
run("executeSystemConfirm(true)");   // a seleção pergunta antes de trocar
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
// ---------- interruptores AUTOMÁTICO / PC / TOUCH / JOYSTICK na tela CONTROLES ----------
run("controlSelectionMode = 'auto'; autoControlOverride = null; setGameState('options_controls')");
const toggle = (k) => run(`MENU_LAYOUT.optionsControls.toggles.find(t => t.key === '${k}')`);
const pc = toggle("pc");
run(`handleMenuClick(${pc.x + 55}, ${pc.y + 60})`);   // parte de baixo do interruptor PC
check("controles: o interruptor PC liga só o PC e fica na tela", run("controlSelectionMode") === "pc" && run("gameState") === "options_controls");
const js = toggle("joystick");
run(`handleMenuClick(${js.x + 55}, ${js.y + 50})`);
check("controles: JOYSTICK vira o modo principal (sem HUD de toque, tutorial do controle)",
    run("controlSelectionMode") === "joystick" && run("getEffectiveControlMode()") === "joystick" && run("isTouchDevice") === false && run("getActiveInputPlatform()") === "controle");
check("controles: só um interruptor ligado por vez", run("MENU_LAYOUT.optionsControls.toggles.filter(t => controlSelectionMode === t.key).length") === 1);
run("controlSelectionMode = 'auto'; autoControlOverride = null");
run("window.onkeydown({ code: 'KeyZ', key: 'z', preventDefault(){} })");
check("AUTOMÁTICO: usar o teclado acende o PC", run("getEffectiveControlMode()") === "pc");
run("autoControlOverride = 'joystick'; applyEffectiveControlMode()");
check("AUTOMÁTICO: usar o controle acende o JOYSTICK e esconde o toque", run("getEffectiveControlMode()") === "joystick" && run("isTouchDevice") === false);
run("autoControlOverride = 'touch'; applyEffectiveControlMode()");
check("AUTOMÁTICO: tocar na tela acende o TOUCH", run("getEffectiveControlMode()") === "touch" && run("controlSelectionMode") === "auto");
// controle nos menus (sem luta): AUTOMÁTICO acende o JOYSTICK, e as teclas que o Android gera junto não trocam para PC
run("controlSelectionMode = 'auto'; autoControlOverride = 'pc'; lastPadInputAt = 0; setGameState('options_controls')");
run("navigator.getGamepads = () => [{ index: 0, connected: true, id: 'pad', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 13, value: i === 13 ? 1 : 0 })) }]");
run("pollGamepadMenu(1/60)");
check("AUTOMÁTICO: mexer no controle nos menus acende o JOYSTICK", run("getEffectiveControlMode()") === "joystick" && run("getActiveInputPlatform()") === "controle");
run("window.onkeydown({ code: 'ArrowDown', key: 'ArrowDown', preventDefault(){} })");
check("AUTOMÁTICO: tecla gerada pelo controle (Android) não troca para PC", run("getEffectiveControlMode()") === "joystick");
run("navigator.getGamepads = () => []");
check("controles: os 4 interruptores ficam abaixo dos 4 botões", run("MENU_LAYOUT.optionsControls.toggles.every(t => t.y >= MENU_LAYOUT.optionsControls.test.y + MENU_LAYOUT.optionsControls.test.h)"));
run("setGameState('options_pc'); render()");
check("controles PC: a tela abre sem os interruptores", run("gameState") === "options_pc");

run("setGameState('menu')");
process.exit(summary());
