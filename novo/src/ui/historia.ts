// Desenho do que só existe no modo história: minions (tiras de 8 poses do jogo antigo), itens que caem do céu
// (desenhados à mão, sem imagem), explosões dos minions, onda/pontos no alto e os itens ativos do herói.
import Phaser from 'phaser';
import { estiloTexto } from './resolucao';
import { ATLAS_EFEITOS } from './efeitos';
import { EFEITOS } from '../dados/efeitos';
import * as C from '../logica/constantes';
import { T } from '../logica/idioma';
import { ITEM_TAM } from '../logica/itens';
import { MINION_A, MINION_ESCALA_DESENHO, poseDoMinion, type ModeloMinion } from '../logica/minions';
import { ONDAS_POR_MODO } from '../logica/ondas';
import type { EstadoLuta, TipoItem } from '../logica/tipos';

export const chaveDoMinion = (m: ModeloMinion) => `minion-${m}`;

/** Põe a tira do minion na fila (fica no cache entre as lutas). true = vai baixar. */
export function pedirMinion(cena: Phaser.Scene, modelo: ModeloMinion): boolean {
  const k = chaveDoMinion(modelo);
  if (cena.textures.exists(k)) return false;
  cena.load.spritesheet(k, `minions/${modelo}.webp`, { frameWidth: 144, frameHeight: 168 });
  return true;
}

export { NOME_DO_ITEM } from '../logica/itens';

/** ícone do item (k = escala; 1 = tamanho do item caindo) */
export function desenharIcone(g: Phaser.GameObjects.Graphics, tipo: TipoItem, x: number, y: number, k = 1): void {
  const r = (ITEM_TAM / 2) * k;
  if (tipo === 'senzu') {
    g.fillStyle(0x2f8f2a, 1).fillEllipse(x, y, r * 1.5, r * 1.05);
    g.fillStyle(0x7be36a, 1).fillEllipse(x - r * 0.12, y - r * 0.1, r * 1.1, r * 0.7);
    g.fillStyle(0xd9ffd0, 0.9).fillEllipse(x - r * 0.3, y - r * 0.22, r * 0.4, r * 0.22);
  } else if (tipo === 'capsula') {
    g.fillStyle(0xf2f4f8, 1).fillRoundedRect(x - r * 0.9, y - r * 0.45, r * 1.8, r * 0.9, r * 0.45);
    g.fillStyle(0x2d7ff9, 1).fillRect(x - r * 0.12, y - r * 0.45, r * 0.24, r * 0.9);
    g.lineStyle(1.5 * k, 0x1b2a44, 1).strokeRoundedRect(x - r * 0.9, y - r * 0.45, r * 1.8, r * 0.9, r * 0.45);
  } else if (tipo === 'nuvem') {
    g.fillStyle(0xffd23a, 1);
    g.fillCircle(x - r * 0.45, y + r * 0.1, r * 0.42).fillCircle(x + r * 0.05, y - r * 0.18, r * 0.52).fillCircle(x + r * 0.5, y + r * 0.12, r * 0.38);
    g.fillStyle(0xfff3b0, 1).fillCircle(x - r * 0.05, y - r * 0.28, r * 0.24);
  } else {
    g.lineStyle(4 * k, 0xc0261b, 1).lineBetween(x - r * 0.8, y + r * 0.8, x + r * 0.8, y - r * 0.8);
    g.fillStyle(0xffd23a, 1).fillCircle(x - r * 0.8, y + r * 0.8, 2.6 * k).fillCircle(x + r * 0.8, y - r * 0.8, 2.6 * k);
  }
}

interface Explosao { img: Phaser.GameObjects.Image; idade: number }

export class DesenhoHistoria {
  private sprites = new Map<number, Phaser.GameObjects.Sprite>();
  private livres: Phaser.GameObjects.Sprite[] = [];
  private explosoes: Explosao[] = [];
  private g: Phaser.GameObjects.Graphics;
  private gHud: Phaser.GameObjects.Graphics;
  private texto: Phaser.GameObjects.Text;
  private textoAtual = '';

  constructor(private cena: Phaser.Scene, private modelo: ModeloMinion) {
    this.g = cena.add.graphics().setDepth(14);
    this.gHud = cena.add.graphics().setDepth(802);
    this.texto = cena.add
      .text(C.TELA_L / 2, 34, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '12px', color: '#ffd23a', stroke: '#000000', strokeThickness: 3 }))
      .setOrigin(0.5, 0)
      .setDepth(802);
  }

  /** explosão do minion (o mesmo desenho da explosão do sol) */
  explodir(x: number, y: number): void {
    if (!this.cena.textures.exists(ATLAS_EFEITOS)) return;
    let ex = this.explosoes.find((e) => e.idade < 0);
    if (!ex) {
      if (this.explosoes.length >= 6) ex = this.explosoes[0];
      else { ex = { img: this.cena.add.image(0, 0, ATLAS_EFEITOS, 'explosao/0').setDepth(17), idade: -1 }; this.explosoes.push(ex); }
    }
    ex.idade = 0;
    ex.img.setPosition(x, y).setDisplaySize(70, 73).setVisible(true);
  }

  desenhar(e: EstadoLuta, dtSeg: number): void {
    const h = e.historia;
    if (!h) return;
    // minions: um sprite por minion vivo (os que somem voltam para a reserva)
    const chave = chaveDoMinion(this.modelo);
    const tem = this.cena.textures.exists(chave);
    const vivos = new Set<number>();
    for (const m of e.minions) {
      vivos.add(m.id);
      let s = this.sprites.get(m.id);
      if (!s) {
        if (!tem) continue;
        s = this.livres.pop() ?? this.cena.add.sprite(0, 0, chave, 0).setDepth(13);
        s.setScale(MINION_ESCALA_DESENHO).setOrigin(0.5, 144 / 168).setVisible(true); // pés da caixa na linha 144 da célula
        this.sprites.set(m.id, s);
      }
      const p = poseDoMinion(m, e.quadro);
      // os pés ficam no mesmo lugar da caixa (o desenho é 1,3x maior); brotando, sai de dentro do chão
      s.setFrame(p.celula).setFlipX(p.espelhar);
      s.setPosition(m.x, m.y + MINION_A / 2 + p.afundado * 40);
      s.setAlpha(p.afundado > 0 ? 1 - p.afundado * 0.6 : 1);
      // agarrado e prestes a explodir: pisca vermelho
      if (m.fase === 'agarrar' && m.explode < 20 && Math.floor(m.explode / 3) % 2 === 0) s.setTintFill(0xff3b30);
      else s.clearTint();
    }
    for (const [id, s] of this.sprites) {
      if (vivos.has(id)) continue;
      s.setVisible(false);
      this.sprites.delete(id);
      this.livres.push(s);
    }

    // itens caindo (com um brilho pulsando em volta)
    const g = this.g.clear();
    for (const it of h.itens) {
      const pulso = 0.25 + 0.15 * Math.sin(e.quadro * 0.15 + it.id);
      g.fillStyle(0xffffff, pulso).fillCircle(it.x, it.y, ITEM_TAM * 0.75);
      desenharIcone(g, it.tipo, it.x, it.y);
    }

    // explosões
    const ex = EFEITOS.explosao;
    for (const x of this.explosoes) {
      if (x.idade < 0) continue;
      x.idade += dtSeg;
      const q = Math.floor((x.idade * 1000) / ex.ms);
      if (q >= ex.n) { x.idade = -1; x.img.setVisible(false); continue; }
      x.img.setFrame(`explosao/${q}`);
    }

    // alto da tela: onda e pontos; abaixo da barra do herói, os itens ativos com o tempo que falta
    const total = h.modo === 'unlimited' ? '∞' : String(ONDAS_POR_MODO);
    const t = `${T('ONDA')} ${Math.min(h.passo + 1, h.modo === 'unlimited' ? 999 : ONDAS_POR_MODO)}/${total}   ${T('PONTOS')} ${h.pontos}`;
    if (t !== this.textoAtual) { this.texto.setText(t); this.textoAtual = t; }
    const gh = this.gHud.clear(), heroi = e.p1;
    let x = 24;
    const icone = (tipo: TipoItem, resta: number | null) => {
      gh.fillStyle(0x000000, 0.5).fillCircle(x, 64, 11);
      desenharIcone(gh, tipo, x, 64, 0.7);
      if (resta !== null) gh.fillStyle(0xffd23a, 1).fillRect(x - 10, 77, 20 * resta, 3);
      x += 28;
    };
    if (heroi.escudo) icone('capsula', null);
    if (heroi.nuvem > 0) icone('nuvem', heroi.nuvem / C.ITEM_DURACAO_MAX);
    if (heroi.bastao > 0) icone('bastao', heroi.bastao / C.ITEM_DURACAO_MAX);
  }

  destruir(): void {
    this.sprites.clear();
    this.livres.length = 0;
    this.explosoes.length = 0;
  }
}
