// ==================== PROGRESS.JS - CONQUISTAS E RANKING ====================
// Extraído de database.js. Depende de storage.js (readJsonStorage/writeStorage)
// e chama playSound (audio.js) em tempo de execução.
// Carregar depois de storage.js e audio.js, antes de database.js.

let achievementBanner = { active: false, title: "", timer: 0, maxTimer: 180, yOffset: -60 };

// ==================== ESTATÍSTICAS ACUMULADAS (todas as partidas) ====================
// Conta coisas ao longo do tempo (não zera a cada partida, ao contrário de score/waveNumber). É contra isso
// que a maioria das conquistas é checada. bumpStat soma, salva e já roda a checagem de conquistas por limiar.
let stats = {
    gamesPlayed: 0, reflectsTotal: 0, transformsTotal: 0, superAttacksTotal: 0, beamClashesTotal: 0,
    zenkaiTotal: 0, versusWinsTotal: 0, maxParryCombo: 0, highScoreEver: 0,
    customCharactersCreated: 0, pickupsSenzu: 0, pickupsCapsule: 0, pickupsCloud: 0,
    pickupsStaff: 0, saibamansDefeated: 0, bossesDefeated: 0
};

function loadStats() {
    try {
        const parsed = readJsonStorage("saiyan_stats", null);
        if (parsed && typeof parsed === "object") Object.assign(stats, parsed);
    } catch (e) {
        console.warn("Erro ao carregar estatísticas:", e);
    }
}

function saveStats() {
    try {
        writeStorage("saiyan_stats", JSON.stringify(stats));
    } catch (e) {
        console.warn("Erro ao salvar estatísticas:", e);
    }
}

// amount pode ser negativo só pra "set" (ex.: maxParryCombo); o uso normal é somar contadores.
function bumpStat(key, amount = 1) {
    stats[key] = (stats[key] || 0) + amount;
    saveStats();
    checkThresholdAchievements();
    return stats[key];
}

// Igual bumpStat, mas para valores que só devem crescer (recordes) — nunca diminui.
function raiseStat(key, value) {
    if (value > (stats[key] || 0)) {
        stats[key] = value;
        saveStats();
        checkThresholdAchievements();
    }
    return stats[key];
}

// ==================== CONQUISTAS ====================
// Cada uma: nome, descrição e ou um limiar simples contra `stats` (statKey/threshold, checado automaticamente
// por checkThresholdAchievements) ou nenhum limiar (statKey ausente) — essas são destravadas na hora certa
// direto no código do jogo via unlockAchievement("chave"), quando um contador simples não é suficiente
// (ex.: "vença sem levar dano E terminar a fase", que depende de duas condições ao mesmo tempo).
let achievements = {
    // -- Combate: rebater (parry) --
    reflect_10: { name: "Mestre do Rebatimento", desc: "Rebata 10 projéteis de Ki", statKey: "reflectsTotal", threshold: 10, tier: "bronze" },
    reflect_50: { name: "Escudo Impenetrável", desc: "Rebata 50 projéteis de Ki ao todo", statKey: "reflectsTotal", threshold: 50, tier: "silver" },
    reflect_200: { name: "Parede de Ki", desc: "Rebata 200 projéteis de Ki ao todo", statKey: "reflectsTotal", threshold: 200, tier: "gold" },
    combo_3: { name: "Ritmo de Combate", desc: "Alcance um combo de 3 parries seguidos", statKey: "maxParryCombo", threshold: 3, tier: "bronze" },
    combo_6: { name: "Fluxo Perfeito", desc: "Alcance um combo de 6 parries seguidos", statKey: "maxParryCombo", threshold: 6, tier: "silver" },
    combo_10: { name: "Reflexos Saiyajin", desc: "Alcance um combo de 10 parries seguidos", statKey: "maxParryCombo", threshold: 10, tier: "gold" },
    // -- Combate: dano e sobrevivência --
    untouchable: { name: "Intocável", desc: "Faça 5 pontos sem tomar dano", tier: "bronze" },
    untouchable_wave5: { name: "Guerreiro Impecável", desc: "Alcance a onda 5 numa partida sem tomar dano", tier: "silver" },
    zenkai_first: { name: "Ressurreição Saiyajin", desc: "Use a ressurreição Zenkai pela primeira vez", statKey: "zenkaiTotal", threshold: 1, tier: "bronze" },
    zenkai_win: { name: "Do Limiar da Morte à Vitória", desc: "Vença uma partida do Versus depois de usar a Zenkai", tier: "silver" },
    saibaman_50: { name: "Exterminador de Saibamen", desc: "Derrote 50 Saibamen ao todo", statKey: "saibamansDefeated", threshold: 50, tier: "bronze" },
    saibaman_200: { name: "Praga dos Saibamen", desc: "Derrote 200 Saibamen ao todo", statKey: "saibamansDefeated", threshold: 200, tier: "silver" },
    // -- Transformação --
    ssj_transform: { name: "Super Saiyajin Supremo", desc: "Transforme-se em Super Saiyajin", tier: "bronze" },
    ssj_10: { name: "Fúria Dourada", desc: "Transforme-se 10 vezes ao todo", statKey: "transformsTotal", threshold: 10, tier: "silver" },
    ssj_boss: { name: "Poder Além dos Limites", desc: "Derrote um vilão estando transformado", tier: "silver" },
    // -- Especial e Super Ataque --
    special_first: { name: "Primeira Kamehameha", desc: "Use o ataque especial pela primeira vez", tier: "bronze" },
    super_attack_first: { name: "Força Amplificada", desc: "Use o Super Ataque (especial + bastão mágico)", statKey: "superAttacksTotal", threshold: 1, tier: "bronze" },
    super_attack_10: { name: "Poder Absoluto", desc: "Use o Super Ataque 10 vezes ao todo", statKey: "superAttacksTotal", threshold: 10, tier: "silver" },
    beam_clash_first: { name: "Choque de Titãs", desc: "Provoque um Choque de Feixes no Versus", statKey: "beamClashesTotal", threshold: 1, tier: "bronze" },
    beam_clash_5: { name: "Guerra de Kamehamehas", desc: "Provoque 5 Choques de Feixes ao todo", statKey: "beamClashesTotal", threshold: 5, tier: "silver" },
    // -- Itens --
    item_senzu_10: { name: "Sempre Bem Alimentado", desc: "Colete 10 Feijões Mágicos ao todo", statKey: "pickupsSenzu", threshold: 10, tier: "bronze" },
    item_capsule_10: { name: "Tecnologia da Corporação Cápsula", desc: "Colete 10 escudos ao todo", statKey: "pickupsCapsule", threshold: 10, tier: "bronze" },
    item_cloud_10: { name: "Piloto da Nuvem Voadora", desc: "Colete 10 Nuvens Voadoras ao todo", statKey: "pickupsCloud", threshold: 10, tier: "bronze" },
    item_staff_10: { name: "Guardião do Bastão Sagrado", desc: "Colete 10 Bastões Mágicos ao todo", statKey: "pickupsStaff", threshold: 10, tier: "bronze" },
    item_all_types: { name: "Colecionador de Namek", desc: "Colete os 4 tipos de item numa mesma partida", tier: "bronze" },
    // -- Ondas e pontuação --
    wave_5: { name: "Aquecendo os Motores", desc: "Alcance a onda 5", tier: "bronze" },
    wave_10: { name: "Guerreiro Experiente", desc: "Alcance a onda 10", tier: "silver" },
    wave_15: { name: "Elite Saiyajin", desc: "Alcance a onda 15", tier: "silver" },
    wave_20: { name: "Lenda Viva", desc: "Alcance a onda 20", tier: "gold" },
    wave_25: { name: "Deus da Destruição", desc: "Alcance a onda 25", tier: "gold" },
    score_10: { name: "Primeiros Pontos", desc: "Faça 10 pontos numa partida", tier: "bronze" },
    score_50: { name: "Caçador de Recompensas", desc: "Faça 50 pontos numa partida", tier: "silver" },
    score_100: { name: "Recorde Histórico", desc: "Faça 100 pontos numa partida", tier: "gold" },
    boss_defeat_10: { name: "Terror dos Vilões", desc: "Derrote 10 chefes ao todo", statKey: "bossesDefeated", threshold: 10, tier: "silver" },
    boss_defeat_50: { name: "Flagelo do Universo", desc: "Derrote 50 chefes ao todo", statKey: "bossesDefeated", threshold: 50, tier: "gold" },
    // -- Arenas (uma por fase, na ordem de STAGE_PROGRESSION) --
    stage_terra: { name: "Campeão do Torneio", desc: "Vença o modo NORMAL do Torneio de Artes Marciais", tier: "bronze" },
    stage_kaio: { name: "Treino nas Alturas", desc: "Libere a arena Planeta do Sr. Kaioh", tier: "bronze" },
    stage_namek: { name: "Visitante de Namek", desc: "Libere a arena Planeta Namek", tier: "bronze" },
    stage_namek_explosao: { name: "Fuga por um Triz", desc: "Libere a arena Namek Prestes a Explodir", tier: "silver" },
    stage_freeza_ship: { name: "Infiltrado na Nave", desc: "Libere a arena Nave de Freeza", tier: "silver" },
    stage_time_room: { name: "Um Ano em Um Dia", desc: "Libere a arena Sala do Tempo", tier: "silver" },
    stage_cell_games: { name: "Competidor dos Jogos de Cell", desc: "Libere a arena Torneio de Cell", tier: "gold" },
    stage_kaioshin: { name: "Entre os Deuses", desc: "Libere todas as fases (a última é o Planeta Supremo Kaioh)", tier: "gold" },
    hard_first: { name: "Desafio Aceito", desc: "Vença o modo DIFÍCIL de uma fase pela primeira vez", tier: "silver" },
    all_normal: { name: "Herói de Todas as Fases", desc: "Vença o modo NORMAL de todas as fases", tier: "gold" },
    all_hard: { name: "Mestre das Dificuldades", desc: "Vença o modo DIFÍCIL de todas as fases", tier: "gold" },
    // -- Versus (2 jogadores; internamente gameMode "coop") --
    versus_win_first: { name: "Duelo Vencido", desc: "Vença uma partida do Versus (melhor de 3)", statKey: "versusWinsTotal", threshold: 1, tier: "bronze" },
    versus_win_10: { name: "Rival Implacável", desc: "Vença 10 partidas do Versus", statKey: "versusWinsTotal", threshold: 10, tier: "silver" },
    // -- Construtor de personagens --
    builder_first: { name: "Criador de Guerreiros", desc: "Crie seu primeiro personagem no construtor", statKey: "customCharactersCreated", threshold: 1, tier: "bronze" },
    builder_5: { name: "Elenco Próprio", desc: "Crie 5 personagens no construtor", statKey: "customCharactersCreated", threshold: 5, tier: "silver" },
    builder_tail: { name: "Sangue Saiyajin", desc: "Crie um personagem com cauda", tier: "bronze" },
    builder_wings: { name: "Ser Alado", desc: "Crie um personagem com asas", tier: "bronze" },
    builder_weapon: { name: "Arsenal Lendário", desc: "Crie um personagem com arma nas costas", tier: "bronze" },
    // -- Progresso geral --
    games_5: { name: "Aquecendo os Punhos", desc: "Jogue 5 partidas ao todo", statKey: "gamesPlayed", threshold: 5, tier: "bronze" },
    games_20: { name: "Veterano de Batalhas", desc: "Jogue 20 partidas ao todo", statKey: "gamesPlayed", threshold: 20, tier: "silver" },
    games_50: { name: "Lenda do Torneio", desc: "Jogue 50 partidas ao todo", statKey: "gamesPlayed", threshold: 50, tier: "gold" },

    // Medalha de diamante: a última de todas — liberada sozinha quando todas as outras estiverem completas.
    all_achievements: { name: "Lenda Suprema", desc: "Complete todas as outras conquistas", tier: "diamond" }
};

// Roda depois de qualquer bumpStat: destrava toda conquista com statKey cujo limiar já foi atingido.
function checkThresholdAchievements() {
    for (const key in achievements) {
        const a = achievements[key];
        if (a.statKey && !a.unlocked && (stats[a.statKey] || 0) >= a.threshold) unlockAchievement(key);
    }
}

// Toda conquista tem uma medalha (bronze/prata/ouro, e diamante só para a de completar todas) de acordo com a dificuldade — checado uma vez ao carregar
// pra nunca ficar uma conquista sem medalha por engano numa edição futura.
const ACHIEVEMENT_TIERS = ["bronze", "silver", "gold", "diamond"];
for (const key in achievements) {
    if (!ACHIEVEMENT_TIERS.includes(achievements[key].tier)) {
        console.warn(`Conquista "${key}" sem medalha válida (tier).`);
    }
}

// Contagem de progresso por medalha, para o card no topo da tela de Conquistas — { gold: {done, total}, ... , total: {done, total} }.
function getAchievementTierProgress() {
    const progress = { diamond: { done: 0, total: 0 }, gold: { done: 0, total: 0 }, silver: { done: 0, total: 0 }, bronze: { done: 0, total: 0 }, total: { done: 0, total: 0 } };
    for (const key in achievements) {
        const a = achievements[key];
        const tier = ACHIEVEMENT_TIERS.includes(a.tier) ? a.tier : "bronze";
        progress[tier].total++;
        progress.total.total++;
        if (a.unlocked) { progress[tier].done++; progress.total.done++; }
    }
    return progress;
}

// ==================== ACHIEVEMENTS ====================
function loadAchievements() {
    try {
        let parsed = readJsonStorage("saiyan_badges", null);
        if (parsed && typeof parsed === "object") {
            for (let k in parsed) {
                if (achievements[k]) achievements[k].unlocked = parsed[k];
            }
        }
    } catch (e) {
        console.warn("Erro ao carregar achievements:", e);
    }
}

function saveAchievements() {
    try {
        let data = {};
        for (let k in achievements) {
            data[k] = achievements[k].unlocked;
        }
        writeStorage("saiyan_badges", JSON.stringify(data));
    } catch (e) {
        console.warn("Erro ao salvar achievements:", e);
    }
}

function unlockAchievement(key) {
    if (achievements[key] && !achievements[key].unlocked) {
        achievements[key].unlocked = true;
        saveAchievements();
        playSound("powerup");
        triggerAchievementPopup(achievements[key].name);
        checkAllAchievementsComplete();
    }
}

// Libera a medalha de diamante quando todas as outras conquistas já foram feitas.
function checkAllAchievementsComplete() {
    if (achievements.all_achievements.unlocked) return;
    const faltando = Object.keys(achievements).some(k => k !== "all_achievements" && !achievements[k].unlocked);
    if (!faltando) unlockAchievement("all_achievements");
}

// Conquistas dos modos de cada fase (stageProgress): 1ª vitória no DIFÍCIL, NORMAL em todas, DIFÍCIL em todas.
// Chamado ao vencer uma fase e ao abrir o jogo (assim quem já tinha esse progresso também ganha).
function checkStageModeAchievements() {
    const fases = STAGE_PROGRESSION.map(stg => stageProgress[stg.id] || {});
    if (fases.some(p => p.hardDone)) unlockAchievement("hard_first");
    if (fases.every(p => p.normalDone)) unlockAchievement("all_normal");
    if (fases.every(p => p.hardDone)) unlockAchievement("all_hard");
}

function triggerAchievementPopup(title) {
    achievementBanner = { active: true, title: title, timer: 0, maxTimer: 180, yOffset: -60 };
}

function saveRankingScore(newScore) {
    try {
        let ranking = readJsonStorage("saiyan_ranking", []);
        if (!Array.isArray(ranking)) ranking = [];
        ranking.push({ score: newScore, date: new Date().toLocaleDateString() });
        ranking.sort((a, b) => b.score - a.score);
        ranking = ranking.slice(0, 5);
        writeStorage("saiyan_ranking", JSON.stringify(ranking));
    } catch (e) {
        console.warn("Erro ao salvar ranking:", e);
    }
}

// ==================== RANKING POR ARENA ====================
// Top 5 de cada arena separadamente (saiyan_stage_ranking: { [idDaArena]: [{score,date}, ...] }). O recorde
// individual de uma arena é sempre o 1º item dessa lista — não precisa guardar em outro lugar.
function saveStageRankingScore(stageId, newScore) {
    if (!stageId) return;
    try {
        let all = readJsonStorage("saiyan_stage_ranking", {});
        if (!all || typeof all !== "object" || Array.isArray(all)) all = {};
        let list = Array.isArray(all[stageId]) ? all[stageId] : [];
        list.push({ score: newScore, date: new Date().toLocaleDateString() });
        list.sort((a, b) => b.score - a.score);
        all[stageId] = list.slice(0, 5);
        writeStorage("saiyan_stage_ranking", JSON.stringify(all));
    } catch (e) {
        console.warn("Erro ao salvar ranking da arena:", e);
    }
}

function getStageRankingList(stageId) {
    const all = readJsonStorage("saiyan_stage_ranking", {});
    const list = all && typeof all === "object" ? all[stageId] : null;
    return Array.isArray(list) ? list : [];
}

// O recorde individual da arena — 0 se ainda não foi jogada nenhuma vez.
function getStageRecord(stageId) {
    const list = getStageRankingList(stageId);
    return list.length ? list[0].score : 0;
}

// ==================== PROGRESSO POR FASE: modo NORMAL e modo DIFÍCIL ====================
// { [idDaFase]: { normalDone: bool, hardDone: bool } }. Completar o NORMAL (5 ondas, sem morrer) já libera a
// PRÓXIMA fase. Completar o DIFÍCIL também (5 ondas nos degraus mais difíceis) libera o modo SEM LIMITE dessa
// mesma fase. Ver getRealWaveForModeStep / isStageUnlockedByProgress / isUnlimitedModeUnlocked em game-logic-core.js.
let stageProgress = {};

function loadStageProgress() {
    try {
        const parsed = readJsonStorage("saiyan_stage_progress", {});
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) stageProgress = parsed;
    } catch (e) {
        console.warn("Erro ao carregar progresso das fases:", e);
    }
}

function saveStageProgress() {
    try {
        writeStorage("saiyan_stage_progress", JSON.stringify(stageProgress));
    } catch (e) {
        console.warn("Erro ao salvar progresso das fases:", e);
    }
}

// Registra que o modo `mode` ("normal" ou "hard") de `stageId` foi completado (sem morrer). Devolve o objeto
// de progresso atualizado dessa fase, já persistido.
function registerStageModeComplete(stageId, mode) {
    const current = stageProgress[stageId] || { normalDone: false, hardDone: false };
    if (mode === "hard") current.hardDone = true;
    else current.normalDone = true;
    stageProgress[stageId] = current;
    saveStageProgress();
    return current;
}

// ==================== RECORDE DE ONDAS DERROTADAS, POR FASE ====================
// A maior onda de dificuldade (1-10, ou além em modo sem limite) já derrotada em cada fase, não importa o modo.
let stageWaveRecord = {};

function loadStageWaveRecord() {
    try {
        const parsed = readJsonStorage("saiyan_stage_wave_record", {});
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) stageWaveRecord = parsed;
    } catch (e) {
        console.warn("Erro ao carregar recorde de ondas:", e);
    }
}

function saveStageWaveRecord() {
    try {
        writeStorage("saiyan_stage_wave_record", JSON.stringify(stageWaveRecord));
    } catch (e) {
        console.warn("Erro ao salvar recorde de ondas:", e);
    }
}

function getStageWaveRecordFor(stageId) {
    return stageWaveRecord[stageId] || 0;
}

// Atualiza o recorde de `stageId` se `wave` for maior que o que já estava salvo. Devolve o recorde atual (já
// persistido), tenha mudado ou não.
function registerStageWaveRecord(stageId, wave) {
    if (wave > (stageWaveRecord[stageId] || 0)) {
        stageWaveRecord[stageId] = wave;
        saveStageWaveRecord();
    }
    return stageWaveRecord[stageId];
}

