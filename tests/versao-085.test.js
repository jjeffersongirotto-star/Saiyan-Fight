// tests/versao-085.test.js — versão 0.85: Ilha do Mestre Kame (1ª fase, 3D com a câmera dando a volta na casa),
// Piccolo anti-herói (aparece em VILÕES).
//
// Uso: node tests/versao-085.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

check("Ilha do Mestre Kame é a 1ª fase, com música própria", run("STAGE_PROGRESSION[0].id") === "kame" && run("getStageMusicEra('kame')") === "kame" && run("!!BGM_THEMES.kame"));
run("selectedStage = 'kame'; world.stageScrollX = 0");
h.calls.length = 0; run("drawStageBackground()");
const textos = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("o cenário desenha sem erro (mar, ilha guardada em camada)", h.calls.length > 20 && h.calls.some(c => c[0] === "drawImage"));
const antes = run("khCena.passo");
run(`world.stageScrollX = KAME_ISLAND_LAP_SCROLL / 4; drawStageBackground()`);
check("andar faz a câmera girar em volta da casa (a camada é refeita no ângulo novo)", run("khCena.passo") !== antes && run("khCena.passo") === Math.round(1440 / 4));
check("a câmera volta ao normal depois (não atrapalha a Sala do Tempo)", run("trCam === TR_CAM"));
check("camada da ilha só é refeita quando o ângulo muda", (() => { run("drawStageBackground()"); const p = run("khCena.passo"); run("drawStageBackground()"); return run("khCena.passo") === p; })());

run("currentTab = 'VILÕES'; gameMode = 'singleplayer'; selecaoLuta = 'solo'");
check("Piccolo é anti-herói e aparece em VILÕES", run("characterDB.piccolo.alignment") === "ANTI-HERÓI" && run("getFilteredCharacters()").includes("piccolo"));
run("currentTab = 'HERÓIS'");
check("e continua em HERÓIS", run("getFilteredCharacters()").includes("piccolo"));

process.exit(summary());
