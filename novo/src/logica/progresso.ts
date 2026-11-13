// Progresso do modo história guardado no aparelho. O jogo antigo (que continua instalado) guarda em
// 'saiyan_stage_progress' e 'saiyan_ordem_fases': o novo só LÊ essas chaves e escreve numa chave própria, para nunca
// estragar o progresso do antigo. O que valer em qualquer um dos dois conta (juntarProgresso).
import { juntarProgresso, registrarModoCompleto, type ModoFase, type ProgressoFases } from './ondas';

export const CHAVE_PROGRESSO_ANTIGO = 'saiyan_stage_progress';
export const CHAVE_ORDEM_ANTIGA = 'saiyan_ordem_fases';
export const CHAVE_PROGRESSO = 'saiyan-novo-progresso';
export const CHAVE_RECORDES = 'saiyan-novo-recordes';

export interface Armazenamento {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

/** recorde por fase e modo: pontos e a maior onda (SEM LIMITE não acaba, então a onda é o que importa) */
export type Recordes = Record<string, Partial<Record<ModoFase, { pontos: number; onda: number }>>>;

function lerJson(a: Armazenamento | null, k: string): unknown {
  try {
    const t = a?.getItem(k);
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
}
const ehObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** só os campos que interessam (o antigo pode ter lixo de versões velhas) */
export function limparProgresso(x: unknown): ProgressoFases {
  const r: ProgressoFases = {};
  if (!ehObjeto(x)) return r;
  for (const [k, v] of Object.entries(x)) if (ehObjeto(v)) r[k] = { normalDone: v.normalDone === true, hardDone: v.hardDone === true };
  return r;
}

export function armazenamentoPadrao(): Armazenamento | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function lerProgresso(a = armazenamentoPadrao()): ProgressoFases {
  return juntarProgresso(limparProgresso(lerJson(a, CHAVE_PROGRESSO_ANTIGO)), limparProgresso(lerJson(a, CHAVE_PROGRESSO)));
}

/** ordem das fases arrumada no editor do jogo antigo (só leitura) */
export function lerOrdemAntiga(a = armazenamentoPadrao()): unknown {
  return lerJson(a, CHAVE_ORDEM_ANTIGA);
}

/** grava só na chave do jogo novo; devolve o progresso já juntado */
export function salvarModoCompleto(id: string, modo: ModoFase, a = armazenamentoPadrao()): ProgressoFases {
  const meu = registrarModoCompleto(limparProgresso(lerJson(a, CHAVE_PROGRESSO)), id, modo);
  try { a?.setItem(CHAVE_PROGRESSO, JSON.stringify(meu)); } catch { /* cheio ou sem acesso: só nesta sessão */ }
  return lerProgresso(a);
}

export function lerRecordes(a = armazenamentoPadrao()): Recordes {
  const x = lerJson(a, CHAVE_RECORDES);
  return ehObjeto(x) ? (x as Recordes) : {};
}

/** guarda se for recorde; devolve true quando bateu */
export function salvarRecorde(id: string, modo: ModoFase, pontos: number, onda: number, a = armazenamentoPadrao()): boolean {
  const r = lerRecordes(a);
  const atual = r[id]?.[modo];
  const bateu = !atual || pontos > atual.pontos || (pontos === atual.pontos && onda > atual.onda);
  if (!bateu) return false;
  r[id] = { ...r[id], [modo]: { pontos, onda: Math.max(onda, atual?.onda ?? 0) } };
  try { a?.setItem(CHAVE_RECORDES, JSON.stringify(r)); } catch { /* ignora */ }
  return true;
}
