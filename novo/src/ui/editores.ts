// EDITOR DE PERSONAGENS e EDITOR DE ARENAS: entram na PR phaser-editores.
import type Phaser from 'phaser';
import { avisar } from './janela';

export function abrirEditor(_cena: Phaser.Scene, _qual: 'personagens' | 'arenas'): void {
  avisar('EDITOR', 'O EDITOR CHEGA NA PRÓXIMA ETAPA (PR phaser-editores).');
}
