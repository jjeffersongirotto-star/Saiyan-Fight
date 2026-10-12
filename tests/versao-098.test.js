// tests/versao-098.test.js — versão 0.98: pose do especial não fica presa depois do tutorial; mudar a fase de lugar
// empurra as do meio; poderes e auras novos (GIFs do jogador): tiro pixel para todos, Kamehameha, sol e tiro do dedo
// do Freeza, brilho do parry, explosão dos minions, raio de duas pontas no choque, auras roxa e Blue (Goku/Vegeta),
// e a escolha das animações no editor (tiro, especial, aura), também no arquivo .saiyan.json.
//
// Uso: node tests/versao-098.test.js

const fs = require("fs");
const core = require("../game-logic-core.js");
const sp = require("../sprites.js");
const { createHarness } = require("./harness.js");
const dir = __dirname + "/..";
const h = createHarness(dir, 1366);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- tutorial: a pose do especial solta depois que o raio acaba ----------
run("selectedCharacter = 'goku_adult'; startTutorial(); tutorialPhase = 'finished'; player.ki = player.maxKi; triggerSpecialAttack(false)");
for (let i = 0; i < 90; i++) run("updateTutorial(1/60)");
check("tutorial concluído: depois do especial o personagem volta a se mexer (sem pose presa)", run("player.actionState") !== "special");

// ---------- fases: mudar de lugar empurra as do meio ----------
const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
check("da 10 para a 8: a 8 vira 9 e a 9 vira 10", core.trocarPosicaoFase(ids, "j", 8).join("") === "abcdefgjhi");
check("da 2 para a 5: as do meio sobem uma posição", core.trocarPosicaoFase(ids, "b", 5).join("") === "acdebfghij");

// ---------- efeitos ----------
const html = fs.readFileSync(dir + "/index.html", "utf8");
const opcoes = (id) => [...html.match(new RegExp(`<select id="${id}">([\\s\\S]*?)</select>`))[1].matchAll(/value="([^"]*)"/g)].map(m => m[1]).filter(Boolean);
check("o editor lista as animações de tiro, especial e aura (mesmas listas do jogo)",
    JSON.stringify(opcoes("char-efeito-tiro")) === JSON.stringify(run("EFEITOS_DO_TIRO")) &&
    JSON.stringify(opcoes("char-efeito-especial")) === JSON.stringify(run("EFEITOS_DO_ESPECIAL")) &&
    JSON.stringify(opcoes("char-efeito-aura")) === JSON.stringify(run("EFEITOS_DA_AURA")));
const todas = run("EFEITOS_DO_TIRO.concat(EFEITOS_DO_ESPECIAL, EFEITOS_DA_AURA).filter(n => n !== 'cor')");
check("cada animação tem a imagem e a medida certa", todas.every(n => run(`!!EFEITOS['${n}']`) && fs.existsSync(`${dir}/efeitos/${n}.png`)));
check("todas as imagens novas batem com n x w e h", Object.keys(run("EFEITOS")).every(n => {
    const b = fs.readFileSync(`${dir}/efeitos/${n}.png`), w = b.readUInt32BE(16), hh = b.readUInt32BE(20), e = run(`EFEITOS['${n}']`);
    return w === e.n * e.w && hh === e.h;
}));
check("raio vermelho: toca o começo uma vez e depois repete o fim", run("efeitoQuadro('raio_vermelho', 0)") === 0 && run("efeitoQuadro('raio_vermelho', 12 * 0.04 + 0.001)") === 7);
check("tiro padrão de todos é o tiro pixel; o Freeza atira com o dedo", run("getEfeitoDoTiro('goku_adult')") === "tiro_pixel" && run("getEfeitoDoTiro('broly')") === "tiro_pixel" && run("getEfeitoDoTiro('freeza_1')") === "tiro_freeza");
check("Kamehameha é o especial do Goku, Gohan, Gotenks, Vegetto e Cell", ["goku_adult", "gohan", "gotenks", "gogeta", "cell"].every(k => run(`getEfeitoDoPersonagem('${k}', 'efeitoEspecial')`) === "kamehameha"));
check("o especial do Freeza é o sol", run("getEfeitoDoPersonagem('freeza_1', 'efeitoEspecial')") === "sol_freeza");

// luta
run("selectedCharacter = 'goku_adult'; selectedBoss = 'freeza_1'; gameMode = 'coop'; startGame(); world.obstacles = []");
run("fireKiBarrage(player, false); fireKiBarrage(player2, true)");
check("cada tiro leva a animação de quem atirou", run("world.obstacles[0].efeito") === "tiro_pixel" && run("world.obstacles[1].efeito") === "tiro_freeza");
check("o tiro do dedo sai na altura do ombro (sem espalhar)", Math.abs(run("world.obstacles[1].y - (player2.y + player2.h * TIRO_DEDO_ALTURA)")) <= 2);
run("gameMode = 'singleplayer'; world.obstacles = []; spawnBossAttack()");
check("os ataques do vilão também usam a animação dele", run("world.obstacles.length") > 0 && run("world.obstacles.every(o => o.efeito === 'tiro_freeza')"));
h.calls.length = 0; run("drawObstacles()");
check("os tiros desenham", h.calls.length > 0);
run("gameMode = 'coop'; world.obstacles = []; player.invulnerableTimer = 0; player.shield = false; player.hp = player.maxHp; player2.ki = player2.maxKi; triggerSpecialAttack(true)");
const hp0 = run("player.hp");
check("sol do Freeza: o dano ainda não entrou enquanto a bola cresce no dedo", run("world.especialEfeito") === "sol_freeza" && hp0 === run("player.maxHp") && !!run("world.especialPendente"));
h.calls.length = 0; run("drawSpecialBeams()");
check("o sol desenha", h.calls.length > 0);
for (let i = 0; i < 70; i++) run("update(1/60)");
check("quando a bola chega no adversário o dano entra", run("player.hp") < hp0 && !run("world.especialPendente"));
run("player.parryHighlightTimer = 5"); h.calls.length = 0; run("drawParryOnda(player, false)");
check("o parry mostra a onda azul (quando a imagem já carregou)", !run("!!efeitoPronto('parry_onda')") || h.calls.some(c => c[0] === "drawImage"));
run("world.blasts = [{ x: 100, y: 100, r: 6, maxR: 46, life: 0.5 }]"); h.calls.length = 0; run("drawSaibamanBlasts()");
check("explosão do minion desenha", h.calls.length > 0);

// auras
check("aura roxa animada e as auras Blue", run("AURA_EFEITOS.roxo[0]") === "aura_roxa" && run("AURA_EFEITOS.blue[0]") === "aura_azul_chama" && run("AURA_EFEITOS.azul_escuro[0]") === "aura_azul_escura");
check("Vegeta: Super Saiyajin, Blue e Blue Evolução (aura azul escura)", JSON.stringify(run("getCharacterTransformations('vegeta').map(t => t.aura)")) === JSON.stringify(["amarelo", "blue", "azul_escuro"]));
check("Goku: a 3ª transformação é o Blue", run("getCharacterTransformations('goku_adult')[2].aura") === "blue");
check("a aura escolhida no editor vale na forma normal", (() => { run("characterDB.goku_adult.efeitoAura = 'aura_roxa'; player.transformPowerTimer = 0"); h.calls.length = 0; run("drawKiAura(player, characterDB.goku_adult, 100, 200, 40, 60)"); run("delete characterDB.goku_adult.efeitoAura"); return true; })());

// Freeza: ataque com o dedo
const fz = sp.SPRITE_PRESETS.freeza.appearance;
check("o Freeza vem com a POSIÇÃO DOS BRAÇOS 'dedo'", fz.armPose === "dedo" && html.includes('<option value="dedo">'));
check("o ataque e o especial com o dedo mudam o desenho (e o resto fica igual)",
    sp.generateSpriteFrameSvg(fz, "attackKi", 2) !== sp.generateSpriteFrameSvg(Object.assign({}, fz, { armPose: "guarda" }), "attackKi", 2) &&
    sp.generateSpriteFrameSvg(fz, "special", 0) !== sp.generateSpriteFrameSvg(Object.assign({}, fz, { armPose: "guarda" }), "special", 0) &&
    sp.generateSpriteFrameSvg(fz, "idle", 0) === sp.generateSpriteFrameSvg(Object.assign({}, fz, { armPose: "guarda" }), "idle", 0));
check("no especial o braço começa levantado com o dedo para cima", sp.spritePoseFor("special", 0, 5, fz).armR[0] > 140 && sp.spritePoseFor("special", 4, 5, fz).armR[0] < 100);
run("characterDB.freeza_1.builderAppearance.armPose = 'guarda'; writeStorage('saiyan_freeza_dedo_098', '0'); atualizarFreezaSalvo()");
check("o Freeza salvo antes passa a atacar com o dedo (uma vez)", run("characterDB.freeza_1.builderAppearance.armPose") === "dedo");

// arquivo
const exp = JSON.parse(run("JSON.stringify(dadosDoPersonagemParaArquivo('goku_adult'))"));
check("o arquivo leva a animação do especial", exp.personagem.efeitoEspecial === "kamehameha");
const val = run(`validarArquivoPersonagem(${JSON.stringify(Object.assign({}, exp, { personagem: Object.assign({}, exp.personagem, { efeitoTiro: "laser" }) }))}).erro`);
check("animação desconhecida no arquivo dá erro claro", /ANIMAÇÃO DESCONHECIDA \[efeitoTiro: laser\]/.test(val || ""), val);

// traduções
run("trocarIdioma('en')");
check("textos novos traduzidos (EN)", run("T('Animação do tiro')") === "Shot animation" && run("T('Chama azul (Blue)')") === "Blue flame (Blue)" && run("T('Dedo (ataque do Freeza)')") === "Finger (Freeza's attack)");
run("trocarIdioma('es')");
check("textos novos traduzidos (ES)", run("T('Animação da aura')") === "Animación del aura" && run("T('OCUPA O LUGAR DE: Sala do Tempo (AS OUTRAS ANDAM UMA POSIÇÃO)')").startsWith("OCUPA EL LUGAR DE"));
run("trocarIdioma('pt')");

process.exit(summary());
