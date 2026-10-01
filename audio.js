// ==================== AUDIO.JS - SÍNTESE DE SOM E MÚSICA ====================
// Extraído de database.js. Usa Web Audio API pura (sem assets externos).
// Depende de `gameState` (definida em database.js) só dentro do loop do BGM,
// então pode ser carregado antes ou depois de database.js sem problema,
// mas por clareza carregamos junto com storage.js/progress.js no início.

// ==================== ÁUDIO CANAIS E VOLUMES ====================
let audioCtx = null;
let sfxVolume = 0.5;
let bgmVolume = 0.5;
let isMuted = false;
let bgmInterval = null, bgmStep = 0;

// ==================== ÁUDIO SYNTH ====================
function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API não suportada:", e);
            return false;
        }
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(e => console.warn("Não foi possível resumir áudio:", e));
    }
    return true;
}

function startBGM() {
    stopBGM();
    if (isMuted || bgmVolume <= 0 || !audioCtx) return;

    const notes = [220, 261.63, 293.66, 329.63, 392.00, 329.63, 293.66, 261.63];
    bgmStep = 0;

    bgmInterval = setInterval(() => {
        if (!audioCtx || isMuted || gameState !== "playing") return;
        try {
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            
            osc.type = "square";
            osc.frequency.setValueAtTime(notes[bgmStep % notes.length], audioCtx.currentTime);
            gain.gain.setValueAtTime(0.04 * bgmVolume, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.18);
            bgmStep++;
        } catch (e) {
            console.warn("Erro ao tocar BGM:", e.message);
        }
    }, 200);
}

function stopBGM() {
    if (bgmInterval) {
        clearInterval(bgmInterval);
        bgmInterval = null;
    }
}

function playSound(type) {
    if (!audioCtx || isMuted || sfxVolume <= 0) return;
    try {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        let now = audioCtx.currentTime;
        let vol = sfxVolume;
        let duration = 0.2;

        if (type === "shoot") {
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gain.gain.setValueAtTime(0.2 * vol, now);
            gain.gain.linearRampToValueAtTime(0.01 * vol, now + 0.15);
            duration = 0.15;
        } else if (type === "reflect") {
            osc.type = "square";
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
            gain.gain.setValueAtTime(0.3 * vol, now);
            gain.gain.linearRampToValueAtTime(0.01 * vol, now + 0.1);
            duration = 0.1;
        } else if (type === "super") {
            osc.type = "triangle";
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.6);
            gain.gain.setValueAtTime(0.4 * vol, now);
            gain.gain.linearRampToValueAtTime(0.01 * vol, now + 0.6);
            duration = 0.6;
        } else if (type === "hit") {
            osc.type = "square";
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.linearRampToValueAtTime(40, now + 0.2);
            gain.gain.setValueAtTime(0.4 * vol, now);
            gain.gain.linearRampToValueAtTime(0.01 * vol, now + 0.2);
            duration = 0.2;
        } else if (type === "powerup" || type === "charge") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
            gain.gain.setValueAtTime(0.2 * vol, now);
            gain.gain.linearRampToValueAtTime(0.01 * vol, now + 0.2);
            duration = 0.2;
        } else if (type === "max_ki") {
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(900, now + 0.4);
            gain.gain.setValueAtTime(0.3 * vol, now);
            gain.gain.linearRampToValueAtTime(0.01 * vol, now + 0.4);
            duration = 0.4;
        } else if (type === "transform") {
            osc.type = "triangle";
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.8);
            gain.gain.setValueAtTime(0.5 * vol, now);
            gain.gain.linearRampToValueAtTime(0.01 * vol, now + 0.8);
            duration = 0.8;
        } else if (type === "menu") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
            gain.gain.setValueAtTime(0.15 * vol, now);
            gain.gain.linearRampToValueAtTime(0.01 * vol, now + 0.08);
            duration = 0.08;
        }

        osc.start(now);
        osc.stop(now + duration);
    } catch (e) {
        console.warn(`Erro ao tocar som "${type}":`, e.message);
    }
}

// Liga o som no primeiro toque/tecla em qualquer lugar (o navegador só deixa criar o áudio depois de uma interação).
// Criar o áudio pela primeira vez é lento no celular: se ficasse para o começo da luta, o primeiro segundo engasgava.
if (typeof document !== "undefined" && document.addEventListener) {
    const AUDIO_UNLOCK_EVENTS = ["pointerdown", "touchstart", "keydown"];
    const ligarAudio = () => {
        initAudio();
        AUDIO_UNLOCK_EVENTS.forEach(t => document.removeEventListener(t, ligarAudio, true));
    };
    AUDIO_UNLOCK_EVENTS.forEach(t => document.addEventListener(t, ligarAudio, { capture: true, passive: true }));
}
