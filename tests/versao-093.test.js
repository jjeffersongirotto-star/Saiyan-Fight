// tests/versao-093.test.js — versão 0.93: EDITOR DE ARENAS em tela inteira. Prévia da peça antes de confirmar,
// câmera perto da peça escolhida, espaço das peças (duas não ocupam o mesmo lugar; a peça fica vermelha e volta),
// PLANÍCIES (chão completo de cada fase), formatos e volume (montes) nas peças de chão, EFEITOS que se mexem
// (lava em coluna e em arco, brasas, fumaça, nuvens, raio) e o movimento SEGUIR (a fase anda para a frente).
//
// Uso: node tests/versao-093.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- formatos e volume ----------
const formas = run("ARENA_FORMATOS.map(f => f[0])");
check("formatos do chão: círculo, oval, feijão, irregular, rio reto e rio em curva", JSON.stringify(formas) === JSON.stringify(["circulo", "oval", "feijao", "irregular", "rio", "rio_curvo"]));
check("cada formato tem um contorno diferente", new Set(formas.map(f => JSON.stringify(run(`arFormaPontos('${f}', 60, 1)`)))).size === formas.length);
const desenhaTudo = (pecas, extra) => run(`(() => { const a = normalizarArena(Object.assign({ nome: "T", pecas: ${JSON.stringify(pecas)} }, ${JSON.stringify(extra || {})})); a.id = "arena_teste" + Math.random();
    for (const ang of [0, 2.1, 4.4]) drawArenaCriada(a, ang); drawArenaCriada(a, 0, { andado: 900 }); return trCam === TR_CAM; })()`);
const chao = ["gramado", "lago", "areia", "terra", "lava", "neve"];
check("pisos e montes em todos os formatos desenham sem erro", desenhaTudo(chao.flatMap((t, i) => formas.map((f, j) => ({ t, f, v: (i + j) % 3, x: -400 + j * 140, z: -400 + i * 140 })))));
check("piso plano não ocupa espaço; com ALTURA vira monte e ocupa", run("arenaPegada(normalizarPecaArena({ t: 'lava', v: 0 }))") === null && !!run("arenaPegada(normalizarPecaArena({ t: 'lava', v: 2 }))"));

// ---------- espaço das peças ----------
const colide = (a, b) => run(`arenaPecaColide([normalizarPecaArena(${JSON.stringify(a)})], normalizarPecaArena(${JSON.stringify(b)}), -1)`);
check("dois prédios no mesmo lugar se chocam", colide({ t: "predio", x: 0, z: 0 }, { t: "predio", x: 20, z: 10 }) === true);
check("lado a lado não se chocam", colide({ t: "predio", x: 0, z: 0 }, { t: "predio", x: 60, z: 0 }) === false);
check("parede girada 90° deixa espaço dos lados", colide({ t: "parede", x: 0, z: 0, r: 90 }, { t: "bloco", x: 30, z: 0 }) === false && colide({ t: "parede", x: 0, z: 0 }, { t: "bloco", x: 30, z: 0 }) === true);
check("árvore (redonda) encostada no prédio choca, longe não", colide({ t: "predio", x: 0, z: 0 }, { t: "arvore", x: 30, z: 0 }) === true && colide({ t: "predio", x: 0, z: 0 }, { t: "arvore", x: 40, z: 0 }) === false);
check("peças de chão planas e do céu não ocupam espaço", colide({ t: "predio", x: 0, z: 0 }, { t: "gramado", x: 0, z: 0 }) === false && run("arenaPegada(normalizarPecaArena({ t: 'sol' }))") === null);

// ---------- editor: prévia, confirmar, colocar, foco, vermelho ----------
run("abrirEditorArenas(); arenaEd.arena.pecas = []; const cv = document.getElementById('arena-planta'); cv.width = 320; cv.height = 320; arenaDesenharPlanta()");
run("arenaVerPeca('predio')");
check("tocar numa peça da lista mostra só ela na tela grande, com CONFIRMAR PEÇA e CANCELAR", run("arenaEd.vista") === "previa" && run("document.getElementById('arena-confirmar').style.display") === "" && run("arenaVistaAtual().a.pecas.length") === 1);
run("arenaCancelarPeca()");
check("CANCELAR volta para a arena sem escolher", run("arenaEd.vista") === "arena" && run("arenaEd.tipo") === null);
run("arenaVerPeca('predio'); arenaConfirmarPeca()");
check("CONFIRMAR PEÇA volta para a arena com a peça pronta para colocar", run("arenaEd.vista") === "arena" && run("arenaEd.tipo") === "predio" && run("document.getElementById('arena-confirmar').style.display") === "none");
const toque = (x, y) => run(`arenaPlantaToque({ clientX: ${x}, clientY: ${y}, target: {} }); arenaPlantaSolta()`);
toque(160, 160);
check("tocar na planta coloca e já mostra a peça de perto (tela grande)", run("arenaEd.arena.pecas.length") === 1 && run("arenaEd.vista") === "foco" && run("arenaVistaAtual().opts.desl.x") === 0);
toque(175, 160);   // fora da peça, mas perto o bastante para invadir o espaço dela
check("colocar em cima de outra: não coloca e avisa LUGAR OCUPADO", run("arenaEd.arena.pecas.length") === 1 && /LUGAR OCUPADO/.test(run("document.getElementById('arena-dica').textContent")));
toque(195, 160);
check("num lugar livre coloca a segunda", run("arenaEd.arena.pecas.length") === 2);
run("arenaPlantaToque({ clientX: 195, clientY: 160, target: {} }); arenaPlantaArrasto({ clientX: 163, clientY: 160 })");
check("arrastar para cima de outra deixa a peça vermelha", run("arenaEd.arrasto.invalido") === true && run("arenaPecaVermelha()") === 1);
run("arenaPlantaSolta()");
check("soltar num lugar ocupado: a peça volta para onde estava", Math.round(run("arenaEd.arena.pecas[1].x")) === run("Math.round(arenaPlantaParaMundo(195, 160)[0])"));
run("arenaEd.sel = 0; arenaAtualizarSelecao(); document.getElementById('arena-sel-tam').value = '3'; arenaMudarSelecao()");
check("aumentar até invadir a outra: volta ao tamanho de antes e pisca vermelho", run("arenaEd.arena.pecas[0].e") === 1 && run("arenaPecaVermelha()") === 0);
check("VER ARENA volta para a vista inteira", run("arenaVerArena(), arenaEd.vista") === "arena");

// ---------- planícies ----------
check("PLANÍCIES: o chão completo de cada fase do jogo", run("STAGE_PROGRESSION.filter(s => !getFaseDef(s.id).criada).every(s => !!ARENA_PLANICIES[s.id])"));
run("arenaMostrarAba('planicies')");
check("a aba PLANÍCIES lista SEM PLANÍCIE e as fases", run("document.getElementById('arena-pecas').children.map(b => b.textContent)").includes("ILHA DO MESTRE KAME"));
run("arenaVerPeca('planicie:kame'); arenaConfirmarPeca()");
check("confirmar a planície troca chão e céu pelos da fase", run("arenaEd.arena.planicie") === "kame" && run("arenaEd.arena.chao.tipo") === "mar");
check("todas as planícies desenham sem erro", run(`(() => { for (const k in ARENA_PLANICIES) { const a = normalizarArena({ nome: "P", planicie: k }); a.id = "arena_p" + k; drawArenaCriada(a, 1); drawArenaCriada(a, 0, { andado: 300 }); } return trCam === TR_CAM; })()`));

// ---------- efeitos ----------
const efeitos = run("Object.keys(ARENA_PECAS).filter(k => ARENA_PECAS[k].anim)");
check("EFEITOS: colunas e arcos de lava, brasas, fumaça, nuvens passando e raio", ["coluna_lava", "arco_lava", "brasas", "fumaca", "nuvens_passando", "raio"].every(k => efeitos.includes(k)));
check("efeitos desenham sem erro (girando, andando e de perto)", desenhaTudo(efeitos.map((t, i) => ({ t, x: -300 + i * 120, z: 0 }))));
run("arenaEd.arena.pecas = []; arenaMostrarAba('efeitos'); arenaEd.tipo = 'brasas'");
for (let i = 0; i < 12; i++) toque(20 + (i % 6) * 50, 40 + Math.floor(i / 6) * 60);
run("document.getElementById('modal-alert').style.display = 'none'");
check("no máximo 10 efeitos por arena", run("arenaEd.arena.pecas.filter(p => ARENA_PECAS[p.t].anim).length") === 10);

// ---------- movimento SEGUIR ----------
run("arenaEd.arena.pecas = [normalizarPecaArena({ t: 'predio', x: 100, z: -100 })]; document.getElementById('arena-movimento').value = 'seguir'; arenaLerCampos(); salvarArenaDoEditor(); document.getElementById('modal-alert').style.display = 'none'");
const id = run("arenaEd.arena.id");
check("SEGUIR fica salvo e a fase anda (câmera de andar)", run(`getFaseDef('${id}').arena.movimento`) === "seguir" && run(`getFaseDef('${id}').camera.tipo`) === "anda");
run(`selectedStage = '${id}'; world.stageScrollX = 100`); h.calls.length = 0; run("drawStageBackground()");
const a1 = h.calls.length;
run("world.stageScrollX = 400"); h.calls.length = 0; run("drawStageBackground()");
check("na luta a arena SEGUIR desenha andando (e a câmera volta)", a1 > 20 && h.calls.length > 20 && run("trCam === TR_CAM"));
run("document.getElementById('arena-girar').checked = false; arenaLerCampos()");
check("a caixinha EM MOVIMENTO para a visualização", run("arenaEd.mover") === false);

// ---------- arquivo e telas ----------
const exp = run(`JSON.stringify(dadosDaArenaParaArquivo(Object.assign(getArenasCriadas()[0], { planicie: 'namek', pecas: [{ t: 'lago', x: 0, z: 0, f: 'rio_curvo', v: 1.5 }] })))`);
const r = run(`importarArenaDeTexto(${JSON.stringify(exp)})`);
check("o arquivo leva movimento, planície, formato e altura", !!r.id && run(`JSON.stringify([getFaseDef('${r.id}').arena.movimento, getFaseDef('${r.id}').arena.planicie, getFaseDef('${r.id}').arena.pecas[0].f, getFaseDef('${r.id}').arena.pecas[0].v])`) === JSON.stringify(["seguir", "namek", "rio_curvo", 1.5]));
check("planície desconhecida no arquivo dá erro claro", /PLANÍCIE DESCONHECIDA \[lua\]/.test(run(`importarArenaDeTexto(${JSON.stringify(JSON.stringify({ formato: "saiyan-fight-arena", versao: 1, arena: { nome: "X", planicie: "lua" } }))}).erro`)));
run("arenaMostrarBaixo('peca')");
check("embaixo: DADOS DA ARENA e PEÇA ESCOLHIDA (abas no celular)", run("document.getElementById('arena-baixo').attributes['data-vista']") === "peca");
run("fecharEditorArenas(); trocarIdioma('en')");
check("textos novos traduzidos", run("T('COLUNA DE LAVA')") === "LAVA COLUMN" && run("T('Toque na planta para colocar: PRÉDIO. Peça vermelha = lugar ocupado.')") === "Tap the map to place: BUILDING. Red piece = space taken.");
run("trocarIdioma('pt')");

process.exit(summary());
