// tests/versao-118.test.js — sprites sempre prontos na luta (v0.118):
// pacotes divididos por forma (conjuntos/<nome>/<forma>.json, o jogo baixa só as formas que usa); pixel art feita
// direto da imagem WebP (sem decodificar o SVG); herói e vilão sempre com a forma atual e a próxima prontas, a que
// sai é liberada; tela CARREGANDO antes da luta até tudo estar pronto (nunca carrega no meio da luta); com a
// resolução mudando no meio da luta, usa o quadro pronto em outro tamanho em vez de piscar.
//
// Uso: node tests/versao-118.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const dir = __dirname + "/..";
const h = createHarness(dir, 800);
const { run, check, summary } = h;

// ---------- arquivos: uma forma por arquivo ----------
const pacotes = run("CONJ_PACOTES");
check("cada forma de cada pacote tem o seu arquivo (e nenhum leva mais de 1,2 MB)", Object.keys(pacotes).every(n => pacotes[n].variantes.every(v => {
    const a = dir + "/" + pacotes[n].pasta + v + ".json";
    return fs.existsSync(a) && fs.statSync(a).size < 1.2 * 1024 * 1024 && JSON.parse(fs.readFileSync(a, "utf8")).forma === v;
})));
check("os pacotes inteiros (vários MB) saíram", Object.keys(pacotes).every(n => !fs.existsSync(dir + "/conjuntos/" + n + ".json")));

run(`var __urls = []; fetch = (u) => { __urls.push(u); return { then() { return { then() { return { catch() {} }; } }; } }; };`);
run(`conjCarregarPacote("freeza", "golden"); conjCarregarPacote("freeza", "golden");`);
check("baixa só o arquivo da forma pedida, uma vez", JSON.stringify(run("__urls")) === JSON.stringify(["conjuntos/freeza/golden.json?v=" + run("CONJ_VERSAO_ARQUIVOS")]));
run("delete conjPacoteCarregando['freeza/golden']; __urls.length = 0");

// ---------- formas por arquivo se juntam ----------
const vegeta = require("./harness.js").lerPacoteInteiro(dir, "vegeta");
h.context.__parte = JSON.parse(fs.readFileSync(dir + "/conjuntos/vegeta/ssj.json", "utf8"));
run(`conjRegistrarPacote("vegeta", __parte)`);
check("chegou só a forma SSJ: as outras continuam faltando", run("conjFormaCarregada('vegeta', 'ssj') && !conjFormaCarregada('vegeta', 'normal')"));
check("pedir os quadros de uma forma que falta baixa só ela", (run("getCharacterAnimationFrames('vegeta', 'flyRight', 0)[0] === CONJ_QUADRO_VAZIO"), JSON.stringify(run("__urls")) === JSON.stringify(["conjuntos/vegeta/normal.json?v=" + run("CONJ_VERSAO_ARQUIVOS")])));
h.carregarPacotes(["goku", "vegeta"]);
check("o ponto da mão de cada forma continua lá depois de juntar", run("JSON.stringify(conjPacoteDados.vegeta.mao.ssj)") === JSON.stringify(vegeta.mao.ssj));
check("cada quadro guarda a imagem WebP de origem (a luta não precisa decodificar o SVG)",
    run("(() => { const s = getCharacterAnimationFrames('goku_adult', 'idle', 0)[0]; const f = conjQuadroFonte.get(s); return !!(f && f.b64 && f.mime === 'image/webp' && f.w > 0); })()"));

// ---------- formas da luta: atual + próxima ----------
run(`selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; gameMode = "singleplayer"; aquecerLiberado = true;
     createImageBitmap = function () { return { then(ok) { ok(document.createElement("canvas")); } }; };`);
check("nos menus: herói e vilão com a forma normal e a primeira transformação",
    run("formasDaLutaNecessarias(false).map(k => k.join(':')).join(' ')") === "goku_adult:0 goku_adult:1 vegeta:0 vegeta:1");

// ---------- CARREGANDO antes da luta ----------
run("backgroundWork.warmedFor = null; startGame(); var __x = world.stageScrollX;");
check("a luta começa esperando os sprites (tela CARREGANDO)", run("world.carregandoLuta > 0"));
run("update(1/60); triggerAction('attack', player, false)");
check("enquanto carrega, nada anda e ninguém atira", run("world.stageScrollX === __x && world.obstacles.length === 0"));
run("for (let i = 0; i < 300 && world.carregandoLuta; i++) { runBackgroundWork(1e9); update(1/60); }");
check("com herói, vilão e próximas formas prontos, a luta começa", run("world.carregandoLuta === 0 && lutaPronta()"));
run("update(1/60)");
check("e a luta anda", run("world.stageScrollX > __x"));

// ---------- transformar: prepara a próxima, libera a que saiu ----------
const quadroSoDaBase = run(`(() => { const b = quadrosDaForma('goku_adult', 0), outros = new Set([...quadrosDaForma('goku_adult', 1), ...quadrosDaForma('goku_adult', 2)]);
    for (const s of b) if (!outros.has(s)) return s; return null; })()`);
check("a forma normal tem quadros só dela", !!quadroSoDaBase);
h.context.__q = quadroSoDaBase;
check("antes de transformar, a pixel art da forma normal está guardada", run("pixelSvgStubs.has(__q)"));
run("player.ki = player.maxKi; transformPlayer(player, false)");
check("transformou: já prepara a forma seguinte", run("formasPreparadas.has('goku_adult|2')"));
check("e libera a forma normal, que não volta mais nesta luta", !run("formasPreparadas.has('goku_adult|0')") && !run("pixelSvgStubs.has(__q)") && !run("conjQuadroFonte.get(__q).bmp"));
check("o vilão continua com a forma em que começa cada onda", run("formasPreparadas.has('vegeta|0') && formasPreparadas.has('vegeta|1')"));

// ---------- resolução mudou no meio da luta ----------
run("var __st = getPixelSvgStub(getCharacterAnimationFrames('vegeta', 'idle', 0)[0]); getPixelArtSource(__st, 77, 83); runBackgroundWork(1e9); var __pronta = getPixelArtSource(__st, 77, 83);");
check("quadro pronto no tamanho pedido", run("!!(__pronta && __pronta.w === 77 && __pronta.h === 83)"));
run("var __rs = renderScale; renderScale = __rs + 0.5; var __enquanto = getPixelArtSource(__st, 120, 129);");
check("resolução mudou e o tamanho novo ainda está montando: usa um pronto em outro tamanho (não pisca)", run("!!(__enquanto && __enquanto.w !== 120)"));
run("runBackgroundWork(1e9)");
check("quando o tamanho novo fica pronto, os da resolução antiga são liberados",
    run("(() => { const p = getPixelArtSource(__st, 120, 129), per = pixelArtCache.get(__st.__svgImage); return p && p.w === 120 && Object.keys(per).every(k => !per[k] || per[k].rs === renderScale); })()"));
run("renderScale = __rs");
check("na mesma resolução, o mesmo quadro guarda dois tamanhos (formas de alturas diferentes)",
    run("(() => { getPixelArtSource(__st, 90, 97); runBackgroundWork(1e9); getPixelArtSource(__st, 91, 98); runBackgroundWork(1e9); const per = pixelArtCache.get(__st.__svgImage); return !!(per['90x97'] && per['91x98']); })()"));

process.exit(summary());
