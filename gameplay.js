// ==================== GAMEPLAY.JS - LÓGICA DO JOGO COM ARENAS E ITENS REFINADOS ====================

let savedHighScore = Number.parseInt(readStorage("saiyan_highscore"), 10);
let score = 0, highScore = Number.isFinite(savedHighScore) ? savedHighScore : 0;
let waveNumber = 1;
let savedMaxWaveReached = Number.parseInt(readStorage("saiyan_max_wave"), 10);
let maxWaveReached = Number.isFinite(savedMaxWaveReached) ? savedMaxWaveReached : 0;   // libera as arenas (ver STAGE_PROGRESSION)
let totalReflects = 0, takenDamageInRun = false;
const MAX_FLOATING_TEXTS = 80;

// ==================== LIMITES E BALANCEAMENTO ====================
// Centraliza números antes espalhados pelo código, todos amarrados à
// resolução lógica 800x350 (ver AGENTS.md).
const BOUNDS = {
    PLAYER_MIN_X: 10,
    PLAYER_MAX_X: 450,
    PLAYER_MIN_Y: 10,
    PLAYER_MAX_Y_BASE: 240, // ajustado por (player.h - 56) para personagens com scale diferente
    PLAYER2_MIN_X: 10,
    PLAYER2_RIGHT_MARGIN: 10
};

// VERSUS: cada jogador fica na sua metade da tela (P1 da esquerda até o meio, P2 do meio até a direita)
function getPlayer1MaxX() {
    return gameMode === "coop" ? Math.min(BOUNDS.PLAYER_MAX_X, canvas.width / 2 - player.w) : BOUNDS.PLAYER_MAX_X;
}
function getPlayer2MinX() {
    return gameMode === "coop" ? canvas.width / 2 : BOUNDS.PLAYER2_MIN_X;
}

const SPAWN_TIMERS = {
    SAIBAMAN_FRAMES: 300,
    PICKUP_FRAMES: 420
};

const UNTOUCHABLE_ACHIEVEMENT_SCORE = 5;

// Itens "nuvem voadora" (velocidade) e "bastão mágico" (força): duração em frames (a 60fps) e o quanto a
// nuvem multiplica a velocidade de movimento. O bônus de dano do bastão vive em getBuffedAttackDamage
// (game-logic-core.js); aqui só a parte de tempo/velocidade, que é visual/estado, não lógica pura.
const PICKUP_BUFF_DURATION = 480;       // 8s por item coletado (empilha até o teto abaixo)
const PICKUP_BUFF_MAX_DURATION = 1200;  // 20s no máximo, mesmo pegando vários seguidos
const CLOUD_SPEED_MULTIPLIER = 1.4;

// Cache de imagens pré-carregadas para gameplay
let gameplayImageCache = {};
let pickupTypesThisRun = new Set();   // pra checar a conquista "colete os 4 tipos numa mesma partida"

// Contadores só desta partida — zerados a cada startGame(), usados no quadro de vitória da fase.
let runStats = { attacks: 0, parries: 0, hitsReceived: 0, items: { senzu: 0, capsule: 0, cloud: 0, staff: 0 } };
let stageVictoryStats = null;       // os dados exibidos no quadro de vitória (preenchido em resolveStageVictory)
let gameOverStats = null;           // os dados exibidos na tela de derrota (preenchido em triggerGameOver)
let pendingStageVictory = false;    // true = quando o chefe sumir voando da tela, mostra o quadro em vez de voltar mais forte (ver respawnBoss)
let stageMode = "normal";           // "normal" | "hard" | "unlimited" — escolhido no mapa antes de startGame()
let modeStepIndex = 0;              // progresso dentro da sequência de 5 ondas do modo normal/difícil (0-based)

// ==================== TUTORIAL INTERATIVO ====================
// Passo a passo: a imagem fica "parada" (parado/idle) mostrando o comando até o jogador executar a ação de
// verdade (não é só uma tela de texto) — só então o efeito de verdade toca (o tiro sai, o personagem
// transforma etc.). Funciona igual nos 3 modos de controle (teclado+mouse, toque, controle) porque reaproveita
// o MESMO caminho de disparo de ações do jogo (triggerAction) — ver os pontos em menu.js que passaram a aceitar
// gameState "tutorial" além de "playing".
const TUTORIAL_STEPS = [
    { key: "move", title: "MOVIMENTO" },
    { key: "attack", title: "ATAQUE DE KI" },
    { key: "charge", title: "CARREGAR KI" },
    { key: "parry", title: "PARRY (REBATER)" },
    { key: "transform", title: "TRANSFORMAR" },
    { key: "special", title: "ATAQUE ESPECIAL" },
    { key: "pause", title: "PAUSAR O JOGO" }
];
const TUTORIAL_EFFECT_FRAMES = { move: 24, attack: 40, charge: 30, parry: 30, transform: 70, special: 50, pause: 30 };
const TUTORIAL_CHARGE_HOLD_FRAMES = 30;   // ~0.5s segurando CARREGAR já conta como feito
const TUTORIAL_MOVE_DISTANCE = 40;        // px que precisa se afastar do ponto inicial pra contar o movimento

let tutorialStepIndex = 0;
let tutorialPhase = "waiting";   // "waiting" (esperando o comando) | "effect" (tocando o resultado) | "finished"
let tutorialEffectTimer = 0;
let tutorialMoveStartX = 0, tutorialMoveStartY = 0;
let tutorialChargeHeldFrames = 0;
let tutorialParryTarget = null;   // o "projétil de treino" que o jogador precisa rebater neste passo
let tutorialAttackCooldown = 0;   // segurar o dedo no analógico/tela também atira sem parar, igual no jogo de verdade

function getCurrentTutorialStep() {
    return TUTORIAL_STEPS[tutorialStepIndex] || null;
}

// Deixa o personagem e o mundo prontos para o passo atual (dá o ki necessário, cria o alvo do parry etc.).
function setupTutorialStep() {
    const step = getCurrentTutorialStep();
    if (!step) return;
    tutorialPhase = "waiting";
    tutorialEffectTimer = 0;
    player.actionState = "idle";
    player.isCharging = false;
    tutorialChargeHeldFrames = 0;
    tutorialAttackCooldown = 0;
    tutorialParryTarget = null;

    if (step.key === "move") {
        tutorialMoveStartX = player.x;
        tutorialMoveStartY = player.y;
    } else if (step.key === "transform") {
        player.ki = player.maxKi;   // transformar exige o ki cheio
        player.isSSJ = false;
    } else if (step.key === "special") {
        player.ki = player.maxKi;
    } else if (step.key === "parry") {
        spawnTutorialParryTarget();
    }
}

function spawnTutorialParryTarget() {
    tutorialParryTarget = { x: player.x + 260, y: player.y + player.h / 2, radius: 10, vx: -2.2, vy: 0, isHoming: false, color: "#ffcc00", fromPlayer: false };
    world.obstacles = [tutorialParryTarget];
}

// Chamado pelo triggerAction (menu.js) sempre que uma ação de verdade acontece durante o tutorial — só conta
// se for exatamente a ação pedida no passo atual (apertar ESPECIAL durante o passo de ATAQUE não adianta nada).
function markTutorialActionDone(actionName) {
    if (gameState !== "tutorial" || tutorialPhase !== "waiting") return;
    const step = getCurrentTutorialStep();
    if (!step || step.key !== actionName) return;
    if (actionName === "parry" && (!world.obstacles.length || totalReflects === tutorialReflectsBefore)) return;
    tutorialPhase = "effect";
    tutorialEffectTimer = TUTORIAL_EFFECT_FRAMES[actionName] || 40;
}

let tutorialReflectsBefore = 0;

function startTutorial() {
    initAudio();
    gameMode = "singleplayer";
    selectedStage = "terra";
    world.obstacles = [];
    world.pickups = [];
    world.saibamans = [];
    world.blasts = [];
    world.impactParticles = [];
    world.floatingTexts = [];
    world.beamActive = 0;
    world.beamOwner = "p1";
    world.stageScrollX = 0;
    keysPressed = {};
    mouseButtonsPressed = {};
    resetTouchInputState();

    player.x = 120;
    player.y = 150;
    player.hp = player.maxHp = 3;
    player.ki = 0;
    player.maxKi = 100;
    player.isSSJ = false;
    player.shield = false;
    player.speed = 4.5;
    player.speedBuffTimer = 0;
    player.powerBuffTimer = 0;
    player.isCharging = false;
    player.animTimer = 0;
    player.actionState = "idle";
    player.actionTimer = 0;
    player.invulnerableTimer = 0;
    player.parryHighlightTimer = 0;
    player.parryCombo = 0;
    player.parryComboTimer = 0;
    player.parryCooldown = 0;

    // player2 fica fora da tela e sem agir — o tutorial não tem chefe, só o jogador praticando. isDying fica
    // false (não true) porque triggerSpecialAttack usa esse campo como guarda e o passo de ESPECIAL precisa
    // funcionar de verdade aqui.
    player2.x = -400;
    player2.isDying = false;
    player2.hp = player2.maxHp = 999;

    tutorialStepIndex = 0;
    tutorialReflectsBefore = totalReflects;
    setupTutorialStep();
    setGameState("tutorial");
}

function advanceTutorialStep() {
    tutorialStepIndex++;
    tutorialReflectsBefore = totalReflects;
    if (tutorialStepIndex >= TUTORIAL_STEPS.length) {
        tutorialPhase = "finished";
        player.actionState = "idle";
    } else {
        setupTutorialStep();
    }
}

// Laço próprio do tutorial (não usa o update() principal — não há chefe, saibamans nem risco de dano aqui,
// só o personagem praticando cada comando). Movimento reaproveita a mesma leitura de teclado/analógico/
// controle do jogo normal, então o que o jogador aprende aqui funciona igual na partida de verdade.
function updateTutorial(dt) {
    if (gameState !== "tutorial") return;
    player.animTimer += dt;
    if (player.parryHighlightTimer > 0) player.parryHighlightTimer -= dt * 60;
    if (player.parryCooldown > 0) player.parryCooldown = Math.max(0, player.parryCooldown - dt * 60);
    if (player.actionTimer > 0) player.actionTimer -= dt * 60;

    const step = getCurrentTutorialStep();

    // Igual à luta: os tiros de ki voam, o especial dura o tempo dele, a aura da transformação vai passando
    // e carregar enche o ki em qualquer passo (no passo CARREGAR isso é contado lá embaixo).
    const f = dt * 60;
    world.obstacles.forEach(o => { if (o !== tutorialParryTarget && o.fromPlayer) { o.x += o.vx * f; o.y += (o.vy || 0) * f; } });
    world.obstacles = world.obstacles.filter(o => o === tutorialParryTarget || (o.x > -30 && o.x < canvas.width + 30));
    if (world.beamActive > 0) world.beamActive = Math.max(0, world.beamActive - f);
    updateTransformPower(player, false, dt);
    if (player.isCharging && (!step || step.key !== "charge")) player.ki = Math.min(player.maxKi, player.ki + 1.4 * f);

    if (tutorialPhase === "effect") {
        setTutorialActionState(0, 0);
        tutorialEffectTimer -= dt * 60;
        if (tutorialEffectTimer <= 0) { advanceTutorialStep(); return; }
        if (step && step.key !== "move") return;   // durante o efeito só o movimento continua livre
    }

    if (tutorialPhase === "finished") return;

    // Movimento: mesma leitura do jogo normal (teclado, analógico virtual ou controle já traduzido em keysPressed).
    let moveX = 0, moveY = 0;
    if (keysPressed[keyBindings.p1.up]) moveY -= 1;
    if (keysPressed[keyBindings.p1.down]) moveY += 1;
    if (keysPressed[keyBindings.p1.left]) moveX -= 1;
    if (keysPressed[keyBindings.p1.right]) moveX += 1;
    if (moveX !== 0 && moveY !== 0) { moveX *= Math.SQRT1_2; moveY *= Math.SQRT1_2; }
    let dx = moveX * player.speed * dt * 60, dy = moveY * player.speed * dt * 60;
    if (touchAnalog.active) {
        dx += touchAnalog.vx * player.speed * dt * 60;
        dy += touchAnalog.vy * player.speed * dt * 60;
    }
    if (touchSwipe.active) {
        touchMoveX *= 0.6; touchMoveY *= 0.6;
        if (Math.abs(touchMoveX) < 0.3) touchMoveX = 0;
        if (Math.abs(touchMoveY) < 0.3) touchMoveY = 0;
        dx += touchMoveX; dy += touchMoveY;
    }
    player.x = Math.max(BOUNDS.PLAYER_MIN_X, Math.min(getPlayer1MaxX(), player.x + dx));
    player.y = Math.max(BOUNDS.PLAYER_MIN_Y, Math.min(BOUNDS.PLAYER_MAX_Y_BASE - (player.h - 56), player.y + dy));

    player.isCharging = !!keysPressed[keyBindings.p1.charge] || (keyBindings.p1.charge.startsWith("Mouse") && mouseButtonsPressed[keyBindings.p1.charge]) || touchChargeId !== null;

    // Segurar o dedo no analógico/tela também atira sem parar aqui, igual na partida de verdade — sem isso,
    // o passo de ATAQUE não reconhecia esse jeito de jogar no celular.
    if (touchAutoFire && (touchAnalog.active || touchSwipe.active) && !player.isCharging) {
        tutorialAttackCooldown -= dt * 60;
        if (tutorialAttackCooldown <= 0) {
            fireKiBarrage(player, false, false);
            if (gameState === "tutorial") markTutorialActionDone("attack");
            tutorialAttackCooldown = TOUCH_AUTOFIRE_INTERVAL;
        }
    } else {
        tutorialAttackCooldown = 0;
    }

    if (tutorialPhase !== "waiting" || !step) { /* nada */ }
    else if (step.key === "move") {
        const moved = Math.hypot(player.x - tutorialMoveStartX, player.y - tutorialMoveStartY);
        player.actionState = getDominantMoveAction(dx, dy) || (moved > 2 ? player.actionState : "idle");
        if (moved >= TUTORIAL_MOVE_DISTANCE) { tutorialPhase = "effect"; tutorialEffectTimer = TUTORIAL_EFFECT_FRAMES.move; }
        return;
    } else if (step.key === "charge") {
        if (player.isCharging) {
            player.actionState = "chargeKi";
            player.ki = Math.min(player.maxKi, player.ki + 1.4 * dt * 60);
            tutorialChargeHeldFrames += dt * 60;
            if (tutorialChargeHeldFrames >= TUTORIAL_CHARGE_HOLD_FRAMES) { tutorialPhase = "effect"; tutorialEffectTimer = TUTORIAL_EFFECT_FRAMES.charge; }
        } else {
            player.actionState = "idle";
            tutorialChargeHeldFrames = Math.max(0, tutorialChargeHeldFrames - dt * 30);
        }
        return;
    } else if (step.key === "parry") {
        if (tutorialParryTarget) {
            tutorialParryTarget.x += tutorialParryTarget.vx * dt * 60;
            if (tutorialParryTarget.x < player.x - 40 || tutorialParryTarget.x > player.x + 400) spawnTutorialParryTarget();
        }
    }

    if (tutorialPhase === "waiting" && !["move", "charge"].includes(step.key)) setTutorialActionState(dx, dy);
}

// Animação do personagem no tutorial, com a mesma prioridade da luta: parry, especial, ataque/transformação
// ainda em andamento, carregando, voando ou parado.
function setTutorialActionState(dx, dy) {
    if (player.parryHighlightTimer > 0) player.actionState = "parry";
    else if (world.beamActive > 0) player.actionState = "special";
    else if (player.actionTimer > 0 && ["attackKi", "transform", "parry", "special"].includes(player.actionState)) { /* mantém */ }
    else if (player.isCharging) player.actionState = "chargeKi";
    else player.actionState = getDominantMoveAction(dx, dy) || "idle";
}

// getHitboxRect, rectsOverlap e circleHitsEntity agora vivem em game-logic-core.js.

// Saiyajin transformado: na luta usa os mesmos movimentos, mas com o cabelo amarelo (Super Saiyajin).
// Só para personagens do construtor (têm a aparência salva) com cabelo de Saiyajin; o resto segue igual.
// Transformação N (lista do personagem, ver getCharacterTransformations): o personagem base + só o que muda
// naquela transformação (diff). "ssj" pinta o cabelo de Saiyajin de amarelo. Sem diferença visível, usa os
// quadros normais (o efeito fica por conta da aura e dos raios).
function getTransformedFrames(char, state, t) {
    const a = char.builderAppearance;
    if (!a || !t || typeof getProceduralFrameUrls !== "function" || !SPRITE_FRAME_COUNTS[state]) return null;
    const hasDiff = t.diff && Object.keys(t.diff).length > 0;
    const app = hasDiff ? spriteTransformAppearance(a, t) : a;
    const ssj = !!t.ssj && SPRITE_SAIYAN_HAIR.includes(app.hairStyle);
    if (!hasDiff && !ssj) return null;
    return getProceduralFrameUrls(app, state, { ssj, noGlow: true, ssjColor: spriteSsjColor(t) });
}

// Nível de transformação de um lutador (0 = normal). Antes só existia uma (isSSJ/isTransformed).
function getTransformLevel(p) {
    return (p && (p.isSSJ || p.isTransformed)) ? Math.max(1, p.transformLevel || 1) : 0;
}

// transformed: nível da transformação (true = 1, para quem ainda chama do jeito antigo)
function getCharacterAnimationFrames(charKey, actionState, transformed) {
    let char = characterDB[charKey];
    if (!char) return [];
    const level = transformed === true ? 1 : (transformed | 0);
    // conjunto de sprites em uso (botão azul do editor): base e transformações do grupo
    const doConjunto = conjuntoQuadros(charKey, SPRITE_FRAME_COUNTS[actionState || "idle"] ? (actionState || "idle") : "idle", level);
    if (doConjunto && doConjunto.length) return doConjunto;
    if (level > 0) {
        const t = getCharacterTransformations(charKey)[level - 1];
        // pose sem desenho próprio (ex.: "hit" do vilão levando golpe): usa a parada transformada, senão o
        // cabelo voltava ao normal por um instante a cada golpe
        const pose = SPRITE_FRAME_COUNTS[actionState || "idle"] ? (actionState || "idle") : "idle";
        const tFrames = getTransformedFrames(char, pose, t);
        if (tFrames && tFrames.length) return tFrames;
    }

    let anims = char.animations || {};
    let state = actionState || "idle";
    let selectedFrames = anims[state];

    if (Array.isArray(selectedFrames) && selectedFrames.length > 0) {
        return selectedFrames;
    }
    // ESPECIAL sem quadros próprios (personagens antigos, sprite sheets): usa os do ATAQUE
    if (state === "special" && Array.isArray(anims.attackKi) && anims.attackKi.length > 0) {
        return anims.attackKi;
    }

    if (Array.isArray(anims.idle) && anims.idle.length > 0) {
        return anims.idle;
    }

    if (char.defaultUrl) {
        return [char.defaultUrl];
    }

    return [];
}

// tempoNoMovimento: segundos desde que o lutador entrou neste movimento (para o cadeado dos conjuntos: a 1ª volta
// é inteira, as seguintes recomeçam no quadro travado; mudando de movimento e voltando, começa do 1º de novo)
function getCharacterAnimationFrame(charKey, actionState, animTimer, transformed, tempoNoMovimento) {
    let char = characterDB[charKey];
    if (!char) return null;

    let anims = char.animations || {};
    let fpsSettings = char.fpsSettings || {};
    let state = actionState || "idle";
    let animFrames = getCharacterAnimationFrames(charKey, state, transformed);

    if (animFrames.length === 0) {
        return getOrCacheGameplayImage(char.defaultUrl, char.imageObj, char.bgRemoval);
    }

    if (animFrames.length === 1) {
        return getOrCacheGameplayImage(animFrames[0], char.imageObj, char.bgRemoval);
    }

    let fps = conjuntoFps(charKey, state, transformed === true ? 1 : (transformed | 0)) || fpsSettings[state] || 12;
    const nivel = transformed === true ? 1 : (transformed | 0);
    const trava = typeof tempoNoMovimento === "number" ? conjuntoTrava(charKey, SPRITE_FRAME_COUNTS[state] ? state : "idle", nivel) : -1;
    let frameIndex = trava > 0 ? getLoopFrameIndex(tempoNoMovimento * fps, animFrames.length, trava)
        : Math.floor(animTimer * fps) % animFrames.length;
    // o ESPECIAL toca do começo ao fim uma vez e fica no último quadro (o disparo) até o raio acabar
    if (state === "special" && trava <= 0 && typeof tempoNoMovimento === "number") frameIndex = Math.min(animFrames.length - 1, Math.floor(tempoNoMovimento * fps));
    let idleFallback = Array.isArray(anims.idle) ? anims.idle[0] : anims.idle;
    let frameSrc = animFrames[frameIndex] || animFrames[0] || idleFallback || char.defaultUrl;
    return getOrCacheGameplayImage(frameSrc, char.imageObj, char.bgRemoval);
}

// Carrega de antemão todos os quadros do personagem. Sem isso, a 1ª vez que cada quadro aparece (ao mudar de
// movimento) ele ainda não está pronto e o personagem "pisca". Transformado: os quadros de cabelo amarelo.
// Feito aos poucos (ver runBackgroundWork): gerar e carregar tudo de uma vez travava o começo da luta e, ao
// transformar, congelava o jogo por quase um segundo no celular. Cada movimento vira uma tarefa que só calcula
// os desenhos (rápido); as imagens normais são carregadas uma por tarefa. As do cabelo amarelo só são calculadas
// — viram imagem quando aparecem (carregar ~100 imagens a mais no começo da luta derrubava o FPS).
const backgroundWork = { frames: [], images: [], pixelArt: [], light: [] };
// comArte: também monta a pixel art de cada quadro (o normal sempre; transformações quando pedido)
function preloadCharacterFrames(charKey, transformed, comArte) {
    if (!characterDB[charKey] || typeof Image === "undefined") return;
    const nivel = transformed === true ? 1 : (transformed | 0);
    const arte = comArte === undefined ? nivel === 0 : !!comArte;
    SUB_ANIM_KEYS.forEach(state => backgroundWork.frames.push([charKey, state, nivel, arte]));
}

function preloadOneState(charKey, state, transformed, comArte) {
    const char = characterDB[charKey];
    if (!char) return;
    const frames = getCharacterAnimationFrames(charKey, state, transformed);
    if (comArte) frames.forEach(src => backgroundWork.images.push(() => warmFrameArt(charKey, state, src, 0)));
}

// Caixa do lutador na luta (52x56 × escala do personagem). Usada pela luta e pela preparação da pixel art.
function getFighterBoxSize(charKey) {
    const c = characterDB[charKey];
    const k = c && c.scale ? c.scale : 1;
    return [52 * k, 56 * k];
}

// Carrega o quadro e, quando ele estiver pronto, já pede a pixel art no tamanho exato em que aparece na luta
// (o mesmo cálculo de drawPlayerEntity: caixa do lutador × crescimento do movimento × PIXEL_SPRITE_SCALE).
function warmFrameArt(charKey, state, src, tries) {
    const char = characterDB[charKey];
    if (!char) return;
    const img = getOrCacheGameplayImage(src, char.imageObj, char.bgRemoval);
    if (!isDrawableSource(img)) {   // imagem comum (sprite sheet): espera carregar
        if (tries < 120) backgroundWork.images.push(() => warmFrameArt(charKey, state, src, tries + 1));
        return;
    }
    if (!img.__svgImage || typeof ACTION_SPRITE_SCALE === "undefined") return;   // só desenhos em pixel art
    const k = ACTION_SPRITE_SCALE[state] || 1, [bw, bh] = getFighterBoxSize(charKey);
    getPixelArtSource(img, bw * k * PIXEL_SPRITE_SCALE * renderScale, bh * k * PIXEL_SPRITE_SCALE * renderScale);
}

// Nos menus, já prepara os lutadores escolhidos (quadros + pixel art): o primeiro segundo da luta não precisa
// mais montar desenho nenhum. Refaz quando a escolha muda; não mexe em nada com uma janela (editor) aberta.
function warmSelectedFighters() {
    const key = selectedCharacter + "|" + selectedBoss;
    if (backgroundWork.warmedFor === key || !characterDB[selectedCharacter]) return;
    backgroundWork.warmedFor = key;
    backgroundWork.frames.length = 0;
    backgroundWork.images.length = 0;
    backgroundWork.light.length = 0;
    preloadCharacterFrames(selectedCharacter, false);
    preloadCharacterFrames(selectedBoss, false);
    // transformações do jogador: as duas primeiras já com a pixel art (transformar sem engasgo); as demais só
    // calculadas. O rival: só a primeira (é a única que ele faz sozinho).
    getCharacterTransformations(selectedCharacter).forEach((t, i) => preloadCharacterFrames(selectedCharacter, i + 1, i < 2));
    preloadCharacterFrames(selectedBoss, 1);
    // desenhos do Saibaman (andando, saltando, abraçando): prontos antes do primeiro aparecer
    if (typeof getSaibamanSprite === "function") {
        for (let f = 0; f < 4; f++) backgroundWork.light.push(() => getSaibamanSprite("voar", f));
        backgroundWork.light.push(() => getSaibamanSprite("saltar", 0));
        backgroundWork.light.push(() => getSaibamanSprite("agarrar", 0));
    }
    // quadros da aura de ki (cor de cada lutador + dourada da transformação), um por tarefa
    if (typeof getKiAuraFrame === "function") {
        const auras = [[selectedCharacter, 0], [selectedBoss, 0.37]];
        auras.forEach(([k, seed]) => {
            const c = characterDB[k];
            const tiposAura = new Set([(c && c.aura) || "gelo"]);
            getCharacterTransformations(k).forEach(t => tiposAura.add(t.aura || "amarelo"));
            tiposAura.forEach(tipo => {
                const pal = KI_AURA_PALETTES[tipo] || KI_AURA_PALETTES.gelo;
                for (let f = 0; f < KI_AURA_FRAMES; f++) backgroundWork.light.push(() => getKiAuraFrame(pal, f, seed));
            });
        });
    }
}

// Chamado uma vez por quadro (menu.js/render): adianta, sem passar de ~4 ms, o que pode ser preparado antes de
// aparecer na tela — quadros dos personagens e a pixel art de cada quadro já carregado. Sempre anda pelo menos um passo.
function runBackgroundWork(budgetMs = 4) {
    if (gameState !== "playing" && gameState !== "tutorial" && gameState !== "paused") {
        if (typeof isModalCoveringScreen === "function" && isModalCoveringScreen()) return;
        warmSelectedFighters();
    }
    const start = performance.now();
    let feito = 0, imagens = 0;
    while (feito === 0 || performance.now() - start < budgetMs) {
        if (backgroundWork.pixelArt.length) backgroundWork.pixelArt.shift()();
        else if (backgroundWork.images.length) {
            // até 4 imagens por quadro (o navegador decodifica depois): 1 só por quadro deixava ~260 imagens (Vegeta
            // de sprites + rival) levando muitos segundos para ficarem prontas e o começo da luta pesado no celular
            backgroundWork.images.shift()();
            if (++imagens >= 4) break;
        }
        else if (backgroundWork.light.length) backgroundWork.light.shift()();                // tarefas leves (aura): várias por quadro
        else if (backgroundWork.frames.length) preloadOneState(...backgroundWork.frames.shift());
        else break;
        feito++;
    }
}

// Devolve a imagem sem a cor de fundo (canvas transparente), calculada uma vez por imagem + configuração.
// bgOpts = character.bgRemoval ({mode: auto|color|none, color, tolerance}); sem config = "auto" (apaga o branco).
// SVG do jogo já vem sem fundo (ver stripSvgWhiteBackground). Se a imagem não puder ser lida
// (ex.: origem externa bloqueada pelo navegador) ou não tiver a cor de fundo nas bordas, usa a original.
const spriteCutoutCache = new WeakMap();
function getCutoutSource(img, bgOpts) {
    if (!img || typeof HTMLCanvasElement === "undefined" || img instanceof HTMLCanvasElement) return img;
    if (!isDrawableSource(img)) return img;
    const cfg = normalizeBgRemoval(bgOpts);
    if (cfg.mode === "none") return getRasterSource(img);

    const key = getBgRemovalKey(cfg);
    let perImage = spriteCutoutCache.get(img);
    if (!perImage) {
        perImage = {};
        spriteCutoutCache.set(img, perImage);
    }
    if (key in perImage) return perImage[key];

    let result = img;
    try {
        const isSvg = isSvgImage(img);
        if (!(isSvg && cfg.mode === "auto")) {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            const cctx = c.getContext("2d", { willReadFrequently: true });
            cctx.drawImage(img, 0, 0);
            const pixels = cctx.getImageData(0, 0, w, h);
            const rgb = cfg.mode === "color" ? colorHexToRgb(cfg.color) : [255, 255, 255];
            const tolerance = cfg.mode === "color" ? Math.round(cfg.tolerance * 2.55) : 12;
            if (removeBackgroundColor(pixels.data, w, h, rgb, tolerance).changed) {
                cctx.putImageData(pixels, 0, 0);
                // o resto do código lê naturalWidth/complete de imagens: o canvas imita essas propriedades
                c.naturalWidth = w;
                c.naturalHeight = h;
                c.complete = true;
                result = c;
            }
        }
    } catch (err) {
        result = img;
    }
    if (result === img) result = getRasterSource(img);
    perImage[key] = result;
    return result;
}

// Desenhos SVG (todos os personagens do construtor e do elenco inicial) são redesenhados do zero pelo navegador
// a cada drawImage — com vários na tela, 60 vezes por segundo, isso deixava o jogo e as telas de personagens
// lentos no celular. Aqui cada SVG vira uma imagem pronta (canvas) uma única vez, no tamanho dele (que já é
// maior que o tamanho em que aparece no jogo, então não perde nitidez).
const svgRasterCache = new WeakMap();
// Ler img.src copia o texto inteiro do desenho (~16 KB): a tela de personagens fazia isso dezenas de vezes por
// quadro. A resposta fica guardada na própria imagem (como em spriteCutoutCache/svgRasterCache, que também
// guardam por imagem: o src de uma imagem já carregada não muda).
function isSvgImage(img) {
    if (img.__isSvg === undefined) img.__isSvg = String(img.src || "").startsWith("data:image/svg");
    return img.__isSvg;
}

function getRasterSource(img) {
    if (!img || typeof HTMLCanvasElement === "undefined" || img instanceof HTMLCanvasElement) return img;
    if (!isSvgImage(img) || !isDrawableSource(img)) return img;
    if (svgRasterCache.has(img)) return svgRasterCache.get(img);
    let result = img;
    try {
        const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        c.naturalWidth = w;
        c.naturalHeight = h;
        c.complete = true;
        c.__svgImage = img;   // guarda o desenho original para a versão pixel art (getPixelArtSource)
        result = c;
    } catch (err) {
        result = img;
    }
    svgRasterCache.set(img, result);
    return result;
}

// Personagem na luta como PIXEL ART nítida: o desenho (SVG) é feito já no tamanho exato em que aparece na tela,
// com as bordas firmes (sem o "borrado" de encolher uma imagem grande) e um contorno escuro de 1 pixel em volta
// — como os sprites de jogos de luta. Fica guardado por tamanho; efeitos semitransparentes (aura, brilho) são
// preservados. Devolve { img, pad } (pad = pixels de contorno em cada lado) ou null se não for um desenho SVG.
const pixelArtCache = new WeakMap();
const PIXEL_ART_OUTLINE = [21, 17, 15];
function getPixelArtSource(source, w, h) {
    const svg = source && source.__svgImage;
    if (!svg || typeof document === "undefined") return null;
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    let perSize = pixelArtCache.get(svg);
    if (!perSize) { perSize = {}; pixelArtCache.set(svg, perSize); }
    const key = w + "x" + h;
    if (key in perSize) return perSize[key];
    // O SVG é redesenhado já com o tamanho final (width/height = pixels da tela do jogo): desenhar o grande e
    // encolher misturaria as cores (borrão). Carrega em segundo plano; até lá, o jogo usa o desenho normal.
    const src = String(svg.src || "");
    if (!src.startsWith("data:image/svg")) return null;
    perSize[key] = null;
    const sized = new Image();
    // cores chapadas só nos desenhos em pixel art (nítidos); outros SVGs mantêm os degradês
    const pixelStyle = src.includes("crispEdges");
    // montar a pixel art (ler e chapar os pixels) fica na fila de runBackgroundWork, sem picos de vários de uma vez
    sized.onload = () => { backgroundWork.pixelArt.push(() => { perSize[key] = buildPixelArt(sized, w, h, pixelStyle ? getSvgPalette(src) : null); }); };
    sized.src = src.replace(/width%3D%22[\d.]+%22%20height%3D%22[\d.]+%22/, `width%3D%22${w}%22%20height%3D%22${h}%22`);
    return null;
}

// Cores usadas no desenho (para "chapar" cada pixel na cor mais próxima, sem misturas de borda/transparência).
function getSvgPalette(dataUrl) {
    let txt = "";
    try { txt = decodeURIComponent(dataUrl.slice(dataUrl.indexOf(",") + 1)); } catch (e) { return []; }
    const seen = new Set((txt.match(/#[0-9a-fA-F]{6}\b/g) || []).map(c => c.toLowerCase()));
    return [...seen].map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
}

function buildPixelArt(svg, w, h, palette) {
    let result = null;
    try {
        const pad = 1, W = w + pad * 2, H = h + pad * 2;
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.imageSmoothingEnabled = false;
        g.drawImage(svg, pad, pad, w, h);
        const px = g.getImageData(0, 0, W, H), d = px.data;
        const solid = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] === 255) solid[i] = 1;
        // borda do corpo: pixel meio transparente encostado no corpo vira cheio ou vazio (sem franja borrada);
        // brilhos/auras longe do corpo continuam suaves
        const near = (i, x, y) => (x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W]);
        const edge = [];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = y * W + x, a = d[i * 4 + 3];
            if (a > 0 && a < 255 && near(i, x, y)) edge.push(i, a >= 110 ? 255 : 0);
        }
        for (let k = 0; k < edge.length; k += 2) { d[edge[k] * 4 + 3] = edge[k + 1]; if (edge[k + 1]) solid[edge[k]] = 1; }
        // cor chapada: cada pixel do corpo vai para a cor mais próxima da paleta do desenho
        if (palette && palette.length) {
            const memo = new Map();   // a mesma cor aparece em muitos pixels: procura na paleta uma vez só
            for (let i = 0; i < W * H; i++) {
                if (!solid[i]) continue;
                const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], cor = (r << 16) | (gg << 8) | b;
                let best = memo.get(cor);
                if (!best) {
                    let bd = Infinity;
                    for (const c of palette) {
                        const dd = (c[0] - r) * (c[0] - r) * 0.3 + (c[1] - gg) * (c[1] - gg) * 0.59 + (c[2] - b) * (c[2] - b) * 0.11;
                        if (dd < bd) { bd = dd; best = c; }
                    }
                    memo.set(cor, best);
                }
                d[i * 4] = best[0]; d[i * 4 + 1] = best[1]; d[i * 4 + 2] = best[2];
            }
        }
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                if (solid[i] || d[i * 4 + 3] !== 0) continue;
                if ((x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W])) {
                    d[i * 4] = PIXEL_ART_OUTLINE[0]; d[i * 4 + 1] = PIXEL_ART_OUTLINE[1]; d[i * 4 + 2] = PIXEL_ART_OUTLINE[2]; d[i * 4 + 3] = 255;
                }
            }
        }
        g.putImageData(px, 0, 0);
        result = { img: c, pad };
    } catch (err) {
        result = null;
    }
    return result;
}

// Desenho em pixel art (nítido): a luta só usa a versão pixel art, feita direto do SVG no tamanho da tela
// (getPixelArtSource). Por isso nem carrega a imagem grande — devolve só uma "ficha" com o endereço do desenho.
// Carregar a imagem grande também era o trabalho mais pesado de cada quadro novo.
const pixelSvgStubs = new Map();
function getPixelSvgStub(src) {
    let stub = pixelSvgStubs.get(src);
    if (!stub) {
        stub = { __pixelSvg: true, __svgImage: { src }, complete: true, naturalWidth: 1, naturalHeight: 1 };
        pixelSvgStubs.set(src, stub);
    }
    return stub;
}

function getOrCacheGameplayImage(src, fallbackObj, bgOpts) {
    if (!src) return getCutoutSource(fallbackObj, bgOpts);
    if (typeof src === "string" && src.startsWith("data:image/svg") && src.includes("crispEdges")) return getPixelSvgStub(src);
    if (!gameplayImageCache[src]) {
        let img = new Image();
        img.src = src;
        gameplayImageCache[src] = img;
    }
    return getCutoutSource(gameplayImageCache[src], bgOpts);
}

function isDrawableSource(source) {
    if (!source) return false;
    if (source instanceof HTMLCanvasElement) return source.width > 0 && source.height > 0;
    return !!source.complete && source.naturalWidth !== 0;
}

// ==================== PLAYER 1 (SINGLEPLAYER) ====================
let player = {
    x: 80, y: 150, w: 48, h: 56, speed: 4.5,
    hoverTime: 0, animTimer: 0,
    hp: 3, maxHp: 3, invulnerableTimer: 0,
    ki: 0, maxKi: 100, isSSJ: false, shield: false,
    isCharging: false, actionState: "idle", actionTimer: 0, parryHighlightTimer: 0
};

// ==================== PLAYER 2 / BOSS ====================
let player2 = {
    x: 680, y: 150, w: 48, h: 56, vy: 2, vx: 0,
    hoverTime: 0, shootTimer: 0, animTimer: 0,
    hp: 3, maxHp: 3, hitTimer: 0, actionState: "idle", actionTimer: 0,
    ki: 0, maxKi: 100, isTransformed: false, isCharging: false,
    aggressiveness: 0.5, isDying: false, dyingspeedX: 0
};

// ==================== ESTADO DO MUNDO (ARRAYS DE GAME OBJECTS E TIMERS) ====================
// Agrupado num único objeto em vez de ~12 variáveis globais soltas, para deixar
// claro o que pertence ao "estado de uma partida" e facilitar reset/depuração.
// player, player2, score, waveNumber e gameState permanecem globais à parte
// porque estão referenciados em dezenas de pontos nos 3 arquivos do jogo;
// agrupá-los exigiria uma reescrita ampla e arriscada sem testes em navegador
// (ver AGENTS.md: "evitar grandes refatorações").
let world = {
    saibamans: [], obstacles: [], pickups: [], impactParticles: [], blasts: [],
    mountainsFar: [], floatingTexts: [],
    beamActive: 0, currentBeamType: "KAMEHAMEHA", beamOwner: "p1", lastPlayerHp: 3,
    saibamanSpawnTimer: 0, pickupSpawnTimer: 0, stageScrollX: 0
};

// getWaveParams, getDominantMoveAction, getHitboxRect, rectsOverlap,
// circleHitsEntity, BOSS_ATTACK_PATTERNS, getAvailableBossPatterns e
// shuffleArray agora vivem em game-logic-core.js (funções puras, testáveis
// via `node --test`). Este arquivo só chama essas funções passando o
// estado atual (ex: getWaveParams(waveNumber)).

// ==================== INICIALIZAÇÃO ====================
function initScenario() {
    world.mountainsFar = [];
    world.stageScrollX = 0;

    for (let i = 0; i < 10; i++) {
        world.mountainsFar.push({ x: i * 160, w: 180, h: 60 + Math.random() * 40 });
    }
}

function startGame() {
    initAudio();
    bumpStat("gamesPlayed", 1);
    pickupTypesThisRun = new Set();
    runStats = { attacks: 0, parries: 0, hitsReceived: 0, items: { senzu: 0, capsule: 0, cloud: 0, staff: 0 } };
    gameOverStats = null;
    pendingStageVictory = false;

    // Segurança: se a arena escolhida ainda não estiver liberada (perfil antigo, ou save editado à mão),
    // volta para a primeira fase em vez de travar a partida numa arena que não deveria estar acessível.
    if (gameMode === "singleplayer" && !isStageUnlockedByProgress(selectedStage, stageProgress)) {
        selectedStage = STAGE_PROGRESSION[0].id;
        writeStorage("saiyan_stage", selectedStage);
        stageMode = "normal";
    }
    // Segurança parecida pro modo: DIFÍCIL/SEM LIMITE só valem se já liberados nessa fase — senão cai pro normal.
    if (gameMode === "singleplayer") {
        if (stageMode === "unlimited" && !isUnlimitedModeUnlocked(selectedStage, stageProgress)) stageMode = "normal";
        else if (stageMode === "hard" && !isHardModeUnlocked(selectedStage, stageProgress)) stageMode = "normal";
    }
    modeStepIndex = 0;

    score = 0;
    // No modo história, a onda inicial depende do modo escolhido: NORMAL começa na dificuldade 1, DIFÍCIL já
    // começa na 2 (pulando os degraus fáceis), SEM LIMITE sempre começa na 1 e vai até onde o jogador aguentar.
    waveNumber = (gameMode === "singleplayer" && stageMode !== "unlimited") ? getRealWaveForModeStep(stageMode, 0) : 1;
    totalReflects = 0;
    takenDamageInRun = false;
    
    // o que os menus ainda não deixaram pronto (ver warmSelectedFighters) termina aos poucos durante a luta
    warmSelectedFighters();
    let waveParams = getWaveParams(waveNumber);

    world.obstacles = [];
    world.impactParticles = [];
    world.saibamans = [];
    world.blasts = [];
    world.pickups = [];
    world.floatingTexts = [];
    world.beamActive = 0;
    world.beamOwner = "p1";
    world.beamClashPush = 0;
    world.clashMashP1 = 0;
    world.clashMashP2 = 0;
    world.clashResolved = false;
    world.beamIsSuper = false;
    world.versusScore = { p1: 0, p2: 0 };   // VERSUS: rodadas vencidas por cada jogador (melhor de 3)
    world.versusRound = 1;
    screenFlashTimer = 0;
    world.lastPlayerHp = 3;
    world.saibamanSpawnTimer = 0;
    world.pickupSpawnTimer = 180;
    bossPatternBag = [];
    bossPatternBagWave = 0;
    keysPressed = {};
    mouseButtonsPressed = {};
    autoPaused = false;
    resumeCountdown = 0;
    resetTouchInputState(); // dedo solto durante game over/pausa não pode deixar movimento ou carga "presos"

    player.x = 80;
    player.y = 150;
    player.hp = player.maxHp = 3;
    player.invulnerableTimer = 0;
    player.speedBuffTimer = 0;
    player.powerBuffTimer = 0;
    player.parryCombo = 0;
    player.parryComboTimer = 0;
    player.lastParryComboBonus = 0;
    player.zenkaiUsed = false;    // ressurreição de uma vez por partida (só no versus, ver attemptZenkaiRevival)
    player.ki = 0;
    player.isSSJ = false;
    player.shield = false;
    player.speed = 4.5;
    player.isCharging = false;
    player.animTimer = 0;
    player.actionState = "idle";
    player.actionTimer = 0;
    player.parryHighlightTimer = 0;
    player.parryCooldown = 0;

    player2.x = 680;
    player2.y = 150;
    player2.vx = 0;
    player2.vy = 2;
    player2.alvoX = null;   // patrulha do vilão recomeça (stepVilaoPatrulha)
    player2.shootTimer = 0;
    player2.hp = player2.maxHp = waveParams.bossHp;
    player2.hitTimer = 0;
    player2.ki = 0;
    player2.isTransformed = false;
    player2.isCharging = false;
    player2.aggressiveness = waveParams.aggressiveness;
    player2.animTimer = 0;
    player2.actionState = "idle";
    player2.actionTimer = 0;
    player2.parryCooldown = 0;
    player2.isDying = false;

    initScenario();
    setGameState("playing");
}

function onBossDeath() {
    if (player2.isDying) return;
    player2.isDying = true;
    player2.dyingspeedX = 12;
    playSound("hit");
    triggerScreenShake(15, 25);
    createImpactParticles(player2.x + player2.w / 2, player2.y + player2.h / 2, "#ff0000", 30);
}

// Chamado no lugar de advanceWave() quando o chefe morre no modo história (não no versus): usa a MESMA
// animação de "morrendo voando da tela" que já existe (onBossDeath), só que o respawnBoss() que roda ao final
// dela (ver mais abaixo) checa pendingStageVictory e mostra o quadro de resultado em vez de trazer um chefe
// mais forte de volta — sem avançar pra uma onda mais difícil automaticamente.
function triggerStageVictory() {
    if (player2.isDying) return;   // evita reiniciar a contagem se outro hit acertar no mesmo instante
    pendingStageVictory = true;    // quando o chefe sumir voando da tela (respawnBoss), mostra o quadro em vez de voltar mais forte
    onBossDeath();
}

function resolveStageVictory() {
    world.obstacles = [];
    registerOpponentDefeated();
    const before = stageProgress[selectedStage] || { normalDone: false, hardDone: false };
    const wasNormalDone = !!before.normalDone, wasHardDone = !!before.hardDone;
    const progress = registerStageModeComplete(selectedStage, stageMode);
    if (selectedStage === STAGE_PROGRESSION[0].id && progress.normalDone) unlockAchievement("stage_" + selectedStage);
    checkStageModeAchievements();
    saveRankingScore(score);
    saveStageRankingScore(selectedStage, score);
    const stageInfo = STAGE_PROGRESSION.find(s => s.id === selectedStage);
    const stageIdx = STAGE_PROGRESSION.findIndex(s => s.id === selectedStage);
    const isLastStage = stageIdx === STAGE_PROGRESSION.length - 1;
    stageVictoryStats = {
        stageId: selectedStage,
        stageName: stageInfo ? stageInfo.name : "",
        mode: stageMode,
        score,
        attacks: runStats.attacks,
        parries: runStats.parries,
        hitsReceived: runStats.hitsReceived,
        items: Object.assign({}, runStats.items),
        // "acabou de liberar" só quando é a 1ª vez que esse modo é completado — não fica avisando de novo em replays.
        justUnlockedNext: stageMode === "normal" && !wasNormalDone && !isLastStage,
        justUnlockedUnlimited: !wasHardDone && progress.hardDone && progress.normalDone
    };
    playSound("powerup");
    setGameState("stage_victory");
}

// Chamado a cada chefe derrotado no modo história (fora do versus): decide se a fase continua (chefe volta mais
// forte, na próxima onda da sequência do MODO escolhido) ou se as 5 ondas do modo acabaram (mostra o quadro).
function handleStageModeProgression() {
    registerStageWaveRecord(selectedStage, waveNumber);
    if (stageMode === "unlimited") { advanceWave(); return; }
    modeStepIndex++;
    if (modeStepIndex >= STAGE_MODE_WAVE_COUNT) triggerStageVictory();
    else advanceWave();
}

function respawnBoss() {
    if (pendingStageVictory) {
        pendingStageVictory = false;
        resolveStageVictory();
        return;
    }
    if (gameMode === "coop") {   // VERSUS: o rival terminou de sair voando = o jogador 1 venceu a rodada
        finishVersusRound("p1");
        return;
    }
    // No modo normal/difícil, a próxima onda não é sempre "+1" — o difícil pula direto pros degraus mais
    // difíceis (2, 4, 6, 8, 10). No sem limite, continua sempre +1.
    if (stageMode !== "unlimited") {
        waveNumber = getRealWaveForModeStep(stageMode, modeStepIndex);
    } else {
        waveNumber++;
    }
    if (waveNumber > maxWaveReached) {
        maxWaveReached = waveNumber;
        writeStorage("saiyan_max_wave", maxWaveReached);
    }
    let waveParams = getWaveParams(waveNumber);
    player2.maxHp = waveParams.bossHp;
    player2.hp = player2.maxHp;
    player2.aggressiveness = waveParams.aggressiveness;
    player2.x = canvas.width + 100;
    player2.y = 150;
    player2.isDying = false;
    player2.dyingspeedX = 0;
    player2.vy = 2;
    player2.alvoX = null;   // patrulha do vilão recomeça (stepVilaoPatrulha)
    player2.isTransformed = false;
    player2.ki = 0;


    playSound("powerup");
    triggerScreenShake(10, 20);
}

// Registra a estatística de "oponente derrotado": no modo história é um chefe (bossesDefeated). No VERSUS as
// estatísticas contam partidas vencidas, não rodadas (ver endVersusMatch). Bônus extra se venceu transformado.
function registerOpponentDefeated() {
    if (gameMode !== "coop") bumpStat("bossesDefeated", 1);
    if (player.isSSJ) unlockAchievement("ssj_boss");
}

// ==================== VERSUS: RODADAS (MELHOR DE 3) ====================
// Uma rodada acaba quando um dos dois cai (o rival depois de sair voando da tela; o jogador 1 na hora, se a
// Zenkai não o salvar). Quem chegar a VERSUS_ROUNDS_TO_WIN rodadas vence a partida.
function finishVersusRound(roundWinner) {
    if (gameState !== "playing") return;   // evita contar a mesma rodada duas vezes no mesmo quadro
    const result = registerVersusRoundWin(world.versusScore, roundWinner);
    world.versusScore = result.score;
    if (result.matchWinner) endVersusMatch(result.matchWinner);
    else startNextVersusRound(roundWinner);
}

function startNextVersusRound(lastRoundWinner) {
    world.versusRound++;
    world.obstacles = [];
    world.saibamans = [];
    world.blasts = [];
    world.beamActive = 0;
    world.beamOwner = "p1";
    world.beamClashPush = 0;
    world.clashMashP1 = 0;
    world.clashMashP2 = 0;
    world.clashResolved = false;
    // os dois voltam ao lugar, com vida cheia e sem ki/transformação — rodada nova começa igual para os dois
    Object.assign(player, { x: 80, y: 150, hp: player.maxHp, ki: 0, isSSJ: false, speed: 4.5, invulnerableTimer: 60, parryCooldown: 0 });
    const waveParams = getWaveParams(waveNumber);
    Object.assign(player2, {
        x: 680, y: 150, vx: 0, vy: 2, hp: waveParams.bossHp, maxHp: waveParams.bossHp, ki: 0, isTransformed: false,
        isDying: false, dyingspeedX: 0, hitTimer: 0, parryCooldown: 0
    });
    addFloatingText({ text: `JOGADOR ${lastRoundWinner === "p1" ? 1 : 2} VENCEU A RODADA!`, x: canvas.width / 2, y: 120, alpha: 1, color: "#ffd23f" });
    addFloatingText({ text: `RODADA ${world.versusRound}  —  ${world.versusScore.p1} x ${world.versusScore.p2}`, x: canvas.width / 2, y: 145, alpha: 1, color: "#ffffff" });
    playSound("powerup");
    triggerScreenShake(10, 20);
}

function endVersusMatch(matchWinner) {
    if (matchWinner === "p1") {
        bumpStat("versusWinsTotal", 1);
        unlockAchievement("versus_win_first");
        if (player.zenkaiUsed) unlockAchievement("zenkai_win");
    }
    gameOverStats = {
        versusWinner: matchWinner,
        versusScore: Object.assign({}, world.versusScore),
        stageName: "",
        score,
        attacks: runStats.attacks,
        parries: runStats.parries,
        hitsReceived: runStats.hitsReceived,
        items: Object.assign({}, runStats.items),
        isNewStageRecord: false,
        isNewGeneralRecord: false
    };
    playSound("powerup");
    setGameState("gameover");
}

function advanceWave() {
    registerOpponentDefeated();
    onBossDeath();
}

// ==================== TRANSFORMAÇÕES ====================
function setActionState(target, state, duration = 18) {
    target.actionState = state;
    target.actionTimer = Math.max(target.actionTimer || 0, duration);
    target.animTimer = 0;
}

// getDominantMoveAction (escolhe animação de voo pela direção real do movimento)
// agora vive em game-logic-core.js.

// A transformação dura até o fim da luta (cabelo amarelo), mas os bônus — e a aura grande — só valem por
// este tempo (em quadros de 60 fps). Depois a aura volta ao normal, mostrando que o poder extra acabou.
const TRANSFORM_POWER_DURATION = 15 * 60;

// Só transforma com o ki cheio, e gasta a barra toda. O jogador transforma apenas quando aperta TRANSFORMAR
// (não existe mais transformação automática por pontos); o rival controlado pelo jogo transforma sozinho ao encher.
function transformPlayer(p, isP2 = false, force = false) {
    const charKey = isP2 ? selectedBoss : selectedCharacter;
    const lista = getCharacterTransformations(charKey);
    const nivel = getTransformLevel(p);
    const canTransform = force || p.ki >= p.maxKi;
    if (!canTransform || nivel >= lista.length) return false;   // já está na última transformação

    if (!force) p.ki = 0;
    p.transformLevel = nivel + 1;
    const bonusJaAtivo = p.transformPowerTimer > 0;   // transformou de novo durante o bônus: renova o tempo, não acumula
    if (lista[nivel + 1]) preloadCharacterFrames(charKey, nivel + 2, !isP2);   // já prepara a próxima (com a pixel art)
    if (!isP2) {
        p.isSSJ = true;
        if (!bonusJaAtivo) p.speed += 1.0;
        p.transformPowerTimer = TRANSFORM_POWER_DURATION;
        setActionState(p, "transform", 45);
        unlockAchievement("ssj_transform");
        bumpStat("transformsTotal", 1);
    } else {
        p.isTransformed = true;
        if (!bonusJaAtivo) {
            const before = p.aggressiveness || 0.5;
            p.aggressiveness = Math.min(1, before + 0.25);
            p.transformAggroBonus = p.aggressiveness - before;
            p.vy *= 1.3;
        }
        p.transformPowerTimer = TRANSFORM_POWER_DURATION;
        setActionState(p, "transform", 45);

    }
    playSound("transform");
    if (!isP2) vibrate([60, 40, 120]);
    triggerScreenShake(12, 25);
    return true;
}

// Conta o tempo dos bônus da transformação; quando acaba, tira os bônus (o personagem continua transformado).
function updateTransformPower(p, isP2, dt) {
    if (!(p.transformPowerTimer > 0)) return;
    p.transformPowerTimer = Math.max(0, p.transformPowerTimer - dt * 60);
    if (p.transformPowerTimer > 0) return;
    if (isP2 ? !p.isTransformed : !p.isSSJ) return;   // a luta reiniciou no meio: nada a tirar
    if (!isP2) p.speed = Math.max(4.5, p.speed - 1.0);
    else p.aggressiveness = Math.max(0, (p.aggressiveness || 0) - (p.transformAggroBonus || 0));
    p.transformAggroBonus = 0;
}

// ==================== SAIBAMANS ====================
function spawnSaibaman() {
    if (world.saibamans.length >= MAX_SAIBAMANS) return;
    
    // Brota da terra na metade direita da tela, longe do jogador, e salta até uma altura de voo.
    const x = 470 + Math.random() * (canvas.width - 520);
    const groundY = canvas.height - 40 - 4;
    const s = createSaibaman(x, groundY, 40 + Math.random() * 180, 2 + Math.random() * 1.5);
    world.saibamans.push(s);
    // terra voando de onde ele nasce
    createImpactParticles(x + s.w / 2, canvas.height - 4, "#7a5a32", 8);
}

// Abraço do Saibaman: ele agarra as pernas do herói pela frente e explode. O herói continua com os braços
// livres (atira, carrega ki, defende outros golpes), mas não tem como se soltar: a explosão sempre tira 1 de vida.
function explodeSaibaman(s) {
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    world.blasts.push({ x: cx, y: cy, r: 6, maxR: 46, life: 1 });
    createImpactParticles(cx, cy, "#ffd34d", 14);
    createImpactParticles(cx, cy, "#7dff5a", 6);
    triggerScreenShake(7, 14);
    playSound("hit");
    player.hp--;
    runStats.hitsReceived++;
    takenDamageInRun = true;
    player.parryCombo = 0;
    player.parryComboTimer = 0;
    player.lastParryComboBonus = 0;
    player.invulnerableTimer = 30;
    if (player.hp <= 0 && !attemptZenkaiRevival()) {
        triggerGameOver();
    }
}

// Explosão do Saibaman sem machucar o herói (morto pelo especial ou ao bater no vilão)
function explosaoDeSaibaman(s) {
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    world.blasts.push({ x: cx, y: cy, r: 6, maxR: 46, life: 1 });
    createImpactParticles(cx, cy, "#ffd34d", 14);
    createImpactParticles(cx, cy, "#7dff5a", 6);
    triggerScreenShake(5, 10);
    playSound("hit");
    score += 1;
    bumpStat("saibamansDefeated", 1);
}

function destruirSaibamansAgarrados() {
    for (let i = world.saibamans.length - 1; i >= 0; i--) {
        const s = world.saibamans[i];
        if (s.phase !== "agarrar") continue;
        world.saibamans.splice(i, 1);
        explosaoDeSaibaman(s);
    }
}

function spawnPickup() {
    if (world.pickups.length >= 2) return;

    const minX = 10;
    const maxX = 450 - 24;

    const roll = Math.random();
    world.pickups.push({
        // 4 tipos com pesos: cura e escudo continuam mais comuns; nuvem/bastão são um respiro tático a menos
        type: roll < 0.38 ? "senzu" : roll < 0.62 ? "capsule" : roll < 0.81 ? "cloud" : "staff",
        x: minX + Math.random() * (maxX - minX),
        y: -28,
        w: 24,
        h: 24,
        vy: 1.2 + Math.random() * 0.8,
        spin: Math.random() * Math.PI * 2,
        pulse: Math.random() * Math.PI * 2
    });
}

// ==================== IMPACT PARTICLES ====================
function createImpactParticles(x, y, color = "#ffff00", count = 12) {
    const available = Math.max(0, MAX_PARTICLES - world.impactParticles.length);
    const particleCount = Math.min(count, available);
    for (let i = 0; i < particleCount; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = 2 + Math.random() * 4;
        world.impactParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 3,
            alpha: 1,
            color: color
        });
    }
}

function addFloatingText(textData) {
    if (world.floatingTexts.length >= MAX_FLOATING_TEXTS) world.floatingTexts.shift();
    world.floatingTexts.push(textData);
}

// ==================== REBATIMENTO / PARRY ====================
// Cor do ki depois de rebatido — diferente da cor original (do jogador ou do chefe), pra ficar claro visualmente
// que aquele projétil agora é "seu" e não do dono original.
const PARRY_REFLECT_COLOR = "#fff23f";
const BOSS_SHOT_SCALE = 1.5;   // tamanho dos tiros do vilão em relação ao normal
// Parry que não pega nada deixa um tempo de espera antes do próximo — sem isso, segurar a tecla (repetição
// automática do teclado) ou apertar sem parar rebatia tudo o tempo todo. Parry que acerta não tem espera,
// então rebater golpes seguidos no tempo certo continua valendo.
const PARRY_WHIFF_COOLDOWN = 30;   // quadros (a 60fps) = 0,5s
// Alcance do parry: um círculo bem rente à aura de ki (inclui a cabeça; cresce junto com a aura).
// PARRY_RADIUS é o mínimo (e o valor usado antes da aura ser desenhada pela 1ª vez).
const PARRY_RADIUS = 56;
const PARRY_AURA_MARGIN = 6;
function getParryCircle(p) {
    const forma = p.auraForma;
    if (forma) return { x: p.x + forma.offX, y: p.y + forma.offY, r: Math.max(PARRY_RADIUS, Math.max(forma.rx, forma.ry) + PARRY_AURA_MARGIN) };
    return { x: p.x + p.w / 2, y: p.y + p.h * 0.2, r: PARRY_RADIUS };   // centro na altura do peito do desenho (a arte é maior que a caixa)
}

function tryReflect(target = player, isP2 = false) {
    if (target.parryCooldown > 0) return;
    target.parryHighlightTimer = 10;
    setActionState(target, "parry", 14);
    let reflectedCount = 0;
    const area = getParryCircle(target);

    for (let i = world.obstacles.length - 1; i >= 0; i--) {
        let obs = world.obstacles[i];
        // Alcance do parry é intencionalmente circular (é uma "habilidade", não a hitbox do corpo).
        let dist = Math.hypot(obs.x - area.x, obs.y - area.y);

        if (dist < area.r && obs.fromPlayer === isP2) {
            // Mecânica simples, de volta ao que era: devolve o golpe em linha reta, rumo ao adversário —
            // sem ângulo nenhum, só inverte a direção horizontal.
            const incomingSpeed = Math.hypot(obs.vx, obs.vy) || 4;
            const boost = 1.4;   // rebatido sai mais rápido que veio, senão parece só "devolver fraco"
            obs.vx = (isP2 ? -1 : 1) * incomingSpeed * boost;
            obs.vy = 0;
            obs.fromPlayer = !isP2;
            obs.color = PARRY_REFLECT_COLOR;
            obs.damage = getBuffedAttackDamage(NORMAL_ATTACK_DAMAGE, !isP2 && player.powerBuffTimer > 0);
            reflectedCount++;

            createImpactParticles(obs.x, obs.y, PARRY_REFLECT_COLOR, 10);
        }
    }

    if (reflectedCount === 0) {
        target.parryCooldown = PARRY_WHIFF_COOLDOWN;
    } else {
        playSound("reflect");
        vibrate(45);
        totalReflects += reflectedCount;
        triggerScreenShake(6, 10);
        if (!isP2) {
            runStats.parries += reflectedCount;
            score += reflectedCount;
            bumpStat("reflectsTotal", reflectedCount);

            // Combo de parry (só o jogador humano principal; o alvo tomar dano zera a sequência — ver o bloco
            // de colisão do player). A cada degrau (getParryComboBonus) ganha ki de bônus.
            player.parryCombo = (player.parryCombo || 0) + 1;
            player.parryComboTimer = 90; // ~1.5s sem rebater mais nada também zera o combo
            raiseStat("maxParryCombo", player.parryCombo);
            const bonus = getParryComboBonus(player.parryCombo);
            if (bonus > 0 && bonus !== player.lastParryComboBonus) {
                player.ki = Math.min(player.maxKi, player.ki + bonus);
                player.lastParryComboBonus = bonus;
            }
        }
    }
}

// ==================== ATAQUES ====================
// Flash branco/colorido cobrindo a tela — usado no SUPER ATAQUE (especial + bastão mágico) e no choque de
// feixes, para dar peso visual a um golpe fora do normal. Independente do screen shake (os dois podem somar).
function triggerScreenFlash(color = "#ffffff", duration = 18) {
    screenFlashTimer = duration;
    screenFlashMax = duration;
    screenFlashColor = color;
}

// Zenkai: no VERSUS, a primeira vez que o jogador 1 chegaria a 0 de vida ele ressurge com 1 HP e um instante
// de invulnerabilidade, em vez de perder a rodada — tema clássico Saiyajin de quase-morte. Só uma vez por
// partida. Fora do versus não existe (não faria sentido contra ondas intermináveis de chefes).
function attemptZenkaiRevival() {
    if (gameMode !== "coop" || player.zenkaiUsed) return false;
    player.zenkaiUsed = true;
    bumpStat("zenkaiTotal", 1);
    unlockAchievement("zenkai_first");
    player.hp = 1;
    player.invulnerableTimer = 90;
    triggerScreenFlash("#ffe45a", 30);
    triggerScreenShake(14, 24);
    playSound("powerup");
    vibrate([60, 30, 60, 30, 160]);
    return true;
}

// Mesmo perdendo antes de completar o modo da fase, o jogador vê o que fez na
// tentativa — ataques, rebatidas, itens, golpes recebidos — e o jogo avisa se bateu recorde (da fase ou geral).
function triggerGameOver() {
    if (gameMode === "coop") { finishVersusRound("p2"); return; }   // VERSUS: o jogador 2 venceu a rodada
    const prevGeneralList = readJsonStorage("saiyan_ranking", []);
    const prevGeneralBest = Array.isArray(prevGeneralList) && prevGeneralList.length ? prevGeneralList[0].score : 0;
    const prevStageBest = getStageRecord(selectedStage);

    saveRankingScore(score);
    saveStageRankingScore(selectedStage, score);
    if (score > highScore) {
        highScore = score;
        writeStorage("saiyan_highscore", highScore);
        raiseStat("highScoreEver", highScore);
    }

    const stageInfo = STAGE_PROGRESSION.find(s => s.id === selectedStage);
    gameOverStats = {
        stageName: stageInfo ? stageInfo.name : "",
        score,
        attacks: runStats.attacks,
        parries: runStats.parries,
        hitsReceived: runStats.hitsReceived,
        items: Object.assign({}, runStats.items),
        isNewStageRecord: score > prevStageBest,
        isNewGeneralRecord: score > prevGeneralBest
    };
    setGameState("gameover");
}

// Especial: causa o TRIPLO do dano de antes (getSpecialDamage). isP2 = true só existe no VERSUS:
// o jogador 2 usa o ki dele e o raio vai para a esquerda, acertando o jogador 1.
function triggerSpecialAttack(isP2 = false) {
    const caster = isP2 ? player2 : player;
    const requestedOwner = isP2 ? "p2" : "p1";

    // Choque de feixes: no VERSUS, se o OUTRO jogador já tinha um especial no ar, os dois se encontram no meio
    // em vez de o segundo simplesmente ser ignorado. Fora do versus (ou mesmo dono), continua bloqueando spam.
    if (world.beamActive > 0) {
        if (gameMode === "coop" && world.beamOwner !== requestedOwner && !player2.isDying && canUseSpecial(caster.ki, caster.maxKi)) {
            resolveBeamClash(requestedOwner, caster);
        }
        return;
    }
    if (isP2 && gameMode !== "coop") return;
    if (player2.isDying) return;

    // Especial SÓ com o ki cheio (a barra de ki mostra quanto falta; nada de texto no meio da luta).
    if (!canUseSpecial(caster.ki, caster.maxKi)) {
        return;
    }

    if (!isP2) unlockAchievement("special_first");
    // Bastão mágico ativo na hora do especial = SUPER ATAQUE (dobro do dano), com flash de tela reforçando o poder.
    const hasPowerBuff = !isP2 && player.powerBuffTimer > 0;
    const damage = getSuperAttackDamage(getSpecialDamage(), hasPowerBuff);
    caster.ki = 0;
    world.beamActive = 40;
    world.beamOwner = requestedOwner;
    world.beamIsSuper = hasPowerBuff;
    setActionState(caster, "special", 40);
    if (hasPowerBuff) {
        triggerScreenFlash("#fff3b0", 26);
        bumpStat("superAttacksTotal", 1);
    }

    const casterChar = characterDB[isP2 ? selectedBoss : selectedCharacter];
    world.currentBeamType = casterChar ? (casterChar.special || "KAMEHAMEHA") : "KAMEHAMEHA";
    // o poder do especial destrói o Saibaman/Cell Jr. agarrado nas pernas (sem tirar vida do herói)
    if (!isP2) destruirSaibamansAgarrados();

    playSound("super");
    triggerScreenShake(12, 30);
    vibrate([80, 40, 160]);
    world.obstacles = [];

    if (!isP2) {
        player2.hp -= damage;
        player2.hitTimer = 25;

        if (player2.hp <= 0) {
            score += 3;
            if (gameMode === "coop") advanceWave();
            else handleStageModeProgression();
        }
    } else if (player.invulnerableTimer === 0) {
        if (player.shield) {
            player.shield = false;
            playSound("reflect");
        } else {
            player.hp -= damage;
            runStats.hitsReceived++;
            takenDamageInRun = true;
            player.parryCombo = 0;
            player.parryComboTimer = 0;
            player.lastParryComboBonus = 0;
            if (player.hp <= 0 && !attemptZenkaiRevival()) triggerGameOver();
        }
        player.invulnerableTimer = 30;
    }
}

// Choque de feixes: os dois especiais se encontram no meio e viram uma disputa de apertar o ATAQUE — dura
// CLASH_MASH_DURATION quadros (ver registerClashMash, chamado pelo triggerAction). Quem aperta mais vezes
// empurra o ponto de encontro pro lado do adversário; o dano só é aplicado quando a janela se fecha
// (resolveClashDamage), pra dar tempo de verdade pra "quem aperta mais rápido vence" valer.
function resolveBeamClash(newOwner, newCaster) {
    newCaster.ki = 0;
    world.beamActive = CLASH_MASH_DURATION;
    world.beamOwner = "clash";
    world.beamClashPush = 0;
    world.clashMashP1 = 0;
    world.clashMashP2 = 0;
    world.clashResolved = false;
    bumpStat("beamClashesTotal", 1);
    world.currentBeamType = "CHOQUE DE FEIXES";
    playSound("super");
    triggerScreenShake(10, 20);
    triggerScreenFlash("#ffffff", 18);
    vibrate([90, 40, 90]);
}

// Chamado pelo triggerAction quando o ATAQUE é apertado DURANTE um choque de feixes em andamento — em vez de
// atirar, esse toque conta um ponto na disputa e empurra o choque em tempo real (feedback imediato).
function registerClashMash(isP2) {
    if (world.beamOwner !== "clash" || world.beamActive <= 0) return false;
    if (isP2) world.clashMashP2 = (world.clashMashP2 || 0) + 1;
    else world.clashMashP1 = (world.clashMashP1 || 0) + 1;
    world.beamClashPush = getBeamClashPush(world.clashMashP1, world.clashMashP2);
    playSound("shoot");
    return true;
}

// Fecha a janela do choque (chamado pelo update() quando beamActive chega a 0 com beamOwner "clash") e aplica
// o dano dos dois lados de acordo com quem empurrou mais o choque a seu favor.
function resolveClashDamage() {
    if (world.clashResolved) return;
    world.clashResolved = true;
    const push = world.beamClashPush || 0;
    const base = getSpecialDamage();
    const p1Dmg = Math.max(1, Math.round(base * (0.35 + 0.65 * Math.max(0, -push))));
    const p2Dmg = Math.max(1, Math.round(base * (0.35 + 0.65 * Math.max(0, push))));
    // push>0 (a favor de p1, ou seja, p1 apertou mais) machuca mais o p2, e vice-versa — mesmo quem "ganhou"
    // a disputa leva um pouco de dano (a explosão do meio não poupa ninguém).
    triggerScreenShake(16, 22);
    const roundBefore = world.versusRound;
    if (player.invulnerableTimer === 0) {
        if (player.shield) { player.shield = false; playSound("reflect"); }
        else {
            player.hp -= p1Dmg;
            runStats.hitsReceived++;
            takenDamageInRun = true;
            player.parryCombo = 0;
            player.parryComboTimer = 0;
            player.lastParryComboBonus = 0;
            if (player.hp <= 0 && !attemptZenkaiRevival()) triggerGameOver();
        }
        player.invulnerableTimer = 30;
    }
    // se o jogador 1 caiu aqui, a rodada já acabou e a próxima começou: o dano do rival não passa para ela
    if (world.versusRound !== roundBefore || gameState !== "playing") return;
    player2.hp -= p2Dmg;
    player2.hitTimer = 20;
    if (player2.hp <= 0) { score += 3; advanceWave(); }
}

function fireKiBarrage(p, isP2 = false, withPose = true) {
    if (!isP2) runStats.attacks++;
    if (withPose) setActionState(p, "attackKi", 18);
    let color = isP2 ? "#ff0055" : "#00ffff";
    let dir = isP2 ? -1 : 1;
    let startX = isP2 ? p.x - 10 : p.x + p.w + 10;
    
    if (world.obstacles.length < MAX_OBSTACLES) {
        world.obstacles.push({
            x: startX,
            y: p.y + p.h / 2 + (Math.random() - 0.5) * 20,
            radius: 8,
            vx: dir * 7,
            vy: (Math.random() - 0.5) * 2,
            isHoming: false,
            color: color,
            fromPlayer: !isP2,
            damage: getBuffedAttackDamage(NORMAL_ATTACK_DAMAGE, !isP2 && p.powerBuffTimer > 0)
        });
    }
    playSound("shoot");
}

// ==================== IA DO BOSS ====================
// BOSS_ATTACK_PATTERNS, getAvailableBossPatterns e shuffleArray agora vivem
// em game-logic-core.js. Padrões desbloqueados progressivamente por wave,
// para o boss não parecer "sempre igual" mesmo quando só HP/velocidade escalam.

// "Saco" embaralhado: garante que todo padrão disponível apareça com frequência
// regular, em vez de deixar o RNG puro repetir o mesmo ataque várias vezes seguidas.
let bossPatternBag = [];
let bossPatternBagWave = 0;

function getNextBossPattern(wave) {
    let available = getAvailableBossPatterns(wave);
    if (bossPatternBag.length === 0 || bossPatternBagWave !== wave) {
        bossPatternBag = shuffleArray([...available, ...available]);
        bossPatternBagWave = wave;
    }
    return bossPatternBag.pop();
}

function spawnBossAttack() {
    if (player2.isDying || world.obstacles.length >= MAX_OBSTACLES) return;
    let waveParams = getWaveParams(waveNumber);
    let bChar = characterDB[selectedBoss];
    let customColor = bChar ? (bChar.projColor || "#00ffff") : "#00ffff";
    let baseRadius = 12;

    if (bChar && bChar.projSize === "small") baseRadius = 8;
    if (bChar && bChar.projSize === "large") baseRadius = 16;
    // a bola de poder do vilão é 50% maior que o tiro comum do herói (destaca na tela)
    baseRadius *= BOSS_SHOT_SCALE;

    playSound("shoot");

    let pattern = getNextBossPattern(waveNumber);

    if (pattern === BOSS_ATTACK_PATTERNS.HOMING) {
        world.obstacles.push({
            x: player2.x - 10,
            y: player2.y + player2.h / 2,
            radius: baseRadius + 2,
            vx: -4 * waveParams.speedMult,
            vy: 0,
            isHoming: true,
            color: customColor,
            fromPlayer: false
        });
    } else if (pattern === BOSS_ATTACK_PATTERNS.TRIPLE) {
        [-1.8, 0, 1.8].forEach(vy => {
            if (world.obstacles.length < MAX_OBSTACLES) {
                world.obstacles.push({
                    x: player2.x - 10,
                    y: player2.y + player2.h / 2,
                    radius: baseRadius,
                    vx: -5 * waveParams.speedMult,
                    vy: vy,
                    isHoming: false,
                    color: customColor,
                    fromPlayer: false
                });
            }
        });
    } else if (pattern === BOSS_ATTACK_PATTERNS.SPREAD5) {
        [-3, -1.5, 0, 1.5, 3].forEach(vy => {
            if (world.obstacles.length < MAX_OBSTACLES) {
                world.obstacles.push({
                    x: player2.x - 10,
                    y: player2.y + player2.h / 2,
                    radius: baseRadius - 2,
                    vx: -4.5 * waveParams.speedMult,
                    vy: vy,
                    isHoming: false,
                    color: customColor,
                    fromPlayer: false
                });
            }
        });
    } else if (pattern === BOSS_ATTACK_PATTERNS.PINCER) {
        // Dois projéteis convergindo de cima e de baixo ao mesmo tempo — obriga a esquivar na diagonal,
        // não só andar pro lado.
        [-1, 1].forEach(side => {
            if (world.obstacles.length < MAX_OBSTACLES) {
                world.obstacles.push({
                    x: player2.x - 10,
                    y: player2.y + player2.h / 2 + side * 90,
                    radius: baseRadius,
                    vx: -5 * waveParams.speedMult,
                    vy: -side * 1.6,
                    isHoming: false,
                    color: customColor,
                    fromPlayer: false
                });
            }
        });
    } else if (pattern === BOSS_ATTACK_PATTERNS.BURST8) {
        // Rajada circular ao redor do chefe: lenta, mas cobre a tela toda — pressiona quem fica parado carregando.
        for (let k = 0; k < 8; k++) {
            if (world.obstacles.length >= MAX_OBSTACLES) break;
            const ang = (k / 8) * Math.PI * 2;
            world.obstacles.push({
                x: player2.x + player2.w / 2,
                y: player2.y + player2.h / 2,
                radius: baseRadius - 3,
                vx: Math.cos(ang) * 3.2 * waveParams.speedMult,
                vy: Math.sin(ang) * 3.2 * waveParams.speedMult,
                isHoming: false,
                color: customColor,
                fromPlayer: false
            });
        }
    } else {
        world.obstacles.push({
            x: player2.x - 10,
            y: player2.y + player2.h / 2,
            radius: baseRadius,
            vx: -(5.5 + Math.min(4, score * 0.2)) * waveParams.speedMult,
            vy: 0,
            isHoming: false,
            color: customColor,
            fromPlayer: false
        });
    }
}

// ==================== UPDATE COM DELTATIME ====================
// Conquistas verificadas continuamente (ondas, pontuação, arenas liberadas, sobrevivência sem dano). Cada
// unlockAchievement já ignora se a conquista já estiver destravada, então checar todo quadro é barato e simples.
function checkRunMilestones() {
    if (waveNumber >= 5) unlockAchievement("wave_5");
    if (waveNumber >= 10) unlockAchievement("wave_10");
    if (waveNumber >= 15) unlockAchievement("wave_15");
    if (waveNumber >= 20) unlockAchievement("wave_20");
    if (waveNumber >= 25) unlockAchievement("wave_25");
    if (score >= 10) unlockAchievement("score_10");
    if (score >= 50) unlockAchievement("score_50");
    if (score >= 100) unlockAchievement("score_100");
    if (!takenDamageInRun && waveNumber >= 5) unlockAchievement("untouchable_wave5");
    // A 1ª fase já começa aberta: a conquista dela é vencer o modo NORMAL (ver resolveStageVictory), não "liberar".
    STAGE_PROGRESSION.forEach(stg => { if (stg.id !== STAGE_PROGRESSION[0].id && isStageUnlockedByProgress(stg.id, stageProgress)) unlockAchievement("stage_" + stg.id); });
}

function update(dt) {
    if (gameState !== "playing") return;

    checkRunMilestones();

    world.stageScrollX += 1.5 * (dt * 60);

    player.animTimer += dt;
    player2.animTimer += dt;

    if (player.invulnerableTimer > 0) player.invulnerableTimer = Math.max(0, player.invulnerableTimer - dt * 60);
    if (player.speedBuffTimer > 0) player.speedBuffTimer = Math.max(0, player.speedBuffTimer - dt * 60);
    if (player.powerBuffTimer > 0) player.powerBuffTimer = Math.max(0, player.powerBuffTimer - dt * 60);
    updateTransformPower(player, false, dt);
    updateTransformPower(player2, true, dt);
    if (screenFlashTimer > 0) screenFlashTimer = Math.max(0, screenFlashTimer - dt * 60);
    if (player.parryComboTimer > 0) {
        player.parryComboTimer = Math.max(0, player.parryComboTimer - dt * 60);
        if (player.parryComboTimer === 0) { player.parryCombo = 0; player.lastParryComboBonus = 0; }
    }
    if (player.hp < world.lastPlayerHp) vibrate(140); // levou dano
    world.lastPlayerHp = player.hp;
    if (player.parryHighlightTimer > 0) player.parryHighlightTimer -= dt * 60;
    if (player2.parryHighlightTimer > 0) player2.parryHighlightTimer -= dt * 60;
    if (player.parryCooldown > 0) player.parryCooldown = Math.max(0, player.parryCooldown - dt * 60);
    if (player2.parryCooldown > 0) player2.parryCooldown = Math.max(0, player2.parryCooldown - dt * 60);
    if (player2.hitTimer > 0) player2.hitTimer = Math.max(0, player2.hitTimer - dt * 60);
    if (world.beamActive > 0) {
        world.beamActive = Math.max(0, world.beamActive - dt * 60);
        if (world.beamActive === 0 && world.beamOwner === "clash") resolveClashDamage();
    }
    player.actionTimer = Math.max(0, (player.actionTimer || 0) - dt * 60);
    player2.actionTimer = Math.max(0, (player2.actionTimer || 0) - dt * 60);

    for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
        let ft = world.floatingTexts[i];
        ft.y -= 1 * dt * 60;
        ft.alpha -= 0.02 * dt * 60;
        if (ft.alpha <= 0) world.floatingTexts.splice(i, 1);
    }

    for (let i = world.impactParticles.length - 1; i >= 0; i--) {
        let p = world.impactParticles[i];
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.alpha -= 0.04 * dt * 60;

        if (p.alpha <= 0 || p.x < -20 || p.x > canvas.width + 20 || p.y < -20 || p.y > canvas.height + 20) {
            world.impactParticles.splice(i, 1);
        }
    }

    // itens só servem ao jogador 1: no VERSUS não aparecem (os dois lutam nas mesmas condições)
    if (gameMode !== "coop") world.pickupSpawnTimer += dt * 60;
    if (world.pickupSpawnTimer >= SPAWN_TIMERS.PICKUP_FRAMES) {
        world.pickupSpawnTimer = 0;
        spawnPickup();
    }

    for (let i = world.pickups.length - 1; i >= 0; i--) {
        let pickup = world.pickups[i];
        pickup.y += pickup.vy * dt * 60;
        pickup.spin += 0.04 * dt * 60;
        pickup.pulse += 0.08 * dt * 60;

        let overlapsPlayer = pickup.x < player.x + player.w &&
            pickup.x + pickup.w > player.x &&
            pickup.y < player.y + player.h &&
            pickup.y + pickup.h > player.y;

        if (overlapsPlayer) {
            const PICKUP_COLORS = { senzu: "#9cff57", capsule: "#62eaff", cloud: "#fff4c2", staff: "#ff9d3d" };
            if (pickup.type === "senzu") {
                player.hp = Math.min(player.maxHp, player.hp + 1);
                addFloatingText({ icon: "senzu", x: player.x + player.w / 2, y: player.y - 14, alpha: 1 });
            } else if (pickup.type === "capsule") {
                player.shield = true;
                addFloatingText({ icon: "capsule", x: player.x + player.w / 2, y: player.y - 14, alpha: 1 });
            } else if (pickup.type === "cloud") {
                // Nuvem voadora: velocidade de movimento aumentada por um tempo (empilha a duração, não o efeito).
                player.speedBuffTimer = Math.min(PICKUP_BUFF_MAX_DURATION, player.speedBuffTimer + PICKUP_BUFF_DURATION);
                addFloatingText({ icon: "cloud", x: player.x + player.w / 2, y: player.y - 14, alpha: 1 });
            } else {
                // Bastão mágico: força no ataque normal; se estiver ativo quando o especial sair, vira SUPER ATAQUE.
                player.powerBuffTimer = Math.min(PICKUP_BUFF_MAX_DURATION, player.powerBuffTimer + PICKUP_BUFF_DURATION);
                addFloatingText({ icon: "staff", x: player.x + player.w / 2, y: player.y - 14, alpha: 1 });
            }
            playSound("powerup");
            createImpactParticles(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, PICKUP_COLORS[pickup.type], 16);
            pickupTypesThisRun.add(pickup.type);
            bumpStat(pickup.type === "senzu" ? "pickupsSenzu" : pickup.type === "capsule" ? "pickupsCapsule" : pickup.type === "cloud" ? "pickupsCloud" : "pickupsStaff", 1);
            if (runStats.items[pickup.type] !== undefined) runStats.items[pickup.type]++;
            if (pickupTypesThisRun.size >= 4) unlockAchievement("item_all_types");
            world.pickups.splice(i, 1);
            continue;
        }

        if (pickup.y > canvas.height + 30) world.pickups.splice(i, 1);
    }

    for (let i = world.obstacles.length - 1; i >= 0; i--) {
        let obs = world.obstacles[i];
        let hitSomething = false;

        if (obs.isHoming && !obs.fromPlayer) {
            let targetY = player.y + player.h / 2;
            if (obs.y < targetY) obs.vy += 0.15 * dt * 60;
            else if (obs.y > targetY) obs.vy -= 0.15 * dt * 60;
        }

        obs.x += obs.vx * dt * 60;
        obs.y += obs.vy * dt * 60;

        if (obs.fromPlayer) {
            for (let j = world.saibamans.length - 1; j >= 0; j--) {
                let s = world.saibamans[j];
                // agarrado nas pernas ele não pode mais ser derrubado: a explosão é certa
                if (isSaibamanActive(s) && s.phase !== "agarrar" && circleHitsEntity(obs.x, obs.y, obs.radius, s)) {
                    s.hp--;
                    createImpactParticles(obs.x, obs.y, obs.color, 10);
                    playSound("hit");
                    
                    if (s.hp <= 0) {
                        score += 1;
                        world.saibamans.splice(j, 1);
                        bumpStat("saibamansDefeated", 1);
                    }

                    world.obstacles.splice(i, 1);
                    hitSomething = true;
                    break;
                }
            }
        }

        if (hitSomething) continue;

        if (!obs.fromPlayer) {
            if (circleHitsEntity(obs.x, obs.y, obs.radius, player)) {
                if (player.invulnerableTimer === 0) {
                    if (player.shield) {
                        player.shield = false;
                        playSound("reflect");
                    } else {
                        player.hp--;
                        runStats.hitsReceived++;
                        playSound("hit");
                        takenDamageInRun = true;
                        player.parryCombo = 0;
                        player.parryComboTimer = 0;
                        player.lastParryComboBonus = 0;
                        triggerScreenShake(8, 15);

                        if (player.hp <= 0 && !attemptZenkaiRevival()) {
                            triggerGameOver();
                        }
                    }
                    player.invulnerableTimer = 30;
                }
                createImpactParticles(obs.x, obs.y, obs.color, 12);
                world.obstacles.splice(i, 1);
                continue;
            }
        }

        if (obs.fromPlayer && !player2.isDying) {
            if (circleHitsEntity(obs.x, obs.y, obs.radius, player2)) {
                player2.hp -= (obs.damage || NORMAL_ATTACK_DAMAGE);
                player2.hitTimer = 15;
                playSound("hit");
                createImpactParticles(obs.x, obs.y, obs.color, 15);

                if (player2.hp <= 0) {
                    score += 5;
                    if (gameMode === "coop") advanceWave();
                    else handleStageModeProgression();
                }
                world.obstacles.splice(i, 1);
                continue;
            }
        }

        if (obs.x < -50 || obs.x > canvas.width + 50 || obs.y < -50 || obs.y > canvas.height + 50) {
            world.obstacles.splice(i, 1);
        }
    }

    // VERSUS é só um contra o outro, nas mesmas condições: sem Saibamans/Cell Jr.
    if (gameMode !== "coop") world.saibamanSpawnTimer += dt * 60;
    if (world.saibamanSpawnTimer > SPAWN_TIMERS.SAIBAMAN_FRAMES) {
        world.saibamanSpawnTimer = 0;
        spawnSaibaman();
    }

    const someoneGrabbing = world.saibamans.some(s => s.phase === "agarrar");
    for (let i = world.saibamans.length - 1; i >= 0; i--) {
        let s = world.saibamans[i];
        if (s.phase === "agarrar") {
            // fica grudado nas pernas do herói, pela frente, enquanto a contagem corre
            s.x = player.x + s.grabOffsetX;
            s.y = player.y + s.grabOffsetY;
            if (player.isCharging || player.parryHighlightTimer > 0) {
                // carregar o ki joga o Saibaman para trás; ele solta e pode ser destruído antes de voltar.
                // PARRY joga com força para a frente: se acertar o vilão, explode nele (ver abaixo)
                throwSaibaman(s, player.parryHighlightTimer > 0);
                continue;
            }
            s.grabTimer -= dt * 60;
            if (s.grabTimer <= 0) {
                world.saibamans.splice(i, 1);
                explodeSaibaman(s);
            }
            continue;
        }
        // passou perto do herói: parte para cima dele (mira nas pernas)
        const alvoX = player.x + player.w / 2, alvoY = player.y + player.h * 0.7;
        const podeAgarrar = !someoneGrabbing && player.invulnerableTimer === 0;
        if (s.phase === "investir") {
            if (podeAgarrar) stepSaibamanLunge(s, alvoX, alvoY, dt);
            else { s.phase = "voar"; s.phaseTime = 0; }
        } else if (podeAgarrar && shouldSaibamanLunge(s, alvoX, alvoY)) {
            s.phase = "investir";
            s.phaseTime = 0;
        } else {
            stepSaibamanMotion(s, dt);
        }

        // lançado pelo parry: bateu no vilão, explode nele e tira 1 de vida
        if (s.phase === "arremessado" && s.lancadoParry && !player2.isDying && player2.x < canvas.width &&
            rectsOverlap(getHitboxRect(s), getHitboxRect(player2))) {
            world.saibamans.splice(i, 1);
            explosaoDeSaibaman(s);
            player2.hp -= 1;
            player2.hitTimer = 15;
            if (player2.hp <= 0) {
                score += 5;
                handleStageModeProgression();
            }
            continue;
        }

        if (isSaibamanActive(s) && s.phase !== "arremessado" && podeAgarrar &&
            rectsOverlap(getHitboxRect(s), getHitboxRect(player))) {
            s.phase = "agarrar";
            s.grabTimer = SAIBAMAN_GRAB_FRAMES;
            // na frente do herói, na altura das pernas (os braços dele ficam livres)
            // (o desenho do herói é maior que a caixa, com os pés perto da base: braços do Saibaman nas canelas/joelhos)
            s.grabOffsetX = player.w * 0.46;
            s.grabOffsetY = player.h * 0.25;
            continue;
        }

        if (s.x < -30) world.saibamans.splice(i, 1);
    }

    for (let i = world.blasts.length - 1; i >= 0; i--) {
        const b = world.blasts[i];
        b.life -= 0.06 * dt * 60;
        b.r += (b.maxR - b.r) * Math.min(1, 0.3 * dt * 60);
        if (b.life <= 0) world.blasts.splice(i, 1);
    }

    // MAPEAMENTO DAS ANIMAÇÕES DE ACORDO COM O MOVIMENTO E AÇÕES
    let moveX = 0, moveY = 0;
    let pointerDx = 0, pointerDy = 0; // delta real usado apenas para escolher a animação de direção
    // O modo "mouse" só vale enquanto o último input foi de mouse; no celular o toque manda.
    const followMouse = pcInputMode === "mouse" && !lastInputWasTouch;

    if (!followMouse) {
        let keyX = 0, keyY = 0;
        if (keysPressed[keyBindings.p1.up]) keyY -= 1;
        if (keysPressed[keyBindings.p1.down]) keyY += 1;
        if (keysPressed[keyBindings.p1.left]) keyX -= 1;
        if (keysPressed[keyBindings.p1.right]) keyX += 1;
        if (keyX !== 0 && keyY !== 0) {
            keyX *= Math.SQRT1_2;
            keyY *= Math.SQRT1_2;
        }
        const effectiveSpeed = player.speed * (player.speedBuffTimer > 0 ? CLOUD_SPEED_MULTIPLIER : 1);
        moveX = keyX * effectiveSpeed * dt * 60;
        moveY = keyY * effectiveSpeed * dt * 60;

        // Analógico virtual: vetor de -1 a 1 (quanto mais longe o dedo, mais rápido).
        if (touchAnalog.active) {
            moveX += touchAnalog.vx * effectiveSpeed * dt * 60;
            moveY += touchAnalog.vy * effectiveSpeed * dt * 60;
        }
        pointerDx = moveX;
        pointerDy = moveY;

        // Deslizar: o movimento é aplicado direto no touchmove; aqui só decai o valor para escolher a animação.
        if (touchSwipe.active) {
            touchMoveX *= 0.6;
            touchMoveY *= 0.6;
            if (Math.abs(touchMoveX) < 0.3) touchMoveX = 0;
            if (Math.abs(touchMoveY) < 0.3) touchMoveY = 0;
            pointerDx += touchMoveX;
            pointerDy += touchMoveY;
        }
    } else {
        const targetDeltaX = mouseX - (player.x + player.w / 2);
        const targetDeltaY = mouseY - (player.y + player.h / 2);
        moveX = Math.abs(targetDeltaX) > 3 ? Math.sign(targetDeltaX) : 0;
        moveY = Math.abs(targetDeltaY) > 3 ? Math.sign(targetDeltaY) : 0;
        pointerDx = targetDeltaX;
        pointerDy = targetDeltaY;
    }
    const actionDeadzone = followMouse ? 3 : (touchSwipe.active ? 0.3 : 0);

    let isChargeBoundToMouse = keyBindings.p1.charge.startsWith("Mouse");
    let mouseChargePressed = isChargeBoundToMouse && mouseButtonsPressed[keyBindings.p1.charge];
    // touchChargeId !== null = dedo segurando o botão CARREGAR (antes era sobrescrito para false todo frame).
    player.isCharging = !!keysPressed[keyBindings.p1.charge] || mouseChargePressed || touchChargeId !== null;

    // Tiro contínuo (touch): enquanto o dedo estiver APOIADO no analógico (ou na tela, no modo deslizar) o
    // personagem atira sem parar, mesmo sem mexer o dedo. O botão ATAQUE continua sendo 1 tiro por toque.
    // Pausa durante carga, parry e raio especial para não atrapalhar essas ações.
    if (touchAutoFire && (touchAnalog.active || touchSwipe.active)) {
        touchAttackCooldown -= dt * 60;
        if (touchAttackCooldown <= 0 && !player.isCharging && player.parryHighlightTimer <= 0 && world.beamActive <= 0) {
            // Movendo: mantém a animação de voo (só faz a pose de ataque quando está parado).
            const movingNow = Math.hypot(touchAnalog.vx, touchAnalog.vy) > 0.05 || Math.abs(touchMoveX) + Math.abs(touchMoveY) >= 0.3;
            fireKiBarrage(player, false, !movingNow);
            touchAttackCooldown = TOUCH_AUTOFIRE_INTERVAL;
        }
    } else {
        touchAttackCooldown = 0;
    }
    if (player.parryHighlightTimer > 0) {
        player.actionState = "parry";
    } else if (world.beamActive > 0 && world.beamOwner !== "p2") {
        player.actionState = "special";
    } else if (player.isCharging) {
        player.actionState = "chargeKi";
    } else if (player.actionTimer > 0 && ["attackKi", "transform", "special"].includes(player.actionState)) {
        // Keep action animations visible while their gameplay effect is active.
    } else {
        player.actionState = getDominantMoveAction(pointerDx, pointerDy, actionDeadzone) || "idle";
    }

    if (player2.hitTimer > 0) {
        player2.actionState = "hit";
    } else if (player2.isCharging) {
        player2.actionState = "chargeKi";
    } else if (player2.actionTimer <= 0 && ["attackKi", "transform", "parry", "special"].includes(player2.actionState)) {
        player2.actionState = "idle";
    }

    if (score >= UNTOUCHABLE_ACHIEVEMENT_SCORE && !takenDamageInRun) {
        unlockAchievement("untouchable");
    }

    let pChar = characterDB[selectedCharacter];
    [player.w, player.h] = getFighterBoxSize(selectedCharacter);

    let bChar = characterDB[selectedBoss];
    [player2.w, player2.h] = getFighterBoxSize(selectedBoss);


    if (player.isCharging) {
        player.ki = Math.min(player.maxKi, player.ki + (0.8 * dt * 60));

        if (player.ki >= player.maxKi && player.ki - (0.8 * dt * 60) < player.maxKi) {
            playSound("max_ki");
        }

        if (Math.random() < 0.2) playSound("charge");
        triggerScreenShake(2, 2);
    } else {
        if (followMouse) {
            let targetX = mouseX - player.w / 2;
            let targetY = mouseY - player.h / 2;
            
            let lerpFactor = 1 - Math.exp(-18 * dt);
            player.x += (targetX - player.x) * lerpFactor;
            player.y += (targetY - player.y) * lerpFactor;
        } else {
            player.x += moveX;
            player.y += moveY;
        }

        player.x = Math.max(BOUNDS.PLAYER_MIN_X, Math.min(getPlayer1MaxX(), player.x));
        player.y = Math.max(BOUNDS.PLAYER_MIN_Y, Math.min(BOUNDS.PLAYER_MAX_Y_BASE - (player.h - 56), player.y));
    }

    if (gameMode === "coop" && !player2.isDying) {
        let player2MoveX = 0;
        let player2MoveY = 0;
        if (keysPressed[keyBindings.p2.up]) player2.y -= 4 * dt * 60;
        if (keysPressed[keyBindings.p2.up]) player2MoveY -= 1;
        if (keysPressed[keyBindings.p2.down]) player2.y += 4 * dt * 60;
        if (keysPressed[keyBindings.p2.down]) player2MoveY += 1;
        if (keysPressed[keyBindings.p2.left]) player2.x -= 4 * dt * 60;
        if (keysPressed[keyBindings.p2.left]) player2MoveX -= 1;
        if (keysPressed[keyBindings.p2.right]) player2.x += 4 * dt * 60;
        if (keysPressed[keyBindings.p2.right]) player2MoveX += 1;
        if (player2MoveX !== 0 && player2MoveY !== 0) {
            const diagonalScale = Math.SQRT1_2;
            player2.x -= player2MoveX * 4 * dt * 60 * (1 - diagonalScale);
            player2.y -= player2MoveY * 4 * dt * 60 * (1 - diagonalScale);
            player2MoveX *= diagonalScale;
            player2MoveY *= diagonalScale;
        }

        if (player2.hitTimer <= 0 && player2.actionTimer <= 0 && !player2.isCharging) {
            player2.actionState = getDominantMoveAction(player2MoveX, player2MoveY) || "idle";
            if (player2MoveX === 0 && player2MoveY === 0 && ["attackKi", "transform", "parry", "special"].includes(player2.actionState)) {
                player2.actionState = "idle";
            }
        }

        player2.x = Math.max(getPlayer2MinX(), Math.min(canvas.width - player2.w - BOUNDS.PLAYER2_RIGHT_MARGIN, player2.x));
        player2.y = Math.max(BOUNDS.PLAYER_MIN_Y, Math.min(BOUNDS.PLAYER_MAX_Y_BASE - (player2.h - 56), player2.y));
    }

    player2.isCharging = gameMode === "coop" && !!keysPressed[keyBindings.p2.charge];
    if (player2.isCharging) {
        player2.ki = Math.min(player2.maxKi, player2.ki + (0.8 * dt * 60));
    }

    // Fora do versus, o vilão acumula ki sozinho a partir da onda 3 e, como o herói, sobe um nível da sua lista
    // de transformações (do editor) cada vez que o ki enche, até a última.
    if (gameMode !== "coop" && !player2.isDying && waveNumber >= 3 &&
        getTransformLevel(player2) < getCharacterTransformations(selectedBoss).length) {
        player2.ki = Math.min(player2.maxKi, player2.ki + (0.35 * dt * 60));
        if (player2.ki >= player2.maxKi && transformPlayer(player2, true, true)) player2.ki = 0;
    }

    player.hoverTime += 0.05 * dt * 60;
    player2.hoverTime += 0.05 * dt * 60;

    if (player2.isDying) {
        player2.x += player2.dyingspeedX * dt * 60;
        player2.y += Math.sin(player2.hoverTime * 5) * 3 * dt * 60;
        if (player2.x > canvas.width + 120) {
            respawnBoss();
        }
    } else if (gameMode !== "coop" && player2.x > 680) {
        player2.x -= 3 * dt * 60;
    } else if (gameMode !== "coop") {
        let waveParams = getWaveParams(waveNumber);
        stepVilaoPatrulha(player2, dt * 60, waveParams.speedMult * 0.8);

        player2.shootTimer += dt * 60;
        if (player2.shootTimer >= waveParams.shootFreq) {
            player2.shootTimer = 0;
            spawnBossAttack();
        }
    }
}