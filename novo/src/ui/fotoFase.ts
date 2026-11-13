// "Foto" de cada arena (prepareNextStageCardThumb do antigo): o cenário da fase desenhado uma vez pelo código antigo
// (legado) num canvas, reduzido para o cartão; mais a versão cinza e escura das fases bloqueadas. Uma fase por
// quadro, para não travar a tela.
import Phaser from 'phaser';
import { TELA_A, TELA_L } from '../logica/constantes';
import { carregarCenarios } from './arena';

const FOTO_L = 236, FOTO_A = 184; // 2x o cartão (118x92)
export const chaveFoto = (id: string, cinza = false) => `foto-fase-${id}${cinza ? '-cinza' : ''}`;

let base: HTMLCanvasElement | null = null;
let legado: { desenhar(id: string, scroll: number, t: number): void } | null = null;

/** Faz as fotos que faltam; chama `pronta(id)` a cada uma. */
export function fazerFotos(cena: Phaser.Scene, ids: string[], pronta: (id: string) => void): void {
  const faltam = ids.filter((id) => !cena.textures.exists(chaveFoto(id)));
  for (const id of ids) if (!faltam.includes(id)) pronta(id);
  if (!faltam.length) return;
  void carregarCenarios().then((m) => {
    if (!base) {
      base = document.createElement('canvas');
      base.width = TELA_L; base.height = TELA_A;
      const l = m.criarCenariosLegado(base);
      l.escala(1);
      legado = l;
    }
    const proxima = () => {
      const id = faltam.shift();
      if (!id || !cena.sys.isActive()) return;
      if (!cena.textures.exists(chaveFoto(id))) {
        try { legado!.desenhar(id, 0, 0); } catch { /* fase sem desenho: fica a cor */ }
        for (const cinza of [false, true]) {
          const t = cena.textures.createCanvas(chaveFoto(id, cinza), FOTO_L, FOTO_A)!;
          const g = t.getContext();
          // recorte do meio da cena, na proporção do cartão
          const sw = TELA_A * (FOTO_L / FOTO_A), sx = (TELA_L - sw) / 2;
          if (cinza) g.filter = 'grayscale(1) brightness(0.45)';
          g.drawImage(base!, sx, 0, sw, TELA_A, 0, 0, FOTO_L, FOTO_A);
          t.refresh();
        }
      }
      pronta(id);
      cena.time.delayedCall(16, proxima);
    };
    proxima();
  });
}
