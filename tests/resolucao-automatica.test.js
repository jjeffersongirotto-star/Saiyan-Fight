// tests/resolucao-automatica.test.js — se a luta ficar abaixo de ~52 FPS, a resolução real baixa sozinha meio
// passo (2x → 1,5x → 1x); com 60 FPS ela continua igual; nos menus não mede nada.
//
// Uso: node tests/resolucao-automatica.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run("renderScaleTeto = RENDER_SCALE_MAX; setRenderScale(2); deltaTime = 1/60; gameMode = 'singleplayer'; startGame(); setGameState('playing')");
run("desempenho.ignorar = 0; for (let i = 0; i < 200; i++) vigiarDesempenho(16.7)");
check("luta a 60 FPS: resolução continua 2x", run("renderScale") === 2);
run("desempenho.ignorar = 0; for (let i = 0; i < 90; i++) vigiarDesempenho(33)");
check("luta lenta: baixa meio passo (1,5x)", run("renderScale") === 1.5);
run("desempenho.ignorar = 0; for (let i = 0; i < 90; i++) vigiarDesempenho(33)");
check("continua lenta: baixa para 1x", run("renderScale") === 1);
run("desempenho.ignorar = 0; for (let i = 0; i < 90; i++) vigiarDesempenho(33)");
check("nunca abaixo de 1x", run("renderScale") === 1);
run("fitCanvasToViewport()");
check("não volta a subir sozinho na mesma sessão", run("renderScale") === 1);
run("setGameState('menu'); renderScaleTeto = RENDER_SCALE_MAX; setRenderScale(2); for (let i = 0; i < 400; i++) vigiarDesempenho(40)");
check("nos menus não mede (resolução não muda)", run("renderScale") === 2);
run("renderScaleTeto = RENDER_SCALE_MAX; setRenderScale(1)");

process.exit(summary());
