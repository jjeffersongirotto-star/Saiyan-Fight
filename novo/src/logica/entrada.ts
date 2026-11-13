// Entrada do teclado e do joystick de toque, sem Phaser: só contas, para dar para testar.
import type { Entrada } from './tipos';

export interface MapaTeclas {
  cima: string[];
  baixo: string[];
  esquerda: string[];
  direita: string[];
  atacar: string[];
  carregar: string[];
  especial: string[];
  parry: string[];
  transformar: string[];
}

// event.code (posição física da tecla, igual em qualquer layout). J1 = padrão do jogo antigo (setas, S, Q, Espaço;
// o ataque com o mouse vira F). J2 = teclado numérico do jogo antigo + IJKL para notebook sem teclado numérico.
export const TECLAS_P1: MapaTeclas = {
  cima: ['ArrowUp'], baixo: ['ArrowDown'], esquerda: ['ArrowLeft'], direita: ['ArrowRight'],
  atacar: ['KeyF'], carregar: ['KeyS'], especial: ['KeyQ'], parry: ['Space'], transformar: ['KeyA'],
};
export const TECLAS_P2: MapaTeclas = {
  cima: ['Numpad5', 'KeyI'], baixo: ['Numpad2', 'KeyK'], esquerda: ['Numpad1', 'KeyJ'], direita: ['Numpad3', 'KeyL'],
  atacar: ['Enter', 'KeyU'], carregar: ['NumpadEnter', 'KeyO'], especial: ['Numpad7', 'KeyY'], parry: ['Numpad0', 'KeyP'],
  transformar: ['Numpad9', 'KeyH'],
};
/** Teclas que o jogo usa: o navegador não deve rolar a página nem fazer outra coisa com elas. */
export const TECLAS_DO_JOGO = new Set(Object.values({ ...TECLAS_P1 }).flat().concat(Object.values(TECLAS_P2).flat()));

const algum = (lista: string[], teclas: ReadonlySet<string>) => lista.some((c) => teclas.has(c));

/** segurando = teclas apertadas agora; apertadas = teclas que desceram desde a última leitura (gatilhos). */
export function entradaDoTeclado(m: MapaTeclas, segurando: ReadonlySet<string>, apertadas: ReadonlySet<string>): Entrada {
  return {
    x: (algum(m.direita, segurando) ? 1 : 0) - (algum(m.esquerda, segurando) ? 1 : 0),
    y: (algum(m.baixo, segurando) ? 1 : 0) - (algum(m.cima, segurando) ? 1 : 0),
    // aperto rápido (desce e sobe no mesmo quadro) também vale: senão o toque curto no choque se perdia
    atacar: algum(m.atacar, segurando) || algum(m.atacar, apertadas),
    carregar: algum(m.carregar, segurando),
    especial: algum(m.especial, apertadas),
    parry: algum(m.parry, apertadas),
    transformar: algum(m.transformar, apertadas),
  };
}

/** Vetor do joystick de toque (-1..1) pelo deslocamento do dedo; zona morta de 15% no centro. */
export function vetorDoJoystick(dx: number, dy: number, raio: number): { x: number; y: number } {
  const d = Math.hypot(dx, dy);
  if (raio <= 0 || d < raio * 0.15) return { x: 0, y: 0 };
  const f = Math.min(1, d / raio) / d;
  return { x: dx * f, y: dy * f };
}

/** Junta duas entradas do mesmo jogador (teclado + toque): qualquer uma vale. */
export function juntarEntradas(a: Entrada, b: Entrada): Entrada {
  const eixo = (u: number, v: number) => Math.max(-1, Math.min(1, Math.abs(u) >= Math.abs(v) ? u : v));
  return {
    x: eixo(a.x, b.x), y: eixo(a.y, b.y),
    atacar: a.atacar || b.atacar, carregar: a.carregar || b.carregar,
    especial: a.especial || b.especial, parry: a.parry || b.parry, transformar: a.transformar || b.transformar,
  };
}
