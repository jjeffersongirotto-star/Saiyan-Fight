// As 11 arenas do jogo antigo, desenhadas pelo MESMO código de antes (src/legado/cenarios-legado.js, gerado) num
// canvas que vira textura do Phaser. O código antigo já guarda as partes paradas em imagens (panoramas de 360°,
// construções que a câmera rodeia, refeitas só a cada 1/4 de grau); aqui só se copia o canvas para a placa de
// vídeo a cada quadro. Para segurar 60 fps no celular: mede quanto custa e, se passar do limite, baixa a
// resolução do cenário para 1x e depois atualiza o cenário a cada 2 quadros (a câmera anda devagar).
import Phaser from 'phaser';
import { TELA_A, TELA_L } from '../logica/constantes';
import { ESCALA_RENDER } from './resolucao';
import type { CenariosLegado } from '../legado/cenarios-legado';
import { TEMAS } from '../dados/temas';

type Modulo = typeof import('../legado/cenarios-legado');
let promessa: Promise<Modulo> | null = null;
let pronto: Modulo | null = null;

/** Começa a baixar o código das arenas (um pedaço separado do jogo, ~40 KB comprimido). */
let arenasCriadas: unknown[] = [];
/** arenas do EDITOR DE ARENAS do antigo para o desenho do arenas.js (agora ou quando o módulo chegar) */
export function aplicarArenasCriadas(lista: unknown[]): void {
  arenasCriadas = lista;
  pronto?.definirArenasCriadas(lista);
}
export function carregarCenarios(): Promise<Modulo> {
  promessa ??= import('../legado/cenarios-legado.js').then((m) => { m.definirTemas(Object.keys(TEMAS)); m.definirArenasCriadas(arenasCriadas); return (pronto = m); });
  return promessa;
}
export const cenariosProntos = () => pronto;

/** avanço da câmera do antigo: world.stageScrollX += 1,5 por quadro de luta */
export const SCROLL_POR_QUADRO = 1.5;
/** custo médio (ms) do cenário por quadro acima do qual baixa a qualidade */
export const LIMITE_MS = 5;

export class ArenaAntiga {
  private tex: Phaser.Textures.CanvasTexture;
  private img: Phaser.GameObjects.Image;
  private legado: CenariosLegado;
  private k: number;
  /** atualiza 1 a cada `pular` quadros (1 = todo quadro) */
  private pular = 1;
  private contador = 0;
  private amostras = 0;
  /** média móvel do custo (ms) de desenhar + mandar para a placa */
  custoMedio = 0;
  /** parte do custo que é mandar o canvas para a placa de vídeo */
  custoEnvio = 0;

  constructor(private cena: Phaser.Scene, readonly id: string, modulo: Modulo, private readonly chave = 'arena-antiga') {
    this.k = ESCALA_RENDER;
    if (cena.textures.exists(chave)) cena.textures.remove(chave);
    this.tex = cena.textures.createCanvas(chave, Math.round(TELA_L * this.k), Math.round(TELA_A * this.k))!;
    this.legado = modulo.criarCenariosLegado(this.tex.getSourceImage() as HTMLCanvasElement);
    this.legado.escala(this.k);
    this.tex.setFilter(Phaser.Textures.FilterMode.LINEAR); // o cenário é desenho suave, não pixel art
    this.img = cena.add.image(0, 0, chave).setOrigin(0, 0).setDisplaySize(TELA_L, TELA_A).setDepth(-10);
  }

  get qualidade() {
    return { escala: this.k, pular: this.pular };
  }

  /** `quadro` = relógio da luta em quadros de 1/60 s */
  desenhar(quadro: number): void {
    if (this.contador++ % this.pular !== 0) return;
    const t0 = performance.now();
    this.legado.desenhar(this.id, quadro * SCROLL_POR_QUADRO, quadro / 60);
    const t1 = performance.now();
    this.tex.refresh();
    const ms = performance.now() - t0;
    this.custoEnvio = this.custoEnvio * 0.95 + (ms - (t1 - t0)) * 0.05;
    this.custoMedio = this.amostras++ === 0 ? ms : this.custoMedio * 0.95 + ms * 0.05;
    // custo por quadro de jogo (atualizando a cada `pular` quadros, divide)
    if (this.amostras > 45 && this.custoMedio / this.pular > LIMITE_MS) this.baixarQualidade();
  }

  private baixarQualidade(): void {
    this.amostras = 0;
    if (this.k > 1) {
      this.k = 1;
      this.tex.setSize(TELA_L, TELA_A);
      this.legado.escala(1);
      this.img.setDisplaySize(TELA_L, TELA_A);
    } else if (this.pular < 3) this.pular++; // 30 e depois 20 atualizações por segundo (a câmera anda devagar)
  }

  destruir(): void {
    this.img.destroy();
    if (this.cena.textures.exists(this.chave)) this.cena.textures.remove(this.chave);
  }
}
