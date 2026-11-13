// Barras de vida (4 pedaços, como no VERSUS antigo), ki, nome + forma atual, Zenkai e as rodadas vencidas.
import Phaser from 'phaser';
import { estiloTexto } from './resolucao';
import { KI_MAX, PODER_TRANSFORMACAO_QUADROS, RODADAS_PARA_VENCER, TELA_L } from '../logica/constantes';
import type { EstadoLuta, IdJogador } from '../logica/tipos';
import { formaDoNivel, PERSONAGENS } from '../dados/personagens';

export class Hud {
  private g: Phaser.GameObjects.Graphics;
  private nomes: Record<IdJogador, Phaser.GameObjects.Text>;
  private textoAtual: Record<IdJogador, string> = { p1: '', p2: '' };

  constructor(cena: Phaser.Scene, private readonly sufixoP2 = '') {
    this.g = cena.add.graphics().setDepth(800);
    const estilo = estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 });
    this.nomes = {
      p1: cena.add.text(16, 4, '', estilo).setDepth(801),
      p2: cena.add.text(TELA_L - 16, 4, '', estilo).setOrigin(1, 0).setDepth(801),
    };
  }

  desenhar(e: EstadoLuta): void {
    const g = this.g.clear();
    for (const id of ['p1', 'p2'] as const) {
      const l = e[id];
      const esq = id === 'p1';
      const forma = l.nivel > 0 ? ` · ${formaDoNivel(l.personagem, l.nivel).nome}` : '';
      const texto = `${PERSONAGENS[l.personagem]?.nome ?? l.personagem}${forma}${id === 'p2' ? this.sufixoP2 : ''}`;
      if (texto !== this.textoAtual[id]) { this.nomes[id].setText(texto); this.textoAtual[id] = texto; }
      const larg = 250, x0 = esq ? 16 : TELA_L - 16 - larg, y = 22;
      const ped = l.vidaMax, esp = 4, w = (larg - esp * (ped - 1)) / ped;
      for (let i = 0; i < ped; i++) {
        const idx = esq ? i : ped - 1 - i; // o lado de dentro esvazia primeiro
        const cheio = idx < l.vida;
        g.fillStyle(0x000000, 0.55).fillRect(x0 + i * (w + esp) - 1, y - 1, w + 2, 14);
        g.fillStyle(cheio ? (l.vida <= 1 ? 0xff3b30 : 0x34d058) : 0x3a1010, 1).fillRect(x0 + i * (w + esp), y, w, 12);
      }
      // ki (dourado cheio); por baixo, o tempo que resta do poder da transformação
      const ki = l.ki / KI_MAX, kl = larg * 0.7, kx = esq ? x0 : x0 + larg * 0.3;
      g.fillStyle(0x000000, 0.55).fillRect(kx - 1, y + 16, kl + 2, 8);
      g.fillStyle(ki >= 1 ? 0xffd23a : 0x3fa9ff, 1).fillRect(esq ? kx : kx + kl * (1 - ki), y + 17, kl * ki, 6);
      if (l.poder > 0) {
        const p = l.poder / PODER_TRANSFORMACAO_QUADROS;
        g.fillStyle(0xff8a00, 0.9).fillRect(esq ? kx : kx + kl * (1 - p), y + 25, kl * p, 2);
      }
      // rodadas vencidas + bolinha da Zenkai (some quando foi usada)
      for (let r = 0; r < RODADAS_PARA_VENCER; r++) {
        const cx = esq ? x0 + larg - 8 - r * 16 : x0 + 8 + r * 16;
        g.lineStyle(2, 0xffd23a, 1).strokeCircle(cx, y + 20, 5);
        if (r < e.placar[id]) g.fillStyle(0xffd23a, 1).fillCircle(cx, y + 20, 4);
      }
      if (!l.zenkaiUsada) {
        const cx = esq ? x0 + larg - 8 - RODADAS_PARA_VENCER * 16 - 4 : x0 + 12 + RODADAS_PARA_VENCER * 16;
        g.fillStyle(0xff6a00, 1).fillCircle(cx, y + 20, 3);
      }
    }
  }
}
