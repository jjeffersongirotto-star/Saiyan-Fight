// ARENAS do jogo antigo: o jogador escolhe a POSIÇÃO de cada fase no mapa, o VILÃO (e a forma em que ele começa)
// e o MINION. O antigo guarda em `saiyan_ordem_fases`, `saiyan_viloes_fase` ({ fase: { key, nivel } }, com a chave
// do characterDB) e `saiyan_minions_fase`. O novo lê essas escolhas na 1ª vez e grava só em `saiyan-novo-fases`.
import { armazenamentoPadrao, type Armazenamento } from './progresso';
import type { ModeloMinion } from './minions';

export const CHAVE_FASES = 'saiyan-novo-fases';
export const MINIONS: { id: ModeloMinion; nome: string }[] = [{ id: 'saibaman', nome: 'SAIBAMAN' }, { id: 'celljr', nome: 'CELL JR.' }];

export interface ConfigFases {
  ordem: string[] | null;
  viloes: Record<string, { personagem: string; nivel: number }>;
  minions: Record<string, ModeloMinion>;
}

const ehObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const lerJson = (a: Armazenamento | null, k: string): unknown => { try { const t = a?.getItem(k); return t ? JSON.parse(t) : null; } catch { return null; } };

/** `idDaChaveAntiga`: chave do characterDB do antigo → id do personagem no novo (null = não existe no novo) */
export function lerConfigFases(idDaChaveAntiga: (k: string) => string | null, existe: (id: string) => boolean, a = armazenamentoPadrao()): ConfigFases {
  const novo = lerJson(a, CHAVE_FASES);
  const cfg: ConfigFases = { ordem: null, viloes: {}, minions: {} };
  if (ehObj(novo)) {
    if (Array.isArray(novo.ordem)) cfg.ordem = novo.ordem.filter((x): x is string => typeof x === 'string');
    if (ehObj(novo.viloes)) for (const [f, v] of Object.entries(novo.viloes)) if (ehObj(v) && typeof v.personagem === 'string' && existe(v.personagem)) cfg.viloes[f] = { personagem: v.personagem, nivel: Math.max(0, Number(v.nivel) | 0) };
    if (ehObj(novo.minions)) for (const [f, m] of Object.entries(novo.minions)) if (MINIONS.some((x) => x.id === m)) cfg.minions[f] = m as ModeloMinion;
    return cfg;
  }
  const ordem = lerJson(a, 'saiyan_ordem_fases');
  if (Array.isArray(ordem)) cfg.ordem = ordem.filter((x): x is string => typeof x === 'string');
  const viloes = lerJson(a, 'saiyan_viloes_fase');
  if (ehObj(viloes)) for (const [f, v] of Object.entries(viloes)) {
    if (!ehObj(v) || typeof v.key !== 'string') continue;
    const id = idDaChaveAntiga(v.key);
    if (id && existe(id)) cfg.viloes[f] = { personagem: id, nivel: Math.max(0, Number(v.nivel) | 0) };
  }
  const minions = lerJson(a, 'saiyan_minions_fase');
  if (ehObj(minions)) for (const [f, m] of Object.entries(minions)) if (MINIONS.some((x) => x.id === m)) cfg.minions[f] = m as ModeloMinion;
  return cfg;
}

export function salvarConfigFases(cfg: ConfigFases, a = armazenamentoPadrao()): void {
  try { a?.setItem(CHAVE_FASES, JSON.stringify(cfg)); } catch { /* cheio */ }
}

/** trocarPosicaoFase do antigo: a fase sai do lugar e entra na posição `pos` (1..n); as outras andam uma casa */
export function trocarPosicao(ordem: string[], id: string, pos: number): string[] {
  const r = ordem.slice();
  const i = r.indexOf(id), j = Math.max(0, Math.min(r.length - 1, (pos | 0) - 1));
  if (i < 0 || i === j) return r;
  r.splice(i, 1);
  r.splice(j, 0, id);
  return r;
}
