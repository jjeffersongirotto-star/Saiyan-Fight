import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { escalaDaAltura } from '../logica/luta';
import { PERSONAGENS } from '../dados/personagens';
import { criarBotao } from '../ui/botao';
import { metaDoAtlas } from '../ui/formas';
import type { DadosDaLuta } from './Menu';
import type { IdJogador } from '../logica/tipos';
import { aoApertar } from '../entrada/teclas';

export interface DadosDaVitoria {
  luta: DadosDaLuta;
  vencedor: IdJogador;
  placar: Record<IdJogador, number>;
  /** atlas da forma em que o vencedor terminou */
  atlas: string;
  altura: number;
}

export class Vitoria extends Phaser.Scene {
  constructor() {
    super('Vitoria');
  }

  create(d: DadosDaVitoria): void {
    ajustarCamera(this);
    const pers = PERSONAGENS[d.luta[d.vencedor]];
    this.add.rectangle(TELA_L / 2, TELA_A / 2, TELA_L, TELA_A, 0x0a0f1f, 1);
    if (this.textures.exists(d.atlas)) {
      const k = Math.min(1.15, escalaDaAltura(d.altura));
      const s = this.add.sprite(TELA_L / 2, 270, d.atlas, 'idle/0').setOrigin(0.5, 103 / 112).setScale(k / metaDoAtlas(this, d.atlas).escala);
      if (this.anims.exists(`${d.atlas}:idle`)) s.play(`${d.atlas}:idle`);
    }
    this.add
      .text(TELA_L / 2, 40, `${pers.nome} ${T('VENCEU A PARTIDA!')}`, estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffd23a', stroke: '#8a2b00', strokeThickness: 6 }))
      .setOrigin(0.5);
    this.add.text(TELA_L / 2, 78, `${d.placar.p1} x ${d.placar.p2}`, estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff' })).setOrigin(0.5);
    const deNovo = () => this.scene.start('Luta', d.luta);
    const outros = () => this.scene.start('Selecao', { modo: d.luta.modo });
    const menu = () => this.scene.start('Menu');
    criarBotao(this, TELA_L / 2 - 250, 318, T('JOGAR DE NOVO'), deNovo, 220);
    criarBotao(this, TELA_L / 2, 318, T('TROCAR PERSONAGENS'), outros, 240);
    criarBotao(this, TELA_L / 2 + 250, 318, T('MENU'), menu, 220);
    let foi = false;
    aoApertar(this, (c, ev) => {
      if (foi || ev.repeat) return;
      if (c === 'Enter' || c === 'NumpadEnter') { foi = true; deNovo(); }
      else if (c === 'Escape') { foi = true; menu(); }
    });
  }
}
