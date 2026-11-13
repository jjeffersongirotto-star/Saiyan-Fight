// As 11 fases do modo história (FASES_PADRAO em game-logic-core.js), na ordem do mapa. A trilha é a mesma do
// jogo antigo (musica). As arenas desenhadas entram na fase 4; por enquanto cada fase tem o céu na cor dela.
// VILÃO DE CADA FASE: no jogo antigo o jogador escolhia em ARENAS (sem escolha, ficava o último escolhido —
// o Vegeta). Aqui cada fase tem um vilão padrão (MUDANÇA para o Jefferson confirmar; a tabela é fácil de trocar).
import type { IdTema } from './temas';
import type { ModeloMinion } from '../logica/minions';
import { lerConfigFases, salvarConfigFases, type ConfigFases } from '../logica/configFases';
import { ORDEM_PERSONAGENS, PERSONAGENS } from './personagens';

export interface Fase {
  id: string;
  nome: string;
  cor: number;
  musica: IdTema;
  minion: ModeloMinion;
  vilao: { personagem: string; nivel: number };
  /** cores do céu (de cima, do horizonte) e do chão no fundo provisório */
  ceu: [string, string];
  chao: [string, string];
}

const hex = (s: string) => parseInt(s.slice(1), 16);
const f = (id: string, nome: string, cor: string, musica: IdTema, minion: ModeloMinion, vilao: string, nivel: number, ceu: [string, string], chao: [string, string]): Fase =>
  ({ id, nome, cor: hex(cor), musica, minion, vilao: { personagem: vilao, nivel }, ceu, chao });

export const FASES: Fase[] = [
  f('kame', 'ILHA DO MESTRE KAME', '#f472b6', 'kame', 'saibaman', 'raditz', 0, ['#3aa0ff', '#c9f0ff'], ['#f3d58f', '#d9b469']),
  f('terra', 'TORNEIO ARTES MARCIAIS', '#f6b93b', 'classico', 'saibaman', 'piccolo', 0, ['#1f5fc8', '#bfe3ff'], ['#d8d2c2', '#a9a291']),
  f('kaio', 'PLANETA DO SR. KAIOH', '#a78bfa', 'kaio', 'saibaman', 'vegeta', 0, ['#f3b562', '#ffe9b8'], ['#7bc96f', '#4f9a45']),
  f('namek', 'PLANETA NAMEK', '#4ade80', 'namek', 'saibaman', 'freeza', 0, ['#3fbf7f', '#c8f7d9'], ['#6fd3a8', '#3a9a74']),
  f('freeza_ship', 'NAVE DE FREEZA', '#c084fc', 'freeza', 'saibaman', 'freeza', 2, ['#2b2350', '#8e7cc3'], ['#9aa3b5', '#6b7385']),
  f('namek_explosao', 'NAMEK PRESTES A EXPLODIR', '#f87171', 'explosao', 'saibaman', 'freeza', 3, ['#5a0d0d', '#ff7a3d'], ['#6b3b2a', '#3f2118']),
  f('time_room', 'SALA DO TEMPO', '#e2e8f0', 'gt', 'saibaman', 'android17', 0, ['#e8eef7', '#ffffff'], ['#f4f6fa', '#d7dde8']),
  f('cell_games', 'TORNEIO DE CELL', '#38bdf8', 'cell', 'celljr', 'cell', 0, ['#5aa7e0', '#d9efff'], ['#c9b98f', '#9c8c62']),
  f('kaioshin', 'PLANETA SUPREMO KAIOH', '#fbbf24', 'boo', 'saibaman', 'buu', 0, ['#7b5cd6', '#f0c8ff'], ['#8fd47a', '#5a9a4a']),
  f('plataforma_celestial', 'PLATAFORMA CELESTIAL', '#7dd3fc', 'kami', 'saibaman', 'android18', 0, ['#6ec6ff', '#ffffff'], ['#e9e2cf', '#bdb39a']),
  f('capital_oeste', 'CAPITAL DO OESTE', '#facc15', 'capital', 'saibaman', 'broly', 0, ['#ff9a5b', '#ffe0b0'], ['#9aa0a8', '#6d727a']),
];

/** a fase como está na tabela (sem as escolhas do jogador em ARENAS) */
export const fasePadrao = (id: string): Fase => FASES.find((x) => x.id === id) ?? FASES[0];

// escolhas do jogador em ARENAS (vilão + forma, minion, ordem): lidas uma vez, trocadas pela tela ARENAS
let cfg: ConfigFases | null = null;
export function configDasFases(): ConfigFases {
  cfg ??= lerConfigFases((k) => ORDEM_PERSONAGENS.find((id) => PERSONAGENS[id].chaveAntiga === k) ?? null, (id) => !!PERSONAGENS[id]);
  return cfg;
}
export function mudarConfigDasFases(f: (c: ConfigFases) => void): void {
  const c = configDasFases();
  f(c);
  salvarConfigFases(c);
}
export const esquecerConfigDasFases = () => { cfg = null; };

/** a fase com o vilão/forma e o minion escolhidos em ARENAS */
export function faseDe(id: string): Fase {
  const base = fasePadrao(id);
  const c = configDasFases();
  const v = c.viloes[base.id];
  const vilao = v && PERSONAGENS[v.personagem] ? { personagem: v.personagem, nivel: Math.min(v.nivel, PERSONAGENS[v.personagem].formas.length - 1) } : base.vilao;
  return { ...base, vilao, minion: c.minions[base.id] ?? base.minion };
}
/** as fases na ordem do mapa (a escolhida em ARENAS) */
export const fasesEmOrdem = (): Fase[] => ordenarFases(configDasFases().ordem).map((f) => faseDe(f.id));

/** Ordem salva no jogo antigo (ARENAS: saiyan_ordem_fases); ids que faltam entram no fim (ordenarFases). */
export function ordenarFases(ordemSalva: unknown): Fase[] {
  if (!Array.isArray(ordemSalva) || !ordemSalva.length) return FASES.slice();
  const lista: Fase[] = [];
  for (const id of ordemSalva) { const x = FASES.find((ff) => ff.id === id); if (x && !lista.includes(x)) lista.push(x); }
  for (const x of FASES) if (!lista.includes(x)) lista.push(x);
  return lista;
}
