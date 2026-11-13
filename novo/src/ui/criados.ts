// Monta no Phaser o que o jogador criou: nos EDITORES do jogo novo (editor/, guardado no IndexedDB `saiyan-novo` e
// em `saiyan-novo-arenas`) e, só lendo, nos editores do jogo antigo (logica/criados.ts). Uma textura por forma de
// cada personagem criado, no mesmo formato dos atlas do jogo (células de 144x168, quadros "<movimento>/<i>",
// pés na linha 103/112), e as arenas criadas para o desenho do arenas.js. O que foi editado no novo vale no lugar
// do antigo (mesmo id); o que foi excluído no novo e era do antigo só fica escondido.
import Phaser from 'phaser';
import { MOVIMENTOS } from '../logica/animacao';
import { abrirCelula, caixaNaCelula, lerQuadrosSoltos, lerPersonagensCriados, quadrosDoMovimento, type PersonagemCriado, type Quadros } from '../logica/criados';
import { arenasDoJogo, lerOcultos } from '../logica/editorArena';
import { doCriadoAntigo, paraCriado, problemasDoPersonagem, type PersonagemEditavel } from '../logica/editorPersonagem';
import { lerPersonagensDoNovo } from './armazemCriados';
import { armazenamentoPadrao } from '../logica/progresso';
import { CHAVES_ANTIGAS_PADRAO, PERSONAGENS, registrarCriados } from '../dados/personagens';
import { definirArenasDoJogador, esquecerConfigDasFases } from '../dados/fases';
import { aplicarArenasCriadas } from './arena';

const CEL_L = 144, CEL_A = 168, LARG_MAX = 2048;

function carregarImagem(url: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = url;
  });
}

/** desenha um quadro do antigo na célula (x0, y0) */
async function desenharQuadro(g: CanvasRenderingContext2D, url: string, x0: number, y0: number): Promise<void> {
  const cel = abrirCelula(url);
  if (cel) {
    const img = await carregarImagem(cel.href);
    if (img) { g.imageSmoothingEnabled = false; g.drawImage(img, x0 + cel.x * 1.5, y0 + cel.y * 1.5, cel.w * 1.5, cel.h * 1.5); }
    return;
  }
  const img = await carregarImagem(url);
  if (!img) return;
  const c = caixaNaCelula(CEL_L, CEL_A);
  g.imageSmoothingEnabled = false;
  g.drawImage(img, x0 + c.x, y0 + c.y, c.w, c.h);
}

async function montarForma(cena: Phaser.Scene, chave: string, q: Quadros, fps: Partial<Record<string, number>>): Promise<void> {
  const lista = MOVIMENTOS.map((m) => [m, quadrosDoMovimento(q, m)] as const);
  const total = lista.reduce((n, [, l]) => n + l.length, 0);
  if (!total) return;
  const cols = Math.min(total, Math.floor(LARG_MAX / CEL_L)), linhas = Math.ceil(total / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * CEL_L; canvas.height = linhas * CEL_A;
  const g = canvas.getContext('2d')!;
  const quadros: { nome: string; x: number; y: number }[] = [];
  let i = 0;
  for (const [m, l] of lista) for (let k = 0; k < l.length; k++, i++) {
    const x = (i % cols) * CEL_L, y = Math.floor(i / cols) * CEL_A;
    await desenharQuadro(g, l[k], x, y);
    quadros.push({ nome: `${m}/${k}`, x, y });
  }
  if (cena.textures.exists(chave)) cena.textures.remove(chave);
  const tex = cena.textures.addCanvas(chave, canvas)!;
  for (const f of quadros) tex.add(f.nome, 0, f.x, f.y, CEL_L, CEL_A);
  const movimentos = Object.fromEntries(lista.map(([m, l]) => [m, l.length]));
  tex.customData = { meta: { saiyan: { escala: 1.5, fps: 12, fpsMov: fps, movimentos } } };
}

/** imagens das formas guardadas no IndexedDB do antigo, só lendo (não cria o banco se ele não existe) */
export async function formasDoIndexedDb(ids: string[]): Promise<Record<string, { animations?: unknown; fps?: unknown }>> {
  if (!ids.length || typeof indexedDB === 'undefined') return {};
  try {
    const bancos = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
    if (!bancos.some((b) => b.name === 'saiyan_conjuntos')) return {};
    const db = await new Promise<IDBDatabase | null>((ok) => {
      const req = indexedDB.open('saiyan_conjuntos'); // sem versão: abre a que existe, sem "upgrade"
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ok(null);
      req.onupgradeneeded = () => { req.transaction?.abort(); ok(null); };
    });
    if (!db || !db.objectStoreNames.contains('formas')) { db?.close(); return {}; }
    const r: Record<string, { animations?: unknown; fps?: unknown }> = {};
    await new Promise<void>((ok) => {
      const tx = db.transaction('formas', 'readonly'), loja = tx.objectStore('formas');
      for (const id of ids) { const q = loja.get(id); q.onsuccess = () => { if (q.result) r[id] = q.result; }; }
      tx.oncomplete = () => ok(); tx.onerror = () => ok(); tx.onabort = () => ok();
    });
    db.close();
    return r;
  } catch { return {}; }
}

let resumo = { personagens: 0, arenas: 0 };
export const criadosCarregados = () => resumo;

/** Os criados no editor do ANTIGO, com as imagens das formas que estão no IndexedDB dele (só lendo). */
export async function personagensDoAntigo(): Promise<PersonagemCriado[]> {
  let lista: PersonagemCriado[] = [];
  try { lista = lerPersonagensCriados(armazenamentoPadrao(), CHAVES_ANTIGAS_PADRAO); } catch { lista = []; }
  const doIdb = await formasDoIndexedDb(lista.flatMap((p) => p.noIndexedDb));
  const prontos: PersonagemCriado[] = [];
  for (const p of lista) {
    for (const [forma, fonte] of Object.entries(p.fontes)) {
      if (fonte.tipo === 'forma' && !p.quadros[forma] && doIdb[fonte.id]) p.quadros[forma] = lerQuadrosSoltos(doIdb[fonte.id].animations);
    }
    // forma sem quadros (o IndexedDB não abriu): usa a anterior
    p.formas = p.formas.map((f, i, todas) => (p.quadros[f.forma]?.idle?.length ? f : { ...f, forma: todas.slice(0, i).reverse().find((x) => p.quadros[x.forma]?.idle?.length)?.forma ?? f.forma }));
    if (p.quadros[p.formas[0].forma]?.idle?.length) prontos.push(p);
  }
  return prontos;
}

export interface PersonagemDoEditor { p: PersonagemEditavel; origem: 'novo' | 'antigo' }
/** a lista do EDITOR DE PERSONAGENS: os do novo + os do antigo ainda não editados no novo nem escondidos */
export async function personagensParaEditar(): Promise<PersonagemDoEditor[]> {
  const novos = await lerPersonagensDoNovo();
  const ids = new Set(novos.map((p) => p.id)), ocultos = new Set(lerOcultos(armazenamentoPadrao()).personagens);
  const antigos = (await personagensDoAntigo()).filter((c) => !ids.has(c.id) && !ocultos.has(c.chaveAntiga));
  return [...antigos.map((c) => ({ p: doCriadoAntigo(c), origem: 'antigo' as const })), ...novos.map((p) => ({ p, origem: 'novo' as const }))];
}

/** Lê de novo o que foi criado (no novo e no antigo) e monta tudo (no começo e ao sair de um editor). */
export async function carregarCriados(cena: Phaser.Scene): Promise<{ personagens: number; arenas: number }> {
  const arenas = arenasDoJogo(armazenamentoPadrao()).map((x) => x.arena);
  definirArenasDoJogador(arenas);
  aplicarArenasCriadas(arenas);
  let lista: PersonagemCriado[] = [];
  try { lista = (await personagensParaEditar()).filter((x) => !problemasDoPersonagem(x.p).length).map((x) => paraCriado(x.p)); } catch { lista = []; }
  // tira as texturas dos criados de antes (o jogador pode ter mudado no editor)
  for (const k of cena.textures.getTextureKeys()) if (PERSONAGENS[k.split('-')[0]]?.criado) { for (const m of MOVIMENTOS) cena.anims.remove(`${k}:${m}`); cena.textures.remove(k); }
  const prontos: PersonagemCriado[] = [];
  for (const p of lista) {
    for (const forma of new Set(p.formas.map((f) => f.forma))) await montarForma(cena, `${p.id}-${forma}`, p.quadros[forma], p.fps[forma] ?? {});
    prontos.push(p);
  }
  registrarCriados(prontos);
  esquecerConfigDasFases(); // os vilões escolhidos em ARENAS podem ser personagens criados
  resumo = { personagens: prontos.length, arenas: arenas.length };
  return resumo;
}

/** retrato de um personagem: o do atlas `retratos` ou, para um criado, o 1º quadro parado */
export function retratoDe(id: string): [string, string] {
  const p = PERSONAGENS[id];
  return p?.criado ? [`${p.id}-${p.formas[0].forma}`, 'idle/0'] : ['retratos', id];
}
