// tests/versao-113.test.js — versão 0.113: o jogo é só sprites. Sem o motor de bonecos desenhados (sprites.js) e sem
// o CONSTRUTOR; saves antigos: personagem inicial com aparência do construtor passa a usar o pacote dele, personagem
// feito no construtor sai; a abertura não prepara lutadores nem baixa pacotes logo de cara.
//
// Uso: node tests/versao-113.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const dir = __dirname + "/..";
const html = fs.readFileSync(dir + "/index.html", "utf8");

const h = createHarness(dir, 800);
h.check("sprites.js saiu do jogo (arquivo e script)", !fs.existsSync(dir + "/sprites.js") && !html.includes("sprites.js"));
h.check("sem aba CONSTRUTOR no editor", !html.includes("tab-btn-construtor") && !html.includes("tab-content-construtor"));
h.check("sem campos do construtor nem do minion clássico", !html.includes('id="build-') && !html.includes("minion-classico"));

// save antigo: Goku com a aparência do construtor e ORIGINAL em uso, e um personagem feito no construtor
h.run(`characterDB.goku_adult.builderAppearance = { hairStyle: "goku" }; characterDB.goku_adult.spriteActive = "original";
    characterDB.goku_adult.animations = {};
    characterDB.meu_boneco = Object.assign({}, characterDB.piccolo, { name: "MEU BONECO", builderAppearance: { hairStyle: "careca" }, spriteForms: [], spriteGroups: [], spriteActive: "original" });
    characterDB.meu_sprite = Object.assign({}, characterDB.piccolo, { name: "MEU SPRITE", animations: { idle: ["data:image/png;base64,AAAA"] }, spriteForms: [], spriteGroups: [], spriteActive: "original" });
    saveCharacterData();`);
const salvo = h.store["saiyan_db_v8_8bit"];
const h2 = createHarness(dir, 800);
h2.run(`localStorage.setItem("saiyan_db_v8_8bit", ${JSON.stringify(salvo)}); characterDB = {}; loadCharacterData();`);
h2.check("o Goku antigo perde a aparência do construtor e usa o pacote dele", h2.run("!characterDB.goku_adult.builderAppearance && characterDB.goku_adult.spriteActive === 'g_goku'"));
h2.check("o personagem feito no construtor sai da lista", h2.run("!characterDB.meu_boneco"));
h2.check("o personagem de sprite sheet continua com as animações dele", h2.run("characterDB.meu_sprite && characterDB.meu_sprite.animations.idle.length === 1"));
h2.check("e o save fica limpo", !JSON.stringify(JSON.parse(h2.store["saiyan_db_v8_8bit"])).includes("builderAppearance"));

// abertura: nada de pacote antes da hora
h2.check("enquanto o pacote não chega, o lutador usa o retrato parado ou o quadro vazio (nunca o boneco antigo)",
    h2.run("getCharacterAnimationFrames('vegeta', 'flyRight', 1)[0] === CONJ_QUADRO_VAZIO"));
h2.check("os menus só preparam os lutadores depois de uns segundos ou do 1º toque", h2.run("(() => { aquecerLiberado = false; backgroundWork.warmedFor = null; const t = performance.now; performance.now = () => 0; warmSelectedFighters(); performance.now = t; return backgroundWork.warmedFor === null; })()"));
const cj = fs.readFileSync(dir + "/conjuntos.js", "utf8");
h2.check("quadros do pacote só viram imagem quando o movimento é usado", cj.includes("get() { const val = (d[v][origem] || []).map(q => conjEmbrulharQuadro(d, q, origem))"));

process.exit(h.summary() + h2.summary());
