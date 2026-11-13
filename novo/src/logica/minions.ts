// Minions do modo história (Saibaman e Cell Jr.), portados de game-logic-core.js / gameplay.js (spawnSaibaman,
// stepSaibamanMotion, shouldSaibamanLunge, stepSaibamanLunge, throwSaibaman, explodeSaibaman). Posição = CENTRO
// da caixa de 32x40 (no antigo era o canto). Ciclo: brota da terra → salta → voa para a esquerda → se passa perto
// do herói, investe → agarra as pernas e explode em 40 quadros (tira 1 de vida).
// Para se soltar (como no antigo): CARREGAR ou PARRY arremessam o agarrado (o do parry voa reto até o vilão e
// explode nele, tirando 1). Regras novas do Jefferson: TRANSFORMAR arremessa para longe (arremessarAgarrados) e o
// ESPECIAL destrói quem está agarrado (destruirAgarrados) — valem para os dois lutadores.
import * as C from './constantes';
import type { EstadoLuta, Evento, IdJogador, Lutador, Tiro } from './tipos';

export type FaseMinion = 'brotar' | 'saltar' | 'voar' | 'investir' | 'agarrar' | 'arremessado';
export type ModeloMinion = 'saibaman' | 'celljr';

export interface MinionAgarravel {
  id: number;
  modelo: ModeloMinion;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** de quem está agarrado nas pernas (null = solto) */
  agarrando: IdJogador | null;
  /** quadros em que, depois de arremessado, ele não consegue agarrar de novo */
  atordoado: number;
  fase: FaseMinion;
  faseQuadros: number;
  vida: number;
  velocidade: number;
  chaoY: number;
  alvoY: number;
  saltoVy: number;
  flutua: number;
  /** quadros que faltam para explodir (agarrado) */
  explode: number;
  /** arremessado pelo parry: atravessa a arena e explode no vilão */
  lancadoParry: boolean;
}

export const MINION_L = 32, MINION_A = 40;
export const MINION_VIDA = 2;
export const MINIONS_MAX = 20;                 // MAX_SAIBAMANS
export const MINION_INTERVALO = 300;           // SPAWN_TIMERS.SAIBAMAN_FRAMES
export const BROTAR_QUADROS = 28;              // SAIBAMAN_SPROUT_FRAMES
export const AGARRAR_QUADROS = 40;             // SAIBAMAN_GRAB_FRAMES
export const INVESTIDA_RAIO = 90;              // SAIBAMAN_LUNGE_RADIUS
export const INVESTIDA_VEL = 5.5;
export const INVESTIDA_MAX = 50;
export const GRAVIDADE = 0.32;
export const ARREMESSADO_QUADROS = 32;         // SAIBAMAN_THROWN_FRAMES
export const ARREMESSO_FRACO_VX = 9;           // SAIBAMAN_THROW_SPEED (carregar)
export const ARREMESSO_PARRY_VX = 15;          // SAIBAMAN_PARRY_THROW_SPEED
export const ARREMESSO_PARRY_QUADROS = 70;
/** velocidade do arremesso da TRANSFORMAÇÃO (regra nova): para longe, do lado de onde ele estava, e para cima */
export const ARREMESSO_VX = 14;
export const ARREMESSO_VY = -6;
export const ARREMESSO_ATORDOADO = 60;

/** Novo minion saindo da terra em `x` (createSaibaman). `alvoY` = altura de voo; `velocidade` 2..3,5. */
export function criarMinion(id: number, x: number, alvoY: number, velocidade: number, modelo: ModeloMinion = 'saibaman'): MinionAgarravel {
  const chaoY = C.CHAO_Y - MINION_A / 2;
  return {
    id, modelo, x, y: chaoY, vx: 0, vy: 0, agarrando: null, atordoado: 0,
    fase: 'brotar', faseQuadros: 0, vida: MINION_VIDA, velocidade, chaoY, alvoY,
    saltoVy: -Math.sqrt(2 * GRAVIDADE * Math.max(30, chaoY - alvoY)), flutua: 0, explode: 0, lancadoParry: false,
  };
}

/** Só acerta / é acertado depois de sair da terra (isSaibamanActive). */
export const minionAtivo = (m: MinionAgarravel) => m.fase !== 'brotar';

/** Quem está invulnerável (depois de apanhar, começo da rodada) ou transformando não pode ser agarrado
 *  (gameplay.js: podeAgarrar = ... invulnerableTimer === 0) — vale para os dois. */
export const podeSerAgarrado = (l: { invulneravel: number; acao: string }) => l.invulneravel <= 0 && l.acao !== 'transformando';

/** caixa de acerto com margem de 18% (getHitboxRect) */
function caixa(x: number, y: number, l: number, a: number) {
  const ml = l * 0.18, ma = a * 0.18;
  return { x0: x - l / 2 + ml, x1: x + l / 2 - ml, y0: y - a / 2 + ma, y1: y + a / 2 - ma };
}
export function encostaNoLutador(m: MinionAgarravel, l: Lutador): boolean {
  const a = caixa(m.x, m.y, MINION_L, MINION_A), b = caixa(l.x, l.y, l.l, l.a);
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/** Movimento sem alvo (stepSaibamanMotion): brotar, saltar, voar e arremessado. */
export function moverMinion(m: MinionAgarravel): void {
  m.faseQuadros++;
  if (m.atordoado > 0) m.atordoado--;
  if (m.fase === 'brotar') {
    m.y = m.chaoY;
    if (m.faseQuadros >= BROTAR_QUADROS) { m.fase = 'saltar'; m.faseQuadros = 0; m.vy = m.saltoVy; }
  } else if (m.fase === 'saltar') {
    m.x -= m.velocidade * 0.4;
    m.y += m.vy;
    m.vy += GRAVIDADE;
    if (m.vy >= 0 || m.y <= m.alvoY) { m.fase = 'voar'; m.faseQuadros = 0; m.vy = 0; }
  } else if (m.fase === 'arremessado') {
    m.x += m.vx;
    m.vx *= m.lancadoParry ? 0.985 : 0.9;
    m.y += m.vy;
    m.vy += GRAVIDADE * (m.lancadoParry ? 0.08 : 0.6);
    m.y = Math.min(m.y, m.chaoY);
    if (m.faseQuadros >= (m.lancadoParry ? ARREMESSO_PARRY_QUADROS : ARREMESSADO_QUADROS)) {
      m.fase = 'voar'; m.faseQuadros = 0; m.vy = 0; m.lancadoParry = false;
    }
  } else if (m.fase === 'voar') {
    m.x -= m.velocidade;
    m.flutua += 0.05;
    m.y += Math.sin(m.flutua) * 1.5;
  }
  // nunca abaixo do chão nem acima do teto (o antigo podia afundar no chão balançando)
  if (m.fase !== 'brotar') m.y = Math.max(C.TETO_Y + MINION_A / 2, Math.min(m.chaoY, m.y));
}

/** Passou a menos de INVESTIDA_RAIO do alvo voando: parte para cima (shouldSaibamanLunge). */
export const deveInvestir = (m: MinionAgarravel, tx: number, ty: number) =>
  m.fase === 'voar' && m.atordoado <= 0 && (tx - m.x) ** 2 + (ty - m.y) ** 2 <= INVESTIDA_RAIO ** 2;

export function investir(m: MinionAgarravel, tx: number, ty: number): void {
  m.faseQuadros++;
  const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
  const passo = Math.min(d, INVESTIDA_VEL);
  m.x += (dx / d) * passo;
  m.y += (dy / d) * passo;
  if (m.faseQuadros >= INVESTIDA_MAX) { m.fase = 'voar'; m.faseQuadros = 0; }
}

/** CARREGAR (fraco) ou PARRY (forte) com ele agarrado: voa para trás, rumo ao vilão (throwSaibaman). */
export function soltarMinion(m: MinionAgarravel, forte: boolean): void {
  m.agarrando = null;
  m.fase = 'arremessado';
  m.faseQuadros = 0;
  m.lancadoParry = forte;
  m.vx = forte ? ARREMESSO_PARRY_VX : ARREMESSO_FRACO_VX;
  m.vy = forte ? -0.6 : -4;
}

/** O especial destrói quem está agarrado nas pernas de quem soltou (destruirSaibamansAgarrados, sem tirar vida
 *  de quem soltou). No antigo só o herói tinha isso; agora os dois. Tira da lista; devolve quantos. */
export function destruirAgarrados(dono: { id: IdJogador }, minions: MinionAgarravel[]): number {
  let n = 0;
  for (let i = minions.length - 1; i >= 0; i--) {
    if (minions[i].agarrando !== dono.id) continue;
    minions.splice(i, 1);
    n++;
  }
  return n;
}

/** Regra nova: ao transformar, solta e arremessa para longe todos os agarrados em `dono`. Devolve quantos voaram. */
export function arremessarAgarrados(dono: { id: IdJogador; x: number; olhando: number }, minions: MinionAgarravel[]): number {
  let n = 0;
  for (const m of minions) {
    if (m.agarrando !== dono.id) continue;
    const lado = m.x === dono.x ? dono.olhando : Math.sign(m.x - dono.x);
    m.agarrando = null;
    m.fase = 'arremessado';
    m.faseQuadros = 0;
    m.lancadoParry = false;
    m.vx = lado * ARREMESSO_VX;
    m.vy = ARREMESSO_VY;
    m.atordoado = ARREMESSO_ATORDOADO;
    n++;
  }
  return n;
}

/** Tiro do herói num minion ativo (que não esteja agarrado): tira 1 e some. true = o tiro acabou aqui. */
export function tiroNosMinions(e: EstadoLuta, t: Tiro, eventos: Evento[]): boolean {
  for (let i = e.minions.length - 1; i >= 0; i--) {
    const m = e.minions[i];
    if (!minionAtivo(m) || m.fase === 'agarrar') continue;
    const dx = Math.max(Math.abs(t.x - m.x) - MINION_L * 0.32, 0), dy = Math.max(Math.abs(t.y - m.y) - MINION_A * 0.32, 0);
    if (dx * dx + dy * dy > t.raio * t.raio) continue;
    m.vida -= t.dano;
    const morreu = m.vida <= 0;
    if (morreu) {
      e.minions.splice(i, 1);
      if (e.historia) { e.historia.pontos += 1; e.historia.stats.minions++; }
    }
    eventos.push({ tipo: 'minionAcertado', x: t.x, y: t.y, morreu });
    return true;
  }
  return false;
}

/** Ordem das 8 células de minions/<modelo>.webp (MINION_IMAGEM_POSES do jogo antigo, virados para a ESQUERDA). */
export const MINION_POSES = ['saltar', 'voar0', 'voar1', 'voar2', 'voar3', 'investir', 'agarrar', 'arremessado'] as const;
export const MINION_CELULA_L = 144, MINION_CELULA_A = 168;
/** a célula é a caixa 32x40 + margem 8, 3x maior; o desenho sai 1,3x a caixa (MINION_DRAW_SCALE) */
export const MINION_ESCALA_DESENHO = 1.3 / 3;

/** Qual célula desenhar e se espelha (o desenho olha para a esquerda). `quadro` = relógio da luta. */
export function poseDoMinion(m: MinionAgarravel, quadro: number): { celula: number; espelhar: boolean; afundado: number } {
  const voar = 1 + (Math.floor(quadro / 8) % 4);
  const celula = m.fase === 'brotar' || m.fase === 'saltar' ? 0 : m.fase === 'investir' ? 5 : m.fase === 'agarrar' ? 6 : m.fase === 'arremessado' ? 7 : voar;
  // brotando: sai do chão aos poucos (0 = inteiro para fora, 1 = enterrado)
  const afundado = m.fase === 'brotar' ? Math.max(0, 1 - m.faseQuadros / BROTAR_QUADROS) : 0;
  return { celula, espelhar: m.fase === 'arremessado' ? m.vx > 0 : false, afundado };
}
