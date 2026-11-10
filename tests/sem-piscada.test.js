// tests/sem-piscada.test.js — o personagem não "pisca" ao mudar de movimento: os quadros são carregados antes
// da luta (e os da forma nova ao transformar), e se algum ainda não estiver pronto repete o último desenho.
//
// Uso: node tests/sem-piscada.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

// quadro pronto para desenhar (desenhos do jogo viram pixel art direto, sem carregar a imagem em tamanho cheio)
const todosCarregados = (key, transformed) => run(`SUB_ANIM_KEYS.every(st => getCharacterAnimationFrames("${key}", st, ${transformed}).every(src => isDrawableSource(getOrCacheGameplayImage(src, characterDB["${key}"].imageObj, characterDB["${key}"].bgRemoval))))`);
const tamanhoFila = () => run("backgroundWork.frames.length + backgroundWork.images.length + backgroundWork.pixelArt.length + backgroundWork.light.length");

h.carregarPacotes(["gohan", "vegeta"]);
run(`var terminarFila = () => { while (backgroundWork.frames.length || backgroundWork.images.length || backgroundWork.pixelArt.length || backgroundWork.light.length) runBackgroundWork(1e9); };`);
run(`selectedCharacter = "gohan"; selectedBoss = "vegeta"; gameMode = "singleplayer"; startGame();`);
check("começar a luta não prepara tudo de uma vez (vai para a fila, sem travar)", run("backgroundWork.frames.length") >= 13 * 4);
check("cada quadro do jogo adianta só um pedaço da fila", (() => { const antes = tamanhoFila(); run("runBackgroundWork(0)"); return tamanhoFila() === antes - 1; })());
run("terminarFila()");
check("ao começar a luta, todos os movimentos do jogador já estão sendo carregados", todosCarregados("gohan", false));
check("e os do rival também", todosCarregados("vegeta", false));
run("player.ki = 100; transformPlayer(player, false); terminarFila();");
check("ao transformar, os quadros da forma nova já estão prontos", todosCarregados("gohan", 1));

const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");
check("se o quadro novo não estiver pronto, repete o último desenho (não some)", menu.includes("p.lastSpriteDraw") && menu.includes("pixelPending || !isDrawableSource(animationFrame)"));
h.step(30);
check("a luta segue sem erro", run("gameState") === "playing");

summary();
