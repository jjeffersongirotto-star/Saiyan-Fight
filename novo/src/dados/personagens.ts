// Os 16 personagens jogáveis do jogo antigo (DEFAULT_CHARACTERS + ALTURAS_PADRAO + *_TRANSFORMACOES em
// database.js e CONJ_PACOTES em conjuntos.js). Cada forma tem o seu atlas: public/atlas/<id>-<forma>.webp/.json,
// gerado por scripts/gerar-atlas.py a partir de ../conjuntos/<id>/<forma>.json.
// Os nomes dos personagens, das formas e dos golpes não são traduzidos (regra do jogo).

export type Alinhamento = 'HERÓI' | 'ANTI-HERÓI' | 'VILÃO';
export type Aura = 'gelo' | 'amarelo' | 'verde' | 'roxo' | 'azul' | 'rosa' | 'vermelho' | 'blue' | 'azul_escuro';
export type EfeitoEspecial = 'cor' | 'kamehameha' | 'raio_azul' | 'raio_verde' | 'raio_vermelho' | 'sol_freeza';

export interface Forma {
  /** nome do arquivo em conjuntos/<id>/ */
  forma: string;
  nome: string;
  aura: Aura;
  /** cm (a luta usa escalaDaAltura) */
  altura: number;
}

export interface DadosPersonagem {
  id: string; // nome do pacote (conjuntos/<id>/)
  chaveAntiga: string; // chave no characterDB do jogo antigo
  nome: string;
  alinhamento: Alinhamento;
  especial: string;
  corKi: number; // cor do tiro
  efeitoTiro: string;
  efeitoEspecial: EfeitoEspecial;
  /** formas[0] = normal; formas[n] = n-ésima transformação */
  formas: Forma[];
  /** feito no EDITOR DE PERSONAGENS do antigo (texturas montadas no jogo, não vêm de public/atlas) */
  criado?: true;
}

const f = (forma: string, nome: string, aura: Aura, altura: number): Forma => ({ forma, nome, aura, altura });
const hex = (s: string) => parseInt(s.slice(1), 16);

const LISTA: DadosPersonagem[] = [
  {
    id: 'goku', chaveAntiga: 'goku_adult', nome: 'GOKU', alinhamento: 'HERÓI', especial: 'KAMEHAMEHA', corKi: hex('#5be3ff'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'kamehameha',
    formas: [f('normal', 'Normal', 'gelo', 175), f('ssj', 'Super Saiyajin', 'amarelo', 175), f('ssj3', 'Super Saiyajin 3', 'amarelo', 175),
      f('god', 'Super Saiyajin God', 'vermelho', 175), f('blue', 'Super Saiyajin Blue', 'blue', 175), f('instinto', 'Instinto Superior', 'gelo', 175)],
  },
  {
    id: 'vegeta', chaveAntiga: 'vegeta', nome: 'VEGETA', alinhamento: 'ANTI-HERÓI', especial: 'FINAL FLASH', corKi: hex('#ffe45a'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'cor',
    formas: [f('normal', 'Normal', 'amarelo', 164), f('ssj', 'Super Saiyajin', 'amarelo', 164), f('god', 'Super Saiyajin God', 'vermelho', 164),
      f('blue', 'Super Saiyajin Blue', 'blue', 164), f('blue_evo', 'Super Saiyajin Blue Evolução', 'azul_escuro', 164), f('ego', 'Ego Superior', 'roxo', 164)],
  },
  {
    id: 'piccolo', chaveAntiga: 'piccolo', nome: 'PICCOLO', alinhamento: 'ANTI-HERÓI', especial: 'MAKAN KOSAPPO', corKi: hex('#e9ff7a'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'cor',
    formas: [f('normal', 'Normal', 'verde', 226), f('semcapa', 'Sem capa', 'verde', 226), f('laranja', 'Piccolo Laranja', 'amarelo', 245)],
  },
  {
    id: 'freeza', chaveAntiga: 'freeza_1', nome: 'FREEZA', alinhamento: 'VILÃO', especial: 'DEATH BEAM', corKi: hex('#ff5be0'),
    efeitoTiro: 'esfera_roxa', efeitoEspecial: 'sol_freeza',
    formas: [f('f1', 'Primeira forma', 'roxo', 132), f('f2', 'Segunda forma', 'roxo', 221), f('f3', 'Terceira forma', 'roxo', 214),
      f('final', 'Forma final', 'roxo', 158), f('ciborgue', 'Freeza ciborgue', 'roxo', 158), f('golden', 'Golden Freeza', 'amarelo', 158),
      f('black', 'Black Freeza', 'roxo', 158)],
  },
  {
    id: 'trunks', chaveAntiga: 'trunks', nome: 'TRUNKS', alinhamento: 'HERÓI', especial: 'BURNING ATTACK', corKi: hex('#9fd0ff'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'raio_azul',
    formas: [f('normal', 'Normal', 'azul', 170), f('ssj', 'Super Saiyajin', 'amarelo', 170), f('furia', 'Super Saiyajin Fúria', 'amarelo', 170)],
  },
  {
    id: 'gohan', chaveAntiga: 'gohan', nome: 'GOHAN', alinhamento: 'HERÓI', especial: 'MASENKO', corKi: hex('#ffd45b'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'kamehameha',
    formas: [f('normal', 'Normal', 'gelo', 135), f('ssj', 'Super Saiyajin', 'amarelo', 135), f('ssj2', 'Super Saiyajin 2', 'amarelo', 135)],
  },
  {
    id: 'kaioshin', chaveAntiga: 'kaioshin', nome: 'SUPREMO SR. KAIO', alinhamento: 'HERÓI', especial: 'KIAI SAGRADO', corKi: hex('#c9a0ff'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'cor',
    formas: [f('normal', 'Normal', 'rosa', 157)],
  },
  {
    id: 'vegetto', chaveAntiga: 'gogeta', nome: 'VEGETTO', alinhamento: 'HERÓI', especial: 'FINAL KAMEHAMEHA', corKi: hex('#7fd8ff'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'kamehameha',
    formas: [f('normal', 'Normal', 'amarelo', 175), f('ssj', 'Super Saiyajin', 'amarelo', 175), f('blue', 'Super Saiyajin Blue', 'blue', 175)],
  },
  {
    id: 'bardock', chaveAntiga: 'bardock', nome: 'BARDOCK', alinhamento: 'ANTI-HERÓI', especial: 'RIOT JAVELIN', corKi: hex('#ff9a5b'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'raio_vermelho',
    formas: [f('normal', 'Normal', 'azul', 175), f('ssj', 'Super Saiyajin', 'amarelo', 175)],
  },
  {
    id: 'android17', chaveAntiga: 'android17', nome: 'ANDROIDE 17', alinhamento: 'ANTI-HERÓI', especial: 'POWER BLITZ', corKi: hex('#ffe07a'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'raio_azul',
    formas: [f('normal', 'Normal', 'verde', 172)],
  },
  {
    id: 'android18', chaveAntiga: 'android18', nome: 'ANDROIDE 18', alinhamento: 'ANTI-HERÓI', especial: 'DESTRUCTO DISC', corKi: hex('#a9e3ff'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'cor',
    formas: [f('normal', 'Normal', 'azul', 172)],
  },
  {
    id: 'buu', chaveAntiga: 'majin_buu', nome: 'MAJIN BUU', alinhamento: 'VILÃO', especial: 'CHOCOLATE BEAM', corKi: hex('#ff9de0'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'cor',
    formas: [f('kid', 'Kid Buu', 'rosa', 149), f('gordo', 'Buu gordo', 'rosa', 244)],
  },
  {
    id: 'raditz', chaveAntiga: 'raditz', nome: 'RADITZ', alinhamento: 'VILÃO', especial: 'DOUBLE SUNDAY', corKi: hex('#ff7ad9'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'raio_vermelho',
    formas: [f('normal', 'Normal', 'roxo', 198)],
  },
  {
    id: 'broly', chaveAntiga: 'broly', nome: 'BROLY', alinhamento: 'VILÃO', especial: 'ERASER CANNON', corKi: hex('#7dff7a'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'raio_verde',
    formas: [f('normal', 'Normal', 'verde', 230), f('lssj', 'Super Saiyajin Lendário', 'verde', 300)],
  },
  {
    id: 'gotenks', chaveAntiga: 'gotenks', nome: 'GOTENKS', alinhamento: 'HERÓI', especial: 'SUPER GHOST KAMIKAZE', corKi: hex('#ffe45a'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'kamehameha',
    formas: [f('normal', 'Normal', 'amarelo', 125), f('ssj', 'Super Saiyajin', 'amarelo', 125), f('ssj3', 'Super Saiyajin 3', 'amarelo', 125)],
  },
  {
    id: 'cell', chaveAntiga: 'cell', nome: 'CELL', alinhamento: 'VILÃO', especial: 'KAMEHAMEHA PERFEITO', corKi: hex('#7dff7a'),
    efeitoTiro: 'tiro_pixel', efeitoEspecial: 'kamehameha',
    formas: [f('f1', 'Imperfeito', 'verde', 228), f('semi', 'Semi-perfeito', 'verde', 259), f('perfeito', 'Perfeito', 'verde', 213)],
  },
];

export const PERSONAGENS: Record<string, DadosPersonagem> = Object.fromEntries(LISTA.map((p) => [p.id, p]));
/** na ordem da tela de escolha (a mesma do jogo antigo) */
export const ORDEM_PERSONAGENS = LISTA.map((p) => p.id);
/** chaves do characterDB do antigo dos 16 personagens do jogo */
export const CHAVES_ANTIGAS_PADRAO = new Set(LISTA.map((p) => p.chaveAntiga));

/** Põe (ou troca) os personagens criados no editor do antigo depois dos 16. */
export function registrarCriados(lista: DadosPersonagem[]): void {
  for (const id of Object.keys(PERSONAGENS)) if (PERSONAGENS[id].criado) delete PERSONAGENS[id];
  ORDEM_PERSONAGENS.length = LISTA.length;
  for (const p of lista) { PERSONAGENS[p.id] = p; ORDEM_PERSONAGENS.push(p.id); }
}

export const chaveDoAtlas = (id: string, nivel: number) => {
  const p = PERSONAGENS[id];
  return `${p.id}-${p.formas[Math.max(0, Math.min(nivel, p.formas.length - 1))].forma}`;
};
export const formaDoNivel = (id: string, nivel: number) => {
  const p = PERSONAGENS[id];
  return p.formas[Math.max(0, Math.min(nivel, p.formas.length - 1))];
};
