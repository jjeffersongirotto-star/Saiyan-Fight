// As 11 trilhas do jogo antigo (BGM_THEMES do audio.js), uma por fase, na ordem das fases. São composições do
// próprio jogo (as músicas da série têm direitos autorais e não são copiadas).
// Notação: "Nota+oitava:duração" em semicolcheias ("D5:4" = Ré da 5ª oitava por uma semínima), "-:n" = pausa.
// Baixo: "R"/"Q"/"O" = fundamental, quinta e oitava do acorde do compasso. Bateria: um caractere por
// semicolcheia de cada compasso ("x" = toca).

export type Onda = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface Tema {
  nome: string;
  clima: string;
  bpm: number;
  compasso: number;
  swing: number;
  lead: { onda: Onda; vol: number; staccato: number; vibrato?: number };
  ondaBaixo: Onda;
  volBaixo: number;
  acordes: string[];
  melodia: string;
  baixo: string;
  bumbo: string;
  caixa: string;
  chimbal: string;
}

export const TEMAS = {
  kame: {
    nome: 'BRISA DA KAME HOUSE',
    clima: 'Calipso ensolarado em Fá maior, tambor de aço saltitante e baixo balançado de ilha',
    bpm: 116, compasso: 16, swing: 0.18,
    lead: { onda: 'triangle', vol: 0.09, staccato: 0.5 },
    ondaBaixo: 'triangle', volBaixo: 0.08,
    acordes: ['F2', 'F2', 'Bb1', 'C2', 'F2', 'Bb1', 'C2', 'F2'],
    melodia:
      'C5:2 A4:2 F4:2 A4:2 C5:3 D5:1 C5:4 | A4:2 G4:2 F4:2 G4:2 A4:6 -:2 | Bb4:2 D5:2 F5:2 D5:2 C5:3 Bb4:1 A4:4 | G4:6 -:2 E4:2 F4:2 G4:4 |A4:2 C5:2 F5:3 E5:1 D5:2 C5:2 A4:4 | Bb4:2 A4:2 G4:2 Bb4:2 D5:6 -:2 | C5:2 E5:2 G5:2 E5:2 C5:3 Bb4:1 G4:4 | F4:8 -:4 C4:2 E4:2',
    baixo: 'R:3 Q:3 O:2 R:3 Q:3 R:2',
    bumbo: 'x.....x.x.......',
    caixa: '....x.......x.x.',
    chimbal: 'x.x.x.x.x.x.x.x.',
  },
  classico: {
    nome: 'AVENTURA NAS NUVENS',
    clima: 'Pentatônica saltitante com balanço (shuffle), flautinha de 8 bits e baixo "pum-pá"',
    bpm: 132, compasso: 16, swing: 0.32,
    lead: { onda: 'square', vol: 0.045, staccato: 0.6 },
    ondaBaixo: 'triangle', volBaixo: 0.08,
    acordes: ['G2', 'G2', 'E2', 'D2', 'G2', 'C3', 'D2', 'G2'],
    melodia:
      'G4:2 A4:2 B4:2 D5:4 B4:2 D5:2 E5:2 | D5:6 -:2 B4:2 A4:2 G4:4 | E4:2 G4:2 A4:2 B4:4 A4:2 G4:2 E4:2 | D4:8 -:4 D4:2 E4:2 |G4:2 A4:2 B4:2 D5:4 E5:2 G5:4 | E5:2 D5:2 B4:2 D5:6 -:4 | E5:2 D5:2 B4:2 A4:2 G4:2 A4:2 B4:2 A4:2 | G4:8 -:4 D5:1 E5:1 G5:2',
    baixo: 'R:4 Q:4 R:4 Q:4',
    bumbo: 'x.......x.......',
    caixa: '....x.......x...',
    chimbal: '..x...x...x...x.',
  },
  kaio: {
    nome: 'GALOPE DO PLANETA KAIOH',
    clima: 'Polca cômica em Dó maior, xilofone saltitante com saltos engraçados e tuba "pum-pá"',
    bpm: 150, compasso: 16, swing: 0,
    lead: { onda: 'triangle', vol: 0.1, staccato: 0.4 },
    ondaBaixo: 'square', volBaixo: 0.035,
    acordes: ['C2', 'G1', 'F1', 'C2', 'C2', 'C2', 'G1', 'C2'],
    melodia:
      'C5:2 -:2 G4:2 -:2 E4:2 G4:2 C5:4 | B4:2 C5:2 D5:2 C5:2 B4:4 G4:4 | A4:2 -:2 F4:2 -:2 A4:2 C5:2 F5:4 | E5:2 D5:2 C5:2 B4:2 C5:8 |C5:2 -:2 G4:2 -:2 E4:2 G4:2 C5:4 | D5:2 Eb5:2 E5:2 G5:2 E5:4 C5:4 | A4:2 B4:2 C5:2 D5:2 G4:2 A4:2 B4:2 D5:2 | C5:4 G4:2 E4:2 C4:4 -:4',
    baixo: 'R:2 -:2 O:2 -:2 R:2 -:2 Q:2 -:2',
    bumbo: 'x...x...x...x...',
    caixa: '',
    chimbal: '..x...x...x...x.',
  },
  namek: {
    nome: 'BRISA DE NAMEK',
    clima: 'Misteriosa e lenta em Ré dórico, notas longas com vibrato sobre um céu verde',
    bpm: 84, compasso: 16, swing: 0,
    lead: { onda: 'sine', vol: 0.085, staccato: 1, vibrato: 4 },
    ondaBaixo: 'triangle', volBaixo: 0.07,
    acordes: ['D2', 'A1', 'F1', 'A1', 'D2', 'C2', 'A#1', 'D2'],
    melodia:
      'A4:4 D5:4 C5:2 A4:2 G4:4 | A4:12 -:4 | F4:4 G4:4 A4:2 C5:2 B4:4 | A4:12 -:4 |D5:4 E5:4 F5:2 E5:2 D5:4 | C5:6 A4:2 G4:8 | F4:4 E4:4 D4:2 E4:2 F4:4 | D4:12 -:4',
    baixo: 'R:8 Q:8',
    bumbo: 'x...............',
    caixa: '',
    chimbal: '......x.......x.',
  },
  freeza: {
    nome: 'A AMEAÇA DO IMPERADOR',
    clima: 'Marcha heroica em Ré menor, metais com ritmo pontuado e tambores de guerra',
    bpm: 112, compasso: 16, swing: 0,
    lead: { onda: 'sawtooth', vol: 0.045, staccato: 0.9 },
    ondaBaixo: 'sawtooth', volBaixo: 0.06,
    acordes: ['D2', 'D2', 'D2', 'A1', 'G1', 'D2', 'A1', 'D2'],
    melodia:
      'D4:3 D4:1 A4:4 G4:2 F4:2 E4:2 F4:2 | D4:8 -:4 A3:2 C4:2 | D4:3 D4:1 A4:4 Bb4:2 A4:2 G4:2 A4:2 | E4:8 -:4 E4:2 F4:2 |G4:3 G4:1 Bb4:4 A4:2 G4:2 F4:2 G4:2 | A4:6 F4:2 D4:4 F4:4 | C#5:4 A4:2 Bb4:2 G4:4 E4:4 | D4:8 -:4 C#4:2 E4:2',
    baixo: 'R:3 R:1 R:4 O:4 Q:4',
    bumbo: 'x.......x.......',
    caixa: '...x..x.x.xx..x.',
    chimbal: '',
  },
  explosao: {
    nome: 'CONTAGEM FINAL',
    clima: 'Urgente em Dó menor, ostinato de semicolcheias como um alarme e o tempo acabando',
    bpm: 176, compasso: 16, swing: 0,
    lead: { onda: 'square', vol: 0.03, staccato: 0.55 },
    ondaBaixo: 'sawtooth', volBaixo: 0.045,
    acordes: ['C2', 'G#1', 'G1', 'C2', 'C2', 'G#1', 'G1', 'C2'],
    melodia:
      'C5:1 C5:1 G4:1 C5:1 Eb5:1 C5:1 G4:1 C5:1 D5:1 C5:1 G4:1 C5:1 Eb5:1 C5:1 G4:1 C5:1 |C5:1 C5:1 Ab4:1 C5:1 Eb5:1 C5:1 Ab4:1 C5:1 F5:1 C5:1 Ab4:1 C5:1 Eb5:1 C5:1 Ab4:1 C5:1 |B4:1 B4:1 G4:1 B4:1 D5:1 B4:1 G4:1 B4:1 F5:1 D5:1 B4:1 G4:1 F5:1 D5:1 B4:1 G4:1 | C5:4 -:2 G4:2 Eb5:4 -:2 G5:2 |C5:1 C5:1 G4:1 C5:1 Eb5:1 C5:1 G4:1 C5:1 D5:1 C5:1 G4:1 C5:1 Eb5:1 C5:1 G4:1 C5:1 |C5:1 C5:1 Ab4:1 C5:1 Eb5:1 C5:1 Ab4:1 C5:1 F5:1 C5:1 Ab4:1 C5:1 Eb5:1 C5:1 Ab4:1 C5:1 |Ab4:2 B4:2 D5:2 F5:2 Ab5:2 F5:2 D5:2 B4:2 | C5:8 G5:4 C6:4',
    baixo: 'R:2 R:2 O:2 R:2 R:2 R:2 O:2 R:2',
    bumbo: 'x.x.x.x.x.x.x.x.',
    caixa: '....x.......x...',
    chimbal: '',
  },
  gt: {
    nome: 'ESTRADA DAS ESTRELAS',
    clima: 'Balada nostálgica em Fá maior, flauta suave com vibrato e baixo sincopado de bossa',
    bpm: 100, compasso: 16, swing: 0,
    lead: { onda: 'sine', vol: 0.075, staccato: 1, vibrato: 5 },
    ondaBaixo: 'triangle', volBaixo: 0.06,
    acordes: ['F2', 'A#1', 'A1', 'G1', 'F2', 'A#1', 'C2', 'F2'],
    melodia:
      'C5:3 A4:3 F5:2 E5:4 C5:4 | D5:3 Bb4:3 G5:2 F5:8 | E5:3 C5:3 A5:2 G5:4 E5:2 C5:2 | D5:12 -:4 |C5:3 A4:3 F5:2 E5:4 C5:4 | D5:3 Bb4:3 D5:2 G5:4 A5:2 Bb5:2 | A5:4 G5:2 F5:2 E5:2 G5:2 C5:4 | F5:12 -:4',
    baixo: 'R:3 Q:3 O:2 Q:8',
    bumbo: 'x.....x...x.....',
    caixa: '',
    chimbal: 'x.x.x.x.x.x.x.x.',
  },
  cell: {
    nome: 'TORNEIO DA PERFEIÇÃO',
    clima: 'Épica em Lá menor, compasso de 6/8 que balança em dois tempos fortes, metais solenes',
    bpm: 126, compasso: 12, swing: 0,
    lead: { onda: 'square', vol: 0.035, staccato: 0.95 },
    ondaBaixo: 'triangle', volBaixo: 0.08,
    acordes: ['A1', 'G1', 'A1', 'E1', 'F1', 'D2', 'E1', 'A1'],
    melodia:
      'A4:3 C5:3 E5:6 | D5:3 C5:3 B4:3 G4:3 | A4:3 C5:3 E5:3 A5:3 | G#5:9 E5:3 |F5:3 E5:3 D5:3 C5:3 | D5:3 C5:3 B4:3 A4:3 | B4:3 C5:3 D5:3 E5:3 | A4:9 -:3',
    baixo: 'R:6 Q:3 O:3',
    bumbo: 'x.....x.....',
    caixa: '......x.....',
    chimbal: 'x..x..x..x..',
  },
  boo: {
    nome: 'VALSA DO MAJIN',
    clima: 'Valsa travessa em 3/4, caixinha de música com cromatismos e baixo "pum-pá-pá"',
    bpm: 168, compasso: 12, swing: 0,
    lead: { onda: 'triangle', vol: 0.085, staccato: 0.7 },
    ondaBaixo: 'square', volBaixo: 0.03,
    acordes: ['E2', 'E2', 'E2', 'E2', 'A2', 'B1', 'A2', 'E2'],
    melodia:
      'E5:2 D#5:2 E5:2 G5:4 E5:2 | B4:6 C5:2 B4:2 A4:2 | G4:2 F#4:2 G4:2 B4:4 G4:2 | E4:8 -:4 |A4:2 G#4:2 A4:2 C5:4 E5:2 | D#5:6 B4:4 -:2 | C5:2 B4:2 A4:2 F#4:2 D#4:2 F#4:2 | E4:8 -:2 B3:2',
    baixo: 'R:4 O:4 Q:4',
    bumbo: 'x...........',
    caixa: '',
    chimbal: '....x...x...',
  },
  kami: {
    nome: 'ACIMA DAS NUVENS',
    clima: 'Valsa serena em Ré maior, flauta suave com vibrato e baixo redondo, como o vento no alto do céu',
    bpm: 92, compasso: 12, swing: 0,
    lead: { onda: 'sine', vol: 0.08, staccato: 1, vibrato: 6 },
    ondaBaixo: 'sine', volBaixo: 0.09,
    acordes: ['D2', 'B1', 'G1', 'A1', 'D2', 'B1', 'A1', 'D2'],
    melodia:
      'A4:4 D5:2 F#5:4 E5:2 | D5:6 B4:2 A4:4 | G4:4 B4:2 D5:4 C#5:2 | A4:10 -:2 |F#5:4 A5:2 G5:4 F#5:2 | E5:6 D5:2 B4:4 | C#5:4 E5:2 A4:4 B4:2 | D5:10 -:2',
    baixo: 'R:6 Q:6',
    bumbo: 'x.....x.....',
    caixa: '',
    chimbal: '..x...x...x.',
  },
  capital: {
    nome: 'AVENIDAS DA CAPITAL',
    clima: 'Pop urbano animado em Dó maior, sintetizador brilhante e baixo saltando em oitavas',
    bpm: 138, compasso: 16, swing: 0.1,
    lead: { onda: 'sawtooth', vol: 0.035, staccato: 0.5 },
    ondaBaixo: 'square', volBaixo: 0.04,
    acordes: ['C2', 'F1', 'C2', 'G1', 'A1', 'F1', 'G1', 'C2'],
    melodia:
      'C5:2 E5:2 G5:2 E5:2 C5:2 D5:2 E5:4 | F5:2 E5:2 D5:2 C5:2 A4:4 -:4 | G4:2 A4:2 C5:2 D5:2 E5:3 D5:1 C5:4 | D5:6 -:2 G4:2 B4:2 D5:4 |E5:2 G5:2 A5:2 G5:2 E5:2 D5:2 C5:4 | A4:2 C5:2 D5:2 E5:2 F5:4 E5:4 | D5:2 C5:2 B4:2 G4:2 A4:2 B4:2 C5:2 D5:2 | C5:8 -:4 G4:2 B4:2',
    baixo: 'R:2 O:2 R:2 O:2 Q:2 O:2 R:2 O:2',
    bumbo: 'x...x...x...x...',
    caixa: '....x.......x...',
    chimbal: 'x.x.x.x.x.x.x.x.',
  },
} satisfies Record<string, Tema>;

export type IdTema = keyof typeof TEMAS;
/** na ordem das fases do jogo antigo (STAGE_PROGRESSION) */
export const ORDEM_TEMAS = Object.keys(TEMAS) as IdTema[];
/** fase de cada trilha no jogo antigo (para a tela de trilhas) */
export const FASE_DO_TEMA: Record<IdTema, string> = {
  kame: 'ILHA DO MESTRE KAME', classico: 'TORNEIO ARTES MARCIAIS', kaio: 'PLANETA DO SR. KAIOH', namek: 'PLANETA NAMEK',
  freeza: 'NAVE DE FREEZA', explosao: 'NAMEK PRESTES A EXPLODIR', gt: 'SALA DO TEMPO', cell: 'TORNEIO DE CELL',
  boo: 'PLANETA SUPREMO KAIOH', kami: 'PLATAFORMA CELESTIAL', capital: 'CAPITAL DO OESTE',
};
