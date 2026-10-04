// tests/carregar-vira-transformar.test.js — Toque: não existe mais botão TRANSF.; com o ki cheio o CARREGAR vira
// TRANSFORMAR, mas quem já estava segurando para carregar precisa soltar e tocar de novo. Os botões usam os
// ícones do jogador (icons/botoes/).
//
// Uso: node tests/carregar-vira-transformar.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

check("não há mais o botão TRANSF. no layout de toque", run("Object.keys(touchHudLayout).includes('transform')") === false);
check("ícones dos botões existem", ["ataque", "parry", "carregar", "especial", "transformar"].every(n => fs.existsSync(__dirname + "/../icons/botoes/" + n + ".png")));

run(`isTouchDevice = true; selectedCharacter = "goku_adult"; gameMode = "singleplayer"; startGame();
     world.saibamanSpawnTimer = -1e9; player.invulnerableTimer = 1e9; player.ki = 0;`);
const r = run("getHudButtonRect('charge')");
const cx = r.x + r.w / 2, cy = r.y + r.h / 2;   // canvas 800x350 sem escala: coordenada da tela = do jogo
const t1 = h.touch(1, cx, cy), t2 = h.touch(2, cx, cy);
check("segurando CARREGAR: carrega o ki", (() => { h.fire("touchstart", [t1], [t1]); return run("touchChargeId") === 1; })());
run("player.ki = player.maxKi;");
h.step(2);
check("o ki encheu com o dedo ainda segurando: não transforma sozinho", run("getTransformLevel(player)") === 0);
check("o botão agora é o de TRANSFORMAR", run("canTouchTransform()") === true);
h.fire("touchend", [], [t1]);
run("player.ki = player.maxKi;");
h.fire("touchstart", [t2], [t2]);
check("soltou e tocou de novo: transforma", run("getTransformLevel(player)") === 1);
check("e não ficou carregando com esse toque", run("touchChargeId") === null);
h.fire("touchend", [], [t2]);
run("stopBGM();");
summary();
