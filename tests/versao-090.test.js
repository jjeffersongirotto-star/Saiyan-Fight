// tests/versao-090.test.js — Minions (v0.90 clássicos; v0.113 só sprites): o Saibaman e o Cell Jr. são desenhados
// pelas imagens de minions.js (todas as poses), em todo lugar (luta, cards, editor). O editor de cores e os desenhos
// antigos em canvas saíram; cores editadas de saves antigos são ignoradas.
//
// Uso: node tests/versao-090.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const dir = __dirname + "/..";
const h = createHarness(dir, 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- modelos ----------
check("modelos Saibaman e Cell Jr., cada um com a sua tira de imagens", run("Object.keys(MINION_MODELOS).join()") === "saibaman,celljr" && run("Object.keys(MINION_IMAGENS).every(m => !!MINION_MODELOS[m])"));
check("cada modelo desenha todas as poses sem erro", run(`(() => { for (const m in MINION_MODELOS) for (const pose of ['brotar', 'saltar', 'voar', 'investir', 'agarrar', 'arremessado']) desenharMinionClassico({ modelo: m }, pose, 1); return true; })()`));
const mj = fs.readFileSync(dir + "/minions.js", "utf8");
check("v0.113: sem os desenhos antigos em canvas nem as paletas de cores", !/traceSaibamanFigure|traceCellJrFigure|getMinionPaleta|editaveis/.test(mj));

// ---------- personagens iniciais ----------
check("Saibaman e Cell Jr. iniciais usam as imagens do modelo", run("characterDB.saibaman.minionClassico.modelo === 'saibaman' && !characterDB.saibaman.builderAppearance && characterDB.celljr.minionClassico.modelo === 'celljr'"));
check("os movimentos do editor vêm das imagens (voo com 4 quadros)", run("characterDB.saibaman.animations.idle.length") === 4 && run("characterDB.celljr.animations.flyRight.length") === 4);
check("na luta o minion usa a imagem do modelo", !!run("getMinionClassico('saibaman')") && !!run("getSaibamanSprite('voar', 0, 'celljr')"));

// ---------- editor: sem cores ----------
const html = fs.readFileSync(dir + "/index.html", "utf8");
check("v0.113: o editor não tem mais o painel de cores do minion", !html.includes("minion-classico-area"));
run("openModal('saibaman'); saveCharacterFromModal(); document.getElementById('modal-alert').style.display = 'none'");
check("salvar o minion continua com o modelo", run("characterDB.saibaman.minionClassico.modelo") === "saibaman");
const salvo = JSON.parse(h.store["saiyan_db_v8_8bit"]).saibaman;
check("no armazenamento fica só o modelo (as imagens são refeitas ao carregar)", !salvo.animations && salvo.minionClassico.modelo === "saibaman");

// ---------- save antigo com cores editadas ----------
const h2 = createHarness(dir, 800);
h2.run(`characterDB.saibaman.minionClassico = { modelo: 'saibaman', cores: { pele: '#c07ad8' } }; saveCharacterData(); characterDB = {}; loadCharacterData();`);
h2.check("cores antigas editadas são ignoradas: sempre a imagem", JSON.stringify(h2.run("characterDB.saibaman.minionClassico.cores")) === "{}");

process.exit(summary() + h2.summary());
