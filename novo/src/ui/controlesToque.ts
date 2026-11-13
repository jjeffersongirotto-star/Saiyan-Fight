// Controles de toque do jogador 1, com as OPÇÕES → CONTROLES TOUCH do jogo antigo:
//  • ANALÓGICO: joystick que aparece onde o dedo encosta (metade esquerda) · DESLIZAR: o dedo arrasta o lutador;
//  • botões à direita (desenhos de icons/botoes/) no lugar/tamanho/opacidade do REORGANIZAR BOTÕES HUD;
//  • DUPLO TOQUE PARRY: dois toques rápidos numa área livre = parry, e o botão PARRY some (isHudButtonHidden);
//  • TIRO CONTÍNUO: com o dedo no analógico/na tela o lutador atira sem parar, e o botão ATAQUE some.
// Como no jogo antigo não há botão TRANSF.: com o ki cheio (e forma para subir) CARREGAR vira TRANSFORMAR, e só
// um toque NOVO transforma — o dedo que já estava segurando para carregar precisa soltar antes.
import Phaser from 'phaser';
import { TELA_L } from '../logica/constantes';
import { vetorDoJoystick } from '../logica/entrada';
import type { Entrada } from '../logica/tipos';
import { ENTRADA_VAZIA } from '../logica/tipos';
import { opcoes, type BotaoHud, type Opcoes } from '../logica/opcoes';

type NomeBotao = 'atacar' | 'carregar' | 'especial' | 'parry';
interface Botao {
  nome: NomeBotao;
  chave: BotaoHud;
  x: number;
  y: number;
  r: number;
  alfa: number;
  icone: string;
  escondido: boolean;
  dedos: Set<number>;
  disco: Phaser.GameObjects.Graphics;
  imagem: Phaser.GameObjects.Image;
}

export const ICONES_HUD: Record<BotaoHud, string> = { charge: 'botao-carregar', parry: 'botao-parry', attack: 'botao-ataque', special: 'botao-especial' };
const NOMES: Record<BotaoHud, NomeBotao> = { charge: 'carregar', parry: 'parry', attack: 'atacar', special: 'especial' };
const RAIO_JOYSTICK = 56;
/** dois toques em menos disso (ms) numa área livre = parry */
export const DUPLO_TOQUE_MS = 300;

/** isHudButtonHidden do antigo */
export const botaoEscondido = (o: Pick<Opcoes, 'duploToqueParry' | 'tiroContinuo'>, k: BotaoHud) =>
  (k === 'parry' && o.duploToqueParry) || (k === 'attack' && o.tiroContinuo);

export class ControlesToque {
  private botoes: Botao[] = [];
  private joyDedo: number | null = null;
  private joyBase = { x: 0, y: 0 };
  private joyVetor = { x: 0, y: 0 };
  private arrastoDedo: number | null = null;
  private arrastoUltimo = { x: 0, y: 0 };
  private arrasto = { x: 0, y: 0 };
  private ultimoToqueLivre = 0;
  private gatilhos = { especial: false, parry: false, atacar: false };
  /** dedos que encostaram em CARREGAR desde a última leitura / dedos que já viraram TRANSFORMAR */
  private novosNoCarregar = new Set<number>();
  private usadosParaTransformar = new Set<number>();
  private modoTransformar = false;
  private grafJoy: Phaser.GameObjects.Graphics;
  private visivel = false;
  /** segundos com o dedo no analógico e na tela (dica "APOIE O DEDO" some depois de 2 s segurando ou 10 s) */
  seguradoSeg = 0;

  constructor(private readonly cena: Phaser.Scene) {
    cena.input.addPointer(3); // até 4 dedos
    for (const k of Object.keys(ICONES_HUD) as BotaoHud[]) {
      const disco = cena.add.graphics().setDepth(900);
      const imagem = cena.add.image(0, 0, ICONES_HUD[k]).setDepth(901);
      this.botoes.push({ nome: NOMES[k], chave: k, x: 0, y: 0, r: 30, alfa: 0.75, icone: ICONES_HUD[k], escondido: false, dedos: new Set(), disco, imagem });
    }
    this.recarregar();
    this.grafJoy = cena.add.graphics().setDepth(900);
    cena.input.on(Phaser.Input.Events.POINTER_DOWN, this.desce, this);
    cena.input.on(Phaser.Input.Events.POINTER_MOVE, this.move, this);
    cena.input.on(Phaser.Input.Events.POINTER_UP, this.sobe, this);
    cena.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.sobe, this);
    // aparece no aparelho com toque (ou no primeiro toque); com o modo TOUCH escolhido aparece sempre
    this.mostrar(cena.sys.game.device.input.touch || opcoes().modoControle === 'touch');
  }

  /** relê as opções (volta da pausa → OPÇÕES): posições, tamanhos, botões escondidos */
  recarregar(): void {
    const o = opcoes();
    for (const b of this.botoes) {
      const h = o.hud[b.chave];
      b.x = h.x; b.y = h.y; b.r = h.r * h.escala; b.alfa = h.opacidade;
      b.escondido = botaoEscondido(o, b.chave);
      b.dedos.clear();
      b.imagem.setPosition(b.x, b.y).setAlpha(b.alfa);
      b.imagem.setScale((b.r * 1.3) / Math.max(b.imagem.width, b.imagem.height));
    }
    this.mostrar(this.visivel);
  }

  get ativo(): boolean { return this.visivel; }

  private mostrar(v: boolean) {
    this.visivel = v;
    for (const b of this.botoes) { b.disco.setVisible(v && !b.escondido); b.imagem.setVisible(v && !b.escondido); }
    if (!v) this.grafJoy?.clear();
  }

  private desce(p: Phaser.Input.Pointer) {
    if (p.wasTouch && !this.visivel) this.mostrar(true);
    if (!this.visivel) return;
    const b = this.botaoEm(p.worldX, p.worldY);
    if (b) {
      this.apertar(b, p.id);
      return;
    }
    if (p.worldX < TELA_L * 0.45) {
      if (opcoes().modoToque === 'swipe') {
        if (this.arrastoDedo === null) { this.arrastoDedo = p.id; this.arrastoUltimo = { x: p.worldX, y: p.worldY }; }
      } else if (this.joyDedo === null) {
        this.joyDedo = p.id;
        this.joyBase = { x: p.worldX, y: p.worldY };
        this.joyVetor = { x: 0, y: 0 };
      }
      return;
    }
    // duplo toque numa área livre (fora do analógico e dos botões) = parry
    if (opcoes().duploToqueParry) {
      const agora = this.cena.time.now;
      if (agora - this.ultimoToqueLivre < DUPLO_TOQUE_MS) { this.gatilhos.parry = true; this.ultimoToqueLivre = 0; }
      else this.ultimoToqueLivre = agora;
    }
  }

  private botaoEm(x: number, y: number): Botao | undefined {
    return this.botoes.find((bt) => !bt.escondido && Phaser.Math.Distance.Between(x, y, bt.x, bt.y) <= bt.r + 10);
  }

  private apertar(b: Botao, dedo: number) {
    b.dedos.add(dedo);
    if (b.nome === 'especial') this.gatilhos.especial = true;
    if (b.nome === 'parry') this.gatilhos.parry = true;
    if (b.nome === 'atacar') this.gatilhos.atacar = true; // toque curto entre duas leituras também atira
    if (b.nome === 'carregar') this.novosNoCarregar.add(dedo);
  }

  private move(p: Phaser.Input.Pointer) {
    if (p.id === this.joyDedo) {
      this.joyVetor = vetorDoJoystick(p.worldX - this.joyBase.x, p.worldY - this.joyBase.y, RAIO_JOYSTICK);
      return;
    }
    if (p.id === this.arrastoDedo) {
      this.arrasto.x += p.worldX - this.arrastoUltimo.x;
      this.arrasto.y += p.worldY - this.arrastoUltimo.y;
      this.arrastoUltimo = { x: p.worldX, y: p.worldY };
      return;
    }
    // dedo que escorrega de um botão para outro (ex.: de ATAQUE para ESPECIAL) aperta o novo sem levantar
    const atual = this.botoes.find((b) => b.dedos.has(p.id));
    if (!atual || !p.isDown) return;
    const novo = this.botaoEm(p.worldX, p.worldY);
    if (!novo || novo === atual) return;
    atual.dedos.delete(p.id);
    this.novosNoCarregar.delete(p.id);
    this.usadosParaTransformar.delete(p.id);
    this.apertar(novo, p.id);
  }

  private sobe(p: Phaser.Input.Pointer) {
    for (const b of this.botoes) b.dedos.delete(p.id);
    this.novosNoCarregar.delete(p.id);
    this.usadosParaTransformar.delete(p.id);
    if (p.id === this.joyDedo) { this.joyDedo = null; this.joyVetor = { x: 0, y: 0 }; }
    if (p.id === this.arrastoDedo) this.arrastoDedo = null;
  }

  /** dedo no analógico (ou arrastando, no DESLIZAR) */
  get dedoNoMovimento(): boolean { return this.joyDedo !== null || this.arrastoDedo !== null; }

  /** podeTransformar: ki cheio e ainda há forma para subir (CARREGAR mostra TRANSFORMAR). */
  ler(podeTransformar = false): Entrada {
    if (!this.visivel) return { ...ENTRADA_VAZIA };
    const segura = (n: NomeBotao) => this.botoes.some((b) => b.nome === n && b.dedos.size > 0);
    let transformar = false;
    if (podeTransformar && this.novosNoCarregar.size > 0) {
      transformar = true;
      for (const d of this.novosNoCarregar) this.usadosParaTransformar.add(d);
    }
    this.novosNoCarregar.clear();
    const carregar = this.botoes.some((b) => b.nome === 'carregar' && [...b.dedos].some((d) => !this.usadosParaTransformar.has(d)));
    const tiroContinuo = opcoes().tiroContinuo && this.dedoNoMovimento && !carregar;
    const ent: Entrada = {
      x: this.joyVetor.x, y: this.joyVetor.y,
      atacar: segura('atacar') || this.gatilhos.atacar || tiroContinuo, carregar: carregar && !transformar,
      especial: this.gatilhos.especial, parry: this.gatilhos.parry, transformar,
    };
    if (this.arrastoDedo !== null || this.arrasto.x || this.arrasto.y) {
      ent.arrasto = { ...this.arrasto };
      this.arrasto = { x: 0, y: 0 };
    }
    this.gatilhos.especial = this.gatilhos.parry = this.gatilhos.atacar = false;
    return ent;
  }

  /** Redesenha (chamado a cada quadro): botão apertado mais claro, ESPECIAL dourado com o ki cheio. */
  desenhar(kiCheio: boolean, podeTransformar: boolean, dt = 1 / 60): void {
    if (!this.visivel) return;
    if (this.dedoNoMovimento) this.seguradoSeg += dt;
    if (podeTransformar !== this.modoTransformar) {
      this.modoTransformar = podeTransformar;
      const c = this.botoes.find((b) => b.nome === 'carregar')!;
      c.imagem.setTexture(podeTransformar ? 'botao-transformar' : 'botao-carregar');
      c.imagem.setScale((c.r * 1.3) / Math.max(c.imagem.width, c.imagem.height));
    }
    for (const b of this.botoes) {
      if (b.escondido) continue;
      const apertado = b.dedos.size > 0;
      const dourado = (b.nome === 'especial' && kiCheio) || (b.nome === 'carregar' && podeTransformar);
      b.disco.clear()
        .fillStyle(dourado ? 0xffb400 : apertado ? 0x4a6fd1 : 0x101a33, (apertado ? 0.6 : 0.3) * b.alfa / 0.75)
        .fillCircle(b.x, b.y, b.r)
        .lineStyle(3, dourado ? 0xfff2a8 : 0xffd23a, 0.7 * b.alfa / 0.75)
        .strokeCircle(b.x, b.y, b.r);
      b.imagem.setTint(dourado ? 0xffffff : apertado ? 0xffffff : 0xcfd8ff);
    }
    this.grafJoy.clear();
    if (this.joyDedo !== null) {
      const kx = this.joyBase.x + this.joyVetor.x * RAIO_JOYSTICK, ky = this.joyBase.y + this.joyVetor.y * RAIO_JOYSTICK;
      this.grafJoy.fillStyle(0xffffff, 0.12).fillCircle(this.joyBase.x, this.joyBase.y, RAIO_JOYSTICK)
        .lineStyle(2, 0xffd23a, 0.6).strokeCircle(this.joyBase.x, this.joyBase.y, RAIO_JOYSTICK)
        .fillStyle(0xffd23a, 0.6).fillCircle(kx, ky, 22);
    }
  }

  /** Solta todos os dedos (pausa: o dedo que estava no botão não fica "preso" apertado na volta). */
  soltarTudo(): void {
    for (const b of this.botoes) b.dedos.clear();
    this.novosNoCarregar.clear();
    this.usadosParaTransformar.clear();
    this.gatilhos.especial = this.gatilhos.parry = this.gatilhos.atacar = false;
    this.joyDedo = null;
    this.arrastoDedo = null;
    this.joyVetor = { x: 0, y: 0 };
    this.arrasto = { x: 0, y: 0 };
  }

  destruir(): void {
    this.cena.input.off(Phaser.Input.Events.POINTER_DOWN, this.desce, this);
    this.cena.input.off(Phaser.Input.Events.POINTER_MOVE, this.move, this);
    this.cena.input.off(Phaser.Input.Events.POINTER_UP, this.sobe, this);
    this.cena.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.sobe, this);
  }
}
