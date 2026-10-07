// tests/conjuntos-sprites.test.js — CONJUNTOS DE SPRITES (versão 0.76): botão dourado ORIGINAL, formas (base e
// transformações em ordem), AGRUPAR (base + transformação 1), conjunto ativo na luta (passando do fim fica na
// última), o Vegeta com os sprites recortados como conjunto azul e as peças novas do construtor.
//
// Uso: node tests/conjuntos-sprites.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary, context } = h;
const html = fs.readFileSync(__dirname + "/../index.html", "utf8");

// ---------- pacote do Vegeta ----------
const pacote = JSON.parse(fs.readFileSync(__dirname + "/../conjuntos/vegeta.json", "utf8"));
const estados = run("CONJ_ESTADOS");
check("pacote do Vegeta tem os 14 movimentos, normal e Super Saiyajin (6 quadros; o especial Galick Ho, 5)",
    ["normal", "ssj"].every(v => estados.every(st => Array.isArray(pacote[v][st]) && pacote[v][st].length === (st === "special" ? 5 : 6))));
check("Vegeta já vem com o conjunto azul (base + Super Saiyajin), disponível e não ativo",
    run("characterDB.vegeta.spriteGroups.some(g => g.id === 'g_vegeta' && g.transfs.length === 1)") && run("characterDB.vegeta.spriteActive") === "original");
check("o conjunto do Vegeta entra uma vez só (apagado, não volta)", run("readStorage('saiyan_conjunto_vegeta')") === "1");
context.__pacote = pacote;
run("conjRegistrarPacote('vegeta', __pacote)");
const q = run("conjQuadrosDaForma(conjFormaPorId(characterDB.vegeta.spriteForms, 'pk_vegeta_base'), 'idle')");
check("cada quadro vira desenho em pixel art do tamanho dos lutadores (pés na linha 103)", q.length === 6 && decodeURIComponent(q[0]).includes("crispEdges") && decodeURIComponent(q[0]).includes('viewBox="0 0 96 112"'));
check("ORIGINAL em uso: a luta usa as animações de sempre", run("getCharacterAnimationFrames('vegeta', 'idle', 0)[0]") === run("characterDB.vegeta.animations.idle[0]"));
run("characterDB.vegeta.spriteActive = 'g_vegeta'");
check("conjunto do Vegeta em uso: parado com os sprites", run("getCharacterAnimationFrames('vegeta', 'idle', 0)[0]") === q[0]);
const ssj = run("getCharacterAnimationFrames('vegeta', 'flyRight', 1)");
check("transformado: quadros do Super Saiyajin", ssj.length === 6 && ssj[0] !== run("getCharacterAnimationFrames('vegeta', 'flyRight', 0)[0]"));
check("transformando mais vezes do que o conjunto tem, fica na última", run("getCharacterAnimationFrames('vegeta', 'flyRight', 3)[0]") === ssj[0]);
check("golpe do vilão (sem quadro próprio) usa o parado do conjunto", run("getCharacterAnimationFrames('vegeta', 'hit', 0)[0]") === q[0]);
run("characterDB.vegeta.spriteActive = 'original'");

// ---------- editor: área, formas, agrupar, escolher ----------
check("área CONJUNTOS DE SPRITES no rodapé do editor", html.includes('id="conj-area"') && html.includes('id="conj-linha-conjuntos"') && html.includes('id="conj-linha-formas"'));
const confirmacoes = [], alertas = [];
context.__conf = confirmacoes; context.__alertas = alertas;
run("var __c0 = showSystemConfirm, __a0 = showSystemAlert; showSystemConfirm = (t, m, ok) => __conf.push({ t, m, ok }); showSystemAlert = (t, m) => __alertas.push(m)");
run("openModal('goku_adult'); switchEditorTab('animacoes')");
const linhaC = () => run("document.getElementById('conj-linha-conjuntos').innerHTML");
check("botão dourado ORIGINAL em uso, com o desenho do lutador", /conj-dourado em-uso/.test(linhaC()) && linhaC().includes("<svg") && linhaC().includes("EM USO"));
check("fora da montagem de uma forma, a fileira de quadros fica vazia", run("(() => { renderSpriteAssignedFrames(); const c = document.getElementById('sprite-assigned-frames').children; return c[c.length - 1].innerText; })()").includes("NOVA FORMA"));
run("tempAnimations.idle.length; LIMPAR = clearActiveSpriteFrames()");
check("sem forma em montagem, os botões de quadros não mexem no ORIGINAL", alertas.some(a => a.includes("NOVA FORMA")) && run("tempAnimations.idle.length") > 0);

// monta a forma base: adicionar quadro já começa uma forma nova
run(`selectedSpriteSheetFrames = new Set([0]); extractSpriteSheetFrame = (i) => 'data:image/png;base64,BASE' + i; setActiveSpriteMovement('idle'); assignSelectedSpriteFrame()`);
check("adicionar quadro começa uma forma nova", run("conjEstaEditando()") && run("tempAnimations.idle[0]") === "data:image/png;base64,BASE0");
const opcoes = () => [...run("document.getElementById('conj-linha-formas').innerHTML").matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);
check("ao salvar: forma base ou só a transformação 1 (nenhuma criada ainda)", JSON.stringify(opcoes()) === JSON.stringify(["base", "1"]));
run("document.getElementById('conj-salvar-como').value = 'base'; conjSalvarForma()");
check("forma base salva e o ORIGINAL volta para a fileira", !run("conjEstaEditando()") && run("conjTemp.formas.length") === 1 && run("tempAnimations.idle[0]") !== "data:image/png;base64,BASE0");
run(`conjNovaForma(); extractSpriteSheetFrame = (i) => 'data:image/png;base64,SSJ' + i; assignSelectedSpriteFrame(); document.getElementById('conj-salvar-como').value = '2'; conjSalvarForma()`);
check("transformação 2 antes da 1 não pode", alertas.some(a => a.includes("EM ORDEM")) && run("conjEstaEditando()"));
run("document.getElementById('conj-salvar-como').value = '1'; conjSalvarForma()");
check("transformação 1 salva", run("conjTemp.formas.map(f => f.tipo + f.nivel).join(',')") === "base0,transf1");
run("conjNovaForma()");
check("depois da 1, já libera a 2", JSON.stringify(opcoes()) === JSON.stringify(["base", "1", "2"]));
run("conjCancelarForma()");
check("salvar o personagem com uma forma em montagem pede para terminar antes", (() => { run("conjNovaForma(); saveCharacterFromModal()"); const ok = alertas.some(a => a.includes("SALVAR FORMA")); run("conjCancelarForma()"); return ok; })());
check("com 2 formas aparece o AGRUPAR", run("document.getElementById('conj-linha-formas').innerHTML").includes("AGRUPAR"));
const [fBase, fT1] = run("conjTemp.formas.map(f => f.id)");
run(`conjMarcar('${fT1}', true); conjAgrupar()`);
check("agrupar sem a base não pode", alertas.some(a => a.includes("FORMA BASE")) && run("conjTemp.grupos.length") === 0);
run(`conjMarcar('${fBase}', true); document.getElementById('conj-nome-grupo').value = 'meu goku'; conjAgrupar()`);
const linhaF = () => run("document.getElementById('conj-linha-formas').innerHTML");
check("formas já agrupadas somem da linha de baixo", !linhaF().includes("FORMA BASE") && !linhaF().includes("TRANSFORMAÇÃO 1") && !linhaF().includes("AGRUPAR"));
run("conjAbrirGrupo(conjTemp.grupos[0].id)");
check("o ✎ do conjunto mostra as formas dele para editar", linhaF().includes("FORMA BASE") && linhaF().includes("EDITAR"));
run("conjAbrirGrupo(conjTemp.grupos[0].id)");
check("base + transformação 1 viram um botão azul", run("conjTemp.grupos.length") === 1 && /conj-azul/.test(linhaC()) && linhaC().includes("MEU GOKU"));
const gid = run("conjTemp.grupos.find(g => g.nome === 'MEU GOKU').id");
run(`conjEscolher('${gid}')`);
check("tocar no conjunto pergunta SIM/NÃO", confirmacoes.length && confirmacoes[confirmacoes.length - 1].m.includes("MEU GOKU"));
confirmacoes[confirmacoes.length - 1].ok();
check("escolher o conjunto vale na hora, sem precisar salvar", run("characterDB.goku_adult.spriteActive") === gid && run("getCharacterAnimationFrames('goku_adult', 'idle', 0)[0]") === "data:image/png;base64,BASE0");
check("o retrato do personagem (DATABASE/seleção) passa a ser o do conjunto", run("conjRetratoUrl(characterDB.goku_adult)") === "data:image/png;base64,BASE0");
check("a prévia do editor mostra o conjunto em uso", run("getSpriteMotionPreviewFrames()[0]") === "data:image/png;base64,BASE0");
check("o conjunto escolhido fica destacado (EM USO)", new RegExp(`conj-azul em-uso[^]*MEU GOKU`).test(linhaC()) && !/conj-dourado em-uso/.test(linhaC()));
run("saveCharacterFromModal()");
check("ao salvar o personagem, a luta usa o conjunto", run("characterDB.goku_adult.spriteActive") === gid &&
    run("getCharacterAnimationFrames('goku_adult', 'idle', 0)[0]") === "data:image/png;base64,BASE0" &&
    run("getCharacterAnimationFrames('goku_adult', 'idle', 2)[0]") === "data:image/png;base64,SSJ0");
check("o conjunto fica salvo no perfil", (() => { const salvo = JSON.parse(run("readStorage('saiyan_db_v8_8bit')")); return salvo.goku_adult.spriteActive === gid && salvo.goku_adult.spriteForms.length === 2; })());
run("openModal('goku_adult'); conjEscolher('original')");
confirmacoes[confirmacoes.length - 1].ok();
run("saveCharacterFromModal()");
check("o botão dourado volta às animações padrão", run("characterDB.goku_adult.spriteActive") === "original" && run("getCharacterAnimationFrames('goku_adult', 'idle', 0)[0]") !== "data:image/png;base64,BASE0");
run(`openModal('goku_adult'); conjApagarForma('${fBase}')`);
confirmacoes[confirmacoes.length - 1].ok();
check("apagar uma forma do conjunto apaga o conjunto também", run("conjTemp.grupos.length") === 0 && run("conjTemp.formas.length") === 1);
run("closeModal(); showSystemConfirm = __c0; showSystemAlert = __a0");

// ---------- peças novas do construtor ----------
["vegeta_sprite", "armadura_curta", "macacao", "luvas_punho_largo", "botas_ponta_dourada", 'id="build-arm-pose"', 'value="cruzados"'].forEach(v =>
    check(`construtor tem ${v}`, html.includes(v)));
const cruz = (st) => run(`generateSpriteFrameSvg(Object.assign({}, SPRITE_PRESETS.vegeta.appearance, { armPose: 'cruzados' }), '${st}', 0)`) !==
    run(`generateSpriteFrameSvg(SPRITE_PRESETS.vegeta.appearance, '${st}', 0)`);
check("braços cruzados mudam o parado e o voo para frente e para cima", cruz("idle") && cruz("flyRight") && cruz("flyUp"));
check("e não mudam ataque, parry, carregar nem voo para baixo", !cruz("attackKi") && !cruz("parry") && !cruz("chargeKi") && !cruz("flyDown"));
check("cabelo do Vegeta dos sprites é de Saiyajin (fica amarelo transformado)", run("SPRITE_SAIYAN_HAIR.includes('vegeta_sprite')"));

process.exit(summary());
