// Estatísticas de cada personagem (v0.147): lutas e vitórias de quem o jogador usou (o J1; no VERSUS os dois),
// mostradas no quadro "i" de PERSONAGENS. Chave própria; puro (sem Phaser), testado em tests/estatisticas.test.ts.
import { armazenamentoPadrao, type Armazenamento } from './progresso';

export const CHAVE_ESTATISTICAS = 'saiyan-novo-estatisticas';
export interface EstatPersonagem { lutas: number; vitorias: number }
export type Estatisticas = Record<string, EstatPersonagem>;

const inteiro = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);

export function lerEstatisticas(a: Armazenamento | null = armazenamentoPadrao()): Estatisticas {
  try {
    const x: unknown = JSON.parse(a?.getItem(CHAVE_ESTATISTICAS) ?? '{}');
    const out: Estatisticas = {};
    if (!x || typeof x !== 'object') return out;
    for (const [id, v] of Object.entries(x as Record<string, { lutas?: unknown; vitorias?: unknown }>)) {
      if (!v || typeof v !== 'object') continue;
      const lutas = inteiro(v.lutas);
      out[id] = { lutas, vitorias: Math.min(lutas, inteiro(v.vitorias)) };
    }
    return out;
  } catch { return {}; }
}

/** soma uma luta (e a vitória, se venceu) ao personagem e grava */
export function registrarLuta(personagem: string, venceu: boolean, a: Armazenamento | null = armazenamentoPadrao()): Estatisticas {
  const e = lerEstatisticas(a);
  const atual = e[personagem] ?? { lutas: 0, vitorias: 0 };
  e[personagem] = { lutas: atual.lutas + 1, vitorias: atual.vitorias + (venceu ? 1 : 0) };
  try { a?.setItem(CHAVE_ESTATISTICAS, JSON.stringify(e)); } catch { /* cheio: fica sem gravar */ }
  return e;
}

export const estatisticaDe = (e: Estatisticas, personagem: string): EstatPersonagem => e[personagem] ?? { lutas: 0, vitorias: 0 };
