// ==================== MENU.JS - ARENAS FIDEDIGNAS DBZ, ITENS HD E LOOP PRINCIPAL ====================

function inRect(x, y, rx, ry, rw, rh) {
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

// isTouchDevice agora é declarada em database.js (precisa existir antes do initSettings).
let touchAnalog = { active: false, touchId: null, startX: 0, startY: 0, curX: 0, curY: 0, vx: 0, vy: 0 };
let touchChargeId = null;        // id do dedo que está segurando o botão CARREGAR (null = ninguém)
let lastInputWasTouch = false;   // true quando o último input foi toque (desliga o "seguir mouse")
let lastTouchStartAt = 0;        // usado para ignorar o "mouse fantasma" que o navegador gera logo após um toque
let pseudoFullscreen = false;   // tela cheia "falsa" (CSS) quando o navegador bloqueia a real (ex.: iPhone, iframes)
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
const TIER_COLORS = { gold: "#ffd23f", silver: "#cbd2da", bronze: "#c2793a" };

// ==================== MAPA DE FASES (hub do singleplayer) ====================
// Posições em serpentina (linha de baixo pra cima, esquerda-direita depois direita-esquerda), na MESMA ordem
// de STAGE_PROGRESSION — a fase N sempre se conecta só com a N-1 e a N+1, mantendo a sequência visível.
const STAGE_MAP_POSITIONS = [
    { x: 90, y: 280 }, { x: 260, y: 280 }, { x: 430, y: 280 }, { x: 600, y: 280 },
    { x: 600, y: 110 }, { x: 430, y: 110 }, { x: 260, y: 110 }, { x: 90, y: 110 }
];
const STAGE_MAP_NODE_R = 26;

// Cor "tema" de cada arena, usada no anel do nó e no traço pontilhado até ela.
const STAGE_THEME_COLOR = {
    terra: "#f6b93b", kaio: "#a78bfa", namek: "#4ade80", namek_explosao: "#f87171",
    freeza_ship: "#c084fc", time_room: "#e2e8f0", cell_games: "#38bdf8", kaioshin: "#fbbf24"
};

// Ilustração pequena e simples de cada arena dentro do círculo do nó — não é o cenário completo (custaria caro
// nesse tamanho), só um símbolo que lembra a fase: o suficiente pra reconhecer de relance no mapa.
function drawStageNodeIcon(cx, cy, r, stageId) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    if (stageId === "terra") {
        ctx.fillStyle = "#7ec8f2"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#d9a441"; ctx.fillRect(cx - r, cy + r * 0.3, r * 2, r);
        ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 3; ctx.strokeRect(cx - r * 0.6, cy - r * 0.1, r * 1.2, r * 0.4);
    } else if (stageId === "kaio") {
        ctx.fillStyle = "#2d1b4e"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#c9b6f5"; ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#8a6fd1"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.95, r * 0.3, 0.4, 0, Math.PI * 2); ctx.stroke();
    } else if (stageId === "namek") {
        ctx.fillStyle = "#0f3d2e"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#3fae6a"; ctx.beginPath(); ctx.arc(cx, cy + r * 0.3, r * 0.7, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#1d6b3f"; ctx.fillRect(cx - r * 0.12, cy - r * 0.1, r * 0.24, r * 0.5);
    } else if (stageId === "namek_explosao") {
        ctx.fillStyle = "#5a0e0e"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#ff8a3d"; ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ffe08a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.3); ctx.lineTo(cx, cy); ctx.lineTo(cx - r * 0.2, cy + r * 0.6); ctx.stroke();
    } else if (stageId === "freeza_ship") {
        ctx.fillStyle = "#1a0f2e"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#8a5fd1"; ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.8, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#c9a6f0"; ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.28, 0, Math.PI * 2); ctx.fill();
    } else if (stageId === "time_room") {
        ctx.fillStyle = "#e8e8ef"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#b8b8c8";
        for (let gx = -r; gx < r; gx += r * 0.4) ctx.fillRect(cx + gx, cy - r, 1.2, r * 2);
        for (let gy = -r; gy < r; gy += r * 0.4) ctx.fillRect(cx - r, cy + gy, r * 2, 1.2);
    } else if (stageId === "cell_games") {
        ctx.fillStyle = "#bfe4ff"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#e8e4d8"; ctx.fillRect(cx - r, cy + r * 0.2, r * 2, r);
        ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - r, cy + r * 0.25); ctx.lineTo(cx + r, cy + r * 0.25); ctx.stroke();
    } else if (stageId === "kaioshin") {
        ctx.fillStyle = "#3a2a6a"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#fbbf24";
        const spikes = 5, R1 = r * 0.55, R2 = r * 0.24;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const ang = (Math.PI / spikes) * i - Math.PI / 2, rad = i % 2 === 0 ? R1 : R2;
            const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
    }
    ctx.restore();
}

// Devolve as posições já combinadas com STAGE_PROGRESSION, prontas pra desenhar (id, name, x, y, unlocked, record).
// Botão de modo (DIFÍCIL / SEM LIMITE) no overlay de escolha: desenhado apagado/cinza quando ainda bloqueado,
// sem registrar como alvo clicável — bate com o "difícil estará apagada" pedido.
function drawModeButton(x, y, w, h, label, unlocked, color) {
    if (unlocked) {
        drawBtn(x, y, w, h, label, color, "bold 11px 'Courier New', monospace");
        return;
    }
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
}

function getStageMapNodes() {
    return STAGE_PROGRESSION.map((stg, i) => Object.assign({}, stg, STAGE_MAP_POSITIONS[i], {
        unlocked: isStageUnlockedByProgress(stg.id, stageProgress),
        record: getStageWaveRecordFor(stg.id)
    }));
}

// Medalha simples (círculo com uma fitinha) desenhada com formas básicas, sem depender de emoji/fonte especial.
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
    const gridLeft = 24;
    const gapX = 12, gapY = 8;
    const cardWidth = Math.min(280, (canvas.width - gridLeft * 2 - gapX * (columns - 1)) / columns);
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
const DATABASE_COLUMNS = 4;
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
    if (typeof fitCanvasToViewport === "function") {
        fitCanvasToViewport();
        setTimeout(fitCanvasToViewport, 150);
        setTimeout(fitCanvasToViewport, 400);
    }
}

function toggleFullscreen() {
    const container = document.getElementById("game-container");
    if (!container) return;

    if (isFullscreenActive() || container.classList.contains("forced-landscape")) {
        if (container.classList.contains("forced-landscape")) deactivateForcedLandscape();
        if (pseudoFullscreen) {
            pseudoFullscreen = false;
            syncFullscreenState();
            return;
        }
        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
        if (exitFullscreen) exitFullscreen.call(document);
        return;
    }

    const enterPseudo = () => { pseudoFullscreen = true; syncFullscreenState(); };
    const requestFullscreen = container.requestFullscreen || container.webkitRequestFullscreen;
    if (!requestFullscreen) { enterPseudo(); return; }
    try {
        const result = requestFullscreen.call(container);
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
    const hovered = inRect(mouseX, mouseY, rect.x, rect.y, rect.w, rect.h);
    const isActive = isFullscreenActive();
    const centerX = rect.x + rect.w / 2;
    const centerY = rect.y + rect.h / 2;
    const iconSize = isActive ? 15 : 19;
    const halfSize = iconSize / 2;
    const centerGap = isActive ? 3.5 : 4;
    const arrowHead = isActive ? 3.5 : 4;

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
}

document.addEventListener("fullscreenchange", syncFullscreenState);
document.addEventListener("webkitfullscreenchange", syncFullscreenState);

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
    const padX = 26;
    const gapX = 16;
    const gapY = 18;
    const targetVisibleRows = 2;
    const secondRowY = 58;
    const gridTop = 100;
    const bottomSpacing = 48;
    const usableHeight = Math.max(170, canvas.height - gridTop - bottomSpacing);
    const cardWidth = Math.max(120, Math.min(164, (canvas.width - (padX * 2 + gapX * (columns - 1) + 210)) / columns));
    const cardHeight = Math.max(100, Math.min(132, (usableHeight - gapY * (targetVisibleRows - 1)) / targetVisibleRows));
    const gridLeft = padX;
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

function drawBtn(x, y, w, h, text, color = "#00ffff", font = "bold 12px 'Courier New', monospace") {
    registerMenuTarget(x, y, w, h);
    let hov = inRect(mouseX, mouseY, x, y, w, h);

    ctx.save();
    const radius = 2;
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, hov ? "#ffb703" : "#123765");
    gradient.addColorStop(1, hov ? "#e85d04" : "#071d3a");

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

    ctx.shadowColor = hov ? "rgba(255, 183, 3, 0.7)" : "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = hov ? 18 : 10;
    ctx.shadowOffsetY = 4;
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
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}

function drawModernPanel(x, y, w, h, title = "", subtitle = "") {
    ctx.save();
    const radius = 22;

    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
    ctx.lineWidth = 1.5;
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
    ctx.fill();
    ctx.stroke();

    if (title) {
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 22px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(title, x + w / 2, y + 32);
    }

    if (subtitle) {
        ctx.fillStyle = "#93c5fd";
        ctx.font = "12px 'Segoe UI', sans-serif";
        ctx.fillText(subtitle, x + w / 2, y + 52);
    }

    ctx.restore();
    ctx.textAlign = "left";
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
    const r = canvas.getBoundingClientRect();
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    return { x: (clientX - r.left) * scaleX, y: (clientY - r.top) * scaleY };
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

// ---- Tela CONTROLE PS5 / DUALSENSE: remapear botões (inclui o TOUCHPAD) ----
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

// Desenha o símbolo do botão do PS5 (cruz, bola, quadrado, triângulo) sem depender de fontes.
function drawPadGlyph(index, cx, cy, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (index === 0) {
        ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
        ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
    } else if (index === 1) {
        ctx.arc(cx, cy, s, 0, Math.PI * 2);
    } else if (index === 2) {
        ctx.rect(cx - s, cy - s, s * 2, s * 2);
    } else {
        ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy + s * 0.8); ctx.lineTo(cx - s, cy + s * 0.8); ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
}

function drawGamepadOptions() {
    drawDragonBallMenuBackdrop(false);
    drawDragonBallPanel(90, 15, 620, 333, "CONTROLE PS5 / DUALSENSE", "Escolha uma ação e aperte o botão desejado (o TOUCHPAD também vale)");
    drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");

    PAD_ACTIONS.forEach((action, i) => {
        const y = 82 + i * 36;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "left";
        ctx.fillText(PAD_ACTION_LABELS[action], 125, y + 19);
        const list = padBindings[action];
        if (list[0] >= 0 && list[0] <= 3) drawPadGlyph(list[0], 300, y + 14, 8, PAD_FACE_COLORS[list[0]]);
        const isCapturing = padCapture && padCapture.action === action;
        drawBtn(330, y, 210, 28, isCapturing ? "APERTE UM BOTÃO..." : describePadBinding(list), isCapturing ? "#fbbf24" : "#00ffff", "bold 11px 'Courier New', monospace");
    });

    drawBtn(570, 82, 120, 28, "PADRÃO PS5", "#a7f3d0", "bold 11px 'Courier New', monospace");
    drawBtn(570, 122, 120, 28, "TESTAR", "#93c5fd", "bold 11px 'Courier New', monospace");

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
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "left";
        ctx.fillText(padCaptureNote, 125, 290);
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

function drawControlsTest() {
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
    [["p1", "JOGADOR 1 (TECLADO/MOUSE/CONTROLE 1)", 62, pads[0]], ["p2", "JOGADOR 2 (TECLADO/CONTROLE 2)", 170, pads[1]]].forEach(([profile, title, top, pad]) => {
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

    // controles conectados: analógicos e botões
    const padX = 400;
    ctx.save();
    ctx.fillStyle = "#7dd3fc";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(pads.length ? `CONTROLES CONECTADOS: ${pads.length}` : "NENHUM CONTROLE DETECTADO — APERTE UM BOTÃO", padX, 62);
    ctx.restore();
    pads.slice(0, 2).forEach((pad, n) => {
        const top = 72 + n * 100;
        ctx.save();
        ctx.fillStyle = "#94a3b8";
        ctx.font = "9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`C${n + 1}: ${String(pad.id || "controle").slice(0, 46)}`, padX, top + 6);
        const stick = (cx, cy, ax, ay) => {
            ctx.strokeStyle = "#64748b";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 22, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = (Math.abs(ax) > 0.4 || Math.abs(ay) > 0.4) ? "#22c55e" : "#38bdf8";
            ctx.beginPath();
            ctx.arc(cx + Math.max(-1, Math.min(1, ax)) * 16, cy + Math.max(-1, Math.min(1, ay)) * 16, 6, 0, Math.PI * 2);
            ctx.fill();
        };
        const axes = pad.axes || [];
        stick(padX + 28, top + 38, axes[0] || 0, axes[1] || 0);
        stick(padX + 84, top + 38, axes[2] || 0, axes[3] || 0);
        for (let i = 0; i < 18; i++) {
            const b = pad.buttons && pad.buttons[i];
            const on = Boolean(b && (b.pressed || b.value > 0.5));
            const bx = padX + 124 + (i % 9) * 30, by = top + 18 + Math.floor(i / 9) * 32;
            ctx.fillStyle = on ? "#22c55e" : "rgba(15, 23, 42, 0.9)";
            ctx.strokeStyle = on ? "#bbf7d0" : (i === 17 ? "#fbbf24" : "#475569");
            ctx.lineWidth = 1.5;
            ctx.fillRect(bx, by, 27, 26);
            ctx.strokeRect(bx, by, 27, 26);
            if (i <= 3) {
                drawPadGlyph(i, bx + 13.5, by + 13, 6, on ? "#052e16" : PAD_FACE_COLORS[i]);
            } else {
                ctx.fillStyle = on ? "#052e16" : "#cbd5e1";
                ctx.font = "bold 8px monospace";
                ctx.textAlign = "center";
                ctx.fillText(TEST_PAD_LABELS[i], bx + 13.5, by + 16);
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

    drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
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
const MENU_BACK_RECT = { x: 20, y: 20, w: 42, h: 32 };
const padNav = { focus: null, state: null, polledState: null, visible: false, held: {}, holdTime: {}, prevConfirm: false, prevBack: false };

function registerMenuTarget(x, y, w, h) {
    menuTargets.push({ x, y, w, h });
}

function isMenuBackTarget(t) {
    return t.x === MENU_BACK_RECT.x && t.y === MENU_BACK_RECT.y && t.w === MENU_BACK_RECT.w && t.h === MENU_BACK_RECT.h;
}

function padNavIsActiveState() {
    // controls_test: os botões do controle precisam acender na tela, não navegar
    return gameState !== "playing" && gameState !== "options_hud" && gameState !== "controls_test";
}

// Acha o alvo que está sob o foco atual (ou o mais próximo, se a tela mudou); escolhe um inicial se não há foco.
function resolvePadFocus() {
    if (!menuTargetsPrev.length) return null;
    if (padNav.state !== gameState || !padNav.focus) {
        padNav.state = gameState;
        const first = menuTargetsPrev.find(t => !isMenuBackTarget(t)) || menuTargetsPrev[0];
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
    if (back) handleMenuClick(back.x + back.w / 2, back.y + back.h / 2);
    else if (gameState === "paused") requestResume();
    else if (gameState === "gameover") handleMenuClick(400, 175);
}

// Janelas HTML (avisos, confirmações, editor) ficam por cima do canvas.
function isDomModalOpen(id) {
    const el = document.getElementById(id);
    return Boolean(el && el.style && (el.style.display === "flex" || el.style.display === "block"));
}

function pollGamepadMenu(dt) {
    const pads = getConnectedGamepads();
    const intents = pads.map(pad => getPadIntent(pad));
    const any = (k) => intents.some(i => i[k]);

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
        if (alertOpen) {
            const holder = document.getElementById("modal-alert-btns");
            const buttons = holder && holder.querySelectorAll ? Array.from(holder.querySelectorAll("button")) : [];
            if (confirm && !padNav.prevConfirm && buttons[0]) buttons[0].click();
            else if (back && !padNav.prevBack && buttons.length) buttons[buttons.length - 1].click();
        } else if (updatesOpen) {
            if ((confirm && !padNav.prevConfirm) || (back && !padNav.prevBack)) closeUpdatesModal();
        } else {
            pollEditorGamepad(dt, intents, pads.length > 0);
        }
        padNav.prevConfirm = confirm;
        padNav.prevBack = back;
        return;
    }
    editorPadReset();

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
        if (target) handleMenuClick(target.x + target.w / 2, target.y + target.h / 2);
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
    return getGamepadIntent(pad, 0.4, padBindings);
}

// Viram "teclas virtuais" do jogador correspondente, então reaproveitam todo o resto do jogo.
const padHeldKeys = { p1: {}, p2: {} };
const padPrevPressed = { p1: {}, p2: {} };
const padAttackCooldown = { p1: 0, p2: 0 };
let padPrevPause = false;

function getConnectedGamepads() {
    try {
        const list = (typeof navigator !== "undefined" && navigator.getGamepads) ? navigator.getGamepads() : [];
        return Array.from(list || []).filter(pad => pad && pad.connected !== false);
    } catch (err) {
        return [];
    }
}

// 2+ controles: o 1º é do jogador 1 e o 2º do jogador 2. Só 1 controle no co-op em aparelho touch:
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

    const anyPause = ["p1", "p2"].some(profile => getPadIntent(assignments[profile]).pause);
    if (anyPause && !padPrevPause) {
        if (gameState === "tutorial") {
            const step = getCurrentTutorialStep();
            if (step && step.key === "pause") markTutorialActionDone("pause");
        }
        else if (playing) pauseGame();
        else if (gameState === "paused") requestResume();
    }
    padPrevPause = anyPause;

    for (const profile of ["p1", "p2"]) {
        const isP2 = profile === "p2";
        const active = playing && (!isP2 || gameMode === "coop");
        const intent = getPadIntent(active ? assignments[profile] : null);
        const target = isP2 ? player2 : player;

        for (const action of ["up", "down", "left", "right", "charge"]) setPadKey(profile, action, intent[action]);

        if (intent.attack) {
            padAttackCooldown[profile] -= dt * 60;
            const blocked = !isP2 && (player.isCharging || player.parryHighlightTimer > 0 || world.beamActive > 0);
            if (padAttackCooldown[profile] <= 0 && !blocked) {
                triggerAction("attack", target, isP2);
                padAttackCooldown[profile] = TOUCH_AUTOFIRE_INTERVAL;
            }
        } else {
            padAttackCooldown[profile] = 0;
        }

        for (const action of ["transform", "parry", "special"]) {
            if (intent[action] && !padPrevPressed[profile][action]) triggerAction(action, target, isP2);
            padPrevPressed[profile][action] = intent[action];
        }
    }
}

// Botão de pausa (só aparece em modo touch, durante a partida). Fica no centro do topo, área livre da HUD.
function getPauseButtonRect() {
    return { x: Math.round((canvas.width - PAUSE_BUTTON.w) / 2), y: 8, w: PAUSE_BUTTON.w, h: PAUSE_BUTTON.h };
}

function pauseGame(message = "JOGO PAUSADO", auto = false) {
    if (gameState !== "playing") return;
    keysPressed = {};
    mouseButtonsPressed = {};
    resetTouchInputState();
    autoPaused = auto;
    resumeCountdown = 0;
    setGameState("paused", message);
}

// Retomar: no celular e depois de pausa automática faz contagem 3-2-1 (dá tempo de reposicionar os dedos).
function requestResume() {
    if (gameState !== "paused" || resumeCountdown > 0) return;
    if (autoPaused || isTouchDevice) resumeCountdown = 3;
    else setGameState("playing", "BATALHA EM ANDAMENTO");
}

function getHudButtonAt(x, y) {
    for (const key of Object.keys(touchHudLayout)) {
        if (key === "parry" && mobileDoubleTapParry) continue;
        const r = getHudButtonRect(key);
        if (inRect(x, y, r.x, r.y, r.w, r.h)) return key;
    }
    return null;
}

canvas.onmousemove = (e) => {
    lastInputWasTouch = false;
    padNav.visible = false;
    if (controlSelectionMode === "auto" && autoControlOverride !== "pc" && Date.now() - lastTouchStartAt > 1000) {
        autoControlOverride = "pc";
        isTouchDevice = false;
    }
    const c = getCanvasCoords(e.clientX, e.clientY);
    mouseX = c.x;
    mouseY = c.y;

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
        handleMenuClick(point.x, point.y);
    }
};

canvas.onwheel = (e) => {
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

canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    controlsTestTouches = Array.from(e.touches).map(t => getCanvasCoords(t.clientX, t.clientY));
    isTouchDevice = true;
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
        toggleFullscreen();
        return;
    }

    // Botões próprios do tutorial (PULAR/SAIR/VOLTAR): tratados aqui, ANTES de cair na lógica de toque do
    // jogo — sem isso, o toque nunca chamava handleMenuClick nessas telas e os botões pareciam não responder.
    if (gameState === "tutorial") {
        const ui = getTutorialUiLayout();
        if (ui.finished && inRect(firstPoint.x, firstPoint.y, ui.voltar.x, ui.voltar.y, ui.voltar.w, ui.voltar.h)) {
            setGameState("menu");
            return;
        }
        if (!ui.finished) {
            if (inRect(firstPoint.x, firstPoint.y, ui.pular.x, ui.pular.y, ui.pular.w, ui.pular.h)) { advanceTutorialStep(); return; }
            if (inRect(firstPoint.x, firstPoint.y, ui.sair.x, ui.sair.y, ui.sair.w, ui.sair.h)) { setGameState("menu"); return; }
        }
    }

    if (gameState === "database") {
        databaseTouchScroll.active = true;
        databaseTouchScroll.touchId = firstTouch.identifier;
        databaseTouchScroll.startY = firstPoint.y;
        databaseTouchScroll.startScrollY = characterDatabaseScrollY;
        databaseTouchScroll.dragged = false;
        return;   // o clique (EDITAR/EXCLUIR/CRIAR/voltar) só é decidido no touchend, se não tiver sido um arraste
    }

    if (gameState === "achievements") {
        achievementsTouchScroll.active = true;
        achievementsTouchScroll.touchId = firstTouch.identifier;
        achievementsTouchScroll.startY = firstPoint.y;
        achievementsTouchScroll.startScrollY = achievementsScrollY;
        achievementsTouchScroll.dragged = false;
        return;
    }

    if (gameState === "options_hud") {
        if (inRect(firstPoint.x, firstPoint.y, 20, 20, 100, 30) || inRect(firstPoint.x, firstPoint.y, 130, 20, 100, 30)) {
            handleMenuClick(firstPoint.x, firstPoint.y);
            return;
        }
        if (handleHudEditorBarClick(firstPoint.x, firstPoint.y)) return;

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
        handleMenuClick(firstPoint.x, firstPoint.y);
        return;
    }

    const moveArea = getTouchMovementArea();
    const now = Date.now();

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const c = getCanvasCoords(touch.clientX, touch.clientY);

        const pauseRect = getPauseButtonRect();
        if (inRect(c.x, c.y, pauseRect.x, pauseRect.y, pauseRect.w, pauseRect.h)) {
            if (gameState === "tutorial") {
                const step = getCurrentTutorialStep();
                if (step && step.key === "pause") markTutorialActionDone("pause");
            } else {
                pauseGame();
            }
            return;
        }

        const hudKey = getHudButtonAt(c.x, c.y);

        if (hudKey) {
            if (hudKey === "attack") triggerAction("attack", player, false);
            else if (hudKey === "parry") tryReflect();
            else if (hudKey === "special") triggerSpecialAttack(false);
            else if (hudKey === "charge") touchChargeId = touch.identifier;
            else if (hudKey === "transform") {
                if (!transformPlayer(player, false) && !player.isSSJ) {
                    addFloatingText({ text: "KI INSUFICIENTE (80)", x: player.x + player.w / 2, y: player.y - 10, alpha: 1, color: "#ffcc00" });
                }
            }
            if (gameState === "tutorial" && ["attack", "parry", "special", "transform"].includes(hudKey)) markTutorialActionDone(hudKey);
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
                tryReflect();
                lastTouchTime = 0;
                if (gameState === "tutorial") markTutorialActionDone("parry");
            } else {
                lastTouchTime = now;
            }
        }
    }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    controlsTestTouches = Array.from(e.touches).map(t => getCanvasCoords(t.clientX, t.clientY));

    if (gameState === "database" && databaseTouchScroll.active) {
        const touch = Array.from(e.touches).find(t => t.identifier === databaseTouchScroll.touchId);
        if (touch) {
            const c = getCanvasCoords(touch.clientX, touch.clientY);
            const dy = c.y - databaseTouchScroll.startY;
            if (!databaseTouchScroll.dragged && Math.abs(dy) > DATABASE_DRAG_THRESHOLD) databaseTouchScroll.dragged = true;
            if (databaseTouchScroll.dragged) {
                // o conteúdo acompanha o dedo (arrastar para cima revela as linhas de baixo)
                const maxScroll = getDatabaseMaxScroll();
                characterDatabaseScrollY = Math.max(0, Math.min(maxScroll, databaseTouchScroll.startScrollY - dy));
            }
        }
        return;
    }

    if (gameState === "achievements" && achievementsTouchScroll.active) {
        const touch = Array.from(e.touches).find(t => t.identifier === achievementsTouchScroll.touchId);
        if (touch) {
            const c = getCanvasCoords(touch.clientX, touch.clientY);
            const dy = c.y - achievementsTouchScroll.startY;
            if (!achievementsTouchScroll.dragged && Math.abs(dy) > DATABASE_DRAG_THRESHOLD) achievementsTouchScroll.dragged = true;
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
    databaseTouchScroll.active = false;
    databaseTouchScroll.touchId = null;
    achievementsTouchScroll.active = false;
    achievementsTouchScroll.touchId = null;
    resetTouchInputState();
}, { passive: false });

window.onkeydown = (e) => {
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
        if ((e.code === "Escape" || e.code === "KeyP") && getCurrentTutorialStep() && getCurrentTutorialStep().key === "pause") {
            markTutorialActionDone("pause");
            return;
        }
        if (e.code === "Escape") { setGameState("menu"); return; }
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
    pauseGame("PAUSADO AUTOMATICAMENTE", true);
}
window.addEventListener("blur", autoPauseGame);
window.addEventListener("pagehide", autoPauseGame);
document.addEventListener("visibilitychange", () => { if (document.hidden) autoPauseGame(); });

// Texto de instrução do passo atual, adaptado ao controle em uso — toque (analógico ou arrastar), teclado/mouse
// e controle (quando conectado) aparecem juntos no PC, já que o jogo aceita os três ao mesmo tempo.
function getTutorialInstructionLines(stepKey) {
    const lines = [];
    const padConnected = getConnectedGamepads().length > 0;
    if (isTouchDevice) {
        if (stepKey === "move") {
            lines.push(touchControlMode === "swipe" ? "ARRASTE O DEDO NA TELA PARA VOAR" : "TOQUE E ARRASTE NO ANALÓGICO (ESQUERDA DA TELA), OU SEGURE PRA ATIRAR SEM PARAR");
        } else if (stepKey === "pause") {
            lines.push("TOQUE NO ÍCONE DE PAUSA NO TOPO DA TELA");
        } else if (stepKey === "parry" && mobileDoubleTapParry) {
            // O botão PARRY fica escondido de propósito quando o duplo toque está ativado (padrão do jogo) —
            // mostrar "toque no botão" aqui seria pedir algo que nem aparece na tela.
            lines.push("TOQUE 2 VEZES SEGUIDAS EM QUALQUER LUGAR LIVRE DA TELA");
        } else {
            const names = { attack: "ATAQUE", charge: "CARREGAR", parry: "PARRY", transform: "TRANSF.", special: "ESPECIAL" };
            lines.push(`TOQUE (OU SEGURE) NO BOTÃO "${names[stepKey]}" NA TELA`);
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
        if (padConnected) {
            const padNames = { move: "ANALÓGICO ESQUERDO OU DIRECIONAL", attack: describePadBinding(padBindings.attack), charge: describePadBinding(padBindings.charge), parry: describePadBinding(padBindings.parry), transform: describePadBinding(padBindings.transform), special: describePadBinding(padBindings.special), pause: describePadBinding(padBindings.pause) };
            lines.push(`CONTROLE: ${padNames[stepKey]}`);
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
        sair: { x: canvas.width - 56, y: bubbleY + bubbleH / 2 - 8, w: 50, h: 16 },
        voltar: { x: canvas.width / 2 - 70, y: bubbleY + bubbleH + 6, w: 140, h: 18 }
    };
}

function drawTutorialScreen() {
    drawStageBackground();
    drawAuraWaves(player, characterDB[selectedCharacter], false);
    drawPlayerEntity(player, characterDB[selectedCharacter], false);

    const step = getCurrentTutorialStep();
    const ui = getTutorialUiLayout();

    // Balão ao redor da escrita — não mais uma faixa cobrindo a tela inteira — e sempre abaixo do ícone de
    // pausa (que fica sempre visível, igual numa partida normal), então nunca mais fica um em cima do outro.
    ctx.save();
    ctx.fillStyle = "rgba(4, 8, 20, 0.88)";
    ctx.strokeStyle = tutorialPhase === "effect" ? "#4ade80" : "#3a5a8a";
    ctx.lineWidth = 1.5;
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(ui.bubbleX + r, ui.bubbleY);
    ctx.arcTo(ui.bubbleX + ui.bubbleW, ui.bubbleY, ui.bubbleX + ui.bubbleW, ui.bubbleY + ui.bubbleH, r);
    ctx.arcTo(ui.bubbleX + ui.bubbleW, ui.bubbleY + ui.bubbleH, ui.bubbleX, ui.bubbleY + ui.bubbleH, r);
    ctx.arcTo(ui.bubbleX, ui.bubbleY + ui.bubbleH, ui.bubbleX, ui.bubbleY, r);
    ctx.arcTo(ui.bubbleX, ui.bubbleY, ui.bubbleX + ui.bubbleW, ui.bubbleY, r);
    ctx.closePath();
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
        registerMenuTarget(ui.sair.x, ui.sair.y, ui.sair.w, ui.sair.h);
        drawBtn(ui.pular.x, ui.pular.y, ui.pular.w, ui.pular.h, "PULAR", "#93c5fd", "bold 8px 'Courier New', monospace");
        drawBtn(ui.sair.x, ui.sair.y, ui.sair.w, ui.sair.h, "SAIR", "#fca5a5", "bold 8px 'Courier New', monospace");
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
    else if (actionName === "transform") transformPlayer(targetPlayer, isP2);
    else if (actionName === "parry") tryReflect(targetPlayer, isP2);
    else if (actionName === "special") triggerSpecialAttack(isP2);
    if (gameState === "tutorial" && !isP2) markTutorialActionDone(actionName);
}

function startRemapping(keyPath) {
    remappingKey = keyPath;
    showSystemAlert("MAPEAMENTO", "PRESSIONE QUALQUER TECLA OU BOTÃO DO MOUSE PARA RECONFIGURAR...");
}

function handleMenuClick(x, y) {
    initAudio();
    playSound("menu");

    if (gameState === "menu") {
        if (inRect(x, y, 190, 95, 180, 36)) setGameState("mode_select", "ESCOLHA O MODO DE JOGO");
        else if (inRect(x, y, 430, 95, 180, 36)) setGameState("characters", "SELEÇÃO DE PERSONAGENS");
        else if (inRect(x, y, 190, 150, 180, 36)) setGameState("stages", "ESCOLHA A ARENA DE BATALHA");
        else if (inRect(x, y, 430, 150, 180, 36)) {
            optionsReturnState = "menu";
            setGameState("options_main", "OPÇÕES DO JOGO");
        }
        else if (inRect(x, y, 190, 205, 180, 36)) setGameState("ranking", "MELHORES PONTUAÇÕES LOCAL");
        else if (inRect(x, y, 430, 205, 180, 36)) setGameState("database", "GERENCIADOR DE PERSONAGENS");
        else if (inRect(x, y, 190, 260, 180, 36)) { achievementsScrollY = 0; setGameState("achievements", "CONQUISTAS"); }
        else if (inRect(x, y, 430, 260, 180, 36)) startTutorial();
        else if (inRect(x, y, 20, 305, 120, 25)) openUpdatesModal();
    }
    else if (gameState === "mode_select") {
        if (inRect(x, y, 175, 176, 200, 58)) {
            gameMode = "singleplayer";
            saveSettings();
            setGameState("stage_map", "ESCOLHA A FASE");
        }
        else if (inRect(x, y, 425, 176, 200, 58)) {
            gameMode = "coop";
            saveSettings();
            startGame();
        }
        else if (inRect(x, y, 20, 20, 42, 32)) setGameState("menu");
    }
    else if (gameState === "paused") {
        if (resumeCountdown > 0) return;
        if (inRect(x, y, 300, 160, 200, 35)) {
            optionsReturnState = "paused";
            setGameState("options_main", "OPÇÕES DE CONTROLE E SOM");
        }
        else if (inRect(x, y, 300, 210, 200, 35)) setGameState("menu", "MENU PRINCIPAL");
        // CONTINUAR, ou (depois de pausa automática) toque/clique em qualquer outro lugar
        else if (inRect(x, y, 300, 110, 200, 35) || autoPaused) requestResume();
    }
    else if (gameState === "gameover") {
        setGameState("menu");
    }
    else if (gameState === "characters") {
        let chars = getFilteredCharacters();
        
        if (inRect(x, y, 250, 45, 140, 25)) currentTab = "HERÓIS";
        else if (inRect(x, y, 410, 45, 140, 25)) currentTab = "VILÕES";

        chars.forEach((key, i) => {
            let col = i % 5;
            let row = Math.floor(i / 5);
            let cx = 40 + col * (UI.GRID_CARD_WIDTH + 12);
            let cy = 80 + row * (UI.GRID_CARD_HEIGHT + 10);

            if (inRect(x, y, cx, cy, UI.GRID_CARD_WIDTH, UI.GRID_CARD_HEIGHT)) {
                if (currentTab === "HERÓIS") {
                    selectedCharacter = key;
                    saveSelectedCharacters();
                } else {
                    selectedBoss = key;
                    saveSelectedCharacters();
                }
            }
        });

        if (inRect(x, y, 20, 20, 42, 32)) setGameState("menu");
    }
    else if (gameState === "stages") {
        STAGE_PROGRESSION.forEach((stg, i) => {
            let col = i % 4;
            let row = Math.floor(i / 4);
            let sx = 40 + col * 190;
            let sy = 68 + row * 104;

            if (inRect(x, y, sx, sy, 175, 90)) {
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

        if (inRect(x, y, 20, 20, 42, 32)) setGameState("menu");
    }
    else if (gameState === "options_main") {
        if (inRect(x, y, 220, 120, 360, 42)) setGameState("options_controls", "CONFIGURAÇÃO DE CONTROLES");
        else if (inRect(x, y, 220, 180, 360, 42)) setGameState("options_audio", "AJUSTES DE ÁUDIO");
        else if (inRect(x, y, 220, 240, 360, 42)) setGameState("options_language", "IDIOMA DO JOGO");
        else if (inRect(x, y, 20, 20, 42, 32)) setGameState(optionsReturnState);
    }
    else if (gameState === "options_language") {
        if (inRect(x, y, 220, 145, 360, 42)) {
            selectedLanguage = "pt-BR";
            saveSettings();
        } else if (inRect(x, y, 20, 20, 42, 32)) {
            setGameState("options_main");
        }
    }
    else if (gameState === "options_controls") {
        if (inRect(x, y, 180, 144, 220, 46)) {
            setGameState("options_pc", "CONFIGURAÇÃO PC");
            return;
        }
        else if (inRect(x, y, 420, 144, 220, 46)) {
            setGameState("options_touch", "CONFIGURAÇÃO TOUCH / MOBILE");
            return;
        }
        else if (inRect(x, y, 180, 204, 220, 46)) {
            padCapture = null;
            setGameState("options_gamepad", "CONTROLE PS5 / DUALSENSE");
            return;
        }
        else if (inRect(x, y, 420, 204, 220, 46)) {
            controlsTestTouches = [];
            setGameState("controls_test", "TESTE DE CONTROLES");
            return;
        }

        if (inRect(x, y, 20, 20, 42, 32)) setGameState("options_main");
    }
    else if (gameState === "options_gamepad") {
        if (padCapture) { cancelPadCapture(); return; }
        if (inRect(x, y, 20, 20, 42, 32)) { setGameState("options_controls"); return; }
        PAD_ACTIONS.forEach((action, i) => {
            if (inRect(x, y, 330, 82 + i * 36, 210, 28)) startPadCapture(action);
        });
        if (inRect(x, y, 570, 82, 120, 28)) {
            padBindings = normalizePadBindings(null);
            saveControls();
            padCaptureNote = "PADRÃO PS5 RESTAURADO";
            padCaptureNoteTimer = 3;
        }
        else if (inRect(x, y, 570, 122, 120, 28)) {
            controlsTestTouches = [];
            setGameState("controls_test", "TESTE DE CONTROLES");
        }
    }
    else if (gameState === "controls_test") {
        if (inRect(x, y, 20, 20, 42, 32)) setGameState("options_controls");
    }
    else if (gameState === "options_pc") {
        if (inRect(x, y, 20, 20, 42, 32)) { setGameState("options_controls"); return; }
        else if (inRect(x, y, 130, 78, 150, 32)) { activeControlProfile = "p1"; }
        else if (inRect(x, y, 520, 78, 150, 32)) { activeControlProfile = "p2"; }

        const toggleRows = [
            { key: "auto", x: 120, y: 314, w: 150, h: 28 },
            { key: "pc", x: 325, y: 314, w: 150, h: 28 },
            { key: "touch", x: 530, y: 314, w: 150, h: 28 }
        ];

        for (const row of toggleRows) {
            const switchX = row.x + 62;
            const switchY = row.y;
            const switchW = 88;
            const switchH = 28;

            if (inRect(x, y, row.x, row.y, row.w, row.h) || inRect(x, y, switchX, switchY, switchW, switchH)) {
                if (row.key === "auto") controlSelectionMode = "auto";
                else if (row.key === "pc") { controlSelectionMode = "pc"; manualControlMode = "pc"; }
                else { controlSelectionMode = "touch"; manualControlMode = "touch"; }
                saveControls();
                break;
            }
        }

        if (inRect(x, y, 130, 114, 150, 28)) { pcInputMode = "keyboard"; saveControls(); }
        else if (inRect(x, y, 520, 114, 150, 28)) { pcInputMode = "mouse"; saveControls(); }

        const profileKey = activeControlProfile || "p1";
        let acts = ["up", "down", "left", "right", "attack", "charge", "transform", "parry", "special"];
        acts.forEach((act, idx) => {
            let col = idx % 2;
            let row = Math.floor(idx / 2);
            let rx = col === 0 ? 280 : 560;
            let ry = PC_KEY_ROW_Y0 + row * PC_KEY_ROW_STEP;

            if (inRect(x, y, rx, ry, 110, 24)) startRemapping(`${profileKey}.${act}`);
        });

        if (inRect(x, y, 310, 337, 180, 30)) setGameState("options_controls");
    }
    else if (gameState === "options_touch") {
        if (inRect(x, y, 170, 106, 180, 34)) { touchControlMode = "analog"; saveControls(); }
        else if (inRect(x, y, 450, 106, 180, 34)) { touchControlMode = "swipe"; saveControls(); }
        else if (inRect(x, y, 200, 148, 400, 34)) { mobileDoubleTapParry = !mobileDoubleTapParry; saveControls(); }
        else if (inRect(x, y, 200, 190, 400, 34)) {
            vibrationEnabled = !vibrationEnabled;
            saveControls();
            vibrate(60);
        }
        else if (inRect(x, y, 200, 232, 400, 34)) { touchAutoFire = !touchAutoFire; saveControls(); }
        else if (inRect(x, y, 200, 274, 400, 34)) setGameState("options_hud", "ARRASTE OS BOTÕES PARA REORGANIZAR A HUD");
        else if (inRect(x, y, 20, 20, 42, 32)) setGameState("options_main");
    }
    else if (gameState === "options_hud") {
        if (inRect(x, y, 20, 20, 100, 30)) {
            writeStorage("saiyan_touch_hud_customized", "1"); // impede o resize de apagar o layout escolhido
            saveControls();
            setGameState("options_touch");
        }
        else if (inRect(x, y, 130, 20, 100, 30)) {
            touchHudLayout = getDefaultTouchHudLayout(window.innerWidth);
            hudEditorSelectedBtn = null;
            writeStorage("saiyan_touch_hud_customized", "");
            saveControls();
        }
        else handleHudEditorBarClick(x, y);
    }
    else if (gameState === "options_audio") {
        if (inRect(x, y, 560, 105, 34, 34)) { sfxVolume = Math.max(0, sfxVolume - 0.1); saveAudioSettings(); }
        else if (inRect(x, y, 604, 105, 34, 34)) { sfxVolume = Math.min(1, sfxVolume + 0.1); saveAudioSettings(); }
        else if (inRect(x, y, 560, 160, 34, 34)) { bgmVolume = Math.max(0, bgmVolume - 0.1); saveAudioSettings(); }
        else if (inRect(x, y, 604, 160, 34, 34)) { bgmVolume = Math.min(1, bgmVolume + 0.1); saveAudioSettings(); }
        else if (inRect(x, y, 250, 205, 300, 38)) { isMuted = !isMuted; saveAudioSettings(); }
        else if (inRect(x, y, 20, 20, 42, 32)) setGameState("options_main");
    }
    else if (gameState === "ranking") {
        if (inRect(x, y, 20, 20, 42, 32)) setGameState("menu");
        else if (inRect(x, y, 220, 52, 170, 30)) { rankingViewMode = "geral"; }
        else if (inRect(x, y, 410, 52, 170, 30)) { rankingViewMode = "fase"; if (!rankingSelectedStage) rankingSelectedStage = STAGE_PROGRESSION[0].id; }
        else if (rankingViewMode === "fase") {
            STAGE_PROGRESSION.forEach((stg, i) => {
                const px = 40 + (i % 8) * 92;
                if (inRect(x, y, px, 90, 84, 30)) rankingSelectedStage = stg.id;
            });
        }
    }
    else if (gameState === "achievements") {
        if (inRect(x, y, 20, 20, 42, 32)) setGameState("menu");
    }
    else if (gameState === "stage_victory") {
        if (inRect(x, y, canvas.width / 2 - 90, 300, 180, 34)) setGameState("stage_map");
    }
    else if (gameState === "tutorial") {
        const ui = getTutorialUiLayout();
        if (ui.finished) {
            if (inRect(x, y, ui.voltar.x, ui.voltar.y, ui.voltar.w, ui.voltar.h)) setGameState("menu");
        } else {
            if (inRect(x, y, ui.pular.x, ui.pular.y, ui.pular.w, ui.pular.h)) advanceTutorialStep();
            else if (inRect(x, y, ui.sair.x, ui.sair.y, ui.sair.w, ui.sair.h)) setGameState("menu");
        }
    }
    else if (gameState === "stage_map") {
        if (stageChoicePendingId) {
            // overlay de escolha de modo: sempre aparece ao clicar numa fase liberada. NORMAL sempre dá pra
            // jogar; DIFÍCIL só depois de completar o NORMAL dessa fase; SEM LIMITE só depois dos dois.
            const canHard = isHardModeUnlocked(stageChoicePendingId, stageProgress);
            const canUnlimited = isUnlimitedModeUnlocked(stageChoicePendingId, stageProgress);
            if (inRect(x, y, canvas.width / 2 - 270, 140, 170, 60)) {
                selectedStage = stageChoicePendingId;
                stageMode = "normal";
                stageChoicePendingId = null;
                saveSettings();
                startGame();
            } else if (canHard && inRect(x, y, canvas.width / 2 - 85, 140, 170, 60)) {
                selectedStage = stageChoicePendingId;
                stageMode = "hard";
                stageChoicePendingId = null;
                saveSettings();
                startGame();
            } else if (canUnlimited && inRect(x, y, canvas.width / 2 + 100, 140, 170, 60)) {
                selectedStage = stageChoicePendingId;
                stageMode = "unlimited";
                stageChoicePendingId = null;
                saveSettings();
                startGame();
            } else if (inRect(x, y, canvas.width / 2 - 70, 224, 140, 30)) {
                stageChoicePendingId = null;
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
                }
            }
        });
        if (inRect(x, y, 20, 20, 42, 32)) setGameState("mode_select");
    }
    else if (gameState === "database") {
        const layout = getDatabaseLayoutMetrics();
        let keys = Object.keys(characterDB);

        if (inRect(x, y, layout.createButtonX, layout.createButtonY, layout.createButtonWidth, 30)) { openModal(null); return; }
        if (inRect(x, y, 20, 20, 42, 32)) { setGameState("menu"); return; }

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

// ==================== DESENHO DAS ARENAS DBZ POLIDAS HD ====================
function drawStageBackground() {
    ctx.save();
    let scroll = world.stageScrollX;

    if (selectedStage === "terra") {
        let skyGrad = ctx.createLinearGradient(0, 0, 0, 220);
        skyGrad.addColorStop(0, "#3388ff");
        skyGrad.addColorStop(0.7, "#88ccff");
        skyGrad.addColorStop(1, "#e0f0ff");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, 220);

        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        for (let i = 0; i < 5; i++) {
            let cx = ((i * 220 - scroll * 0.3) % (canvas.width + 100)) - 50;
            ctx.beginPath();
            ctx.arc(cx, 35, 22, 0, Math.PI * 2);
            ctx.arc(cx + 25, 30, 28, 0, Math.PI * 2);
            ctx.arc(cx + 55, 35, 20, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "#cc3300";
        ctx.fillRect(0, 160, canvas.width, 30);
        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(0, 160, canvas.width, 4);

        ctx.fillStyle = "#ffaa00";
        for (let x = - (scroll * 0.8 % 40); x < canvas.width + 40; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 160);
            ctx.lineTo(x + 20, 145);
            ctx.lineTo(x + 40, 160);
            ctx.fill();
        }

        let floorGrad = ctx.createLinearGradient(0, 190, 0, canvas.height);
        floorGrad.addColorStop(0, "#d2b48c");
        floorGrad.addColorStop(1, "#8b5a2b");
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 190, canvas.width, canvas.height - 190);

        ctx.strokeStyle = "#5c3a21";
        ctx.lineWidth = 2;
        let pOffset = (scroll * 1.5) % 60;
        for (let x = -pOffset; x < canvas.width + 60; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 190);
            ctx.lineTo(x - 30, canvas.height);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(0, 230); ctx.lineTo(canvas.width, 230);
        ctx.moveTo(0, 280); ctx.lineTo(canvas.width, 280);
        ctx.stroke();
    } 
    else if (selectedStage === "namek") {
        let skyGrad = ctx.createLinearGradient(0, 0, 0, 220);
        skyGrad.addColorStop(0, "#44aa77");
        skyGrad.addColorStop(0.6, "#77ddaa");
        skyGrad.addColorStop(1, "#aaffcc");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, 220);

        ctx.fillStyle = "rgba(255, 255, 200, 0.9)";
        ctx.beginPath(); ctx.arc(150, 45, 25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(220, 70, 15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(680, 35, 18, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#226666";
        world.mountainsFar.forEach(m => {
            let x = ((m.x - scroll * 0.4) % (canvas.width + 200)) - 100;
            ctx.beginPath();
            ctx.ellipse(x + m.w / 2, 190, m.w / 2, m.h, 0, Math.PI, 0);
            ctx.fill();
        });

        ctx.fillStyle = "#114444";
        for (let i = 0; i < 6; i++) {
            let ax = ((i * 180 - scroll * 0.8) % (canvas.width + 120)) - 40;
            ctx.fillRect(ax + 12, 140, 6, 50);
            ctx.beginPath();
            ctx.arc(ax + 15, 135, 22, 0, Math.PI * 2);
            ctx.fill();
        }

        let floorGrad = ctx.createLinearGradient(0, 190, 0, canvas.height);
        floorGrad.addColorStop(0, "#20b2aa");
        floorGrad.addColorStop(1, "#005555");
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 190, canvas.width, canvas.height - 190);

        ctx.fillStyle = "#00ffff";
        ctx.fillRect(0, 310, canvas.width, 40);
    } 
    else if (selectedStage === "kaio") {
        let skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, "#050015");
        skyGrad.addColorStop(0.5, "#1a0033");
        skyGrad.addColorStop(1, "#330055");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 60; i++) {
            let sx = (i * 137 + scroll * 0.1) % canvas.width;
            let sy = (i * 93) % 200;
            let sz = (i % 3) + 1;
            ctx.fillRect(sx, sy, sz, sz);
        }

        ctx.fillStyle = "#4c9a2a";
        ctx.beginPath();
        ctx.arc(400, 520, 360, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#2d5a1e";
        ctx.stroke();

        let cx = 350 - (scroll * 0.5 % 100);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(cx, 130, 50, 35);
        ctx.fillStyle = "#ff3300"; ctx.beginPath(); ctx.arc(cx + 25, 130, 28, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#ffcc00"; ctx.fillRect(cx + 38, 145, 12, 20);
        ctx.fillStyle = "#5c4033"; ctx.fillRect(cx + 80, 125, 10, 40);
        ctx.fillStyle = "#228b22"; ctx.beginPath(); ctx.arc(cx + 85, 115, 25, 0, Math.PI * 2); ctx.fill();
    } 
    else if (selectedStage === "time_room") {
        let skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, "#ffffff");
        skyGrad.addColorStop(0.4, "#e6f2ff");
        skyGrad.addColorStop(0.7, "#ccccff");
        skyGrad.addColorStop(1, "#9999ff");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let palX = 260 - (scroll * 0.2 % 200);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(palX, 100, 280, 90);
        ctx.fillStyle = "#ffcc00";
        ctx.beginPath(); ctx.arc(palX + 140, 100, 45, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.arc(palX + 40, 100, 20, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.arc(palX + 240, 100, 20, Math.PI, 0); ctx.fill();
        
        ctx.fillStyle = "#cc0000";
        ctx.fillRect(palX + 20, 120, 12, 70);
        ctx.fillRect(palX + 248, 120, 12, 70);

        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(0, 190, canvas.width, canvas.height - 190);
        ctx.strokeStyle = "#ddddee";
        ctx.lineWidth = 2;
        let pOffset = (scroll * 2) % 40;
        for (let x = -pOffset; x < canvas.width + 40; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 190);
            ctx.lineTo(x - 60, canvas.height);
            ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(0, 220); ctx.lineTo(canvas.width, 220); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 270); ctx.lineTo(canvas.width, 270); ctx.stroke();
    } 
    else if (selectedStage === "freeza_ship") {
        ctx.fillStyle = "#0a0a14";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, canvas.width, 180);
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 1;

        for (let x = - (scroll * 0.5 % 80); x < canvas.width + 80; x += 80) {
            ctx.strokeRect(x, 20, 70, 120);
            ctx.fillStyle = Math.sin(scroll * 0.1 + x) > 0 ? "#ff0055" : "#00ff55";
            ctx.fillRect(x + 10, 30, 8, 8);
            ctx.fillStyle = Math.cos(scroll * 0.1 + x) > 0 ? "#ffcc00" : "#00ffff";
            ctx.fillRect(x + 24, 30, 8, 8);
        }

        let winX = 350 - (scroll * 0.3 % 300);
        ctx.fillStyle = "#000005";
        ctx.beginPath(); ctx.arc(winX, 80, 45, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#444466"; ctx.lineWidth = 6; ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(winX - 15, 70, 2, 2); ctx.fillRect(winX + 20, 90, 2, 2); ctx.fillRect(winX + 5, 60, 3, 3);

        let floorGrad = ctx.createLinearGradient(0, 180, 0, canvas.height);
        floorGrad.addColorStop(0, "#2a2a3a");
        floorGrad.addColorStop(1, "#11111a");
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 180, canvas.width, canvas.height - 180);

        ctx.strokeStyle = "#00ffff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 180); ctx.lineTo(canvas.width, 180); ctx.stroke();
    } 
    else if (selectedStage === "kaioshin") {
        let skyGrad = ctx.createLinearGradient(0, 0, 0, 220);
        skyGrad.addColorStop(0, "#ffb6c1");
        skyGrad.addColorStop(0.5, "#e6e6fa");
        skyGrad.addColorStop(1, "#b0e0e6");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, 220);

        ctx.fillStyle = "rgba(255, 240, 245, 0.85)";
        ctx.beginPath(); ctx.arc(600, 60, 40, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(221, 160, 221, 0.5)";
        ctx.beginPath(); ctx.arc(180, 80, 25, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#9370db";
        world.mountainsFar.forEach(m => {
            let x = ((m.x - scroll * 0.3) % (canvas.width + 200)) - 100;
            ctx.beginPath();
            ctx.moveTo(x, 190);
            ctx.lineTo(x + m.w / 2, 190 - m.h * 1.2);
            ctx.lineTo(x + m.w, 190);
            ctx.fill();
        });

        ctx.fillStyle = "#ffd700";
        for (let i = 0; i < 5; i++) {
            let kx = ((i * 200 - scroll * 0.7) % (canvas.width + 100)) - 30;
            ctx.fillRect(kx + 10, 140, 5, 50);
            ctx.beginPath(); ctx.arc(kx + 12, 130, 20, 0, Math.PI * 2); ctx.fill();
        }

        let floorGrad = ctx.createLinearGradient(0, 190, 0, canvas.height);
        floorGrad.addColorStop(0, "#ba55d3");
        floorGrad.addColorStop(1, "#4b0082");
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 190, canvas.width, canvas.height - 190);
    }
    else if (selectedStage === "namek_explosao") {
        // Namek prestes a explodir: o mesmo verde de Namek, mas o céu virou vermelho, o chão racha e pedaços
        // de rocha voam ao fundo — a corrida contra o tempo do fim da saga Freeza.
        let skyGrad = ctx.createLinearGradient(0, 0, 0, 220);
        skyGrad.addColorStop(0, "#3a0000");
        skyGrad.addColorStop(0.5, "#9a1a10");
        skyGrad.addColorStop(1, "#ff7a2a");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, 220);

        // dois sóis de Namek, agora num céu incendiado
        ctx.fillStyle = "rgba(255, 220, 120, 0.95)";
        ctx.beginPath(); ctx.arc(150, 45, 25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(680, 35, 18, 0, Math.PI * 2); ctx.fill();

        // fragmentos do planeta se despedaçando, caindo ao fundo
        for (let i = 0; i < 10; i++) {
            const fx = ((i * 97 + scroll * (0.3 + (i % 3) * 0.15)) % (canvas.width + 60)) - 30;
            const fy = 20 + (i * 53) % 160;
            const fs = 4 + (i % 4) * 3;
            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(i * 0.7);
            ctx.fillStyle = "#3a1a10";
            ctx.fillRect(-fs / 2, -fs / 2, fs, fs);
            ctx.restore();
        }

        ctx.fillStyle = "#4a1510";
        world.mountainsFar.forEach(m => {
            let x = ((m.x - scroll * 0.4) % (canvas.width + 200)) - 100;
            ctx.beginPath();
            ctx.ellipse(x + m.w / 2, 190, m.w / 2, m.h, 0, Math.PI, 0);
            ctx.fill();
        });

        // fumaça/lava subindo em colunas
        for (let i = 0; i < 5; i++) {
            const sx2 = ((i * 170 - scroll * 0.9) % (canvas.width + 100)) - 40;
            const grad = ctx.createLinearGradient(0, 130, 0, 195);
            grad.addColorStop(0, "rgba(255,140,40,0)");
            grad.addColorStop(1, "rgba(255,90,20,0.65)");
            ctx.fillStyle = grad;
            ctx.fillRect(sx2, 130, 14, 65);
        }

        let floorGrad = ctx.createLinearGradient(0, 190, 0, canvas.height);
        floorGrad.addColorStop(0, "#5a1a0a");
        floorGrad.addColorStop(1, "#1a0500");
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 190, canvas.width, canvas.height - 190);

        // rachaduras incandescentes no chão
        ctx.strokeStyle = "#ff5a1a";
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const cx2 = ((i * 140 - scroll * 1.1) % (canvas.width + 100)) - 40;
            ctx.beginPath();
            ctx.moveTo(cx2, 195);
            ctx.lineTo(cx2 + 18, 230);
            ctx.lineTo(cx2 - 6, 260);
            ctx.lineTo(cx2 + 12, canvas.height - 10);
            ctx.stroke();
        }
    }
    else if (selectedStage === "cell_games") {
        // Torneio de Cell: arena de torneio ao ar livre, plataforma de concreto isolada, arquibancadas ao fundo.
        let skyGrad = ctx.createLinearGradient(0, 0, 0, 220);
        skyGrad.addColorStop(0, "#2a7fd6");
        skyGrad.addColorStop(0.6, "#6fb8f0");
        skyGrad.addColorStop(1, "#cfe8ff");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, 220);

        ctx.fillStyle = "rgba(255,255,240,0.95)";
        ctx.beginPath(); ctx.arc(680, 40, 26, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#ffffff";
        [[100, 60, 46], [260, 45, 36], [520, 55, 40]].forEach(([cx2, cy2, r]) => {
            const x = ((cx2 - scroll * 0.25) % (canvas.width + 160)) - 80;
            ctx.beginPath();
            ctx.arc(x, cy2, r, 0, Math.PI * 2);
            ctx.arc(x + r * 0.8, cy2 + 6, r * 0.7, 0, Math.PI * 2);
            ctx.arc(x - r * 0.7, cy2 + 8, r * 0.6, 0, Math.PI * 2);
            ctx.fill();
        });

        // arquibancadas/plateia esquemática ao longe
        ctx.fillStyle = "#8899aa";
        for (let i = 0; i < 5; i++) {
            const bx = ((i * 165 - scroll * 0.5) % (canvas.width + 120)) - 50;
            ctx.fillRect(bx, 150, 90, 40);
            ctx.fillStyle = "#5a6a7a";
            for (let d = 0; d < 4; d++) ctx.fillRect(bx + 6 + d * 20, 156, 4, 30);
            ctx.fillStyle = "#8899aa";
        }

        // a plataforma quadrada característica do torneio, flutuando isolada
        let floorGrad = ctx.createLinearGradient(0, 190, 0, canvas.height);
        floorGrad.addColorStop(0, "#e8e4d8");
        floorGrad.addColorStop(1, "#a8a290");
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 190, canvas.width, canvas.height - 190);

        ctx.strokeStyle = "#c0392b";
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 196, canvas.width - 40, 8);

        ctx.strokeStyle = "#9a9484";
        ctx.lineWidth = 1;
        for (let gx = 0; gx < canvas.width; gx += 40) {
            const lx = ((gx - scroll) % (canvas.width + 40));
            ctx.beginPath(); ctx.moveTo(lx, 210); ctx.lineTo(lx, canvas.height); ctx.stroke();
        }
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
        const bubbleRadius = Math.max(p.w, p.h) * 0.78;
        const bubbleX = renderX + p.w / 2;
        const bubbleY = renderY + p.h / 2;

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
    const animationFrame = getCharacterAnimationFrame(fallbackKey, animationState, p.animTimer);

    const actionShift = {
        idle: { dx: 0, dy: 0, scale: 1 },
        flyRight: { dx: Math.sin(p.animTimer * 2) * 4, dy: 0, scale: 1.05 },
        flyLeft: { dx: -Math.sin(p.animTimer * 2) * 4, dy: 0, scale: 1.05 },
        flyUp: { dx: 0, dy: -Math.sin(p.animTimer * 2) * 4, scale: 1.08 },
        flyDown: { dx: 0, dy: Math.sin(p.animTimer * 2) * 4, scale: 1.08 },
        flyUpRight: { dx: Math.sin(p.animTimer * 2) * 3, dy: -Math.sin(p.animTimer * 2) * 3, scale: 1.08 },
        flyUpLeft: { dx: -Math.sin(p.animTimer * 2) * 3, dy: -Math.sin(p.animTimer * 2) * 3, scale: 1.08 },
        flyDownRight: { dx: Math.sin(p.animTimer * 2) * 3, dy: Math.sin(p.animTimer * 2) * 3, scale: 1.08 },
        flyDownLeft: { dx: -Math.sin(p.animTimer * 2) * 3, dy: Math.sin(p.animTimer * 2) * 3, scale: 1.08 },
        parry: { dx: 0, dy: 0, scale: 1.12 },
        attackKi: { dx: Math.sin(p.animTimer * 3) * 6, dy: 0, scale: 1.1 },
        chargeKi: { dx: 0, dy: Math.sin(p.animTimer * 4) * 2, scale: 1.06 },
        transform: { dx: 0, dy: -Math.sin(p.animTimer * 2) * 5, scale: 1.15 },
        hit: { dx: 0, dy: 0, scale: 1.04 }
    };
    const shift = actionShift[animationState] || actionShift.idle;
    if (isDrawableSource(animationFrame)) {
        const zoom = shift.scale;
        const offsetX = shift.dx;
        const offsetY = shift.dy;
        const drawW = p.w * zoom;
        const drawH = p.h * zoom;
        const drawX = renderX + (p.w - drawW) / 2 + offsetX;
        const drawY = renderY + (p.h - drawH) / 2 + offsetY;

        ctx.drawImage(animationFrame, drawX, drawY, drawW, drawH);
    } else if (charData && charData.imageObj && charData.imageObj.complete && charData.imageObj.naturalWidth !== 0) {
        let img = getCutoutSource(charData.imageObj, charData.bgRemoval);
        let imgW = img.naturalWidth || img.width;
        let imgH = img.naturalHeight || img.height;
        let fw = charData.frameWidth || imgW;
        let fh = charData.frameHeight || imgH;
        let totalF = charData.totalFrames || 1;

        let currentFrame = Math.floor(p.animTimer) % totalF;
        let sx = currentFrame * fw;
        const zoom = shift.scale;
        const offsetX = shift.dx;
        const offsetY = shift.dy;
        const drawW = p.w * zoom;
        const drawH = p.h * zoom;
        const drawX = renderX + (p.w - drawW) / 2 + offsetX;
        const drawY = renderY + (p.h - drawH) / 2 + offsetY;

        ctx.drawImage(img, sx, 0, fw, fh, drawX, drawY, drawW, drawH);
    } else {
        ctx.fillStyle = isBoss ? "#ff0055" : "#00ffff";
        ctx.fillRect(renderX, renderY, p.w, p.h);
    }

    ctx.restore();
}

function drawAuraWaves(entity, charData, isBoss = false) {
    const auraType = charData && charData.aura ? charData.aura : "gelo";
    const palette = AURA_COLORS[auraType] || AURA_COLORS.gelo;
    const colors = palette.length ? palette : ["#62eaff"];
    const centerX = entity.x + entity.w / 2;
    const baseY = entity.y + entity.h + 6;
    const topY = entity.y - entity.h * 0.9;
    const totalHeight = baseY - topY;
    const time = gameplayClock;
    const levelCount = isBoss ? 5 : 6;
    const maxFlames = isBoss ? 5 : 7;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 0;

    for (let level = 0; level < levelCount; level++) {
        const progress = level / (levelCount - 1);
        const levelY = baseY - progress * totalHeight;
        const envelope = 1 - progress * 0.9;
        const flameCount = Math.max(1, Math.round(maxFlames * envelope));
        const bandWidth = entity.w * (1.35 * envelope + 0.1);

        for (let flame = 0; flame < flameCount; flame++) {
            const spread = flameCount === 1 ? 0 : flame / (flameCount - 1) - 0.5;
            const seed = level * 17 + flame * 3;
            const baseX = centerX + spread * bandWidth;
            const speed = 0.7 + (seed % 5) * 0.08;
            const loop = entity.h * (0.58 + (seed % 4) * 0.08);
            const travel = (time * entity.h * speed + seed * 13) % loop;
            const y = levelY - travel;
            const height = entity.h * (0.22 + envelope * 0.34);
            const tipY = y - height;
            const localSway = Math.sin(time * 2 + seed) * entity.w * 0.025 * envelope;
            const width = entity.w * (0.035 + envelope * 0.055);
            const color = colors[seed % colors.length];

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.18 + envelope * 0.07;
            ctx.beginPath();
            ctx.moveTo(baseX - width, y + 3);
            ctx.quadraticCurveTo(baseX - width * 1.4 + localSway, (y + tipY) / 2, baseX + localSway, tipY);
            ctx.quadraticCurveTo(baseX + width * 1.4 + localSway, (y + tipY) / 2, baseX + width, y + 3);
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = 0.5 + envelope * 0.15;
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1, entity.w * 0.012);
            ctx.beginPath();
            ctx.moveTo(baseX, y + 3);
            ctx.quadraticCurveTo(baseX - width * 0.3 + localSway, (y + tipY) / 2, baseX + localSway, tipY);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawSaibamans() {
    world.saibamans.forEach(s => {
        ctx.save();
        ctx.fillStyle = "#32cd32";
        ctx.fillRect(s.x, s.y + 10, s.w, s.h - 10);
        
        ctx.fillStyle = "#228b22";
        ctx.fillRect(s.x + 4, s.y, s.w - 8, 12);
        
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(s.x + 6, s.y + 12, 5, 4);
        ctx.fillRect(s.x + s.w - 11, s.y + 12, 5, 4);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(s.x - 2, s.y + s.h - 6, 6, 6);
        ctx.fillRect(s.x + s.w - 4, s.y + s.h - 6, 6, 6);
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

        if (item.type === "senzu") {
            ctx.shadowColor = "#8cff42";
            ctx.fillStyle = "#8dcc3f";
            ctx.strokeStyle = "#315d24";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(-5, 0, 6, 10, -0.45, 0, Math.PI * 2);
            ctx.ellipse(5, 0, 6, 10, 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#d9ff83";
            ctx.fillRect(-7, -4, 3, 3);
            ctx.fillRect(3, -5, 3, 3);
        } else if (item.type === "capsule") {
            ctx.shadowColor = "#35aaff";
            ctx.fillStyle = "#d5b39a";
            ctx.strokeStyle = "#6d4436";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.arcTo(7, -12, 7, -5, 7);
            ctx.lineTo(7, 5);
            ctx.arcTo(7, 12, 0, 12, 7);
            ctx.arcTo(-7, 12, -7, 5, 7);
            ctx.lineTo(-7, -5);
            ctx.arcTo(-7, -12, 0, -12, 7);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#167be8";
            ctx.fillRect(-7, -6, 14, 6);
            ctx.fillRect(-7, 3, 14, 6);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#167be8";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = "#167be8";
            ctx.font = "bold 5px monospace";
            ctx.textAlign = "center";
            ctx.fillText("C", 0, 2);
        } else if (item.type === "cloud") {
            // Nuvem voadora: nuvenzinha fofa com um brilho de velocidade atrás.
            ctx.shadowColor = "#fff4c2";
            ctx.strokeStyle = "#8a7a3a";
            ctx.lineWidth = 1.5;
            ctx.fillStyle = "#fffdf2";
            ctx.beginPath();
            ctx.arc(-5, 2, 6, 0, Math.PI * 2);
            ctx.arc(2, -1, 7, 0, Math.PI * 2);
            ctx.arc(7, 3, 5, 0, Math.PI * 2);
            ctx.arc(-2, 5, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = "#ffe89a";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-13, 0); ctx.lineTo(-9, 0);
            ctx.moveTo(-14, 5); ctx.lineTo(-10, 5);
            ctx.stroke();
        } else if (item.type === "staff") {
            // Bastão mágico: cajado com uma gema brilhando na ponta.
            ctx.shadowColor = "#ff9d3d";
            ctx.strokeStyle = "#5a3a1a";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-6, 11);
            ctx.lineTo(6, -9);
            ctx.stroke();
            ctx.strokeStyle = "#caa24a";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-6, 11);
            ctx.lineTo(6, -9);
            ctx.stroke();
            ctx.fillStyle = "#ff9d3d";
            ctx.strokeStyle = "#7a3a0a";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(6, -13); ctx.lineTo(9.5, -8); ctx.lineTo(6, -3); ctx.lineTo(2.5, -8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#ffe1b0";
            ctx.beginPath();
            ctx.arc(5, -9, 1.6, 0, Math.PI * 2);
            ctx.fill();
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

function drawHUD() {
    ctx.save();
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
    ctx.fillText(`WAVE: ${waveNumber}`, 120, 58);

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

        // Onda atual e recorde de ondas daquela fase, logo abaixo da barra de vida do vilão — só faz sentido
        // no modo história (o co-op é versus, não tem "onda").
        if (gameMode === "singleplayer") {
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
        if (key === "parry" && mobileDoubleTapParry && gameState !== "options_hud") continue;

        const btnRect = getHudButtonRect(key);
        const btn = touchHudLayout[key];
        const isEditing = gameState === "options_hud";
        const isSelected = hudEditorSelectedBtn === key && isEditing;
        // Botão TRANSF. acende (dourado) quando há ki suficiente e fica apagado quando não dá para usar.
        const transformReady = key === "transform" && player.ki >= 80 && !player.isSSJ;
        const specialReady = key === "special" && canUseSpecial(player.ki, player.maxKi) && world.beamActive <= 0;
        const transformDim = (key === "transform" && !transformReady && !isEditing) || (key === "special" && !specialReady && !isEditing);
        const highlight = isSelected || transformReady || specialReady;
        const centerX = btnRect.x + btnRect.w / 2;
        const centerY = btnRect.y + btnRect.h / 2;
        const radius = Math.min(btnRect.w, btnRect.h) * 0.48;

        ctx.globalAlpha = Math.min(1, btn.opacity) * (transformDim ? 0.55 : 1);
        ctx.fillStyle = highlight ? "rgba(255, 190, 40, 0.2)" : "rgba(5, 22, 48, 0.18)";
        ctx.strokeStyle = highlight ? "rgba(255, 215, 80, 0.95)" : "rgba(94, 225, 255, 0.78)";
        ctx.lineWidth = highlight ? 3 : 2;
        ctx.shadowColor = highlight ? "rgba(255, 190, 40, 0.45)" : "rgba(0, 210, 255, 0.2)";
        ctx.shadowBlur = highlight ? 12 : 7;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = highlight ? "#fff1a8" : "#e8fbff";
        ctx.font = "bold 8px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(hudLabels[key] || key.toUpperCase(), centerX, centerY + 1);
    }
    ctx.restore();
    ctx.textBaseline = "alphabetic";
}

// ==================== LOOP PRINCIPAL DE RENDERIZAÇÃO E JOGO ====================
function render() {
    let now = performance.now();
    deltaTime = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;

    // alvos de menu do quadro anterior (usados pela navegação com controle); o quadro atual recomeça vazio
    menuTargetsPrev = menuTargets;
    menuTargets = [];
    pollGamepadMenu(deltaTime);
    pollControlsTestExit();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (shakeTime > 0) {
        shakeTime -= deltaTime * 60;
        let offsetX = (Math.random() - 0.5) * shakeIntensity;
        let offsetY = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(offsetX, offsetY);
    }

    if (gameState === "tutorial") {
        pollGamepads(deltaTime);
        updateTutorial(deltaTime);
        gameplayClock += deltaTime;
        drawTutorialScreen();
    }
    else if (gameState === "playing" || gameState === "paused" || gameState === "gameover") {
        pollGamepads(deltaTime);
        update(deltaTime);
        if (gameState === "playing") gameplayClock += deltaTime;

        drawStageBackground();
        drawSaibamans();
        drawPickups();

        drawAuraWaves(player, characterDB[selectedCharacter], false);
        drawAuraWaves(player2, characterDB[selectedBoss], true);

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
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (resumeCountdown > 0) {
                resumeCountdown -= deltaTime;
                if (resumeCountdown <= 0) {
                    resumeCountdown = 0;
                    autoPaused = false;
                    setGameState("playing", "BATALHA EM ANDAMENTO");
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
                drawBtn(300, 110, 200, 35, "CONTINUAR");
                drawBtn(300, 160, 200, 35, "OPÇÕES");
                drawBtn(300, 210, 200, 35, "SAIR PARA MENU");
            }
        } else if (gameState === "gameover") {
            const gs = gameOverStats || { stageName: "", score, attacks: 0, parries: 0, hitsReceived: 0, items: { senzu: 0, capsule: 0, cloud: 0, staff: 0 }, isNewStageRecord: false, isNewGeneralRecord: false };

            ctx.fillStyle = "rgba(0,0,0,0.88)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = "center";
            ctx.fillStyle = "#ff0055";
            ctx.font = "bold 22px 'Courier New', monospace";
            ctx.fillText("VOCÊ FOI DERROTADO!", canvas.width / 2, 30);
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
            ctx.fillText("CLIQUE EM QUALQUER LUGAR PARA REINICIAR", canvas.width / 2, panelY + panelH + 40);
        }
    } 
    else if (gameState === "menu") {
        drawDragonBallMenuBackdrop(true);

        drawDragonBallPanel(150, 35, 500, 270, "SAIYAN FIGHT", "A BATALHA COMEÇA AGORA");

        drawBtn(190, 95, 180, 36, "JOGAR", "#fff0a6");
        drawBtn(430, 95, 180, 36, "PERSONAGENS", "#fff0a6");
        drawBtn(190, 150, 180, 36, "ARENAS", "#fff0a6");
        drawBtn(430, 150, 180, 36, "OPÇÕES", "#fff0a6");
        drawBtn(190, 205, 180, 36, "RANKING", "#fff0a6");
        drawBtn(430, 205, 180, 36, "DATABASE", "#fff0a6");
        drawBtn(190, 260, 180, 36, "CONQUISTAS", "#fff0a6");
        drawBtn(430, 260, 180, 36, "TUTORIAL", "#fff0a6");

        drawBtn(20, 305, 120, 26, "UPDATES", "#fbbf24", "bold 10px 'Segoe UI', sans-serif");
    }
    else if (gameState === "mode_select") {
        drawDragonBallMenuBackdrop(false);

        drawDragonBallPanel(120, 60, 560, 230, "ESCOLHA SEU CAMINHO", "PARTIDA RÁPIDA OU LOCAL");

        drawBtn(175, 176, 200, 58, "SINGLEPLAYER", "#7dd3fc");
        drawBtn(425, 176, 200, 58, "CO-OP LOCAL", "#a78bfa");
        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "characters") {
        drawDragonBallMenuBackdrop(false);
        ctx.fillStyle = "rgba(2, 10, 29, 0.68)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#fff0a6";
        ctx.font = "bold 18px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SELEÇÃO DE PERSONAGEM", canvas.width / 2, 25);

        drawBtn(250, 45, 140, 25, "HERÓIS", currentTab === "HERÓIS" ? "#ffff00" : "#00ffff");
        drawBtn(410, 45, 140, 25, "VILÕES", currentTab === "VILÕES" ? "#ffff00" : "#00ffff");

        let chars = getFilteredCharacters();
        chars.forEach((key, i) => {
            let col = i % 5;
            let row = Math.floor(i / 5);
            let cx = 40 + col * (UI.GRID_CARD_WIDTH + 12);
            let cy = 80 + row * (UI.GRID_CARD_HEIGHT + 10);

            let isSel = (currentTab === "HERÓIS" && selectedCharacter === key) || (currentTab === "VILÕES" && selectedBoss === key);

            registerMenuTarget(cx, cy, UI.GRID_CARD_WIDTH, UI.GRID_CARD_HEIGHT);
            ctx.fillStyle = isSel ? "#174f78" : "rgba(6, 23, 52, 0.9)";
            ctx.fillRect(cx, cy, UI.GRID_CARD_WIDTH, UI.GRID_CARD_HEIGHT);
            ctx.strokeStyle = isSel ? "#ffd23f" : "#e85d04";
            ctx.lineWidth = isSel ? 3 : 1;
            ctx.strokeRect(cx, cy, UI.GRID_CARD_WIDTH, UI.GRID_CARD_HEIGHT);

            let cItem = characterDB[key];
            let spriteImg = cItem && cItem.imageObj ? cItem.imageObj : null;
            if (!spriteImg && cItem && cItem.defaultUrl) {
                spriteImg = new Image();
                spriteImg.src = cItem.defaultUrl;
            }

            spriteImg = getCutoutSource(spriteImg, cItem && cItem.bgRemoval);
            if (isDrawableSource(spriteImg)) {
                try {
                    const spriteWidth = spriteImg.naturalWidth || spriteImg.width;
                    const spriteHeight = spriteImg.naturalHeight || spriteImg.height;
                    ctx.drawImage(spriteImg, 0, 0, spriteWidth, spriteHeight, cx + 48, cy + 10, 40, 40);
                } catch (e) {}
            } else {
                ctx.fillStyle = "#0b1d37";
                ctx.fillRect(cx + 48, cy + 10, 40, 40);
                ctx.strokeStyle = "#f2a900";
                ctx.strokeRect(cx + 48, cy + 10, 40, 40);
            }

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(cItem ? cItem.name : key, cx + UI.GRID_CARD_WIDTH / 2, cy + 70);
        });

        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "stages") {
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
            let col = i % 4;
            let row = Math.floor(i / 4);
            let sx = 40 + col * 190;
            let sy = 68 + row * 104;
            const unlocked = isStageUnlockedByProgress(stg.id, stageProgress);

            registerMenuTarget(sx, sy, 175, 90);
            let isSel = selectedStage === stg.id && unlocked;
            ctx.fillStyle = isSel ? "#1a3a5a" : unlocked ? "#111125" : "#0a0a12";
            ctx.fillRect(sx, sy, 175, 90);
            ctx.strokeStyle = isSel ? "#ffff00" : unlocked ? "#00ffff" : "#3a3a48";
            ctx.lineWidth = isSel ? 3 : 1;
            ctx.strokeRect(sx, sy, 175, 90);

            ctx.font = "bold 8px monospace";
            ctx.fillStyle = "#5a6a8a";
            ctx.textAlign = "left";
            ctx.fillText(`FASE ${i + 1}`, sx + 6, sy + 14);

            if (unlocked) {
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 10px monospace";
                ctx.textAlign = "center";
                ctx.fillText(stg.name, sx + 87, sy + 50, 165);
            } else {
                ctx.globalAlpha = 0.55;
                ctx.fillStyle = "#8892a8";
                ctx.font = "bold 10px monospace";
                ctx.textAlign = "center";
                ctx.fillText(stg.name, sx + 87, sy + 42, 165);
                ctx.globalAlpha = 1;
                // Cadeado simples desenhado com formas básicas, sem depender de fonte com emoji.
                const lockX = sx + 87, lockY = sy + 62;
                ctx.strokeStyle = "#c9a13a";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(lockX, lockY - 5, 5, Math.PI, 0, false);
                ctx.stroke();
                ctx.fillStyle = "#c9a13a";
                ctx.fillRect(lockX - 7, lockY - 5, 14, 10);
                ctx.fillStyle = "#3a2a10";
                ctx.font = "bold 8px monospace";
                ctx.fillText("BLOQUEADA", lockX, sy + 84);
            }
        });

        if (stageLockedHintTimer > 0) {
            stageLockedHintTimer -= deltaTime * 60;
            ctx.fillStyle = "#ff5555";
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "center";
            ctx.fillText(stageLockedHintText, canvas.width / 2, canvas.height - 14);
        }

        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "options_main") {
        drawDragonBallMenuBackdrop(false);

        drawDragonBallPanel(180, 30, 440, 300, "OPÇÕES DO JOGO", "CONFIGURAÇÕES DA PARTIDA");

        drawBtn(220, 120, 360, 42, "CONTROLES", "#7dd3fc");
        drawBtn(220, 180, 360, 42, "CONFIGURAÇÃO DE ÁUDIO", "#c4b5fd");
        drawBtn(220, 240, 360, 42, "IDIOMA", "#fde68a");

        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "options_language") {
        drawDragonBallMenuBackdrop(false);
        drawDragonBallPanel(170, 70, 460, 220, "IDIOMA DO JOGO", "IDIOMA ATUAL");
        drawBtn(220, 145, 360, 42, "PORTUGUÊS", selectedLanguage === "pt-BR" ? "#fbbf24" : "#7dd3fc");
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("NOVOS IDIOMAS SERÃO ADICIONADOS FUTURAMENTE", canvas.width / 2, 220);
        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "options_controls") {
        drawDragonBallMenuBackdrop(false);
        drawDragonBallPanel(120, 50, 560, 270, "CONTROLES", "SELEÇÃO DE ENTRADA");

        // 2 linhas abaixo do subtítulo (que fica em y+54) — antes o 1º botão (y=100) cobria a escrita.
        drawBtn(180, 144, 220, 46, "CONTROLES PC", "#7dd3fc");
        drawBtn(420, 144, 220, 46, "CONTROLES TOUCH", "#93c5fd");
        drawBtn(180, 204, 220, 46, "CONTROLE PS5", "#c4b5fd");
        drawBtn(420, 204, 220, 46, "TESTAR CONTROLES", "#a7f3d0");

        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "options_pc") {
        drawDragonBallMenuBackdrop(false);

        drawDragonBallPanel(90, 15, 620, 333, "CONTROLES PC");
        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");

        const activeMode = getEffectiveControlMode();
        const autoMode = controlSelectionMode === "auto";
        const pcMode = autoMode ? activeMode === "pc" : controlSelectionMode === "pc";
        const touchMode = autoMode ? activeMode === "touch" : controlSelectionMode === "touch";

        const profileName = activeControlProfile === "p2" ? "CONTROLE 2" : "CONTROLE 1";
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 18px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(profileName, 400, 68);

        const drawToggleRow = (label, x, active, color) => {
            registerMenuTarget(x, 314, 150, 28);
            ctx.save();
            ctx.fillStyle = "#e2e8f0";
            ctx.font = "bold 14px 'Courier New', monospace";
            ctx.textAlign = "center";
            ctx.fillText(label, x + 106, 296);

            ctx.fillStyle = "rgba(10, 20, 35, 0.9)";
            ctx.beginPath();
            ctx.moveTo(x + 70, 314);
            ctx.lineTo(x + 142, 314);
            ctx.quadraticCurveTo(x + 150, 314, x + 150, 322);
            ctx.lineTo(x + 150, 334);
            ctx.quadraticCurveTo(x + 150, 342, x + 142, 342);
            ctx.lineTo(x + 70, 342);
            ctx.quadraticCurveTo(x + 62, 342, x + 62, 334);
            ctx.lineTo(x + 62, 322);
            ctx.quadraticCurveTo(x + 62, 314, x + 70, 314);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = active ? color : "#7dd3fc";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#dbeafe";
            ctx.font = "bold 9px 'Courier New', monospace";
            ctx.textAlign = "center";
            ctx.fillText("OFF", x + 74, 308);
            ctx.fillText("ON", x + 140, 308);

            ctx.fillStyle = active ? color : "#40566d";
            ctx.beginPath();
            ctx.strokeStyle = active ? color : "#557089";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + 91, 328);
            ctx.lineTo(x + 123, 328);
            ctx.stroke();
            ctx.fillStyle = active ? color : "#40566d";
            ctx.beginPath();
            ctx.arc(x + (active ? 123 : 91), 328, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        drawBtn(130, 78, 150, 32, "CONTROLE 1", activeControlProfile === "p1" ? "#fbbf24" : "#7dd3fc");
        drawBtn(520, 78, 150, 32, "CONTROLE 2", activeControlProfile === "p2" ? "#fbbf24" : "#7dd3fc");

        drawBtn(130, 114, 150, 28, "MODO TECLADO", pcInputMode === "keyboard" ? "#fbbf24" : "#7dd3fc", "10px monospace");
        drawBtn(520, 114, 150, 28, "MODO MOUSE", pcInputMode === "mouse" ? "#fbbf24" : "#7dd3fc", "10px monospace");

        drawToggleRow("AUTOMÁTICO", 120, autoMode, "#22c55e");
        drawToggleRow("PC", 325, pcMode, "#7dd3fc");
        drawToggleRow("TOUCH", 530, touchMode, "#93c5fd");

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
            let col = idx % 2;
            let row = Math.floor(idx / 2);
            let lx = col === 0 ? 125 : 405;
            let rx = col === 0 ? 280 : 560;
            let ry = PC_KEY_ROW_Y0 + row * PC_KEY_ROW_STEP;

            ctx.fillStyle = "#ffffff";
            ctx.font = "12px monospace";
            ctx.textAlign = "left";
            ctx.fillText(`${actionLabels[act]}:`, lx, ry + 16);

            drawBtn(rx, ry, 110, 24, getBindingDisplayName(keyBindings[profileKey][act] || "NONE"), "#00ffff", "10px monospace");
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

        drawBtn(170, 106, 180, 34, "ANALÓGICO", touchControlMode === "analog" ? "#fbbf24" : "#7dd3fc");
        drawBtn(450, 106, 180, 34, "DESLIZAR", touchControlMode === "swipe" ? "#fbbf24" : "#7dd3fc");

        drawBtn(200, 148, 400, 34, `DUPLO TOQUE PARRY: ${mobileDoubleTapParry ? "ATIVADO" : "DESATIVADO"}`, mobileDoubleTapParry ? "#a7f3d0" : "#fca5a5");
        drawBtn(200, 190, 400, 34, `VIBRAÇÃO: ${vibrationEnabled ? "ATIVADA" : "DESATIVADA"}`, vibrationEnabled ? "#a7f3d0" : "#fca5a5");
        drawBtn(200, 232, 400, 34, `TIRO CONTÍNUO (DEDO NO ANALÓGICO): ${touchAutoFire ? "ATIVADO" : "DESATIVADO"}`, touchAutoFire ? "#a7f3d0" : "#fca5a5", "bold 11px 'Courier New', monospace");
        drawBtn(200, 274, 400, 34, "REORGANIZAR BOTÕES HUD", "#c4b5fd");

        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "options_hud") {
        drawStageBackground();
        ctx.fillStyle = "rgba(3, 10, 25, 0.58)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawTouchHUD();

        drawBtn(20, 20, 100, 30, "SALVAR", "#00ff55");
        drawBtn(130, 20, 100, 30, "RESETAR", "#ff0055");

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
        drawBtn(560, 105, 34, 34, "-", "#fca5a5");
        drawBtn(604, 105, 34, 34, "+", "#86efac");

        ctx.fillText(`VOLUME BGM: ${Math.round(bgmVolume * 100)}%`, 210, 180);
        drawBtn(560, 160, 34, 34, "-", "#fca5a5");
        drawBtn(604, 160, 34, 34, "+", "#86efac");

        drawBtn(250, 205, 300, 38, isMuted ? "ÁUDIO: MUTADO" : "ÁUDIO: ATIVADO", isMuted ? "#fca5a5" : "#86efac");

        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
    }
    else if (gameState === "ranking") {
        drawStageBackground();
        ctx.fillStyle = "rgba(9, 9, 21, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffff00";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "center";
        ctx.fillText("MELHORES PONTUAÇÕES", canvas.width / 2, 30);

        registerMenuTarget(220, 52, 170, 30);
        registerMenuTarget(410, 52, 170, 30);
        drawBtn(220, 52, 170, 30, "GERAL", rankingViewMode === "geral" ? "#ffff00" : "#93c5fd");
        drawBtn(410, 52, 170, 30, "POR FASE", rankingViewMode === "fase" ? "#ffff00" : "#93c5fd");

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
                const px = 40 + (i % 8) * 92, py = 90;
                registerMenuTarget(px, py, 84, 30);
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

        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
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
            ["gold", "OURO", TIER_COLORS.gold],
            ["silver", "PRATA", TIER_COLORS.silver],
            ["bronze", "BRONZE", TIER_COLORS.bronze]
        ];
        const slotW = cardW / 3;
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

        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
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

        registerMenuTarget(canvas.width / 2 - 90, 300, 180, 34);
        drawBtn(canvas.width / 2 - 90, 300, 180, 34, "CONTINUAR", "#86efac", "bold 12px 'Courier New', monospace");
    }
    else if (gameState === "stage_map") {
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
            registerMenuTarget(node.x - STAGE_MAP_NODE_R, node.y - STAGE_MAP_NODE_R, STAGE_MAP_NODE_R * 2, STAGE_MAP_NODE_R * 2);
            const isSel = selectedStage === node.id;
            const theme = STAGE_THEME_COLOR[node.id] || "#8899aa";

            ctx.save();
            if (!node.unlocked) { ctx.globalAlpha = 0.45; ctx.filter = "grayscale(1)"; }
            drawStageNodeIcon(node.x, node.y, STAGE_MAP_NODE_R - 3, node.id);
            ctx.restore();

            ctx.beginPath();
            ctx.arc(node.x, node.y, STAGE_MAP_NODE_R, 0, Math.PI * 2);
            ctx.strokeStyle = isSel ? "#ffff00" : node.unlocked ? theme : "#3a3a48";
            ctx.lineWidth = isSel ? 4 : node.unlocked ? 3 : 2;
            ctx.stroke();

            if (!node.unlocked) {
                ctx.fillStyle = "#e8b93a";
                ctx.beginPath();
                ctx.arc(node.x, node.y - STAGE_MAP_NODE_R - 2, 5.5, Math.PI, 0);
                ctx.stroke();
                ctx.fillRect(node.x - 6, node.y - STAGE_MAP_NODE_R - 2, 12, 9);
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

            drawBtn(canvas.width / 2 - 270, 140, 170, 60, "NORMAL (ONDAS 1-5)", "#93c5fd", "bold 10px 'Courier New', monospace");
            drawModeButton(canvas.width / 2 - 85, 140, 170, 60, "DIFÍCIL", canHard, "#f87171");
            drawModeButton(canvas.width / 2 + 100, 140, 170, 60, "SEM LIMITE", canUnlimited, "#86efac");

            drawBtn(canvas.width / 2 - 70, 224, 140, 30, "VOLTAR", "#fca5a5", "bold 10px 'Courier New', monospace");
        }

        if (stageLockedHintTimer > 0) {
            stageLockedHintTimer -= deltaTime * 60;
            ctx.fillStyle = "#ff5555";
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "center";
            ctx.fillText(stageLockedHintText, canvas.width / 2, canvas.height - 10);
        }

        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
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

            let spriteImg = cItem && cItem.imageObj ? cItem.imageObj : null;
            if (!spriteImg && cItem && cItem.defaultUrl) {
                spriteImg = databaseImageCache[cItem.defaultUrl];
                if (!spriteImg) {
                    spriteImg = new Image();
                    spriteImg.src = cItem.defaultUrl;
                    databaseImageCache[cItem.defaultUrl] = spriteImg;
                }
            }

            const geo = getDatabaseCardGeometry(layout, cx, cy);

            spriteImg = getCutoutSource(spriteImg, cItem && cItem.bgRemoval);
            if (isDrawableSource(spriteImg)) {
                try {
                    const spriteWidth = spriteImg.naturalWidth || spriteImg.width;
                    const spriteHeight = spriteImg.naturalHeight || spriteImg.height;
                    ctx.drawImage(spriteImg, 0, 0, spriteWidth, spriteHeight, geo.imageX, geo.imageY, geo.imageSize, geo.imageSize);
                } catch (e) {}
            } else {
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

        drawBtn(20, 20, 42, 32, "←", "#e2e8f0", "bold 20px monospace");
    }

    if (achievementBanner.active) {
        // Só anima/conta o tempo enquanto o jogo não está pausado — senão a conquista podia aparecer, deslizar
        // e sumir sozinha até enquanto a partida estava congelada, sem o jogador nem ver direito.
        if (gameState !== "paused") {
            achievementBanner.timer++;
            if (achievementBanner.timer < 30) achievementBanner.yOffset += 2;
            else if (achievementBanner.timer > achievementBanner.maxTimer - 30) achievementBanner.yOffset -= 2;
        }

        ctx.save();
        ctx.fillStyle = "#111133";
        ctx.fillRect(canvas.width / 2 - 140, achievementBanner.yOffset, 280, 40);
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 140, achievementBanner.yOffset, 280, 40);

        ctx.fillStyle = "#ffff00";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("CONQUISTA DESBLOQUEADA!", canvas.width / 2, achievementBanner.yOffset + 15);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(achievementBanner.title, canvas.width / 2, achievementBanner.yOffset + 30);
        ctx.restore();

        if (achievementBanner.timer >= achievementBanner.maxTimer) achievementBanner.active = false;
    }

    drawPadFocus();
    drawFullscreenButton();

    ctx.restore();
    requestAnimationFrame(render);
}

requestAnimationFrame(render);