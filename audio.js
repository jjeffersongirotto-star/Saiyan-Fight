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

// ==================== MÚSICAS DAS FASES ====================
// Cada fase toca um tema no clima de uma época do anime (clássico, saga Freeza, saga Boo, GT) — escolhido por
// getStageMusicEra (game-logic-core.js). São composições originais feitas aqui (melodia + baixo + bateria
// sintetizados); as músicas oficiais da série têm direitos autorais e não podem ser copiadas.
// Notas em MIDI, uma por colcheia; null = pausa. 4 compassos que se repetem.
const BGM_THEMES = (() => {
const _ = null;
return {
    classico: {   // aventura alegre, tom maior
        bpm: 140, lead: "square", leadVol: 0.05, bassWave: "triangle",
        melody: [72,_,76,79, 81,79,76,_,  74,_,77,81, 79,_,77,76,  72,_,76,79, 84,_,83,81,  79,77,76,74, 72,_,_,_],
        bass:   [48,_,55,_, 48,_,55,_,    50,_,57,_, 50,_,57,_,    53,_,60,_, 53,_,60,_,    55,_,55,_, 43,_,55,_]
    },
    freeza: {     // tenso e sombrio, tom menor com baixo pulsando
        bpm: 150, lead: "sawtooth", leadVol: 0.032, bassWave: "sawtooth",
        melody: [62,_,62,65, 64,_,62,_,  61,_,62,_, 69,_,68,_,  62,_,62,65, 67,_,65,64,  70,_,69,_, 68,_,61,_],
        bass:   [38,38,50,38, 38,38,50,38,  37,37,49,37, 37,37,49,37,  38,38,50,38, 38,38,50,38,  34,34,46,34, 33,33,45,33]
    },
    boo: {        // saltitante e travesso, mas ameaçador
        bpm: 132, lead: "square", leadVol: 0.042, bassWave: "square",
        melody: [64,_,67,_, 71,70,71,_,  72,_,71,_, 67,_,66,_,  64,_,67,_, 71,_,75,_,  76,_,74,72, 71,_,_,_],
        bass:   [40,_,47,_, 40,_,47,_,    45,_,52,_, 45,_,52,_,    48,_,47,_, 46,_,45,_,    47,_,47,_, 35,_,47,_]
    },
    gt: {         // rock animado de estrada
        bpm: 156, lead: "triangle", leadVol: 0.07, bassWave: "sawtooth",
        melody: [69,_,69,71, 73,_,76,_,  74,_,73,71, 69,_,67,_,  69,_,69,71, 73,_,78,76,  79,_,76,_, 74,73,71,_],
        bass:   [45,45,57,45, 45,45,55,45,  43,43,55,43, 43,43,55,43,  45,45,57,45, 45,45,57,45,  50,50,62,50, 52,52,64,52]
    }
};
})();
let bgmNoiseBuffer = null;

function midiToFreq(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
}

function playBgmTone(freq, wave, vol, dur, t) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
}

function playBgmDrum(kind, vol, t) {
    if (kind === "kick") {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        gain.gain.setValueAtTime(vol * 1.6, t);
        gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.16);
        return;
    }
    if (!bgmNoiseBuffer) {
        const len = Math.floor(audioCtx.sampleRate * 0.2);
        bgmNoiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
        const data = bgmNoiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const dur = kind === "snare" ? 0.12 : 0.035;
    src.buffer = bgmNoiseBuffer;
    gain.gain.setValueAtTime(kind === "snare" ? vol : vol * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(gain); gain.connect(audioCtx.destination);
    src.start(t); src.stop(t + dur + 0.01);
}

function getCurrentBgmTheme() {
    const era = typeof getStageMusicEra === "function" && typeof selectedStage !== "undefined"
        ? getStageMusicEra(selectedStage) : "classico";
    return BGM_THEMES[era] || BGM_THEMES.classico;
}

function startBGM() {
    stopBGM();
    if (isMuted || bgmVolume <= 0 || !audioCtx) return;

    const theme = getCurrentBgmTheme();
    const stepSec = 60 / theme.bpm / 2;   // colcheia
    bgmStep = 0;

    bgmInterval = setInterval(() => {
        if (!audioCtx || isMuted || gameState !== "playing") return;
        try {
            const t = audioCtx.currentTime + 0.01;
            const i = bgmStep % theme.melody.length;
            const v = bgmVolume;
            const note = theme.melody[i];
            if (note !== null) playBgmTone(midiToFreq(note), theme.lead, theme.leadVol * v, stepSec * 1.6, t);
            const bass = theme.bass[i];
            if (bass !== null) playBgmTone(midiToFreq(bass), theme.bassWave, 0.05 * v, stepSec * 0.9, t);
            const beat = i % 8;
            if (beat === 0 || beat === 4) playBgmDrum("kick", 0.06 * v, t);
            else if (beat === 2 || beat === 6) playBgmDrum("snare", 0.035 * v, t);
            else playBgmDrum("hat", 0.03 * v, t);
            bgmStep++;
        } catch (e) {
            console.warn("Erro ao tocar BGM:", e.message);
        }
    }, stepSec * 1000);
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
