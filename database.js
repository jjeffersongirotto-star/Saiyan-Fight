// ==================== CONSTANTES E CONFIGURAÇÃO ====================
const GAME_WIDTH = 800;
const GAME_HEIGHT = 350;
const MAX_PARTICLES = 500;
const MAX_OBSTACLES = 100;
const MAX_SAIBAMANS = 20;
const IMAGE_LOAD_TIMEOUT = 5000;

const UI = {
    MENU_BTN_WIDTH: 200,
    MENU_BTN_HEIGHT: 32,
    MENU_BTN_X: 300,
    MENU_SPACING: 40,
    GRID_CARD_WIDTH: 138,
    GRID_CARD_HEIGHT: 90,
    MODAL_WIDTH: 420,
    PREVIEW_SIZE: 100
};

// ==================== DOM E CANVAS ====================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("file-input");
const modal = document.getElementById("modal-editor");
const updatesModal = document.getElementById("modal-updates");
const sysAlertModal = document.getElementById("modal-alert");
const prevCanvas = document.getElementById("preview-canvas");
const prevCtx = prevCanvas ? prevCanvas.getContext("2d") : null;

const SUB_ANIM_KEYS = ["idle", "flyRight", "flyLeft", "flyDown", "flyUp", "flyUpRight", "flyUpLeft", "flyDownRight", "flyDownLeft", "parry", "attackKi", "chargeKi", "transform"];

// ==================== ACESSIBILIDADE: FOCO EM MODAIS ====================
// Guarda o elemento que tinha foco antes de abrir um modal, para devolver o
// foco a ele quando o modal fechar (evita "perder" o teclado/leitor de tela).
let lastFocusedBeforeModal = null;

function focusModal(modalEl) {
    if (!modalEl) return;
    lastFocusedBeforeModal = document.activeElement;
    const focusable = modalEl.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();
}

function restoreFocusAfterModal() {
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
        lastFocusedBeforeModal.focus();
    }
    lastFocusedBeforeModal = null;
}

// Fecha o modal visível com Esc, por padrão de acessibilidade em diálogos.
document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (modal && modal.style.display === "flex") closeModal();
    else if (updatesModal && updatesModal.style.display === "flex") closeUpdatesModal();
    else if (sysAlertModal && sysAlertModal.style.display === "flex") closeSystemAlert();
});

let touchHudLayout = getDefaultTouchHudLayout(window.innerWidth);

ctx.imageSmoothingEnabled = false;
if (prevCtx) prevCtx.imageSmoothingEnabled = false;

function fitCanvasToViewport() {
    // Se o aparelho já girou de verdade (landscape real) enquanto a rotação por CSS estava ativa, tira a
    // rotação forçada — senão os dois se somam e o jogo aparece de lado/de cabeça pra baixo.
    const rotatedContainer = document.getElementById("game-container");
    if (rotatedContainer && rotatedContainer.classList.contains("forced-landscape") && window.innerWidth > window.innerHeight) {
        rotatedContainer.classList.remove("forced-landscape");
    }
    updateMobileOrientationHint();
    const canvasContainer = canvas.parentElement;
    const isForcedLandscape = Boolean(canvasContainer && canvasContainer.classList && canvasContainer.classList.contains("forced-landscape"));
    const containerWidth = canvasContainer ? canvasContainer.clientWidth : window.innerWidth;
    const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement ||
        (canvasContainer && canvasContainer.classList && canvasContainer.classList.contains("is-fullscreen")) || isForcedLandscape);
    // Girado por CSS: o que visualmente vira "largura" disponível pro jogo é a ALTURA física da tela (e
    // vice-versa) — é exatamente isso que a rotação troca. Sem essa troca aqui, o canvas calculava o tamanho
    // como se ainda estivesse em pé e ficava pequeno demais, ou saía da área rotacionada.
    const viewportWidth = isForcedLandscape ? Math.max(1, window.innerHeight)
        : Math.max(1, Math.min(window.innerWidth, containerWidth || window.innerWidth));
    // Fora da tela cheia desconta o padding do body e o texto de instruções abaixo do canvas,
    // senão a página passa da altura da janela e o jogo não fica centralizado.
    const instructionEl = document.getElementById("instrucao-texto");
    const instructionSpace = (instructionEl && instructionEl.offsetHeight ? instructionEl.offsetHeight : 20) + 10;
    const viewportHeight = isForcedLandscape ? Math.max(1, window.innerWidth)
        : Math.max(1, isFullscreen ? window.innerHeight : window.innerHeight - 24 - instructionSpace);

    // A resolução lógica do canvas fica SEMPRE fixa em GAME_WIDTH x GAME_HEIGHT
    // (ver AGENTS.md). Existia aqui um "modo adaptativo" que trocava o canvas.width/
    // canvas.height para o tamanho físico da tela em fullscreen mobile, mas nada no
    // pipeline de desenho reescalava os draws para esse novo tamanho — o jogo
    // continuava desenhando em coordenadas 800x350 num canvas muito maior, deixando
    // quase toda a tela preta. Removido: a escala fica só no CSS, como no resto do jogo.
    if (canvas.width !== GAME_WIDTH) canvas.width = GAME_WIDTH;
    if (canvas.height !== GAME_HEIGHT) canvas.height = GAME_HEIGHT;
    ctx.imageSmoothingEnabled = false;

    const viewportScale = Math.min(viewportWidth / GAME_WIDTH, viewportHeight / GAME_HEIGHT);
    const maxDesktopScale = viewportWidth > 540 && !isFullscreen ? 1.6 : Infinity;
    const scale = Math.min(viewportScale, maxDesktopScale);

    const displayWidth = Math.round(GAME_WIDTH * scale);
    const displayHeight = Math.round(GAME_HEIGHT * scale);
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.style.maxWidth = `${viewportWidth}px`;
    canvas.style.maxHeight = `${viewportHeight}px`;
    canvas.style.aspectRatio = `${GAME_WIDTH} / ${GAME_HEIGHT}`;
    canvas.style.display = "block";

    // Só volta ao layout padrão se o jogador não personalizou os botões (a flag é gravada ao clicar em SALVAR
    // no editor de HUD) e nunca enquanto ele está arrastando botões no editor.
    if (gameState !== "options_hud" && !readStorage("saiyan_touch_hud_customized")) {
        touchHudLayout = getDefaultTouchHudLayout(window.innerWidth);
    }
}

function updateMobileOrientationHint() {
    const hint = document.getElementById("mobile-orientation-hint");
    if (!hint) return;
    const container = document.getElementById("game-container");
    const isForcedLandscape = Boolean(container && container.classList.contains("forced-landscape"));
    const isMobilePortrait = isMobileDevice() && window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
    // Com a rotação forçada por CSS já ativa, o aparelho continua fisicamente em pé (a checagem de largura x
    // altura acima nunca vira "false" sozinha) — sem essa condição extra, o aviso nunca sumiria.
    hint.style.display = isMobilePortrait && !isForcedLandscape ? "flex" : "none";
}

async function activateMobileLandscape() {
    const container = document.getElementById("game-container");
    try {
        const requestFullscreen = container && (container.requestFullscreen || container.webkitRequestFullscreen);
        if (requestFullscreen && !document.fullscreenElement) {
            await requestFullscreen.call(container);
        }
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock("landscape");
        }
    } catch (error) {
        console.warn("Não foi possível ativar a orientação horizontal automaticamente.", error);
    } finally {
        // Se depois de tentar de verdade o aparelho continuar em pé (comum dentro de janelas incorporadas,
        // como a do app do Claude, que costuma bloquear essas duas permissões), gira só visualmente por CSS —
        // assim o botão sempre faz alguma coisa, em vez de simplesmente não responder.
        if (container && window.innerWidth <= window.innerHeight) {
            container.classList.add("forced-landscape");
        }
        updateMobileOrientationHint();
        fitCanvasToViewport();
    }
}

// Desliga a rotação forçada por CSS (chamado ao girar o aparelho de verdade, ou ao sair da tela cheia).
function deactivateForcedLandscape() {
    const container = document.getElementById("game-container");
    if (container) container.classList.remove("forced-landscape");
    fitCanvasToViewport();
}

function normalizeTouchHudLayout(layout) {
    const normalized = {};
    for (const key of Object.keys(touchHudLayout)) {
        const btn = layout && layout[key];
        if (!btn || typeof btn !== "object") {
            normalized[key] = Object.assign({}, touchHudLayout[key]);
            continue;
        }
        normalized[key] = Object.assign({}, touchHudLayout[key], btn, {
            x: Number.isFinite(btn.x) ? (btn.x > 1 ? btn.x / canvas.width : btn.x) : touchHudLayout[key].x,
            y: Number.isFinite(btn.y) ? (btn.y > 1 ? btn.y / canvas.height : btn.y) : touchHudLayout[key].y,
            w: Number.isFinite(btn.w) && btn.w > 0 ? btn.w : touchHudLayout[key].w,
            h: Number.isFinite(btn.h) && btn.h > 0 ? btn.h : touchHudLayout[key].h,
            scale: Number.isFinite(btn.scale) && btn.scale > 0 ? btn.scale : touchHudLayout[key].scale,
            opacity: Number.isFinite(btn.opacity) ? Math.max(0, Math.min(1, btn.opacity)) : touchHudLayout[key].opacity
        });
    }
    return normalized;
}

window.addEventListener("resize", fitCanvasToViewport);
window.addEventListener("orientationchange", fitCanvasToViewport);

if (typeof ResizeObserver === "function" && canvas.parentElement) {
    new ResizeObserver(fitCanvasToViewport).observe(canvas.parentElement);
}

// ==================== ESTADO DO JOGO ====================
let gameState = "menu";
let activeControlProfile = "p1";
let selectedCharacter = "goku_adult";
let selectedBoss = "vegeta";
let editingKey = null;
let currentTab = "HERÓIS";
let tempBase64 = null;
let tempAnimations = {};
let tempFps = {};
let spriteSheetImage = null;
let selectedSpriteSheetFrame = null;
let selectedSpriteSheetFrames = new Set();
let activeSpriteSheetFrames = null;
let spriteFrameRects = {};
let lastSpriteSheetGridSignature = null;
let pendingSpriteReplacementFrame = null;
let spriteSheetPointer = null;
let activeSpriteMovement = "idle";
let spriteMotionPreviewTimer = null;
let spriteMotionPreviewFrame = 0;
let spriteMotionPreviewPlaying = false;
let savedSpriteMotionPreviewFrames = {};
let spriteMotionPreviewImageCache = {};
let selectedPreviewFrameIndices = new Set();
let previewSelectionPointerDown = false;
let previewSelectionWasDragged = false;
let selectedStage = "terra";
let gameMode = "singleplayer";

let loadedUrlImageObj = null;
let loadedFileImageObj = null;
let mouseX = 0, mouseY = 0, keysPressed = {}, mouseButtonsPressed = {};
let shakeTime = 0, shakeIntensity = 0;
let stageLockedHintText = "", stageLockedHintTimer = 0;
let screenFlashTimer = 0, screenFlashMax = 0, screenFlashColor = "#ffffff";
let onConfirmCallback = null;
let lastFrameTime = performance.now();
let deltaTime = 0;
let gameplayClock = 0;   // avança só enquanto o jogo está de verdade em ação (não soma tempo com o jogo pausado)
                         // — a aura de ki usa isso pra animar, senão ela continuava piscando com o jogo parado.

// ==================== CONTROLES CUSTOMIZÁVEIS E INPUT SETTINGS ====================
let pcInputMode = "keyboard";
let controlSelectionMode = "auto";
let manualControlMode = "pc";
let vibrationEnabled = true;
// FPS de cada movimento quando gerado pelo construtor (sprites.js). Único lugar que define isso —
// loadDefaultCharacters, o construtor e a regeneração ao carregar do armazenamento usam o mesmo mapa.
const PROCEDURAL_ANIM_FPS = {
    idle: 8, flyRight: 10, flyLeft: 10, flyUp: 10, flyDown: 10, flyUpRight: 10, flyUpLeft: 10, flyDownRight: 10, flyDownLeft: 10,
    parry: 11, attackKi: 13, chargeKi: 10, transform: 11
};

// Regenera as animações completas de um personagem procedural a partir da aparência salva.
// Um personagem do construtor guarda ~54 quadros de SVG por animação (centenas de KB a >1MB); persistir tudo
// isso no localStorage estoura a cota do navegador (4-5 personagens já passam de 5-10MB). Por isso só a
// aparência (poucas centenas de bytes) é salva, e as animações são recriadas aqui, na hora de carregar.
function buildProceduralAnimations(appearance) {
    const animations = {}, fpsSettings = {};
    SUB_ANIM_KEYS.forEach(state => {
        animations[state] = getProceduralFrameUrls(appearance, state);
        fpsSettings[state] = PROCEDURAL_ANIM_FPS[state] || 12;
    });
    return { animations, fpsSettings };
}
let padBindings = normalizePadBindings(null); // botões do controle (padrão PS5) — remapeáveis em Opções > Controle PS5
let touchAutoFire = true;          // atira sem parar enquanto o dedo estiver no analógico/tela
let autofireHintSeen = false;      // dica "apoie o dedo para atirar" já foi mostrada?
let isTouchDevice = false; // declarada aqui (antes de initSettings) para não virar variável global implícita

// Detecção do tipo de aparelho. NÃO usa mais a largura da janela nem "ontouchstart"/maxTouchPoints
// (davam "celular" em PC com janela estreita, painel de pré-visualização ou notebook com tela touch).
// Regra: se existe mouse/trackpad => PC; senão, se o ponteiro principal é o dedo (ou o navegador é mobile) => touch.
function isMobileDevice() {
    const mq = (q) => Boolean(window.matchMedia && window.matchMedia(q).matches);
    const ua = /Android|iPhone|iPad|iPod|Mobile/i.test((navigator && navigator.userAgent) || "");
    return mq("(pointer: coarse)") || ua;
}

function detectAutoControlMode() {
    const mq = (q) => Boolean(window.matchMedia && window.matchMedia(q).matches);
    if (mq("(any-pointer: fine)") && mq("(any-hover: hover)")) return "pc";
    return isMobileDevice() ? "touch" : "pc";
}

// No modo "auto" o último tipo de entrada real (toque ou mouse) manda: notebook touch, tablet com mouse etc. se adaptam sozinhos.
let autoControlOverride = null;

function getEffectiveControlMode() {
    return controlSelectionMode === "auto" ? (autoControlOverride || detectAutoControlMode()) : controlSelectionMode;
}

function applyEffectiveControlMode() {
    const mode = getEffectiveControlMode();
    isTouchDevice = mode === "touch";
    manualControlMode = mode;
    return mode;
}

let keyBindings = {
    p1: { 
        up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", 
        attack: "KeyF", charge: "KeyC", transform: "KeyT", parry: "Space", special: "KeyE" 
    },
    p2: { 
        up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", 
        attack: "Enter", charge: "Numpad0", transform: "Numpad1", parry: "Numpad2", special: "Numpad3" 
    }
};

let touchControlMode = "analog";
let mobileDoubleTapParry = true;

let hudEditorSelectedBtn = null;
let hudEditorDragging = false;
let hudDragOffsetX = 0, hudDragOffsetY = 0;
let remappingKey = null;

fitCanvasToViewport();

// ==================== ACHIEVEMENTS ====================

// ==================== AURA COLORS ====================
const AURA_COLORS = {
    gelo: ["rgba(255,255,255,0.4)", "rgba(200,245,255,0.35)"],
    amarelo: ["#ffff00", "#ffffff"],
    vermelho: ["#ff0000", "#ffaa00"],
    rosa: ["#ff66cc", "#ffffff"],
    azul: ["#0088ff", "#00ffff"],
    verde: ["#00ff00", "#ffffff"],
    preto: ["#222222", "#555555"],
    vermelho_azul: ["#ff0000", "#0088ff"],
    azul_escuro: ["#0000aa", "#0088ff"],
    roxo: ["#aa00ff", "#ffffff"]
};

// ==================== DATABASE DE PERSONAGENS ====================
let characterDB = {};

const DEFAULT_APPEARANCE = {
    race: "Saiyajin",
    hairStyle: "goku",
    hairColor: "#000000",
    eyeType: "normal",
    irisColor: "#000000",
    scleraColor: "#ffffff",
    earType: "normal",
    mouthType: "smile",
    accessory: "none",
    innerShirt: "regata",
    outerShirt: "kimono",
    pants: "larga",
    shoes: "botas_artes",
    primaryColor: "#ff6600",
    secondaryColor: "#0033cc",
    tail: "saiyan_belt",
    wings: "none",
    backWeapon: "none"
};

// ==================== INICIALIZAÇÃO ====================
function initSettings() {
    try {
        selectedStage = readStorage("saiyan_stage") || "terra";
        let savedSfxVol = readStorage("saiyan_sfx_vol");
        let savedBgmVol = readStorage("saiyan_bgm_vol");

        let parsedSfxVol = Number.parseFloat(savedSfxVol);
        let parsedBgmVol = Number.parseFloat(savedBgmVol);
        sfxVolume = Number.isFinite(parsedSfxVol) ? Math.max(0, Math.min(1, parsedSfxVol)) : 0.5;
        bgmVolume = Number.isFinite(parsedBgmVol) ? Math.max(0, Math.min(1, parsedBgmVol)) : 0.5;

        isMuted = readStorage("saiyan_mute") === "true";
        gameMode = readStorage("saiyan_mode") || "singleplayer";

        pcInputMode = readStorage("saiyan_pc_mode") || "keyboard";
        touchControlMode = readStorage("saiyan_touch_mode") || "analog";
        controlSelectionMode = readStorage("saiyan_control_selection") || "auto";
        manualControlMode = readStorage("saiyan_manual_control") || "pc";
        mobileDoubleTapParry = readStorage("saiyan_doubletap") !== "false";
        vibrationEnabled = readStorage("saiyan_vibration") !== "false";
        touchAutoFire = readStorage("saiyan_autofire") !== "false";
        padBindings = normalizePadBindings(readJsonStorage("saiyan_pad_bindings", null));
        autofireHintSeen = readStorage("saiyan_hint_autofire") === "1";
        applyEffectiveControlMode();

        let savedBindings = readStorage("saiyan_controls");
        if (savedBindings) {
            const parsedBindings = readJsonStorage("saiyan_controls", null);
            if (parsedBindings && typeof parsedBindings === "object") {
                keyBindings = {
                    p1: Object.assign({}, keyBindings.p1, parsedBindings.p1 || {}),
                    p2: Object.assign({}, keyBindings.p2, parsedBindings.p2 || {})
                };
            }
        }

        // Layout novo dos botões touch: descarta layouts salvos por versões antigas (senão o novo padrão nunca apareceria).
        if (readStorage("saiyan_touch_hud_version") !== String(TOUCH_HUD_LAYOUT_VERSION)) {
            writeStorage("saiyan_touch_hud", "");
            writeStorage("saiyan_touch_hud_customized", "");
            writeStorage("saiyan_touch_hud_version", String(TOUCH_HUD_LAYOUT_VERSION));
        }
        let savedHud = readStorage("saiyan_touch_hud");
        if (savedHud) {
            touchHudLayout = normalizeTouchHudLayout(readJsonStorage("saiyan_touch_hud", {}));
        }

        loadAchievements();
        loadStats();
        loadStageProgress();
        loadStageWaveRecord();
        loadCharacterData();

        const savedHero = readStorage("saiyan_selected_hero");
        const savedBoss = readStorage("saiyan_selected_villain");

        if (savedHero && characterDB[savedHero]) {
            selectedCharacter = savedHero;
        } else if (!characterDB[selectedCharacter] && !characterDB.goku_adult) {
            loadDefaultCharacters();
        }

        if (savedBoss && characterDB[savedBoss]) {
            selectedBoss = savedBoss;
        } else if (!characterDB[selectedBoss] && !characterDB.vegeta) {
            loadDefaultCharacters();
        }

        if (!characterDB[selectedCharacter]) {
            selectedCharacter = "goku_adult";
        }
        if (!characterDB[selectedBoss]) {
            selectedBoss = "vegeta";
        }

        saveSelectedCharacters();
    } catch (e) {
        console.error("Erro ao inicializar settings:", e);
    }
}

// ==================== PERSISTÊNCIA ====================
function saveControls() {
    try {
        applyEffectiveControlMode();
        writeStorage("saiyan_controls", JSON.stringify(keyBindings));
        writeStorage("saiyan_pc_mode", pcInputMode);
        writeStorage("saiyan_touch_mode", touchControlMode);
        writeStorage("saiyan_control_selection", controlSelectionMode);
        writeStorage("saiyan_manual_control", manualControlMode);
        writeStorage("saiyan_vibration", String(vibrationEnabled));
        writeStorage("saiyan_autofire", String(touchAutoFire));
        writeStorage("saiyan_pad_bindings", JSON.stringify(padBindings));
        writeStorage("saiyan_doubletap", mobileDoubleTapParry.toString());
        writeStorage("saiyan_touch_hud", JSON.stringify(touchHudLayout));
    } catch (e) {
        console.warn("Erro ao salvar controles:", e);
        showSystemAlert("AVISO", "NÃO FOI POSSÍVEL SALVAR OS CONTROLES");
    }
}

function saveAudioSettings() {
    try {
        writeStorage("saiyan_sfx_vol", sfxVolume.toString());
        writeStorage("saiyan_bgm_vol", bgmVolume.toString());
        writeStorage("saiyan_mute", isMuted.toString());
    } catch (e) {
        console.warn("Erro ao salvar áudio:", e);
    }
}

function saveSettings() {
    try {
        writeStorage("saiyan_stage", selectedStage);
        writeStorage("saiyan_mode", gameMode);
        writeStorage("saiyan_selected_hero", selectedCharacter || "");
        writeStorage("saiyan_selected_villain", selectedBoss || "");
    } catch (e) {
        console.warn("Erro ao salvar settings:", e);
    }
}

function saveSelectedCharacters() {
    try {
        writeStorage("saiyan_selected_hero", selectedCharacter || "");
        writeStorage("saiyan_selected_villain", selectedBoss || "");
    } catch (e) {
        console.warn("Erro ao salvar personagens selecionados:", e);
    }
}

// ==================== GERENCIAMENTO DE ESTADO ====================
function setGameState(newState) {
    gameState = newState;
    if (newState === "playing") startBGM();
    else stopBGM();
}

// ==================== MODAIS DE SISTEMA ====================
function showSystemAlert(title, message) {
    const alertTitle = document.getElementById("modal-alert-title");
    const alertMsg = document.getElementById("modal-alert-msg");
    const alertBtns = document.getElementById("modal-alert-btns");
    if (alertTitle) alertTitle.innerText = title.toUpperCase();
    if (alertMsg) alertMsg.innerText = message;
    if (alertBtns) alertBtns.innerHTML = `<button class="btn" onclick="closeSystemAlert()">OK</button>`;
    if (sysAlertModal) sysAlertModal.style.display = "flex";
    focusModal(sysAlertModal);
}

function showSystemConfirm(title, message, callback, confirmLabel = "CONFIRMAR", cancelLabel = "CANCELAR") {
    onConfirmCallback = callback;
    const alertTitle = document.getElementById("modal-alert-title");
    const alertMsg = document.getElementById("modal-alert-msg");
    const alertBtns = document.getElementById("modal-alert-btns");
    if (alertTitle) alertTitle.innerText = title.toUpperCase();
    if (alertMsg) alertMsg.innerText = message;
    if (alertBtns) {
        alertBtns.innerHTML = `
            <button class="btn" onclick="executeSystemConfirm(true)">${confirmLabel}</button>
            <button class="btn" style="border-color:#ff0055; color:#ff0055;" onclick="executeSystemConfirm(false)">${cancelLabel}</button>
        `;
    }
    if (sysAlertModal) sysAlertModal.style.display = "flex";
    focusModal(sysAlertModal);
}

function closeSystemAlert() {
    if (sysAlertModal) sysAlertModal.style.display = "none";
    restoreFocusAfterModal();
}

function executeSystemConfirm(result) {
    if (sysAlertModal) sysAlertModal.style.display = "none";
    if (result && typeof onConfirmCallback === "function") onConfirmCallback();
    onConfirmCallback = null;
    restoreFocusAfterModal();
}

// ==================== GERADOR DE SPRITES DBZ PROCEDURAL ====================
function generateDbzSpriteSvg(appearance) {
    const app = Object.assign({}, DEFAULT_APPEARANCE, appearance || {});
    
    let skinColor = "#ffcc99";
    if (app.race === "Namekuseijin") skinColor = "#00aa44";
    else if (app.race === "Raça Freeza") skinColor = "#f0f0f0";
    else if (app.race === "Majin") skinColor = "#ff66cc";
    else if (app.race === "Android") skinColor = "#ffe0bd";
    else if (app.race === "ET/Alienígena genérico") skinColor = "#8855ff";

    let hairSvg = '';
    if (app.hairStyle !== "careca") {
        let hCol = app.hairColor || "#000000";
        if (app.hairStyle === "goku") {
            hairSvg = `<path d='M8 2h16l2 4-4 2 6 4-6 2 2 4-6-2-2 4h-4l-2-4-6 2 2-4-6-2 6-4-4-2z' fill='${hCol}' stroke='#000000' stroke-width='0.8'/>`;
        } else if (app.hairStyle === "vegeta") {
            hairSvg = `<path d='M10 1h12l3 6-3 2 2 4-4 1h-8l-4-1 2-4-3-2z' fill='${hCol}' stroke='#000000' stroke-width='0.8'/>`;
        } else if (app.hairStyle === "trunks") {
            hairSvg = `<path d='M9 3h14l2 5-2 2h-12l-2-2z' fill='${hCol}'/><rect x='10' y='8' width='12' height='3' fill='${hCol}'/>`;
        } else if (app.hairStyle === "gohan") {
            hairSvg = `<path d='M11 2h10l3 4-2 3h-12l-2-3z' fill='${hCol}'/>`;
        }
    }

    let earSvg = `<rect x='8' y='12' width='2' height='4' fill='${skinColor}'/><rect x='22' y='12' width='2' height='4' fill='${skinColor}'/>`;
    if (app.earType === "pontuda") {
        earSvg = `<path d='M6 10l4 3v3h-4z' fill='${skinColor}'/><path d='M26 10l-4 3v3h4z' fill='${skinColor}'/>`;
    } else if (app.earType === "majin") {
        earSvg = `<circle cx='7' cy='14' r='3' fill='#ff99dd'/><circle cx='25' cy='14' r='3' fill='#ff99dd'/>`;
    } else if (app.earType === "freeza_placa") {
        earSvg = `<rect x='7' y='11' width='3' height='6' fill='#aa00aa'/><rect x='22' y='11' width='3' height='6' fill='#aa00aa'/>`;
    }

    let accSvg = '';
    if (app.accessory === "antenas") {
        accSvg = `<path d='M12 4L9 1M20 4l3-3' stroke='#005511' stroke-width='2'/>`;
    } else if (app.accessory === "potara") {
        accSvg = `<circle cx='7' cy='17' r='2' fill='#ffff00'/><circle cx='25' cy='17' r='2' fill='#ffff00'/>`;
    } else if (app.accessory === "oculos") {
        accSvg = `<rect x='10' y='12' width='12' height='3' fill='#111111'/><rect x='11' y='13' width='4' height='1' fill='#00ffff'/><rect x='17' y='13' width='4' height='1' fill='#00ffff'/>`;
    } else if (app.accessory === "mascara") {
        accSvg = `<rect x='11' y='15' width='10' height='4' fill='#333333'/>`;
    }

    let tailSvg = '';
    if (app.tail === "saiyan_belt") {
        tailSvg = `<path d='M8 23h16v3H8z' fill='#663300'/>`;
    } else if (app.tail === "freeza") {
        tailSvg = `<path d='M22 24c4 0 6 4 4 7' stroke='${skinColor}' stroke-width='3' fill='none'/>`;
    } else if (app.tail === "cell") {
        tailSvg = `<path d='M22 22c5 2 5 8 0 10' stroke='#00aa44' stroke-width='4' fill='none'/>`;
    }

    let wingsSvg = '';
    if (app.wings === "cell") {
        wingsSvg = `<path d='M4 14L0 22l6-2M28 14l4 8-6-2' fill='#111111'/>`;
    } else if (app.wings === "angel") {
        wingsSvg = `<path d='M5 14L1 18l5 1M27 14l4 4-5 1' fill='#ffffff'/>`;
    }

    let backWeaponSvg = '';
    if (app.backWeapon === "espada_trunks") {
        backWeaponSvg = `<path d='M23 8l6-6M22 9l3 3' stroke='#cccccc' stroke-width='2'/>`;
    } else if (app.backWeapon === "bastao") {
        backWeaponSvg = `<path d='M24 6l-16 20' stroke='#ff0000' stroke-width='2'/>`;
    }

    let svgContent = `
    <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32' shape-rendering='crispEdges'>
        ${backWeaponSvg}
        ${wingsSvg}
        ${tailSvg}
        ${hairSvg}
        <rect x='11' y='11' width='10' height='8' fill='${skinColor}' stroke='#000000' stroke-width='0.8'/>
        ${earSvg}
        
        <rect x='11' y='13' width='10' height='3' fill='${app.scleraColor}'/>
        <rect x='13' y='13' width='2' height='2' fill='${app.irisColor}'/>
        <rect x='17' y='13' width='2' height='2' fill='${app.irisColor}'/>
        
        <rect x='14' y='17' width='4' height='1' fill='#000000'/>
        
        ${accSvg}

        <rect x='9' y='19' width='14' height='7' fill='${app.primaryColor}' stroke='#000000' stroke-width='0.8'/>
        <rect x='11' y='19' width='10' height='4' fill='${app.secondaryColor}' stroke='#000000' stroke-width='0.8'/>
        <rect x='10' y='26' width='12' height='4' fill='${app.secondaryColor}' stroke='#000000' stroke-width='0.8'/>
        <rect x='9' y='29' width='5' height='3' fill='${app.primaryColor}' stroke='#000000' stroke-width='0.8'/>
        <rect x='18' y='29' width='5' height='3' fill='${app.primaryColor}' stroke='#000000' stroke-width='0.8'/>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}

// Imagem reserva (usada quando um personagem ainda não tem quadros ou a imagem dele não carrega).
function getFallbackSpriteSvg() {
    return generateDbzSpriteSvg(DEFAULT_APPEARANCE);
}

function triggerScreenShake(intensity = 6, duration = 12) {
    shakeIntensity = intensity;
    shakeTime = duration;
}

// ==================== CARREGAMENTO DE IMAGENS ====================
function loadImageSecure(src, callback) {
    if (!src) {
        let fallbackImg = new Image();
        fallbackImg.src = getFallbackSpriteSvg();
        callback(fallbackImg, true);
        return;
    }

    let img = new Image();
    let timeoutHandle = null;
    let completed = false;

    if (!src.startsWith("data:")) {
        img.crossOrigin = "Anonymous";
    }

    const cleanUp = () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (img) {
            img.onload = null;
            img.onerror = null;
        }
    };

    timeoutHandle = setTimeout(() => {
        if (!completed) {
            completed = true;
            cleanUp();
            img = null;
            let fallbackImg = new Image();
            fallbackImg.src = getFallbackSpriteSvg();
            callback(fallbackImg, true);
        }
    }, IMAGE_LOAD_TIMEOUT);

    img.onload = () => {
        if (!completed) {
            completed = true;
            cleanUp();
            callback(img, false);
        }
    };

    img.onerror = () => {
        if (!completed) {
            completed = true;
            cleanUp();
            img = null;
            let fallbackImg = new Image();
            fallbackImg.src = getFallbackSpriteSvg();
            callback(fallbackImg, true);
        }
    };

    img.src = src;
}

// ==================== CONTROLE DE ABAS DO EDITOR ====================
const EDITOR_TAB_ORDER = ["basico", "animacoes", "construtor"];
let currentEditorTab = "basico";

function switchEditorTab(tabName) {
    if (tabName === 'aparencia') {
        tabName = 'basico';
    }

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');

    const selectedBtn = document.getElementById(`tab-btn-${tabName}`);
    const selectedContent = document.getElementById(`tab-content-${tabName}`);
    if (selectedBtn) selectedBtn.classList.add('active');
    if (selectedContent) selectedContent.style.display = 'block';
    currentEditorTab = tabName;
    if (tabName === "construtor") refreshBuilderPreview();
}

// ==================== GERENCIAMENTO DE MINIATURAS E ANIMAÇÕES ====================
function getSpriteSheetNumber(id, fallback = 1) {
    const value = Number.parseInt(document.getElementById(id)?.value, 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getSpriteSheetFrameSettings() {
    return {
        width: getSpriteSheetNumber("sprite-frame-width", getSpriteSheetNumber("char-fw", 32)),
        height: getSpriteSheetNumber("sprite-frame-height", getSpriteSheetNumber("char-fh", 32)),
        total: getSpriteSheetNumber("sprite-total-frames", getSpriteSheetNumber("char-frames", 1))
    };
}

function setSpriteSheetStatus(message, isError = false) {
    const status = document.getElementById("sprite-sheet-status");
    if (status) {
        status.innerText = message;
        status.style.color = isError ? "#fb7185" : "#94a3b8";
    }
}

function setSpriteSheetImage(img, source) {
    if (!img || !img.naturalWidth) return;

    spriteSheetImage = img;
    selectedSpriteSheetFrame = null;
    selectedSpriteSheetFrames = new Set();
    activeSpriteSheetFrames = null;
    spriteFrameRects = {};
    lastSpriteSheetGridSignature = null;
    pendingSpriteReplacementFrame = null;
    tempBase64 = source;
    loadedFileImageObj = img;
    loadedUrlImageObj = img;

    const widthEl = document.getElementById("sprite-frame-width");
    const heightEl = document.getElementById("sprite-frame-height");
    const totalEl = document.getElementById("sprite-total-frames");
    const charWidthEl = document.getElementById("char-fw");
    const charHeightEl = document.getElementById("char-fh");
    const charFramesEl = document.getElementById("char-frames");

    if (!widthEl.value || Number(widthEl.value) <= 0) widthEl.value = img.naturalWidth;
    if (!heightEl.value || Number(heightEl.value) <= 0) heightEl.value = img.naturalHeight;
    if (Number(widthEl.value) === 32 && img.naturalWidth !== 32) widthEl.value = img.naturalWidth;
    if (Number(heightEl.value) === 32 && img.naturalHeight !== 32) heightEl.value = img.naturalHeight;
    if (!totalEl.value || Number(totalEl.value) <= 0) totalEl.value = Math.max(1, Math.floor(img.naturalWidth / Number(widthEl.value)) * Math.floor(img.naturalHeight / Number(heightEl.value)));

    if (charWidthEl) charWidthEl.value = widthEl.value;
    if (charHeightEl) charHeightEl.value = heightEl.value;
    if (charFramesEl) charFramesEl.value = totalEl.value;

    setSpriteSheetStatus(`Sprite sheet carregada: ${img.naturalWidth} x ${img.naturalHeight}px`);
    updateSpriteSheetMap();
    updateSpriteSheetSelectionLabel();
    updateModalPreview();
}

function loadSpriteSheetSource(source) {
    if (!source) return;
    const img = new Image();
    if (!source.startsWith("data:")) img.crossOrigin = "Anonymous";
    img.onload = () => setSpriteSheetImage(img, source);
    img.onerror = () => setSpriteSheetStatus("Não foi possível carregar a sprite sheet.", true);
    img.src = source;
}

function triggerSpriteSheetFileInput() {
    if (fileInput) fileInput.click();
}

function handleSpriteSheetDropzoneKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        triggerSpriteSheetFileInput();
    }
}

function handleSpriteSheetDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropzone = document.getElementById("sprite-sheet-dropzone");
    if (dropzone) dropzone.classList.add("drag-over");
}

function handleSpriteSheetDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropzone = document.getElementById("sprite-sheet-dropzone");
    if (dropzone) dropzone.classList.remove("drag-over");
}

function handleSpriteSheetDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropzone = document.getElementById("sprite-sheet-dropzone");
    if (dropzone) dropzone.classList.remove("drag-over");

    const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (!file || !file.type.startsWith("image/")) {
        setSpriteSheetStatus("Solte um arquivo de imagem válido.", true);
        return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => loadSpriteSheetSource(loadEvent.target.result);
    reader.onerror = () => setSpriteSheetStatus("Não foi possível ler o arquivo de imagem.", true);
    reader.readAsDataURL(file);
}

function handleSpriteSheetUrlKeydown(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        processSpriteSheetUrl();
    }
}

function processSpriteSheetUrl() {
    const input = document.getElementById("sprite-sheet-url");
    const source = input ? input.value.trim() : "";
    if (!source) {
        setSpriteSheetStatus("Cole uma URL ou um Data URL antes de carregar.", true);
        return;
    }
    setSpriteSheetStatus("Carregando sprite sheet...");
    loadSpriteSheetSource(source);
}

function getSpriteSheetGrid() {
    if (!spriteSheetImage) return null;
    const settings = getSpriteSheetFrameSettings();
    const imageWidth = spriteSheetImage.naturalWidth;
    const imageHeight = spriteSheetImage.naturalHeight;
    const total = Math.max(1, settings.total);
    const isWholeImageSize = settings.width >= imageWidth || settings.height >= imageHeight;
    const isLargeDefaultSize = imageWidth > 128 && imageHeight > 128 && settings.width === 32 && settings.height === 32;

    if (isWholeImageSize || isLargeDefaultSize) {
        const columns = Math.min(8, total);
        const rows = Math.max(1, Math.ceil((imageHeight / imageWidth) * columns / 2));
        const inferredWidth = Math.max(1, Math.floor(imageWidth / columns));
        const inferredHeight = Math.max(1, Math.floor(imageHeight / rows));
        const widthEl = document.getElementById("sprite-frame-width");
        const heightEl = document.getElementById("sprite-frame-height");
        if (widthEl) widthEl.value = inferredWidth;
        if (heightEl) heightEl.value = inferredHeight;
        settings.width = inferredWidth;
        settings.height = inferredHeight;
    }

    return {
        settings,
        columns: Math.max(1, Math.floor(imageWidth / settings.width)),
        rows: Math.max(1, Math.floor(imageHeight / settings.height))
    };
}

function updateSpriteSheetMap() {
    const map = document.getElementById("sprite-sheet-map");
    const grid = getSpriteSheetGrid();
    if (!map || !grid) return;

    const { settings, columns, rows } = grid;
    const gridSignature = `${settings.width}x${settings.height}:${settings.total}`;
    if (lastSpriteSheetGridSignature && lastSpriteSheetGridSignature !== gridSignature) {
        const previousSize = lastSpriteSheetGridSignature.split(":")[0].split("x").map(Number);
        const widthChanged = previousSize[0] !== settings.width;
        const heightChanged = previousSize[1] !== settings.height;
        if (widthChanged || heightChanged) {
            Object.values(spriteFrameRects).forEach(rect => {
                if (widthChanged) rect.w = settings.width;
                if (heightChanged) rect.h = settings.height;
                rect.x = Math.max(0, Math.min(spriteSheetImage.naturalWidth - rect.w, rect.x));
                rect.y = Math.max(0, Math.min(spriteSheetImage.naturalHeight - rect.h, rect.y));
            });
        }
    }
    lastSpriteSheetGridSignature = gridSignature;
    map.width = spriteSheetImage.naturalWidth;
    map.height = spriteSheetImage.naturalHeight;
    map.style.transform = "translate(0, 0)";
    const labels = document.getElementById("sprite-sheet-labels");
    if (labels) {
        labels.width = map.width;
        labels.height = map.height;
        labels.style.transform = "translate(0, 0)";
    }
    const mapCtx = map.getContext("2d");
    mapCtx.imageSmoothingEnabled = false;
    mapCtx.clearRect(0, 0, map.width, map.height);
    mapCtx.drawImage(spriteSheetImage, 0, 0);
    const labelsCtx = labels ? labels.getContext("2d") : null;
    if (labelsCtx) {
        labelsCtx.imageSmoothingEnabled = true;
        labelsCtx.clearRect(0, 0, labels.width, labels.height);
    }
    const total = Math.min(settings.total, columns * rows);
    const activeFrames = getActiveSpriteFrames(grid);
    const activeFrameOrder = Array.from(activeFrames).sort((first, second) => first - second);

    mapCtx.save();
    mapCtx.setLineDash([6, 5]);
    for (let frame = 0; frame < total; frame++) {
        const rect = getSpriteFrameRect(frame, grid);
        const isMovementFrame = activeFrames.has(frame);
        mapCtx.fillStyle = isMovementFrame ? "rgba(34, 211, 238, 0.08)" : "rgba(148, 163, 184, 0.035)";
        mapCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
        mapCtx.strokeStyle = isMovementFrame ? "rgba(34, 211, 238, 0.8)" : "rgba(148, 163, 184, 0.48)";
        mapCtx.lineWidth = 2;
        mapCtx.strokeRect(rect.x + 2, rect.y + 2, Math.max(1, rect.w - 4), Math.max(1, rect.h - 4));
    }
    mapCtx.restore();

    if (labelsCtx) {
        labelsCtx.save();
        labelsCtx.font = "700 12px Arial, sans-serif";
        labelsCtx.textAlign = "center";
        labelsCtx.textBaseline = "middle";
        activeFrameOrder.forEach((frame, sequenceIndex) => {
            const rect = getSpriteFrameRect(frame, grid);
            labelsCtx.fillStyle = "rgba(0, 0, 0, 0.82)";
            labelsCtx.fillRect(Math.round(rect.x + 3), Math.round(rect.y + 3), 22, 18);
            labelsCtx.fillStyle = "#ffffff";
            labelsCtx.fillText(String(sequenceIndex + 1), Math.round(rect.x + 14), Math.round(rect.y + 12));
        });
        labelsCtx.restore();
    }

    selectedSpriteSheetFrames.forEach(frame => {
        if (frame >= total) return;
        const rect = getSpriteFrameRect(frame, grid);
        mapCtx.strokeStyle = frame === selectedSpriteSheetFrame ? "#22d3ee" : "rgba(34, 211, 238, 0.65)";
        mapCtx.lineWidth = frame === selectedSpriteSheetFrame ? 3 : 2;
        mapCtx.strokeRect(rect.x + 2, rect.y + 2, Math.max(1, rect.w - 4), Math.max(1, rect.h - 4));
    });

    if (selectedSpriteSheetFrame !== null && selectedSpriteSheetFrames.has(selectedSpriteSheetFrame)) {
        const rect = getSpriteFrameRect(selectedSpriteSheetFrame, grid);
        mapCtx.fillStyle = "rgba(34, 211, 238, 0.12)";
        mapCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
        mapCtx.fillStyle = "#22d3ee";
        [[rect.x, rect.y + rect.h / 2], [rect.x + rect.w, rect.y + rect.h / 2]].forEach(([x, y]) => {
            mapCtx.fillRect(x - 4, y - 4, 8, 8);
        });
        mapCtx.fillStyle = "#facc15";
        mapCtx.fillRect(rect.x + rect.w - 13, rect.y + 3, 10, 10);
        mapCtx.fillStyle = "#111827";
        mapCtx.fillRect(rect.x + rect.w - 10, rect.y + 5, 4, 6);
    }

    if (activeFrames.size > 0) {
        const firstFrame = Array.from(activeFrames).sort((first, second) => first - second)[0];
        const firstRect = getSpriteFrameRect(firstFrame, grid);
        mapCtx.fillStyle = "#facc15";
        mapCtx.fillRect(firstRect.x + 4, firstRect.y + 3, 10, 10);
        mapCtx.fillStyle = "#111827";
        mapCtx.fillRect(firstRect.x + 7, firstRect.y + 5, 4, 6);
    }
}

function getActiveSpriteFrames(grid) {
    if (activeSpriteSheetFrames) return new Set(activeSpriteSheetFrames);
    const total = Math.min(grid.settings.total, grid.columns * grid.rows);
    const count = Math.min(getSpriteSheetNumber("sprite-animation-frames", 1), total);
    return new Set(Array.from({ length: count }, (_, frame) => frame));
}

function getSpriteFrameRect(frame, grid) {
    if (spriteFrameRects[frame]) return spriteFrameRects[frame];
    const col = frame % grid.columns;
    const row = Math.floor(frame / grid.columns);
    return {
        x: col * grid.settings.width,
        y: row * grid.settings.height,
        w: grid.settings.width,
        h: grid.settings.height
    };
}

function updateSpriteSheetSelectionLabel() {
    const label = document.getElementById("sprite-sheet-selection");
    if (!label) return;
    if (pendingSpriteReplacementFrame !== null) {
        label.innerText = `F${pendingSpriteReplacementFrame + 1} aguardando substituição. Clique em um quadro cyan ativo para confirmar a troca.`;
        return;
    }
    if (selectedSpriteSheetFrame === null) {
        label.innerText = "Clique em um quadro da grade para selecioná-lo.";
        return;
    }
    const grid = getSpriteSheetGrid();
    const selectedCount = selectedSpriteSheetFrames.size;
    const rect = getSpriteFrameRect(selectedSpriteSheetFrame, grid);
    label.innerText = `${selectedCount > 1 ? `${selectedCount} quadros selecionados; ativo F${selectedSpriteSheetFrame + 1}` : `Quadro F${selectedSpriteSheetFrame + 1}`} | área ${Math.round(rect.w)} x ${Math.round(rect.h)} px. Use as alças laterais para redimensionar.`;
}

function getSpriteSheetCanvasPoint(event) {
    const map = document.getElementById("sprite-sheet-map");
    const grid = getSpriteSheetGrid();
    if (!map || !grid) return null;
    const rect = map.getBoundingClientRect();
    const scaleX = map.width / rect.width;
    const scaleY = map.height / rect.height;
    return {
        grid,
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}

function getFrameAtPoint(x, y, grid) {
    const total = Math.min(grid.settings.total, grid.columns * grid.rows);
    for (let frame = total - 1; frame >= 0; frame--) {
        const rect = getSpriteFrameRect(frame, grid);
        if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return frame;
    }
    return null;
}

function getFrameResizeHandle(frame, x, y, grid) {
    const rect = getSpriteFrameRect(frame, grid);
    const tolerance = Math.max(5, Math.min(rect.w, rect.h) * 0.12);
    const nearLeft = Math.abs(x - rect.x) <= tolerance;
    const nearRight = Math.abs(x - (rect.x + rect.w)) <= tolerance;
    if (nearLeft) return "w";
    if (nearRight) return "e";
    return null;
}

function isFrameMoveHandle(frame, x, y, grid) {
    const rect = getSpriteFrameRect(frame, grid);
    return x >= rect.x + rect.w - 16 && x <= rect.x + rect.w - 1 && y >= rect.y && y <= rect.y + 16;
}

function isGroupMoveHandle(x, y, grid) {
    const activeFrames = getActiveSpriteFrames(grid);
    if (!activeFrames.size) return false;
    const firstFrame = Array.from(activeFrames).sort((first, second) => first - second)[0];
    const rect = getSpriteFrameRect(firstFrame, grid);
    return x >= rect.x && x <= rect.x + 18 && y >= rect.y && y <= rect.y + 18;
}

function applySelectedFrameSpacing() {
    const grid = getSpriteSheetGrid();
    if (!grid || selectedSpriteSheetFrames.size < 2) return;

    const horizontalSpacing = Number.parseInt(document.getElementById("sprite-spacing-x")?.value, 10) || 0;
    const verticalSpacing = Number.parseInt(document.getElementById("sprite-spacing-y")?.value, 10) || 0;
    const selectedRects = Array.from(selectedSpriteSheetFrames).map(frame => ({
        frame,
        rect: Object.assign({}, getSpriteFrameRect(frame, grid))
    }));
    const rows = [];

    selectedRects.sort((first, second) => first.rect.y - second.rect.y || first.rect.x - second.rect.x).forEach(item => {
        const row = rows.find(candidate => Math.abs(candidate.y - item.rect.y) <= Math.max(4, Math.min(candidate.height, item.rect.h) * 0.25));
        if (row) {
            row.items.push(item);
            row.height = Math.max(row.height, item.rect.h);
        } else {
            rows.push({ y: item.rect.y, height: item.rect.h, items: [item] });
        }
    });

    rows.forEach(row => {
        row.items.sort((first, second) => first.rect.x - second.rect.x);
        for (let index = 1; index < row.items.length; index++) {
            const previous = row.items[index - 1].rect;
            const current = row.items[index].rect;
            current.x = previous.x + previous.w + horizontalSpacing;
        }
    });

    rows.sort((first, second) => first.y - second.y);
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const previous = rows[rowIndex - 1];
        const current = rows[rowIndex];
        const targetY = previous.items.reduce((bottom, item) => Math.max(bottom, item.rect.y + item.rect.h), -Infinity) + verticalSpacing;
        const deltaY = targetY - current.items[0].rect.y;
        current.items.forEach(item => { item.rect.y += deltaY; });
    }

    selectedRects.forEach(item => {
        item.rect.x = Math.max(0, Math.min(spriteSheetImage.naturalWidth - item.rect.w, item.rect.x));
        item.rect.y = Math.max(0, Math.min(spriteSheetImage.naturalHeight - item.rect.h, item.rect.y));
        spriteFrameRects[item.frame] = item.rect;
    });
    updateSpriteSheetMap();
    updateSpriteSheetSelectionLabel();
}

function updateSpriteSheetPointerCursor(event) {
    const map = document.getElementById("sprite-sheet-map");
    const point = getSpriteSheetCanvasPoint(event);
    if (!map || !point || selectedSpriteSheetFrame === null) {
        if (map) map.style.cursor = "crosshair";
        return;
    }
    if (isGroupMoveHandle(point.x, point.y, point.grid)) {
        map.style.cursor = "ns-resize";
        return;
    }
    if (isFrameMoveHandle(selectedSpriteSheetFrame, point.x, point.y, point.grid)) {
        map.style.cursor = "move";
        return;
    }
    const handle = getFrameResizeHandle(selectedSpriteSheetFrame, point.x, point.y, point.grid);
    const cursors = { e: "ew-resize", w: "ew-resize" };
    map.style.cursor = cursors[handle] || "crosshair";
}

function getFramesInSelection(startX, startY, endX, endY, grid) {
    const left = Math.min(startX, endX);
    const right = Math.max(startX, endX);
    const top = Math.min(startY, endY);
    const bottom = Math.max(startY, endY);
    const frames = new Set();
    const total = Math.min(grid.settings.total, grid.columns * grid.rows);
    for (let frame = 0; frame < total; frame++) {
        const rect = getSpriteFrameRect(frame, grid);
        if (rect.x < right && rect.x + rect.w > left && rect.y < bottom && rect.y + rect.h > top) frames.add(frame);
    }
    return frames;
}

function requestInactiveSpriteFrameReplacement(frame, grid) {
    showSystemConfirm(
        "SUBSTITUIR QUADRO",
        `F${frame + 1} está inativo. Deseja substituir um quadro ativo por ele?`,
        () => {
            pendingSpriteReplacementFrame = frame;
            updateSpriteSheetMap();
            updateSpriteSheetSelectionLabel();
        },
        "SIM",
        "NÃO"
    );
}

function replaceActiveSpriteFrame(activeFrame, grid) {
    const activeFrames = getActiveSpriteFrames(grid);
    if (pendingSpriteReplacementFrame === null || !activeFrames.has(activeFrame)) return false;
    const replacementFrame = pendingSpriteReplacementFrame;
    activeFrames.delete(activeFrame);
    activeFrames.add(replacementFrame);
    activeSpriteSheetFrames = activeFrames;
    selectedSpriteSheetFrames = new Set(activeFrames);
    selectedSpriteSheetFrame = replacementFrame;
    pendingSpriteReplacementFrame = null;
    updateSpriteSheetMap();
    updateSpriteSheetSelectionLabel();
    return true;
}

function handleSpriteSheetPointerDown(event) {
    const map = document.getElementById("sprite-sheet-map");
    const point = getSpriteSheetCanvasPoint(event);
    if (!map || !point) return;
    event.preventDefault();

    if (event.button === 1 || event.button === 2) {
        map.style.cursor = "crosshair";
        return;
    }
    if (event.button !== 0) return;

    const activeFrames = getActiveSpriteFrames(point.grid);
    if (selectedSpriteSheetFrame !== null && isFrameMoveHandle(selectedSpriteSheetFrame, point.x, point.y, point.grid)) {
        if (selectedSpriteSheetFrames.size > 1) {
            const originalRects = {};
            selectedSpriteSheetFrames.forEach(frame => { originalRects[frame] = Object.assign({}, getSpriteFrameRect(frame, point.grid)); });
            spriteSheetPointer = { type: "move-selected", startX: point.x, startY: point.y, originalRects, grid: point.grid };
        } else {
            const rect = getSpriteFrameRect(selectedSpriteSheetFrame, point.grid);
            spriteSheetPointer = { type: "move-frame", frame: selectedSpriteSheetFrame, startX: point.x, startY: point.y, rect: Object.assign({}, rect) };
        }
    } else if (isGroupMoveHandle(point.x, point.y, point.grid)) {
        const originalRects = {};
        activeFrames.forEach(frame => { originalRects[frame] = Object.assign({}, getSpriteFrameRect(frame, point.grid)); });
        spriteSheetPointer = { type: "move-group", startY: point.y, originalRects, grid: point.grid };
    } else {
        const handle = selectedSpriteSheetFrame === null ? null : getFrameResizeHandle(selectedSpriteSheetFrame, point.x, point.y, point.grid);
        if (handle) {
            const rect = getSpriteFrameRect(selectedSpriteSheetFrame, point.grid);
            spriteSheetPointer = { type: "resize", handle, frame: selectedSpriteSheetFrame, startX: point.x, startY: point.y, rect: Object.assign({}, rect) };
        } else {
            spriteSheetPointer = { type: "select", startX: point.x, startY: point.y, currentX: point.x, currentY: point.y, hasMoved: false, grid: point.grid };
        }
    }
    map.setPointerCapture(event.pointerId);
}

function handleSpriteSheetPointerMove(event) {
    const map = document.getElementById("sprite-sheet-map");
    if (!map) return;
    const point = getSpriteSheetCanvasPoint(event);
    if (!point) return;
    if (!spriteSheetPointer) {
        updateSpriteSheetPointerCursor(event);
        return;
    }
    if (spriteSheetPointer.type === "select") {
        spriteSheetPointer.currentX = point.x;
        spriteSheetPointer.currentY = point.y;
        spriteSheetPointer.hasMoved = Math.abs(point.x - spriteSheetPointer.startX) > 3 || Math.abs(point.y - spriteSheetPointer.startY) > 3;
        if (!spriteSheetPointer.hasMoved) return;
        selectedSpriteSheetFrames = getFramesInSelection(spriteSheetPointer.startX, spriteSheetPointer.startY, point.x, point.y, spriteSheetPointer.grid);
        selectedSpriteSheetFrame = getFrameAtPoint(point.x, point.y, point.grid);
        updateSpriteSheetMap();
        updateSpriteSheetSelectionLabel();
        return;
    }
    if (spriteSheetPointer.type === "move-frame") {
        const state = spriteSheetPointer;
        const rect = Object.assign({}, state.rect);
        rect.x = Math.max(0, Math.min(spriteSheetImage.naturalWidth - rect.w, state.rect.x + point.x - state.startX));
        rect.y = Math.max(0, Math.min(spriteSheetImage.naturalHeight - rect.h, state.rect.y + point.y - state.startY));
        spriteFrameRects[state.frame] = rect;
        updateSpriteSheetMap();
        updateSpriteSheetSelectionLabel();
        return;
    }
    if (spriteSheetPointer.type === "move-selected") {
        const state = spriteSheetPointer;
        const dx = point.x - state.startX;
        const dy = point.y - state.startY;
        Object.entries(state.originalRects).forEach(([frameKey, originalRect]) => {
            const rect = Object.assign({}, originalRect);
            rect.x = Math.max(0, Math.min(spriteSheetImage.naturalWidth - rect.w, originalRect.x + dx));
            rect.y = Math.max(0, Math.min(spriteSheetImage.naturalHeight - rect.h, originalRect.y + dy));
            spriteFrameRects[frameKey] = rect;
        });
        updateSpriteSheetMap();
        updateSpriteSheetSelectionLabel();
        return;
    }
    if (spriteSheetPointer.type === "move-group") {
        const state = spriteSheetPointer;
        const dy = point.y - state.startY;
        Object.entries(state.originalRects).forEach(([frameKey, originalRect]) => {
            const rect = Object.assign({}, originalRect);
            rect.y = Math.max(0, Math.min(spriteSheetImage.naturalHeight - rect.h, originalRect.y + dy));
            spriteFrameRects[frameKey] = rect;
        });
        updateSpriteSheetMap();
        updateSpriteSheetSelectionLabel();
        return;
    }
    const state = spriteSheetPointer;
    const rect = Object.assign({}, state.rect);
    const dx = point.x - state.startX;
    const dy = point.y - state.startY;
    if (state.handle.includes("e")) rect.w = Math.max(1, state.rect.w + dx);
    if (state.handle.includes("w")) { rect.x = state.rect.x + dx; rect.w = Math.max(1, state.rect.w - dx); }
    rect.x = Math.max(0, Math.min(spriteSheetImage.naturalWidth - rect.w, rect.x));
    rect.y = Math.max(0, Math.min(spriteSheetImage.naturalHeight - rect.h, rect.y));
    spriteFrameRects[state.frame] = rect;
    updateSpriteSheetMap();
    updateSpriteSheetSelectionLabel();
}

function handleSpriteSheetPointerUp(event) {
    const map = document.getElementById("sprite-sheet-map");
    if (map && map.hasPointerCapture(event.pointerId)) map.releasePointerCapture(event.pointerId);
    if (spriteSheetPointer && spriteSheetPointer.type === "select" && !spriteSheetPointer.hasMoved) {
        const point = getSpriteSheetCanvasPoint(event);
        const frame = point ? getFrameAtPoint(point.x, point.y, point.grid) : null;
        if (frame !== null) {
            const activeFrames = getActiveSpriteFrames(point.grid);
            if (pendingSpriteReplacementFrame !== null) {
                if (!replaceActiveSpriteFrame(frame, point.grid)) {
                    showSystemAlert("QUADRO ATIVO", "CLIQUE EM UM QUADRO CYAN ATIVO PARA FAZER A SUBSTITUIÇÃO.");
                }
            } else if (activeFrames.has(frame)) {
                selectedSpriteSheetFrames = new Set([frame]);
                selectedSpriteSheetFrame = frame;
                updateSpriteSheetSelectionLabel();
            } else {
                requestInactiveSpriteFrameReplacement(frame, point.grid);
            }
        }
    }
    spriteSheetPointer = null;
    updateSpriteSheetMap();
    updateSpriteSheetSelectionLabel();
    updateSpriteSheetPointerCursor(event);
}

function extractSpriteSheetFrame(frameIndex) {
    const grid = getSpriteSheetGrid();
    if (!grid || !spriteSheetImage) return null;
    const rect = getSpriteFrameRect(frameIndex, grid);
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = Math.max(1, Math.round(rect.w));
    frameCanvas.height = Math.max(1, Math.round(rect.h));
    const frameCtx = frameCanvas.getContext("2d");
    frameCtx.imageSmoothingEnabled = false;
    frameCtx.drawImage(spriteSheetImage, rect.x, rect.y, rect.w, rect.h, 0, 0, frameCanvas.width, frameCanvas.height);
    return frameCanvas.toDataURL("image/png");
}

function mirrorImageSource(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const mirrorCanvas = document.createElement("canvas");
            mirrorCanvas.width = image.naturalWidth || image.width;
            mirrorCanvas.height = image.naturalHeight || image.height;
            const mirrorCtx = mirrorCanvas.getContext("2d");
            mirrorCtx.imageSmoothingEnabled = false;
            mirrorCtx.translate(mirrorCanvas.width, 0);
            mirrorCtx.scale(-1, 1);
            mirrorCtx.drawImage(image, 0, 0);
            resolve(mirrorCanvas.toDataURL("image/png"));
        };
        image.onerror = reject;
        image.src = source;
    });
}

async function invertSelectedSpriteFrame() {
    if (spriteMotionPreviewPlaying) {
        return showSystemAlert("PAUSE A PRÉVIA", "PAUSE A PRÉVIA ANTES DE INVERTER UM FRAME.");
    }
    const frames = getSpriteMotionPreviewFrames();
    if (!frames.length) {
        return showSystemAlert("PRÉVIA VAZIA", "ADICIONE OU SALVE FRAMES NA PRÉVIA ANTES DE INVERTÊ-LOS.");
    }
    const frameIndex = spriteMotionPreviewFrame % frames.length;
    try {
        const mirroredFrame = await mirrorImageSource(frames[frameIndex]);
        const updatedFrames = Array.from(frames);
        updatedFrames[frameIndex] = mirroredFrame;
        tempAnimations[activeSpriteMovement] = updatedFrames;
        savedSpriteMotionPreviewFrames[activeSpriteMovement] = Array.from(updatedFrames);
        renderSpriteAssignedFrames();
        renderSpriteMotionPreview();
    } catch (error) {
        showSystemAlert("ERRO", "NÃO FOI POSSÍVEL INVERTER O FRAME DA PRÉVIA.");
    }
}

function getMirrorTargetMovement() {
    return document.getElementById("sprite-mirror-target")?.value || "flyLeft";
}

function saveMovementCopy(targetMovement, frames) {
    tempAnimations[targetMovement] = Array.from(frames);
    savedSpriteMotionPreviewFrames[targetMovement] = Array.from(frames);
    tempFps[targetMovement] = tempFps[activeSpriteMovement] || 12;
}

function getMovementCopyFrames() {
    const frames = getSpriteMotionPreviewFrames();
    if (spriteMotionPreviewPlaying || !frames.length) return Array.from(frames);
    return getSelectedPreviewFrameIndices(frames.length).map(index => frames[index]);
}

function updatePreviewFrameCount(count) {
    const input = document.getElementById("sprite-animation-frames");
    if (input) input.value = Math.max(1, Math.min(30, count));
}

function cloneSelectedPreviewFrame() {
    if (spriteMotionPreviewPlaying) {
        return showSystemAlert("PAUSE A PRÉVIA", "PAUSE A PRÉVIA ANTES DE CLONAR UM FRAME.");
    }
    const frames = getSpriteMotionPreviewFrames();
    if (!frames.length) return showSystemAlert("PRÉVIA VAZIA", "NÃO HÁ FRAMES PARA CLONAR.");
    if (frames.length >= 30) return showSystemAlert("LIMITE DE FRAMES", "O MOVIMENTO JÁ POSSUI O LIMITE DE 30 FRAMES.");

    const selectedIndices = getSelectedPreviewFrameIndices(frames.length);
    const selectedSet = new Set(selectedIndices);
    const updatedFrames = [];
    frames.forEach((frame, index) => {
        updatedFrames.push(frame);
        if (selectedSet.has(index) && updatedFrames.length < 30) updatedFrames.push(frame);
    });
    tempAnimations[activeSpriteMovement] = updatedFrames;
    savedSpriteMotionPreviewFrames[activeSpriteMovement] = Array.from(updatedFrames);
    selectedPreviewFrameIndices.clear();
    spriteMotionPreviewFrame = Math.min(updatedFrames.length - 1, selectedIndices[0] + 1);
    updatePreviewFrameCount(updatedFrames.length);
    renderSpriteAssignedFrames();
    renderSpriteMotionPreview();
}

function deleteSelectedPreviewFrame() {
    if (spriteMotionPreviewPlaying) {
        return showSystemAlert("PAUSE A PRÉVIA", "PAUSE A PRÉVIA ANTES DE APAGAR UM FRAME.");
    }
    const frames = getSpriteMotionPreviewFrames();
    if (!frames.length) return showSystemAlert("PRÉVIA VAZIA", "NÃO HÁ FRAMES PARA APAGAR.");
    const selectedIndices = getSelectedPreviewFrameIndices(frames.length);
    const selectedSet = new Set(selectedIndices);
    showSystemConfirm("APAGAR FRAME", `DESEJA APAGAR ${selectedIndices.length} FRAME(S) SELECIONADO(S)?`, () => {
        const updatedFrames = frames.filter((frame, index) => !selectedSet.has(index));
        tempAnimations[activeSpriteMovement] = updatedFrames;
        savedSpriteMotionPreviewFrames[activeSpriteMovement] = Array.from(updatedFrames);
        selectedPreviewFrameIndices.clear();
        spriteMotionPreviewFrame = Math.max(0, Math.min(selectedIndices[0] || 0, updatedFrames.length - 1));
        updatePreviewFrameCount(Math.max(1, updatedFrames.length));
        renderSpriteAssignedFrames();
        renderSpriteMotionPreview();
    }, "SIM", "NÃO");
}

function duplicateMovement() {
    const targetMovement = getMirrorTargetMovement();
    const sourceFrames = getMovementCopyFrames();
    if (!sourceFrames.length) {
        return showSystemAlert("MOVIMENTO VAZIO", "ADICIONE FRAMES AO MOVIMENTO ATUAL ANTES DE DUPLICÁ-LO.");
    }
    if (targetMovement === activeSpriteMovement) {
        return showSystemAlert("MOVIMENTO IGUAL", "ESCOLHA UM MOVIMENTO DE DESTINO DIFERENTE DO MOVIMENTO ATUAL.");
    }
    saveMovementCopy(targetMovement, sourceFrames);
    showSystemAlert("MOVIMENTO DUPLICADO", `FRAMES COPIADOS PARA ${getSpriteMovementDisplayName(targetMovement)}.`);
}

async function duplicateMovementMirrored() {
    const targetMovement = getMirrorTargetMovement();
    const sourceFrames = getMovementCopyFrames();
    if (!sourceFrames.length) {
        return showSystemAlert("MOVIMENTO VAZIO", "ADICIONE FRAMES AO MOVIMENTO ATUAL ANTES DE DUPLICÁ-LO.");
    }
    if (targetMovement === activeSpriteMovement) {
        return showSystemAlert("MOVIMENTO IGUAL", "ESCOLHA UM MOVIMENTO DE DESTINO DIFERENTE DO MOVIMENTO ATUAL.");
    }
    try {
        const mirroredFrames = await Promise.all(sourceFrames.map(mirrorImageSource));
        saveMovementCopy(targetMovement, mirroredFrames);
        showSystemAlert("MOVIMENTO DUPLICADO", `FRAMES INVERTIDOS COPIADOS PARA ${getSpriteMovementDisplayName(targetMovement)}.`);
    } catch (error) {
        showSystemAlert("ERRO", "NÃO FOI POSSÍVEL INVERTER OS FRAMES DO MOVIMENTO.");
    }
}

function getSpriteMovementKey(action) {
    return action === "run" ? "flyRight" : action;
}

function getSpriteMovementDisplayName(action) {
    const labels = {
        idle: "PARADO",
        flyRight: "DIREITA",
        flyLeft: "ESQUERDA",
        flyDown: "BAIXO",
        flyUp: "CIMA",
        flyUpRight: "CIMA + DIREITA",
        flyUpLeft: "CIMA + ESQUERDA",
        flyDownRight: "BAIXO + DIREITA",
        flyDownLeft: "BAIXO + ESQUERDA",
        parry: "PARRY",
        attackKi: "ATAQUE",
        chargeKi: "CARREGAR",
        transform: "TRANSFORMAR"
    };
    return labels[action] || action.toUpperCase();
}

function setActiveSpriteMovement(action) {
    activeSpriteMovement = getSpriteMovementKey(action);
    spriteMotionPreviewFrame = 0;
    selectedPreviewFrameIndices.clear();
    document.querySelectorAll("[data-sprite-action]").forEach(button => {
        button.classList.toggle("active", button.dataset.spriteAction === action);
    });

    const fpsEl = document.getElementById("sprite-active-fps");
    if (fpsEl) fpsEl.value = tempFps[activeSpriteMovement] || 12;
    renderSpriteAssignedFrames();
    renderSpriteMotionPreview();
}

function limitSpriteAnimationFrames() {
    const input = document.getElementById("sprite-animation-frames");
    if (input) input.value = Math.max(1, Math.min(30, Number.parseInt(input.value, 10) || 1));
}

function updateActiveSpriteFps() {
    const fps = getSpriteSheetNumber("sprite-active-fps", 12);
    tempFps[activeSpriteMovement] = fps;
    renderSpriteMotionPreview();
    if (spriteMotionPreviewPlaying) startSpriteMotionPreview();
}

function appendFramesToActiveMovement(sources) {
    const currentFrames = getSpriteMotionPreviewFrames();
    const updatedFrames = Array.from(currentFrames).concat(sources).slice(0, 30);
    tempAnimations[activeSpriteMovement] = updatedFrames;
    savedSpriteMotionPreviewFrames[activeSpriteMovement] = Array.from(updatedFrames);
    updatePreviewFrameCount(Math.max(1, updatedFrames.length));
    spriteMotionPreviewFrame = Math.min(spriteMotionPreviewFrame, Math.max(0, updatedFrames.length - 1));
}

function assignSelectedSpriteFrame() {
    if (selectedSpriteSheetFrames.size === 0) {
        return showSystemAlert("SELECIONE UM QUADRO", "CLIQUE EM UM OU MAIS QUADROS DA SPRITE SHEET ANTES DE ADICIONAR.");
    }

    const sources = Array.from(selectedSpriteSheetFrames)
        .sort((first, second) => first - second)
        .map(frame => extractSpriteSheetFrame(frame))
        .filter(Boolean);
    if (!sources.length) return;

    appendFramesToActiveMovement(sources);
    // a prévia já pula para o primeiro quadro recém-adicionado
    spriteMotionPreviewFrame = Math.max(0, getSpriteMotionPreviewFrames().length - sources.length);
    renderSpriteAssignedFrames();
    renderSpriteMotionPreview();
}

function clearActiveSpriteFrames() {
    tempAnimations[activeSpriteMovement] = [];
    delete savedSpriteMotionPreviewFrames[activeSpriteMovement];
    renderSpriteAssignedFrames();
    renderSpriteMotionPreview();
}

function renderSpriteAssignedFrames() {
    const container = document.getElementById("sprite-assigned-frames");
    if (!container) return;
    container.innerHTML = "";
    const frames = savedSpriteMotionPreviewFrames[activeSpriteMovement]
        || (tempAnimations[activeSpriteMovement] || []);
    if (frames.length === 0) {
        const empty = document.createElement("span");
        empty.className = "sprite-assigned-empty";
        empty.innerText = "Nenhum quadro atribuído ao movimento.";
        container.appendChild(empty);
        return;
    }
    frames.forEach((src, index) => {
        const frameBox = document.createElement("div");
        frameBox.className = "sprite-assigned-frame";
        frameBox.draggable = !spriteMotionPreviewPlaying;
        frameBox.dataset.frameIndex = String(index);
        frameBox.classList.toggle("preview-selected", selectedPreviewFrameIndices.has(index));
        frameBox.addEventListener("pointerdown", event => {
            if (spriteMotionPreviewPlaying) return;
            event.preventDefault();
            previewSelectionPointerDown = true;
            previewSelectionWasDragged = false;
            if (!event.shiftKey) selectedPreviewFrameIndices.clear();
            selectedPreviewFrameIndices.add(index);
            spriteMotionPreviewFrame = index;
            frameBox.classList.add("preview-selected");
            renderSpriteMotionPreview();
        });
        frameBox.addEventListener("pointerenter", () => {
            if (!previewSelectionPointerDown || spriteMotionPreviewPlaying) return;
            previewSelectionWasDragged = true;
            selectedPreviewFrameIndices.add(index);
            frameBox.classList.add("preview-selected");
        });
        frameBox.addEventListener("pointerup", () => {
            previewSelectionPointerDown = false;
        });
        frameBox.addEventListener("dragstart", event => {
            if (spriteMotionPreviewPlaying) {
                event.preventDefault();
                return;
            }
            event.dataTransfer.setData("text/plain", String(index));
            event.dataTransfer.effectAllowed = "move";
        });
        frameBox.addEventListener("dragover", event => {
            if (spriteMotionPreviewPlaying) return;
            event.preventDefault();
            frameBox.classList.add("drag-over");
        });
        frameBox.addEventListener("dragleave", () => frameBox.classList.remove("drag-over"));
        frameBox.addEventListener("drop", event => {
            event.preventDefault();
            frameBox.classList.remove("drag-over");
            if (spriteMotionPreviewPlaying) return;
            const sourceIndex = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);
            reorderSelectedPreviewFrame(sourceIndex, index);
        });

        const number = document.createElement("span");
        number.className = "sprite-assigned-frame-number";
        number.innerText = String(index + 1);

        const image = document.createElement("img");
        image.src = src;
        image.title = `F${index + 1}`;
        image.dataset.previewFrame = String(index);
        image.style.cursor = spriteMotionPreviewPlaying ? "default" : "pointer";
        image.style.outline = !spriteMotionPreviewPlaying && index === spriteMotionPreviewFrame ? "2px solid #22d3ee" : "none";
        image.addEventListener("click", () => {
            if (spriteMotionPreviewPlaying) return;
            if (!previewSelectionWasDragged) {
                selectedPreviewFrameIndices.clear();
                selectedPreviewFrameIndices.add(index);
                renderSpriteAssignedFrames();
            }
            spriteMotionPreviewFrame = index;
            renderSpriteMotionPreview();
            previewSelectionWasDragged = false;
        });
        frameBox.appendChild(image);
        frameBox.appendChild(number);
        container.appendChild(frameBox);
    });
}

function getSelectedPreviewFrameIndices(frameCount) {
    const valid = Array.from(selectedPreviewFrameIndices)
        .filter(index => index >= 0 && index < frameCount)
        .sort((first, second) => first - second);
    if (valid.length) return valid;
    if (frameCount > 0) return [spriteMotionPreviewFrame % frameCount];
    return [];
}

function reorderSelectedPreviewFrame(sourceIndex, targetIndex) {
    const frames = getSpriteMotionPreviewFrames();
    if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex) || sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0 || sourceIndex >= frames.length || targetIndex >= frames.length) return;
    const updatedFrames = Array.from(frames);
    const [movedFrame] = updatedFrames.splice(sourceIndex, 1);
    updatedFrames.splice(targetIndex, 0, movedFrame);
    tempAnimations[activeSpriteMovement] = updatedFrames;
    savedSpriteMotionPreviewFrames[activeSpriteMovement] = Array.from(updatedFrames);
    spriteMotionPreviewFrame = targetIndex;
    renderSpriteAssignedFrames();
    renderSpriteMotionPreview();
}

function getSpriteMotionPreviewFrames() {
    if (savedSpriteMotionPreviewFrames[activeSpriteMovement]) {
        return savedSpriteMotionPreviewFrames[activeSpriteMovement];
    }
    const frames = tempAnimations[activeSpriteMovement] || [];
    return frames.filter(Boolean);
}

function renderSpriteMotionPreview() {
    const preview = document.getElementById("sprite-motion-preview");
    const label = document.getElementById("sprite-motion-preview-label");
    if (!preview) return;
    const previewCtx = preview.getContext("2d");
    const frames = getSpriteMotionPreviewFrames();
    previewCtx.imageSmoothingEnabled = false;
    if (label) label.innerText = `PRÉVIA: ${getSpriteMovementDisplayName(activeSpriteMovement)} ${frames.length ? `${spriteMotionPreviewFrame + 1}/${frames.length}` : "VAZIA"}`;
    if (!frames.length) {
        previewCtx.clearRect(0, 0, preview.width, preview.height);
        previewCtx.fillStyle = "#000";
        previewCtx.fillRect(0, 0, preview.width, preview.height);
        return;
    }

    const source = frames[spriteMotionPreviewFrame % frames.length];
    let image = spriteMotionPreviewImageCache[source];
    if (!image) {
        image = new Image();
        spriteMotionPreviewImageCache[source] = image;
        image.onload = () => renderSpriteMotionPreview();
        image.src = source;
    }
    if (!image.complete || image.naturalWidth === 0) return;

    previewCtx.clearRect(0, 0, preview.width, preview.height);
    previewCtx.fillStyle = "#000";
    previewCtx.fillRect(0, 0, preview.width, preview.height);
    const scale = Math.min((preview.width * 0.9) / image.naturalWidth, (preview.height * 0.9) / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    previewCtx.drawImage(image, (preview.width - drawWidth) / 2, (preview.height - drawHeight) / 2, drawWidth, drawHeight);
}

function stopSpriteMotionPreview() {
    if (spriteMotionPreviewTimer) {
        clearInterval(spriteMotionPreviewTimer);
        spriteMotionPreviewTimer = null;
    }
    spriteMotionPreviewPlaying = false;
}

function startSpriteMotionPreview() {
    stopSpriteMotionPreview();
    const fps = Math.max(1, getSpriteSheetNumber("sprite-active-fps", 12));
    spriteMotionPreviewPlaying = true;
    spriteMotionPreviewTimer = setInterval(() => {
        const frames = getSpriteMotionPreviewFrames();
        if (!frames.length) return;
        spriteMotionPreviewFrame = (spriteMotionPreviewFrame + 1) % frames.length;
        renderSpriteMotionPreview();
    }, 1000 / fps);
}

function toggleSpriteMotionPreview() {
    if (spriteMotionPreviewPlaying) stopSpriteMotionPreview();
    else startSpriteMotionPreview();
    renderSpriteAssignedFrames();
    renderSpriteMotionPreview();
}

const spriteSheetMapCanvas = document.getElementById("sprite-sheet-map");
if (spriteSheetMapCanvas) {
    spriteSheetMapCanvas.addEventListener("pointerdown", handleSpriteSheetPointerDown);
    spriteSheetMapCanvas.addEventListener("pointermove", handleSpriteSheetPointerMove);
    spriteSheetMapCanvas.addEventListener("pointerup", handleSpriteSheetPointerUp);
    spriteSheetMapCanvas.addEventListener("pointercancel", handleSpriteSheetPointerUp);
    spriteSheetMapCanvas.addEventListener("contextmenu", event => event.preventDefault());
}

// ==================== MODAL DE EDIÇÃO ====================
if (fileInput) {
    fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target.result;
                tempBase64 = result;
                loadedUrlImageObj = null;

                const img = new Image();
                img.onload = () => {
                    loadedFileImageObj = img;
                    setSpriteSheetImage(img, result);
                    updateModalPreview();
                };
                img.src = result;
                updateModalPreview();
            };
            reader.onerror = () => {
                showSystemAlert("ERRO", "ERRO AO LER O ARQUIVO");
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };
}

function getBgRemovalFromForm() {
    const mode = document.getElementById("char-bg-mode");
    const color = document.getElementById("char-bg-color");
    const tol = document.getElementById("char-bg-tol");
    return normalizeBgRemoval({
        mode: mode ? mode.value : "auto",
        color: color ? color.value : "#ffffff",
        tolerance: tol ? tol.value : 8
    });
}

function setFormFromBgRemoval(cfg) {
    const c = normalizeBgRemoval(cfg);
    const mode = document.getElementById("char-bg-mode");
    const color = document.getElementById("char-bg-color");
    const tol = document.getElementById("char-bg-tol");
    if (mode) mode.value = c.mode;
    if (color) color.value = c.color;
    if (tol) tol.value = c.tolerance;
}

function getModalBaseImageSource() {
    const currentCharacter = editingKey && characterDB[editingKey] ? characterDB[editingKey] : null;
    const idleFrames = tempAnimations.idle || [];
    return idleFrames[0] || tempBase64 || (currentCharacter && currentCharacter.defaultUrl) || null;
}

// Botão "PEGAR COR DO CANTO": usa a cor do canto da imagem atual como cor de fundo a apagar.
function pickBgColorFromCorner() {
    const useImage = (img) => {
        try {
            const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            const cctx = c.getContext("2d", { willReadFrequently: true });
            cctx.drawImage(img, 0, 0);
            const px = cctx.getImageData(0, 0, w, h);
            const hex = pickCornerColor(px.data, w, h);
            if (!hex) return showSystemAlert("SEM FUNDO", "OS CANTOS DA IMAGEM JÁ SÃO TRANSPARENTES. NÃO HÁ COR PARA APAGAR.");
            const mode = document.getElementById("char-bg-mode");
            const color = document.getElementById("char-bg-color");
            if (mode) mode.value = "color";
            if (color) color.value = hex;
            updateModalPreview();
        } catch (err) {
            showSystemAlert("ERRO", "NÃO FOI POSSÍVEL LER A IMAGEM (ORIGEM EXTERNA BLOQUEADA PELO NAVEGADOR). ESCOLHA A COR MANUALMENTE.");
        }
    };
    const direct = loadedFileImageObj || loadedUrlImageObj;
    if (direct && direct.complete && direct.naturalWidth) return useImage(direct);
    const src = getModalBaseImageSource();
    if (!src) return showSystemAlert("SEM IMAGEM", "CARREGUE UMA IMAGEM ANTES DE ESCOLHER A COR DO FUNDO.");
    loadImageSecure(src, (img) => useImage(img));
}

function updateModalPreview() {
    if (!prevCtx || !prevCanvas) return;
    prevCtx.clearRect(0, 0, prevCanvas.width, prevCanvas.height);

    const currentCharacter = editingKey && characterDB[editingKey] ? characterDB[editingKey] : null;
    const idleFrames = tempAnimations.idle || [];
    const baseCharacterSource = idleFrames[0] || tempBase64 || (currentCharacter && currentCharacter.defaultUrl) || null;

    if (baseCharacterSource) {
        loadImageSecure(baseCharacterSource, (img) => {
            if (img) renderImageToPreview(img);
        });
        return;
    }

    if (loadedUrlImageObj) {
        renderImageToPreview(loadedUrlImageObj);
        return;
    }

    if (loadedFileImageObj) {
        renderImageToPreview(loadedFileImageObj);
        return;
    }

    loadImageSecure(getFallbackSpriteSvg(), (img) => {
        if (img) renderImageToPreview(img);
    });
}

function renderImageToPreview(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    img = getCutoutSource(img, getBgRemovalFromForm()); // a prévia mostra já sem o fundo, como ficará no jogo

    let imgAspect = img.naturalWidth / img.naturalHeight;
    let canvasAspect = prevCanvas.width / prevCanvas.height;

    let baseW, baseH;
    if (imgAspect > canvasAspect) {
        baseW = prevCanvas.width * 0.85;
        baseH = baseW / imgAspect;
    } else {
        baseH = prevCanvas.height * 0.85;
        baseW = baseH * imgAspect;
    }

    let renderW = baseW;
    let renderH = baseH;
    let drawX = (prevCanvas.width - baseW) / 2;
    let drawY = (prevCanvas.height - baseH) / 2;

    try {
        prevCtx.imageSmoothingEnabled = false;
        prevCtx.drawImage(
            img,
            0, 0,
            img.naturalWidth, img.naturalHeight,
            drawX, drawY,
            renderW, renderH
        );
    } catch (e) {
        console.warn("Erro ao renderizar preview:", e);
    }
}

function openModal(key = null) {
    editingKey = key;
    tempBase64 = null;
    spriteSheetImage = null;
    selectedSpriteSheetFrame = null;
    selectedSpriteSheetFrames = new Set();
    spriteFrameRects = {};
    lastSpriteSheetGridSignature = null;
    pendingSpriteReplacementFrame = null;
    activeSpriteSheetFrames = null;
    spriteSheetPointer = null;
    activeSpriteMovement = "idle";
    stopSpriteMotionPreview();
    spriteMotionPreviewFrame = 0;
    savedSpriteMotionPreviewFrames = {};
    spriteMotionPreviewImageCache = {};
    selectedPreviewFrameIndices.clear();
    previewSelectionPointerDown = false;
    loadedUrlImageObj = null;
    loadedFileImageObj = null;
    tempAnimations = {
        idle: [],
        flyUp: [], flyDown: [], flyRight: [], flyLeft: [],
        flyUpRight: [], flyUpLeft: [], flyDownRight: [], flyDownLeft: [],
        parry: [], attackKi: [], chargeKi: [], transform: []
    };

    tempFps = {
        idle: 12, flyUp: 12, flyDown: 12, flyRight: 12, flyLeft: 12,
        flyUpRight: 12, flyUpLeft: 12, flyDownRight: 12, flyDownLeft: 12,
        parry: 12, attackKi: 12, chargeKi: 12, transform: 12
    };
    const char = (key && characterDB[key]) ? characterDB[key] : {
        name: "", aura: "gelo", alignment: "HERÓI", special: "KAMEHAMEHA",
        frameWidth: 32, frameHeight: 32, totalFrames: 1, scale: 1,
        defaultUrl: "", projColor: "#00ffff", projSize: "normal",
        animations: {},
        fpsSettings: {}
    };

    if (char.animations) {
        if (char.animations.idle) {
            tempAnimations.idle = Array.isArray(char.animations.idle) ? Array.from(char.animations.idle) : [char.animations.idle];
        }
        const animKeys = ["flyUp", "flyDown", "flyRight", "flyLeft", "flyUpRight", "flyUpLeft", "flyDownRight", "flyDownLeft", "parry", "attackKi", "chargeKi", "transform"];
        animKeys.forEach(k => {
            if (char.animations[k]) {
                tempAnimations[k] = Array.isArray(char.animations[k])
                    ? Array.from(char.animations[k])
                    : [char.animations[k]];
            }
        });
    }

    if (char.fpsSettings) {
        SUB_ANIM_KEYS.forEach(k => {
            if (char.fpsSettings[k]) tempFps[k] = char.fpsSettings[k];
        });
    }

    const modalTitle = document.getElementById('modal-title');
    const charName = document.getElementById('char-name');
    const charAura = document.getElementById('char-aura');
    const charAlign = document.getElementById('char-alignment');
    const charSpec = document.getElementById('char-special');
    const charProjColor = document.getElementById('char-proj-color');
    const charProjSize = document.getElementById('char-proj-size');
    const charScale = document.getElementById('char-scale');
    const charFw = document.getElementById('char-fw');
    const charFh = document.getElementById('char-fh');
    const charFrames = document.getElementById('char-frames');

    if (modalTitle) modalTitle.innerText = key ? "EDITAR PERSONAGEM" : "CRIAR PERSONAGEM";
    if (charName) charName.value = char.name;
    if (charAura) charAura.value = char.aura;
    if (charAlign) charAlign.value = char.alignment;
    if (charSpec) charSpec.value = char.special || "KAMEHAMEHA";
    if (charProjColor) charProjColor.value = char.projColor || "#00ffff";
    if (charProjSize) charProjSize.value = char.projSize || "normal";
    if (charScale) charScale.value = char.scale || 1;
    if (charFw) charFw.value = char.frameWidth || 32;
    if (charFh) charFh.value = char.frameHeight || 32;
    if (charFrames) charFrames.value = char.totalFrames || 1;

    const spriteWidth = document.getElementById("sprite-frame-width");
    const spriteHeight = document.getElementById("sprite-frame-height");
    const spriteTotal = document.getElementById("sprite-total-frames");
    if (spriteWidth) spriteWidth.value = char.frameWidth || 32;
    if (spriteHeight) spriteHeight.value = char.frameHeight || 32;
    if (spriteTotal) spriteTotal.value = char.totalFrames || 1;
    
    setFormFromBgRemoval(char.bgRemoval);
    populateBuilderPresetOptions();
    builderLastAppearance = char.builderAppearance || null;
    setBuilderFormFromAppearance(char.builderAppearance || SPRITE_PRESETS.goku.appearance);
    const buildPresetSel = document.getElementById("build-preset");
    if (buildPresetSel) buildPresetSel.value = "";
    switchEditorTab('basico');

    if (modal) modal.style.display = 'flex';
    setTimeout(() => {
        updateModalPreview();
        setActiveSpriteMovement("idle");
        renderSpriteAssignedFrames();
        renderSpriteMotionPreview();
        focusModal(modal);
    }, 50);
}

function closeModal() {
    stopBuilderPreview();
    stopSpriteMotionPreview();
    if (modal) modal.style.display = 'none';
    editingKey = null;
    tempBase64 = null;
    loadedUrlImageObj = null;
    loadedFileImageObj = null;
    tempAnimations = {};
    tempFps = {};
    restoreFocusAfterModal();
}

function openUpdatesModal() {
    if (updatesModal) updatesModal.style.display = 'flex';
    focusModal(updatesModal);
}

function closeUpdatesModal() {
    if (updatesModal) updatesModal.style.display = 'none';
    restoreFocusAfterModal();
}

function saveCharacterFromModal() {
    const charName = document.getElementById('char-name');
    const name = charName ? charName.value.trim().toUpperCase() : "";
    if (!name) {
        return showSystemAlert("CAMPO OBRIGATÓRIO", "DIGITE O NOME DO PERSONAGEM!");
    }

    let key = editingKey || ("char_" + Date.now());
    const idleFrames = tempAnimations.idle || [];
    let finalUrl = idleFrames[0] || tempBase64 || getFallbackSpriteSvg();

    loadImageSecure(finalUrl, (img) => {
        if (img) {
            let animData = {
                idle: idleFrames.length ? Array.from(idleFrames) : [finalUrl],
                flyUp: Array.from(tempAnimations.flyUp),
                flyDown: Array.from(tempAnimations.flyDown),
                flyRight: Array.from(tempAnimations.flyRight),
                flyLeft: Array.from(tempAnimations.flyLeft),
                flyUpRight: Array.from(tempAnimations.flyUpRight),
                flyUpLeft: Array.from(tempAnimations.flyUpLeft),
                flyDownRight: Array.from(tempAnimations.flyDownRight),
                flyDownLeft: Array.from(tempAnimations.flyDownLeft),
                parry: Array.from(tempAnimations.parry),
                attackKi: Array.from(tempAnimations.attackKi),
                chargeKi: Array.from(tempAnimations.chargeKi),
                transform: Array.from(tempAnimations.transform)
            };

            let fpsData = {};
            SUB_ANIM_KEYS.forEach(k => {
                fpsData[k] = tempFps[k] || 12;
            });

            const charAlign = document.getElementById('char-alignment');
            const charAura = document.getElementById('char-aura');
            const charSpec = document.getElementById('char-special');
            const charProjColor = document.getElementById('char-proj-color');
            const charProjSize = document.getElementById('char-proj-size');
            const charScale = document.getElementById('char-scale');
            const charFw = document.getElementById('char-fw');
            const charFh = document.getElementById('char-fh');
            const charFrames = document.getElementById('char-frames');
            const isPureBuilderOutput = builderLastAppearance && SUB_ANIM_KEYS.every(state => {
                const expected = getProceduralFrameUrls(builderLastAppearance, state);
                const actual = animData[state] || [];
                return actual.length === expected.length && actual.every((url, i) => url === expected[i]);
            });

            const wasNewCharacter = !editingKey;
            const previousCharacter = characterDB[key];
            characterDB[key] = {
                name: name,
                imageObj: null,
                defaultUrl: animData.idle[0] || finalUrl,
                animations: animData,
                fpsSettings: fpsData,
                builderAppearance: isPureBuilderOutput ? builderLastAppearance : null,
                alignment: charAlign ? charAlign.value : "HERÓI",
                aura: charAura ? charAura.value : "gelo",
                special: charSpec ? charSpec.value : "KAMEHAMEHA",
                projColor: charProjColor ? charProjColor.value : "#00ffff",
                projSize: charProjSize ? charProjSize.value : "normal",
                scale: charScale ? parseFloat(charScale.value) || 1 : 1,
                frameWidth: charFw ? parseInt(charFw.value, 10) || img.naturalWidth || 32 : 32,
                frameHeight: charFh ? parseInt(charFh.value, 10) || img.naturalHeight || 32 : 32,
                totalFrames: charFrames ? parseInt(charFrames.value, 10) || 1 : 1,
                bgRemoval: getBgRemovalFromForm()
            };
            if (!saveCharacterData()) {
                // Não coube no armazenamento do navegador: desfaz na memória também, para o jogo não mostrar
                // um personagem que vai sumir ao reabrir. O editor continua aberto, sem perder o trabalho.
                if (previousCharacter) characterDB[key] = previousCharacter;
                else delete characterDB[key];
                return showSystemAlert("SEM ESPAÇO", "O NAVEGADOR NÃO TEM ESPAÇO PARA SALVAR ESTE PERSONAGEM. USE MENOS QUADROS OU IMAGENS MENORES, OU EXCLUA OUTRO PERSONAGEM.");
            }
            if (wasNewCharacter) {
                bumpStat("customCharactersCreated", 1);
                unlockAchievement("builder_first");
                if (isPureBuilderOutput && builderLastAppearance) {
                    if (builderLastAppearance.tail && builderLastAppearance.tail !== "none") unlockAchievement("builder_tail");
                    if (builderLastAppearance.wings && builderLastAppearance.wings !== "none") unlockAchievement("builder_wings");
                    if (builderLastAppearance.backWeapon && builderLastAppearance.backWeapon !== "none") unlockAchievement("builder_weapon");
                }
            }
            closeModal();
            showSystemAlert("SUCESSO", `PERSONAGEM ${name} SALVO!`);
        } else {
            showSystemAlert("ERRO", "NÃO FOI POSSÍVEL CARREGAR A IMAGEM!");
        }
    });
}

// ==================== DATABASE DE PERSONAGENS ====================
function loadCharacterData() {
    try {
        let saved = readStorage("saiyan_db_v8_8bit");
        if (saved) {
            let data = JSON.parse(saved);
            let validCount = 0;

            for (let k in data) {
                let item = data[k];
                if (!item.name || !item.defaultUrl) {
                    console.warn(`Personagem ${k} corrompido, ignorando`);
                    continue;
                }

                validCount++;
                // Personagens salvos por versões antigas trazem o fundo branco dentro do SVG: recorta na leitura.
                item.defaultUrl = stripSvgWhiteBackground(item.defaultUrl);
                if (item.animations && typeof item.animations === "object") {
                    for (const state of Object.keys(item.animations)) {
                        if (Array.isArray(item.animations[state])) {
                            item.animations[state] = item.animations[state].map(stripSvgWhiteBackground);
                        }
                    }
                }
                const character = Object.assign({}, item, { imageObj: null });
                Object.keys(character).forEach(property => {
                    if (/^(animation|img)(zoom|offset)/i.test(property)) delete character[property];
                });
                // Personagem do construtor sem animações salvas (foram descartadas para caber no localStorage,
                // ver saveCharacterData): recria os quadros a partir da aparência guardada.
                if (character.builderAppearance && (!character.animations || Object.keys(character.animations).length === 0)) {
                    Object.assign(character, buildProceduralAnimations(character.builderAppearance));
                }
                characterDB[k] = character;
                loadImageSecure(item.defaultUrl, (img) => {
                    if (characterDB[k]) characterDB[k].imageObj = img;
                });
            }

            if (validCount > 0) {
                seedNewDefaultCharacters();
                return;
            }
        }
    } catch (e) {
        console.warn("Erro ao carregar database:", e);
    }

    loadDefaultCharacters();
}

// Personagens iniciais: um para cada modelo da lista "COMEÇAR A PARTIR DE..." do construtor (SPRITE_PRESETS em
// sprites.js), montados com o próprio construtor — já nascem com animações fluidas (voo, ataque, parry, carregar,
// transformar). O construtor continua funcionando igual para criar personagens novos a partir desses modelos.
const DEFAULT_CHARACTERS = {
    goku_adult: { name: "GOKU", presetKey: "goku", align: "HERÓI", aura: "gelo", spec: "KAMEHAMEHA" },
    vegeta: { name: "VEGETA", presetKey: "vegeta", align: "ANTI-HERÓI", aura: "amarelo", spec: "FINAL FLASH" },
    piccolo: { name: "PICCOLO", presetKey: "piccolo", align: "HERÓI", aura: "verde", spec: "MAKAN KOSAPPO" },
    freeza_1: { name: "FREEZA (FINAL)", presetKey: "freeza", align: "VILÃO", aura: "roxo", spec: "DEATH BEAM" },
    trunks: { name: "TRUNKS", presetKey: "trunks", align: "HERÓI", aura: "azul", spec: "BURNING ATTACK" },
    gohan: { name: "GOHAN", presetKey: "gohan", align: "HERÓI", aura: "gelo", spec: "MASENKO" },
    kaioshin: { name: "SUPREMO SR. KAIO", presetKey: "kaioshin", align: "HERÓI", aura: "rosa", spec: "KIAI SAGRADO" },
    gogeta: { name: "GOGETA", presetKey: "fusao", align: "HERÓI", aura: "amarelo", spec: "BIG BANG KAMEHAMEHA" },
    bardock: { name: "BARDOCK", presetKey: "bardock", align: "ANTI-HERÓI", aura: "azul", spec: "RIOT JAVELIN" },
    android17: { name: "ANDROIDE 17", presetKey: "android17", align: "ANTI-HERÓI", aura: "verde", spec: "POWER BLITZ" },
    android18: { name: "ANDROIDE 18", presetKey: "android18", align: "ANTI-HERÓI", aura: "azul", spec: "DESTRUCTO DISC" },
    majin_buu: { name: "MAJIN BUU", presetKey: "majin", align: "VILÃO", aura: "rosa", spec: "CHOCOLATE BEAM" },
    raditz: { name: "RADITZ", presetKey: "raditz", align: "VILÃO", aura: "roxo", spec: "DOUBLE SUNDAY" },
    broly: { name: "BROLY", presetKey: "broly", align: "VILÃO", aura: "verde", spec: "ERASER CANNON" }
};
// Os 4 que já vinham nas versões antigas: perfis antigos já os receberam (se o jogador apagou algum, não volta).
const ORIGINAL_DEFAULT_CHARACTER_KEYS = ["goku_adult", "vegeta", "piccolo", "freeza_1"];

function createDefaultCharacter(k) {
    const d = DEFAULT_CHARACTERS[k];
    const appearance = SPRITE_PRESETS[d.presetKey].appearance;
    const svg = generateSpriteFrameUrl(appearance, "idle", 0);
    const { animations, fpsSettings } = buildProceduralAnimations(appearance);
    characterDB[k] = {
        name: d.name,
        imageObj: null,
        defaultUrl: svg,
        animations,
        fpsSettings,
        alignment: d.align,
        aura: d.aura,
        special: d.spec,
        scale: 1,
        frameWidth: 32,
        frameHeight: 32,
        totalFrames: 1,
        projColor: appearance.kiColor || "#00ffff",   // o tiro sai na cor de ki do modelo
        projSize: "normal",
        builderAppearance: appearance,
        bgRemoval: { mode: "none" }
    };
    loadImageSecure(svg, (img) => {
        if (characterDB[k]) characterDB[k].imageObj = img;
    });
}

function loadDefaultCharacters() {
    for (const k in DEFAULT_CHARACTERS) {
        if (!characterDB[k]) createDefaultCharacter(k);
    }
    writeStorage("saiyan_defaults_seeded", JSON.stringify(Object.keys(DEFAULT_CHARACTERS)));
}

// Perfil que já tinha personagens salvos: acrescenta, UMA vez, os personagens iniciais que ele ainda não recebeu
// (ex.: os modelos novos do construtor). Um personagem inicial que o jogador apagar depois não volta sozinho.
function seedNewDefaultCharacters() {
    let seeded = readJsonStorage("saiyan_defaults_seeded", null);
    if (!Array.isArray(seeded)) seeded = ORIGINAL_DEFAULT_CHARACTER_KEYS.slice();
    let added = false;
    for (const k in DEFAULT_CHARACTERS) {
        if (seeded.includes(k)) continue;
        if (!characterDB[k]) { createDefaultCharacter(k); added = true; }
        seeded.push(k);
    }
    writeStorage("saiyan_defaults_seeded", JSON.stringify(seeded));
    if (added) saveCharacterData();
}

function saveCharacterData() {
    try {
        let exportData = {};
        for (let k in characterDB) {
            let item = characterDB[k];
            let rest = Object.assign({}, item);
            delete rest.imageObj;
            // builderAppearance só é gravado no personagem quando as animações batem exatamente com o que o
            // construtor geraria (ver saveCharacterFromModal) — nesse caso não precisa duplicar ~1MB de SVGs
            // no armazenamento; loadCharacterData recria tudo a partir da aparência ao carregar.
            if (rest.builderAppearance) delete rest.animations;
            exportData[k] = rest;
        }
        return writeStorage("saiyan_db_v8_8bit", JSON.stringify(exportData));
    } catch (e) {
        console.warn("Erro ao salvar database:", e);
        showSystemAlert("ERRO", "NÃO FOI POSSÍVEL SALVAR OS PERSONAGENS!");
        return false;
    }
}

function getFilteredCharacters() {
    return Object.keys(characterDB).filter(k => {
        let a = characterDB[k].alignment;
        return currentTab === "HERÓIS" ? (a === "HERÓI" || a === "ANTI-HERÓI") : (a === "VILÃO" || a === "ANTI-HERÓI");
    });
}

initSettings();

// ==================== CONSTRUTOR DE PERSONAGEM (aba 3 do editor) ====================
// Monta uma aparência combinando partes (cabelo, roupa, cauda, asas, arma nas costas, acessórios — ver sprites.js)
// e gera as animações do personagem na hora, sem precisar de nenhuma imagem enviada.
let builderPreviewTimer = null;
let builderPreviewFrame = 0;

const BUILDER_FIELD_IDS = {
    race: "build-race", build: "build-build", hairStyle: "build-hair-style", hairColor: "build-hair-color",
    eyeType: "build-eye-type", irisColor: "build-iris-color", scleraColor: "build-sclera-color",
    earType: "build-ear-type", mouthType: "build-mouth-type", scar: "build-scar", accessory: "build-accessory",
    hat: "build-hat", symbol: "build-symbol", outerShirt: "build-outer-shirt", innerShirt: "build-inner-shirt",
    pants: "build-pants", shoes: "build-shoes", gloves: "build-gloves", cape: "build-cape", capeColor: "build-cape-color",
    tail: "build-tail", wings: "build-wings", backWeapon: "build-back-weapon", primaryColor: "build-primary-color",
    secondaryColor: "build-secondary-color", accentColor: "build-accent-color", kiColor: "build-ki-color"
};

function populateBuilderPresetOptions() {
    const sel = document.getElementById("build-preset");
    if (!sel || sel.dataset.filled === "1") return;
    Object.keys(SPRITE_PRESETS).forEach(key => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = SPRITE_PRESETS[key].label;
        sel.appendChild(opt);
    });
    sel.dataset.filled = "1";
}

function getBuilderAppearanceFromForm() {
    const app = {};
    for (const key in BUILDER_FIELD_IDS) {
        const el = document.getElementById(BUILDER_FIELD_IDS[key]);
        if (el) app[key] = el.value;
    }
    const autoSkin = document.getElementById("build-skin-auto");
    const skinInput = document.getElementById("build-skin");
    app.skinColor = (autoSkin && autoSkin.checked) ? "" : (skinInput ? skinInput.value : "");
    return normalizeAppearance(app);
}

function setBuilderFormFromAppearance(appearance) {
    const app = normalizeAppearance(appearance);
    for (const key in BUILDER_FIELD_IDS) {
        const el = document.getElementById(BUILDER_FIELD_IDS[key]);
        if (el) el.value = app[key];
    }
    const autoSkin = document.getElementById("build-skin-auto");
    const skinInput = document.getElementById("build-skin");
    if (autoSkin) autoSkin.checked = !app.skinColor;
    if (skinInput) skinInput.value = app.skinColor || spriteSkin(app);
}

function applyBuilderPreset() {
    const sel = document.getElementById("build-preset");
    const key = sel ? sel.value : "";
    if (key && SPRITE_PRESETS[key]) {
        setBuilderFormFromAppearance(SPRITE_PRESETS[key].appearance);
        const nameField = document.getElementById("char-name");
        if (nameField && !nameField.value.trim()) nameField.value = SPRITE_PRESETS[key].label.toUpperCase();
    }
    refreshBuilderPreview();
}

function stopBuilderPreview() {
    if (builderPreviewTimer) {
        clearInterval(builderPreviewTimer);
        builderPreviewTimer = null;
    }
}

function refreshBuilderPreview() {
    const canvas = document.getElementById("build-preview-canvas");
    if (!canvas || !canvas.getContext) return;
    const bctx = canvas.getContext("2d");
    const poseSel = document.getElementById("build-pose");
    const state = poseSel ? poseSel.value : "idle";
    const appearance = getBuilderAppearanceFromForm();
    const frames = getProceduralFrameUrls(appearance, state, { ssj: state === "transform" && builderPreviewFrame >= 2 });
    const url = frames[builderPreviewFrame % frames.length];

    stopBuilderPreview();
    builderPreviewFrame = 0;
    const draw = () => {
        const img = new Image();
        img.onload = () => {
            bctx.clearRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min((canvas.width * 0.92) / img.naturalWidth, (canvas.height * 0.92) / img.naturalHeight);
            const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
            bctx.imageSmoothingEnabled = true;
            bctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        };
        const list = getProceduralFrameUrls(appearance, state, { ssj: state === "transform" });
        img.src = list[builderPreviewFrame % list.length];
        builderPreviewFrame++;
    };
    draw();
    builderPreviewTimer = setInterval(draw, 130);
}

// Gera as animações de todos os movimentos e as coloca no personagem em edição — o mesmo lugar que a aba
// ANIMAÇÕES preencheria à mão. Depois disso, SALVAR PERSONAGEM funciona exatamente como com uma sprite sheet.
function applyBuilderToCharacter() {
    const appearance = getBuilderAppearanceFromForm();
    const { animations, fpsSettings } = buildProceduralAnimations(appearance);
    SUB_ANIM_KEYS.forEach(state => {
        tempAnimations[state] = animations[state];
        tempFps[state] = fpsSettings[state];
    });
    builderLastAppearance = appearance;
    savedSpriteMotionPreviewFrames = {};
    spriteMotionPreviewImageCache = {};
    activeSpriteMovement = "idle";
    spriteMotionPreviewFrame = 0;

    const status = document.getElementById("build-status");
    if (status) status.textContent = "Personagem gerado! Clique em SALVAR PERSONAGEM para guardar (ou ajuste a aparência e clique de novo).";
    updateModalPreview();
    renderSpriteAssignedFrames();
    renderSpriteMotionPreview();
}
