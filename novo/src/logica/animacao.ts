// Qual movimento do pacote de sprites mostrar. Os desenhos olham para a DIREITA; quem olha para a esquerda é
// espelhado e as poses de voo trocam de lado (trocarLadoDoMovimento no jogo antigo).
import type { Lutador } from './tipos';

export const MOVIMENTOS = [
  'idle', 'flyRight', 'flyLeft', 'flyUp', 'flyDown', 'flyUpRight', 'flyUpLeft', 'flyDownRight', 'flyDownLeft',
  'parry', 'attackKi', 'chargeKi', 'transform', 'special',
] as const;
export type Movimento = (typeof MOVIMENTOS)[number];

/** Movimentos que repetem; os outros tocam uma vez e ficam no último quadro. */
export const MOVIMENTOS_EM_LACO: ReadonlySet<Movimento> = new Set<Movimento>([
  'idle', 'flyRight', 'flyLeft', 'flyUp', 'flyDown', 'flyUpRight', 'flyUpLeft', 'flyDownRight', 'flyDownLeft', 'chargeKi',
]);

const ZONA_MORTA = 0.25;

/** Pose de voo pela direção do movimento JÁ no referencial do desenho (frente = direita). */
export function movimentoDeVoo(frente: number, vertical: number): Movimento {
  const h = frente > ZONA_MORTA ? 'Right' : frente < -ZONA_MORTA ? 'Left' : '';
  const v = vertical < -ZONA_MORTA ? 'Up' : vertical > ZONA_MORTA ? 'Down' : '';
  if (!h && !v) return 'idle';
  return `fly${v}${h}` as Movimento;
}

export interface Pose {
  movimento: Movimento;
  espelhar: boolean;
}

/** Pose de um lutador neste passo. Prioridade igual à da luta antiga: especial > transformar > parry > carregar > tiro > voo. */
export function poseDoLutador(l: Lutador): Pose {
  const espelhar = l.olhando === -1;
  let movimento: Movimento;
  if (l.emEspecial) movimento = 'special';
  else if (l.acao === 'transformando') movimento = 'transform';
  else if (l.poseParry > 0) movimento = 'parry';
  else if (l.acao === 'carregando') movimento = 'chargeKi';
  else if (l.acao === 'caido' || l.poseAtingido > 0) movimento = 'flyLeft'; // recuando
  else if (l.acao === 'vitoria') movimento = 'idle';
  else if (l.poseTiro > 0) movimento = 'attackKi';
  else movimento = movimentoDeVoo(l.movX * l.olhando, l.movY);
  return { movimento, espelhar };
}

/** Quadros por segundo de um movimento: fpsMov do pacote, senão o fps geral. */
export function fpsDoMovimento(m: Movimento, fps: number, fpsMov: Partial<Record<string, number>>): number {
  return fpsMov[m] ?? fps;
}
