// tests/som-so-nos-botoes.test.js — o som de clique do menu só toca ao tocar num botão; tocar no fundo vazio
// fica em silêncio. Telas de "toque em qualquer lugar" (derrota, pausa automática) continuam com som.
//
// Uso: node tests/som-so-nos-botoes.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("var __sons = []; playSound = (s) => __sons.push(s); initAudio = () => {}");
const clicar = (x, y) => { run("__sons = []"); run(`handleMenuClick(${x}, ${y})`); return run("__sons.filter(s => s === 'menu').length") > 0; };

run("setGameState('menu'); render(); render()");
const jogar = run("MENU_LAYOUT.main.play");
check("menu: tocar no botão JOGAR faz som", clicar(jogar.x + jogar.w / 2, jogar.y + jogar.h / 2));
run("setGameState('menu'); render(); render()");
check("menu: tocar no fundo vazio NÃO faz som", !clicar(5, 340));
check("e não muda de tela", run("gameState") === "menu");

run("setGameState('characters'); render(); render()");
check("personagens: tocar no fundo vazio NÃO faz som", !clicar(790, 345));

run("gameMode = 'singleplayer'; startGame(); triggerGameOver(); render()");
check("derrota (toque em qualquer lugar pra voltar): faz som", clicar(5, 340));

run("setGameState('menu')");
process.exit(summary());
