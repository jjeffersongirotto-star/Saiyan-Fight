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
// Padrão escolhido pelo jogador (PADRÃO PS5). Mudou? Suba PAD_BINDINGS_VERSION para quem não personalizou.
const DEFAULT_PAD_BINDINGS = {
    attack: [2],          // quadrado
    parry: [5],           // R1
    charge: [0],          // cruz
    transform: [3],       // triângulo
    special: [1],         // bola
    pause: [9]            // options
};
const PAD_BINDINGS_VERSION = 2;
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
// Sensibilidade do analógico (1 = pouca … 5 = muita; 3 = padrão): quanto o analógico precisa inclinar para mover.
const PAD_SENSITIVITY_MIN = 1, PAD_SENSITIVITY_MAX = 5, PAD_SENSITIVITY_DEFAULT = 3;
function getPadStickThreshold(level) {
    const n = Math.round(Number(level));
    const nivel = Number.isFinite(n) ? Math.max(PAD_SENSITIVITY_MIN, Math.min(PAD_SENSITIVITY_MAX, n)) : PAD_SENSITIVITY_DEFAULT;
    return [0.6, 0.5, 0.4, 0.3, 0.2][nivel - 1];
}

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

// ---- Progressão de arenas (fases) ----
// Definição de cada arena (v0.86). É a cópia embutida dos arquivos da pasta fases/ (um .json por arena, mesmos
// campos): o jogo sempre funciona com ela e, quando os arquivos carregam (fases.js), usa o que estiver neles.
// Campos: id (fixo; o progresso salvo fica ligado a ele), nome, posicao (número no mapa, 1 = primeira), cor
// (tema no mapa/ARENAS), musica (tema de BGM_THEMES), cenario (qual desenho 3D usar), camera (tipo e volta),
// fundoClaro (HUD com placas escuras), minion (padrão: "saibaman" ou "celljr") e conquista (nome/descrição).
const FASES_PADRAO = [
    { id: "kame", nome: "ILHA DO MESTRE KAME", posicao: 1, cor: "#f472b6", musica: "kame", cenario: "ilha_kame",
        camera: { tipo: "orbita", volta: 9600 }, fundoClaro: true, minion: "saibaman",
        conquista: { nome: "Férias na Kame House", desc: "Vença o NORMAL da Ilha do Mestre Kame" } },
    { id: "terra", nome: "TORNEIO ARTES MARCIAIS", posicao: 2, cor: "#f6b93b", musica: "classico", cenario: "torneio_artes_marciais",
        camera: { tipo: "arena", volta: 9000 }, fundoClaro: true, minion: "saibaman",
        conquista: { nome: "Campeão do Torneio", desc: "Libere o Torneio de Artes Marciais" } },
    { id: "kaio", nome: "PLANETA DO SR. KAIOH", posicao: 3, cor: "#a78bfa", musica: "kaio", cenario: "planeta_kaioh",
        camera: { tipo: "planeta", volta: 6000 }, fundoClaro: true, minion: "saibaman",
        conquista: { nome: "Treino com Piadas Ruins", desc: "Libere o Planeta do Sr. Kaioh" } },
    { id: "namek", nome: "PLANETA NAMEK", posicao: 4, cor: "#4ade80", musica: "namek", cenario: "namek",
        camera: { tipo: "anda", volta: 0 }, fundoClaro: true, minion: "saibaman",
        conquista: { nome: "Turista em Namek", desc: "Libere o Planeta Namek. Leve protetor!" } },
    { id: "freeza_ship", nome: "NAVE DE FREEZA", posicao: 5, cor: "#c084fc", musica: "freeza", cenario: "nave_freeza",
        camera: { tipo: "orbita", volta: 10800 }, fundoClaro: true, minion: "saibaman",
        conquista: { nome: "Clandestino na Nave", desc: "Libere a Nave de Freeza sem ser visto" } },
    { id: "namek_explosao", nome: "NAMEK PRESTES A EXPLODIR", posicao: 6, cor: "#f87171", musica: "explosao", cenario: "namek_explodindo",
        camera: { tipo: "anda", volta: 0 }, fundoClaro: false, minion: "saibaman",
        conquista: { nome: "Fuga por um Triz", desc: "Libere Namek Prestes a Explodir. Corre!" } },
    { id: "time_room", nome: "SALA DO TEMPO", posicao: 7, cor: "#e2e8f0", musica: "gt", cenario: "sala_do_tempo",
        camera: { tipo: "orbita", volta: 10800 }, fundoClaro: true, minion: "saibaman",
        conquista: { nome: "Um Ano em Um Dia", desc: "Libere a Sala do Tempo. Sem relógio!" } },
    { id: "cell_games", nome: "TORNEIO DE CELL", posicao: 8, cor: "#38bdf8", musica: "cell", cenario: "torneio_cell",
        camera: { tipo: "arena", volta: 9000 }, fundoClaro: true, minion: "celljr",
        conquista: { nome: "Convidado do Cell", desc: "Libere o Torneio de Cell" } },
    { id: "kaioshin", nome: "PLANETA SUPREMO KAIOH", posicao: 9, cor: "#fbbf24", musica: "boo", cenario: "planeta_supremo_kaioh",
        camera: { tipo: "arena", volta: 10800 }, fundoClaro: true, minion: "saibaman",
        conquista: { nome: "Entre os Deuses", desc: "Libere o Planeta Supremo Kaioh" } },
    { id: "plataforma_celestial", nome: "PLATAFORMA CELESTIAL", posicao: 10, cor: "#7dd3fc", musica: "kami", cenario: "plataforma_celestial",
        camera: { tipo: "orbita", volta: 10200 }, fundoClaro: true, minion: "saibaman",
        conquista: { nome: "Acima das Nuvens", desc: "Libere a Plataforma Celestial" } },
    { id: "capital_oeste", nome: "CAPITAL DO OESTE", posicao: 11, cor: "#facc15", musica: "capital", cenario: "capital_oeste",
        camera: { tipo: "orbita", volta: 10800 }, fundoClaro: true, minion: "saibaman",
        conquista: { nome: "Visita à Corporação Cápsula", desc: "Libere a Capital do Oeste" } }
];
// Minions que podem ser escolhidos para uma fase (na 0.87 entram os criados no editor).
const MINIONS_PADRAO = [{ id: "saibaman", nome: "SAIBAMAN" }, { id: "celljr", nome: "CELL JR." }];

// Tempo de partida em segundos -> "m:ss" (ou "h:mm:ss" a partir de 1 hora)
function formatarTempoPartida(seg) {
    const t = Math.max(0, Math.round(seg || 0)), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
    const dois = (n) => String(n).padStart(2, "0");
    return h ? `${h}:${dois(m)}:${dois(s)}` : `${m}:${dois(s)}`;
}
function getFaseDef(id) {
    return FASES_PADRAO.find(f => f.id === id) || null;
}
// Ordem das fases: segue a ordem salva (lista de ids) e, sem ela, o campo posicao. Ids que faltarem na ordem
// salva entram no fim (pela posição); ids que não existem mais são ignorados.
function ordenarFases(fases, ordemSalva) {
    const porPosicao = fases.slice().sort((a, b) => (a.posicao || 0) - (b.posicao || 0));
    if (!Array.isArray(ordemSalva) || !ordemSalva.length) return porPosicao;
    const lista = [];
    ordemSalva.forEach(id => { const f = porPosicao.find(x => x.id === id); if (f && !lista.includes(f)) lista.push(f); });
    porPosicao.forEach(f => { if (!lista.includes(f)) lista.push(f); });
    return lista;
}
// Coloca a fase `id` na posição `novaPos` (1 = primeira) TROCANDO de lugar com a que estava lá: as outras ficam
// onde estão. Devolve a nova lista de ids.
function trocarPosicaoFase(ordemIds, id, novaPos) {
    const lista = ordemIds.slice();
    const de = lista.indexOf(id), para = Math.max(0, Math.min(lista.length - 1, (novaPos | 0) - 1));
    if (de < 0 || de === para) return lista;
    [lista[de], lista[para]] = [lista[para], lista[de]];
    return lista;
}

// Lista usada pelo jogo inteiro (mapa, ARENAS, liberação, ranking, trilhas): { id, name } na ordem atual.
// É reordenada no lugar (aplicarOrdemDasFases) para quem já guardou a referência continuar vendo a certa.
const STAGE_PROGRESSION = ordenarFases(FASES_PADRAO).map(f => ({ id: f.id, name: f.nome }));
function aplicarOrdemDasFases(ordemSalva) {
    const nova = ordenarFases(FASES_PADRAO, ordemSalva).map(f => ({ id: f.id, name: f.nome }));
    STAGE_PROGRESSION.length = 0;
    nova.forEach(f => STAGE_PROGRESSION.push(f));
    return STAGE_PROGRESSION;
}

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
// Fase com o NORMAL já completo continua liberada mesmo que a ordem das fases mude (v0.86).
function isStageUnlockedByProgress(stageId, progressMap) {
    const idx = STAGE_PROGRESSION.findIndex(s => s.id === stageId);
    if (idx <= 0) return idx === 0;
    if (progressMap && progressMap[stageId] && progressMap[stageId].normalDone) return true;
    const prevId = STAGE_PROGRESSION[idx - 1].id;
    const prevProgress = (progressMap && progressMap[prevId]) || {};
    return !!prevProgress.normalDone;
}

// 0.85: a Ilha do Mestre Kame entrou como 1ª fase. Quem já tinha completado alguma fase ganha a ilha como
// completada (NORMAL), para não perder o que já tinha liberado. Devolve true se mudou algo.
function migrarProgressoIlhaKame(progressMap) {
    if (!progressMap || progressMap.kame) return false;
    const algumaFeita = Object.keys(progressMap).some(k => progressMap[k] && progressMap[k].normalDone);
    if (!algumaFeita) return false;
    progressMap.kame = { normalDone: true, hardDone: false };
    return true;
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

// ---- VERSUS (2 jogadores no mesmo aparelho): partida em melhor de 3 rodadas ----
// Internamente o modo continua se chamando "coop" (gameMode), porque esse valor já fica salvo no navegador
// de quem joga ("saiyan_mode"); na tela ele aparece como VERSUS.
const VERSUS_ROUNDS_TO_WIN = 2;

// Registra quem venceu a rodada. Devolve o placar novo e, se alguém chegou a VERSUS_ROUNDS_TO_WIN, o vencedor
// da partida ("p1" ou "p2"); senão matchWinner = null (a partida continua com a próxima rodada).
function registerVersusRoundWin(versusScore, roundWinner) {
    const score = { p1: (versusScore && versusScore.p1) || 0, p2: (versusScore && versusScore.p2) || 0 };
    if (roundWinner === "p1" || roundWinner === "p2") score[roundWinner]++;
    const matchWinner = score.p1 >= VERSUS_ROUNDS_TO_WIN ? "p1" : score.p2 >= VERSUS_ROUNDS_TO_WIN ? "p2" : null;
    return { score, matchWinner };
}

// ---- Choque de feixes (versus: os dois especiais saem quase juntos e colidem no meio) ----
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
const TOUCH_HUD_LAYOUT_VERSION = 4;

function getDefaultTouchHudLayout(viewportWidth) {
    const opacity = viewportWidth <= 540 ? 0.9 : 0.8;
    // tamanhos fixos (a escala maior do celular empurrava os botões para fora da tela)
    const big = 62, std = 46;
    const make = (cx, cy, w) => ({ x: (cx - w / 2) / 800, y: (cy - w / 2) / 350, w, h: w, scale: 1, opacity });
    return {
        // padrão escolhido pelo jogador (print dele): todos juntos no canto inferior direito — CARREGAR/TRANSFORMAR
        // maior embaixo, ESPECIAL em cima dele, ATAQUE à esquerda no meio (some com o tiro automático do toque)
        // e PARRY embaixo à esquerda
        charge:  make(767, 317, big),
        special: make(774, 262, std),
        attack:  make(726, 277, std),
        parry:   make(712, 324, std)
        // sem botão de transformar: com o ki cheio o CARREGAR vira TRANSFORMAR (ver drawTouchHUD em menu.js)
    };
}

// Teste de controles: quem comanda o Goku da prévia. Quem apertou primeiro manda até soltar tudo; se os dois
// começam juntos (ou seguram juntos sem dono), ninguém manda.
function chooseControlsTestOwner(dono, ativoP1, ativoP2) {
    if (dono === "p1" && ativoP1) return "p1";
    if (dono === "p2" && ativoP2) return "p2";
    if (ativoP1 && ativoP2) return null;
    if (ativoP1) return "p1";
    if (ativoP2) return "p2";
    return null;
}

// Exporta para Node (testes) sem quebrar o uso como <script> global no navegador.
// ==================== SAIBAMAN: BROTA DO CHÃO, SALTA E VOA ====================
// Como no anime: o Saibaman nasce da terra (brotar), dá um salto para cima (saltar) e depois avança voando
// para a esquerda (voar). "agarrar" (abraço que explode) é tratado em gameplay.js, que conhece o jogador.
const SAIBAMAN_SPROUT_FRAMES = 28;   // tempo saindo da terra (sem acertar ninguém)
const SAIBAMAN_GRAB_FRAMES = 40;     // tempo abraçado nas pernas antes de explodir (~0,7 s; não tem como escapar)
const SAIBAMAN_LUNGE_RADIUS = 90;    // passou perto assim do herói: avança para agarrar
const SAIBAMAN_LUNGE_SPEED = 5.5;
const SAIBAMAN_LUNGE_MAX_FRAMES = 50; // não alcançou nesse tempo: desiste e volta a voar
const SAIBAMAN_GRAVITY = 0.32;
const SAIBAMAN_THROWN_FRAMES = 32;   // tempo voando para trás depois de ser arremessado (parry ou carregar ki)
const SAIBAMAN_THROW_SPEED = 9;

function createSaibaman(x, groundY, targetY, speed) {
    return {
        x, y: groundY, w: 32, h: 40, speed,
        hp: 2, maxHp: 2, hoverTime: 0,
        phase: "brotar", phaseTime: 0,
        groundY, targetY,
        // velocidade do salto para chegar logo acima da altura alvo (v² = 2·g·altura)
        jumpVy: -Math.sqrt(2 * SAIBAMAN_GRAVITY * Math.max(30, groundY - targetY)),
        vy: 0
    };
}

// O Saibaman só pode acertar/ser acertado depois de sair da terra.
function isSaibamanActive(s) {
    return s.phase !== "brotar";
}

function stepSaibamanMotion(s, dt) {
    const f = dt * 60;
    s.phaseTime += f;
    if (s.phase === "brotar") {
        s.y = s.groundY;
        if (s.phaseTime >= SAIBAMAN_SPROUT_FRAMES) { s.phase = "saltar"; s.phaseTime = 0; s.vy = s.jumpVy; }
    } else if (s.phase === "saltar") {
        s.x -= s.speed * 0.4 * f;
        s.y += s.vy * f;
        s.vy += SAIBAMAN_GRAVITY * f;
        if (s.vy >= 0 || s.y <= s.targetY) { s.phase = "voar"; s.phaseTime = 0; s.vy = 0; }
    } else if (s.phase === "arremessado") {
        // jogado para trás girando; depois volta a voar (e a investir de novo se passar perto do herói)
        s.x += s.vx * f;
        s.vx *= Math.pow(s.lancadoParry ? 0.985 : 0.9, f);
        s.y += s.vy * f;
        s.vy += SAIBAMAN_GRAVITY * (s.lancadoParry ? 0.08 : 0.6) * f;
        if (s.phaseTime >= (s.lancadoParry ? SAIBAMAN_PARRY_THROWN_FRAMES : SAIBAMAN_THROWN_FRAMES)) {
            s.phase = "voar"; s.phaseTime = 0; s.vy = 0; s.lancadoParry = false;
        }
    } else if (s.phase === "voar") {
        s.x -= s.speed * f;
        s.hoverTime += 0.05 * f;
        s.y += Math.sin(s.hoverTime) * 1.5 * f;
    }
    return s;
}

// Herói deu parry ou carregou o ki com o Saibaman agarrado: ele é arremessado para trás e solta.
// forte (parry): lançado com força e quase reto para a frente, voando por mais tempo — atravessa a arena até o
// vilão (gameplay.js faz ele explodir lá).
const SAIBAMAN_PARRY_THROW_SPEED = 15;
const SAIBAMAN_PARRY_THROWN_FRAMES = 70;
function throwSaibaman(s, forte) {
    s.phase = "arremessado";
    s.phaseTime = 0;
    s.lancadoParry = !!forte;
    s.vx = forte ? SAIBAMAN_PARRY_THROW_SPEED : SAIBAMAN_THROW_SPEED;
    s.vy = forte ? -0.6 : -4;
    return s;
}

// Avanço para agarrar: se o Saibaman voando passa a menos de SAIBAMAN_LUNGE_RADIUS do alvo (centro do herói),
// ele parte para cima dele. Devolve true enquanto estiver avançando.
function shouldSaibamanLunge(s, tx, ty) {
    if (s.phase !== "voar") return false;
    const dx = tx - (s.x + s.w / 2), dy = ty - (s.y + s.h / 2);
    return dx * dx + dy * dy <= SAIBAMAN_LUNGE_RADIUS * SAIBAMAN_LUNGE_RADIUS;
}

function stepSaibamanLunge(s, tx, ty, dt) {
    const f = dt * 60;
    s.phaseTime += f;
    const dx = tx - (s.x + s.w / 2), dy = ty - (s.y + s.h / 2);
    const d = Math.hypot(dx, dy) || 1;
    const passo = Math.min(d, SAIBAMAN_LUNGE_SPEED * f);
    s.x += dx / d * passo;
    s.y += dy / d * passo;
    if (s.phaseTime >= SAIBAMAN_LUNGE_MAX_FRAMES) { s.phase = "voar"; s.phaseTime = 0; }
    return s;
}

// Sala do Tempo: o cenário é só o pavilhão no vazio branco, e conforme o herói avança a câmera dá a volta
// nele (frente → lateral → fundos → outra lateral → frente de novo). Uma volta completa a cada
// TIME_ROOM_LAP_SCROLL de avanço (~2 minutos de luta) e depois recomeça pela frente.
const TIME_ROOM_LAP_SCROLL = 10800;
function getTimeRoomOrbitAngle(scroll) {
    const v = ((scroll % TIME_ROOM_LAP_SCROLL) + TIME_ROOM_LAP_SCROLL) % TIME_ROOM_LAP_SCROLL;
    return v / TIME_ROOM_LAP_SCROLL * Math.PI * 2;
}

// Torneio de Cell: os lutadores ficam no meio da arena e a câmera gira em volta do centro, na altura deles —
// o piso passa por baixo, os pilares dos cantos passam pela frente e a paisagem dá a volta ao fundo.
const CELL_ARENA_LAP_SCROLL = 9000;   // ~100 s de luta por volta
function getCellArenaOrbitAngle(scroll) {
    const v = ((scroll % CELL_ARENA_LAP_SCROLL) + CELL_ARENA_LAP_SCROLL) % CELL_ARENA_LAP_SCROLL;
    return v / CELL_ARENA_LAP_SCROLL * Math.PI * 2;
}

// Nave de Freeza: igual à Sala do Tempo — a nave pousada fica no meio e a câmera dá a volta nela.
const FREEZA_SHIP_LAP_SCROLL = 10800;
function getFreezaShipOrbitAngle(scroll) {
    const v = ((scroll % FREEZA_SHIP_LAP_SCROLL) + FREEZA_SHIP_LAP_SCROLL) % FREEZA_SHIP_LAP_SCROLL;
    return v / FREEZA_SHIP_LAP_SCROLL * Math.PI * 2;
}

// Ângulo de uma volta completa para as fases em 3D que giram (0 → 2π a cada `volta` de avanço, e recomeça).
function getStageLapAngle(scroll, volta) {
    const v = ((scroll % volta) + volta) % volta;
    return v / volta * Math.PI * 2;
}
const KAIO_PLANET_LAP_SCROLL = 6000;   // Planeta do Sr. Kaioh: ~67 s por volta
const TERRA_ARENA_LAP_SCROLL = 9000;   // Torneio de Artes Marciais: ~100 s
const KAIOSHIN_LAP_SCROLL = 10800;     // Planeta Supremo Kaioh: ~2 min
const KAME_ISLAND_LAP_SCROLL = 9600;   // Ilha do Mestre Kame: ~107 s por volta em volta da casa
const PLATAFORMA_LAP_SCROLL = 10200;   // Plataforma Celestial: ~113 s por volta em volta do palácio
const CAPITAL_LAP_SCROLL = 10800;      // Capital do Oeste: ~2 min por volta em volta da Corporação Cápsula
// Fases que andam para a frente (Namek): distância percorrida pela câmera.
const NAMEK_FORWARD_SPEED = 1.4;
function getForwardTravel(scroll) {
    return Math.max(0, scroll) * NAMEK_FORWARD_SPEED;
}

// Música de cada fase: um tema original do jogo para cada fase (campo musica da definição) — ver BGM_THEMES em audio.js.
function getStageMusicEra(stageId) {
    const f = getFaseDef(stageId);
    return (f && f.musica) || "classico";
}

// Quadro de uma animação com "cadeado" (editor de quadros): a 1ª volta toca todos os quadros; depois recomeça no
// quadro travado (lockFrom) em vez do 1º. Sem cadeado (ou no 1º quadro), é a repetição normal.
function getLoopFrameIndex(tick, length, lockFrom) {
    if (!(length > 0)) return 0;
    const t = Math.max(0, Math.floor(tick) || 0);
    if (!(lockFrom > 0 && lockFrom < length)) return t % length;
    if (t < length) return t;
    return lockFrom + (t - length) % (length - lockFrom);
}

// ==================== MAPA DE PROGRESSO (fases em linha) ====================
// Caminho único e longo, rolando na horizontal: fase i (0 = primeira) fica em getMapaPosicaoFase(i), em
// coordenadas do mapa (x cresce para a direita; a tela mostra MAPA_TELA_W de largura). Cada trecho de
// MAPA_FASES_POR_TRECHO fases tem um ambiente. MAPA_TOTAL_FASES = fases existentes + futuras (com cadeado):
// para ter mais, é só aumentar o número.
const MAPA_TOTAL_FASES = 60;
const MAPA_FASES_POR_TRECHO = 10;
const MAPA_PASSO_X = 130;
const MAPA_MARGEM_X = 90;
const MAPA_TELA_W = 800;
function getMapaPosicaoFase(i) {
    // sobe e desce em ondas irregulares (duas senoides), nunca colando em cima do título nem embaixo
    // (0.85: o mapa é em perspectiva, com o horizonte em MAPA_HORIZONTE_Y — o caminho fica no chão, abaixo dele)
    const y = 206 + Math.sin(i * 1.15) * 40 + Math.sin(i * 0.43 + 1) * 16;
    return { x: MAPA_MARGEM_X + i * MAPA_PASSO_X, y: Math.round(y) };
}
const MAPA_HORIZONTE_Y = 100;
// Mistura dos ambientes ao longo do mapa (x do mapa): perto da divisa entre dois trechos o ambiente muda aos
// poucos, ao longo de MAPA_MISTURA_FASES fases. Devolve { a, b, w }: trecho a, trecho b (o seguinte) e o peso de
// b (0 = só a, 1 = só b). Longe da divisa, w = 0.
const MAPA_MISTURA_FASES = 3;
function getMapaMistura(mx) {
    const trechoW = MAPA_FASES_POR_TRECHO * MAPA_PASSO_X, meia = MAPA_MISTURA_FASES * MAPA_PASSO_X / 2;
    // divisa entre o trecho k e o k+1: no meio do caminho entre a última fase de k e a primeira de k+1
    const rel = mx - MAPA_MARGEM_X + MAPA_PASSO_X / 2;
    const k = Math.floor(rel / trechoW);
    const dentro = rel - k * trechoW;   // 0..trechoW
    if (k < 0) return { a: 0, b: 0, w: 0 };
    if (dentro > trechoW - meia) {
        const t = (dentro - (trechoW - meia)) / (2 * meia);
        return { a: Math.max(0, k), b: Math.max(0, k + 1), w: t * t * (3 - 2 * t) };
    }
    if (dentro < meia && k > 0) {
        const t = (dentro + meia) / (2 * meia);
        return { a: k - 1, b: k, w: t * t * (3 - 2 * t) };
    }
    return { a: Math.max(0, k), b: Math.max(0, k), w: 0 };
}
function getMapaTrecho(i) {
    return Math.floor(Math.max(0, i) / MAPA_FASES_POR_TRECHO);
}
function getMapaLargura(total) {
    return MAPA_MARGEM_X * 2 + (Math.max(1, total || MAPA_TOTAL_FASES) - 1) * MAPA_PASSO_X;
}
function limitarRolagemMapa(rolagem, total) {
    return Math.max(0, Math.min(getMapaLargura(total) - MAPA_TELA_W, rolagem || 0));
}
// rolagem que deixa a fase i no meio da tela
function rolagemParaFase(i, total) {
    return limitarRolagemMapa(getMapaPosicaoFase(i).x - MAPA_TELA_W / 2, total);
}

// Altura do personagem (cm, campo ALTURA do editor) -> escala do lutador na luta. 175 cm (Goku) = tamanho de
// sempre; limitado para ninguém ocupar a arena demais nem ficar minúsculo (proporções sempre iguais: a escala
// vale para largura e altura).
const ALTURA_PADRAO_CM = 175;
const ESCALA_ALTURA_MIN = 0.75;
const ESCALA_ALTURA_MAX = 1.4;
const ALTURA_CM_MIN = 50;
const ALTURA_CM_MAX = 500;
function escalaDaAltura(cm) {
    const h = Number(cm);
    if (!Number.isFinite(h) || h <= 0) return 1;
    return Math.max(ESCALA_ALTURA_MIN, Math.min(ESCALA_ALTURA_MAX, h / ALTURA_PADRAO_CM));
}
// Valor digitado no editor -> altura válida (cm inteiro entre os limites) ou null
function normalizarAltura(v) {
    const h = Math.round(Number(v));
    if (!Number.isFinite(h) || h <= 0) return null;
    return Math.max(ALTURA_CM_MIN, Math.min(ALTURA_CM_MAX, h));
}

// Vilão fora do versus: sobe e desce entre minY e maxY e, de tempos em tempos, escolhe outro ponto na sua
// metade da arena (alvoX) para onde vai devagar — antes só quicava em cima/baixo e, se passava do limite (um
// quadro mais longo), invertia a direção a cada quadro e ficava parado no canto só atirando.
// b: { x, y, vy, alvoX, alvoTempo }; passo = velocidade do quadro (1 = 60fps); rnd = Math.random (testes injetam).
const VILAO_PATRULHA = { minX: 470, maxX: 680, minY: 30, maxY: 220, velX: 1.6, tempoMin: 70, tempoMax: 200 };
function stepVilaoPatrulha(b, passo, velY, rnd, lim) {
    const L = lim || VILAO_PATRULHA, r = rnd || Math.random;
    const vel = Math.abs(b.vy) || 2;
    if (!(b.vy)) b.vy = vel;
    b.y += b.vy * velY * passo;
    if (b.y <= L.minY) { b.y = L.minY; b.vy = vel; }            // sempre de volta para dentro (nunca fica preso)
    else if (b.y >= L.maxY) { b.y = L.maxY; b.vy = -vel; }
    b.alvoTempo = (b.alvoTempo || 0) - passo;
    if (!(b.alvoTempo > 0) || typeof b.alvoX !== "number") {
        b.alvoX = L.minX + r() * (L.maxX - L.minX);
        b.alvoTempo = L.tempoMin + r() * (L.tempoMax - L.tempoMin);
        if (r() < 0.35) b.vy = -b.vy;                              // às vezes também troca de sentido na vertical
    }
    const dx = b.alvoX - b.x, mx = L.velX * passo;
    b.x += Math.abs(dx) <= mx ? dx : Math.sign(dx) * mx;
    return b;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        getPadStickThreshold,
        PAD_SENSITIVITY_DEFAULT,
        chooseControlsTestOwner,
        getScrollToRevealRow,
        removeBackgroundColor,
        colorHexToRgb,
        rgbToHex,
        normalizeBgRemoval,
        getBgRemovalKey,
        pickCornerColor,
        PAD_ACTIONS,
        DEFAULT_PAD_BINDINGS,
        PAD_BINDINGS_VERSION,
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
        NORMAL_ATTACK_DAMAGE,
        WAVE_DIFFICULTY_CAP,
        STAGE_PROGRESSION,
        FASES_PADRAO,
        MINIONS_PADRAO,
        getFaseDef,
        formatarTempoPartida,
        ordenarFases,
        trocarPosicaoFase,
        aplicarOrdemDasFases,
        VERSUS_ROUNDS_TO_WIN,
        registerVersusRoundWin,
        STAGE_MODE_WAVE_COUNT,
        NORMAL_MODE_WAVES,
        HARD_MODE_WAVES,
        getModeWaveSequence,
        getRealWaveForModeStep,
        isStageUnlockedByProgress,
        isUnlimitedModeUnlocked,
        isHardModeUnlocked,
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
        shuffleArray,
        SAIBAMAN_SPROUT_FRAMES,
        SAIBAMAN_GRAB_FRAMES,
        SAIBAMAN_LUNGE_RADIUS,
        SAIBAMAN_LUNGE_MAX_FRAMES,
        SAIBAMAN_THROWN_FRAMES,
        throwSaibaman,
        shouldSaibamanLunge,
        stepSaibamanLunge,
        createSaibaman,
        isSaibamanActive,
        stepSaibamanMotion,
        getStageMusicEra,
        TIME_ROOM_LAP_SCROLL,
        getTimeRoomOrbitAngle,
        CELL_ARENA_LAP_SCROLL,
        getCellArenaOrbitAngle,
        FREEZA_SHIP_LAP_SCROLL,
        getFreezaShipOrbitAngle,
        getStageLapAngle,
        KAIO_PLANET_LAP_SCROLL,
        TERRA_ARENA_LAP_SCROLL,
        KAIOSHIN_LAP_SCROLL,
        KAME_ISLAND_LAP_SCROLL,
        PLATAFORMA_LAP_SCROLL,
        CAPITAL_LAP_SCROLL,
        migrarProgressoIlhaKame,
        NAMEK_FORWARD_SPEED,
        getForwardTravel,
        getLoopFrameIndex,
        stepVilaoPatrulha,
        VILAO_PATRULHA,
        escalaDaAltura,
        normalizarAltura,
        MAPA_TOTAL_FASES,
        MAPA_FASES_POR_TRECHO,
        getMapaPosicaoFase,
        getMapaTrecho,
        getMapaLargura,
        limitarRolagemMapa,
        rolagemParaFase,
        MAPA_HORIZONTE_Y,
        getMapaMistura,
        ALTURA_PADRAO_CM,
        ESCALA_ALTURA_MIN,
        ESCALA_ALTURA_MAX
    };
}
