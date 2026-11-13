// Conquistas, estatísticas e ranking (progress.js do jogo antigo), sem Phaser.
// O antigo guarda em `saiyan_stats`, `saiyan_badges`, `saiyan_ranking`, `saiyan_stage_ranking`,
// `saiyan_stage_wave_record` e `saiyan_highscore`. O novo LÊ essas chaves (o que o jogador já conquistou continua
// valendo: vale o maior de cada número e toda medalha que um dos dois tiver) e grava só nas suas.
import { CONQUISTAS_LEGADO, type ConquistaLegado } from '../legado/conquistas-legado';
import { armazenamentoPadrao, type Armazenamento } from './progresso';
import type { ProgressoFases } from './ondas';
import { faseLiberada } from './ondas';
import type { EstadoLuta, Evento, TipoItem } from './tipos';

export const CHAVE_ESTAT = 'saiyan-novo-estatisticas';
export const CHAVE_MEDALHAS = 'saiyan-novo-conquistas';
export const CHAVE_RANKING = 'saiyan-novo-ranking';
export const CHAVE_RANKING_FASE = 'saiyan-novo-ranking-fase';
export const CHAVE_APELIDO = 'saiyan-novo-apelido';
export const APELIDO_MAX = 16;

export type Medalha = ConquistaLegado['medalha'];
export const MEDALHAS: Medalha[] = ['diamond', 'gold', 'silver', 'bronze'];
export const CONQUISTAS = CONQUISTAS_LEGADO;
export const UNTOUCHABLE_PONTOS = 5;

export const CHAVES_ESTAT = [
  'gamesPlayed', 'reflectsTotal', 'transformsTotal', 'superAttacksTotal', 'beamClashesTotal', 'zenkaiTotal',
  'versusWinsTotal', 'maxParryCombo', 'highScoreEver', 'customCharactersCreated', 'pickupsSenzu', 'pickupsCapsule',
  'pickupsCloud', 'pickupsStaff', 'saibamansDefeated', 'bossesDefeated',
] as const;
export type ChaveEstat = (typeof CHAVES_ESTAT)[number];
export type Estatisticas = Record<ChaveEstat, number>;

const ehObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const lerJson = (a: Armazenamento | null, k: string): unknown => { try { const t = a?.getItem(k); return t ? JSON.parse(t) : null; } catch { return null; } };
const gravar = (a: Armazenamento | null, k: string, v: unknown) => { try { a?.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch { /* cheio */ } };

function limparEstat(x: unknown): Estatisticas {
  const e = Object.fromEntries(CHAVES_ESTAT.map((k) => [k, 0])) as Estatisticas;
  if (!ehObj(x)) return e;
  for (const k of CHAVES_ESTAT) { const n = Number(x[k]); if (Number.isFinite(n) && n > 0) e[k] = n; }
  return e;
}

export interface LinhaRanking { score: number; date: string; tempo?: number; golpes?: number; apelido?: string }
const limparLista = (x: unknown): LinhaRanking[] => (Array.isArray(x) ? x.filter((r) => ehObj(r) && Number.isFinite(Number(r.score))).map((r) => ({ ...(r as object), score: Number((r as LinhaRanking).score) }) as LinhaRanking) : []);
const top5 = (l: LinhaRanking[]) => [...l].sort((a, b) => b.score - a.score).slice(0, 5);

/** junta a lista do antigo com a do novo (sem repetir a mesma partida) */
function juntarListas(a: LinhaRanking[], b: LinhaRanking[]): LinhaRanking[] {
  const vistos = new Set<string>();
  const r: LinhaRanking[] = [];
  for (const x of [...a, ...b]) {
    const k = `${x.score}|${x.date}|${x.tempo ?? ''}|${x.golpes ?? ''}`;
    if (!vistos.has(k)) { vistos.add(k); r.push(x); }
  }
  return top5(r);
}

export type Aviso = (c: ConquistaLegado) => void;

export class Conquistas {
  estat: Estatisticas;
  medalhas: Set<string>;
  private ouvintes: Aviso[] = [];

  constructor(private a: Armazenamento | null = armazenamentoPadrao()) {
    const antigo = limparEstat(lerJson(a, 'saiyan_stats')), novo = limparEstat(lerJson(a, CHAVE_ESTAT));
    this.estat = Object.fromEntries(CHAVES_ESTAT.map((k) => [k, Math.max(antigo[k], novo[k])])) as Estatisticas;
    this.medalhas = new Set<string>();
    for (const k of ['saiyan_badges', CHAVE_MEDALHAS]) {
      const m = lerJson(a, k);
      if (ehObj(m)) for (const [id, v] of Object.entries(m)) if (v === true && CONQUISTAS.some((c) => c.id === id)) this.medalhas.add(id);
    }
  }

  aoDestravar(f: Aviso): () => void {
    this.ouvintes.push(f);
    return () => { this.ouvintes = this.ouvintes.filter((g) => g !== f); };
  }

  private salvarEstat() { gravar(this.a, CHAVE_ESTAT, this.estat); }
  private salvarMedalhas() { gravar(this.a, CHAVE_MEDALHAS, Object.fromEntries(CONQUISTAS.map((c) => [c.id, this.medalhas.has(c.id)]))); }

  tem(id: string) { return this.medalhas.has(id); }

  /** unlockAchievement: devolve true se destravou agora */
  destravar(id: string): boolean {
    const c = CONQUISTAS.find((x) => x.id === id);
    if (!c || this.medalhas.has(id)) return false;
    this.medalhas.add(id);
    this.salvarMedalhas();
    for (const f of this.ouvintes) f(c);
    this.checarTodas();
    return true;
  }

  /** bumpStat */
  somar(k: ChaveEstat, n = 1): number {
    this.estat[k] += n;
    this.salvarEstat();
    this.checarLimiares();
    return this.estat[k];
  }
  /** raiseStat: recordes só crescem */
  elevar(k: ChaveEstat, v: number): void {
    if (v <= this.estat[k]) return;
    this.estat[k] = v;
    this.salvarEstat();
    this.checarLimiares();
  }

  checarLimiares(): void {
    for (const c of CONQUISTAS) if (c.estat && !this.medalhas.has(c.id) && (this.estat[c.estat as ChaveEstat] ?? 0) >= (c.limiar ?? Infinity)) this.destravar(c.id);
  }
  checarTodas(): void {
    if (this.medalhas.has('all_achievements')) return;
    if (CONQUISTAS.every((c) => c.id === 'all_achievements' || this.medalhas.has(c.id))) this.destravar('all_achievements');
  }
  /** checkStageModeAchievements + as de "libere a fase X" (stage_<id>) */
  checarFases(ordem: string[], prog: ProgressoFases): void {
    const ps = ordem.map((id) => prog[id] ?? {});
    if (ps.some((p) => p.hardDone)) this.destravar('hard_first');
    if (ps.length && ps.every((p) => p.normalDone)) this.destravar('all_normal');
    if (ps.length && ps.every((p) => p.hardDone)) this.destravar('all_hard');
    ordem.forEach((id, i) => {
      if (i === 0) { if (prog[id]?.normalDone) this.destravar(`stage_${id}`); }
      else if (faseLiberada(id, ordem, prog)) this.destravar(`stage_${id}`);
    });
  }

  /** contagem por medalha (getAchievementTierProgress) */
  contagem(): Record<Medalha | 'total', { feitas: number; total: number }> {
    const r = { diamond: { feitas: 0, total: 0 }, gold: { feitas: 0, total: 0 }, silver: { feitas: 0, total: 0 }, bronze: { feitas: 0, total: 0 }, total: { feitas: 0, total: 0 } };
    for (const c of CONQUISTAS) {
      r[c.medalha].total++; r.total.total++;
      if (this.medalhas.has(c.id)) { r[c.medalha].feitas++; r.total.feitas++; }
    }
    return r;
  }

  // ---- ranking (saveRankingScore / saveStageRankingScore) ----
  rankingGeral(): LinhaRanking[] {
    return juntarListas(limparLista(lerJson(this.a, 'saiyan_ranking')), limparLista(lerJson(this.a, CHAVE_RANKING)));
  }
  rankingDaFase(id: string): LinhaRanking[] {
    const ant = lerJson(this.a, 'saiyan_stage_ranking'), nov = lerJson(this.a, CHAVE_RANKING_FASE);
    return juntarListas(limparLista(ehObj(ant) ? ant[id] : null), limparLista(ehObj(nov) ? nov[id] : null));
  }
  registrarPontuacao(fase: string | null, linha: LinhaRanking): void {
    const geral = top5([...limparLista(lerJson(this.a, CHAVE_RANKING)), linha]);
    gravar(this.a, CHAVE_RANKING, geral);
    if (fase) {
      const todas = lerJson(this.a, CHAVE_RANKING_FASE);
      const obj = ehObj(todas) ? todas : {};
      obj[fase] = top5([...limparLista(obj[fase]), linha]);
      gravar(this.a, CHAVE_RANKING_FASE, obj);
    }
    this.elevar('highScoreEver', linha.score);
  }

  // ---- apelido (getApelido / setApelido) ----
  apelido(): string {
    try {
      const n = this.a?.getItem(CHAVE_APELIDO);
      if (n !== null && n !== undefined) return n.slice(0, APELIDO_MAX);
      return (this.a?.getItem('saiyan_apelido') ?? '').slice(0, APELIDO_MAX);
    } catch { return ''; }
  }
  definirApelido(t: string): string {
    // eslint-disable-next-line no-control-regex
    const a = String(t || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, APELIDO_MAX);
    gravar(this.a, CHAVE_APELIDO, a);
    return a;
  }
}

let unica: Conquistas | null = null;
export const conquistas = () => (unica ??= new Conquistas());
export const esquecerConquistas = () => { unica = null; };

const ESTAT_DO_ITEM: Record<TipoItem, ChaveEstat> = { senzu: 'pickupsSenzu', capsula: 'pickupsCapsule', nuvem: 'pickupsCloud', bastao: 'pickupsStaff' };

/** Conta, durante uma luta, o que vale conquista (os mesmos pontos do antigo, que contam só o JOGADOR 1). */
export class RastreioDaLuta {
  private levouDano = false;
  private itens = new Set<TipoItem>();

  constructor(private c: Conquistas, private modo: 'cpu' | 'versus' | 'historia' | 'tutorial') {
    if (modo !== 'tutorial') c.somar('gamesPlayed');
  }

  passo(e: EstadoLuta, eventos: Evento[]): void {
    if (this.modo === 'tutorial') return;
    const c = this.c;
    for (const ev of eventos) {
      switch (ev.tipo) {
        case 'acerto': if (ev.alvo === 'p1') this.levouDano = true; break;
        case 'parry':
          if (ev.dono === 'p1' && ev.refletidos > 0) { c.somar('reflectsTotal', ev.refletidos); c.elevar('maxParryCombo', e.p1.comboParry); }
          break;
        case 'transformou': if (ev.dono === 'p1') { c.destravar('ssj_transform'); c.somar('transformsTotal'); } break;
        case 'especial':
          if (ev.dono === 'p1') {
            c.destravar('special_first');
            if (e.historia && e.p1.bastao > 0) c.somar('superAttacksTotal');
            if (ev.agarradosDestruidos > 0) c.somar('saibamansDefeated', ev.agarradosDestruidos);
          }
          break;
        case 'choque': c.somar('beamClashesTotal'); break;
        case 'zenkai': if (ev.dono === 'p1') c.somar('zenkaiTotal'); break;
        case 'item':
          c.somar(ESTAT_DO_ITEM[ev.item]);
          this.itens.add(ev.item);
          if (this.itens.size >= 4) c.destravar('item_all_types');
          break;
        case 'minionAcertado': if (ev.morreu) c.somar('saibamansDefeated'); break;
        case 'vilaoCaiu':
          c.somar('bossesDefeated');
          if (e.p1.nivel > 0) c.destravar('ssj_boss');
          break;
        case 'fimPartida':
          if (!e.historia && ev.vencedor === 'p1') {
            c.somar('versusWinsTotal');
            c.destravar('versus_win_first');
            if (e.p1.zenkaiUsada) c.destravar('zenkai_win');
          }
          break;
        default: break;
      }
    }
    const h = e.historia;
    if (h) {
      // checkRunMilestones: onda real e pontos da partida
      for (const n of [5, 10, 15, 20, 25]) if (h.onda >= n) c.destravar(`wave_${n}`);
      for (const n of [10, 50, 100]) if (h.pontos >= n) c.destravar(`score_${n}`);
      if (!this.levouDano && h.onda >= 5) c.destravar('untouchable_wave5');
      if (!this.levouDano && h.pontos >= UNTOUCHABLE_PONTOS) c.destravar('untouchable');
    }
  }
}
