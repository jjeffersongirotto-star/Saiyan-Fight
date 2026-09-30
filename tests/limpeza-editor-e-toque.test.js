// tests/limpeza-editor-e-toque.test.js — limpeza de código antigo/duplicado:
// - botões de toque (ataque, parry, especial, transformar) passam pelo mesmo caminho do teclado (triggerAction),
//   então o aviso "KI INSUFICIENTE" agora aparece em qualquer controle, não só no toque;
// - "ADICIONAR QUADRO AO MOVIMENTO" e "SALVAR FRAMES NA PRÉVIA" faziam o mesmo: ficou um botão só;
// - o editor sem imagem nenhuma continua mostrando/salvando a imagem reserva.
//
// Uso: node tests/limpeza-editor-e-toque.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary, fire, touch } = h;

const avisos = () => run("world.floatingTexts.map(t => t.text)");

// ---------- aviso de ki insuficiente: teclado e toque ----------
run("gameMode = 'singleplayer'; stageMode = 'normal'; startGame(); player.ki = 0; world.floatingTexts = []");
run("triggerAction('transform', player, false)");
check("teclado/controle: transformar sem ki mostra o aviso", avisos().some(t => t.startsWith("KI INSUFICIENTE")));
check("teclado/controle: sem ki não transforma", run("player.isSSJ") === false);

run("world.floatingTexts = []; player.ki = 0");
const r = run("getHudButtonRect('transform')");
fire("touchstart", [touch(1, r.x + r.w / 2, r.y + r.h / 2)], [touch(1, r.x + r.w / 2, r.y + r.h / 2)]);
fire("touchend", [], [touch(1, r.x + r.w / 2, r.y + r.h / 2)]);
check("toque: o botão TRANSF. continua mostrando o aviso", avisos().some(t => t.startsWith("KI INSUFICIENTE")));

run("world.floatingTexts = []; player.ki = 100");
run("triggerAction('transform', player, false)");
check("com ki suficiente transforma normalmente (sem aviso)", run("player.isSSJ") === true && !avisos().some(t => t.startsWith("KI INSUFICIENTE")));
run("world.floatingTexts = []");
run("triggerAction('transform', player, false)");
check("já transformado: apertar de novo não mostra aviso de ki", !avisos().some(t => t.startsWith("KI INSUFICIENTE")));

// ---------- botão de toque ATAQUE e PARRY seguem funcionando pelo caminho único ----------
run("startGame(); world.obstacles = []; runStats.attacks = 0");
const a = run("getHudButtonRect('attack')");
fire("touchstart", [touch(2, a.x + a.w / 2, a.y + a.h / 2)], [touch(2, a.x + a.w / 2, a.y + a.h / 2)]);
fire("touchend", [], [touch(2, a.x + a.w / 2, a.y + a.h / 2)]);
check("toque: botão ATAQUE dispara um tiro", run("runStats.attacks") === 1);

// ---------- editor: botão único de adicionar quadros ----------
check("não existe mais a função duplicada saveSelectedFramesToPreview", run("typeof saveSelectedFramesToPreview") === "undefined");
run("openModal(null); setActiveSpriteMovement('flyRight')");
run("extractSpriteSheetFrame = (i) => 'data:image/png;base64,Q' + i");   // dispensa carregar uma sprite sheet de verdade
run("selectedSpriteSheetFrames = new Set([0, 1]); assignSelectedSpriteFrame()");
run("selectedSpriteSheetFrames = new Set([2]); assignSelectedSpriteFrame()");
check("adicionar quadros acrescenta ao movimento na ordem", JSON.stringify(run("tempAnimations.flyRight")) === JSON.stringify(["data:image/png;base64,Q0", "data:image/png;base64,Q1", "data:image/png;base64,Q2"]));
check("a prévia pula para o primeiro quadro recém-adicionado", run("spriteMotionPreviewFrame") === 2);

// ---------- editor sem imagem: usa a imagem reserva ----------
run("openModal(null); document.getElementById('char-name').value = 'SO RESERVA'; builderLastAppearance = null; tempAnimations.idle = []");
run("saveCharacterFromModal()");
const k = run("Object.keys(characterDB).find(key => characterDB[key].name === 'SO RESERVA')");
check("personagem sem imagem é salvo com a imagem reserva", !!k && run(`characterDB['${k}'].defaultUrl`) === run("getFallbackSpriteSvg()"));

run("setGameState('menu')");
process.exit(summary());
