// Tipos do desenho das arenas do jogo antigo (cenarios-legado.js é gerado; ver scripts/gerar-cenarios-legado.mjs).
/** uma peça da tabela ARENA_PECAS do arenas.js */
export interface DefPecaArena {
  aba: string; nome: string; cor: string; planta?: { ret?: [number, number]; circ?: number };
  ceu?: boolean; chao?: boolean; forma?: number; pincel?: boolean; texto?: string; anim?: boolean; baixo?: boolean;
}
export type ArenaBruta = Record<string, unknown> & { id: string; nome: string; pecas: Record<string, unknown>[] };
/** EDITOR DE ARENAS: as tabelas e funções do arenas.js do antigo */
export interface EditorArenasLegado {
  PECAS: Record<string, DefPecaArena>;
  PLANICIES: Record<string, { nome: string; ceu: { topo: string; horizonte: string }; chao: { tipo: string; cor: string } }>;
  CHAOS: Record<string, { nome: string; cor: string }>;
  CAMERAS: Record<string, unknown>;
  HORAS: [string, string][]; CLIMAS: [string, string][]; FORMATOS: [string, string][]; PINCEL: Record<string, [string, string]>; ABAS: [string, string][];
  MAX: number; PECAS_MAX: number; RAIO: number; PINCEL_PONTOS: number; ANIMADAS_MAX: number; GRADE: number; FORMATO: string;
  normalizar(a: unknown): ArenaBruta; padrao(): ArenaBruta; normalizarPeca(q: unknown): Record<string, unknown> | null;
  pegada(p: unknown): unknown; colide(pecas: unknown[], p: unknown, ignorar: number | number[]): boolean; raio(p: unknown): number; alturaPeca(p: unknown): number;
  paraArquivo(a: unknown): Record<string, unknown>; validarArquivo(d: unknown): { erro: string } | { arena: ArenaBruta };
  previa(a: unknown, ang: number, opts?: Record<string, unknown>): void;
  cameraPerto(p: unknown): unknown;
  plantaChao(g: CanvasRenderingContext2D, a: unknown, s: number, lado: number, c?: { x: number; z: number }): void;
  plantaPeca(g: CanvasRenderingContext2D, p: unknown, s: number, cor?: string): void;
}
export interface CenariosLegado {
  editor: EditorArenasLegado;
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
/** músicas que as arenas podem usar (ids de TEMAS) */
export function definirTemas(ids: string[] | null): void;
