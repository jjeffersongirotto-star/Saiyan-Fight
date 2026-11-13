// Barras de vida (4 pedaços, como no VERSUS antigo), ki e as bolinhas das rodadas vencidas.
import Phaser from 'phaser';
import { estiloTexto } from './resolucao';
import { KI_MAX, RODADAS_PARA_VENCER, TELA_L } from '../logica/constantes';
import type { EstadoLuta } from '../logica/tipos';

export class Hud {
  private g: Phaser.GameObjects.Graphics;

  constructor(cena: Phaser.Scene, nomeP1: string, nomeP2: string) {
    this.g = cena.add.graphics().setDepth(800);
    const estilo = estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 });
    cena.add.text(16, 4, nomeP1, estilo).setDepth(801);
    cena.add.text(TELA_L - 16, 4, nomeP2, estilo).setOrigin(1, 0).setDepth(801);
  }

  desenhar(e: EstadoLuta): void {
    const g = this.g.clear();
    for (const id of ['p1', 'p2'] as const) {
      const l = e[id];
      const esq = id === 'p1';
      const larg = 250, x0 = esq ? 16 : TELA_L - 16 - larg, y = 22;
      // vida em pedaços
      const ped = l.vidaMax, esp = 4, w = (larg - esp * (ped - 1)) / ped;
      for (let i = 0; i < ped; i++) {
        const idx = esq ? i : ped - 1 - i; // o lado de dentro esvazia primeiro
        const cheio = idx < l.vida;
        g.fillStyle(0x000000, 0.55).fillRect(x0 + i * (w + esp) - 1, y - 1, w + 2, 14);
        g.fillStyle(cheio ? (l.vida <= 1 ? 0xff3b30 : 0x34d058) : 0x3a1010, 1).fillRect(x0 + i * (w + esp), y, w, 12);
      }
      // ki
      const ki = l.ki / KI_MAX;
      g.fillStyle(0x000000, 0.55).fillRect((esq ? x0 : x0 + larg * 0.3) - 1, y + 16, larg * 0.7 + 2, 8);
      g.fillStyle(ki >= 1 ? 0xffd23a : 0x3fa9ff, 1).fillRect(esq ? x0 : x0 + larg * 0.3 + larg * 0.7 * (1 - ki), y + 17, larg * 0.7 * ki, 6);
      // rodadas vencidas
      for (let r = 0; r < RODADAS_PARA_VENCER; r++) {
        const cx = esq ? x0 + larg - 8 - r * 16 : x0 + 8 + r * 16;
        g.lineStyle(2, 0xffd23a, 1).strokeCircle(cx, y + 20, 5);
        if (r < e.placar[id]) g.fillStyle(0xffd23a, 1).fillCircle(cx, y + 20, 4);
      }
    }
  }
}
