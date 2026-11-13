// Efeitos animados do jogo antigo (efeitos/<nome>.png: n quadros de w x h lado a lado, ms por quadro) — a
// tabela EFEITOS do menu.js. scripts/gerar-efeitos.py lê ESTA tabela (uma linha por efeito, "nome: { n:, w:, h:")
// e monta public/efeitos/ (multiatlas "efeitos", quadros "<nome>/<i>").
//   cabeca = onde fica o centro do tiro na largura (0..1); tam = altura do desenho em raios do tiro;
//   laco = depois da 1ª passada a animação repete a partir deste quadro; alfa = transparência da aura.

export interface Efeito {
  n: number;
  w: number;
  h: number;
  ms: number;
  cabeca?: number;
  tam?: number;
  laco?: number;
  alfa?: number;
}

export const EFEITOS = {
  escudo_azul: { n: 25, w: 125, h: 128, ms: 160 },
  aura_verde: { n: 7, w: 133, h: 192, ms: 40 },
  aura_verde_forte: { n: 13, w: 189, h: 192, ms: 50 },
  aura_azul: { n: 3, w: 166, h: 192, ms: 50 },
  aura_amarela: { n: 7, w: 174, h: 192, ms: 40 },
  aura_amarela_forte: { n: 3, w: 155, h: 192, ms: 50 },
  aura_vermelha: { n: 4, w: 184, h: 192, ms: 50 },
  aura_vermelha_forte: { n: 4, w: 181, h: 192, ms: 50 },
  aura_chama_amarela: { n: 3, w: 151, h: 192, ms: 70 },
  aura_roxa: { n: 14, w: 186, h: 192, ms: 60 },
  aura_azul_chama: { n: 4, w: 80, h: 111, ms: 70, alfa: 0.72 },
  aura_azul_escura: { n: 4, w: 80, h: 111, ms: 70, alfa: 0.72 },
  tiro_laranja: { n: 4, w: 74, h: 48, ms: 50 },
  tiro_amarelo: { n: 4, w: 72, h: 48, ms: 80 },
  tiro_vermelho: { n: 2, w: 112, h: 48, ms: 90, cabeca: 0.6, tam: 1.9 },
  tiro_pixel: { n: 4, w: 99, h: 48, ms: 70, cabeca: 0.8, tam: 2.4 },
  tiro_freeza: { n: 4, w: 72, h: 32, ms: 60, cabeca: 0.82, tam: 2.2 },
  cometa_azul: { n: 9, w: 87, h: 48, ms: 40, cabeca: 0.78, tam: 2.4 },
  bola_azul: { n: 6, w: 57, h: 48, ms: 40, cabeca: 0.68, tam: 2.4 },
  tiro_verde: { n: 4, w: 60, h: 47, ms: 50, cabeca: 0.7, tam: 2.4 },
  esfera_roxa: { n: 2, w: 48, h: 48, ms: 80, cabeca: 0.5, tam: 2.6 },
  esfera_rosa: { n: 7, w: 48, h: 48, ms: 50, cabeca: 0.5, tam: 2.4 },
  bola_eletrica: { n: 6, w: 40, h: 64, ms: 60, cabeca: 0.5, tam: 3 },
  cometa_fogo: { n: 4, w: 38, h: 38, ms: 80, cabeca: 0.5, tam: 2.4 },
  esfera_fogo: { n: 20, w: 65, h: 64, ms: 40, cabeca: 0.5, tam: 2.4 },
  kamehameha: { n: 6, w: 225, h: 96, ms: 60 },
  raio_azul: { n: 12, w: 134, h: 64, ms: 50 },
  raio_verde: { n: 8, w: 74, h: 64, ms: 50 },
  raio_vermelho: { n: 12, w: 163, h: 64, ms: 40, laco: 7 },
  raio_pontas: { n: 3, w: 253, h: 64, ms: 60 },
  sol_freeza: { n: 16, w: 129, h: 128, ms: 60 },
  explosao: { n: 14, w: 92, h: 96, ms: 50 },
  parry_onda: { n: 6, w: 66, h: 132, ms: 30 },
} satisfies Record<string, Efeito>;

export type NomeEfeito = keyof typeof EFEITOS;
export const ehEfeito = (nome: string): nome is NomeEfeito => nome in EFEITOS;
