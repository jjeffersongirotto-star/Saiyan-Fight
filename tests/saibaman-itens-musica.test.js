// tests/saibaman-itens-musica.test.js — Saibaman do anime (brota da terra, salta, abraça e explode), itens do
// céu redesenhados e música de cada fase no estilo de uma época (clássico, Freeza, Boo, GT).
//
// Uso: node tests/saibaman-itens-musica.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run(`selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; gameMode = "singleplayer"; startGame();
     world.saibamanSpawnTimer = -1e9; world.pickupSpawnTimer = -1e9; world.saibamans = [];`);

// nasce na terra, na metade direita, sem poder acertar ninguém enquanto brota
run("spawnSaibaman()");
check("brota do chão (embaixo da tela, longe do jogador)", run("world.saibamans[0].phase") === "brotar" && run("world.saibamans[0].y") > 290 && run("world.saibamans[0].x") > 400);
check("enquanto brota não acerta nem é acertado", run("isSaibamanActive(world.saibamans[0])") === false);
run("for (let i = 0; i < SAIBAMAN_SPROUT_FRAMES + 1; i++) stepSaibamanMotion(world.saibamans[0], 1/60)");
check("depois de brotar ele salta para cima", run("world.saibamans[0].phase") === "saltar" && run("world.saibamans[0].vy") < 0);
const yAntes = run("world.saibamans[0].y");
run("for (let i = 0; i < 200 && world.saibamans[0].phase === 'saltar'; i++) stepSaibamanMotion(world.saibamans[0], 1/60)");
check("o salto sobe até a altura de voo e passa a voar", run("world.saibamans[0].phase") === "voar" && run("world.saibamans[0].y") < yAntes - 30);

// abraço: encosta no jogador, agarra, e só explode depois do tempo
run(`player.invulnerableTimer = 0; player.shield = false; player.hp = 3;
     var sb = world.saibamans[0]; sb.x = player.x; sb.y = player.y;`);
h.step(1);
check("ao encostar ele agarra (sem dano na hora)", run("world.saibamans[0] && world.saibamans[0].phase") === "agarrar" && run("player.hp") === 3);
run("player.x += 60; player.y += 10;");
h.step(2);
check("abraçado ele acompanha o jogador (o jogador continua se movendo)", Math.abs(run("world.saibamans[0].x - (player.x + world.saibamans[0].grabOffsetX)")) < 0.01);
run("player.invulnerableTimer = 0;");
h.step(60);
check("depois do abraço ele explode e tira 1 de vida", run("world.saibamans.length") === 0 && run("player.hp") === 2);
check("a explosão aparece na tela", run("world.blasts.length + world.impactParticles.length") > 0);
h.step(60);
check("a explosão some sozinha", run("world.blasts.length") === 0);

// abraço pela frente, nas pernas
run(`spawnSaibaman(); var sp = world.saibamans[0]; sp.phase = "voar"; sp.x = player.x; sp.y = player.y; player.invulnerableTimer = 0;`);
h.step(2);
check("abraça pela frente (lado direito do herói) e na altura das pernas", run("world.saibamans[0].phase") === "agarrar" &&
    run("world.saibamans[0].x > player.x + player.w * 0.3") && run("world.saibamans[0].y >= player.y + player.h * 0.2"));
run("world.saibamans = []; player.invulnerableTimer = 0;");

// não tem como escapar: nem escudo nem tiro
run(`spawnSaibaman(); var s2 = world.saibamans[0]; s2.phase = "voar"; s2.x = player.x; s2.y = player.y;
     player.invulnerableTimer = 0; player.shield = true; player.hp = 3;`);
h.step(1);
run("player.invulnerableTimer = 0;");
h.step(60);
check("agarrado não tem escapatória: mesmo com escudo, a explosão tira 1 de vida", run("player.hp") === 2);

run(`world.saibamans = []; spawnSaibaman(); var s3 = world.saibamans[0]; s3.phase = "agarrar"; s3.grabTimer = 999; s3.grabOffsetX = 0; s3.grabOffsetY = 0; s3.hp = 1;
     player.invulnerableTimer = 0; player.hp = 3; world.obstacles = [];
     world.obstacles.push({ x: player.x + 10, y: player.y + player.h / 2, vx: 0, vy: 0, radius: 6, fromPlayer: true, color: "#0ff" });`);
h.step(2);
check("atirar no Saibaman agarrado não solta (a explosão é certa)", run("world.saibamans.length") === 1 && run("world.saibamans[0].phase") === "agarrar");
run("world.saibamans[0].grabTimer = 1; player.invulnerableTimer = 0;");
h.step(3);
check("e ele explode tirando 1 de vida", run("world.saibamans.length") === 0 && run("player.hp") === 2);

// passou perto: parte para cima do herói
run(`world.saibamans = []; world.obstacles = []; player.invulnerableTimer = 0; player.hp = 3; spawnSaibaman();
     var s4 = world.saibamans[0]; s4.phase = "voar"; s4.speed = 2;
     s4.x = player.x + player.w / 2 + 70 - s4.w / 2; s4.y = player.y;`);
h.step(1);
check("passando perto (sem encostar) ele parte para cima do herói", run("world.saibamans[0].phase") === "investir" || run("world.saibamans[0].phase") === "agarrar");
h.step(30);
check("e alcança e agarra", run("world.saibamans[0] && world.saibamans[0].phase") === "agarrar");
run("world.saibamans = []; player.invulnerableTimer = 0;");
run(`spawnSaibaman(); var s5 = world.saibamans[0]; s5.phase = "voar"; s5.speed = 2; s5.x = player.x + 300; s5.y = player.y;`);
h.step(2);
check("longe do herói ele segue voando reto", run("world.saibamans[0].phase") === "voar");
run("world.saibamans = []; player.hp = 3;");

// desenho não lança erro em nenhuma fase
check("desenha todas as fases e a explosão sem erro", (() => {
    run(`world.saibamans = []; ["brotar","saltar","voar","agarrar","investir"].forEach((f, i) => { spawnSaibaman(); const s = world.saibamans[i]; s.phase = f; s.grabTimer = 10; s.phaseTime = 5; });
         world.blasts.push({ x: 100, y: 100, r: 10, maxR: 40, life: 0.5 }); drawSaibamans(); drawGrabbingSaibamans(); drawSaibamanBlasts();`);
    return run("saibamanSpriteCache.size") >= 3;
})());
check("o desenho do Saibaman fica guardado (não redesenha a cada quadro)", (() => { const n = run("saibamanSpriteCache.size"); run("drawSaibamans(); drawSaibamans();"); return run("saibamanSpriteCache.size") === n; })());

check("itens do céu desenham sem erro", (() => {
    run(`world.pickups = ["senzu","capsule","cloud","staff"].map((t, i) => ({ type: t, x: 40 + i * 40, y: 50, w: 24, h: 24, vy: 1, spin: 0, pulse: 0 })); drawPickups();`);
    return true;
})());
const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");
check("itens no estilo do anime: semente, cápsula CC, nuvem dourada, bastão vermelho", menu.includes('fillText("CC"') && menu.includes("Kinto'un") && menu.includes("Nyoibo") && menu.includes("Semente dos Deuses"));

check("abraçado ele é desenhado na frente do herói", (() => { const r = menu.slice(menu.indexOf("drawPlayerEntity(player, characterDB[selectedCharacter], false);")); return r.indexOf("drawGrabbingSaibamans()") >= 0 && r.indexOf("drawGrabbingSaibamans()") < r.indexOf("drawPlayerEntity(player2"); })());
check("abraçado ele não fica transparente (sem versão clara do desenho)", !menu.includes("flash ?") && !run("[...saibamanSpriteCache.keys()].some(k => k.endsWith('f'))"));

// música por fase
check("cada uma das 9 fases tem a sua própria música", run(`new Set(STAGE_PROGRESSION.map(s => getStageMusicEra(s.id))).size === 9 && STAGE_PROGRESSION.every(s => !!BGM_THEMES[getStageMusicEra(s.id)])`));
check("os 9 temas existem, com nome próprio, e melodia e baixo do mesmo tamanho", run(`Object.keys(BGM_THEMES).length === 9 && Object.keys(BGM_THEMES).every(k => { const t = BGM_THEMES[k], c = getCompiledTheme(t); return t.nome && c.melodia.length === c.baixo.length && c.melodia.length === t.compasso * 8; })`));
check("cada compasso da melodia fecha certinho e todas as notas são válidas", run(`Object.values(BGM_THEMES).every(t => t.melodia.split("|").every(b => b.trim().split(/\\s+/).reduce((s, tok) => s + Number(tok.split(":")[1]), 0) === t.compasso) && getCompiledTheme(t).melodia.every(e => !e || Number.isFinite(e.midi)))`));
check("bateria com um passo por semicolcheia do compasso", run(`Object.values(BGM_THEMES).every(t => [t.kick, t.snare, t.hat].every(p => p === "" || p.length === t.compasso))`));
check("as 9 músicas são diferentes: nome, andamento, compasso/instrumento e começo da melodia", run(`(() => { const ts = Object.values(BGM_THEMES);
    const dif = f => new Set(ts.map(f)).size === ts.length;
    return dif(t => t.nome) && dif(t => t.bpm) && dif(t => t.melodia.split("|")[0]) && dif(t => t.lead.wave + t.compasso + t.bassWave + t.kick + t.hat); })()`));
check("a música toca o tema da fase escolhida", run(`selectedStage = "namek"; getCurrentBgmTheme() === BGM_THEMES.namek`) && run(`selectedStage = "kaioshin"; getCurrentBgmTheme() === BGM_THEMES.boo`));

// TRILHAS SONORAS em Opções > Áudio
// áudio de mentira (o harness não tem Web Audio): só para os botões poderem ligar a música
run(`var __no = () => ({ connect() {}, start() {}, stop() {}, type: "", buffer: null, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } });
     audioCtx = { state: "running", currentTime: 0, sampleRate: 8000, destination: {}, createOscillator: __no, createGain: __no, createBufferSource: __no,
                  createBuffer: () => ({ getChannelData: () => new Float32Array(10) }), resume: () => Promise.resolve() };
     isMuted = false; bgmVolume = 0.5; setGameState('options_audio');`);
const tr = run("JSON.stringify(MENU_LAYOUT.optionsAudio.tracks)"); const trR = JSON.parse(tr);
run(`handleMenuClick(${trR.x + 5}, ${trR.y + 5})`);
check("Áudio tem o botão TRILHAS SONORAS que abre a lista", run("gameState") === "options_tracks");
check("a lista tem as 9 trilhas, uma por fase, na ordem das fases", run("getBgmTrackList().map(t => t.era).join()") === run("STAGE_PROGRESSION.map(s => getStageMusicEra(s.id)).join()") && run("getBgmTrackList().length") === 9);
check("os 9 botões de tocar não se sobrepõem e cabem na tela", run(`(() => { const rs = [0,1,2,3,4,5,6,7,8].map(getTrackPlayRect);
    const dentro = rs.every(r => r.x >= 0 && r.y >= 0 && r.x + r.w <= canvas.width && r.y + r.h <= canvas.height);
    const sobre = rs.some((a, i) => rs.some((b, j) => i < j && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
    return dentro && !sobre; })()`));
const clicar = (i) => { const r = JSON.parse(run(`JSON.stringify(getTrackPlayRect(${i}))`)); run(`handleMenuClick(${r.x + 5}, ${r.y + 5})`); };
clicar(0);
check("tocar uma trilha", run("bgmPreviewEra") === "kame" && run("!!bgmInterval"));
clicar(2);
check("tocar outra pausa a anterior e toca a nova", run("bgmPreviewEra") === run("getBgmTrackList()[2].era"));
clicar(2);
check("tocar de novo a mesma pausa", run("bgmPreviewEra") === null && run("!bgmInterval"));
clicar(1);
run("render()");
const back = JSON.parse(run("JSON.stringify(MENU_LAYOUT.back)"));
run(`handleMenuClick(${back.x + 5}, ${back.y + 5})`);
check("sair da tela para a música", run("gameState") === "options_audio" && run("bgmPreviewEra") === null && run("!bgmInterval"));

run("selectedCharacter = 'goku_adult'; startGame(); world.saibamanSpawnTimer = -1e9;");
h.step(30);
check("a luta segue sem erro", run("gameState") === "playing");
run("stopBGM(); audioCtx = null;");   // para o relógio da música (senão o processo não termina)
summary();
