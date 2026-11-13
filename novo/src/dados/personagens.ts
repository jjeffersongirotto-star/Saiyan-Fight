// Personagens da fatia vertical. Os quadros vêm dos pacotes do jogo antigo (conjuntos/<nome>/<forma>.json),
// convertidos em atlas WebP por scripts/gerar-atlas.py.
export interface DadosPersonagem {
  id: string;
  nome: string;
  atlas: string; // public/atlas/<atlas>.webp + .json
  corTiro: number;
  corRaio: number;
}

export const PERSONAGENS: Record<string, DadosPersonagem> = {
  goku: { id: 'goku', nome: 'GOKU', atlas: 'goku-normal', corTiro: 0xffd23a, corRaio: 0x6fd8ff },
  vegeta: { id: 'vegeta', nome: 'VEGETA', atlas: 'vegeta-normal', corTiro: 0xff7a2a, corRaio: 0xc77dff },
};
