// v0.156: os 16 personagens do jogo dentro do EDITOR DE PERSONAGENS, só para ver quadro a quadro (cada forma vem do
// seu atlas public/atlas/<id>-<forma>.webp/.json: cada quadro volta para a célula inteira 144x168, com os pés no
// mesmo lugar). Para mexer, o jogador duplica e edita a cópia.
import { ORDEM_PERSONAGENS, PERSONAGENS } from '../dados/personagens';
import { quadrosDoAtlas, type PersonagemEditavel, type QuadroDoAtlas } from '../logica/editorPersonagem';
import type { Movimento } from '../logica/animacao';
import { carregarImagem, el } from './dom';

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

/** ids dos personagens do jogo, na ordem da tela de escolha (sem os criados no editor) */
export const personagensDoJogo = () => ORDEM_PERSONAGENS.filter((id) => PERSONAGENS[id] && !PERSONAGENS[id].criado);

function recortar(img: HTMLImageElement, q: QuadroDoAtlas): string {
  const c = el('canvas', { width: q.sourceSize.w, height: q.sourceSize.h });
  c.getContext('2d')!.drawImage(img, q.frame.x, q.frame.y, q.frame.w, q.frame.h, q.spriteSourceSize.x, q.spriteSourceSize.y, q.frame.w, q.frame.h);
  return c.toDataURL('image/png');
}

/** foto (retrato) de cada personagem do jogo, do atlas "retratos" */
export async function retratosDoJogo(): Promise<Record<string, string>> {
  try {
    const [json, img] = await Promise.all([fetch('atlas/retratos.json').then((r) => r.json()), carregarImagem('atlas/retratos.webp')]);
    if (!img) return {};
    const r: Record<string, string> = {};
    for (const [id, q] of Object.entries(json.frames as Record<string, QuadroDoAtlas>)) r[id] = recortar(img, q);
    return r;
  } catch { return {}; }
}

/** monta o personagem do jogo no formato do editor (todas as formas e movimentos); null se algum atlas falhar */
export async function personagemDoJogo(id: string): Promise<PersonagemEditavel | null> {
  const p = PERSONAGENS[id];
  if (!p) return null;
  try {
    const formas = await Promise.all(p.formas.map(async (f) => {
      const chave = `${id}-${f.forma}`;
      const [json, img] = await Promise.all([fetch(`atlas/${chave}.json`).then((r) => r.json()), carregarImagem(`atlas/${chave}.webp`)]);
      if (!img) throw new Error(chave);
      const meta = (json.meta?.saiyan ?? {}) as { fps?: number; fpsMov?: Record<string, number> };
      const quadros: Partial<Record<Movimento, string[]>> = {}, fps: Partial<Record<Movimento, number>> = {};
      for (const [mov, lista] of Object.entries(quadrosDoAtlas(json.frames)) as [Movimento, QuadroDoAtlas[]][]) {
        quadros[mov] = lista.map((q) => recortar(img, q));
        fps[mov] = meta.fpsMov?.[mov] ?? meta.fps ?? 10;
      }
      return { nome: f.nome, aura: f.aura, altura: f.altura, quadros, fps };
    }));
    return {
      id: 'c_jogo_' + id, origem: 'novo', chaveAntiga: '', nome: p.nome, alinhamento: p.alinhamento, especial: p.especial, corKi: hex(p.corKi),
      efeitoTiro: p.efeitoTiro, efeitoEspecial: p.efeitoEspecial, formas, salvo: 0,
    };
  } catch { return null; }
}
