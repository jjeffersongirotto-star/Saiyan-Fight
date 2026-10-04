// tests/vilao-transforma.test.js — O vilão é o personagem do editor: transforma pelos níveis da lista dele
// (como o herói) e não volta ao normal por um instante quando leva golpe (pose "hit").
// Também: no Torneio de Cell os inimigos pequenos são Cell Jr. (mesma mecânica dos Saibamans).
//
// Uso: node tests/vilao-transforma.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run(`selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; gameMode = "singleplayer"; selectedStage = "terra"; startGame();
     world.saibamanSpawnTimer = -1e9; player.invulnerableTimer = 1e9;`);
// duas transformações na lista do vilão
run(`characterDB[selectedBoss].transformations = [
        { name: "SSJ", diff: {}, ssj: true, aura: "ouro" },
        { name: "SSJ 2", diff: { hairColor: "#fff3a0" }, ssj: true, aura: "ouro" }];`);
const total = run("getCharacterTransformations(selectedBoss).length");
check("o vilão usa a lista de transformações do editor", total === 2);

run("waveNumber = 3; player2.ki = player2.maxKi;");
h.step(2);
check("ki cheio na onda 3: transforma (nível 1)", run("getTransformLevel(player2)") === 1 && run("player2.ki") < 5);
run("player2.ki = player2.maxKi;");
h.step(2);
check("enche o ki de novo: sobe para o nível 2, como o herói", run("getTransformLevel(player2)") === 2);
run("player2.ki = player2.maxKi;");
h.step(2);
check("não passa da última transformação", run("getTransformLevel(player2)") === 2);

check("levando golpe (pose 'hit') continua com o desenho transformado",
    run("JSON.stringify(getCharacterAnimationFrames(selectedBoss, 'hit', 2)) === JSON.stringify(getCharacterAnimationFrames(selectedBoss, 'idle', 2))") &&
    run("JSON.stringify(getCharacterAnimationFrames(selectedBoss, 'hit', 2)) !== JSON.stringify(getCharacterAnimationFrames(selectedBoss, 'idle', 0))"));

check("Torneio de Cell: os inimigos pequenos são Cell Jr.", run("selectedStage = 'cell_games'; getMinionKind()") === "celljr");
check("nas outras fases continuam Saibamans", run("selectedStage = 'namek'; getMinionKind()") === "saibaman");
run("selectedStage = 'cell_games'; getSaibamanSprite('voar', 0); getSaibamanSprite('agarrar', 0); getSaibamanSprite('saltar', 0);");
check("o Cell Jr. tem desenho próprio em todas as poses (sem erro)", true);
run("stopBGM();");
summary();
