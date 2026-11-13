// Fundo simples desenhado (céu, montanhas e chão) uma vez só numa textura de canvas. As arenas 3D do jogo antigo
// entram em fases seguintes (ver PLANO.md).
import Phaser from 'phaser';
import { CHAO_Y, TELA_A, TELA_L } from '../logica/constantes';
import { ESCALA_RENDER } from '../ui/resolucao';

export interface CoresDoFundo { ceu: [string, string]; chao: [string, string] }
const PLANICIE: CoresDoFundo = { ceu: ['#1f5fc8', '#bfe3ff'], chao: ['#6fb543', '#3d7a25'] };

/** Céu e chão com as cores da fase (o modo história pinta cada fase com as cores dela). */
export function desenharFundo(cena: Phaser.Scene, cores: CoresDoFundo = PLANICIE): string {
  const chave = cores === PLANICIE ? 'fundo-planicie' : `fundo-${cores.ceu.join('')}${cores.chao.join('')}`;
  if (!cena.textures.exists(chave)) {
    // só um fundo de fase fica na memória (cada um tem ~4 MB na escala do celular); a planície dos menus fica sempre
    if (chave !== 'fundo-planicie') for (const k of cena.textures.getTextureKeys()) if (k.startsWith('fundo-#')) cena.textures.remove(k);
    const R = ESCALA_RENDER;
    const tex = cena.textures.createCanvas(chave, TELA_L * R, TELA_A * R)!;
    const c = tex.getContext();
    c.scale(R, R);
    const horizonte = CHAO_Y - 20;
    const ceu = c.createLinearGradient(0, 0, 0, horizonte);
    ceu.addColorStop(0, cores.ceu[0]);
    ceu.addColorStop(1, cores.ceu[1]);
    c.fillStyle = ceu;
    c.fillRect(0, 0, TELA_L, horizonte);
    // montanhas em duas camadas
    // montanhas: a cor do fim do céu, escurecida (fica do clima da fase)
    for (const [escuro, base, alt, passo] of [[0.25, 0, 70, 120], [0.4, 37, 45, 95]] as const) {
      c.fillStyle = cores === PLANICIE ? (escuro < 0.3 ? '#8ea6cf' : '#6f88b5') : escurecer(cores.ceu[1], escuro);
      c.beginPath();
      c.moveTo(0, horizonte);
      for (let x = -40, i = 0; x < TELA_L + 120; x += passo, i++) {
        c.lineTo(x + passo / 2, horizonte - alt * (0.55 + ((i * 7 + base) % 10) / 20));
        c.lineTo(x + passo, horizonte);
      }
      c.closePath();
      c.fill();
    }
    const chao = c.createLinearGradient(0, horizonte, 0, TELA_A);
    chao.addColorStop(0, cores.chao[0]);
    chao.addColorStop(1, cores.chao[1]);
    c.fillStyle = chao;
    c.fillRect(0, horizonte, TELA_L, TELA_A - horizonte);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(0, CHAO_Y, TELA_L, 3);
    tex.refresh();
  }
  cena.add.image(0, 0, chave).setOrigin(0, 0).setDisplaySize(TELA_L, TELA_A).setDepth(-10);
  return chave;
}

function escurecer(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * (1 - k));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}
