// tests/pequenos-ajustes.test.js — grupo "pequenos" da revisão geral:
// transformação automática com a mesma velocidade da manual; teclas do jogador 2 não mexem no chefe no modo
// história; aura do chefe independe do jogador transformado; partida de 2 jogadores fora do ranking da fase;
// tela de derrota volta ao mapa (história) ou ao menu (2 jogadores); clique do menu no volume dos efeitos;
// aviso de conquista por tempo; choque de feixes conta apertos (não tecla segurada) e o controle do jogador 1
// funciona nele; editor usa o 1º quadro da sprite sheet se nenhum foi escolhido; LIMPAR MOVIMENTO confirma.
//
// Uso: node tests/pequenos-ajustes.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary, context } = h;
const semSpawns = "world.pickupSpawnTimer = -1e9; world.saibamanSpawnTimer = -1e9; player2.shootTimer = -1e9;";

// ---------- transformação: só com o ki cheio e quando o jogador aperta TRANSFORMAR ----------
run("gameMode = 'singleplayer'; stageMode = 'normal'; startGame(); " + semSpawns + " player.ki = 99");
check("ki quase cheio (99) não transforma", run("transformPlayer(player, false)") === false && run("player.isSSJ") === false);
run("player.ki = player.maxKi");
check("ki cheio + apertar TRANSFORMAR transforma e gasta a barra toda", run("transformPlayer(player, false)") === true && run("player.isSSJ") && run("player.ki") === 0);
run("startGame(); " + semSpawns + " score = 50; player.ki = player.maxKi; for (let i = 0; i < 120; i++) update(1/60)");
check("não transforma sozinho (nem com muitos pontos e ki cheio)", run("player.isSSJ") === false);

// ---------- teclas do jogador 2 não fazem o chefe carregar no modo história ----------
run("startGame(); " + semSpawns + " player2.ki = 0; keysPressed[keyBindings.p2.charge] = true; update(1/60)");
check("modo história: tecla de carregar do jogador 2 não faz o chefe carregar", run("player2.isCharging") === false);
run("keysPressed = {}; gameMode = 'coop'; startGame(); keysPressed[keyBindings.p2.charge] = true; update(1/60)");
check("modo 2 jogadores: a mesma tecla continua carregando o jogador 2", run("player2.isCharging") === true);
run("keysPressed = {}");

// ---------- aura do chefe não muda com o jogador transformado ----------
run("gameMode = 'singleplayer'; startGame(); player.isSSJ = true; world.auraParticles = []");
run("Math.random = () => 0.1; updateAura(player2, 'gelo', true)");
check("aura do chefe continua do tipo dele com o jogador transformado (não vira a do Super Saiyajin)", run("world.auraParticles.length > 0 && world.auraParticles.every(p => p.isWind)"));

// ---------- 2 jogadores não entra no ranking da fase ----------
run("writeStorage('saiyan_stage_ranking', ''); gameMode = 'coop'; selectedStage = 'terra'; startGame(); score = 77; triggerGameOver()");
check("partida de 2 jogadores NÃO entra no ranking da fase", run("getStageRecord('terra')") === 0);
run("gameMode = 'singleplayer'; startGame(); score = 33; triggerGameOver()");
check("partida do modo história continua entrando no ranking da fase", run("getStageRecord('terra')") === 33);

// ---------- tela de derrota: para onde volta ----------
run("handleMenuClick(400, 175)");
check("derrota no modo história volta ao MAPA DE FASES", run("gameState") === "stage_map");
run("gameMode = 'coop'; startGame(); finishVersusRound('p2'); finishVersusRound('p2'); handleMenuClick(400, 175)");
check("fim de partida do Versus volta ao MENU", run("gameState") === "menu");
run("gameMode = 'singleplayer'; startGame(); triggerGameOver(); h_calls_reset = 0");
h.calls.length = 0;
run("render()");
const textos = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("o texto da derrota diz para onde volta (não fala mais em 'reiniciar')", textos.some(t => t.includes("VOLTAR AO MAPA")) && !textos.some(t => t.includes("REINICIAR")));

// ---------- clique do menu usa o volume dos efeitos ----------
const ganhos = [];
context.__ganhos = ganhos;
run(`audioCtx = { currentTime: 0, destination: {}, createOscillator: () => ({ connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} } }),
    createGain: () => ({ connect() {}, gain: { setValueAtTime: (v) => __ganhos.push(v), linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }) };
    isMuted = false; sfxVolume = 1; bgmVolume = 0.1; playSound("menu"); audioCtx = null;`);
check("som de clique do menu segue o volume dos EFEITOS (não o da música)", Math.abs(ganhos[0] - 0.15) < 1e-9, JSON.stringify(ganhos));

// ---------- aviso de conquista: dura o mesmo tempo em 60 Hz e 120 Hz ----------
function duracaoBanner(fps) {
    run("setGameState('menu'); triggerAchievementPopup('TESTE')");
    let quadros = 0;
    while (run("achievementBanner.active") && quadros < 2000) { run(`lastFrameTime = performance.now() - ${1000 / fps}; deltaTime = ${1 / fps}; render()`); quadros++; }
    return quadros / fps;
}
run("performance.now = () => 1000");
const d60 = duracaoBanner(60), d120 = duracaoBanner(120);
check("aviso de conquista fica o mesmo tempo na tela a 60 Hz e a 120 Hz (~3 s)", Math.abs(d60 - d120) < 0.05 && Math.abs(d60 - 3) < 0.1, `${d60}s vs ${d120}s`);

// ---------- choque de feixes: tecla segurada não conta; controle do jogador 1 funciona ----------
run("gameMode = 'coop'; startGame(); " + semSpawns + " resolveBeamClash('p2', player2)");
const tecla = run("keyBindings.p1.attack");
run(`window.onkeydown({ code: "${tecla}", repeat: false, preventDefault() {} })`);
for (let i = 0; i < 10; i++) run(`window.onkeydown({ code: "${tecla}", repeat: true, preventDefault() {} })`);
check("choque: segurar a tecla de ATAQUE conta só 1 aperto (a repetição automática não conta)", run("world.clashMashP1") === 1);

let botaoApertado = false;
run("navigator.getGamepads = () => [__pad]");
context.__pad = { connected: true, id: "teste", axes: [0, 0], buttons: Array.from({ length: 18 }, (_, i) => ({ get pressed() { return i === 2 && botaoApertado; }, value: 0 })) };
run("isTouchDevice = false; world.clashMashP1 = 0; padPrevPressed.p1 = {}");   // PC: o 1º controle é do jogador 1
for (let i = 0; i < 4; i++) {
    botaoApertado = true; run("pollGamepads(1/60)");
    botaoApertado = false; run("pollGamepads(1/60)");
}
check("choque: jogador 1 no CONTROLE empurra o feixe (antes ficava bloqueado)", run("world.clashMashP1") === 4, String(run("world.clashMashP1")));
botaoApertado = true;
for (let i = 0; i < 30; i++) run("pollGamepads(1/60)");
check("choque: segurar o botão do controle conta só 1 aperto", run("world.clashMashP1") === 5);
botaoApertado = false; run("pollGamepads(1/60); navigator.getGamepads = undefined");

// ---------- editor: sprite sheet sem quadro escolhido usa o 1º quadro ----------
const alertas = [];
context.__alertas = alertas;
run("var __alertaOriginal = showSystemAlert; showSystemAlert = (t, m) => __alertas.push(m)");
run("openModal(null); document.getElementById('char-name').value = 'FOLHA'; builderLastAppearance = null; tempAnimations.idle = []");
run("spriteSheetImage = { naturalWidth: 128, naturalHeight: 32 }; getSpriteSheetGrid = () => ({ settings: { total: 4, width: 32, height: 32 }, columns: 4, rows: 1 }); extractSpriteSheetFrame = (i) => 'data:image/png;base64,QUADRO' + i; tempBase64 = 'data:image/png;base64,FOLHA_INTEIRA'");
run("saveCharacterFromModal()");
const folha = run("Object.values(characterDB).find(c => c.name === 'FOLHA')");
check("sprite sheet sem quadro escolhido: o personagem usa o 1º quadro, não a folha inteira", folha && folha.defaultUrl === "data:image/png;base64,QUADRO0");
check("e o aviso de salvo explica isso", alertas.some(a => a.includes("1º QUADRO")));
run("showSystemAlert = __alertaOriginal");

// ---------- editor: LIMPAR MOVIMENTO pede confirmação ----------
const confirmacoes = [];
context.__confirmacoes = confirmacoes;
run("var __confirmOriginal = showSystemConfirm; showSystemConfirm = (t, m, ok) => __confirmacoes.push({ t, ok })");
run("openModal(null); setActiveSpriteMovement('flyRight'); tempAnimations.flyRight = ['a', 'b']; savedSpriteMotionPreviewFrames.flyRight = ['a', 'b']; clearActiveSpriteFrames()");
check("LIMPAR MOVIMENTO pede confirmação antes de apagar", confirmacoes.length === 1 && run("tempAnimations.flyRight.length") === 2);
confirmacoes[0].ok();
check("confirmando, o movimento é limpo", run("tempAnimations.flyRight.length") === 0);
run("showSystemConfirm = __confirmOriginal; setGameState('menu')");

process.exit(summary());
