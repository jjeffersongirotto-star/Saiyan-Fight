// tests/versao-088.test.js — versão 0.88: retrato do vilão na forma escolhida, ranking com tempo total e golpes
// sofridos, porte "minion" no construtor, e as arenas Plataforma Celestial e Capital do Oeste (3D em órbita).
//
// Uso: node tests/versao-088.test.js

const core = require("../game-logic-core.js");
const sp = require("../sprites.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- retrato na forma escolhida ----------
run("abrirPainelArena('kame'); arenaPainel.vilao = { key: 'freeza_1', nivel: 4 }");
run("window.__formas = []; const __orig = drawFormPortrait; drawFormPortrait = function (src) { window.__formas.push(src); return __orig.apply(this, arguments); }");
run("setGameState('stages'); render()");
check("quadro da arena desenha o vilão na forma escolhida (não a base)", run("window.__formas.length") > 0 && run("window.__formas[0] === getCharacterAnimationFrames('freeza_1', 'idle', 4)[0]"));
run("arenaPainel = null; setGameState('menu')");

// ---------- ranking ----------
check("tempo da partida formatado", core.formatarTempoPartida(75) === "1:15" && core.formatarTempoPartida(3725) === "1:02:05" && core.formatarTempoPartida(0) === "0:00");
run("writeStorage('saiyan_ranking', ''); writeStorage('saiyan_stage_ranking', '')");
run("gameMode = 'singleplayer'; selectedStage = 'kame'; startGame(); gameplayClock += 95; runStats.hitsReceived = 3; score = 12; triggerGameOver()");
const geral = run("readJsonStorage('saiyan_ranking', [])")[0];
check("ranking guarda pontuação, tempo total e golpes sofridos", geral.score === 12 && geral.tempo === 95 && geral.golpes === 3);
check("ranking da fase também", run("getStageRankingList('kame')[0].golpes") === 3);
run("setGameState('ranking'); rankingViewMode = 'geral'");
h.calls.length = 0; run("render()");
const linhas = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("linha mostra SCORE, TEMPO e GOLPES (a ordem continua pela pontuação)", linhas.some(t => /SCORE: 12  -  TEMPO: 1:35  -  GOLPES: 3/.test(t)));
check("partida antiga sem tempo mostra —", run("textoLinhaRanking(0, { score: 5, date: 'x' })").includes("TEMPO: —"));
check("abas do ranking por fase cabem e não se sobrepõem", run(`(() => { const rs = STAGE_PROGRESSION.map((s, i) => getRankingStageTabRect(i));
    return rs.every(r => r.x >= 0 && r.x + r.w <= canvas.width) && !rs.some((a, i) => rs.some((b, j) => i < j && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)); })()`));
run("setGameState('menu')");

// ---------- porte minion ----------
run("setBuilderFormFromAppearance(SPRITE_PRESETS.goku.appearance); document.getElementById('build-race').value = 'Minion'; escolherRaca()");
check("escolher a raça Minion já põe o porte minion", run("document.getElementById('build-build').value") === "minion");

// ---------- arenas novas ----------
for (const [id, cena] of [["plataforma_celestial", "pcCena"], ["capital_oeste", "coCena"]]) {
    check(`${id}: está nas fases, com música e conquista próprias`, run(`!!getFaseDef('${id}') && !!BGM_THEMES[getStageMusicEra('${id}')] && !!achievements.stage_${id}`));
    run(`selectedStage = '${id}'; world.stageScrollX = 0`);
    h.calls.length = 0; run("drawStageBackground()");
    check(`${id}: cenário desenha sem erro e volta a câmera ao normal`, h.calls.length > 20 && run("trCam === TR_CAM"));
    const antes = run(`${cena}.passo`);
    run(`world.stageScrollX = getFaseDef('${id}').camera.volta / 4; drawStageBackground()`);
    check(`${id}: andar gira a câmera em volta (camada refeita no ângulo novo)`, run(`${cena}.passo`) !== antes);
}
check("ARENAS: os 11 cartões cabem na tela", run("STAGE_PROGRESSION.every((s, i) => { const r = getStageCardRect(i); return r.x >= 0 && r.x + r.w <= canvas.width && r.y + r.h <= canvas.height; })"));
check("TRILHAS: as 11 linhas cabem na tela", run("STAGE_PROGRESSION.every((s, i) => { const r = getTrackRowRect(i); return r.x + r.w <= canvas.width && r.y + r.h <= canvas.height; })"));

process.exit(summary());
