// tests/cabelo-ssj.test.js — Saiyajins transformados ficam com o cabelo amarelo na luta (todos os movimentos, não
// só a animação de transformar). Quem não tem cabelo de Saiyajin (Piccolo, Freeza...) continua igual.
//
// Uso: node tests/cabelo-ssj.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const AMARELO = "ffe34d";
const temAmarelo = (url) => decodeURIComponent(String(url)).includes(AMARELO);

for (const k of ["goku_adult", "vegeta", "trunks", "gohan", "broly", "bardock"]) {
    const normal = run(`getCharacterAnimationFrames("${k}", "idle", false)[0]`);
    const transformado = run(`getCharacterAnimationFrames("${k}", "flyRight", true)`);
    check(`${k}: cabelo normal fora da transformação`, !temAmarelo(normal));
    check(`${k}: transformado, voa com o cabelo amarelo`, transformado.length > 0 && transformado.every(temAmarelo));
}
check("Piccolo transformado continua igual (não é Saiyajin)",
    run(`getCharacterAnimationFrames("piccolo", "idle", true)[0] === getCharacterAnimationFrames("piccolo", "idle", false)[0]`));

run(`selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; gameMode = "coop"; startGame();
     player.ki = 100; transformPlayer(player, false); player2.ki = 100; transformPlayer(player2, true);`);
check("na luta, jogador 1 e 2 ficam transformados", run("player.isSSJ") === true && run("player2.isTransformed") === true);
h.step(30);
check("a luta segue sem erro com os dois transformados", run("gameState") === "playing");

summary();
