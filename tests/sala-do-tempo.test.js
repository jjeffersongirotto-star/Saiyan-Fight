// tests/sala-do-tempo.test.js — a Sala do Tempo é o pavilhão no vazio branco e a câmera dá a volta nele
// conforme a fase avança (frente → lateral → fundos → frente). A imagem é guardada e só refeita quando a câmera
// anda meio grau, para não pesar.
//
// Uso: node tests/sala-do-tempo.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");
const TR_PASSOS_POR_VOLTA_TESTE = Number(/const TR_PASSOS_POR_VOLTA = (\d+)/.exec(menu)[1]);

check("a Sala do Tempo desenha o pavilhão girando pela volta da fase", menu.includes('drawTimeRoomStage(getTimeRoomOrbitAngle(scroll))'));
check("tem cúpula com relógio, alas de telhado rosa, ampulhetas e postes", ["trDrawGazebo", "trDrawWing", "trDrawHourglass", "trDrawLamp"].every(f => menu.includes("function " + f)));

run("selectedStage = 'time_room'; world.stageScrollX = 0;");
check("desenha a frente sem erro", (() => { run("drawStageBackground()"); return run("trCena.passo") === 0; })());
for (const frac of [0.125, 0.25, 0.5, 0.75, 0.99]) {
    run(`world.stageScrollX = TIME_ROOM_LAP_SCROLL * ${frac}; drawStageBackground();`);
}
check("desenha todos os ângulos da volta sem erro", run("trCena.passo") > TR_PASSOS_POR_VOLTA_TESTE * 0.95);
run("world.stageScrollX = TIME_ROOM_LAP_SCROLL; drawStageBackground();");
check("volta completa: de frente de novo", run("trCena.passo") === 0);

// cache: só redesenha quando a câmera anda meio grau
run("world.stageScrollX = 3000; drawStageBackground(); var __p = trCena.passo; var __n = 0; var __orig = drawTimeRoomScene; drawTimeRoomScene = function (a) { __n++; return __orig(a); };");
run("for (let i = 0; i < 10; i++) { world.stageScrollX = 3000 + i * 1.5; drawStageBackground(); }");
check("avançando 10 quadros, o pavilhão é redesenhado só 1 ou 2 vezes (o resto é a imagem guardada)", run("__n") <= 2);
run("drawTimeRoomScene = __orig;");

check("câmera com perspectiva e chão infinito redesenhado a cada quadro (o chão perto passa rápido)", menu.includes("function drawTimeRoomFloor") && menu.includes("drawTimeRoomFloor(ang);") && menu.includes("trCam.F / Math.max(trCam.PERTO, trCam.D - r[1])"));
check("sem a sombra oval que parecia um prato girando", !menu.slice(menu.indexOf("function drawTimeRoomScene"), menu.indexOf("// ==================== DESENHO DAS ARENAS")).includes("ellipse(TR_CX, TR_GY"));
// o chão perto da câmera anda bem mais que o pavilhão quando a câmera gira um pouco
check("o chão perto dos lutadores se mexe mais que o pavilhão (parece que eles andam em volta)", run(`(() => {
    const a0 = 0.3, a1 = 0.31;
    const chao0 = trProj(0, 0, 600, a0), chao1 = trProj(0, 0, 600, a1);
    const pav0 = trProj(0, 100, 0, a0), pav1 = trProj(0, 100, 0, a1);
    return Math.abs(chao1[0] - chao0[0]) > 5 * Math.abs(pav1[0] - pav0[0]) + 1;
})()`));
check("placar com fundo escuro na fase clara (textos legíveis)", /const STAGES_FUNDO_CLARO = \[[^\]]*"time_room"/.test(menu));

run("selectedCharacter = 'goku_adult'; selectedStage = 'time_room'; gameMode = 'coop'; startGame(); world.saibamanSpawnTimer = -1e9;");
h.step(60);
check("uma luta na Sala do Tempo roda sem erro", run("gameState") === "playing" && run("selectedStage") === "time_room");
run("stopBGM();");
summary();
