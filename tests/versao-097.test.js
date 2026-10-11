// tests/versao-097.test.js — versão 0.97. EDITOR DE ARENAS: seletor de cor leve (céu e peças em caches separados,
// DESFAZER só ao soltar), FUNDIR com recorte de verdade, chão que some no horizonte (sem "muro"), cores fiéis,
// clima LAVA, peça da lista já pronta (sem CONFIRMAR PEÇA), barra da peça por cima da tela grande, planta como
// maquete (céu no anel, câmera, zoom) e sombra verde/vermelha do espaço real da peça. Luta: o ataque continua a
// sequência de quadros (o Vegeta alterna as mãos).
//
// Uso: node tests/versao-097.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 1366);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- ataque alterna as mãos ----------
const quadros = (intervalo) => run(`(() => { const p = { actionState: 'idle', actionTimer: 0, animTimer: 0 }; const vistos = new Set();
    for (let t = 0; t < 900; t++) { if (t % ${intervalo} === 0) setActionState(p, 'attackKi', 18); if (p.actionTimer > 0) p.actionTimer -= 1; else p.actionState = 'idle';
        avancarAnimacao(p, 1/60); if (p.actionState === 'attackKi') vistos.add(Math.floor(p.animTimer * 10) % 6); }
    return vistos.size; })()`);
check("tiros seguidos passam pela sequência inteira de ataque (6 quadros: as duas mãos)", quadros(15) === 6);
check("tiros espaçados continuam de onde o último parou (não volta sempre à mesma mão)", quadros(60) === 6);
check("outros movimentos ainda começam do 1º quadro", run("(() => { const p = { actionState: 'idle', actionTimer: 0, animTimer: 5 }; setActionState(p, 'transform', 30); return p.animTimer; })()") === 0);

// ---------- editor ----------
run(`abrirEditorArenas(); document.getElementById('modal-alert').style.display = 'none';
    arenaEd.arena.pecas = []; arenaEd.arena.planicie = ''; arenaEd.mover = false; arenaEd.angulo = 0;
    const cv = document.getElementById('arena-planta'); cv.width = 320; cv.height = 320; arenaDesenharPlanta()`);

// seletor de cor: arrastando não grava passo; céu e peças com caches separados
const passos = () => run("arenaEd.hist.pilha.length");
const antes = passos();
for (const c of ["#112233", "#223344", "#334455"]) run(`document.getElementById('arena-ceu-topo').value = '${c}'; arenaLerCampos(true)`);
check("arrastando no seletor de cor não enche o DESFAZER", passos() === antes);
run("arenaLerCampos()");
check("ao soltar o seletor grava um passo só", passos() === antes + 1);
run("arenaEd.arena.pecas = [normalizarPecaArena({ t: 'bloco', x: 0, z: 0 })]");
const cena1 = run("(() => { const c = arCenaDe('_t', arenaEd.arena); c.marca = 1; return c.chave; })()");
run("arenaEd.arena.ceu.topo = '#ff0000'");
check("mudar só a cor do céu não refaz a camada das peças (só o céu)", run("arCenaDe('_t', arenaEd.arena).marca") === 1 && run("arCenaDe('_t', arenaEd.arena).pano") === null);
run("arenaEd.arena.pecas[0].c = '#00ff00'");
check("mudar uma peça refaz a camada das peças", run("arCenaDe('_t', arenaEd.arena).marca") === undefined);

// chão: cor exata e névoa no horizonte (sem faixa lisa)
h.calls.length = 0;
run("(() => { const a = normalizarArena({ nome: 'C', chao: { tipo: 'ladrilho', cor: '#123456' } }); a.id = 'arena_c'; drawArenaCriada(a, 0); })()");
check("o chão é pintado com a cor escolhida, sem clarear nem escurecer", h.calls.some(c => c[0] === "set:fillStyle" && c[1][0] === "#123456"));
check("as peças do céu ficam inteiras acima do horizonte", run(`(() => { let y = null; const antes = ARENA_PECAS.planeta_gasoso.desenha; ARENA_PECAS.planeta_gasoso.desenha = (g, x, yy, r) => { y = yy + r; };
    try { const a = normalizarArena({ nome: 'P', pecas: [{ t: 'planeta_gasoso', a: 0, h: 0, e: 2 }] }); a.id = 'arena_p' + Math.random(); arPanorama(a, { pano: null }, ARENA_CAMERAS.media); } finally { ARENA_PECAS.planeta_gasoso.desenha = antes; }
    return y <= ARENA_CAMERAS.media.HY + 2; })()`));

// clima LAVA
check("clima LAVA existe e avermelha o céu", run("ARENA_CLIMAS.some(c => c[0] === 'lava')") && run("arCeuDaHora(normalizarArena({ nome: 'L', clima: 'lava' })).topo") !== run("normalizarArena({ nome: 'L' }).ceu.topo"));
h.calls.length = 0; run("arDesenharClima({ clima: 'lava' })");
check("clima LAVA desenha poucas partículas por quadro", h.calls.length > 10 && h.calls.length < 900, String(h.calls.length));

// FUNDIR: a escolhida é redesenhada só na região sobreposta
const reg = run(`arRegioesFundidas(normalizarPecaArena({ t: 'bloco', x: 0, z: 0, g: 1, fv: true }), [normalizarPecaArena({ t: 'bloco', x: 20, z: 0, g: 1 })], 0, 0, 0)`);
check("a parte fundida é só a região sobreposta (polígono na tela)", reg.length === 1 && reg[0].length >= 4);
check("peças do grupo que não se tocam não geram recorte", run(`arRegioesFundidas(normalizarPecaArena({ t: 'bloco', x: 0, z: 0, g: 1, fv: true }), [normalizarPecaArena({ t: 'bloco', x: 200, z: 0, g: 1 })], 0, 0, 0)`).length === 0);
check("interseção de dois quadrados", run("arRecorteConvexo([[0,0],[10,0],[10,10],[0,10]], [[5,5],[15,5],[15,15],[5,15]]).length") === 4);

// peça da lista já pronta, barra por cima da tela grande
run("arenaEd.arena.pecas = []; arenaVerPeca('predio')");
check("tocar numa peça da lista já deixa ela pronta (sem CONFIRMAR PEÇA)", run("arenaEd.tipo") === "predio" && run("arenaEd.vista") === "previa");
check("a barra da tela grande mostra o modelo para ajustar antes de colocar", run("document.getElementById('arena-selecao').style.display") === "" && run("document.getElementById('arena-sel-acoes').style.display") === "none");
run("document.getElementById('arena-sel-giro').value = '45'; document.getElementById('arena-sel-tam').value = '1.5'; arenaMudarSelecao()");
check("girar/tamanho na barra mudam o modelo da peça pronta", run("arenaEd.modelo.r") === 45 && run("arenaEd.modelo.e") === 1.5 && run("arenaVistaAtual().a.pecas[0].r") === 45);
// sombra e colocar ao soltar
const [ax, ay] = run("arenaMundoParaPlanta(-200, -150)");
run(`arenaPlantaToque({ clientX: ${ax}, clientY: ${ay}, target: {} })`);
check("com a peça pronta, o dedo mostra a sombra do espaço real (verde = livre) antes de soltar", run("arenaEd.arena.pecas.length") === 0 && run("arenaFantasma().livre") === true && run("arenaFantasma().pecas[0].r") === 45);
run("arenaPlantaSolta()");
check("ao soltar a peça entra com o giro e o tamanho do modelo", run("arenaEd.arena.pecas.length") === 1 && run("arenaEd.arena.pecas[0].r") === 45 && run("arenaEd.arena.pecas[0].e") === 1.5);
check("a barra passa a mostrar a peça colocada (com DUPLICAR/APAGAR)", run("arenaEd.sel") === 0 && run("document.getElementById('arena-sel-acoes').style.display") === "");
run("arenaEd.fantasma = [arenaEd.arena.pecas[0].x + 5, arenaEd.arena.pecas[0].z]");
check("construção sobre o prédio: a sombra mostra que ela encaixa em cima (livre)", run("arenaFantasma().livre") === true && run("arenaFantasma().pecas[0].b") > 0);
run("arenaEd.tipo = 'mesa_pedra'; arenaEd.modelo = normalizarPecaArena({ t: 'mesa_pedra' })");
check("sombra em cima de outra peça fica vermelha (ocupado)", run("arenaFantasma().livre") === false);
run("arenaEd.tipo = 'predio'; arenaEd.modelo = normalizarPecaArena({ t: 'predio', r: 45, e: 1.5 })");
check("a peça escolhida tem o contorno do espaço real (retângulo girado, 4 cantos)", run("arenaContornoNaPlanta(arenaEd.arena.pecas[0]).length") === 4);
run("arenaCancelarPeca()");
check("CANCELAR desliga a peça pronta", run("arenaEd.tipo") === null && run("arenaEd.modelo") === null);

// planta como maquete: céu no anel, zoom
run("arenaEd.arena.pecas.push(normalizarPecaArena({ t: 'lua', a: 90, h: 0.5 })); arenaDesenharPlanta()");
const [lx, ly] = run("arenaCeuNoAnel(arenaEd.arena.pecas[1])");
check("as peças do céu aparecem no anel em volta da planta (e dá para tocar nelas)", run(`arenaPecaNoPonto(${lx}, ${ly})`) === 1);
run(`arenaMoverPara(arenaEd.arena.pecas[1], ${run("AR_PLANTA / 2")}, 2)`);
check("arrastar no anel muda a direção da peça no céu", run("arenaEd.arena.pecas[1].a") === 180);
check("a direção no anel é a mesma do céu da tela grande (azimute 0 = atrás da câmera inicial)", JSON.stringify(run("arenaDirecaoDoCeu(0).map(Math.round)")) === "[0,1]");
const w0 = run("arenaPlantaParaMundo(200, 160)");
run("arenaZoomPlanta(2, [160, 160])");
check("zoom na planta aproxima mantendo o ponto do cursor", run("arenaEd.plantaZoom") === 2 && Math.abs(run("arenaPlantaParaMundo(200, 160)[0]") - w0[0] / 2) < 1);
run("arenaZoomPlantaBotao(0)");
check("⟲ volta a planta inteira", run("arenaEd.plantaZoom") === 1);
run("arenaPlantaToque({ clientX: 100, clientY: 100, pointerId: 1, target: {} }); arenaPlantaToque({ clientX: 140, clientY: 100, pointerId: 2, target: {} })");
run("arenaPlantaArrasto({ clientX: 60, clientY: 100, pointerId: 1 }); arenaPlantaArrasto({ clientX: 180, clientY: 100, pointerId: 2 })");
check("dois dedos na planta dão zoom", run("arenaEd.plantaZoom") > 2);
run("arenaPlantaSolta({ pointerId: 1 }); arenaPlantaSolta({ pointerId: 2 })");
run("arenaZoomPlantaBotao(0)");

// traduções
run("fecharEditorArenas(); trocarIdioma('en')");
check("textos traduzidos (EN)", run("T('LAVA')") === "LAVA" && run("T('CANCELAR')") === "CANCEL" && run("T('Girar')") !== "");
run("trocarIdioma('pt')");

process.exit(summary());
