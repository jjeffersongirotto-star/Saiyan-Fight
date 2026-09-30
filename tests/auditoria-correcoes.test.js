// tests/auditoria-correcoes.test.js — correções da revisão geral do jogo:
// 1) co-op/versus: o jogador 2 derrotado ficava preso "morrendo" pra sempre (a partida travava);
// 2) parry do jogador 2: o golpe devolvido atravessava o jogador 1 e o ponto ia pro jogador 1;
// 3) parry sem tempo de espera: segurar/apertar sem parar rebatia tudo (agora parry que erra espera 0,5s);
// 4) editor: movimento com 1-2 quadros era completado com quadros do "parado" ao salvar (animação piscava);
// 5) editor: sem espaço no navegador, dizia "SALVO!" e o personagem sumia ao reabrir;
// 6) saibamans/itens/flutuação contavam por quadro — em telas de 120Hz apareciam 2x mais rápido;
// 7) excluir o personagem selecionado deixava a seleção apontando pra um personagem que não existe.
//
// Uso: node tests/auditoria-correcoes.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary, context } = h;

const semSpawns = "world.pickupSpawnTimer = -1e9; world.saibamanSpawnTimer = -1e9;";

// ---------- 1) co-op: jogador 2 derrotado volta ----------
run("gameMode = 'coop'; startGame(); " + semSpawns);
run("player2.hp = 0; advanceWave()");
check("co-op: jogador 2 derrotado entra na animação de derrota", run("player2.isDying") === true);
h.step(240);
check("co-op: depois de sair voando da tela, o jogador 2 volta pra luta (a partida não trava)", run("player2.isDying") === false && run("player2.hp") > 0);
check("co-op: ao voltar, o jogador 2 fica dentro da tela", run("player2.x") <= run("canvas.width - player2.w"));

// ---------- 2) parry do jogador 2 acerta o jogador 1 ----------
run("gameMode = 'coop'; startGame(); " + semSpawns + " score = 0");
run(`world.obstacles = [{ x: player2.x - 20, y: player2.y + player2.h / 2, radius: 8, vx: 7, vy: 0, isHoming: false, color: '#0ff', fromPlayer: true, damage: 1 }]`);
run("tryReflect(player2, true)");
check("co-op: golpe rebatido pelo jogador 2 passa a ser do jogador 2", run("world.obstacles[0].fromPlayer") === false);
check("co-op: o rebate do jogador 2 não dá ponto pro jogador 1", run("score") === 0);
run("player.y = player2.y; player.x = 80; player.invulnerableTimer = 0; player.shield = false");
const p1Antes = run("player.hp");
h.step(120);
check("co-op: o golpe rebatido pelo jogador 2 causa dano no jogador 1", run("player.hp") < p1Antes);

// ---------- 3) parry que erra tem tempo de espera; parry que acerta não ----------
run("gameMode = 'singleplayer'; stageMode = 'normal'; startGame(); " + semSpawns);
run("world.obstacles = []");
run("tryReflect(player, false)");   // erra (não há nada perto)
run(`world.obstacles = [{ x: player.x + player.w / 2, y: player.y + player.h / 2, radius: 8, vx: -5, vy: 0, fromPlayer: false, color: '#fff' }]`);
run("tryReflect(player, false)");   // logo em seguida: ainda em espera
check("parry logo depois de errar não rebate (tempo de espera)", run("world.obstacles[0].fromPlayer") === false);
run("world.obstacles = []");
h.step(31);
run(`world.obstacles = [{ x: player.x + player.w / 2, y: player.y + player.h / 2, radius: 8, vx: -5, vy: 0, fromPlayer: false, color: '#fff' }]`);
run("tryReflect(player, false)");
check("depois de 0,5s o parry volta a funcionar", run("world.obstacles[0].fromPlayer") === true);
run(`world.obstacles = [{ x: player.x + player.w / 2, y: player.y + player.h / 2, radius: 8, vx: -5, vy: 0, fromPlayer: false, color: '#fff' }]`);
run("tryReflect(player, false)");
check("parry que acerta não gera espera: dá pra rebater o golpe seguinte na hora", run("world.obstacles[0].fromPlayer") === true);

// ---------- 4) editor: não completa movimento com quadros do "parado" ----------
run("openModal(null); document.getElementById('char-name').value = 'TESTE QUADROS'; builderLastAppearance = null");
run("tempAnimations.idle = ['data:image/png;base64,PARADO']; tempAnimations.flyRight = ['data:image/png;base64,DIREITA']");
run("saveCharacterFromModal()");
const chaveTeste = run("Object.keys(characterDB).find(k => characterDB[k].name === 'TESTE QUADROS')");
check("editor: personagem é salvo", !!chaveTeste);
check("editor: movimento com 1 quadro continua com 1 quadro (não pisca com o 'parado')",
    JSON.stringify(run(`characterDB['${chaveTeste}'].animations.flyRight`)) === JSON.stringify(["data:image/png;base64,DIREITA"]));
check("editor: movimento vazio usa o 'parado' no jogo", run(`getCharacterAnimationFrames('${chaveTeste}', 'flyUp')[0]`) === "data:image/png;base64,PARADO");

// ---------- 5) editor: sem espaço no navegador avisa em vez de dizer SALVO ----------
const alertas = [];
context.__alertas = alertas;
run("var __alertaOriginal = showSystemAlert; showSystemAlert = (t, m) => __alertas.push(t)");
const setItemOriginal = context.localStorage.setItem;
context.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
run("openModal(null); document.getElementById('char-name').value = 'SEM ESPACO'; builderLastAppearance = null; tempAnimations.idle = ['data:image/png;base64,X']");
run("saveCharacterFromModal()");
context.localStorage.setItem = setItemOriginal;
run("showSystemAlert = __alertaOriginal");
check("sem espaço: avisa que não conseguiu salvar", alertas.includes("SEM ESPAÇO") && !alertas.includes("SUCESSO"), JSON.stringify(alertas));
check("sem espaço: o personagem não fica 'fantasma' na lista", !run("Object.values(characterDB).some(c => c.name === 'SEM ESPACO')"));

// ---------- 6) contagem por tempo: 120Hz não dobra saibamans/itens ----------
function spawnsEm(fps) {
    run("gameMode = 'singleplayer'; stageMode = 'normal'; startGame(); world.saibamanSpawnTimer = 0; world.pickupSpawnTimer = 0; var __s = 0, __p = 0");
    run("var __spawnS = spawnSaibaman, __spawnP = spawnPickup; spawnSaibaman = () => { __s++; }; spawnPickup = () => { __p++; }");
    run("player.invulnerableTimer = 1e9; player2.shootTimer = -1e9");
    for (let i = 0; i < fps * 30; i++) run(`update(1/${fps})`);
    const r = { s: run("__s"), p: run("__p") };
    run("spawnSaibaman = __spawnS; spawnPickup = __spawnP");
    return r;
}
const a60 = spawnsEm(60), a120 = spawnsEm(120);
check("30s a 60Hz e a 120Hz: mesma quantidade de saibamans", a60.s === a120.s, JSON.stringify({ a60, a120 }));
check("30s a 60Hz e a 120Hz: mesma quantidade de itens", a60.p === a120.p);

// ---------- 7) excluir o personagem selecionado escolhe outro ----------
run("setGameState('menu')");
const heroi = run("selectedCharacter");
run(`showSystemConfirm = (t, m, ok) => ok()`);
run("setGameState('database'); characterDatabaseScrollY = 0");
const alvo = run(`(() => { const layout = getDatabaseLayoutMetrics(); const keys = Object.keys(characterDB); const idx = keys.indexOf(selectedCharacter);
    const row = Math.floor(idx / layout.columns), col = idx % layout.columns;
    const cx = layout.gridLeft + col * (layout.cardWidth + layout.gapX), cy = layout.gridTop + row * (layout.cardHeight + layout.gapY);
    const g = getDatabaseCardGeometry(layout, cx, cy); return { x: g.firstBtnX + g.btnW + 10 + 2, y: g.actionY + 2 }; })()`);
run(`handleMenuClick(${alvo.x}, ${alvo.y})`);
check("o personagem selecionado foi excluído", !run(`!!characterDB['${heroi}']`));
check("depois de excluir, a seleção aponta pra um personagem que existe", run("!!characterDB[selectedCharacter]"));

run("setGameState('menu')");
process.exit(summary());
