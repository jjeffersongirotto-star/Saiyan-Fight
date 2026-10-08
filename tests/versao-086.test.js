// tests/versao-086.test.js — versão 0.86: arenas "soltas" (um arquivo por arena na pasta fases/, com a cópia
// embutida FASES_PADRAO) e o quadro da arena em ARENAS: FASE (troca de lugar com a fase que estava na posição),
// PERSONAGEM (vilão + forma) e MINION.
//
// Uso: node tests/versao-086.test.js

const fs = require("fs");
const path = require("path");
const core = require("../game-logic-core.js");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- arquivos da pasta fases/ ----------
const dir = path.join(__dirname, "..", "fases");
const indice = JSON.parse(fs.readFileSync(path.join(dir, "indice.json"), "utf8"));
check("um arquivo por arena, listados no indice.json", indice.length === core.FASES_PADRAO.length && core.FASES_PADRAO.every(f => indice.includes(f.id + ".json")));
const iguais = core.FASES_PADRAO.every(f => {
    const arq = JSON.parse(fs.readFileSync(path.join(dir, f.id + ".json"), "utf8"));
    delete arq.versao;
    return JSON.stringify(arq) === JSON.stringify(f);
});
check("cada arquivo é igual à cópia embutida (FASES_PADRAO)", iguais);
check("as conquistas das arenas batem com os arquivos", core.FASES_PADRAO.every(f => run(`achievements.stage_${f.id}.name`) === f.conquista.nome && run(`achievements.stage_${f.id}.desc`) === f.conquista.desc));
check("músicas dos arquivos existem", core.FASES_PADRAO.every(f => run(`!!BGM_THEMES['${f.musica}']`)));

// ---------- ordem e troca de lugar (puro) ----------
const ordem = core.FASES_PADRAO.map(f => f.id);
const trocada = core.trocarPosicaoFase(ordem, "time_room", 2);
check("pôr a fase 7 na posição 2 troca de lugar com a 2 (as outras ficam)", trocada[1] === "time_room" && trocada[6] === "terra" && trocada.filter((id, i) => id !== ordem[i]).length === 2);
check("ordem salva com id faltando/sobrando não quebra", core.ordenarFases(core.FASES_PADRAO, ["kaio", "nao_existe"]).map(f => f.id).join() === ["kaio"].concat(ordem.filter(id => id !== "kaio")).join());
check("fase com NORMAL completo continua liberada em qualquer posição", core.isStageUnlockedByProgress("kaioshin", { kaioshin: { normalDone: true } }) === true);

// ---------- arquivo de fase aplicado em cima da cópia embutida ----------
check("arquivo com cor inválida ou id desconhecido é ignorado", run(`(() => { const antes = getFaseDef('namek').cor; aplicarArquivoDeFase({ id: 'namek', cor: 'azul' }); return getFaseDef('namek').cor === antes && aplicarArquivoDeFase({ id: 'nao_existe', nome: 'X' }) === false; })()`));
check("posição vinda do arquivo reordena as fases", run(`(() => { const n = atualizarFasesDosArquivos([{ id: 'kaio', posicao: 0.5 }]); const ok = n === 1 && STAGE_PROGRESSION[0].id === 'kaio'; atualizarFasesDosArquivos([{ id: 'kaio', posicao: 3 }]); return ok && STAGE_PROGRESSION[2].id === 'kaio'; })()`));

// ---------- quadro da arena ----------
const prog = {}; core.FASES_PADRAO.forEach(f => prog[f.id] = { normalDone: true });
run(`stageProgress = ${JSON.stringify(prog)}; gameMode = 'singleplayer'; selectedBoss = 'vegeta'; setGameState('stages')`);
const iTempo = run("STAGE_PROGRESSION.findIndex(s => s.id === 'time_room')");
const card = run(`getStageCardRect(${iTempo})`);
run(`handleMenuClick(${card.x + 20}, ${card.y + 20})`);
check("tocar na arena abre o quadro com FASE = posição atual, vilão padrão e minion padrão", run("arenaPainel.pos") === iTempo + 1 && run("arenaPainel.vilao.key") === "vegeta" && run("arenaPainel.minion") === "saibaman");
h.calls.length = 0; run("render()");
const textos = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("quadro mostra FASE, PERSONAGEM, MINION, SALVAR e CANCELAR", ["FASE", "PERSONAGEM", "MINION", "SALVAR", "CANCELAR", "SAIBAMAN"].every(t => textos.includes(t)));
const L = run("MENU_LAYOUT.arenaPainel");
const clicar = (r) => run(`handleMenuClick(${r.x + 5}, ${r.y + 5})`);
for (let i = 0; i < iTempo + 1 - 2; i++) clicar(L.faseMenos);   // 7 -> 2
check("◀ desce o número da fase", run("arenaPainel.pos") === 2);
clicar(L.minionMais);
check("▶ do minion troca para o Cell Jr.", run("arenaPainel.minion") === "celljr");
clicar(L.cancelar);
check("CANCELAR não muda nada", run("arenaPainel") === null && run("STAGE_PROGRESSION[1].id") === "terra" && run("getMinionDaFase('time_room')") === "saibaman");

run(`handleMenuClick(${card.x + 20}, ${card.y + 20})`);
for (let i = 0; i < iTempo + 1 - 2; i++) clicar(L.faseMenos);
clicar(L.minionMais);
clicar(L.salvar);
check("SALVAR: a Sala do Tempo vira a fase 2 e o Torneio vai para a posição dela", run("STAGE_PROGRESSION[1].id") === "time_room" && run(`STAGE_PROGRESSION[${iTempo}].id`) === "terra");
check("a ordem fica salva no aparelho", JSON.parse(h.store["saiyan_ordem_fases"])[1] === "time_room");
check("o minion da fase fica salvo e é o usado na luta", run("getMinionDaFase('time_room')") === "celljr" && run("selectedStage = 'time_room', getMinionKind()") === "celljr");
check("Torneio de Cell usa Cell Jr. por padrão; as outras, Saibaman", run("getMinionDaFase('cell_games')") === "celljr" && run("getMinionDaFase('namek')") === "saibaman");
run("loadStageProgress()");
check("ao recarregar, a ordem salva é aplicada de novo", run("STAGE_PROGRESSION[1].id") === "time_room");
run("salvarOrdemFases(FASES_PADRAO.map(f => f.id))");

process.exit(summary());
