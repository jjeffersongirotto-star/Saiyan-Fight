// tests/arenas-e-conquista.test.js — cards da tela ARENAS com a foto de cada fase e o aviso de conquista
// moderno (pílula arredondada no topo, no centro, com ícone em destaque).
//
// Uso: node tests/arenas-e-conquista.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");

const quadro = () => run("lastFrameTime = performance.now() - 16; deltaTime = 1/60; render()");

run("selectedStage = 'terra'; setGameState('stages');");
quadro();
check("tira a foto de uma fase por quadro (sem engasgar)", run("Object.keys(stageCardThumbs).length") === 1);
for (let i = 0; i < 10; i++) quadro();
check("depois de alguns quadros, todas as 8 fases têm foto", run("STAGE_PROGRESSION.every(s => stageCardThumbs[s.id] && stageCardThumbs[s.id].cor && stageCardThumbs[s.id].cinza)"));
check("tirar as fotos não muda a fase escolhida", run("selectedStage") === "terra" && run("gameState") === "stages");
check("o card desenha a foto (colorida se liberada, cinza se bloqueada)", menu.includes("unlocked ? thumb.cor : thumb.cinza"));

// aviso de conquista
run("setGameState('menu'); triggerAchievementPopup('MESTRE DO TESTE');");
let quadros = 0;
while (run("achievementBanner.yOffset") < 0 && quadros < 60) { quadro(); quadros++; }
check("o aviso aparece rápido (menos de meio segundo)", quadros <= 20);
check("fica no topo, no centro da tela, com pontas arredondadas e sem canto de baixo", (() => {
    const f = menu.slice(menu.indexOf("function drawAchievementBanner()"), menu.indexOf("function drawSaibamanBlasts()"));
    return f.includes("canvas.width / 2 - w / 2") && f.includes("8 + achievementBanner.yOffset") && f.includes("roundRect") && !menu.includes("canvas.height - 44 - achievementBanner.yOffset");
})());
check("tem o ícone em destaque que salta (escala) e um anel de brilho", (() => {
    const f = menu.slice(menu.indexOf("function drawAchievementBanner()"), menu.indexOf("function drawSaibamanBlasts()"));
    return f.includes("ctx.scale(escala, escala)") && f.includes("drawStarPath") && f.includes("iconR + q * 18");
})());
for (let i = 0; i < 200; i++) quadro();
check("e some sozinho depois", run("achievementBanner.active") === false);

summary();
