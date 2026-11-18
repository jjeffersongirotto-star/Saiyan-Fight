// Peças das telas de menu com o visual do jogo antigo (menu.js): fundo com céu/diagonais/montanhas/sol
// (traceMenuBackdrop), painel Dragon Ball (drawDragonBallPanel), botão azul com borda laranja que acende no
// mouse e afunda no toque (drawBtn), chave liga/desliga (drawModeToggle), seta ← de voltar e botão de tela cheia.
// Tudo com as MESMAS posições do antigo (tela lógica 800x350). A Navegacao deixa usar as setas/Enter/Esc e o
// controle (direcional + CRUZ confirma + BOLA volta) em qualquer tela, com o quadro amarelo de foco.
import Phaser from 'phaser';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { ESCALA_RENDER, estiloTexto, fatorTexto } from './resolucao';
import { som } from '../audio/som';
import { vigiarControles } from '../entrada/controles';
import { janelaAberta } from './janela';
import { type Intencao } from '../logica/controle';

export interface Ret { x: number; y: number; w: number; h: number }
export const ret = (x: number, y: number, w: number, h: number): Ret => ({ x, y, w, h });
export const dentro = (px: number, py: number, r: Ret) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

const css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
export const cor = (s: string) => parseInt(s.replace('#', ''), 16);

/** Fundo dos menus (traceMenuBackdrop): isMenu = o do menu principal (mais escuro, sol à direita) */
export function fundoDeMenu(cena: Phaser.Scene, isMenu = false): Phaser.GameObjects.Image {
  const chave = `fundo-menu-${isMenu ? 'm' : 's'}`;
  if (!cena.textures.exists(chave)) {
    const k = ESCALA_RENDER;
    const tex = cena.textures.createCanvas(chave, TELA_L * k, TELA_A * k)!;
    const ctx = tex.getContext();
    ctx.scale(k, k);
    const W = TELA_L, H = TELA_A;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, isMenu ? '#080914' : '#061a3a');
    sky.addColorStop(0.58, isMenu ? '#111b35' : '#0b3d73');
    sky.addColorStop(1, isMenu ? '#261126' : '#ee6b22');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = isMenu ? 0.26 : 0.18;
    ctx.strokeStyle = isMenu ? '#d8edff' : '#9bdcff';
    ctx.lineWidth = 1;
    for (let i = -H; i < W + H; i += 18) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = isMenu ? '#24142d' : '#08264e';
    ctx.beginPath();
    ctx.moveTo(0, 236); ctx.lineTo(100, 190); ctx.lineTo(182, 228); ctx.lineTo(300, 164); ctx.lineTo(430, 225); ctx.lineTo(570, 180);
    ctx.lineTo(W, 236); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    const sx = isMenu ? 660 : 112, sy = isMenu ? 74 : 78;
    const aura = ctx.createRadialGradient(sx, sy, 8, sx, sy, 86);
    aura.addColorStop(0, 'rgba(255, 245, 171, 0.95)');
    aura.addColorStop(0.18, 'rgba(255, 184, 38, 0.55)');
    aura.addColorStop(1, 'rgba(255, 99, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(sx - 100, sy - 100, 200, 200);
    ctx.fillStyle = '#fff2a6';
    ctx.beginPath(); ctx.arc(sx, sy, 17, 0, Math.PI * 2); ctx.fill();
    tex.refresh();
  }
  return cena.add.image(0, 0, chave).setOrigin(0).setDisplaySize(TELA_L, TELA_A).setDepth(-20);
}

/** drawDragonBallPanel */
export function painel(cena: Phaser.Scene, x: number, y: number, w: number, h: number, titulo: string, sub = '', prof = 0): Phaser.GameObjects.Container {
  const g = cena.add.graphics();
  g.fillStyle(0x030d23, 0.88).fillRect(x, y, w, h).lineStyle(2, 0xf2a900, 1).strokeRect(x, y, w, h);
  g.fillStyle(0xe85d04, 1).fillRect(x, y, 7, h).fillStyle(0xffd23f, 1).fillRect(x + 7, y, w - 7, 4);
  const itens: Phaser.GameObjects.GameObject[] = [g];
  if (titulo) itens.push(cena.add.text(x + w / 2, y + 27, T(titulo), estiloTexto({ fontFamily: "'Trebuchet MS', sans-serif", fontStyle: 'bold', fontSize: '22px', color: '#fff0a6' })).setOrigin(0.5));
  if (sub) itens.push(cena.add.text(x + w / 2, y + 50, T(sub), estiloTexto({ fontFamily: "'Trebuchet MS', sans-serif", fontSize: '11px', color: '#8fd3ff' })).setOrigin(0.5));
  return cena.add.container(0, 0, itens).setDepth(prof);
}

export interface BotaoTela {
  container: Phaser.GameObjects.Container;
  rotulo: Phaser.GameObjects.Text;
  r: Ret;
  texto(t: string): void;
  corTexto(c: string): void;
  acionar(): void;
  ligado: boolean;
}

/** drawBtn: azul escuro, borda laranja, laranja no mouse, afunda no toque; o texto encolhe até caber */
export function botao(cena: Phaser.Scene, r: Ret, texto: string, aoClicar: () => void, opc: { cor?: string; fonte?: number; mono?: boolean; prof?: number; semSom?: boolean } = {}): BotaoTela {
  const g = cena.add.graphics();
  const fonte = (opc.fonte ?? 12) * fatorTexto();
  const rot = cena.add.text(r.w / 2, r.h / 2 + 1, '', estiloTexto({ fontFamily: opc.mono === false ? "'Segoe UI', Arial, sans-serif" : "'Courier New', monospace", fontStyle: 'bold', fontSize: `${fonte}px`, color: opc.cor ?? '#00ffff', align: 'center' })).setOrigin(0.5);
  let hover = false, apertado = false;
  const desenhar = () => {
    const [c1, c2] = apertado ? [0xe85d04, 0x9a3412] : hover ? [0xffb703, 0xe85d04] : [0x123765, 0x071d3a];
    g.clear();
    if (!apertado) g.fillStyle(hover ? 0xffb703 : 0x000000, hover ? 0.25 : 0.3).fillRect(1, 4, r.w, r.h);
    g.fillGradientStyle(c1, c1, c2, c2, 1).fillRect(0, apertado ? 1 : 0, r.w, r.h);
    g.lineStyle(hover ? 2 : 1.5, hover ? 0xfff0a6 : 0xe85d04, 1).strokeRect(0, apertado ? 1 : 0, r.w, r.h);
  };
  const ajustar = (t: string) => {
    rot.setText(t);
    let px = fonte;
    rot.setFontSize(px);
    while (px > 7 && rot.width > r.w - 10) { px -= 0.5; rot.setFontSize(px); }
  };
  ajustar(T(texto));
  desenhar();
  const c = cena.add.container(r.x, r.y, [g, rot]).setSize(r.w, r.h).setDepth(opc.prof ?? 1);
  // seta ← de VOLTAR: desenhada (a letra "←" das fontes fica baixa no botão, cada celular de um jeito) e centrada
  if (texto === '←') {
    rot.setVisible(false);
    const cor = Phaser.Display.Color.HexStringToColor(opc.cor ?? '#00ffff').color;
    const cx = r.w / 2, cy = r.h / 2, m = Math.min(r.w, r.h) * 0.28;
    const seta = cena.add.graphics().lineStyle(2.5, cor, 1)
      .lineBetween(cx - m, cy, cx + m, cy)
      .lineBetween(cx - m, cy, cx - m + m * 0.7, cy - m * 0.7)
      .lineBetween(cx - m, cy, cx - m + m * 0.7, cy + m * 0.7);
    c.add(seta);
  }
  c.setInteractive(new Phaser.Geom.Rectangle(r.w / 2, r.h / 2, r.w, r.h), Phaser.Geom.Rectangle.Contains);
  if (c.input) c.input.cursor = 'pointer';
  const b: BotaoTela = {
    container: c, rotulo: rot, r, ligado: true,
    texto: (t) => ajustar(t), corTexto: (k) => rot.setColor(k),
    acionar: () => { if (!b.ligado) return; if (!opc.semSom) { som.ligar(); som.tocar('menu'); } aoClicar(); },
  };
  c.on('pointerover', (p: Phaser.Input.Pointer) => { if (!p.wasTouch) { hover = true; desenhar(); } });
  c.on('pointerout', () => { hover = false; apertado = false; desenhar(); });
  c.on('pointerdown', () => { apertado = true; desenhar(); });
  c.on('pointerup', () => {
    const era = apertado; apertado = false; desenhar();
    if (!era) return;
    // v0.144: clarão rápido no botão tocado
    const f = cena.add.graphics().fillStyle(0xffffff, 0.45).fillRect(0, 0, r.w, r.h);
    c.add(f);
    cena.tweens.add({ targets: f, alpha: 0, duration: 160, onComplete: () => f.destroy() });
    b.acionar();
  });
  return b;
}

/** seta ← do canto (MENU_LAYOUT.back) */
export function botaoVoltar(cena: Phaser.Scene, aoVoltar: () => void): BotaoTela {
  return botao(cena, ret(20, 20, 42, 32), '←', aoVoltar, { cor: '#fff0a6', fonte: 18 });
}

/** chave liga/desliga (drawModeToggle): rótulo em cima, OFF/ON, pílula com a bolinha */
export function chave(cena: Phaser.Scene, r: Ret & { cx: number }, rotulo: string, aoClicar: () => void): { r: Ret; marcar(ativo: boolean, cor?: number): void; acionar(): void } {
  const g = cena.add.graphics();
  const est = estiloTexto({ fontFamily: "'Courier New', monospace", fontStyle: 'bold', fontSize: '12px', color: '#e2e8f0' });
  cena.add.text(r.cx, r.y + 9, T(rotulo), est).setOrigin(0.5);
  const pq = estiloTexto({ fontFamily: "'Courier New', monospace", fontStyle: 'bold', fontSize: '8px', color: '#dbeafe' });
  cena.add.text(r.cx - 30, r.y + 25, 'OFF', pq).setOrigin(0.5);
  cena.add.text(r.cx + 32, r.y + 25, 'ON', pq).setOrigin(0.5);
  const y = r.y + 34;
  const marcar = (ativo: boolean, c = 0x22c55e) => {
    g.clear().fillStyle(0x0a1423, 0.9).fillRoundedRect(r.cx - 40, y, 80, 26, 13).lineStyle(2, ativo ? c : 0x7dd3fc, 1).strokeRoundedRect(r.cx - 40, y, 80, 26, 13);
    g.lineStyle(3, ativo ? c : 0x557089, 1).lineBetween(r.cx - 16, y + 13, r.cx + 16, y + 13);
    g.fillStyle(ativo ? c : 0x40566d, 1).fillCircle(r.cx + (ativo ? 16 : -16), y + 13, 8);
  };
  const acionar = () => { som.ligar(); som.tocar('menu'); aoClicar(); };
  cena.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', acionar);
  return { r, marcar, acionar };
}

/** botão de tela cheia do canto direito (getFullscreenButtonRect: 34x28 a 8 da borda) */
export function botaoTelaCheia(cena: Phaser.Scene): Ret {
  const r = ret(TELA_L - 34 - 8, 8, 34, 28);
  const g = cena.add.graphics().setDepth(1900);
  const desenhar = (hover: boolean) => {
    const ativo = cena.scale.isFullscreen;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, meio = (ativo ? 15 : 19) / 2, folga = ativo ? 3.5 : 4, ponta = ativo ? 3.5 : 4;
    g.clear().lineStyle(2.2, hover ? 0xfff0a6 : 0x94dcff, hover ? 1 : 0.8);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const qx = cx + sx * meio, qy = cy + sy * meio;
      const d = ativo ? { x: -sx, y: -sy } : { x: sx, y: sy };
      const tip = ativo ? { x: cx - d.x * folga, y: cy - d.y * folga } : { x: qx, y: qy };
      const ini = ativo ? { x: qx, y: qy } : { x: cx + d.x * folga, y: cy + d.y * folga };
      g.lineBetween(ini.x, ini.y, tip.x, tip.y);
      g.lineBetween(tip.x, tip.y, tip.x - d.x * ponta, tip.y);
      g.lineBetween(tip.x, tip.y, tip.x, tip.y - d.y * ponta);
    }
  };
  desenhar(false);
  const z = cena.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(1901);
  z.on('pointerover', () => desenhar(true));
  z.on('pointerout', () => desenhar(false));
  z.on('pointerup', () => { alternarTelaCheia(cena); cena.time.delayedCall(300, () => desenhar(false)); });
  return r;
}

export function alternarTelaCheia(cena: Phaser.Scene): void {
  if (cena.scale.isFullscreen) { cena.scale.stopFullscreen(); return; }
  cena.scale.startFullscreen();
  const tela = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  tela.lock?.('landscape').catch(() => undefined);
}

export function texto(cena: Phaser.Scene, x: number, y: number, t: string, tam = 12, corT = '#e2e8f0', opc: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.GameObjects.Text {
  return cena.add.text(x, y, t, estiloTexto({ fontFamily: "'Courier New', monospace", fontStyle: 'bold', fontSize: `${tam}px`, color: corT, ...opc }));
}

// ------------------------------------------------------------------------------------------------------------
// Navegação por teclado e controle (padNav do antigo: vai para o alvo mais perto na direção, com penalidade
// para o desvio lateral; CRUZ/Enter aperta, BOLA/Esc volta; o quadro amarelo só aparece depois de usar).
export interface Alvo extends Ret { acionar(): void; ajustar?(d: -1 | 1): void; /** desenha o próprio foco (sem o quadro amarelo) */ focar?(f: boolean): void }

export function proximoAlvo(alvos: Ret[], atual: number, dx: number, dy: number): number {
  const c = alvos[atual];
  if (!c) return alvos.length ? 0 : -1;
  const fx = c.x + c.w / 2, fy = c.y + c.h / 2;
  let melhor = -1, pior = Infinity;
  alvos.forEach((t, i) => {
    if (i === atual) return;
    const vx = t.x + t.w / 2 - fx, vy = t.y + t.h / 2 - fy;
    const along = dx !== 0 ? vx * dx : vy * dy;
    if (along <= 1) return;
    const across = dx !== 0 ? Math.abs(vy) : Math.abs(vx);
    const nota = along + across * 2.5;
    if (nota < pior) { pior = nota; melhor = i; }
  });
  return melhor;
}

export class Navegacao {
  alvos: Alvo[] = [];
  foco = -1;
  private visivel = false;
  private quadro: Phaser.GameObjects.Graphics;
  private antes: Intencao[] = [];
  private repetir = 0;
  private dirAntes = '';
  private focoDesenhado = -1;
  /** quando false, a navegação não responde (ex.: um quadro por cima com a sua própria) */
  ativa = true;

  constructor(cena: Phaser.Scene, private voltar: (() => void) | null) {
    this.quadro = cena.add.graphics().setDepth(5000);
    const tecla = (ev: KeyboardEvent) => {
      if (!cena.sys.isActive() || !this.ativa || janelaAberta()) return;
      const m: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (m[ev.code]) { ev.preventDefault(); this.mover(...m[ev.code]); }
      else if (ev.code === 'Enter' || ev.code === 'NumpadEnter' || ev.code === 'Space') { if (this.visivel && this.alvos[this.foco]) { ev.preventDefault(); this.alvos[this.foco].acionar(); } }
      else if (ev.code === 'Escape' || ev.code === 'Backspace') { ev.preventDefault(); this.voltar?.(); }
    };
    window.addEventListener('keydown', tecla);
    const atualizar = () => this.passo();
    cena.events.on(Phaser.Scenes.Events.UPDATE, atualizar);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { window.removeEventListener('keydown', tecla); cena.events.off(Phaser.Scenes.Events.UPDATE, atualizar); });
    cena.input.on(Phaser.Input.Events.POINTER_DOWN, () => { this.visivel = false; this.desenhar(); });
  }

  add(a: Alvo): Alvo { this.alvos.push(a); return a; }
  limpar(): void { this.alvos = []; this.foco = -1; this.focoDesenhado = -1; this.desenhar(); }

  mover(dx: number, dy: number): void {
    if (!this.alvos.length) return;
    if (!this.visivel || this.foco < 0) { this.visivel = true; if (this.foco < 0 || this.foco >= this.alvos.length) this.foco = 0; this.desenhar(); return; }
    const al = this.alvos[this.foco];
    if (dx !== 0 && al.ajustar) { al.ajustar(dx as -1 | 1); return; }
    const i = proximoAlvo(this.alvos, this.foco, dx, dy);
    if (i >= 0) { this.foco = i; som.tocar('menu'); }
    this.desenhar();
  }

  private passo(): void {
    const pads = vigiarControles();
    if (!this.ativa || janelaAberta()) { this.antes = pads; return; }
    const it = pads[0];
    const ant = this.antes[0];
    this.antes = pads;
    if (!it) return;
    const dir = it.cima ? 'c' : it.baixo ? 'b' : it.esquerda ? 'e' : it.direita ? 'd' : '';
    if (dir && (dir !== this.dirAntes || --this.repetir <= 0)) {
      this.repetir = dir !== this.dirAntes ? 22 : 7;
      const [dx, dy] = ({ c: [0, -1], b: [0, 1], e: [-1, 0], d: [1, 0] } as Record<string, [number, number]>)[dir];
      this.mover(dx, dy);
    }
    this.dirAntes = dir;
    if (it.confirmar && !ant?.confirmar) {
      if (!this.visivel) this.mover(0, 0);
      else this.alvos[this.foco]?.acionar();
    }
    if (it.voltar && !ant?.voltar) this.voltar?.();
  }

  desenhar(): void {
    this.quadro.clear();
    const t = this.alvos[this.foco];
    // só avisa quem ganhou/perdeu o foco (o mouse por cima continua aceso)
    const novo = this.visivel ? this.foco : -1;
    if (novo !== this.focoDesenhado) { this.alvos[this.focoDesenhado]?.focar?.(false); this.alvos[novo]?.focar?.(true); this.focoDesenhado = novo; }
    if (!this.visivel || !t || t.focar) return;
    this.quadro.lineStyle(3, 0xffd23f, 1).strokeRect(t.x - 3, t.y - 3, t.w + 6, t.h + 6);
  }
}

/** monta uma tela comum: fundo, seta ←, tela cheia e navegação */
export function montarTela(cena: Phaser.Scene, voltar: (() => void) | null, isMenu = false): Navegacao {
  fundoDeMenu(cena, isMenu);
  const nav = new Navegacao(cena, voltar);
  if (voltar) { const b = botaoVoltar(cena, voltar); nav.add({ ...b.r, acionar: b.acionar }); }
  const fs = botaoTelaCheia(cena);
  nav.add({ ...fs, acionar: () => alternarTelaCheia(cena) });
  return nav;
}

/** botão já registrado na navegação */
export function botaoNav(cena: Phaser.Scene, nav: Navegacao, r: Ret, t: string, f: () => void, opc?: Parameters<typeof botao>[4]): BotaoTela {
  const b = botao(cena, r, t, f, opc);
  nav.add({ ...r, acionar: b.acionar });
  return b;
}
export { css };

// ------------------------------------------------------------------------------------------------------------
// Peças novas do menu (v0.143): LÂMINA (botão inclinado como um corte de energia, acende e desliza no foco) e
// botão REDONDO com ícone desenhado (troféu, medalha, engrenagem), no estilo do botão de voltar.

/** botão inclinado; `destaque` = o JOGAR (maior, borda dourada pulsando) */
export function botaoLamina(cena: Phaser.Scene, nav: Navegacao, r: Ret, texto: string, aoClicar: () => void, opc: { destaque?: boolean; fonte?: number } = {}): BotaoTela {
  const s = r.h * 0.42;
  const g = cena.add.graphics();
  const fonte = (opc.fonte ?? (opc.destaque ? 20 : 13)) * fatorTexto();
  const rot = cena.add.text(s + 16, r.h / 2 + 1, '', estiloTexto({ fontFamily: "'Trebuchet MS', Arial, sans-serif", fontStyle: 'bold italic', fontSize: `${fonte}px`, color: '#fff0a6' })).setOrigin(0, 0.5);
  rot.setShadow(1, 1, '#000000', 2, false, true);
  let aceso = false, apertado = false;
  const forma = (dx = 0, dy = 0) => [{ x: s + dx, y: dy }, { x: r.w + dx, y: dy }, { x: r.w - s + dx, y: r.h + dy }, { x: dx, y: r.h + dy }];
  const desenhar = () => {
    g.clear();
    const dy = apertado ? 1 : 0;
    g.fillStyle(0x000000, 0.35).fillPoints(forma(2, 4), true);
    if (aceso) g.fillGradientStyle(0xffd23f, 0xffb703, 0xe85d04, 0xc2410c, 1);
    else g.fillGradientStyle(opc.destaque ? 0x1d4f8f : 0x123765, opc.destaque ? 0x123765 : 0x0b2a55, 0x061636, 0x061636, 0.95);
    g.fillPoints(forma(0, dy), true);
    // faixa laranja na ponta esquerda
    g.fillStyle(aceso ? 0xffffff : 0xe85d04, aceso ? 0.7 : 1).fillPoints([{ x: s, y: dy }, { x: s + 6, y: dy }, { x: 6, y: r.h + dy }, { x: 0, y: r.h + dy }], true);
    g.lineStyle(opc.destaque || aceso ? 2 : 1.5, aceso ? 0xfff7d6 : opc.destaque ? 0xffd23f : 0xe85d04, 1).strokePoints(forma(0, dy), true);
    rot.setColor(aceso ? '#2a0f00' : '#fff0a6').setShadow(1, 1, aceso ? '#ffe9a8' : '#000000', 2, false, true);
    rot.setY(r.h / 2 + 1 + dy);
  };
  const ajustar = (t: string) => {
    rot.setText(t);
    let px = fonte;
    rot.setFontSize(px);
    while (px > 8 && rot.width > r.w - s * 2 - 24) { px -= 0.5; rot.setFontSize(px); }
  };
  ajustar(T(texto));
  desenhar();
  const c = cena.add.container(r.x, r.y, [g, rot]).setSize(r.w, r.h).setDepth(1);
  if (opc.destaque) {
    // brilho que pulsa atrás do JOGAR
    const brilho = cena.add.graphics().fillStyle(0xffb703, 1).fillPoints(forma(-3, -3).map((p, i) => ({ x: p.x + (i === 1 || i === 2 ? 6 : 0), y: p.y + (i >= 2 ? 6 : 0) })), true).setAlpha(0.15);
    c.addAt(brilho, 0);
    cena.tweens.add({ targets: brilho, alpha: 0.4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  const xBase = r.x;
  const acender = (a: boolean) => {
    if (a === aceso) return;
    aceso = a;
    desenhar();
    cena.tweens.add({ targets: c, x: xBase + (a ? -8 : 0), duration: 120, ease: 'Quad.easeOut' });
  };
  // container com tamanho: a área de toque é medida a partir do canto (-w/2, -h/2) — por isso a forma vai deslocada
  // (antes só a metade de cima/esquerda respondia e o toque parecia falhar na 1ª vez, v0.146)
  c.setInteractive(new Phaser.Geom.Polygon(forma(r.w / 2, r.h / 2)), Phaser.Geom.Polygon.Contains);
  if (c.input) c.input.cursor = 'pointer';
  const b: BotaoTela = {
    container: c, rotulo: rot, r, ligado: true,
    texto: (t) => ajustar(t), corTexto: (k) => rot.setColor(k),
    acionar: () => { if (!b.ligado) return; som.ligar(); som.tocar('menu'); aoClicar(); },
  };
  c.on('pointerover', (p: Phaser.Input.Pointer) => { if (!p.wasTouch) acender(true); });
  c.on('pointerout', () => { apertado = false; acender(false); desenhar(); });
  c.on('pointerdown', () => { apertado = true; acender(true); desenhar(); });
  c.on('pointerup', () => { const era = apertado; apertado = false; desenhar(); if (era) b.acionar(); });
  nav.add({ ...r, acionar: b.acionar, focar: (f) => acender(f) });
  return b;
}

export type Icone = 'trofeu' | 'medalha' | 'engrenagem';

function desenharIcone(g: Phaser.GameObjects.Graphics, ic: Icone, cx: number, cy: number, k: number, c: number, fundo: number): void {
  g.fillStyle(c, 1);
  if (ic === 'trofeu') {
    g.fillPoints([{ x: cx - 7 * k, y: cy - 7 * k }, { x: cx + 7 * k, y: cy - 7 * k }, { x: cx + 5 * k, y: cy + 1 * k }, { x: cx - 5 * k, y: cy + 1 * k }], true);
    g.fillCircle(cx, cy + 0.5 * k, 5 * k);
    g.lineStyle(1.8 * k, c, 1).strokeCircle(cx - 7 * k, cy - 3 * k, 3 * k).strokeCircle(cx + 7 * k, cy - 3 * k, 3 * k);
    g.fillRect(cx - 1.3 * k, cy + 4 * k, 2.6 * k, 3.5 * k).fillRoundedRect(cx - 5 * k, cy + 7 * k, 10 * k, 2.6 * k, 1);
  } else if (ic === 'medalha') {
    g.fillStyle(0xe85d04, 1).fillPoints([{ x: cx - 6 * k, y: cy - 9 * k }, { x: cx - 2 * k, y: cy - 9 * k }, { x: cx + 2 * k, y: cy - 1 * k }, { x: cx - 2 * k, y: cy }], true);
    g.fillStyle(0x38bdf8, 1).fillPoints([{ x: cx + 6 * k, y: cy - 9 * k }, { x: cx + 2 * k, y: cy - 9 * k }, { x: cx - 2 * k, y: cy - 1 * k }, { x: cx + 2 * k, y: cy }], true);
    g.fillStyle(c, 1).fillCircle(cx, cy + 3.5 * k, 5.5 * k).fillStyle(fundo, 1).fillCircle(cx, cy + 3.5 * k, 2.6 * k);
  } else {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2, raio = (i % 4 < 2 ? 9 : 6.6) * k;
      pts.push({ x: cx + Math.cos(a) * raio, y: cy + Math.sin(a) * raio });
    }
    g.fillPoints(pts, true).fillStyle(fundo, 1).fillCircle(cx, cy, 3.2 * k);
  }
}

/** botão redondo com ícone e um rótulo pequeno embaixo */
export function botaoIcone(cena: Phaser.Scene, nav: Navegacao, cx: number, cy: number, raio: number, icone: Icone, rotulo: string, aoClicar: () => void): BotaoTela {
  const g = cena.add.graphics();
  const rot = cena.add.text(0, raio + 8, T(rotulo), estiloTexto({ fontFamily: "'Trebuchet MS', Arial, sans-serif", fontStyle: 'bold', fontSize: '9px', color: '#cfe8ff' })).setOrigin(0.5);
  rot.setStroke('#020617', 3);
  let aceso = false, apertado = false;
  const desenhar = () => {
    const dy = apertado ? 1 : 0, fundo = aceso ? 0xe85d04 : 0x0f2c56;
    g.clear().fillStyle(0x000000, 0.35).fillCircle(0.8, 2, raio)
      .fillStyle(fundo, 1).fillCircle(0, dy, raio)
      .lineStyle(aceso ? 2.2 : 1.8, aceso ? 0xfff0a6 : 0xe85d04, 1).strokeCircle(0, dy, raio);
    desenharIcone(g, icone, 0, dy, raio / 17, aceso ? 0xffffff : 0xfff0a6, fundo);
  };
  desenhar();
  const c = cena.add.container(cx, cy, [g, rot]).setDepth(1);
  c.setInteractive(new Phaser.Geom.Circle(0, 0, raio + 4), Phaser.Geom.Circle.Contains);
  if (c.input) c.input.cursor = 'pointer';
  const acender = (a: boolean) => { aceso = a; desenhar(); cena.tweens.add({ targets: c, scale: a ? 1.1 : 1, duration: 110 }); };
  const r = ret(cx - raio, cy - raio, raio * 2, raio * 2);
  const b: BotaoTela = {
    container: c, rotulo: rot, r, ligado: true,
    texto: (t) => rot.setText(t), corTexto: (k) => rot.setColor(k),
    acionar: () => { som.ligar(); som.tocar('menu'); aoClicar(); },
  };
  c.on('pointerover', (p: Phaser.Input.Pointer) => { if (!p.wasTouch) acender(true); });
  c.on('pointerout', () => { apertado = false; acender(false); });
  c.on('pointerdown', () => { apertado = true; desenhar(); });
  c.on('pointerup', () => { const era = apertado; apertado = false; desenhar(); if (era) b.acionar(); });
  nav.add({ ...r, acionar: b.acionar, focar: (f) => { if (f !== aceso) acender(f); } });
  return b;
}
