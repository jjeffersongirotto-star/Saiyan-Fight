// tests/sem-piscada.test.js — o personagem não "pisca" ao mudar de movimento: os quadros são carregados antes
// da luta (e os de cabelo amarelo ao transformar), e se algum ainda não estiver pronto repete o último desenho.
//
// Uso: node tests/sem-piscada.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const todosCarregados = (key, transformed) => run(`SUB_ANIM_KEYS.every(st => getCharacterAnimationFrames("${key}", st, ${transformed}).every(src => !!gameplayImageCache[src]))`);

run(`var terminarFila = () => { while (backgroundWork.frames.length || backgroundWork.images.length || backgroundWork.pixelArt.length || backgroundWork.light.length) runBackgroundWork(1e9); };`);
run(`selectedCharacter = "gohan"; selectedBoss = "vegeta"; gameMode = "singleplayer"; startGame();`);
check("começar a luta não prepara tudo de uma vez (vai para a fila, sem travar)", run("backgroundWork.frames.length") >= 13 * 4);
check("cada quadro do jogo adianta só um pedaço da fila", (() => { const antes = run("backgroundWork.frames.length"); run("runBackgroundWork(0)"); return run("backgroundWork.frames.length") === antes - 1; })());
run("terminarFila()");
const ssjPronto = (key) => run(`SUB_ANIM_KEYS.every(st => _spriteFrameCache.has(JSON.stringify([normalizeAppearance(characterDB["${key}"].builderAppearance), st, true, "", true])))`);
check("a fila já calcula o cabelo amarelo dos dois (transformar não trava)", run("backgroundWork.frames.length") === 0 && ssjPronto("gohan") && ssjPronto("vegeta"));
check("ao começar a luta, todos os movimentos do jogador já estão sendo carregados", todosCarregados("gohan", false));
check("e os do rival também", todosCarregados("vegeta", false));
run("player.ki = 100; transformPlayer(player, false); terminarFila();");
check("ao transformar, o cabelo amarelo já está pronto", ssjPronto("gohan"));

const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");
check("se o quadro novo não estiver pronto, repete o último desenho (não some)", menu.includes("p.lastSpriteDraw") && menu.includes("pixelPending || !isDrawableSource(animationFrame)"));
h.step(30);
check("a luta segue sem erro", run("gameState") === "playing");

summary();
