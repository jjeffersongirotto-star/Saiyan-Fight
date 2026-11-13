// TRILHAS SONORAS (OPÇÕES → ÁUDIO → ♪ TRILHAS SONORAS do jogo antigo): uma linha por fase (2 colunas de 6) com o
// nome da música, a fase e o botão ▶ TOCAR / ❚❚ PAUSAR. Só uma toca por vez. Sair da tela para a música.
import Phaser from 'phaser';
import { ajustarCamera } from '../ui/resolucao';
import { TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { FASE_DO_TEMA, ORDEM_TEMAS, TEMAS, type IdTema } from '../dados/temas';
import { som } from '../audio/som';
import { botao, montarTela, painel, ret, texto, type BotaoTela } from '../ui/telas';

export const retLinhaTrilha = (i: number) => ret(86 + Math.floor(i / 6) * 322, 90 + (i % 6) * 38, 306, 35);

export class Trilhas extends Phaser.Scene {
  private linhas: { id: IdTema; g: Phaser.GameObjects.Graphics; nome: Phaser.GameObjects.Text; b: BotaoTela; i: number }[] = [];
  private aviso!: Phaser.GameObjects.Text;

  constructor() {
    super('Trilhas');
  }

  create(): void {
    ajustarCamera(this);
    const nav = montarTela(this, () => this.scene.start('OpcoesAudio'));
    painel(this, 70, 46, 660, 280, 'TRILHAS SONORAS', 'Toque para ouvir a música de cada fase');
    this.linhas = ORDEM_TEMAS.map((id, i) => {
      const r = retLinhaTrilha(i);
      const g = this.add.graphics();
      const nome = texto(this, r.x + 10, r.y + 15, '', 12, '#e2e8f0', { fontFamily: "'Segoe UI', sans-serif" }).setOrigin(0, 0.75);
      texto(this, r.x + 10, r.y + 29, `${T('Fase')} ${i + 1}: ${T(FASE_DO_TEMA[id])}`, 10, '#94a3b8', { fontFamily: "'Segoe UI', sans-serif", fontStyle: 'normal' }).setOrigin(0, 0.75);
      const rb = ret(r.x + r.w - 92, r.y + 4, 84, 27);
      const b = botao(this, rb, '', () => this.alternar(id));
      nav.add({ ...rb, acionar: b.acionar });
      return { id, g, nome, b, i };
    });
    this.aviso = texto(this, TELA_L / 2, 320, '', 12, '#fca5a5', { fontFamily: "'Segoe UI', sans-serif", fontStyle: 'normal' }).setOrigin(0.5, 0.75);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => som.musica(null));
    this.atualizar();
  }

  private alternar(id: IdTema): void {
    som.ligar();
    som.musica(som.musicaAtual === id ? null : id);
    this.atualizar();
  }

  private atualizar(): void {
    this.aviso.setText(som.mudo ? T('O áudio está mutado: ative em VOLUME E ÁUDIO para ouvir') : som.prefs.volMusica <= 0 ? T('O volume BGM está em 0%: aumente para ouvir') : '');
    for (const l of this.linhas) {
      const tocando = som.musicaAtual === l.id, r = retLinhaTrilha(l.i);
      l.g.clear().fillStyle(tocando ? 0xfde68a : 0x0f172a, tocando ? 0.18 : 0.55).fillRect(r.x, r.y, r.w, r.h).lineStyle(tocando ? 2 : 1, tocando ? 0xfde68a : 0x94a3b8, tocando ? 1 : 0.4).strokeRect(r.x, r.y, r.w, r.h);
      l.nome.setText((tocando ? '♪ ' : '') + TEMAS[l.id].nome).setColor(tocando ? '#fde68a' : '#e2e8f0');
      l.b.texto(T(tocando ? '❚❚ PAUSAR' : '▶ TOCAR'));
      l.b.corTexto(tocando ? '#fca5a5' : '#86efac');
    }
  }
}
