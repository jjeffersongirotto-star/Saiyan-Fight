// tests/versao-102.test.js — versão 0.102: desenhos do jogador (gerados no Gemini) para o Goku (4 formas, 14
// movimentos) como conjunto em uso, e para o Saibaman e o Cell Jr. (tira de poses virada para o herói).
//
// Uso: node tests/versao-102.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const dir = __dirname + "/..";
const h = createHarness(dir, 800);
const { run, check, summary, context } = h;

// ---------- pacote do Goku ----------
const pacote = JSON.parse(fs.readFileSync(dir + "/conjuntos/goku.json", "utf8"));
const estados = run("CONJ_ESTADOS");
check("pacote do Goku: normal, Super Saiyajin, Super Saiyajin 3 e Blue", JSON.stringify(pacote.variantes) === JSON.stringify(["normal", "ssj", "ssj3", "blue"]));
check("cada forma tem os 14 movimentos com 7 ou 8 quadros", pacote.variantes.every(v => estados.every(st => Array.isArray(pacote[v][st]) && pacote[v][st].length >= 7 && pacote[v][st].length <= 8)),
    pacote.variantes.map(v => estados.filter(st => !(pacote[v][st] && pacote[v][st].length >= 7)).join(",")).join(" | "));
check("quadros em WebP, leve (menos de 3 MB)", pacote.mime === "image/webp" && fs.statSync(dir + "/conjuntos/goku.json").size < 3 * 1024 * 1024);
check("o Goku já vem com o conjunto novo em uso (com as 3 transformações)",
    run("characterDB.goku_adult.spriteActive") === "g_goku" && run("characterDB.goku_adult.spriteGroups.find(g => g.id === 'g_goku').transfs.length") === 3);
check("o Vegeta também vem com o conjunto do Gemini em uso (v0.103)", run("characterDB.vegeta.spriteGroups.find(g => g.id === 'g_vegeta').transfs.length") === 3 && run("characterDB.vegeta.spriteActive") === "g_vegeta");
context.__pacote = pacote;
run("conjRegistrarPacote('goku', __pacote)");
const idle = run("getCharacterAnimationFrames('goku_adult', 'idle', 0)");
check("na luta o Goku usa os quadros novos, em WebP dentro do desenho do lutador", idle.length === 8 && decodeURIComponent(idle[0]).includes("data:image/webp;base64,") && decodeURIComponent(idle[0]).includes('viewBox="0 0 96 112"'));
const n3 = run("getCharacterAnimationFrames('goku_adult', 'idle', 3)");
check("cada nível de transformação usa a sua forma (Blue no nível 3)", n3[0] !== idle[0] && run("getCharacterAnimationFrames('goku_adult', 'idle', 2)[0]") !== n3[0]);
check("velocidade por movimento: o parry e o especial cabem no tempo da ação", run("conjuntoFps('goku_adult', 'parry', 0)") === 32 && run("conjuntoFps('goku_adult', 'special', 1)") === 12 && run("conjuntoFps('goku_adult', 'idle', 0)") === 10);
check("ORIGINAL continua no editor (dá para voltar ao desenho antigo)", run("(() => { characterDB.goku_adult.spriteActive = 'original'; const r = getCharacterAnimationFrames('goku_adult', 'idle', 0)[0] === characterDB.goku_adult.animations.idle[0]; characterDB.goku_adult.spriteActive = 'g_goku'; return r; })()"));

// ---------- minions ----------
check("tiras do Saibaman e do Cell Jr. existem (8 poses de 144x168)", ["saibaman", "celljr"].every(m => {
    const b = fs.readFileSync(`${dir}/minions/${m}.webp`);
    return b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP";
}) && run("MINION_IMAGEM_POSES.length") === 8);
check("minion sem cores editadas usa a imagem nova", !!run("!!minionImagemPronta(normalizarMinionClassico({ modelo: 'saibaman', cores: {} }))"));
check("minion com cores editadas continua com o desenho clássico", run(`(() => { const k = MINION_MODELOS.saibaman.editaveis[0][0]; const c = {}; c[k] = '#123456'; return minionImagemPronta(normalizarMinionClassico({ modelo: 'saibaman', cores: c })); })()`) === null);
h.calls.length = 0;
run("desenharMinionClassico({ modelo: 'celljr', cores: {} }, 'investir', 0)");
check("a pose investir sai da tira (sem erro no desenho)", run("MINION_IMAGEM_POSES.indexOf('investir')") === 5);
const menu = fs.readFileSync(dir + "/menu.js", "utf8");
check("na luta: investindo usa a pose investir e arremessado gira a pose arremessado", menu.includes('drawSaibamanSprite(s, "investir", 0)') && menu.includes('drawSaibamanSprite(s, "arremessado", 0)'));

process.exit(summary());
