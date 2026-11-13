// Teclas dos menus (Menu, Seleção, Vitória, ESC da luta). Ouvimos o `keydown` da janela direto, como o teclado
// da luta: o evento de teclado do Phaser chegou a repetir o mesmo aperto várias vezes quando o quadro atrasava
// (três setas rápidas andavam 4 a 8 casas na seleção). O ouvinte sai sozinho quando a cena termina.
import Phaser from 'phaser';

export function aoApertar(cena: Phaser.Scene, acao: (codigo: string, ev: KeyboardEvent) => void): void {
  const ouvinte = (ev: KeyboardEvent) => {
    if (!cena.sys.isActive()) return;
    acao(ev.code, ev);
  };
  window.addEventListener('keydown', ouvinte);
  cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', ouvinte));
}
