// Tipos do desenho das arenas do jogo antigo (cenarios-legado.js é gerado; ver scripts/gerar-cenarios-legado.mjs).
export interface CenariosLegado {
  desenhar(id: string, scroll: number, t: number): void;
  escala(k: number): void;
  /** MAPA DE FASES do antigo (mapa.js + o cadeado e a foto redonda do menu.js) */
  mapa: {
    TOTAL_FASES: number;
    NO_R: number;
    posicao(i: number): { x: number; y: number };
    limitar(r: number, total: number): number;
    rolagemPara(i: number, total: number): number;
    traducao(f: (t: string) => string): void;
    desenhar(rolagem: number, total: number, acesaAte: number): void;
    sombra(x: number, y: number, r: number): void;
    placa(x: number, y: number): void;
    cadeado(x: number, y: number, s: number, aberto?: number): void;
    foto(x: number, y: number, r: number, img: CanvasImageSource): void;
    ctx(): CanvasRenderingContext2D;
  };
}
export function criarCenariosLegado(canvas: HTMLCanvasElement | OffscreenCanvas): CenariosLegado;
/** arenas do EDITOR DE ARENAS do antigo (como estão em `saiyan_arenas`); o desenho usa o arenas.js do antigo */
export function definirArenasCriadas(lista: unknown[]): void;
