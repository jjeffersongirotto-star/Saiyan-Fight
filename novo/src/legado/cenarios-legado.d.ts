// Tipos do desenho das arenas do jogo antigo (cenarios-legado.js é gerado; ver scripts/gerar-cenarios-legado.mjs).
export interface CenariosLegado {
  desenhar(id: string, scroll: number, t: number): void;
  escala(k: number): void;
}
export function criarCenariosLegado(canvas: HTMLCanvasElement | OffscreenCanvas): CenariosLegado;
/** arenas do EDITOR DE ARENAS do antigo (como estão em `saiyan_arenas`); o desenho usa o arenas.js do antigo */
export function definirArenasCriadas(lista: unknown[]): void;
