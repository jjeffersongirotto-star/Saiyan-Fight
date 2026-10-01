// tests/transformacoes.test.js — várias transformações por personagem (aba TRANSFORMAÇÃO do editor): cada uma
// guarda só o que muda em relação ao personagem normal, é editada no próprio construtor, pode ser renomeada,
// reordenada e apagada; na luta, cada TRANSFORMAR com o ki cheio leva à próxima, com todos os movimentos.
//
// Uso: node tests/transformacoes.test.js

const fs = require("fs");
const sp = require("../sprites.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

// ---------- dados ----------
check("todo personagem começa com a Transformação 1 (a de sempre)", run(`getCharacterTransformations("piccolo").length === 1 && getCharacterTransformations("piccolo")[0].name === "Transformação 1"`));
check("o Goku já vem com a Transformação 2 (cabelo longo de Super Saiyajin)", run(`getCharacterTransformations("goku_adult")[1].diff.hairStyle`) === "ssj_longo");
check("a transformação guarda só o que muda", JSON.stringify(sp.spriteAppearanceDiff(sp.SPRITE_PRESETS.goku.appearance, Object.assign({}, sp.SPRITE_PRESETS.goku.appearance, { hairColor: "#ffe34d" }))) === '{"hairColor":"#ffe34d"}');
const html = fs.readFileSync(__dirname + "/../index.html", "utf8");
check("cabelo longo de Super Saiyajin é uma opção do campo CABELO", html.includes('<option value="ssj_longo">'));
check("editor tem a aba TRANSFORMAÇÃO com o botão +", html.includes('id="tab-btn-transformacao"') && html.includes('onclick="addTransformation()"'));

// ---------- editor: + abre o construtor, concluir guarda só a diferença ----------
run(`openModal("vegeta"); switchEditorTab("transformacao");`);
check("abre com a lista do personagem", run("tempTransformations.length") === 1);
run(`addTransformation();`);
check("+ adiciona 'Transformação 2' e abre no construtor", run("tempTransformations[1].name") === "Transformação 2" && run("currentEditorTab") === "construtor" && run("editingTransformIndex") === 1);
check("a nova começa igual ao personagem normal", run(`document.getElementById("build-hair-style").value`) === "vegeta");
run(`document.getElementById("build-hair-style").value = "ssj_longo"; document.getElementById("build-hair-color").value = "#ffe34d"; finishTransformationEdit();`);
check("concluir guarda só o cabelo e a cor", JSON.stringify(run("tempTransformations[1].diff")) === '{"hairStyle":"ssj_longo","hairColor":"#ffe34d"}');
check("e o construtor volta ao personagem normal", run(`document.getElementById("build-hair-style").value`) === "vegeta" && run("editingTransformIndex") === null);
run(`tempTransformations[1].name = "Super Vegeta"; moveTransformation(1, -1);`);
check("dá para renomear e mudar a ordem", run("tempTransformations[0].name") === "Super Vegeta");
run(`moveTransformation(0, 1); addTransformation(); finishTransformationEdit();`);
check("cada + numera em sequência", run("tempTransformations[2].name") === "Transformação 3");
run(`removeTransformation(2); executeSystemConfirm(true);`);
check("dá para apagar", run("tempTransformations.length") === 2);
run(`document.getElementById("char-name").value = "VEGETA"; saveCharacterFromModal();`);
h.step(2);
check("salvar guarda as transformações no personagem", run(`characterDB.vegeta.transformations && characterDB.vegeta.transformations.length`) === 2);

// ---------- luta: uma depois da outra ----------
run(`selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; gameMode = "singleplayer"; startGame();`);
run(`player.ki = player.maxKi; triggerAction("transform", player, false);`);
check("1º TRANSFORMAR com ki cheio: Transformação 1", run("getTransformLevel(player)") === 1);
run(`triggerAction("transform", player, false);`);
check("sem encher o ki de novo não passa para a próxima", run("getTransformLevel(player)") === 1);
run(`player.ki = player.maxKi; triggerAction("transform", player, false);`);
check("ki cheio de novo: Transformação 2", run("getTransformLevel(player)") === 2 && run("player.ki") === 0);
check("Transformação 2 tem todos os movimentos com o cabelo novo", run(`SUB_ANIM_KEYS.every(st => { const f = getCharacterAnimationFrames("goku_adult", st, 2); return f.length > 0 && f[0] !== getCharacterAnimationFrames("goku_adult", st, 1)[0]; })`));
check("o bônus não acumula ao transformar de novo durante o poder extra", run("player.speed") === 5.5);
run(`player.ki = player.maxKi;`);
check("na última transformação, apertar de novo não faz nada", run("transformPlayer(player, false)") === false);
run(`player.transformPowerTimer = 1; updateTransformPower(player, false, 1/60);`);
check("acabou o poder extra: volta a velocidade normal e continua transformado", run("player.speed") === 4.5 && run("getTransformLevel(player)") === 2);
run(`startGame();`);
check("luta nova começa sem transformação", run("getTransformLevel(player)") === 0);
check("personagem sem transformação visível (Piccolo) usa os quadros normais", run(`getCharacterAnimationFrames("piccolo", "idle", 1)[0] === getCharacterAnimationFrames("piccolo", "idle", 0)[0]`));
check("a aura de cada transformação vem da lista", run(`getTransformationAura("goku_adult", 2)`) === "amarelo");

process.exit(summary());
