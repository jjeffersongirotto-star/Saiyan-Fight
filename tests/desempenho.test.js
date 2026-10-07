// tests/desempenho.test.js — proteções contra os gargalos encontrados na auditoria de desempenho:
// animações geradas só quando usadas (abrir o jogo era lento), memória dos quadros com limite, prévia do construtor
// sem refazer tudo a cada passo ao arrastar uma cor, aura com quadros de tamanho fixo e o começo da luta/transformação
// preparando os desenhos aos poucos.
//
// Uso: node tests/desempenho.test.js

const sp = require("../sprites.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

// ---------- abrir o jogo: animações só são geradas quando alguém as usa ----------
run(`var __anim = buildProceduralAnimations(SPRITE_PRESETS.cell.appearance).animations;`);
check("as animações não são geradas na hora de criar o personagem", run(`typeof Object.getOwnPropertyDescriptor(__anim, "transform").get`) === "function");
check("na primeira leitura o movimento é gerado e guardado", run(`__anim.transform.length > 0 && !Object.getOwnPropertyDescriptor(__anim, "transform").get`));
check("todos os movimentos continuam listados", run(`Object.keys(__anim).length`) === run("SUB_ANIM_KEYS.length"));

// ---------- memória dos quadros com limite ----------
for (let i = 0; i < 450; i++) sp.getProceduralFrameUrls(Object.assign({}, sp.SPRITE_PRESETS.goku.appearance, { primaryColor: "#" + (0x100000 + i).toString(16) }), "parry");
check("limite de quadros guardados existe (SPRITE_FRAME_CACHE_MAX)", run("_spriteFrameCache.size <= SPRITE_FRAME_CACHE_MAX"));
run(`for (let i = 0; i < 450; i++) getProceduralFrameUrls(Object.assign({}, SPRITE_PRESETS.goku.appearance, { primaryColor: "#" + (0x200000 + i).toString(16) }), "parry");`);
check("depois de 450 cores diferentes, a memória continua no limite", run("_spriteFrameCache.size") <= run("SPRITE_FRAME_CACHE_MAX"));

// ---------- construtor: arrastar uma cor não refaz a prévia a cada passo ----------
run(`var __prev = 0; var __orig = refreshBuilderPreviewNow; refreshBuilderPreviewNow = function () { __prev++; };
     for (let i = 0; i < 40; i++) refreshBuilderPreview();`);
check("40 passos de cor seguidos não refazem a prévia na hora", run("__prev") === 0 && run("builderPreviewDebounce !== null"));
run("refreshBuilderPreviewNow = __orig;");

// ---------- aura: quadros guardados não dependem do tamanho ----------
run(`kiAuraCache = new Map(); deltaTime = 1/60; player.isCharging = true;
     for (let i = 0; i < 300; i++) drawKiAura(player, characterDB.goku_adult, 100, 200, 40 + (i % 37), 70 + (i % 53));`);
check("a aura cresce e muda de tamanho sem criar uma imagem por tamanho", run("kiAuraCache.size") <= run("KI_AURA_FRAMES"));

// ---------- luta: preparar os desenhos aos poucos ----------
run(`var terminarFila = () => { while (backgroundWork.frames.length || backgroundWork.images.length || backgroundWork.pixelArt.length || backgroundWork.light.length) runBackgroundWork(1e9); };`);
run(`selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; gameMode = "singleplayer"; startGame();`);
check("começar a luta não prepara tudo de uma vez", run("backgroundWork.frames.length") > 0);
run(`var __t = Date.now(); runBackgroundWork(4); var __dt = Date.now() - __t;`);
check("cada quadro adianta só um pedaço", run("backgroundWork.frames.length + backgroundWork.images.length") > 0);
run("terminarFila(); player.ki = 100; transformPlayer(player, false);");
check("transformar depois da preparação não gera nada pesado na hora (o cabelo amarelo já estava pronto)", run("(() => { const t = Date.now(); terminarFila(); return Date.now() - t; })()") < 300);
h.step(60);
check("a luta segue sem erro", run("gameState") === "playing");

// ---------- primeiro segundo da luta: tudo é preparado ainda nos menus ----------
run(`gameState = "characters"; selectedCharacter = "gohan"; selectedBoss = "piccolo"; runBackgroundWork(0);`);
check("nos menus, o jogo já começa a preparar os lutadores escolhidos", String(run("backgroundWork.warmedFor")).startsWith("gohan|piccolo|") && run("backgroundWork.frames.length + backgroundWork.images.length") > 0);
check("a preparação inclui os quadros da aura", run("backgroundWork.light.length") > 0 || run("kiAuraCache.size") > 0);
run("terminarFila();");
run("startGame();");
check("com tudo pronto, começar a luta não prepara nada de novo", run("backgroundWork.frames.length + backgroundWork.images.length + backgroundWork.light.length") === 0);
check("tamanho usado na preparação é o mesmo da luta", (() => { h.step(2); const s = run("getFighterBoxSize(selectedCharacter)"); return s[0] === run("player.w") && s[1] === run("player.h"); })());
run(`gameState = "characters"; selectedCharacter = "vegeta"; runBackgroundWork(0);`);
check("trocar de personagem no menu prepara o novo", String(run("backgroundWork.warmedFor")).startsWith("vegeta|piccolo|"));
const audio = require("fs").readFileSync(__dirname + "/../audio.js", "utf8");
check("o som é ligado no primeiro toque (não no começo da luta)", audio.includes("AUDIO_UNLOCK_EVENTS") && audio.includes("ligarAudio"));

process.exit(summary());
