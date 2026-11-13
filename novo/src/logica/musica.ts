// Contas da música e dos sons (sem Web Audio): ler a notação das trilhas, montar os passos de semicolcheia e
// dizer o que toca em cada passo. Portado do audio.js do jogo antigo; quem toca de verdade é src/audio/som.ts.
import { TEMAS, type IdTema, type Onda, type Tema } from '../dados/temas';

const SEMITONS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#5" / "Bb4" -> número MIDI (null se não for nota) */
export function notaParaMidi(nome: string): number | null {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(nome);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + SEMITONS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export const midiParaFreq = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Notação -> um item por semicolcheia: { nota, dur } onde uma nota começa, null no resto (parseBgmLine). */
export function lerLinha(texto: string): ({ nota: string; dur: number } | null)[] {
  const passos: ({ nota: string; dur: number } | null)[] = [];
  for (const tok of texto.split(/[\s|]+/).filter(Boolean)) {
    const [nome, d] = tok.split(':');
    const dur = Number(d) || 1;
    passos.push(nome === '-' ? null : { nota: nome, dur });
    for (let i = 1; i < dur; i++) passos.push(null);
  }
  return passos;
}

export interface TemaCompilado {
  melodia: ({ midi: number; dur: number } | null)[];
  baixo: ({ midi: number; dur: number } | null)[];
  total: number;
}

const compilados = new Map<Tema, TemaCompilado>();
/** Melodia e baixo do tema em passos de semicolcheia (getCompiledTheme), guardado depois da 1ª vez. */
export function compilarTema(tema: Tema): TemaCompilado {
  const pronto = compilados.get(tema);
  if (pronto) return pronto;
  const melodia = lerLinha(tema.melodia).map((ev) => ev && { midi: notaParaMidi(ev.nota)!, dur: ev.dur });
  const padrao = lerLinha(tema.baixo);
  const baixo: TemaCompilado['baixo'] = [];
  for (const acorde of tema.acordes) {
    const raiz = notaParaMidi(acorde)!;
    for (const ev of padrao) baixo.push(ev && { midi: raiz + (ev.nota === 'Q' ? 7 : ev.nota === 'O' ? 12 : 0), dur: ev.dur });
  }
  const c = { melodia, baixo, total: Math.max(melodia.length, baixo.length) };
  compilados.set(tema, c);
  return c;
}

export const duracaoDoPasso = (tema: Tema) => 60 / tema.bpm / 4; // semicolcheia, em segundos

export interface NotaTocada { freq: number; onda: Onda; vol: number; dur: number; vibrato?: number }
export interface PassoTocado {
  /** atraso do balanço (shuffle), em segundos */
  atraso: number;
  notas: NotaTocada[];
  bateria: { tipo: 'bumbo' | 'caixa' | 'chimbal' | 'prato'; vol: number }[];
}

/** O que toca no passo `passo` do tema, com o volume da música `v` (playBgmStep). */
export function tocarPasso(tema: Tema, passo: number, v: number): PassoTocado {
  const c = compilarTema(tema);
  const seg = duracaoDoPasso(tema);
  const i = passo % c.total;
  const noCompasso = passo % tema.compasso;
  const atraso = tema.swing && noCompasso % 4 === 2 ? tema.swing * seg : 0;
  const notas: NotaTocada[] = [];
  const m = c.melodia[i];
  if (m) notas.push({ freq: midiParaFreq(m.midi), onda: tema.lead.onda, vol: tema.lead.vol * v, dur: m.dur * seg * tema.lead.staccato + 0.05, vibrato: tema.lead.vibrato });
  const b = c.baixo[i];
  if (b) notas.push({ freq: midiParaFreq(b.midi), onda: tema.ondaBaixo, vol: tema.volBaixo * v, dur: b.dur * seg * 0.85 + 0.03 });
  const bateria: PassoTocado['bateria'] = [];
  if (i === 0) bateria.push({ tipo: 'prato', vol: 0.04 * v }); // prato a cada volta da música
  if (tema.bumbo[noCompasso] === 'x') bateria.push({ tipo: 'bumbo', vol: 0.06 * v });
  if (tema.caixa[noCompasso] === 'x') bateria.push({ tipo: 'caixa', vol: 0.035 * v });
  else if (tema.chimbal[noCompasso] === 'x') bateria.push({ tipo: 'chimbal', vol: 0.03 * v });
  return { atraso, notas, bateria };
}

/** Trilha da luta. O jogo antigo tocava a música da fase; a luta nova é na planície (sem fase), então usa a do
 *  Torneio de Artes Marciais ("classico"), a fase padrão do VERSUS antigo (selectedStage = "terra"). */
export const TEMA_DA_LUTA: IdTema = 'classico';
export const temaExiste = (id: string): id is IdTema => id in TEMAS;

// ---------- efeitos sonoros (playSound): um oscilador com a frequência e o volume indo de um valor a outro ----------
export type NomeSom = 'shoot' | 'reflect' | 'super' | 'hit' | 'powerup' | 'charge' | 'max_ki' | 'transform' | 'menu';
export interface Som { onda: Onda; de: number; para: number; rampa: 'exp' | 'lin'; vol: number; dur: number }
export const SONS: Record<NomeSom, Som> = {
  shoot: { onda: 'sawtooth', de: 400, para: 100, rampa: 'exp', vol: 0.2, dur: 0.15 },
  reflect: { onda: 'square', de: 300, para: 800, rampa: 'exp', vol: 0.3, dur: 0.1 },
  super: { onda: 'triangle', de: 150, para: 600, rampa: 'lin', vol: 0.4, dur: 0.6 },
  hit: { onda: 'square', de: 120, para: 40, rampa: 'lin', vol: 0.4, dur: 0.2 },
  powerup: { onda: 'sine', de: 200, para: 600, rampa: 'exp', vol: 0.2, dur: 0.2 },
  charge: { onda: 'sine', de: 200, para: 600, rampa: 'exp', vol: 0.2, dur: 0.2 },
  max_ki: { onda: 'sawtooth', de: 300, para: 900, rampa: 'lin', vol: 0.3, dur: 0.4 },
  transform: { onda: 'triangle', de: 100, para: 1200, rampa: 'exp', vol: 0.5, dur: 0.8 },
  menu: { onda: 'sine', de: 500, para: 300, rampa: 'exp', vol: 0.15, dur: 0.08 },
};
/** Carregando ki, o jogo antigo tocava "charge" em ~20% dos quadros (Math.random() < 0.2). */
export const CHANCE_SOM_CARREGANDO = 0.2;
