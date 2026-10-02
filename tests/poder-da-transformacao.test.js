// tests/poder-da-transformacao.test.js — a transformação dura até o fim da luta (cabelo amarelo), mas os bônus
// e a aura grande/dourada só valem por TRANSFORM_POWER_DURATION. Depois a aura volta ao normal.
//
// Uso: node tests/poder-da-transformacao.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run(`selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; gameMode = "coop"; startGame();
     world.saibamanSpawnTimer = -1e9; world.pickupSpawnTimer = -1e9;`);
const velNormal = run("player.speed");
const agrNormal = run("player2.aggressiveness");
run("player.ki = 100; transformPlayer(player, false); player2.ki = 100; transformPlayer(player2, true);");
check("ao transformar: mais velocidade e o poder extra começa a contar", run("player.speed") === velNormal + 1 && run("player.transformPowerTimer") === run("TRANSFORM_POWER_DURATION"));
check("rival transformado fica mais agressivo", run("player2.aggressiveness") > agrNormal);
check("durante o poder extra a aura é grande e dourada (fica no nível de carregar ki)", (() => {
    run("player.isCharging = false; player.kiAuraLevel = 0; deltaTime = 1/60; for (let i = 0; i < 120; i++) drawKiAura(player, characterDB.goku_adult, 100, 200, 60, 100)");
    return run("player.kiAuraLevel") > 0.9;
})());

// passa o tempo do poder extra
run("for (let i = 0; i < TRANSFORM_POWER_DURATION + 5; i++) { player.hp = player.maxHp; player2.hp = player2.maxHp; updateTransformPower(player, false, 1/60); updateTransformPower(player2, true, 1/60); }");
check("depois do tempo: continua Super Saiyajin até o fim da luta", run("player.isSSJ") === true && run("player2.isTransformed") === true);
check("depois do tempo: perde a velocidade extra", run("player.speed") === velNormal);
check("depois do tempo: rival volta à agressividade normal", Math.abs(run("player2.aggressiveness") - agrNormal) < 1e-9);
check("avisa que o poder extra acabou", run("world.floatingTexts.some(t => t.text === 'PODER EXTRA ACABOU')"));
check("depois do tempo: a aura diminui e volta ao normal", (() => {
    run("for (let i = 0; i < 120; i++) drawKiAura(player, characterDB.goku_adult, 100, 200, 60, 100)");
    return run("player.kiAuraLevel") < 0.1;
})());
check("carregar ki ainda aumenta a aura depois do tempo", (() => {
    run("player.isCharging = true; for (let i = 0; i < 120; i++) drawKiAura(player, characterDB.goku_adult, 100, 200, 60, 100); player.isCharging = false;");
    return run("player.kiAuraLevel") > 0.9;
})());
check("o cabelo continua amarelo depois do tempo", decodeURIComponent(String(run(`getCharacterAnimationFrame("goku_adult", "idle", 0, true) && getCharacterAnimationFrames("goku_adult", "idle", !!player.isSSJ)[0]`))).includes("ffe34d"));
check("depois da última transformação não dá para transformar de novo", (() => {
    run("for (let n = 0; n < 10; n++) { player.ki = 100; if (!transformPlayer(player, false)) break; }");
    return run("getTransformLevel(player)") === run("getCharacterTransformations('goku_adult').length") && run("player.ki = 100; transformPlayer(player, false)") === false;
})());

run("startGame()");
check("nova luta: começa sem transformação e sem bônus", run("player.isSSJ") === false && run("player.speed") === velNormal);
h.step(30);
check("a luta segue sem erro", run("gameState") === "playing");

summary();
