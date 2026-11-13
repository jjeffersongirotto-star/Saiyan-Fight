// Primeira cena: lê o idioma salvo e passa para o carregamento (nada pesado aqui, a tela aparece na hora).
import Phaser from 'phaser';
import { carregarIdioma } from '../logica/idioma';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create(): void {
    carregarIdioma();
    this.scene.start('Preload');
  }
}
