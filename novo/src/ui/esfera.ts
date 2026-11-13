// Desenhos pequenos do jogo antigo feitos num canvas que vira textura: a esfera do dragão de 4 estrelas
// (drawEsferaDragao), a foto do perfil (getPerfilSilhueta), o cadeado (drawPadlock) e a medalha (drawMedalIcon).
import Phaser from 'phaser';
import { ESCALA_RENDER } from './resolucao';

function textura(cena: Phaser.Scene, chave: string, w: number, h: number, desenhar: (g: CanvasRenderingContext2D) => void): string {
  if (cena.textures.exists(chave)) return chave;
  const k = ESCALA_RENDER;
  const t = cena.textures.createCanvas(chave, Math.ceil(w * k), Math.ceil(h * k))!;
  const g = t.getContext();
  g.scale(k, k);
  desenhar(g);
  t.refresh();
  return chave;
}

export function esferaDoDragao(cena: Phaser.Scene, estrelas = 4): string {
  return textura(cena, `esfera-${estrelas}`, 48, 48, (ctx) => {
    const cx = 24, cy = 24, r = 20;
    ctx.shadowColor = 'rgba(255, 160, 40, 0.55)'; ctx.shadowBlur = 8;
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#fff3c4'); g.addColorStop(0.35, '#ffb52e'); g.addColorStop(1, '#d86a06');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(140, 60, 0, 0.8)'; ctx.lineWidth = 1.2; ctx.stroke();
    const pos = estrelas === 4 ? [[0, -0.36], [-0.36, 0.02], [0.36, 0.02], [0, 0.4]] : [[0, 0]];
    ctx.fillStyle = '#e11d2e';
    for (const [dx, dy] of pos) {
      const sx = cx + dx * r, sy = cy + dy * r, ro = r * 0.2, ri = ro * 0.42;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? ri : ro; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.38, cy - r * 0.45, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
  });
}

export function fotoDoPerfil(cena: Phaser.Scene): string {
  return textura(cena, 'perfil-silhueta', 60, 60, (g) => {
    g.save();
    g.beginPath(); g.arc(30, 30, 29, 0, Math.PI * 2); g.clip();
    const fundo = g.createRadialGradient(30, 34, 4, 30, 30, 32);
    fundo.addColorStop(0, '#1e3a8a'); fundo.addColorStop(1, '#0b1226');
    g.fillStyle = fundo; g.fillRect(0, 0, 60, 60);
    g.fillStyle = 'rgba(255, 210, 63, 0.75)';
    g.beginPath(); g.moveTo(10, 60);
    for (const p of [[13, 34], [18, 42], [20, 20], [25, 32], [30, 8], [35, 32], [40, 20], [42, 42], [47, 34], [50, 60]]) g.lineTo(p[0], p[1]);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255, 248, 200, 0.6)';
    g.beginPath(); g.moveTo(16, 60);
    for (const p of [[20, 40], [25, 46], [30, 22], [35, 46], [40, 40], [44, 60]]) g.lineTo(p[0], p[1]);
    g.closePath(); g.fill();
    g.fillStyle = '#05070f';
    g.beginPath();
    g.moveTo(22, 21); g.lineTo(19, 12); g.lineTo(25, 16); g.lineTo(26, 7); g.lineTo(30, 14); g.lineTo(34, 7); g.lineTo(35, 16); g.lineTo(41, 12); g.lineTo(38, 21);
    g.quadraticCurveTo(38, 28, 33, 30); g.lineTo(27, 30); g.quadraticCurveTo(22, 28, 22, 21); g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(27, 30); g.lineTo(33, 30); g.lineTo(43, 33); g.lineTo(47, 44); g.lineTo(44, 46); g.lineTo(40, 37); g.lineTo(39, 45);
    g.lineTo(42, 60); g.lineTo(34, 60); g.lineTo(30, 50); g.lineTo(26, 60); g.lineTo(18, 60); g.lineTo(21, 45); g.lineTo(20, 37);
    g.lineTo(16, 46); g.lineTo(13, 44); g.lineTo(17, 33); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 2;
    g.beginPath(); g.arc(30, 30, 28.5, 0, Math.PI * 2); g.stroke();
  });
}

export const CORES_MEDALHA: Record<string, [string, string, string]> = {
  bronze: ['#f0b27a', '#cd7f32', '#7a4511'],
  silver: ['#ffffff', '#c0c7d1', '#6b7280'],
  gold: ['#fff4b0', '#ffd23f', '#a16207'],
  diamond: ['#e0ffff', '#67e8f9', '#0e7490'],
};

/** medalha (drawMedalIcon): fita + disco com brilho; `apagada` = ainda não conquistada */
export function medalha(cena: Phaser.Scene, tipo: string, apagada = false): string {
  return textura(cena, `medalha-${tipo}${apagada ? '-off' : ''}`, 28, 32, (ctx) => {
    const [c0, c1, c2] = apagada ? ['#64748b', '#475569', '#1e293b'] : CORES_MEDALHA[tipo] ?? CORES_MEDALHA.bronze;
    ctx.fillStyle = apagada ? '#334155' : '#dc2626';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(13, 12); ctx.lineTo(9, 13); ctx.lineTo(4, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = apagada ? '#475569' : '#2563eb';
    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(15, 12); ctx.lineTo(19, 13); ctx.lineTo(24, 1); ctx.closePath(); ctx.fill();
    const g = ctx.createRadialGradient(11, 17, 1, 14, 20, 11);
    g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(14, 20, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c2; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = apagada ? '#94a3b8' : '#fff';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 2.2 : 5; ctx.lineTo(14 + Math.cos(a) * rr, 20 + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  });
}

/** cadeado (drawPadlock) */
export function cadeado(cena: Phaser.Scene): string {
  return textura(cena, 'cadeado', 20, 24, (ctx) => {
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(10, 9, 5.5, Math.PI, 0); ctx.stroke();
    const g = ctx.createLinearGradient(0, 9, 0, 23);
    g.addColorStop(0, '#fcd34d'); g.addColorStop(1, '#b45309');
    ctx.fillStyle = g; ctx.fillRect(2.5, 9, 15, 13);
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1; ctx.strokeRect(2.5, 9, 15, 13);
    ctx.fillStyle = '#451a03'; ctx.beginPath(); ctx.arc(10, 14.5, 2, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(9.2, 15, 1.6, 4);
  });
}
