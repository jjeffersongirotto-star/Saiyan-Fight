import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_A, TELA_L } from '../logica/constantes';
import { definirIdioma, IDIOMAS, idiomaAtual, T } from '../logica/idioma';
import { criarBotao } from '../ui/botao';
import { desenharFundo } from './fundo';
import { aoApertar } from '../entrada/teclas';
import { som } from '../audio/som';

import type { ModoFase } from '../logica/ondas';

export interface DadosDaLuta {
  modo: 'cpu' | 'versus' | 'historia';
  p1: string;
  p2: string;
  /** só no modo história: a fase (id de FASES) e o modo dela */
  fase?: string;
  modoFase?: ModoFase;
}

export class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    ajustarCamera(this);
    desenharFundo(this);
    this.add.rectangle(TELA_L / 2, TELA_A / 2, TELA_L, TELA_A, 0x000000, 0.35);
    this.add
      .text(TELA_L / 2, 62, 'SAIYAN FIGHT', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '46px', color: '#ffd23a', stroke: '#8a2b00', strokeThickness: 8 }))
      .setOrigin(0.5);
    this.add.text(TELA_L / 2, 104, `${T('PRÉVIA PHASER')} v${__VERSAO__}`, estiloTexto({ fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' })).setOrigin(0.5);

    const lutar = (modo: DadosDaLuta['modo']) => (modo === 'historia' ? this.scene.start('Mapa') : this.scene.start('Selecao', { modo }));
    criarBotao(this, TELA_L / 2, 144, T('MODO HISTÓRIA'), () => lutar('historia'));
    criarBotao(this, TELA_L / 2, 188, T('1 JOGADOR (CONTRA A CPU)'), () => lutar('cpu'));
    criarBotao(this, TELA_L / 2, 232, T('2 JOGADORES (VERSUS)'), () => lutar('versus'));
    // fora da luta não toca música (como no jogo antigo: o BGM é só da luta)
    som.musica(null);
    criarBotao(this, TELA_L / 2 - 258, 276, `${T('IDIOMA')}: ${idiomaAtual().toUpperCase()}`, () => {
      definirIdioma(IDIOMAS[(IDIOMAS.indexOf(idiomaAtual()) + 1) % IDIOMAS.length]);
      this.scene.restart();
    }, 165);
    criarBotao(this, TELA_L / 2 - 86, 276, T('TELA CHEIA'), () => this.alternarTelaCheia(), 165);
    const botaoSom = criarBotao(this, TELA_L / 2 + 86, 276, T(som.mudo ? 'SOM: DESLIGADO' : 'SOM: LIGADO'), () => {
      botaoSom.rotulo.setText(T(som.alternarMudo() ? 'SOM: DESLIGADO' : 'SOM: LIGADO'));
    }, 165);
    criarBotao(this, TELA_L / 2 + 258, 276, T('TRILHAS SONORAS'), () => this.scene.start('Trilhas'), 165);

    const estilo = estiloTexto({ fontFamily: 'Arial', fontSize: '11px', color: '#dfe7ff' });
    this.add.text(TELA_L / 2, 312, T('J1: setas mover · F atacar · S carregar · A transformar · Q especial · Espaço parry'), estilo).setOrigin(0.5);
    this.add.text(TELA_L / 2, 328, T('J2: IJKL mover · U atacar · O carregar · H transformar · Y especial · P parry (ou teclado numérico)'), estilo).setOrigin(0.5);

    let foi = false;
    aoApertar(this, (c) => {
      if (foi) return;
      const modo = ({ Digit1: 'cpu', Numpad1: 'cpu', Enter: 'cpu', NumpadEnter: 'cpu', Digit2: 'versus', Numpad2: 'versus', KeyH: 'historia', Digit3: 'historia', Numpad3: 'historia' } as const)[c];
      if (modo) { foi = true; lutar(modo); }
    });
  }

  private alternarTelaCheia(): void {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
      return;
    }
    this.scale.startFullscreen();
    // no celular, trava deitado quando dá (só funciona em tela cheia)
    const tela = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    tela.lock?.('landscape').catch(() => undefined);
  }
}
