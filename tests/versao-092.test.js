// tests/versao-092.test.js — versão 0.92: EDITOR DE ARENAS. Peças tiradas dos cenários (construção, nave, natureza,
// chão, céu, enfeites) desenham sem erro; a arena salva vira uma fase de verdade (fim da lista, sempre liberada,
// música/minion próprios, desenhada na luta com a câmera em volta); a janela coloca/move/apaga peças; o arquivo
// .arena.json exporta e anexa (com erros claros); as telas ARENAS e RANKING cabem com 7 arenas criadas.
//
// Uso: node tests/versao-092.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const dir = __dirname + "/..";
const h = createHarness(dir, 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- peças ----------
const tipos = run("Object.keys(ARENA_PECAS)");
check("tem peças em todas as abas", run("ARENA_ABAS.every(([k]) => Object.values(ARENA_PECAS).some(p => p.aba === k))") && tipos.length >= 40, String(tipos.length));
const erro = run(`(() => {
    const pecas = Object.keys(ARENA_PECAS).map((t, i) => normalizarPecaArena({ t, x: (i % 9) * 80 - 320, z: Math.floor(i / 9) * 80 - 320, a: i * 7, h: 0.5, e: 1, r: i * 10 }));
    for (const cam of Object.keys(ARENA_CAMERAS)) for (let k = 0; k < pecas.length; k += 40) {
        const a = normalizarArena({ id: "arena_t" + k, nome: "T", camera: cam, pecas: pecas.slice(k, k + 40) });
        a.id = "arena_t" + cam + k;
        for (const ang of [0, 1.7, 3.6, 5.2]) drawArenaCriada(a, ang);
    }
    return trCam === TR_CAM ? "" : "câmera não voltou";
})()`);
check("cada peça desenha sem erro em todas as câmeras e ângulos (e a câmera volta)", erro === "", erro);
check("peça de tipo desconhecido é descartada", run("normalizarPecaArena({ t: 'nada' })") === null);
check("posição, tamanho e giro ficam dentro dos limites", JSON.stringify(run("normalizarPecaArena({ t: 'bloco', x: 9999, z: -9999, e: 50, r: 400 })")) === JSON.stringify({ t: "bloco", e: 3, c: "#d9dee6", x: 420, z: -420, r: 40 }));

// ---------- arena vira fase ----------
const exemplo = fs.readFileSync(`${dir}/formatos/exemplo-arena.arena.json`, "utf8");
const r = run(`importarArenaDeTexto(${JSON.stringify(exemplo)})`);
check("formatos/exemplo-arena.arena.json entra no jogo", !!r.id, JSON.stringify(r));
const id = r.id;
check("a arena criada entra no fim da lista de fases", run("STAGE_PROGRESSION[STAGE_PROGRESSION.length - 1].id") === id && run(`getFaseDef('${id}').nome`) === "TEMPLO NAS NUVENS");
check("sempre liberada (sem precisar vencer as anteriores)", run(`isStageUnlockedByProgress('${id}', {})`) === true);
check("música e minion da arena", run(`getStageMusicEra('${id}')`) === "kami" && run(`getMinionDaFase('${id}')`) === "saibaman");
check("as trilhas sonoras não repetem a arena criada", !run("getBgmTrackList().some(t => t.fases === 'TEMPLO NAS NUVENS')"));
run(`selectedStage = '${id}'; world.stageScrollX = 1234`);
h.calls.length = 0; run("drawStageBackground()");
check("na luta o cenário é desenhado (e a câmera volta)", h.calls.length > 50 && run("trCam === TR_CAM"));
run(`selectedCharacter = 'goku_adult'; selectedBoss = 'freeza_1'; gameMode = 'singleplayer'; stageMode = 'normal'; selectedStage = '${id}'; startGame(); for (let i = 0; i < 30; i++) { update(1/60); render(); }`);
check("dá para lutar na arena criada", run("gameState") === "playing");
run("setGameState('menu')");

// ---------- janela do editor ----------
run("abrirEditorArenas()");
check("EDITOR DE ARENAS abre com a arena salva", run("arenaEditorAberto()") && run("arenaEd.arena.nome") === "TEMPLO NAS NUVENS");
run("arenaMostrarAba('nave')");
check("a aba mostra as peças dela", run("document.getElementById('arena-pecas').children.map(b => b.textContent)").includes("CASCO DE NAVE"));
const planta = run("(() => { const cv = document.getElementById('arena-planta'); cv.width = 320; cv.height = 320; return 1; })()");
const toque = (x, y) => run(`arenaPlantaToque({ clientX: ${x}, clientY: ${y}, target: {} })`);
run("arenaEd.arena.pecas = []; arenaEd.tipo = 'perna_aco'");
toque(240, 80);
check("tocar na planta coloca a peça escolhida no lugar tocado", run("arenaEd.arena.pecas.length") === 1 && run("arenaEd.arena.pecas[0].t") === "perna_aco" && run("arenaEd.arena.pecas[0].x") === 210 && run("arenaEd.arena.pecas[0].z") === -210 && run("arenaEd.sel") === 0);
run("arenaPlantaArrasto({ clientX: 160, clientY: 160 }); arenaPlantaSolta()");
check("arrastar move a peça", run("arenaEd.arena.pecas[0].x") === 0 && run("arenaEd.arena.pecas[0].z") === 0);
run("document.getElementById('arena-sel-tam').value = '2'; document.getElementById('arena-sel-giro').value = '90'; document.getElementById('arena-sel-cor').value = '#ff0000'; arenaMudarSelecao()");
check("tamanho, giro e cor da peça escolhida", JSON.stringify(run("[arenaEd.arena.pecas[0].e, arenaEd.arena.pecas[0].r, arenaEd.arena.pecas[0].c]")) === JSON.stringify([2, 90, "#ff0000"]));
run("arenaDuplicarSelecao()");
check("DUPLICAR cria outra igual ao lado", run("arenaEd.arena.pecas.length") === 2 && run("arenaEd.arena.pecas[1].e") === 2);
run("arenaApagarSelecao()");
check("APAGAR PEÇA tira a escolhida", run("arenaEd.arena.pecas.length") === 1);
run("arenaMostrarAba('ceu'); arenaEd.tipo = 'sol'");
toque(80, 40);
check("no CÉU a peça vai para a faixa do céu (em volta e altura)", run("arenaEd.arena.pecas[1].t") === "sol" && run("arenaEd.arena.pecas[1].a") === 90 && run("arenaEd.arena.pecas[1].h") > 0.8);
run("document.getElementById('arena-nome').value = 'nave mãe'; document.getElementById('arena-chao-tipo').value = 'espaco'; arenaLerCampos()");
check("trocar o chão já põe a cor dele", run("arenaEd.arena.chao.tipo") === "espaco" && run("arenaEd.arena.chao.cor") === "#1b1638");
run("salvarArenaDoEditor(); document.getElementById('modal-alert').style.display = 'none'");
check("SALVAR guarda e atualiza a fase", run(`getFaseDef('${id}').nome`) === "NAVE MÃE" && run(`getArenasCriadas()[0].pecas.length`) === 2);
run("fecharEditorArenas()");

// ---------- arquivo ----------
const exp = run(`JSON.stringify(dadosDaArenaParaArquivo(getArenasCriadas()[0]))`);
const r2 = run(`importarArenaDeTexto(${JSON.stringify(exp)})`);
check("exportar e anexar de volta: arena nova igual", !!r2.id && r2.id !== id && run(`JSON.stringify(getFaseDef('${r2.id}').arena.pecas) === JSON.stringify(getFaseDef('${id}').arena.pecas)`));
const errosArq = [
    ["não é JSON", "{", /JSON VÁLIDO/],
    ["arquivo de personagem", JSON.stringify({ formato: "saiyan-fight-personagem", versao: 1, personagem: {} }), /NÃO É DE ARENA/],
    ["sem nome", JSON.stringify({ formato: "saiyan-fight-arena", versao: 1, arena: { pecas: [] } }), /NOME DA ARENA/],
    ["peça errada", JSON.stringify({ formato: "saiyan-fight-arena", versao: 1, arena: { nome: "X", pecas: [{ t: "foguete" }] } }), /PEÇA DESCONHECIDA \[foguete\]/],
    ["chão errado", JSON.stringify({ formato: "saiyan-fight-arena", versao: 1, arena: { nome: "X", chao: { tipo: "gelatina" } } }), /TIPO DE CHÃO DESCONHECIDO/]
];
for (const [nome, texto, re] of errosArq) check(`erro claro: ${nome}`, re.test(run(`importarArenaDeTexto(${JSON.stringify(texto)}).erro`) || ""));

// ---------- 7 arenas: telas cabem ----------
for (let i = 0; i < 6; i++) run(`importarArenaDeTexto(${JSON.stringify(exemplo)})`);
check("no máximo 7 arenas criadas", run("getArenasCriadas().length") === 7 && /LIMITE DE 7/.test(run(`importarArenaDeTexto(${JSON.stringify(exemplo)}).erro`)));
const cabe = (fn) => run(`(() => { const rs = STAGE_PROGRESSION.map((s, i) => ${fn}(i));
    return rs.every(r => r.x >= 0 && r.x + r.w <= canvas.width && r.y + r.h <= canvas.height) && !rs.some((a, i) => rs.some((b, j) => i < j && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)); })()`);
check("ARENAS: os cards de 18 fases cabem sem se sobrepor", cabe("getStageCardRect"));
check("RANKING: as abas de 18 fases cabem sem se sobrepor", cabe("getRankingStageTabRect") && run("getRankingStageTabRect(17).y + getRankingStageTabRect(17).h") < 160 + run("getRankingFaseDesvio()") - 10);
run("setGameState('stages')"); h.calls.length = 0; run("render()");
check("a tela ARENAS desenha com as arenas criadas", h.calls.filter(c => c[0] === "fillText" && c[1][0] === "NAVE MÃE").length >= 1);
run(`showSystemConfirm = (t, m, cb) => cb(); arenaEd = null; abrirEditorArenas('${id}'); excluirArenaDoEditor(); fecharEditorArenas()`);
check("EXCLUIR tira a arena da lista de fases", !run(`getFaseDef('${id}')`) && run("getArenasCriadas().length") === 6);

// ---------- esfera e idiomas ----------
run("setGameState('menu'); esferaAberta = true");
const it = run("getEsferaItens().editorArenas");
run(`handleMenuClick(${it.x + it.w / 2}, ${it.y + it.h / 2})`);
check("a esfera abre o EDITOR DE ARENAS", run("arenaEditorAberto()") === true);
run("fecharEditorArenas(); trocarIdioma('en')");
check("nomes das peças traduzidos", run("T('PAREDE DE METAL COM JANELAS OVAIS')") === "METAL WALL WITH OVAL WINDOWS" && run("T('PEÇAS: 3 / 80')") === "PIECES: 3 / 80");
run("trocarIdioma('pt')");

process.exit(summary());
