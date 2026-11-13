// Nitidez: o jogo continua com as coordenadas lógicas 800x350 (como o jogo antigo), mas o canvas real tem
// ESCALA_RENDER vezes mais pixels (até 2x em telas de alta densidade) e a câmera dá zoom nessa escala.
// Assim textos e desenhos ficam nítidos no celular, sem mudar nenhuma conta da luta (renderScale do jogo antigo).
import Phaser from 'phaser';
import { TELA_A, TELA_L } from '../logica/constantes';

export const ESCALA_RENDER = Math.min(2, Math.max(1, Math.round(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)));

/** Chamar no create() de toda cena: mostra o mundo 0..800 x 0..350 inteiro no canvas maior. */
export function ajustarCamera(cena: Phaser.Scene): void {
  cena.cameras.main.setZoom(ESCALA_RENDER).centerOn(TELA_L / 2, TELA_A / 2);
}

/** Estilo de texto com a resolução certa para o zoom (senão o texto sai borrado). */
export function estiloTexto(s: Phaser.Types.GameObjects.Text.TextStyle): Phaser.Types.GameObjects.Text.TextStyle {
  return { resolution: ESCALA_RENDER, ...s };
}
