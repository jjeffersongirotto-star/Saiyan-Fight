// tests/idiomas.test.js — versão 0.82: Opções > IDIOMAS (português, inglês e espanhol). Percorre as telas nos
// três idiomas e confere que nenhum texto em português ficou para trás; nomes de personagens e de golpes não mudam.
//
// Uso: node tests/idiomas.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

check("começa em português", run("idiomaAtual") === "pt" && run("T('JOGAR')") === "JOGAR");

// ---------- botão IDIOMAS em Opções ----------
run("setGameState('options_main')");
const bt = run("MENU_LAYOUT.optionsMain.language");
run(`handleMenuClick(${bt.x + 10}, ${bt.y + 10})`);
check("OPÇÕES tem o botão IDIOMAS, que abre a escolha", run("gameState") === "options_language");
h.calls.length = 0; run("render()");
const desenhados = () => h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("a tela mostra PORTUGUÊS (marcado), ENGLISH e ESPAÑOL", ["✓ PORTUGUÊS", "ENGLISH", "ESPAÑOL"].every(t => desenhados().includes(t)));
const en = run("MENU_LAYOUT.optionsLanguage[1]");
run(`handleMenuClick(${en.x + 10}, ${en.y + 10})`);
check("tocar em ENGLISH troca o idioma e fica salvo", run("idiomaAtual") === "en" && run("readStorage('saiyan_idioma')") === "en");

// ---------- percorre as telas ----------
const telas = [
    "setGameState('menu')", "setGameState('mode_select')", "setGameState('options_main')", "setGameState('options_controls')",
    "setGameState('options_pc')", "setGameState('options_touch')", "setGameState('options_gamepad')", "setGameState('options_audio')",
    "setGameState('options_tracks')", "setGameState('controls_test')", "setGameState('ranking')", "setGameState('achievements')",
    "setGameState('database')", "setGameState('stages')", "abrirPainelArena('terra'); arenaPainel.pos = 3", "arenaPainel = null", "setGameState('stage_map'); stageChoicePendingId = 'terra'",
    "stageChoicePendingId = null; abrirTelaPersonagens(null)", "infoPersonagemKey = 'freeza_1'",
    "infoPersonagemKey = null; abrirTelaPersonagens('solo')", "gameMode = 'singleplayer'; selecaoLuta = null; startGame(); update(1/60)",
    "pauseGame()", "setGameState('playing'); player.hp = 0; triggerGameOver()", "setGameState('stage_victory')",
    "startTutorial()", "advanceTutorialStep()", "advanceTutorialStep()", "advanceTutorialStep()"
];
function textosEm(idioma) {
    run(`trocarIdioma('${idioma}')`);
    const todos = new Set();
    for (const t of telas) { h.calls.length = 0; run(t); run("render()"); desenhados().forEach(x => todos.add(x)); }
    run("setGameState('menu'); gameMode = 'singleplayer'");
    return [...todos];
}
// palavras que só existem em português (TECLADO, TOQUE, PARA... também são espanhol)
const PT = /ÇÃO|ÇÕES|ÕES|VOCÊ|JOGADOR|CONQUISTA|PERSONAGE|SELEÇÃO| DO | DA | NO | OU | COM |ONDA |PASSO|SETA |CARREGAR|NENHUM|VOLTAR|SAIR |ESCOLHA|PONTUAÇÃO/;
for (const idioma of ["en", "es"]) {
    const textos = textosEm(idioma);
    const sobrou = textos.filter(t => PT.test(t) && run(`T(${JSON.stringify(t)})`) === t);
    check(`${idioma}: nenhum texto em português nas telas`, sobrou.length === 0, sobrou.slice(0, 6).join(" | "));
    check(`${idioma}: nomes de personagens e de golpes continuam os mesmos`, ["GOKU", "VEGETA", "FREEZA", "ANDROIDE 17"].every(n => textos.includes(n)) &&
        run("T('KAMEHAMEHA') === 'KAMEHAMEHA' && T('FINAL FLASH') === 'FINAL FLASH' && T('GOLDEN FREEZA') === 'GOLDEN FREEZA'"));
}
run("trocarIdioma('en')");
check("inglês: exemplos de adaptação", run("T('SAIR PARA MENU')") === "QUIT TO MENU" && run("T('PASSO 2/7: ATAQUE DE KI')") === "STEP 2/7: KI ATTACK" &&
    run("T('ONDA 3 — DIFÍCIL')") === "WAVE 3 — HARD" && run("T('PARRY')") === "PARRY");
run("trocarIdioma('es')");
check("espanhol: exemplos de adaptação", run("T('SAIR PARA MENU')") === "SALIR AL MENÚ" && run("T('FEIJÃO MÁGICO')") === "SEMILLA DEL ERMITAÑO" &&
    run("T('Deseja selecionar FREEZA para:')") === "¿Seleccionar a FREEZA como:");
check("botão com texto mais longo diminui a letra para caber (não passa da borda)", run("typeof drawBtn") === "function" && /measureText\(text\)\.width > w - 10/.test(require("fs").readFileSync(__dirname + "/../menu.js", "utf8")));
run("trocarIdioma('pt')");
check("voltar para português devolve os textos originais", run("T('JOGAR')") === "JOGAR" && run("readStorage('saiyan_idioma')") === "pt");
check("as notas antigas do UPDATES não são traduzidas", /lista-updates/.test(require("fs").readFileSync(__dirname + "/../idiomas.js", "utf8")));

process.exit(summary());
