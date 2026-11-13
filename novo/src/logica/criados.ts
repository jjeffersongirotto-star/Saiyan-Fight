// O que o jogador criou nos EDITORES do jogo antigo, lido (só leitura) para jogar no novo:
//  - personagens: `saiyan_db_v8_8bit` (characterDB). Os quadros de cada movimento são imagens (data URL) guardadas
//    no próprio personagem (ORIGINAL, da sprite sheet) ou nas FORMAS do conjunto (spriteForms, imagens no IndexedDB
//    `saiyan_conjuntos`). Mesma regra do conjuntos.js: o grupo em uso (spriteActive) dá a base e cada
//    transformação sobe uma forma; acabando, fica na última. Sem grupo, todas as formas usam o ORIGINAL.
//  - arenas: `saiyan_arenas` (até 7), desenhadas pelo arenas.js do antigo (src/legado/cenarios-legado.js).
// O novo nunca grava nessas chaves.
import type { Armazenamento } from './progresso';
import { MOVIMENTOS, type Movimento } from './animacao';
import type { Alinhamento, Aura, DadosPersonagem } from '../dados/personagens';

export const CHAVE_DB_ANTIGO = 'saiyan_db_v8_8bit';
export const CHAVE_ARENAS_ANTIGO = 'saiyan_arenas';
export const ARENAS_MAX = 7; // ARENA_MAX do antigo

const ehObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const lerJson = (a: Armazenamento | null, k: string): unknown => { try { const t = a?.getItem(k); return t ? JSON.parse(t) : null; } catch { return null; } };

const AURAS: Aura[] = ['gelo', 'amarelo', 'verde', 'roxo', 'azul', 'rosa', 'vermelho', 'blue', 'azul_escuro'];
const aura = (x: unknown, p: Aura): Aura => (AURAS.includes(x as Aura) ? (x as Aura) : p);
const altura = (x: unknown, p: number) => { const n = Number(x); return Number.isFinite(n) && n >= 60 && n <= 400 ? Math.round(n) : p; };
const cor = (x: unknown, p: number) => (typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? parseInt(x.slice(1), 16) : p);

/** quadros de cada movimento (data URLs) */
export type Quadros = Partial<Record<Movimento, string[]>>;
/** de onde vêm os quadros de uma forma: o ORIGINAL do personagem ou uma forma do conjunto */
export type FonteDosQuadros = { tipo: 'original' } | { tipo: 'forma'; id: string };

export interface PersonagemCriado extends DadosPersonagem {
  criado: true;
  /** forma (DadosPersonagem.formas[i].forma) -> de onde vêm os quadros */
  fontes: Record<string, FonteDosQuadros>;
  /** quadros já guardados no personagem (ORIGINAL e formas sem IndexedDB) */
  quadros: Record<string, Quadros>;
  fps: Record<string, Partial<Record<Movimento, number>>>;
  /** formas cujas imagens estão no IndexedDB (id da forma) */
  noIndexedDb: string[];
}

export const lerQuadrosSoltos = (x: unknown): Quadros => limparQuadros(x);
function limparQuadros(x: unknown): Quadros {
  const q: Quadros = {};
  if (!ehObj(x)) return q;
  for (const m of MOVIMENTOS) {
    const l = x[m];
    if (Array.isArray(l)) { const ok = l.filter((u): u is string => typeof u === 'string' && u.startsWith('data:image/')); if (ok.length) q[m] = ok; }
  }
  return q;
}
const limparFps = (x: unknown): Partial<Record<Movimento, number>> => {
  const r: Partial<Record<Movimento, number>> = {};
  if (ehObj(x)) for (const m of MOVIMENTOS) { const n = Number(x[m]); if (Number.isFinite(n) && n > 0 && n <= 60) r[m] = n; }
  return r;
};
/** id seguro para chave de textura (`<id>-<forma>`): só letras, números e _ */
export const idDoCriado = (chave: string) => 'c_' + chave.toLowerCase().replace(/[^a-z0-9_]/g, '_');

/** Personagens criados no editor do antigo. `padrao` = chaves dos 16 do jogo (ficam de fora). */
export function lerPersonagensCriados(a: Armazenamento | null, padrao: Set<string>): PersonagemCriado[] {
  const db = lerJson(a, CHAVE_DB_ANTIGO);
  if (!ehObj(db)) return [];
  const lista: PersonagemCriado[] = [];
  for (const [chave, c] of Object.entries(db)) {
    if (padrao.has(chave) || !ehObj(c) || typeof c.name !== 'string' || !c.name.trim()) continue;
    if (c.minion || c.minionClassico || c.builderAppearance) continue; // minions e bonecos do construtor antigo não lutam
    const id = idDoCriado(chave);
    const original = limparQuadros(c.animations);
    const formasDoConjunto = (Array.isArray(c.spriteForms) ? c.spriteForms : []).filter(ehObj).filter((f) => typeof f.id === 'string' && !f.pacote);
    const grupo = (Array.isArray(c.spriteGroups) ? c.spriteGroups : []).filter(ehObj).find((g) => g.id === c.spriteActive && typeof g.base === 'string');
    const transfs = (Array.isArray(c.transformations) ? c.transformations : []).filter(ehObj);
    const auraBase = aura(c.aura, 'gelo'), alt = altura(c.altura, 175);
    const fontes: Record<string, FonteDosQuadros> = {};
    const quadros: Record<string, Quadros> = {};
    const fps: Record<string, Partial<Record<Movimento, number>>> = {};
    const noIndexedDb = new Set<string>();
    const formaDoNivel = (n: number): string => {
      if (!grupo) return 'orig';
      const t = (Array.isArray(grupo.transfs) ? grupo.transfs : []).filter((x): x is string => typeof x === 'string');
      return n > 0 && t.length ? t[Math.min(n, t.length) - 1] : (grupo.base as string);
    };
    const usar = (fid: string): string | null => {
      const nome = fid === 'orig' ? 'orig' : 'f' + fid.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (fontes[nome]) return nome;
      if (fid === 'orig') {
        if (!original.idle?.length) return null;
        fontes[nome] = { tipo: 'original' }; quadros[nome] = original; fps[nome] = limparFps(c.fpsSettings);
        return nome;
      }
      const f = formasDoConjunto.find((x) => x.id === fid);
      if (!f) return null;
      fontes[nome] = { tipo: 'forma', id: fid };
      const q = limparQuadros(f.animations);
      if (q.idle?.length) quadros[nome] = q;
      else if (f.noIdb) noIndexedDb.add(fid);
      else return null;
      fps[nome] = limparFps(f.fps);
      return nome;
    };
    const formas: DadosPersonagem['formas'] = [];
    for (let n = 0; n <= transfs.length; n++) {
      const forma = usar(formaDoNivel(n)) ?? (n > 0 ? formas[n - 1]?.forma : usar('orig'));
      if (!forma) break;
      const t = n > 0 ? transfs[n - 1] : null;
      formas.push({ forma, nome: n === 0 ? 'Normal' : typeof t?.name === 'string' && t.name.trim() ? t.name.trim().slice(0, 32) : `Transformação ${n}`, aura: n === 0 ? auraBase : aura(t?.aura, auraBase), altura: altura(t?.altura, alt) });
    }
    if (!formas.length) continue; // sem quadros: não dá para lutar
    const alinhamento: Alinhamento = c.alignment === 'VILÃO' || c.alignment === 'ANTI-HERÓI' ? c.alignment : 'HERÓI';
    lista.push({
      id, chaveAntiga: chave, nome: c.name.trim().toUpperCase().slice(0, 20), alinhamento,
      especial: typeof c.special === 'string' && c.special.trim() ? c.special.trim().toUpperCase().slice(0, 28) : 'KAMEHAMEHA',
      corKi: cor(c.projColor, 0x00ffff), efeitoTiro: typeof c.efeitoTiro === 'string' ? c.efeitoTiro : '',
      efeitoEspecial: (['kamehameha', 'raio_azul', 'raio_verde', 'raio_vermelho', 'sol_freeza'].includes(c.efeitoEspecial as string) ? c.efeitoEspecial : 'cor') as DadosPersonagem['efeitoEspecial'],
      formas, criado: true, fontes, quadros, fps, noIndexedDb: [...noIndexedDb],
    });
  }
  return lista;
}

/** quadros para um movimento que a forma não tem (conjQuadrosDaForma): especial → ataque → parado */
export function quadrosDoMovimento(q: Quadros, m: Movimento): string[] {
  if (q[m]?.length) return q[m]!;
  if (m === 'special' && q.attackKi?.length) return q.attackKi;
  return q.idle ?? [];
}

/** Onde a imagem solta (quadro do ORIGINAL) entra na célula de 144x168 do atlas: o antigo a desenha esticada na
 *  caixa do lutador (48x56) e a pixel art 1,54x maior, com os pés na linha 103/112 (drawPlayerEntity). */
export function caixaNaCelula(celL = 144, celA = 168): { x: number; y: number; w: number; h: number } {
  const w = celL / 1.54, h = celA / 1.54;
  return { x: (celL - w) / 2, y: celA * (103 / 112) - h * (103 / 112), w, h };
}

/** Arenas criadas no EDITOR DE ARENAS (as que têm id válido, até 7). */
export function lerArenasCriadas(a: Armazenamento | null): Record<string, unknown>[] {
  const l = lerJson(a, CHAVE_ARENAS_ANTIGO);
  return (Array.isArray(l) ? l : []).filter(ehObj).filter((x) => typeof x.id === 'string' && /^arena_\w+$/.test(x.id)).slice(0, ARENAS_MAX);
}

/** A célula SVG do antigo (conjEmbrulharQuadro) por dentro: onde a imagem fica no desenho 96x112 e a imagem em si.
 *  Desenhar a imagem de dentro direto (como o conjQuadroFonte do antigo) evita SVG no canvas. */
export function abrirCelula(url: string): { x: number; y: number; w: number; h: number; href: string } | null {
  if (!url.startsWith('data:image/svg+xml')) return null;
  let svg = url.slice(url.indexOf(',') + 1);
  try { svg = url.includes(';base64,') ? atob(svg) : decodeURIComponent(svg); } catch { return null; }
  if (!/viewBox="0 0 96 112"/.test(svg)) return null;
  const tag = /<image\b([^>]*)>/.exec(svg)?.[1];
  if (!tag) return null;
  const at = (n: string) => new RegExp(`\\b${n}="([^"]*)"`).exec(tag)?.[1];
  const x = Number(at('x') ?? 0), y = Number(at('y') ?? 0), w = Number(at('width')), h = Number(at('height'));
  const href = at('href') ?? at('xlink:href');
  if (!href || !href.startsWith('data:image/') || ![x, y, w, h].every(Number.isFinite)) return null;
  return { x, y, w, h, href };
}
