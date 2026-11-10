// tests/versao-117.test.js — versão 0.117: o herói não perde depois de já ter vencido;
// o tiro de ki no teclado tem o mesmo ritmo do toque/controle; no VERSUS os dois
// começam com a mesma vida, o especial não fecha a rodada com a vida cheia e a
// Zenkai vale para os dois.
//
// Uso: node tests/versao-117.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const dir = __dirname + "/..";
const html = fs.readFileSync(dir + "/index.html", "utf8");

const h = createHarness(dir, 800);
const { run, check, summary } = h;

check("notas: versão 0.117 é a atual", html.includes("Versão 0.117 (ATUAL)") && !html.includes("Versão 0.116 (ATUAL)"));

// ---------- 1) tiro atrasado não vira derrota ----------
run(`gameMode = "singleplayer"; stageMode = "normal"; selectedCharacter = "goku_adult"; startGame();
     modeStepIndex = 4; player.hp = 1; player.invulnerableTimer = 0; player.shield = false;`);
run("world.obstacles.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, radius: 10, vx: 0, vy: 0, fromPlayer: false, color: '#f00' });");
run("world.obstacles.push({ x: player.x + 20, y: player.y, radius: 8, vx: 7, vy: 0, fromPlayer: true, color: '#0ff' });");
run("player2.hp = 0; handleStageModeProgression();");
check("vitória da fase: o chefe está saindo e o herói está protegido",
    run("pendingStageVictory") === true && run("player2.isDying") === true && run("heroiEstaProtegido()") === true);
check("os tiros do chefe são limpos na hora da vitória (os do herói ficam)",
    run("world.obstacles.filter(o => !o.fromPlayer).length") === 0 && run("world.obstacles.some(o => o.fromPlayer)") === true);
run("world.obstacles.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, radius: 10, vx: 0, vy: 0, fromPlayer: false, color: '#f00' });");
h.step(1);
check("um tiro atrasado na saída do chefe não causa derrota",
    run("gameState") === "playing" && run("player.hp") === 1 && run("pendingStageVictory") === true);

run(`gameMode = "singleplayer"; stageMode = "normal"; startGame();
     modeStepIndex = 0; player.hp = 1; player.invulnerableTimer = 0; player.shield = false;`);
run("player2.hp = 0; handleStageModeProgression();");
run("world.obstacles.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, radius: 10, vx: 0, vy: 0, fromPlayer: false, color: '#f00' });");
h.step(1);
check("no meio da fase, um tiro atrasado também não causa derrota",
    run("gameState") === "playing" && run("player.hp") === 1 && run("player2.isDying") === true);

run(`gameMode = "coop"; selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; startGame();
     player.hp = 1; player.invulnerableTimer = 0; player.shield = false; player.zenkaiUsed = true;`);
run("player2.hp = 0; advanceWave();");
run("world.obstacles.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, radius: 10, vx: 0, vy: 0, fromPlayer: false, color: '#f00' });");
h.step(1);
check("VERSUS: tiro atrasado depois de o rival cair não entrega a rodada ao jogador 2",
    run("gameState") === "playing" && run("world.versusScore.p2") === 0 && run("player2.isDying") === true);

// ---------- 2) ritmo do teclado ----------
function contarTirosTecla(codigo, perfil) {
    const isP2 = perfil === "p2";
    run(`var __tiros = 0; var __origFire = fireKiBarrage; fireKiBarrage = function (p, isP2, w) { if (isP2 === ${isP2}) __tiros++; return __origFire(p, isP2, w); }`);
    run(`tecladoTiroCooldown.p1 = 0; tecladoTiroCooldown.p2 = 0;`);
    run(`window.onkeydown({ code: ${JSON.stringify(codigo)}, repeat: false, preventDefault() {} })`);
    // ~1 s segurando a tecla (o update do harness não chama o poll do teclado)
    for (let i = 0; i < 59; i++) {
        run("pollTecladoTiro(1/60)");
        h.step(1);
    }
    const n = run("__tiros");
    run("fireKiBarrage = __origFire; keysPressed = {};");
    return n;
}

run(`gameMode = "singleplayer"; startGame(); keyBindings.p1.attack = "KeyF"; world.beamActive = 0;`);
const tirosTecla = contarTirosTecla("KeyF", "p1");
check("teclado: segurar F por 1 s fica no ritmo do toque (~5/s), não 30 tiros", tirosTecla >= 4 && tirosTecla <= 7, String(tirosTecla));

run(`gameMode = "coop"; startGame(); keyBindings.p2.attack = "Enter"; world.beamActive = 0;`);
const tirosP2 = contarTirosTecla("Enter", "p2");
check("teclado do jogador 2 (Enter): o mesmo limite de ritmo", tirosP2 >= 4 && tirosP2 <= 7, String(tirosP2));

run(`gameMode = "singleplayer"; startGame(); keyBindings.p1.attack = "MouseLeft";
     var __tirosMouse = 0; var __origFire3 = fireKiBarrage; fireKiBarrage = function (p, isP2, w) { if (!isP2) __tirosMouse++; return __origFire3(p, isP2, w); };`);
run("canvas.onmousedown({ button: 0, clientX: 100, clientY: 100, preventDefault() {} })");
h.step(120);
const tirosSegurandoMouse = run("__tirosMouse");
for (let i = 0; i < 5; i++) {
    run("canvas.onmousedown({ button: 0, clientX: 100, clientY: 100, preventDefault() {} })");
}
const tirosCliques = run("__tirosMouse");
run("fireKiBarrage = __origFire3;");
check("mouse: segurar o clique continua sendo 1 tiro", tirosSegurandoMouse === 1, String(tirosSegurandoMouse));
check("mouse: cada clique novo continua atirando (sem o limite do teclado)", tirosCliques === 6, String(tirosCliques));

// ---------- 3) VERSUS equilibrado ----------
run(`gameMode = "coop"; selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; startGame();`);
check("VERSUS: os dois começam com a mesma vida",
    run("player.hp === player2.hp && player.maxHp === player2.maxHp && player.maxHp === getVersusFighterHp()"));
check("VERSUS: essa vida é maior que o especial, nos dois lados",
    run("getSpecialDamage() < player.maxHp && getSpecialDamage() < player2.maxHp"));

run(`player.zenkaiUsed = true; player.invulnerableTimer = 0; player.shield = false;
     player.hp = player.maxHp; player2.ki = player2.maxKi; world.beamActive = 0; world.especialPendente = null;`);
run("triggerSpecialAttack(true)");
// especial imediato (não é o sol do Freeza no Vegeta); se ficar pendente, aplica o dano na hora para o teste
run("if (world.especialPendente) aplicarDanoDoEspecial(world.especialPendente.isP2, world.especialPendente.damage);");
check("especial do jogador 2 com a vida cheia não fecha a rodada",
    run("gameState") === "playing" && run("world.versusScore.p2") === 0 && run("player.hp") === run("player.maxHp - getSpecialDamage()"));

run(`player2.zenkaiUsed = false; player2.hp = 1; player2.invulnerableTimer = 0;
     player.ki = player.maxKi; world.beamActive = 0; world.especialPendente = null;`);
run("triggerSpecialAttack(false)");
run("if (world.especialPendente) aplicarDanoDoEspecial(world.especialPendente.isP2, world.especialPendente.damage);");
check("Zenkai também salva o jogador 2 na primeira queda",
    run("player2.zenkaiUsed") === true && run("player2.hp") === 1 && run("player2.isDying") === false && run("gameState") === "playing");

run("player2.hp = 0; player2.invulnerableTimer = 0;");
run("derrubarOponenteSePreciso(3)");
check("a segunda queda do jogador 2, depois da Zenkai, encerra a rodada",
    run("player2.isDying") === true && run("player2.zenkaiUsed") === true);

run("stopBGM();");
process.exit(summary());
