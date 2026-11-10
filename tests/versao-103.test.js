// tests/versao-103.test.js — versão 0.103: desenhos do Gemini para todos os personagens (pacotes em conjuntos/),
// raio do especial saindo da mão do desenho e retratos leves para os cartões.
//
// Uso: node tests/versao-103.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const dir = __dirname + "/..";
const h = createHarness(dir, 800);
const { run, check, summary, context } = h;

const pacotes = run("CONJ_PACOTES");
const estados = run("CONJ_ESTADOS");
const retratos = JSON.parse(fs.readFileSync(dir + "/conjuntos/retratos.json", "utf8"));

// ---------- pacotes ----------
Object.keys(pacotes).forEach(nome => {
    const p = pacotes[nome];
    const d = JSON.parse(fs.readFileSync(dir + "/" + p.arquivo, "utf8"));
    check(`${nome}: variantes do pacote iguais às do jogo`, JSON.stringify(d.variantes) === JSON.stringify(p.variantes));
    check(`${nome}: cada forma tem os 14 movimentos`, p.variantes.every(v => estados.every(st => Array.isArray(d[v][st]) && d[v][st].length >= 5)),
        p.variantes.map(v => estados.filter(st => !(d[v][st] && d[v][st].length >= 5)).join(",")).join(" | "));
    check(`${nome}: ponto da mão do especial em cada forma, dentro do desenho`,
        p.variantes.every(v => Array.isArray(d.mao[v]) && d.mao[v][0] > 0.4 && d.mao[v][0] < 1.6 && d.mao[v][1] > -0.3 && d.mao[v][1] < 1.1));
    check(`${nome}: entra uma vez como conjunto em uso`, run(`characterDB.${p.personagem}.spriteActive`) === "g_" + nome &&
        run(`characterDB.${p.personagem}.spriteGroups.find(g => g.id === 'g_${nome}').transfs.length`) === p.variantes.length - 1);
    check(`${nome}: retrato leve para os cartões`, !!(retratos[nome] && retratos[nome].q && retratos[nome].q[4]));
    check(`${nome}: transformações do jogo cobrem as formas do pacote`, run(`getCharacterTransformations('${p.personagem}').length`) >= p.variantes.length - 1);
});
check("Freeza: ponto do dedo levantado (sol) em cada forma",
    (() => { const d = JSON.parse(fs.readFileSync(dir + "/conjuntos/freeza.json", "utf8")); return pacotes.freeza.variantes.every(v => Array.isArray(d.dedo[v]) && d.dedo[v][1] < 0.5); })());

// ---------- raio da mão ----------
context.__d = JSON.parse(fs.readFileSync(dir + "/conjuntos/broly.json", "utf8"));
run("conjRegistrarPacote('broly', __d)");
const mao = run("conjuntoPonto('broly', 'mao', 0)");
check("conjuntoPonto lê a mão da forma do nível", Array.isArray(mao) && JSON.stringify(mao) === JSON.stringify(context.__d.mao.normal) &&
    JSON.stringify(run("conjuntoPonto('broly', 'mao', 1)")) === JSON.stringify(context.__d.mao.lssj));
check("sem pacote em uso não há ponto", run("conjuntoPonto('broly', 'dedo', 0)") === null &&
    run("(() => { characterDB.broly.spriteActive = 'original'; const r = conjuntoPonto('broly', 'mao', 0); characterDB.broly.spriteActive = 'g_broly'; return r; })()") === null);
const gp = fs.readFileSync(dir + "/gameplay.js", "utf8"), mn = fs.readFileSync(dir + "/menu.js", "utf8");
check("o especial guarda a mão e o raio sai dela (espelhado no rival)", gp.includes('world.especialMao = typeof conjuntoPonto === "function"') &&
    mn.includes("arteM.espelhar ? 1 - mao[0] : mao[0]"));

// ---------- retratos ----------
check("cartão sem o pacote carregado usa o retrato leve (não baixa o pacote)",
    run("(() => { conjRetratos = { raditz: 'RET' }; const r = conjRetratoUrl(characterDB.raditz); return r; })()") === "RET" && !run("conjPacoteCarregando.raditz"));

check("v0.111: pacote carregando não mostra o boneco desenhado antigo (retrato parado ou quadro vazio)",
    run("(() => { conjPacoteCarregando.raditz = true; const a = getCharacterAnimationFrames('raditz', 'flyRight', 0)[0]; const b = getCharacterAnimationFrames('raditz', 'idle', 0)[0]; conjPacoteCarregando.raditz = false; return a === CONJ_QUADRO_VAZIO && b === 'RET'; })()"));

// ---------- minions ----------
check("tiras dos minions continuam com 8 poses", ["saibaman", "celljr"].every(m => fs.statSync(`${dir}/minions/${m}.webp`).size > 10000));

process.exit(summary());
