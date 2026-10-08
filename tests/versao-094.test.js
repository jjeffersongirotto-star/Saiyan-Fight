// tests/versao-094.test.js — versão 0.94: EDITOR DE ARENAS mais fácil de usar. Zoom na visualização grande
// (barra, roda do mouse e dois dedos no celular), arrastar a vista com zoom, MAXIMIZAR/MINIMIZAR, escolher e
// arrastar peças direto na tela grande, DESFAZER/REFAZER (50 passos, Ctrl+Z/Ctrl+Y), GRADE (posições de 20 em 20
// e giro de 15 em 15), rascunho que volta sozinho, TESTAR (luta rápida na arena em edição) e atalhos do teclado.
//
// Uso: node tests/versao-094.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 1366);
const { run, check, summary } = h;
run("deltaTime = 1/60");

const abrir = () => run(`abrirEditorArenas(); document.getElementById('modal-alert').style.display = 'none';
    arenaEd.arena.pecas = []; arenaEd.arena.planicie = ''; arenaEd.mover = false; arenaEd.angulo = 0;
    const cv = document.getElementById('arena-planta'); cv.width = 320; cv.height = 320; arenaDesenharPlanta()`);
const pintar = () => run("desenharPreviaArena(1/60)");
const tela = (x, y, z) => run(`arProjCom(arenaEd.ultimo.cam, ${x}, ${y || 0}, ${z || 0}, arenaEd.ultimo.ang)`);
const dedo = (fn, x, y, id) => run(`${fn}({ clientX: ${x}, clientY: ${y}, pointerId: ${id === undefined ? 1 : id}, target: {} })`);

run("writeStorage('saiyan_arena_rascunho', '')");
abrir();

// ---------- zoom da visualização grande ----------
check("a tela grande começa sem zoom", run("arenaEd.zoom") === 1 && run("document.getElementById('arena-zoom').value") === 100);
run("document.getElementById('arena-zoom').value = '250'; arenaZoomDaBarra()");
check("a barra de ZOOM aproxima a tela grande", run("arenaEd.zoom") === 2.5);
pintar();
check("com zoom só um pedaço do canvas é copiado", run("canvas.width / arenaEd.zoom") === 320);
run("arenaEd.pan.x = 9999; arenaEd.pan.y = 9999; arenaLimitarPan()");
check("o arraste da vista não passa das beiradas", run("arenaEd.pan.x") === 800 - 320 && run("arenaEd.pan.y") === 350 - 140);
run("arenaAplicarZoom(1, null)");
check("sem zoom a vista volta inteira (sem sobra)", run("arenaEd.zoom") === 1 && run("arenaEd.pan.x") === 0 && run("arenaEd.pan.y") === 0);
pintar();
run("arenaPreviaRoda({ clientX: 400, clientY: 175, deltaY: -1, preventDefault() {} })");
check("a roda do mouse dá zoom", run("arenaEd.zoom") > 1);
const zoomAntes = run("arenaEd.zoom");
run("arenaPreviaRoda({ clientX: 400, clientY: 175, deltaY: 1, preventDefault() {} })");
check("a roda ao contrário afasta", run("arenaEd.zoom") < zoomAntes);
run("arenaAplicarZoom(1, null)");
// dois dedos (celular): afastar aproxima, juntar afasta
dedo("arenaPreviaToque", 300, 150, 1);
dedo("arenaPreviaToque", 400, 150, 2);
check("dois dedos na tela começam a pinça", !!run("arenaEd.pinca") && run("arenaEd.dedos.size") === 2);
dedo("arenaPreviaArrasto", 500, 150, 2);
check("afastar os dedos aumenta a imagem", run("arenaEd.zoom") > 1.5);
const zoomPinca = run("arenaEd.zoom");
dedo("arenaPreviaArrasto", 420, 150, 2);
check("juntar os dedos diminui a imagem", run("arenaEd.zoom") < zoomPinca);
dedo("arenaPreviaSolta", 420, 150, 2);
dedo("arenaPreviaSolta", 300, 150, 1);
check("soltar os dedos termina a pinça", run("arenaEd.pinca") === null && run("arenaEd.dedos.size") === 0);
run("arenaAplicarZoom(1, null)");
// arrastar a vista com zoom
run("arenaAplicarZoom(2, [400, 175])");
pintar();
const panAntes = run("arenaEd.pan.x");
dedo("arenaPreviaToque", 700, 300, 3);
dedo("arenaPreviaArrasto", 600, 300, 3);
check("com zoom, arrastar o fundo passeia pela arena", run("arenaEd.pan.x") > panAntes);
dedo("arenaPreviaSolta", 600, 300, 3);
run("arenaAplicarZoom(1, null)");

// ---------- MAXIMIZAR / MINIMIZAR ----------
check("o botão começa em MAXIMIZAR", run("document.getElementById('arena-maximizar').textContent") === "MAXIMIZAR");
run("arenaAlternarMaximizar()");
check("MAXIMIZAR deixa a tela grande ocupar tudo e o botão virar MINIMIZAR", run("arenaEd.maximizado") === true && run("document.getElementById('arena-maximizar').textContent") === "MINIMIZAR");
run("arenaAlternarMaximizar()");
check("MINIMIZAR volta a tela dividida", run("arenaEd.maximizado") === false);

// ---------- escolher, colocar e arrastar peças na tela grande ----------
run("arenaEd.tipo = 'mesa_pedra'");
pintar();
const centro = tela(0, 0, 0);
run(`arenaPreviaToque({ clientX: ${centro[0]}, clientY: ${centro[1]}, pointerId: 1, target: {} }); arenaPreviaSolta({ pointerId: 1 })`);
check("tocar na tela grande com uma peça escolhida coloca ela no chão", run("arenaEd.arena.pecas.length") === 1 && Math.abs(run("arenaEd.arena.pecas[0].x")) <= 20);
pintar();
const sobre = tela(run("arenaEd.arena.pecas[0].x"), 0, run("arenaEd.arena.pecas[0].z"));
check("a peça desenhada é achada pelo toque na tela grande", run(`arenaPecaNaTela(${sobre[0]}, ${sobre[1]})`) === 0);
check("o céu (acima de tudo) não acha peça nenhuma", run(`arenaPecaNaTela(${sobre[0]}, 20)`) === -1);
run("arenaEd.tipo = null; arenaEd.sel = -1; arenaEd.vista = 'arena'");
pintar();
const sobre2 = tela(run("arenaEd.arena.pecas[0].x"), 0, run("arenaEd.arena.pecas[0].z"));
run(`arenaPreviaToque({ clientX: ${sobre2[0]}, clientY: ${sobre2[1]}, pointerId: 1, target: {} })`);

check("tocar numa peça na tela grande escolhe ela (e congela a vista para arrastar)", run("arenaEd.sel") === 0 && run("arenaEd.congelar") === true && run("arenaEd.arrasto.previa") === true);
const destino = tela(240, 0, 60);
run(`arenaPreviaArrasto({ clientX: ${destino[0]}, clientY: ${destino[1]}, pointerId: 1, target: {} })`);
check("arrastar na tela grande leva a peça para onde o dedo está", Math.abs(run("arenaEd.arena.pecas[0].x") - 240) < 25 && Math.abs(run("arenaEd.arena.pecas[0].z") - 60) < 25);
run("arenaPreviaSolta({ pointerId: 1 })");
check("soltar destrava a vista", run("arenaEd.congelar") === false && run("arenaEd.arrasto") === null);
// mesma regra de espaço da planta: em cima de outra peça fica vermelha e volta
run("arenaEd.arena.pecas.push(normalizarPecaArena({ t: 'mesa_pedra', x: -200, z: 0, c: '#888888' }))");
pintar();
const dois = tela(240, 0, 60);
run(`arenaPreviaToque({ clientX: ${dois[0]}, clientY: ${dois[1]}, pointerId: 1, target: {} })`);
const emCima = tela(-200, 0, 0);
run(`arenaPreviaArrasto({ clientX: ${emCima[0]}, clientY: ${emCima[1]}, pointerId: 1, target: {} })`);
check("arrastar para cima de outra peça na tela grande deixa ela vermelha", run("arenaEd.arrasto.invalido") === true && run("arenaPecaVermelha()") === run("arenaEd.arrasto.i"));
run("arenaPreviaSolta({ pointerId: 1 })");
check("soltar num lugar ocupado volta a peça para onde estava", Math.abs(run("arenaEd.arena.pecas[0].x") - 240) < 25);

// ---------- DESFAZER / REFAZER ----------
const pecas = () => run("arenaEd.arena.pecas.length");
const antes = pecas();
run("arenaEd.sel = 0; arenaApagarSelecao()");
check("apagar uma peça muda a arena", pecas() === antes - 1);
run("arenaDesfazer()");
check("DESFAZER traz a peça de volta", pecas() === antes);
run("arenaRefazer()");
check("REFAZER apaga de novo", pecas() === antes - 1);
run("arenaDesfazer()");
check("os botões desligam quando não há passo para onde ir", run("document.getElementById('arena-refazer').disabled") === false && run("arenaIrParaPasso(0), document.getElementById('arena-desfazer').disabled") === true);
check("guarda no máximo 50 passos", run(`(() => { arenaEd.tipo = 'bloco'; for (let i = 0; i < 70; i++) { arenaEd.arena.nome = 'A' + i; arenaRegistrarPasso(); } return arenaEd.hist.pilha.length; })()`) === 51);
run("arenaEd.hist = { pilha: [], i: -1 }; arenaRegistrarPasso(true)");
// Ctrl+Z / Ctrl+Y
run("arenaEd.arena.nome = 'ANTES'; arenaRegistrarPasso(); arenaEd.arena.nome = 'DEPOIS'; arenaRegistrarPasso()");
run("arenaTeclaAtalho({ key: 'z', ctrlKey: true, target: {}, preventDefault() {} })");
check("Ctrl+Z desfaz", run("arenaEd.arena.nome") === "ANTES");
run("arenaTeclaAtalho({ key: 'y', ctrlKey: true, target: {}, preventDefault() {} })");
check("Ctrl+Y refaz", run("arenaEd.arena.nome") === "DEPOIS");

// ---------- GRADE ----------
check("a GRADE começa desligada", run("arenaEd.grade") === false && run("arenaNaGrade(37)") === 37);
run("arenaAlternarGrade()");
check("GRADE prende as posições de 20 em 20 e o giro de 15 em 15", run("arenaEd.grade") === true && run("arenaNaGrade(37)") === 40 && run("arenaGiroNaGrade(37)") === 30);
run("arenaEd.arena.pecas = [normalizarPecaArena({ t: 'bloco', x: 0, z: 0, c: '#888888' })]; arenaEd.sel = 0; arenaAtualizarSelecao(); document.getElementById('arena-sel-giro').value = '40'; arenaMudarSelecao()");
check("com a GRADE o giro da peça anda de 15 em 15", run("arenaEd.arena.pecas[0].r") === 45);
run("arenaAlternarGrade()");

// ---------- atalhos do teclado ----------
const atalho = (key, extra) => run(`arenaTeclaAtalho(Object.assign({ key: ${JSON.stringify(key)}, target: {}, preventDefault() {} }, ${JSON.stringify(extra || {})}))`);
run("arenaEd.arena.pecas = [normalizarPecaArena({ t: 'bloco', x: 0, z: 0, c: '#888888' })]; arenaEd.sel = 0; arenaAtualizarSelecao()");
atalho("ArrowRight");
check("as setas movem a peça escolhida", run("arenaEd.arena.pecas[0].x") === 5);
atalho("ArrowUp");
check("seta para cima leva a peça para o fundo", run("arenaEd.arena.pecas[0].z") === -5);
atalho("r");
check("R gira 15 graus", run("arenaEd.arena.pecas[0].r") === 15);
atalho("d");
check("D duplica a peça", run("arenaEd.arena.pecas.length") === 2);
atalho("Delete");
check("Delete apaga a peça escolhida", run("arenaEd.arena.pecas.length") === 1);
atalho("g");
check("G liga e desliga a grade", run("arenaEd.grade") === true);
atalho("g");
run("arenaEd.arena.pecas = [normalizarPecaArena({ t: 'bloco', x: 0, z: 0, c: '#888888' })]; arenaEd.sel = 0");
atalho("ArrowRight", { target: { tagName: "INPUT" } });
check("digitando num campo os atalhos não mexem na peça", run("arenaEd.arena.pecas[0].x") === 0);

// ---------- rascunho ----------
run("arenaEd.arena.nome = 'RASCUNHO TESTE'; arenaRegistrarPasso()");
check("o rascunho é guardado (depois de 1 segundo parado)", run(`(() => { const t = arenaRascunhoTimer; arenaGuardarRascunho(); return !!arenaRascunhoTimer; })()`) === true);
run("writeStorage('saiyan_arena_rascunho', JSON.stringify({ arena: Object.assign({}, arenaEd.arena, { id: '' }), quando: Date.now() }))");
check("o rascunho guardado é lido de volta", run("arenaRascunhoGuardado().nome") === "RASCUNHO TESTE");
run("fecharEditorArenas(); abrirEditorArenas()");
check("ao reabrir o editor ele pergunta se quer continuar o rascunho", /CONTINUAR O RASCUNHO/.test(run("document.getElementById('modal-alert-msg').innerText")));
run("executeSystemConfirm(true)");
check("CONTINUAR traz o rascunho de volta", run("arenaEd.arena.nome") === "RASCUNHO TESTE");
run("arenaApagarRascunho()");
check("APAGAR o rascunho limpa o guardado", run("arenaRascunhoGuardado()") === null);
run("fecharEditorArenas(); abrirEditorArenas(); document.getElementById('modal-alert').style.display = 'none'");

// ---------- TESTAR: luta rápida na arena em edição ----------
run("document.getElementById('arena-nome').value = 'ARENA DE TESTE'; arenaEd.arena.pecas = [normalizarPecaArena({ t: 'predio', x: 150, z: 0, c: '#888888' })]; arenaEd.aba = 'natureza'; arenaLerCampos()");
run("arenaTestarArena()");
check("TESTAR começa a luta na arena em edição", run("arenaEmTeste()") === true && run("gameState") === "playing" && run("selectedStage") === "arena_teste");
check("a arena de teste entra na lista de fases só durante o teste", !!run("getFaseDef('arena_teste')") && run("getFaseDef('arena_teste').arena.pecas.length") === 1 && run("arenaEditorAberto()") === false);
h.calls.length = 0;
run("drawStageBackground()");
check("o cenário de teste desenha na luta", h.calls.length > 20 && run("trCam === TR_CAM"));
run("score = 777; saveRankingScore(score, { tempo: 10, golpes: 0 }); saveStageRankingScore('arena_teste', score, {}); registerStageModeComplete('arena_teste', 'normal'); registerStageWaveRecord('arena_teste', 9)");
check("a luta de teste não entra no ranking nem no progresso", run("readJsonStorage('saiyan_ranking', []).length") === 0 && !run("stageProgress['arena_teste']") && !run("stageWaveRecord['arena_teste']"));
run("setGameState('stage_map')");
check("sair da luta de teste reabre o editor como estava", run("arenaEditorAberto()") === true && run("arenaEmTeste()") === false && run("arenaEd.arena.nome") === "ARENA DE TESTE" && run("arenaEd.aba") === "natureza");
check("a fase de teste sai da lista depois do teste", !run("getFaseDef('arena_teste')") && run("selectedStage") !== "arena_teste");

// ---------- traduções ----------
run("fecharEditorArenas(); trocarIdioma('en')");
check("textos novos traduzidos (EN)", run("T('GRADE')") === "GRID" && run("T('TESTAR')") === "TEST" && run("T('MAXIMIZAR')") === "MAXIMIZE" && run("T('↶ DESFAZER')") === "↶ UNDO"
    && run("T('CONTINUAR O RASCUNHO DA ARENA MINHA ARENA?')") === "CONTINUE THE DRAFT OF THE ARENA MINHA ARENA?");
run("trocarIdioma('es')");
check("textos novos traduzidos (ES)", run("T('GRADE')") === "REJILLA" && run("T('MINIMIZAR')") === "MINIMIZAR" && run("T('COMEÇAR LIMPO')") === "EMPEZAR LIMPIO");
run("trocarIdioma('pt')");

process.exit(summary());
