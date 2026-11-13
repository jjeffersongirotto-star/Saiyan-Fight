// Carrega só o que o MENU precisa (os botões de toque). Os lutadores são carregados pela própria cena da luta,
// com a barra, e ficam no cache para as próximas lutas.
import Phaser from 'phaser';
import { mostrarBarraDeCarregamento } from '../ui/barra';
import { carregarCenarios } from '../ui/arena';

export const ICONES_BOTOES = ['ataque', 'carregar', 'especial', 'parry', 'transformar'] as const;

export class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }
  preload(): void {
    mostrarBarraDeCarregamento(this);
    for (const n of ICONES_BOTOES) this.load.image(`botao-${n}`, `botoes/${n}.png`);
  }
  create(): void {
    // o código das arenas vem em segundo plano enquanto o jogador está nos menus
    carregarCenarios().catch(() => undefined);
    this.scene.start('Menu');
  }
}
