// tests/sem-piscada.test.js — o personagem não "pisca" ao mudar de movimento: os quadros são carregados antes
// da luta (e os de cabelo amarelo ao transformar), e se algum ainda não estiver pronto repete o último desenho.
//
// Uso: node tests/sem-piscada.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const todosCarregados = (key, transformed) => run(`SUB_ANIM_KEYS.every(st => getCharacterAnimationFrames("${key}", st, ${transformed}).every(src => !!gameplayImageCache[src]))`);

run(`selectedCharacter = "gohan"; selectedBoss = "vegeta"; gameMode = "singleplayer"; startGame();`);
check("ao começar a luta, todos os movimentos do jogador já estão sendo carregados", todosCarregados("gohan", false));
check("e os do rival também", todosCarregados("vegeta", false));
run("player.ki = 100; transformPlayer(player, false);");
check("ao transformar, os quadros de cabelo amarelo já começam a carregar", todosCarregados("gohan", true));

const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");
check("se o quadro novo não estiver pronto, repete o último desenho (não some)", menu.includes("p.lastSpriteDraw") && menu.includes("pixelPending || !isDrawableSource(animationFrame)"));
h.step(30);
check("a luta segue sem erro", run("gameState") === "playing");

summary();
