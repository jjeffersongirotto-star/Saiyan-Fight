import Phaser from 'phaser';
import { estiloTexto } from './resolucao';
import { som } from '../audio/som';

/** Botão de menu simples (retângulo arredondado + texto), funciona com mouse e toque. */
export function criarBotao(cena: Phaser.Scene, x: number, y: number, texto: string, aoClicar: () => void, largura = 320, altura = 40) {
  const a = altura;
  const fundo = cena.add.graphics();
  const desenhar = (destaque: boolean) =>
    fundo.clear()
      .fillStyle(destaque ? 0xff8a00 : 0x1d2a4d, 1).fillRoundedRect(-largura / 2, -a / 2, largura, a, 10)
      .lineStyle(2, 0xffd23a, 1).strokeRoundedRect(-largura / 2, -a / 2, largura, a, 10);
  desenhar(false);
  const rotulo = cena.add.text(0, 0, texto, estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#ffffff' })).setOrigin(0.5);
  const c = cena.add.container(x, y, [fundo, rotulo]).setSize(largura, a).setInteractive({ useHandCursor: true });
  c.on('pointerover', () => desenhar(true));
  c.on('pointerout', () => desenhar(false));
  c.on('pointerup', () => { som.ligar(); som.tocar('menu'); aoClicar(); });
  return { container: c, rotulo, desenhar };
}
