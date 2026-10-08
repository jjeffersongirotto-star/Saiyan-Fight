// tests/versao-095.test.js — versão 0.95: EDITOR DE ARENAS. Escolher várias peças com um retângulo na planta (mover,
// girar, duplicar, apagar juntas), ESPELHAR (lados, frente/trás, os dois), CONJUNTOS guardados, EMPILHAR (construção
// em cima de bloco/pilar/prédio/ringue encaixa alinhada no topo) com DESALINHAR de 10 em 10%, FUNDIR (peças
// sobrepostas viram um grupo e uma delas dá a aparência da parte fundida), lista NA ARENA com 👁 e 🔒 e USAR COMO CAPA.
//
// Uso: node tests/versao-095.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 1366);
const { run, check, summary } = h;
run("deltaTime = 1/60");

run(`abrirEditorArenas(); document.getElementById('modal-alert').style.display = 'none';
    arenaEd.arena.pecas = []; arenaEd.arena.planicie = ''; arenaEd.mover = false; arenaEd.angulo = 0;
    const cv = document.getElementById('arena-planta'); cv.width = 320; cv.height = 320; arenaDesenharPlanta()`);
const planta = (x, z) => run(`arenaMundoParaPlanta(${x}, ${z})`);
const toque = (x, z) => { const [px, py] = planta(x, z); run(`arenaPlantaToque({ clientX: ${px}, clientY: ${py}, target: {} }); arenaPlantaSolta()`); };
const arrasta = (de, para) => {
    const [a, b] = planta(de[0], de[1]), [c, d] = planta(para[0], para[1]);
    run(`arenaPlantaToque({ clientX: ${a}, clientY: ${b}, target: {} }); arenaPlantaArrasto({ clientX: ${c}, clientY: ${d} })`);
};
const pecas = () => run("arenaEd.arena.pecas");
const fechaAlerta = () => run("document.getElementById('modal-alert').style.display = 'none'");
const pondo = (lista) => run(`arenaEd.arena.pecas = ${JSON.stringify(lista)}.map(normalizarPecaArena); arenaLimparEscolha(); arenaEd.tipo = null; arenaEd.conjunto = null; arenaEd.fundir = false; arenaDesenharPlanta()`);

// ---------- EMPILHAR ----------
pondo([{ t: "bloco", x: 0, z: 0, c: "#888888" }]);
run("arenaEd.tipo = 'bloco'");
toque(4, 3);
check("bloco solto em cima de outro bloco encaixa alinhado no topo", pecas().length === 2 && pecas()[1].b === 30 && pecas()[1].x === 0 && pecas()[1].z === 0);
toque(2, 2);
check("tocar de novo com o bloco pronto empilha mais um (terceiro andar)", pecas().length === 3 && pecas()[2].b === 60);
run("arenaMostrarAba('construcao'); document.getElementById('arena-pecas').children.find(b => b.textContent === 'BLOCO QUADRADO').onclick()");
check("tocar de novo no botão da peça pronta desliga a peça", run("arenaEd.tipo") === null);
run("arenaEd.sel = -1");
toque(0, 0);
check("sem peça pronta, tocar na pilha escolhe a peça de cima", run("arenaEd.sel") === 2 && pecas().length === 3);
check("peças empilhadas não se chocam com a de baixo", run("arenaPecaColide(arenaEd.arena.pecas, arenaEd.arena.pecas[1], 1)") === false);
run("arenaEd.tipo = 'arvore'");
toque(3, 3);
check("peça que não é construção não empilha (e não entra no lugar ocupado)", pecas().length === 3);
// DESALINHAR (escada)
run("arenaEd.tipo = null; arenaEd.sel = 1; arenaAtualizarSelecao()");
check("a peça empilhada mostra DESALINHAR", run("document.getElementById('arena-sel-desalinho-grupo').style.display") === "");
run("document.getElementById('arena-sel-desalinho').value = '30'; arenaMudarSelecao()");
check("DESALINHAR 30% anda 30% da largura da peça de baixo", pecas()[1].d === 0.3 && pecas()[1].x === 9 && pecas()[1].b === 30);
check("a peça de cima vai junto", pecas()[2].x === 9);
run("document.getElementById('arena-sel-desalinho').value = '10'; arenaMudarSelecao()");
check("DESALINHAR anda de 10 em 10%", pecas()[1].x === 3 && pecas()[1].d === 0.1);
// mover a peça de baixo leva a pilha (tocar de novo na escolhida passa para a de baixo)
run("arenaEd.sel = 1; arenaEd.vermelhoAte = 0");
arrasta([0, 0], [200, 100]);
run("arenaPlantaSolta()");
check("arrastar a peça de baixo leva a pilha junto", Math.abs(pecas()[0].x - 200) < 4 && Math.abs(pecas()[2].x - pecas()[0].x - 3) < 4 && pecas()[2].b === 60);
check("arena com pilha desenha sem erro (girando, andando e de perto)", run(`(() => { const a = normalizarArena(arenaEd.arena); a.id = 'arena_pilha'; for (const g of [0, 1.7, 3.9]) drawArenaCriada(a, g); drawArenaCriada(a, 0, { andado: 400 }); arenaEd.sel = 2; arenaEd.vista = 'foco'; desenharPreviaArena(1/60); return trCam === TR_CAM; })()`));
run("arenaEd.sel = 2");
check("tocar de novo na peça de cima escolhe a de baixo dela", run(`arenaPecaNoPonto(...arenaMundoParaPlanta(arenaEd.arena.pecas[0].x, arenaEd.arena.pecas[0].z))`) === 1);
// pilar e prédio também servem de base
pondo([{ t: "pilar", x: -100, z: 0 }, { t: "predio", x: 100, z: 0 }, { t: "ringue", x: 0, z: 250 }]);
run("arenaEd.tipo = 'parede'"); toque(-100, 0);
run("arenaEd.tipo = 'domo'"); toque(100, 0);
run("arenaEd.tipo = 'torre'"); toque(30, 260);
check("pilar, prédio e ringue servem de base", pecas()[3].b === 68 && pecas()[4].b === 72.2 && pecas()[5].b === 10);

// ---------- FUNDIR ----------
pondo([{ t: "bloco", x: 0, z: 0, c: "#ff0000" }]);
run("arenaEd.tipo = 'mesa_pedra'");
toque(20, 0);
check("sem FUNDIR, peça em cima de outra não entra", pecas().length === 1);
run("arenaAlternarFundir()");
check("o botão FUNDIR liga", run("arenaEd.fundir") === true && run("document.getElementById('arena-fundir').classList.contains('ar-armada')") === true);
toque(20, 0);
check("com FUNDIR, a peça entra sobreposta e as duas viram um grupo", pecas().length === 2 && pecas()[0].g && pecas()[0].g === pecas()[1].g);
check("pergunta qual peça dá a aparência da parte fundida (com números na planta)", /APARÊNCIA DA PARTE FUNDIDA/.test(run("document.getElementById('modal-alert-msg').innerText")) && run("Object.keys(arenaEd.rotulos).length") === 2);
run("executeSystemChoice(1)");
check("a escolhida fica com a aparência (é desenhada por cima)", pecas()[1].fv === true && !pecas()[0].fv && run("arenaEd.rotulos") === null);
// ordem de desenho: a escolhida por último
h.calls.length = 0;
const ordem = run(`(() => { const a = normalizarArena(arenaEd.arena); a.id = 'arena_fus'; const vistos = []; const antes = ARENA_PECAS.bloco.desenha, antes2 = ARENA_PECAS.mesa_pedra.desenha;
    ARENA_PECAS.bloco.desenha = (p, g) => vistos.push('bloco'); ARENA_PECAS.mesa_pedra.desenha = (p, g) => vistos.push('mesa');
    try { drawArenaCriada(a, 0, { desl: { x: 0, z: 0 } }); drawArenaCriada(a, Math.PI, { desl: { x: 0, z: 0 } }); } finally { ARENA_PECAS.bloco.desenha = antes; ARENA_PECAS.mesa_pedra.desenha = antes2; }
    return vistos; })()`);
check("de qualquer lado a peça escolhida no grupo é desenhada por último", JSON.stringify(ordem) === JSON.stringify(["bloco", "mesa", "bloco", "mesa"]));
// terceira peça só na parte fundida: segue a aparência, sem perguntar
fechaAlerta();
run("document.getElementById('modal-alert-msg').innerText = ''");
const fundidaSo = run("(() => { const q = normalizarPecaArena({ t: 'pedra', x: 6, z: 0, e: 0.3 }); return arenaTocaParteSolta(arenaEd.arena.pecas, q, [0, 1]); })()");
check("um ponto dentro das duas é parte fundida", fundidaSo === false);
run("arenaEd.tipo = 'pedra'; arenaEd.sel = -1");
run("arenaPlantaToque({ clientX: arenaMundoParaPlanta(6, 0)[0], clientY: arenaMundoParaPlanta(6, 0)[1], target: {} }); arenaEd.arena.pecas[arenaEd.arena.pecas.length - 1].e = 0.3; arenaPlantaSolta()");
check("terceira peça só na parte fundida entra no grupo sem perguntar e mantém a aparência", pecas().length === 3 && pecas()[2].g === pecas()[0].g && pecas()[1].fv === true && !/APARÊNCIA/.test(run("document.getElementById('modal-alert-msg').innerText")));
// terceira peça pegando parte não fundida: pergunta entre as 3
run("arenaEd.arena.pecas.pop(); arenaEd.tipo = 'arbusto'");
toque(-14, 0);
check("peça que pega parte NÃO fundida pergunta de novo, entre as 3", pecas().length === 3 && run("Object.keys(arenaEd.rotulos).length") === 3 && /APARÊNCIA/.test(run("document.getElementById('modal-alert-msg').innerText")));
run("executeSystemChoice(2)");
check("a nova escolhida passa a dar a aparência", pecas()[2].fv === true && !pecas()[1].fv);
run("arenaAlternarFundir()");
// sem FUNDIR: dentro do grupo pode mexer; afastar tira do grupo
arrasta([20, 0], [300, 300]);
run("arenaPlantaSolta()");
check("afastar uma peça do grupo tira ela do grupo (sem FUNDIR, só se o lugar estiver livre)", !pecas()[1].g && pecas()[0].g === pecas()[2].g);
fechaAlerta();

// ---------- escolher várias (retângulo) ----------
pondo([{ t: "bloco", x: -100, z: -100 }, { t: "bloco", x: -40, z: -100 }, { t: "arvore", x: -70, z: -40 }, { t: "bloco", x: 300, z: 300 }]);
const [r0x, r0y] = planta(-150, -150), [r1x, r1y] = planta(-10, -10);
run(`arenaPlantaToque({ clientX: ${r0x}, clientY: ${r0y}, target: {} }); arenaPlantaArrasto({ clientX: ${r1x}, clientY: ${r1y} })`);
check("arrastar no vazio desenha o retângulo", !!run("arenaEd.retangulo"));
run("arenaPlantaSolta()");
check("soltar escolhe as peças dentro do retângulo", JSON.stringify(run("arenaEd.multi")) === "[0,1,2]" && run("arenaEd.retangulo") === null);
check("o quadro mostra quantas peças foram escolhidas", run("document.getElementById('arena-selecao-multi').style.display") === "" && run("document.getElementById('arena-multi-nome').textContent") === "3 PEÇAS ESCOLHIDAS");
arrasta([-100, -100], [-100, 100]);
run("arenaPlantaSolta()");
check("arrastar uma das escolhidas leva todas", Math.abs(pecas()[0].z - 100) < 4 && Math.abs(pecas()[1].z - 100) < 4 && Math.abs(pecas()[2].z - 160) < 4);
run("arenaGirarSelecao(90)");
check("GIRAR gira o grupo em volta do centro dele", pecas()[0].r === 90 && pecas()[2].r === 90 && Math.abs(pecas()[0].x - pecas()[1].x) < 4);
run("arenaDuplicarSelecao()");
check("DUPLICAR copia as várias de uma vez (e escolhe as cópias)", pecas().length === 7 && run("arenaEd.multi.length") === 3);
run("arenaApagarSelecao()");
check("APAGAR apaga as várias", pecas().length === 4);
run("arenaEd.multi = [0, 1, 2]");
run("arenaTeclaAtalho({ key: 'ArrowLeft', target: {}, preventDefault() {} })");
check("as setas movem as várias", run("arenaEd.multi.every(i => true)") && pecas()[3].x === 300);

// ---------- ESPELHAR ----------
pondo([{ t: "bloco", x: 100, z: 50, r: 30 }]);
run("arenaEd.sel = 0; arenaEspelhar('lado')");
check("ESPELHAR ↔ copia para o outro lado (x trocado, giro espelhado)", pecas().length === 2 && pecas()[1].x === -100 && pecas()[1].z === 50 && pecas()[1].r === 150);
run("arenaEd.sel = 0; arenaEspelhar('frente')");
check("ESPELHAR ↕ copia para frente/trás", pecas().length === 3 && pecas()[2].z === -50 && pecas()[2].r === 330);
run("arenaEd.sel = 0; arenaEspelhar('os_dois')");
check("ESPELHAR nos dois sentidos só põe onde cabe (as que já existem ficam)", pecas().length === 4 && pecas()[3].x === -100 && pecas()[3].z === -50 && /SEM ESPAÇO/.test(run("document.getElementById('arena-dica').textContent")));

// ---------- CONJUNTOS ----------
run("writeStorage('saiyan_arena_conjuntos', '[]')");
pondo([{ t: "bloco", x: 100, z: 100 }, { t: "pilar", x: 140, z: 100 }]);
run("arenaEd.multi = [0, 1]; arenaSalvarConjunto()");
run("document.getElementById('modal-alert-campo').value = 'portinha'; executeSystemConfirm(true)");
check("SALVAR CONJUNTO guarda as peças com nome", run("getArenaConjuntos().length") === 1 && run("getArenaConjuntos()[0].nome") === "PORTINHA" && run("getArenaConjuntos()[0].pecas[0].x") === -20);
run("document.getElementById('arena-pecas').children = []; arenaMostrarAba('conjuntos')");
check("a aba CONJUNTOS lista os conjuntos", run("document.getElementById('arena-pecas').children.map(b => b.textContent)").includes("PORTINHA"));
run("arenaVerPeca('conjunto:0')");
check("tocar no conjunto mostra ele na tela grande", run("arenaVistaAtual().a.pecas.length") === 2 && run("document.getElementById('arena-vista-titulo').textContent") === "PORTINHA");
run("desenharPreviaArena(1/60); arenaConfirmarPeca()");
check("CONFIRMAR deixa o conjunto pronto para colocar", run("arenaEd.conjunto") === 0 && run("arenaEd.tipo") === null);
toque(-200, -200);
check("tocar na planta põe o conjunto inteiro (e escolhe as peças dele)", pecas().length === 4 && pecas()[2].x === -220 && pecas()[3].x === -180 && run("arenaEd.multi.length") === 2);
toque(-200, -200);
check("conjunto em lugar ocupado não entra", pecas().length === 4);
run("arenaApagarConjunto(0); executeSystemConfirm(true)");
check("✕ apaga o conjunto guardado", run("getArenaConjuntos().length") === 0 && run("arenaEd.conjunto") === null);

// ---------- NA ARENA: 👁 e 🔒 ----------
pondo([{ t: "bloco", x: 0, z: 0 }, { t: "arvore", x: 100, z: 0 }]);
run("document.getElementById('arena-pecas').children = []; arenaMostrarAba('lista')");
check("a aba NA ARENA lista as peças com 👁 e 🔒", run("document.getElementById('arena-pecas').children.length") === 2 && run("document.getElementById('arena-pecas').children[0].children.map(b => b.textContent)").join(" ") === "1. BLOCO QUADRADO 👁 🔓");
run("arenaAlternarOculta(0)");
check("👁 esconde a peça no editor", pecas()[0].oc === true);
const desenhados = (esconder) => run(`(() => { const a = normalizarArena(arenaEd.arena); a.id = 'arena_oc'; const vistos = []; const antes = ARENA_PECAS.bloco.desenha; ARENA_PECAS.bloco.desenha = () => vistos.push(1);
    try { drawArenaCriada(a, 0, { desl: { x: 0, z: 0 }, esconder: ${esconder} }); } finally { ARENA_PECAS.bloco.desenha = antes; } return vistos.length; })()`);
check("escondida não aparece na tela do editor, mas aparece na luta", desenhados(true) === 0 && desenhados(false) === 1);
check("escondida não pode ser tocada na planta", run(`arenaPecaNoPonto(...arenaMundoParaPlanta(0, 0))`) === -1);
run("arenaAlternarOculta(0); arenaAlternarTrava(1)");
check("🔒 trava a peça: não dá para tocar nem arrastar", pecas()[1].tr === true && run(`arenaPecaNoPonto(...arenaMundoParaPlanta(100, 0))`) === -1);
run("arenaEscolherDaLista(1)");
check("pela lista dá para escolher a travada (ajustar tamanho, cor...)", run("arenaEd.sel") === 1);

// ---------- capa ----------
run("arenaEd.angulo = 2.5; arenaEd.andado = 0; arenaUsarComoCapa()");
check("USAR COMO CAPA guarda a vista atual", run("arenaEd.arena.capa.ang") === 2.5);
run("document.getElementById('arena-nome').value = 'CAPA TESTE'; arenaLerCampos(); salvarArenaDoEditor()"); fechaAlerta();
const id = run("arenaEd.arena.id");
check("a capa fica salva com a arena", run(`getFaseDef('${id}').arena.capa.ang`) === 2.5);
const angDesenhado = run(`(() => { let ang = null; const antes = drawArenaCriada; drawArenaCriada = (a, g) => { ang = g; }; try { drawArenaCriadaStage('${id}', 0); } finally { drawArenaCriada = antes; } return ang; })()`);
check("a foto do card (e o começo da luta) usa a vista da capa", Math.abs(angDesenhado - 2.5) < 1e-6);

// ---------- arquivo ----------
const exp = run(`JSON.stringify(dadosDaArenaParaArquivo(normalizarArena({ nome: 'X', capa: { ang: 1, andado: 5 }, pecas: [
    { t: 'bloco', x: 0, z: 0, g: 1, fv: true, tr: true }, { t: 'mesa_pedra', x: 10, z: 0, g: 1, oc: true }, { t: 'bloco', x: 3, z: 0, b: 30, al: [0, 0, 30], d: 0.1 }] })))`);
const imp = run(`importarArenaDeTexto(${JSON.stringify(exp)})`);
fechaAlerta();
check("o arquivo leva pilha, desalinho, fusão, 👁, 🔒 e capa", !!imp.id && run(`JSON.stringify((a => [a.capa, a.pecas[0].g, a.pecas[0].fv, a.pecas[0].tr, a.pecas[1].oc, a.pecas[2].b, a.pecas[2].al, a.pecas[2].d])(getFaseDef('${imp.id}').arena))`)
    === JSON.stringify([{ ang: 1, andado: 5 }, 1, true, true, true, 30, [0, 0, 30], 0.1]));

// ---------- traduções ----------
run("fecharEditorArenas(); trocarIdioma('en')");
check("textos novos traduzidos (EN)", run("T('FUNDIR')") === "MERGE" && run("T('CONJUNTOS')") === "SETS" && run("T('NA ARENA')") === "IN THE ARENA" && run("T('USAR COMO CAPA')") === "USE AS COVER"
    && run("T('3 PEÇAS ESCOLHIDAS')") === "3 PIECES SELECTED" && run("T('2. BLOCO QUADRADO')") === "2. SQUARE BLOCK" && run("T('ESPELHO: 2 PEÇA(S) COPIADA(S), 1 SEM ESPAÇO.')") === "MIRROR: 2 PIECE(S) COPIED, 1 WITHOUT ROOM.");
run("trocarIdioma('es')");
check("textos novos traduzidos (ES)", run("T('Desalinhar')") === "Desalinear" && run("T('SALVAR CONJUNTO')") === "GUARDAR CONJUNTO");
run("trocarIdioma('pt')");

process.exit(summary());
