// Telas do menu do jogo antigo que não são a luta: ESCOLHA SEU CAMINHO (mode_select), PERSONAGENS (galeria com o
// quadro "i" das formas; também a escolha do VILÃO DA FASE), ARENAS (configurar cada fase: posição, vilão + forma,
// minion), RANKING (geral e por fase) e CONQUISTAS. Mesmas posições e textos do antigo.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T, TF } from '../logica/idioma';
import { botao, botaoNav, montarTela, painel, ret, texto, cor, Navegacao, type Ret } from '../ui/telas';
import { ORDEM_PERSONAGENS, PERSONAGENS, chaveDoAtlas } from '../dados/personagens';
import { mostrarBarraDeCarregamento } from '../ui/barra';
import { fasesEmOrdem, mudarConfigDasFases, configDasFases, todasAsFases, faseDe } from '../dados/fases';
import { faseLiberada } from '../logica/ondas';
import { lerProgresso } from '../logica/progresso';
import { MINIONS, trocarPosicao } from '../logica/configFases';
import { escalaDaAltura } from '../logica/luta';
import { chaveFoto, fazerFotos } from '../ui/fotoFase';
import { retratoDe } from '../ui/criados';
import { cadeado, medalha } from '../ui/esfera';
import { conquistas, CONQUISTAS, type LinhaRanking } from '../logica/conquistas';
import { pedirMinion, chaveDoMinion } from '../ui/historia';
import type { ModeloMinion } from '../logica/minions';

const retratos = (cena: Phaser.Scene) => {
  if (!cena.textures.exists('retratos')) { mostrarBarraDeCarregamento(cena); cena.load.atlas('retratos', 'atlas/retratos.webp', 'atlas/retratos.json'); }
};
const escurecer = (cena: Phaser.Scene, a = 0.68) => cena.add.rectangle(0, 0, TELA_L, TELA_A, 0x020a1d, a).setOrigin(0).setDepth(-9);
const titulo = (cena: Phaser.Scene, t: string, y = 25, tam = 18, c = '#fff0a6') =>
  cena.add.text(TELA_L / 2, y, T(t), estiloTexto({ fontFamily: "'Trebuchet MS', sans-serif", fontStyle: 'bold', fontSize: `${tam}px`, color: c })).setOrigin(0.5, 0.75);

// ------------------------------------------------------------------------------------------------------------
export class ModoJogo extends Phaser.Scene {
  constructor() { super('ModoJogo'); }
  create(): void {
    ajustarCamera(this);
    const nav = montarTela(this, () => this.scene.start('Menu'));
    painel(this, 120, 60, 560, 230, 'ESCOLHA SEU CAMINHO', 'PARTIDA RÁPIDA OU LOCAL');
    botaoNav(this, nav, ret(175, 176, 200, 58), 'SINGLEPLAYER', () => this.scene.start('Mapa'), { cor: '#7dd3fc' });
    botaoNav(this, nav, ret(425, 176, 200, 58), 'VERSUS (2 JOGADORES)', () => this.scene.start('Selecao', { modo: 'versus' }), { cor: '#a78bfa' });
    // só do novo: luta rápida contra a CPU (o antigo não tinha)
    botaoNav(this, nav, ret(300, 246, 200, 30), '1 JOGADOR x CPU', () => this.scene.start('Selecao', { modo: 'cpu' }), { cor: '#fde68a', fonte: 11 });
  }
}

// ------------------------------------------------------------------------------------------------------------
// PERSONAGENS: 5 cartões por fileira (UI.GRID_CARD 138x90), abas HERÓIS / VILÕES, botão "i" com as formas.
// Com { fase } é a escolha do VILÃO DA FASE (tela ARENAS → TROCAR): tocar no cartão abre as formas para escolher.
const CARTA_L = 138, CARTA_A = 90, TOPO = 80;
const listaDaAba = (aba: 'HERÓIS' | 'VILÕES') => ORDEM_PERSONAGENS.filter((id) => {
  const a = PERSONAGENS[id].alinhamento;
  return aba === 'HERÓIS' ? a === 'HERÓI' || a === 'ANTI-HERÓI' : a === 'VILÃO' || a === 'ANTI-HERÓI';
});
export const retCarta = (i: number, rolagem = 0): Ret => {
  const esquerda = Math.round((TELA_L - (CARTA_L * 5 + 12 * 4)) / 2);
  return ret(esquerda + (i % 5) * (CARTA_L + 12), TOPO + Math.floor(i / 5) * (CARTA_A + 10) - rolagem, CARTA_L, CARTA_A);
};

export class Personagens extends Phaser.Scene {
  private aba: 'HERÓIS' | 'VILÕES' = 'HERÓIS';
  private fase: string | null = null;
  private volta: { fase: string; pos: number; minion: ModeloMinion; vilao: { personagem: string; nivel: number } | null } | null = null;
  private rolagem = 0;
  private lista!: Phaser.GameObjects.Container;
  private nav!: Navegacao;
  private quadro: Phaser.GameObjects.Container | null = null;
  constructor() { super('Personagens'); }
  init(d: { fase?: string; volta?: Personagens['volta'] } = {}): void {
    this.fase = d?.fase ?? null;
    this.volta = d?.volta ?? null;
    this.aba = this.fase ? 'VILÕES' : this.aba;
    this.rolagem = 0;
    this.quadro = null;
    this.navQuadro = null;
    this.gBarra = null;
  }
  preload(): void { retratos(this); }
  create(): void {
    ajustarCamera(this);
    this.nav = montarTela(this, () => this.voltar());
    escurecer(this);
    titulo(this, this.fase ? 'VILÃO DA FASE' : 'PERSONAGENS');
    if (this.fase) texto(this, TELA_L / 2, 62, T(faseDe(this.fase).nome), 12, '#fca5a5').setOrigin(0.5, 0.75);
    else {
      for (const [r, a] of [[ret(250, 45, 140, 25), 'HERÓIS'], [ret(410, 45, 140, 25), 'VILÕES']] as const)
        botaoNav(this, this.nav, r, a, () => { this.aba = a; this.scene.restart({ fase: undefined }); }, { cor: this.aba === a ? '#ffff00' : '#00ffff' });
    }
    this.montarLista();
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => { if (!this.quadro) this.rolar(dy * 0.5); });
    let arrasto: { y: number; r: number } | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (!this.quadro && p.worldY > TOPO - 6) arrasto = { y: p.worldY, r: this.rolagem }; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (arrasto && p.isDown && Math.abs(p.worldY - arrasto.y) > 8) this.rolar(arrasto.r - (p.worldY - arrasto.y) - this.rolagem); });
    this.input.on('pointerup', () => { arrasto = null; });
  }
  private get ids() { return listaDaAba(this.aba); }
  private get maxRolagem() { const fileiras = Math.ceil(this.ids.length / 5); return Math.max(0, fileiras * (CARTA_A + 10) - 10 - (TELA_A - TOPO - 8)); }
  private rolar(d: number): void {
    const n = Phaser.Math.Clamp(this.rolagem + d, 0, this.maxRolagem);
    if (n === this.rolagem) return;
    this.rolagem = n;
    this.lista.y = -n;
    this.barra();
  }
  private gBarra: Phaser.GameObjects.Graphics | null = null;
  private barra(): void {
    this.gBarra ??= this.add.graphics().setDepth(5);
    const g = this.gBarra.clear(), max = this.maxRolagem;
    if (max <= 0) return;
    const y0 = TOPO, h = TELA_A - TOPO - 8, th = Math.max(24, (h * h) / (h + max));
    g.fillStyle(0xffffff, 0.12).fillRect(TELA_L - 14, y0, 5, h).fillStyle(0xe85d04, 1).fillRect(TELA_L - 14, y0 + (h - th) * (this.rolagem / max), 5, th);
  }
  private montarLista(): void {
    this.lista = this.add.container(0, 0);
    const mascara = this.make.graphics({}).fillRect(0, TOPO - 6, TELA_L, TELA_A - TOPO + 6);
    this.lista.setMask(mascara.createGeometryMask());
    const cfgV = this.volta?.vilao;
    this.ids.forEach((id, i) => {
      const r = retCarta(i), p = PERSONAGENS[id];
      const sel = !!this.fase && cfgV?.personagem === id;
      const g = this.add.graphics().fillStyle(sel ? 0x174f78 : 0x061734, sel ? 1 : 0.9).fillRect(r.x, r.y, r.w, r.h).lineStyle(sel ? 3 : 1, sel ? 0xffd23f : 0xe85d04, 1).strokeRect(r.x, r.y, r.w, r.h);
      const img = this.add.image(r.x + r.w / 2, r.y + 68, ...retratoDe(id)).setOrigin(0.5, 1);
      img.setScale(Math.min((r.w - 12) / img.width, 64 / img.height));
      const nome = texto(this, r.x + r.w / 2, r.y + 82, p.nome, 10, '#ffffff').setOrigin(0.5, 0.75);
      const z = this.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
      const abrir = () => this.abrirFormas(id, !!this.fase);
      z.on('pointerup', (pp: Phaser.Input.Pointer) => { if (pp.getDistance() < 8 && !this.quadro) abrir(); });
      // botão "i" (canto de cima à direita)
      const ir = ret(r.x + r.w - 22, r.y + 4, 18, 18);
      const gi = this.add.graphics().fillStyle(0x0a1e46, 0.92).fillCircle(ir.x + 9, ir.y + 9, 8).lineStyle(1.5, 0x7dd3fc, 1).strokeCircle(ir.x + 9, ir.y + 9, 8);
      const ti = this.add.text(ir.x + 9, ir.y + 10, 'i', estiloTexto({ fontFamily: 'Georgia, serif', fontStyle: 'bold', fontSize: '12px', color: '#e0f2fe' })).setOrigin(0.5);
      const zi = this.add.zone(ir.x - 2, ir.y - 2, ir.w + 4, ir.h + 4).setOrigin(0).setInteractive({ useHandCursor: true });
      zi.on('pointerup', () => { if (!this.quadro) this.abrirFormas(id, false); });
      this.lista.add([g, img, nome, z, gi, ti, zi]);
      // controle/teclado: o cartão (rola até ele) e o "i"
      this.nav.add({ ...r, acionar: () => { this.verCarta(i); abrir(); } });
      if (this.fase) this.nav.add({ ...ir, acionar: () => this.abrirFormas(id, false) });
    });
    this.barra();
  }
  private verCarta(i: number): void {
    const r = retCarta(i, this.rolagem);
    if (r.y < TOPO) this.rolar(r.y - TOPO);
    else if (r.y + r.h > TELA_A - 6) this.rolar(r.y + r.h - (TELA_A - 6));
  }
  private voltar(): void {
    if (this.quadro) { this.fecharQuadro(); return; }
    if (this.fase && this.volta) this.scene.start('ConfigArenas', { painel: this.volta });
    else this.scene.start('Menu');
  }
  private fecharQuadro(): void {
    this.quadro?.destroy(true);
    this.quadro = null;
    this.nav.ativa = true;
    this.navQuadro?.limpar();
  }
  private navQuadro: Navegacao | null = null;

  /** quadro "i" (forma base e todas as transformações) ou, escolhendo o vilão da fase, a escolha da forma */
  private abrirFormas(id: string, escolher: boolean): void {
    const p = PERSONAGENS[id];
    const chaves = p.formas.map((_, n) => chaveDoAtlas(id, n));
    const faltam = chaves.filter((k) => !this.textures.exists(k));
    if (faltam.length) {
      for (const k of faltam) this.load.atlas(k, `atlas/${k}.webp`, `atlas/${k}.json`);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.abrirFormas(id, escolher));
      this.load.start();
      return;
    }
    this.fecharQuadro();
    this.nav.ativa = false;
    const px = 50, py = 52, pw = TELA_L - 100, ph = TELA_A - 72, gap = 8, areaX = px + 12, areaW = pw - 24;
    const n = p.formas.length;
    const colW = escolher ? Math.max(104, Math.min(130, (areaW - gap * (n - 1)) / n)) : Math.min(130, (areaW - gap * (n - 1)) / n);
    const total = colW * n + gap * (n - 1);
    const x0 = total <= areaW ? TELA_L / 2 - total / 2 : areaX;
    const topo = py + 56, altura = ph - 66;
    const itens: Phaser.GameObjects.GameObject[] = [];
    const fundo = this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, TELA_L, TELA_A).fillStyle(0x06122c, 0.97).fillRect(px, py, pw, ph).lineStyle(2, 0xffd23f, 1).strokeRect(px, py, pw, ph);
    const bloqueio = this.add.zone(0, 0, TELA_L, TELA_A).setOrigin(0).setInteractive();
    itens.push(bloqueio, fundo);
    itens.push(this.add.text(TELA_L / 2, py + 24, p.nome, estiloTexto({ fontFamily: "'Trebuchet MS', sans-serif", fontStyle: 'bold', fontSize: '16px', color: '#fff0a6' })).setOrigin(0.5, 0.75));
    itens.push(texto(this, TELA_L / 2, py + 40, escolher ? T('EM QUAL FORMA ELE APARECE NESTA FASE?') : `${T(p.alinhamento)}  ·  ${T('ESPECIAL')}: ${p.especial}`, 10, '#9fb3d8', { fontStyle: 'normal' }).setOrigin(0.5, 0.75));
    const escalas = p.formas.map((f) => escalaDaAltura(f.altura));
    const maior = Math.max(1, ...escalas);
    const nq = (this.navQuadro ??= new Navegacao(this, () => this.fecharQuadro()));
    nq.limpar();
    nq.ativa = true;
    let rolagem = 0;
    const conteudo = this.add.container(0, 0);
    const mascara = this.make.graphics({}).fillRect(areaX, topo - 2, areaW, altura + 4);
    conteudo.setMask(mascara.createGeometryMask());
    p.formas.forEach((f, i) => {
      const x = x0 + i * (colW + gap);
      const g = this.add.graphics().fillStyle(0x174f78, escolher ? 0.55 : 0.35).fillRect(x, topo, colW, altura).lineStyle(escolher ? 2 : 1, escolher ? 0xe85d04 : 0x7dd3fc, escolher ? 1 : 0.5).strokeRect(x, topo, colW, altura);
      const nome = (i === 0 ? T('FORMA BASE') : f.nome.toUpperCase());
      const t = texto(this, x + colW / 2, topo + 14, nome, 10, i ? '#ffd23f' : '#e0f2fe').setOrigin(0.5, 0.75);
      for (let px2 = 10; px2 > 6 && t.width > colW - 6; px2--) t.setFontSize(px2 - 1);
      const k = escalas[i] / maior;
      const img = this.add.image(x + colW / 2, topo + altura - 6, chaves[i], 'idle/0').setOrigin(0.5, 1);
      const ih = (altura - 26) * k, iw = Math.min(colW - 8, ((altura - 26) * 96) / 112) * k;
      img.setScale(Math.min(iw / img.width, ih / img.height) * 1.25);
      conteudo.add([g, t, img]);
      if (escolher) {
        const z = this.add.zone(x, topo, colW, altura).setOrigin(0).setInteractive({ useHandCursor: true });
        const escolherForma = () => this.escolheuVilao(id, i);
        z.on('pointerup', (pp: Phaser.Input.Pointer) => { if (pp.getDistance() < 8) escolherForma(); });
        conteudo.add(z);
        nq.add({ x, y: topo, w: colW, h: altura, acionar: () => { const sobra = Math.max(0, total - areaW); rolagem = Phaser.Math.Clamp(x - areaX - (areaW - colW) / 2, 0, sobra); conteudo.x = -rolagem; escolherForma(); } });
      }
    });
    if (escolher && total > areaW) {
      let a: { x: number; r: number } | null = null;
      bloqueio.on('pointerdown', (pp: Phaser.Input.Pointer) => { a = { x: pp.worldX, r: rolagem }; });
      this.input.on('pointermove', (pp: Phaser.Input.Pointer) => { if (a && pp.isDown) { rolagem = Phaser.Math.Clamp(a.r - (pp.worldX - a.x), 0, total - areaW); conteudo.x = -rolagem; } });
      this.input.on('pointerup', () => { a = null; });
    }
    const fechar = botao(this, ret(706, 58, 30, 26), '✕', () => this.fecharQuadro(), { cor: '#fca5a5', fonte: 14, prof: 30 });
    nq.add({ ...fechar.r, acionar: fechar.acionar });
    itens.push(conteudo, fechar.container);
    this.quadro = this.add.container(0, 0, itens).setDepth(20);
    fechar.container.setDepth(31);
  }
  private escolheuVilao(id: string, nivel: number): void {
    if (!this.fase || !this.volta) return;
    this.scene.start('ConfigArenas', { painel: { ...this.volta, vilao: { personagem: id, nivel } } });
  }
}

// ------------------------------------------------------------------------------------------------------------
// ARENAS: cartões das fases (foto do cenário; colorida se liberada, cinza com cadeado se bloqueada) e o quadro
// CONFIGURAR ARENA de cada uma.
export const retCartaFase = (i: number, n: number): Ret =>
  n > 12 ? ret(30 + (i % 6) * 124, 62 + Math.floor(i / 6) * 94, 118, 86) : ret(30 + (i % 6) * 124, 70 + Math.floor(i / 6) * 106, 118, 92);

export interface PainelArena { fase: string; pos: number; minion: ModeloMinion; vilao: { personagem: string; nivel: number } | null }

export class ConfigArenas extends Phaser.Scene {
  private painelAberto: PainelArena | null = null;
  private dica!: Phaser.GameObjects.Text;
  private nav!: Navegacao;
  constructor() { super('ConfigArenas'); }
  init(d: { painel?: PainelArena } = {}): void { this.painelAberto = d?.painel ?? null; }
  preload(): void { retratos(this); for (const m of MINIONS) pedirMinion(this, m.id); }
  create(): void {
    ajustarCamera(this);
    this.nav = montarTela(this, () => { if (this.painelAberto) { this.painelAberto = null; this.scene.restart({ painel: undefined }); } else this.scene.start('Menu'); });
    escurecer(this, 0.85);
    titulo(this, 'SELEÇÃO DE ARENAS — CRONOLOGIA DBZ', 26, 16, '#ffff00');
    texto(this, TELA_L / 2, 42, T('COMPLETE O MODO NORMAL (5 ONDAS) PRA LIBERAR A PRÓXIMA FASE'), 10, '#9fb3d8', { fontStyle: 'normal' }).setOrigin(0.5, 0.75);
    const fases = fasesEmOrdem(), ordem = fases.map((f) => f.id), prog = lerProgresso();
    const fotos: Record<string, Phaser.GameObjects.Image> = {};
    fases.forEach((f, i) => {
      const r = retCartaFase(i, fases.length), livre = faseLiberada(f.id, ordem, prog);
      const tema = f.cor;
      const fundo = this.add.graphics().fillStyle(livre ? 0x111125 : 0x0a0a12, 1).fillRoundedRect(r.x, r.y, r.w, r.h, 8);
      void fundo;
      const foto = this.add.image(r.x, r.y, '__DEFAULT').setOrigin(0).setDisplaySize(r.w, r.h).setVisible(false);
      fotos[f.id] = foto;
      const g = this.add.graphics();
      g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85).fillRect(r.x, r.y + r.h * 0.45, r.w, r.h * 0.55);
      g.lineStyle(livre ? 1.5 : 1, livre ? tema : 0x3a3a48, 1).strokeRoundedRect(r.x, r.y, r.w, r.h, 8);
      g.fillStyle(0x000000, 0.6).fillRoundedRect(r.x + 6, r.y + 6, 46, 15, 7);
      texto(this, r.x + 29, r.y + 16, TF('FASE {0}', i + 1), 8, livre ? `#${tema.toString(16).padStart(6, '0')}` : '#8892a8').setOrigin(0.5, 0.75);
      const nome = texto(this, r.x + r.w / 2, r.y + r.h - 10, T(f.nome), 10, livre ? '#ffffff' : '#aab2c4', { stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 0.75);
      if (nome.width > r.w - 10) nome.setScale((r.w - 10) / nome.width, 1);
      if (livre) {
        const v = configDasFases().viloes[f.id];
        if (v) {
          g.fillStyle(0x000000, 0.55).fillRoundedRect(r.x + r.w - 40, r.y + 5, 35, 46, 6).lineStyle(1, 0xfca5a5, 1).strokeRoundedRect(r.x + r.w - 40, r.y + 5, 35, 46, 6);
          const img = this.add.image(r.x + r.w - 22.5, r.y + 49, ...retratoDe(v.personagem)).setOrigin(0.5, 1);
          img.setScale(Math.min(31 / img.width, 42 / img.height));
        }
      } else {
        this.add.image(r.x + r.w / 2, r.y + 36, cadeado(this)).setDisplaySize(18, 22);
        texto(this, r.x + r.w / 2, r.y + 62, T('BLOQUEADA'), 8, '#cbd5e1').setOrigin(0.5, 0.75);
      }
      const z = this.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
      const abrir = () => {
        if (this.painelAberto) return;
        if (!livre) { this.mostrarDica(TF('{0} BLOQUEADA — COMPLETE O NORMAL DA FASE ANTERIOR', T(f.nome))); return; }
        const c = configDasFases();
        this.painelAberto = { fase: f.id, pos: i + 1, minion: faseDe(f.id).minion, vilao: c.viloes[f.id] ?? null };
        this.scene.restart({ painel: this.painelAberto });
      };
      z.on('pointerup', abrir);
      if (!this.painelAberto) this.nav.add({ ...r, acionar: abrir });
      g.setData('foto', foto);
      foto.setData('livre', livre).setData('w', r.w).setData('h', r.h);
    });
    fazerFotos(this, todasAsFases().map((f) => f.id), (id) => {
      const img = fotos[id];
      if (!img || !img.active) return;
      img.setTexture(chaveFoto(id, !img.getData('livre'))).setDisplaySize(img.getData('w'), img.getData('h')).setVisible(true);
    });
    this.dica = texto(this, TELA_L / 2, TELA_A - 14, '', 11, '#ff5555').setOrigin(0.5, 0.75);
    if (this.painelAberto) this.desenharPainel(this.painelAberto, ordem);
  }
  private mostrarDica(t: string): void {
    this.dica.setText(t);
    this.time.removeAllEvents();
    this.time.delayedCall(2000, () => this.dica.setText(''));
  }

  /** drawPainelArena: FASE (posição), PERSONAGEM (vilão + forma; TROCAR abre a escolha) e MINION */
  private desenharPainel(p: PainelArena, ordem: string[]): void {
    this.nav.limpar();
    const P = ret(170, 44, 460, 274);
    const base = faseDe(p.fase);
    const g = this.add.graphics().setDepth(20);
    this.add.zone(0, 0, TELA_L, TELA_A).setOrigin(0).setInteractive().setDepth(19);
    g.fillStyle(0x000000, 0.6).fillRect(0, 0, TELA_L, TELA_A).fillStyle(0x06122c, 0.97).fillRect(P.x, P.y, P.w, P.h).lineStyle(2, base.cor, 1).strokeRect(P.x, P.y, P.w, P.h);
    const d = (o: Phaser.GameObjects.Text) => o.setDepth(21);
    d(this.add.text(TELA_L / 2, P.y + 24, T(base.nome), estiloTexto({ fontFamily: "'Trebuchet MS', sans-serif", fontStyle: 'bold', fontSize: '15px', color: '#fff0a6' })).setOrigin(0.5, 0.75));
    d(texto(this, TELA_L / 2, P.y + 40, T('CONFIGURAR ARENA'), 10, '#9fb3d8', { fontStyle: 'normal' }).setOrigin(0.5, 0.75));
    const rot = (t: string, y: number) => d(texto(this, P.x + 26, y, T(t), 12, '#7dd3fc').setOrigin(0, 0.75));
    const b = (r: Ret, t: string, f: () => void, c: string, fonte = 14) => { const x = botao(this, r, t, f, { cor: c, fonte, prof: 22 }); this.nav.add({ ...r, acionar: x.acionar }); return x; };
    const refazer = () => this.scene.restart({ painel: p });
    // FASE
    const L = { faseMenos: ret(400, 100, 36, 32), faseMais: ret(540, 100, 36, 32), trocar: ret(522, 166, 92, 30), minionMenos: ret(330, 226, 36, 32), minionMais: ret(578, 226, 36, 32), salvar: ret(250, 276, 140, 34), cancelar: ret(410, 276, 140, 34) };
    rot('FASE', L.faseMenos.y + 21);
    b(L.faseMenos, '◀', () => { p.pos = p.pos <= 1 ? ordem.length : p.pos - 1; refazer(); }, '#ffd23f');
    b(L.faseMais, '▶', () => { p.pos = p.pos >= ordem.length ? 1 : p.pos + 1; refazer(); }, '#ffd23f');
    d(texto(this, (L.faseMenos.x + L.faseMenos.w + L.faseMais.x) / 2, L.faseMenos.y + 23, String(p.pos), 18, '#ffffff').setOrigin(0.5, 0.75));
    const atual = ordem.indexOf(p.fase) + 1;
    if (p.pos !== atual) {
      const outra = todasAsFases().find((f) => f.id === ordem[p.pos - 1]);
      d(texto(this, TELA_L / 2, L.faseMenos.y + L.faseMenos.h + 14, TF('OCUPA O LUGAR DE: {0} (AS OUTRAS ANDAM UMA POSIÇÃO)', outra ? T(outra.nome) : ''), 9, '#fca5a5', { fontStyle: 'normal' }).setOrigin(0.5, 0.75));
    }
    // PERSONAGEM
    rot('PERSONAGEM', L.trocar.y + 20);
    const v = p.vilao && PERSONAGENS[p.vilao.personagem] ? p.vilao : null;
    if (v) {
      g.fillStyle(0x000000, 0.45).fillRect(330, 154, 44, 56);
      const chave = chaveDoAtlas(v.personagem, v.nivel);
      const usar = (k: string, fr: string) => { const img = this.add.image(352, 208, k, fr).setOrigin(0.5, 1).setDepth(21); img.setScale(Math.min(40 / img.width, 52 / img.height) * (k === 'retratos' ? 1 : 1.25)); };
      if (v.nivel === 0 || this.textures.exists(chave)) usar(...(v.nivel === 0 ? retratoDe(v.personagem) : [chave, 'idle/0'] as [string, string]));
      else { this.load.atlas(chave, `atlas/${chave}.webp`, `atlas/${chave}.json`); this.load.once(Phaser.Loader.Events.COMPLETE, () => usar(chave, 'idle/0')); this.load.start(); }
      const pp = PERSONAGENS[v.personagem];
      d(texto(this, 384, 176, pp.nome, 12, '#ffffff').setOrigin(0, 0.75));
      d(texto(this, 384, 192, v.nivel === 0 ? T('FORMA BASE') : pp.formas[Math.min(v.nivel, pp.formas.length - 1)].nome.toUpperCase(), 10, '#ffd23f', { fontStyle: 'normal' }).setOrigin(0, 0.75));
    } else d(texto(this, 334, 186, T('NENHUM ESCOLHIDO'), 11, '#94a3b8', { fontStyle: 'normal' }).setOrigin(0, 0.75));
    b(L.trocar, 'TROCAR', () => this.scene.start('Personagens', { fase: p.fase, volta: p }), '#86efac', 11);
    // MINION
    rot('MINION', L.minionMenos.y + 21);
    const iM = Math.max(0, MINIONS.findIndex((m) => m.id === p.minion));
    const passo = (dd: number) => () => { p.minion = MINIONS[(iM + dd + MINIONS.length) % MINIONS.length].id; refazer(); };
    b(L.minionMenos, '◀', passo(-1), '#ffd23f');
    b(L.minionMais, '▶', passo(1), '#ffd23f');
    if (this.textures.exists(chaveDoMinion(p.minion))) { const img = this.add.image(400, L.minionMenos.y + 16, chaveDoMinion(p.minion), 1).setDepth(21); img.setScale(44 / img.height); }
    d(texto(this, 500, L.minionMenos.y + 21, MINIONS[iM].nome, 12, '#ffffff').setOrigin(0.5, 0.75));
    b(L.salvar, 'SALVAR', () => {
      mudarConfigDasFases((c) => {
        const ordemAtual = c.ordem?.length ? fasesEmOrdem().map((f) => f.id) : ordem;
        c.ordem = trocarPosicao(ordemAtual, p.fase, p.pos);
        if (p.vilao) c.viloes[p.fase] = { ...p.vilao }; else delete c.viloes[p.fase];
        c.minions[p.fase] = p.minion;
      });
      this.painelAberto = null;
      this.scene.restart({ painel: undefined });
    }, '#86efac', 12);
    b(L.cancelar, 'CANCELAR', () => { this.painelAberto = null; this.scene.restart({ painel: undefined }); }, '#fca5a5', 12);
  }
}

// ------------------------------------------------------------------------------------------------------------
const formatarTempo = (seg: number) => {
  const t = Math.max(0, Math.round(seg || 0)), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
  const dois = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${dois(m)}:${dois(s)}` : `${m}:${dois(s)}`;
};
/** textoLinhaRanking do antigo */
export function textoLinhaRanking(i: number, rk: LinhaRanking): string {
  const tempo = Number.isFinite(rk.tempo) ? formatarTempo(rk.tempo!) : '—';
  const golpes = Number.isFinite(rk.golpes) ? String(rk.golpes) : '—';
  return `${i + 1}. ${T('SCORE')}: ${rk.score}  -  ${T('TEMPO')}: ${tempo}  -  ${T('GOLPES')}: ${golpes}  -  ${rk.date}`;
}
export class Ranking extends Phaser.Scene {
  private modo: 'geral' | 'fase' = 'geral';
  private fase: string | null = null;
  constructor() { super('Ranking'); }
  create(): void {
    ajustarCamera(this);
    const nav = montarTela(this, () => this.scene.start('Menu'));
    escurecer(this, 0.85);
    titulo(this, 'MELHORES PONTUAÇÕES', 30, 18, '#ffff00');
    const aba = (m: 'geral' | 'fase') => () => { this.modo = m; this.scene.restart(); };
    botaoNav(this, nav, ret(220, 52, 170, 30), 'GERAL', aba('geral'), { cor: this.modo === 'geral' ? '#ffff00' : '#93c5fd' });
    botaoNav(this, nav, ret(410, 52, 170, 30), 'POR FASE', aba('fase'), { cor: this.modo === 'fase' ? '#ffff00' : '#93c5fd' });
    const c = conquistas();
    const linhas = (l: LinhaRanking[], y0: number, passo: number, tam: number, vazio: string, yv: number) => {
      if (!l.length) { texto(this, TELA_L / 2, yv, T(vazio), tam + 1, '#ffffff', { fontStyle: 'normal' }).setOrigin(0.5, 0.75); return; }
      l.forEach((rk, i) => texto(this, TELA_L / 2, y0 + i * passo, textoLinhaRanking(i, rk), tam, i === 0 ? '#ffff00' : '#ffffff', { fontStyle: 'normal' }).setOrigin(0.5, 0.75));
    };
    if (this.modo === 'geral') { linhas(c.rankingGeral(), 130, 32, 14, 'NENHUMA PONTUAÇÃO REGISTRADA AINDA!', 170); return; }
    const fases = fasesEmOrdem();
    this.fase ??= fases[0].id;
    const fotos: Record<string, Phaser.GameObjects.Image> = {};
    fases.forEach((f, i) => {
      const r = fases.length > 12 ? ret(40 + (i % 6) * 122, 80 + Math.floor(i / 6) * 25, 116, 22) : ret(40 + (i % 6) * 122, 84 + Math.floor(i / 6) * 30, 116, 26);
      const sel = this.fase === f.id;
      this.add.graphics().fillStyle(sel ? 0xffff00 : 0xffffff, sel ? 0.18 : 0.06).fillRect(r.x, r.y, r.w, r.h).lineStyle(sel ? 2 : 1, sel ? 0xffff00 : 0x3a3a48, 1).strokeRect(r.x, r.y, r.w, r.h)
        .fillStyle(f.cor, 1).fillCircle(r.x + 13, r.y + r.h / 2, 10);
      const foto = this.add.image(r.x + 13, r.y + r.h / 2, '__DEFAULT').setDisplaySize(20, 20).setVisible(false);
      const m = this.make.graphics({}).fillCircle(r.x + 13, r.y + r.h / 2, 10);
      foto.setMask(m.createGeometryMask());
      fotos[f.id] = foto;
      const t = texto(this, r.x + 26, r.y + 16, T(f.nome), 8, sel ? '#ffff00' : '#cbd5e1').setOrigin(0, 0.75);
      if (t.width > r.w - 30) t.setScale((r.w - 30) / t.width, 1);
      const z = this.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
      const ir = () => { this.fase = f.id; this.scene.restart(); };
      z.on('pointerup', ir);
      nav.add({ ...r, acionar: ir });
    });
    fazerFotos(this, fases.map((f) => f.id), (id) => fotos[id]?.active && fotos[id].setTexture(chaveFoto(id)).setDisplaySize(26, 20).setVisible(true));
    const d = fases.length > 12 ? 12 : 0;
    texto(this, TELA_L / 2, 160 + d, T(faseDe(this.fase).nome), 13, '#93c5fd').setOrigin(0.5, 0.75);
    linhas(c.rankingDaFase(this.fase), 186 + d, 26, 13, 'NENHUMA PONTUAÇÃO NESSA ARENA AINDA!', 190 + d);
  }
}

// ------------------------------------------------------------------------------------------------------------
const CORES_TIER: Record<string, string> = { diamond: '#67e8f9', gold: '#ffd23f', silver: '#c0c7d1', bronze: '#cd7f32' };
export class Conquistas extends Phaser.Scene {
  private rolagem = 0;
  constructor() { super('Conquistas'); }
  create(): void {
    ajustarCamera(this);
    this.rolagem = 0;
    const nav = montarTela(this, () => this.scene.start('Menu'));
    escurecer(this, 0.9);
    titulo(this, 'CONQUISTAS', 18, 15, '#ffff00');
    const c = conquistas(), cont = c.contagem();
    const cardW = Math.min(460, TELA_L - 48), cardH = 46, cardX = (TELA_L - cardW) / 2, cardY = 26;
    this.add.graphics().fillStyle(0x0f0f18, 0.9).fillRect(cardX, cardY, cardW, cardH).lineStyle(1, 0x4a4a5a, 1).strokeRect(cardX, cardY, cardW, cardH);
    const slots: [keyof typeof cont, string][] = [['diamond', 'DIAMANTE'], ['gold', 'OURO'], ['silver', 'PRATA'], ['bronze', 'BRONZE']];
    const slotW = cardW / 4;
    slots.forEach(([k, rot], i) => {
      const sx = cardX + slotW * i + slotW / 2;
      this.add.image(sx - 34, cardY + cardH / 2, medalha(this, k)).setDisplaySize(20, 23);
      texto(this, sx - 20, cardY + 18, T(rot), 11, CORES_TIER[k]).setOrigin(0, 0.75);
      texto(this, sx - 20, cardY + 35, `${cont[k].feitas}/${cont[k].total}`, 13, '#e8e8f0').setOrigin(0, 0.75);
    });
    texto(this, TELA_L / 2, cardY + cardH + 12, TF('TOTAL: {0}/{1}', cont.total.feitas, cont.total.total), 9, '#9fb3d8', { fontStyle: 'normal' }).setOrigin(0.5, 0.75);
    // grade de 2 colunas, rolando
    const colunas = 2, gridTop = 92, gapX = 12, gapY = 8, cardWidth = Math.min(280, (TELA_L - 48 - gapX) / 2), cardHeight = 52;
    const gridLeft = Math.round((TELA_L - (cardWidth * colunas + gapX)) / 2), vista = TELA_A - gridTop - 34;
    const lista = this.add.container(0, 0);
    lista.setMask(this.make.graphics({}).fillRect(0, gridTop, TELA_L, vista).createGeometryMask());
    const fileiras = Math.ceil(CONQUISTAS.length / colunas), max = Math.max(0, fileiras * (cardHeight + gapY) - gapY - vista);
    CONQUISTAS.forEach((a, i) => {
      const x = gridLeft + (i % colunas) * (cardWidth + gapX), y = gridTop + Math.floor(i / colunas) * (cardHeight + gapY);
      const ok = c.tem(a.id), tc = cor(CORES_TIER[a.medalha] ?? CORES_TIER.bronze);
      const g = this.add.graphics().fillStyle(ok ? 0x143c23 : 0x1e1e26, ok ? 0.9 : 0.75).fillRect(x, y, cardWidth, cardHeight).lineStyle(ok ? 2 : 1, ok ? tc : 0x3a3a46, 1).strokeRect(x, y, cardWidth, cardHeight);
      const bx = x + 8, by = y + cardHeight / 2 - 9;
      g.fillStyle(ok ? tc : 0x1a1a22, 1).fillRect(bx, by, 18, 18).lineStyle(1.5, ok ? 0xffffff : 0x555560, 1).strokeRect(bx, by, 18, 18);
      if (ok) g.lineStyle(2.4, 0x132018, 1).beginPath().moveTo(bx + 3.5, by + 9.5).lineTo(bx + 7.5, by + 13.5).lineTo(bx + 14.5, by + 4.5).strokePath();
      const med = this.add.image(x + cardWidth - 12, y + 12, medalha(this, a.medalha, !ok)).setDisplaySize(14, 16);
      const t1 = texto(this, bx + 26, y + 18, T(a.nome), 10, ok ? '#eafff0' : '#aab0bd').setOrigin(0, 0.75).setAlpha(ok ? 1 : 0.45);
      const t2 = texto(this, bx + 26, y + 32, T(a.desc), 8, ok ? '#bfe8cc' : '#8a8f9c', { fontStyle: 'normal' }).setOrigin(0, 0.75).setAlpha(ok ? 1 : 0.45);
      for (const t of [t1, t2]) if (t.width > cardWidth - 46) t.setScale((cardWidth - 46) / t.width, 1);
      lista.add([g, med, t1, t2]);
      nav.add({ x, y, w: cardWidth, h: cardHeight, acionar: () => undefined });
    });
    const barra = this.add.graphics();
    const rolar = (n: number) => {
      this.rolagem = Phaser.Math.Clamp(n, 0, max);
      lista.y = -this.rolagem;
      barra.clear();
      if (max > 0) {
        const th = Math.max(20, (vista / (vista + max)) * vista);
        barra.fillStyle(0xffffff, 0.12).fillRect(TELA_L - 12, gridTop, 4, vista).fillStyle(0xffd23f, 1).fillRect(TELA_L - 12, gridTop + (this.rolagem / max) * (vista - th), 4, th);
      }
      // o quadro de foco do controle acompanha a lista
      nav.alvos.forEach((al, i) => { if (i >= 2) al.y = gridTop + Math.floor((i - 2) / colunas) * (cardHeight + gapY) - this.rolagem; });
      nav.desenhar();
    };
    rolar(0);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => rolar(this.rolagem + dy * 0.5));
    let a: { y: number; r: number } | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { a = { y: p.worldY, r: this.rolagem }; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (a && p.isDown) rolar(a.r - (p.worldY - a.y)); });
    this.input.on('pointerup', () => { a = null; });
    // controle: o foco que sai da área visível rola a lista
    const mover = nav.mover.bind(nav);
    nav.mover = (dx, dy) => {
      mover(dx, dy);
      const al = nav.alvos[nav.foco];
      if (!al || nav.foco < 2) return;
      if (al.y < gridTop) rolar(this.rolagem - (gridTop - al.y));
      else if (al.y + al.h > gridTop + vista) rolar(this.rolagem + (al.y + al.h - gridTop - vista));
    };
  }
}

export const CENAS_TELAS = [ModoJogo, Personagens, ConfigArenas, Ranking, Conquistas];
