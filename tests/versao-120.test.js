// tests/versao-120.test.js — v0.120: tela preta e jogo parado quando o vilão era derrotado no meio do laço dos
// minions ou dos tiros (ex.: Saibaman lançado pelo parry explode no vilão e o derruba). A proteção da vitória
// esvaziava a lista trocando por outra e o laço lia um item que não existia, a cada quadro.
//
// Uso: node tests/versao-120.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run(`gameMode = "singleplayer"; selectedCharacter = "vegeta"; selectedBoss = "piccolo"; startGame(); deltaTime = 1/60;`);
// dois Saibamans: o de índice maior é lançado pelo parry em cima do vilão com 1 de vida
run(`player2.hp = 1;
     const a = createSaibaman(300, 250), b = createSaibaman(player2.x, player2.y);
     throwSaibaman(b, true); b.x = player2.x; b.y = player2.y + 15;
     world.saibamans.push(a, b); var __lista = world.saibamans;`);
let erro = null;
try { run("update(1/60)"); } catch (e) { erro = e; }
check("vilão derrotado por um Saibaman lançado: o quadro termina sem erro", !erro, erro && erro.message);
check("o vilão caiu e a lista de minions foi esvaziada (a mesma lista)", run("player2.isDying && world.saibamans === __lista && world.saibamans.length === 0"));
erro = null;
try { for (let i = 0; i < 30; i++) run("update(1/60)"); } catch (e) { erro = e; }
check("e a luta segue nos quadros seguintes", !erro, erro && erro.message);

// tiro do herói derrota o vilão com outros tiros na lista
run(`startGame(); player2.hp = 1; world.obstacles.length = 0;
     world.obstacles.push({ x: 10, y: 10, radius: 4, vx: 0, vy: 0, fromPlayer: false, damage: 1 });
     world.obstacles.push({ x: player2.x + player2.w / 2, y: player2.y + player2.h / 2, radius: 6, vx: 0, vy: 0, fromPlayer: true, damage: 1 });`);
erro = null;
try { run("update(1/60)"); } catch (e) { erro = e; }
check("tiro derruba o vilão: sem erro e os tiros do vilão somem", !erro && run("player2.isDying && world.obstacles.every(o => o.fromPlayer)"), erro && erro.message);

check("um erro na lógica de um quadro não para o desenho da tela", require("fs").readFileSync(__dirname + "/../menu.js", "utf8").includes("try { update(deltaTime); } catch (erro) { registrarErroDaLuta(erro); }"));
process.exit(summary());
