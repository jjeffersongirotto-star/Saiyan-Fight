// TRILHAS SONORAS (Opções > Áudio do jogo antigo): ouvir cada uma das 11 músicas. Só uma toca por vez — tocar
// outra pausa a anterior; tocar a mesma de novo pausa. Sair da tela para a música.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { FASE_DO_TEMA, ORDEM_TEMAS, TEMAS, type IdTema } from '../dados/temas';
import { som } from '../audio/som';
import { criarBotao } from '../ui/botao';
import { desenharFundo } from './fundo';
import { aoApertar } from '../entrada/teclas';

export class Trilhas extends Phaser.Scene {
  private botoes: { id: IdTema; desenhar: (d: boolean) => void; rotulo: Phaser.GameObjects.Text }[] = [];
  private aviso!: Phaser.GameObjects.Text;

  constructor() {
    super('Trilhas');
  }

  create(): void {
    ajustarCamera(this);
    desenharFundo(this);
    this.add.rectangle(TELA_L / 2, TELA_A / 2, TELA_L, TELA_A, 0x000000, 0.45);
    this.add.text(TELA_L / 2, 26, T('TRILHAS SONORAS'), estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffd23a', stroke: '#8a2b00', strokeThickness: 5 })).setOrigin(0.5);
    this.aviso = this.add.text(TELA_L / 2, 52, '', estiloTexto({ fontFamily: 'Arial', fontSize: '12px', color: '#dfe7ff' })).setOrigin(0.5);
    this.botoes = [];
    ORDEM_TEMAS.forEach((id, i) => {
      const col = i % 2, lin = Math.floor(i / 2);
      const x = TELA_L / 2 + (col === 0 ? -195 : 195), y = 86 + lin * 40;
      const b = criarBotao(this, x, y, '', () => this.alternar(id), 380);
      b.rotulo.setFontSize(13);
      this.botoes.push({ id, desenhar: b.desenhar, rotulo: b.rotulo });
    });
    // a última linha tem uma trilha só: o VOLTAR fica ao lado dela
    criarBotao(this, TELA_L / 2 + 195, 86 + 5 * 40, T('VOLTAR'), () => this.scene.start('Menu'), 380);
    aoApertar(this, (c) => { if (c === 'Escape') this.scene.start('Menu'); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => som.musica(null));
    this.atualizar();
  }

  private alternar(id: IdTema): void {
    som.ligar();
    som.musica(som.musicaAtual === id ? null : id);
    this.atualizar();
  }

  private atualizar(): void {
    this.aviso.setText(T(som.mudo ? 'SOM DESLIGADO NO MENU' : 'TOQUE NUMA TRILHA PARA OUVIR (DE NOVO PARA PAUSAR)'));
    for (const b of this.botoes) {
      const tocando = som.musicaAtual === b.id;
      b.rotulo.setText(`${tocando ? '❚❚' : '▶'}  ${TEMAS[b.id].nome} · ${FASE_DO_TEMA[b.id]}`);
      b.desenhar(tocando);
    }
  }
}
