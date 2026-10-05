// ==================== MENU.JS - ARENAS FIDEDIGNAS DBZ, ITENS HD E LOOP PRINCIPAL ====================

function inRect(x, y, rx, ry, rw, rh) {
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

// ==================== LAYOUT DOS MENUS ====================
// Posição de cada botão dos menus num lugar só: o desenho (render, via drawBtnAt) e o clique (handleMenuClick,
// via hitRect) leem daqui. Antes cada posição era escrita duas vezes — bastava mudar uma e esquecer a outra para
// o botão ficar desalinhado (clicar num lugar e acontecer outra coisa). Mudou um botão de lugar? Mude só aqui.
const rect = (x, y, w, h) => ({ x, y, w, h });
const MENU_LAYOUT = {
    back: rect(20, 20, 42, 32),
    main: {
        play: rect(190, 95, 180, 36), characters: rect(430, 95, 180, 36),
        stages: rect(190, 150, 180, 36), options: rect(430, 150, 180, 36),
        ranking: rect(190, 205, 180, 36), database: rect(430, 205, 180, 36),
        achievements: rect(190, 260, 180, 36), tutorial: rect(430, 260, 180, 36),
        updates: rect(20, 305, 120, 26)
    },
    modeSelect: { single: rect(175, 176, 200, 58), coop: rect(425, 176, 200, 58) },
    paused: { resume: rect(300, 110, 200, 35), options: rect(300, 160, 200, 35), exit: rect(300, 210, 200, 35) },
    characters: { tabHeroes: rect(250, 45, 140, 25), tabVillains: rect(410, 45, 140, 25) },
    optionsMain: { controls: rect(220, 125, 360, 42), audio: rect(220, 180, 360, 42), cast: rect(220, 235, 360, 42) },
    optionsControls: {
        pc: rect(180, 120, 220, 42), touch: rect(420, 120, 220, 42), gamepad: rect(180, 172, 220, 42), test: rect(420, 172, 220, 42),
        // chaves de modo de entrada (só uma ligada): área de toque em volta de cada chave, centro em cx
        toggles: [
            { key: "auto", label: "AUTOMÁTICO", cx: 215, ...rect(160, 236, 110, 70) },
            { key: "pc", label: "PC", cx: 338, ...rect(283, 236, 110, 70) },
            { key: "touch", label: "TOUCH", cx: 461, ...rect(406, 236, 110, 70) },
            { key: "joystick", label: "JOYSTICK", cx: 584, ...rect(529, 236, 110, 70) }
        ]
    },
    optionsGamepad: { reset: rect(570, 82, 120, 28), test: rect(570, 122, 120, 28), sensLess: rect(570, 222, 34, 28), sensMore: rect(656, 222, 34, 28) },
    optionsPc: {
        profileP1: rect(130, 78, 150, 32), profileP2: rect(520, 78, 150, 32),
        keyboard: rect(130, 114, 150, 28), mouse: rect(520, 114, 150, 28),
    },
    optionsTouch: {
        analog: rect(170, 106, 180, 34), swipe: rect(450, 106, 180, 34),
        doubleTap: rect(200, 148, 400, 34), vibration: rect(200, 190, 400, 34),
        autoFire: rect(200, 232, 400, 34), hud: rect(200, 274, 400, 34)
    },
    optionsHud: { save: rect(20, 20, 100, 30), reset: rect(130, 20, 124, 30) },
    optionsAudio: {
        sfxMinus: rect(560, 105, 34, 34), sfxPlus: rect(604, 105, 34, 34),
        bgmMinus: rect(560, 160, 34, 34), bgmPlus: rect(604, 160, 34, 34),
        mute: rect(250, 205, 300, 38),
        tracks: rect(250, 252, 300, 38)
    },
    ranking: { tabGeneral: rect(220, 52, 170, 30), tabStage: rect(410, 52, 170, 30) },
    stageVictory: { continue: rect(canvas.width / 2 - 90, 300, 180, 34) },
    stageMap: {
        normal: rect(canvas.width / 2 - 270, 140, 170, 60), hard: rect(canvas.width / 2 - 85, 140, 170, 60),
        unlimited: rect(canvas.width / 2 + 100, 140, 170, 60), cancel: rect(canvas.width / 2 - 70, 224, 140, 30)
    }
};
// Botões que se repetem em grade/lista: a posição de cada um vem de uma função, também usada nos dois lados.
// Tela PERSONAGENS: 5 cartões por fileira; com mais de 2 fileiras a lista rola (roda do mouse, arrastar o dedo
// ou o controle), igual ao Database. CHARACTERS_GRID_TOP = onde a lista começa (abaixo das abas HERÓIS/VILÕES).
const CHARACTERS_GRID_TOP = 80;
let charactersScrollY = 0;
const charactersTouchScroll = { active: false, touchId: null, startY: 0, startScrollY: 0, dragged: false };
function getCharacterCardRect(i) {
    // grade de 5 colunas centralizada na tela
    const esquerda = Math.round((canvas.width - (UI.GRID_CARD_WIDTH * 5 + 12 * 4)) / 2);
    return rect(esquerda + (i % 5) * (UI.GRID_CARD_WIDTH + 12), CHARACTERS_GRID_TOP + Math.floor(i / 5) * (UI.GRID_CARD_HEIGHT + 10) - charactersScrollY, UI.GRID_CARD_WIDTH, UI.GRID_CARD_HEIGHT);
}
function getCharactersMaxScroll() {
    const rows = Math.ceil(getFilteredCharacters().length / 5);
    const contentBottom = CHARACTERS_GRID_TOP + rows * (UI.GRID_CARD_HEIGHT + 10) - 10;
    return Math.max(0, contentBottom + 8 - canvas.height);
}
function setCharactersScroll(value) {
    charactersScrollY = Math.max(0, Math.min(getCharactersMaxScroll(), value));
}
// Controle: se o cartão focado ficou fora da área visível, rola a lista até ele.
function revealPadFocusInCharacters() {
    if (gameState !== "characters" || !padNav.focus) return;
    const half = UI.GRID_CARD_HEIGHT / 2;
    let delta = 0;
    if (padNav.focus.y - half < CHARACTERS_GRID_TOP) delta = padNav.focus.y - half - CHARACTERS_GRID_TOP;
    else if (padNav.focus.y + half > canvas.height - 4) delta = padNav.focus.y + half - (canvas.height - 4);
    if (!delta) return;
    const before = charactersScrollY;
    setCharactersScroll(charactersScrollY + delta);
    padNav.focus.y -= charactersScrollY - before;
}
function getStageCardRect(i) {
    return rect(40 + (i % 4) * 190, 68 + Math.floor(i / 4) * 104, 175, 90);
}
function getPcKeyRect(idx) {
    return rect(idx % 2 === 0 ? 280 : 560, PC_KEY_ROW_Y0 + Math.floor(idx / 2) * PC_KEY_ROW_STEP, 110, 24);
}
function getGamepadBindingRect(i) {
    return rect(330, 82 + i * 36, 210, 28);
}
function getRankingStageTabRect(i) {
    return rect(40 + (i % 8) * 92, 90, 84, 30);
}
// TRILHAS SONORAS: uma linha por fase (duas colunas de 4), com o botão TOCAR/PAUSAR à direita.
function getTrackRowRect(i) {
    return rect(86 + Math.floor(i / 4) * 322, 104 + (i % 4) * 50, 306, 44);
}
function getTrackPlayRect(i) {
    const r = getTrackRowRect(i);
    return rect(r.x + r.w - 92, r.y + 6, 84, 32);
}
function hitRect(x, y, r) {
    return inRect(x, y, r.x, r.y, r.w, r.h);
}
function drawBtnAt(r, text, color, font) {
    drawBtn(r.x, r.y, r.w, r.h, text, color, font);
}

// isTouchDevice agora é declarada em database.js (precisa existir antes do initSettings).
let touchAnalog = { active: false, touchId: null, startX: 0, startY: 0, curX: 0, curY: 0, vx: 0, vy: 0 };
let touchChargeId = null;        // id do dedo que está segurando o botão CARREGAR (null = ninguém)
let lastInputWasTouch = false;   // true quando o último input foi toque (desliga o "seguir mouse")
let lastTouchStartAt = 0;        // usado para ignorar o "mouse fantasma" que o navegador gera logo após um toque
let pseudoFullscreen = false;   // tela cheia "falsa" (CSS) quando o navegador bloqueia a real (ex.: iPhone, iframes)
// Tela cheia que o jogador ligou pelo botão. No celular, puxar a borda da tela (gesto de voltar do Android) faz o
// navegador sair da tela cheia sem querer — a janela encolhe e aparece a barra cinza de cima. Nesse caso o jogo
// volta para a tela cheia no próximo toque (o navegador só deixa entrar em tela cheia a partir de um toque).
let telaCheiaDesejada = false;
let voltarTelaCheiaNoToque = false;
let telaCheiaVoltouEm = -1e9;   // quando a tela cheia voltou sozinha (o mesmo toque não pode desligá-la)
const PAUSE_BUTTON = { w: 44, h: 28 };
let touchAttackCooldown = 0;       // frames até o próximo tiro automático (dedo apoiado no analógico/tela)
const TOUCH_AUTOFIRE_INTERVAL = 11; // frames entre tiros (~5 por segundo)
let autoPaused = false;            // pausa foi automática (troca de aba, ligação...)
let resumeCountdown = 0;           // segundos restantes da contagem 3-2-1 ao retomar
const PC_KEY_ROW_Y0 = 148;         // linhas da tela de teclas (agora 9 ações, por isso o espaçamento menor)
const PC_KEY_ROW_STEP = 27;
const HUD_SCALE_RANGE = { min: 0.6, max: 1.6 };
const HUD_OPACITY_RANGE = { min: 0.3, max: 1 };

// Vibração (só em aparelho touch e se o jogador não desligou nas opções).
function vibrate(pattern) {
    if (!vibrationEnabled || !isTouchDevice) return;
    try {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(pattern);
    } catch (err) { /* sem suporte: ignora */ }
}
const TOUCH_ANALOG = { RADIUS: 50, DEADZONE: 12, IDLE_X: 100, IDLE_Y: 262 };
let touchSwipe = { active: false, touchId: null, lastX: 0, lastY: 0 };
let touchMoveX = 0, touchMoveY = 0;
let lastTouchTime = 0;
let optionsReturnState = "menu";
let characterDatabaseScrollY = 0;
// Arrastar o dedo na tela Database rola a lista (não existia toque de arraste, só a roda do mouse no PC).
// "dragged" vira true assim que o movimento passa de um pequeno limiar, e nesse caso o toque NÃO conta como
// clique em EDITAR/EXCLUIR/etc ao soltar o dedo — só um arraste puro rola, só um toque parado clica.
const DATABASE_DRAG_THRESHOLD = 6;
const databaseTouchScroll = { active: false, touchId: null, startY: 0, startScrollY: 0, dragged: false };

let achievementsScrollY = 0;
const achievementsTouchScroll = { active: false, touchId: null, startY: 0, startScrollY: 0, dragged: false };
let rankingViewMode = "geral";      // "geral" | "fase"
let rankingSelectedStage = null;    // qual arena está selecionada na visão "por fase"
let stageChoicePendingId = null;    // id da fase clicada no mapa quando ela já foi dominada (mostra o overlay
                                     // "DESAFIO (10 CHEFES)" vs "SEM LIMITE" antes de começar a partida)
const TIER_COLORS = { diamond: "#7fe8ff", gold: "#ffd23f", silver: "#cbd2da", bronze: "#c2793a" };

// ==================== MAPA DE FASES (hub do singleplayer) ====================
// Posições em serpentina (linha de baixo pra cima, esquerda-direita depois direita-esquerda), na MESMA ordem
// de STAGE_PROGRESSION — a fase N sempre se conecta só com a N-1 e a N+1, mantendo a sequência visível.
const STAGE_MAP_POSITIONS = [
    { x: 145, y: 248 }, { x: 315, y: 248 }, { x: 485, y: 248 }, { x: 655, y: 248 },
    { x: 655, y: 98 }, { x: 485, y: 98 }, { x: 315, y: 98 }, { x: 145, y: 98 }
];
const STAGE_MAP_NODE_R = 26;

// Cor "tema" de cada arena, usada no anel do nó e no traço pontilhado até ela.
const STAGE_THEME_COLOR = {
    terra: "#f6b93b", kaio: "#a78bfa", namek: "#4ade80", namek_explosao: "#f87171",
    freeza_ship: "#c084fc", time_room: "#e2e8f0", cell_games: "#38bdf8", kaioshin: "#fbbf24"
};

// Ilustração pequena e simples de cada arena dentro do círculo do nó — não é o cenário completo (custaria caro
// nesse tamanho), só um símbolo que lembra a fase: o suficiente pra reconhecer de relance no mapa.
// Ícone de fase bloqueada (cinza e apagado). O filtro de cinza do canvas é caro no celular, então cada ícone
// cinza é desenhado uma vez numa imagem guardada e depois só copiado a cada quadro.
const lockedStageIconCache = {};
// Cards da tela ARENAS: cada um mostra uma foto do cenário da fase. A foto é tirada uma vez (desenhando o
// cenário na tela e copiando um recorte) — uma fase por quadro para não engasgar — e guardada colorida e em
// cinza (para a fase bloqueada).
const STAGE_CARD_W = 175, STAGE_CARD_H = 90;
const stageCardThumbs = {};
function prepareNextStageCardThumb() {
    const stg = STAGE_PROGRESSION.find(st => !stageCardThumbs[st.id]);
    if (!stg) return;
    const antesFase = selectedStage, antesScroll = world.stageScrollX;
    selectedStage = stg.id;
    world.stageScrollX = 0;
    ctx.save();
    applyRenderTransform();
    try { drawStageBackground(); } finally { ctx.restore(); }
    selectedStage = antesFase;
    world.stageScrollX = antesScroll;

    const w = STAGE_CARD_W * 2, h = STAGE_CARD_H * 2;
    // recorte do meio do cenário com a mesma proporção do card
    const srcH = canvas.height, srcW = Math.min(canvas.width, srcH * STAGE_CARD_W / STAGE_CARD_H);
    const cor = document.createElement("canvas");
    cor.width = w; cor.height = h;
    const g = cor.getContext("2d");
    if (g) g.drawImage(canvasEl, (canvas.width - srcW) / 2 * renderScale, 0, srcW * renderScale, srcH * renderScale, 0, 0, w, h);
    const cinza = document.createElement("canvas");
    cinza.width = w; cinza.height = h;
    const gc = cinza.getContext("2d");
    if (gc) {
        gc.drawImage(cor, 0, 0);
        try {
            const px = gc.getImageData(0, 0, w, h), d = px.data;
            for (let i = 0; i < d.length; i += 4) {
                const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) * 0.55;
                d[i] = d[i + 1] = d[i + 2] = l;
            }
            gc.putImageData(px, 0, 0);
        } catch (e) {}
    }
    stageCardThumbs[stg.id] = { cor, cinza };
}

function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
}

function drawLockedStageNodeIcon(cx, cy, r, stageId) {
    const thumb = stageCardThumbs[stageId];
    if (thumb && thumb.cinza) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        drawStageThumbCircle(cx, cy, r, thumb.cinza);
        ctx.restore();
        return;
    }
    const key = stageId + "|" + r;
    let icon = lockedStageIconCache[key];
    if (!icon) {
        const size = Math.ceil(r * 2 + 4);
        icon = document.createElement("canvas");
        icon.width = icon.height = size;
        const ictx = icon.getContext("2d");
        if (!ictx) return;
        drawStageNodeIcon(size / 2, size / 2, r, stageId, ictx);
        try {
            const px = ictx.getImageData(0, 0, size, size), d = px.data;
            for (let i = 0; i < d.length; i += 4) {
                const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
                d[i] = d[i + 1] = d[i + 2] = g;
            }
            ictx.putImageData(px, 0, 0);
        } catch (e) {}
        lockedStageIconCache[key] = icon;
    }
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.drawImage(icon, cx - icon.width / 2, cy - icon.height / 2);
    ctx.restore();
}

// Recorte redondo da foto da fase (a mesma das cartas de ARENAS): mostra a fase como ela é hoje.
function drawStageThumbCircle(cx, cy, r, img, g = ctx) {
    const s = (r * 2) / img.height, w = img.width * s;
    g.save();
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.clip();
    g.drawImage(img, cx - w / 2, cy - r, w, r * 2);
    g.restore();
}

function drawStageNodeIcon(cx, cy, r, stageId, g = ctx) {
    const thumb = stageCardThumbs[stageId];
    if (thumb && thumb.cor) { drawStageThumbCircle(cx, cy, r, thumb.cor, g); return; }
    g.save();
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.clip();
    if (stageId === "terra") {
        g.fillStyle = "#7ec8f2"; g.fillRect(cx - r, cy - r, r * 2, r * 2);
        g.fillStyle = "#d9a441"; g.fillRect(cx - r, cy + r * 0.3, r * 2, r);
        g.strokeStyle = "#c0392b"; g.lineWidth = 3; g.strokeRect(cx - r * 0.6, cy - r * 0.1, r * 1.2, r * 0.4);
    } else if (stageId === "kaio") {
        g.fillStyle = "#2d1b4e"; g.fillRect(cx - r, cy - r, r * 2, r * 2);
        g.fillStyle = "#c9b6f5"; g.beginPath(); g.arc(cx, cy, r * 0.55, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#8a6fd1"; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, r * 0.95, r * 0.3, 0.4, 0, Math.PI * 2); g.stroke();
    } else if (stageId === "namek") {
        g.fillStyle = "#0f3d2e"; g.fillRect(cx - r, cy - r, r * 2, r * 2);
        g.fillStyle = "#3fae6a"; g.beginPath(); g.arc(cx, cy + r * 0.3, r * 0.7, Math.PI, 0); g.fill();
        g.fillStyle = "#1d6b3f"; g.fillRect(cx - r * 0.12, cy - r * 0.1, r * 0.24, r * 0.5);
    } else if (stageId === "namek_explosao") {
        g.fillStyle = "#5a0e0e"; g.fillRect(cx - r, cy - r, r * 2, r * 2);
        g.fillStyle = "#ff8a3d"; g.beginPath(); g.arc(cx, cy, r * 0.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#ffe08a"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx - r * 0.6, cy - r * 0.3); g.lineTo(cx, cy); g.lineTo(cx - r * 0.2, cy + r * 0.6); g.stroke();
    } else if (stageId === "freeza_ship") {
        g.fillStyle = "#1a0f2e"; g.fillRect(cx - r, cy - r, r * 2, r * 2);
        g.fillStyle = "#8a5fd1"; g.beginPath(); g.ellipse(cx, cy, r * 0.8, r * 0.35, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#c9a6f0"; g.beginPath(); g.arc(cx, cy - r * 0.15, r * 0.28, 0, Math.PI * 2); g.fill();
    } else if (stageId === "time_room") {
        g.fillStyle = "#e8e8ef"; g.fillRect(cx - r, cy - r, r * 2, r * 2);
        g.fillStyle = "#b8b8c8";
        for (let gx = -r; gx < r; gx += r * 0.4) g.fillRect(cx + gx, cy - r, 1.2, r * 2);
        for (let gy = -r; gy < r; gy += r * 0.4) g.fillRect(cx - r, cy + gy, r * 2, 1.2);
    } else if (stageId === "cell_games") {
        g.fillStyle = "#bfe4ff"; g.fillRect(cx - r, cy - r, r * 2, r * 2);
        g.fillStyle = "#e8e4d8"; g.fillRect(cx - r, cy + r * 0.2, r * 2, r);
        g.strokeStyle = "#c0392b"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - r, cy + r * 0.25); g.lineTo(cx + r, cy + r * 0.25); g.stroke();
    } else if (stageId === "kaioshin") {
        g.fillStyle = "#3a2a6a"; g.fillRect(cx - r, cy - r, r * 2, r * 2);
        g.fillStyle = "#fbbf24";
        const spikes = 5, R1 = r * 0.55, R2 = r * 0.24;
        g.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const ang = (Math.PI / spikes) * i - Math.PI / 2, rad = i % 2 === 0 ? R1 : R2;
            const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
            i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
        }
        g.closePath(); g.fill();
    }
    g.restore();
}

// Devolve as posições já combinadas com STAGE_PROGRESSION, prontas pra desenhar (id, name, x, y, unlocked, record).
// Botão de modo (DIFÍCIL / SEM LIMITE) no overlay de escolha: desenhado apagado/cinza quando ainda bloqueado,
// sem registrar como alvo clicável — bate com o "difícil estará apagada" pedido.
function drawModeButton(x, y, w, h, label, unlocked, color) {
    if (unlocked) {
        drawBtn(x, y, w, h, label, color, "bold 11px 'Courier New', monospace");
        return;
    }
    const pressed = beginButtonPress(x, y, w, h);
    ctx.save();
    ctx.fillStyle = "rgba(20, 20, 30, 0.7)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#3a3a48";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#5a5a68";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2 - 6);
    ctx.font = "8px 'Courier New', monospace";
    ctx.fillText("BLOQUEADO", x + w / 2, y + h / 2 + 10);
    ctx.restore();
    endButtonPress(pressed);
}

function getStageMapNodes() {
    return STAGE_PROGRESSION.map((stg, i) => Object.assign({}, stg, STAGE_MAP_POSITIONS[i], {
        unlocked: isStageUnlockedByProgress(stg.id, stageProgress),
        record: getStageWaveRecordFor(stg.id)
    }));
}

// Medalha simples (círculo com uma fitinha) desenhada com formas básicas, sem depender de emoji/fonte especial.
// Cadeado das fases bloqueadas no mapa: arco + corpo dourado + fechadura. `open` (0..1) levanta e gira o arco
// (animação de quando a fase acaba de ser liberada).
// Quanto o lutador cresce em cada movimento (o mesmo número é usado para preparar a pixel art antes da luta).
const ACTION_SPRITE_SCALE = {
    idle: 1, flyRight: 1.05, flyLeft: 1.05, flyUp: 1.08, flyDown: 1.08, flyUpRight: 1.08, flyUpLeft: 1.08,
    flyDownRight: 1.08, flyDownLeft: 1.08, parry: 1.12, attackKi: 1.1, chargeKi: 1.06, transform: 1.15, hit: 1.04
};
const PIXEL_SPRITE_SCALE = 1.54;   // tamanho do desenho em pixel art em relação à caixa de colisão do lutador
let stageUnlockAnim = null;   // { id, t }: cadeado abrindo no mapa de fases (ver render de "stage_map")

function drawPadlock(cx, cy, size, open = 0) {
    const bodyW = size * 1.5, bodyH = size * 1.15, r = size * 0.22;
    const bodyX = cx - bodyW / 2, bodyY = cy - bodyH / 2 + size * 0.3;
    ctx.save();
    // arco (sobe e abre pro lado quando destrava)
    ctx.save();
    ctx.translate(cx + size * 0.45, bodyY - open * size * 0.45);
    ctx.rotate(-open * 0.9);
    ctx.strokeStyle = "#b9c2cf";
    ctx.lineWidth = size * 0.28;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 0.9, size * 0.05);
    ctx.lineTo(-size * 0.9, -size * 0.35);
    ctx.arc(-size * 0.45, -size * 0.35, size * 0.45, Math.PI, 0);
    ctx.lineTo(0, size * 0.05);
    ctx.stroke();
    ctx.restore();
    // corpo
    ctx.fillStyle = "#e8b93a";
    ctx.strokeStyle = "#6b4a10";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bodyX + r, bodyY);
    ctx.arcTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + bodyH, r);
    ctx.arcTo(bodyX + bodyW, bodyY + bodyH, bodyX, bodyY + bodyH, r);
    ctx.arcTo(bodyX, bodyY + bodyH, bodyX, bodyY, r);
    ctx.arcTo(bodyX, bodyY, bodyX + bodyW, bodyY, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";   // brilho
    ctx.fillRect(bodyX + size * 0.2, bodyY + size * 0.15, size * 0.18, bodyH - size * 0.3);
    // fechadura
    ctx.fillStyle = "#3a2a10";
    ctx.beginPath();
    ctx.arc(cx, bodyY + bodyH * 0.42, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - size * 0.07, bodyY + bodyH * 0.42, size * 0.14, bodyH * 0.35);
    ctx.restore();
}

function drawMedalIcon(cx, cy, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy - r * 0.2);
    ctx.lineTo(cx - r * 1.1, cy - r * 1.8);
    ctx.lineTo(cx - r * 0.4, cy - r * 1.8);
    ctx.lineTo(cx, cy - r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.55, cy - r * 0.2);
    ctx.lineTo(cx + r * 1.1, cy - r * 1.8);
    ctx.lineTo(cx + r * 0.4, cy - r * 1.8);
    ctx.lineTo(cx, cy - r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function getAchievementsLayoutMetrics() {
    const columns = 2;
    const gridTop = 92;
    const margem = 24;
    const gapX = 12, gapY = 8;
    const cardWidth = Math.min(280, (canvas.width - margem * 2 - gapX * (columns - 1)) / columns);
    // grade centralizada na tela (alinhada com o painel das medalhas)
    const gridLeft = Math.round((canvas.width - (cardWidth * columns + gapX * (columns - 1))) / 2);
    const cardHeight = 52;
    const viewportHeight = canvas.height - gridTop - 34;
    return { columns, gridTop, gridLeft, gapX, gapY, cardWidth, cardHeight, viewportHeight };
}

function getAchievementsMaxScroll(layout) {
    layout = layout || getAchievementsLayoutMetrics();
    const keys = Object.keys(achievements);
    const totalRows = Math.ceil(keys.length / layout.columns);
    const contentHeight = totalRows * (layout.cardHeight + layout.gapY) - layout.gapY;
    return Math.max(0, contentHeight - layout.viewportHeight);
}
let databaseImageCache = {};

// Imagem do personagem para os cartões (PERSONAGENS e DATABASE): a já carregada ou uma guardada no cache — nunca
// cria uma Image nova a cada quadro enquanto a imagem do personagem ainda está carregando.
function getCharacterCardImage(cItem) {
    if (!cItem) return null;
    if (cItem.imageObj) return cItem.imageObj;
    if (!cItem.defaultUrl) return null;
    if (!databaseImageCache[cItem.defaultUrl]) {
        const img = new Image();
        img.src = cItem.defaultUrl;
        databaseImageCache[cItem.defaultUrl] = img;
    }
    return databaseImageCache[cItem.defaultUrl];
}
// Retrato dos cartões (SELEÇÃO DE PERSONAGEM e DATABASE): personagem grande, liso (sem serrilhado), sem distorção
// e na resolução real da tela. Desenhos do jogo/construtor (SVG) são refeitos no tamanho exato e recortados nas
// bordas vazias, então o personagem ocupa o cartão; vale igual para personagens novos criados no editor.
// Imagens enviadas (folhas de sprite) usam o 1º quadro, sem esticar. Fica guardado por personagem e tamanho.
const cardPortraitCache = new Map();
function getCardPortrait(cItem, w, h) {
    const src = cItem && cItem.defaultUrl;
    if (!src || !String(src).startsWith("data:image/svg") || typeof document === "undefined") return null;
    const pw = Math.max(1, Math.round(w * renderScale)), ph = Math.max(1, Math.round(h * renderScale));
    const chave = src.length + ":" + src.slice(-48) + "|" + pw + "x" + ph;
    if (cardPortraitCache.has(chave)) return cardPortraitCache.get(chave);
    cardPortraitCache.set(chave, null);
    if (cardPortraitCache.size > 160) cardPortraitCache.delete(cardPortraitCache.keys().next().value);
    // desenha 2x maior que o espaço (para ainda caber depois de cortar as bordas vazias) e com bordas suaves
    const escalaDesenho = 2.2;
    const larguraSvg = Math.round(ph * escalaDesenho * (96 / 112)), alturaSvg = Math.round(ph * escalaDesenho);
    const liso = String(src).replace(/shape-rendering%3D%22crispEdges%22/g, "shape-rendering%3D%22geometricPrecision%22")
        .replace(/width%3D%22[\d.]+%22%20height%3D%22[\d.]+%22/, `width%3D%22${larguraSvg}%22%20height%3D%22${alturaSvg}%22`);
    const img = new Image();
    img.onload = () => {
        try {
            const c = document.createElement("canvas");
            c.width = larguraSvg; c.height = alturaSvg;
            const g = c.getContext("2d", { willReadFrequently: true });
            g.drawImage(img, 0, 0, larguraSvg, alturaSvg);
            // recorta as bordas transparentes (o desenho tem margem para aura/cabelo)
            const d = g.getImageData(0, 0, larguraSvg, alturaSvg).data;
            let x0 = larguraSvg, y0 = alturaSvg, x1 = -1, y1 = -1;
            for (let y = 0; y < alturaSvg; y++) for (let x = 0; x < larguraSvg; x++) {
                if (d[(y * larguraSvg + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            }
            if (x1 < 0) { cardPortraitCache.set(chave, c); return; }
            const cw = x1 - x0 + 1, ch = y1 - y0 + 1, k = Math.min(pw / cw, ph / ch);
            const out = document.createElement("canvas");
            out.width = pw; out.height = ph;
            const o = out.getContext("2d");
            o.imageSmoothingEnabled = true;
            if ("imageSmoothingQuality" in o) o.imageSmoothingQuality = "high";
            const dw = cw * k, dh = ch * k;
            o.drawImage(c, x0, y0, cw, ch, (pw - dw) / 2, ph - dh, dw, dh);   // pés embaixo, centralizado
            cardPortraitCache.set(chave, out);
        } catch (e) { cardPortraitCache.delete(chave); }
    };
    img.src = liso;
    return null;
}
function drawCharacterPortrait(cItem, x, y, w, h) {
    const retrato = getCardPortrait(cItem, w, h);
    if (retrato) { ctx.drawImage(retrato, x, y, w, h); return true; }
    let img = getCutoutSource(getCharacterCardImage(cItem), cItem && cItem.bgRemoval);
    if (!isDrawableSource(img)) return false;
    try {
        const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
        // folha de sprite: só o 1º quadro
        const fw = cItem && cItem.frameWidth && cItem.totalFrames > 1 ? Math.min(iw, cItem.frameWidth) : iw;
        const fh = cItem && cItem.frameHeight && cItem.totalFrames > 1 ? Math.min(ih, cItem.frameHeight) : ih;
        const k = Math.min(w / fw, h / fh), dw = fw * k, dh = fh * k;
        const liso = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = !(img.__svgImage || String(img.src || "").includes("crispEdges")) ? true : liso;
        ctx.drawImage(img, 0, 0, fw, fh, x + (w - dw) / 2, y + h - dh, dw, dh);
        ctx.imageSmoothingEnabled = liso;
    } catch (e) { return false; }
    return true;
}
const DATABASE_COLUMNS = 5;
const FULLSCREEN_BUTTON = { w: 44, h: 28, margin: 8 };

function getFullscreenButtonRect() {
    return {
        x: canvas.width - FULLSCREEN_BUTTON.w - FULLSCREEN_BUTTON.margin,
        y: FULLSCREEN_BUTTON.margin,
        w: FULLSCREEN_BUTTON.w,
        h: FULLSCREEN_BUTTON.h
    };
}

function isFullscreenActive() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement || pseudoFullscreen);
}

// Liga/desliga a classe CSS de tela cheia e recalcula o tamanho do canvas (proporção 800x350 preservada).
// O navegador só atualiza a janela depois do evento, então reajusta de novo após um instante.
function syncFullscreenState() {
    const container = document.getElementById("game-container");
    if (container) container.classList.toggle("is-fullscreen", isFullscreenActive());
    // saiu da tela cheia sem ser pelo botão do jogo (ex.: gesto na borda do celular): volta no próximo toque
    voltarTelaCheiaNoToque = telaCheiaDesejada && !isFullscreenActive() && isMobileDevice();
    if (typeof fitCanvasToViewport === "function") {
        fitCanvasToViewport();
        setTimeout(fitCanvasToViewport, 150);
        setTimeout(fitCanvasToViewport, 400);
    }
}

function toggleFullscreen() {
    const container = document.getElementById("game-container");
    if (!container) return;
    // o toque que trouxe a tela cheia de volta pode ter sido no próprio botão: não desliga de novo
    if (performance.now() - telaCheiaVoltouEm < 700) return;

    if (isFullscreenActive()) {
        telaCheiaDesejada = false;
        voltarTelaCheiaNoToque = false;
        if (pseudoFullscreen) {
            pseudoFullscreen = false;
            syncFullscreenState();
            return;
        }
        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
        if (exitFullscreen) exitFullscreen.call(document);
        return;
    }

    telaCheiaDesejada = true;
    const enterPseudo = () => { pseudoFullscreen = true; syncFullscreenState(); };
    const requestFullscreen = container.requestFullscreen || container.webkitRequestFullscreen;
    if (!requestFullscreen) { enterPseudo(); return; }
    // Como aplicativo (ícone da tela inicial) a tela já é cheia: só ajusta o jogo, sem o aviso do Chrome.
    if (isInstalledApp()) {
        enterPseudo();
        if (isMobileDevice() && screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
        return;
    }
    try {
        const result = requestFullscreen.call(container, { navigationUI: "hide" });
        if (result && result.then) {
            result.then(() => {
                // Celular: tenta travar na horizontal (silenciosamente ignora se não for permitido).
                if (isMobileDevice() && screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
            }).catch(enterPseudo);
        }
    } catch (err) {
        enterPseudo();
    }
}

function drawFullscreenButton() {
    const rect = getFullscreenButtonRect();
    // o controle também alcança (menos na derrota/vitória: lá X ou BOLA só voltam ao mapa/menu)
    if (padNavIsActiveState() && gameState !== "gameover") registerMenuTarget(rect.x, rect.y, rect.w, rect.h);
    const hovered = isMouseHovering() && inRect(mouseX, mouseY, rect.x, rect.y, rect.w, rect.h);
    const isActive = isFullscreenActive();
    const centerX = rect.x + rect.w / 2;
    const centerY = rect.y + rect.h / 2;
    const iconSize = isActive ? 15 : 19;
    const halfSize = iconSize / 2;
    const centerGap = isActive ? 3.5 : 4;
    const arrowHead = isActive ? 3.5 : 4;

    const pressed = beginButtonPress(rect.x, rect.y, rect.w, rect.h);
    ctx.save();
    ctx.globalAlpha = hovered ? 1 : 0.8;
    ctx.strokeStyle = hovered ? "#fff0a6" : "rgba(148, 220, 255, 0.95)";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const corners = [
        { x: centerX - halfSize, y: centerY - halfSize, sx: -1, sy: -1 },
        { x: centerX + halfSize, y: centerY - halfSize, sx: 1, sy: -1 },
        { x: centerX - halfSize, y: centerY + halfSize, sx: -1, sy: 1 },
        { x: centerX + halfSize, y: centerY + halfSize, sx: 1, sy: 1 }
    ];

    corners.forEach((corner) => {
        const direction = isActive
            ? { x: -corner.sx, y: -corner.sy }
            : { x: corner.sx, y: corner.sy };
        const tip = isActive
            ? { x: centerX - direction.x * centerGap, y: centerY - direction.y * centerGap }
            : { x: corner.x, y: corner.y };
        const start = isActive
            ? { x: corner.x, y: corner.y }
            : { x: centerX + direction.x * centerGap, y: centerY + direction.y * centerGap };

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tip.x - direction.x * arrowHead, tip.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.lineTo(tip.x, tip.y - direction.y * arrowHead);
        ctx.stroke();
    });
    ctx.restore();
    endButtonPress(pressed);
}

document.addEventListener("fullscreenchange", syncFullscreenState);
document.addEventListener("webkitfullscreenchange", syncFullscreenState);

// Volta para a tela cheia no primeiro toque depois de ela ter saído sem querer (ver telaCheiaDesejada).
function voltarParaTelaCheia() {
    if (!voltarTelaCheiaNoToque || isFullscreenActive()) { voltarTelaCheiaNoToque = false; return; }
    voltarTelaCheiaNoToque = false;
    const container = document.getElementById("game-container");
    const requestFullscreen = container && (container.requestFullscreen || container.webkitRequestFullscreen);
    if (!requestFullscreen) return;
    telaCheiaVoltouEm = performance.now();
    try {
        const result = requestFullscreen.call(container, { navigationUI: "hide" });
        if (result && result.then) {
            result.then(() => {
                if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
            }).catch(() => {});
        }
    } catch (e) {}
}
["pointerup", "touchend"].forEach(tipo => document.addEventListener(tipo, voltarParaTelaCheia, { capture: true, passive: true }));

// Máximo de rolagem da tela Database. Único lugar que calcula isso — usado pelo mouse wheel, pelo arraste
// por toque e pela navegação por controle, para não haver 3 fórmulas que podem se desalinhar.
function getDatabaseMaxScroll(layout) {
    layout = layout || getDatabaseLayoutMetrics();
    const totalRows = Math.ceil(Object.keys(characterDB).length / layout.columns);
    const contentHeight = totalRows * (layout.cardHeight + layout.gapY) - layout.gapY;
    return Math.max(0, contentHeight - layout.viewportHeight);
}

// Igual a getDatabaseMaxScroll, mas também devolve contentHeight (usado pela barra de rolagem para calcular
// o tamanho do "polegar" proporcional ao total de personagens).
function getDatabaseScrollMetrics(layout) {
    layout = layout || getDatabaseLayoutMetrics();
    const totalRows = Math.ceil(Object.keys(characterDB).length / layout.columns);
    const contentHeight = totalRows * (layout.cardHeight + layout.gapY) - layout.gapY;
    return { contentHeight, maxScroll: Math.max(0, contentHeight - layout.viewportHeight) };
}

function getDatabaseLayoutMetrics() {
    const columns = DATABASE_COLUMNS;
    const padX = 30;
    const gapX = 16;
    const gapY = 18;
    const targetVisibleRows = 2;
    const secondRowY = 58;
    const gridTop = 100;
    const bottomSpacing = 48;
    const usableHeight = Math.max(170, canvas.height - gridTop - bottomSpacing);
    // 5 por fileira, ocupando a largura toda (o botão CRIAR NOVO fica em cima, não ao lado da grade)
    const cardWidth = Math.max(110, Math.min(164, (canvas.width - (padX * 2 + gapX * (columns - 1))) / columns));
    const cardHeight = Math.max(100, Math.min(132, (usableHeight - gapY * (targetVisibleRows - 1)) / targetVisibleRows));
    const gridLeft = Math.round((canvas.width - (cardWidth * columns + gapX * (columns - 1))) / 2);   // centralizada
    const viewportHeight = targetVisibleRows * (cardHeight + gapY) - gapY;
    const createButtonWidth = Math.min(200, canvas.width * 0.22);
    const createButtonX = canvas.width - createButtonWidth - 22;
    const createButtonY = secondRowY;
    const backButtonWidth = Math.min(150, canvas.width * 0.18);
    const backButtonX = canvas.width - backButtonWidth - 16;
    const backButtonY = canvas.height - 40;
    const titleX = 26;
    const titleY = secondRowY + 22;

    return {
        columns,
        padX,
        gapX,
        gapY,
        cardWidth,
        cardHeight,
        gridLeft,
        gridTop,
        viewportHeight,
        createButtonWidth,
        createButtonX,
        createButtonY,
        backButtonWidth,
        backButtonX,
        backButtonY,
        titleX,
        titleY,
        maxVisibleRows: targetVisibleRows
    };
}

function getDatabaseCardGeometry(layout, cx, cy) {
    const topPad = 10;
    const nameBlockH = 16;
    const btnBlockH = 24;
    const bottomPad = 6;
    const reserved = nameBlockH + btnBlockH + bottomPad;
    const imageSize = Math.max(36, Math.min(layout.cardWidth - 30, layout.cardHeight - topPad - reserved));
    const imageX = cx + (layout.cardWidth - imageSize) / 2;
    const imageY = cy + topPad;
    const nameY = imageY + imageSize + 12;
    const actionY = nameY + 8;
    const btnW = Math.min(58, layout.cardWidth * 0.32);
    const firstBtnX = cx + (layout.cardWidth - (btnW * 2 + 10)) / 2;

    return { imageSize, imageX, imageY, nameY, actionY, btnW, firstBtnX };
}

function getMouseBindingName(buttonCode) {
    switch (buttonCode) {
        case 0: return "MouseLeft";
        case 1: return "MouseMiddle";
        case 2: return "MouseRight";
        case 3: return "Mouse4";
        case 4: return "Mouse5";
        default: return "Mouse" + buttonCode;
    }
}

function getBindingDisplayName(binding) {
    const labels = {
        ArrowUp: "SETA CIMA",
        ArrowDown: "SETA BAIXO",
        ArrowLeft: "SETA ESQ.",
        ArrowRight: "SETA DIR.",
        Space: "ESPAÇO",
        Enter: "ENTER",
        Numpad0: "NUM 0",
        Numpad1: "NUM 1",
        Numpad2: "NUM 2",
        MouseLeft: "MOUSE ESQ.",
        MouseMiddle: "MOUSE MEIO",
        MouseRight: "MOUSE DIR.",
        Mouse4: "MOUSE 4",
        Mouse5: "MOUSE 5",
        NONE: "NENHUMA"
    };
    if (labels[binding]) return labels[binding];
    if (typeof binding === "string" && binding.startsWith("Key")) return binding.slice(3).toUpperCase();
    if (typeof binding === "string" && binding.startsWith("Digit")) return binding.slice(5);
    return binding || "NENHUMA";
}

// ==================== EFEITO DE BOTÃO APERTADO ====================
// Botões se comportam como botões físicos: enquanto o dedo/mouse segura, o botão "afunda" (desce, encolhe,
// escurece e perde a sombra); ao soltar ele SOBE DE VOLTA ao lugar numa animação curta e, no menu, só então a
// ação acontece — assim dá para ver o botão voltando antes de a tela mudar. Arrastar o dedo para fora antes de
// soltar cancela. Os botões da partida (ATAQUE etc.) agem na hora do toque e só fazem a animação na tela. Tudo só
// vale na tela em que o toque começou: se a tela mudou, um botão da tela nova no mesmo lugar não aparece apertado.
const BUTTON_RELEASE_MS = 110;         // quanto tempo o botão leva para subir de volta ao soltar
const BUTTON_PRESS_CANCEL_DIST = 14;   // arrastou mais que isso (em px do jogo) antes de soltar = cancelou
let menuPointerPress = null;           // { x, y, startX, startY, state, id, onRelease } — ponteiro segurando agora
let buttonRelease = null;              // { x, y, state, start } — botão que acabou de ser solto, subindo de volta
let pendingButtonActions = [];         // ações de menu esperando o botão terminar de subir: { at, state, fn }
const hudPressHeld = {};               // id do dedo -> botão da partida (ATAQUE, ESPECIAL...) que ele está segurando
const hudReleaseStart = {};            // botão da partida -> quando foi solto (para a animação de subir)

// 0 = solto, 1 = totalmente afundado; no meio = subindo de volta depois de soltar.
function releaseProgressAmount(start) {
    const t = (performance.now() - start) / BUTTON_RELEASE_MS;
    return t >= 1 ? 0 : 1 - t * t;   // começa a subir devagar e termina rápido, como uma mola
}

function getPressAmount(x, y, w, h) {
    const p = menuPointerPress;
    if (p && p.state === gameState && inRect(p.x, p.y, x, y, w, h)) return 1;
    const r = buttonRelease;
    if (r && r.state === gameState && inRect(r.x, r.y, x, y, w, h)) return releaseProgressAmount(r.start);
    return 0;
}

function isRectPressed(x, y, w, h) {
    return getPressAmount(x, y, w, h) > 0;
}

// Solta o botão em (x, y): ele começa a subir de volta ao lugar.
function releaseButtonAt(x, y) {
    buttonRelease = { x, y, state: gameState, start: performance.now() };
}

// Ação de menu que só acontece depois do botão terminar de subir (se a tela não tiver mudado nesse meio-tempo).
function scheduleButtonAction(fn) {
    pendingButtonActions.push({ at: performance.now() + BUTTON_RELEASE_MS, state: gameState, fn });
}

// Chamado a cada quadro (render). force = true executa tudo que está esperando (usado pelos testes).
function runDueButtonActions(force = false) {
    if (!pendingButtonActions.length) return;
    const now = performance.now();
    const due = pendingButtonActions.filter(a => force || now >= a.at);
    pendingButtonActions = pendingButtonActions.filter(a => !due.includes(a));
    due.forEach(a => { if (a.state === gameState) a.fn(); });
}

function flushButtonActions() {
    runDueButtonActions(true);
}

function startPointerPress(x, y, id, onRelease) {
    buttonRelease = null;   // um toque novo substitui a animação que ainda sobrava do anterior
    menuPointerPress = { x, y, startX: x, startY: y, state: gameState, id, onRelease };
}

// Aplica a transformação de "afundado" ao redor do centro (cx, cy); desfazer com ctx.restore().
function applyPressTransform(cx, cy, scale = 0.94, drop = 2) {
    ctx.save();
    ctx.translate(cx, cy + drop);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
}

// Envolve o desenho de um botão/cartão: o que for desenhado até endButtonPress sai afundado na medida certa
// (todo afundado enquanto segura, voltando aos poucos ao soltar). Devolve o quanto está afundado (0 = nada).
function beginButtonPress(x, y, w, h) {
    const amount = getPressAmount(x, y, w, h);
    if (amount <= 0) return 0;
    applyPressTransform(x + w / 2, y + h / 2, 1 - 0.06 * amount, 2 * amount);
    return amount;
}

function endButtonPress(applied) {
    if (applied) ctx.restore();
}

function getHudPressAmount(key) {
    if (Object.values(hudPressHeld).includes(key)) return 1;
    return hudReleaseStart[key] ? releaseProgressAmount(hudReleaseStart[key]) : 0;
}

// Traça (sem pintar) um retângulo de cantos arredondados; quem chama decide fill/stroke.
function traceRoundedRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Plataforma em uso agora (a última que mexeu): "controle", "toque" ou "pc" (teclado/mouse).
let lastPadInputAt = 0, lastKeyInputAt = 0;
function getActiveInputPlatform() {
    if (getEffectiveControlMode() === "joystick") return "controle";
    const toque = lastInputWasTouch ? (lastTouchStartAt || 1) : 0;
    if (lastPadInputAt > 0 && lastPadInputAt >= toque && lastPadInputAt >= lastKeyInputAt && getConnectedGamepads().length) return "controle";
    if (isTouchDevice && lastInputWasTouch) return "toque";
    return "pc";
}
function isMouseHovering() {
    return !lastInputWasTouch && !padNav.visible && getActiveInputPlatform() === "pc";
}

// Chave ON/OFF de modo de entrada (tela CONTROLES): nome em cima, OFF/ON e a chave em pílula.
function drawModeToggle(t, ativo, cor) {
    registerMenuTarget(t.x, t.y, t.w, t.h);
    const pressed = beginButtonPress(t.x, t.y, t.w, t.h);
    const cx = t.cx, y = t.y + 34;   // y = topo da pílula
    ctx.save();
    ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 12px 'Courier New', monospace"; ctx.textAlign = "center";
    ctx.fillText(t.label, cx, t.y + 14);
    ctx.fillStyle = "#dbeafe"; ctx.font = "bold 8px 'Courier New', monospace";
    ctx.fillText("OFF", cx - 30, t.y + 28); ctx.fillText("ON", cx + 32, t.y + 28);
    ctx.fillStyle = "rgba(10, 20, 35, 0.9)";
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - 40, y, 80, 26, 13); else ctx.rect(cx - 40, y, 80, 26); ctx.fill();
    ctx.strokeStyle = ativo ? cor : "#7dd3fc"; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = ativo ? cor : "#557089"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 16, y + 13); ctx.lineTo(cx + 16, y + 13); ctx.stroke();
    ctx.fillStyle = ativo ? cor : "#40566d";
    ctx.beginPath(); ctx.arc(cx + (ativo ? 16 : -16), y + 13, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    endButtonPress(pressed);
}

function drawBtn(x, y, w, h, text, color = "#00ffff", font = "bold 12px 'Courier New', monospace") {
    registerMenuTarget(x, y, w, h);
    // laranja de "passar o mouse" só quando quem está jogando usa o mouse (toque e controle deixavam um botão aceso)
    let hov = isMouseHovering() && inRect(mouseX, mouseY, x, y, w, h);
    const pressAmount = beginButtonPress(x, y, w, h);
    const pressed = pressAmount > 0.5;

    ctx.save();
    const radius = 2;
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, pressed ? "#e85d04" : hov ? "#ffb703" : "#123765");
    gradient.addColorStop(1, pressed ? "#9a3412" : hov ? "#e85d04" : "#071d3a");

    traceRoundedRect(x, y, w, h, radius);

    // apertado: quase sem sombra, como se tivesse encostado no "chão"
    ctx.shadowColor = pressed ? "rgba(0, 0, 0, 0.5)" : hov ? "rgba(255, 183, 3, 0.7)" : "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = pressed ? 3 : hov ? 18 : 10;
    ctx.shadowOffsetY = pressed ? 1 : 4;
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    ctx.lineWidth = hov ? 2 : 1.5;
    ctx.strokeStyle = hov ? "#fff0a6" : "#e85d04";
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);

    ctx.restore();
    endButtonPress(pressAmount);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}

function drawDragonBallMenuBackdrop(isMenu = false) {
    ctx.save();

    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, isMenu ? "#080914" : "#061a3a");
    sky.addColorStop(0.58, isMenu ? "#111b35" : "#0b3d73");
    sky.addColorStop(1, isMenu ? "#261126" : "#ee6b22");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = isMenu ? 0.26 : 0.18;
    ctx.strokeStyle = isMenu ? "#d8edff" : "#9bdcff";
    ctx.lineWidth = 1;
    for (let i = -canvas.height; i < canvas.width + canvas.height; i += 18) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + canvas.height, canvas.height);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = isMenu ? "#24142d" : "#08264e";
    ctx.beginPath();
    ctx.moveTo(0, 236);
    ctx.lineTo(100, 190);
    ctx.lineTo(182, 228);
    ctx.lineTo(300, 164);
    ctx.lineTo(430, 225);
    ctx.lineTo(570, 180);
    ctx.lineTo(canvas.width, 236);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();

    const sunX = isMenu ? 660 : 112;
    const sunY = isMenu ? 74 : 78;
    const aura = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 86);
    aura.addColorStop(0, "rgba(255, 245, 171, 0.95)");
    aura.addColorStop(0.18, "rgba(255, 184, 38, 0.55)");
    aura.addColorStop(1, "rgba(255, 99, 0, 0)");
    ctx.fillStyle = aura;
    ctx.fillRect(sunX - 100, sunY - 100, 200, 200);
    ctx.fillStyle = "#fff2a6";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawDragonBallPanel(x, y, w, h, title, subtitle = "") {
    ctx.save();
    ctx.fillStyle = "rgba(3, 13, 35, 0.88)";
    ctx.strokeStyle = "#f2a900";
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#e85d04";
    ctx.fillRect(x, y, 7, h);
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(x + 7, y, w - 7, 4);

    ctx.fillStyle = "#fff0a6";
    ctx.font = "bold 22px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, x + w / 2, y + 34);
    if (subtitle) {
        ctx.fillStyle = "#8fd3ff";
        ctx.font = "11px 'Trebuchet MS', sans-serif";
        ctx.fillText(subtitle, x + w / 2, y + 54);
    }
    ctx.restore();
    ctx.textAlign = "left";
}

function getCanvasCoords(clientX, clientY) {
    return getElementPointFromClient(canvas, clientX, clientY, canvas.width, canvas.height);   // considera o jogo girado
}

function getHudButtonRect(buttonKey) {
    const btn = touchHudLayout[buttonKey];
    const x = btn.x <= 1 ? btn.x * canvas.width : btn.x;
    const y = btn.y <= 1 ? btn.y * canvas.height : btn.y;
    const w = btn.w * btn.scale;
    const h = btn.h * btn.scale;
    return { x, y, w, h };
}

function setButtonPosInNormalizedSpace(buttonKey, x, y) {
    const btn = touchHudLayout[buttonKey];
    const maxX = Math.max(0, 1 - (btn.w * btn.scale) / canvas.width);
    const maxY = Math.max(0, 1 - (btn.h * btn.scale) / canvas.height);
    btn.x = Math.max(0, Math.min(maxX, x / canvas.width));
    btn.y = Math.max(0, Math.min(maxY, y / canvas.height));
}

function getTouchMovementArea() {
    const mobileBoost = window.innerWidth <= 540 ? 0.48 : 0.42;
    return {
        x: 0,
        y: canvas.height * 0.35,
        w: canvas.width * mobileBoost,
        h: canvas.height * 0.6
    };
}

function clearTouchMovementState() {
    touchAnalog.active = false;
    touchAnalog.touchId = null;
    touchAnalog.vx = 0;
    touchAnalog.vy = 0;
    touchMoveX = 0;
    touchMoveY = 0;
}

// Zera TODO o estado de toque (usado ao iniciar partida, perder o foco da janela ou cancelar toques).
function resetTouchInputState() {
    clearTouchMovementState();
    touchSwipe.active = false;
    touchSwipe.touchId = null;
    touchChargeId = null;
    touchAttackCooldown = 0;
}

// Retorna qual botão da HUD está sob o ponto (ou null). O parry só existe como botão quando o duplo toque está desligado.
// ---- Editor de HUD: barra de tamanho e opacidade do botão selecionado ----
function getHudEditorBarRects() {
    const y = 46, h = 24;
    return {
        sizeMinus: { x: 352, y, w: 30, h }, sizePlus: { x: 386, y, w: 30, h },
        opacityMinus: { x: 532, y, w: 30, h }, opacityPlus: { x: 566, y, w: 30, h }
    };
}

function isHudEditorBarHit(x, y) {
    if (!hudEditorSelectedBtn || !touchHudLayout[hudEditorSelectedBtn]) return false;
    return Object.values(getHudEditorBarRects()).some(r => inRect(x, y, r.x, r.y, r.w, r.h));
}

// Retorna true se o clique/toque caiu num botão da barra (e já aplica o ajuste).
function handleHudEditorBarClick(x, y) {
    const key = hudEditorSelectedBtn;
    if (!key || !touchHudLayout[key]) return false;
    const r = getHudEditorBarRects();
    const btn = touchHudLayout[key];
    let changed = false;
    if (inRect(x, y, r.sizeMinus.x, r.sizeMinus.y, r.sizeMinus.w, r.sizeMinus.h)) { btn.scale = adjustHudValue(btn.scale, -0.1, HUD_SCALE_RANGE.min, HUD_SCALE_RANGE.max); changed = true; }
    else if (inRect(x, y, r.sizePlus.x, r.sizePlus.y, r.sizePlus.w, r.sizePlus.h)) { btn.scale = adjustHudValue(btn.scale, 0.1, HUD_SCALE_RANGE.min, HUD_SCALE_RANGE.max); changed = true; }
    else if (inRect(x, y, r.opacityMinus.x, r.opacityMinus.y, r.opacityMinus.w, r.opacityMinus.h)) { btn.opacity = adjustHudValue(btn.opacity, -0.1, HUD_OPACITY_RANGE.min, HUD_OPACITY_RANGE.max); changed = true; }
    else if (inRect(x, y, r.opacityPlus.x, r.opacityPlus.y, r.opacityPlus.w, r.opacityPlus.h)) { btn.opacity = adjustHudValue(btn.opacity, 0.1, HUD_OPACITY_RANGE.min, HUD_OPACITY_RANGE.max); changed = true; }
    if (!changed) return false;
    // depois de crescer, garante que o botão continua inteiro dentro da tela
    const rect = getHudButtonRect(key);
    setButtonPosInNormalizedSpace(key, rect.x, rect.y);
    writeStorage("saiyan_touch_hud_customized", "1");
    return true;
}

function drawHudEditorBar() {
    const key = hudEditorSelectedBtn;
    ctx.save();
    ctx.textBaseline = "middle";
    if (!key || !touchHudLayout[key]) {
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("TOQUE EM UM BOTÃO PARA AJUSTAR TAMANHO E OPACIDADE", canvas.width / 2, 58);
        ctx.restore();
        return;
    }
    const btn = touchHudLayout[key];
    const r = getHudEditorBarRects();
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`TAMANHO ${Math.round(btn.scale * 100)}%`, 250, 58);
    ctx.fillText(`OPAC. ${Math.round(btn.opacity * 100)}%`, 440, 58);
    ctx.restore();
    drawBtn(r.sizeMinus.x, r.sizeMinus.y, r.sizeMinus.w, r.sizeMinus.h, "-", "#fca5a5");
    drawBtn(r.sizePlus.x, r.sizePlus.y, r.sizePlus.w, r.sizePlus.h, "+", "#86efac");
    drawBtn(r.opacityMinus.x, r.opacityMinus.y, r.opacityMinus.w, r.opacityMinus.h, "-", "#fca5a5");
    drawBtn(r.opacityPlus.x, r.opacityPlus.y, r.opacityPlus.w, r.opacityPlus.h, "+", "#86efac");
}

// ---- Editor de personagem (janela HTML) com controle ----
// Direcional/analógico move o foco entre os campos; CRUZ ativa (botão, aba) ou entra no "modo ajuste" (lista, número,
// cor: esquerda/direita mudam o valor; texto: abre para digitar); BOLA sai do modo/fecha o editor; L1/R1 trocam de aba;
// OPTIONS salva. O mapa de quadros da sprite sheet (arrastar com o mouse) continua sendo só mouse/toque.
const EDITOR_FOCUS_SELECTOR = 'button, input:not([type="hidden"]):not([type="file"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="button"][tabindex]';
const EDITOR_COLOR_PALETTE = ["#000000", "#ffffff", "#ff0000", "#ff6600", "#ffcc00", "#ffff00", "#66cc00", "#00aa44", "#00ffff", "#0066ff", "#0033aa", "#8800aa", "#ff66cc", "#ffcc99", "#8b5a2b", "#888888"];
const editorPad = { active: false, prev: {}, held: {}, time: {}, focusEl: null, adjusting: false };

function editorPadReset() {
    if (editorPad.focusEl && editorPad.focusEl.classList) {
        editorPad.focusEl.classList.remove("pad-focus");
        editorPad.focusEl.classList.remove("pad-adjust");
    }
    editorPad.active = false;
    editorPad.focusEl = null;
    editorPad.adjusting = false;
    const hint = document.getElementById("editor-pad-hint");
    if (hint && hint.style) hint.style.display = "none";
}

function getEditorFocusables() {
    const root = document.getElementById("modal-editor");
    if (!root || !root.querySelectorAll) return [];
    return Array.from(root.querySelectorAll(EDITOR_FOCUS_SELECTOR)).filter(el => {
        const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        return r && r.width > 0 && r.height > 0;
    });
}

function setEditorPadFocus(el) {
    if (editorPad.focusEl && editorPad.focusEl.classList) {
        editorPad.focusEl.classList.remove("pad-focus");
        editorPad.focusEl.classList.remove("pad-adjust");
    }
    editorPad.focusEl = el || null;
    editorPad.adjusting = false;
    if (el && el.classList) {
        el.classList.add("pad-focus");
        if (el.scrollIntoView) el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
}

function isTextLikeField(el) {
    if (!el) return false;
    const tag = String(el.tagName || "").toUpperCase();
    const type = String(el.type || "").toLowerCase();
    return tag === "TEXTAREA" || (tag === "INPUT" && ["text", "search", "url", "email", "password", "tel", ""].includes(type));
}

function isAdjustableField(el) {
    if (!el) return false;
    const tag = String(el.tagName || "").toUpperCase();
    const type = String(el.type || "").toLowerCase();
    return tag === "SELECT" || (tag === "INPUT" && ["number", "range", "color"].includes(type));
}

function fireEditorFieldEvents(el) {
    ["input", "change"].forEach(name => el.dispatchEvent(new Event(name, { bubbles: true })));
}

function adjustEditorField(el, dir) {
    const tag = String(el.tagName || "").toUpperCase();
    const type = String(el.type || "").toLowerCase();
    if (tag === "SELECT") {
        const n = el.options ? el.options.length : 0;
        if (!n) return;
        el.selectedIndex = cycleIndex(n, el.selectedIndex, dir);
    } else if (type === "color") {
        el.value = getNextPaletteColor(EDITOR_COLOR_PALETTE, el.value, dir);
    } else {
        el.value = String(stepNumberValue(el.value, el.step, el.min, el.max, dir));
    }
    fireEditorFieldEvents(el);
}

function pollEditorGamepad(dt, intents, padConnected) {
    const any = (k) => intents.some(i => i[k]);
    const hint = document.getElementById("editor-pad-hint");
    if (hint && hint.style) hint.style.display = padConnected ? "block" : "none";

    const now = { confirm: any("confirm"), back: any("back"), pause: any("pause"), l1: any("shoulderLeft"), r1: any("shoulderRight") };
    if (!editorPad.active) {          // 1ª vez com o editor aberto: o botão que abriu (CRUZ) não pode acionar nada
        editorPad.active = true;
        editorPad.prev = now;
        editorPad.held = {};
        editorPad.time = {};
        return;
    }
    const edge = (k) => now[k] && !editorPad.prev[k];

    const typing = editorPad.focusEl && isTextLikeField(editorPad.focusEl) && document.activeElement === editorPad.focusEl;
    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const name of Object.keys(dirs)) {
        const isDown = !typing && any(name);
        if (!padRepeatTick(editorPad.held, editorPad.time, name, isDown, dt)) continue;
        const [dx, dy] = dirs[name];
        if (editorPad.adjusting && editorPad.focusEl) {
            adjustEditorField(editorPad.focusEl, dx + dy > 0 ? 1 : -1); // direita/baixo = +, esquerda/cima = -
            continue;
        }
        const list = getEditorFocusables();
        if (!list.length) continue;
        let index = list.indexOf(editorPad.focusEl);
        if (index < 0) {
            const first = list.find(el => el.id === "char-name") || list[0];
            setEditorPadFocus(first);
            continue;
        }
        const rects = list.map(el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
        const next = findNextTargetIndex(rects, index, dx, dy);
        if (next >= 0) setEditorPadFocus(list[next]);
    }

    const el = editorPad.focusEl;
    if (edge("confirm")) {
        if (!el) {
            const list = getEditorFocusables();
            setEditorPadFocus(list.find(e => e.id === "char-name") || list[0]);
        } else if (typing) {
            el.blur();
        } else if (editorPad.adjusting) {
            editorPad.adjusting = false;
            if (el.classList) el.classList.remove("pad-adjust");
        } else if (isAdjustableField(el)) {
            editorPad.adjusting = true;
            if (el.classList) el.classList.add("pad-adjust");
        } else if (isTextLikeField(el)) {
            el.focus();
        } else if (el.click) {
            el.click();
        }
    }
    if (edge("back")) {
        if (typing) el.blur();
        else if (editorPad.adjusting && el) {
            editorPad.adjusting = false;
            if (el.classList) el.classList.remove("pad-adjust");
        } else {
            closeModal();
        }
    }
    if (edge("l1")) {
        const i = EDITOR_TAB_ORDER.indexOf(currentEditorTab);
        switchEditorTab(EDITOR_TAB_ORDER[(i + EDITOR_TAB_ORDER.length - 1) % EDITOR_TAB_ORDER.length]);
        setEditorPadFocus(null);
    }
    if (edge("r1")) {
        const i = EDITOR_TAB_ORDER.indexOf(currentEditorTab);
        switchEditorTab(EDITOR_TAB_ORDER[(i + 1) % EDITOR_TAB_ORDER.length]);
        setEditorPadFocus(null);
    }
    if (edge("pause") && !typing) saveCharacterFromModal();

    editorPad.prev = now;
}

// ---- Tela CONTROLE JOYSTICK (padrão PS5/DualSense): remapear botões (inclui o TOUCHPAD) ----
const PAD_ACTION_LABELS = { attack: "ATAQUE", parry: "PARRY", charge: "CARREGAR", transform: "TRANSFORMAR", special: "ESPECIAL", pause: "PAUSAR" };
const PAD_FACE_COLORS = ["#7aa7ff", "#ff7a7a", "#ff9fd6", "#67e8a5"]; // cruz, bola, quadrado, triângulo (cores do PS5)
let padCapture = null;          // { action, timeLeft, ignore:Set } enquanto espera o botão
let padCaptureNote = "";
let padCaptureNoteTimer = 0;

function getPressedPadIndices() {
    const out = new Set();
    getConnectedGamepads().forEach(pad => {
        (pad.buttons || []).forEach((b, i) => { if (b && (b.pressed || b.value > 0.5)) out.add(i); });
    });
    return out;
}

function startPadCapture(action) {
    // botões já apertados (ex.: a CRUZ que acabou de escolher a ação) só valem depois de soltos
    padCapture = { action, timeLeft: 8, ignore: getPressedPadIndices() };
}

function cancelPadCapture() {
    padCapture = null;
}

function pollPadCapture(dt) {
    padCapture.timeLeft -= dt;
    if (padCapture.timeLeft <= 0) { padCapture = null; return; }
    const pressedNow = getPressedPadIndices();
    padCapture.ignore = new Set([...padCapture.ignore].filter(i => pressedNow.has(i)));
    for (const index of pressedNow) {
        if (padCapture.ignore.has(index)) continue;
        const { bindings, displaced } = assignPadButton(padBindings, padCapture.action, index);
        padBindings = bindings;
        saveControls();
        padCaptureNote = displaced
            ? `${getPadButtonName(index)} JÁ ERA DE ${PAD_ACTION_LABELS[displaced]}: OS DOIS FORAM TROCADOS`
            : `${PAD_ACTION_LABELS[padCapture.action]} = ${getPadButtonName(index)}`;
        padCaptureNoteTimer = 4;
        padCapture = null;
        return;
    }
}

// Desenha o símbolo de qualquer botão do PS5 sem depender de fontes: cruz, bola, quadrado, triângulo, gatilhos
// (L1/R1/L2/R2 em pílula), CREATE e OPTIONS (pílulas com as marcas), L3/R3, direcional, PS e touchpad.
function drawPadGlyph(index, cx, cy, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const texto = (t, tam) => { ctx.font = `bold ${tam}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, cx, cy + 0.5); };
    const pilula = (w, h) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); else ctx.rect(cx - w / 2, cy - h / 2, w, h); ctx.stroke(); };
    ctx.beginPath();
    if (index === 0) {
        ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
        ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
        ctx.stroke();
    } else if (index === 1) {
        ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.stroke();
    } else if (index === 2) {
        ctx.rect(cx - s, cy - s, s * 2, s * 2); ctx.stroke();
    } else if (index === 3) {
        ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy + s * 0.8); ctx.lineTo(cx - s, cy + s * 0.8); ctx.closePath(); ctx.stroke();
    } else if (index >= 4 && index <= 7) {
        ctx.lineWidth = 1.5; pilula(s * 3, s * 2); texto(["L1", "R1", "L2", "R2"][index - 4], Math.round(s * 1.2));
    } else if (index === 8 || index === 9) {
        // CREATE: pílula com três traços inclinados; OPTIONS: pílula com três linhas
        ctx.lineWidth = 1.5; pilula(s * 1.4, s * 2.2);
        ctx.lineWidth = 1.2; ctx.beginPath();
        for (let k = -1; k <= 1; k++) {
            if (index === 9) { ctx.moveTo(cx - s * 0.35, cy + k * s * 0.45); ctx.lineTo(cx + s * 0.35, cy + k * s * 0.45); }
            else { ctx.moveTo(cx - s * 0.3 + k * s * 0.3, cy + s * 0.5); ctx.lineTo(cx + k * s * 0.3, cy - s * 0.5); }
        }
        ctx.stroke();
    } else if (index === 10 || index === 11) {
        ctx.lineWidth = 1.5; ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.stroke(); texto(index === 10 ? "L3" : "R3", Math.round(s * 0.95));
    } else if (index >= 12 && index <= 15) {
        // direcional: cruz com a direção pintada
        const t = s * 0.38;
        ctx.lineWidth = 1.3;
        ctx.rect(cx - t, cy - s, t * 2, s * 2); ctx.rect(cx - s, cy - t, s * 2, t * 2); ctx.stroke();
        const d = { 12: [0, -1], 13: [0, 1], 14: [-1, 0], 15: [1, 0] }[index];
        ctx.fillRect(cx + d[0] * s * 0.62 - t * 0.8, cy + d[1] * s * 0.62 - t * 0.8, t * 1.6, t * 1.6);
    } else if (index === 16) {
        ctx.lineWidth = 1.5; ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.stroke(); texto("PS", Math.round(s * 0.95));
    } else if (index === 17) {
        ctx.lineWidth = 1.5; ctx.rect(cx - s * 1.6, cy - s * 0.9, s * 3.2, s * 1.8); ctx.stroke();
    } else {
        texto(String(index), Math.round(s * 1.2));
    }
    ctx.restore();
}

function drawGamepadOptions() {
    drawDragonBallMenuBackdrop(false);
    drawDragonBallPanel(90, 15, 620, 333, "CONTROLE JOYSTICK", "Escolha uma ação e aperte o botão desejado (o TOUCHPAD também vale)");
    drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");

    PAD_ACTIONS.forEach((action, i) => {
        const bindRect = getGamepadBindingRect(i), y = bindRect.y;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "left";
        ctx.fillText(PAD_ACTION_LABELS[action], 125, y + 19);
        const list = padBindings[action];
        if (list[0] >= 0) drawPadGlyph(list[0], 300, y + 14, 8, PAD_FACE_COLORS[list[0]] || "#cbd5e1");
        const isCapturing = padCapture && padCapture.action === action;
        drawBtnAt(bindRect, isCapturing ? "APERTE UM BOTÃO..." : describePadBinding(list), isCapturing ? "#fbbf24" : "#00ffff", "bold 11px 'Courier New', monospace");
    });

    drawBtnAt(MENU_LAYOUT.optionsGamepad.reset, "PADRÃO PS5", "#a7f3d0", "bold 11px 'Courier New', monospace");
    drawBtnAt(MENU_LAYOUT.optionsGamepad.test, "TESTAR", "#93c5fd", "bold 11px 'Courier New', monospace");
    // sensibilidade do analógico: −  [barra 1..5]  +
    {
        const menos = MENU_LAYOUT.optionsGamepad.sensLess, mais = MENU_LAYOUT.optionsGamepad.sensMore;
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        ctx.fillText("SENSIBILIDADE", (menos.x + mais.x + mais.w) / 2, menos.y - 7);
        drawBtnAt(menos, "−", "#e2e8f0", "bold 16px monospace");
        drawBtnAt(mais, "+", "#e2e8f0", "bold 16px monospace");
        const x0 = menos.x + menos.w + 6, larg = mais.x - 6 - x0, passo = larg / PAD_SENSITIVITY_MAX;
        for (let n = 1; n <= PAD_SENSITIVITY_MAX; n++) {
            ctx.fillStyle = n <= padSensitivity ? "#fbbf24" : "rgba(148, 163, 184, 0.35)";
            const h = 6 + n * 3;
            ctx.fillRect(x0 + (n - 1) * passo + 1, menos.y + menos.h - 4 - h, passo - 2, h);
        }
    }

    const pads = getConnectedGamepads();
    const isPs5 = pads.some(pad => /dualsense|054c/i.test(String(pad.id || "")));
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = pads.length ? "#86efac" : "#94a3b8";
    ctx.fillText(pads.length ? (isPs5 ? "DUALSENSE (PS5) DETECTADO" : `CONTROLE: ${String(pads[0].id || "").slice(0, 44)}`) : "NENHUM CONTROLE DETECTADO: APERTE UM BOTÃO", 125, 306);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("MOVER: ANALÓGICO ESQUERDO OU DIRECIONAL  |  MENUS: CRUZ CONFIRMA, BOLA VOLTA (FIXOS)", 125, 322);
    ctx.fillText("XBOX: CRUZ=A, BOLA=B, QUADRADO=X, TRIÂNGULO=Y  |  TOUCHPAD SÓ NO DUALSENSE", 125, 336);
    if (padCaptureNoteTimer > 0) {
        padCaptureNoteTimer -= deltaTime;
        // aviso no espaço vazio abaixo do TESTAR, centralizado na coluna e quebrado em até 2 linhas
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        const r = MENU_LAYOUT.optionsGamepad.test, cx = r.x + r.w / 2, palavras = String(padCaptureNote).split(" ");
        const linhas = [""];
        palavras.forEach(p => {
            const tenta = (linhas[linhas.length - 1] + " " + p).trim();
            if (ctx.measureText(tenta).width > r.w + 10 && linhas[linhas.length - 1] && linhas.length < 2) linhas.push(p);
            else linhas[linhas.length - 1] = tenta;
        });
        linhas.forEach((l, i) => ctx.fillText(l, cx, r.y + r.h + 20 + i * 13, r.w + 20));
    }

    if (padCapture) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff0a6";
        ctx.font = "bold 20px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`APERTE O BOTÃO PARA: ${PAD_ACTION_LABELS[padCapture.action]}`, canvas.width / 2, 150);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "13px 'Courier New', monospace";
        ctx.fillText("VALE QUALQUER BOTÃO, GATILHO OU O CLIQUE DO TOUCHPAD", canvas.width / 2, 185);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px 'Courier New', monospace";
        ctx.fillText(`ESC OU CLIQUE CANCELA  |  ${Math.ceil(padCapture.timeLeft)}s`, canvas.width / 2, 215);
    }
}

// ---- Tela de TESTE DE CONTROLES ----
// Mostra em tempo real o que o jogo está recebendo: ações do jogador 1 e 2 (teclado, mouse ou controle),
// teclas, botões do mouse, pontos de toque e cada botão/analógico dos controles conectados.
let controlsTestTouches = [];
const TEST_ACTIONS = [
    ["up", "CIMA"], ["down", "BAIXO"], ["left", "ESQ."], ["right", "DIR."], ["attack", "ATAQUE"],
    ["charge", "CARREGAR"], ["transform", "TRANSF."], ["parry", "PARRY"], ["special", "ESPECIAL"]
];
const TEST_PAD_LABELS = ["✕", "○", "□", "△", "L1", "R1", "L2", "R2", "CRI", "OPT", "L3", "R3", "↑", "↓", "←", "→", "PS", "PAD"];

function isTestActionActive(profile, action, padIntent) {
    const code = keyBindings[profile][action];
    return Boolean(code && (keysPressed[code] || mouseButtonsPressed[code])) || Boolean(padIntent && padIntent[action]);
}

// Prévia do TESTE DE CONTROLES: o Goku no fundo da 1ª fase respondendo aos comandos dos jogadores 1 e 2
// (teclado, mouse e controle). Manda quem apertou primeiro (chooseControlsTestOwner); juntos, ninguém.
// É só um boneco de teste: não mexe no jogador nem no mundo da luta.
const TESTE_QUADRO = { x: 408, y: 54, w: 372, h: 182 };
const TESTE_ACOES = ["up", "down", "left", "right", "attack", "charge", "transform", "parry", "special"];
let testeGoku = null;
function getTesteGoku() {
    if (testeGoku) return testeGoku;
    const [w, h] = getFighterBoxSize("goku_adult");
    testeGoku = {
        x: TESTE_QUADRO.x + 60, y: TESTE_QUADRO.y + 70, w, h, hoverTime: 0, animTimer: 0, actionState: "idle", actionTimer: 0,
        ki: 0, maxKi: 100, isCharging: false, isSSJ: false, transformLevel: 0, transformPowerTimer: 0, invulnerableTimer: 0,
        parryHighlightTimer: 0, dono: null, antes: {}, tiros: [], feixe: 0
    };
    return testeGoku;
}
function updateTesteGoku(dt, pads) {
    const g = getTesteGoku(), f = dt * 60;
    const lerAcoes = (perfil, pad) => {
        const intent = pad ? getPadIntent(pad) : null, a = {};
        TESTE_ACOES.forEach(acao => { a[acao] = isTestActionActive(perfil, acao, intent); });
        return a;
    };
    const a1 = lerAcoes("p1", pads[0]), a2 = lerAcoes("p2", pads[1]);
    // toque (jogador 1): dedo dentro do quadro leva o Goku até ele; os botões de toque fazem as ações
    const q0 = TESTE_QUADRO;
    controlsTestTouches.forEach(t => {
        const botao = getHudButtonAt(t.x, t.y);
        if (botao) {
            if (botao === "charge" && g.ki >= g.maxKi && !(g.antes.charge || g.antes.transform)) a1.transform = true;
            else if (botao === "charge" && g.antes.transform) a1.transform = true;   // segue segurando o mesmo toque
            else a1[botao] = true;
        } else if (inRect(t.x, t.y, q0.x, q0.y, q0.w, q0.h)) {
            const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
            if (t.x > cx + 8) a1.right = true; else if (t.x < cx - 8) a1.left = true;
            if (t.y > cy + 8) a1.down = true; else if (t.y < cy - 8) a1.up = true;
            if (touchAutoFire && (g.tiroAuto = (g.tiroAuto || 0) + dt * 60) >= 12) { g.tiroAuto = 0; a1.attack = !g.antes.attack; }
        }
    });
    const algum = (a) => TESTE_ACOES.some(k => a[k]);
    g.dono = chooseControlsTestOwner(g.dono, algum(a1), algum(a2));
    const a = g.dono === "p1" ? a1 : g.dono === "p2" ? a2 : {};
    const apertou = (k) => a[k] && !g.antes[k];
    g.hoverTime += 0.05 * f;
    g.animTimer += dt;
    // voar nas 8 direções, dentro do quadro
    const dx = (a.right ? 1 : 0) - (a.left ? 1 : 0), dy = (a.down ? 1 : 0) - (a.up ? 1 : 0);
    const q = TESTE_QUADRO;
    g.x = Math.max(q.x + 4, Math.min(q.x + q.w - g.w - 4, g.x + dx * 3 * f));
    g.y = Math.max(q.y + 20, Math.min(q.y + q.h - g.h - 8, g.y + dy * 3 * f));
    g.isCharging = !!a.charge;
    if (g.isCharging) g.ki = Math.min(g.maxKi, g.ki + 0.8 * f);
    if (apertou("attack")) {
        g.tiros.push({ x: g.x + g.w, y: g.y + g.h * 0.45 });
        g.actionState = "attackKi"; g.actionTimer = 12;
    }
    if (apertou("parry")) { g.actionState = "parry"; g.actionTimer = 14; g.parryHighlightTimer = 10; }
    if (apertou("special")) { g.feixe = 40; g.actionState = "attackKi"; g.actionTimer = 40; }
    if (apertou("transform")) {
        // sobe um nível; depois da última volta ao normal (é só para ver as animações)
        const lista = getCharacterTransformations("goku_adult");
        const nivel = getTransformLevel(g);
        if (nivel < lista.length) { g.isSSJ = true; g.transformLevel = nivel + 1; g.transformPowerTimer = 180; g.ki = 0; }
        else { g.isSSJ = false; g.transformLevel = 0; g.transformPowerTimer = 0; }
        g.actionState = "transform"; g.actionTimer = 40;
    }
    g.antes = Object.assign({}, a);
    g.actionTimer = Math.max(0, g.actionTimer - f);
    g.parryHighlightTimer = Math.max(0, g.parryHighlightTimer - f);
    g.transformPowerTimer = Math.max(0, g.transformPowerTimer - f);
    g.feixe = Math.max(0, g.feixe - f);
    if (g.actionTimer <= 0) g.actionState = g.isCharging ? "chargeKi" : (getDominantMoveAction(dx, dy, 0) || "idle");
    g.tiros.forEach(t => { t.x += 7 * f; });
    g.tiros = g.tiros.filter(t => t.x < q.x + q.w);
}
function drawTesteGoku(pads) {
    updateTesteGoku(deltaTime, pads);
    const q = TESTE_QUADRO, g = getTesteGoku();
    ctx.save();
    ctx.beginPath(); ctx.rect(q.x, q.y, q.w, q.h); ctx.clip();
    const foto = stageCardThumbs.terra && stageCardThumbs.terra.cor;
    if (foto) {
        const s = Math.max(q.w / foto.width, q.h / foto.height);
        ctx.drawImage(foto, q.x + (q.w - foto.width * s) / 2, q.y + (q.h - foto.height * s) / 2, foto.width * s, foto.height * s);
    } else { ctx.fillStyle = "#7ec8f2"; ctx.fillRect(q.x, q.y, q.w, q.h); }
    const antes = selectedCharacter;
    selectedCharacter = "goku_adult";   // o desenho do lutador usa o personagem selecionado
    try { drawPlayerEntity(g, characterDB.goku_adult, false); } finally { selectedCharacter = antes; }
    // feixe do especial: igual ao da luta (azul com miolo branco e anéis), saindo da mão, por cima do Goku
    if (g.feixe > 0) {
        const y = g.y + g.h / 2, x0 = g.x + g.w, larg = q.x + q.w - x0;
        const meia = 13 * Math.min(1, g.feixe / 8, (40 - Math.min(40, g.feixe)) / 6 + 0.35);   // abre e fecha rápido
        ctx.fillStyle = "#00ffff"; ctx.fillRect(x0, y - meia, larg, meia * 2);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(x0, y - meia * 0.4, larg, meia * 0.8);
        ctx.beginPath(); ctx.arc(x0, y, meia * 1.2, 0, Math.PI * 2); ctx.fillStyle = "#00ffff"; ctx.fill();
        ctx.beginPath(); ctx.arc(x0, y, meia * 0.7, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
        for (let x = x0; x < x0 + larg; x += 24) {
            ctx.beginPath(); ctx.arc(x + (g.feixe * 3 % 24), y, meia * 0.9, 0, Math.PI * 2); ctx.stroke();
        }
    }
    g.tiros.forEach(t => {
        ctx.fillStyle = "rgba(120, 220, 255, 0.5)"; ctx.beginPath(); ctx.arc(t.x, t.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#f0fbff"; ctx.beginPath(); ctx.arc(t.x, t.y, 5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    // moldura, legenda e quem está no comando
    ctx.save();
    ctx.strokeStyle = "#7dd3fc"; ctx.lineWidth = 2; ctx.strokeRect(q.x, q.y, q.w, q.h);
    ctx.fillStyle = "rgba(2, 10, 29, 0.7)"; ctx.fillRect(q.x, q.y, q.w, 16);
    ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 9px monospace"; ctx.textAlign = "left";
    ctx.fillText(isTouchDevice ? "PRÉVIA: TOQUE NO QUADRO PARA MOVER" : "PRÉVIA: O GOKU RESPONDE AOS COMANDOS", q.x + 6, q.y + 11);
    ctx.textAlign = "right";
    ctx.fillStyle = g.dono ? "#86efac" : "#94a3b8";
    ctx.fillText(g.dono ? `NO COMANDO: JOGADOR ${g.dono === "p1" ? 1 : 2}` : "AGUARDANDO", q.x + q.w - 6, q.y + 11);
    ctx.restore();
}

function drawControlsTest() {
    prepareNextStageCardThumb();   // foto da 1ª fase para o fundo da prévia
    drawDragonBallMenuBackdrop(false);
    ctx.fillStyle = "rgba(2, 10, 29, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.fillStyle = "#fff0a6";
    ctx.font = "bold 18px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TESTE DE CONTROLES", canvas.width / 2, 28);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.fillText("Aperte teclas, botões do mouse, toque na tela ou use o controle (PAD = clique do touchpad). OPTIONS ou ESC sai.", canvas.width / 2, 44);
    ctx.restore();

    const pads = getConnectedGamepads();
    const drawChip = (x, y, w, label, active) => {
        ctx.save();
        ctx.fillStyle = active ? "#22c55e" : "rgba(15, 23, 42, 0.9)";
        ctx.strokeStyle = active ? "#bbf7d0" : "#475569";
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y, w, 20);
        ctx.strokeRect(x, y, w, 20);
        ctx.fillStyle = active ? "#052e16" : "#cbd5e1";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(label, x + w / 2, y + 14);
        ctx.restore();
    };

    // ações dos jogadores 1 e 2 (3 colunas x 3 linhas cada)
    [["p1", "JOGADOR 1 (TECLADO/MOUSE/CONTROLE 1/TOQUE)", 78, pads[0]], ["p2", "JOGADOR 2 (TECLADO/CONTROLE 2)", 184, pads[1]]].forEach(([profile, title, top, pad]) => {
        ctx.save();
        ctx.fillStyle = "#7dd3fc";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "left";
        ctx.fillText(title, 24, top);
        ctx.restore();
        const intent = pad ? getPadIntent(pad) : null;
        TEST_ACTIONS.forEach(([action, label], i) => {
            const col = i % 3, row = Math.floor(i / 3);
            const bindName = getBindingDisplayName(keyBindings[profile][action] || "NONE");
            drawChip(24 + col * 118, top + 6 + row * 24, 112, `${label}: ${bindName}`.slice(0, 20), isTestActionActive(profile, action, intent));
        });
    });

    drawTesteGoku(pads);
    // botões de toque (no celular), para testar o toque também
    if (isTouchDevice) {
        for (const key of Object.keys(touchHudLayout)) {
            if (isHudButtonHidden(key)) continue;
            const r = getHudButtonRect(key), raio = Math.min(r.w, r.h) * 0.48;
            const pronto = key === "charge" && getTesteGoku().ki >= getTesteGoku().maxKi;
            const sprite = getHudButtonSprite(pronto ? "transform" : key, raio, pronto, false);
            if (sprite) ctx.drawImage(sprite, r.x + r.w / 2 - sprite.lado / 2, r.y + r.h / 2 - sprite.lado / 2, sprite.lado, sprite.lado);
        }
    }

    // controles conectados (embaixo da prévia, compacto): analógicos e botões
    const padX = 408;
    ctx.save();
    ctx.fillStyle = "#7dd3fc";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillText(pads.length ? `CONTROLES CONECTADOS: ${pads.length}` : "NENHUM CONTROLE DETECTADO — APERTE UM BOTÃO", padX, 250);
    ctx.restore();
    pads.slice(0, 2).forEach((pad, n) => {
        const left = padX + n * 188, top = 256;
        ctx.save();
        ctx.fillStyle = "#94a3b8";
        ctx.font = "8px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`C${n + 1}: ${String(pad.id || "controle").slice(0, 28)}`, left, top + 6);
        const stick = (cx, cy, ax, ay) => {
            ctx.strokeStyle = "#64748b";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, 11, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = (Math.abs(ax) > 0.4 || Math.abs(ay) > 0.4) ? "#22c55e" : "#38bdf8";
            ctx.beginPath();
            ctx.arc(cx + Math.max(-1, Math.min(1, ax)) * 8, cy + Math.max(-1, Math.min(1, ay)) * 8, 3.5, 0, Math.PI * 2);
            ctx.fill();
        };
        const axes = pad.axes || [];
        stick(left + 12, top + 24, axes[0] || 0, axes[1] || 0);
        stick(left + 38, top + 24, axes[2] || 0, axes[3] || 0);
        for (let i = 0; i < 18; i++) {
            const b = pad.buttons && pad.buttons[i];
            const on = Boolean(b && (b.pressed || b.value > 0.5));
            const bx = left + 54 + (i % 9) * 14, by = top + 11 + Math.floor(i / 9) * 15;
            ctx.fillStyle = on ? "#22c55e" : "rgba(15, 23, 42, 0.9)";
            ctx.strokeStyle = on ? "#bbf7d0" : (i === 17 ? "#fbbf24" : "#475569");
            ctx.lineWidth = 1;
            ctx.fillRect(bx, by, 12, 13);
            ctx.strokeRect(bx, by, 12, 13);
            if (i <= 3) {
                drawPadGlyph(i, bx + 6, by + 6.5, 3, on ? "#052e16" : PAD_FACE_COLORS[i]);
            } else {
                ctx.fillStyle = on ? "#052e16" : "#cbd5e1";
                ctx.font = "bold 5px monospace";
                ctx.textAlign = "center";
                ctx.fillText(TEST_PAD_LABELS[i], bx + 6, by + 9);
            }
        }
        ctx.restore();
    });

    // teclas, mouse e toques
    const held = Object.keys(keysPressed).filter(code => keysPressed[code]).map(code => getBindingDisplayName(code));
    const mouse = Object.keys(mouseButtonsPressed).filter(code => mouseButtonsPressed[code]).map(code => getBindingDisplayName(code));
    ctx.save();
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`TECLAS: ${held.length ? held.join(" + ") : "-"}`.slice(0, 84), 24, 292);
    ctx.fillText(`MOUSE: ${mouse.length ? mouse.join(" + ") : "-"}    TOQUES NA TELA: ${controlsTestTouches.length}`, 24, 310);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.fillText(`Direcional/analógico: ${pads.length ? "detectado" : "aguardando"}   |   Vibração: ${vibrationEnabled ? "ligada" : "desligada"}`, 24, 328);
    ctx.restore();

    controlsTestTouches.forEach((t, i) => {
        ctx.save();
        ctx.strokeStyle = "#fbbf24";
        ctx.fillStyle = "rgba(251, 191, 36, 0.25)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fef3c7";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(i + 1), t.x, t.y + 4);
        ctx.restore();
    });

    drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
}

// Sair da tela de teste com START do controle (pollGamepads só cuida de pausa dentro da partida).
function pollControlsTestExit() {
    if (gameState !== "controls_test") return;
    const pressed = getConnectedGamepads().some(pad => getPadIntent(pad).pause);
    if (pressed && !padPrevPause) setGameState("options_controls");
    padPrevPause = pressed;
}

// ---- Navegação nos MENUS com controle ----
// Todo botão desenhado (drawBtn/cartões) se registra em menuTargets a cada quadro; o controle move o foco entre eles
// (direcional/analógico), A confirma (clica no centro do alvo) e B volta (botão "←", ou continuar/menu conforme a tela).
let menuTargets = [];
let menuTargetsPrev = [];
const MENU_BACK_RECT = MENU_LAYOUT.back;
const padNav = { focus: null, state: null, polledState: null, visible: false, held: {}, holdTime: {}, prevConfirm: false, prevBack: false };

function registerMenuTarget(x, y, w, h) {
    menuTargets.push({ x, y, w, h });
}

function isMenuBackTarget(t) {
    return t.x === MENU_BACK_RECT.x && t.y === MENU_BACK_RECT.y && t.w === MENU_BACK_RECT.w && t.h === MENU_BACK_RECT.h;
}

function padNavIsActiveState() {
    // controls_test: os botões do controle precisam acender na tela, não navegar
    // tutorial: o analógico mexe só o personagem (CREATE pula o passo, OPTIONS pausa — ver pollGamepads)
    // (no fim do tutorial volta a navegar: o botão VOLTAR AO MENU precisa ser alcançado)
    if (gameState === "tutorial") return tutorialPhase === "finished";
    return gameState !== "playing" && gameState !== "options_hud" && gameState !== "controls_test";
}

// Acha o alvo que está sob o foco atual (ou o mais próximo, se a tela mudou); escolhe um inicial se não há foco.
function resolvePadFocus() {
    if (!menuTargetsPrev.length) return null;
    if (padNav.state !== gameState || !padNav.focus) {
        padNav.state = gameState;
        const fs = getFullscreenButtonRect();
        const first = menuTargetsPrev.find(t => !isMenuBackTarget(t) && !(t.x === fs.x && t.y === fs.y)) || menuTargetsPrev[0];
        padNav.focus = { x: first.x + first.w / 2, y: first.y + first.h / 2 };
        return first;
    }
    const inside = menuTargetsPrev.find(t => inRect(padNav.focus.x, padNav.focus.y, t.x, t.y, t.w, t.h));
    if (inside) return inside;
    let best = null, bestDist = Infinity;
    for (const t of menuTargetsPrev) {
        const d = Math.hypot(t.x + t.w / 2 - padNav.focus.x, t.y + t.h / 2 - padNav.focus.y);
        if (d < bestDist) { bestDist = d; best = t; }
    }
    return best;
}

// dx/dy = -1, 0 ou 1. Vai para o alvo mais próximo na direção pedida (penaliza desvio lateral).
function movePadFocus(dx, dy) {
    const current = resolvePadFocus();
    if (!current) return;
    const nextIndex = findNextTargetIndex(menuTargetsPrev, menuTargetsPrev.indexOf(current), dx, dy);
    const best = menuTargetsPrev[nextIndex];
    if (best) {
        padNav.focus = { x: best.x + best.w / 2, y: best.y + best.h / 2 };
        revealPadFocusInDatabase();
        revealPadFocusInCharacters();
    }
}

// Repetição de direção ao segurar: 1º movimento na hora; depois de 0,4 s repete a cada ~0,14 s.
function padRepeatTick(held, times, name, isDown, dt) {
    if (!isDown) {
        held[name] = false;
        times[name] = 0;
        return false;
    }
    const first = !held[name];
    held[name] = true;
    times[name] = (times[name] || 0) + dt;
    return first || (times[name] > 0.4 && (times[name] - 0.4) % 0.14 < dt);
}

// No Database, se o foco foi para um cartão fora da área visível, rola a lista até mostrá-lo.
// O foco é guardado em coordenadas de tela, então acompanha o deslocamento da rolagem.
function revealPadFocusInDatabase() {
    if (gameState !== "database" || !padNav.focus) return;
    const layout = getDatabaseLayoutMetrics();
    const keys = Object.keys(characterDB);
    const totalRows = Math.ceil(keys.length / layout.columns);
    if (totalRows <= layout.maxVisibleRows) return;
    // botões do topo (voltar, criar novo) não são de cartão. Cartões escondidos acima da área visível têm o
    // botão desenhado "por baixo" do cabeçalho (y < gridTop), por isso a checagem é pelo alvo e não pela altura.
    const focused = resolvePadFocus();
    if (!focused || isMenuBackTarget(focused)) return;
    if (focused.x === layout.createButtonX && focused.y === layout.createButtonY) return;
    const rowStep = layout.cardHeight + layout.gapY;
    const maxScroll = getDatabaseMaxScroll(layout);
    const row = Math.max(0, Math.min(totalRows - 1, Math.floor((padNav.focus.y + characterDatabaseScrollY - layout.gridTop) / rowStep)));
    const next = getScrollToRevealRow(row, rowStep, layout.cardHeight, layout.viewportHeight, characterDatabaseScrollY, maxScroll);
    if (next !== characterDatabaseScrollY) {
        padNav.focus.y -= next - characterDatabaseScrollY;
        characterDatabaseScrollY = next;
    }
}

function padNavBack() {
    const back = menuTargetsPrev.find(isMenuBackTarget);
    if (back) { releaseButtonAt(back.x + back.w / 2, back.y + back.h / 2); scheduleButtonAction(() => handleMenuClick(back.x + back.w / 2, back.y + back.h / 2)); }
    else if (gameState === "paused") requestResume();
    else if (gameState === "gameover") handleMenuClick(400, 175);
}

// Janelas HTML (avisos, confirmações, editor) ficam por cima do canvas.
function isDomModalOpen(id) {
    const el = document.getElementById(id);
    return Boolean(el && el.style && (el.style.display === "flex" || el.style.display === "block"));
}

// analógico inclinado para cima/baixo (usado para rolar texto nas janelas, não para trocar de botão)
function scrollAxis() {
    const pads = getConnectedGamepads();
    return pads.some(p => p.axes && Math.abs(p.axes[1] || 0) > 0.4 && !(p.buttons && (p.buttons[12] && p.buttons[12].pressed || p.buttons[13] && p.buttons[13].pressed)));
}

// Usou o controle (botão, direcional ou analógico): no AUTOMÁTICO vira modo JOYSTICK (some o HUD de toque)
// até usar toque/mouse/teclado de novo. Vale nos menus e na luta.
function marcarEntradaControle() {
    lastPadInputAt = Date.now();
    if (controlSelectionMode === "auto" && autoControlOverride !== "joystick") { autoControlOverride = "joystick"; applyEffectiveControlMode(); }
}
// No Android o controle também gera teclas (direcional = setas) e o touchpad do PS5 move o mouse:
// logo depois de usar o controle, esses eventos não trocam o AUTOMÁTICO para PC.
function controleUsadoAgora() { return Date.now() - lastPadInputAt < 1500; }
function pollGamepadMenu(dt) {
    const pads = getConnectedGamepads();
    const intents = pads.map(pad => getPadIntent(pad));
    const any = (k) => intents.some(i => i[k]);
    if (intents.some(i => Object.keys(i).some(k => i[k])) || pads.some(pad => pad.buttons && pad.buttons.some(b => b && b.pressed))) marcarEntradaControle();
    // botão do TOUCHPAD (PS5, botão 17) maximiza/minimiza a tela — a não ser que esteja ligado a uma ação,
    // esperando um botão novo, ou no TESTE DE CONTROLES (lá ele só acende)
    const touchpadDown = pads.some(pad => pad.buttons && pad.buttons[17] && pad.buttons[17].pressed);
    const touchpadLivre = !Object.values(padBindings).some(lista => (lista || []).includes(17));
    if (touchpadDown && !padPrevTouchpad && touchpadLivre && !padCapture && gameState !== "controls_test") toggleFullscreen();
    padPrevTouchpad = touchpadDown;

    // Tela "Controle PS5": esperando o jogador apertar o novo botão de uma ação.
    if (padCapture) {
        pollPadCapture(dt);
        padNav.prevConfirm = any("confirm");
        padNav.prevBack = any("back");
        return;
    }

    if (!padNavIsActiveState()) return;

    // Janelas HTML (avisos, confirmações, UPDATES, editor) ficam por cima do canvas: o foco do canvas fica parado.
    // Aviso/confirmação: CRUZ = 1º botão (OK/CONFIRMAR), BOLA = último (CANCELAR, ou OK se só houver um).
    // UPDATES: CRUZ ou BOLA fecham. Editor de personagem: ver pollEditorGamepad.
    const alertOpen = isDomModalOpen("modal-alert"), updatesOpen = isDomModalOpen("modal-updates"), editorOpen = isDomModalOpen("modal-editor");
    if (alertOpen || updatesOpen || editorOpen) {
        const confirm = any("confirm"), back = any("back");
        if (alertOpen || updatesOpen) {
            // foco num dos botões da janela (destacado); direcional troca, CRUZ aperta, BOLA fecha/cancela,
            // analógico rola o texto
            const modal = document.getElementById(alertOpen ? "modal-alert" : "modal-updates");
            const buttons = modal && modal.querySelectorAll ? Array.from(modal.querySelectorAll("button")).filter(b => b.offsetParent !== null || b.style.display !== "none") : [];
            if (padNav.modalId !== modal) { padNav.modalId = modal; padNav.modalIndex = 0; padNav.modalHeld = {}; padNav.modalHoldTime = {}; }
            let delta = 0;
            for (const [nome, d] of [["left", -1], ["up", -1], ["right", 1], ["down", 1]]) {
                if (padRepeatTick(padNav.modalHeld, padNav.modalHoldTime, nome, any(nome) && !scrollAxis(), dt)) delta = d;
            }
            if (buttons.length) {
                padNav.modalIndex = (padNav.modalIndex + delta + buttons.length) % buttons.length;
                buttons.forEach((b, i) => { b.style.outline = i === padNav.modalIndex ? "3px solid #ffd23f" : ""; b.style.outlineOffset = "2px"; });
            }
            // rolar o texto com o analógico (esquerdo ou direito; vale o mais inclinado)
            const eixos = pads.length && pads[0].axes ? pads[0].axes : [];
            const ay = Math.abs(eixos[3] || 0) > Math.abs(eixos[1] || 0) ? (eixos[3] || 0) : (eixos[1] || 0);
            if (Math.abs(ay) > 0.4 && modal) {
                // UPDATES: sempre a lista de novidades (a única barra de rolagem); avisos: o primeiro texto que rola
                const lista = updatesOpen ? document.getElementById("lista-updates") : null;
                const rolavel = lista || Array.from(modal.querySelectorAll ? modal.querySelectorAll("ul, p, div") : []).find(el => el.scrollHeight > el.clientHeight + 4);
                if (rolavel) rolavel.scrollTop += ay * 10;
            }
            if (confirm && !padNav.prevConfirm && buttons[padNav.modalIndex]) buttons[padNav.modalIndex].click();
            else if (back && !padNav.prevBack) {
                if (updatesOpen) closeUpdatesModal();
                else if (buttons.length) buttons[buttons.length - 1].click();
            }
        } else {
            pollEditorGamepad(dt, intents, pads.length > 0);
        }
        padNav.prevConfirm = confirm;
        padNav.prevBack = back;
        return;
    }
    editorPadReset();
    if (padNav.modalId) {   // janela fechou: tira o destaque dos botões dela
        if (padNav.modalId.querySelectorAll) Array.from(padNav.modalId.querySelectorAll("button")).forEach(b => { b.style.outline = ""; });
        padNav.modalId = null;
    }

    // Ao entrar numa tela, botão já apertado (ex.: segurando o ataque no jogo) não conta como clique.
    if (padNav.polledState !== gameState) {
        padNav.polledState = gameState;
        padNav.prevConfirm = any("confirm");
        padNav.prevBack = any("back");
        padNav.held = {};
        padNav.holdTime = {};
    }

    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const name of Object.keys(dirs)) {
        const isDown = any(name);
        if (isDown) padNav.visible = true;
        if (padRepeatTick(padNav.held, padNav.holdTime, name, isDown, dt)) {
            resolvePadFocus();
            movePadFocus(dirs[name][0], dirs[name][1]);
        }
    }

    const confirm = any("confirm"), back = any("back");
    if (confirm && !padNav.prevConfirm) {
        padNav.visible = true;
        const target = resolvePadFocus();
        if (target) { releaseButtonAt(target.x + target.w / 2, target.y + target.h / 2); scheduleButtonAction(() => handleMenuClick(target.x + target.w / 2, target.y + target.h / 2)); }
        else if (gameState === "gameover") handleMenuClick(400, 175); // game over não tem botões: CRUZ = "clique em qualquer lugar"
    }
    if (back && !padNav.prevBack) {
        padNav.visible = true;
        padNavBack();
    }
    padNav.prevConfirm = confirm;
    padNav.prevBack = back;
}

function drawPadFocus() {
    if (!padNav.visible || !padNavIsActiveState() || padNav.state !== gameState) return;
    if (isDomModalOpen("modal-alert") || isDomModalOpen("modal-updates") || isDomModalOpen("modal-editor")) return;
    const t = resolvePadFocus();
    if (!t) return;
    ctx.save();
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(255, 210, 63, 0.8)";
    ctx.shadowBlur = 10;
    ctx.strokeRect(t.x - 3, t.y - 3, t.w + 6, t.h + 6);
    ctx.restore();
}

// ---- Controles (gamepad) USB/Bluetooth ----
// Todas as leituras do controle passam por aqui, para respeitar os botões remapeados (padBindings, padrão PS5).
function getPadIntent(pad) {
    return getGamepadIntent(pad, getPadStickThreshold(padSensitivity), padBindings);
}

// Viram "teclas virtuais" do jogador correspondente, então reaproveitam todo o resto do jogo.
const padHeldKeys = { p1: {}, p2: {} };
const padPrevPressed = { p1: {}, p2: {} };
const padAttackCooldown = { p1: 0, p2: 0 };
let padPrevPause = false;
let padPrevCreate = false;   // botão CREATE/SHARE (pular passo do tutorial)
let padPrevTouchpad = false; // botão do touchpad (tela cheia)

function getConnectedGamepads() {
    try {
        const list = (typeof navigator !== "undefined" && navigator.getGamepads) ? navigator.getGamepads() : [];
        return Array.from(list || []).filter(pad => pad && pad.connected !== false);
    } catch (err) {
        return [];
    }
}

// 2+ controles: o 1º é do jogador 1 e o 2º do jogador 2. Só 1 controle no versus em aparelho touch:
// fica com o jogador 2 (o jogador 1 joga na tela).
function getGamepadAssignments() {
    const pads = getConnectedGamepads();
    if (gameMode === "coop" && isTouchDevice && pads.length === 1) return { p2: pads[0] };
    return { p1: pads[0], p2: pads[1] };
}

function setPadKey(profile, action, down) {
    const code = keyBindings[profile][action];
    if (!code) return;
    if (down) {
        keysPressed[code] = true;
        padHeldKeys[profile][action] = true;
    } else if (padHeldKeys[profile][action]) {
        keysPressed[code] = false;
        padHeldKeys[profile][action] = false;
    }
}

function pollGamepads(dt) {
    const assignments = getGamepadAssignments();
    const playing = gameState === "playing" || gameState === "tutorial";

    // tutorial: CREATE/SHARE (botão 8) pula o passo — o analógico não navega em PULAR/SAIR
    const createDown = getConnectedGamepads().some(pad => pad.buttons && pad.buttons[8] && pad.buttons[8].pressed);
    if (gameState === "tutorial" && createDown && !padPrevCreate) {
        const ui = getTutorialUiLayout();
        const alvo = ui.finished ? ui.voltar : ui.pular;
        if (alvo) handleMenuClick(alvo.x + alvo.w / 2, alvo.y + alvo.h / 2);
    }
    padPrevCreate = createDown;

    if (getConnectedGamepads().some(pad => { const i = getPadIntent(pad); return Object.keys(i).some(k => i[k]); })) marcarEntradaControle();
    const anyPause = ["p1", "p2"].some(profile => getPadIntent(assignments[profile]).pause);
    if (anyPause && !padPrevPause) {
        if (gameState === "tutorial") {
            const step = getCurrentTutorialStep();
            if (step && step.key === "pause") markTutorialActionDone("pause");
        }
        if (playing) pauseGame();
        else if (gameState === "paused") requestResume();
    }
    padPrevPause = anyPause;

    for (const profile of ["p1", "p2"]) {
        const isP2 = profile === "p2";
        const active = playing && (!isP2 || gameMode === "coop");
        const intent = getPadIntent(active ? assignments[profile] : null);
        const target = isP2 ? player2 : player;

        for (const action of ["up", "down", "left", "right", "charge"]) setPadKey(profile, action, intent[action]);

        const inClash = world.beamOwner === "clash" && world.beamActive > 0;
        if (inClash) {
            if (intent.attack && !padPrevPressed[profile].attack) triggerAction("attack", target, isP2);
            padPrevPressed[profile].attack = intent.attack;
            padAttackCooldown[profile] = 0;
        } else if (intent.attack) {
            padPrevPressed[profile].attack = true;
            padAttackCooldown[profile] -= dt * 60;
            const blocked = !isP2 && (player.isCharging || player.parryHighlightTimer > 0 || world.beamActive > 0);
            if (padAttackCooldown[profile] <= 0 && !blocked) {
                triggerAction("attack", target, isP2);
                padAttackCooldown[profile] = TOUCH_AUTOFIRE_INTERVAL;
            }
        } else {
            padPrevPressed[profile].attack = false;
            padAttackCooldown[profile] = 0;
        }

        for (const action of ["transform", "parry", "special"]) {
            if (intent[action] && !padPrevPressed[profile][action]) triggerAction(action, target, isP2);
            padPrevPressed[profile][action] = intent[action];
        }
    }
}

// TRANSMITIR PARA A TV — ajuda: como espelhar a tela do jogo numa TV pelo próprio aparelho.
function ajudaTransmitirTV(motivo) {
    showSystemAlert("TRANSMITIR PARA A TV",
        (motivo ? "MOTIVO: " + motivo + "\n\n" : "") +
        "Espelhe a tela pelo aparelho (coloque o jogo em TELA CHEIA antes):\n" +
        "• Android: o menu do Chrome não tem 'Transmitir' no celular. Puxe as configurações rápidas (deslize do topo duas vezes) " +
        "e toque em 'Transmitir' (Xiaomi), 'Smart View' (Samsung) ou 'Transmitir tela' / 'Espelhamento de tela' (outros). " +
        "Se não aparecer, toque no lápis e adicione esse atalho.\n" +
        "• iPhone/iPad: Central de Controle > 'Espelhamento de Tela' (Apple TV/AirPlay).\n" +
        "• PC (Chrome/Edge): menu ⋮ > 'Transmitir...' e escolha a TV.\n" +
        "O jogo continua no seu aparelho e a TV mostra a mesma tela.");
}
// Onde o navegador permite (Chrome com Chromecast/Google TV), o botão abre a lista de TVs do próprio navegador
// e a TV abre tv.html, que recebe AO VIVO a imagem deste canvas (vídeo por WebRTC; a combinação da conexão vai
// pelo canal da Presentation API). O jogo continua aqui. Experimental: sem suporte (iPhone, Firefox, TV sem
// Chromecast) ou se falhar, mostra como espelhar pelo aparelho. Tocar de novo encerra a transmissão.
let transmissaoTV = null;   // { conexao, pc }
function encerrarTransmissaoTV() {
    if (!transmissaoTV) return;
    try { transmissaoTV.pc.close(); } catch (e) {}
    try { transmissaoTV.conexao.terminate(); } catch (e) {}
    transmissaoTV = null;
}
function iniciarVideoParaTV(conexao) {
    const stream = canvas.captureStream(30);
    const pc = new RTCPeerConnection({ iceServers: [] });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    transmissaoTV = { conexao, pc };
    pc.onicecandidate = (e) => { if (e.candidate) conexao.send(JSON.stringify({ tipo: "ice", candidato: e.candidate })); };
    conexao.onmessage = async (e) => {
        let msg; try { msg = JSON.parse(e.data); } catch (err) { return; }
        if (msg.tipo === "resposta") await pc.setRemoteDescription(msg.sdp);
        else if (msg.tipo === "ice" && msg.candidato) { try { await pc.addIceCandidate(msg.candidato); } catch (err) {} }
    };
    conexao.onclose = conexao.onterminate = () => { if (transmissaoTV && transmissaoTV.conexao === conexao) { try { pc.close(); } catch (e) {} transmissaoTV = null; } };
    pc.createOffer().then(oferta => pc.setLocalDescription(oferta)).then(() => conexao.send(JSON.stringify({ tipo: "oferta", sdp: pc.localDescription })));
}
function motivoFalhaTransmissao(err) {
    if (err && err.name === "NotFoundError") return "NENHUMA TV COM CHROMECAST/GOOGLE TV NA MESMA REDE WI-FI";
    const texto = err ? String(err.message || err.name || err) : "";
    return texto ? "ERRO: " + texto.slice(0, 80) : "NÃO FOI POSSÍVEL CONECTAR À TV";
}
function transmitirParaTV() {
    if (transmissaoTV) { encerrarTransmissaoTV(); return; }
    const suporta = typeof PresentationRequest === "function" && typeof RTCPeerConnection === "function" && canvas && typeof canvas.captureStream === "function";
    if (!suporta) { ajudaTransmitirTV("ESTE NAVEGADOR NÃO PERMITE: ABRA NO CHROME"); return; }
    try {
        const pedido = new PresentationRequest(["tv.html"]);
        pedido.start().then(conexao => {
            refazerEncaixeDaTela();   // a lista de TVs pode deixar o canvas deslocado
            if (conexao.state === "connected") iniciarVideoParaTV(conexao);
            else conexao.onconnect = () => iniciarVideoParaTV(conexao);
        }).catch(err => {
            refazerEncaixeDaTela();
            if (err && err.name === "AbortError") return;   // cancelar a lista não mostra ajuda
            ajudaTransmitirTV(motivoFalhaTransmissao(err));
        });
    } catch (e) { ajudaTransmitirTV(motivoFalhaTransmissao(e)); }
}

// Tela de pausa (CONTINUAR / OPÇÕES / SAIR), por cima da luta ou do tutorial congelados.
function drawPauseOverlay() {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (resumeCountdown > 0) {
        resumeCountdown -= deltaTime;
        if (resumeCountdown <= 0) {
            resumeCountdown = 0;
            autoPaused = false;
            setGameState(pausedFromTutorial ? "tutorial" : "playing");
        } else {
            ctx.fillStyle = "#fff0a6";
            ctx.font = "bold 72px 'Courier New', monospace";
            ctx.textAlign = "center";
            ctx.fillText(String(Math.ceil(resumeCountdown)), canvas.width / 2, 190);
            ctx.font = "bold 14px 'Courier New', monospace";
            ctx.fillStyle = "#e2e8f0";
            ctx.fillText("PREPARE-SE...", canvas.width / 2, 225);
        }
    } else {
        if (autoPaused) {
            ctx.fillStyle = "#fbbf24";
            ctx.font = "bold 18px 'Courier New', monospace";
            ctx.textAlign = "center";
            ctx.fillText("PAUSADO AUTOMATICAMENTE", canvas.width / 2, 62);
            ctx.fillStyle = "#e2e8f0";
            ctx.font = "12px 'Courier New', monospace";
            ctx.fillText("TOQUE OU CLIQUE EM QUALQUER LUGAR PARA CONTINUAR", canvas.width / 2, 86);
        }
        drawBtnAt(MENU_LAYOUT.paused.resume, "CONTINUAR");
        drawBtnAt(MENU_LAYOUT.paused.options, "OPÇÕES");
        drawBtnAt(MENU_LAYOUT.paused.exit, "SAIR PARA MENU");
    }
}

// Botão de pausa (só aparece em modo touch, durante a partida). Fica no centro do topo, área livre da HUD.
function getPauseButtonRect() {
    return { x: Math.round((canvas.width - PAUSE_BUTTON.w) / 2), y: 8, w: PAUSE_BUTTON.w, h: PAUSE_BUTTON.h };
}

let pausedFromTutorial = false;   // a pausa veio do tutorial: CONTINUAR volta para o mesmo passo dele
function pauseGame(auto = false) {
    if (gameState !== "playing" && gameState !== "tutorial") return;
    pausedFromTutorial = gameState === "tutorial";
    keysPressed = {};
    mouseButtonsPressed = {};
    resetTouchInputState();
    autoPaused = auto;
    resumeCountdown = 0;
    setGameState("paused");
}

// Retomar: no celular e depois de pausa automática faz contagem 3-2-1 (dá tempo de reposicionar os dedos).
function requestResume() {
    if (gameState !== "paused" || resumeCountdown > 0) return;
    if (autoPaused || isTouchDevice) resumeCountdown = 3;
    else setGameState(pausedFromTutorial ? "tutorial" : "playing");
}

// Com o tiro automático do toque (segurar o analógico atira) o botão ATAQUE some da luta.
function isHudButtonHidden(key) {
    if (gameState === "options_hud") return false;
    return (key === "parry" && mobileDoubleTapParry) || (key === "attack" && touchAutoFire);
}

function getHudButtonAt(x, y) {
    for (const key of Object.keys(touchHudLayout)) {
        if (isHudButtonHidden(key)) continue;
        const r = getHudButtonRect(key);
        if (inRect(x, y, r.x, r.y, r.w, r.h)) return key;
    }
    return null;
}

canvas.onmousemove = (e) => {
    lastInputWasTouch = false;
    padNav.visible = false;
    if (controlSelectionMode === "auto" && autoControlOverride !== "pc" && Date.now() - lastTouchStartAt > 1000 && !controleUsadoAgora()) {
        autoControlOverride = "pc";
        isTouchDevice = false;
    }
    const c = getCanvasCoords(e.clientX, e.clientY);
    mouseX = c.x;
    mouseY = c.y;
    if (menuPointerPress && menuPointerPress.id === "mouse") { menuPointerPress.x = c.x; menuPointerPress.y = c.y; }

    if (gameState === "options_hud" && hudEditorDragging && hudEditorSelectedBtn) {
        const btn = touchHudLayout[hudEditorSelectedBtn];
        const nextX = Math.max(0, Math.min(canvas.width - btn.w * btn.scale, mouseX - hudDragOffsetX));
        const nextY = Math.max(0, Math.min(canvas.height - btn.h * btn.scale, mouseY - hudDragOffsetY));
        setButtonPosInNormalizedSpace(hudEditorSelectedBtn, nextX, nextY);
    }
};

canvas.onmousedown = (e) => {
    lastInputWasTouch = false;
    const c = getCanvasCoords(e.clientX, e.clientY);
    let mBtnCode = getMouseBindingName(e.button);

    if (remappingKey) {
        let [p, act] = remappingKey.split(".");
        keyBindings[p][act] = mBtnCode;
        saveControls();
        remappingKey = null;
        closeSystemAlert();
        return;
    }

    mouseButtonsPressed[mBtnCode] = true;
    if (e.button === 0) startPointerPress(c.x, c.y, "mouse", null);   // só o visual; o clique (onclick) já age ao soltar

    if (gameState === "playing" || gameState === "tutorial") {
        for (let act in keyBindings.p1) {
            if (keyBindings.p1[act] === mBtnCode) {
                triggerAction(act, player, false);
            }
        }
    } else if (gameState === "options_hud") {
        for (let key in touchHudLayout) {
            const btnRect = getHudButtonRect(key);
            if (inRect(c.x, c.y, btnRect.x, btnRect.y, btnRect.w, btnRect.h)) {
                hudEditorSelectedBtn = key;
                hudEditorDragging = true;
                hudDragOffsetX = c.x - btnRect.x;
                hudDragOffsetY = c.y - btnRect.y;
                break;
            }
        }
    }
};

canvas.onmouseup = (e) => {
    let mBtnCode = getMouseBindingName(e.button);
    mouseButtonsPressed[mBtnCode] = false;
    if (menuPointerPress && menuPointerPress.id === "mouse") {
        releaseButtonAt(menuPointerPress.x, menuPointerPress.y);   // sobe de volta ao lugar
        menuPointerPress = null;
    }

    if (gameState === "options_hud") {
        hudEditorDragging = false;
    }
    e.preventDefault();
};

canvas.onclick = (e) => {
    const point = getCanvasCoords(e.clientX, e.clientY);
    const fullscreenRect = getFullscreenButtonRect();
    if (inRect(point.x, point.y, fullscreenRect.x, fullscreenRect.y, fullscreenRect.w, fullscreenRect.h)) {
        toggleFullscreen();
        return;
    }

    if (gameState !== "playing") {
        scheduleButtonAction(() => handleMenuClick(point.x, point.y));   // depois de o botão voltar ao lugar
    }
};

// soltou o mouse fora do jogo: o botão não pode ficar "preso" afundado
window.addEventListener("mouseup", () => { if (menuPointerPress && menuPointerPress.id === "mouse") menuPointerPress = null; });

canvas.onwheel = (e) => {
    if (gameState === "characters") {
        e.preventDefault();
        setCharactersScroll(charactersScrollY + e.deltaY * 0.8);
        return;
    }
    if (gameState === "database") {
        e.preventDefault();
        const maxScroll = getDatabaseMaxScroll();
        if (maxScroll <= 0) return;
        characterDatabaseScrollY = Math.max(0, Math.min(characterDatabaseScrollY + e.deltaY * 0.8, maxScroll));
    } else if (gameState === "achievements") {
        e.preventDefault();
        const maxScroll = getAchievementsMaxScroll();
        if (maxScroll <= 0) return;
        achievementsScrollY = Math.max(0, Math.min(achievementsScrollY + e.deltaY * 0.8, maxScroll));
    }
};

// Dedo saiu do botão apertado: ele "sobe" e, se o dedo não foi arrastado para longe, a ação acontece.
function releaseTouchPress(e) {
    const press = menuPointerPress;
    if (!press || press.id === "mouse") return;
    const ended = Array.from(e.changedTouches).find(t => t.identifier === press.id);
    if (!ended) return;
    menuPointerPress = null;
    if (press.state !== gameState) return;
    const c = getCanvasCoords(ended.clientX, ended.clientY);
    if (Math.hypot(c.x - press.startX, c.y - press.startY) > BUTTON_PRESS_CANCEL_DIST) return;   // arrastou para fora: cancela
    releaseButtonAt(press.startX, press.startY);
    if (!press.onRelease) return;
    if (press.immediate) press.onRelease();
    else scheduleButtonAction(press.onRelease);
}

canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    controlsTestTouches = Array.from(e.touches).map(t => getCanvasCoords(t.clientX, t.clientY));
    if (controlSelectionMode !== "joystick") isTouchDevice = true;   // no modo JOYSTICK os botões de toque ficam escondidos
    lastInputWasTouch = true;
    lastTouchStartAt = Date.now();
    padNav.visible = false;
    if (controlSelectionMode === "auto") autoControlOverride = "touch";
    initAudio();

    // changedTouches = só os dedos que acabaram de tocar (touches inclui os que já estavam na tela)
    const firstTouch = e.changedTouches[0];
    if (!firstTouch) return;
    const firstPoint = getCanvasCoords(firstTouch.clientX, firstTouch.clientY);
    const fullscreenRect = getFullscreenButtonRect();
    if (inRect(firstPoint.x, firstPoint.y, fullscreenRect.x, fullscreenRect.y, fullscreenRect.w, fullscreenRect.h)) {
        startPointerPress(firstPoint.x, firstPoint.y, firstTouch.identifier, () => toggleFullscreen());
        menuPointerPress.immediate = true;
        return;
    }

    // Botões próprios do tutorial (PULAR/SAIR/VOLTAR): tratados aqui, ANTES de cair na lógica de toque do
    // jogo — sem isso, o toque nunca chamava handleMenuClick nessas telas e os botões pareciam não responder.
    // Afundam ao encostar e agem ao soltar (handleMenuClick já sabe tratar os três).
    if (gameState === "tutorial") {
        const ui = getTutorialUiLayout();
        const onTutorialBtn = ui.finished
            ? inRect(firstPoint.x, firstPoint.y, ui.voltar.x, ui.voltar.y, ui.voltar.w, ui.voltar.h)
            : inRect(firstPoint.x, firstPoint.y, ui.pular.x, ui.pular.y, ui.pular.w, ui.pular.h);
        if (onTutorialBtn) {
            startPointerPress(firstPoint.x, firstPoint.y, firstTouch.identifier, () => handleMenuClick(firstPoint.x, firstPoint.y));
            return;
        }
    }

    if (gameState === "database") {
        startPointerPress(firstPoint.x, firstPoint.y, firstTouch.identifier, null);   // só o visual: o toque é decidido no touchend abaixo
        databaseTouchScroll.active = true;
        databaseTouchScroll.touchId = firstTouch.identifier;
        databaseTouchScroll.startY = firstPoint.y;
        databaseTouchScroll.startScrollY = characterDatabaseScrollY;
        databaseTouchScroll.dragged = false;
        return;   // o clique (EDITAR/EXCLUIR/CRIAR/voltar) só é decidido no touchend, se não tiver sido um arraste
    }

    if (gameState === "achievements") {
        startPointerPress(firstPoint.x, firstPoint.y, firstTouch.identifier, null);
        achievementsTouchScroll.active = true;
        achievementsTouchScroll.touchId = firstTouch.identifier;
        achievementsTouchScroll.startY = firstPoint.y;
        achievementsTouchScroll.startScrollY = achievementsScrollY;
        achievementsTouchScroll.dragged = false;
        return;
    }

    if (gameState === "options_hud") {
        if (hitRect(firstPoint.x, firstPoint.y, MENU_LAYOUT.optionsHud.save) || hitRect(firstPoint.x, firstPoint.y, MENU_LAYOUT.optionsHud.reset) || isHudEditorBarHit(firstPoint.x, firstPoint.y)) {
            startPointerPress(firstPoint.x, firstPoint.y, firstTouch.identifier, () => handleMenuClick(firstPoint.x, firstPoint.y));
            return;
        }

        for (let key in touchHudLayout) {
            const btnRect = getHudButtonRect(key);
            if (inRect(firstPoint.x, firstPoint.y, btnRect.x, btnRect.y, btnRect.w, btnRect.h)) {
                hudEditorSelectedBtn = key;
                hudEditorDragging = true;
                hudDragOffsetX = firstPoint.x - btnRect.x;
                hudDragOffsetY = firstPoint.y - btnRect.y;
                break;
            }
        }
        return;
    }

    if (gameState !== "playing" && gameState !== "tutorial") {
        if (gameState === "characters") {
            Object.assign(charactersTouchScroll, { active: true, touchId: firstTouch.identifier, startY: firstPoint.y, startScrollY: charactersScrollY, dragged: false });
        }
        startPointerPress(firstPoint.x, firstPoint.y, firstTouch.identifier, () => handleMenuClick(firstPoint.x, firstPoint.y));
        return;
    }

    const moveArea = getTouchMovementArea();
    const now = Date.now();

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const c = getCanvasCoords(touch.clientX, touch.clientY);

        const pauseRect = getPauseButtonRect();
        if (inRect(c.x, c.y, pauseRect.x, pauseRect.y, pauseRect.w, pauseRect.h)) {
            startPointerPress(c.x, c.y, touch.identifier, () => {
                if (gameState === "tutorial") {
                    const step = getCurrentTutorialStep();
                    if (step && step.key === "pause") markTutorialActionDone("pause");
                }
                pauseGame();
            });
            return;
        }

        const hudKey = getHudButtonAt(c.x, c.y);

        if (hudKey) {
            // botões da partida agem NA HORA (velocidade importa); o afundado aparece enquanto o dedo segura
            hudPressHeld[touch.identifier] = hudKey;
            // CARREGAR com o ki cheio vira TRANSFORMAR: só transforma num toque novo (quem já estava segurando
            // para carregar precisa soltar e apertar de novo)
            if (hudKey === "charge" && canTouchTransform()) triggerAction("transform", player, false);
            else if (hudKey === "charge") touchChargeId = touch.identifier;
            else triggerAction(hudKey, player, false);
            continue;
        }

        const inMoveZone = c.x <= moveArea.x + moveArea.w && c.y >= moveArea.y && c.y <= moveArea.y + moveArea.h;
        if (inMoveZone) {
            if (touchControlMode === "analog") {
                if (!touchAnalog.active) {
                    touchAnalog.active = true;
                    touchAnalog.touchId = touch.identifier;
                    touchAnalog.startX = touchAnalog.curX = c.x;
                    touchAnalog.startY = touchAnalog.curY = c.y;
                    touchAnalog.vx = 0;
                    touchAnalog.vy = 0;
                }
            } else if (touchControlMode === "swipe") {
                if (!touchSwipe.active) {
                    touchSwipe.active = true;
                    touchSwipe.touchId = touch.identifier;
                    touchSwipe.lastX = c.x;
                    touchSwipe.lastY = c.y;
                }
            }
            continue;
        }

        // Duplo toque numa área livre da tela (fora do analógico e dos botões) = parry
        if (mobileDoubleTapParry) {
            if (now - lastTouchTime < 300) {
                triggerAction("parry", player, false);
                lastTouchTime = 0;
            } else {
                lastTouchTime = now;
            }
        }
    }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    controlsTestTouches = Array.from(e.touches).map(t => getCanvasCoords(t.clientX, t.clientY));

    if (menuPointerPress && menuPointerPress.id !== "mouse") {
        const pressTouch = Array.from(e.touches).find(t => t.identifier === menuPointerPress.id);
        if (pressTouch) {
            const c = getCanvasCoords(pressTouch.clientX, pressTouch.clientY);
            menuPointerPress.x = c.x;
            menuPointerPress.y = c.y;
        }
    }

    if (gameState === "database" && databaseTouchScroll.active) {
        const touch = Array.from(e.touches).find(t => t.identifier === databaseTouchScroll.touchId);
        if (touch) {
            const c = getCanvasCoords(touch.clientX, touch.clientY);
            const dy = c.y - databaseTouchScroll.startY;
            if (!databaseTouchScroll.dragged && Math.abs(dy) > DATABASE_DRAG_THRESHOLD) { databaseTouchScroll.dragged = true; menuPointerPress = null; }
            if (databaseTouchScroll.dragged) {
                // o conteúdo acompanha o dedo (arrastar para cima revela as linhas de baixo)
                const maxScroll = getDatabaseMaxScroll();
                characterDatabaseScrollY = Math.max(0, Math.min(maxScroll, databaseTouchScroll.startScrollY - dy));
            }
        }
        return;
    }

    if (gameState === "characters" && charactersTouchScroll.active) {
        const touch = Array.from(e.touches).find(t => t.identifier === charactersTouchScroll.touchId);
        if (touch) {
            const c = getCanvasCoords(touch.clientX, touch.clientY);
            const dy = c.y - charactersTouchScroll.startY;
            if (!charactersTouchScroll.dragged && Math.abs(dy) > DATABASE_DRAG_THRESHOLD && getCharactersMaxScroll() > 0) {
                charactersTouchScroll.dragged = true;
                menuPointerPress = null;   // virou arraste: não é mais um toque no cartão
            }
            if (charactersTouchScroll.dragged) setCharactersScroll(charactersTouchScroll.startScrollY - dy);
        }
        return;
    }

    if (gameState === "achievements" && achievementsTouchScroll.active) {
        const touch = Array.from(e.touches).find(t => t.identifier === achievementsTouchScroll.touchId);
        if (touch) {
            const c = getCanvasCoords(touch.clientX, touch.clientY);
            const dy = c.y - achievementsTouchScroll.startY;
            if (!achievementsTouchScroll.dragged && Math.abs(dy) > DATABASE_DRAG_THRESHOLD) { achievementsTouchScroll.dragged = true; menuPointerPress = null; }
            if (achievementsTouchScroll.dragged) {
                const maxScroll = getAchievementsMaxScroll();
                achievementsScrollY = Math.max(0, Math.min(maxScroll, achievementsTouchScroll.startScrollY - dy));
            }
        }
        return;
    }

    if (gameState === "options_hud" && hudEditorDragging && hudEditorSelectedBtn) {
        let touch = e.touches[0];
        let c = getCanvasCoords(touch.clientX, touch.clientY);
        const nextX = Math.max(0, Math.min(canvas.width - touchHudLayout[hudEditorSelectedBtn].w * touchHudLayout[hudEditorSelectedBtn].scale, c.x - hudDragOffsetX));
        const nextY = Math.max(0, Math.min(canvas.height - touchHudLayout[hudEditorSelectedBtn].h * touchHudLayout[hudEditorSelectedBtn].scale, c.y - hudDragOffsetY));
        setButtonPosInNormalizedSpace(hudEditorSelectedBtn, nextX, nextY);
        return;
    }

    if (gameState !== "playing" && gameState !== "tutorial") return;

    for (let i = 0; i < e.touches.length; i++) {
        let touch = e.touches[i];
        let c = getCanvasCoords(touch.clientX, touch.clientY);

        if (touchControlMode === "analog" && touchAnalog.active && touch.identifier === touchAnalog.touchId) {
            // Sem checar a zona: depois que o dedo começou, ele controla o analógico mesmo saindo da área.
            const vec = getAnalogVector(c.x - touchAnalog.startX, c.y - touchAnalog.startY, TOUCH_ANALOG.RADIUS, TOUCH_ANALOG.DEADZONE);
            touchAnalog.curX = c.x;
            touchAnalog.curY = c.y;
            touchAnalog.vx = vec.x;
            touchAnalog.vy = vec.y;
        } else if (touchControlMode === "swipe" && touchSwipe.active && touch.identifier === touchSwipe.touchId) {
            let dx = c.x - touchSwipe.lastX;
            let dy = c.y - touchSwipe.lastY;

            if (!player.isCharging) {
                player.x += dx;
                player.y += dy;
                player.x = Math.max(BOUNDS.PLAYER_MIN_X, Math.min(BOUNDS.PLAYER_MAX_X, player.x));
                player.y = Math.max(BOUNDS.PLAYER_MIN_Y, Math.min(BOUNDS.PLAYER_MAX_Y_BASE - (player.h - 56), player.y));
            }
            touchMoveX = dx;
            touchMoveY = dy;

            touchSwipe.lastX = c.x;
            touchSwipe.lastY = c.y;
        }
    }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    controlsTestTouches = Array.from(e.touches).map(t => getCanvasCoords(t.clientX, t.clientY));
    releaseTouchPress(e);
    if (charactersTouchScroll.active && !Array.from(e.touches).some(t => t.identifier === charactersTouchScroll.touchId)) charactersTouchScroll.active = false;
    const stillDown = Array.from(e.touches).map(t => t.identifier);
    Object.keys(hudPressHeld).forEach(id => {
        if (stillDown.includes(Number(id))) return;
        hudReleaseStart[hudPressHeld[id]] = performance.now();   // soltou: o botão sobe de volta
        delete hudPressHeld[id];
    });

    if (gameState === "options_hud") {
        hudEditorDragging = false;
        return;
    }

    if (gameState === "database" && databaseTouchScroll.active) {
        const wasDrag = databaseTouchScroll.dragged;
        const endedTouch = Array.from(e.changedTouches).find(t => t.identifier === databaseTouchScroll.touchId);
        databaseTouchScroll.active = false;
        databaseTouchScroll.touchId = null;
        if (!wasDrag && endedTouch) {
            // dedo praticamente parado: trata como um toque normal (EDITAR/EXCLUIR/CRIAR/voltar)
            const p = getCanvasCoords(endedTouch.clientX, endedTouch.clientY);
            handleMenuClick(p.x, p.y);
        }
        return;
    }

    if (gameState === "achievements" && achievementsTouchScroll.active) {
        const wasDrag = achievementsTouchScroll.dragged;
        const endedTouch = Array.from(e.changedTouches).find(t => t.identifier === achievementsTouchScroll.touchId);
        achievementsTouchScroll.active = false;
        achievementsTouchScroll.touchId = null;
        if (!wasDrag && endedTouch) {
            const p = getCanvasCoords(endedTouch.clientX, endedTouch.clientY);
            handleMenuClick(p.x, p.y);
        }
        return;
    }

    // Sem "if (gameState !== playing) return": se o dedo sair durante pausa/game over o estado precisa ser limpo,
    // senão o personagem "anda sozinho" na próxima partida.
    const activeTouchIds = Array.from(e.touches).map(t => t.identifier);

    if (touchAnalog.active && !activeTouchIds.includes(touchAnalog.touchId)) {
        clearTouchMovementState();
    }

    if (touchSwipe.active && !activeTouchIds.includes(touchSwipe.touchId)) {
        touchSwipe.active = false;
        touchSwipe.touchId = null;
        touchMoveX = 0;
        touchMoveY = 0;
    }

    if (touchChargeId !== null && !activeTouchIds.includes(touchChargeId)) {
        touchChargeId = null;
    }
}, { passive: false });

canvas.addEventListener("touchcancel", (e) => {
    e.preventDefault();
    menuPointerPress = null;
    Object.keys(hudPressHeld).forEach(id => delete hudPressHeld[id]);
    databaseTouchScroll.active = false;
    databaseTouchScroll.touchId = null;
    achievementsTouchScroll.active = false;
    achievementsTouchScroll.touchId = null;
    resetTouchInputState();
}, { passive: false });

window.onkeydown = (e) => {
    if (!controleUsadoAgora()) lastKeyInputAt = Date.now();
    // AUTOMÁTICO: usou o teclado → modo PC
    if (controlSelectionMode === "auto" && autoControlOverride !== "pc" && !controleUsadoAgora()) { autoControlOverride = "pc"; applyEffectiveControlMode(); }
    if (remappingKey) {
        let [p, act] = remappingKey.split(".");
        keyBindings[p][act] = e.code;
        saveControls();
        remappingKey = null;
        closeSystemAlert();
        return;
    }

    if (padCapture) {          // captura de botão do controle: qualquer tecla cancela
        cancelPadCapture();
        return;
    }

    keysPressed[e.code] = true;

    // No choque de feixes vale quem APERTA mais rápido: a repetição automática de tecla segurada não conta.
    if (e.repeat && world.beamOwner === "clash" && world.beamActive > 0) return;

    // Evita que Espaço/setas rolem a página ou "cliquem" num botão focado durante a partida.
    if (gameState === "playing" && ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
    }

    if (gameState === "playing") {
        if (e.code === "Escape" || e.code === "KeyP") {
            pauseGame();
            return;
        }

        for (let act in keyBindings.p1) {
            if (keyBindings.p1[act] === e.code) triggerAction(act, player, false);
        }

        if (gameMode === "coop") {
            for (let act in keyBindings.p2) {
                if (keyBindings.p2[act] === e.code) triggerAction(act, player2, true);
            }
        }
    } else if (gameState === "tutorial") {
        if (e.code === "Escape" || e.code === "KeyP") {
            if (getCurrentTutorialStep() && getCurrentTutorialStep().key === "pause") markTutorialActionDone("pause");
            pauseGame();
            return;
        }
        for (let act in keyBindings.p1) {
            if (keyBindings.p1[act] === e.code) triggerAction(act, player, false);
        }
    } else if (gameState === "controls_test") {
        if (e.code === "Escape") setGameState("options_controls");
    } else if (gameState === "paused") {
        if (e.code === "Escape" || e.code === "KeyP") {
            requestResume();
        }
    }
};

window.onkeyup = (e) => {
    keysPressed[e.code] = false;
};

// Ao trocar de aba/janela o navegador não avisa que a tecla foi solta: limpa tudo para não ficar andando sozinho.
// Também pausa sozinho (troca de aba, ligação, bloqueio de tela, app em segundo plano, clique fora do jogo).
function autoPauseGame() {
    keysPressed = {};
    mouseButtonsPressed = {};
    resetTouchInputState();
    pauseGame(true);
}
window.addEventListener("blur", autoPauseGame);
window.addEventListener("pagehide", autoPauseGame);
document.addEventListener("visibilitychange", () => { if (document.hidden) autoPauseGame(); });

// Texto de instrução do passo atual, adaptado ao controle em uso — toque (analógico ou arrastar), teclado/mouse
// e controle (quando conectado) aparecem juntos no PC, já que o jogo aceita os três ao mesmo tempo.
function getTutorialInstructionLines(stepKey) {
    // só os comandos da plataforma em uso (toque, teclado/mouse ou controle); troca na hora se o jogador mudar
    const lines = [];
    const plataforma = getActiveInputPlatform();
    if (plataforma === "controle") {
        const padNames = { move: "ANALÓGICO ESQUERDO OU DIRECIONAL", attack: describePadBinding(padBindings.attack), charge: describePadBinding(padBindings.charge), parry: describePadBinding(padBindings.parry), transform: describePadBinding(padBindings.transform), special: describePadBinding(padBindings.special), pause: describePadBinding(padBindings.pause) };
        lines.push(`CONTROLE: ${padNames[stepKey]}`);
        if (stepKey === "charge") lines.push("(SEGURE POR UM INSTANTE)");
    } else if (plataforma === "toque") {
        if (stepKey === "move") {
            lines.push(touchControlMode === "swipe" ? "ARRASTE O DEDO NA TELA PARA VOAR" : "TOQUE E ARRASTE NO ANALÓGICO (ESQUERDA DA TELA), OU SEGURE PRA ATIRAR SEM PARAR");
        } else if (stepKey === "pause") {
            lines.push("TOQUE NO ÍCONE DE PAUSA NO TOPO DA TELA");
        } else if (stepKey === "parry" && mobileDoubleTapParry) {
            // O botão PARRY fica escondido de propósito quando o duplo toque está ativado (padrão do jogo).
            lines.push("TOQUE 2 VEZES SEGUIDAS EM QUALQUER LUGAR LIVRE DA TELA");
        } else {
            const names = { attack: "ATAQUE", charge: "CARREGAR", parry: "PARRY", special: "ESPECIAL" };
            if (stepKey === "transform") lines.push(`COM O KI CHEIO O BOTÃO "CARREGAR" VIRA "TRANSFORMAR": TOQUE NELE`);
            else if (stepKey === "attack" && touchAutoFire) lines.push("SEGURE O DEDO NO ANALÓGICO PARA ATIRAR SEM PARAR");
            else lines.push(`TOQUE (OU SEGURE) NO BOTÃO "${names[stepKey]}" NA TELA`);
            if (stepKey === "charge") lines.push("(SEGURE POR UM INSTANTE)");
        }
    } else {
        if (stepKey === "move") {
            lines.push("TECLADO: W A S D OU SETAS DIRECIONAIS");
            lines.push("MOUSE: ATIVE O MODO 'SEGUIR MOUSE' NAS OPÇÕES");
        } else if (stepKey === "pause") {
            lines.push(`TECLADO: ${getBindingDisplayName("Escape")} OU ${getBindingDisplayName("KeyP")}`);
        } else {
            lines.push(`TECLADO/MOUSE: ${getBindingDisplayName(keyBindings.p1[stepKey])}`);
        }
        if (stepKey === "charge") lines.push("(SEGURE POR UM INSTANTE)");
    }
    return lines;
}

// Textos e posição dos botões próprios do tutorial (PULAR/SAIR/VOLTAR) num único lugar, pra desenho e toque
// nunca ficarem fora de sincronia de novo (foi exatamente esse desalinhamento que quebrou o "voltar ao menu").
function getTutorialUiLayout() {
    const step = getCurrentTutorialStep();
    const finished = tutorialPhase === "finished";
    const title = finished ? "TUTORIAL CONCLUÍDO! VOCÊ JÁ SABE TODOS OS COMANDOS." : step ? `PASSO ${Math.min(tutorialStepIndex + 1, TUTORIAL_STEPS.length)}/${TUTORIAL_STEPS.length}: ${step.title}` : "";
    const subtitle = finished ? "" : tutorialPhase === "effect" ? "MUITO BEM! ISSO MESMO." : (step ? (getTutorialInstructionLines(step.key)[0] || "") : "");

    ctx.font = "bold 10px 'Trebuchet MS', sans-serif";
    const titleW = ctx.measureText(title).width;
    ctx.font = "9px 'Trebuchet MS', sans-serif";
    const subtitleW = subtitle ? ctx.measureText(subtitle).width : 0;

    const padX = 14, padTop = 8, lineGap = 14;
    const contentW = Math.max(titleW, subtitleW);
    const bubbleW = Math.min(canvas.width - 24, contentW + padX * 2);
    const bubbleH = subtitle ? 38 : 24;
    // Fica abaixo do ícone de pausa (que ocupa o topo-centro, y 8-36) — nunca mais em cima da escrita.
    const bubbleY = 40;
    const bubbleX = (canvas.width - bubbleW) / 2;

    return {
        finished, title, subtitle, bubbleX, bubbleY, bubbleW, bubbleH, padTop, lineGap,
        pular: { x: 6, y: bubbleY + bubbleH / 2 - 8, w: 50, h: 16 },
        voltar: { x: canvas.width / 2 - 70, y: bubbleY + bubbleH + 6, w: 140, h: 18 }
    };
}

function drawTutorialScreen() {
    drawStageBackground();
    drawPlayerEntity(player, characterDB[selectedCharacter], false);
    drawObstacles();      // tiros de ki (e o projétil de treino do passo PARRY), igual à luta
    drawSpecialBeams();   // o feixe do ESPECIAL

    const step = getCurrentTutorialStep();
    const ui = getTutorialUiLayout();

    // Balão ao redor da escrita — não mais uma faixa cobrindo a tela inteira — e sempre abaixo do ícone de
    // pausa (que fica sempre visível, igual numa partida normal), então nunca mais fica um em cima do outro.
    ctx.save();
    ctx.fillStyle = "rgba(4, 8, 20, 0.88)";
    ctx.strokeStyle = tutorialPhase === "effect" ? "#4ade80" : "#3a5a8a";
    ctx.lineWidth = 1.5;
    traceRoundedRect(ui.bubbleX, ui.bubbleY, ui.bubbleW, ui.bubbleH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = ui.finished ? "#ffd23f" : tutorialPhase === "effect" ? "#86efac" : "#ffd23f";
    ctx.font = "bold 10px 'Trebuchet MS', sans-serif";
    ctx.fillText(ui.title, canvas.width / 2, ui.bubbleY + ui.padTop + 4);
    if (ui.subtitle) {
        ctx.fillStyle = tutorialPhase === "effect" ? "#eafff0" : "#dbe6ff";
        ctx.font = "9px 'Trebuchet MS', sans-serif";
        ctx.fillText(ui.subtitle, canvas.width / 2, ui.bubbleY + ui.padTop + ui.lineGap + 4);
    }

    if (ui.finished) {
        registerMenuTarget(ui.voltar.x, ui.voltar.y, ui.voltar.w, ui.voltar.h);
        drawBtn(ui.voltar.x, ui.voltar.y, ui.voltar.w, ui.voltar.h, "VOLTAR AO MENU", "#86efac", "bold 9px 'Courier New', monospace");
    } else if (step) {
        registerMenuTarget(ui.pular.x, ui.pular.y, ui.pular.w, ui.pular.h);
        drawBtn(ui.pular.x, ui.pular.y, ui.pular.w, ui.pular.h, "PULAR", "#93c5fd", "bold 8px 'Courier New', monospace");
    }
    ctx.restore();

    // Botões de toque do JOGO (analógico, ataque, etc.) por cima de tudo — incluindo o ícone de pausa, que
    // fica sempre visível no topo-centro, igual numa partida normal, e nunca mais some atrás do balão.
    drawTouchHUD();

    // barra de ki no canto inferior esquerdo (fora da área dos botões de toque, que ficam à direita)
    ctx.save();
    ctx.fillStyle = "#222244";
    ctx.fillRect(14, canvas.height - 20, 120, 7);
    ctx.fillStyle = canUseSpecial(player.ki, player.maxKi) ? "#ffd23f" : "#00ffff";
    ctx.fillRect(14, canvas.height - 20, (player.ki / player.maxKi) * 120, 7);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(14, canvas.height - 20, 120, 7);
    ctx.restore();
}

function triggerAction(actionName, targetPlayer, isP2 = false) {
    if (actionName === "attack") {
        if (world.beamOwner === "clash" && world.beamActive > 0) { registerClashMash(isP2); return; }
        fireKiBarrage(targetPlayer, isP2);
    }
    else if (actionName === "transform") {
        // sem ki suficiente não transforma (a barra de ki mostra; nada de texto no meio da luta)
        transformPlayer(targetPlayer, isP2);
    }
    else if (actionName === "parry") tryReflect(targetPlayer, isP2);
    else if (actionName === "special") triggerSpecialAttack(isP2);
    if (gameState === "tutorial" && !isP2) markTutorialActionDone(actionName);
}

function startRemapping(keyPath) {
    remappingKey = keyPath;
    showSystemAlert("MAPEAMENTO", "PRESSIONE QUALQUER TECLA OU BOTÃO DO MOUSE PARA RECONFIGURAR...");
}

// O som de clique só toca quando o toque cai num botão (alvo desenhado na tela) — tocar no fundo vazio fica
// em silêncio. Exceções: telas de "toque em qualquer lugar" (derrota e a pausa automática).
function isMenuClickOnButton(x, y) {
    if (gameState === "gameover" || (gameState === "paused" && autoPaused)) return true;
    const onTarget = t => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h;
    return menuTargets.some(onTarget) || menuTargetsPrev.some(onTarget);
}

function handleMenuClick(x, y) {
    initAudio();
    // botão de tela cheia (o mouse e o toque já tratam antes; aqui chega pelo controle)
    const fsRect = getFullscreenButtonRect();
    if (inRect(x, y, fsRect.x, fsRect.y, fsRect.w, fsRect.h)) { toggleFullscreen(); return; }
    if (isMenuClickOnButton(x, y)) playSound("menu");

    if (gameState === "menu") {
        if (hitRect(x, y, MENU_LAYOUT.main.play)) setGameState("mode_select");
        else if (hitRect(x, y, MENU_LAYOUT.main.characters)) { charactersScrollY = 0; setGameState("characters"); }
        else if (hitRect(x, y, MENU_LAYOUT.main.stages)) setGameState("stages");
        else if (hitRect(x, y, MENU_LAYOUT.main.options)) {
            optionsReturnState = "menu";
            setGameState("options_main");
        }
        else if (hitRect(x, y, MENU_LAYOUT.main.ranking)) setGameState("ranking");
        else if (hitRect(x, y, MENU_LAYOUT.main.database)) setGameState("database");
        else if (hitRect(x, y, MENU_LAYOUT.main.achievements)) { achievementsScrollY = 0; setGameState("achievements"); }
        else if (hitRect(x, y, MENU_LAYOUT.main.tutorial)) startTutorial();
        else if (hitRect(x, y, MENU_LAYOUT.main.updates)) openUpdatesModal();
    }
    else if (gameState === "mode_select") {
        if (hitRect(x, y, MENU_LAYOUT.modeSelect.single)) {
            gameMode = "singleplayer";
            saveSettings();
            setGameState("stage_map");
        }
        else if (hitRect(x, y, MENU_LAYOUT.modeSelect.coop)) {
            gameMode = "coop";
            saveSettings();
            startGame();
        }
        else if (hitRect(x, y, MENU_LAYOUT.back)) setGameState("menu");
    }
    else if (gameState === "paused") {
        if (resumeCountdown > 0) return;
        if (hitRect(x, y, MENU_LAYOUT.paused.options)) {
            optionsReturnState = "paused";
            setGameState("options_main");
        }
        else if (hitRect(x, y, MENU_LAYOUT.paused.exit)) setGameState("menu");
        // CONTINUAR, ou (depois de pausa automática) toque/clique em qualquer outro lugar
        else if (hitRect(x, y, MENU_LAYOUT.paused.resume) || autoPaused) requestResume();
    }
    else if (gameState === "gameover") {
        setGameState(gameMode === "singleplayer" ? "stage_map" : "menu");
    }
    else if (gameState === "characters") {
        let chars = getFilteredCharacters();
        
        if (hitRect(x, y, MENU_LAYOUT.characters.tabHeroes)) { currentTab = "HERÓIS"; charactersScrollY = 0; }
        else if (hitRect(x, y, MENU_LAYOUT.characters.tabVillains)) { currentTab = "VILÕES"; charactersScrollY = 0; }

        chars.forEach((key, i) => {
            if (y >= CHARACTERS_GRID_TOP - 4 && hitRect(x, y, getCharacterCardRect(i))) {
                const heroi = currentTab === "HERÓIS";
                if ((heroi ? selectedCharacter : selectedBoss) === key) return;   // já é o escolhido
                const nome = characterDB[key] && characterDB[key].name ? characterDB[key].name : key;
                const quem = gameMode === "coop" ? (heroi ? "o JOGADOR 1" : "o JOGADOR 2") : (heroi ? "o herói" : "o vilão");
                showSystemConfirm("SELECIONAR PERSONAGEM", `Deseja selecionar ${nome} para ${quem}?`, () => {
                    if (heroi) selectedCharacter = key; else selectedBoss = key;
                    saveSelectedCharacters();
                }, "SELECIONAR", "CANCELAR");
            }
        });

        if (hitRect(x, y, MENU_LAYOUT.back)) setGameState("menu");
    }
    else if (gameState === "stages") {
        STAGE_PROGRESSION.forEach((stg, i) => {
            if (hitRect(x, y, getStageCardRect(i))) {
                if (isStageUnlockedByProgress(stg.id, stageProgress)) {
                    selectedStage = stg.id;
                    saveSettings();
                } else {
                    const prevName = (STAGE_PROGRESSION[i - 1] || {}).name || "";
                    stageLockedHintText = `COMPLETE O MODO NORMAL DE "${prevName}" PRA LIBERAR`;
                    stageLockedHintTimer = 120;
                }
            }
        });

        if (hitRect(x, y, MENU_LAYOUT.back)) setGameState("menu");
    }
    else if (gameState === "options_main") {
        if (hitRect(x, y, MENU_LAYOUT.optionsMain.controls)) setGameState("options_controls");
        else if (hitRect(x, y, MENU_LAYOUT.optionsMain.audio)) setGameState("options_audio");
        else if (hitRect(x, y, MENU_LAYOUT.optionsMain.cast)) transmitirParaTV();
        else if (hitRect(x, y, MENU_LAYOUT.back)) setGameState(optionsReturnState);
    }
    else if (gameState === "options_controls") {
        for (const row of MENU_LAYOUT.optionsControls.toggles) {
            if (hitRect(x, y, row)) {
                controlSelectionMode = row.key;
                if (row.key !== "auto") { manualControlMode = row.key; autoControlOverride = null; }
                applyEffectiveControlMode();
                saveControls();
                return;
            }
        }
        if (hitRect(x, y, MENU_LAYOUT.optionsControls.pc)) {
            setGameState("options_pc");
            return;
        }
        else if (hitRect(x, y, MENU_LAYOUT.optionsControls.touch)) {
            setGameState("options_touch");
            return;
        }
        else if (hitRect(x, y, MENU_LAYOUT.optionsControls.gamepad)) {
            padCapture = null;
            setGameState("options_gamepad");
            return;
        }
        else if (hitRect(x, y, MENU_LAYOUT.optionsControls.test)) {
            controlsTestTouches = [];
            testeGoku = null;   // a prévia recomeça do zero
            setGameState("controls_test");
            return;
        }

        if (hitRect(x, y, MENU_LAYOUT.back)) setGameState("options_main");
    }
    else if (gameState === "options_gamepad") {
        if (padCapture) { cancelPadCapture(); return; }
        if (hitRect(x, y, MENU_LAYOUT.back)) { setGameState("options_controls"); return; }
        PAD_ACTIONS.forEach((action, i) => {
            if (hitRect(x, y, getGamepadBindingRect(i))) startPadCapture(action);
        });
        if (hitRect(x, y, MENU_LAYOUT.optionsGamepad.reset)) {
            padBindings = normalizePadBindings(null);
            saveControls();
            padCaptureNote = "PADRÃO PS5 RESTAURADO";
            padCaptureNoteTimer = 3;
        }
        else if (hitRect(x, y, MENU_LAYOUT.optionsGamepad.sensLess) || hitRect(x, y, MENU_LAYOUT.optionsGamepad.sensMore)) {
            const d = hitRect(x, y, MENU_LAYOUT.optionsGamepad.sensMore) ? 1 : -1;
            padSensitivity = Math.max(PAD_SENSITIVITY_MIN, Math.min(PAD_SENSITIVITY_MAX, padSensitivity + d));
            saveControls();
        }
        else if (hitRect(x, y, MENU_LAYOUT.optionsGamepad.test)) {
            controlsTestTouches = [];
            testeGoku = null;   // a prévia recomeça do zero
            setGameState("controls_test");
        }
    }
    else if (gameState === "controls_test") {
        if (hitRect(x, y, MENU_LAYOUT.back)) setGameState("options_controls");
    }
    else if (gameState === "options_pc") {
        if (hitRect(x, y, MENU_LAYOUT.back)) { setGameState("options_controls"); return; }
        else if (hitRect(x, y, MENU_LAYOUT.optionsPc.profileP1)) { activeControlProfile = "p1"; }
        else if (hitRect(x, y, MENU_LAYOUT.optionsPc.profileP2)) { activeControlProfile = "p2"; }


        if (hitRect(x, y, MENU_LAYOUT.optionsPc.keyboard)) { pcInputMode = "keyboard"; saveControls(); }
        else if (hitRect(x, y, MENU_LAYOUT.optionsPc.mouse)) { pcInputMode = "mouse"; saveControls(); }

        const profileKey = activeControlProfile || "p1";
        let acts = ["up", "down", "left", "right", "attack", "charge", "transform", "parry", "special"];
        acts.forEach((act, idx) => {
            if (hitRect(x, y, getPcKeyRect(idx))) startRemapping(`${profileKey}.${act}`);
        });
    }
    else if (gameState === "options_touch") {
        if (hitRect(x, y, MENU_LAYOUT.optionsTouch.analog)) { touchControlMode = "analog"; saveControls(); }
        else if (hitRect(x, y, MENU_LAYOUT.optionsTouch.swipe)) { touchControlMode = "swipe"; saveControls(); }
        else if (hitRect(x, y, MENU_LAYOUT.optionsTouch.doubleTap)) { mobileDoubleTapParry = !mobileDoubleTapParry; saveControls(); }
        else if (hitRect(x, y, MENU_LAYOUT.optionsTouch.vibration)) {
            vibrationEnabled = !vibrationEnabled;
            saveControls();
            vibrate(60);
        }
        else if (hitRect(x, y, MENU_LAYOUT.optionsTouch.autoFire)) { touchAutoFire = !touchAutoFire; saveControls(); }
        else if (hitRect(x, y, MENU_LAYOUT.optionsTouch.hud)) setGameState("options_hud");
        else if (hitRect(x, y, MENU_LAYOUT.back)) setGameState("options_main");
    }
    else if (gameState === "options_hud") {
        if (hitRect(x, y, MENU_LAYOUT.optionsHud.save)) {
            writeStorage("saiyan_touch_hud_customized", "1"); // impede o resize de apagar o layout escolhido
            saveControls();
            setGameState("options_touch");
        }
        else if (hitRect(x, y, MENU_LAYOUT.optionsHud.reset)) {
            touchHudLayout = getDefaultTouchHudLayout(window.innerWidth);
            hudEditorSelectedBtn = null;
            writeStorage("saiyan_touch_hud_customized", "");
            saveControls();
        }
        else handleHudEditorBarClick(x, y);
    }
    else if (gameState === "options_audio") {
        if (hitRect(x, y, MENU_LAYOUT.optionsAudio.sfxMinus)) { sfxVolume = Math.max(0, sfxVolume - 0.1); saveAudioSettings(); }
        else if (hitRect(x, y, MENU_LAYOUT.optionsAudio.sfxPlus)) { sfxVolume = Math.min(1, sfxVolume + 0.1); saveAudioSettings(); }
        else if (hitRect(x, y, MENU_LAYOUT.optionsAudio.bgmMinus)) { bgmVolume = Math.max(0, bgmVolume - 0.1); saveAudioSettings(); }
        else if (hitRect(x, y, MENU_LAYOUT.optionsAudio.bgmPlus)) { bgmVolume = Math.min(1, bgmVolume + 0.1); saveAudioSettings(); }
        else if (hitRect(x, y, MENU_LAYOUT.optionsAudio.mute)) { isMuted = !isMuted; saveAudioSettings(); }
        else if (hitRect(x, y, MENU_LAYOUT.optionsAudio.tracks)) setGameState("options_tracks");
        else if (hitRect(x, y, MENU_LAYOUT.back)) setGameState("options_main");
    }
    else if (gameState === "options_tracks") {
        if (hitRect(x, y, MENU_LAYOUT.back)) setGameState("options_audio");
        else getBgmTrackList().forEach((t, i) => {
            if (hitRect(x, y, getTrackPlayRect(i)) || hitRect(x, y, getTrackRowRect(i))) toggleTrackPreview(t.era);
        });
    }
    else if (gameState === "ranking") {
        if (hitRect(x, y, MENU_LAYOUT.back)) setGameState("menu");
        else if (hitRect(x, y, MENU_LAYOUT.ranking.tabGeneral)) { rankingViewMode = "geral"; }
        else if (hitRect(x, y, MENU_LAYOUT.ranking.tabStage)) { rankingViewMode = "fase"; if (!rankingSelectedStage) rankingSelectedStage = STAGE_PROGRESSION[0].id; }
        else if (rankingViewMode === "fase") {
            STAGE_PROGRESSION.forEach((stg, i) => {
                if (hitRect(x, y, getRankingStageTabRect(i))) rankingSelectedStage = stg.id;
            });
        }
    }
    else if (gameState === "achievements") {
        if (hitRect(x, y, MENU_LAYOUT.back)) setGameState("menu");
    }
    else if (gameState === "stage_victory") {
        if (hitRect(x, y, MENU_LAYOUT.stageVictory.continue)) setGameState("stage_map");
    }
    else if (gameState === "tutorial") {
        const ui = getTutorialUiLayout();
        if (ui.finished) {
            if (inRect(x, y, ui.voltar.x, ui.voltar.y, ui.voltar.w, ui.voltar.h)) setGameState("menu");
        } else {
            if (inRect(x, y, ui.pular.x, ui.pular.y, ui.pular.w, ui.pular.h)) advanceTutorialStep();
        }
    }
    else if (gameState === "stage_map") {
        if (stageChoicePendingId) {
            // overlay de escolha de modo: sempre aparece ao clicar numa fase liberada. NORMAL sempre dá pra
            // jogar; DIFÍCIL só depois de completar o NORMAL dessa fase; SEM LIMITE só depois dos dois.
            const canHard = isHardModeUnlocked(stageChoicePendingId, stageProgress);
            const canUnlimited = isUnlimitedModeUnlocked(stageChoicePendingId, stageProgress);
            if (hitRect(x, y, MENU_LAYOUT.stageMap.normal)) {
                selectedStage = stageChoicePendingId;
                stageMode = "normal";
                stageChoicePendingId = null;
                saveSettings();
                startGame();
            } else if (canHard && hitRect(x, y, MENU_LAYOUT.stageMap.hard)) {
                selectedStage = stageChoicePendingId;
                stageMode = "hard";
                stageChoicePendingId = null;
                saveSettings();
                startGame();
            } else if (canUnlimited && hitRect(x, y, MENU_LAYOUT.stageMap.unlimited)) {
                selectedStage = stageChoicePendingId;
                stageMode = "unlimited";
                stageChoicePendingId = null;
                saveSettings();
                startGame();
            } else if (hitRect(x, y, MENU_LAYOUT.back)) {
                stageChoicePendingId = null;   // a seta ← fecha a escolha do modo (como nas outras telas)
                padNav.focus = null;
            }
            return;
        }
        getStageMapNodes().forEach(node => {
            if (inRect(x, y, node.x - STAGE_MAP_NODE_R, node.y - STAGE_MAP_NODE_R, STAGE_MAP_NODE_R * 2, STAGE_MAP_NODE_R * 2)) {
                if (!node.unlocked) {
                    stageLockedHintText = "COMPLETE O MODO NORMAL DA FASE ANTERIOR PRA LIBERAR";
                    stageLockedHintTimer = 120;
                } else {
                    stageChoicePendingId = node.id;
                    padNav.focus = null;   // o foco do controle começa no NORMAL do quadro
                }
            }
        });
        if (hitRect(x, y, MENU_LAYOUT.back)) setGameState("mode_select");
    }
    else if (gameState === "database") {
        const layout = getDatabaseLayoutMetrics();
        let keys = Object.keys(characterDB);

        if (inRect(x, y, layout.createButtonX, layout.createButtonY, layout.createButtonWidth, 30)) { openModal(null); return; }
        if (hitRect(x, y, MENU_LAYOUT.back)) { setGameState("menu"); return; }

        keys.forEach((k, idx) => {
            const row = Math.floor(idx / layout.columns);
            const col = idx % layout.columns;
            const cx = layout.gridLeft + col * (layout.cardWidth + layout.gapX);
            const cy = layout.gridTop + row * (layout.cardHeight + layout.gapY) - characterDatabaseScrollY;

            if (cy + layout.cardHeight < layout.gridTop - 10 || cy > layout.gridTop + layout.viewportHeight + 10) return;

            const geo = getDatabaseCardGeometry(layout, cx, cy);
            const { btnW, firstBtnX, actionY } = geo;

            if (inRect(x, y, firstBtnX, actionY, btnW, 20)) openModal(k);
            else if (inRect(x, y, firstBtnX + btnW + 10, actionY, btnW, 20)) {
                if (keys.length <= 1) return showSystemAlert("AVISO", "DEVE HAVER PELO MENOS UM PERSONAGEM!");
                showSystemConfirm("EXCLUIR", `REMOVER ${characterDB[k].name}?`, () => {
                    delete characterDB[k];
                    // Se o apagado era o escolhido (herói ou vilão), escolhe outro que ainda existe — senão a
                    // partida começava com um personagem inexistente (aparecia só um retângulo colorido).
                    const remaining = Object.keys(characterDB);
                    const pick = (aligns) => remaining.find(key => aligns.includes(characterDB[key].alignment)) || remaining[0];
                    if (selectedCharacter === k) selectedCharacter = pick(["HERÓI", "ANTI-HERÓI"]);
                    if (selectedBoss === k) selectedBoss = pick(["VILÃO", "ANTI-HERÓI"]);
                    saveSelectedCharacters();
                    saveCharacterData();
                });
            }
        });
    }
}

// ==================== SALA DO TEMPO: PAVILHÃO EM 3D QUE A CÂMERA RODEIA ====================
// O pavilhão no vazio branco: cúpula dourada com relógio, duas alas de telhado rosa, ampulhetas gigantes de
// areia verde (que escorre de verdade), postes com globo verde-água e piso de azulejos em degraus. Tudo é
// descrito em coordenadas de "planta" (x para o lado, z para a frente, y para cima) e projetado com a
// câmera girando o ângulo `ang` em volta do centro — assim a fase mostra frente, lateral, fundos e volta.
// A câmera tem perspectiva de verdade (fica a TR_D do centro, a TR_H de altura) e o chão branco tem rejuntes
// até o horizonte: o chão perto dos lutadores passa rápido e o pavilhão lá longe gira devagar — quem parece
// andar em volta do pavilhão são os lutadores, não o pavilhão girando como um prato.
const TR_K = 1.12, TR_CX = 400, TR_GY = 236, TR_TILT = 0.3;
const TR_D = 700, TR_H = 210, TR_F = TR_K * TR_D, TR_HY = TR_GY - TR_K * TR_H, TR_PERTO = 40;
let trG = ctx;   // onde o pavilhão é desenhado (a imagem guardada; ver drawTimeRoomStage)
// Câmera usada por trProj. A Sala do Tempo usa TR_CAM; a Nave de Freeza troca para NV_CAM enquanto desenha.
const TR_CAM = { CX: TR_CX, HY: TR_HY, D: TR_D, H: TR_H, F: TR_F, PERTO: TR_PERTO };
let trCam = TR_CAM;

function trRot(x, z, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [x * c - z * s, x * s + z * c];   // [lado, profundidade (+ = mais perto da câmera)]
}
// planta -> tela, com perspectiva: [x, y, profundidade (+ = perto), escala naquele ponto]
function trProj(x, y, z, ang) {
    const r = trRot(x, z, ang);
    const esc = trCam.F / Math.max(trCam.PERTO, trCam.D - r[1]);
    return [trCam.CX + r[0] * esc, trCam.HY + (trCam.H - y) * esc, r[1], esc];
}
function trPoly(pts) {
    trG.beginPath();
    pts.forEach((p, i) => i ? trG.lineTo(p[0], p[1]) : trG.moveTo(p[0], p[1]));
    trG.closePath();
}

// Laje do piso (retângulo da planta com altura h): lados visíveis, tampo e o rejunte dos azulejos.
function trDrawSlab(sl, ang) {
    const cantos = [[sl.x0, sl.z0], [sl.x1, sl.z0], [sl.x1, sl.z1], [sl.x0, sl.z1]];
    const topo = cantos.map(c => trProj(c[0], sl.h, c[1], ang));
    const base = cantos.map(c => trProj(c[0], 0, c[1], ang));
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        // lado virado para a câmera: a normal da aresta (para fora) aponta para a frente depois de girar
        const mx = (cantos[i][0] + cantos[j][0]) / 2, mz = (cantos[i][1] + cantos[j][1]) / 2;
        const cx = (sl.x0 + sl.x1) / 2, cz = (sl.z0 + sl.z1) / 2;
        const n = trRot(mx - cx, mz - cz, ang);
        if (n[1] <= 0) continue;
        trG.fillStyle = "#a9c2cc";
        trPoly([topo[i], topo[j], base[j], base[i]]);
        trG.fill();
    }
    trG.fillStyle = "#dceaf0";
    trPoly(topo);
    trG.fill();
    trG.strokeStyle = "rgba(120, 150, 165, 0.35)";
    trG.lineWidth = 1;
    trG.beginPath();
    const passo = 22;
    for (let x = Math.ceil(sl.x0 / passo) * passo; x < sl.x1; x += passo) {
        const p0 = trProj(x, sl.h, sl.z0, ang), p1 = trProj(x, sl.h, sl.z1, ang);
        trG.moveTo(p0[0], p0[1]); trG.lineTo(p1[0], p1[1]);
    }
    for (let z = Math.ceil(sl.z0 / passo) * passo; z < sl.z1; z += passo) {
        const p0 = trProj(sl.x0, sl.h, z, ang), p1 = trProj(sl.x1, sl.h, z, ang);
        trG.moveTo(p0[0], p0[1]); trG.lineTo(p1[0], p1[1]);
    }
    trG.stroke();
    trG.strokeStyle = "#8fadb9";
    trPoly(topo);
    trG.stroke();
}

// Ala de telhado rosa: caixa branca com a janela comprida na frente e o telhado arredondado.
function trDrawWing(wx, ang) {
    const hx = 38, hz = 30, y0 = 9, y1 = 46, yr = 53;
    const cantos = [[wx - hx, -hz], [wx + hx, -hz], [wx + hx, hz], [wx - hx, hz]];
    const P = (c, y) => trProj(c[0], y, c[1], ang);
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const mx = (cantos[i][0] + cantos[j][0]) / 2 - wx, mz = (cantos[i][1] + cantos[j][1]) / 2;
        const n = trRot(mx, mz, ang);
        if (n[1] <= 0) continue;
        const luz = 0.93 + 0.07 * (n[0] / Math.hypot(n[0], n[1]));   // paredes brancas, um lado um pouco mais claro
        trG.fillStyle = `rgb(${Math.round(250 * luz)}, ${Math.round(251 * luz)}, ${Math.round(253 * luz)})`;
        trPoly([P(cantos[i], y1), P(cantos[j], y1), P(cantos[j], y0), P(cantos[i], y0)]);
        trG.fill();
        trG.strokeStyle = "#9aa7b4"; trG.lineWidth = 1; trG.stroke();
        // telhado: faixa rosa mais escura dos lados
        trG.fillStyle = "#d9799f";
        trPoly([P(cantos[i], yr), P(cantos[j], yr), P(cantos[j], y1), P(cantos[i], y1)]);
        trG.fill();
        // janela comprida só nas paredes da frente e de trás (as compridas)
        if (Math.abs(mz) > 1) {
            const A = cantos[i], B = cantos[j];
            const L = (u, y) => trProj(A[0] + (B[0] - A[0]) * u, y, A[1] + (B[1] - A[1]) * u, ang);
            trG.fillStyle = "#2f3b4c";
            trPoly([L(0.22, 33), L(0.78, 33), L(0.78, 25), L(0.22, 25)]);
            trG.fill();
            trG.strokeStyle = "#ffffff"; trG.lineWidth = 1.5; trG.stroke();
        }
    }
    trG.fillStyle = "#f4a9c9";
    trPoly(cantos.map(c => P(c, yr)));
    trG.fill();
    trG.strokeStyle = "#c86890"; trG.lineWidth = 1; trG.stroke();
}

// Ampulheta gigante (igual de todos os lados): base e tampa douradas, vidro e a areia verde escorrendo.
function trDrawHourglass(px, py, fase, k) {
    const w = 17 * k, meio = py - 50 * k, topoVidro = py - 92 * k, baseVidro = py - 10 * k;
    // base dourada
    trG.fillStyle = "#d4a52a";
    trG.beginPath(); trG.ellipse(px, py - 5 * k, w * 1.25, 5 * k, 0, 0, Math.PI * 2); trG.fill();
    trG.fillRect(px - w * 1.25, py - 11 * k, w * 2.5, 6 * k);
    trG.fillStyle = "#f2cf5b";
    trG.beginPath(); trG.ellipse(px, py - 11 * k, w * 1.25, 5 * k, 0, 0, Math.PI * 2); trG.fill();
    // forma do vidro (dois bulbos e a cintura fina)
    const vidro = () => {
        trG.beginPath();
        trG.moveTo(px - w, topoVidro);
        trG.bezierCurveTo(px - w * 1.15, meio - 18 * k, px - 3 * k, meio - 6 * k, px - 2.5 * k, meio);
        trG.bezierCurveTo(px - 3 * k, meio + 6 * k, px - w * 1.15, meio + 18 * k, px - w, baseVidro);
        trG.lineTo(px + w, baseVidro);
        trG.bezierCurveTo(px + w * 1.15, meio + 18 * k, px + 3 * k, meio + 6 * k, px + 2.5 * k, meio);
        trG.bezierCurveTo(px + 3 * k, meio - 6 * k, px + w * 1.15, meio - 18 * k, px + w, topoVidro);
        trG.closePath();
    };
    trG.save();
    vidro();
    trG.fillStyle = "rgba(225, 240, 245, 0.85)";
    trG.fill();
    trG.clip();
    // areia: em cima esvazia, embaixo enche (a fase vai de 0 a 1 e recomeça)
    const cima = (1 - fase) * 34 * k, baixo = fase * 34 * k;
    trG.fillStyle = "#4fb85a";
    trG.fillRect(px - w * 1.3, meio - 4 * k - cima, w * 2.6, cima);
    trG.fillStyle = "#3e9f4b";
    trG.beginPath();
    trG.moveTo(px - w * 1.3, baseVidro);
    trG.lineTo(px - w * 1.3, baseVidro - baixo * 0.75);
    trG.quadraticCurveTo(px, baseVidro - baixo * 1.25, px + w * 1.3, baseVidro - baixo * 0.75);
    trG.lineTo(px + w * 1.3, baseVidro);
    trG.closePath();
    trG.fill();
    if (fase < 0.97) { trG.fillStyle = "#4fb85a"; trG.fillRect(px - 1, meio - 3 * k, 2, (baseVidro - meio) - baixo * 0.9); }
    // brilho do vidro
    trG.fillStyle = "rgba(255, 255, 255, 0.55)";
    trG.fillRect(px - w * 0.75, topoVidro + 6 * k, 3 * k, 22 * k);
    trG.fillRect(px - w * 0.75, meio + 10 * k, 3 * k, 18 * k);
    trG.restore();
    vidro();
    trG.strokeStyle = "rgba(120, 150, 165, 0.8)"; trG.lineWidth = 1.2; trG.stroke();
    // tampa: cúpula dourada com ponta
    trG.fillStyle = "#d4a52a";
    trG.fillRect(px - w * 1.2, topoVidro - 5 * k, w * 2.4, 6 * k);
    const tampa = trG.createLinearGradient(px - w, 0, px + w, 0);
    tampa.addColorStop(0, "#f7d76b"); tampa.addColorStop(0.5, "#e8b83a"); tampa.addColorStop(1, "#b88a1c");
    trG.fillStyle = tampa;
    trG.beginPath(); trG.ellipse(px, topoVidro - 5 * k, w * 1.15, 20 * k, 0, Math.PI, 0); trG.fill();
    trG.fillStyle = "#c99a26";
    trG.beginPath(); trG.moveTo(px - 2.5 * k, topoVidro - 24 * k); trG.lineTo(px, topoVidro - 36 * k); trG.lineTo(px + 2.5 * k, topoVidro - 24 * k); trG.fill();
}

// Poste com globo verde-água.
function trDrawLamp(px, py, k) {
    trG.fillStyle = "#c99a26";
    trG.beginPath(); trG.ellipse(px, py - 2 * k, 7 * k, 2.5 * k, 0, 0, Math.PI * 2); trG.fill();
    trG.fillRect(px - 1.5 * k, py - 60 * k, 3 * k, 58 * k);
    trG.fillRect(px - 4 * k, py - 62 * k, 8 * k, 3 * k);
    const globo = trG.createRadialGradient(px - 3 * k, py - 73 * k, 1, px, py - 70 * k, 10 * k);
    globo.addColorStop(0, "#ffffff"); globo.addColorStop(0.5, "#c8f2e4"); globo.addColorStop(1, "#7fcfb8");
    trG.fillStyle = globo;
    trG.beginPath(); trG.arc(px, py - 70 * k, 10 * k, 0, Math.PI * 2); trG.fill();
    trG.strokeStyle = "#7bb3a3"; trG.lineWidth = 1; trG.stroke();
}

// Pavilhão central: colunas em volta, cortinas e mesinha dentro, cúpula dourada com gomos e o relógio na frente.
function trDrawGazebo(ang) {
    const k = TR_K, R = 50, yPiso = 9, yTopo = 72;
    const centro = trProj(0, yPiso, 0, ang), centroTopo = trProj(0, yTopo, 0, ang);
    const rx = R * k, ry = R * TR_TILT * k;
    const colunas = [];
    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + Math.PI / 8;
        const p = trProj(Math.sin(a) * R, yPiso, Math.cos(a) * R, ang);
        colunas.push(p);
    }
    const desenhaColuna = (p) => {
        const alto = (yTopo - yPiso) * k;
        trG.fillStyle = "#f4f6f8";
        trG.fillRect(p[0] - 3 * k, p[1] - alto, 6 * k, alto);
        trG.fillStyle = "#c9d3dc";
        trG.fillRect(p[0] + 1 * k, p[1] - alto, 2 * k, alto);
        trG.fillStyle = "#ffffff";
        trG.fillRect(p[0] - 4.5 * k, p[1] - alto, 9 * k, 3 * k);
        trG.fillRect(p[0] - 4.5 * k, p[1] - 3 * k, 9 * k, 3 * k);
    };
    // interior: parede do fundo com cortinas lilás e a mesinha
    trG.fillStyle = "#cfd7e6";
    trG.beginPath();
    trG.ellipse(centro[0], centro[1], rx, ry, 0, Math.PI, 0, true);
    trG.lineTo(centroTopo[0] + rx, centroTopo[1]);
    trG.ellipse(centroTopo[0], centroTopo[1], rx, ry, 0, 0, Math.PI, true);
    trG.closePath();
    trG.fill();
    trG.fillStyle = "rgba(150, 110, 190, 0.55)";
    for (let i = 0; i < 6; i++) {
        const a = ang * 0.0 + i * Math.PI / 3;   // cortinas penduradas em volta (giram com o pavilhão)
        const r = trRot(Math.sin(a) * R * 0.9, Math.cos(a) * R * 0.9, ang);
        if (r[1] > 0) continue;                 // só as do fundo aparecem por trás da mesa
        const x = TR_CX + r[0] * k, yTop = centroTopo[1] + r[1] * TR_TILT * k;
        trG.beginPath();
        trG.moveTo(x - 9 * k, yTop); trG.quadraticCurveTo(x, yTop + 30 * k, x - 4 * k, yTop + 55 * k);
        trG.lineTo(x + 4 * k, yTop + 55 * k); trG.quadraticCurveTo(x, yTop + 30 * k, x + 9 * k, yTop);
        trG.fill();
    }
    trG.fillStyle = "#8a5a33";
    trG.beginPath(); trG.ellipse(centro[0], centro[1] - 16 * k, 10 * k, 3 * k, 0, 0, Math.PI * 2); trG.fill();
    trG.fillRect(centro[0] - 1.5 * k, centro[1] - 16 * k, 3 * k, 15 * k);
    // colunas: as de trás, depois as da frente
    const ordem = colunas.map((p, i) => i).sort((a, b) => colunas[a][2] - colunas[b][2]);
    ordem.forEach(i => { if (colunas[i][2] < 0) desenhaColuna(colunas[i]); });
    // mureta baixa na frente, entre as colunas
    trG.fillStyle = "rgba(240, 244, 248, 0.92)";
    trG.beginPath();
    trG.ellipse(centro[0], centro[1] - 7 * k, rx, ry, 0, 0, Math.PI);
    trG.lineTo(centro[0] - rx, centro[1]);
    trG.ellipse(centro[0], centro[1], rx, ry, 0, Math.PI, 0, true);
    trG.closePath();
    trG.fill();
    ordem.forEach(i => { if (colunas[i][2] >= 0) desenhaColuna(colunas[i]); });
    // faixa branca sob a cúpula
    trG.fillStyle = "#f7f9fb";
    trG.beginPath();
    trG.ellipse(centroTopo[0], centroTopo[1] - 6 * k, rx + 4 * k, ry + 1, 0, Math.PI, 0);
    trG.lineTo(centroTopo[0] + rx + 4 * k, centroTopo[1]);
    trG.ellipse(centroTopo[0], centroTopo[1], rx + 4 * k, ry + 1, 0, 0, Math.PI);
    trG.closePath();
    trG.fill();
    trG.strokeStyle = "#b9c4ce"; trG.lineWidth = 1; trG.stroke();
    // cúpula dourada
    const yBase = centroTopo[1] - 6 * k, alturaDomo = 58 * k, rDomo = rx + 4 * k;
    const ouro = trG.createRadialGradient(centroTopo[0] - rDomo * 0.35, yBase - alturaDomo * 0.7, 4, centroTopo[0], yBase - alturaDomo * 0.4, rDomo * 1.1);
    ouro.addColorStop(0, "#fff1a8"); ouro.addColorStop(0.45, "#f0c53f"); ouro.addColorStop(1, "#b5841b");
    trG.fillStyle = ouro;
    trG.beginPath();
    trG.moveTo(centroTopo[0] - rDomo, yBase);
    trG.bezierCurveTo(centroTopo[0] - rDomo, yBase - alturaDomo * 0.9, centroTopo[0] - rDomo * 0.35, yBase - alturaDomo, centroTopo[0], yBase - alturaDomo);
    trG.bezierCurveTo(centroTopo[0] + rDomo * 0.35, yBase - alturaDomo, centroTopo[0] + rDomo, yBase - alturaDomo * 0.9, centroTopo[0] + rDomo, yBase);
    trG.ellipse(centroTopo[0], yBase, rDomo, ry + 1, 0, 0, Math.PI);
    trG.closePath();
    trG.fill();
    // gomos da cúpula (giram junto com a câmera)
    trG.strokeStyle = "rgba(150, 105, 20, 0.55)";
    trG.lineWidth = 1.2;
    for (let j = 0; j < 12; j++) {
        const a = j * Math.PI / 6;
        const r = trRot(Math.sin(a), Math.cos(a), ang);
        if (r[1] < 0.05) continue;
        const bx = centroTopo[0] + r[0] * rDomo, by = yBase + r[1] * (ry + 1);
        trG.beginPath();
        trG.moveTo(bx, by);
        trG.quadraticCurveTo(centroTopo[0] + r[0] * rDomo * 0.95, yBase - alturaDomo * 0.85, centroTopo[0], yBase - alturaDomo);
        trG.stroke();
    }
    // ponta com a bola dourada
    trG.fillStyle = "#e0b23a";
    trG.beginPath(); trG.arc(centroTopo[0], yBase - alturaDomo - 6 * k, 6 * k, 0, Math.PI * 2); trG.fill();
    trG.beginPath(); trG.moveTo(centroTopo[0] - 2 * k, yBase - alturaDomo - 11 * k); trG.lineTo(centroTopo[0], yBase - alturaDomo - 24 * k); trG.lineTo(centroTopo[0] + 2 * k, yBase - alturaDomo - 11 * k); trG.fill();
    // relógio na frente da cúpula (some quando a câmera está atrás e fica fino de lado)
    const rel = trRot(0, 1, ang);
    if (rel[1] > 0.08) {
        const cxr = centroTopo[0] + rel[0] * rDomo * 0.82, cyr = yBase - alturaDomo * 0.38;
        const larg = 15 * k * rel[1];
        trG.fillStyle = "#fbf6e8";
        trG.fillRect(cxr - larg, cyr - 13 * k, larg * 2, 26 * k);
        trG.strokeStyle = "#c99a26"; trG.lineWidth = 1.5; trG.strokeRect(cxr - larg, cyr - 13 * k, larg * 2, 26 * k);
        trG.fillStyle = "#ffffff";
        trG.beginPath(); trG.ellipse(cxr, cyr, 10 * k * rel[1], 10 * k, 0, 0, Math.PI * 2); trG.fill();
        trG.strokeStyle = "#8a6a20"; trG.lineWidth = 1.2; trG.stroke();
        trG.strokeStyle = "#333333"; trG.lineWidth = 1.4;
        trG.beginPath(); trG.moveTo(cxr, cyr); trG.lineTo(cxr, cyr - 7 * k); trG.moveTo(cxr, cyr); trG.lineTo(cxr + 4 * k * rel[1], cyr + 1 * k); trG.stroke();
    }
}

// Vazio branco e chão infinito com rejuntes, desenhados a cada quadro (barato: ~90 linhas retas). É o chão
// perto da câmera passando rápido que dá a sensação de que os lutadores estão andando em volta do pavilhão.
function drawTimeRoomFloor(ang) {
    const fundo = ctx.createLinearGradient(0, 0, 0, canvas.height);
    fundo.addColorStop(0, "#fdfbf6");
    fundo.addColorStop(0.5, "#f5f0e6");
    fundo.addColorStop(1, "#e8e1d3");
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const S = 90, L = 2000, perto = TR_D - TR_PERTO * 2;
    ctx.strokeStyle = "rgba(160, 148, 125, 0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const linha = (x0, z0, x1, z1) => {
        // corta a parte que ficaria atrás da câmera e projeta as duas pontas (reta continua reta)
        const r0 = trRot(x0, z0, ang), r1 = trRot(x1, z1, ang);
        let t0 = 0, t1 = 1;
        if (r0[1] > perto && r1[1] > perto) return;
        if (r0[1] > perto) t0 = (perto - r0[1]) / (r1[1] - r0[1]);
        if (r1[1] > perto) t1 = (perto - r0[1]) / (r1[1] - r0[1]);
        const pa = trProj(x0 + (x1 - x0) * t0, 0, z0 + (z1 - z0) * t0, ang);
        const pb = trProj(x0 + (x1 - x0) * t1, 0, z0 + (z1 - z0) * t1, ang);
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
    };
    for (let v = -L; v <= L; v += S) {
        linha(v, -L, v, L);
        linha(-L, v, L, v);
    }
    ctx.stroke();
    // névoa branca no horizonte: o chão some ao longe no vazio
    const nevoa = ctx.createLinearGradient(0, TR_HY, 0, TR_HY + 150);
    nevoa.addColorStop(0, "rgba(253, 251, 246, 1)");
    nevoa.addColorStop(1, "rgba(253, 251, 246, 0)");
    ctx.fillStyle = nevoa;
    ctx.fillRect(0, 0, canvas.width, TR_HY + 150);
}

// O pavilhão gira devagar (uma volta a cada ~2 min): ele é desenhado numa imagem guardada, com fundo
// transparente, e só refeito quando a câmera anda 1/4 de grau (a cada ~5 quadros); o chão é a cada quadro.
const TR_PASSOS_POR_VOLTA = 1440;
const trCena = { passo: null, canvas: null };
// Camada guardada (fundo transparente) de uma construção que a câmera rodeia: só é refeita quando o ângulo
// anda 1/4 de grau. Usada pela Sala do Tempo e pela Nave de Freeza.
function drawCachedOrbitLayer(cena, ang, desenhar) {
    const passo = Math.round(ang / (Math.PI * 2) * TR_PASSOS_POR_VOLTA) % TR_PASSOS_POR_VOLTA;
    if (!cena.canvas) {
        cena.canvas = document.createElement("canvas");
        cena.canvas.width = canvas.width;
        cena.canvas.height = canvas.height;
    }
    const g = cena.canvas.getContext && cena.canvas.getContext("2d");
    if (!g) { trG = ctx; desenhar(ang); return; }
    if (cena.passo !== passo) {
        g.clearRect(0, 0, cena.canvas.width, cena.canvas.height);
        trG = g;
        try { desenhar(passo / TR_PASSOS_POR_VOLTA * Math.PI * 2); } finally { trG = ctx; }
        cena.passo = passo;
    }
    ctx.drawImage(cena.canvas, 0, 0);
}
function drawTimeRoomStage(ang) {
    drawTimeRoomFloor(ang);
    drawCachedOrbitLayer(trCena, ang, drawTimeRoomScene);
}

// Só o pavilhão (fundo transparente). O vazio branco e o chão infinito são desenhados por drawTimeRoomFloor.
function drawTimeRoomScene(ang) {
    // piso em degraus (das lajes mais baixas para as mais altas)
    const lajes = [
        { x0: -132, x1: 132, z0: 88, z1: 124, h: 2 },
        { x0: -102, x1: 102, z0: 66, z1: 96, h: 4 },
        { x0: -78, x1: 78, z0: 50, z1: 74, h: 6 },
        { x0: -250, x1: 250, z0: -38, z1: 38, h: 7 },
        { x0: -95, x1: 95, z0: -58, z1: 58, h: 9 }
    ];
    // sombra de verdade: o contorno das lajes no chão, um pouco deslocado (luz vindo do alto, à esquerda)
    trG.fillStyle = "rgba(120, 110, 95, 0.16)";
    lajes.forEach(sl => {
        const chao = [[sl.x0, sl.z0], [sl.x1, sl.z0], [sl.x1, sl.z1], [sl.x0, sl.z1]].map(c => trProj(c[0] + 10, 0, c[1] + 8, ang));
        trPoly(chao);
        trG.fill();
    });
    lajes.forEach(sl => trDrawSlab(sl, ang));

    // objetos em pé, do mais longe para o mais perto da câmera
    const objetos = [
        { x: 0, z: 0, d: (a) => trDrawGazebo(a) },
        { x: -100, z: 0, d: (a) => trDrawWing(-100, a) },
        { x: 100, z: 0, d: (a) => trDrawWing(100, a) },
        { x: -178, z: 0, d: (a, p) => trDrawHourglass(p[0], p[1], (gameplayClock * 0.02) % 1, p[3]) },
        { x: 178, z: 0, d: (a, p) => trDrawHourglass(p[0], p[1], (gameplayClock * 0.02 + 0.5) % 1, p[3]) },
        { x: -228, z: 0, d: (a, p) => trDrawLamp(p[0], p[1], p[3]) },
        { x: 228, z: 0, d: (a, p) => trDrawLamp(p[0], p[1], p[3]) }
    ];
    objetos
        .map(o => ({ o, p: trProj(o.x, 7, o.z, ang) }))
        .sort((a, b) => a.p[2] - b.p[2])
        .forEach(({ o, p }) => o.d(ang, p));
}

// ==================== TORNEIO DE CELL: ARENA EM 3D, CÂMERA GIRANDO NO MEIO DELA ====================
// Os lutadores ficam no meio da arena e a câmera, na altura deles, dá a volta em torno do centro: o piso de
// azulejos passa por baixo, os 4 pilares brancos dos cantos passam pela frente e por trás e a paisagem
// (montanhas, morros de pedra, céu) gira ao fundo. Planta: x para o lado, z para a frente, y para cima.
const CA_CX = 400, CA_HY = 118, CA_D = 330, CA_H = 80, CA_F = 400, CA_PERTO = 30;
const CA_W = 240;            // meia largura do piso da arena
const CA_CHAO = -26;         // altura do gramado (a arena é um tablado acima dele)

function caRot(x, z, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [x * c - z * s, x * s + z * c];
}
function caProj(x, y, z, ang) {
    const r = caRot(x, z, ang);
    const esc = CA_F / Math.max(CA_PERTO, CA_D - r[1]);
    return [CA_CX + r[0] * esc, CA_HY + (CA_H - y) * esc, r[1], esc];
}
// Polígono no chão/tampo (pontos [x, y, z]) cortado no plano perto da câmera e projetado.
function caPoly(pts, ang) {
    const lim = CA_D - CA_PERTO;
    const rot = pts.map(p => { const r = caRot(p[0], p[2], ang); return [r[0], p[1], r[1]]; });
    const out = [];
    for (let i = 0; i < rot.length; i++) {
        const A = rot[i], B = rot[(i + 1) % rot.length];
        const aIn = A[2] <= lim, bIn = B[2] <= lim;
        if (aIn) out.push(A);
        if (aIn !== bIn) {
            const t = (lim - A[2]) / (B[2] - A[2]);
            out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, lim]);
        }
    }
    if (out.length < 3) return false;
    ctx.beginPath();
    out.forEach((p, i) => {
        const esc = CA_F / Math.max(CA_PERTO, CA_D - p[2]);
        const x = CA_CX + p[0] * esc, y = CA_HY + (CA_H - p[1]) * esc;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    return true;
}
// Linha reta no chão cortada no plano perto da câmera.
function caLine(x0, y0, z0, x1, y1, z1, ang) {
    const lim = CA_D - CA_PERTO;
    const r0 = caRot(x0, z0, ang), r1 = caRot(x1, z1, ang);
    if (r0[1] > lim && r1[1] > lim) return;
    let t0 = 0, t1 = 1;
    if (r0[1] > lim) t0 = (lim - r0[1]) / (r1[1] - r0[1]);
    if (r1[1] > lim) t1 = (lim - r0[1]) / (r1[1] - r0[1]);
    const pa = caProj(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, z0 + (z1 - z0) * t0, ang);
    const pb = caProj(x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, z0 + (z1 - z0) * t1, ang);
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
}

// Paisagem distante (céu, nuvens, montanhas, morros de pedra) desenhada uma vez numa faixa de 360°; a cada
// quadro só é copiada deslocada conforme o ângulo da câmera (barato e liso).
const CA_PANO_W = Math.round(Math.PI * 2 * CA_F);
let caPanorama = null;
function getCellArenaPanorama() {
    if (caPanorama) return caPanorama;
    const c = document.createElement("canvas");
    c.width = CA_PANO_W;
    c.height = CA_HY + 40;
    const g = c.getContext && c.getContext("2d");
    if (!g) return null;
    const W = c.width, base = CA_HY + 6;
    // altura de uma serra que dá a volta certinho (soma de senos com períodos inteiros)
    const serra = (u, amp, fases) => fases.reduce((h, f) => h + Math.sin(u / W * Math.PI * 2 * f[0] + f[1]) * f[2], 0) * amp;
    // céu
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, "#3d8fe0"); ceu.addColorStop(0.65, "#8cc8f2"); ceu.addColorStop(1, "#d6eefb");
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, c.height);
    // nuvens
    g.fillStyle = "rgba(255, 255, 255, 0.92)";
    for (let i = 0; i < 14; i++) {
        const x = (i * 197.3 + (i % 3) * 61) % W, y = 18 + (i * 37) % 52, r = 12 + (i * 7) % 14;
        [[0, 0, 1], [r * 1.1, -r * 0.35, 1.2], [r * 2.3, 0, 0.95], [r * 1.2, r * 0.2, 1]].forEach(b => {
            // desenha também uma volta antes e depois: a nuvem na emenda da faixa não fica cortada
            [-W, 0, W].forEach(dx => { g.beginPath(); g.arc(x + b[0] + dx, y + b[1], r * b[2], 0, Math.PI * 2); g.fill(); });
        });
    }
    // serra azulada bem longe
    g.fillStyle = "#8fb3c9";
    g.beginPath(); g.moveTo(0, base);
    for (let u = 0; u <= W; u += 8) g.lineTo(u, base - 22 - serra(u, 1, [[5, 0.3, 9], [11, 1.1, 6], [23, 2, 3]]));
    g.lineTo(W, base); g.closePath(); g.fill();
    // morros verdes mais perto
    g.fillStyle = "#4f9a52";
    g.beginPath(); g.moveTo(0, base);
    for (let u = 0; u <= W; u += 6) g.lineTo(u, base - 8 - Math.max(0, serra(u, 1, [[7, 1.4, 10], [13, 0.2, 6], [29, 2.2, 3]])));
    g.lineTo(W, base); g.closePath(); g.fill();
    // morros de pedra marrons de topo reto (como os da arena do anime), em alguns pontos da volta
    [[0.08, 120, 46], [0.31, 90, 34], [0.47, 150, 52], [0.72, 110, 40], [0.9, 70, 28]].forEach(([pos, larg, alt]) => {
        const x = pos * W;
        const desenha = (dx) => {
            const x0 = x + dx;
            g.fillStyle = "#b07a45";
            g.beginPath();
            g.moveTo(x0 - larg / 2, base);
            g.lineTo(x0 - larg / 2 + 10, base - alt);
            g.lineTo(x0 + larg / 2 - 14, base - alt - 4);
            g.lineTo(x0 + larg / 2, base);
            g.closePath(); g.fill();
            g.fillStyle = "#8c5a2e";   // faixas das camadas de rocha
            for (let k = 1; k <= 3; k++) g.fillRect(x0 - larg / 2 + 8, base - alt * k / 4, larg - 18, 2);
            g.fillStyle = "#5e9b4c";   // grama no topo
            g.fillRect(x0 - larg / 2 + 10, base - alt - 6, larg - 24, 6);
        };
        desenha(0);
        if (x + larg / 2 > W) desenha(-W);
        if (x - larg / 2 < 0) desenha(W);
    });
    caPanorama = c;
    return c;
}

// Pilar branco pontudo de canto (igual de todos os lados).
function caDrawPillar(px, py, esc) {
    const alto = 210 * esc, larg = 9 * esc;
    const topoY = py - alto;
    // base quadrada
    ctx.fillStyle = "#e8edf2";
    ctx.fillRect(px - larg * 1.6, py - 10 * esc, larg * 3.2, 10 * esc);
    ctx.fillStyle = "#b9c5cf";
    ctx.fillRect(px + larg * 0.4, py - 10 * esc, larg * 1.2, 10 * esc);
    // corpo afinando até a ponta
    ctx.fillStyle = "#f4f7fa";
    ctx.beginPath();
    ctx.moveTo(px - larg, py - 10 * esc);
    ctx.lineTo(px - larg * 0.55, topoY + alto * 0.25);
    ctx.lineTo(px, topoY);
    ctx.lineTo(px + larg * 0.55, topoY + alto * 0.25);
    ctx.lineTo(px + larg, py - 10 * esc);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c3ced8";   // lado na sombra
    ctx.beginPath();
    ctx.moveTo(px + larg * 0.15, py - 10 * esc);
    ctx.lineTo(px + larg * 0.1, topoY + alto * 0.25);
    ctx.lineTo(px, topoY);
    ctx.lineTo(px + larg * 0.55, topoY + alto * 0.25);
    ctx.lineTo(px + larg, py - 10 * esc);
    ctx.closePath();
    ctx.fill();
    // anéis
    ctx.fillStyle = "#d5dde5";
    ctx.fillRect(px - larg * 1.05, py - 22 * esc, larg * 2.1, 4 * esc);
    ctx.fillRect(px - larg * 0.62, topoY + alto * 0.27, larg * 1.24, 3 * esc);
}

function drawCellArenaStage(ang) {
    // paisagem ao fundo: posição na faixa de 360° conforme o ângulo da câmera
    const pano = getCellArenaPanorama();
    const phi0 = ang + Math.PI;                       // direção que está no meio da tela
    if (pano) {
        let u0 = (-phi0 * CA_F) % CA_PANO_W;
        if (u0 < 0) u0 += CA_PANO_W;
        const x0 = CA_CX - u0;
        ctx.drawImage(pano, x0, 0);
        ctx.drawImage(pano, x0 + CA_PANO_W, 0);
        if (x0 > 0) ctx.drawImage(pano, x0 - CA_PANO_W, 0);
    } else {
        ctx.fillStyle = "#8cc8f2";
        ctx.fillRect(0, 0, canvas.width, CA_HY + 6);
    }
    // gramado até o horizonte (mais claro e enevoado lá longe)
    const grama = ctx.createLinearGradient(0, CA_HY, 0, canvas.height);
    grama.addColorStop(0, "#8fc56d"); grama.addColorStop(0.25, "#6fb04f"); grama.addColorStop(1, "#4f8f37");
    ctx.fillStyle = grama;
    ctx.fillRect(0, CA_HY + 5, canvas.width, canvas.height - CA_HY);

    // manchas de terra e a estrada de terra saindo da arena
    ctx.fillStyle = "#c9a46a";
    [[-520, -380, 120, 70], [610, 260, 140, 80], [-300, 720, 160, 90], [480, -760, 200, 110], [-900, 100, 180, 100]].forEach(([x, z, rx, rz]) => {
        const pts = [];
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; pts.push([x + Math.cos(a) * rx, CA_CHAO, z + Math.sin(a) * rz]); }
        if (caPoly(pts, ang)) ctx.fill();
    });
    const estrada = [[0, -CA_W - 30], [-60, -520], [140, -900], [-80, -1400], [60, -2200]];
    ctx.fillStyle = "#d4b07a";
    for (let i = 0; i < estrada.length - 1; i++) {
        const [ax, az] = estrada[i], [bx, bz] = estrada[i + 1];
        const len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len * 26, nz = (bx - ax) / len * 26;
        if (caPoly([[ax + nx, CA_CHAO, az + nz], [bx + nx, CA_CHAO, bz + nz], [bx - nx, CA_CHAO, bz - nz], [ax - nx, CA_CHAO, az - nz]], ang)) ctx.fill();
    }

    // tablado: degrau (borda mais larga e baixa) e o piso de azulejos
    const W = CA_W, B = CA_W + 22;
    const ladoVisivel = (mx, mz) => caRot(mx, mz, ang)[1] > 0;
    const faces = (w, yTop, yBase, cor) => {
        const cantos = [[-w, -w], [w, -w], [w, w], [-w, w]];
        for (let i = 0; i < 4; i++) {
            const A = cantos[i], C = cantos[(i + 1) % 4];
            if (!ladoVisivel((A[0] + C[0]) / 2, (A[1] + C[1]) / 2)) continue;
            ctx.fillStyle = cor;
            if (caPoly([[A[0], yTop, A[1]], [C[0], yTop, C[1]], [C[0], yBase, C[1]], [A[0], yBase, A[1]]], ang)) ctx.fill();
        }
    };
    faces(B, -12, CA_CHAO, "#9aa6ae");
    ctx.fillStyle = "#cfd8de";
    if (caPoly([[-B, -12, -B], [B, -12, -B], [B, -12, B], [-B, -12, B]], ang)) ctx.fill();
    faces(W, 0, -12, "#aeb9c1");
    ctx.fillStyle = "#e3eaee";
    if (caPoly([[-W, 0, -W], [W, 0, -W], [W, 0, W], [-W, 0, W]], ang)) ctx.fill();
    // rejunte dos azulejos
    ctx.strokeStyle = "rgba(120, 140, 155, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let v = -W; v <= W; v += 30) {
        caLine(v, 0, -W, v, 0, W, ang);
        caLine(-W, 0, v, W, 0, v, ang);
    }
    ctx.stroke();

    // pilares dos cantos, do mais longe para o mais perto
    [[-W + 6, -W + 6], [W - 6, -W + 6], [W - 6, W - 6], [-W + 6, W - 6]]
        .map(([x, z]) => caProj(x, 0, z, ang))
        .filter(p => CA_D - p[2] > CA_PERTO * 2)
        .sort((a, b) => a[2] - b[2])
        .forEach(p => caDrawPillar(p[0], p[1], p[3]));
}

// ==================== NAVE DE FREEZA: NAVE POUSADA EM NAMEK, CÂMERA DÁ A VOLTA ====================
// Como na Sala do Tempo: a nave fica parada no meio e os lutadores dão a volta nela. O chão de Namek (azul-
// esverdeado, com lagos, pedras e tufos) passa perto da câmera; o céu verde e os morros de pedra giram ao fundo.
// A nave: casco branco embaixo, faixa preta com escotilhas azuis, cúpula branca com a faixa listrada cor de
// madeira, escotilha escura no topo, a janela roxa curvada, os calombos amarelos do casco e as patas de aço.
const NV_CAM = { CX: 400, HY: 138, D: 620, H: 112, F: 620, PERTO: 30 };
const nvCena = { passo: null, canvas: null };

// elipse de uma "latitude" da nave (círculo de raio r na altura y), já em perspectiva
function nvAnel(y, r, ang) {
    const c = trProj(0, y, 0, ang), fr = trProj(0, y, r, 0), tr = trProj(0, y, -r, 0);
    return { cx: c[0], cy: c[1], rx: r * c[3], ry: Math.max(1, (fr[1] - tr[1]) / 2) };
}
// faixa entre duas latitudes (só a metade da frente aparece)
function nvFaixa(a1, a2, cor) {
    trG.fillStyle = cor;
    trG.beginPath();
    trG.ellipse(a1.cx, a1.cy, a1.rx, a1.ry, 0, Math.PI, 0, true);
    trG.lineTo(a2.cx + a2.rx, a2.cy);
    trG.ellipse(a2.cx, a2.cy, a2.rx, a2.ry, 0, 0, Math.PI, false);
    trG.closePath();
    trG.fill();
}

// Perna de aço em forma de pata de aranha (como na nave do anime): um braço largo e firme sai de baixo do
// casco, entre os calombos amarelos, e vai para fora; na junta a pata desce reta e afina até uma ponta
// cravada no chão; uma haste fina faz o reforço em triângulo entre o casco e a pata.
function nvDrawLeg(a, ang, frente) {
    const ox = Math.sin(a), oz = Math.cos(a);
    const P = (r, y) => trProj(ox * r, y, oz * r, ang);
    const quadril = P(104, 18), joelho = P(162, 26), ponta = P(210, 0), reforcoBase = P(98, 8), reforcoPata = P(190, 11);
    const k = joelho[3];
    const claro = frente ? "#f3f6f8" : "#c9d0d7", meio = frente ? "#bcc5cf" : "#98a1ab", escuro = frente ? "#56606c" : "#414852";
    trG.lineCap = "round"; trG.lineJoin = "round";
    // haste de reforço (fina, por trás)
    trG.strokeStyle = escuro; trG.lineWidth = Math.max(1, 2.6 * k);
    trG.beginPath(); trG.moveTo(reforcoBase[0], reforcoBase[1]); trG.lineTo(reforcoPata[0], reforcoPata[1]); trG.stroke();
    trG.strokeStyle = meio; trG.lineWidth = Math.max(0.8, 1.3 * k); trG.stroke();
    // pata: desce inclinada da junta, afinando até a ponta cravada no chão
    const lp = 6.5 * k;
    const dx = ponta[0] - joelho[0], dy = ponta[1] - joelho[1], dl = Math.hypot(dx, dy) || 1;
    const nx = -dy / dl, ny = dx / dl;
    trG.fillStyle = meio;
    trG.beginPath();
    trG.moveTo(joelho[0] + nx * lp, joelho[1] + ny * lp); trG.lineTo(ponta[0], ponta[1]); trG.lineTo(joelho[0] - nx * lp, joelho[1] - ny * lp);
    trG.closePath(); trG.fill();
    trG.fillStyle = claro;
    trG.beginPath();
    trG.moveTo(joelho[0] - nx * lp, joelho[1] - ny * lp); trG.lineTo(ponta[0], ponta[1]); trG.lineTo(joelho[0], joelho[1]);
    trG.closePath(); trG.fill();
    trG.strokeStyle = escuro; trG.lineWidth = 1;
    trG.beginPath();
    trG.moveTo(joelho[0] + nx * lp, joelho[1] + ny * lp); trG.lineTo(ponta[0], ponta[1]); trG.lineTo(joelho[0] - nx * lp, joelho[1] - ny * lp);
    trG.stroke();
    // braço: curto e grosso, do casco até a junta
    trG.strokeStyle = escuro; trG.lineWidth = 13 * k;
    trG.beginPath(); trG.moveTo(quadril[0], quadril[1]); trG.lineTo(joelho[0], joelho[1]); trG.stroke();
    trG.strokeStyle = meio; trG.lineWidth = 10 * k; trG.stroke();
    trG.strokeStyle = claro; trG.lineWidth = 4.5 * k;
    trG.beginPath(); trG.moveTo(quadril[0], quadril[1] - 2.5 * k); trG.lineTo(joelho[0], joelho[1] - 2.5 * k); trG.stroke();
    // junta redonda
    trG.fillStyle = escuro;
    trG.beginPath(); trG.arc(joelho[0], joelho[1], 7.5 * k, 0, Math.PI * 2); trG.fill();
    trG.fillStyle = claro;
    trG.beginPath(); trG.arc(joelho[0], joelho[1], 5.5 * k, 0, Math.PI * 2); trG.fill();
    trG.fillStyle = meio;
    trG.beginPath(); trG.arc(joelho[0] + 1 * k, joelho[1] + 1 * k, 2.5 * k, 0, Math.PI * 2); trG.fill();
}

// Calombo amarelo do casco: não é peça solta, é um relevo arredondado da parte de baixo do casco (abaixo da
// faixa preta), que acompanha a curva da nave. Montado sobre a superfície do casco e projetado.
function nvRaioCascoBaixo(y) { return 100 + (y - 14) / 46 * 58; }   // casco de baixo afunila: y 14 -> 60
function nvDrawPod(a, ang) {
    const normal = trRot(Math.sin(a), Math.cos(a), ang)[1];
    if (normal < 0.02) return;                               // virado para longe: escondido pelo casco
    const meiaLarg = 0.19, yc = 37, meiaAlt = 21;
    const pts = [];
    for (let i = 0; i < 28; i++) {
        const t = i / 28 * Math.PI * 2;
        // retângulo de cantos bem arredondados (superelipse)
        const u = Math.sign(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), 0.6);
        const v = Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), 0.6);
        const y = yc + v * meiaAlt, th = a + u * meiaLarg;
        const r = nvRaioCascoBaixo(Math.min(60, y)) + 3 + 9 * (1 - u * u) * (1 - v * v);   // estufado no meio
        pts.push(trProj(Math.sin(th) * r, y, Math.cos(th) * r, ang));
    }
    const centro = trProj(Math.sin(a) * (nvRaioCascoBaixo(yc) + 12), yc, Math.cos(a) * (nvRaioCascoBaixo(yc) + 12), ang);
    const luz = trProj(Math.sin(a - meiaLarg * 0.35) * (nvRaioCascoBaixo(yc + 5) + 12), yc + 6, Math.cos(a - meiaLarg * 0.35) * (nvRaioCascoBaixo(yc + 5) + 12), ang);
    const k = centro[3];
    const g = trG.createRadialGradient(luz[0], luz[1], 1, centro[0], centro[1], 26 * k);
    g.addColorStop(0, "#fff8c4"); g.addColorStop(0.45, "#f6d63c"); g.addColorStop(1, "#c99a12");
    trG.fillStyle = g;
    trG.beginPath(); pts.forEach((q, i) => i ? trG.lineTo(q[0], q[1]) : trG.moveTo(q[0], q[1])); trG.closePath(); trG.fill();
    trG.strokeStyle = "rgba(140, 105, 10, 0.7)"; trG.lineWidth = 1; trG.stroke();
}

// Janela da cabine: vidro roxo curvado sobre a cúpula (acompanha a curva dela), com um pequeno suporte
// claro em volta do vidro. Fica colado na nave em qualquer ângulo.
const NV_CABINE = { a: -0.55, meiaLarg: 0.17, yc: 116, meiaAlt: 14, borda: 3.5 };
function nvRaioCupula(y) { const t = Math.min(1, Math.max(0, (y - 82) / 70)); return 158 * Math.sqrt(1 - t * t); }
function nvDrawCockpit(ang) {
    const c = NV_CABINE;
    const normal = trRot(Math.sin(c.a), Math.cos(c.a), ang)[1];
    if (normal < 0.02) return;
    const contorno = (extra, inchar) => {
        const pts = [];
        for (let i = 0; i < 32; i++) {
            const t = i / 32 * Math.PI * 2, u = Math.cos(t), v = Math.sin(t);
            const y = c.yc + v * (c.meiaAlt + extra), th = c.a + u * (c.meiaLarg + extra / 140);
            const r = nvRaioCupula(y) + 1 + inchar * (1 - u * u) * (1 - v * v);
            pts.push(trProj(Math.sin(th) * r, y, Math.cos(th) * r, ang));
        }
        return pts;
    };
    const desenha = (pts) => { trG.beginPath(); pts.forEach((q, i) => i ? trG.lineTo(q[0], q[1]) : trG.moveTo(q[0], q[1])); trG.closePath(); };
    // suporte em volta do vidro
    desenha(contorno(c.borda, 1));
    trG.fillStyle = "#e9edf1"; trG.fill();
    trG.strokeStyle = "#8d96a1"; trG.lineWidth = 1; trG.stroke();
    // vidro roxo curvado
    const vidro = contorno(0, 4);
    const centro = trProj(Math.sin(c.a) * (nvRaioCupula(c.yc) + 5), c.yc, Math.cos(c.a) * (nvRaioCupula(c.yc) + 5), ang);
    const k = centro[3];
    const brilhoP = trProj(Math.sin(c.a - c.meiaLarg * 0.4) * (nvRaioCupula(c.yc + 6) + 5), c.yc + 6, Math.cos(c.a - c.meiaLarg * 0.4) * (nvRaioCupula(c.yc + 6) + 5), ang);
    const g = trG.createRadialGradient(brilhoP[0], brilhoP[1], 1, centro[0], centro[1], 26 * k);
    g.addColorStop(0, "#efd9ff"); g.addColorStop(0.35, "#a970d8"); g.addColorStop(0.8, "#5e2a90"); g.addColorStop(1, "#3c1663");
    desenha(vidro);
    trG.fillStyle = g; trG.fill();
    trG.strokeStyle = "#4a2470"; trG.lineWidth = 1; trG.stroke();
    // reflexo curvo do vidro (preso dentro dele)
    trG.save();
    desenha(vidro); trG.clip();
    trG.strokeStyle = "rgba(255, 255, 255, 0.75)"; trG.lineWidth = Math.max(1.5, 3 * k); trG.lineCap = "round";
    trG.beginPath();
    trG.arc(centro[0] + 4 * k, centro[1] + 3 * k, 13 * k, Math.PI * 1.05, Math.PI * 1.45);
    trG.stroke();
    trG.restore();
}

function drawFreezaShipScene(ang) {
    // sombra da nave no chão
    const sombra = [];
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; sombra.push(trProj(Math.sin(a) * 175 + 12, 0, Math.cos(a) * 175 + 10, ang)); }
    trG.fillStyle = "rgba(20, 60, 80, 0.28)";
    trPoly(sombra);
    trG.fill();

    // pernas de trás (ficam atrás do casco); 10 pernas entre os 10 calombos amarelos
    const pernas = [], calombos = [];
    for (let i = 0; i < 10; i++) { calombos.push(i * Math.PI / 5); pernas.push(i * Math.PI / 5 + Math.PI / 10); }
    const naFrente = (a) => trRot(Math.sin(a), Math.cos(a), ang)[1] > 0;
    const porProfundidade = (lista) => lista.slice().sort((a, b) => trRot(Math.sin(a), Math.cos(a), ang)[1] - trRot(Math.sin(b), Math.cos(b), ang)[1]);
    porProfundidade(pernas).forEach(a => { if (!naFrente(a)) nvDrawLeg(a, ang, false); });

    // casco de baixo (branco acinzentado, afunilando para baixo)
    const a30 = nvAnel(14, 100, ang), a60 = nvAnel(60, 158, ang), a82 = nvAnel(82, 162, ang);
    trG.fillStyle = "#c9d1da";
    trG.beginPath(); trG.ellipse(a60.cx, a60.cy, a60.rx, a60.ry, 0, 0, Math.PI * 2); trG.fill();
    nvFaixa(a30, a60, "#e6ebf0");
    trG.fillStyle = "#d5dce3";
    trG.beginPath(); trG.ellipse(a30.cx, a30.cy, a30.rx, a30.ry, 0, 0, Math.PI * 2); trG.fill();
    // faixa preta com as escotilhas azuis
    nvFaixa(a60, a82, "#1c1c2a");
    trG.fillStyle = "#26263a";
    trG.beginPath(); trG.ellipse(a82.cx, a82.cy, a82.rx, a82.ry, 0, 0, Math.PI * 2); trG.fill();
    for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2;
        const r = trRot(Math.sin(a), Math.cos(a), ang);
        if (r[1] < 0.15) continue;
        const p = trProj(Math.sin(a) * 162, 71, Math.cos(a) * 162, ang), k = p[3];
        trG.fillStyle = "#7fb2e6";
        trG.beginPath(); trG.ellipse(p[0], p[1], 6 * k * r[1], 6 * k, 0, 0, Math.PI * 2); trG.fill();
        trG.fillStyle = "#d6ecff";
        trG.beginPath(); trG.ellipse(p[0] - 1.5 * k * r[1], p[1] - 2 * k, 2 * k * r[1], 2 * k, 0, 0, Math.PI * 2); trG.fill();
    }

    // calombos amarelos: relevo do próprio casco de baixo, encostados embaixo da faixa preta
    porProfundidade(calombos).forEach(a => nvDrawPod(a, ang));

    // cúpula branca com a faixa cor de madeira listrada
    const d0 = nvAnel(82, 158, ang), d1 = nvAnel(100, 150, ang), d2 = nvAnel(124, 124, ang), dTopo = nvAnel(146, 70, ang);
    const alturaDomo = (a82.cy - dTopo.cy) + dTopo.ry * 0.6;
    const branco = trG.createLinearGradient(d0.cx - d0.rx, 0, d0.cx + d0.rx, 0);
    branco.addColorStop(0, "#c7ced6"); branco.addColorStop(0.35, "#f7f9fb"); branco.addColorStop(1, "#b9c1ca");
    trG.fillStyle = branco;
    trG.beginPath();
    trG.moveTo(d0.cx - d0.rx, d0.cy);
    trG.bezierCurveTo(d0.cx - d0.rx, d0.cy - alturaDomo * 0.7, d0.cx - d0.rx * 0.45, d0.cy - alturaDomo, d0.cx, d0.cy - alturaDomo);
    trG.bezierCurveTo(d0.cx + d0.rx * 0.45, d0.cy - alturaDomo, d0.cx + d0.rx, d0.cy - alturaDomo * 0.7, d0.cx + d0.rx, d0.cy);
    trG.ellipse(d0.cx, d0.cy, d0.rx, d0.ry, 0, 0, Math.PI);
    trG.closePath();
    trG.fill();
    nvFaixa(d1, d2, "#c98a52");
    // listras da faixa (giram com a câmera)
    trG.strokeStyle = "rgba(120, 70, 30, 0.6)";
    trG.lineWidth = 1;
    trG.beginPath();
    for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2;
        const r = trRot(Math.sin(a), Math.cos(a), ang);
        if (r[1] < 0.05) continue;
        const p1 = trProj(Math.sin(a) * 150, 100, Math.cos(a) * 150, ang), p2 = trProj(Math.sin(a) * 124, 124, Math.cos(a) * 124, ang);
        trG.moveTo(p1[0], p1[1]); trG.lineTo(p2[0], p2[1]);
    }
    trG.stroke();
    // escotilha escura no topo
    trG.fillStyle = "#eef1f4";
    trG.beginPath(); trG.ellipse(dTopo.cx, d0.cy - alturaDomo * 0.93, dTopo.rx * 0.78, Math.max(3, dTopo.ry * 0.8), 0, 0, Math.PI * 2); trG.fill();
    trG.strokeStyle = "#a9b2bc"; trG.lineWidth = 1.5; trG.stroke();
    trG.fillStyle = "#2c3038";
    trG.beginPath(); trG.ellipse(dTopo.cx, d0.cy - alturaDomo * 0.93, dTopo.rx * 0.55, Math.max(2, dTopo.ry * 0.55), 0, 0, Math.PI * 2); trG.fill();

    // cabine: vidro roxo curvado na cúpula, com o suporte em volta
    nvDrawCockpit(ang);

    // pernas da frente (saem de baixo do casco, entre os calombos)
    porProfundidade(pernas).forEach(a => { if (naFrente(a)) nvDrawLeg(a, ang, true); });
}

// Paisagem de Namek ao fundo (360°): céu verde-amarelado, mar azul no horizonte, morros de pedra altos de
// topo reto e as árvores de bolinha. Desenhada uma vez numa faixa e só deslocada a cada quadro.
const NV_PANO_W = Math.round(Math.PI * 2 * NV_CAM.F);
let nvPanorama = null;
function getFreezaShipPanorama() {
    if (nvPanorama) return nvPanorama;
    const c = document.createElement("canvas");
    c.width = NV_PANO_W;
    c.height = NV_CAM.HY + 8;
    const g = c.getContext && c.getContext("2d");
    if (!g) return null;
    const W = c.width, base = NV_CAM.HY + 4;
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, "#7ccf5a"); ceu.addColorStop(0.6, "#c4e87a"); ceu.addColorStop(1, "#e9f6b4");
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, c.height);
    // nuvens claras
    g.fillStyle = "rgba(245, 255, 220, 0.75)";
    for (let i = 0; i < 12; i++) {
        const x = (i * 331.7) % W, y = 20 + (i * 29) % 46, r = 10 + (i * 5) % 12;
        [-W, 0, W].forEach(dx => { g.beginPath(); g.ellipse(x + dx, y, r * 3, r, 0, 0, Math.PI * 2); g.fill(); });
    }
    // mar azul no horizonte
    g.fillStyle = "#4fb3c9";
    g.fillRect(0, base - 8, W, 12);
    // morros de pedra de Namek (altos, de topo reto e arredondado), com faixas de camadas
    const morros = [[0.05, 60, 70], [0.14, 40, 46], [0.27, 80, 88], [0.4, 50, 58], [0.55, 90, 76], [0.66, 44, 52], [0.8, 70, 96], [0.92, 54, 60]];
    morros.forEach(([pos, larg, alt]) => {
        const x = pos * W;
        [-W, 0, W].forEach(dx => {
            const x0 = x + dx;
            if (x0 + larg < 0 || x0 - larg > W) return;
            g.fillStyle = "#e3c3b0";
            g.beginPath();
            g.moveTo(x0 - larg / 2, base);
            g.lineTo(x0 - larg / 2 + 6, base - alt + 10);
            g.quadraticCurveTo(x0, base - alt - 6, x0 + larg / 2 - 6, base - alt + 10);
            g.lineTo(x0 + larg / 2, base);
            g.closePath(); g.fill();
            g.fillStyle = "#c79f8a";
            g.fillRect(x0 + larg * 0.12, base - alt + 10, larg * 0.38 - 6, alt - 10);
            g.fillStyle = "rgba(150, 110, 95, 0.5)";
            for (let k = 1; k <= 3; k++) g.fillRect(x0 - larg / 2 + 6, base - alt * k / 4, larg - 12, 2);
            g.fillStyle = "#5cbf6a";
            g.beginPath(); g.ellipse(x0, base - alt + 4, larg / 2 - 6, 5, 0, Math.PI, 0); g.fill();
        });
    });
    // árvores de Namek (tronco fino com bolinha em cima)
    for (let i = 0; i < 16; i++) {
        const x = (i * 241.3 + 90) % W, h = 18 + (i * 7) % 14;
        [-W, 0, W].forEach(dx => {
            const x0 = x + dx;
            g.strokeStyle = "#7b8b4a"; g.lineWidth = 2;
            g.beginPath(); g.moveTo(x0, base); g.lineTo(x0, base - h); g.stroke();
            g.fillStyle = "#3f9b4f";
            g.beginPath(); g.arc(x0, base - h - 5, 6, 0, Math.PI * 2); g.fill();
        });
    }
    nvPanorama = c;
    return c;
}

// Detalhes do chão de Namek (fixos no mundo): lagos, manchas de grama, pedras quebradas e tufos.
const NV_CHAO = (() => {
    const itens = [];
    let semente = 7;
    const rnd = () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; };
    for (let i = 0; i < 46; i++) {
        const a = rnd() * Math.PI * 2, r = 250 + rnd() * 1500;
        const tipo = i % 5 === 0 ? "lago" : i % 5 === 1 ? "grama" : i % 5 === 2 ? "tufo" : "pedra";
        itens.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, tipo, tam: 20 + rnd() * 50, giro: rnd() * Math.PI });
    }
    return itens;
})();

function drawFreezaShipGround(ang) {
    const pano = getFreezaShipPanorama();
    const phi0 = ang + Math.PI;
    if (pano) {
        let u0 = (-phi0 * NV_CAM.F) % NV_PANO_W;
        if (u0 < 0) u0 += NV_PANO_W;
        const x0 = NV_CAM.CX - u0;
        ctx.drawImage(pano, x0, 0);
        ctx.drawImage(pano, x0 + NV_PANO_W, 0);
        if (x0 > 0) ctx.drawImage(pano, x0 - NV_PANO_W, 0);
    } else {
        ctx.fillStyle = "#c4e87a";
        ctx.fillRect(0, 0, canvas.width, NV_CAM.HY);
    }
    // chão azul-esverdeado de Namek, mais claro lá longe
    const chao = ctx.createLinearGradient(0, NV_CAM.HY, 0, canvas.height);
    chao.addColorStop(0, "#9fd8d0"); chao.addColorStop(0.3, "#68bccb"); chao.addColorStop(1, "#3f93b0");
    ctx.fillStyle = chao;
    ctx.fillRect(0, NV_CAM.HY + 3, canvas.width, canvas.height - NV_CAM.HY);
    // detalhes do chão, do mais longe para o mais perto (é o que passa rápido perto dos lutadores)
    const lim = NV_CAM.D - NV_CAM.PERTO * 2;
    NV_CHAO
        .map(it => ({ it, r: trRot(it.x, it.z, ang) }))
        .filter(o => o.r[1] < lim)
        .sort((a, b) => a.r[1] - b.r[1])
        .forEach(({ it }) => {
            const p = trProj(it.x, 0, it.z, ang), k = p[3], t = it.tam;
            if (p[1] < NV_CAM.HY) return;
            if (it.tipo === "lago") {
                ctx.fillStyle = "#8fe3f2";
                ctx.beginPath(); ctx.ellipse(p[0], p[1], t * 1.6 * k, t * 0.35 * k, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                ctx.beginPath(); ctx.ellipse(p[0] - t * 0.4 * k, p[1] - t * 0.06 * k, t * 0.5 * k, t * 0.06 * k, 0, 0, Math.PI * 2); ctx.fill();
            } else if (it.tipo === "grama") {
                ctx.fillStyle = "rgba(60, 150, 120, 0.55)";
                ctx.beginPath(); ctx.ellipse(p[0], p[1], t * 2 * k, t * 0.4 * k, 0, 0, Math.PI * 2); ctx.fill();
            } else if (it.tipo === "tufo") {
                ctx.strokeStyle = "#2f8a6a"; ctx.lineWidth = Math.max(1, 1.5 * k);
                ctx.beginPath();
                for (let j = -2; j <= 2; j++) { ctx.moveTo(p[0] + j * 3 * k, p[1]); ctx.lineTo(p[0] + j * 5 * k, p[1] - 10 * k); }
                ctx.stroke();
            } else {
                // pedra quebrada (lascas cor-de-rosa acinzentadas)
                const h = t * 0.5 * k, w = t * 0.6 * k;
                ctx.fillStyle = "#d9b8ad";
                ctx.beginPath();
                ctx.moveTo(p[0] - w, p[1]); ctx.lineTo(p[0] - w * 0.5, p[1] - h); ctx.lineTo(p[0] + w * 0.3, p[1] - h * 0.8); ctx.lineTo(p[0] + w, p[1]);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = "#b08e85";
                ctx.beginPath();
                ctx.moveTo(p[0] + w * 0.3, p[1] - h * 0.8); ctx.lineTo(p[0] + w, p[1]); ctx.lineTo(p[0] + w * 0.1, p[1]);
                ctx.closePath(); ctx.fill();
            }
        });
}

function drawFreezaShipStage(ang) {
    trCam = NV_CAM;
    try {
        drawFreezaShipGround(ang);
        drawCachedOrbitLayer(nvCena, ang, drawFreezaShipScene);
    } finally {
        trCam = TR_CAM;
    }
}

// ==================== DESENHO DAS ARENAS DBZ POLIDAS HD ====================
function drawStageBackground() {
    ctx.save();
    let scroll = world.stageScrollX;

    if (selectedStage === "terra") {
        drawTerraArenaStage(getStageLapAngle(scroll, TERRA_ARENA_LAP_SCROLL));
    }
    else if (selectedStage === "namek") {
        drawNamekStage(getForwardTravel(scroll));
    }
    else if (selectedStage === "kaio") {
        drawKaioPlanetStage(getStageLapAngle(scroll, KAIO_PLANET_LAP_SCROLL));
    }
    else if (selectedStage === "time_room") {
        drawTimeRoomStage(getTimeRoomOrbitAngle(scroll));
    } 
    else if (selectedStage === "freeza_ship") {
        drawFreezaShipStage(getFreezaShipOrbitAngle(scroll));
    }
    else if (selectedStage === "kaioshin") {
        drawKaioshinStage(getStageLapAngle(scroll, KAIOSHIN_LAP_SCROLL));
    }
    else if (selectedStage === "namek_explosao") {
        drawNamekExplodingStage(getForwardTravel(scroll));
    }
    else if (selectedStage === "cell_games") {
        drawCellArenaStage(getCellArenaOrbitAngle(scroll));
    }

    ctx.restore();
}

// ==================== RENDERIZAÇÃO DE ENTIDADES & ITENS ====================
function drawPlayerEntity(p, charData, isBoss = false) {
    ctx.save();

    let renderX = p.x;
    let renderY = p.y + Math.sin(p.hoverTime) * 3;

    if (p.invulnerableTimer % 4 >= 2) {
        ctx.globalAlpha = 0.4;
    }

    if (p.shield && !isBoss) {
        const auraType = charData && charData.aura ? charData.aura : "gelo";
        const auraPalette = AURA_COLORS[auraType] || AURA_COLORS.gelo;
        const auraColor = auraPalette[0] || "#62eaff";
        // sempre um pouco maior que a aura de ki (que cresce ao carregar/transformar: o escudo cresce junto)
        const forma = p.auraForma;
        const bubbleRadius = forma ? Math.max(forma.rx, forma.ry) + 8 : Math.max(p.w, p.h) * 0.78;
        const bubbleX = forma ? p.x + forma.offX : renderX + p.w / 2;
        const bubbleY = forma ? p.y + forma.offY : renderY + p.h / 2;

        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = auraColor;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubbleRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = auraColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = auraColor;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubbleRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubbleRadius - 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    const fallbackKey = isBoss ? selectedBoss : selectedCharacter;
    const animationState = p.actionState || "idle";
    const animationFrame = getCharacterAnimationFrame(fallbackKey, animationState, p.animTimer, getTransformLevel(p));

    const actionShift = {
        idle: { dx: 0, dy: 0 },
        flyRight: { dx: Math.sin(p.animTimer * 2) * 4, dy: 0 },
        flyLeft: { dx: -Math.sin(p.animTimer * 2) * 4, dy: 0 },
        flyUp: { dx: 0, dy: -Math.sin(p.animTimer * 2) * 4 },
        flyDown: { dx: 0, dy: Math.sin(p.animTimer * 2) * 4 },
        flyUpRight: { dx: Math.sin(p.animTimer * 2) * 3, dy: -Math.sin(p.animTimer * 2) * 3 },
        flyUpLeft: { dx: -Math.sin(p.animTimer * 2) * 3, dy: -Math.sin(p.animTimer * 2) * 3 },
        flyDownRight: { dx: Math.sin(p.animTimer * 2) * 3, dy: Math.sin(p.animTimer * 2) * 3 },
        flyDownLeft: { dx: -Math.sin(p.animTimer * 2) * 3, dy: Math.sin(p.animTimer * 2) * 3 },
        parry: { dx: 0, dy: 0 },
        attackKi: { dx: Math.sin(p.animTimer * 3) * 6, dy: 0 },
        chargeKi: { dx: 0, dy: Math.sin(p.animTimer * 4) * 2 },
        transform: { dx: 0, dy: -Math.sin(p.animTimer * 2) * 5 },
        hit: { dx: 0, dy: 0 }
    };
    const shift = actionShift[animationState] || actionShift.idle;
    const actionScale = ACTION_SPRITE_SCALE[animationState] || 1;
    const drawW = p.w * actionScale;
    const drawH = p.h * actionScale;
    const drawX = renderX + (p.w - drawW) / 2 + shift.dx;
    const drawY = renderY + (p.h - drawH) / 2 + shift.dy;
    // Personagem em pixel art (estilo anime): desenhado maior que a caixa de colisão, com os pés no mesmo lugar —
    // no tamanho da caixa o rosto e os detalhes não cabem. A área que leva/acerta golpes continua a mesma.
    // pixel art: as fichas de desenho do jogo já vêm marcadas; outros SVGs são conferidos uma vez por quadro
    const isPixel = !!(animationFrame && (animationFrame.__pixelSvg || (animationFrame.__svgImage && String(animationFrame.__svgImage.src).includes("crispEdges"))));
    let artW = drawW, artH = drawH, artX = drawX, artY = drawY;
    if (isPixel) {
        const feetY = drawY + drawH * (103 / 112);
        artW = drawW * PIXEL_SPRITE_SCALE;
        artH = drawH * PIXEL_SPRITE_SCALE;
        artX = drawX + (drawW - artW) / 2;
        artY = feetY - artH * (103 / 112);
    }
    drawKiAura(p, charData, artX + artW / 2, artY + artH * (103 / 112), artW, artH * 0.9);
    // pixel art feita na resolução REAL da tela (renderScale): bem mais nítida em telas grandes e na TV
    const pixelArt = isDrawableSource(animationFrame) ? getPixelArtSource(animationFrame, artW * renderScale, artH * renderScale) : null;
    // Último desenho deste personagem: se o quadro novo ainda não ficou pronto (1ª vez daquele movimento/tamanho),
    // repete o último em vez de sumir ou trocar de estilo por um instante (era a "piscada" ao se mover).
    const last = p.lastSpriteDraw && p.lastSpriteDraw.key === fallbackKey ? p.lastSpriteDraw : null;
    const pixelPending = isPixel && !pixelArt;
    if (pixelArt) {
        // pixel art no tamanho exato: 1 pixel do desenho = 1 pixel real da tela (sem esticar = nítido)
        const k = renderScale, ax = Math.round(artX * k) / k, ay = Math.round(artY * k) / k;
        ctx.drawImage(pixelArt.img, ax - pixelArt.pad / k, ay - pixelArt.pad / k, pixelArt.img.width / k, pixelArt.img.height / k);
        p.lastSpriteDraw = { key: fallbackKey, img: pixelArt.img, pad: pixelArt.pad / k, k, w: artW, h: artH };
    } else if (last && (pixelPending || !isDrawableSource(animationFrame))) {
        if (last.pad) {
            const sx = artW / last.w, sy = artH / last.h, smooth = ctx.imageSmoothingEnabled;
            ctx.imageSmoothingEnabled = false;
            const lk = last.k || 1;
            ctx.drawImage(last.img, artX - last.pad * sx, artY - last.pad * sy, last.img.width / lk * sx, last.img.height / lk * sy);
            ctx.imageSmoothingEnabled = smooth;
        } else {
            ctx.drawImage(last.img, artX, artY, artW, artH);
        }
    } else if (animationFrame && animationFrame.__pixelSvg) {
        // pixel art ainda sendo montada e nada desenhado antes: espera (é só no primeiro instante)
    } else if (isDrawableSource(animationFrame)) {
        ctx.drawImage(animationFrame, artX, artY, artW, artH);
        if (!isPixel) p.lastSpriteDraw = { key: fallbackKey, img: animationFrame, pad: 0, w: artW, h: artH };
    } else if (charData && charData.imageObj && charData.imageObj.complete && charData.imageObj.naturalWidth !== 0) {
        let img = getCutoutSource(charData.imageObj, charData.bgRemoval);
        let imgW = img.naturalWidth || img.width;
        let imgH = img.naturalHeight || img.height;
        let fw = charData.frameWidth || imgW;
        let fh = charData.frameHeight || imgH;
        let totalF = charData.totalFrames || 1;

        let currentFrame = Math.floor(p.animTimer) % totalF;
        let sx = currentFrame * fw;

        ctx.drawImage(img, sx, 0, fw, fh, drawX, drawY, drawW, drawH);
    } else {
        ctx.fillStyle = isBoss ? "#ff0055" : "#00ffff";
        ctx.fillRect(renderX, renderY, p.w, p.h);
    }

    ctx.restore();
}

// ==================== AURA DE KI (labareda em volta do corpo) ====================
// Como no anime: uma labareda única envolvendo o corpo, com borda forte, meio e núcleo claro, e pontas que
// nascem nas laterais e sobem o tempo todo. Normal: aura em volta do corpo. Carregando ki: aumenta. Transformado:
// fica no tamanho de "carregando" até a transformação acabar (aura dourada).
const KI_AURA_PALETTES = {
    gelo: ["#5ec8ff", "#c8f0ff", "#ffffff"],
    amarelo: ["#ff8a00", "#ffd23f", "#fff8c8"],
    vermelho: ["#c21a1a", "#ff6a3d", "#ffd6be"],
    rosa: ["#d63c96", "#ff9ad6", "#ffe8f6"],
    azul: ["#1c5fe0", "#5cb8ff", "#e2f4ff"],
    verde: ["#1d9a2a", "#6cff6a", "#e8ffe2"],
    preto: ["#141418", "#3e3e4c", "#8c8c9c"],
    vermelho_azul: ["#c21a1a", "#5cb8ff", "#ffffff"],
    azul_escuro: ["#0b1f8a", "#2f6cff", "#c4d8ff"],
    roxo: ["#6a1fb0", "#b878ff", "#f2e4ff"]
};

// Silhueta da labareda: lados que sobem do pé até uma ponta no alto, com "dentes" (pontas) que correm para cima.
// `phase` (0..1) é a posição no ciclo da animação — tudo se repete a cada ciclo, então os quadros podem ser guardados.
function traceKiAuraFlame(g, cx, bottomY, w, h, phase, seed) {
    const STEPS = 28, SPIKES = 7, TAU = Math.PI * 2;
    const side = (dir) => {
        const pts = [];
        for (let i = 0; i <= STEPS; i++) {
            const f = i / STEPS;                                            // 0 = pé, 1 = topo
            // estreita nos pés, mais larga na altura dos ombros/cabeça e afinando em ponta no alto (como no anime)
            let half = w * (0.3 + 0.7 * Math.sin(Math.PI * Math.pow(f, 0.85))) * (1 - f * 0.25);
            let spike = 0;
            for (let j = 0; j < SPIKES; j++) {
                const pos = (j / SPIKES + phase + (dir > 0 ? 0.5 / SPIKES : 0) + seed) % 1;
                const d = f - pos;                                           // ponta: sobe devagar, desce rápido (puxada para cima)
                const shape = d < 0 ? Math.max(0, 1 + d / 0.11) : Math.max(0, 1 - d / 0.035);
                const len = (0.55 + 0.45 * Math.sin(j * 7.3 + seed * 11)) * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, pos * 1.1)));
                spike = Math.max(spike, shape * len);
            }
            half += w * 0.34 * spike * (1 - f * 0.3);
            const lean = (dir > 0 ? 1 : -1) * half;
            pts.push([cx + lean + Math.sin(TAU * (phase * 2) + f * 9 + seed * 5) * w * 0.03 * f, bottomY - f * h - spike * h * 0.05]);
        }
        return pts;
    };
    const left = side(-1), right = side(1);
    g.beginPath();
    g.moveTo(cx, bottomY + h * 0.04);
    left.forEach(([x, y]) => g.lineTo(x, y));
    g.lineTo(cx + Math.sin(TAU * phase + seed) * w * 0.08, bottomY - h * (1.06 + 0.04 * Math.sin(TAU * phase * 3 + seed)));   // ponta do alto
    for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
    g.closePath();
}

// Quadros da aura guardados (por cor, tamanho e quadro da animação): desenhar 3 labaredas grandes a cada quadro
// pesava no celular. Tamanho arredondado em degraus para reaproveitar enquanto a aura cresce/diminui.
const KI_AURA_FRAMES = 24;
// Cada quadro é desenhado uma vez num tamanho fixo e esticado na hora para o tamanho da aura (que cresce ao
// carregar e muda com o movimento) — guardar um quadro por tamanho criava centenas de imagens e pausas.
const KI_AURA_BASE_W = 56, KI_AURA_BASE_H = 112;
let kiAuraCache = new Map();
function getKiAuraFrame(pal, frame, seed) {
    const w = KI_AURA_BASE_W, h = KI_AURA_BASE_H;
    const key = pal[0] + pal[1] + "|" + frame + "|" + seed;
    let c = kiAuraCache.get(key);
    if (c) return c;
    if (kiAuraCache.size > 600) kiAuraCache = new Map();
    c = document.createElement("canvas");
    c.width = Math.ceil(w * 2.4);
    c.height = Math.ceil(h * 1.3);
    const g = c.getContext("2d");
    if (g) {
        const cx = c.width / 2, bottomY = c.height - h * 0.08, phase = frame / KI_AURA_FRAMES;
        // camadas: borda forte por fora, meio, núcleo claro perto do corpo
        g.fillStyle = pal[0]; traceKiAuraFlame(g, cx, bottomY, w, h, phase, seed); g.fill();
        g.globalAlpha = 0.95;
        g.fillStyle = pal[1]; traceKiAuraFlame(g, cx, bottomY, w * 0.78, h * 0.86, (phase * 2) % 1, seed + 0.21); g.fill();
        g.fillStyle = pal[2]; traceKiAuraFlame(g, cx, bottomY, w * 0.5, h * 0.66, (phase * 3) % 1, seed + 0.47); g.fill();
    }
    c.bottomOffset = h * 0.08;
    kiAuraCache.set(key, c);
    return c;
}

function drawKiAura(entity, charData, cx, bottomY, bodyW, bodyH) {
    // aura grande e dourada só enquanto durar o poder extra da transformação; depois volta ao normal
    // (o cabelo continua amarelo até o fim da luta). Jogador 2 marca a transformação em isTransformed.
    const nivel = getTransformLevel(entity);
    const transformed = nivel > 0 && entity.transformPowerTimer > 0;
    const target = (entity.isCharging || transformed) ? 1 : 0;
    entity.kiAuraLevel = (entity.kiAuraLevel || 0) + (target - (entity.kiAuraLevel || 0)) * Math.min(1, deltaTime * 6);
    const k = entity.kiAuraLevel;
    const charKey = entity === player2 ? selectedBoss : selectedCharacter;
    const auraType = transformed ? getTransformationAura(charKey, nivel) : (charData && charData.aura) || "gelo";
    const pal = KI_AURA_PALETTES[auraType] || KI_AURA_PALETTES.gelo;
    const grow = 1 + 0.4 * k;
    const w = bodyW * 0.5 * grow, h = bodyH * (1.18 + 0.12 * k);
    const seed = entity === player2 ? 0.37 : 0;
    // a energia sobe mais rápido quando carregando/transformado
    entity.kiAuraPhase = ((entity.kiAuraPhase || 0) + deltaTime * (0.55 + 0.35 * k)) % 1;
    const img = getKiAuraFrame(pal, Math.floor(entity.kiAuraPhase * KI_AURA_FRAMES) % KI_AURA_FRAMES, seed);
    if (!img || !img.width) return;
    ctx.save();
    ctx.globalAlpha *= 0.62 + 0.25 * k;
    const sx = w / KI_AURA_BASE_W, sy = h / KI_AURA_BASE_H, dw = img.width * sx, dh = img.height * sy;
    ctx.drawImage(img, Math.round(cx - dw / 2), Math.round(bottomY + img.bottomOffset * sy - dh), Math.round(dw), Math.round(dh));
    ctx.restore();
    // forma visível da aura (relativa à caixa do lutador): o escudo da cápsula e o alcance do parry ficam em volta dela
    entity.auraForma = { offX: cx - entity.x, offY: bottomY - h * 0.52 - entity.y, rx: w * 0.95, ry: h * 0.58 };
    if (nivel > 0) drawKiLightning(entity, cx, bottomY, w, h, transformed);
}

// Raios de ki em volta de quem está transformado (como no anime): traços em zigue-zague que piscam. Com o poder
// extra ativo são mais frequentes; depois ficam raros (o personagem continua transformado até o fim da luta).
function drawKiLightning(entity, cx, bottomY, w, h, forte) {
    const t = Math.floor(gameplayClock * 14);
    const seed = entity === player2 ? 7 : 1;
    const rnd = (n) => { const x = Math.sin((t * 31 + n * 17 + seed * 101) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const raios = forte ? 3 : 1;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let b = 0; b < raios; b++) {
        if (rnd(b * 5) > (forte ? 0.7 : 0.3)) continue;
        let x = cx + (rnd(b * 5 + 1) - 0.5) * w * 1.1, y = bottomY - h * (0.15 + rnd(b * 5 + 2) * 0.7);
        const dir = rnd(b * 5 + 3) < 0.5 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let i = 0; i < 5; i++) {
            x += dir * (2 + rnd(b * 7 + i + 40) * 5);
            y += (rnd(b * 11 + i + 80) - 0.5) * 10;
            ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#9fe8ff";
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.strokeStyle = "#bff4ff";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.stroke();
    }
    ctx.restore();
}

// ==================== SAIBAMAN (VISUAL DO ANIME) ====================
// Cabeça grande e bulbosa com sulcos, olhos vermelhos enormes, corpo magro e curvado e garras. Cada pose é
// desenhada uma vez numa imagem guardada (2x, para ficar nítida) e só copiada a cada quadro.
const SAIBAMAN_SPRITE_SCALE = 3, SAIBAMAN_SPRITE_PAD = 8;
const MINION_DRAW_SCALE = 1.3;   // desenhados um pouco maiores que a caixa de colisão (os pés no mesmo lugar)
const saibamanSpriteCache = new Map();

// Minions desenhados de frente (como nas referências), num espaço de 64x80 reduzido para a caixa de 32x40.
// Contorno escuro, sombra de um tom e brilho em cima (cel-shading). Poses: voar (padrão), saltar e agarrar.
function minionLimb(g, pts, larg, cor, contorno, aneis) {
    g.lineCap = "round"; g.lineJoin = "round";
    const traco = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => g.lineTo(p[0], p[1])); };
    g.strokeStyle = contorno; g.lineWidth = larg + 2.4; traco(); g.stroke();
    g.strokeStyle = cor; g.lineWidth = larg; traco(); g.stroke();
    if (!aneis) return;
    // anéis/escamas atravessando o membro
    g.strokeStyle = aneis; g.lineWidth = 0.9;
    for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0) || 1;
        const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
        for (let t = 0.2; t < 1; t += 0.22) {
            const cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t;
            g.beginPath(); g.moveTo(cx - nx * larg * 0.45, cy - ny * larg * 0.45); g.quadraticCurveTo(cx + (x1 - x0) / len, cy + (y1 - y0) / len, cx + nx * larg * 0.45, cy + ny * larg * 0.45); g.stroke();
        }
    }
}
function minionClaws(g, x, y, dir, tam) {
    // três garras brancas curvas
    g.fillStyle = "#eef3f8"; g.strokeStyle = "#3a4656"; g.lineWidth = 0.7;
    for (let k = -1; k <= 1; k++) {
        const a = dir + k * 0.45;
        g.beginPath();
        g.moveTo(x + Math.cos(a + 1.3) * tam * 0.35, y + Math.sin(a + 1.3) * tam * 0.35);
        g.quadraticCurveTo(x + Math.cos(a) * tam * 1.1, y + Math.sin(a) * tam * 1.1 - 1, x + Math.cos(a) * tam * 1.25, y + Math.sin(a) * tam * 1.25);
        g.lineTo(x + Math.cos(a - 1.3) * tam * 0.35, y + Math.sin(a - 1.3) * tam * 0.35);
        g.closePath(); g.fill(); g.stroke();
    }
}
function minionPose(pose, frame) {
    const sway = pose === "voar" ? Math.sin(frame / 4 * Math.PI * 2) : 0;
    if (pose === "saltar") return { sway, bracos: [[[20, 33], [14, 24], [12, 14]], [[44, 33], [50, 24], [52, 14]]], maos: [[12, 13, -Math.PI / 2], [52, 13, -Math.PI / 2]], pernas: [[[28, 50], [26, 62], [25, 74]], [[36, 50], [38, 62], [39, 74]]] };
    if (pose === "agarrar") return { sway, bracos: [[[20, 33], [9, 38], [4, 44]], [[44, 33], [55, 38], [60, 44]]], maos: [[4, 45, Math.PI * 0.75], [60, 45, Math.PI * 0.25]], pernas: [[[28, 50], [19, 60], [17, 73]], [[36, 50], [45, 60], [47, 73]]] };
    return { sway, bracos: [[[20, 33], [12, 42 + sway], [14, 53 + sway]], [[44, 33], [52, 42 - sway], [50, 53 - sway]]], maos: [[14, 54 + sway, Math.PI / 2], [50, 54 - sway, Math.PI / 2]],
        pernas: [[[28, 50], [19, 59 + sway], [17, 72]], [[36, 50], [45, 59 - sway], [47, 72]]] };
}

function traceSaibamanFigure(g, pose, frame) {
    g.save(); g.scale(0.5, 0.5);
    const pele = "#6fc046", sombra = "#3f8a28", claro = "#a9e46f", linha = "#14320b", aneis = "rgba(20, 60, 12, 0.55)";
    const P = minionPose(pose, frame);
    // pernas agachadas com anéis e pés de garras
    P.pernas.forEach((pts, i) => {
        minionLimb(g, pts, 7.5, pele, linha, aneis);
        const [fx, fy] = pts[pts.length - 1];
        g.fillStyle = sombra; g.strokeStyle = linha; g.lineWidth = 1.1;
        g.beginPath(); g.ellipse(fx, fy + 1, 5.5, 3, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        minionClaws(g, fx + (i ? 2 : -2), fy + 3, i ? 0.3 : Math.PI - 0.3, 5);
    });
    // tronco: peitoral liso em placas e barriga segmentada
    g.fillStyle = pele; g.strokeStyle = linha; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(19, 31); g.quadraticCurveTo(32, 27, 45, 31); g.lineTo(42, 44); g.quadraticCurveTo(32, 53, 22, 44); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = sombra;
    g.beginPath(); g.moveTo(22, 44); g.quadraticCurveTo(32, 53, 42, 44); g.lineTo(40, 41); g.quadraticCurveTo(32, 48, 24, 41); g.closePath(); g.fill();
    g.strokeStyle = linha; g.lineWidth = 1;
    g.beginPath(); g.moveTo(32, 31); g.lineTo(32, 49); g.stroke();
    g.beginPath(); g.moveTo(21, 38); g.quadraticCurveTo(26.5, 41, 31.5, 38); g.moveTo(32.5, 38); g.quadraticCurveTo(37.5, 41, 43, 38); g.stroke();
    g.beginPath(); g.moveTo(25, 45); g.lineTo(39, 45); g.stroke();
    g.fillStyle = "rgba(255, 255, 255, 0.35)";
    g.beginPath(); g.ellipse(26, 34, 3.5, 1.6, -0.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(38, 34, 3.5, 1.6, 0.3, 0, Math.PI * 2); g.fill();
    // braços com anéis e mãos de garras
    P.bracos.forEach((pts, i) => {
        minionLimb(g, pts, 6.5, pele, linha, aneis);
        const [hx, hy, dir] = P.maos[i];
        g.fillStyle = sombra; g.beginPath(); g.arc(pts[2][0], pts[2][1], 3.4, 0, Math.PI * 2); g.fill();
        minionClaws(g, hx, hy, dir, 5);
    });
    // orelhas pontudas
    g.fillStyle = pele; g.strokeStyle = linha; g.lineWidth = 1.1;
    [[1, 19], [-1, 45]].forEach(([d, x]) => { g.beginPath(); g.moveTo(x, 21); g.lineTo(x - d * 9, 15); g.lineTo(x + d * 1, 27); g.closePath(); g.fill(); g.stroke(); });
    // cabeça grande em forma de cérebro, com o sulco no meio e veios
    const cab = g.createRadialGradient(28, 8, 2, 32, 15, 18);
    cab.addColorStop(0, "#d4f59a"); cab.addColorStop(0.55, claro); cab.addColorStop(1, "#78c24c");
    g.fillStyle = cab; g.strokeStyle = linha; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(19, 24); g.bezierCurveTo(13, 12, 20, 0, 32, 0); g.bezierCurveTo(44, 0, 51, 12, 45, 24); g.quadraticCurveTo(39, 31, 32, 31); g.quadraticCurveTo(25, 31, 19, 24); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = "rgba(40, 90, 20, 0.85)"; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(32, 1); g.bezierCurveTo(31, 6, 33, 10, 32, 16); g.stroke();
    g.lineWidth = 0.7;
    [[22, 8, 27, 6, 28, 11], [21, 14, 25, 12, 27, 16], [42, 8, 37, 6, 36, 11], [43, 14, 39, 12, 37, 16], [25, 3, 28, 4, 29, 7], [39, 3, 36, 4, 35, 7]].forEach(v => {
        g.beginPath(); g.moveTo(v[0], v[1]); g.quadraticCurveTo(v[2], v[3] + 2, v[2] + (v[4] - v[2]) / 2, v[3]); g.quadraticCurveTo(v[4], v[5] - 2, v[4], v[5]); g.stroke();
    });
    // testa franzida, olhos vermelhos puxados e boca aberta
    g.fillStyle = "rgba(60, 120, 30, 0.45)";
    g.beginPath(); g.moveTo(22, 20); g.quadraticCurveTo(32, 16, 42, 20); g.lineTo(42, 22); g.quadraticCurveTo(32, 19, 22, 22); g.closePath(); g.fill();
    [[26.5, 23.5, 0.38], [37.5, 23.5, -0.38]].forEach(([x, y, r]) => {
        g.fillStyle = "#e0263a"; g.strokeStyle = "#3a0408"; g.lineWidth = 1;
        g.beginPath(); g.ellipse(x, y, 4.6, 2.1, r, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = "#ff9aa4"; g.beginPath(); g.ellipse(x - 1, y - 0.6, 1.4, 0.6, r, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = "#b5202f"; g.strokeStyle = linha; g.lineWidth = 1;
    g.beginPath(); g.moveTo(28.5, 27.3); g.quadraticCurveTo(32, 26.4, 35.5, 27.3); g.quadraticCurveTo(32, 31.5, 28.5, 27.3); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#ff7b88"; g.beginPath(); g.ellipse(32, 29, 1.8, 0.8, 0, 0, Math.PI * 2); g.fill();
    g.restore();
}

// Cell Jr. (Torneio de Cell): mesmo tamanho, poses e mecânica do Saibaman. Atarracado, armadura azul-marinho
// brilhante (ombros, peito, cinto, canelas), painéis azul-claros com manchas escuras (crista, barriga, braços,
// coxas), crista de duas abas, rosto claro com marcas roxas e queixeira amarela, mãos brancas, asas escuras e
// botas amarelas. Desenhado de frente.
function traceCellJrFigure(g, pose, frame) {
    g.save(); g.scale(0.5, 0.5);
    const azul = "#3f9ae6", azulClaro = "#8fd0ff", marinho = "#14215a", marinhoBrilho = "#3a52a8", linha = "#060b22", mancha = "#122a6e";
    const P = minionPose(pose, frame);
    const manchas = (pts, r) => { g.fillStyle = mancha; pts.forEach(([x, y], i) => { g.beginPath(); g.ellipse(x, y, r * (0.8 + (i % 3) * 0.2), r * 0.7, i * 0.7, 0, Math.PI * 2); g.fill(); }); };
    const forma = (pts, cor) => { g.fillStyle = cor; g.strokeStyle = linha; g.lineWidth = 1.2; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); g.stroke(); };
    const brilho = (x, y, rx, ry) => { g.fillStyle = "rgba(255, 255, 255, 0.35)"; g.beginPath(); g.ellipse(x, y, rx, ry, -0.4, 0, Math.PI * 2); g.fill(); };
    // asas escuras atrás dos ombros (batem ao voar)
    const bate = P.sway * 2;
    forma([[22, 32], [6, 24 - bate], [3, 44], [14, 52], [22, 44]], "#1d1446");
    forma([[42, 32], [58, 24 - bate], [61, 44], [50, 52], [42, 44]], "#1d1446");
    g.strokeStyle = "#4a3b8c"; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(20, 34); g.lineTo(7, 30 - bate); g.moveTo(44, 34); g.lineTo(57, 30 - bate); g.stroke();
    // pernas: coxa azul manchada, joelheira e canela marinho, bota amarela pontuda
    P.pernas.forEach((pts, i) => {
        const [h, k, f] = pts;
        minionLimb(g, [h, k], 9, azul, linha);
        manchas([[(h[0] + k[0]) / 2 - 1.5, (h[1] + k[1]) / 2], [(h[0] + k[0]) / 2 + 2, (h[1] + k[1]) / 2 + 3]], 1.2);
        minionLimb(g, [k, f], 8.5, marinho, linha);
        g.fillStyle = marinhoBrilho; g.strokeStyle = linha; g.lineWidth = 1;
        g.beginPath(); g.arc(k[0], k[1], 4, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = azulClaro; g.beginPath(); g.arc(k[0] - 1, k[1] - 1, 1.6, 0, Math.PI * 2); g.fill();
        const d = i ? 1 : -1;
        forma([[f[0] - 5, f[1] - 1], [f[0] + 5, f[1] - 1], [f[0] + 6 * d + (d > 0 ? 2 : -2), f[1] + 5], [f[0] - 4 * d, f[1] + 5]], "#f0a624");
        g.fillStyle = "rgba(255, 240, 180, 0.6)"; g.fillRect(f[0] - 3, f[1], 5, 1.2);
    });
    // barriga azul manchada, cinto e protetor marinho
    forma([[23, 42], [41, 42], [40, 51], [24, 51]], azul);
    manchas([[27, 45], [33, 47], [38, 44.5], [30, 49], [36, 49.5]], 1.2);
    forma([[22.5, 50], [41.5, 50], [41, 54], [23, 54]], marinho);
    forma([[29, 53.5], [35, 53.5], [33.5, 58], [30.5, 58]], marinho);
    // peitoral marinho grande e brilhante
    forma([[18, 30], [46, 30], [44, 41], [32, 44], [20, 41]], marinho);
    g.strokeStyle = marinhoBrilho; g.lineWidth = 1;
    g.beginPath(); g.moveTo(32, 31); g.lineTo(32, 43); g.moveTo(21, 37); g.quadraticCurveTo(26, 41, 31, 37); g.moveTo(33, 37); g.quadraticCurveTo(38, 41, 43, 37); g.stroke();
    brilho(25, 33, 4, 1.6); brilho(39, 33, 4, 1.6);
    // braços: azul manchado em cima, antebraço marinho e punho branco
    P.bracos.forEach((pts, i) => {
        const [o, c, m] = pts;
        minionLimb(g, [o, c], 7, azul, linha);
        manchas([[(o[0] + c[0]) / 2, (o[1] + c[1]) / 2]], 1.2);
        minionLimb(g, [c, m], 7, marinho, linha);
        g.fillStyle = "#f2f4f8"; g.strokeStyle = linha; g.lineWidth = 1;
        g.beginPath(); g.arc(m[0], m[1], 3.6, 0, Math.PI * 2); g.fill(); g.stroke();
        g.strokeStyle = "#9aa6b8"; g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(m[0] - 2, m[1]); g.lineTo(m[0] + 2, m[1]); g.stroke();
    });
    // ombreiras redondas marinho com brilho
    [[17, 32], [47, 32]].forEach(([x, y]) => {
        g.fillStyle = marinho; g.strokeStyle = linha; g.lineWidth = 1.2;
        g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); g.stroke();
        brilho(x - 2, y - 3, 3, 1.4);
    });
    // crista de duas abas (azul manchado) e o meio marinho brilhante
    forma([[29, 14], [22, 1], [14, 5], [15, 18], [22, 24], [27, 22]], azul);
    forma([[35, 14], [42, 1], [50, 5], [49, 18], [42, 24], [37, 22]], azul);
    manchas([[19, 8], [22, 14], [17, 13], [24, 19], [45, 8], [42, 14], [47, 13], [40, 19]], 1.3);
    forma([[26, 8], [32, 3], [38, 8], [38, 17], [26, 17]], marinho);
    brilho(30, 7, 2.5, 1.2);
    // rosto claro, olhos, marcas roxas e a queixeira amarela
    forma([[25.5, 15], [38.5, 15], [38, 23], [32, 28.5], [26, 23]], "#eeebf5");
    [[29, 18.5, 0.25], [35, 18.5, -0.25]].forEach(([x, y, r]) => {
        g.fillStyle = "#c2183a"; g.beginPath(); g.ellipse(x, y, 2.1, 1.1, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = linha; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x - 2.4, y - 1.6 + r * 2); g.lineTo(x + 2.4, y - 1.6 - r * 2); g.stroke();
    });
    g.fillStyle = "#9c4bc4"; g.fillRect(26.6, 19.5, 1.2, 4); g.fillRect(36.2, 19.5, 1.2, 4);
    g.strokeStyle = "#f2b630"; g.lineWidth = 2.4; g.lineJoin = "round";
    g.beginPath(); g.moveTo(25.5, 21); g.lineTo(28, 26); g.lineTo(32, 29); g.lineTo(36, 26); g.lineTo(38.5, 21); g.stroke();
    g.strokeStyle = "#a76d0e"; g.lineWidth = 0.6; g.stroke();
    g.strokeStyle = linha; g.lineWidth = 0.7; g.beginPath(); g.moveTo(30.5, 24.5); g.quadraticCurveTo(32, 25.3, 33.5, 24.5); g.stroke();
    g.restore();
}

// Na fase do Torneio de Cell os inimigos pequenos são os Cell Jr.; nas outras, Saibamans.
function getMinionKind() {
    return typeof selectedStage !== "undefined" && selectedStage === "cell_games" ? "celljr" : "saibaman";
}

function getSaibamanSprite(pose, frame) {
    const tipo = getMinionKind();
    const key = tipo + pose + frame;
    let c = saibamanSpriteCache.get(key);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = (32 + SAIBAMAN_SPRITE_PAD * 2) * SAIBAMAN_SPRITE_SCALE;
    c.height = (40 + SAIBAMAN_SPRITE_PAD * 2) * SAIBAMAN_SPRITE_SCALE;
    const g = c.getContext("2d");
    if (g) {
        g.scale(SAIBAMAN_SPRITE_SCALE, SAIBAMAN_SPRITE_SCALE);
        g.translate(SAIBAMAN_SPRITE_PAD, SAIBAMAN_SPRITE_PAD + 1);
        if (tipo === "celljr") traceCellJrFigure(g, pose, frame); else traceSaibamanFigure(g, pose, frame);
    }
    saibamanSpriteCache.set(key, c);
    return c;
}

function drawSaibamanSprite(s, pose, frame, offsetY = 0) {
    const img = getSaibamanSprite(pose, frame), k = MINION_DRAW_SCALE;
    ctx.drawImage(img, s.x + 16 - (16 + SAIBAMAN_SPRITE_PAD) * k, s.y + 40 - (40 + SAIBAMAN_SPRITE_PAD + 1) * k + offsetY,
        (32 + SAIBAMAN_SPRITE_PAD * 2) * k, (40 + SAIBAMAN_SPRITE_PAD * 2) * k);
}

function drawSaibamans() {
    const groundLine = canvas.height - 4;
    world.saibamans.forEach(s => {
        ctx.save();
        const cx = s.x + s.w / 2;
        if (s.phase === "brotar") {
            // sai da terra: o corpo sobe por um buraco com terra em volta
            const p = Math.min(1, s.phaseTime / SAIBAMAN_SPROUT_FRAMES);
            const rise = 1 - Math.pow(1 - p, 2);
            ctx.save();
            ctx.beginPath(); ctx.rect(s.x - 20, 0, s.w + 40, groundLine); ctx.clip();
            drawSaibamanSprite(s, "saltar", 0, (1 - rise) * (s.h + 4));
            ctx.restore();
            ctx.fillStyle = "#4a3418";
            ctx.beginPath(); ctx.ellipse(cx, groundLine, 16 + rise * 4, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#7a5a32";
            for (let k = 0; k < 5; k++) {
                const ang = Math.PI + (k / 4) * Math.PI;
                ctx.fillRect(cx + Math.cos(ang) * (14 + p * 8) - 1.5, groundLine + Math.sin(ang) * (4 + p * 10) - 1.5, 3, 3);
            }
        } else if (s.phase === "saltar") {
            // rastro de velocidade subindo
            ctx.strokeStyle = "rgba(190, 255, 150, 0.55)"; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 6, s.y + s.h + 4); ctx.lineTo(cx - 6, s.y + s.h + 18);
            ctx.moveTo(cx + 6, s.y + s.h + 2); ctx.lineTo(cx + 6, s.y + s.h + 14);
            ctx.stroke();
            drawSaibamanSprite(s, "saltar", 0);
        } else if (s.phase === "arremessado") {
            // girando para trás depois de ser solto
            ctx.translate(cx, s.y + s.h / 2);
            ctx.rotate(s.phaseTime * 0.35);
            ctx.translate(-cx, -(s.y + s.h / 2));
            drawSaibamanSprite(s, "saltar", 0);
        } else if (s.phase === "agarrar") {
            // desenhado depois do herói (drawGrabbingSaibamans), para ficar na frente das pernas
        } else if (s.phase === "investir") {
            // partindo para cima do herói, braços para a frente
            ctx.strokeStyle = "rgba(190, 255, 150, 0.5)"; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s.x + s.w + 2, s.y + 14); ctx.lineTo(s.x + s.w + 16, s.y + 14);
            ctx.moveTo(s.x + s.w + 2, s.y + 26); ctx.lineTo(s.x + s.w + 12, s.y + 26);
            ctx.stroke();
            drawSaibamanSprite(s, "agarrar", 0);
        } else {
            const frame = Math.floor((s.hoverTime || 0) * 2.4) % 4;
            drawSaibamanSprite(s, "voar", frame);
        }
        ctx.restore();
    });

}

// Saibaman abraçado nas pernas do herói: desenhado por cima do herói (na frente dele), com o corpo normal
// (sem transparência), tremendo cada vez mais e com uma luz no peito piscando mais rápido até explodir.
function drawGrabbingSaibamans() {
    const hover = Math.sin(player.hoverTime || 0) * 3;   // acompanha a flutuação do desenho do herói
    world.saibamans.forEach(s => {
        if (s.phase !== "agarrar") return;
        const left = Math.max(0, s.grabTimer) / SAIBAMAN_GRAB_FRAMES;
        const treme = (1 - left) * 2;
        const jx = (Math.floor(s.grabTimer) % 2 ? 1 : -1) * treme;
        const x = s.x + jx, y = s.y + hover;
        ctx.save();
        drawSaibamanSprite({ x, y }, "agarrar", 0);
        const period = 3 + left * 9;
        if (Math.floor(s.grabTimer / period) % 2 === 0) {
            ctx.fillStyle = "#fff6b0";
            ctx.beginPath(); ctx.arc(x + s.w / 2 - 1, y + 23, 2.5 + (1 - left) * 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    });
}

// Aviso de conquista: pílula de pontas arredondadas no topo, no centro da tela, que desce rápido. O ícone
// (medalha dourada com estrela) "salta" com um pequeno exagero no tamanho e solta um anel de brilho.
function drawStarPath(g, cx, cy, rOut, rIn, pontas = 5) {
    g.beginPath();
    for (let i = 0; i < pontas * 2; i++) {
        const r = i % 2 === 0 ? rOut : rIn;
        const a = -Math.PI / 2 + i * Math.PI / pontas;
        if (i === 0) g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        else g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
}

function drawAchievementBanner() {
    const t = achievementBanner.timer;
    const h = 44, iconR = 16;
    ctx.save();
    ctx.font = "bold 13px 'Segoe UI', sans-serif";
    const tituloW = ctx.measureText(achievementBanner.title).width;
    ctx.font = "bold 9px 'Segoe UI', sans-serif";
    const rotuloW = ctx.measureText("CONQUISTA DESBLOQUEADA").width;
    const w = Math.min(canvas.width - 40, Math.max(tituloW, rotuloW) + h + 34);
    const x = canvas.width / 2 - w / 2, y = 8 + achievementBanner.yOffset;

    // sombra e corpo da pílula
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    const fundo = ctx.createLinearGradient(0, y, 0, y + h);
    fundo.addColorStop(0, "rgba(30, 27, 75, 0.96)");
    fundo.addColorStop(1, "rgba(12, 10, 40, 0.96)");
    ctx.fillStyle = fundo;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, h / 2) : ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(251, 191, 36, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ícone em destaque: entra pequeno, passa um pouco do tamanho e assenta (efeito "pulo")
    const icx = x + h / 2 + 2, icy = y + h / 2;
    const p = Math.min(1, Math.max(0, (t - 6) / 16));
    const escala = p <= 0 ? 0 : 1 + 0.35 * Math.sin(p * Math.PI) * (1 - p * 0.4);
    if (t > 8 && t < 50) {
        const q = (t - 8) / 42;
        ctx.globalAlpha = 1 - q;
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 3 * (1 - q) + 0.5;
        ctx.beginPath(); ctx.arc(icx, icy, iconR + q * 18, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
    }
    if (escala > 0) {
        ctx.save();
        ctx.translate(icx, icy);
        ctx.scale(escala, escala);
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 14;
        const ouro = ctx.createRadialGradient(-5, -6, 2, 0, 0, iconR);
        ouro.addColorStop(0, "#fff7c2");
        ouro.addColorStop(0.55, "#fbbf24");
        ouro.addColorStop(1, "#b45309");
        ctx.fillStyle = ouro;
        ctx.beginPath(); ctx.arc(0, 0, iconR, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        drawStarPath(ctx, 0, 0.5, iconR * 0.62, iconR * 0.27);
        ctx.fill();
        ctx.strokeStyle = "#92400e";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    // textos
    const tx = x + h + 8;
    ctx.textAlign = "left";
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 9px 'Segoe UI', sans-serif";
    ctx.fillText("CONQUISTA DESBLOQUEADA", tx, y + 17);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px 'Segoe UI', sans-serif";
    ctx.fillText(achievementBanner.title, tx, y + 34, w - h - 22);
    ctx.restore();
}

function drawSaibamanBlasts() {
    // explosões dos abraços
    world.blasts.forEach(b => {
        const a = Math.max(0, b.life);
        ctx.save();
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = "#ff8a1e";
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffe066";
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = a;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.38, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.15, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    });
}

function drawPickups() {
    world.pickups.forEach(item => {
        ctx.save();
        let centerX = item.x + item.w / 2;
        let centerY = item.y + item.h / 2;
        let bob = Math.sin(item.pulse) * 2;
        ctx.translate(centerX, centerY + bob);
        ctx.rotate(Math.sin(item.spin) * 0.12);
        ctx.shadowBlur = 10;

        ctx.scale(1.2, 1.2);   // um pouco maiores que antes, para dar para reconhecer cada item

        if (item.type === "senzu") {
            // Semente dos Deuses (senzu): um único feijão verde-claro em forma de rim.
            ctx.scale(1.1, 0.78);
            ctx.shadowColor = "#9dff5a";
            ctx.fillStyle = "#9ad84a";
            ctx.strokeStyle = "#2f5e1a";
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(-8, -2);
            ctx.bezierCurveTo(-9, -9, 1, -11, 6, -7);
            ctx.bezierCurveTo(11, -3, 10, 6, 4, 8);
            ctx.bezierCurveTo(0, 9, -1, 4, -4, 4);
            ctx.bezierCurveTo(-7, 4, -8, 1, -8, -2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#6aa830";
            ctx.beginPath(); ctx.ellipse(3, 3, 4, 2.4, -0.6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#e8ffb0";
            ctx.beginPath(); ctx.ellipse(-2, -5, 3.2, 1.4, -0.3, 0, Math.PI * 2); ctx.fill();
        } else if (item.type === "capsule") {
            // Cápsula da Corporação Cápsula: pílula curta deitada (pontas arredondadas iguais), corpo branco com
            // volume de cilindro, anel metálico perto de uma ponta, botãozinho cinza em cima e o número.
            ctx.shadowColor = "#7fd0ff";
            ctx.rotate(-0.25);
            const L = 12, R = 5.5;   // meia largura do corpo e raio das pontas
            const corpo = ctx.createLinearGradient(0, -R, 0, R);
            corpo.addColorStop(0, "#ffffff"); corpo.addColorStop(0.35, "#f1f4f8"); corpo.addColorStop(1, "#b9c2cf");
            ctx.fillStyle = corpo;
            ctx.strokeStyle = "#3a4250";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(-L + R, -R);
            ctx.lineTo(L - R, -R);
            ctx.arc(L - R, 0, R, -Math.PI / 2, Math.PI / 2);
            ctx.lineTo(-L + R, R);
            ctx.arc(-L + R, 0, R, Math.PI / 2, Math.PI * 1.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            // anel metálico perto da ponta direita
            const anel = ctx.createLinearGradient(0, -R, 0, R);
            anel.addColorStop(0, "#d7dde6"); anel.addColorStop(0.5, "#8d96a4"); anel.addColorStop(1, "#5d6674");
            ctx.fillStyle = anel;
            ctx.fillRect(4, -R + 0.7, 2.6, R * 2 - 1.4);
            // botãozinho em cima, no meio do corpo
            ctx.fillStyle = "#8d96a4";
            ctx.strokeStyle = "#3a4250";
            ctx.lineWidth = 0.9;
            ctx.beginPath(); ctx.ellipse(-1, -R, 2.4, 1.4, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            // brilho comprido em cima
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.fillRect(-L + R - 1, -R + 1.4, 12, 1.3);
            // número e o logo
            ctx.fillStyle = "#1c5fb8";
            ctx.font = "bold 5px monospace";
            ctx.textAlign = "center";
            ctx.fillText("CC", -4.5, 2.6);
            ctx.fillStyle = "#3a4250";
            ctx.font = "bold 4.5px monospace";
            ctx.fillText("1", 9, 2);
        } else if (item.type === "cloud") {
            // Nuvem Voadora (Kinto'un): nuvem amarelo-dourada fofinha com um rastro atrás.
            ctx.shadowColor = "#ffd84a";
            ctx.fillStyle = "#e9a91f";
            ctx.beginPath();
            ctx.moveTo(-7, 6);
            ctx.quadraticCurveTo(-15, 7, -17, 2);
            ctx.quadraticCurveTo(-13, 4, -9, 0);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#a8670c";
            ctx.lineWidth = 1.3;
            ctx.fillStyle = "#ffd84a";
            ctx.beginPath();
            ctx.arc(-6, 3, 5.5, 0, Math.PI * 2);
            ctx.arc(0, -1, 7, 0, Math.PI * 2);
            ctx.arc(7, 2, 6, 0, Math.PI * 2);
            ctx.arc(1, 5, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#ffd84a";
            ctx.beginPath();
            ctx.arc(-6, 3, 4.6, 0, Math.PI * 2);
            ctx.arc(0, -1, 6.1, 0, Math.PI * 2);
            ctx.arc(7, 2, 5.1, 0, Math.PI * 2);
            ctx.arc(1, 5, 4.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#f0b52a";
            ctx.beginPath(); ctx.ellipse(1, 7, 9, 2.6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#fff6c4";
            ctx.beginPath(); ctx.ellipse(-1, -4, 3.4, 1.6, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(6, -1, 2, 1.1, 0, 0, Math.PI * 2); ctx.fill();
        } else if (item.type === "staff") {
            // Bastão Mágico (Nyoibo): haste vermelha com as pontas douradas.
            ctx.shadowColor = "#ff5a3d";
            ctx.rotate(-0.6);
            ctx.fillStyle = "#3a0c08";
            ctx.fillRect(-14, -2.6, 28, 5.2);
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#d2281e";
            ctx.fillRect(-10, -1.8, 20, 3.6);
            ctx.fillStyle = "#ff7a5e";
            ctx.fillRect(-10, -1.6, 20, 1);
            ctx.fillStyle = "#e8b631";
            ctx.fillRect(-13.4, -2, 4, 4);
            ctx.fillRect(9.4, -2, 4, 4);
            ctx.fillStyle = "#fff0a0";
            ctx.fillRect(-13, -1.8, 3, 1);
            ctx.fillRect(9.8, -1.8, 3, 1);
            ctx.fillStyle = "#8a5a10";
            ctx.fillRect(-9.6, -1.8, 0.8, 3.6);
            ctx.fillRect(8.8, -1.8, 0.8, 3.6);
        }
        ctx.restore();
    });
}

function drawObstacles() {
    world.obstacles.forEach(o => {
        ctx.save();
        ctx.fillStyle = o.color || "#00ffff";
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawSpecialBeams() {
    if (world.beamActive > 0) {
        ctx.save();

        if (world.beamOwner === "clash") {
            // Os dois feixes vêm de lados opostos e se encontram num ponto deslocado pelo empurrão (quem
            // aperta ATAQUE mais vezes "ganha terreno"), com uma explosão branca no ponto de encontro.
            const push = world.beamClashPush || 0;
            const midX = canvas.width / 2 + push * (canvas.width / 2 - 60);
            const py = (player.y + player.h / 2 + player2.y + player2.h / 2) / 2;
            ctx.fillStyle = "#00ffff";
            ctx.fillRect(0, py - 22, midX, 44);
            ctx.fillStyle = "#ff0055";
            ctx.fillRect(midX, py - 22, canvas.width - midX, 44);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(Math.max(0, midX - 10), py - 12, 20, 24);
            const burst = 30 + Math.sin(world.beamActive * 0.9) * 10;
            const grad = ctx.createRadialGradient(midX, py, 4, midX, py, burst);
            grad.addColorStop(0, "#ffffff");
            grad.addColorStop(0.5, "#fff3b0");
            grad.addColorStop(1, "rgba(255,243,176,0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(midX, py, burst, 0, Math.PI * 2);
            ctx.fill();

            // Placar de apertos + tempo restante da disputa, pra deixar claro que é pra apertar ATAQUE sem parar.
            ctx.textAlign = "center";
            ctx.font = "bold 13px 'Courier New', monospace";
            ctx.fillStyle = "#00ffff";
            ctx.fillText(`P1: ${world.clashMashP1 || 0}`, 60, 30);
            ctx.fillStyle = "#ff0055";
            ctx.fillText(`P2: ${world.clashMashP2 || 0}`, canvas.width - 60, 30);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(canvas.width / 2 - 40, 12, 80, 6);
            ctx.fillStyle = "#fff3b0";
            ctx.fillRect(canvas.width / 2 - 40, 12, 80 * Math.max(0, Math.min(1, world.beamActive / CLASH_MASH_DURATION)), 6);
            ctx.restore();
            return;
        }

        const fromP2 = world.beamOwner === "p2";
        const src = fromP2 ? player2 : player;
        const py = src.y + src.h / 2;
        const beamX = fromP2 ? 0 : src.x + src.w;
        const beamW = fromP2 ? src.x : canvas.width - beamX;

        let beamColor = world.beamIsSuper ? "#ffcf3f" : "#00ffff";
        let coreColor = "#ffffff";

        if (world.currentBeamType === "FINAL FLASH") beamColor = "#ffff00";
        else if (world.currentBeamType === "MAKAN KOSAPPO") beamColor = "#ff0055";
        else if (world.currentBeamType === "DEATH BEAM") beamColor = "#aa00ff";

        const beamHalfHeight = world.beamIsSuper ? 34 : 25;
        ctx.fillStyle = beamColor;
        ctx.fillRect(beamX, py - beamHalfHeight, beamW, beamHalfHeight * 2);

        ctx.fillStyle = coreColor;
        ctx.fillRect(beamX, py - beamHalfHeight * 0.4, beamW, beamHalfHeight * 0.8);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        for (let x = beamX; x < beamX + beamW; x += 40) {
            ctx.beginPath();
            ctx.arc(x + (world.beamActive * 5 % 40), py, world.beamIsSuper ? 28 : 22, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }
}

// Flash de tela (triggerScreenFlash, em gameplay.js): cobre tudo com uma cor sólida que esmaece rápido.
// Some sozinho conforme screenFlashTimer desce (ver update()).
function drawScreenFlash() {
    if (screenFlashTimer <= 0 || screenFlashMax <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.85, (screenFlashTimer / screenFlashMax) * 0.85);
    ctx.fillStyle = screenFlashColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

// Fases de fundo claro (céu claro, nuvens, luas ou a Sala do Tempo toda branca): placas escuras translúcidas atrás do placar do topo,
// senão os textos brancos/claros somem no fundo.
const STAGES_FUNDO_CLARO = ["terra", "kaio", "namek", "time_room", "cell_games", "freeza_ship", "kaioshin"];

function drawHUD() {
    ctx.save();
    if (STAGES_FUNDO_CLARO.includes(selectedStage)) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
        roundRectPath(10, 8, 250, 66, 10);
        ctx.fill();
        roundRectPath(canvas.width - 236, 8, 228, 66, 10);
        ctx.fill();
    }
    ctx.fillStyle = "#222244";
    ctx.fillRect(20, 15, 150, 14);
    ctx.fillStyle = "#00ff55";
    ctx.fillRect(20, 15, (player.hp / player.maxHp) * 150, 14);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 15, 150, 14);

    ctx.fillStyle = "#222244";
    ctx.fillRect(20, 33, 150, 8);
    const specialFull = canUseSpecial(player.ki, player.maxKi);
    ctx.fillStyle = specialFull ? "#ffd23f" : "#00ffff";
    ctx.fillRect(20, 33, (player.ki / player.maxKi) * 150, 8);
    ctx.strokeRect(20, 33, 150, 8);
    if (specialFull) {
        ctx.fillStyle = "#ffd23f";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText("ESPECIAL PRONTO!", 176, 41);
    }

    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillText(`SCORE: ${score}`, 20, 58);
    ctx.fillText(gameMode === "coop" ? `RODADA ${world.versusRound || 1}` : `WAVE: ${waveNumber}`, 120, 58);

    // Combo de parry: só aparece enquanto está "vivo" (parryComboTimer > 0), com uma barrinha mostrando
    // quanto falta pra sequência expirar — reforça que é preciso continuar rebatendo pra não perder o combo.
    if (player.parryCombo > 1 && player.parryComboTimer > 0) {
        ctx.fillStyle = "#fff23f";
        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.textAlign = "left";
        ctx.fillText(`COMBO x${player.parryCombo}`, 20, 74);
        ctx.fillStyle = "rgba(255,242,63,0.3)";
        ctx.fillRect(20, 78, 90, 4);
        ctx.fillStyle = "#fff23f";
        ctx.fillRect(20, 78, 90 * (player.parryComboTimer / 90), 4);
    }

    // Ícones de buff de item (nuvem = velocidade, bastão = força) com barra de tempo restante.
    const buffIconY = (player.parryCombo > 1 && player.parryComboTimer > 0) ? 86 : 68;
    const drawBuffIcon = (x, timer, label, color) => {
        if (timer <= 0) return;
        ctx.fillStyle = color;
        ctx.font = "bold 10px 'Courier New', monospace";
        ctx.textAlign = "left";
        ctx.fillText(label, x, buffIconY);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(x, buffIconY + 4, 60, 3);
        ctx.fillStyle = color;
        ctx.fillRect(x, buffIconY + 4, 60 * Math.min(1, timer / PICKUP_BUFF_MAX_DURATION), 3);
    };
    drawBuffIcon(20, player.speedBuffTimer, "★ NUVEM", "#fff4c2");
    drawBuffIcon(96, player.powerBuffTimer, "★ BASTÃO", "#ff9d3d");

    if (!player2.isDying) {
        ctx.fillStyle = "#222244";
        ctx.fillRect(canvas.width - 226, 15, 150, 14);
        ctx.fillStyle = "#ff0055";
        ctx.fillRect(canvas.width - 226, 15, (player2.hp / player2.maxHp) * 150, 14);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(canvas.width - 226, 15, 150, 14);

        let bChar = characterDB[selectedBoss];
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "right";
        ctx.fillText(bChar ? bChar.name : "VILÃO", canvas.width - 20, 42);

        // Onda atual e recorde de ondas daquela fase, logo abaixo da barra de vida do vilão — só no modo
        // história. No VERSUS mostra o placar da partida (melhor de 3).
        if (gameMode === "coop") {
            const vs = world.versusScore || { p1: 0, p2: 0 };
            ctx.fillStyle = "#ffd23f";
            ctx.font = "bold 9px monospace";
            ctx.fillText(`PLACAR: J1 ${vs.p1} x ${vs.p2} J2`, canvas.width - 20, 55);
            ctx.fillStyle = "#93c5fd";
            ctx.font = "8px monospace";
            ctx.fillText(`MELHOR DE ${VERSUS_ROUNDS_TO_WIN * 2 - 1} RODADAS`, canvas.width - 20, 66);
        } else if (gameMode === "singleplayer") {
            const modeLabel = stageMode === "hard" ? "DIFÍCIL" : stageMode === "unlimited" ? "SEM LIMITE" : "NORMAL";
            ctx.fillStyle = "#ffd23f";
            ctx.font = "bold 9px monospace";
            ctx.fillText(`ONDA ${waveNumber} — ${modeLabel}`, canvas.width - 20, 55);
            ctx.fillStyle = "#93c5fd";
            ctx.font = "8px monospace";
            ctx.fillText(`RECORDE DA FASE: ONDA ${getStageWaveRecordFor(selectedStage)}`, canvas.width - 20, 66);
        }
    }

    world.floatingTexts.forEach(ft => {
        if (ft.icon) { drawPickupFeedbackIcon(ft); return; }
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color || "#ffffff";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    });

    ctx.restore();
}

// Ícone rápido ao pegar um item (sem texto no meio da luta): sobe e some como os antigos avisos.
// senzu = + verde, cápsula = escudo, nuvem voadora = sandália com asas, bastão mágico = punho de força.
function drawPickupFeedbackIcon(ft) {
    const pop = (0.7 + Math.min(1, (1 - ft.alpha) * 6) * 0.3) * 0.98;   // cresce rápido ao aparecer (30% menor que antes)
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, ft.alpha * 1.4));
    ctx.translate(ft.x, ft.y);
    ctx.scale(pop, pop);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = "#0b1020"; ctx.lineWidth = 3;
    if (ft.icon === "senzu") {
        ctx.beginPath();
        ctx.moveTo(-4, -12); ctx.lineTo(4, -12); ctx.lineTo(4, -4); ctx.lineTo(12, -4); ctx.lineTo(12, 4); ctx.lineTo(4, 4);
        ctx.lineTo(4, 12); ctx.lineTo(-4, 12); ctx.lineTo(-4, 4); ctx.lineTo(-12, 4); ctx.lineTo(-12, -4); ctx.lineTo(-4, -4); ctx.closePath();
        ctx.fillStyle = "#4ade80"; ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#bbf7d0"; ctx.fillRect(-2, -10, 3, 7);
    } else if (ft.icon === "capsule") {
        ctx.beginPath();
        ctx.moveTo(0, -13); ctx.lineTo(11, -9); ctx.lineTo(10, 2); ctx.quadraticCurveTo(7, 10, 0, 14); ctx.quadraticCurveTo(-7, 10, -10, 2); ctx.lineTo(-11, -9); ctx.closePath();
        ctx.fillStyle = "#38bdf8"; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, -6); ctx.lineTo(6, 2); ctx.quadraticCurveTo(4, 7, 0, 10); ctx.closePath();
        ctx.fillStyle = "#bae6fd"; ctx.fill();
    } else if (ft.icon === "cloud") {
        // asas brancas atrás da sandália
        [-1, 1].forEach(lado => {
            ctx.beginPath();
            ctx.moveTo(lado * 4, -2); ctx.quadraticCurveTo(lado * 14, -16, lado * 17, -10); ctx.quadraticCurveTo(lado * 13, -8, lado * 15, -4);
            ctx.quadraticCurveTo(lado * 10, -3, lado * 12, 1); ctx.quadraticCurveTo(lado * 8, 1, lado * 4, 3); ctx.closePath();
            ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
        });
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 7, 12, 4, 0, 0, Math.PI * 2);   // sola
        ctx.fillStyle = "#a16207"; ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 2.5;   // tiras
        ctx.beginPath(); ctx.moveTo(-6, 6); ctx.quadraticCurveTo(0, -3, 6, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-1, 6); ctx.lineTo(3, 1); ctx.stroke();
    } else {
        // punho fechado com linhas de impacto
        ctx.strokeStyle = "#fde047"; ctx.lineWidth = 2;
        [[-15, -9, -11, -6], [-16, 0, -12, 0], [-15, 9, -11, 6]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
        ctx.strokeStyle = "#0b1020"; ctx.lineWidth = 2.5;
        ctx.fillStyle = "#fb923c";
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-8, -9, 18, 18, 5) : ctx.rect(-8, -9, 18, 18); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-8, -5 + i * 4.5); ctx.lineTo(1, -5 + i * 4.5); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(4, 6, 6, 3.5, -0.3, 0, Math.PI * 2); ctx.fillStyle = "#fdba74"; ctx.fill(); ctx.stroke();   // polegar
    }
    ctx.restore();
}

// Analógico virtual: base + bolinha. Parado = "fantasma" no canto esquerdo indicando onde tocar;
// em uso = aparece onde o dedo encostou e a bolinha segue o dedo (limitada ao raio).
function drawTouchAnalog() {
    if (touchControlMode !== "analog") return;

    const R = TOUCH_ANALOG.RADIUS;
    const active = touchAnalog.active;
    const baseX = active ? touchAnalog.startX : TOUCH_ANALOG.IDLE_X;
    const baseY = active ? touchAnalog.startY : TOUCH_ANALOG.IDLE_Y;
    let knobX = baseX, knobY = baseY;

    if (active) {
        const dx = touchAnalog.curX - baseX;
        const dy = touchAnalog.curY - baseY;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            const k = Math.min(dist, R) / dist;
            knobX = baseX + dx * k;
            knobY = baseY + dy * k;
        }
    }

    ctx.save();
    ctx.globalAlpha = active ? 0.9 : 0.45;
    ctx.fillStyle = "rgba(5, 22, 48, 0.28)";
    ctx.strokeStyle = "rgba(94, 225, 255, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(baseX, baseY, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(94, 225, 255, 0.35)";
    ctx.beginPath();
    ctx.arc(baseX, baseY, TOUCH_ANALOG.DEADZONE, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = active ? "rgba(255, 215, 80, 0.6)" : "rgba(94, 225, 255, 0.4)";
    ctx.strokeStyle = active ? "rgba(255, 240, 166, 0.95)" : "rgba(232, 251, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(knobX, knobY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!active) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "#e8fbff";
        ctx.font = "bold 8px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("MOVER", baseX, baseY + 1);
    }
    ctx.restore();
    ctx.textBaseline = "alphabetic";
}

let autofireHintShownSec = 0;
let autofireHintHeldSec = 0;

// Dica única na 1ª partida no celular. Some quando o jogador segura o dedo por 2 s (já entendeu) ou após 10 s.
function drawAutofireHint() {
    if (autofireHintSeen || !touchAutoFire || gameState !== "playing") return;
    autofireHintShownSec += deltaTime;
    if (touchAnalog.active || touchSwipe.active) autofireHintHeldSec += deltaTime;
    if (autofireHintHeldSec >= 2 || autofireHintShownSec >= 10) {
        autofireHintSeen = true;
        writeStorage("saiyan_hint_autofire", "1");
        return;
    }
    const target = touchControlMode === "swipe" ? "NA TELA" : "NO ANALÓGICO";
    const pulse = 0.75 + Math.sin(autofireHintShownSec * 5) * 0.25;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "rgba(3, 13, 35, 0.85)";
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = 2;
    ctx.fillRect(180, 294, 330, 44);
    ctx.strokeRect(180, 294, 330, 44);
    ctx.fillStyle = "#fff0a6";
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`APOIE O DEDO ${target}`, 345, 312);
    ctx.fillText("PARA ATIRAR SEM PARAR", 345, 328);
    ctx.restore();
}

function drawPauseButton() {
    const r = getPauseButtonRect();
    const pressed = beginButtonPress(r.x, r.y, r.w, r.h);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(5, 22, 48, 0.45)";
    ctx.strokeStyle = "rgba(148, 220, 255, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e8fbff";
    ctx.fillRect(r.x + r.w / 2 - 7, r.y + 7, 5, r.h - 14);
    ctx.fillRect(r.x + r.w / 2 + 2, r.y + 7, 5, r.h - 14);
    ctx.restore();
    endButtonPress(pressed);
}

// Ícones dos botões de toque: as ilustrações do jogador (icons/botoes/). Ao carregar, o desenho de dentro do
// círculo vira uma máscara limpa (sem o fundo e as falhas do recorte); o botão é montado com anel, disco com
// degradê e o desenho em cor firme, e guardado pronto por tamanho/estado (nada é recalculado a cada quadro).
const HUD_ICON_FILES = { attack: "ataque", parry: "parry", charge: "carregar", special: "especial", transform: "transformar" };
const hudIconMasks = {};
const hudButtonCache = new Map();
function buildHudIconMask(img) {
    const S = img.naturalWidth, R = Math.round(S * 0.35), D = R * 2;   // círculo claro do desenho original
    const c = document.createElement("canvas");
    c.width = c.height = D;
    const g = c.getContext("2d");
    if (!g) return null;
    g.drawImage(img, S / 2 - R, S / 2 - R, D, D, 0, 0, D, D);
    try {
        const px = g.getImageData(0, 0, D, D), d = px.data, lums = [];
        for (let i = 0; i < d.length; i += 4) lums.push((d[i] + d[i + 1] + d[i + 2]) / 3);
        const fundo = lums.slice().sort((x, y) => x - y)[Math.floor(lums.length * 0.75)];   // cor do disco claro
        for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
            const i = (y * D + x) * 4, dist = Math.hypot(x - R + 0.5, y - R + 0.5);
            let a = Math.max(0, Math.min(1, (fundo - lums[i / 4] - 14) / 26));
            if (dist > R - 3) a = 0;   // tira a borda do círculo original
            d[i] = d[i + 1] = d[i + 2] = 255;
            d[i + 3] = Math.round(a * 255);
        }
        g.putImageData(px, 0, 0);
    } catch (e) { return null; }
    return c;
}
if (typeof Image !== "undefined") {
    for (const [key, nome] of Object.entries(HUD_ICON_FILES)) {
        const img = new Image();
        img.onload = () => { hudIconMasks[key] = buildHudIconMask(img); hudButtonCache.clear(); };
        img.src = "icons/botoes/" + nome + ".png";
    }
}
// Botão pronto (canvas) para um ícone, num raio e estado: anel segmentado, disco claro com degradê e brilho,
// o desenho em azul-escuro firme; dourado quando pronto (ex.: TRANSFORMAR) e mais claro quando apertado.
function getHudButtonSprite(key, r, pronto, apertado) {
    const mask = hudIconMasks[key];
    if (!mask) return null;
    const R = Math.round(r), id = key + "|" + R + "|" + (pronto ? 1 : 0) + (apertado ? 1 : 0);
    let c = hudButtonCache.get(id);
    if (c) return c;
    const pad = 6, S = (R + pad) * 2, esc = 2;   // desenhado em 2x para ficar nítido na tela
    c = document.createElement("canvas");
    c.width = c.height = S * esc;
    const g = c.getContext("2d");
    if (!g) return null;
    g.scale(esc, esc);
    const cx = S / 2, cy = S / 2;
    const anel = pronto ? "#ffd54a" : "#b9cbe2", anelEscuro = pronto ? "#b8860b" : "#5d7697";
    // base escura translúcida com sombra suave
    g.shadowColor = pronto ? "rgba(255, 200, 40, 0.75)" : "rgba(0, 0, 0, 0.45)";
    g.shadowBlur = pronto ? 8 : 4;
    g.fillStyle = "rgba(8, 18, 40, 0.62)";
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    // anel segmentado (4 arcos com frestas), com contorno escuro por baixo
    const segs = 4, fresta = 0.16;
    for (const [cor, larg] of [[anelEscuro, R * 0.13], [anel, R * 0.085]]) {
        g.strokeStyle = cor; g.lineWidth = larg; g.lineCap = "round";
        for (let i = 0; i < segs; i++) {
            const a0 = -Math.PI / 4 + i * Math.PI / 2 + fresta, a1 = a0 + Math.PI / 2 - fresta * 2;
            g.beginPath(); g.arc(cx, cy, R * 0.9, a0, a1); g.stroke();
        }
    }
    // disco claro com degradê e borda fina
    const rd = R * 0.72;
    const disco = g.createRadialGradient(cx - rd * 0.35, cy - rd * 0.45, rd * 0.1, cx, cy, rd);
    disco.addColorStop(0, apertado ? "#ffffff" : "#eef4fb"); disco.addColorStop(0.7, "#c3d3e6"); disco.addColorStop(1, "#93a9c4");
    g.fillStyle = disco;
    g.beginPath(); g.arc(cx, cy, rd, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255, 255, 255, 0.9)"; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = "rgba(40, 60, 90, 0.55)"; g.lineWidth = 0.8;
    g.beginPath(); g.arc(cx, cy, rd + 1, 0, Math.PI * 2); g.stroke();
    // o desenho do jogador, tingido de azul-escuro firme
    const t = document.createElement("canvas");
    t.width = t.height = Math.ceil(rd * 2 * esc);
    const tg = t.getContext("2d");
    if (tg) {
        tg.drawImage(mask, 0, 0, t.width, t.height);
        tg.globalCompositeOperation = "source-in";
        tg.fillStyle = pronto ? "#6b4a00" : "#1f3557";
        tg.fillRect(0, 0, t.width, t.height);
        g.drawImage(t, cx - rd, cy - rd, rd * 2, rd * 2);
    }
    // reflexo de luz em cima
    g.fillStyle = "rgba(255, 255, 255, 0.22)";
    g.beginPath(); g.ellipse(cx - rd * 0.15, cy - rd * 0.55, rd * 0.55, rd * 0.22, -0.2, 0, Math.PI * 2); g.fill();
    c.lado = S;
    if (hudButtonCache.size > 60) hudButtonCache.clear();
    hudButtonCache.set(id, c);
    return c;
}

// Toque: com o ki cheio (e ainda tendo transformação), o botão CARREGAR vira TRANSFORMAR.
function canTouchTransform() {
    return player.ki >= player.maxKi && getTransformLevel(player) < getCharacterTransformations(selectedCharacter).length;
}

function drawTouchHUD() {
    if (!isTouchDevice && gameState !== "options_hud") return;

    const hudLabels = {
        attack: "ATAQUE",
        parry: "PARRY",
        special: "ESPECIAL",
        charge: "CARREGAR",
        transform: "TRANSF."
    };

    if (gameState !== "options_hud") drawTouchAnalog();
    if (gameState === "playing" || gameState === "tutorial") { drawPauseButton(); if (gameState === "playing") drawAutofireHint(); }

    ctx.save();
    for (let key in touchHudLayout) {
        if (isHudButtonHidden(key)) continue;

        const btnRect = getHudButtonRect(key);
        const btn = touchHudLayout[key];
        const isEditing = gameState === "options_hud";
        const isSelected = hudEditorSelectedBtn === key && isEditing;
        // Com o ki cheio o CARREGAR vira TRANSFORMAR e acende (dourado); o ESPECIAL fica apagado quando não dá.
        const transformReady = key === "charge" && !isEditing && canTouchTransform();
        const specialReady = key === "special" && canUseSpecial(player.ki, player.maxKi) && world.beamActive <= 0;
        const transformDim = key === "special" && !specialReady && !isEditing;
        const highlight = isSelected || transformReady || specialReady;
        const centerX = btnRect.x + btnRect.w / 2;
        const centerY = btnRect.y + btnRect.h / 2;
        const radius = Math.min(btnRect.w, btnRect.h) * 0.48;
        const hudPressAmount = isEditing ? 0 : getHudPressAmount(key);
        const hudPressed = hudPressAmount > 0;
        if (hudPressed) applyPressTransform(centerX, centerY, 1 - 0.14 * hudPressAmount, 2 * hudPressAmount);

        ctx.globalAlpha = Math.min(1, btn.opacity) * (transformDim ? 0.55 : 1);
        ctx.fillStyle = highlight ? "rgba(255, 190, 40, 0.2)" : "rgba(5, 22, 48, 0.18)";
        ctx.strokeStyle = highlight ? "rgba(255, 215, 80, 0.95)" : "rgba(94, 225, 255, 0.78)";
        ctx.lineWidth = highlight ? 3 : 2;
        ctx.shadowColor = highlight ? "rgba(255, 190, 40, 0.45)" : "rgba(0, 210, 255, 0.2)";
        ctx.shadowBlur = highlight ? 12 : 7;
        if (hudPressAmount > 0.5) {
            // apertado: o círculo "enche" e perde a sombra, como um botão afundado
            ctx.fillStyle = highlight ? "rgba(255, 190, 40, 0.45)" : "rgba(94, 225, 255, 0.38)";
            ctx.shadowBlur = 0;
        }
        const sprite = getHudButtonSprite(transformReady ? "transform" : key, radius, highlight, hudPressAmount > 0.5);
        if (sprite) {
            ctx.shadowBlur = 0;
            ctx.globalAlpha = Math.max(ctx.globalAlpha, transformDim ? 0.5 : 0.92);   // nítido, nunca apagado
            ctx.drawImage(sprite, centerX - sprite.lado / 2, centerY - sprite.lado / 2, sprite.lado, sprite.lado);
        } else {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = highlight ? "#fff1a8" : "#e8fbff";
            ctx.font = "bold 8px 'Trebuchet MS', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(transformReady ? "TRANSF." : (hudLabels[key] || key.toUpperCase()), centerX, centerY + 1);
        }
        if (hudPressed) ctx.restore();
    }
    ctx.restore();
    ctx.textBaseline = "alphabetic";
}

// ==================== LOOP PRINCIPAL DE RENDERIZAÇÃO E JOGO ====================
let coveringModals = null;
function isModalCoveringScreen() {
    if (!coveringModals) coveringModals = ["modal-editor", "modal-updates", "modal-alert"].map(id => document.getElementById(id)).filter(Boolean);
    return coveringModals.some(m => m.style.display === "flex");
}

function render() {
    let now = performance.now();
    deltaTime = Math.min((now - lastFrameTime) / 1000, 0.1);
    runDueButtonActions();
    runBackgroundWork();
    lastFrameTime = now;

    // Janela (editor, novidades, alerta) cobrindo a tela fora da luta: não redesenha o jogo escondido atrás
    // dela — no celular isso deixava a rolagem e os toques do editor travados.
    if (gameState !== "playing" && isModalCoveringScreen()) {
        pollGamepadMenu(deltaTime);   // o controle continua funcionando nas janelas (avisos, UPDATES, editor)
        requestAnimationFrame(render);
        return;
    }

    // alvos de menu do quadro anterior (usados pela navegação com controle); o quadro atual recomeça vazio
    menuTargetsPrev = menuTargets;
    menuTargets = [];
    pollGamepadMenu(deltaTime);
    pollControlsTestExit();

    applyRenderTransform();   // base do quadro: escala da resolução real (sem tremor/rotação sobrando)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (shakeTime > 0) {
        shakeTime -= deltaTime * 60;
        let offsetX = (Math.random() - 0.5) * shakeIntensity;
        let offsetY = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(offsetX, offsetY);
    }

    if (gameState === "tutorial" || (gameState === "paused" && pausedFromTutorial)) {
        pollGamepads(deltaTime);
        if (gameState === "tutorial") {
            updateTutorial(deltaTime);
            gameplayClock += deltaTime;
        }
        drawTutorialScreen();
        if (gameState === "paused") drawPauseOverlay();
    }
    else if (gameState === "playing" || gameState === "paused" || gameState === "gameover") {
        pollGamepads(deltaTime);
        update(deltaTime);
        if (gameState === "playing") gameplayClock += deltaTime;

        drawStageBackground();
        drawSaibamans();
        drawPickups();

        world.auraParticles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(1, p.size * 0.35);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y + p.size);
            ctx.lineTo(p.x + p.vx * 2, p.y - p.size * 1.8);
            ctx.stroke();
            ctx.restore();
        });

        drawPlayerEntity(player, characterDB[selectedCharacter], false);
        drawGrabbingSaibamans();
        drawSaibamanBlasts();   // explosão por cima do herói
        drawPlayerEntity(player2, characterDB[selectedBoss], true);

        drawObstacles();
        drawSpecialBeams();
        drawScreenFlash();

        world.impactParticles.forEach(ip => {
            ctx.save();
            ctx.globalAlpha = ip.alpha;
            ctx.fillStyle = ip.color;
            ctx.fillRect(ip.x, ip.y, ip.size, ip.size);
            ctx.restore();
        });

        drawHUD();
        drawTouchHUD();

        if (gameState === "paused") {
            drawPauseOverlay();
        } else if (gameState === "gameover") {
            const gs = gameOverStats || { stageName: "", score, attacks: 0, parries: 0, hitsReceived: 0, items: { senzu: 0, capsule: 0, cloud: 0, staff: 0 }, isNewStageRecord: false, isNewGeneralRecord: false };

            ctx.fillStyle = "rgba(0,0,0,0.88)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = "center";
            ctx.font = "bold 22px 'Courier New', monospace";
            if (gs.versusWinner) {
                // VERSUS: quem venceu a partida (melhor de 3) e o placar final
                ctx.fillStyle = gs.versusWinner === "p1" ? "#00e5ff" : "#ff0055";
                ctx.fillText(`JOGADOR ${gs.versusWinner === "p1" ? 1 : 2} VENCEU!`, canvas.width / 2, 30);
                ctx.fillStyle = "#ffd23f";
                ctx.font = "bold 12px 'Courier New', monospace";
                ctx.fillText(`PLACAR FINAL: ${gs.versusScore.p1} x ${gs.versusScore.p2}  (ESTATÍSTICAS DO JOGADOR 1)`, canvas.width / 2, 46);
            } else {
                ctx.fillStyle = "#ff0055";
                ctx.fillText("VOCÊ FOI DERROTADO!", canvas.width / 2, 30);
            }
            if (gs.stageName) {
                ctx.fillStyle = "#9fb3d8";
                ctx.font = "11px 'Courier New', monospace";
                ctx.fillText(gs.stageName, canvas.width / 2, 46);
            }

            // mesmo sem dominar a fase, mostra o que foi feito na tentativa — igual ao quadro de vitória.
            const panelX = canvas.width / 2 - 220, panelY = 56, panelW = 440, panelH = 150;
            ctx.fillStyle = "rgba(15, 15, 28, 0.9)";
            ctx.fillRect(panelX, panelY, panelW, panelH);
            ctx.strokeStyle = "#5a2a3a";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(panelX, panelY, panelW, panelH);

            ctx.textAlign = "left";
            ctx.font = "11px 'Courier New', monospace";
            const leftX = panelX + 20, rightX = panelX + panelW / 2 + 10;
            const rows = [["PONTUAÇÃO", gs.score], ["ATAQUES FEITOS", gs.attacks], ["REBATIDAS (PARRY)", gs.parries], ["GOLPES RECEBIDOS", gs.hitsReceived]];
            ctx.fillStyle = "#dbe6ff";
            rows.forEach(([label, value], i) => {
                ctx.fillText(`${label}:`, leftX, panelY + 22 + i * 20);
                ctx.textAlign = "right";
                ctx.fillStyle = "#ffd23f";
                ctx.fillText(String(value), leftX + 190, panelY + 22 + i * 20);
                ctx.textAlign = "left";
                ctx.fillStyle = "#dbe6ff";
            });

            ctx.fillStyle = "#93c5fd";
            ctx.font = "bold 10px 'Courier New', monospace";
            ctx.fillText("ITENS COLETADOS:", rightX, panelY + 22);
            const itemLabels = [["senzu", "FEIJÃO MÁGICO"], ["capsule", "ESCUDO"], ["cloud", "NUVEM VOADORA"], ["staff", "BASTÃO MÁGICO"]];
            ctx.font = "11px 'Courier New', monospace";
            itemLabels.forEach(([key, label], i) => {
                ctx.fillStyle = "#dbe6ff";
                ctx.fillText(`${label}:`, rightX, panelY + 46 + i * 20);
                ctx.textAlign = "right";
                ctx.fillStyle = "#a7f3d0";
                ctx.fillText(String(gs.items[key] || 0), rightX + 190, panelY + 46 + i * 20);
                ctx.textAlign = "left";
            });

            ctx.textAlign = "center";
            if (gs.isNewStageRecord || gs.isNewGeneralRecord) {
                ctx.fillStyle = "#ffd23f";
                ctx.font = "bold 13px 'Trebuchet MS', sans-serif";
                const label = gs.isNewGeneralRecord ? "NOVO RECORDE GERAL!" : "NOVO RECORDE DA FASE!";
                ctx.fillText(label, canvas.width / 2, panelY + panelH + 22);
            }
            ctx.fillStyle = "#ffffff";
            ctx.font = "12px 'Courier New', monospace";
            ctx.fillText(gameMode === "singleplayer" ? "TOQUE OU CLIQUE PARA VOLTAR AO MAPA DE FASES" : "TOQUE OU CLIQUE PARA VOLTAR AO MENU", canvas.width / 2, panelY + panelH + 40);
        }
    } 
    else if (gameState === "menu") {
        drawDragonBallMenuBackdrop(true);

        drawDragonBallPanel(150, 35, 500, 270, "SAIYAN FIGHT", "A BATALHA COMEÇA AGORA");

        drawBtnAt(MENU_LAYOUT.main.play, "JOGAR", "#fff0a6");
        drawBtnAt(MENU_LAYOUT.main.characters, "PERSONAGENS", "#fff0a6");
        drawBtnAt(MENU_LAYOUT.main.stages, "ARENAS", "#fff0a6");
        drawBtnAt(MENU_LAYOUT.main.options, "OPÇÕES", "#fff0a6");
        drawBtnAt(MENU_LAYOUT.main.ranking, "RANKING", "#fff0a6");
        drawBtnAt(MENU_LAYOUT.main.database, "DATABASE", "#fff0a6");
        drawBtnAt(MENU_LAYOUT.main.achievements, "CONQUISTAS", "#fff0a6");
        drawBtnAt(MENU_LAYOUT.main.tutorial, "TUTORIAL", "#fff0a6");

        drawBtnAt(MENU_LAYOUT.main.updates, "UPDATES", "#fbbf24", "bold 10px 'Segoe UI', sans-serif");
    }
    else if (gameState === "mode_select") {
        drawDragonBallMenuBackdrop(false);

        drawDragonBallPanel(120, 60, 560, 230, "ESCOLHA SEU CAMINHO", "PARTIDA RÁPIDA OU LOCAL");

        drawBtnAt(MENU_LAYOUT.modeSelect.single, "SINGLEPLAYER", "#7dd3fc");
        drawBtnAt(MENU_LAYOUT.modeSelect.coop, "VERSUS (2 JOGADORES)", "#a78bfa");
        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "characters") {
        drawDragonBallMenuBackdrop(false);
        ctx.fillStyle = "rgba(2, 10, 29, 0.68)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#fff0a6";
        ctx.font = "bold 18px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SELEÇÃO DE PERSONAGEM", canvas.width / 2, 25);

        // VERSUS: cada jogador escolhe qualquer personagem (as abas viram JOGADOR 1 / JOGADOR 2, com a lista inteira)
        const versus = gameMode === "coop";
        drawBtnAt(MENU_LAYOUT.characters.tabHeroes, versus ? "JOGADOR 1" : "HERÓIS", currentTab === "HERÓIS" ? "#ffff00" : "#00ffff");
        drawBtnAt(MENU_LAYOUT.characters.tabVillains, versus ? "JOGADOR 2" : "VILÕES", currentTab === "VILÕES" ? "#ffff00" : "#00ffff");

        let chars = getFilteredCharacters();
        setCharactersScroll(charactersScrollY);   // mantém dentro do limite (ex.: depois de apagar personagens)
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, CHARACTERS_GRID_TOP - 6, canvas.width, canvas.height - (CHARACTERS_GRID_TOP - 6));
        ctx.clip();
        chars.forEach((key, i) => {
            const card = getCharacterCardRect(i), cx = card.x, cy = card.y;
            // fora da área visível: só registra o alvo (o controle consegue ir até ele e a lista rola sozinha)
            if (cy + card.h < CHARACTERS_GRID_TOP - 6 || cy > canvas.height) { registerMenuTarget(cx, cy, card.w, card.h); return; }

            let isSel = (currentTab === "HERÓIS" && selectedCharacter === key) || (currentTab === "VILÕES" && selectedBoss === key);

            registerMenuTarget(cx, cy, UI.GRID_CARD_WIDTH, UI.GRID_CARD_HEIGHT);
            const pressed = beginButtonPress(cx, cy, UI.GRID_CARD_WIDTH, UI.GRID_CARD_HEIGHT);
            ctx.fillStyle = isSel ? "#174f78" : "rgba(6, 23, 52, 0.9)";
            ctx.fillRect(cx, cy, UI.GRID_CARD_WIDTH, UI.GRID_CARD_HEIGHT);
            ctx.strokeStyle = isSel ? "#ffd23f" : "#e85d04";
            ctx.lineWidth = isSel ? 3 : 1;
            ctx.strokeRect(cx, cy, UI.GRID_CARD_WIDTH, UI.GRID_CARD_HEIGHT);

            let cItem = characterDB[key];
            if (!drawCharacterPortrait(cItem, cx + 6, cy + 4, UI.GRID_CARD_WIDTH - 12, 64)) {
                ctx.fillStyle = "#0b1d37";
                ctx.fillRect(cx + 48, cy + 10, 40, 40);
                ctx.strokeStyle = "#f2a900";
                ctx.strokeRect(cx + 48, cy + 10, 40, 40);
            }

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(cItem ? cItem.name : key, cx + UI.GRID_CARD_WIDTH / 2, cy + 82);
            endButtonPress(pressed);
        });
        ctx.restore();

        const maxScroll = getCharactersMaxScroll();
        if (maxScroll > 0) {
            // barra de rolagem à direita, mostrando que tem mais personagens para baixo
            const trackY = CHARACTERS_GRID_TOP, trackH = canvas.height - CHARACTERS_GRID_TOP - 8;
            const thumbH = Math.max(24, trackH * trackH / (trackH + maxScroll));
            const thumbY = trackY + (trackH - thumbH) * (charactersScrollY / maxScroll);
            ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
            ctx.fillRect(canvas.width - 14, trackY, 5, trackH);
            ctx.fillStyle = "#e85d04";
            ctx.fillRect(canvas.width - 14, thumbY, 5, thumbH);
        }

        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "stages") {
        prepareNextStageCardThumb();   // antes do fundo: a foto da fase é tirada desenhando o cenário dela
        drawStageBackground();
        ctx.fillStyle = "rgba(9, 9, 21, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffff00";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SELEÇÃO DE ARENAS — CRONOLOGIA DBZ", canvas.width / 2, 26);
        ctx.fillStyle = "#9fb3d8";
        ctx.font = "10px monospace";
        ctx.fillText("COMPLETE O MODO NORMAL (5 ONDAS) PRA LIBERAR A PRÓXIMA FASE", canvas.width / 2, 42);

        STAGE_PROGRESSION.forEach((stg, i) => {
            const card = getStageCardRect(i), sx = card.x, sy = card.y, cw = STAGE_CARD_W, ch = STAGE_CARD_H;
            const unlocked = isStageUnlockedByProgress(stg.id, stageProgress);
            const tema = STAGE_THEME_COLOR[stg.id] || "#00ffff";

            registerMenuTarget(sx, sy, cw, ch);
            const pressed = beginButtonPress(sx, sy, cw, ch);
            const isSel = selectedStage === stg.id && unlocked;

            // foto do cenário da fase (colorida se liberada, cinza e escura se bloqueada)
            ctx.save();
            roundRectPath(sx, sy, cw, ch, 8);
            ctx.clip();
            const thumb = stageCardThumbs[stg.id];
            if (thumb) ctx.drawImage(unlocked ? thumb.cor : thumb.cinza, sx, sy, cw, ch);
            else { ctx.fillStyle = unlocked ? "#111125" : "#0a0a12"; ctx.fillRect(sx, sy, cw, ch); }
            // faixa escura embaixo para o nome ficar legível
            const faixa = ctx.createLinearGradient(0, sy + ch * 0.45, 0, sy + ch);
            faixa.addColorStop(0, "rgba(0, 0, 0, 0)");
            faixa.addColorStop(1, "rgba(0, 0, 0, 0.85)");
            ctx.fillStyle = faixa;
            ctx.fillRect(sx, sy, cw, ch);
            if (!unlocked) { ctx.fillStyle = "rgba(5, 5, 12, 0.35)"; ctx.fillRect(sx, sy, cw, ch); }
            ctx.restore();

            // borda: amarela na escolhida, cor da fase nas liberadas, cinza nas bloqueadas
            roundRectPath(sx, sy, cw, ch, 8);
            ctx.strokeStyle = isSel ? "#ffff00" : unlocked ? tema : "#3a3a48";
            ctx.lineWidth = isSel ? 3 : unlocked ? 1.5 : 1;
            ctx.stroke();

            // etiqueta FASE N
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            roundRectPath(sx + 6, sy + 6, 46, 15, 7);
            ctx.fill();
            ctx.font = "bold 8px monospace";
            ctx.fillStyle = unlocked ? tema : "#8892a8";
            ctx.textAlign = "center";
            ctx.fillText(`FASE ${i + 1}`, sx + 29, sy + 16);

            ctx.textAlign = "center";
            ctx.font = "bold 10px monospace";
            ctx.shadowColor = "#000000";
            ctx.shadowBlur = 4;
            if (unlocked) {
                ctx.fillStyle = "#ffffff";
                ctx.fillText(stg.name, sx + cw / 2, sy + ch - 10, cw - 10);
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = "#aab2c4";
                ctx.fillText(stg.name, sx + cw / 2, sy + ch - 10, cw - 10);
                ctx.shadowBlur = 0;
                // Cadeado desenhado com formas básicas, sem depender de fonte com emoji.
                drawPadlock(sx + cw / 2, sy + 36, 9);
                ctx.fillStyle = "#cbd5e1";
                ctx.font = "bold 8px monospace";
                ctx.fillText("BLOQUEADA", sx + cw / 2, sy + 62);
            }
            endButtonPress(pressed);
        });

        if (stageLockedHintTimer > 0) {
            stageLockedHintTimer -= deltaTime * 60;
            ctx.fillStyle = "#ff5555";
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "center";
            ctx.fillText(stageLockedHintText, canvas.width / 2, canvas.height - 14);
        }

        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "options_main") {
        drawDragonBallMenuBackdrop(false);

        drawDragonBallPanel(180, 30, 440, 300, "OPÇÕES DO JOGO", "CONFIGURAÇÕES DA PARTIDA");

        drawBtnAt(MENU_LAYOUT.optionsMain.controls, "CONTROLES", "#7dd3fc");
        drawBtnAt(MENU_LAYOUT.optionsMain.audio, "CONFIGURAÇÃO DE ÁUDIO", "#c4b5fd");
        drawBtnAt(MENU_LAYOUT.optionsMain.cast, transmissaoTV ? "PARAR TRANSMISSÃO PARA A TV" : "TRANSMITIR PARA A TV", transmissaoTV ? "#fca5a5" : "#86efac");

        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "options_controls") {
        drawDragonBallMenuBackdrop(false);
        drawDragonBallPanel(120, 50, 560, 270, "CONTROLES", "SELEÇÃO DE ENTRADA");

        // 2 linhas abaixo do subtítulo (que fica em y+54) — antes o 1º botão (y=100) cobria a escrita.
        drawBtnAt(MENU_LAYOUT.optionsControls.pc, "CONTROLES PC", "#7dd3fc");
        drawBtnAt(MENU_LAYOUT.optionsControls.touch, "CONTROLES TOUCH", "#93c5fd");
        drawBtnAt(MENU_LAYOUT.optionsControls.gamepad, "CONTROLE JOYSTICK", "#c4b5fd");
        drawBtnAt(MENU_LAYOUT.optionsControls.test, "TESTAR CONTROLES", "#a7f3d0");
        // chaves ON/OFF: no AUTOMÁTICO, a chave da entrada em uso acende sozinha (controle, toque ou PC)
        const ativo = getEffectiveControlMode(), auto = controlSelectionMode === "auto";
        const cores = { auto: "#22c55e", pc: "#7dd3fc", touch: "#93c5fd", joystick: "#c4b5fd" };
        MENU_LAYOUT.optionsControls.toggles.forEach(t => {
            drawModeToggle(t, t.key === "auto" ? auto : ativo === t.key, cores[t.key]);
        });

        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "options_pc") {
        drawDragonBallMenuBackdrop(false);

        drawDragonBallPanel(90, 15, 620, 333, "CONTROLES PC");
        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");

        const profileName = activeControlProfile === "p2" ? "CONTROLE 2" : "CONTROLE 1";
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 18px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(profileName, 400, 68);

        drawBtnAt(MENU_LAYOUT.optionsPc.profileP1, "CONTROLE 1", activeControlProfile === "p1" ? "#fbbf24" : "#7dd3fc");
        drawBtnAt(MENU_LAYOUT.optionsPc.profileP2, "CONTROLE 2", activeControlProfile === "p2" ? "#fbbf24" : "#7dd3fc");

        drawBtnAt(MENU_LAYOUT.optionsPc.keyboard, "MODO TECLADO", pcInputMode === "keyboard" ? "#fbbf24" : "#7dd3fc", "10px monospace");
        drawBtnAt(MENU_LAYOUT.optionsPc.mouse, "MODO MOUSE", pcInputMode === "mouse" ? "#fbbf24" : "#7dd3fc", "10px monospace");


        const profileKey = activeControlProfile || "p1";
        let acts = ["up", "down", "left", "right", "attack", "charge", "transform", "parry", "special"];
        const actionLabels = {
            up: "CIMA",
            down: "BAIXO",
            left: "ESQUERDA",
            right: "DIREITA",
            attack: "ATAQUE",
            charge: "CARREGAR",
            transform: "TRANSFORMAR",
            parry: "PARRY",
            special: "ESPECIAL"
        };
        acts.forEach((act, idx) => {
            const keyRect = getPcKeyRect(idx), ry = keyRect.y;
            const lx = idx % 2 === 0 ? 125 : 405;

            ctx.fillStyle = "#ffffff";
            ctx.font = "12px monospace";
            ctx.textAlign = "left";
            ctx.fillText(`${actionLabels[act]}:`, lx, ry + 16);

            drawBtnAt(keyRect, getBindingDisplayName(keyBindings[profileKey][act] || "NONE"), "#00ffff", "10px monospace");
        });

    }
    else if (gameState === "controls_test") {
        drawControlsTest();
    }
    else if (gameState === "options_gamepad") {
        drawGamepadOptions();
    }
    else if (gameState === "options_touch") {
        drawDragonBallMenuBackdrop(false);

        drawDragonBallPanel(120, 40, 560, 290, "CONFIGURAÇÃO TOUCH / MOBILE", "CONTROLES MÓVEIS");

        drawBtnAt(MENU_LAYOUT.optionsTouch.analog, "ANALÓGICO", touchControlMode === "analog" ? "#fbbf24" : "#7dd3fc");
        drawBtnAt(MENU_LAYOUT.optionsTouch.swipe, "DESLIZAR", touchControlMode === "swipe" ? "#fbbf24" : "#7dd3fc");

        drawBtnAt(MENU_LAYOUT.optionsTouch.doubleTap, `DUPLO TOQUE PARRY: ${mobileDoubleTapParry ? "ATIVADO" : "DESATIVADO"}`, mobileDoubleTapParry ? "#a7f3d0" : "#fca5a5");
        drawBtnAt(MENU_LAYOUT.optionsTouch.vibration, `VIBRAÇÃO: ${vibrationEnabled ? "ATIVADA" : "DESATIVADA"}`, vibrationEnabled ? "#a7f3d0" : "#fca5a5");
        drawBtnAt(MENU_LAYOUT.optionsTouch.autoFire, `TIRO CONTÍNUO (DEDO NO ANALÓGICO): ${touchAutoFire ? "ATIVADO" : "DESATIVADO"}`, touchAutoFire ? "#a7f3d0" : "#fca5a5", "bold 11px 'Courier New', monospace");
        drawBtnAt(MENU_LAYOUT.optionsTouch.hud, "REORGANIZAR BOTÕES HUD", "#c4b5fd");

        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "options_hud") {
        drawStageBackground();
        ctx.fillStyle = "rgba(3, 10, 25, 0.58)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawTouchHUD();

        drawBtnAt(MENU_LAYOUT.optionsHud.save, "SALVAR", "#00ff55");
        drawBtnAt(MENU_LAYOUT.optionsHud.reset, "VOLTAR AO PADRÃO", "#ff0055", "bold 9px 'Courier New', monospace");

        ctx.fillStyle = "#ffff00";
        ctx.font = "12px monospace";
        ctx.textAlign = "center";
        ctx.fillText("ARRASTE OS BOTÕES PARA O LUGAR DESEJADO", canvas.width / 2, 35);
        drawHudEditorBar();
    }
    else if (gameState === "options_audio") {
        drawDragonBallMenuBackdrop(false);

        drawDragonBallPanel(150, 50, 500, 260, "VOLUME E ÁUDIO", "Ajuste do som geral");

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "14px 'Segoe UI', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`VOLUME SFX: ${Math.round(sfxVolume * 100)}%`, 210, 125);
        drawBtnAt(MENU_LAYOUT.optionsAudio.sfxMinus, "-", "#fca5a5");
        drawBtnAt(MENU_LAYOUT.optionsAudio.sfxPlus, "+", "#86efac");

        ctx.fillText(`VOLUME BGM: ${Math.round(bgmVolume * 100)}%`, 210, 180);
        drawBtnAt(MENU_LAYOUT.optionsAudio.bgmMinus, "-", "#fca5a5");
        drawBtnAt(MENU_LAYOUT.optionsAudio.bgmPlus, "+", "#86efac");

        drawBtnAt(MENU_LAYOUT.optionsAudio.mute, isMuted ? "ÁUDIO: MUTADO" : "ÁUDIO: ATIVADO", isMuted ? "#fca5a5" : "#86efac");
        drawBtnAt(MENU_LAYOUT.optionsAudio.tracks, "♪ TRILHAS SONORAS", "#fde68a");

        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "options_tracks") {
        drawDragonBallMenuBackdrop(false);
        drawDragonBallPanel(70, 46, 660, 280, "TRILHAS SONORAS", "Toque para ouvir a música de cada fase");
        getBgmTrackList().forEach((t, i) => {
            const row = getTrackRowRect(i);
            const tocando = bgmPreviewEra === t.era;
            ctx.fillStyle = tocando ? "rgba(253, 230, 138, 0.18)" : "rgba(15, 23, 42, 0.55)";
            ctx.fillRect(row.x, row.y, row.w, row.h);
            ctx.strokeStyle = tocando ? "#fde68a" : "rgba(148, 163, 184, 0.4)";
            ctx.lineWidth = tocando ? 2 : 1;
            ctx.strokeRect(row.x, row.y, row.w, row.h);
            ctx.textAlign = "left";
            ctx.fillStyle = tocando ? "#fde68a" : "#e2e8f0";
            ctx.font = "bold 12px 'Segoe UI', sans-serif";
            ctx.fillText((tocando ? "♪ " : "") + t.nome, row.x + 10, row.y + 18, row.w - 108);
            ctx.fillStyle = "#94a3b8";
            ctx.font = "10px 'Segoe UI', sans-serif";
            ctx.fillText("Fase " + (i + 1) + ": " + t.fases, row.x + 10, row.y + 34, row.w - 108);
            drawBtnAt(getTrackPlayRect(i), tocando ? "❚❚ PAUSAR" : "▶ TOCAR", tocando ? "#fca5a5" : "#86efac");
        });
        if (isMuted || bgmVolume <= 0) {
            ctx.textAlign = "center";
            ctx.fillStyle = "#fca5a5";
            ctx.font = "12px 'Segoe UI', sans-serif";
            ctx.fillText(isMuted ? "O áudio está mutado: ative em VOLUME E ÁUDIO para ouvir" : "O volume BGM está em 0%: aumente para ouvir", canvas.width / 2, 320);
        }
        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "ranking") {
        prepareNextStageCardThumb();   // fotos das fases para os ícones das abas
        drawStageBackground();
        ctx.fillStyle = "rgba(9, 9, 21, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffff00";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "center";
        ctx.fillText("MELHORES PONTUAÇÕES", canvas.width / 2, 30);

        registerMenuTarget(MENU_LAYOUT.ranking.tabGeneral.x, MENU_LAYOUT.ranking.tabGeneral.y, MENU_LAYOUT.ranking.tabGeneral.w, MENU_LAYOUT.ranking.tabGeneral.h);
        registerMenuTarget(MENU_LAYOUT.ranking.tabStage.x, MENU_LAYOUT.ranking.tabStage.y, MENU_LAYOUT.ranking.tabStage.w, MENU_LAYOUT.ranking.tabStage.h);
        drawBtnAt(MENU_LAYOUT.ranking.tabGeneral, "GERAL", rankingViewMode === "geral" ? "#ffff00" : "#93c5fd");
        drawBtnAt(MENU_LAYOUT.ranking.tabStage, "POR FASE", rankingViewMode === "fase" ? "#ffff00" : "#93c5fd");

        // drawBtn (GERAL/POR FASE acima) sempre deixa o alinhamento em "esquerda" depois de desenhar — sem
        // reafirmar "center" aqui, a lista de pontuação saía alinhada à esquerda a partir do meio da tela.
        ctx.textAlign = "center";

        if (rankingViewMode === "geral") {
            let ranking = readJsonStorage("saiyan_ranking", []);
            if (!Array.isArray(ranking)) ranking = [];
            if (ranking.length === 0) {
                ctx.fillStyle = "#ffffff";
                ctx.font = "14px monospace";
                ctx.fillText("NENHUMA PONTUAÇÃO REGISTRADA AINDA!", canvas.width / 2, 170);
            } else {
                ranking.forEach((rk, idx) => {
                    ctx.fillStyle = idx === 0 ? "#ffff00" : "#ffffff";
                    ctx.font = "14px monospace";
                    ctx.fillText(`${idx + 1}. SCORE: ${rk.score}  -  DATA: ${rk.date}`, canvas.width / 2, 130 + idx * 32);
                });
            }
        } else {
            if (!rankingSelectedStage) rankingSelectedStage = STAGE_PROGRESSION[0].id;
            // fileira de mini-ícones das 8 arenas pra escolher qual ranking ver
            STAGE_PROGRESSION.forEach((stg, i) => {
                const tab = getRankingStageTabRect(i), px = tab.x, py = tab.y;
                registerMenuTarget(px, py, tab.w, tab.h);
                const pressed = beginButtonPress(px, py, tab.w, tab.h);
                const isSel = rankingSelectedStage === stg.id;
                ctx.fillStyle = isSel ? "rgba(255,255,0,0.18)" : "rgba(255,255,255,0.06)";
                ctx.fillRect(px, py, 84, 30);
                ctx.strokeStyle = isSel ? "#ffff00" : "#3a3a48";
                ctx.lineWidth = isSel ? 2 : 1;
                ctx.strokeRect(px, py, 84, 30);
                drawStageNodeIcon(px + 15, py + 15, 11, stg.id);
                ctx.fillStyle = isSel ? "#ffff00" : "#cbd5e1";
                ctx.font = "bold 8px monospace";
                ctx.textAlign = "left";
                ctx.fillText(stg.name.slice(0, 12), px + 30, py + 18, 50);
                endButtonPress(pressed);
            });

            const stageInfo = STAGE_PROGRESSION.find(s => s.id === rankingSelectedStage);
            ctx.textAlign = "center";
            ctx.fillStyle = "#93c5fd";
            ctx.font = "bold 13px monospace";
            ctx.fillText(stageInfo ? stageInfo.name : "", canvas.width / 2, 148);

            const list = getStageRankingList(rankingSelectedStage);
            if (list.length === 0) {
                ctx.fillStyle = "#ffffff";
                ctx.font = "13px monospace";
                ctx.fillText("NENHUMA PONTUAÇÃO NESSA ARENA AINDA!", canvas.width / 2, 190);
            } else {
                list.forEach((rk, idx) => {
                    ctx.fillStyle = idx === 0 ? "#ffff00" : "#ffffff";
                    ctx.font = "13px monospace";
                    ctx.fillText(`${idx + 1}. SCORE: ${rk.score}  -  DATA: ${rk.date}`, canvas.width / 2, 175 + idx * 28);
                });
            }
        }

        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "achievements") {
        drawStageBackground();
        ctx.fillStyle = "rgba(9, 9, 21, 0.9)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const layout = getAchievementsLayoutMetrics();
        const keys = Object.keys(achievements);
        const tierProgress = getAchievementTierProgress();
        const maxScroll = getAchievementsMaxScroll(layout);
        achievementsScrollY = Math.max(0, Math.min(achievementsScrollY, maxScroll));

        ctx.fillStyle = "#ffff00";
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";
        ctx.fillText("CONQUISTAS", canvas.width / 2, 18);

        // Card resumo centralizado: quantas medalhas de cada tipo já foram pegas, e o total geral.
        const cardW = Math.min(460, canvas.width - 48), cardH = 46;
        const cardX = (canvas.width - cardW) / 2, cardY = 26;
        ctx.fillStyle = "rgba(15, 15, 24, 0.9)";
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.strokeStyle = "#4a4a5a";
        ctx.lineWidth = 1;
        ctx.strokeRect(cardX, cardY, cardW, cardH);

        const medalSlots = [
            ["diamond", "DIAMANTE", TIER_COLORS.diamond],
            ["gold", "OURO", TIER_COLORS.gold],
            ["silver", "PRATA", TIER_COLORS.silver],
            ["bronze", "BRONZE", TIER_COLORS.bronze]
        ];
        const slotW = cardW / medalSlots.length;
        medalSlots.forEach(([tierKey, label, color], i) => {
            const sx = cardX + slotW * i + slotW / 2;
            drawMedalIcon(sx - 34, cardY + cardH / 2, 9, color);
            ctx.textAlign = "left";
            ctx.fillStyle = color;
            ctx.font = "bold 11px monospace";
            ctx.fillText(label, sx - 20, cardY + 18);
            ctx.fillStyle = "#e8e8f0";
            ctx.font = "bold 13px monospace";
            ctx.fillText(`${tierProgress[tierKey].done}/${tierProgress[tierKey].total}`, sx - 20, cardY + 35);
        });
        ctx.textAlign = "center";
        ctx.fillStyle = "#9fb3d8";
        ctx.font = "9px monospace";
        ctx.fillText(`TOTAL: ${tierProgress.total.done}/${tierProgress.total.total}`, canvas.width / 2, cardY + cardH + 12);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, layout.gridTop, canvas.width, layout.viewportHeight);
        ctx.clip();

        keys.forEach((key, i) => {
            const col = i % layout.columns;
            const row = Math.floor(i / layout.columns);
            const cx = layout.gridLeft + col * (layout.cardWidth + layout.gapX);
            const cy = layout.gridTop + row * (layout.cardHeight + layout.gapY) - achievementsScrollY;

            if (cy + layout.cardHeight < layout.gridTop - 4 || cy > layout.gridTop + layout.viewportHeight + 4) return;

            const a = achievements[key];
            const tierColor = TIER_COLORS[a.tier] || TIER_COLORS.bronze;
            registerMenuTarget(cx, Math.max(layout.gridTop, cy), layout.cardWidth, layout.cardHeight);

            // Bloqueada = caixa apagada e cinza; desbloqueada = caixa na cor da medalha (bronze/prata/ouro) com check.
            ctx.fillStyle = a.unlocked ? "rgba(20, 60, 35, 0.9)" : "rgba(30, 30, 38, 0.75)";
            ctx.fillRect(cx, cy, layout.cardWidth, layout.cardHeight);
            ctx.strokeStyle = a.unlocked ? tierColor : "#3a3a46";
            ctx.lineWidth = a.unlocked ? 2 : 1;
            ctx.strokeRect(cx, cy, layout.cardWidth, layout.cardHeight);

            // Selo de medalha no canto (mostra a dificuldade mesmo quando ainda está bloqueada).
            drawMedalIcon(cx + layout.cardWidth - 12, cy + 12, 7, a.unlocked ? tierColor : "#4a4a56");

            const boxX = cx + 8, boxY = cy + layout.cardHeight / 2 - 9, boxS = 18;
            ctx.fillStyle = a.unlocked ? tierColor : "#1a1a22";
            ctx.strokeStyle = a.unlocked ? "#ffffff" : "#555560";
            ctx.lineWidth = 1.5;
            ctx.fillRect(boxX, boxY, boxS, boxS);
            ctx.strokeRect(boxX, boxY, boxS, boxS);
            if (a.unlocked) {
                ctx.strokeStyle = "#132018";
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(boxX + 3.5, boxY + 9.5);
                ctx.lineTo(boxX + 7.5, boxY + 13.5);
                ctx.lineTo(boxX + 14.5, boxY + 4.5);
                ctx.stroke();
            }

            const textX = boxX + boxS + 8;
            ctx.textAlign = "left";
            ctx.globalAlpha = a.unlocked ? 1 : 0.45;
            ctx.fillStyle = a.unlocked ? "#eafff0" : "#aab0bd";
            ctx.font = "bold 10px monospace";
            ctx.fillText(a.name, textX, cy + 18, layout.cardWidth - boxS - 30);
            ctx.fillStyle = a.unlocked ? "#bfe8cc" : "#8a8f9c";
            ctx.font = "8px monospace";
            ctx.fillText(a.desc, textX, cy + 32, layout.cardWidth - boxS - 20);
            ctx.globalAlpha = 1;
        });
        ctx.restore();

        if (maxScroll > 0) {
            const barX = canvas.width - 12, barY = layout.gridTop, barH = layout.viewportHeight;
            const thumbH = Math.max(20, (layout.viewportHeight / (layout.viewportHeight + maxScroll)) * barH);
            const thumbY = barY + (achievementsScrollY / maxScroll) * (barH - thumbH);
            ctx.fillStyle = "#101018";
            ctx.fillRect(barX, barY, 6, barH);
            ctx.fillStyle = "#86efac";
            ctx.fillRect(barX, thumbY, 6, thumbH);
        }

        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "stage_victory") {
        const stats = stageVictoryStats || { stageName: "", mode: "normal", justUnlockedNext: false, justUnlockedUnlimited: false, score: 0, attacks: 0, parries: 0, hitsReceived: 0, items: { senzu: 0, capsule: 0, cloud: 0, staff: 0 } };

        drawStageBackground();
        ctx.fillStyle = "rgba(6, 10, 24, 0.88)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd23f";
        ctx.font = "bold 20px 'Trebuchet MS', sans-serif";
        ctx.fillText("VITÓRIA!", canvas.width / 2, 34);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 12px 'Trebuchet MS', sans-serif";
        ctx.fillText(stats.stageName, canvas.width / 2, 52);

        // painel central com o resumo da luta
        const panelX = canvas.width / 2 - 220, panelY = 64, panelW = 440, panelH = 160;
        ctx.fillStyle = "rgba(15, 15, 28, 0.9)";
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = "#3a5a8a";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        ctx.textAlign = "left";
        ctx.font = "11px 'Courier New', monospace";
        const leftX = panelX + 20, rightX = panelX + panelW / 2 + 10;
        const rows = [
            ["PONTUAÇÃO", stats.score],
            ["ATAQUES FEITOS", stats.attacks],
            ["REBATIDAS (PARRY)", stats.parries],
            ["GOLPES RECEBIDOS", stats.hitsReceived]
        ];
        ctx.fillStyle = "#dbe6ff";
        rows.forEach(([label, value], i) => {
            ctx.fillText(`${label}:`, leftX, panelY + 24 + i * 20);
            ctx.textAlign = "right";
            ctx.fillStyle = "#ffd23f";
            ctx.fillText(String(value), leftX + 190, panelY + 24 + i * 20);
            ctx.textAlign = "left";
            ctx.fillStyle = "#dbe6ff";
        });

        ctx.fillStyle = "#93c5fd";
        ctx.font = "bold 10px 'Courier New', monospace";
        ctx.fillText("ITENS COLETADOS:", rightX, panelY + 24);
        const itemLabels = [["senzu", "FEIJÃO MÁGICO"], ["capsule", "ESCUDO"], ["cloud", "NUVEM VOADORA"], ["staff", "BASTÃO MÁGICO"]];
        ctx.font = "11px 'Courier New', monospace";
        itemLabels.forEach(([key, label], i) => {
            ctx.fillStyle = "#dbe6ff";
            ctx.fillText(`${label}:`, rightX, panelY + 48 + i * 20);
            ctx.textAlign = "right";
            ctx.fillStyle = "#a7f3d0";
            ctx.fillText(String(stats.items[key] || 0), rightX + 190, panelY + 48 + i * 20);
            ctx.textAlign = "left";
        });

        // resultado: qual modo foi completado, e o que isso acabou de liberar (se liberou algo)
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd23f";
        ctx.font = "bold 13px 'Trebuchet MS', sans-serif";
        const modeLabel = stats.mode === "hard" ? "DIFÍCIL" : stats.mode === "unlimited" ? "SEM LIMITE" : "NORMAL";
        ctx.fillText(`MODO ${modeLabel} CONCLUÍDO!`, canvas.width / 2, panelY + panelH + 22);
        if (stats.justUnlockedNext) {
            ctx.fillStyle = "#86efac";
            ctx.font = "bold 11px 'Trebuchet MS', sans-serif";
            ctx.fillText("PRÓXIMA FASE LIBERADA!", canvas.width / 2, panelY + panelH + 38);
        } else if (stats.justUnlockedUnlimited) {
            ctx.fillStyle = "#86efac";
            ctx.font = "bold 11px 'Trebuchet MS', sans-serif";
            ctx.fillText("MODO SEM LIMITE LIBERADO NESTA FASE!", canvas.width / 2, panelY + panelH + 38);
        }

        const continueRect = MENU_LAYOUT.stageVictory.continue;
        registerMenuTarget(continueRect.x, continueRect.y, continueRect.w, continueRect.h);
        drawBtnAt(continueRect, "CONTINUAR", "#86efac", "bold 12px 'Courier New', monospace");
    }
    else if (gameState === "stage_map") {
        prepareNextStageCardThumb();   // fotos das fases para os círculos (uma por quadro, antes de pintar a tela)
        ctx.fillStyle = "#0a1024";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // um "céu estrelado" simples de fundo, só pra não ficar um bloco de cor sólida
        for (let i = 0; i < 40; i++) {
            const sx = (i * 137) % canvas.width, sy = (i * 71) % canvas.height;
            ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 4) * 0.08})`;
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        ctx.fillStyle = "#ffff00";
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";
        ctx.fillText("ESCOLHA A FASE", canvas.width / 2, 24);
        ctx.fillStyle = "#9fb3d8";
        ctx.font = "9px monospace";
        ctx.fillText("COMPLETE O MODO NORMAL (5 ONDAS) PRA LIBERAR A PRÓXIMA FASE", canvas.width / 2, 38);

        const nodes = getStageMapNodes();

        // Acabou de vencer o NORMAL e liberar a próxima fase: toca a animação do cadeado abrindo, uma vez só.
        if (stageVictoryStats && stageVictoryStats.justUnlockedNext && !stageVictoryStats.unlockAnimShown) {
            stageVictoryStats.unlockAnimShown = true;
            const idx = STAGE_PROGRESSION.findIndex(s => s.id === stageVictoryStats.stageId);
            const next = STAGE_PROGRESSION[idx + 1];
            if (next) {
                stageUnlockAnim = { id: next.id, t: 0 };
                playSound("powerup");
            }
        }
        if (stageUnlockAnim) {
            stageUnlockAnim.t += deltaTime;
            if (stageUnlockAnim.t > 1.5) stageUnlockAnim = null;
        }

        // conectores pontilhados: acende quando a fase de DESTINO (a mais avançada das duas) já está liberada.
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i], b = nodes[i + 1];
            const lit = b.unlocked;
            ctx.save();
            ctx.setLineDash([7, 7]);
            ctx.strokeStyle = lit ? STAGE_THEME_COLOR[b.id] : "#2a2a38";
            ctx.lineWidth = lit ? 3 : 2;
            ctx.globalAlpha = lit ? 0.9 : 0.45;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
        }

        nodes.forEach((node, i) => {
            // com o quadro de modo aberto, os círculos ficam escondidos atrás: não entram na navegação do controle
            if (!stageChoicePendingId) registerMenuTarget(node.x - STAGE_MAP_NODE_R, node.y - STAGE_MAP_NODE_R, STAGE_MAP_NODE_R * 2, STAGE_MAP_NODE_R * 2);
            const pressed = !stageChoicePendingId && beginButtonPress(node.x - STAGE_MAP_NODE_R, node.y - STAGE_MAP_NODE_R, STAGE_MAP_NODE_R * 2, STAGE_MAP_NODE_R * 2);
            const isSel = selectedStage === node.id;
            const theme = STAGE_THEME_COLOR[node.id] || "#8899aa";

            if (node.unlocked) drawStageNodeIcon(node.x, node.y, STAGE_MAP_NODE_R - 3, node.id);
            else drawLockedStageNodeIcon(node.x, node.y, STAGE_MAP_NODE_R - 3, node.id);

            ctx.beginPath();
            ctx.arc(node.x, node.y, STAGE_MAP_NODE_R, 0, Math.PI * 2);
            ctx.strokeStyle = isSel ? "#ffff00" : node.unlocked ? theme : "#3a3a48";
            ctx.lineWidth = isSel ? 4 : node.unlocked ? 3 : 2;
            ctx.stroke();

            if (!node.unlocked) {
                drawPadlock(node.x, node.y - 4, STAGE_MAP_NODE_R * 0.42);
            } else if (stageUnlockAnim && stageUnlockAnim.id === node.id) {
                // fase recém-liberada: espera a tela aparecer, o cadeado abre (0,3-0,8 s) e cai sumindo (0,8-1,5 s)
                const t = stageUnlockAnim.t;
                const open = Math.max(0, Math.min(1, (t - 0.3) / 0.5));
                const fall = Math.max(0, t - 0.8) / 0.7;
                ctx.save();
                ctx.globalAlpha = Math.max(0, 1 - fall);
                ctx.translate(node.x, node.y - 4 + fall * fall * 40);
                ctx.rotate(fall * 0.6);
                drawPadlock(0, 0, STAGE_MAP_NODE_R * 0.42, open);
                ctx.restore();
            }

            ctx.fillStyle = "#0a1024";
            ctx.beginPath();
            ctx.arc(node.x - STAGE_MAP_NODE_R + 3, node.y - STAGE_MAP_NODE_R + 3, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = node.unlocked ? "#ffffff" : "#6a6a78";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText(String(i + 1), node.x - STAGE_MAP_NODE_R + 3, node.y - STAGE_MAP_NODE_R + 6);

            ctx.fillStyle = node.unlocked ? "#dbe6ff" : "#5a5a68";
            ctx.font = "bold 9px monospace";
            ctx.fillText(node.name, node.x, node.y + STAGE_MAP_NODE_R + 12, 110);
            if (node.unlocked) {
                const p = stageProgress[node.id] || {};
                ctx.font = "8px monospace";
                ctx.fillStyle = p.normalDone ? "#ffd23f" : "#a7f3d0";
                ctx.fillText(p.normalDone ? "NORMAL ✓" : "NORMAL: EM ABERTO", node.x, node.y + STAGE_MAP_NODE_R + 23);
                ctx.fillStyle = p.hardDone ? "#ffd23f" : p.normalDone ? "#93c5fd" : "#5a5a68";
                ctx.fillText(p.hardDone ? "DIFÍCIL ✓" : p.normalDone ? "DIFÍCIL: EM ABERTO" : "DIFÍCIL: BLOQUEADO", node.x, node.y + STAGE_MAP_NODE_R + 32);
                if (node.record > 0) {
                    ctx.fillStyle = "#93c5fd";
                    ctx.font = "7px monospace";
                    ctx.fillText(`RECORDE: ONDA ${node.record}`, node.x, node.y + STAGE_MAP_NODE_R + 41);
                }
            }
            endButtonPress(pressed);
        });

        // Overlay: sempre aparece ao clicar numa fase liberada — escolhe o modo: NORMAL (sempre disponível),
        // DIFÍCIL (só depois de completar o normal dessa fase) e SEM LIMITE (só depois dos dois).
        if (stageChoicePendingId) {
            const stg = STAGE_PROGRESSION.find(s => s.id === stageChoicePendingId);
            const canHard = isHardModeUnlocked(stageChoicePendingId, stageProgress);
            const canUnlimited = isUnlimitedModeUnlocked(stageChoicePendingId, stageProgress);

            ctx.fillStyle = "rgba(4, 8, 20, 0.92)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = "center";
            ctx.fillStyle = "#ffd23f";
            ctx.font = "bold 15px 'Trebuchet MS', sans-serif";
            ctx.fillText(stg ? stg.name : "", canvas.width / 2, 100);
            ctx.fillStyle = "#dbe6ff";
            ctx.font = "11px 'Trebuchet MS', sans-serif";
            ctx.fillText("ESCOLHA O MODO", canvas.width / 2, 120);

            drawBtnAt(MENU_LAYOUT.stageMap.normal, "NORMAL (ONDAS 1-5)", "#93c5fd", "bold 10px 'Courier New', monospace");
            drawModeButton(MENU_LAYOUT.stageMap.hard.x, MENU_LAYOUT.stageMap.hard.y, MENU_LAYOUT.stageMap.hard.w, MENU_LAYOUT.stageMap.hard.h, "DIFÍCIL", canHard, "#f87171");
            drawModeButton(MENU_LAYOUT.stageMap.unlimited.x, MENU_LAYOUT.stageMap.unlimited.y, MENU_LAYOUT.stageMap.unlimited.w, MENU_LAYOUT.stageMap.unlimited.h, "SEM LIMITE", canUnlimited, "#86efac");

        }

        if (stageLockedHintTimer > 0) {
            stageLockedHintTimer -= deltaTime * 60;
            ctx.fillStyle = "#ff5555";
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "center";
            ctx.fillText(stageLockedHintText, canvas.width / 2, canvas.height - 10);
        }

        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "database") {
        drawStageBackground();
        ctx.fillStyle = "rgba(9, 9, 21, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const layout = getDatabaseLayoutMetrics();
        let keys = Object.keys(characterDB);
        const { contentHeight, maxScroll } = getDatabaseScrollMetrics(layout);
        characterDatabaseScrollY = Math.max(0, Math.min(characterDatabaseScrollY, maxScroll));

        ctx.fillStyle = "#00ffff";
        ctx.font = "bold 22px 'Courier New', monospace";
        ctx.textAlign = "left";
        ctx.fillText("GERENCIADOR DE PERSONAGENS", layout.titleX, layout.titleY);

        registerMenuTarget(layout.createButtonX, layout.createButtonY, layout.createButtonWidth, 30);
        ctx.fillStyle = "#071a1f";
        ctx.fillRect(layout.createButtonX, layout.createButtonY, layout.createButtonWidth, 30);
        ctx.strokeStyle = "#00ff55";
        ctx.lineWidth = 2;
        ctx.strokeRect(layout.createButtonX, layout.createButtonY, layout.createButtonWidth, 30);
        ctx.fillStyle = "#00ff55";
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("+ CRIAR NOVO", layout.createButtonX + layout.createButtonWidth / 2, layout.createButtonY + 20);

        if (maxScroll > 0) {
            const scrollbarX = canvas.width - 16;
            const scrollbarY = 72;
            const scrollbarH = Math.min(220, canvas.height - 130);
            const thumbH = Math.max(24, (layout.viewportHeight / Math.max(1, contentHeight)) * scrollbarH);
            const thumbY = scrollbarY + (characterDatabaseScrollY / Math.max(1, maxScroll)) * (scrollbarH - thumbH);

            ctx.fillStyle = "#101018";
            ctx.fillRect(scrollbarX, scrollbarY, 8, scrollbarH);
            ctx.fillStyle = "#00ffff";
            ctx.fillRect(scrollbarX, thumbY, 8, thumbH);
        }

        keys.forEach((k, idx) => {
            const row = Math.floor(idx / layout.columns);
            const col = idx % layout.columns;
            const cx = layout.gridLeft + col * (layout.cardWidth + layout.gapX);
            const cy = layout.gridTop + row * (layout.cardHeight + layout.gapY) - characterDatabaseScrollY;

            if (cy + layout.cardHeight < layout.gridTop - 10 || cy > layout.gridTop + layout.viewportHeight + 10) {
                // Fora da área visível: não desenha, mas registra os botões para o controle conseguir chegar
                // até eles (a navegação rola a lista sozinha, ver revealPadFocusInDatabase).
                const hidden = getDatabaseCardGeometry(layout, cx, cy);
                registerMenuTarget(hidden.firstBtnX, hidden.actionY, hidden.btnW, 20);
                registerMenuTarget(hidden.firstBtnX + hidden.btnW + 10, hidden.actionY, hidden.btnW, 20);
                return;
            }

            const cItem = characterDB[k];
            ctx.fillStyle = "#101828";
            ctx.fillRect(cx, cy, layout.cardWidth, layout.cardHeight);
            ctx.strokeStyle = "#00ffff";
            ctx.strokeRect(cx, cy, layout.cardWidth, layout.cardHeight);

            const geo = getDatabaseCardGeometry(layout, cx, cy);

            if (!drawCharacterPortrait(cItem, cx + 6, geo.imageY - 4, layout.cardWidth - 12, geo.imageSize + 6)) {
                ctx.fillStyle = "#1a1a1a";
                ctx.fillRect(geo.imageX, geo.imageY, geo.imageSize, geo.imageSize);
                ctx.strokeStyle = "#00ffff";
                ctx.strokeRect(geo.imageX, geo.imageY, geo.imageSize, geo.imageSize);
            }

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(cItem ? cItem.name : k, cx + layout.cardWidth / 2, geo.nameY);

            drawBtn(geo.firstBtnX, geo.actionY, geo.btnW, 20, "EDITAR", "#00ffff", "8px monospace");
            drawBtn(geo.firstBtnX + geo.btnW + 10, geo.actionY, geo.btnW, 20, "EXCLUIR", "#ff0055", "8px monospace");
        });

        drawBtnAt(MENU_LAYOUT.back, "←", "#e2e8f0", "bold 20px monospace");
    }

    if (achievementBanner.active) {
        // Só anima/conta o tempo enquanto o jogo não está pausado — senão a conquista podia aparecer, deslizar
        // e sumir sozinha até enquanto a partida estava congelada, sem o jogador nem ver direito.
        if (gameState !== "paused") {
            // timer em "quadros a 60 fps": desce rápido (~0,25 s, freando no fim), fica parado e sobe nos últimos 0,5 s
            achievementBanner.timer += deltaTime * 60;
            const t = achievementBanner.timer, endT = achievementBanner.maxTimer - 30;
            achievementBanner.yOffset = t < 15 ? -60 * Math.pow(1 - t / 15, 3) : t > endT ? -2 * (t - endT) : 0;
        }

        drawAchievementBanner();

        if (achievementBanner.timer >= achievementBanner.maxTimer) achievementBanner.active = false;
    }

    drawPadFocus();
    drawFullscreenButton();

    ctx.restore();
    requestAnimationFrame(render);
}

requestAnimationFrame(render);