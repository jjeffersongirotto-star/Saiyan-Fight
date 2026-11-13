// Escolha dos lutadores (VERSUS: jogador 1 e depois jogador 2; contra a CPU: o seu e o adversário).
// Só carrega os retratos (um atlas pequeno com o 1º quadro parado de cada um); as formas vêm na cena da luta.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { ORDEM_PERSONAGENS, PERSONAGENS } from '../dados/personagens';
import { mostrarBarraDeCarregamento } from '../ui/barra';
import { criarBotao } from '../ui/botao';
import { desenharFundo } from './fundo';
import type { DadosDaLuta } from './Menu';
import { aoApertar } from '../entrada/teclas';
import { som } from '../audio/som';
import { faseDe } from '../dados/fases';
import type { ModoFase } from '../logica/ondas';

const COLUNAS = 8, CARTA_L = 84, CARTA_A = 92, ESP = 8;
const X0 = (TELA_L - (COLUNAS * CARTA_L + (COLUNAS - 1) * ESP)) / 2, Y0 = 46;

export class Selecao extends Phaser.Scene {
  private modo!: DadosDaLuta['modo'];
  private escolhendo: 'p1' | 'p2' = 'p1';
  private escolhaP1: string | null = null;
  private foco = 0;
  private molduras: Phaser.GameObjects.Graphics[] = [];
  private titulo!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private formas!: Phaser.GameObjects.Text;
  /** modo história: só o herói é escolhido (o vilão é o da fase) */
  private fase: string | undefined;
  private modoFase: ModoFase | undefined;

  constructor() {
    super('Selecao');
  }

  init(d: { modo: DadosDaLuta['modo']; fase?: string; modoFase?: ModoFase }): void {
    this.modo = d.modo;
    this.fase = d.fase;
    this.modoFase = d.modoFase;
    this.escolhendo = 'p1';
    this.escolhaP1 = null;
    this.foco = 0;
    this.molduras = [];
  }

  preload(): void {
    if (!this.textures.exists('retratos')) {
      mostrarBarraDeCarregamento(this);
      this.load.atlas('retratos', 'atlas/retratos.webp', 'atlas/retratos.json');
    }
  }

  create(): void {
    som.musica(null); // a música é só da luta (como no jogo antigo)
    ajustarCamera(this);
    desenharFundo(this);
    this.add.rectangle(TELA_L / 2, 175, TELA_L, 350, 0x000000, 0.45);
    this.titulo = this.add.text(TELA_L / 2, 22, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffd23a', stroke: '#8a2b00', strokeThickness: 5 })).setOrigin(0.5);
    ORDEM_PERSONAGENS.forEach((id, i) => {
      const { x, y } = this.posicao(i);
      this.add.rectangle(x, y, CARTA_L, CARTA_A, 0x14204a, 0.9).setOrigin(0, 0);
      const img = this.add.image(x + CARTA_L / 2, y + CARTA_A - 4, 'retratos', id).setOrigin(0.5, 103 / 112);
      img.setScale((CARTA_A - 8) / 112 / 1.5 * 1.05);
      this.add.text(x + CARTA_L / 2, y + CARTA_A - 2, PERSONAGENS[id].nome, estiloTexto({ fontFamily: 'Arial', fontSize: '9px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5, 1);
      const moldura = this.add.graphics();
      this.molduras.push(moldura);
      const zona = this.add.zone(x, y, CARTA_L, CARTA_A).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zona.on('pointerover', (p: Phaser.Input.Pointer) => { if (!p.wasTouch) this.focar(i); });
      zona.on('pointerup', () => (this.foco === i ? this.escolher(id) : this.focar(i)));
    });
    const yInfo = Y0 + 2 * (CARTA_A + ESP) + 6;
    this.info = this.add.text(X0, yInfo, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff' }));
    this.formas = this.add.text(X0, yInfo + 22, '', estiloTexto({ fontFamily: 'Arial', fontSize: '11px', color: '#dfe7ff', wordWrap: { width: 520 } }));
    criarBotao(this, TELA_L - 190, yInfo + 24, T('ALEATÓRIO'), () => this.escolher(ORDEM_PERSONAGENS[Math.floor(Math.random() * ORDEM_PERSONAGENS.length)]), 130);
    criarBotao(this, TELA_L - 60, yInfo + 24, T('VOLTAR'), () => this.voltar(), 100);

    const mover = (dx: number, dy: number) => {
      const n = ORDEM_PERSONAGENS.length;
      let c = this.foco % COLUNAS + dx, l = Math.floor(this.foco / COLUNAS) + dy;
      c = (c + COLUNAS) % COLUNAS;
      l = (l + Math.ceil(n / COLUNAS)) % Math.ceil(n / COLUNAS);
      this.focar(Math.min(n - 1, l * COLUNAS + c));
    };
    aoApertar(this, (codigo, ev) => {
      const m: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyJ: [-1, 0], KeyL: [1, 0], KeyI: [0, -1], KeyK: [0, 1] };
      if (m[codigo]) { ev.preventDefault(); mover(...m[codigo]); }
      else if (ev.repeat) return;
      else if (['Enter', 'NumpadEnter', 'Space', 'KeyF', 'KeyU'].includes(codigo)) this.escolher(ORDEM_PERSONAGENS[this.foco]);
      else if (codigo === 'Escape') this.voltar();
    });
    this.atualizar();
  }

  private posicao(i: number) {
    return { x: X0 + (i % COLUNAS) * (CARTA_L + ESP), y: Y0 + Math.floor(i / COLUNAS) * (CARTA_A + ESP) };
  }

  private focar(i: number): void {
    this.foco = i;
    this.atualizar();
  }

  private escolher(id: string): void {
    if (this.modo === 'historia') {
      const f = faseDe(this.fase ?? '');
      this.scene.start('Luta', { modo: 'historia', p1: id, p2: f.vilao.personagem, fase: f.id, modoFase: this.modoFase ?? 'normal' } satisfies DadosDaLuta);
      return;
    }
    if (this.escolhendo === 'p1') {
      this.escolhaP1 = id;
      this.escolhendo = 'p2';
      this.atualizar();
      return;
    }
    this.scene.start('Arenas', { modo: this.modo, p1: this.escolhaP1!, p2: id } satisfies DadosDaLuta);
  }

  private voltar(): void {
    if (this.modo === 'historia') this.scene.start('Mapa', { fase: this.fase });
    else if (this.escolhendo === 'p2') {
      this.escolhendo = 'p1';
      this.escolhaP1 = null;
      this.atualizar();
    } else this.scene.start('Menu');
  }

  private atualizar(): void {
    this.titulo.setText(
      this.modo === 'historia' ? `${T('ESCOLHA O SEU HERÓI')} — ${T(faseDe(this.fase ?? '').nome)}`
        : this.escolhendo === 'p1' ? T('JOGADOR 1: ESCOLHA O LUTADOR') : this.modo === 'cpu' ? T('ESCOLHA O ADVERSÁRIO (CPU)') : T('JOGADOR 2: ESCOLHA O LUTADOR'),
    );
    ORDEM_PERSONAGENS.forEach((id, i) => {
      const { x, y } = this.posicao(i);
      const g = this.molduras[i].clear();
      if (id === this.escolhaP1) g.lineStyle(3, 0x3fa9ff, 1).strokeRect(x - 2, y - 2, CARTA_L + 4, CARTA_A + 4);
      if (i === this.foco) g.lineStyle(3, this.escolhendo === 'p1' ? 0x3fa9ff : 0xff4a4a, 1).strokeRect(x, y, CARTA_L, CARTA_A);
    });
    const p = PERSONAGENS[ORDEM_PERSONAGENS[this.foco]];
    this.info.setText(`${p.nome}  ·  ${T(p.alinhamento)}  ·  ${p.especial}`);
    this.formas.setText(`${T('FORMAS')} (${p.formas.length}): ${p.formas.map((f) => f.nome).join(' → ')}`);
  }
}
