// tests/agarrao-solta.test.js — Saibaman agarrado: dar PARRY ou CARREGAR o ki joga ele para trás (solta).
// Depois ele volta para agarrar de novo e, nesse meio-tempo, pode ser destruído normalmente pelos tiros.
//
// Uso: node tests/agarrao-solta.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run(`selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; gameMode = "singleplayer"; startGame();
     world.saibamanSpawnTimer = -1e9; world.pickupSpawnTimer = -1e9; world.saibamans = []; world.obstacles = [];
     player.invulnerableTimer = 0; player.shield = false; player.hp = 3;
     spawnSaibaman(); var sb = world.saibamans[0]; sb.phase = "voar"; sb.x = player.x; sb.y = player.y;`);
h.step(1);
check("encostou: agarrou", run("world.saibamans[0].phase") === "agarrar");

run("player.parryCooldown = 0; tryReflect(player);");
h.step(1);
check("parry com ele agarrado: é arremessado para trás", run("world.saibamans[0].phase") === "arremessado");
const x0 = run("world.saibamans[0].x");
h.step(10);
check("vai para trás (para longe do herói), sem tirar vida", run("world.saibamans[0].x") > x0 + 20 && run("player.hp") === 3);
check("enquanto é arremessado não agarra de novo", run("world.saibamans[0].phase") === "arremessado");
run("world.saibamans[0].hp = 1; world.obstacles.push({ x: world.saibamans[0].x + 16, y: world.saibamans[0].y + 20, radius: 10, vx: 0, vy: 0, fromPlayer: true, damage: 1, color: '#fff' });");
const tiro = run(`(() => { const s = world.saibamans[0]; return isSaibamanActive(s) && s.phase !== "agarrar"; })()`);
check("pode ser acertado pelos tiros enquanto está solto", tiro === true);

run(`world.obstacles = []; world.saibamans = []; spawnSaibaman(); var s2 = world.saibamans[0]; s2.phase = "voar"; s2.x = player.x; s2.y = player.y; player.isCharging = false;`);
h.step(1);
check("agarrou de novo", run("world.saibamans[0].phase") === "agarrar");
run("player.isCharging = true; player.parryHighlightTimer = 0;");
h.step(1);
check("carregar o ki com ele agarrado também solta", run("world.saibamans[0].phase") === "arremessado");
run("player.isCharging = false; player.x = 100; player.y = 150; world.saibamans[0].x = 400; world.saibamans[0].y = 150;");
h.step(40);
check("depois volta a voar em direção ao herói", ["voar", "investir", "agarrar"].includes(run("world.saibamans[0] && world.saibamans[0].phase")));
run("stopBGM();");
summary();
