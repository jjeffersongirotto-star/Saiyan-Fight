// tests/fases-3d.test.js — Fases novas em 3D (cenarios3d.js): Planeta do Sr. Kaioh (o planetinha gira e a rua
// passa na horizontal), Torneio de Artes Marciais e Planeta Supremo Kaioh (câmera girando em volta dos
// lutadores), Planeta Namek e Namek prestes a explodir (câmera andando para frente).
//
// Uso: node tests/fases-3d.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");
const html = fs.readFileSync(__dirname + "/../index.html", "utf8");

check("cenarios3d.js carrega depois de menu.js e antes de atualizacao.js",
    html.indexOf('src="menu.js"') < html.indexOf('src="cenarios3d.js"') && html.indexOf('src="cenarios3d.js"') < html.indexOf('src="atualizacao.js"'));

const fases = {
    kaio: ["drawKaioPlanetStage(getStageLapAngle(scroll, KAIO_PLANET_LAP_SCROLL))", "KAIO_PLANET_LAP_SCROLL"],
    terra: ["drawTerraArenaStage(getStageLapAngle(scroll, TERRA_ARENA_LAP_SCROLL))", "TERRA_ARENA_LAP_SCROLL"],
    kaioshin: ["drawKaioshinStage(getStageLapAngle(scroll, KAIOSHIN_LAP_SCROLL))", "KAIOSHIN_LAP_SCROLL"],
    namek: ["drawNamekStage(getForwardTravel(scroll))", "20000"],
    namek_explosao: ["drawNamekExplodingStage(getForwardTravel(scroll))", "20000"]
};
for (const [id, [chamada, volta]] of Object.entries(fases)) {
    check(`${id}: o fundo usa o desenho 3D`, menu.includes(chamada));
    run(`selectedStage = '${id}';`);
    let ok = true;
    for (const frac of [0, 0.13, 0.25, 0.5, 0.77, 0.99, 3.4]) {
        try { run(`world.stageScrollX = ${volta} * ${frac}; gameplayClock = ${frac * 9}; drawStageBackground();`); }
        catch (e) { ok = false; console.log("   erro:", e.message); }
    }
    check(`${id}: desenha vários pontos da volta/caminho sem erro`, ok);
}

check("Kaioh: a rua fica no equador (horizontal) e o planeta gira", run(`(() => {
    const a = kpProj(0, 0, 0), b = kpProj(0, 0.3, 0), c = kpProj(0, 0, 0.3);
    return Math.abs(a.y - b.y) < 20 && Math.abs(a.x - c.x) > 10;
})()`));
check("Namek: o caminho é sempre o mesmo (mesma fileira, mesmas árvores)", run("JSON.stringify(nmFileira(37)) === JSON.stringify(nmFileira(37))"));
check("Namek explodindo: o caminho é sempre o mesmo", run("JSON.stringify(nxFileira(37)) === JSON.stringify(nxFileira(37))"));

check("placar com fundo escuro nas fases de céu claro (Torneio, Kaioh, Namek, Supremo Kaioh)",
    ["terra", "kaio", "namek", "kaioshin"].every(id => new RegExp('const STAGES_FUNDO_CLARO = \\[[^\\]]*"' + id + '"').test(menu)));

for (const id of Object.keys(fases)) {
    run(`selectedCharacter = 'goku_adult'; selectedStage = '${id}'; gameMode = 'solo'; startGame();`);
    h.step(90);
    check(`uma luta em ${id} roda sem erro`, run("gameState") === "playing" && run("selectedStage") === id);
    run("stopBGM(); gameState = 'menu';");
}
summary();
