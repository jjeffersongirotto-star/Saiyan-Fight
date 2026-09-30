// ==================== GAME-LOGIC-CORE.JS ====================
// Funções puras (sem DOM, sem canvas, sem localStorage) extraídas de gameplay.js
// para permitir testes automatizados com `node --test` sem precisar de navegador.
// Deve ser carregado ANTES de gameplay.js no index.html.

// ---- Progressão de wave ----
function getWaveParams(wave) {
    const cappedWave = Math.min(wave, WAVE_DIFFICULTY_CAP);
    let waveMult = 1 + (cappedWave - 1) * 0.12;

    return {
        speedMult: 0.9 * waveMult,
        shootFreq: Math.max(30, 110 - cappedWave * 8),
        bossHp: 4 + (cappedWave - 1),
        aggressiveness: 0.4 + (cappedWave * 0.05)
    };
}

// ---- Direção de movimento dominante (para escolher animação) ----
function getDominantMoveAction(dx, dy, deadzone = 0) {
    if (Math.abs(dx) <= deadzone && Math.abs(dy) <= deadzone) return null;
    const hasHorizontal = Math.abs(dx) > deadzone;
    const hasVertical = Math.abs(dy) > deadzone;
    if (hasHorizontal && hasVertical) {
        if (dy < 0) return dx > 0 ? "flyUpRight" : "flyUpLeft";
        return dx > 0 ? "flyDownRight" : "flyDownLeft";
    }
    if (Math.abs(dy) >= Math.abs(dx)) {
        return dy < 0 ? "flyUp" : "flyDown";
    }
    return dx < 0 ? "flyLeft" : "flyRight";
}

// ---- Colisão retangular ----
function getHitboxRect(entity, marginRatio = 0.18) {
    let marginX = entity.w * marginRatio;
    let marginY = entity.h * marginRatio;
    return {
        x: entity.x + marginX,
        y: entity.y + marginY,
        w: Math.max(1, entity.w - marginX * 2),
        h: Math.max(1, entity.h - marginY * 2)
    };
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleHitsEntity(cx, cy, radius, entity, marginRatio = 0.18) {
    let rect = getHitboxRect(entity, marginRatio);
    let closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    let closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    let dx = cx - closestX;
    let dy = cy - closestY;
    return (dx * dx + dy * dy) < (radius * radius);
}

// ---- IA do boss: padrões disponíveis e embaralhamento ----
// Padrões de ataque — EXCLUSIVOS do chefe (IA). O jogador nunca usa isso; ver fireKiBarrage em gameplay.js,
// que é um projétil único e fixo, sem relação com este sistema.
const BOSS_ATTACK_PATTERNS = {
    FAST: "fast", TRIPLE: "triple", HOMING: "homing", SPREAD5: "spread5",
    PINCER: "pincer",   // dois projéteis convergindo de cima e de baixo ao mesmo tempo (onda 7+)
    BURST8: "burst8"    // rajada circular de 8 projéteis lentos ao redor do chefe (onda 9+)
};

function getAvailableBossPatterns(wave) {
    let patterns = [BOSS_ATTACK_PATTERNS.FAST, BOSS_ATTACK_PATTERNS.TRIPLE];
    if (wave >= 3) patterns.push(BOSS_ATTACK_PATTERNS.HOMING);
    if (wave >= 5) patterns.push(BOSS_ATTACK_PATTERNS.SPREAD5);
    if (wave >= 7) patterns.push(BOSS_ATTACK_PATTERNS.PINCER);
    if (wave >= 9) patterns.push(BOSS_ATTACK_PATTERNS.BURST8);
    return patterns;
}

// ---- Teto de dificuldade ----
// A partir desta onda, velocidade/frequência/vida do chefe param de crescer — o desafio das ondas seguintes
// vem só dos padrões de ataque novos (getAvailableBossPatterns, ondas 7 e 9), não de estatística infinita.
const WAVE_DIFFICULTY_CAP = 10;

function shuffleArray(arr) {
    let copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// ---- Analógico virtual (touch) ----
// Converte o deslocamento do dedo (dx, dy, em px lógicos) num vetor de -1 a 1:
// dentro da zona morta = parado; além do raio máximo = força 1 (velocidade cheia).
function getAnalogVector(dx, dy, maxRadius = 50, deadzone = 12) {
    const dist = Math.hypot(dx, dy);
    if (dist <= deadzone) return { x: 0, y: 0, strength: 0 };
    const clamped = Math.min(dist, maxRadius);
    const strength = (clamped - deadzone) / (maxRadius - deadzone);
    return { x: (dx / dist) * strength, y: (dy / dist) * strength, strength };
}

// ---- Rolagem de listas em grade (Database) ----
// Devolve a nova rolagem (0..maxScroll) que deixa a linha `row` inteira visível; se já está visível, não muda.
function getScrollToRevealRow(row, rowStep, cardHeight, viewportHeight, currentScroll, maxScroll) {
    const top = row * rowStep;
    const bottom = top + cardHeight;
    let next = currentScroll;
    if (top < currentScroll) next = top;
    else if (bottom > currentScroll + viewportHeight) next = bottom - viewportHeight;
    return Math.max(0, Math.min(maxScroll, next));
}

// ---- Recorte do fundo branco dos sprites ----
// 1) SVG gerado pelo jogo: o fundo é um <rect> branco do tamanho todo; basta tirá-lo (transparência exata,
//    sem risco de apagar partes brancas do personagem, como a armadura do Freeza).
const SVG_WHITE_BG_RECT = /<rect\b(?![^>]*\b(?:x|y)=['"](?!0['"]))[^>]*\bwidth=['"]32['"][^>]*\bheight=['"]32['"][^>]*\bfill=['"]#(?:f{3}|f{6})['"][^>]*\/>/gi;

function stripSvgWhiteBackground(url) {
    if (typeof url !== "string" || !url.startsWith("data:image/svg+xml")) return url;
    const comma = url.indexOf(",");
    if (comma < 0) return url;
    const header = url.slice(0, comma);
    const payload = url.slice(comma + 1);
    try {
        const isBase64 = /;base64/i.test(header);
        const svg = isBase64 ? atob(payload) : decodeURIComponent(payload);
        const cleaned = svg.replace(SVG_WHITE_BG_RECT, "");
        if (cleaned === svg) return url;
        return header + "," + (isBase64 ? btoa(cleaned) : encodeURIComponent(cleaned));
    } catch (err) {
        return url;
    }
}

// 2) Imagem comum (PNG/JPG enviada pelo jogador): "varinha mágica" a partir das BORDAS. Só apaga a cor de fundo
//    que está ligada à borda da imagem, então partes da mesma cor DENTRO do personagem (olhos, luvas) são preservadas.
//    Não mexe em imagem que já é transparente ou cuja borda não é (pelo menos 60%) da cor de fundo.
//    data = RGBA (Uint8ClampedArray); rgb = [r,g,b]; tolerance = diferença máxima por canal (0-255).
function removeBackgroundColor(data, width, height, rgb, tolerance = 12) {
    const idx = (x, y) => (y * width + x) * 4;
    const isBg = (i) => data[i + 3] > 200 &&
        Math.abs(data[i] - rgb[0]) <= tolerance && Math.abs(data[i + 1] - rgb[1]) <= tolerance && Math.abs(data[i + 2] - rgb[2]) <= tolerance;
    const border = [];
    for (let x = 0; x < width; x++) { border.push([x, 0]); if (height > 1) border.push([x, height - 1]); }
    for (let y = 1; y < height - 1; y++) { border.push([0, y]); if (width > 1) border.push([width - 1, y]); }

    let matchBorder = 0, opaqueBorder = 0;
    for (const [x, y] of border) {
        const i = idx(x, y);
        if (data[i + 3] > 200) opaqueBorder++;
        if (isBg(i)) matchBorder++;
    }
    if (!border.length || opaqueBorder / border.length < 0.6 || matchBorder / border.length < 0.6) {
        return { changed: false, removed: 0 };
    }

    const visited = new Uint8Array(width * height);
    const stack = [];
    for (const [x, y] of border) {
        if (isBg(idx(x, y)) && !visited[y * width + x]) { visited[y * width + x] = 1; stack.push(x, y); }
    }
    let removed = 0;
    while (stack.length) {
        const y = stack.pop(), x = stack.pop();
        data[idx(x, y) + 3] = 0;
        removed++;
        const next = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
        for (const [nx, ny] of next) {
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const k = ny * width + nx;
            if (visited[k] || !isBg(idx(nx, ny))) continue;
            visited[k] = 1;
            stack.push(nx, ny);
        }
    }
    return { changed: removed > 0, removed };
}

// Caso especial: fundo branco (threshold 243 = tolerância 12 por canal).
function removeWhiteBackground(data, width, height, threshold = 243) {
    return removeBackgroundColor(data, width, height, [255, 255, 255], 255 - threshold);
}

// ---- Configuração de recorte por personagem: { mode: "auto"|"color"|"none", color: "#rrggbb", tolerance: 0-60 (%) } ----
function colorHexToRgb(hex) {
    let h = String(hex || "").trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(h)) h = h.split("").map(c => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function normalizeBgRemoval(cfg) {
    const mode = cfg && ["auto", "color", "none"].includes(cfg.mode) ? cfg.mode : "auto";
    const rgb = colorHexToRgb(cfg && cfg.color) || [255, 255, 255];
    const tol = Number(cfg && cfg.tolerance);
    return {
        mode,
        color: rgbToHex(rgb[0], rgb[1], rgb[2]),
        tolerance: Number.isFinite(tol) ? Math.max(0, Math.min(60, Math.round(tol))) : 8
    };
}

// Chave para o cache: recortes diferentes da mesma imagem não se misturam.
function getBgRemovalKey(cfg) {
    const c = normalizeBgRemoval(cfg);
    return c.mode === "color" ? `color|${c.color}|${c.tolerance}` : c.mode;
}

// Cor do primeiro canto opaco da imagem (botão "pegar cor do canto"); null se todos são transparentes.
function pickCornerColor(data, width, height) {
    const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
    for (const [x, y] of corners) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 200) return rgbToHex(data[i], data[i + 1], data[i + 2]);
    }
    return null;
}

// ---- Controle (PlayStation 5 / DualSense e outros, mapeamento "standard" do navegador) ----
// Índices: 0 cruz, 1 bola, 2 quadrado, 3 triângulo, 4 L1, 5 R1, 6 L2, 7 R2, 8 criar, 9 options, 10 L3, 11 R3,
// 12-15 direcional (cima, baixo, esquerda, direita), 16 PS, 17 TOUCHPAD (clique).
const PAD_ACTIONS = ["attack", "parry", "charge", "transform", "special", "pause"];
const DEFAULT_PAD_BINDINGS = {
    attack: [0],          // cruz
    parry: [1],           // bola
    charge: [2],          // quadrado
    transform: [3],       // triângulo
    special: [5, 7, 17],  // R1, R2 ou clique no touchpad
    pause: [9]            // options
};
const PAD_BUTTON_NAMES = ["CRUZ", "BOLA", "QUADRADO", "TRIÂNGULO", "L1", "R1", "L2", "R2", "CRIAR", "OPTIONS", "L3", "R3", "↑", "↓", "←", "→", "PS", "TOUCHPAD"];

function getPadButtonName(index) {
    return PAD_BUTTON_NAMES[index] || `BOTÃO ${index}`;
}

function clonePadBindings(b) {
    const out = {};
    for (const action of PAD_ACTIONS) out[action] = Array.from(b[action]);
    return out;
}

// Aceita o que veio do armazenamento (pode estar velho/corrompido) e devolve sempre um objeto válido.
function normalizePadBindings(saved) {
    const out = clonePadBindings(DEFAULT_PAD_BINDINGS);
    if (!saved || typeof saved !== "object") return out;
    for (const action of PAD_ACTIONS) {
        const list = saved[action];
        if (!Array.isArray(list)) continue;
        const clean = [...new Set(list.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 32))];
        if (clean.length) out[action] = clean;
    }
    return out;
}

// Atribui um botão a uma ação. Se outra ação já usava esse botão, as duas TROCAM (a outra fica com o botão que a
// ação tinha antes), então nenhuma ação fica sem botão. Retorna { bindings, displaced }.
function assignPadButton(bindings, action, index) {
    const next = clonePadBindings(bindings);
    if (!PAD_ACTIONS.includes(action) || !Number.isInteger(index) || index < 0) return { bindings: next, displaced: null };
    const previous = next[action];
    next[action] = [index];
    let displaced = null;
    for (const other of PAD_ACTIONS) {
        if (other === action || !next[other].includes(index)) continue;
        next[other] = next[other].filter(i => i !== index);
        if (!next[other].length) next[other] = [previous[0]];
        displaced = other;
    }
    return { bindings: next, displaced };
}

function describePadBinding(list) {
    return (list || []).map(getPadButtonName).join(" / ");
}

// Converte um Gamepad em "intenções". Movimento: analógico esquerdo ou direcional (fixos).
// Ações do jogo seguem `bindings`. Menus usam sempre cruz (confirma) e bola (volta), para não travar se remapear.
function getGamepadIntent(pad, threshold = 0.4, bindings = DEFAULT_PAD_BINDINGS) {
    const none = {
        up: false, down: false, left: false, right: false, attack: false, charge: false, transform: false,
        parry: false, special: false, pause: false, confirm: false, back: false, shoulderLeft: false, shoulderRight: false
    };
    if (!pad) return none;
    const axes = pad.axes || [];
    const pressed = (i) => Boolean(pad.buttons && pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
    const anyOf = (list) => (list || []).some(pressed);
    const ax = axes[0] || 0, ay = axes[1] || 0;
    return {
        up: ay < -threshold || pressed(12),
        down: ay > threshold || pressed(13),
        left: ax < -threshold || pressed(14),
        right: ax > threshold || pressed(15),
        attack: anyOf(bindings.attack),
        parry: anyOf(bindings.parry),
        charge: anyOf(bindings.charge),
        transform: anyOf(bindings.transform),
        special: anyOf(bindings.special),
        pause: anyOf(bindings.pause),
        confirm: pressed(0),
        back: pressed(1),
        shoulderLeft: pressed(4),
        shoulderRight: pressed(5)
    };
}

// ---- Navegação espacial (menus do canvas e janela HTML do editor) ----
// targets: [{x,y,w,h}]. Vai para o alvo mais próximo na direção (dx,dy = -1/0/1), penalizando desvio lateral.
function findNextTargetIndex(targets, currentIndex, dx, dy) {
    const cur = targets[currentIndex];
    if (!cur) return -1;
    const fx = cur.x + cur.w / 2, fy = cur.y + cur.h / 2;
    let best = -1, bestScore = Infinity;
    targets.forEach((t, i) => {
        if (i === currentIndex) return;
        const vx = t.x + t.w / 2 - fx, vy = t.y + t.h / 2 - fy;
        const along = dx !== 0 ? vx * dx : vy * dy;
        if (along <= 1) return;
        const across = dx !== 0 ? Math.abs(vy) : Math.abs(vx);
        const score = along + across * 2.5;
        if (score < bestScore) { bestScore = score; best = i; }
    });
    return best;
}

function cycleIndex(length, index, delta) {
    if (length <= 0) return -1;
    return ((index + delta) % length + length) % length;
}

function getNextPaletteColor(palette, hex, delta) {
    const i = palette.findIndex(c => c.toLowerCase() === String(hex || "").toLowerCase());
    if (i < 0) return palette[delta >= 0 ? 0 : palette.length - 1];
    return palette[cycleIndex(palette.length, i, delta)];
}

function stepNumberValue(value, step, min, max, dir) {
    const st = Number(step) > 0 ? Number(step) : 1;
    const decimals = (String(st).split(".")[1] || "").length;
    let next = (Number.isFinite(Number(value)) ? Number(value) : 0) + st * dir;
    if (Number.isFinite(Number(min))) next = Math.max(Number(min), next);
    if (Number.isFinite(Number(max))) next = Math.min(Number(max), next);
    return Number(next.toFixed(decimals));
}

// ---- Rotação de chefe por arena (preparação) ----
// Elenco "correto" de vilões por arena, seguindo a cronologia dos animes — guardado aqui para o futuro, mas
// AINDA NÃO ativo: getBossForArena sempre devolve o chefe que o jogador escolheu, sem trocar sozinho. Quando
// a sequência estiver definida e balanceada, o call site (respawnBoss, em gameplay.js) já está pronto: basta
// esse retorno passar a usar getArenaBossRoster em vez de currentBossKey.
const ARENA_BOSS_ROSTER = {
    terra: ["vegeta", "piccolo"],
    kaio: ["raditz", "bardock"],
    namek: ["freeza"],
    namek_explosao: ["freeza"],
    freeza_ship: ["freeza"],
    time_room: ["android17", "android18"],
    cell_games: ["freeza"],           // até existir um preset do Cell, usa o disponível
    kaioshin: ["majin"],
    babidi: ["majin"]
};

function getArenaBossRoster(stageId) {
    return ARENA_BOSS_ROSTER[stageId] || [];
}

// Por enquanto sempre devolve o chefe atual (currentBossKey) — ver nota acima.
function getBossForArena(stageId, currentBossKey) {
    return currentBossKey;
}

// ---- Progressão de arenas (fases) ----
// Ordem cronológica das sagas + a partir de qual "recorde de onda" cada uma libera. A primeira sempre começa
// liberada. currentAndBeyond: usado pela tela de seleção para saber a partir de que onda o jogador já viu tudo.
// Ordem ajustada a pedido do jogador: Nave de Freeza vira a fase 4, Torneio de Cell vira a última (8) — as
// demais mantêm a ordem relativa que já tinham entre si (namek_explosao antes de time_room antes de kaioshin).
// Ordem: Torneio de Cell é a penúltima fase, Planeta Supremo Kaioh é a última.
const STAGE_PROGRESSION = [
    { id: "terra", name: "TORNEIO ARTES MARCIAIS" },
    { id: "kaio", name: "PLANETA DO SR. KAIOH" },
    { id: "namek", name: "PLANETA NAMEK" },
    { id: "freeza_ship", name: "NAVE DE FREEZA" },
    { id: "namek_explosao", name: "NAMEK PRESTES A EXPLODIR" },
    { id: "time_room", name: "SALA DO TEMPO" },
    { id: "cell_games", name: "TORNEIO DE CELL" },
    { id: "kaioshin", name: "PLANETA SUPREMO KAIOH" }
];

// ---- 3 modos por fase: NORMAL, DIFÍCIL e SEM LIMITE ----
// NORMAL: 5 ondas, na dificuldade das ondas 1 a 5 (a metade mais fácil). Sempre disponível.
// DIFÍCIL: 5 ondas também, mas pulando direto pros degraus mais difíceis (2, 4, 6, 8, 10) — só libera depois
// de completar o NORMAL dessa mesma fase.
// SEM LIMITE: as 10 ondas de dificuldade reais em sequência, e continua além disso enquanto o jogador vencer
// (igual o "infinito" de sempre) — só libera depois de completar NORMAL e DIFÍCIL dessa mesma fase.
// Completar o NORMAL de uma fase já libera a PRÓXIMA fase — não precisa do DIFÍCIL pra isso.
const STAGE_MODE_WAVE_COUNT = 5;
const NORMAL_MODE_WAVES = [1, 2, 3, 4, 5];
const HARD_MODE_WAVES = [2, 4, 6, 8, 10];

function getModeWaveSequence(mode) {
    return mode === "hard" ? HARD_MODE_WAVES : NORMAL_MODE_WAVES;
}

// A dificuldade real (a "onda", pra usar em getWaveParams) da luta número `stepIndex` (0-based) dentro do modo.
function getRealWaveForModeStep(mode, stepIndex) {
    const seq = getModeWaveSequence(mode);
    return seq[Math.max(0, Math.min(stepIndex, seq.length - 1))];
}

// Uma fase libera quando a fase ANTERIOR já teve o modo NORMAL completado ao menos uma vez. A primeira sempre libera.
function isStageUnlockedByProgress(stageId, progressMap) {
    const idx = STAGE_PROGRESSION.findIndex(s => s.id === stageId);
    if (idx <= 0) return idx === 0;
    const prevId = STAGE_PROGRESSION[idx - 1].id;
    const prevProgress = (progressMap && progressMap[prevId]) || {};
    return !!prevProgress.normalDone;
}

function getUnlockedStageIdsByProgress(progressMap) {
    return STAGE_PROGRESSION.filter(s => isStageUnlockedByProgress(s.id, progressMap)).map(s => s.id);
}

// O modo SEM LIMITE de uma fase só libera depois que ELA MESMA (não a anterior) já teve NORMAL e DIFÍCIL completados.
function isUnlimitedModeUnlocked(stageId, progressMap) {
    const p = (progressMap && progressMap[stageId]) || {};
    return !!(p.normalDone && p.hardDone);
}

// O modo DIFÍCIL de uma fase só libera depois que ELA MESMA já teve o NORMAL completado.
function isHardModeUnlocked(stageId, progressMap) {
    const p = (progressMap && progressMap[stageId]) || {};
    return !!p.normalDone;
}


// ---- Física do parry: reflexo coerente com o ângulo de impacto ----
// d = velocidade de entrada, n = normal da superfície de reflexo (normalizada). r = d - 2(d·n)n — reflexo
// vetorial padrão: bate no meio -> volta quase reto; bate na borda -> sai mais de lado.
function reflectVelocity(vx, vy, nx, ny) {
    const len = Math.hypot(nx, ny) || 1;
    const ux = nx / len, uy = ny / len;
    const dot = vx * ux + vy * uy;
    return { vx: vx - 2 * dot * ux, vy: vy - 2 * dot * uy };
}

// Normal do "escudo" de parry no ponto de impacto: da posição do jogador até o projétil, normalizada.
// Se o projétil está exatamente em cima do jogador (dist 0), usa uma normal padrão (reflete para trás).
function getParryNormal(targetCx, targetCy, hitX, hitY) {
    const dx = hitX - targetCx, dy = hitY - targetCy;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.01) return { nx: 1, ny: 0 };
    return { nx: dx / dist, ny: dy / dist };
}

// ---- Combo de parry ----
// Bônus de ki por sequência de rebatimentos sem tomar dano. Degraus, não uma curva contínua — fica claro
// quando o próximo bônus chega.
function getParryComboBonus(comboCount) {
    if (comboCount >= 10) return 10;
    if (comboCount >= 6) return 5;
    if (comboCount >= 3) return 2;
    return 0;
}

// ---- Item "bastão mágico" (força) + especial combinado ----
// Dano do ataque normal com o buff de força ativo (item bastão mágico): soma um valor fixo, não multiplica
// (múltiplo do especial já é grande o bastante por si).
const POWER_BUFF_ATTACK_BONUS = 1;
function getBuffedAttackDamage(baseDamage, hasPowerBuff) {
    return baseDamage + (hasPowerBuff ? POWER_BUFF_ATTACK_BONUS : 0);
}

// Especial + bastão mágico ativo ao mesmo tempo = SUPER ATAQUE: o dobro do dano do especial normal.
function getSuperAttackDamage(specialDamage, hasPowerBuff) {
    return hasPowerBuff ? specialDamage * 2 : specialDamage;
}

// ---- Choque de feixes (co-op: os dois especiais saem quase juntos e colidem no meio) ----
// Vira uma disputa de apertar o ATAQUE o mais rápido possível durante a janela do choque — quem aperta mais
// vezes empurra o ponto de encontro para o lado do adversário. Devolve 0 (choque exatamente no meio, ninguém
// apertou mais) a ±1 (empurrado até a ponta do oponente); positivo favorece p1. `scale` é quantos apertos a
// mais já bastam para empurrar até o fim (não precisa ser uma disputa de centenas de apertos).
function getBeamClashPush(p1Mashes, p2Mashes, scale = CLASH_MASH_PUSH_SCALE) {
    const s = Math.max(1, scale);
    return Math.max(-1, Math.min(1, (p1Mashes - p2Mashes) / s));
}

// Quantos apertos de diferença já bastam para empurrar o choque até a ponta do oponente.
const CLASH_MASH_PUSH_SCALE = 8;
// Duração da janela de disputa (frames a 60fps) — dá tempo real pra "quem aperta mais rápido vence" valer,
// sem a partida travar por muito tempo esperando.
const CLASH_MASH_DURATION = 90;

// ---- Ataque especial ----
// Dano do especial = TRIPLO do ataque normal (1 x 3 = 3), transformado ou não. Só pode ser usado com o ki CHEIO.
const NORMAL_ATTACK_DAMAGE = 1;
const SPECIAL_DAMAGE_MULTIPLIER = 3;
function getSpecialDamage() {
    return NORMAL_ATTACK_DAMAGE * SPECIAL_DAMAGE_MULTIPLIER;
}
function canUseSpecial(ki, maxKi) {
    return ki >= maxKi;
}

// ---- Ajuste de valores no editor de HUD (tamanho/opacidade) ----
// Soma delta, trava entre min e max e arredonda para 1 casa (evita 0.30000000000000004).
function adjustHudValue(value, delta, min, max) {
    const next = Math.max(min, Math.min(max, value + delta));
    return Math.round(next * 10) / 10;
}

// ---- Posição padrão dos botões touch (coordenadas normalizadas 0..1 do canvas 800x350) ----
// Layout "de jogo de mercado": analógico à esquerda; à direita os botões em arco em volta do polegar.
// CARREGAR no canto inferior direito, ATAQUE (maior, segura para atirar sem parar) ao lado dele,
// ESPECIAL/PARRY acima e TRANSF. mais para dentro. Bumpar TOUCH_HUD_LAYOUT_VERSION invalida layouts salvos antigos.
const TOUCH_HUD_LAYOUT_VERSION = 2;

function getDefaultTouchHudLayout(viewportWidth) {
    const k = viewportWidth <= 540 ? 1.15 : 1;
    const opacity = viewportWidth <= 540 ? 0.9 : 0.8;
    const stdW = Math.round(62 * k), stdH = Math.round(52 * k);
    const bigW = Math.round(78 * k), bigH = Math.round(66 * k);
    const make = (cx, cy, w, h) => ({ x: (cx - w / 2) / 800, y: (cy - h / 2) / 350, w, h, scale: 1, opacity });
    return {
        attack:    make(648, 298, bigW, bigH),
        charge:    make(752, 308, stdW, stdH),
        special:   make(676, 205, stdW, stdH),
        parry:     make(760, 222, stdW, stdH),
        transform: make(556, 232, stdW, stdH)
    };
}

// Exporta para Node (testes) sem quebrar o uso como <script> global no navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        getScrollToRevealRow,
        removeBackgroundColor,
        colorHexToRgb,
        rgbToHex,
        normalizeBgRemoval,
        getBgRemovalKey,
        pickCornerColor,
        PAD_ACTIONS,
        DEFAULT_PAD_BINDINGS,
        PAD_BUTTON_NAMES,
        getPadButtonName,
        normalizePadBindings,
        assignPadButton,
        describePadBinding,
        findNextTargetIndex,
        cycleIndex,
        getNextPaletteColor,
        stepNumberValue,
        stripSvgWhiteBackground,
        removeWhiteBackground,
        NORMAL_ATTACK_DAMAGE,
        WAVE_DIFFICULTY_CAP,
        ARENA_BOSS_ROSTER,
        getArenaBossRoster,
        getBossForArena,
        STAGE_PROGRESSION,
        STAGE_MODE_WAVE_COUNT,
        NORMAL_MODE_WAVES,
        HARD_MODE_WAVES,
        getModeWaveSequence,
        getRealWaveForModeStep,
        isStageUnlockedByProgress,
        getUnlockedStageIdsByProgress,
        isUnlimitedModeUnlocked,
        isHardModeUnlocked,
        reflectVelocity,
        getParryNormal,
        getParryComboBonus,
        POWER_BUFF_ATTACK_BONUS,
        getBuffedAttackDamage,
        getSuperAttackDamage,
        getBeamClashPush,
        CLASH_MASH_PUSH_SCALE,
        CLASH_MASH_DURATION,
        SPECIAL_DAMAGE_MULTIPLIER,
        canUseSpecial,
        TOUCH_HUD_LAYOUT_VERSION,
        getSpecialDamage,
        adjustHudValue,
        getGamepadIntent,
        getAnalogVector,
        getDefaultTouchHudLayout,
        getWaveParams,
        getDominantMoveAction,
        getHitboxRect,
        rectsOverlap,
        circleHitsEntity,
        BOSS_ATTACK_PATTERNS,
        getAvailableBossPatterns,
        shuffleArray
    };
}
