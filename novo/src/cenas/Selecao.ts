// Escolha dos lutadores (VERSUS: jogador 1 e depois jogador 2; contra a CPU: o seu e o adversário).
// Só carrega os retratos (um atlas pequeno com o 1º quadro parado de cada um); as formas vêm na cena da luta.
// v0.144: mesmo visual das outras telas (fundo, ← e tela cheia), grade à direita e, à esquerda, o lutador em foco
// grande e animado (o atlas da forma normal vem ~0,3 s depois de parar no cartão; até lá, o retrato).
import Phaser from 'phaser';
import { conquistas, nivelLiberado } from '../logica/conquistas';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { ORDEM_PERSONAGENS, PERSONAGENS } from '../dados/personagens';
import { mostrarBarraDeCarregamento } from '../ui/barra';
import { criarBotao } from '../ui/botao';
import { botao, botaoTelaCheia, botaoVoltar, fundoDeMenu, ret } from '../ui/telas';
import { chaveDoAtlas } from '../dados/personagens';
import { PALETAS_AURA } from '../logica/efeitos';
import { criarAnimacoes, liberarFormas, pedirFormas } from '../ui/formas';
import { escalaDaAltura } from '../logica/luta';
import type { DadosDaLuta } from './Menu';
import { aoApertar } from '../entrada/teclas';
import { som } from '../audio/som';
import { mudarOpcoes, opcoes } from '../logica/opcoes';
import { faseDe } from '../dados/fases';
import { retratoDe } from '../ui/criados';
import type { ModoFase } from '../logica/ondas';

// grade à direita: 16 personagens = 6 colunas x 3 linhas; com os criados no editor os cartões diminuem
let COLUNAS = 6, CARTA_L = 80, CARTA_A = 78, ESP = 7;
const GRADE = { x: 248, y: 52, w: 532, h: 250 };
let X0 = GRADE.x;
const Y0 = GRADE.y;
function medir(n: number): void {
  COLUNAS = n <= 18 ? 6 : Math.ceil(n / 4);
  const linhas = Math.ceil(n / COLUNAS);
  ESP = n <= 18 ? 7 : 5;
  CARTA_L = Math.floor((GRADE.w - (COLUNAS - 1) * ESP) / COLUNAS);
  CARTA_A = Math.min(78, Math.floor((GRADE.h - (linhas - 1) * ESP) / linhas));
  X0 = GRADE.x + (GRADE.w - (COLUNAS * CARTA_L + (COLUNAS - 1) * ESP)) / 2;
}
/** quadro do lutador em foco (esquerda) */
const VITRINE = { x: 18, y: 52, w: 216, h: 250 };
/** posição de um lutador na grade (o 1º se não existir mais) */
const indiceDe = (id: string, senao = 0) => { const i = ORDEM_PERSONAGENS.indexOf(id); return i >= 0 ? i : senao; };
const lembrar = (q: 'p1' | 'p2', id: string) => mudarOpcoes((o) => { o.ultima[q] = id; });
const CORES_JOGADOR = { p1: 0x3fa9ff, p2: 0xff4a4a };
/** altura da célula (144x168 do atlas) de um personagem de altura padrão no quadro da esquerda */
const ALTURA_VITRINE = 200;

export class Selecao extends Phaser.Scene {
  private modo!: DadosDaLuta['modo'];
  private escolhendo: 'p1' | 'p2' = 'p1';
  private escolhaP1: string | null = null;
  private foco = 0;
  private molduras: Phaser.GameObjects.Graphics[] = [];
  private titulo!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private vitrine!: { fundo: Phaser.GameObjects.Graphics; img: Phaser.GameObjects.Image; sprite: Phaser.GameObjects.Sprite | null; id: string };
  private esperaVitrine: Phaser.Time.TimerEvent | null = null;
  /** "1P" no cartão já escolhido pelo jogador 1 */
  private marcaP1!: Phaser.GameObjects.Text;
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
    // v0.147: abre no último lutador usado
    this.foco = indiceDe(opcoes().ultima.p1);
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
    fundoDeMenu(this);
    this.add.rectangle(TELA_L / 2, 175, TELA_L, 350, 0x020a1d, 0.55);
    this.titulo = this.add.text(TELA_L / 2, 26, '', estiloTexto({ fontFamily: "'Trebuchet MS', Arial, sans-serif", fontStyle: 'bold italic', fontSize: '20px', color: '#ffd23f' })).setOrigin(0.5);
    this.titulo.setStroke('#7c2d12', 5);
    botaoVoltar(this, () => this.voltar());
    botaoTelaCheia(this);
    medir(ORDEM_PERSONAGENS.length);
    ORDEM_PERSONAGENS.forEach((id, i) => {
      const { x, y } = this.posicao(i);
      const pal = PALETAS_AURA[PERSONAGENS[id].formas[0].aura];
      this.add.graphics().fillGradientStyle(0x12305e, 0x12305e, 0x061634, 0x061634, 0.95).fillRect(x, y, CARTA_L, CARTA_A)
        .fillStyle(pal[1], 0.16).fillEllipse(x + CARTA_L / 2, y + CARTA_A * 0.5, CARTA_L * 0.9, CARTA_A * 0.75)
        .lineStyle(1, 0x2b4f86, 1).strokeRect(x, y, CARTA_L, CARTA_A);
      const img = this.add.image(x + CARTA_L / 2, y + CARTA_A - 13, ...retratoDe(id)).setOrigin(0.5, 103 / 112);
      img.setScale(Math.min((CARTA_A + 2) / img.height, (CARTA_L * 1.4) / img.width));
      const nome = this.add.text(x + CARTA_L / 2, y + CARTA_A - 2, PERSONAGENS[id].nome, estiloTexto({ fontFamily: "'Trebuchet MS', Arial, sans-serif", fontStyle: 'bold', fontSize: '9px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5, 1);
      if (nome.width > CARTA_L - 4) nome.setScale((CARTA_L - 4) / nome.width, 1);
      const moldura = this.add.graphics();
      this.molduras.push(moldura);
      const zona = this.add.zone(x, y, CARTA_L, CARTA_A).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zona.on('pointerover', (p: Phaser.Input.Pointer) => { if (!p.wasTouch) this.focar(i); });
      zona.on('pointerup', () => (this.foco === i ? this.escolher(id) : this.focar(i)));
    });
    this.marcaP1 = this.add.text(0, 0, '1P', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '9px', color: '#ffffff' })).setOrigin(0.5).setDepth(4).setVisible(false);
    this.molduras.forEach((m) => m.setDepth(3));
    // quadro do lutador em foco
    const fundo = this.add.graphics();
    const img = this.add.image(VITRINE.x + VITRINE.w / 2, VITRINE.y + VITRINE.h - 46, 'retratos', ORDEM_PERSONAGENS[0]).setOrigin(0.5, 103 / 112);
    this.vitrine = { fundo, img, sprite: null, id: '' };
    this.info = this.add.text(VITRINE.x + VITRINE.w / 2 - 6, VITRINE.y + VITRINE.h - 22, '', estiloTexto({ fontFamily: "'Trebuchet MS', Arial, sans-serif", fontStyle: 'bold italic', fontSize: '19px', color: '#fff0a6' })).setOrigin(0.5).setDepth(3);
    this.info.setStroke('#020617', 5);
    // v0.147: ESCOLHER confirma o lutador em foco (tocar no quadro grande também); antes era só tocar de novo no cartão
    botao(this, ret(VITRINE.x + 10, 312, VITRINE.w - 20, 28), 'ESCOLHER', () => this.escolher(ORDEM_PERSONAGENS[this.foco]), { cor: '#86efac' });
    this.add.zone(VITRINE.x, VITRINE.y, VITRINE.w, VITRINE.h).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => this.escolher(ORDEM_PERSONAGENS[this.foco]));
    botao(this, ret(GRADE.x + GRADE.w - 150, 312, 150, 28), 'ALEATÓRIO', () => this.escolher(ORDEM_PERSONAGENS[Math.floor(Math.random() * ORDEM_PERSONAGENS.length)]), { cor: '#fff0a6' });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.esperaVitrine?.remove(); this.esperaVitrine = null; });

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
    if (this.escolhendo === 'p1') lembrar('p1', id);
    if (this.modo === 'tutorial' || this.modo === 'treino') {
      // só as formas já feitas em luta (v0.141): sem nenhuma transformação feita, começa direto na normal
      if (nivelLiberado(conquistas(), id) === 0) this.comecarTreino(id, 0);
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
      this.foco = indiceDe(opcoes().ultima.p2, this.foco);
      this.atualizar();
      return;
    }
    lembrar('p2', id);
    this.scene.start('Arenas', { modo: this.modo, p1: this.escolhaP1!, p2: id } satisfies DadosDaLuta);
  }

  private comecarTreino(id: string, nivel: number): void {
    this.scene.start('Luta', { modo: this.modo, p1: id, p2: id, nivel } satisfies DadosDaLuta);
  }

  /** escolha da forma (TUTORIAL / TUTORIAL LIVRE): um botão por forma, na ordem das transformações */
  private abrirFormas(id: string): void {
    const p = PERSONAGENS[id], formas = p.formas.slice(0, nivelLiberado(conquistas(), id) + 1), n = formas.length;
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
    formas.forEach((f, i) => {
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
    const corJ = CORES_JOGADOR[this.escolhendo];
    this.marcaP1.setVisible(!!this.escolhaP1);
    ORDEM_PERSONAGENS.forEach((id, i) => {
      const { x, y } = this.posicao(i);
      const g = this.molduras[i].clear();
      if (id === this.escolhaP1) {
        g.lineStyle(2, CORES_JOGADOR.p1, 1).strokeRect(x - 1, y - 1, CARTA_L + 2, CARTA_A + 2);
        g.fillStyle(CORES_JOGADOR.p1, 1).fillRect(x, y, 20, 12);
        this.marcaP1.setPosition(x + 10, y + 6.5);
      }
      if (i === this.foco) g.lineStyle(7, corJ, 0.3).strokeRect(x - 2, y - 2, CARTA_L + 4, CARTA_A + 4).lineStyle(3, corJ, 1).strokeRect(x, y, CARTA_L, CARTA_A);
    });
    const id = ORDEM_PERSONAGENS[this.foco];
    // v0.139: só o nome (sem alinhamento, golpe e lista de formas)
    this.info.setText(PERSONAGENS[id].nome);
    this.info.setScale(Math.min(1, (VITRINE.w - 30) / (this.info.width || 1)));
    this.mostrarNaVitrine(id);
  }

  /** quadro da esquerda: o retrato na hora; depois de ~0,3 s parado no cartão, o lutador animado */
  private mostrarNaVitrine(id: string): void {
    const v = this.vitrine;
    if (v.id === id) return;
    v.id = id;
    const pal = PALETAS_AURA[PERSONAGENS[id].formas[0].aura], corJ = CORES_JOGADOR[this.escolhendo];
    const { x, y, w, h } = VITRINE, s = 22;
    const forma = [{ x: x + s, y }, { x: x + w, y }, { x: x + w - s, y: y + h }, { x, y: y + h }];
    v.fundo.clear().fillStyle(0x000000, 0.4).fillPoints(forma.map((p) => ({ x: p.x + 3, y: p.y + 5 })), true)
      .fillGradientStyle(0x0f2c56, 0x0f2c56, 0x030d23, 0x030d23, 0.96).fillPoints(forma, true)
      .fillStyle(pal[1], 0.22).fillEllipse(x + w / 2, y + h * 0.48, w * 0.9, h * 0.7)
      .fillStyle(pal[2], 0.12).fillEllipse(x + w / 2, y + h * 0.48, w * 0.5, h * 0.45)
      .fillStyle(0x000000, 0.35).fillEllipse(x + w / 2, y + h - 46, 90, 10)
      .fillStyle(0x020617, 0.85).fillPoints([{ x: x + s * 0.2, y: y + h - 40 }, { x: x + w - s * 0.8, y: y + h - 40 }, { x: x + w - s, y: y + h }, { x, y: y + h }], true)
      .lineStyle(2.5, corJ, 1).strokePoints(forma, true);
    v.sprite?.destroy();
    v.sprite = null;
    const [k, fr] = retratoDe(id);
    v.img.setTexture(k, fr).setVisible(true);
    // a mesma altura no retrato e no lutador animado (v0.146: antes o animado aparecia maior ou menor), pela altura
    // do personagem, mas sem passar do topo do quadro (os muito altos ficam no limite)
    const alturaCelula = Math.min(ALTURA_VITRINE * escalaDaAltura(PERSONAGENS[id].formas[0].altura), (v.img.y - VITRINE.y - 4) / (103 / 112));
    v.img.setScale(alturaCelula / v.img.height);
    this.esperaVitrine?.remove();
    if (PERSONAGENS[id].criado) return;
    this.esperaVitrine = this.time.delayedCall(300, () => {
      const chave = chaveDoAtlas(id, 0);
      const pronto = () => {
        if (!this.sys.isActive() || v.id !== id || !this.textures.exists(chave)) return;
        const manter = new Set([chave]);
        if (this.escolhaP1) manter.add(chaveDoAtlas(this.escolhaP1, 0));
        liberarFormas(this, manter);
        criarAnimacoes(this, chave);
        v.sprite = this.add.sprite(v.img.x, v.img.y, chave, 'idle/0').setOrigin(0.5, 103 / 112).setDepth(2);
        v.sprite.setScale(alturaCelula / v.sprite.height);
        v.sprite.play(`${chave}:idle`);
        v.img.setVisible(false);
      };
      if (pedirFormas(this, [chave]) === 0) { pronto(); return; }
      this.load.once(Phaser.Loader.Events.COMPLETE, pronto);
      this.load.start();
    });
  }
}
