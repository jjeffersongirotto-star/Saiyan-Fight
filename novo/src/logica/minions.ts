// Minions (Saibaman, Cell Jr.) — ainda não existem no jogo novo (entram na Fase 3, modo história). Aqui fica só
// o GANCHO da regra nova do Jefferson: ao transformar, quem está agarrado nas pernas do lutador é arremessado
// para longe. A luta já chama arremessarAgarrados() na transformação; no VERSUS a lista é sempre vazia.
// (No jogo antigo, só o ESPECIAL soltava os agarrados: destruirSaibamansAgarrados em gameplay.js.)
import type { IdJogador } from './tipos';

export interface MinionAgarravel {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** de quem está agarrado nas pernas (null = solto) */
  agarrando: IdJogador | null;
  /** quadros em que, depois de arremessado, ele não consegue agarrar de novo */
  atordoado: number;
}

/** velocidade do arremesso: para longe, para o lado de onde ele estava, e um pouco para cima */
export const ARREMESSO_VX = 14;
export const ARREMESSO_VY = -6;
export const ARREMESSO_ATORDOADO = 60;

/** Solta e arremessa para longe todos os minions agarrados em `dono` (centro em x). Devolve quantos voaram. */
export function arremessarAgarrados(dono: { id: IdJogador; x: number; olhando: number }, minions: MinionAgarravel[]): number {
  let n = 0;
  for (const m of minions) {
    if (m.agarrando !== dono.id) continue;
    const lado = m.x === dono.x ? dono.olhando : Math.sign(m.x - dono.x);
    m.agarrando = null;
    m.vx = lado * ARREMESSO_VX;
    m.vy = ARREMESSO_VY;
    m.atordoado = ARREMESSO_ATORDOADO;
    n++;
  }
  return n;
}
