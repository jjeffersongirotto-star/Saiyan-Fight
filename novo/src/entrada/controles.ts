// Controles (gamepad) e "qual foi a última entrada usada" (para o modo AUTOMÁTICO de OPÇÕES → CONTROLES).
import { algumaCoisaApertada, intencaoDoControle, type ControleLido, type Intencao, INTENCAO_VAZIA } from '../logica/controle';
import { limiarDoAnalogico, opcoes } from '../logica/opcoes';

export function padsConectados(): Gamepad[] {
  try {
    const l = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    return Array.from(l || []).filter((p): p is Gamepad => !!p && p.connected !== false);
  } catch {
    return [];
  }
}

export const intencaoDe = (pad: ControleLido | null | undefined): Intencao =>
  pad ? intencaoDoControle(pad, limiarDoAnalogico(opcoes().sensibilidade), opcoes().controle) : INTENCAO_VAZIA;

type Tipo = 'pc' | 'touch' | 'joystick';
let ultima: Tipo | null = null;
let ultimoPad = 0;
export const ultimaEntrada = () => ultima;
export function marcarEntrada(t: Tipo) {
  if (t === 'joystick') ultimoPad = Date.now();
  else if (Date.now() - ultimoPad < 400) return; // o controle mexendo agora: o "mouse fantasma" não conta
  ultima = t;
}
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', () => marcarEntrada('pc'), true);
  window.addEventListener('pointerdown', (e) => marcarEntrada(e.pointerType === 'touch' ? 'touch' : 'pc'), true);
}

/** chamar por quadro: marca "joystick" quando algum controle tem algo apertado */
export function vigiarControles(): Intencao[] {
  const r = padsConectados().map((p) => intencaoDe(p));
  if (r.some(algumaCoisaApertada)) marcarEntrada('joystick');
  return r;
}
