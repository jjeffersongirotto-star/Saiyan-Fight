// Desenho dos efeitos animados na luta (imagens de ../efeitos, empacotadas por scripts/gerar-efeitos.py):
// aura atrás do corpo (animada, ou a labareda desenhada para gelo/rosa), raios de ki de quem está transformado,
// escudo, onda do parry, tiros, raios dos especiais, sol do Freeza com explosão e o choque de raios.
// As contas (quadro, caminho do sol, qual efeito) ficam em logica/efeitos.ts; aqui só se posiciona na tela.
import Phaser from 'phaser';
import { EFEITOS, type NomeEfeito } from '../dados/efeitos';
import type { Aura } from '../dados/personagens';
import * as C from '../logica/constantes';
import {
  auraDoLutador, auraForte, caminhoDoSol, corDoRaio, efeitoDaAura, efeitoDoEspecial, efeitoDoTiro, ESCUDO_FRACAO_VISIVEL, meioDoChoqueX,
  PALETAS_AURA, PARRY_ONDA_QUADROS, quadroDoEfeito, quadroUnico, suavizarAura,
} from '../logica/efeitos';
import { centroDoParry } from '../logica/luta';
import type { EstadoLuta, Lutador, Raio, Tiro } from '../logica/tipos';

export const ATLAS_EFEITOS = 'efeitos';
type Ponto = { x: number; y: number };

/** Põe o atlas dos efeitos na fila (uma vez por jogo; fica na memória entre as lutas). */
export function pedirEfeitos(cena: Phaser.Scene): boolean {
  if (cena.textures.exists(ATLAS_EFEITOS)) return false;
  cena.load.multiatlas(ATLAS_EFEITOS, 'efeitos/efeitos.json', 'efeitos/');
  return true;
}

const quadro = (nome: NomeEfeito, q: number) => `${nome}/${q}`;

// ---------- labareda desenhada (traceKiAuraFlame do jogo antigo), para as auras sem imagem ----------
const LAB_QUADROS = 24, LAB_W = 56, LAB_H = 112;
const LAB_CEL_W = Math.ceil(LAB_W * 2.4), LAB_CEL_H = Math.ceil(LAB_H * 1.3), LAB_POR_LINHA = 12;
const hexCss = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

function tracarLabareda(g: CanvasRenderingContext2D, cx: number, baseY: number, w: number, h: number, fase: number, semente: number) {
  const PASSOS = 28, PONTAS = 7, TAU = Math.PI * 2;
  const lado = (dir: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= PASSOS; i++) {
      const f = i / PASSOS;
      let meia = w * (0.3 + 0.7 * Math.sin(Math.PI * Math.pow(f, 0.85))) * (1 - f * 0.25);
      let ponta = 0;
      for (let j = 0; j < PONTAS; j++) {
        const pos = (j / PONTAS + fase + (dir > 0 ? 0.5 / PONTAS : 0) + semente) % 1;
        const d = f - pos;
        const forma = d < 0 ? Math.max(0, 1 + d / 0.11) : Math.max(0, 1 - d / 0.035);
        const comp = (0.55 + 0.45 * Math.sin(j * 7.3 + semente * 11)) * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, pos * 1.1)));
        ponta = Math.max(ponta, forma * comp);
      }
      meia += w * 0.34 * ponta * (1 - f * 0.3);
      pts.push([cx + (dir > 0 ? 1 : -1) * meia + Math.sin(TAU * (fase * 2) + f * 9 + semente * 5) * w * 0.03 * f, baseY - f * h - ponta * h * 0.05]);
    }
    return pts;
  };
  const esq = lado(-1), dir = lado(1);
  g.beginPath();
  g.moveTo(cx, baseY + h * 0.04);
  for (const [x, y] of esq) g.lineTo(x, y);
  g.lineTo(cx + Math.sin(TAU * fase + semente) * w * 0.08, baseY - h * (1.06 + 0.04 * Math.sin(TAU * fase * 3 + semente)));
  for (let i = dir.length - 1; i >= 0; i--) g.lineTo(dir[i][0], dir[i][1]);
  g.closePath();
}

/** Textura com os 24 quadros da labareda de uma cor (gerada uma vez; quadros "0".."23"). */
function texturaDaLabareda(cena: Phaser.Scene, aura: Aura, semente: number): string {
  const chave = `labareda-${aura}-${semente}`;
  if (cena.textures.exists(chave)) return chave;
  const linhas = Math.ceil(LAB_QUADROS / LAB_POR_LINHA);
  const tex = cena.textures.createCanvas(chave, LAB_CEL_W * LAB_POR_LINHA, LAB_CEL_H * linhas)!;
  const g = tex.getContext();
  const pal = PALETAS_AURA[aura].map(hexCss);
  for (let q = 0; q < LAB_QUADROS; q++) {
    const ox = (q % LAB_POR_LINHA) * LAB_CEL_W, oy = Math.floor(q / LAB_POR_LINHA) * LAB_CEL_H;
    const cx = ox + LAB_CEL_W / 2, baseY = oy + LAB_CEL_H - LAB_H * 0.08, fase = q / LAB_QUADROS;
    g.save();
    g.beginPath();
    g.rect(ox, oy, LAB_CEL_W, LAB_CEL_H);
    g.clip();
    g.globalAlpha = 1;
    g.fillStyle = pal[0]; tracarLabareda(g, cx, baseY, LAB_W, LAB_H, fase, semente); g.fill();
    g.globalAlpha = 0.95;
    g.fillStyle = pal[1]; tracarLabareda(g, cx, baseY, LAB_W * 0.78, LAB_H * 0.86, (fase * 2) % 1, semente + 0.21); g.fill();
    g.fillStyle = pal[2]; tracarLabareda(g, cx, baseY, LAB_W * 0.5, LAB_H * 0.66, (fase * 3) % 1, semente + 0.47); g.fill();
    g.restore();
    tex.add(String(q), 0, ox, oy, LAB_CEL_W, LAB_CEL_H);
  }
  tex.refresh();
  return chave;
}

/** Efeitos que acompanham um lutador: aura, raios de ki, escudo e onda do parry. */
class EfeitosDoLutador {
  private aura: Phaser.GameObjects.Image;
  private raiosKi: Phaser.GameObjects.Graphics;
  private escudo: Phaser.GameObjects.Image;
  private onda: Phaser.GameObjects.Image;
  private nivelAura = 0;
  private faseLabareda = 0;
  private semente: number;
  /** quadros que faltam da onda do parry */
  private ondaQuadros = 0;
  /** escudo da Zenkai: fica enquanto durar a invulnerabilidade que ela deu */
  escudoLigado = false;

  constructor(private cena: Phaser.Scene, private id: 'p1' | 'p2') {
    this.semente = id === 'p2' ? 0.37 : 0;
    this.aura = cena.add.image(0, 0, ATLAS_EFEITOS, quadro('aura_amarela', 0)).setOrigin(0.5, 1).setDepth(9);
    this.raiosKi = cena.add.graphics().setDepth(11);
    this.escudo = cena.add.image(0, 0, ATLAS_EFEITOS, quadro('escudo_azul', 0)).setDepth(12).setVisible(false);
    this.onda = cena.add.image(0, 0, ATLAS_EFEITOS, quadro('parry_onda', 0)).setDepth(12).setVisible(false);
  }

  parry(): void {
    this.ondaQuadros = PARRY_ONDA_QUADROS;
  }

  /** `pes` = onde o sprite está (origem nos pés); `kAltura` = escala da altura da forma. */
  desenhar(l: Lutador, pes: Ponto, kAltura: number, relogio: number, dtSeg: number): void {
    const visivel = l.acao !== 'caido';
    this.nivelAura = suavizarAura(this.nivelAura, auraForte(l), dtSeg);
    const k = this.nivelAura;
    const corpoL = 96 * kAltura, corpoA = 112 * kAltura * 0.9;
    const aura = auraDoLutador(l.personagem, l.nivel, l.poder);
    const nome = efeitoDaAura(aura, k > 0.5);
    const h = corpoA * (1.18 + 0.12 * k);
    // caixa da aura desenhada (o escudo fica em volta dela)
    let caixa: { cx: number; cy: number; rx: number; ry: number };
    if (nome) {
      const e: { w: number; h: number; alfa?: number } = EFEITOS[nome];
      const dh = h * 1.22, dw = (dh * e.w) / e.h;
      this.aura.setTexture(ATLAS_EFEITOS, quadro(nome, quadroDoEfeito(nome, relogio + this.semente)));
      this.aura.setOrigin(0.5, 1).setPosition(pes.x, pes.y + h * 0.08).setDisplaySize(dw, dh);
      this.aura.setAlpha((0.72 + 0.25 * k) * (e.alfa ?? 1));
      caixa = { cx: pes.x, cy: pes.y + h * 0.08 - dh / 2, rx: dw / 2, ry: dh / 2 };
    } else {
      const grow = 1 + 0.4 * k, w = corpoL * 0.5 * grow;
      this.faseLabareda = (this.faseLabareda + dtSeg * (0.55 + 0.35 * k)) % 1;
      const chave = texturaDaLabareda(this.cena, aura, this.semente);
      const sx = w / LAB_W, sy = h / LAB_H;
      this.aura.setTexture(chave, String(Math.floor(this.faseLabareda * LAB_QUADROS) % LAB_QUADROS));
      this.aura.setOrigin(0.5, 1).setPosition(pes.x, pes.y + LAB_H * 0.08 * sy).setDisplaySize(LAB_CEL_W * sx, LAB_CEL_H * sy);
      this.aura.setAlpha(0.62 + 0.25 * k);
      caixa = { cx: pes.x, cy: pes.y - h * 0.52, rx: w * 0.95, ry: h * 0.58 };
    }
    this.aura.setVisible(visivel);

    // raios de ki em volta de quem está transformado (mais frequentes com o poder ativo)
    const g = this.raiosKi.clear();
    if (visivel && l.nivel > 0) this.desenharRaiosKi(g, pes, corpoL * 0.5 * (1 + 0.4 * k), h, l.poder > 0, relogio);

    // escudo da Zenkai (escudo_azul, um pouco maior que a aura)
    if (this.escudoLigado && l.invulneravel <= 0) this.escudoLigado = false;
    if (visivel && this.escudoLigado) {
      const raio = Math.max(caixa.rx, caixa.ry) + 8, rEsc = raio / ESCUDO_FRACAO_VISIVEL;
      const e = EFEITOS.escudo_azul;
      this.escudo.setFrame(quadro('escudo_azul', quadroDoEfeito('escudo_azul', relogio)));
      this.escudo.setPosition(caixa.cx, caixa.cy).setDisplaySize((rEsc * 2 * e.w) / e.h, rEsc * 2).setAlpha(0.95).setVisible(true);
    } else this.escudo.setVisible(false);

    // onda do parry "(" virada para o adversário, uma vez
    const q = this.ondaQuadros > 0 ? quadroUnico('parry_onda', 1 - this.ondaQuadros / PARRY_ONDA_QUADROS) : null;
    if (visivel && q !== null) {
      const c = centroDoParry(l), r = C.PARRY_RAIO, dh = r * 2.1, e = EFEITOS.parry_onda;
      this.onda.setFrame(quadro('parry_onda', q)).setPosition(c.x + l.olhando * r * 0.45, c.y);
      this.onda.setDisplaySize((dh * e.w) / e.h, dh).setFlipX(l.olhando < 0).setVisible(true);
    } else this.onda.setVisible(false);
  }

  /** chamado uma vez por passo da lógica (o tempo da onda conta em quadros de 1/60 s) */
  passo(): void {
    if (this.ondaQuadros > 0) this.ondaQuadros--;
  }

  private desenharRaiosKi(g: Phaser.GameObjects.Graphics, pes: Ponto, w: number, h: number, forte: boolean, relogio: number) {
    const t = Math.floor(relogio * 14), semente = this.id === 'p2' ? 7 : 1;
    const rnd = (n: number) => { const x = Math.sin((t * 31 + n * 17 + semente * 101) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    for (let b = 0; b < (forte ? 3 : 1); b++) {
      if (rnd(b * 5) > (forte ? 0.7 : 0.3)) continue;
      let x = pes.x + (rnd(b * 5 + 1) - 0.5) * w * 1.1, y = pes.y - h * (0.15 + rnd(b * 5 + 2) * 0.7);
      const dir = rnd(b * 5 + 3) < 0.5 ? -1 : 1;
      const pts: Ponto[] = [{ x, y }];
      for (let i = 0; i < 5; i++) {
        x += dir * (2 + rnd(b * 7 + i + 40) * 5);
        y += (rnd(b * 11 + i + 80) - 0.5) * 10;
        pts.push({ x, y });
      }
      g.lineStyle(4, 0x9fe8ff, 0.35).strokePoints(pts);
      g.lineStyle(2, 0xffffff, 0.9).strokePoints(pts);
      g.lineStyle(1, 0xbff4ff, 1).strokePoints(pts);
    }
  }

  destruir(): void {
    this.aura.destroy(); this.raiosKi.destroy(); this.escudo.destroy(); this.onda.destroy();
  }
}

/** Todos os efeitos da luta. */
export class EfeitosDaLuta {
  readonly lutador: Record<'p1' | 'p2', EfeitosDoLutador>;
  private tiros: Phaser.GameObjects.Image[] = [];
  private raios: Phaser.GameObjects.Image[] = [];
  private grafRaios: Phaser.GameObjects.Graphics;
  private explosao: Phaser.GameObjects.Image;
  private choqueImg: Phaser.GameObjects.Image;

  constructor(private cena: Phaser.Scene) {
    this.lutador = { p1: new EfeitosDoLutador(cena, 'p1'), p2: new EfeitosDoLutador(cena, 'p2') };
    this.grafRaios = cena.add.graphics().setDepth(15);
    this.explosao = cena.add.image(0, 0, ATLAS_EFEITOS, quadro('explosao', 0)).setDepth(17).setVisible(false);
    this.choqueImg = cena.add.image(0, 0, ATLAS_EFEITOS, quadro('raio_pontas', 0)).setDepth(14).setOrigin(0, 0.5).setVisible(false);
  }

  passo(): void {
    this.lutador.p1.passo();
    this.lutador.p2.passo();
  }

  /** tiros: a animação de quem atirou, apontada na direção do voo (drawObstacles) */
  desenharTiros(e: EstadoLuta, relogio: number): void {
    e.tiros.forEach((t: Tiro, i) => {
      const img = this.tiros[i] ?? (this.tiros[i] = this.cena.add.image(0, 0, ATLAS_EFEITOS, quadro('tiro_pixel', 0)).setDepth(20));
      const nome = efeitoDoTiro(e[t.atirador].personagem);
      const ef: { w: number; h: number; cabeca?: number; tam?: number } = EFEITOS[nome];
      const dh = t.raio * (ef.tam ?? 2), dw = (dh * ef.w) / ef.h;
      img.setFrame(quadro(nome, quadroDoEfeito(nome, relogio + t.x * 0.013)));
      img.setOrigin(ef.cabeca ?? 0.82, 0.5).setPosition(t.x, t.y).setDisplaySize(dw, dh);
      img.setRotation(Math.atan2(t.vy, t.vx)).setVisible(true);
    });
    for (let i = e.tiros.length; i < this.tiros.length; i++) this.tiros[i].setVisible(false);
  }

  /**
   * Raios dos especiais. `mao(l)` = de onde sai (mão/dedo do desenho), `centro(l)` = meio do corpo na tela.
   * `cresce` = em quantos quadros o raio chega no adversário (a regra do dano decide: 18, ou 9 no antigo).
   */
  desenharRaios(e: EstadoLuta, mao: (l: Lutador) => Ponto, centro: (l: Lutador) => Ponto, relogio: number): void {
    const g = this.grafRaios.clear();
    let usados = 0;
    this.explosao.setVisible(false);
    for (const r of e.raios) {
      const dono = e[r.dono], alvo = e[r.dono === 'p1' ? 'p2' : 'p1'];
      const de = mao(dono), para = centro(alvo);
      if (r.sol) { this.desenharSol(r, dono, de, para, relogio, usados++); continue; }
      const crescer = e.regras.danoDoEspecialNaChegada ? r.chega : 9;
      const nome = efeitoDoEspecial(dono.personagem);
      if (nome) this.desenharRaioAnimado(nome, de, para, r.idade, crescer, usados++);
      else this.desenharRaioDeCor(g, de, para, r.idade, crescer, corDoRaio(dono.personagem));
    }
    for (let i = usados; i < this.raios.length; i++) this.raios[i].setVisible(false);
    this.desenharChoque(e, mao, relogio);
  }

  private imagemDeRaio(i: number) {
    return this.raios[i] ?? (this.raios[i] = this.cena.add.image(0, 0, ATLAS_EFEITOS, quadro('kamehameha', 0)).setDepth(16));
  }

  /** comprimento do raio: chega no alvo em `crescer` quadros e segue até a borda da tela */
  private comprimento(de: Ponto, para: Ponto, idade: number, crescer: number) {
    const ang = Math.atan2(para.y - de.y, para.x - de.x);
    const ate = Math.hypot(para.x - de.x, para.y - de.y);
    const borda = Math.cos(ang) >= 0 ? (C.TELA_L + 40 - de.x) / Math.max(0.2, Math.cos(ang)) : (de.x + 40) / Math.max(0.2, -Math.cos(ang));
    return { ang, len: Math.min(borda, (ate * idade) / Math.max(1, crescer)) };
  }

  private desenharRaioAnimado(nome: NomeEfeito, de: Ponto, para: Ponto, idade: number, crescer: number, i: number) {
    const img = this.imagemDeRaio(i);
    const dh = 25 * 2 * 1.45;
    const { ang, len } = this.comprimento(de, para, idade, crescer);
    const esquerda = Math.cos(ang) < 0;
    // a cabeça do desenho (lado esquerdo da imagem) fica na mão; para a esquerda, espelhado
    img.setFrame(quadro(nome, quadroDoEfeito(nome, idade / 60)));
    img.setOrigin(esquerda ? 1 : 0, 0.5).setFlipX(esquerda);
    img.setPosition(de.x - Math.cos(ang) * dh * 0.2, de.y - Math.sin(ang) * dh * 0.2);
    img.setRotation(esquerda ? ang - Math.PI : ang).setDisplaySize(Math.max(dh * 0.5, len + dh * 0.2), dh).setVisible(true);
  }

  /** raio desenhado na cor do golpe (sem imagem): faixa colorida, miolo branco e anéis correndo */
  private desenharRaioDeCor(g: Phaser.GameObjects.Graphics, de: Ponto, para: Ponto, idade: number, crescer: number, cor: number) {
    const { ang, len } = this.comprimento(de, para, idade, crescer);
    const fim = { x: de.x + Math.cos(ang) * len, y: de.y + Math.sin(ang) * len };
    const meia = 25;
    g.lineStyle(meia * 2, cor, 1).lineBetween(de.x, de.y, fim.x, fim.y);
    g.lineStyle(meia * 0.8, 0xffffff, 1).lineBetween(de.x, de.y, fim.x, fim.y);
    g.lineStyle(4, 0xffffff, 0.9);
    for (let d = (idade * 5) % 40; d < len; d += 40) g.strokeCircle(de.x + Math.cos(ang) * d, de.y + Math.sin(ang) * d, 22);
  }

  /** sol do Freeza: nasce no dedo, cresce, é empurrado e voa até o alvo, onde explode */
  private desenharSol(r: Raio, dono: Lutador, dedo: Ponto, alvo: Ponto, relogio: number, i: number) {
    const lado = dono.olhando;
    const frente = { x: dono.x + lado * (dono.l / 2 + 12), y: dono.y - dono.a * 0.2 };
    const s = caminhoDoSol(r.idade, dedo, frente, alvo, lado);
    const img = this.imagemDeRaio(i);
    const d = (s.r * 2 * 129) / 112; // a esfera ocupa ~87% do quadro
    img.setFrame(quadro('sol_freeza', quadroDoEfeito('sol_freeza', relogio))).setOrigin(0.5).setFlipX(false).setRotation(0);
    img.setPosition(s.x, s.y).setDisplaySize(d, d).setAlpha(s.explosao >= 0 ? Math.max(0, 1 - s.explosao * 2) : 1).setVisible(true);
    if (s.explosao >= 0) {
      const q = quadroUnico('explosao', Math.min(0.999, s.explosao * 0.7 + 0.05));
      if (q !== null) this.explosao.setFrame(quadro('explosao', q)).setPosition(alvo.x, alvo.y - 1).setDisplaySize(140, 146).setVisible(true);
    }
  }

  /** choque: o raio de duas pontas liga as mãos; explosão branca no ponto de encontro (drawSpecialBeams) */
  private desenharChoque(e: EstadoLuta, mao: (l: Lutador) => Ponto, relogio: number) {
    const ch = e.choque;
    if (!ch) { this.choqueImg.setVisible(false); return; }
    const m1 = mao(e.p1), m2 = mao(e.p2);
    const meioX = meioDoChoqueX(ch.empurrao);
    const py = (m1.y + m2.y) / 2;
    const x1 = Math.min(m1.x, meioX - 40), x2 = Math.max(m2.x, meioX + 40);
    this.choqueImg.setFrame(quadro('raio_pontas', quadroDoEfeito('raio_pontas', relogio)));
    this.choqueImg.setPosition(x1 - 20, py).setDisplaySize(x2 - x1 + 40, 60).setAlpha(1).setVisible(true);
    const g = this.grafRaios;
    const explode = 30 + Math.sin((C.CHOQUE_DURACAO - ch.idade) * 0.9) * 10;
    for (let i = 6; i >= 1; i--) g.fillStyle(i > 3 ? 0xfff3b0 : 0xffffff, 0.22).fillCircle(meioX, py, (explode * i) / 6);
    g.fillStyle(0xffffff, 1).fillRect(meioX - 10, py - 12, 20, 24);
  }

  destruir(): void {
    this.lutador.p1.destruir(); this.lutador.p2.destruir();
  }
}
