// Peças das telas de menu com o visual do jogo antigo (menu.js): fundo com céu/diagonais/montanhas/sol
// (traceMenuBackdrop), painel Dragon Ball (drawDragonBallPanel), botão azul com borda laranja que acende no
// mouse e afunda no toque (drawBtn), chave liga/desliga (drawModeToggle), seta ← de voltar e botão de tela cheia.
// Tudo com as MESMAS posições do antigo (tela lógica 800x350). A Navegacao deixa usar as setas/Enter/Esc e o
// controle (direcional + CRUZ confirma + BOLA volta) em qualquer tela, com o quadro amarelo de foco.
import Phaser from 'phaser';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { ESCALA_RENDER, estiloTexto } from './resolucao';
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
  const fonte = opc.fonte ?? 12;
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
  c.on('pointerup', () => { const era = apertado; apertado = false; desenhar(); if (era) b.acionar(); });
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
export interface Alvo extends Ret { acionar(): void; ajustar?(d: -1 | 1): void }

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
  limpar(): void { this.alvos = []; this.foco = -1; this.desenhar(); }

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
    if (!this.visivel || !t) return;
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
