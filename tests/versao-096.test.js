// tests/versao-096.test.js — versão 0.96: EDITOR DE ARENAS. PINCEL DE CHÃO (pintar grama, areia, lava, água, terra e
// neve arrastando; cada pincelada é 1 peça), HORA DO DIA (dia, tarde, noite com estrelas e lampiões/lava brilhando) e
// CLIMA (chuva, neve, neblina, vento com folhas), também no arquivo .arena.json.
//
// Uso: node tests/versao-096.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 1366);
const { run, check, summary } = h;
run("deltaTime = 1/60");

run(`abrirEditorArenas(); document.getElementById('modal-alert').style.display = 'none';
    arenaEd.arena.pecas = []; arenaEd.arena.planicie = ''; arenaEd.mover = false; arenaEd.angulo = 0;
    const cv = document.getElementById('arena-planta'); cv.width = 320; cv.height = 320; arenaDesenharPlanta()`);
const planta = (x, z) => run(`arenaMundoParaPlanta(${x}, ${z})`);
const pecas = () => run("arenaEd.arena.pecas");

// ---------- PINCEL ----------
check("aba PINCEL com grama, areia, lava, água, terra e neve", JSON.stringify(run("Object.keys(ARENA_PINCEL)")) === JSON.stringify(["grama", "areia", "lava", "agua", "terra", "neve"]) && run("ARENA_ABAS.some(a => a[0] === 'pincel')"));
run("document.getElementById('arena-pecas').children = []; arenaMostrarAba('pincel')");
run("document.getElementById('arena-pecas').children.find(b => b.textContent === 'LAVA').onclick()");
check("tocar num chão do pincel deixa ele pronto", run("arenaEd.pincel") === "lava" && run("arenaEd.tipo") === null);
const [a0, b0] = planta(-200, 0);
run(`arenaPlantaToque({ clientX: ${a0}, clientY: ${b0}, target: {} })`);
for (let i = 1; i <= 30; i++) { const [a, b] = planta(-200 + i * 12, Math.sin(i / 4) * 60); run(`arenaPlantaArrasto({ clientX: ${a}, clientY: ${b} })`); }
run("arenaPlantaSolta()");
check("arrastar na planta pinta uma pincelada (1 peça só)", pecas().length === 1 && pecas()[0].t === "pincel" && pecas()[0].m === "lava" && pecas()[0].pts.length > 15);
check("pincelada é chão plano: não ocupa espaço", run("arenaPegada(arenaEd.arena.pecas[0])") === null);
run("arenaEd.pincel = 'agua'");
const [c0, d0] = planta(100, 200);
run(`arenaPlantaToque({ clientX: ${c0}, clientY: ${d0}, target: {} })`);
for (let i = 1; i <= 120; i++) { const [a, b] = planta(100 + (i % 2 ? 1 : -1) * (i * 3 % 300), 200 - i); run(`arenaPlantaArrasto({ clientX: ${a}, clientY: ${b} })`); }
run("arenaPlantaSolta()");
check("cada pincelada guarda no máximo 60 pontos", pecas().length === 2 && pecas()[1].pts.length <= 60);
check("DESFAZER apaga a pincelada inteira", run("arenaDesfazer(), arenaEd.arena.pecas.length") === 1 && run("arenaRefazer(), arenaEd.arena.pecas.length") === 2);
// escolher e ajustar
run("arenaEd.pincel = null; arenaEd.sel = -1");
const meio = pecas()[0], [e0, f0] = planta(meio.x + meio.pts[10][0], meio.z + meio.pts[10][1]);
run(`arenaPlantaToque({ clientX: ${e0}, clientY: ${f0}, target: {} }); arenaPlantaSolta()`);
check("tocar na pincelada escolhe ela", run("arenaEd.sel") === 0);
check("o quadro mostra LARGURA para a pincelada", run("document.getElementById('arena-sel-largura-grupo').style.display") === "");
run("document.getElementById('arena-sel-largura').value = '50'; arenaMudarSelecao()");
check("LARGURA muda a grossura da pincelada", pecas()[0].w === 50);
run("arenaEspelhar('lado')");
check("ESPELHAR espelha os pontos da pincelada", pecas().length === 3 && pecas()[2].pts[5][0] === -pecas()[0].pts[5][0] && pecas()[2].x === -pecas()[0].x);
check("pinceladas desenham sem erro (girando, andando e de perto)", run(`(() => { const a = normalizarArena(arenaEd.arena); a.id = 'arena_pincel'; for (const g of [0, 2, 4]) drawArenaCriada(a, g); drawArenaCriada(a, 0, { andado: 300 }); arenaEd.vista = 'foco'; desenharPreviaArena(1/60); return trCam === TR_CAM; })()`));
// pintar na tela grande
run("arenaEd.vista = 'arena'; arenaEd.sel = -1; arenaEd.pincel = 'neve'; desenharPreviaArena(1/60)");
const p1 = run("arProjCom(arenaEd.ultimo.cam, -100, 0, -150, arenaEd.ultimo.ang)"), p2 = run("arProjCom(arenaEd.ultimo.cam, 60, 0, -150, arenaEd.ultimo.ang)");
run(`arenaPreviaToque({ clientX: ${p1[0]}, clientY: ${p1[1]}, pointerId: 1, target: {} })`);
for (let i = 1; i <= 8; i++) run(`arenaPreviaArrasto({ clientX: ${p1[0] + (p2[0] - p1[0]) * i / 8}, clientY: ${p1[1]}, pointerId: 1 })`);
run("arenaPreviaSolta({ pointerId: 1 })");
check("dá para pintar arrastando na tela grande", pecas().length === 4 && pecas()[3].m === "neve" && pecas()[3].pts.length >= 5 && run("arenaEd.congelar") === false);

// ---------- hora do dia ----------
check("horas: dia, tarde e noite", JSON.stringify(run("ARENA_HORAS.map(x => x[0])")) === JSON.stringify(["dia", "tarde", "noite"]));
run("document.getElementById('arena-hora').value = 'noite'; arenaLerCampos()");
check("a hora fica na arena (DADOS DA ARENA)", run("arenaEd.arena.hora") === "noite");
check("de noite o céu escurece (e os botões do topo ganham fundo escuro)", run("arenaCeuClaro(arenaEd.arena)") === false && run("arCeuDaHora(arenaEd.arena).topo") !== run("arenaEd.arena.ceu.topo"));
run("arenaEd.arena.pecas.push(normalizarPecaArena({ t: 'lampiao', x: 0, z: -100 }))");
h.calls.length = 0;
run("(() => { const a = normalizarArena(arenaEd.arena); a.id = 'arena_noite'; drawArenaCriada(a, 0); })()");
const luzes = h.calls.filter(c => c[0] === "createRadialGradient").length;
check("de noite lampiões e lava brilham", h.calls.length > 0 && run("(() => { let n = 0; const antes = ctx.createRadialGradient; ctx.createRadialGradient = function () { n++; return { addColorStop() {} }; }; try { const a = normalizarArena(arenaEd.arena); a.id = 'arena_noite2'; drawArenaCriada(a, 0); } finally { delete ctx.createRadialGradient; } return n; })()") >= 2);
run("document.getElementById('arena-hora').value = 'tarde'; arenaLerCampos()");
check("de tarde o céu fica alaranjado", run("arCeuDaHora(arenaEd.arena).horizonte") !== run("arenaEd.arena.ceu.horizonte"));

// ---------- clima ----------
check("climas: sem clima, chuva, neve, neblina e vento com folhas", JSON.stringify(run("ARENA_CLIMAS.map(x => x[0])")) === JSON.stringify(["nenhum", "chuva", "neve", "neblina", "vento"]));
for (const c of ["chuva", "neve", "neblina", "vento"]) {
    run(`document.getElementById('arena-clima').value = '${c}'; arenaLerCampos()`);
    h.calls.length = 0;
    run("arDesenharClima(arenaEd.arena)");
    check(`clima ${c} desenha poucas partículas por quadro`, h.calls.length > 3 && h.calls.length < 700, String(h.calls.length));
}
run("document.getElementById('arena-clima').value = 'nenhum'; arenaLerCampos()");
h.calls.length = 0; run("arDesenharClima(arenaEd.arena)");
check("sem clima não desenha nada", h.calls.length === 0);

// ---------- luta e arquivo ----------
run("document.getElementById('arena-clima').value = 'chuva'; document.getElementById('arena-hora').value = 'noite'; document.getElementById('arena-nome').value = 'NOITE CHUVOSA'; arenaLerCampos(); salvarArenaDoEditor(); document.getElementById('modal-alert').style.display = 'none'");
const id = run("arenaEd.arena.id");
check("hora e clima ficam salvos e valem na luta", run(`getFaseDef('${id}').arena.hora`) === "noite" && run(`getFaseDef('${id}').arena.clima`) === "chuva" && run(`getFaseDef('${id}').fundoClaro`) === false);
run(`selectedStage = '${id}'; world.stageScrollX = 50`); h.calls.length = 0; run("drawStageBackground()");
check("na luta a arena de noite com chuva desenha (e a câmera volta)", h.calls.length > 50 && run("trCam === TR_CAM"));
const exp = run(`JSON.stringify(dadosDaArenaParaArquivo(getFaseDef('${id}').arena))`);
const imp = run(`importarArenaDeTexto(${JSON.stringify(exp)})`);
check("o arquivo leva hora, clima e pinceladas", !!imp.id && run(`JSON.stringify((a => [a.hora, a.clima, a.pecas[0].t, a.pecas[0].m, a.pecas[0].pts.length > 15])(getFaseDef('${imp.id}').arena))`) === JSON.stringify(["noite", "chuva", "pincel", "lava", true]));
check("clima desconhecido no arquivo dá erro claro", /CLIMA DESCONHECIDO \[tempestade\]/.test(run(`importarArenaDeTexto(${JSON.stringify(JSON.stringify({ formato: "saiyan-fight-arena", versao: 1, arena: { nome: "X", clima: "tempestade" } }))}).erro`)));

// ---------- traduções ----------
run("fecharEditorArenas(); trocarIdioma('en')");
check("textos novos traduzidos (EN)", run("T('PINCEL')") === "BRUSH" && run("T('NOITE')") === "NIGHT" && run("T('VENTO COM FOLHAS')") === "WIND WITH LEAVES" && run("T('ÁGUA')") === "WATER" && run("T('Hora do dia')") === "Time of day");
run("trocarIdioma('es')");
check("textos novos traduzidos (ES)", run("T('NEBLINA')") === "NIEBLA" && run("T('Largura')") === "Ancho" && run("T('PINCELADA')") === "PINCELADA");
run("trocarIdioma('pt')");

process.exit(summary());
