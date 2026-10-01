// tests/conquistas-corrigidas.test.js — "Do Limiar da Morte à Vitória" (zenkai_win) nunca era liberada; e
// "Campeão do Torneio" (stage_terra) era liberada logo na 1ª partida porque a 1ª fase já começa aberta — agora é
// vencer o modo NORMAL dela. Também garante que toda conquista tem um jeito de ser liberada.
//
// Uso: node tests/conquistas-corrigidas.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
const semSpawns = "world.pickupSpawnTimer = -1e9; world.saibamanSpawnTimer = -1e9; player2.shootTimer = -1e9;";
const zerar = "Object.keys(achievements).forEach(k => achievements[k].unlocked = false); stageProgress = {};";

// ---------- Do Limiar da Morte à Vitória ----------
run(zerar + "gameMode = 'coop'; startGame(); " + semSpawns);
run("player2.hp = 0; advanceWave()");
check("vencer um duelo SEM usar a Zenkai não libera 'Do Limiar da Morte à Vitória'", run("achievements.zenkai_win.unlocked") === false);
run("startGame(); " + semSpawns + " player.hp = 0; attemptZenkaiRevival()");
check("a Zenkai foi usada (o jogador voltou com 1 de vida)", run("player.zenkaiUsed") === true && run("player.hp") === 1);
run("finishVersusRound('p1')");
check("vencer só uma rodada ainda não libera (a conquista é vencer a PARTIDA do Versus)", run("achievements.zenkai_win.unlocked") === false);
run("finishVersusRound('p1')");
check("vencer a partida do Versus DEPOIS de usar a Zenkai libera 'Do Limiar da Morte à Vitória'", run("achievements.zenkai_win.unlocked") === true);

// ---------- Campeão do Torneio ----------
run(zerar + "gameMode = 'singleplayer'; selectedStage = 'terra'; stageMode = 'normal'; startGame(); " + semSpawns + " update(1/60)");
check("'Campeão do Torneio' NÃO é liberada só por jogar a 1ª fase", run("achievements.stage_terra.unlocked") === false);
run("stageMode = 'normal'; resolveStageVictory()");
check("vencer o modo NORMAL do Torneio libera 'Campeão do Torneio'", run("achievements.stage_terra.unlocked") === true);
check("a descrição diz o que fazer", run("achievements.stage_terra.desc").includes("NORMAL"));
check("as outras arenas continuam sendo liberadas ao abrir a fase (Kaioh abriu)", (run("checkRunMilestones()"), run("achievements.stage_kaio.unlocked")) === true);

// ---------- toda conquista pode ser liberada ----------
const codigo = ["gameplay.js", "menu.js", "database.js", "progress.js"].map(f => fs.readFileSync(__dirname + "/../" + f, "utf8")).join("\n");
const semJeito = run("Object.entries(achievements).filter(([k, a]) => !a.statKey).map(([k]) => k)")
    .filter(k => !codigo.includes(`unlockAchievement("${k}")`) && !(k.startsWith("stage_") && codigo.includes('unlockAchievement("stage_" +')));
check("nenhuma conquista ficou sem um jeito de ser liberada", semJeito.length === 0, JSON.stringify(semJeito));

run("setGameState('menu')");
process.exit(summary());
