// tests/versus-sem-minions.test.js — VERSUS é só jogador 1 contra jogador 2, nas mesmas condições:
// não aparecem Saibamans/Cell Jr. nem itens (que só o jogador 1 conseguiria pegar).
//
// Uso: node tests/versus-sem-minions.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run(`selectedCharacter = "goku_adult"; gameMode = "coop"; selectedStage = "cell_games"; startGame();
     player.invulnerableTimer = 1e9; player2.invulnerableTimer = 1e9;`);
h.step(60 * 40);
check("versus: nenhum Saibaman/Cell Jr. aparece", run("world.saibamans.length") === 0);
check("versus: nenhum item aparece", run("world.pickups.length") === 0);
run("stopBGM(); gameMode = 'singleplayer'; startGame(); player.invulnerableTimer = 1e9;");
h.step(60 * 40);
check("no modo solo os minions continuam aparecendo", run("world.saibamans.length") > 0 || run("world.saibamanSpawnTimer") > 0);
run("stopBGM();");
summary();
