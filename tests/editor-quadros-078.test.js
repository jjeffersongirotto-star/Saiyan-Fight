// tests/editor-quadros-078.test.js — versão 0.78: DUPLICAR acrescenta no destino, CLONAR põe a cópia no fim, um
// contorno só no quadro escolhido, segurar e arrastar muda a ordem, cadeado de repetição (editor, prévia e luta),
// sair da edição volta ao conjunto fechado e o Vegeta dos sprites com o mesmo tamanho em todos os movimentos.
//
// Uso: node tests/editor-quadros-078.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary, context } = h;

const alertas = [];
context.__alertas = alertas;
run("showSystemConfirm = (t, m, ok) => ok(); showSystemAlert = (t, m) => __alertas.push(m)");
run("openModal('goku_adult'); switchEditorTab('animacoes'); conjNovaForma()");
run("tempAnimations.idle = ['A','B','C']; tempAnimations.chargeKi = ['K1','K2']; tempAnimations.flyLeft = ['L1','L2','L3']; savedSpriteMotionPreviewFrames = {}");

// ---------- DUPLICAR acrescenta ----------
run("setActiveSpriteMovement('chargeKi'); stopSpriteMotionPreview(); selectedPreviewFrameIndices = new Set([1]); document.getElementById('sprite-mirror-target').value = 'flyLeft'; duplicateMovement()");
check("DUPLICAR põe o quadro no fim do destino sem apagar os que já estavam", run("getSpriteMotionPreviewFrames.call(null) && (savedSpriteMotionPreviewFrames.flyLeft || []).join(',')") === "L1,L2,L3,K2");

// ---------- CLONAR no fim ----------
run("setActiveSpriteMovement('idle'); selectedPreviewFrameIndices = new Set([0]); cloneSelectedPreviewFrame()");
check("CLONAR põe a cópia na última posição", run("getSpriteMotionPreviewFrames().join(',')") === "A,B,C,A" && run("spriteMotionPreviewFrame") === 3);

// ---------- um contorno só ----------
// o harness não esvazia a lista ao trocar o innerHTML: zera antes de cada desenho
const redesenhar = () => run("document.getElementById('sprite-assigned-frames').children = []; renderSpriteAssignedFrames()");
run("selectedPreviewFrameIndices = new Set([1])"); redesenhar();
const caixas = () => run("document.getElementById('sprite-assigned-frames').children.filter(c => c.className === 'sprite-assigned-frame')");
check("só a caixa do quadro tem contorno (a imagem dentro não tem outro)", (() => {
    const c = caixas();
    return c.length === 4 && c.filter(b => b.classList.contains("preview-selected")).length === 1 && c[1].classList.contains("preview-selected") &&
        c.every(b => !b.children[0].style.outline);
})());

// ---------- cadeado ----------
check("cada quadro tem o botão do cadeado", caixas().every(b => b.children.some(k => k.className && k.className.startsWith("sprite-trava"))));
run("alternarTravaQuadro(2)"); redesenhar();
check("cadeado marcado fica destacado", caixas()[2].children.find(k => k.className && k.className.startsWith("sprite-trava")).className.includes("ligada"));
run("alternarTravaQuadro(1)");
check("só um cadeado por movimento (marcar outro tira o anterior)", run("tempLoop.idle") === 1);
run("reorderSelectedPreviewFrame(1, 3)");
check("mudar a ordem leva o cadeado junto com o quadro", run("getSpriteMotionPreviewFrames().join(',')") === "A,C,A,B" && run("tempLoop.idle") === 3);
run("selectedPreviewFrameIndices = new Set([0]); deleteSelectedPreviewFrame()");
check("apagar um quadro antes dele mantém o cadeado no mesmo quadro", run("getSpriteMotionPreviewFrames().join(',')") === "C,A,B" && run("tempLoop.idle") === 2);

// prévia do editor: depois do último quadro volta para o travado
run("spriteMotionPreviewFrame = 2; var __int = null; setInterval = (f) => (__int = f, 1); startSpriteMotionPreview(); __int()");
check("prévia: depois do último volta para o quadro travado", run("spriteMotionPreviewFrame") === 2);
run("stopSpriteMotionPreview()");

// ---------- arrastar ----------
redesenhar();
const evt = (x) => `({ pointerType: 'mouse', clientX: ${x}, clientY: 10, shiftKey: false, preventDefault() {}, stopPropagation() {} })`;
run(`(() => {
    const caixas = document.getElementById('sprite-assigned-frames').children.filter(c => c.className === 'sprite-assigned-frame');
    document.elementFromPoint = (x) => { const b = caixas[Math.floor(x / 50)]; return b ? { closest: () => b } : null; };
    caixas[0].listeners.pointerdown[0](${evt(10)});
    quadroArrasteMover(60, 10); quadroArrasteMover(110, 10);
    quadroArrasteSoltar();
})()`);
check("segurar e arrastar o 1º quadro até o 3º muda a posição dele", run("getSpriteMotionPreviewFrames().join(',')") === "A,B,C" && run("tempLoop.idle") === 1);

// ---------- salvar a forma guarda o cadeado; a luta usa ----------
run("document.getElementById('conj-salvar-como').value = 'base'; conjSalvarForma()");
check("a forma salva guarda o cadeado", run("conjTemp.formas[conjTemp.formas.length - 1].loop.idle") === 1);
run(`conjNovaForma(); tempAnimations.idle = ['T1']; document.getElementById('conj-salvar-como').value = '1'; conjSalvarForma();
     conjTemp.formas.forEach(f => conjMarcar(f.id, true)); conjAgrupar(); conjTemp.ativo = conjTemp.grupos[0].id; conjPersistir()`);
const quadro = (t) => run(`(() => { let s = null; getOrCacheGameplayImage = (src) => (s = src); getCharacterAnimationFrame('goku_adult', 'idle', 99, 0, ${t}); return s; })()`);
check("na luta: 1ª volta inteira, depois repete do quadro travado", [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12].map(quadro).join(",") === "A,B,C,B,C,B");
check("movimento novo (tempo do movimento zerado) começa do 1º de novo", quadro(0) === "A");
check("o desenho da luta conta o tempo desde que o lutador entrou no movimento", fs.readFileSync(__dirname + "/../menu.js", "utf8").includes("p.animTimer - p.movimentoDesde"));

// ---------- sair da edição: volta ao conjunto fechado ----------
const gid = run("conjTemp.grupos[0].id");
run(`conjAbrirGrupo('${gid}'); conjEditarForma(conjTemp.grupos[0].base)`);
run("tempAnimations.idle = ['MUDOU']; conjCancelarForma()");
check("sair sem salvar: conjunto fechado e sem mudanças", run("conjGrupoAberto") === null && run("conjQuadrosDaForma(conjTemp.formas.find(f => f.id === conjTemp.grupos[0].base), 'idle')[0]") === "A");
run(`conjAbrirGrupo('${gid}'); conjEditarForma(conjTemp.grupos[0].base); tempAnimations.idle = ['NOVO']; document.getElementById('conj-salvar-como').value = 'base'; conjSalvarForma()`);
check("salvando: conjunto fechado e com as mudanças", run("conjGrupoAberto") === null && run("conjQuadrosDaForma(conjTemp.formas.find(f => f.id === conjTemp.grupos[0].base), 'idle')[0]") === "NOVO");
run(`conjAbrirGrupo('${gid}'); conjEditarForma(conjTemp.grupos[0].base); tempAnimations.idle = ['FECHOU']; closeModal(); openModal('goku_adult')`);
check("fechar o editor no meio descarta a forma e reabre com o conjunto fechado", run("conjGrupoAberto") === null && !run("conjEstaEditando()") &&
    run("conjQuadrosDaForma(conjTemp.formas.find(f => f.id === conjTemp.grupos[0].base), 'idle')[0]") === "NOVO");
check("pacote carregado também atualiza a imagem da aba DADOS", run("(() => { let n = 0; const u = updateModalPreview; updateModalPreview = () => n++; conjAoMudar(); updateModalPreview = u; return n; })()") === 1);
run("closeModal()");

// ---------- Vegeta: mesmo tamanho ----------
const pacote = JSON.parse(fs.readFileSync(__dirname + "/../conjuntos/vegeta.json", "utf8"));
context.__pacote = pacote;
const largura = (st) => Number(decodeURIComponent(run(`conjEmbrulharQuadro(__pacote, __pacote.ssj['${st}'][5], '${st}')`)).match(/<image[^>]* width="([\d.]+)"/)[1]) / pacote.ssj[st][5][2];
check("fim da transformação e voo na diagonal reduzidos para o tamanho do Vegeta parado", largura("transform") < largura("idle") * 0.92 && largura("flyUpRight") < largura("idle") * 0.92);
check("parado, ataque e parry ficam como estavam", Math.abs(largura("attackKi") - largura("idle")) < 0.01 && Math.abs(largura("parry") - largura("idle")) < 0.01);
const pes = (st) => { const m = decodeURIComponent(run(`conjEmbrulharQuadro(__pacote, __pacote.ssj['${st}'][5], '${st}')`)).match(/<image[^>]* y="([\d.-]+)"[^>]* height="([\d.]+)"/); return Number(m[1]) + Number(m[2]); };
check("transformação reduzida continua com os pés no chão (linha 103)", Math.abs(pes("transform") - pes("idle")) < 2);

process.exit(summary());
