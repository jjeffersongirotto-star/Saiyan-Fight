// tests/arena-de-cell.test.js — Torneio de Cell em 3D: os lutadores ficam no meio da arena e a câmera gira em
// volta do centro (piso de azulejos, 4 pilares nos cantos, paisagem de 360° ao fundo).
//
// Uso: node tests/arena-de-cell.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");

check("o Torneio de Cell desenha a arena girando pela volta da fase", menu.includes("drawCellArenaStage(getCellArenaOrbitAngle(scroll))"));
check("tem piso de azulejos, pilares dos cantos e paisagem de 360°", ["caDrawPillar", "getCellArenaPanorama", "caPoly", "caLine"].every(f => menu.includes("function " + f)));

run("selectedStage = 'cell_games';");
for (const frac of [0, 0.1, 0.25, 0.5, 0.75, 0.99]) run(`world.stageScrollX = CELL_ARENA_LAP_SCROLL * ${frac}; drawStageBackground();`);
check("desenha todos os ângulos da volta sem erro", true);

check("o centro da arena fica na altura dos lutadores (meio da tela)", (() => {
    const y = run("caProj(0, 0, 0, 0)[1]");
    return y > 170 && y < 260;
})());
check("o piso perto da câmera e a paisagem distante andam em sentidos opostos (a câmera gira em volta dos lutadores)", run(`(() => {
    const a0 = 0.5, a1 = 0.51;
    const perto = caProj(0, 0, 150, a1)[0] - caProj(0, 0, 150, a0)[0];
    const longe = caProj(0, 0, -100000, a1)[0] - caProj(0, 0, -100000, a0)[0];
    return perto < -1 && longe > 1;
})()`));
check("pilares atrás da câmera não são desenhados (cortados no plano perto)", menu.includes(".filter(p => CA_D - p[2] > CA_PERTO * 2)"));
check("placar com fundo escuro também no céu claro da arena", run("faseTemFundoClaro('cell_games')") === true);

run("selectedCharacter = 'goku_adult'; selectedStage = 'cell_games'; gameMode = 'coop'; startGame(); world.saibamanSpawnTimer = -1e9;");
h.step(60);
check("uma luta no Torneio de Cell roda sem erro", run("gameState") === "playing" && run("selectedStage") === "cell_games");
run("stopBGM();");
summary();
