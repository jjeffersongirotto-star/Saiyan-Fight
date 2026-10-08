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
// O canvas de verdade tem mais pixels que 800x350 (renderScale, até 2x — nítido em telas grandes e na TV),
// mas o jogo inteiro continua pensando em 800x350: `canvas.width/height` sempre devolvem a resolução lógica e
// o contexto já vem escalado (ver applyRenderTransform). `canvasEl` é o elemento real.
const canvasEl = document.getElementById("game");
const canvas = new Proxy(canvasEl, {
    get(alvo, nome) {
        if (nome === "width") return GAME_WIDTH;
        if (nome === "height") return GAME_HEIGHT;
        const v = Reflect.get(alvo, nome);
        return typeof v === "function" ? v.bind(alvo) : v;
    },
    set(alvo, nome, valor) {
        if (nome === "width" || nome === "height") return true;   // a resolução real é controlada por setRenderScale
        alvo[nome] = valor;
        return true;
    }
});
const ctx = canvasEl.getContext("2d");
instalarTraducaoNoCanvas(ctx);   // textos do canvas no idioma escolhido (idiomas.js)
let renderScale = 1;   // pixels reais por pixel do jogo
const RENDER_SCALE_MAX = 2;
let renderScaleTeto = RENDER_SCALE_MAX;   // baixa sozinho se o aparelho não aguentar 60 FPS (vigiarDesempenho, menu.js)
function applyRenderTransform() {
    if (ctx.setTransform) ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.imageSmoothingEnabled = false;
}
function setRenderScale(escala) {
    escala = Math.max(1, Math.min(RENDER_SCALE_MAX, renderScaleTeto, escala));
    const w = Math.round(GAME_WIDTH * escala), h = Math.round(GAME_HEIGHT * escala);
    if (canvasEl.width !== w) canvasEl.width = w;
    if (canvasEl.height !== h) canvasEl.height = h;
    renderScale = escala;
    // com mais pixels de verdade, o navegador estica a imagem de forma suave (esticar "em blocos" dobrava umas
    // linhas e outras não, deixando letras amassadas); só a resolução 1x mantém o visual de pixel puro
    if (canvasEl.style) canvasEl.style.imageRendering = escala > 1 ? "auto" : "pixelated";
    applyRenderTransform();
}
const fileInput = document.getElementById("file-input");
const modal = document.getElementById("modal-editor");
const updatesModal = document.getElementById("modal-updates");
const sysAlertModal = document.getElementById("modal-alert");
const prevCanvas = document.getElementById("preview-canvas");
const prevCtx = prevCanvas ? prevCanvas.getContext("2d") : null;

const SUB_ANIM_KEYS = ["idle", "flyRight", "flyLeft", "flyDown", "flyUp", "flyUpRight", "flyUpLeft", "flyDownRight", "flyDownLeft", "parry", "attackKi", "chargeKi", "transform", "special"];

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
    else if (typeof arenaEditorAberto === "function" && arenaEditorAberto() && !(sysAlertModal && sysAlertModal.style.display === "flex")) fecharEditorArenas();
    else if (updatesModal && updatesModal.style.display === "flex") closeUpdatesModal();
    else if (sysAlertModal && sysAlertModal.style.display === "flex") closeSystemAlert();
});

let touchHudLayout = getDefaultTouchHudLayout(window.innerWidth);

ctx.imageSmoothingEnabled = false;
if (prevCtx) prevCtx.imageSmoothingEnabled = false;

function fitCanvasToViewport() {
    updateAutoLandscape();
    const canvasContainer = canvas.parentElement;
    const isForcedLandscape = Boolean(canvasContainer && canvasContainer.classList && canvasContainer.classList.contains("forced-landscape"));
    const containerWidth = canvasContainer ? canvasContainer.clientWidth : window.innerWidth;
    const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement ||
        (canvasContainer && canvasContainer.classList && canvasContainer.classList.contains("is-fullscreen")) || isForcedLandscape);
    // Girado por CSS: o que visualmente vira "largura" disponível pro jogo é a ALTURA física da tela (e
    // vice-versa) — é exatamente isso que a rotação troca. Sem essa troca aqui, o canvas calculava o tamanho
    // como se ainda estivesse em pé e ficava pequeno demais, ou saía da área rotacionada.
    // Área realmente visível: no app (atalho na tela inicial) o innerWidth/innerHeight pode incluir a faixa das
    // barras do sistema e o jogo ficava descentralizado (mais abaixo/à direita e cortado embaixo). O visualViewport
    // diz o tamanho que aparece de fato; a altura também vai para o CSS (--altura-visivel), que centraliza o jogo.
    const vv = window.visualViewport;
    const janelaW = vv && vv.width > 0 ? Math.min(window.innerWidth, vv.width) : window.innerWidth;
    const janelaH = vv && vv.height > 0 ? Math.min(window.innerHeight, vv.height) : window.innerHeight;
    if (document.documentElement && document.documentElement.style && document.documentElement.style.setProperty) {
        document.documentElement.style.setProperty("--altura-visivel", `${Math.round(janelaH)}px`);
    }
    const viewportWidth = isForcedLandscape ? Math.max(1, window.innerHeight)
        : Math.max(1, Math.min(janelaW, containerWidth || janelaW));
    // Fora da tela cheia desconta só o espaçamento (padding) de cima e de baixo da página — 12px cada no PC,
    // 8px no celular (ver o CSS do body) —, senão a página passa da altura da janela e aparece rolagem.
    const bodyStyle = typeof getComputedStyle === "function" && document.body ? getComputedStyle(document.body) : null;
    const pagePaddingY = bodyStyle ? (parseFloat(bodyStyle.paddingTop) || 0) + (parseFloat(bodyStyle.paddingBottom) || 0) : 24;
    const viewportHeight = isForcedLandscape ? Math.max(1, window.innerWidth)
        : Math.max(1, isFullscreen ? janelaH : janelaH - pagePaddingY);

    // A resolução lógica do canvas fica SEMPRE fixa em GAME_WIDTH x GAME_HEIGHT
    // (ver AGENTS.md). Existia aqui um "modo adaptativo" que trocava o canvas.width/
    // canvas.height para o tamanho físico da tela em fullscreen mobile, mas nada no
    // pipeline de desenho reescalava os draws para esse novo tamanho — o jogo
    // continuava desenhando em coordenadas 800x350 num canvas muito maior, deixando
    // quase toda a tela preta. Removido: a escala fica só no CSS, como no resto do jogo.
    const viewportScale = Math.min(viewportWidth / GAME_WIDTH, viewportHeight / GAME_HEIGHT);
    const maxDesktopScale = viewportWidth > 540 && !isFullscreen ? 1.6 : Infinity;
    const scale = Math.min(viewportScale, maxDesktopScale);
    // resolução real: acompanha o tamanho na tela (em passos de 0,5 para não refazer tudo a cada ajuste), até 2x
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    setRenderScale(Math.ceil(scale * dpr * 2) / 2);

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

// Celular em pé: o jogo já aparece deitado sozinho, girado 90° por CSS (sem aviso nem botão — girar a tela de
// verdade exigiria pedir tela cheia ao navegador, que mostra o aviso do Chrome). Com o celular deitado de verdade,
// ou no computador, fica sem rotação (senão as duas se somariam e o jogo apareceria de lado).
function updateAutoLandscape() {
    const container = document.getElementById("game-container");
    if (!container || !container.classList) return;
    const portraitPhone = isMobileDevice() && window.innerHeight > window.innerWidth;
    container.classList.toggle("forced-landscape", portraitPhone);
}

function isForcedLandscapeActive() {
    const container = document.getElementById("game-container");
    return Boolean(container && container.classList && container.classList.contains("forced-landscape"));
}

// Converte um toque/clique (clientX/Y da tela) para coordenadas dentro do elemento (em unidades unitsW x unitsH),
// levando em conta o jogo girado 90° no sentido horário por CSS: aí a largura do jogo corre de cima para baixo
// na tela e a altura corre da direita para a esquerda.
function getElementPointFromClient(el, clientX, clientY, unitsW, unitsH) {
    const r = el.getBoundingClientRect();
    if (isForcedLandscapeActive() && el.closest && el.closest("#game-container")) {
        const right = r.left + r.width;
        return { x: (clientY - r.top) / r.height * unitsW, y: (right - clientX) / r.width * unitsH };
    }
    return { x: (clientX - r.left) / r.width * unitsW, y: (clientY - r.top) / r.height * unitsH };
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
// Voltando de outra janela (seletor de TV, configurações rápidas, outro app) o tamanho da tela pode ter mudado
// sem um "resize" confiável: recalcula ao voltar o foco/visibilidade e ao entrar/sair da tela cheia.
const refazerEncaixeDaTela = () => { fitCanvasToViewport(); setTimeout(fitCanvasToViewport, 250); setTimeout(fitCanvasToViewport, 800); };
window.addEventListener("focus", refazerEncaixeDaTela);
window.addEventListener("pageshow", refazerEncaixeDaTela);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refazerEncaixeDaTela(); });
document.addEventListener("fullscreenchange", refazerEncaixeDaTela);
window.addEventListener("orientationchange", fitCanvasToViewport);
if (window.visualViewport && window.visualViewport.addEventListener) window.visualViewport.addEventListener("resize", fitCanvasToViewport);

if (typeof ResizeObserver === "function" && canvas.parentElement) {
    new ResizeObserver(fitCanvasToViewport).observe(canvas.parentElement);
}

// ==================== ESTADO DO JOGO ====================
let gameState = "menu";
let activeControlProfile = "p1";
let selectedCharacter = "goku_adult";
let selectedBoss = "vegeta";
let editingKey = null;
// aba TRANSFORMAÇÃO do editor (ver "ABA TRANSFORMAÇÃO" mais abaixo)
let tempTransformations = [];
let editingTransformIndex = null;   // índice da transformação aberta no construtor (null = editando o personagem normal)
let transformEditStash = null;
let transformEditMexido = false;   // builderMexido de antes de abrir a transformação      // como estava o construtor (personagem normal) antes de abrir a transformação
let currentTab = "HERÓIS";
// Tela de personagens: null = PERSONAGENS do menu (só ver); "solo" = SELEÇÃO DE PERSONAGEM antes da luta;
// "p1"/"p2" = VERSUS, primeiro o JOGADOR 1 escolhe e depois o JOGADOR 2
let selecaoLuta = null;
let tempBase64 = null;
let tempAnimations = {};
let tempFps = {};
let tempLoop = {};   // cadeado de cada movimento da forma em montagem: quadro onde a repetição recomeça
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
let quadroArraste = null;   // segurar e arrastar um quadro da fileira para mudar a posição dele
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
    parry: 11, attackKi: 13, chargeKi: 10, transform: 11, special: 10
};

// Regenera as animações completas de um personagem procedural a partir da aparência salva.
// Um personagem do construtor guarda ~54 quadros de SVG por animação (centenas de KB a >1MB); persistir tudo
// isso no localStorage estoura a cota do navegador (4-5 personagens já passam de 5-10MB). Por isso só a
// aparência (poucas centenas de bytes) é salva, e as animações são recriadas aqui, na hora de carregar.
// Os quadros de cada movimento só são gerados na primeira vez que alguém os lê (abrir o jogo gerava os ~800
// quadros de todos os personagens de uma vez e demorava segundos no celular).
function buildProceduralAnimations(appearance) {
    const animations = {}, fpsSettings = {};
    SUB_ANIM_KEYS.forEach(state => {
        const fixa = (v) => Object.defineProperty(animations, state, { value: v, enumerable: true, configurable: true, writable: true });
        Object.defineProperty(animations, state, {
            enumerable: true, configurable: true,
            get() { const v = getProceduralFrameUrls(appearance, state); fixa(v); return v; },
            set(v) { fixa(v); }
        });
        fpsSettings[state] = PROCEDURAL_ANIM_FPS[state] || 12;
    });
    return { animations, fpsSettings };
}
let padSensitivity = PAD_SENSITIVITY_DEFAULT;   // analógico: 1 (pouca) a 5 (muita), em Opções > Controle Joystick
let padBindings = normalizePadBindings(null); // botões do controle (padrão PS5) — remapeáveis em Opções > Controle PS5
let touchAutoFire = true;          // atira sem parar enquanto o dedo estiver no analógico/tela
let autofireHintSeen = false;      // dica "apoie o dedo para atirar" já foi mostrada?
let isTouchDevice = false; // declarada aqui (antes de initSettings) para não virar variável global implícita

// Detecção do tipo de aparelho. NÃO usa mais a largura da janela nem "ontouchstart"/maxTouchPoints
// (davam "celular" em PC com janela estreita, painel de pré-visualização ou notebook com tela touch).
// Regra: se existe mouse/trackpad => PC; senão, se o ponteiro principal é o dedo (ou o navegador é mobile) => touch.
// Aberto pelo ícone da tela inicial (como aplicativo): o jogo já ocupa a tela toda, sem a barra do navegador.
// Aí não se pede a tela cheia ao navegador — é esse pedido que faz o Chrome mostrar, por alguns segundos, o
// aviso "Para sair da tela cheia, arraste..." (que nenhum site consegue esconder).
function isInstalledApp() {
    const mq = (q) => Boolean(window.matchMedia && window.matchMedia(q).matches);
    return mq("(display-mode: fullscreen)") || mq("(display-mode: standalone)") || (navigator && navigator.standalone === true);
}

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
    isTouchDevice = mode === "touch";   // "joystick": o controle é a entrada principal (sem botões de toque)
    manualControlMode = mode;
    return mode;
}

// Padrão do PC (o do jogador): J1 nas setas com ataque no mouse; J2 no teclado numérico. Mudou o padrão? Suba
// KEY_BINDINGS_VERSION: quem tinha teclas salvas de uma versão antiga recebe o padrão novo uma vez.
const KEY_BINDINGS_VERSION = 2;
const DEFAULT_KEY_BINDINGS = {
    p1: {
        up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
        attack: "MouseLeft", charge: "KeyS", transform: "KeyA", parry: "Space", special: "KeyQ"
    },
    p2: {
        up: "Numpad5", down: "Numpad2", left: "Numpad1", right: "Numpad3",
        attack: "Enter", charge: "NumpadEnter", transform: "Numpad9", parry: "Numpad0", special: "Numpad7"
    }
};
let keyBindings = { p1: Object.assign({}, DEFAULT_KEY_BINDINGS.p1), p2: Object.assign({}, DEFAULT_KEY_BINDINGS.p2) };

let touchControlMode = "analog";
let mobileDoubleTapParry = true;

let hudEditorSelectedBtn = null;
let hudEditorDragging = false;
let hudDragOffsetX = 0, hudDragOffsetY = 0;
let remappingKey = null;

// No app instalado o tamanho da tela só fica certo um instante depois de abrir: refaz o encaixe logo no início.
refazerEncaixeDaTela();

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
        if (readStorage("saiyan_pad_bindings_v") !== String(PAD_BINDINGS_VERSION)) {
            // padrão do controle mudou: todos passam para o novo PADRÃO PS5 uma vez
            padBindings = normalizePadBindings(null);
            writeStorage("saiyan_pad_bindings", JSON.stringify(padBindings));
            writeStorage("saiyan_pad_bindings_v", String(PAD_BINDINGS_VERSION));
        }
        const sens = Number(readStorage("saiyan_pad_sens"));
        if (sens >= PAD_SENSITIVITY_MIN && sens <= PAD_SENSITIVITY_MAX) padSensitivity = Math.round(sens);
        autofireHintSeen = readStorage("saiyan_hint_autofire") === "1";
        applyEffectiveControlMode();

        if (readStorage("saiyan_controls_v") !== String(KEY_BINDINGS_VERSION)) {
            // padrão novo das teclas para todos, uma vez (modo teclado: as setas movem e o mouse esquerdo ataca)
            writeStorage("saiyan_controls", "");
            writeStorage("saiyan_pc_mode", "");
            pcInputMode = "keyboard";
            writeStorage("saiyan_controls_v", String(KEY_BINDINGS_VERSION));
        }
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
        checkStageModeAchievements();
        checkAllAchievementsComplete();
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
        writeStorage("saiyan_pad_sens", String(padSensitivity));
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
    if (newState === "stage_map" && gameState !== "stage_map" && typeof mapaRolagem !== "undefined") mapaRolagem = null;   // reabre centralizado na fase atual
    if (newState === "menu" && typeof arenaPainel !== "undefined") arenaPainel = null;   // quadro de arena não fica aberto ao voltar
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

// Pergunta com um campo de texto (ex.: APELIDO). OK grava (callback(texto)); CANCELAR fecha sem mudar nada.
function showSystemPrompt(title, message, valor, callback, maximo = 16) {
    const alertTitle = document.getElementById("modal-alert-title");
    const alertMsg = document.getElementById("modal-alert-msg");
    const alertBtns = document.getElementById("modal-alert-btns");
    if (alertTitle) alertTitle.innerText = title.toUpperCase();
    if (alertMsg) {
        alertMsg.innerText = message;
        const campo = document.createElement("input");
        campo.type = "text";
        campo.id = "modal-alert-campo";
        campo.maxLength = maximo;
        campo.value = valor || "";
        campo.style.cssText = "display:block; width:90%; margin:10px auto 0; padding:8px; font-size:16px; background:#0b1226; color:#fff0a6; border:1px solid var(--cyan); border-radius:4px;";
        campo.onkeydown = (e) => { if (e.key === "Enter") executeSystemConfirm(true); };
        alertMsg.appendChild(campo);
    }
    onConfirmCallback = () => {
        const campo = document.getElementById("modal-alert-campo");
        callback(campo ? campo.value : "");
    };
    if (alertBtns) {
        alertBtns.innerHTML = `
            <button class="btn" onclick="executeSystemConfirm(true)">SALVAR</button>
            <button class="btn" style="border-color:#ff0055; color:#ff0055;" onclick="executeSystemConfirm(false)">CANCELAR</button>
        `;
    }
    if (sysAlertModal) sysAlertModal.style.display = "flex";
    focusModal(sysAlertModal);
    const campo = document.getElementById("modal-alert-campo");
    if (campo && campo.focus) setTimeout(() => { try { campo.focus(); } catch (e) {} }, 30);
}

// Pergunta com vários botões (ex.: ANTI-HERÓI / VILÃO / CANCELAR). opcoes: [{ label, acao, cancelar }]
let systemChoiceOptions = null;
function showSystemChoice(title, message, opcoes) {
    systemChoiceOptions = opcoes;
    onConfirmCallback = null;
    const alertTitle = document.getElementById("modal-alert-title");
    const alertMsg = document.getElementById("modal-alert-msg");
    const alertBtns = document.getElementById("modal-alert-btns");
    if (alertTitle) alertTitle.innerText = title.toUpperCase();
    if (alertMsg) alertMsg.innerText = message;
    if (alertBtns) {
        alertBtns.innerHTML = opcoes.map((o, i) => o.cancelar
            ? `<button class="btn" style="border-color:#ff0055; color:#ff0055;" onclick="executeSystemChoice(${i})">${o.label}</button>`
            : `<button class="btn" onclick="executeSystemChoice(${i})">${o.label}</button>`).join("");
    }
    if (sysAlertModal) sysAlertModal.style.display = "flex";
    focusModal(sysAlertModal);
}

function executeSystemChoice(i) {
    const o = systemChoiceOptions && systemChoiceOptions[i];
    systemChoiceOptions = null;
    if (sysAlertModal) sysAlertModal.style.display = "none";
    restoreFocusAfterModal();
    if (o && typeof o.acao === "function") o.acao();
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

// Imagem reserva (usada quando um personagem ainda não tem quadros ou a imagem dele não carrega).
function getFallbackSpriteSvg() {
    return generateSpriteFrameUrl(SPRITE_DEFAULT_APPEARANCE, "idle", 0);
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
const EDITOR_TAB_ORDER = ["basico", "animacoes", "construtor", "transformacao"];
let currentEditorTab = "basico";

function switchEditorTab(tabName) {
    if (tabName === 'aparencia') {
        tabName = 'basico';
    }

    // saiu do construtor no meio da edição de uma transformação: guarda o que foi feito nela
    if (editingTransformIndex !== null && tabName !== "construtor") finishTransformationEdit(tabName);
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');

    const selectedBtn = document.getElementById(`tab-btn-${tabName}`);
    const selectedContent = document.getElementById(`tab-content-${tabName}`);
    if (selectedBtn) selectedBtn.classList.add('active');
    if (selectedContent) selectedContent.style.display = 'block';
    currentEditorTab = tabName;
    if (tabName === "construtor") refreshBuilderPreview();
    if (tabName === "transformacao") renderTransformationList();
    const conjArea = document.getElementById("conj-area");
    if (conjArea) conjArea.style.display = tabName === "animacoes" ? "" : "none";
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
    const point = getElementPointFromClient(map, event.clientX, event.clientY, map.width, map.height);
    return { grid, x: point.x, y: point.y };
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
    if (!conjExigirEdicao()) return;
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

// DUPLICAR: os quadros vão para o FIM do movimento de destino (os que já estavam lá ficam)
function saveMovementCopy(targetMovement, frames) {
    const existentes = (savedSpriteMotionPreviewFrames[targetMovement] || tempAnimations[targetMovement] || []).filter(Boolean);
    const juntos = existentes.concat(frames).slice(0, 30);
    tempAnimations[targetMovement] = juntos;
    savedSpriteMotionPreviewFrames[targetMovement] = Array.from(juntos);
    if (!existentes.length) tempFps[targetMovement] = tempFps[activeSpriteMovement] || 12;
}

// Cadeado depois de mexer na ordem dos quadros: origem[novo índice] = índice antigo (-1 = quadro novo)
function travaRemapear(movimento, origem) {
    const atual = tempLoop[movimento];
    if (!Number.isInteger(atual)) return;
    const novo = origem.indexOf(atual);
    if (novo > 0) tempLoop[movimento] = novo; else delete tempLoop[movimento];
}

function alternarTravaQuadro(index) {
    if (!conjExigirEdicao()) return;
    if (tempLoop[activeSpriteMovement] === index || index <= 0) {
        delete tempLoop[activeSpriteMovement];
        if (index === 0) showSystemAlert("CADEADO", "NO 1º QUADRO O CADEADO NÃO MUDA NADA: A ANIMAÇÃO JÁ RECOMEÇA DELE.");
    } else {
        tempLoop[activeSpriteMovement] = index;
    }
    renderSpriteAssignedFrames();
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
    if (!conjExigirEdicao()) return;
    if (spriteMotionPreviewPlaying) {
        return showSystemAlert("PAUSE A PRÉVIA", "PAUSE A PRÉVIA ANTES DE CLONAR UM FRAME.");
    }
    const frames = getSpriteMotionPreviewFrames();
    if (!frames.length) return showSystemAlert("PRÉVIA VAZIA", "NÃO HÁ FRAMES PARA CLONAR.");
    if (frames.length >= 30) return showSystemAlert("LIMITE DE FRAMES", "O MOVIMENTO JÁ POSSUI O LIMITE DE 30 FRAMES.");

    // a cópia vai para o fim da fila
    const selectedIndices = getSelectedPreviewFrameIndices(frames.length);
    const updatedFrames = Array.from(frames).concat(selectedIndices.map(index => frames[index])).slice(0, 30);
    tempAnimations[activeSpriteMovement] = updatedFrames;
    savedSpriteMotionPreviewFrames[activeSpriteMovement] = Array.from(updatedFrames);
    selectedPreviewFrameIndices.clear();
    spriteMotionPreviewFrame = Math.min(updatedFrames.length - 1, frames.length);
    updatePreviewFrameCount(updatedFrames.length);
    renderSpriteAssignedFrames();
    renderSpriteMotionPreview();
}

function deleteSelectedPreviewFrame() {
    if (!conjExigirEdicao()) return;
    if (spriteMotionPreviewPlaying) {
        return showSystemAlert("PAUSE A PRÉVIA", "PAUSE A PRÉVIA ANTES DE APAGAR UM FRAME.");
    }
    const frames = getSpriteMotionPreviewFrames();
    if (!frames.length) return showSystemAlert("PRÉVIA VAZIA", "NÃO HÁ FRAMES PARA APAGAR.");
    const selectedIndices = getSelectedPreviewFrameIndices(frames.length);
    const selectedSet = new Set(selectedIndices);
    showSystemConfirm("APAGAR FRAME", `DESEJA APAGAR ${selectedIndices.length} FRAME(S) SELECIONADO(S)?`, () => {
        const updatedFrames = frames.filter((frame, index) => !selectedSet.has(index));
        travaRemapear(activeSpriteMovement, frames.map((frame, index) => index).filter(index => !selectedSet.has(index)));
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
    if (!conjExigirEdicao()) return;
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
    if (!conjExigirEdicao()) return;
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
        transform: "TRANSFORMAR",
        special: "ESPECIAL"
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

    if (!conjEstaEditando()) conjNovaForma(true);   // adicionar quadros já começa uma forma nova (o ORIGINAL não muda)
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
    if (!conjExigirEdicao()) return;
    const frames = getSpriteMotionPreviewFrames();
    if (!frames.length) return;
    showSystemConfirm("LIMPAR MOVIMENTO", `APAGAR TODOS OS ${frames.length} QUADRO(S) DO MOVIMENTO ${getSpriteMovementDisplayName(activeSpriteMovement)}?`, () => {
        tempAnimations[activeSpriteMovement] = [];
        delete savedSpriteMotionPreviewFrames[activeSpriteMovement];
        delete tempLoop[activeSpriteMovement];
        renderSpriteAssignedFrames();
        renderSpriteMotionPreview();
    }, "SIM", "NÃO");
}

function renderSpriteAssignedFrames() {
    const container = document.getElementById("sprite-assigned-frames");
    if (!container) return;
    container.innerHTML = "";
    if (!conjEstaEditando()) {
        // fora da montagem de uma forma a fileira fica vazia (os quadros do ORIGINAL não são mexidos aqui)
        const empty = document.createElement("span");
        empty.className = "sprite-assigned-empty";
        empty.innerText = "Toque em + NOVA FORMA (ou EDITAR numa forma) para montar os quadros. Adicionar um quadro já começa uma forma nova.";
        container.appendChild(empty);
        return;
    }
    const frames = savedSpriteMotionPreviewFrames[activeSpriteMovement]
        || (tempAnimations[activeSpriteMovement] || []);
    if (frames.length === 0) {
        const empty = document.createElement("span");
        empty.className = "sprite-assigned-empty";
        empty.innerText = "Nenhum quadro atribuído ao movimento.";
        container.appendChild(empty);
        return;
    }
    const nenhumSelecionado = selectedPreviewFrameIndices.size === 0;
    frames.forEach((src, index) => {
        const frameBox = document.createElement("div");
        frameBox.className = "sprite-assigned-frame";
        frameBox.dataset.frameIndex = String(index);
        // um contorno só: o do quadro selecionado (sem seleção, o quadro da prévia)
        frameBox.classList.toggle("preview-selected", selectedPreviewFrameIndices.has(index) ||
            (nenhumSelecionado && !spriteMotionPreviewPlaying && index === spriteMotionPreviewFrame));
        frameBox.addEventListener("pointerdown", event => {
            if (spriteMotionPreviewPlaying) return;
            if (event.pointerType === "mouse") event.preventDefault();
            previewSelectionPointerDown = true;
            previewSelectionWasDragged = false;
            if (!event.shiftKey) selectedPreviewFrameIndices.clear();
            selectedPreviewFrameIndices.add(index);
            spriteMotionPreviewFrame = index;
            container.querySelectorAll && container.querySelectorAll(".sprite-assigned-frame").forEach(el => el.classList.remove("preview-selected"));
            frameBox.classList.add("preview-selected");
            renderSpriteMotionPreview();
            if (!event.shiftKey) quadroArrasteComecar(index, event, frameBox);
        });

        frameBox.addEventListener("contextmenu", event => event.preventDefault());   // segurar no celular não abre o menu da imagem

        const number = document.createElement("span");
        number.className = "sprite-assigned-frame-number";
        number.innerText = String(index + 1);

        // cadeado: a animação recomeça neste quadro depois da 1ª volta
        const travado = tempLoop[activeSpriteMovement] === index && index > 0;
        const trava = document.createElement("button");
        trava.type = "button";
        trava.className = "sprite-trava" + (travado ? " ligada" : "");
        trava.title = travado ? "Repetição recomeça neste quadro (toque para tirar)" : "Travar: depois da 1ª volta, a animação recomeça neste quadro";
        trava.setAttribute("aria-label", trava.title);
        trava.setAttribute("aria-pressed", String(travado));
        trava.innerHTML = travado
            ? '<svg viewBox="0 0 12 14" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="1.5" y="6" width="9" height="7" rx="1.2" fill="currentColor"/></svg>'
            : '<svg viewBox="0 0 12 14" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="1.5" y="6" width="9" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
        trava.addEventListener("pointerdown", event => event.stopPropagation());
        trava.addEventListener("click", event => { event.stopPropagation(); alternarTravaQuadro(index); });

        const image = document.createElement("img");
        image.src = src;
        image.title = `F${index + 1}`;
        image.draggable = false;
        image.dataset.previewFrame = String(index);
        image.style.cursor = spriteMotionPreviewPlaying ? "default" : "pointer";
        image.addEventListener("click", () => {
            if (spriteMotionPreviewPlaying || previewSelectionWasDragged) { previewSelectionWasDragged = false; return; }
            spriteMotionPreviewFrame = index;
            renderSpriteAssignedFrames();
            renderSpriteMotionPreview();
        });
        frameBox.appendChild(image);
        frameBox.appendChild(number);
        frameBox.appendChild(trava);
        container.appendChild(frameBox);
    });
}

// Segurar um quadro e arrastar: o quadro vai para onde o dedo/mouse soltar. No mouse começa ao mover; no toque,
// depois de segurar um instante (antes disso, arrastar rola a fileira como sempre).
function quadroArrasteComecar(index, event, frameBox) {
    if (!conjEstaEditando()) return;
    quadroArrasteParar();
    const toque = event.pointerType !== "mouse";
    quadroArraste = { origem: index, alvo: null, ativo: false, toque, x: event.clientX, y: event.clientY, box: frameBox, timer: null };
    if (toque) quadroArraste.timer = setTimeout(() => quadroArrasteAtivar(), 260);
}

function quadroArrasteAtivar() {
    if (!quadroArraste || quadroArraste.ativo) return;
    quadroArraste.ativo = true;
    previewSelectionWasDragged = true;
    if (quadroArraste.box) quadroArraste.box.classList.add("arrastando");
}

function quadroArrasteMover(x, y) {
    const q = quadroArraste;
    if (!q) return;
    if (!q.ativo) {
        const longe = Math.hypot(x - q.x, y - q.y);
        if (q.toque) { if (longe > 10) quadroArrasteParar(); return; }   // mexeu antes de segurar: é rolagem
        if (longe < 5) return;
        quadroArrasteAtivar();
    }
    const el = typeof document.elementFromPoint === "function" ? document.elementFromPoint(x, y) : null;
    const box = el && el.closest ? el.closest(".sprite-assigned-frame") : null;
    const alvo = box && box.dataset ? Number.parseInt(box.dataset.frameIndex, 10) : NaN;
    document.querySelectorAll(".sprite-assigned-frame.drag-over").forEach(b => { if (b !== box) b.classList.remove("drag-over"); });
    if (Number.isInteger(alvo)) {
        q.alvo = alvo;
        if (alvo !== q.origem) box.classList.add("drag-over");
    }
}

function quadroArrasteSoltar() {
    const q = quadroArraste;
    quadroArrasteParar();
    previewSelectionPointerDown = false;
    if (!q || !q.ativo || !Number.isInteger(q.alvo) || q.alvo === q.origem) return;
    selectedPreviewFrameIndices.clear();
    selectedPreviewFrameIndices.add(q.alvo);
    reorderSelectedPreviewFrame(q.origem, q.alvo);
}

function quadroArrasteParar() {
    if (!quadroArraste) return;
    clearTimeout(quadroArraste.timer);
    if (quadroArraste.box) quadroArraste.box.classList.remove("arrastando");
    document.querySelectorAll(".sprite-assigned-frame.drag-over").forEach(b => b.classList.remove("drag-over"));
    quadroArraste = null;
}

document.addEventListener("pointermove", event => { if (quadroArraste) quadroArrasteMover(event.clientX, event.clientY); });
document.addEventListener("pointerup", () => { if (quadroArraste) quadroArrasteSoltar(); else previewSelectionPointerDown = false; });
document.addEventListener("pointercancel", () => quadroArrasteParar());
// arrastando um quadro no toque, a fileira não rola
document.addEventListener("touchmove", event => { if (quadroArraste && quadroArraste.ativo) event.preventDefault(); }, { passive: false });

function getSelectedPreviewFrameIndices(frameCount) {
    const valid = Array.from(selectedPreviewFrameIndices)
        .filter(index => index >= 0 && index < frameCount)
        .sort((first, second) => first - second);
    if (valid.length) return valid;
    if (frameCount > 0) return [spriteMotionPreviewFrame % frameCount];
    return [];
}

function reorderSelectedPreviewFrame(sourceIndex, targetIndex) {
    if (!conjEstaEditando()) return;
    const frames = getSpriteMotionPreviewFrames();
    if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex) || sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0 || sourceIndex >= frames.length || targetIndex >= frames.length) return;
    const updatedFrames = Array.from(frames);
    const [movedFrame] = updatedFrames.splice(sourceIndex, 1);
    updatedFrames.splice(targetIndex, 0, movedFrame);
    const origem = frames.map((frame, index) => index);
    origem.splice(targetIndex, 0, origem.splice(sourceIndex, 1)[0]);
    travaRemapear(activeSpriteMovement, origem);
    tempAnimations[activeSpriteMovement] = updatedFrames;
    savedSpriteMotionPreviewFrames[activeSpriteMovement] = Array.from(updatedFrames);
    spriteMotionPreviewFrame = targetIndex;
    renderSpriteAssignedFrames();
    renderSpriteMotionPreview();
}

function getSpriteMotionPreviewFrames() {
    const doConjunto = conjPreviaAtiva(activeSpriteMovement);
    if (doConjunto) return doConjunto;
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
        // com cadeado, depois do último quadro volta para o quadro travado
        const trava = tempLoop[activeSpriteMovement];
        spriteMotionPreviewFrame = spriteMotionPreviewFrame + 1 < frames.length ? spriteMotionPreviewFrame + 1
            : (conjEstaEditando() && trava > 0 && trava < frames.length ? trava : 0);
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

let modalPreviewPedido = 0;
function updateModalPreview() {
    if (!prevCtx || !prevCanvas) return;
    prevCtx.clearRect(0, 0, prevCanvas.width, prevCanvas.height);

    const currentCharacter = editingKey && characterDB[editingKey] ? characterDB[editingKey] : null;
    const idleFrames = conjPreviaAtiva("idle") || tempAnimations.idle || [];   // conjunto azul em uso: a prévia mostra ele
    const baseCharacterSource = idleFrames[0] || tempBase64 || (currentCharacter && currentCharacter.defaultUrl) || null;
    const pedido = ++modalPreviewPedido;   // só a imagem do último pedido é desenhada (trocar de conjunto rápido)

    if (baseCharacterSource) {
        loadImageSecure(baseCharacterSource, (img) => {
            if (img && pedido === modalPreviewPedido) renderImageToPreview(img);
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
        // desenho do jogo/construtor (SVG): redesenha o vetor no tamanho grande (nítido, sem pixels esticados)
        const vetor = img.__svgImage && img.__svgImage.complete && img.__svgImage.naturalWidth ? img.__svgImage : null;
        prevCtx.imageSmoothingEnabled = !!vetor;
        prevCtx.drawImage(
            vetor || img,
            0, 0,
            (vetor || img).naturalWidth, (vetor || img).naturalHeight,
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
    quadroArraste = null;
    tempLoop = {};
    loadedUrlImageObj = null;
    loadedFileImageObj = null;
    tempAnimations = {
        idle: [],
        flyUp: [], flyDown: [], flyRight: [], flyLeft: [],
        flyUpRight: [], flyUpLeft: [], flyDownRight: [], flyDownLeft: [],
        parry: [], attackKi: [], chargeKi: [], transform: [], special: []
    };

    tempFps = {
        idle: 12, flyUp: 12, flyDown: 12, flyRight: 12, flyLeft: 12,
        flyUpRight: 12, flyUpLeft: 12, flyDownRight: 12, flyDownLeft: 12,
        parry: 12, attackKi: 12, chargeKi: 12, transform: 12, special: 10
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
        const animKeys = ["flyUp", "flyDown", "flyRight", "flyLeft", "flyUpRight", "flyUpLeft", "flyDownRight", "flyDownLeft", "parry", "attackKi", "chargeKi", "transform", "special"];
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
    // ALTURA (cm): a salva, a do personagem inicial (ALTURAS_PADRAO) ou a da escala antiga
    if (charScale) charScale.value = key && characterDB[key] ? getAlturaPersonagem(key, 0) : ALTURA_PADRAO_CM;
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
    builderMexido = false;
    tempMinionClassico = key && char.minionClassico ? normalizarMinionClassico(char.minionClassico) : null;
    atualizarPainelMinionClassico();
    // cópia das transformações: o editor só grava no personagem ao SALVAR
    tempTransformations = JSON.parse(JSON.stringify(key ? getCharacterTransformations(key) : [SPRITE_DEFAULT_TRANSFORMATION]));
    editingTransformIndex = null;
    transformEditStash = null;
    showTransformBanner(false);
    setBuilderFormFromAppearance(char.builderAppearance || SPRITE_PRESETS.goku.appearance);
    conjAbrirEditor(key ? characterDB[key] : null);
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
    editingTransformIndex = null;
    transformEditStash = null;
    showTransformBanner(false);
    stopSpriteMotionPreview();
    conjFecharEditor();
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

// O jogador mexeu no CONSTRUTOR depois do último "USAR ESTE PERSONAGEM"? Então SALVAR já gera as animações com o que
// está na prévia (antes salvava as animações antigas — num personagem novo, as do Goku padrão).
let builderMexido = false;
document.addEventListener("change", (e) => {
    const id = e.target && e.target.id ? String(e.target.id) : "";
    if (id.startsWith("build-") && id !== "build-pose") builderMexido = true;
});
document.addEventListener("input", (e) => {
    const id = e.target && e.target.id ? String(e.target.id) : "";
    if (id.startsWith("build-") && id !== "build-pose") builderMexido = true;
});

function saveCharacterFromModal() {
    if (conjEstaEditando()) return showSystemAlert("FORMA EM MONTAGEM", "TOQUE EM SALVAR FORMA OU CANCELAR FORMA ANTES DE SALVAR O PERSONAGEM.");
    if (editingTransformIndex !== null) finishTransformationEdit(null);
    if (builderMexido) applyBuilderToCharacter();
    const charName = document.getElementById('char-name');
    const name = charName ? charName.value.trim().toUpperCase() : "";
    if (!name) {
        return showSystemAlert("CAMPO OBRIGATÓRIO", "DIGITE O NOME DO PERSONAGEM!");
    }

    let key = editingKey || ("char_" + Date.now());
    let idleFrames = tempAnimations.idle || [];
    let usedFirstSheetFrame = false;
    if (!idleFrames.length && spriteSheetImage) {
        const grid = getSpriteSheetGrid();
        const frameCount = grid ? Math.min(grid.settings.total, grid.columns * grid.rows) : 1;
        const firstFrame = frameCount > 1 ? extractSpriteSheetFrame(0) : null;
        if (firstFrame) { idleFrames = [firstFrame]; usedFirstSheetFrame = true; }
    }
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
                transform: Array.from(tempAnimations.transform),
                special: Array.from(tempAnimations.special || [])
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
                scale: 1,   // o tamanho agora vem da ALTURA
                altura: (charScale && normalizarAltura(charScale.value)) || ALTURA_PADRAO_CM,
                frameWidth: charFw ? parseInt(charFw.value, 10) || img.naturalWidth || 32 : 32,
                frameHeight: charFh ? parseInt(charFh.value, 10) || img.naturalHeight || 32 : 32,
                totalFrames: charFrames ? parseInt(charFrames.value, 10) || 1 : 1,
                bgRemoval: getBgRemovalFromForm(),
                transformations: JSON.parse(JSON.stringify(tempTransformations.length ? tempTransformations : [SPRITE_DEFAULT_TRANSFORMATION]))
            };
            if (tempMinionClassico) aplicarMinionClassico(characterDB[key], tempMinionClassico);   // minion clássico: desenho do modelo com as cores
            conjAplicarNoPersonagem(characterDB[key], previousCharacter && previousCharacter.spriteForms);
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
            showSystemAlert("SUCESSO", usedFirstSheetFrame
                ? `PERSONAGEM ${name} SALVO! COMO NENHUM QUADRO FOI ESCOLHIDO PARA "PARADO", FOI USADO O 1º QUADRO DA SPRITE SHEET.`
                : `PERSONAGEM ${name} SALVO!`);
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
                // Personagem do construtor: as animações e a imagem são sempre refeitas com o desenho atual a partir
                // da aparência guardada (não ficam salvas no localStorage, ver saveCharacterData; e um personagem salvo
                // por versões antigas, no estilo antigo, passa a usar o desenho atual).
                if (character.minionClassico) aplicarMinionClassico(character, character.minionClassico);
                else if (character.builderAppearance) {
                    character.builderAppearance = normalizeAppearance(character.builderAppearance);
                    Object.assign(character, buildProceduralAnimations(character.builderAppearance));
                    character.defaultUrl = generateSpriteFrameUrl(character.builderAppearance, "idle", 0);
                }
                characterDB[k] = character;
                loadImageSecure(character.defaultUrl, (img) => {
                    if (characterDB[k]) characterDB[k].imageObj = img;
                });
            }

            if (validCount > 0) {
                seedNewDefaultCharacters();
                atualizarFreezaSalvo();
                atualizarCellSalvo();
                atualizarHeroisSalvos();
                atualizarPersonagens075();
                apagarTrunksDeTeste081();
                piccoloAntiHeroi085();
                minionsClassicos090();
                conjuntosAoCarregar();
                return;
            }
        }
    } catch (e) {
        console.warn("Erro ao carregar database:", e);
    }

    loadDefaultCharacters();
    conjuntosAoCarregar();
}

// Personagens iniciais: um para cada modelo da lista "COMEÇAR A PARTIR DE..." do construtor (SPRITE_PRESETS em
// sprites.js), montados com o próprio construtor — já nascem com animações fluidas (voo, ataque, parry, carregar,
// transformar). O construtor continua funcionando igual para criar personagens novos a partir desses modelos.
const FREEZA_TRANSFORMACOES = [
    { name: "Segunda forma", diff: { build: "gigante", headFeature: "capacete_chifres", bodyMarks: "carapaca_freeza", outerShirt: "none" }, ssj: false, aura: "roxo" },
    { name: "Terceira forma", diff: { build: "musculoso", headFeature: "cabeca_longa", bodyMarks: "carapaca_freeza", outerShirt: "none", mouthType: "risada" }, ssj: false, aura: "roxo" },
    { name: "Forma final", diff: { build: "normal", headFeature: "none", bodyMarks: "freeza", outerShirt: "armadura_freeza", gloves: "nenhuma", shoes: "pes_garras", skinColor: "" }, ssj: false, aura: "roxo" },
    { name: "Freeza ciborgue", diff: { build: "normal", headFeature: "meia_cabeca_metal", bodyMarks: "metal_freeza", outerShirt: "armadura_freeza", gloves: "nenhuma", shoes: "pes_garras", skinColor: "" }, ssj: false, aura: "roxo" },
    // Golden e Black (mangá): o corpo da forma final com as cores trocadas
    { name: "Golden Freeza", diff: { build: "normal", headFeature: "none", bodyMarks: "freeza", outerShirt: "armadura_freeza", gloves: "nenhuma", shoes: "pes_garras", skinColor: "#f2c233", primaryColor: "#7b3ab8" }, ssj: false, aura: "amarelo" },
    { name: "Black Freeza", diff: { build: "normal", headFeature: "none", bodyMarks: "freeza", outerShirt: "armadura_freeza", gloves: "nenhuma", shoes: "pes_garras", skinColor: "#25212c", primaryColor: "#b04ad8" }, ssj: false, aura: "roxo" }
];

// Gohan (saga Cell): base com capa; 1 = Super Saiyajin sem capa; 2 = Super Saiyajin 2 sem capa (mechas finas, gi rasgado)
const GOHAN_TRANSFORMACOES = [
    { name: "Super Saiyajin", diff: { cape: "none", irisColor: "#2ab8b0" }, ssj: true, aura: "amarelo" },
    { name: "Super Saiyajin 2", diff: { cape: "none", irisColor: "#2ab8b0", hairStyle: "gohan_ssj2", outerShirt: "gi_rasgado", build: "musculoso", primaryColor: "#7a3fc8", pantsColor: "#7a3fc8", secondaryColor: "#2a7ad8", shoes: "botas_dobradas" }, ssj: true, aura: "amarelo" }
];

// Broly (Super): base de armadura; 1 = Super Saiyajin Lendário (cabelo verde-limão, olhos brancos, sem armadura,
// ombreiras e coleira, músculos enormes e cicatrizes; mantém calça, manto, munhequeiras e botas)
const BROLY_TRANSFORMACOES = [
    { name: "Super Saiyajin Lendário", diff: { hairStyle: "broly_lssj", hairColor: "#b6ff3c", eyeType: "vazio", mouthType: "grito", outerShirt: "none", accessory: "none", build: "gigante", scar: "lendario" }, ssj: true, aura: "verde" }
];

// Majin Buu: a base é o Kid Buu; 1 = Buu gordo (capa com nó, colete curto, luvas e botas douradas)
const BUU_TRANSFORMACOES = [
    { name: "Buu gordo", diff: { build: "gordo", headFeature: "majin_antena", eyeType: "fechado", mouthType: "alegre", outerShirt: "colete_buu", cape: "capa_no", gloves: "luvas_douradas", shoes: "botas_douradas", scleraColor: "#ffffff", irisColor: "#101010" }, ssj: false, aura: "rosa" }
];

const CELL_TRANSFORMACOES = [
    { name: "Semi-perfeito", diff: { build: "gigante", headFeature: "capacete_cell2", bodyMarks: "cell_semi", skinColor: "#b5cf45", shoes: "sapato_cell", mouthType: "risada", wings: "cell" }, ssj: false, aura: "verde" },
    { name: "Perfeito", diff: { build: "musculoso", headFeature: "capacete_cell3", bodyMarks: "cell_perfeito", skinColor: "#e6e4ee", shoes: "sapato_ponta", tail: "none", irisColor: "#7a3fa0", wings: "cell_capa" }, ssj: false, aura: "verde" }
];

const DEFAULT_CHARACTERS = {
    // Goku já vem com a Transformação 2 (cabelo longo de Super Saiyajin), criada pela aba TRANSFORMAÇÃO do editor
    goku_adult: { name: "GOKU", presetKey: "goku", align: "HERÓI", aura: "gelo", spec: "KAMEHAMEHA",
        transformations: [
            { name: "Transformação 1", diff: {}, ssj: true, aura: "amarelo" },
            { name: "Transformação 2", diff: { hairStyle: "ssj_longo", hairColor: "#ffe34d" }, ssj: false, aura: "amarelo" }
        ] },
    vegeta: { name: "VEGETA", presetKey: "vegeta", align: "ANTI-HERÓI", aura: "amarelo", spec: "FINAL FLASH" },
    piccolo: { name: "PICCOLO", presetKey: "piccolo", align: "ANTI-HERÓI", aura: "verde", spec: "MAKAN KOSAPPO" },
    // Freeza: começa na 1ª forma (armadura do exército) e cada TRANSFORMAR sobe uma forma, até o ciborgue
    freeza_1: { name: "FREEZA", presetKey: "freeza", align: "VILÃO", aura: "roxo", spec: "DEATH BEAM",
        transformations: FREEZA_TRANSFORMACOES },
    trunks: { name: "TRUNKS", presetKey: "trunks", align: "HERÓI", aura: "azul", spec: "BURNING ATTACK" },
    gohan: { name: "GOHAN", presetKey: "gohan", align: "HERÓI", aura: "gelo", spec: "MASENKO", transformations: GOHAN_TRANSFORMACOES },
    kaioshin: { name: "SUPREMO SR. KAIO", presetKey: "kaioshin", align: "HERÓI", aura: "rosa", spec: "KIAI SAGRADO" },
    gogeta: { name: "VEGETTO", presetKey: "fusao", align: "HERÓI", aura: "amarelo", spec: "FINAL KAMEHAMEHA" },
    bardock: { name: "BARDOCK", presetKey: "bardock", align: "ANTI-HERÓI", aura: "azul", spec: "RIOT JAVELIN" },
    android17: { name: "ANDROIDE 17", presetKey: "android17", align: "ANTI-HERÓI", aura: "verde", spec: "POWER BLITZ" },
    android18: { name: "ANDROIDE 18", presetKey: "android18", align: "ANTI-HERÓI", aura: "azul", spec: "DESTRUCTO DISC" },
    majin_buu: { name: "MAJIN BUU", presetKey: "majin", align: "VILÃO", aura: "rosa", spec: "CHOCOLATE BEAM", transformations: BUU_TRANSFORMACOES },
    raditz: { name: "RADITZ", presetKey: "raditz", align: "VILÃO", aura: "roxo", spec: "DOUBLE SUNDAY" },
    broly: { name: "BROLY", presetKey: "broly", align: "VILÃO", aura: "verde", spec: "ERASER CANNON", transformations: BROLY_TRANSFORMACOES },
    // Minions (alinhamento MINION): ficam embaixo da divisão MINIONS no gerenciador e só aparecem no campo MINION das
    // arenas. São os desenhos clássicos de minions.js (minion = modelo de MINION_MODELOS), não modelos do construtor.
    saibaman: { name: "SAIBAMAN", minion: "saibaman", align: "MINION", aura: "verde", spec: "AUTODESTRUIÇÃO" },
    celljr: { name: "CELL JR.", minion: "celljr", align: "MINION", aura: "azul", spec: "KAMEHAMEHA JR." },
    gotenks: { name: "GOTENKS", presetKey: "gotenks", align: "HERÓI", aura: "amarelo", spec: "SUPER GHOST KAMIKAZE" },
    // Cell: começa na 1ª forma (imperfeito) e transforma em semi-perfeito e perfeito
    cell: { name: "CELL", presetKey: "cell", align: "VILÃO", aura: "verde", spec: "KAMEHAMEHA PERFEITO", transformations: CELL_TRANSFORMACOES }
};
// Alturas (cm) dos personagens iniciais, de guias e listas oficiais (Gohan é o criança da saga Cell; Gotenks não
// tem valor oficial). "base" = forma normal; as transformações pelo nome, para valer também em saves antigos
// (que guardam a lista de transformações sem altura). O que o jogador digitar no editor (c.altura / t.altura)
// vale mais que isto. Na luta a altura vira escala (escalaDaAltura, com limites).
const ALTURAS_PADRAO = {
    goku_adult: { base: 175 }, vegeta: { base: 164 }, piccolo: { base: 226 }, trunks: { base: 170 },
    gohan: { base: 155 }, kaioshin: { base: 157 }, gogeta: { base: 175 }, bardock: { base: 175 },
    android17: { base: 172 }, android18: { base: 172 }, raditz: { base: 198 }, gotenks: { base: 125 },
    saibaman: { base: 120 }, celljr: { base: 110 },
    freeza_1: { base: 132, "Segunda forma": 221, "Terceira forma": 214, "Forma final": 158, "Freeza ciborgue": 158, "Golden Freeza": 158, "Black Freeza": 158 },
    cell: { base: 228, "Semi-perfeito": 259, "Perfeito": 213 },
    majin_buu: { base: 149, "Buu gordo": 244 },
    broly: { base: 230, "Super Saiyajin Lendário": 300 }
};

// Altura (cm) do personagem no nível de transformação (0 = forma normal)
function getAlturaPersonagem(charKey, nivel) {
    const c = characterDB[charKey], padrao = ALTURAS_PADRAO[charKey] || {};
    let base = c && normalizarAltura(c.altura);
    if (!base) base = padrao.base || (c && c.scale && c.scale !== 1 ? normalizarAltura(c.scale * ALTURA_PADRAO_CM) : null) || ALTURA_PADRAO_CM;
    if (!(nivel > 0)) return base;
    const lista = getCharacterTransformations(charKey);
    const t = lista[Math.min(nivel, lista.length) - 1];
    if (!t) return base;
    return normalizarAltura(t.altura) || padrao[t.name] || base;
}

// Transformações do personagem, na ordem em que acontecem na luta (aba TRANSFORMAÇÃO do editor). Quem nunca
// mexeu nisso tem a "Transformação 1" padrão (a de sempre: cabelo de Saiyajin amarelo, aura dourada e raios);
// personagens iniciais podem trazer mais (DEFAULT_CHARACTERS[k].transformations).
function getCharacterTransformations(charKey) {
    const c = characterDB[charKey];
    if (c && Array.isArray(c.transformations) && c.transformations.length) return c.transformations;
    const d = DEFAULT_CHARACTERS[charKey];
    if (d && Array.isArray(d.transformations) && d.transformations.length) return d.transformations;
    return [SPRITE_DEFAULT_TRANSFORMATION];
}

// Cor da aura enquanto dura o poder extra da transformação (nível 1, 2...)
function getTransformationAura(charKey, nivel) {
    const t = getCharacterTransformations(charKey)[Math.max(0, nivel - 1)];
    return (t && t.aura) || "amarelo";
}

// Os 4 que já vinham nas versões antigas: perfis antigos já os receberam (se o jogador apagou algum, não volta).
const ORIGINAL_DEFAULT_CHARACTER_KEYS = ["goku_adult", "vegeta", "piccolo", "freeza_1"];

function createDefaultCharacter(k) {
    const d = DEFAULT_CHARACTERS[k];
    if (d.minion) {
        // minion clássico: o desenho original, sem nenhuma adaptação (minions.js)
        characterDB[k] = aplicarMinionClassico({
            name: d.name, imageObj: null, alignment: d.align, aura: d.aura, special: d.spec, scale: 1,
            frameWidth: 32, frameHeight: 32, totalFrames: 1, projColor: "#00ffff", projSize: "normal", bgRemoval: { mode: "none" }
        }, { modelo: d.minion, cores: {} });
        loadImageSecure(characterDB[k].defaultUrl, (img) => { if (characterDB[k]) characterDB[k].imageObj = img; });
        return;
    }
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
// Perfil com o Freeza antigo (só a forma final, sem transformações próprias): passa uma vez para o Freeza novo
// (1ª forma + 4 transformações). Um Freeza que o jogador editou (outra aparência) fica como está.
// 0.85: o Piccolo é anti-herói (aparece em HERÓIS e em VILÕES). Uma vez só, para saves em que ele ainda é HERÓI.
function piccoloAntiHeroi085() {
    if (readStorage("saiyan_piccolo_085") === "1") return;
    writeStorage("saiyan_piccolo_085", "1");
    const c = characterDB.piccolo;
    if (c && c.alignment === "HERÓI") { c.alignment = "ANTI-HERÓI"; saveCharacterData(); }
}

function atualizarFreezaSalvo() {
    // uma vez: o Freeza com transformações já salvas ganha também o Golden e o Black no fim da lista
    if (readStorage("saiyan_freeza_golden") !== "1") {
        writeStorage("saiyan_freeza_golden", "1");
        const f = characterDB.freeza_1;
        if (f && Array.isArray(f.transformations) && f.transformations.length && !f.transformations.some(t => t && /golden|black/i.test(t.name || ""))) {
            f.transformations.push(...JSON.parse(JSON.stringify(FREEZA_TRANSFORMACOES.slice(-2))));
            saveCharacterData();
        }
    }
    if (readStorage("saiyan_freeza_formas") === "1") return;
    writeStorage("saiyan_freeza_formas", "1");
    const c = characterDB.freeza_1;
    const ap = c && c.builderAppearance;
    if (!ap || ap.outerShirt !== "armadura_freeza" || ap.bodyMarks !== "freeza") return;
    if (Array.isArray(c.transformations) && c.transformations.some(t => t && t.diff && Object.keys(t.diff).length)) return;
    createDefaultCharacter("freeza_1");
    saveCharacterData();
}

// Perfil com o Cell antigo (forma perfeita de armadura, sem transformações próprias): passa uma vez para o Cell
// novo (1ª forma + semi-perfeito + perfeito). Um Cell que o jogador editou fica como está.
function atualizarCellSalvo() {
    if (readStorage("saiyan_cell_formas") === "1") return;
    writeStorage("saiyan_cell_formas", "1");
    const c = characterDB.cell;
    const ap = c && c.builderAppearance;
    if (!ap || ap.outerShirt !== "armadura_cell" || ap.hairStyle !== "cell_crista") return;
    if (Array.isArray(c.transformations) && c.transformations.some(t => t && t.diff && Object.keys(t.diff).length)) return;
    createDefaultCharacter("cell");
    saveCharacterData();
}

// Uma vez (versão 0.74): Goku, Vegeta, Trunks e Gohan salvos com a aparência antiga (sem edição do jogador)
// passam para o visual novo, fiel às referências; o Gohan com a transformação padrão ganha as 2 novas (SSJ e SSJ2).
const HEROIS_ANTIGOS = {
    goku_adult: { preset: "goku", era: (ap) => ap.symbol === "kai" && ap.shirtColor === "#1c45b0" && ap.hairStyle === "goku" },
    vegeta: { preset: "vegeta", era: (ap) => ap.outerShirt === "armadura_saiyajin" && ap.accessory === "none" && ap.tail === "none" && ap.hairStyle === "vegeta" },
    trunks: { preset: "trunks", era: (ap) => ap.primaryColor === "#3f66c8" && ap.hairStyle === "trunks_futuro" },
    gohan: { preset: "gohan", era: (ap) => ap.secondaryColor === "#20336f" && ap.shoes === "botas_marrons" && ap.hairStyle === "gohan" }
};
function atualizarHeroisSalvos() {
    if (readStorage("saiyan_herois_074") === "1") return;
    writeStorage("saiyan_herois_074", "1");
    let mudou = false;
    for (const k in HEROIS_ANTIGOS) {
        const c = characterDB[k], info = HEROIS_ANTIGOS[k];
        if (!c || !c.builderAppearance || !info.era(c.builderAppearance)) continue;
        c.builderAppearance = normalizeAppearance(SPRITE_PRESETS[info.preset].appearance);
        Object.assign(c, buildProceduralAnimations(c.builderAppearance));
        c.defaultUrl = generateSpriteFrameUrl(c.builderAppearance, "idle", 0);
        c.imageObj = null;
        loadImageSecure(c.defaultUrl, (img) => { if (characterDB[k]) characterDB[k].imageObj = img; });
        mudou = true;
    }
    const g = characterDB.gohan;
    if (g && Array.isArray(g.transformations) && g.transformations.length === 1 && !Object.keys(g.transformations[0].diff || {}).length) {
        delete g.transformations;   // volta a usar as transformações padrão do Gohan (DEFAULT_CHARACTERS)
        mudou = true;
    }
    if (mudou) saveCharacterData();
}

// Uma vez (versão 0.75): GOGETA vira VEGETTO; Vegetto, Majin Buu (agora Kid Buu, com o Buu gordo de transformação) e
// Broly (Super, com o Lendário) salvos com a aparência antiga, sem edição do jogador, passam para o visual novo.
const PERSONAGENS_ANTIGOS_075 = {
    gogeta: { preset: "fusao", antiga: { gender: "masculino", race: "Saiyajin", build: "musculoso", hairStyle: "goku", hairColor: "#111018", eyeType: "serio", irisColor: "#161a24", mouthType: "maligno", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "potara", outerShirt: "colete_fusao", innerShirt: "regata", pants: "larga", shoes: "botas_saiyajin", gloves: "pulseiras", primaryColor: "#1c3fb0", secondaryColor: "#2a2f45", accentColor: "#f5c518", shirtColor: "#262a3e", pantsColor: "#f4f1e8", kiColor: "#7fd8ff" } },
    majin_buu: { preset: "majin", antiga: { gender: "masculino", race: "Majin", build: "gordo", hairStyle: "careca", eyeType: "normal", irisColor: "#101010", mouthType: "smile", earType: "majin", headFeature: "majin_antena", bodyMarks: "none", accessory: "none", outerShirt: "colete_buu", innerShirt: "nenhuma", pants: "larga", shoes: "botas_kaioshin", gloves: "luvas_saiyajin", primaryColor: "#f4f1e8", secondaryColor: "#7a3f8f", accentColor: "#d7a23a", shirtColor: "#7a3f8f", pantsColor: "#f4f1e8", cape: "capa", capeColor: "#5a2f7a", kiColor: "#ff9de0" } },
    broly: { preset: "broly", antiga: { gender: "masculino", race: "Saiyajin", build: "gigante", hairStyle: "broly", hairColor: "#213018", eyeType: "bravo", irisColor: "#1a2a1a", mouthType: "serio", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "none", outerShirt: "none", innerShirt: "nenhuma", pants: "larga", shoes: "descalco", gloves: "pulseiras", primaryColor: "#8a6a2a", secondaryColor: "#c9a13a", accentColor: "#e8c04a", shirtColor: "#c9a13a", pantsColor: "#8a6a2a", kiColor: "#7dff7a" } }
};
function atualizarPersonagens075() {
    if (readStorage("saiyan_personagens_075") === "1") return;
    writeStorage("saiyan_personagens_075", "1");
    let mudou = false;
    const g = characterDB.gogeta;
    if (g && g.name === "GOGETA") { g.name = "VEGETTO"; mudou = true; }
    if (g && g.special === "BIG BANG KAMEHAMEHA") { g.special = "FINAL KAMEHAMEHA"; mudou = true; }
    const igual = (x, y) => { const a = normalizeAppearance(x), b = normalizeAppearance(y); return Object.keys(Object.assign({}, a, b)).every(k => a[k] === b[k]); };
    for (const k in PERSONAGENS_ANTIGOS_075) {
        const c = characterDB[k], info = PERSONAGENS_ANTIGOS_075[k];
        if (!c || !c.builderAppearance || !igual(c.builderAppearance, info.antiga)) continue;
        c.builderAppearance = normalizeAppearance(SPRITE_PRESETS[info.preset].appearance);
        Object.assign(c, buildProceduralAnimations(c.builderAppearance));
        c.defaultUrl = generateSpriteFrameUrl(c.builderAppearance, "idle", 0);
        c.imageObj = null;
        loadImageSecure(c.defaultUrl, (img) => { if (characterDB[k]) characterDB[k].imageObj = img; });
        // com a transformação padrão (sem mudança de visual), passa a usar as transformações novas do personagem
        if (Array.isArray(c.transformations) && c.transformations.length === 1 && !Object.keys(c.transformations[0].diff || {}).length) delete c.transformations;
        mudou = true;
    }
    if (mudou) saveCharacterData();
}

// 0.81: o "TRUNKS DO FUTURO" com o visual do Goku foi um teste do jogador — sai do jogo uma vez. Se o teste era
// o próprio Trunks padrão renomeado, ele volta a ser o Trunks de sempre.
function apagarTrunksDeTeste081() {
    if (readStorage("saiyan_trunks_teste_081") === "1") return;
    writeStorage("saiyan_trunks_teste_081", "1");
    let mudou = false;
    for (const k of Object.keys(characterDB)) {
        const c = characterDB[k];
        const nome = String((c && c.name) || "").trim().toUpperCase();
        if (nome !== "TRUNKS DO FUTURO") continue;
        if (c.builderAppearance && c.builderAppearance.hairStyle === "trunks_futuro") continue;   // é o Trunks de verdade
        delete characterDB[k];
        if (DEFAULT_CHARACTERS[k]) createDefaultCharacter(k);
        if (selectedCharacter === k && !characterDB[k]) selectedCharacter = "goku_adult";
        if (selectedBoss === k && !characterDB[k]) selectedBoss = "freeza_1";
        mudou = true;
    }
    if (mudou) { saveCharacterData(); if (typeof saveSelectedCharacters === "function") saveSelectedCharacters(); }
}

// 0.90: o Saibaman e o Cell Jr. tinham virado modelos do construtor (0.87/0.88). Uma vez: voltam a ser os
// desenhos clássicos originais (minions.js), com o mesmo nome, aura e especial que o jogador tinha.
function minionsClassicos090() {
    if (readStorage("saiyan_minions_classicos_090") === "1") return;
    writeStorage("saiyan_minions_classicos_090", "1");
    let mudou = false;
    ["saibaman", "celljr"].forEach(k => {
        const c = characterDB[k];
        if (!c || c.minionClassico) return;
        const antigo = { name: c.name, aura: c.aura, special: c.special, alignment: c.alignment };
        createDefaultCharacter(k);
        Object.keys(antigo).forEach(p => { if (antigo[p]) characterDB[k][p] = antigo[p]; });
        mudou = true;
    });
    if (mudou) saveCharacterData();
}

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
            if (rest.builderAppearance || rest.minionClassico) delete rest.animations;   // minion clássico: refeito pelo modelo
            if (Array.isArray(rest.spriteForms)) rest.spriteForms = rest.spriteForms.map(conjFormaParaSalvar);   // imagens das formas vão para o IndexedDB
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
    // VERSUS: os dois jogadores podem escolher qualquer personagem, herói ou vilão
    // minions (alinhamento MINION) nunca aparecem para escolher herói/vilão
    if (gameMode === "coop" && selecaoLuta) return Object.keys(characterDB).filter(k => characterDB[k].alignment !== "MINION");
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
    gender: "build-gender", race: "build-race", build: "build-build", hairStyle: "build-hair-style", hairColor: "build-hair-color", hairColor2: "build-hair-color2",
    eyeType: "build-eye-type", irisColor: "build-iris-color", scleraColor: "build-sclera-color",
    earType: "build-ear-type", headFeature: "build-head-feature", bodyMarks: "build-body-marks",
    mouthType: "build-mouth-type", scar: "build-scar", accessory: "build-accessory",
    hat: "build-hat", symbol: "build-symbol", outerShirt: "build-outer-shirt", innerShirt: "build-inner-shirt",
    pants: "build-pants", shoes: "build-shoes", gloves: "build-gloves", cape: "build-cape", capeColor: "build-cape-color",
    tail: "build-tail", wings: "build-wings", backWeapon: "build-back-weapon", primaryColor: "build-primary-color",
    secondaryColor: "build-secondary-color", accentColor: "build-accent-color", kiColor: "build-ki-color",
    shirtColor: "build-shirt-color", pantsColor: "build-pants-color", armPose: "build-arm-pose",
    minionColor: "build-minion-color", clawColor: "build-claw-color"
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
    // minions clássicos: o desenho e os movimentos originais (minions.js), editáveis só nas cores
    Object.keys(MINION_MODELOS).forEach(m => {
        const opt = document.createElement("option");
        opt.value = "minion:" + m;
        opt.textContent = MINION_MODELOS[m].rotulo;
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
    const final = normalizeAppearance(app);
    // com a cor padrão marcada, a amostra mostra a cor da raça escolhida (antes ficava a da raça anterior)
    if (autoSkin && autoSkin.checked && skinInput) skinInput.value = spriteSkin(final);
    return final;
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

// Trocar a raça mostra na hora a pele dela: volta para "usar cor padrão da raça" (a raça só muda a cor da pele;
// com uma cor própria marcada, trocar a raça não mudava nada na prévia).
function escolherRaca() {
    const autoSkin = document.getElementById("build-skin-auto");
    if (autoSkin) autoSkin.checked = true;
    // raça Minion já escolhe o porte de minion (o molde dos minions do gameplay); dá para trocar depois
    const raca = document.getElementById("build-race"), porte = document.getElementById("build-build");
    if (raca && porte && raca.value === "Minion") porte.value = "minion";
    refreshBuilderPreview();
}

// Escolher uma cor de pele vale em qualquer raça: desmarca "usar cor padrão da raça" na hora.
function escolherCorDaPele() {
    const autoSkin = document.getElementById("build-skin-auto");
    if (autoSkin) autoSkin.checked = false;
    refreshBuilderPreview();
}

function applyBuilderPreset() {
    const sel = document.getElementById("build-preset");
    const key = sel ? sel.value : "";
    if (key.startsWith("minion:") && MINION_MODELOS[key.slice(7)]) return comecarMinionClassico(key.slice(7));
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

// Arrastar uma cor dispara dezenas de trocas por segundo: a prévia só é refeita quando o dedo para por um instante
// (antes cada passo gerava todos os quadros e o construtor travava por segundos).
let builderPreviewDebounce = null;
function refreshBuilderPreview() {
    if (builderPreviewDebounce) clearTimeout(builderPreviewDebounce);
    builderPreviewDebounce = setTimeout(() => { builderPreviewDebounce = null; refreshBuilderPreviewNow(); }, 90);
}

function refreshBuilderPreviewNow() {
    const canvas = document.getElementById("build-preview-canvas");
    if (!canvas || !canvas.getContext) return;
    const bctx = canvas.getContext("2d");
    const poseSel = document.getElementById("build-pose");
    const state = poseSel ? poseSel.value : "idle";
    const appearance = getBuilderAppearanceFromForm();

    stopBuilderPreview();
    builderPreviewFrame = 0;
    // Cada quadro vira uma imagem só uma vez (antes criava e decodificava uma imagem nova a cada 130 ms).
    const tEdit = editingTransformIndex !== null ? tempTransformations[editingTransformIndex] : null;
    const ssjPrevia = state === "transform" || !!(tEdit && tEdit.ssj && SPRITE_SAIYAN_HAIR.includes(appearance.hairStyle));
    // editando uma transformação com outra cor de cabelo: o cabelo transformado fica nessa cor (não no amarelo padrão)
    const baseT = tEdit ? getTransformBase() : null;
    const ssjColor = baseT && tEdit.ssj && appearance.hairColor !== normalizeAppearance(baseT).hairColor ? appearance.hairColor : undefined;
    const list = getProceduralFrameUrls(appearance, state, { ssj: ssjPrevia, ssjColor });
    const images = list.map(src => { const img = new Image(); img.src = src; return img; });
    const draw = () => {
        const img = images[builderPreviewFrame % images.length];
        builderPreviewFrame++;
        const paint = () => {
            bctx.clearRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min((canvas.width * 0.92) / img.naturalWidth, (canvas.height * 0.92) / img.naturalHeight);
            const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
            bctx.imageSmoothingEnabled = true;
            bctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        };
        if (img.complete && img.naturalWidth) paint();
        else img.onload = paint;
    };
    draw();
    builderPreviewTimer = setInterval(draw, 130);
}

// Gera as animações de todos os movimentos e as coloca no personagem em edição — o mesmo lugar que a aba
// ANIMAÇÕES preencheria à mão. Depois disso, SALVAR PERSONAGEM funciona exatamente como com uma sprite sheet.
function applyBuilderToCharacter() {
    if (editingTransformIndex !== null) return finishTransformationEdit("transformacao");   // no modo transformação, o botão conclui a edição
    const appearance = getBuilderAppearanceFromForm();
    const { animations, fpsSettings } = buildProceduralAnimations(appearance);
    const alvo = conjEstaEditando() ? conjEdicao.stash : { anim: tempAnimations, fps: tempFps };   // montando uma forma: o construtor muda o ORIGINAL
    SUB_ANIM_KEYS.forEach(state => {
        alvo.anim[state] = animations[state];
        alvo.fps[state] = fpsSettings[state];
    });
    builderLastAppearance = appearance;
    builderMexido = false;
    if (!conjEstaEditando() && tempMinionClassico) { tempMinionClassico = null; atualizarPainelMinionClassico(); }   // virou personagem do construtor
    if (conjEstaEditando()) conjEdicao.stash.salvos = {}; else savedSpriteMotionPreviewFrames = {};
    spriteMotionPreviewImageCache = {};
    activeSpriteMovement = "idle";
    spriteMotionPreviewFrame = 0;

    const status = document.getElementById("build-status");
    if (status) status.textContent = "Personagem gerado! Clique em SALVAR PERSONAGEM para guardar (ou ajuste a aparência e clique de novo).";
    updateModalPreview();
    renderSpriteAssignedFrames();
    renderSpriteMotionPreview();
}

// ==================== MINION CLÁSSICO NO EDITOR ====================
// Saibaman, Cell Jr. e os minions feitos a partir deles: o desenho original (minions.js) com as cores trocadas
// aqui. Sem mexer nas cores fica exatamente o original. Usar o construtor (USAR ESTE PERSONAGEM) troca para o
// desenho do construtor.
let tempMinionClassico = null;
let minionCorTimer = null;
function aplicarMinionClassicoNoEditor() {
    const a = minionClassicoAnimacoes(tempMinionClassico);
    SUB_ANIM_KEYS.forEach(state => { tempAnimations[state] = a.animations[state].slice(); tempFps[state] = a.fpsSettings[state]; });
    savedSpriteMotionPreviewFrames = {};
    spriteMotionPreviewImageCache = {};
    updateModalPreview();
    renderSpriteAssignedFrames();
    renderSpriteMotionPreview();
}
function atualizarPainelMinionClassico() {
    const area = document.getElementById("minion-classico-area"), lista = document.getElementById("minion-classico-cores");
    if (!area || !lista) return;
    const n = tempMinionClassico && normalizarMinionClassico(tempMinionClassico);
    area.style.display = n ? "" : "none";
    lista.innerHTML = "";
    if (!n) return;
    const titulo = document.getElementById("minion-classico-modelo");
    if (titulo) titulo.textContent = MINION_MODELOS[n.modelo].nome;
    MINION_MODELOS[n.modelo].editaveis.forEach(([k, rotulo]) => {
        const grupo = document.createElement("div");
        grupo.className = "form-group";
        const label = document.createElement("label");
        label.htmlFor = "minion-cor-" + k;
        label.textContent = rotulo;
        const input = document.createElement("input");
        input.type = "color";
        input.id = "minion-cor-" + k;
        input.value = n.cores[k] || MINION_MODELOS[n.modelo].padrao[k];
        input.oninput = () => mudarCorMinionClassico(k, input.value);
        grupo.appendChild(label);
        grupo.appendChild(input);
        lista.appendChild(grupo);
    });
}
function mudarCorMinionClassico(k, cor) {
    if (!tempMinionClassico) return;
    tempMinionClassico = normalizarMinionClassico({ modelo: tempMinionClassico.modelo, cores: Object.assign({}, tempMinionClassico.cores, { [k]: cor }) });
    clearTimeout(minionCorTimer);
    minionCorTimer = setTimeout(aplicarMinionClassicoNoEditor, 120);
}
function voltarCoresMinionClassico() {
    if (!tempMinionClassico) return;
    tempMinionClassico = { modelo: tempMinionClassico.modelo, cores: {} };
    atualizarPainelMinionClassico();
    aplicarMinionClassicoNoEditor();
}
// "COMEÇAR A PARTIR DE..." um minion clássico: o personagem passa a ser esse minion (desenho e movimentos originais)
function comecarMinionClassico(modelo) {
    tempMinionClassico = { modelo, cores: {} };
    builderLastAppearance = null;
    builderMexido = false;
    const nameField = document.getElementById("char-name"), align = document.getElementById("char-alignment");
    if (nameField && !nameField.value.trim()) nameField.value = MINION_MODELOS[modelo].nome;
    if (align) align.value = "MINION";
    atualizarPainelMinionClassico();
    aplicarMinionClassicoNoEditor();
    const status = document.getElementById("build-status");
    if (status) status.textContent = "Minion clássico escolhido! Troque as cores na aba DADOS e clique em SALVAR PERSONAGEM.";
}

// ==================== ABA TRANSFORMAÇÃO ====================
// Lista de transformações do personagem em edição (cópia; vai para o personagem ao SALVAR). Cada uma guarda só o
// que muda em relação ao personagem normal (diff), editado no próprio CONSTRUTOR — sem outro editor.

// Personagem normal das transformações: o gerado no construtor (USAR ESTE PERSONAGEM) ou o já salvo.
function getTransformBase() {
    if (builderLastAppearance) return builderLastAppearance;
    const c = editingKey ? characterDB[editingKey] : null;
    return c && c.builderAppearance ? c.builderAppearance : null;
}

function getTransformThumbnail(t) {
    const base = getTransformBase();
    if (base) {
        const app = spriteTransformAppearance(base, t);
        return generateSpriteFrameUrl(app, "idle", 0, { ssj: !!t.ssj && SPRITE_SAIYAN_HAIR.includes(app.hairStyle), noGlow: true, ssjColor: spriteSsjColor(t) });
    }
    const c = editingKey ? characterDB[editingKey] : null;
    return (tempAnimations.idle && tempAnimations.idle[0]) || (c && c.defaultUrl) || getFallbackSpriteSvg();
}

function showTransformBanner(show, name) {
    const banner = document.getElementById("build-transform-banner");
    if (banner) banner.style.display = show ? "flex" : "none";
    const label = document.getElementById("build-transform-name");
    if (label) label.textContent = name || "";
}

function renderTransformationList() {
    const list = document.getElementById("transform-list");
    if (!list) return;
    list.innerHTML = "";
    const base = getTransformBase();
    const auraSel = document.getElementById("char-aura");
    tempTransformations.forEach((t, i) => {
        const card = document.createElement("div");
        card.className = "transform-card";
        const ordem = document.createElement("span");
        ordem.className = "transform-order";
        ordem.textContent = (i + 1) + "º";
        const img = document.createElement("img");
        img.alt = t.name;
        img.src = getTransformThumbnail(t);
        const nome = document.createElement("input");
        nome.type = "text";
        nome.value = t.name;
        nome.setAttribute("aria-label", "Nome da transformação");
        nome.oninput = () => { t.name = nome.value; img.alt = nome.value; };
        const aura = document.createElement("select");
        aura.setAttribute("aria-label", "Aura da transformação");
        if (auraSel) Array.from(auraSel.options).forEach(o => aura.add(new Option(o.textContent, o.value)));
        aura.value = t.aura || "amarelo";
        aura.onchange = () => { t.aura = aura.value; };
        // ALTURA (cm) desta forma: a salva, a do personagem inicial (ALTURAS_PADRAO, pelo nome) ou a da forma normal
        const altura = document.createElement("input");
        altura.type = "number"; altura.min = "50"; altura.max = "500"; altura.step = "1";
        altura.className = "transform-altura";
        altura.setAttribute("aria-label", "Altura da transformação (cm)");
        altura.title = "Altura (cm)";
        const alturaBase = normalizarAltura((document.getElementById("char-scale") || {}).value) || ALTURA_PADRAO_CM;
        altura.value = normalizarAltura(t.altura) || (ALTURAS_PADRAO[editingKey] || {})[t.name] || alturaBase;
        altura.oninput = () => { const v = normalizarAltura(altura.value); if (v) t.altura = v; };
        const botao = (texto, titulo, acao, desligado) => {
            const b = document.createElement("button");
            b.type = "button"; b.className = "btn"; b.textContent = texto; b.title = titulo;
            b.setAttribute("aria-label", titulo);
            b.disabled = !!desligado;
            b.onclick = acao;
            return b;
        };
        card.append(ordem, img, nome, aura, altura,
            botao("▲", "Subir na ordem", () => moveTransformation(i, -1), i === 0),
            botao("▼", "Descer na ordem", () => moveTransformation(i, 1), i === tempTransformations.length - 1),
            botao("EDITAR", base ? "Editar no construtor" : "Gere o personagem no CONSTRUTOR primeiro", () => editTransformation(i), !base),
            botao("✕", "Apagar transformação", () => removeTransformation(i), tempTransformations.length <= 1));
        list.appendChild(card);
    });
    // "COPIAR O CORPO DE": a transformação nova pode começar da original ou de qualquer transformação da lista
    const copia = document.getElementById("transform-copy-from");
    if (copia) {
        const atual = copia.value;
        copia.innerHTML = "";
        copia.add(new Option("Original", ""));
        tempTransformations.forEach((t, i) => copia.add(new Option((i + 1) + "º — " + t.name, String(i))));
        copia.value = atual !== "" && Number(atual) < tempTransformations.length ? atual : "";
    }
    const status = document.getElementById("transform-status");
    if (status) status.textContent = base
        ? "Toque em + para adicionar: ela começa igual à forma escolhida em COPIAR O CORPO DE e você muda no construtor."
        : "Para mudar a aparência das transformações, gere o personagem no CONSTRUTOR (USAR ESTE PERSONAGEM). Sem isso, elas mudam só a aura, o poder e os raios.";
}

function moveTransformation(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= tempTransformations.length) return;
    const [t] = tempTransformations.splice(i, 1);
    tempTransformations.splice(j, 0, t);
    renderTransformationList();
}

function removeTransformation(i) {
    if (tempTransformations.length <= 1) return;
    showSystemConfirm("APAGAR TRANSFORMAÇÃO", `APAGAR "${String(tempTransformations[i].name).toUpperCase()}"?`, () => {
        tempTransformations.splice(i, 1);
        renderTransformationList();
    }, "APAGAR");
}

// Nova transformação: começa igual ao personagem normal (ou a uma transformação escolhida em "COPIAR O CORPO DE",
// copiando as diferenças dela) e já abre no construtor.
function addTransformation() {
    const copia = document.getElementById("transform-copy-from");
    const origem = copia && copia.value !== "" ? tempTransformations[Number(copia.value)] : null;
    tempTransformations.push({ name: "Transformação " + (tempTransformations.length + 1), diff: origem ? JSON.parse(JSON.stringify(origem.diff || {})) : {}, ssj: origem ? !!origem.ssj : false, aura: origem ? (origem.aura || "amarelo") : "amarelo" });
    renderTransformationList();
    if (getTransformBase()) editTransformation(tempTransformations.length - 1);
}

function editTransformation(i) {
    const base = getTransformBase();
    const t = tempTransformations[i];
    if (!base || !t) return;
    if (editingTransformIndex === null) { transformEditStash = getBuilderAppearanceFromForm(); transformEditMexido = builderMexido; }
    editingTransformIndex = i;
    setBuilderFormFromAppearance(spriteTransformAppearance(base, t));
    const presetSel = document.getElementById("build-preset");
    if (presetSel) presetSel.value = "";
    showTransformBanner(true, t.name);
    switchEditorTab("construtor");
}

// Guarda na transformação só o que ficou diferente do personagem normal e devolve o construtor como estava.
function finishTransformationEdit(nextTab = "transformacao") {
    if (editingTransformIndex === null) return;
    const t = tempTransformations[editingTransformIndex];
    const base = getTransformBase();
    if (t && base) t.diff = spriteAppearanceDiff(base, getBuilderAppearanceFromForm());
    editingTransformIndex = null;
    showTransformBanner(false);
    if (transformEditStash) { setBuilderFormFromAppearance(transformEditStash); builderMexido = transformEditMexido; }   // mexer na transformação não conta como mexer no personagem
    transformEditStash = null;
    if (nextTab) switchEditorTab(nextTab);
}
