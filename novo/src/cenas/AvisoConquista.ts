// CONQUISTA DESBLOQUEADA (triggerAchievementPopup + drawAchievementBanner do antigo): pílula que desce do alto,
// fica ~2 s e sobe, com a medalha dourada dando um "pulo". Fica numa cena própria por cima de todas, então
// aparece no menu, no mapa ou na luta. Uma conquista nova substitui a que estava na tela (como no antigo).
// Na pausa (a cena Luta está pausada) o tempo não corre.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto, ESCALA_RENDER } from '../ui/resolucao';
import { TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { conquistas } from '../logica/conquistas';

const MAX = 180, H = 44, R = 16;

/** posição da pílula (yOffset do antigo) no quadro `t` (quadros a 60 fps) */
export function deslocamentoDoAviso(t: number): number {
  const fim = MAX - 30;
  return t < 15 ? -60 * Math.pow(1 - t / 15, 3) : t > fim ? -2 * (t - fim) : 0;
}

export class AvisoConquista extends Phaser.Scene {
  private t = MAX;
  private caixa!: Phaser.GameObjects.Container;
  private icone!: Phaser.GameObjects.Image;
  private anel!: Phaser.GameObjects.Graphics;
  private fundo!: Phaser.GameObjects.Graphics;
  private rotulo!: Phaser.GameObjects.Text;
  private titulo!: Phaser.GameObjects.Text;
  private w = 200;
  constructor() { super({ key: 'AvisoConquista', active: false }); }
  create(): void {
    ajustarCamera(this);
    this.fundo = this.add.graphics();
    this.anel = this.add.graphics();
    this.icone = this.add.image(0, 0, this.medalhaDourada());
    this.rotulo = this.add.text(0, 17, '', estiloTexto({ fontFamily: "'Segoe UI', sans-serif", fontStyle: 'bold', fontSize: '9px', color: '#fbbf24' })).setOrigin(0, 0.75);
    this.titulo = this.add.text(0, 34, '', estiloTexto({ fontFamily: "'Segoe UI', sans-serif", fontStyle: 'bold', fontSize: '13px', color: '#ffffff' })).setOrigin(0, 0.75);
    this.caixa = this.add.container(0, 0, [this.fundo, this.anel, this.icone, this.rotulo, this.titulo]).setVisible(false);
    const tirar = conquistas().aoDestravar((c) => this.mostrar(T(c.nome)));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, tirar);
    this.scene.bringToTop();
  }
  mostrar(titulo: string): void {
    this.t = 0;
    this.rotulo.setText(T('CONQUISTA DESBLOQUEADA'));
    this.titulo.setText(titulo).setScale(1);
    this.w = Math.min(TELA_L - 40, Math.max(this.titulo.width, this.rotulo.width) + H + 34);
    const tx = H + 8;
    this.rotulo.setX(tx);
    this.titulo.setX(tx);
    if (this.titulo.width > this.w - H - 22) this.titulo.setScale((this.w - H - 22) / this.titulo.width, 1);
    this.fundo.clear().fillStyle(0x000000, 0.3).fillRoundedRect(2, 4, this.w, H, H / 2)
      .fillGradientStyle(0x1e1b4b, 0x1e1b4b, 0x0c0a28, 0x0c0a28, 0.96).fillRoundedRect(0, 0, this.w, H, H / 2)
      .lineStyle(1.5, 0xfbbf24, 0.9).strokeRoundedRect(0, 0, this.w, H, H / 2);
    this.icone.setPosition(H / 2 + 2, H / 2);
    this.caixa.setVisible(true);
    this.scene.bringToTop();
  }
  update(_t: number, dt: number): void {
    if (this.t >= MAX) { this.caixa?.setVisible(false); return; }
    if (!this.scene.isPaused('Luta')) this.t += (dt / 1000) * 60;
    const t = this.t;
    this.caixa.setPosition(TELA_L / 2 - this.w / 2, 8 + deslocamentoDoAviso(t));
    const p = Math.min(1, Math.max(0, (t - 6) / 16));
    const esc = p <= 0 ? 0 : 1 + 0.35 * Math.sin(p * Math.PI) * (1 - p * 0.4);
    this.icone.setScale(esc / ESCALA_RENDER).setVisible(esc > 0);
    this.anel.clear();
    if (t > 8 && t < 50) {
      const q = (t - 8) / 42;
      this.anel.lineStyle(3 * (1 - q) + 0.5, 0xfde68a, 1 - q).strokeCircle(H / 2 + 2, H / 2, R + q * 18);
    }
  }
  private medalhaDourada(): string {
    const chave = 'aviso-medalha';
    if (this.textures.exists(chave)) return chave;
    const k = ESCALA_RENDER, s = (R + 8) * 2;
    const tex = this.textures.createCanvas(chave, s * k, s * k)!;
    const ctx = tex.getContext();
    ctx.scale(k, k);
    ctx.translate(s / 2, s / 2);
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8;
    const ouro = ctx.createRadialGradient(-5, -6, 2, 0, 0, R);
    ouro.addColorStop(0, '#fff7c2'); ouro.addColorStop(0.55, '#fbbf24'); ouro.addColorStop(1, '#b45309');
    ctx.fillStyle = ouro;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? R * 0.27 : R * 0.62; ctx.lineTo(Math.cos(a) * rr, 0.5 + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1; ctx.stroke();
    tex.refresh();
    return chave;
  }
}
