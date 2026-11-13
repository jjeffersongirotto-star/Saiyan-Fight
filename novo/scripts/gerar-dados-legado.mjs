// Gera, a partir do jogo antigo e SEM reescrever nada à mão:
//  - src/legado/idiomas-legado.ts: as 864 linhas de IDIOMA_LINHAS (idiomas.js), "PT § EN § ES"
//  - src/legado/conquistas-legado.ts: a lista de conquistas de progress.js (nome, descrição, limiar, medalha)
// Rodar de novo quando o antigo mudar (um teste falha se ficar desatualizado):
//   node novo/scripts/gerar-dados-legado.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ler = (n) => fs.readFileSync(path.join(raiz, n), 'utf8');

export function gerarIdiomas() {
  const t = ler('idiomas.js');
  const i = t.indexOf('const IDIOMA_LINHAS = `');
  const j = t.indexOf('`', i + 23);
  const linhas = t.slice(i + 23, j).split('\n').map((l) => l.trim()).filter((l) => l.includes('§'));
  const pares = linhas.map((l) => l.split('§').map((p) => p.trim())).filter((p) => p.length === 3 && p[0]);
  return `// GERADO por novo/scripts/gerar-dados-legado.mjs a partir de idiomas.js (IDIOMA_LINHAS) — NÃO EDITAR À MÃO.
// [português, english, español]. O português é a chave, como no antigo.
export const LINHAS_LEGADO: [string, string, string][] = ${JSON.stringify(pares, null, 0).replace(/\],\[/g, '],\n  [')};
`;
}

export function gerarConquistas() {
  const t = ler('progress.js');
  const i = t.indexOf('let achievements = {');
  const j = t.indexOf('\n};', i);
  const ctx = {};
  vm.runInNewContext(t.slice(i, j + 3).replace('let achievements', 'achievements'), ctx);
  const lista = Object.entries(ctx.achievements).map(([id, a]) => ({ id, nome: a.name, desc: a.desc, medalha: a.tier, ...(a.statKey ? { estat: a.statKey, limiar: a.threshold } : {}) }));
  return `// GERADO por novo/scripts/gerar-dados-legado.mjs a partir de progress.js (achievements) — NÃO EDITAR À MÃO.
// estat/limiar: destrava sozinha quando a estatística chega no limiar (checkThresholdAchievements); sem eles, o jogo
// destrava na hora certa (logica/conquistas.ts), como o unlockAchievement do antigo.
export interface ConquistaLegado { id: string; nome: string; desc: string; medalha: 'bronze' | 'silver' | 'gold' | 'diamond'; estat?: string; limiar?: number }
export const CONQUISTAS_LEGADO: ConquistaLegado[] = ${JSON.stringify(lista, null, 2)};
`;
}

export function gerarUpdates() {
  const t = ler('index.html');
  const i = t.indexOf('id="lista-updates"');
  const j = t.indexOf('</ul>', i);
  const limpar = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  const versoes = [];
  for (const m of t.slice(i, j).matchAll(/<li class="upd-(versao|item)[^"]*"[^>]*>([\s\S]*?)<\/li>/g)) {
    if (m[1] === 'versao') {
      const h3 = /<h3>([\s\S]*?)<\/h3>/.exec(m[2]), pp = /<p>([\s\S]*?)<\/p>/.exec(m[2]);
      const v = /(\d+\.\d+(?:\.\d+)?)/.exec(limpar(h3 ? h3[1] : ''));
      versoes.push({ versao: v ? v[1] : limpar(h3 ? h3[1] : ''), titulo: pp ? limpar(pp[1]) : '', itens: [] });
    } else if (versoes.length) {
      const tag = /<span class="upd-tag">([\s\S]*?)<\/span>/.exec(m[2]), st = /<strong>([\s\S]*?)<\/strong>/.exec(m[2]), pp = /<p>([\s\S]*?)<\/p>/.exec(m[2]);
      versoes[versoes.length - 1].itens.push({ tag: tag ? limpar(tag[1]) : '', titulo: st ? limpar(st[1]) : '', texto: pp ? limpar(pp[1]) : '' });
    }
  }
  return `// GERADO por novo/scripts/gerar-dados-legado.mjs a partir de index.html (#lista-updates, a janela UPDATES do
// jogo antigo) — NÃO EDITAR À MÃO. Histórico das versões 0.x do jogo antigo, mostrado na tela ATUALIZAÇÕES.
export interface UpdateLegado { versao: string; titulo: string; itens: { tag: string; titulo: string; texto: string }[] }
export const UPDATES_LEGADO: UpdateLegado[] = ${JSON.stringify(versoes, null, 1)};
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dir = path.join(raiz, 'novo/src/legado');
  fs.writeFileSync(path.join(dir, 'idiomas-legado.ts'), gerarIdiomas());
  fs.writeFileSync(path.join(dir, 'conquistas-legado.ts'), gerarConquistas());
  fs.writeFileSync(path.join(dir, 'updates-legado.ts'), gerarUpdates());
  console.log('ok: idiomas-legado.ts, conquistas-legado.ts, updates-legado.ts');
}
