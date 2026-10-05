// tests/sem-textos-na-luta.test.js — nada de texto no meio da luta:
// - especial sem ki, transformação, super ataque, saibaman... não escrevem nada;
// - pegar um item mostra só um ícone rápido (senzu = +, cápsula = escudo, nuvem = sandália com asas, bastão = punho);
// - na derrota o controle não para no botão de tela cheia: X ou BOLA voltam.
//
// Uso: node tests/sem-textos-na-luta.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run("deltaTime = 1/60; gameMode = 'singleplayer'; stageMode = 'normal'; startGame(); world.floatingTexts = []");
run("player.ki = 0; triggerSpecialAttack(false)");
check("especial sem ki: nenhum texto", run("world.floatingTexts.length") === 0);
run("player.ki = player.maxKi; triggerAction('transform', player, false)");
check("transformar: nenhum texto", run("world.floatingTexts.filter(t => t.text).length") === 0);
run("player.ki = player.maxKi; player.powerBuffTimer = 300; triggerSpecialAttack(false)");
check("super ataque: nenhum texto", run("world.floatingTexts.filter(t => t.text).length") === 0);

const tipos = ["senzu", "capsule", "cloud", "staff"];
tipos.forEach(tipo => {
    run(`world.floatingTexts = []; world.pickups = [{ type: '${tipo}', x: player.x, y: player.y, w: 20, h: 20, vy: 0, spin: 0, pulse: 0 }]; update(1/60)`);
    const ft = run("world.floatingTexts.map(t => ({ icon: t.icon, text: t.text }))");
    check(`item ${tipo}: só um ícone, sem texto`, ft.length === 1 && ft[0].icon === tipo && !ft[0].text);
});
run("render()");
check("os ícones desenham sem erro", true);

// derrota: o botão de tela cheia não vira alvo do controle
run("setGameState('gameover'); menuTargets = []; render()");
const fs = run("getFullscreenButtonRect()");
check("derrota: tela cheia não é alvo do controle", !run(`menuTargetsPrev.concat(menuTargets).some(t => t.x === ${fs.x} && t.y === ${fs.y})`));
run("navigator.getGamepads = () => [{ index: 0, connected: true, id: 'pad', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 1, value: i === 1 ? 1 : 0 })) }]");
run("padNav.prevBack = false; padNav.prevConfirm = false; pollGamepadMenu(1/60)");
check("derrota: BOLA volta ao mapa de fases", run("gameState") === "stage_map");
run("navigator.getGamepads = () => []");

process.exit(summary());
