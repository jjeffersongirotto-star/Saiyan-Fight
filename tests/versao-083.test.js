// tests/versao-083.test.js — versão 0.83: ALTURA dos personagens (cm) muda o tamanho na luta, com limites; cada
// transformação tem a sua (Freeza: 1ª forma pequena, 2ª bem alta, 3ª no meio); diagonais para trás do Vegeta
// de sprites usam o voo para trás.
//
// Uso: node tests/versao-083.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const core = require("../game-logic-core.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- escala da altura ----------
check("175 cm = tamanho normal", core.escalaDaAltura(175) === 1);
check("altura tem limite (nem gigante nem minúsculo)", core.escalaDaAltura(400) === core.ESCALA_ALTURA_MAX && core.escalaDaAltura(60) === core.ESCALA_ALTURA_MIN);
check("valor inválido no editor não quebra", core.normalizarAltura("") === null && core.normalizarAltura(9999) === 500 && core.normalizarAltura("164") === 164);

// ---------- alturas dos personagens ----------
const alt = (k, n) => run(`getAlturaPersonagem('${k}', ${n})`);
check("alturas oficiais: Goku 175, Vegeta 164, Piccolo 226, Gohan (criança) 155", alt("goku_adult", 0) === 175 && alt("vegeta", 0) === 164 && alt("piccolo", 0) === 226 && alt("gohan", 0) === 155);
check("Freeza: 1ª forma pequena, 2ª bem alta, 3ª menor que a 2ª e maior que a 1ª", alt("freeza_1", 0) < alt("freeza_1", 2) && alt("freeza_1", 2) < alt("freeza_1", 1) && alt("freeza_1", 0) === 132 && alt("freeza_1", 1) === 221);
check("Cell muda de altura nas formas; Broly Lendário 300 cm", alt("cell", 0) === 228 && alt("cell", 1) === 259 && alt("cell", 2) === 213 && alt("broly", 1) === 300);
check("transformação sem altura própria fica com a da forma normal", alt("goku_adult", 1) === 175);

// ---------- tamanho na luta ----------
run("selectedCharacter = 'piccolo'; selectedBoss = 'freeza_1'; gameMode = 'singleplayer'; stageMode = 'normal'; startGame(); update(1/60)");
const [gw] = run("getFighterBoxSize('goku_adult', 0)");
check("Piccolo é maior que o Goku na luta (proporção igual: largura e altura juntas)", run("player.w") > gw && Math.abs(run("player.w / player.h") - 52 / 56) < 1e-9);
const h0 = run("player2.h");
run("player2.isTransformed = true; player2.transformLevel = 1; window.__pes = player2.y + player2.h; update(1/60)");
check("Freeza cresce ao virar a 2ª forma, com os pés no mesmo lugar", run("player2.h") > h0 && Math.abs(run("player2.y + player2.h") - run("window.__pes")) < 6);
check("o vilão alto não passa do chão", (() => { for (let i = 0; i < 300; i++) run("update(1/60)"); return run("player2.y + player2.h") <= run("BOUNDS.PLAYER_MAX_Y_BASE + 56") + 0.5; })());
run("setGameState('menu')");

// ---------- editor ----------
const html = fs.readFileSync(__dirname + "/../index.html", "utf8");
check("o editor tem o campo ALTURA (cm)", /<label for="char-scale">Altura \(cm\)<\/label>/.test(html));
const db = fs.readFileSync(__dirname + "/../database.js", "utf8");
check("salvar grava a altura e cada transformação tem a sua", db.includes("altura: (charScale && normalizarAltura(charScale.value))") && db.includes('"Altura da transformação (cm)"'));
check("altura salva no personagem vale mais que a padrão", run("(() => { characterDB.vegeta.altura = 190; const a = getAlturaPersonagem('vegeta', 0); delete characterDB.vegeta.altura; return a; })()") === 190);
check("save antigo com escala vira altura equivalente", run("(() => { characterDB.__teste = Object.assign({}, characterDB.goku_adult, { scale: 1.2 }); const a = getAlturaPersonagem('__teste', 0); delete characterDB.__teste; return a; })()") === 210);

// ---------- Vegeta: diagonais para trás ----------
const pacote = JSON.parse(fs.readFileSync(__dirname + "/../conjuntos/vegeta.json", "utf8"));
h.context.__pacote = pacote;
run("conjRegistrarPacote('vegeta', __pacote)");
check("diagonais para trás do Vegeta usam o voo para trás (sem ficar de cabeça para baixo)",
    run("['normal', 'ssj'].every(v => ['flyUpLeft', 'flyDownLeft'].every(st => JSON.stringify(conjPacoteDados.vegeta[v][st]) === JSON.stringify(conjPacoteDados.vegeta[v].flyLeft)))") === true);

process.exit(summary());
