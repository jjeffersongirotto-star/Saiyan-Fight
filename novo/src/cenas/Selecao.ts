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
import { retratoDe } from '../ui/criados';
import type { ModoFase } from '../logica/ondas';

// 16 personagens: 2 linhas de 8. Com os criados no editor do antigo os cartões diminuem (3 linhas).
let COLUNAS = 8, CARTA_L = 84, CARTA_A = 92, ESP = 8, LINHAS = 2;
let X0 = 0;
const Y0 = 46;
function medir(n: number): void {
  if (n <= 16) { COLUNAS = 8; CARTA_L = 84; CARTA_A = 92; ESP = 8; }
  else { COLUNAS = Math.max(9, Math.ceil(n / 3)); ESP = 6; CARTA_L = Math.floor((TELA_L - 40 - (COLUNAS - 1) * ESP) / COLUNAS); CARTA_A = Math.min(62, Math.round(CARTA_L * 1.1)); }
  LINHAS = Math.ceil(n / COLUNAS);
  X0 = (TELA_L - (COLUNAS * CARTA_L + (COLUNAS - 1) * ESP)) / 2;
}

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
  /** TUTORIAL / TUTORIAL LIVRE: depois do personagem, a escolha da forma (quadro por cima) */
  private quadroForma: { camada: Phaser.GameObjects.Container; id: string; foco: number; molduras: Phaser.GameObjects.Graphics[] } | null = null;

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
    this.quadroForma = null;
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
    medir(ORDEM_PERSONAGENS.length);
    ORDEM_PERSONAGENS.forEach((id, i) => {
      const { x, y } = this.posicao(i);
      this.add.rectangle(x, y, CARTA_L, CARTA_A, 0x14204a, 0.9).setOrigin(0, 0);
      const img = this.add.image(x + CARTA_L / 2, y + CARTA_A - 4, ...retratoDe(id)).setOrigin(0.5, 103 / 112);
      img.setScale((CARTA_A - 8) / 112 / 1.5 * 1.05);
      this.add.text(x + CARTA_L / 2, y + CARTA_A - 2, PERSONAGENS[id].nome, estiloTexto({ fontFamily: 'Arial', fontSize: '9px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5, 1);
      const moldura = this.add.graphics();
      this.molduras.push(moldura);
      const zona = this.add.zone(x, y, CARTA_L, CARTA_A).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zona.on('pointerover', (p: Phaser.Input.Pointer) => { if (!p.wasTouch) this.focar(i); });
      zona.on('pointerup', () => (this.foco === i ? this.escolher(id) : this.focar(i)));
    });
    const yInfo = Y0 + LINHAS * (CARTA_A + ESP) + 6;
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
      if (this.quadroForma) { this.teclaDaForma(codigo, ev); return; }
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
    if (this.quadroForma) return;
    if (this.modo === 'tutorial' || this.modo === 'treino') {
      if (PERSONAGENS[id].formas.length <= 1) this.comecarTreino(id, 0);
      else this.abrirFormas(id);
      return;
    }
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

  private comecarTreino(id: string, nivel: number): void {
    this.scene.start('Luta', { modo: this.modo, p1: id, p2: id, nivel } satisfies DadosDaLuta);
  }

  /** escolha da forma (TUTORIAL / TUTORIAL LIVRE): um botão por forma, na ordem das transformações */
  private abrirFormas(id: string): void {
    const p = PERSONAGENS[id], n = p.formas.length;
    const larg = 300, altB = 26, esp = 5, alt = 58 + n * (altB + esp) + 36;
    const x0 = (TELA_L - larg) / 2, y0 = Math.max(6, (350 - alt) / 2);
    const itens: Phaser.GameObjects.GameObject[] = [];
    const fundo = this.add.rectangle(TELA_L / 2, 175, TELA_L, 350, 0x000000, 0.6).setInteractive();
    const caixa = this.add.graphics().fillStyle(0x0c1636, 0.97).fillRoundedRect(x0, y0, larg, alt, 12).lineStyle(2, 0xffd23a, 1).strokeRoundedRect(x0, y0, larg, alt, 12);
    itens.push(fundo, caixa);
    itens.push(this.add.text(TELA_L / 2, y0 + 16, `${p.nome}: ${T('ESCOLHA A FORMA')}`, estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffd23a' })).setOrigin(0.5));
    itens.push(this.add.text(TELA_L / 2, y0 + 36, T(this.modo === 'tutorial' ? 'NO PASSO TRANSFORMAR VOCÊ SE TRANSFORMA NELA' : 'VOCÊ COMEÇA NELA E PODE SE TRANSFORMAR NAS PRÓXIMAS'),
      estiloTexto({ fontFamily: 'Arial', fontSize: '10px', color: '#dfe7ff' })).setOrigin(0.5));
    const molduras: Phaser.GameObjects.Graphics[] = [];
    p.formas.forEach((f, i) => {
      const y = y0 + 52 + i * (altB + esp);
      const g = this.add.graphics();
      molduras.push(g);
      const t = this.add.text(TELA_L / 2, y + altB / 2, `${i === 0 ? '' : i + '. '}${f.nome}`, estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ffffff' })).setOrigin(0.5);
      const z = this.add.zone(x0 + 14, y, larg - 28, altB).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      z.on('pointerover', (pt: Phaser.Input.Pointer) => { if (!pt.wasTouch) this.focarForma(i); });
      z.on('pointerup', () => { som.tocar('menu'); this.comecarTreino(id, i); });
      itens.push(g, t, z);
    });
    const voltar = criarBotao(this, TELA_L / 2, y0 + alt - 20, T('VOLTAR'), () => this.fecharFormas(), 120, 26);
    itens.push(voltar.container);
    this.quadroForma = { camada: this.add.container(0, 0, itens).setDepth(500), id, foco: 0, molduras };
    this.focarForma(0);
  }

  private focarForma(i: number): void {
    const q = this.quadroForma;
    if (!q) return;
    q.foco = i;
    const n = q.molduras.length, larg = 300, altB = 26, esp = 5, alt = 58 + n * (altB + esp) + 36;
    const x0 = (TELA_L - larg) / 2, y0 = Math.max(6, (350 - alt) / 2);
    q.molduras.forEach((g, k) => {
      const y = y0 + 52 + k * (altB + esp);
      g.clear().fillStyle(k === i ? 0xff8a00 : 0x1d2a4d, 1).fillRoundedRect(x0 + 14, y, larg - 28, altB, 8).lineStyle(1.5, 0xffd23a, k === i ? 1 : 0.5).strokeRoundedRect(x0 + 14, y, larg - 28, altB, 8);
    });
  }

  private fecharFormas(): void {
    this.quadroForma?.camada.destroy();
    this.quadroForma = null;
  }

  private teclaDaForma(codigo: string, ev: KeyboardEvent): void {
    const q = this.quadroForma!;
    const n = q.molduras.length;
    if (['ArrowUp', 'KeyI', 'ArrowLeft', 'KeyJ'].includes(codigo)) { ev.preventDefault(); this.focarForma((q.foco + n - 1) % n); }
    else if (['ArrowDown', 'KeyK', 'ArrowRight', 'KeyL'].includes(codigo)) { ev.preventDefault(); this.focarForma((q.foco + 1) % n); }
    else if (ev.repeat) return;
    else if (['Enter', 'NumpadEnter', 'Space', 'KeyF', 'KeyU'].includes(codigo)) this.comecarTreino(q.id, q.foco);
    else if (codigo === 'Escape') this.fecharFormas();
  }

  private voltar(): void {
    if (this.quadroForma) { this.fecharFormas(); return; }
    if (this.modo === 'tutorial' || this.modo === 'treino') { this.scene.start('Menu'); return; }
    if (this.modo === 'historia') this.scene.start('Mapa', { fase: this.fase });
    else if (this.escolhendo === 'p2') {
      this.escolhendo = 'p1';
      this.escolhaP1 = null;
      this.atualizar();
    } else this.scene.start('ModoJogo');
  }

  private atualizar(): void {
    this.titulo.setText(
      this.modo === 'historia' ? `${T('ESCOLHA O SEU HERÓI')} — ${T(faseDe(this.fase ?? '').nome)}`
        : this.modo === 'tutorial' ? T('TUTORIAL: ESCOLHA O LUTADOR') : this.modo === 'treino' ? T('TUTORIAL LIVRE: ESCOLHA O LUTADOR')
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
