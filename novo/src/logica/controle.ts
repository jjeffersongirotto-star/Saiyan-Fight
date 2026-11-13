// Controle (gamepad PS/Xbox), sem Phaser: o que cada botão quer dizer (getGamepadIntent do antigo) e a Entrada
// da luta. Movimento: analógico esquerdo ou direcional (fixos). Ações seguem os botões escolhidos em OPÇÕES →
// JOYSTICK. Nos menus a CRUZ confirma e a BOLA volta sempre (para não travar se o jogador trocar os botões).
import type { Entrada } from './tipos';
import { ACOES_CONTROLE, CONTROLE_PADRAO, type AcaoControle, type BotoesControle } from './opcoes';

export interface ControleLido {
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}

export interface Intencao {
  cima: boolean; baixo: boolean; esquerda: boolean; direita: boolean;
  /** analógico esquerdo (-1..1), para andar com a força da inclinação */
  ax: number; ay: number;
  acoes: Record<AcaoControle, boolean>;
  confirmar: boolean; voltar: boolean; l1: boolean; r1: boolean; criar: boolean;
}

export const INTENCAO_VAZIA: Intencao = {
  cima: false, baixo: false, esquerda: false, direita: false, ax: 0, ay: 0,
  acoes: { attack: false, parry: false, charge: false, transform: false, special: false, pause: false },
  confirmar: false, voltar: false, l1: false, r1: false, criar: false,
};

export function intencaoDoControle(pad: ControleLido | null | undefined, limiar = 0.4, botoes: BotoesControle = CONTROLE_PADRAO): Intencao {
  if (!pad) return INTENCAO_VAZIA;
  const ap = (i: number) => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
  const algum = (l: number[]) => l.some(ap);
  const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
  const acoes = Object.fromEntries(ACOES_CONTROLE.map((a) => [a, algum(botoes[a])])) as Record<AcaoControle, boolean>;
  return {
    cima: ay < -limiar || ap(12), baixo: ay > limiar || ap(13), esquerda: ax < -limiar || ap(14), direita: ax > limiar || ap(15),
    ax: Math.abs(ax) > limiar ? ax : 0, ay: Math.abs(ay) > limiar ? ay : 0,
    acoes, confirmar: ap(0), voltar: ap(1), l1: ap(4), r1: ap(5), criar: ap(8),
  };
}

export const algumaCoisaApertada = (i: Intencao) =>
  i.cima || i.baixo || i.esquerda || i.direita || i.confirmar || i.voltar || Object.values(i.acoes).some(Boolean);

/** Entrada da luta a partir do controle. `antes` = intenção do passo anterior (gatilhos só no aperto novo). */
export function entradaDoControle(agora: Intencao, antes: Intencao): Entrada {
  const dpadX = (agora.direita ? 1 : 0) - (agora.esquerda ? 1 : 0), dpadY = (agora.baixo ? 1 : 0) - (agora.cima ? 1 : 0);
  // o analógico dá a força da inclinação; o direcional, 1
  const x = agora.ax !== 0 ? Math.max(-1, Math.min(1, agora.ax)) : dpadX;
  const y = agora.ay !== 0 ? Math.max(-1, Math.min(1, agora.ay)) : dpadY;
  const novo = (a: AcaoControle) => agora.acoes[a] && !antes.acoes[a];
  return {
    x, y,
    atacar: agora.acoes.attack, carregar: agora.acoes.charge,
    especial: novo('special'), parry: novo('parry'), transformar: novo('transform'),
  };
}

/** Quem é quem (getGamepadAssignments): o 1º controle é do J1, o 2º do J2. No VERSUS num aparelho de toque com
 *  um controle só, ele fica com o J2 (o J1 joga na tela). */
export function donosDosControles<T>(pads: T[], versus: boolean, toque: boolean): { p1?: T; p2?: T } {
  if (versus && toque && pads.length === 1) return { p2: pads[0] };
  return { p1: pads[0], p2: pads[1] };
}
