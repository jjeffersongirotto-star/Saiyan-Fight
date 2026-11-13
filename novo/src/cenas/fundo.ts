// Fundo simples desenhado (céu, montanhas e chão) uma vez só numa textura de canvas. As arenas 3D do jogo antigo
// entram em fases seguintes (ver PLANO.md).
import Phaser from 'phaser';
import { CHAO_Y, TELA_A, TELA_L } from '../logica/constantes';
import { ESCALA_RENDER } from '../ui/resolucao';

export function desenharFundo(cena: Phaser.Scene): void {
  const chave = 'fundo-planicie';
  if (!cena.textures.exists(chave)) {
    const R = ESCALA_RENDER;
    const tex = cena.textures.createCanvas(chave, TELA_L * R, TELA_A * R)!;
    const c = tex.getContext();
    c.scale(R, R);
    const horizonte = CHAO_Y - 20;
    const ceu = c.createLinearGradient(0, 0, 0, horizonte);
    ceu.addColorStop(0, '#1f5fc8');
    ceu.addColorStop(1, '#bfe3ff');
    c.fillStyle = ceu;
    c.fillRect(0, 0, TELA_L, horizonte);
    // montanhas em duas camadas
    for (const [cor, base, alt, passo] of [['#8ea6cf', 0, 70, 120], ['#6f88b5', 37, 45, 95]] as const) {
      c.fillStyle = cor;
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
    chao.addColorStop(0, '#6fb543');
    chao.addColorStop(1, '#3d7a25');
    c.fillStyle = chao;
    c.fillRect(0, horizonte, TELA_L, TELA_A - horizonte);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(0, CHAO_Y, TELA_L, 3);
    tex.refresh();
  }
  cena.add.image(0, 0, chave).setOrigin(0, 0).setDisplaySize(TELA_L, TELA_A).setDepth(-10);
}
