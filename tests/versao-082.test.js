// tests/versao-082.test.js — versão 0.82: Saibaman agarrado morre com o especial; com parry é lançado com força
// para a frente e explode no vilão (1 de vida); retratos do quadro "i" não confundem formas que só mudam de cor.
//
// Uso: node tests/versao-082.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

const agarrado = `world.saibamans = [Object.assign(createSaibaman(player.x, 300, 150, 2), { phase: 'agarrar', phaseTime: 0, grabTimer: 40, grabOffsetX: player.w * 0.46, grabOffsetY: player.h * 0.25 })]`;

// ---------- especial com o Saibaman agarrado ----------
run("gameMode = 'singleplayer'; stageMode = 'normal'; startGame(); world.obstacles = []; player.ki = player.maxKi");
run(agarrado);
const vidaAntes = run("player.hp");
run("triggerSpecialAttack(false)");
check("soltar o especial com o Saibaman agarrado mata o Saibaman", run("world.saibamans.length") === 0);
check("e o herói não perde vida com essa explosão", run("player.hp") === vidaAntes);

// ---------- parry: lançado com força para a frente ----------
run("world.beamActive = 0; world.saibamans = []; player.x = 60; player.y = 150; player2.x = 600; player2.y = 150; player2.alvoX = 600; player2.alvoTempo = 999; player2.vy = 0.0001; player2.hp = player2.maxHp");
run(agarrado);
run("player.parryHighlightTimer = 10; update(1/60); player.parryHighlightTimer = 0");
check("parry com ele agarrado: lançado para a frente com força", run("world.saibamans[0] && world.saibamans[0].phase") === "arremessado" && run("world.saibamans[0].lancadoParry") === true && run("world.saibamans[0].vx") > 10);
const vidaVilao = run("player2.hp");
run("player.y = 10; for (let i = 0; i < 70 && world.saibamans.length; i++) { player2.y = world.saibamans[0].y - 10; update(1/60); }");
check("bateu no vilão: explode e tira 1 de vida dele", run("world.saibamans.length") === 0 && run("player2.hp") === vidaVilao - 1);

// carregar ki continua jogando para trás devagar (sem atravessar a arena)
run("world.saibamans = []; player.x = 60; player.y = 150");
run(agarrado);
run("player.isCharging = true; keysPressed[keyBindings.p1.charge] = true; update(1/60); keysPressed[keyBindings.p1.charge] = false; player.isCharging = false");
check("carregar o ki ainda solta do jeito de antes (não é o lançamento do parry)", run("world.saibamans[0] && world.saibamans[0].lancadoParry") === false);
run("setGameState('menu')");

// ---------- retratos: Golden/Black Freeza x forma final ----------
const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");
check("o retrato é guardado pelo desenho inteiro (não por um pedaço do texto)", menu.includes("cardPortraitCache.get(src)") && !menu.includes("src.slice(meio"));
const f = run(`[3, 5, 6].map(n => getCharacterAnimationFrames("freeza_1", "idle", n)[0])`);
check("forma final, Golden e Black têm desenhos diferentes (cores próprias)", new Set(f).size === 3 && f[1].includes("f2c233") && f[2].includes("25212c"));

process.exit(summary());
