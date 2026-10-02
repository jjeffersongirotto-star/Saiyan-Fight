// tests/saibaman-itens-musica.test.js — Saibaman do anime (brota da terra, salta, abraça e explode), itens do
// céu redesenhados e música de cada fase no estilo de uma época (clássico, Freeza, Boo, GT).
//
// Uso: node tests/saibaman-itens-musica.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run(`selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; gameMode = "singleplayer"; startGame();
     world.saibamanSpawnTimer = -1e9; world.pickupSpawnTimer = -1e9; world.saibamans = [];`);

// nasce na terra, na metade direita, sem poder acertar ninguém enquanto brota
run("spawnSaibaman()");
check("brota do chão (embaixo da tela, longe do jogador)", run("world.saibamans[0].phase") === "brotar" && run("world.saibamans[0].y") > 290 && run("world.saibamans[0].x") > 400);
check("enquanto brota não acerta nem é acertado", run("isSaibamanActive(world.saibamans[0])") === false);
run("for (let i = 0; i < SAIBAMAN_SPROUT_FRAMES + 1; i++) stepSaibamanMotion(world.saibamans[0], 1/60)");
check("depois de brotar ele salta para cima", run("world.saibamans[0].phase") === "saltar" && run("world.saibamans[0].vy") < 0);
const yAntes = run("world.saibamans[0].y");
run("for (let i = 0; i < 200 && world.saibamans[0].phase === 'saltar'; i++) stepSaibamanMotion(world.saibamans[0], 1/60)");
check("o salto sobe até a altura de voo e passa a voar", run("world.saibamans[0].phase") === "voar" && run("world.saibamans[0].y") < yAntes - 30);

// abraço: encosta no jogador, agarra, e só explode depois do tempo
run(`player.invulnerableTimer = 0; player.shield = false; player.hp = 3;
     var sb = world.saibamans[0]; sb.x = player.x; sb.y = player.y;`);
h.step(1);
check("ao encostar ele agarra (sem dano na hora)", run("world.saibamans[0] && world.saibamans[0].phase") === "agarrar" && run("player.hp") === 3);
run("player.x += 60; player.y += 10;");
h.step(2);
check("abraçado ele acompanha o jogador (o jogador continua se movendo)", Math.abs(run("world.saibamans[0].x - (player.x + world.saibamans[0].grabOffsetX)")) < 0.01);
run("player.invulnerableTimer = 0;");
h.step(60);
check("depois do abraço ele explode e tira 1 de vida", run("world.saibamans.length") === 0 && run("player.hp") === 2);
check("a explosão aparece na tela", run("world.blasts.length + world.impactParticles.length") > 0);
h.step(60);
check("a explosão some sozinha", run("world.blasts.length") === 0);

// com escudo: a explosão só quebra o escudo
run(`spawnSaibaman(); var s2 = world.saibamans[0]; s2.phase = "voar"; s2.x = player.x; s2.y = player.y;
     player.invulnerableTimer = 0; player.shield = true; player.hp = 3;`);
h.step(1);
run("player.invulnerableTimer = 0;");
h.step(60);
check("com escudo, a explosão só quebra o escudo", run("player.shield") === false && run("player.hp") === 3);

// atirar nele durante o abraço solta o jogador antes da explosão
run(`spawnSaibaman(); var s3 = world.saibamans[0]; s3.phase = "agarrar"; s3.grabTimer = 999; s3.grabOffsetX = 0; s3.grabOffsetY = 0; s3.hp = 1;
     player.invulnerableTimer = 0; player.hp = 3; world.obstacles = [];
     world.obstacles.push({ x: player.x + 10, y: player.y + player.h / 2, vx: 0, vy: 0, radius: 6, fromPlayer: true, color: "#0ff" });`);
h.step(2);
check("atirar no Saibaman abraçado o derruba sem explodir", run("world.saibamans.length") === 0 && run("player.hp") === 3);

// desenho não lança erro em nenhuma fase
check("desenha todas as fases e a explosão sem erro", (() => {
    run(`world.saibamans = []; ["brotar","saltar","voar","agarrar"].forEach((f, i) => { spawnSaibaman(); const s = world.saibamans[i]; s.phase = f; s.grabTimer = 10; s.phaseTime = 5; });
         world.blasts.push({ x: 100, y: 100, r: 10, maxR: 40, life: 0.5 }); drawSaibamans();`);
    return run("saibamanSpriteCache.size") >= 3;
})());
check("o desenho do Saibaman fica guardado (não redesenha a cada quadro)", (() => { const n = run("saibamanSpriteCache.size"); run("drawSaibamans(); drawSaibamans();"); return run("saibamanSpriteCache.size") === n; })());

check("itens do céu desenham sem erro", (() => {
    run(`world.pickups = ["senzu","capsule","cloud","staff"].map((t, i) => ({ type: t, x: 40 + i * 40, y: 50, w: 24, h: 24, vy: 1, spin: 0, pulse: 0 })); drawPickups();`);
    return true;
})());
const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");
check("itens no estilo do anime: semente, cápsula CC, nuvem dourada, bastão vermelho", menu.includes('fillText("CC"') && menu.includes("Kinto'un") && menu.includes("Nyoibo") && menu.includes("Semente dos Deuses"));

// música por fase
check("cada fase tem a música da sua época", run(`["terra","kaio","namek","freeza_ship","namek_explosao","time_room","cell_games","kaioshin"].map(getStageMusicEra).join()`) === "classico,classico,cell,cell,cell,boo,cell,gt");
check("os 4 temas existem e têm melodia e baixo do mesmo tamanho", run(`["classico","cell","boo","gt"].every(k => BGM_THEMES[k] && BGM_THEMES[k].melody.length === BGM_THEMES[k].bass.length && BGM_THEMES[k].melody.length >= 16)`));
check("cada tema tem a batida da sua abertura (bateria de 16 tempos por compasso)", run(`Object.values(BGM_THEMES).every(t => t.kick.length === 16 && t.snare.length === 16 && t.hat.length === 16 && (t.stab === "" || t.stab.length === 16) && t.bpm >= 120 && t.bpm <= 180)`));
check("os ritmos são diferentes entre as épocas", run(`new Set(Object.values(BGM_THEMES).map(t => t.kick + t.hat + t.bpm)).size === 4`));
check("a música toca o tema da fase escolhida", run(`selectedStage = "namek"; getCurrentBgmTheme() === BGM_THEMES.cell`) && run(`selectedStage = "kaioshin"; getCurrentBgmTheme() === BGM_THEMES.gt`));

h.step(30);
check("a luta segue sem erro", run("gameState") === "playing");
summary();
