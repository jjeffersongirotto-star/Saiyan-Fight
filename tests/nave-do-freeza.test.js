// tests/nave-do-freeza.test.js — Nave de Freeza em 3D: a nave pousada em Namek fica no meio e a câmera dá a
// volta nela (como na Sala do Tempo). O chão de Namek passa perto dos lutadores e a paisagem gira ao fundo.
//
// Uso: node tests/nave-do-freeza.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");

check("a Nave de Freeza desenha a nave girando pela volta da fase", menu.includes("drawFreezaShipStage(getFreezaShipOrbitAngle(scroll))"));
check("tem casco, faixa preta com escotilhas, cúpula listrada, cabine roxa, ovos amarelos e pernas", ["drawFreezaShipScene", "nvDrawLeg", "nvDrawPod", "nvFaixa"].every(f => menu.includes("function " + f)) && menu.includes("cabine roxa"));
check("pernas de aço com braço, junta, canela e pé com garras (atrás dos ovos)", menu.includes("Perna de aço") && menu.indexOf("if (naFrente(a)) nvDrawLeg(a, ang, true)") < menu.indexOf("if (naFrente(a)) nvDrawPod(a, ang)"));
check("janela da cabine: meio ovo de vidro roxo saltado do casco, com moldura", menu.includes("function nvDrawCockpit") && menu.includes("saliencia") && menu.includes("function nvEnvoltorio"));
check("a janela tem um encaixe da cor do casco prendendo-a na cúpula (não fica solta de lado)", menu.includes("encaixe de metal") && menu.includes("const contornoColar"));
check("o contorno do meio ovo é sempre um polígono fechado e válido", run(`(() => {
    const h = nvEnvoltorio([[0, 0], [10, 0], [10, 10], [0, 10], [5, 5], [2, 8]]);
    return h.length === 4;
})()`));
check("chão de Namek com lagos, pedras e tufos fixos no mundo e paisagem de 360°", menu.includes("const NV_CHAO") && menu.includes("function getFreezaShipPanorama") && menu.includes("function drawFreezaShipGround"));

run("selectedStage = 'freeza_ship';");
for (const frac of [0, 0.1, 0.25, 0.5, 0.75, 0.99]) run(`world.stageScrollX = FREEZA_SHIP_LAP_SCROLL * ${frac}; drawStageBackground();`);
check("desenha todos os ângulos da volta sem erro", run("nvCena.passo") > 1300);
check("depois de desenhar, a câmera volta a ser a da Sala do Tempo", run("trCam === TR_CAM"));

run("world.stageScrollX = 3000; drawStageBackground(); var __n = 0; var __orig = drawFreezaShipScene; drawFreezaShipScene = function (a) { __n++; return __orig(a); };");
run("for (let i = 0; i < 10; i++) { world.stageScrollX = 3000 + i * 1.5; drawStageBackground(); }");
check("a nave é redesenhada só 1 ou 2 vezes em 10 quadros (o resto é imagem guardada)", run("__n") <= 2);
run("drawFreezaShipScene = __orig;");

check("o chão perto dos lutadores anda mais que a nave (parece que eles andam em volta)", run(`(() => {
    trCam = NV_CAM;
    const chao = trProj(0, 0, 450, 0.31)[0] - trProj(0, 0, 450, 0.3)[0];
    const nave = trProj(0, 100, 0, 0.31)[0] - trProj(0, 100, 0, 0.3)[0];
    trCam = TR_CAM;
    return Math.abs(chao) > 5 * Math.abs(nave) + 1;
})()`));
check("placar com fundo escuro no céu claro de Namek", /const STAGES_FUNDO_CLARO = \[[^\]]*"freeza_ship"/.test(menu));

run("selectedCharacter = 'goku_adult'; selectedStage = 'freeza_ship'; gameMode = 'coop'; startGame(); world.saibamanSpawnTimer = -1e9;");
h.step(60);
check("uma luta na Nave de Freeza roda sem erro", run("gameState") === "playing" && run("selectedStage") === "freeza_ship");
run("stopBGM();");
summary();
