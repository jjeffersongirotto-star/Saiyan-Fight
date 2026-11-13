import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { PERSONAGENS } from '../dados/personagens';
import { criarBotao } from '../ui/botao';
import type { DadosDaLuta } from './Menu';
import type { IdJogador } from '../logica/tipos';

export interface DadosDaVitoria {
  luta: DadosDaLuta;
  vencedor: IdJogador;
  placar: Record<IdJogador, number>;
}

export class Vitoria extends Phaser.Scene {
  constructor() {
    super('Vitoria');
  }

  create(d: DadosDaVitoria): void {
    ajustarCamera(this);
    const pers = PERSONAGENS[d.luta[d.vencedor]];
    this.add.rectangle(TELA_L / 2, TELA_A / 2, TELA_L, TELA_A, 0x0a0f1f, 1);
    if (this.textures.exists(pers.atlas)) {
      const s = this.add.sprite(TELA_L / 2, 262, pers.atlas, 'idle/0').setOrigin(0.5, 103 / 112).setScale(1.05 / (this.textures.get(pers.atlas).customData as { meta?: { saiyan?: { escala: number } } }).meta!.saiyan!.escala);
      const anim = `${pers.id}:idle`;
      if (this.anims.exists(anim)) s.play(anim);
    }
    this.add
      .text(TELA_L / 2, 40, `${pers.nome} ${T('VENCEU A PARTIDA!')}`, estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffd23a', stroke: '#8a2b00', strokeThickness: 6 }))
      .setOrigin(0.5);
    this.add.text(TELA_L / 2, 78, `${d.placar.p1} x ${d.placar.p2}`, estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff' })).setOrigin(0.5);
    const deNovo = () => this.scene.start('Luta', d.luta);
    const menu = () => this.scene.start('Menu');
    criarBotao(this, TELA_L / 2 - 170, 300, T('JOGAR DE NOVO'), deNovo, 240);
    criarBotao(this, TELA_L / 2 + 170, 300, T('MENU'), menu, 240);
    this.input.keyboard?.once('keydown-ENTER', deNovo);
    this.input.keyboard?.once('keydown-ESC', menu);
  }
}
