// tests/versao-090.test.js — versão 0.90: Minions clássicos. O Saibaman e o Cell Jr. voltam a ser os desenhos
// originais (minions.js, com as poses próprias), sem nenhuma adaptação do construtor; no editor dá para trocar as
// cores (sem trocar nada fica exatamente o original) e criar minions novos a partir deles. Saves que tinham os
// minions do construtor voltam uma vez para os clássicos.
//
// Uso: node tests/versao-090.test.js

const { createHarness } = require("./harness.js");
const dir = __dirname + "/..";
const h = createHarness(dir, 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- modelos e cores ----------
check("sem cor editada a paleta é exatamente a original", run("getMinionPaleta({ modelo: 'saibaman', cores: {} }) === MINION_MODELOS.saibaman.padrao || JSON.stringify(getMinionPaleta({ modelo: 'saibaman' })) === JSON.stringify(MINION_MODELOS.saibaman.padrao)"));
check("cores originais do Saibaman e do Cell Jr. de antes", run("MINION_MODELOS.saibaman.padrao.pele === '#6fc046' && MINION_MODELOS.saibaman.padrao.olhos === '#e0263a' && MINION_MODELOS.celljr.padrao.azul === '#3f9ae6' && MINION_MODELOS.celljr.padrao.botas === '#f0a624'"));
const p = run("getMinionPaleta({ modelo: 'saibaman', cores: { pele: '#c07ad8' } })");
check("trocar a pele muda a pele e os tons que acompanham (sombra, cabeça), não os olhos", p.pele === "#c07ad8" && p.sombra !== "#3f8a28" && p.cabLuz !== "#d4f59a" && p.olhos === "#e0263a");
check("cor inválida ou igual à original é ignorada", JSON.stringify(run("normalizarMinionClassico({ modelo: 'celljr', cores: { azul: 'xyz', botas: '#F0A624', nada: '#000000' } })")) === JSON.stringify({ modelo: "celljr", cores: {} }));
check("cada modelo desenha todas as poses sem erro", run(`(() => { for (const m in MINION_MODELOS) for (const pose of ['brotar', 'saltar', 'voar', 'investir', 'agarrar', 'arremessado']) desenharMinionClassico({ modelo: m }, pose, 1); return true; })()`));

// ---------- personagens iniciais ----------
check("Saibaman e Cell Jr. iniciais são os clássicos (sem aparência do construtor)", run("characterDB.saibaman.minionClassico.modelo === 'saibaman' && !characterDB.saibaman.builderAppearance && characterDB.celljr.minionClassico.modelo === 'celljr'"));
check("os movimentos do editor vêm do desenho clássico (voo com 4 quadros)", run("characterDB.saibaman.animations.idle.length") === 4 && run("characterDB.celljr.animations.flyRight.length") === 4);
check("os modelos do construtor não têm mais Saibaman/Cell Jr. montados (as peças de minion continuam)", run("!SPRITE_PRESETS.saibaman && !SPRITE_PRESETS.celljr"));
check("na luta o minion usa o desenho clássico", !!run("getMinionClassico('saibaman')") && !!run("getSaibamanSprite('voar', 0, 'celljr')"));

// ---------- editor: trocar as cores ----------
run("openModal('saibaman')");
check("o editor mostra o painel do minion clássico com as cores", run("document.getElementById('minion-classico-area').style.display") === "" && run("document.getElementById('minion-classico-cores').children.length") === 5);
run("mudarCorMinionClassico('pele', '#c07ad8'); aplicarMinionClassicoNoEditor(); saveCharacterFromModal(); document.getElementById('modal-alert').style.display = 'none'");
check("salvar guarda a cor trocada e continua clássico", run("characterDB.saibaman.minionClassico.cores.pele") === "#c07ad8" && run("!characterDB.saibaman.builderAppearance"));
const salvo = JSON.parse(h.store["saiyan_db_v8_8bit"]).saibaman;
check("no armazenamento fica só o modelo e as cores (as imagens são refeitas ao carregar)", !salvo.animations && salvo.minionClassico.modelo === "saibaman");
run("openModal('saibaman'); voltarCoresMinionClassico(); saveCharacterFromModal(); document.getElementById('modal-alert').style.display = 'none'");
check("VOLTAR ÀS CORES ORIGINAIS deixa o original de novo", JSON.stringify(run("characterDB.saibaman.minionClassico.cores")) === "{}");

// ---------- minion novo a partir do clássico ----------
run("openModal(null); populateBuilderPresetOptions()");
check("'COMEÇAR A PARTIR DE...' oferece os minions clássicos", run("document.getElementById('build-preset').children.map(o => o.value).join()").includes("minion:celljr"));
run("document.getElementById('build-preset').value = 'minion:celljr'; applyBuilderPreset(); document.getElementById('char-name').value = 'CELL JR. AZUL'; mudarCorMinionClassico('azul', '#3366ff'); saveCharacterFromModal(); document.getElementById('modal-alert').style.display = 'none'");
const novo = run("Object.keys(characterDB).find(k => characterDB[k].name === 'CELL JR. AZUL')");
check("o minion novo copia o desenho e os movimentos do Cell Jr. (com a cor nova)", !!novo && run(`characterDB['${novo}'].minionClassico.modelo`) === "celljr" && run(`characterDB['${novo}'].minionClassico.cores.azul`) === "#3366ff" && run(`characterDB['${novo}'].alignment`) === "MINION");
check("e aparece no campo MINION das arenas", run("getMinionsDisponiveis().map(m => m.id)").includes(novo));
run("closeModal()");

// ---------- save antigo (Saibaman do construtor) volta para o clássico ----------
const h2 = createHarness(dir, 800);
h2.run(`characterDB.saibaman = Object.assign({}, characterDB.goku_adult, { name: 'MEU SAIBAMAN', alignment: 'MINION', minionClassico: undefined }); delete characterDB.saibaman.minionClassico;
    saveCharacterData(); localStorage.setItem('saiyan_minions_classicos_090', ''); characterDB = {}; loadCharacterData();`);
h2.check("o Saibaman do construtor volta a ser o clássico, com o nome que o jogador tinha", h2.run("characterDB.saibaman.minionClassico.modelo") === "saibaman" && h2.run("!characterDB.saibaman.builderAppearance") && h2.run("characterDB.saibaman.name") === "MEU SAIBAMAN");

process.exit(summary() + h2.summary());
