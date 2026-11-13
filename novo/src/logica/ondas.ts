// Ondas e modos do modo história (game-logic-core.js: getWaveParams, getAvailableBossPatterns, modos NORMAL /
// DIFÍCIL / SEM LIMITE e a liberação das fases). Tudo puro.

import { T } from './idioma';

export type ModoFase = 'normal' | 'hard' | 'unlimited';

/** a partir desta onda velocidade/frequência/vida param de crescer (WAVE_DIFFICULTY_CAP) */
export const ONDA_TETO = 10;
export const ONDAS_POR_MODO = 5; // STAGE_MODE_WAVE_COUNT
export const ONDAS_NORMAL = [1, 2, 3, 4, 5];
export const ONDAS_DIFICIL = [2, 4, 6, 8, 10];

export interface ParametrosOnda {
  multVelocidade: number;
  /** quadros entre dois ataques do vilão */
  intervaloTiro: number;
  vidaVilao: number;
  agressividade: number;
}

export function parametrosDaOnda(onda: number): ParametrosOnda {
  const o = Math.min(Math.max(1, onda), ONDA_TETO);
  const mult = 1 + (o - 1) * 0.12;
  return { multVelocidade: 0.9 * mult, intervaloTiro: Math.max(30, 110 - o * 8), vidaVilao: 4 + (o - 1), agressividade: 0.4 + o * 0.05 };
}

export type Padrao = 'fast' | 'triple' | 'homing' | 'spread5' | 'pincer' | 'burst8';

/** padrões liberados por onda: novos na 3, 5, 7 e 9 (getAvailableBossPatterns) */
export function padroesDaOnda(onda: number): Padrao[] {
  const p: Padrao[] = ['fast', 'triple'];
  if (onda >= 3) p.push('homing');
  if (onda >= 5) p.push('spread5');
  if (onda >= 7) p.push('pincer');
  if (onda >= 9) p.push('burst8');
  return p;
}

/** "saco" embaralhado: cada padrão sai 2 vezes por saco (getNextBossPattern). `sortear` = 0..1. */
export function encherSaco(onda: number, sortear: () => number): Padrao[] {
  const s = [...padroesDaOnda(onda), ...padroesDaOnda(onda)];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(sortear() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

/** a dificuldade real da luta `passo` (0..4) dentro do modo (getRealWaveForModeStep); SEM LIMITE = passo + 1 */
export function ondaDoPasso(modo: ModoFase, passo: number): number {
  if (modo === 'unlimited') return passo + 1;
  const seq = modo === 'hard' ? ONDAS_DIFICIL : ONDAS_NORMAL;
  return seq[Math.max(0, Math.min(passo, seq.length - 1))];
}

export type ProgressoFases = Record<string, { normalDone?: boolean; hardDone?: boolean }>;

/** A 1ª fase sempre libera; as outras quando a ANTERIOR teve o NORMAL completo (ou ela mesma já foi feita). */
export function faseLiberada(id: string, ordem: string[], prog: ProgressoFases): boolean {
  const i = ordem.indexOf(id);
  if (i < 0) return false;
  if (id.startsWith('arena_')) return true; // arena criada no EDITOR DE ARENAS: sempre liberada (como no antigo)
  if (i === 0 || prog[id]?.normalDone) return true;
  return !!prog[ordem[i - 1]]?.normalDone;
}
export const dificilLiberado = (id: string, prog: ProgressoFases) => !!prog[id]?.normalDone;
export const semLimiteLiberado = (id: string, prog: ProgressoFases) => !!(prog[id]?.normalDone && prog[id]?.hardDone);

/** Fase completa no modo: devolve o progresso novo (não muda o antigo). SEM LIMITE não "completa". */
export function registrarModoCompleto(prog: ProgressoFases, id: string, modo: ModoFase): ProgressoFases {
  if (modo === 'unlimited') return prog;
  const atual = { normalDone: !!prog[id]?.normalDone, hardDone: !!prog[id]?.hardDone };
  if (modo === 'hard') atual.hardDone = true;
  else atual.normalDone = true;
  return { ...prog, [id]: atual };
}

/** junta dois progressos (o do jogo antigo, só lido, e o do novo): vale o que estiver completo em qualquer um */
export function juntarProgresso(a: ProgressoFases, b: ProgressoFases): ProgressoFases {
  const r: ProgressoFases = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    r[k] = { normalDone: !!(a[k]?.normalDone || b[k]?.normalDone), hardDone: !!(a[k]?.hardDone || b[k]?.hardDone) };
  }
  return r;
}

/** "ONDA 3/5" no NORMAL; no DIFÍCIL mostra também a força real ("ONDA 3/5 · NÍVEL 6"); SEM LIMITE só "ONDA 7". */
export function rotuloDaOnda(modo: ModoFase, passo: number, onda: number): string {
  if (modo === 'unlimited') return `${T('ONDA')} ${passo + 1}`;
  const base = `${T('ONDA')} ${Math.min(passo + 1, ONDAS_POR_MODO)}/${ONDAS_POR_MODO}`;
  return modo === 'hard' ? `${base} · ${T('NÍVEL')} ${onda}` : base;
}

