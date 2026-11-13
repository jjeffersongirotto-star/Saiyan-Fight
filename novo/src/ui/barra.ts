// Barra de carregamento usada pela cena de Preload e pelas cenas que carregam as próprias imagens.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from './resolucao';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';

export function mostrarBarraDeCarregamento(cena: Phaser.Scene): void {
  ajustarCamera(cena);
  const l = 360, a = 16, x = (TELA_L - l) / 2, y = TELA_A / 2;
  const fundo = cena.add.graphics().fillStyle(0x10172a, 1).fillRoundedRect(x - 4, y - 4, l + 8, a + 8, 8).setDepth(1000);
  const barra = cena.add.graphics().setDepth(1001);
  const texto = cena.add
    .text(TELA_L / 2, y - 28, `${T('CARREGANDO')} 0%`, estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffd23a' }))
    .setOrigin(0.5)
    .setDepth(1001);
  cena.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => {
    barra.clear().fillStyle(0xff8a00, 1).fillRoundedRect(x, y, Math.max(a, l * p), a, 6);
    texto.setText(`${T('CARREGANDO')} ${Math.round(p * 100)}%`);
  });
  cena.load.once(Phaser.Loader.Events.COMPLETE, () => {
    fundo.destroy();
    barra.destroy();
    texto.destroy();
  });
}
