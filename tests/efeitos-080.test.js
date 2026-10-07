// tests/efeitos-080.test.js — versão 0.80: auras, escudo e tiros animados com as imagens enviadas pelo jogador
// (efeitos/*.png, quadros lado a lado).
//
// Uso: node tests/efeitos-080.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const ef = run("EFEITOS");
const tam = (nome) => { const b = fs.readFileSync(__dirname + "/../efeitos/" + nome + ".png"); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
check("cada efeito tem a imagem com os quadros lado a lado do tamanho anotado", Object.keys(ef).every(n => { const [w, hh] = tam(n); return w === ef[n].w * ef[n].n && hh === ef[n].h; }));
const total = Object.keys(ef).reduce((s, n) => s + fs.statSync(__dirname + "/../efeitos/" + n + ".png").size, 0);
check("as imagens dos efeitos são leves (menos de 1,2 MB juntas)", total < 1.2 * 1024 * 1024);
check("cores de aura com animação: verde, azul, amarela e vermelha (normal e forte)",
    ["verde", "azul", "amarelo", "vermelho"].every(c => run(`AURA_EFEITOS['${c}'].every(n => !!EFEITOS[n])`)));
check("0.81: a aura roxa (Freeza) voltou à labareda desenhada", run("!AURA_EFEITOS.roxo && !EFEITOS.aura_roxa") === true);
check("tiro vermelho/rosa, laranja e amarelo usam a animação; ciano continua desenhado",
    run("getTiroEfeito('#ff0055')") === "tiro_vermelho" && run("getTiroEfeito('#ff8800')") === "tiro_laranja" &&
    run("getTiroEfeito('#ffd000')") === "tiro_amarelo" && run("getTiroEfeito('#00ffff')") === null);
check("o quadro da animação anda com o tempo e volta ao começo", run("efeitoQuadro('aura_verde', 0)") === 0 &&
    run("efeitoQuadro('aura_verde', 0.041)") === 1 && run("efeitoQuadro('aura_verde', 7 * 0.04)") === 0);
check("sem a imagem carregada, nada quebra (fica o desenho de sempre)", run("(() => { const im = efeitoImagens.aura_azul; efeitoImagens.aura_azul = { complete: false }; const r = desenharEfeito('aura_azul', 0, 0, 0, 10, 10); efeitoImagens.aura_azul = im; return r; })()") === false);
const menu = fs.readFileSync(__dirname + "/../menu.js", "utf8");
check("as imagens são criadas uma vez só, fora do desenho de cada quadro", (menu.match(/new Image\(\); im\.src = "efeitos\//g) || []).length === 1);

process.exit(summary());
