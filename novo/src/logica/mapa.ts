// Geometria do MAPA DE FASES do antigo (game-logic-core.js, "MAPA DE PROGRESSO (fases em linha)"): um caminho
// longo rolando na horizontal; a fase i fica em posicaoNoMapa(i). Depois das fases que existem vêm as futuras
// (escuras, com cadeado) até TOTAL_NO_MAPA. O desenho (céu, horizonte, objetos, estrada) é o mapa.js do antigo.
export const TOTAL_NO_MAPA = 60;
export const PASSO_X = 130;
export const MARGEM_X = 90;
const TELA_W = 800;
export const RAIO_NO = 26;

export function posicaoNoMapa(i: number): { x: number; y: number } {
  const y = 206 + Math.sin(i * 1.15) * 40 + Math.sin(i * 0.43 + 1) * 16;
  return { x: MARGEM_X + i * PASSO_X, y: Math.round(y) };
}
/** fases no mapa: as que existem + 1 futura no mínimo (getMapaTotalFases) */
export const totalNoMapa = (fases: number): number => Math.max(TOTAL_NO_MAPA, fases + 1);
export const larguraDoMapa = (total: number): number => MARGEM_X * 2 + (Math.max(1, total || TOTAL_NO_MAPA) - 1) * PASSO_X;
export const limitarRolagem = (r: number, total: number): number => Math.max(0, Math.min(larguraDoMapa(total) - TELA_W, r || 0));
/** rolagem que deixa a fase i no meio da tela */
export const rolagemParaFase = (i: number, total: number): number => limitarRolagem(posicaoNoMapa(i).x - TELA_W / 2, total);
/** quanto as setas ‹ › rolam */
export const PASSO_DAS_SETAS = 520;
/** o nó aparece (com folga para o nome) */
export const naTela = (x: number): boolean => x > -RAIO_NO - 70 && x < TELA_W + RAIO_NO + 70;
/** o nó inteiro cabe na tela (entra na navegação do controle) */
export const inteiroNaTela = (x: number): boolean => x - RAIO_NO >= 0 && x + RAIO_NO <= TELA_W;
/** animação do cadeado da fase recém-liberada (t em s): abre de 0,3 a 0,8 s e cai sumindo até 1,5 s */
export function cadeadoAbrindo(t: number): { aberto: number; queda: number; alfa: number } | null {
  if (t > 1.5) return null;
  const aberto = Math.max(0, Math.min(1, (t - 0.3) / 0.5));
  const queda = Math.max(0, t - 0.8) / 0.7;
  return { aberto, queda, alfa: Math.max(0, 1 - queda) };
}
/** o recorde de onda da fase (o maior entre os modos), como o "RECORDE: ONDA n" do antigo */
export function recordeDeOnda(r: Partial<Record<string, { onda: number; pontos?: number }>> | undefined): number {
  return Math.max(0, ...(['normal', 'hard', 'unlimited'] as const).map((m) => r?.[m]?.onda ?? 0));
}
