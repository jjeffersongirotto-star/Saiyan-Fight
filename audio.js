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
// Oito temas originais do jogo, um por fase (getStageMusicEra em game-logic-core.js), cada um com nome,
// compasso, andamento, escala e instrumentos próprios e um "gancho" de abertura fácil de reconhecer.
// (As músicas da série têm direitos autorais e não são copiadas: estas são composições do próprio jogo.)
//
// Notação: "Nota+oitava:duração" em semicolcheias (ex.: "D5:4" = Ré da 5ª oitava por uma semínima),
// "-:n" = pausa. Na linha de baixo, "R"/"Q"/"O" = fundamental, quinta e oitava do acorde do compasso.
// Bateria: um caractere por semicolcheia de cada compasso ("x" = toca).
const BGM_THEMES = {
    classico: {
        nome: "AVENTURA NAS NUVENS",
        clima: "Pentatônica saltitante com balanço (shuffle), flautinha de 8 bits e baixo \"pum-pá\"",
        bpm: 132, compasso: 16, swing: 0.32,
        lead: { wave: "square", vol: 0.045, staccato: 0.6 },
        bassWave: "triangle", bassVol: 0.08,
        acordes: ["G2", "G2", "E2", "D2", "G2", "C3", "D2", "G2"],
        melodia: "G4:2 A4:2 B4:2 D5:4 B4:2 D5:2 E5:2 | D5:6 -:2 B4:2 A4:2 G4:4 | E4:2 G4:2 A4:2 B4:4 A4:2 G4:2 E4:2 | D4:8 -:4 D4:2 E4:2 |" +
                 "G4:2 A4:2 B4:2 D5:4 E5:2 G5:4 | E5:2 D5:2 B4:2 D5:6 -:4 | E5:2 D5:2 B4:2 A4:2 G4:2 A4:2 B4:2 A4:2 | G4:8 -:4 D5:1 E5:1 G5:2",
        baixo: "R:4 Q:4 R:4 Q:4",
        kick:  "x.......x.......",
        snare: "....x.......x...",
        hat:   "..x...x...x...x."
    },
    kame: {
        nome: "BRISA DA KAME HOUSE",
        clima: "Calipso ensolarado em Fá maior, tambor de aço saltitante e baixo balançado de ilha",
        bpm: 116, compasso: 16, swing: 0.18,
        lead: { wave: "triangle", vol: 0.09, staccato: 0.5 },
        bassWave: "triangle", bassVol: 0.08,
        acordes: ["F2", "F2", "Bb1", "C2", "F2", "Bb1", "C2", "F2"],
        melodia: "C5:2 A4:2 F4:2 A4:2 C5:3 D5:1 C5:4 | A4:2 G4:2 F4:2 G4:2 A4:6 -:2 | Bb4:2 D5:2 F5:2 D5:2 C5:3 Bb4:1 A4:4 | G4:6 -:2 E4:2 F4:2 G4:4 |" +
                 "A4:2 C5:2 F5:3 E5:1 D5:2 C5:2 A4:4 | Bb4:2 A4:2 G4:2 Bb4:2 D5:6 -:2 | C5:2 E5:2 G5:2 E5:2 C5:3 Bb4:1 G4:4 | F4:8 -:4 C4:2 E4:2",
        baixo: "R:3 Q:3 O:2 R:3 Q:3 R:2",
        kick:  "x.....x.x.......",
        snare: "....x.......x.x.",
        hat:   "x.x.x.x.x.x.x.x."
    },
    kami: {
        nome: "ACIMA DAS NUVENS",
        clima: "Valsa serena em Ré maior, flauta suave com vibrato e baixo redondo, como o vento no alto do céu",
        bpm: 92, compasso: 12, swing: 0,
        lead: { wave: "sine", vol: 0.08, staccato: 1, vibrato: 6 },
        bassWave: "sine", bassVol: 0.09,
        acordes: ["D2", "B1", "G1", "A1", "D2", "B1", "A1", "D2"],
        melodia: "A4:4 D5:2 F#5:4 E5:2 | D5:6 B4:2 A4:4 | G4:4 B4:2 D5:4 C#5:2 | A4:10 -:2 |" +
                 "F#5:4 A5:2 G5:4 F#5:2 | E5:6 D5:2 B4:4 | C#5:4 E5:2 A4:4 B4:2 | D5:10 -:2",
        baixo: "R:6 Q:6",
        kick:  "x.....x.....",
        snare: "",
        hat:   "..x...x...x."
    },
    capital: {
        nome: "AVENIDAS DA CAPITAL",
        clima: "Pop urbano animado em Dó maior, sintetizador brilhante e baixo saltando em oitavas",
        bpm: 138, compasso: 16, swing: 0.1,
        lead: { wave: "sawtooth", vol: 0.035, staccato: 0.5 },
        bassWave: "square", bassVol: 0.04,
        acordes: ["C2", "F1", "C2", "G1", "A1", "F1", "G1", "C2"],
        melodia: "C5:2 E5:2 G5:2 E5:2 C5:2 D5:2 E5:4 | F5:2 E5:2 D5:2 C5:2 A4:4 -:4 | G4:2 A4:2 C5:2 D5:2 E5:3 D5:1 C5:4 | D5:6 -:2 G4:2 B4:2 D5:4 |" +
                 "E5:2 G5:2 A5:2 G5:2 E5:2 D5:2 C5:4 | A4:2 C5:2 D5:2 E5:2 F5:4 E5:4 | D5:2 C5:2 B4:2 G4:2 A4:2 B4:2 C5:2 D5:2 | C5:8 -:4 G4:2 B4:2",
        baixo: "R:2 O:2 R:2 O:2 Q:2 O:2 R:2 O:2",
        kick:  "x...x...x...x...",
        snare: "....x.......x...",
        hat:   "x.x.x.x.x.x.x.x."
    },
    freeza: {
        nome: "A AMEAÇA DO IMPERADOR",
        clima: "Marcha heroica em Ré menor, metais com ritmo pontuado e tambores de guerra",
        bpm: 112, compasso: 16, swing: 0,
        lead: { wave: "sawtooth", vol: 0.045, staccato: 0.9 },
        bassWave: "sawtooth", bassVol: 0.06,
        acordes: ["D2", "D2", "D2", "A1", "G1", "D2", "A1", "D2"],
        melodia: "D4:3 D4:1 A4:4 G4:2 F4:2 E4:2 F4:2 | D4:8 -:4 A3:2 C4:2 | D4:3 D4:1 A4:4 Bb4:2 A4:2 G4:2 A4:2 | E4:8 -:4 E4:2 F4:2 |" +
                 "G4:3 G4:1 Bb4:4 A4:2 G4:2 F4:2 G4:2 | A4:6 F4:2 D4:4 F4:4 | C#5:4 A4:2 Bb4:2 G4:4 E4:4 | D4:8 -:4 C#4:2 E4:2",
        baixo: "R:3 R:1 R:4 O:4 Q:4",
        kick:  "x.......x.......",
        snare: "...x..x.x.xx..x.",
        hat:   ""
    },
    boo: {
        nome: "VALSA DO MAJIN",
        clima: "Valsa travessa em 3/4, caixinha de música com cromatismos e baixo \"pum-pá-pá\"",
        bpm: 168, compasso: 12, swing: 0,
        lead: { wave: "triangle", vol: 0.085, staccato: 0.7 },
        bassWave: "square", bassVol: 0.03,
        acordes: ["E2", "E2", "E2", "E2", "A2", "B1", "A2", "E2"],
        melodia: "E5:2 D#5:2 E5:2 G5:4 E5:2 | B4:6 C5:2 B4:2 A4:2 | G4:2 F#4:2 G4:2 B4:4 G4:2 | E4:8 -:4 |" +
                 "A4:2 G#4:2 A4:2 C5:4 E5:2 | D#5:6 B4:4 -:2 | C5:2 B4:2 A4:2 F#4:2 D#4:2 F#4:2 | E4:8 -:2 B3:2",
        baixo: "R:4 O:4 Q:4",
        kick:  "x...........",
        snare: "",
        hat:   "....x...x..."
    },
    gt: {
        nome: "ESTRADA DAS ESTRELAS",
        clima: "Balada nostálgica em Fá maior, flauta suave com vibrato e baixo sincopado de bossa",
        bpm: 100, compasso: 16, swing: 0,
        lead: { wave: "sine", vol: 0.075, staccato: 1, vibrato: 5 },
        bassWave: "triangle", bassVol: 0.06,
        acordes: ["F2", "A#1", "A1", "G1", "F2", "A#1", "C2", "F2"],
        melodia: "C5:3 A4:3 F5:2 E5:4 C5:4 | D5:3 Bb4:3 G5:2 F5:8 | E5:3 C5:3 A5:2 G5:4 E5:2 C5:2 | D5:12 -:4 |" +
                 "C5:3 A4:3 F5:2 E5:4 C5:4 | D5:3 Bb4:3 D5:2 G5:4 A5:2 Bb5:2 | A5:4 G5:2 F5:2 E5:2 G5:2 C5:4 | F5:12 -:4",
        baixo: "R:3 Q:3 O:2 Q:8",
        kick:  "x.....x...x.....",
        snare: "",
        hat:   "x.x.x.x.x.x.x.x."
    },
    kaio: {
        nome: "GALOPE DO PLANETA KAIOH",
        clima: "Polca cômica em Dó maior, xilofone saltitante com saltos engraçados e tuba \"pum-pá\"",
        bpm: 150, compasso: 16, swing: 0,
        lead: { wave: "triangle", vol: 0.1, staccato: 0.4 },
        bassWave: "square", bassVol: 0.035,
        acordes: ["C2", "G1", "F1", "C2", "C2", "C2", "G1", "C2"],
        melodia: "C5:2 -:2 G4:2 -:2 E4:2 G4:2 C5:4 | B4:2 C5:2 D5:2 C5:2 B4:4 G4:4 | A4:2 -:2 F4:2 -:2 A4:2 C5:2 F5:4 | E5:2 D5:2 C5:2 B4:2 C5:8 |" +
                 "C5:2 -:2 G4:2 -:2 E4:2 G4:2 C5:4 | D5:2 Eb5:2 E5:2 G5:2 E5:4 C5:4 | A4:2 B4:2 C5:2 D5:2 G4:2 A4:2 B4:2 D5:2 | C5:4 G4:2 E4:2 C4:4 -:4",
        baixo: "R:2 -:2 O:2 -:2 R:2 -:2 Q:2 -:2",
        kick:  "x...x...x...x...",
        snare: "",
        hat:   "..x...x...x...x."
    },
    namek: {
        nome: "BRISA DE NAMEK",
        clima: "Misteriosa e lenta em Ré dórico, notas longas com vibrato sobre um céu verde",
        bpm: 84, compasso: 16, swing: 0,
        lead: { wave: "sine", vol: 0.085, staccato: 1, vibrato: 4 },
        bassWave: "triangle", bassVol: 0.07,
        acordes: ["D2", "A1", "F1", "A1", "D2", "C2", "A#1", "D2"],
        melodia: "A4:4 D5:4 C5:2 A4:2 G4:4 | A4:12 -:4 | F4:4 G4:4 A4:2 C5:2 B4:4 | A4:12 -:4 |" +
                 "D5:4 E5:4 F5:2 E5:2 D5:4 | C5:6 A4:2 G4:8 | F4:4 E4:4 D4:2 E4:2 F4:4 | D4:12 -:4",
        baixo: "R:8 Q:8",
        kick:  "x...............",
        snare: "",
        hat:   "......x.......x."
    },
    explosao: {
        nome: "CONTAGEM FINAL",
        clima: "Urgente em Dó menor, ostinato de semicolcheias como um alarme e o tempo acabando",
        bpm: 176, compasso: 16, swing: 0,
        lead: { wave: "square", vol: 0.03, staccato: 0.55 },
        bassWave: "sawtooth", bassVol: 0.045,
        acordes: ["C2", "G#1", "G1", "C2", "C2", "G#1", "G1", "C2"],
        melodia: "C5:1 C5:1 G4:1 C5:1 Eb5:1 C5:1 G4:1 C5:1 D5:1 C5:1 G4:1 C5:1 Eb5:1 C5:1 G4:1 C5:1 |" +
                 "C5:1 C5:1 Ab4:1 C5:1 Eb5:1 C5:1 Ab4:1 C5:1 F5:1 C5:1 Ab4:1 C5:1 Eb5:1 C5:1 Ab4:1 C5:1 |" +
                 "B4:1 B4:1 G4:1 B4:1 D5:1 B4:1 G4:1 B4:1 F5:1 D5:1 B4:1 G4:1 F5:1 D5:1 B4:1 G4:1 | C5:4 -:2 G4:2 Eb5:4 -:2 G5:2 |" +
                 "C5:1 C5:1 G4:1 C5:1 Eb5:1 C5:1 G4:1 C5:1 D5:1 C5:1 G4:1 C5:1 Eb5:1 C5:1 G4:1 C5:1 |" +
                 "C5:1 C5:1 Ab4:1 C5:1 Eb5:1 C5:1 Ab4:1 C5:1 F5:1 C5:1 Ab4:1 C5:1 Eb5:1 C5:1 Ab4:1 C5:1 |" +
                 "Ab4:2 B4:2 D5:2 F5:2 Ab5:2 F5:2 D5:2 B4:2 | C5:8 G5:4 C6:4",
        baixo: "R:2 R:2 O:2 R:2 R:2 R:2 O:2 R:2",
        kick:  "x.x.x.x.x.x.x.x.",
        snare: "....x.......x...",
        hat:   ""
    },
    cell: {
        nome: "TORNEIO DA PERFEIÇÃO",
        clima: "Épica em Lá menor, compasso de 6/8 que balança em dois tempos fortes, metais solenes",
        bpm: 126, compasso: 12, swing: 0,
        lead: { wave: "square", vol: 0.035, staccato: 0.95 },
        bassWave: "triangle", bassVol: 0.08,
        acordes: ["A1", "G1", "A1", "E1", "F1", "D2", "E1", "A1"],
        melodia: "A4:3 C5:3 E5:6 | D5:3 C5:3 B4:3 G4:3 | A4:3 C5:3 E5:3 A5:3 | G#5:9 E5:3 |" +
                 "F5:3 E5:3 D5:3 C5:3 | D5:3 C5:3 B4:3 A4:3 | B4:3 C5:3 D5:3 E5:3 | A4:9 -:3",
        baixo: "R:6 Q:3 O:3",
        kick:  "x.....x.....",
        snare: "......x.....",
        hat:   "x..x..x..x.."
    }
};
let bgmNoiseBuffer = null;
let bgmNextTime = 0;

const NOTE_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// "C#5" / "Bb4" -> número MIDI
function noteNameToMidi(nome) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(nome);
    if (!m) return null;
    return 12 * (Number(m[3]) + 1) + NOTE_SEMITONES[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}

// Transforma a notação em uma lista por semicolcheia: em cada passo, { nota, dur } quando começa uma nota.
function parseBgmLine(texto) {
    const passos = [];
    texto.split(/[\s|]+/).filter(Boolean).forEach(tok => {
        const [nome, d] = tok.split(":");
        const dur = Number(d) || 1;
        passos.push(nome === "-" ? null : { nota: nome, dur });
        for (let i = 1; i < dur; i++) passos.push(null);
    });
    return passos;
}

// Prepara (uma vez) a melodia e o baixo do tema em passos de semicolcheia.
function getCompiledTheme(theme) {
    if (theme._compilado) return theme._compilado;
    const melodia = parseBgmLine(theme.melodia).map(ev => ev && { midi: noteNameToMidi(ev.nota), dur: ev.dur });
    const padraoBaixo = parseBgmLine(theme.baixo);
    const baixo = [];
    theme.acordes.forEach(acorde => {
        const raiz = noteNameToMidi(acorde);
        padraoBaixo.forEach(ev => baixo.push(ev && {
            midi: raiz + (ev.nota === "Q" ? 7 : ev.nota === "O" ? 12 : 0), dur: ev.dur
        }));
    });
    theme._compilado = { melodia, baixo, total: Math.max(melodia.length, baixo.length) };
    return theme._compilado;
}

function midiToFreq(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
}

function playBgmTone(freq, wave, vol, dur, t, vibrato) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    if (vibrato && audioCtx.createOscillator) {
        // vibrato suave (a "flauta" do tema GT): balança a afinação alguns hertz
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.setValueAtTime(5.5, t);
        lfoGain.gain.setValueAtTime(vibrato, t);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + dur + 0.05);
    }
    gain.gain.setValueAtTime(0.0008, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);
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

// Toca um passo (semicolcheia) do tema no instante t.
function playBgmStep(theme, step, t, stepSec) {
    const v = bgmVolume;
    const c = getCompiledTheme(theme);
    const i = step % c.total;
    const noCompasso = step % theme.compasso;
    // balanço (shuffle): a segunda colcheia de cada tempo chega um pouco atrasada
    if (theme.swing && noCompasso % 4 === 2) t += theme.swing * stepSec;
    const m = c.melodia[i];
    if (m) playBgmTone(midiToFreq(m.midi), theme.lead.wave, theme.lead.vol * v, m.dur * stepSec * theme.lead.staccato + 0.05, t, theme.lead.vibrato);
    const b = c.baixo[i];
    if (b) playBgmTone(midiToFreq(b.midi), theme.bassWave, theme.bassVol * v, b.dur * stepSec * 0.85 + 0.03, t);
    if (i === 0) playBgmDrum("crash", 0.04 * v, t);   // prato a cada volta da música
    if (theme.kick[noCompasso] === "x") playBgmDrum("kick", 0.06 * v, t);
    if (theme.snare[noCompasso] === "x") playBgmDrum("snare", 0.035 * v, t);
    else if (theme.hat[noCompasso] === "x") playBgmDrum("hat", 0.03 * v, t);
}

function startThemeLoop(theme, ativo) {
    const stepSec = 60 / theme.bpm / 4;   // semicolcheia
    bgmStep = 0;
    bgmNextTime = 0;
    bgmInterval = setInterval(() => {
        if (!audioCtx || isMuted) return;
        if (!ativo()) { bgmNextTime = 0; return; }
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

function startBGM() {
    stopBGM();
    if (isMuted || bgmVolume <= 0 || !audioCtx) return;
    startThemeLoop(getCurrentBgmTheme(), () => gameState === "playing");
}

// TRILHAS SONORAS (Opções > Áudio): ouvir a música de cada época. Só uma toca por vez — tocar outra pausa a
// anterior. Sair da tela (setGameState → stopBGM) para tudo.
// Uma trilha por fase, na ordem das fases (montada na hora: audio.js carrega antes de game-logic-core.js).
function getBgmTrackList() {
    return STAGE_PROGRESSION.map(stg => {
        const tema = getStageMusicEra(stg.id);
        return { era: tema, nome: BGM_THEMES[tema].nome, fases: stg.name };
    });
}
let bgmPreviewEra = null;

function playTrackPreview(era) {
    stopBGM();
    if (!BGM_THEMES[era] || !initAudio() || !audioCtx) return false;
    bgmPreviewEra = era;
    startThemeLoop(BGM_THEMES[era], () => gameState === "options_tracks");
    return true;
}

// Botão de uma trilha: se ela está tocando, pausa; senão toca ela (e pausa a que estava tocando).
function toggleTrackPreview(era) {
    if (bgmPreviewEra === era) { stopBGM(); return false; }
    return playTrackPreview(era);
}

function stopBGM() {
    if (bgmInterval) {
        clearInterval(bgmInterval);
        bgmInterval = null;
    }
    bgmPreviewEra = null;
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
