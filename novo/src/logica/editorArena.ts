// EDITOR DE ARENAS do jogo novo (sem o jogo antigo): onde as arenas ficam guardadas e as contas do editor que não
// dependem de tela. As peças, a validação e o desenho são os do arenas.js (cenarios-legado.js, gerado), então uma
// arena feita aqui é igual a uma feita no antigo (mesmo formato, mesmo .arena.json).
// Guardadas em `saiyan-novo-arenas`; as do antigo (`saiyan_arenas`) entram só lendo — editar uma delas grava a cópia
// no novo (mesmo id, que passa a valer) e excluir só a esconde (`saiyan-novo-ocultos`).
import type { Armazenamento } from './progresso';
import { CHAVE_ARENAS_ANTIGO, ARENAS_MAX } from './criados';

export const CHAVE_ARENAS_NOVO = 'saiyan-novo-arenas';
export const CHAVE_OCULTOS = 'saiyan-novo-ocultos';
export const DESFAZER_MAX = 50;

type Obj = Record<string, unknown>;
const ehObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x);
const lerJson = (a: Armazenamento | null, k: string): unknown => { try { const t = a?.getItem(k); return t ? JSON.parse(t) : null; } catch { return null; } };
const idValido = (x: unknown): x is string => typeof x === 'string' && /^arena_\w+$/.test(x);

export interface Ocultos { personagens: string[]; arenas: string[] }
export function lerOcultos(a: Armazenamento | null): Ocultos {
  const o = lerJson(a, CHAVE_OCULTOS);
  const l = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string').slice(0, 200) : []);
  return ehObj(o) ? { personagens: l(o.personagens), arenas: l(o.arenas) } : { personagens: [], arenas: [] };
}
export function salvarOcultos(a: Armazenamento | null, o: Ocultos): void { try { a?.setItem(CHAVE_OCULTOS, JSON.stringify(o)); } catch { /* cheio */ } }

export const lerArenasDoNovo = (a: Armazenamento | null): Obj[] => { const l = lerJson(a, CHAVE_ARENAS_NOVO); return (Array.isArray(l) ? l : []).filter(ehObj).filter((x) => idValido(x.id)); };
const lerArenasDoAntigo = (a: Armazenamento | null): Obj[] => { const l = lerJson(a, CHAVE_ARENAS_ANTIGO); return (Array.isArray(l) ? l : []).filter(ehObj).filter((x) => idValido(x.id)); };

export interface ArenaListada { arena: Obj; origem: 'novo' | 'antigo' }
/** as arenas que valem no jogo: as do novo + as do antigo que o novo não substituiu nem escondeu (até 7) */
export function arenasDoJogo(a: Armazenamento | null): ArenaListada[] {
  const novas = lerArenasDoNovo(a), ocultos = new Set(lerOcultos(a).arenas), ids = new Set(novas.map((x) => x.id));
  const antigas = lerArenasDoAntigo(a).filter((x) => !ids.has(x.id) && !ocultos.has(x.id as string));
  return [...antigas.map((arena) => ({ arena, origem: 'antigo' as const })), ...novas.map((arena) => ({ arena, origem: 'novo' as const }))].slice(0, ARENAS_MAX);
}

/** grava (cria ou troca pelo id) uma arena no novo; false = já tem 7 */
export function salvarArena(a: Armazenamento | null, arena: Obj): boolean {
  if (!idValido(arena.id)) return false;
  const novas = lerArenasDoNovo(a), i = novas.findIndex((x) => x.id === arena.id);
  if (i < 0 && arenasDoJogo(a).filter((x) => x.arena.id !== arena.id).length >= ARENAS_MAX) return false;
  if (i >= 0) novas[i] = arena; else novas.push(arena);
  try { a?.setItem(CHAVE_ARENAS_NOVO, JSON.stringify(novas)); } catch { return false; }
  // se estava escondida (uma do antigo excluída antes), volta a aparecer
  const o = lerOcultos(a);
  if (o.arenas.includes(arena.id as string)) { o.arenas = o.arenas.filter((x) => x !== arena.id); salvarOcultos(a, o); }
  return true;
}
/** exclui: a do novo sai da lista; a do antigo fica escondida (o antigo não é alterado) */
export function excluirArena(a: Armazenamento | null, id: string): void {
  const novas = lerArenasDoNovo(a).filter((x) => x.id !== id);
  try { a?.setItem(CHAVE_ARENAS_NOVO, JSON.stringify(novas)); } catch { /* cheio */ }
  if (lerArenasDoAntigo(a).some((x) => x.id === id)) { const o = lerOcultos(a); if (!o.arenas.includes(id)) o.arenas.push(id); salvarOcultos(a, o); }
}
export const novoIdDeArena = (agora = Date.now()) => 'arena_' + agora.toString(36);

/** ↶ DESFAZER / ↷ REFAZER: fotos (JSON) da arena, até 50 */
export class Historico {
  private fotos: string[] = [];
  private i = -1;
  constructor(inicial: unknown) { this.registrar(inicial); }
  registrar(x: unknown): void {
    const f = JSON.stringify(x);
    if (this.fotos[this.i] === f) return;
    this.fotos = this.fotos.slice(0, this.i + 1);
    this.fotos.push(f);
    if (this.fotos.length > DESFAZER_MAX) this.fotos.shift();
    this.i = this.fotos.length - 1;
  }
  get podeDesfazer() { return this.i > 0; }
  get podeRefazer() { return this.i < this.fotos.length - 1; }
  desfazer<T>(): T | null { if (!this.podeDesfazer) return null; return JSON.parse(this.fotos[--this.i]) as T; }
  refazer<T>(): T | null { if (!this.podeRefazer) return null; return JSON.parse(this.fotos[++this.i]) as T; }
}

/** GRADE: posição de 20 em 20 e giro de 15 em 15 (arenaNaGrade / arenaGiroNaGrade) */
export const naGrade = (v: number, grade: boolean, passo = 20) => (grade ? Math.round(v / passo) * passo : Math.round(v));
export const giroNaGrade = (v: number, grade: boolean) => ((((grade ? Math.round(v / 15) * 15 : Math.round(v)) % 360) + 360) % 360);

/** planta: ponto da tela (px, py) da planta de lado L, escala s, centro c -> mundo (x, z) e o contrário */
export const plantaParaMundo = (px: number, py: number, L: number, s: number, c = { x: 0, z: 0 }): [number, number] => [(px - L / 2) / s + c.x, (py - L / 2) / s + c.z];
export const mundoParaPlanta = (x: number, z: number, L: number, s: number, c = { x: 0, z: 0 }): [number, number] => [L / 2 + (x - c.x) * s, L / 2 + (z - c.z) * s];
/** peças do céu: ângulo a (0..360) e altura h (0..1) <-> faixa da planta do céu */
export const ceuParaPlanta = (a: number, h: number, L: number): [number, number] => [a / 360 * L, 20 + (1 - h) * (L * 0.45 - 30)];
export const plantaParaCeu = (px: number, py: number, L: number): [number, number] => [((Math.round(px / L * 360) % 360) + 360) % 360, Math.max(0, Math.min(1, 1 - (py - 20) / (L * 0.45 - 30)))];
