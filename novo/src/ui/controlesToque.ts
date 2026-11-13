// Controles de toque do jogador 1: joystick que aparece onde o dedo encosta (metade esquerda) e os botões
// do jogo antigo à direita (desenhos de icons/botoes/), com vários dedos ao mesmo tempo.
// Como no jogo antigo não há botão TRANSF.: com o ki cheio (e forma para subir) CARREGAR vira TRANSFORMAR, e só
// um toque NOVO transforma — o dedo que já estava segurando para carregar precisa soltar antes.
import Phaser from 'phaser';
import { TELA_L } from '../logica/constantes';
import { vetorDoJoystick } from '../logica/entrada';
import type { Entrada } from '../logica/tipos';
import { ENTRADA_VAZIA } from '../logica/tipos';

type NomeBotao = 'atacar' | 'carregar' | 'especial' | 'parry';
interface Botao {
  nome: NomeBotao;
  x: number;
  y: number;
  r: number;
  icone: string;
  dedos: Set<number>;
  disco: Phaser.GameObjects.Graphics;
  imagem: Phaser.GameObjects.Image;
}

// mesmo arranjo padrão do jogo antigo: CARREGAR grande no canto, PARRY ao lado embaixo, ATAQUE no meio, ESPECIAL em cima
const LAYOUT: { nome: NomeBotao; x: number; y: number; r: number; icone: string }[] = [
  { nome: 'carregar', x: 738, y: 288, r: 44, icone: 'botao-carregar' },
  { nome: 'parry', x: 646, y: 310, r: 30, icone: 'botao-parry' },
  { nome: 'atacar', x: 654, y: 228, r: 36, icone: 'botao-ataque' },
  { nome: 'especial', x: 740, y: 186, r: 32, icone: 'botao-especial' },
];
const RAIO_JOYSTICK = 56;

export class ControlesToque {
  private botoes: Botao[] = [];
  private joyDedo: number | null = null;
  private joyBase = { x: 0, y: 0 };
  private joyVetor = { x: 0, y: 0 };
  private gatilhos = { especial: false, parry: false, atacar: false };
  /** dedos que encostaram em CARREGAR desde a última leitura / dedos que já viraram TRANSFORMAR */
  private novosNoCarregar = new Set<number>();
  private usadosParaTransformar = new Set<number>();
  private modoTransformar = false;
  private grafJoy: Phaser.GameObjects.Graphics;
  private visivel = false;

  constructor(private readonly cena: Phaser.Scene) {
    cena.input.addPointer(3); // até 4 dedos
    for (const b of LAYOUT) {
      const disco = cena.add.graphics().setDepth(900);
      const imagem = cena.add.image(b.x, b.y, b.icone).setDepth(901).setAlpha(0.75);
      imagem.setScale((b.r * 1.3) / Math.max(imagem.width, imagem.height));
      this.botoes.push({ ...b, dedos: new Set(), disco, imagem });
    }
    this.grafJoy = cena.add.graphics().setDepth(900);
    cena.input.on(Phaser.Input.Events.POINTER_DOWN, this.desce, this);
    cena.input.on(Phaser.Input.Events.POINTER_MOVE, this.move, this);
    cena.input.on(Phaser.Input.Events.POINTER_UP, this.sobe, this);
    cena.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.sobe, this);
    // aparece no aparelho com toque (ou no primeiro toque)
    this.mostrar(cena.sys.game.device.input.touch);
  }

  private mostrar(v: boolean) {
    this.visivel = v;
    for (const b of this.botoes) { b.disco.setVisible(v); b.imagem.setVisible(v); }
    if (!v) this.grafJoy.clear();
  }

  private desce(p: Phaser.Input.Pointer) {
    if (p.wasTouch && !this.visivel) this.mostrar(true);
    if (!this.visivel) return;
    const b = this.botaoEm(p.worldX, p.worldY);
    if (b) {
      this.apertar(b, p.id);
      return;
    }
    if (p.worldX < TELA_L * 0.45 && this.joyDedo === null) {
      this.joyDedo = p.id;
      this.joyBase = { x: p.worldX, y: p.worldY };
      this.joyVetor = { x: 0, y: 0 };
    }
  }

  private botaoEm(x: number, y: number): Botao | undefined {
    return this.botoes.find((bt) => Phaser.Math.Distance.Between(x, y, bt.x, bt.y) <= bt.r + 10);
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
  }

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
    const ent: Entrada = {
      x: this.joyVetor.x, y: this.joyVetor.y,
      atacar: segura('atacar') || this.gatilhos.atacar, carregar: carregar && !transformar,
      especial: this.gatilhos.especial, parry: this.gatilhos.parry, transformar,
    };
    this.gatilhos.especial = this.gatilhos.parry = this.gatilhos.atacar = false;
    return ent;
  }

  /** Redesenha (chamado a cada quadro): botão apertado mais claro, ESPECIAL dourado com o ki cheio. */
  desenhar(kiCheio: boolean, podeTransformar: boolean): void {
    if (!this.visivel) return;
    if (podeTransformar !== this.modoTransformar) {
      this.modoTransformar = podeTransformar;
      const c = this.botoes.find((b) => b.nome === 'carregar')!;
      c.imagem.setTexture(podeTransformar ? 'botao-transformar' : 'botao-carregar');
      c.imagem.setScale((c.r * 1.3) / Math.max(c.imagem.width, c.imagem.height));
    }
    for (const b of this.botoes) {
      const apertado = b.dedos.size > 0;
      const dourado = (b.nome === 'especial' && kiCheio) || (b.nome === 'carregar' && podeTransformar);
      b.disco.clear()
        .fillStyle(dourado ? 0xffb400 : apertado ? 0x4a6fd1 : 0x101a33, apertado ? 0.6 : 0.3)
        .fillCircle(b.x, b.y, b.r)
        .lineStyle(3, dourado ? 0xfff2a8 : 0xffd23a, 0.7)
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
    this.joyVetor = { x: 0, y: 0 };
  }

  destruir(): void {
    this.cena.input.off(Phaser.Input.Events.POINTER_DOWN, this.desce, this);
    this.cena.input.off(Phaser.Input.Events.POINTER_MOVE, this.move, this);
    this.cena.input.off(Phaser.Input.Events.POINTER_UP, this.sobe, this);
    this.cena.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.sobe, this);
  }
}
