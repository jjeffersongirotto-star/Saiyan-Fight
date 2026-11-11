// tests/versao-119.test.js — v0.119: (1) nenhum quadro de pacote traz duas figuras do lutador (havia 8 quadros cortados
// com a pose vizinha junto: em campo parecia ter 2 Vegetas por um instante); (2) a Zenkai do rival no VERSUS dá um
// instante de invulnerabilidade que ACABA (antes o rival ficava meio transparente até o fim da partida).
//
// Uso: node tests/versao-119.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const dir = __dirname + "/..";
const h = createHarness(dir, 800);
const { run, check, summary } = h;

// ---------- quadros com duas figuras (medido pela largura: uma figura dupla é bem mais larga que as do movimento) ----------
const pacotes = run("CONJ_PACOTES");
const largos = [];
for (const n of Object.keys(pacotes)) for (const v of pacotes[n].variantes) {
    const d = JSON.parse(fs.readFileSync(dir + "/" + pacotes[n].pasta + v + ".json", "utf8"));
    for (const st in d[v]) {
        if (st === "special") continue;   // o disparo do especial tem o brilho esticado para a frente
        const ws = d[v][st].map(q => q[2]).sort((a, b) => a - b), med = ws[Math.floor(ws.length / 2)];
        d[v][st].forEach((q, i) => { if (q[2] > med * 1.75 && q[2] > 100) largos.push(`${n}/${v} ${st} ${i}`); });
    }
}
check("nenhum quadro com a pose vizinha junto (figura dupla)", largos.length === 0, largos.join(", "));
const vegetaSsj = JSON.parse(fs.readFileSync(dir + "/conjuntos/vegeta/ssj.json", "utf8")).ssj.idle;
check("Vegeta SSJ parado: o 2º quadro tem uma figura só, no mesmo lugar dos outros", vegetaSsj[1][2] < 60 && Math.abs((vegetaSsj[1][0] + vegetaSsj[1][2] / 2) - (vegetaSsj[0][0] + vegetaSsj[0][2] / 2)) < 8);

// ---------- Zenkai do rival ----------
run(`gameMode = "coop"; selectedCharacter = "goku_adult"; selectedBoss = "vegeta"; startGame(); deltaTime = 1/60;
     player2.hp = 0; attemptZenkaiRevival(player2);`);
check("rival volta com 1 de vida e fica invulnerável por um instante", run("player2.hp === 1 && player2.invulnerableTimer > 0"));
run("world.obstacles.push({ x: player2.x + player2.w / 2, y: player2.y + player2.h / 2, radius: 6, vx: 0, vy: 0, fromPlayer: true, damage: 1 }); update(1/60)");
check("enquanto invulnerável o tiro não tira vida", run("player2.hp === 1"));
run("for (let i = 0; i < 120; i++) update(1/60)");
check("depois do instante, a invulnerabilidade acaba (não fica transparente para sempre)", run("player2.invulnerableTimer === 0 && !(player2.invulnerableTimer % 4 >= 2)"));

process.exit(summary());
