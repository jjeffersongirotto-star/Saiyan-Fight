// Tela de VERSUS antes da luta (v0.144): o lado azul do jogador 1 e o vermelho do adversário, divididos por um corte
// inclinado, os lutadores entrando dos lados, os nomes e um "VS" grande. ~1,8 s; tocar ou apertar uma tecla pula.
// Usa o 1º quadro parado da forma (o atlas da luta já carregado), então não carrega nada a mais.
import Phaser from 'phaser';
import { TELA_A, TELA_L } from '../logica/constantes';
import { chaveDoAtlas, PERSONAGENS } from '../dados/personagens';
import { estiloTexto } from './resolucao';
import { som } from '../audio/som';

export const DURACAO_VERSUS = 1800;
const PROF = 3000;

export function mostrarVersus(cena: Phaser.Scene, p1: { id: string; nivel: number }, p2: { id: string; nivel: number }, aoFim: () => void): void {
  const itens: Phaser.GameObjects.GameObject[] = [];
  const corte = (y: number) => 470 - (y - 60) * 0.4; // x da linha que divide os lados
  const fundo = cena.add.graphics();
  fundo.fillStyle(0x020617, 0.82).fillRect(0, 0, TELA_L, TELA_A);
  fundo.fillGradientStyle(0x1d4ed8, 0x0b2a6b, 0x1e3a8a, 0x020b2e, 0.95).fillPoints([{ x: 0, y: 60 }, { x: corte(60), y: 60 }, { x: corte(290), y: 290 }, { x: 0, y: 290 }], true);
  fundo.fillGradientStyle(0x7f1d1d, 0xb91c1c, 0x2a0505, 0x7f1d1d, 0.95).fillPoints([{ x: corte(60), y: 60 }, { x: TELA_L, y: 60 }, { x: TELA_L, y: 290 }, { x: corte(290), y: 290 }], true);
  fundo.lineStyle(10, 0xe85d04, 0.5).lineBetween(corte(60), 60, corte(290), 290).lineStyle(4, 0xffd23f, 1).lineBetween(corte(60), 60, corte(290), 290);
  fundo.lineStyle(2, 0xffd23f, 0.8).lineBetween(0, 60, TELA_L, 60).lineBetween(0, 290, TELA_L, 290);
  itens.push(fundo);
  const lado = (j: { id: string; nivel: number }, esq: boolean) => {
    const chave = chaveDoAtlas(j.id, j.nivel);
    const xFim = esq ? 200 : TELA_L - 200;
    if (cena.textures.exists(chave)) {
      const img = cena.add.image(esq ? -150 : TELA_L + 150, 282, chave, 'idle/0').setOrigin(0.5, 103 / 112).setFlipX(!esq);
      img.setScale(230 / img.height);
      itens.push(img);
      cena.tweens.add({ targets: img, x: xFim, duration: 380, ease: 'Back.easeOut', delay: esq ? 0 : 120 });
    }
    const nome = cena.add.text(esq ? 24 : TELA_L - 24, 312, PERSONAGENS[j.id]?.nome ?? j.id, estiloTexto({ fontFamily: "'Trebuchet MS', Arial, sans-serif", fontStyle: 'bold italic', fontSize: '24px', color: esq ? '#bfe3ff' : '#ffd0d0' })).setOrigin(esq ? 0 : 1, 0.5);
    nome.setStroke('#020617', 6).setAlpha(0);
    cena.tweens.add({ targets: nome, alpha: 1, duration: 250, delay: 250 });
    itens.push(nome);
  };
  lado(p1, true);
  lado(p2, false);
  const vs = cena.add.text(TELA_L / 2 - 14, 176, 'VS', estiloTexto({ fontFamily: "'Trebuchet MS', Arial, sans-serif", fontStyle: 'bold italic', fontSize: '64px', color: '#ffd23f' })).setOrigin(0.5);
  vs.setStroke('#7c2d12', 10).setShadow(3, 4, '#000000', 6, true, true).setScale(3).setAlpha(0);
  itens.push(vs);
  cena.tweens.add({ targets: vs, scale: 1, alpha: 1, duration: 260, delay: 380, ease: 'Quad.easeIn', onComplete: () => { som.tocar('super'); cena.cameras.main.shake(180, 0.008); } });
  const camada = cena.add.container(0, 0, itens).setDepth(PROF);
  const bloqueio = cena.add.zone(0, 0, TELA_L, TELA_A).setOrigin(0).setInteractive().setDepth(PROF + 1);
  let acabou = false;
  const fim = () => {
    if (acabou) return;
    acabou = true;
    teclado?.off('keydown', fim);
    bloqueio.destroy();
    cena.tweens.add({ targets: camada, alpha: 0, duration: 220, onComplete: () => camada.destroy(true) });
    aoFim();
  };
  const teclado = cena.input.keyboard;
  teclado?.once('keydown', fim);
  bloqueio.once('pointerup', fim);
  cena.time.delayedCall(DURACAO_VERSUS, fim);
}
