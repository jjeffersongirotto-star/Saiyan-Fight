// tests/versao-081.test.js — versão 0.81: vilão de sprites virado para o herói, seleção antes da luta (VERSUS um
// jogador por vez), ANTI-HERÓI/VILÃO na aba VILÕES, tela PERSONAGENS com o "i", vilão que não trava no canto,
// metades da tela no VERSUS, escudo maior que a aura, aura roxa desenhada, cadeados do Vegeta e o Trunks de teste.
//
// Uso: node tests/versao-081.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const core = require("../game-logic-core.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- vilão patrulhando: nunca fica preso no limite ----------
const b = { x: 680, y: 260, vy: 2 };
core.stepVilaoPatrulha(b, 1, 1, () => 0.5);
const y1 = b.y;
for (let i = 0; i < 30; i++) core.stepVilaoPatrulha(b, 1, 1, () => 0.5);
check("vilão passado do limite de baixo volta para dentro e continua subindo", y1 <= 220 && b.y < y1 - 20);
const xs = new Set();
let seq = 0; const rnd = () => { seq = (seq * 9301 + 49297) % 233280; return seq / 233280; };
const c = { x: 680, y: 150, vy: 2 };
for (let i = 0; i < 1200; i++) { core.stepVilaoPatrulha(c, 1, 1, rnd); xs.add(Math.round(c.x / 40)); }
check("vilão anda pela metade dele da arena (não fica só no canto)", xs.size >= 3 && c.x >= core.VILAO_PATRULHA.minX && c.x <= core.VILAO_PATRULHA.maxX);
check("quadro longo (dt grande) não deixa o vilão fora dos limites", (() => { const d = { x: 600, y: 215, vy: 2 }; core.stepVilaoPatrulha(d, 40, 1, () => 0.5); return d.y <= 220 && d.vy < 0; })());

// ---------- VERSUS: cada jogador na sua metade ----------
run("gameMode = 'coop'; selecaoLuta = null; startGame(); player.x = 700; player2.x = 20; update(1/60)");
check("VERSUS: jogador 1 só vai até o meio da tela", run("player.x + player.w") <= 400.5);
check("VERSUS: jogador 2 só vai até o meio vindo da direita", run("player2.x") >= 400);
run("gameMode = 'singleplayer'; setGameState('menu')");

// ---------- tela PERSONAGENS (menu): só ver ----------
run("currentTab = 'HERÓIS'; setGameState('menu')");
const pers = run("MENU_LAYOUT.main.characters");
run(`handleMenuClick(${pers.x + 5}, ${pers.y + 5})`);
check("menu abre PERSONAGENS só para ver (sem seleção)", run("gameState") === "characters" && run("selecaoLuta") === null);
h.calls.length = 0; run("render()");
const textos = () => h.calls.filter(k => k[0] === "fillText").map(k => String(k[1][0]));
check("título da tela é PERSONAGENS e cada cartão tem o \"i\"", textos().includes("PERSONAGENS") && textos().filter(t => t === "i").length >= 5);
const antesH = run("selectedCharacter");
const card1 = run("getCharacterCardRect(1)");
run(`handleMenuClick(${card1.x + card1.w / 2}, ${card1.y + card1.h / 2})`);
check("tocar no cartão não seleciona: abre o quadro das formas", run("selectedCharacter") === antesH && run("infoPersonagemKey") === run("getFilteredCharacters()[1]") && run("document.getElementById('modal-alert').style.display") !== "flex");
run("infoPersonagemKey = 'cell'"); h.calls.length = 0; run("render()");
check("quadro do \"i\": forma base e todas as transformações com o nome em cima",
    ["FORMA BASE", "SEMI-PERFEITO", "PERFEITO"].every(n => textos().includes(n)) && run("getCharacterFormsList('cell').length") === 3);
run("handleMenuClick(400, 200)");
check("tocar de novo fecha o quadro", run("infoPersonagemKey") === null);
const back = run("MENU_LAYOUT.back");
run(`handleMenuClick(${back.x + 5}, ${back.y + 5})`);
check("← volta ao menu", run("gameState") === "menu");

// ---------- singleplayer: fase → modo → SELEÇÃO DE PERSONAGEM → LUTAR ----------
run("gameMode = 'singleplayer'; setGameState('stage_map'); stageChoicePendingId = 'terra'");
run("handleMenuClick(400 - 270 + 85, 140 + 30)");
check("escolher o modo da fase abre a SELEÇÃO DE PERSONAGEM antes da luta", run("gameState") === "characters" && run("selecaoLuta") === "solo");
h.calls.length = 0; run("render()");
check("a seleção tem o título SELEÇÃO DE PERSONAGEM e o botão LUTAR", textos().includes("SELEÇÃO DE PERSONAGEM") && textos().includes("LUTAR!"));
// aba VILÕES: vilão de cadastro → ANTI-HERÓI / VILÃO / CANCELAR
run("currentTab = 'VILÕES'; charactersScrollY = 0");
const viloes = run("getFilteredCharacters()");
const iFreeza = viloes.indexOf("freeza_1");
run("selectedBoss = 'vegeta'");
let r = run(`getCharacterCardRect(${iFreeza})`);
run(`handleMenuClick(${r.x + r.w / 2}, ${r.y + r.h / 2})`);
check("vilão na aba VILÕES pergunta: ANTI-HERÓI, VILÃO ou CANCELAR",
    JSON.stringify(run("systemChoiceOptions.map(o => o.label)")) === JSON.stringify(["ANTI-HERÓI", "VILÃO", "CANCELAR"]) &&
    String(run("document.getElementById('modal-alert-msg').innerText")).includes("FREEZA para:"));
run("executeSystemChoice(0)");
check("ANTI-HERÓI: você joga com o Freeza", run("selectedCharacter") === "freeza_1");
run(`handleMenuClick(${r.x + r.w / 2}, ${r.y + r.h / 2})`);
run("executeSystemChoice(1)");
check("VILÃO: o Freeza vira o inimigo", run("selectedBoss") === "freeza_1");
const iA17 = viloes.indexOf("android17");
r = run(`getCharacterCardRect(${iA17})`);
run(`handleMenuClick(${r.x + r.w / 2}, ${r.y + r.h / 2})`);
check("anti-herói de cadastro na aba VILÕES só tem VILÃO e CANCELAR", JSON.stringify(run("systemChoiceOptions.map(o => o.label)")) === JSON.stringify(["VILÃO", "CANCELAR"]));
run("executeSystemChoice(1)");
check("CANCELAR não muda nada", run("selectedBoss") === "freeza_1" && run("selectedCharacter") === "freeza_1");
run("selectedCharacter = 'vegeta'; saveSelectedCharacters()");
const lutar = run("MENU_LAYOUT.characters.fight");
run(`handleMenuClick(${lutar.x + 5}, ${lutar.y + 5})`);
check("LUTAR começa a partida na fase escolhida", run("gameState") === "playing" && run("selectedStage") === "terra" && run("selecaoLuta") === null);

// ---------- vilão de sprites espelhado ----------
check("Vegeta com o conjunto de sprites conta como personagem de sprites; Goku do construtor não",
    run("characterDB.vegeta.spriteActive = 'g_vegeta'; lutadorDeSprites('vegeta')") === true && run("lutadorDeSprites('goku_adult')") === false);
check("espelhado, o voo troca de lado (para a esquerda usa o voo para a frente)", run("trocarLadoDoMovimento('flyLeft')") === "flyRight" && run("trocarLadoDoMovimento('flyUpRight')") === "flyUpLeft" && run("trocarLadoDoMovimento('idle')") === "idle");
run("selectedBoss = 'vegeta'; player2.actionState = 'idle'; h0 = 0");
h.calls.length = 0; run("drawPlayerEntity(player2, characterDB.vegeta, true)");
check("o vilão de sprites é desenhado espelhado (olhando para o herói)", h.calls.some(k => k[0] === "scale" && k[1][0] === -1));
run("selectedCharacter = 'vegeta'");
h.calls.length = 0; run("drawPlayerEntity(player, characterDB.vegeta, false)");
check("o herói não é espelhado", !h.calls.some(k => k[0] === "scale" && k[1][0] === -1));
run("setGameState('menu')");

// ---------- VERSUS: JOGADOR 1 e depois JOGADOR 2 ----------
run("setGameState('mode_select')");
const coop = run("MENU_LAYOUT.modeSelect.coop");
run(`handleMenuClick(${coop.x + 10}, ${coop.y + 10})`);
check("VERSUS abre a escolha do JOGADOR 1", run("gameState") === "characters" && run("selecaoLuta") === "p1");
h.calls.length = 0; run("render()");
check("título mostra JOGADOR 1", textos().some(t => t.includes("JOGADOR 1")));
const todos = run("getFilteredCharacters()");
const iPic = todos.indexOf("piccolo");
r = run(`getCharacterCardRect(${iPic})`);
run(`handleMenuClick(${r.x + r.w / 2}, ${r.y + r.h / 2}); executeSystemConfirm(true)`);
check("depois do JOGADOR 1 escolher, aparece a escolha do JOGADOR 2", run("selectedCharacter") === "piccolo" && run("selecaoLuta") === "p2" && run("gameState") === "characters");
const iCell = run("getFilteredCharacters()").indexOf("cell");
r = run(`getCharacterCardRect(${iCell})`);
run(`handleMenuClick(${r.x + r.w / 2}, ${r.y + r.h / 2}); executeSystemConfirm(true)`);
check("JOGADOR 2 escolheu: a luta começa", run("selectedBoss") === "cell" && run("gameState") === "playing");
run("gameMode = 'singleplayer'; setGameState('menu')");

// ---------- escudo maior que a aura desenhada ----------
const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");
check("escudo usa a área real da aura desenhada (auraCaixa) e cobre a esfera visível", menu.includes("p.auraCaixa || p.auraForma") && menu.includes("bubbleRadius / ESCUDO_FRACAO_VISIVEL"));
run("gameMode = 'singleplayer'; startGame(); player.shield = true; player.isCharging = true; for (let i = 0; i < 40; i++) render()");
const caixa = run("player.auraCaixa"), forma = run("player.auraForma");
check("auraCaixa existe e nunca é menor que a forma usada no parry", caixa && Math.max(caixa.rx, caixa.ry) >= Math.max(forma.rx, forma.ry) - 0.01);
run("setGameState('menu')");

// ---------- aura roxa e cadeados do Vegeta ----------
check("aura roxa (Freeza) volta à labareda desenhada", run("!AURA_EFEITOS.roxo") === true && !fs.existsSync(__dirname + "/../efeitos/aura_roxa.png"));
const pacote = JSON.parse(fs.readFileSync(__dirname + "/../conjuntos/vegeta.json", "utf8"));
h.context.__pacote = pacote;
run("conjRegistrarPacote('vegeta', __pacote)");
check("Vegeta: transformar tem cadeado no 1º quadro já transformado (3º)", run("conjTravaDaForma({ pacote: 'vegeta', variante: 'normal' }, 'transform')") === 2 && run("conjTravaDaForma({ pacote: 'vegeta', variante: 'ssj' }, 'transform')") === 2);
check("Vegeta: carregar tem cadeado no antepenúltimo quadro (fazendo força)", run("conjTravaDaForma({ pacote: 'vegeta', variante: 'normal' }, 'chargeKi')") === 3 && run("conjTravaDaForma({ pacote: 'vegeta', variante: 'ssj' }, 'chargeKi')") === 3);
check("depois da 1ª volta o carregar não volta ao quadro em pé do começo", [6, 7, 8, 9, 10, 11, 12].every(t => core.getLoopFrameIndex(t, 6, 3) >= 3));

// ---------- Trunks de teste ----------
run("characterDB.teste_trunks = Object.assign({}, characterDB.goku_adult, { name: 'TRUNKS DO FUTURO', builderAppearance: Object.assign({}, characterDB.goku_adult.builderAppearance) }); writeStorage('saiyan_trunks_teste_081', '0'); apagarTrunksDeTeste081()");
check("o TRUNKS DO FUTURO com visual do Goku sai do jogo", run("!characterDB.teste_trunks") === true && run("!!characterDB.trunks") === true);
run("characterDB.teste_trunks = Object.assign({}, characterDB.goku_adult, { name: 'TRUNKS DO FUTURO' }); apagarTrunksDeTeste081()");
check("a limpeza roda uma vez só", run("!!characterDB.teste_trunks") === true);

process.exit(summary());
