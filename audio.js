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
// Cada fase toca no ritmo da abertura de uma época do anime — escolhida por getStageMusicEra
// (game-logic-core.js): mesmo andamento, mesma batida de bateria e mesmo tipo de baixo, para lembrar a abertura.
// A melodia por cima é original: as músicas da série têm direitos autorais e não podem ser copiadas.
// Bateria: 16 semicolcheias por compasso ("x" = toca). Melodia e baixo: uma nota MIDI por colcheia
// (null = pausa), 4 compassos que se repetem. A cada 4 compassos entra um prato no começo.
const BGM_THEMES = (() => {
const _ = null;
return {
    classico: {   // aventura saltitante e alegre (abertura do Dragon Ball clássico)
        bpm: 152, lead: "square", leadVol: 0.045, bassWave: "triangle", bassVol: 0.07,
        kick:  "x.....x...x.....",
        snare: "....x.......x...",
        hat:   "..x...x...x...x.",
        stab:  "..x.......x.x...",   // metais curtos no contratempo
        melody: [72,_,76,79, 81,79,76,_,  74,_,77,81, 79,_,77,76,  72,_,76,79, 84,_,83,81,  79,77,76,74, 72,_,_,_],
        bass:   [48,_,55,_, 48,_,55,_,    50,_,57,_, 50,_,57,_,    53,_,60,_, 53,_,60,_,    55,_,55,_, 43,_,55,_]
    },
    cell: {       // rock animado de 8 batidas, baixo pulsando em colcheias (1ª abertura do Z)
        bpm: 148, lead: "sawtooth", leadVol: 0.03, bassWave: "sawtooth", bassVol: 0.045,
        kick:  "x.....x.x.....x.",
        snare: "....x.......x...",
        hat:   "x.x.x.x.x.x.x.x.",
        stab:  "",
        melody: [69,_,71,73, _,76,_,73,  74,_,73,71, 69,_,_,_,  66,_,69,71, _,73,_,71,  69,_,71,73, 76,_,_,_],
        bass:   [45,45,45,45, 45,45,45,45,  50,50,50,50, 50,50,50,50,  42,42,42,42, 42,42,42,42,  40,40,40,40, 40,40,52,40]
    },
    boo: {        // hard rock rápido e pesado, bumbo dobrado (2ª abertura do Z)
        bpm: 162, lead: "square", leadVol: 0.035, bassWave: "sawtooth", bassVol: 0.05,
        kick:  "x.x...x.x.x...x.",
        snare: "....x.......x...",
        hat:   "x.x.x.x.x.x.x.x.",
        stab:  "x.........x.....",
        melody: [64,_,64,67, _,69,_,71,  72,_,71,69, 67,_,69,_,  64,_,64,67, _,69,_,74,  72,_,71,_, 69,_,_,_],
        bass:   [40,40,52,40, 40,40,52,40,  48,48,60,48, 48,48,60,48,  50,50,62,50, 50,50,62,50,  47,47,59,47, 47,47,59,47]
    },
    gt: {         // pop-rock leve e embalado, chimbal em semicolcheias (abertura do GT)
        bpm: 138, lead: "triangle", leadVol: 0.075, bassWave: "triangle", bassVol: 0.075,
        kick:  "x.....x...x.....",
        snare: "....x.......x..x",
        hat:   "x.xxx.xxx.xxx.xx",
        stab:  "",
        melody: [69,_,69,71, 73,_,76,_,  74,_,73,71, 69,_,67,_,  69,_,69,71, 73,_,78,76,  79,_,76,_, 74,73,71,_],
        bass:   [50,_,50,57, _,50,57,_,  47,_,47,54, _,47,54,_,  43,_,43,50, _,43,50,_,  45,_,45,52, _,45,49,52]
    }
};
})();
let bgmNoiseBuffer = null;
let bgmNextTime = 0;

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
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        gain.gain.setValueAtTime(vol * 1.6, t);
        gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.16);
        return;
    }
    if (!bgmNoiseBuffer) {
        const len = Math.floor(audioCtx.sampleRate * 0.6);
        bgmNoiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
        const data = bgmNoiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const dur = kind === "crash" ? 0.55 : kind === "snare" ? 0.12 : 0.035;
    const level = kind === "crash" ? vol * 0.8 : kind === "snare" ? vol : vol * 0.45;
    src.buffer = bgmNoiseBuffer;
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(gain); gain.connect(audioCtx.destination);
    src.start(t); src.stop(t + dur + 0.01);
}

function getCurrentBgmTheme() {
    const era = typeof getStageMusicEra === "function" && typeof selectedStage !== "undefined"
        ? getStageMusicEra(selectedStage) : "classico";
    return BGM_THEMES[era] || BGM_THEMES.classico;
}

// Toca um passo (semicolcheia) do tema no instante t. Passos pares levam a nota de melodia/baixo da colcheia.
function playBgmStep(theme, step, t, stepSec) {
    const v = bgmVolume;
    const s16 = step % 16;
    if (step % 2 === 0) {
        const i = (step / 2) % theme.melody.length;
        const note = theme.melody[i];
        if (note !== null) playBgmTone(midiToFreq(note), theme.lead, theme.leadVol * v, stepSec * 3.2, t);
        const bass = theme.bass[i];
        if (bass !== null) playBgmTone(midiToFreq(bass), theme.bassWave, theme.bassVol * v, stepSec * 1.8, t);
    }
    if (s16 === 0 && step % 64 === 0) playBgmDrum("crash", 0.05 * v, t);
    if (theme.kick[s16] === "x") playBgmDrum("kick", 0.06 * v, t);
    if (theme.snare[s16] === "x") playBgmDrum("snare", 0.04 * v, t);
    else if (theme.hat[s16] === "x") playBgmDrum("hat", 0.03 * v, t);
    if (theme.stab[s16] === "x") {
        // acorde curto de metais na nota do baixo (terça e quinta acima)
        const root = theme.bass[Math.floor(step / 2) % theme.bass.length] || theme.bass[0];
        [12, 16, 19].forEach(iv => playBgmTone(midiToFreq(root + iv), "square", 0.012 * v, stepSec * 1.2, t));
    }
}

function startBGM() {
    stopBGM();
    if (isMuted || bgmVolume <= 0 || !audioCtx) return;

    const theme = getCurrentBgmTheme();
    const stepSec = 60 / theme.bpm / 4;   // semicolcheia
    bgmStep = 0;
    bgmNextTime = 0;

    // Agenda as notas um pouco à frente no relógio do áudio: o ritmo fica certinho mesmo se o jogo atrasar um quadro.
    bgmInterval = setInterval(() => {
        if (!audioCtx || isMuted) return;
        if (gameState !== "playing") { bgmNextTime = 0; return; }   // pausa: retoma no tempo certo depois
        try {
            const now = audioCtx.currentTime;
            if (bgmNextTime < now) bgmNextTime = now + 0.03;
            while (bgmNextTime < now + 0.12) {
                playBgmStep(theme, bgmStep, bgmNextTime, stepSec);
                bgmNextTime += stepSec;
                bgmStep++;
            }
        } catch (e) {
            console.warn("Erro ao tocar BGM:", e.message);
        }
    }, 25);
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
