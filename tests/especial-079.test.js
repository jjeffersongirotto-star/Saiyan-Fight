// tests/especial-079.test.js — versão 0.79: movimento ESPECIAL (editor, construtor, conjuntos e luta) e o Galick Ho
// do Vegeta dos sprites.
//
// Uso: node tests/especial-079.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary, context } = h;
const html = fs.readFileSync(__dirname + "/../index.html", "utf8");

check("ESPECIAL é um movimento do editor (botão e destino do DUPLICAR)", html.includes(`data-sprite-action="special"`) && html.includes('<option value="special">ESPECIAL</option>'));
check("ESPECIAL entra em todas as listas de movimentos", run("SUB_ANIM_KEYS.includes('special') && SPRITE_STATES.includes('special') && CONJ_ESTADOS.includes('special')"));
check("nome na prévia: ESPECIAL", run("getSpriteMovementDisplayName('special')") === "ESPECIAL");

// construtor: pose própria, diferente do ataque
const esp = run("[0,1,2,3,4].map(i => generateSpriteFrameSvg(SPRITE_PRESETS.goku.appearance, 'special', i))");
check("personagens do construtor ganham 5 quadros de especial", esp.length === 5 && esp.every(s => s.startsWith("<svg") && !s.includes("NaN")) && new Set(esp).size === 5);
check("o especial não é igual ao ataque", esp[0] !== run("generateSpriteFrameSvg(SPRITE_PRESETS.goku.appearance, 'attackKi', 0)"));
check("o Goku do jogo tem animação de especial", run("getCharacterAnimationFrames('goku_adult', 'special', 0).length") === 5);
check("transformado também (cabelo amarelo)", run("getCharacterAnimationFrames('goku_adult', 'special', 1)[0]") !== run("getCharacterAnimationFrames('goku_adult', 'special', 0)[0]"));

// sem quadros de especial: usa o ataque
run("characterDB.__teste = { name: 'T', defaultUrl: 'x', animations: { idle: ['I'], attackKi: ['A1', 'A2'] }, fpsSettings: {} }");
check("personagem sem especial próprio usa os quadros do ATAQUE", run("getCharacterAnimationFrames('__teste', 'special', 0).join(',')") === "A1,A2");
const quadro = (t) => run(`(() => { let s = null; const g = getOrCacheGameplayImage; getOrCacheGameplayImage = (src) => (s = src); getCharacterAnimationFrame('__teste', 'special', 99, 0, ${t}); getOrCacheGameplayImage = g; return s; })()`);
check("o especial toca uma vez e fica no último quadro (o disparo)", quadro(0) === "A1" && quadro(5) === "A2" && quadro(0.5) === "A2");
run("delete characterDB.__teste");

// luta: a pose do especial
check("soltar o especial usa a animação ESPECIAL", fs.readFileSync(__dirname + "/../gameplay.js", "utf8").includes('setActionState(caster, "special", 40)'));
run("player.ki = player.maxKi; world.beamActive = 0; gameState = 'playing'; triggerSpecialAttack(false)");
check("jogador fica no ESPECIAL enquanto o raio sai", run("player.actionState") === "special");

// Vegeta dos sprites: Galick Ho normal e Super Saiyajin
const pacote = JSON.parse(fs.readFileSync(__dirname + "/../conjuntos/vegeta.json", "utf8"));
context.__pacote = pacote;
run("conjRegistrarPacote('vegeta', __pacote); characterDB.vegeta.spriteActive = 'g_vegeta'");
const base = run("getCharacterAnimationFrames('vegeta', 'special', 0)"), ssj = run("getCharacterAnimationFrames('vegeta', 'special', 1)");
check("VEGETA SPRITES: Galick Ho com 5 quadros, normal e Super Saiyajin", base.length === 5 && ssj.length === 5 && base[0] !== ssj[0] &&
    base[0] !== run("getCharacterAnimationFrames('vegeta', 'attackKi', 0)[0]"));
check("Galick Ho com os pés no chão, como os outros movimentos", pacote.normal.special.every(q => q[1] + q[3] === pacote.pesY));
run("characterDB.vegeta.spriteActive = 'original'");

process.exit(summary());
