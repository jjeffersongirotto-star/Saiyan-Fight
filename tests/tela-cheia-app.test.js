// tests/tela-cheia-app.test.js — aberto pelo ícone da tela inicial (como aplicativo), o jogo já está em tela cheia:
// não pede a tela cheia ao navegador (é esse pedido que faz o Chrome mostrar o aviso "Para sair da tela cheia...").
// No navegador comum, continua pedindo a tela cheia de verdade.
//
// Uso: node tests/tela-cheia-app.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run(`var __pedidos = 0; var __cont = document.getElementById("game-container");
     __cont.requestFullscreen = () => { __pedidos++; return { then() { return { catch() {} }; } }; };`);

run("pseudoFullscreen = false; matchMedia = () => ({ matches: false }); toggleFullscreen()");
check("no navegador: o botão de tela cheia pede a tela cheia de verdade", run("__pedidos") === 1);

run("__pedidos = 0; pseudoFullscreen = false; matchMedia = (q) => ({ matches: q === '(display-mode: fullscreen)' }); toggleFullscreen()");
check("como aplicativo: não pede a tela cheia ao navegador (sem o aviso do Chrome)", run("__pedidos") === 0);
check("e o jogo ocupa a tela toda mesmo assim", run("pseudoFullscreen") === true && run("isFullscreenActive()") === true);
run("toggleFullscreen()");
check("tocar de novo sai do modo tela cheia", run("pseudoFullscreen") === false);

run("__pedidos = 0; activateMobileLandscape()");
check("como aplicativo: 'tela deitada' também não pede tela cheia ao navegador", run("__pedidos") === 0);

const manifest = JSON.parse(require("fs").readFileSync(__dirname + "/../manifest.webmanifest", "utf8"));
check("o aplicativo abre deitado (orientation: landscape no manifest)", manifest.orientation === "landscape");

process.exit(summary());
