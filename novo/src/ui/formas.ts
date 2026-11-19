// Atlas das formas no Phaser: carregar só o que a luta precisa, criar as animações e liberar o que sobrou.
import Phaser from 'phaser';
import { MOVIMENTOS, MOVIMENTOS_EM_LACO, fpsDoMovimento } from '../logica/animacao';
import { PERSONAGENS } from '../dados/personagens';

export interface MetaAtlas {
  escala: number;
  fps: number;
  fpsMov: Record<string, number>;
  movimentos: Record<string, number>;
  mao?: [number, number] | null;
  dedo?: [number, number] | null;
}

export const ehAtlasDeForma = (chave: string) => {
  const [id, forma] = chave.split('-');
  // os criados no editor do antigo são montados uma vez no jogo (ui/criados.ts) e ficam
  return !!PERSONAGENS[id] && !PERSONAGENS[id].criado && PERSONAGENS[id].formas.some((f) => f.forma === forma);
};

export function metaDoAtlas(cena: Phaser.Scene, chave: string): MetaAtlas {
  const meta = (cena.textures.get(chave).customData as { meta?: { saiyan?: MetaAtlas } }).meta?.saiyan;
  return meta ?? { escala: 1.5, fps: 10, fpsMov: {}, movimentos: {} };
}

/** Põe na fila do loader os atlas que faltam. Devolve quantos faltavam. */
export function pedirFormas(cena: Phaser.Scene, chaves: string[]): number {
  let n = 0;
  for (const k of chaves) {
    if (cena.textures.exists(k) || PERSONAGENS[k.split('-')[0]]?.criado) continue;
    cena.load.atlas(k, `atlas/${k}.webp`, `atlas/${k}.json`);
    n++;
  }
  return n;
}

/** Cria as animações "<atlas>:<movimento>" de uma forma já carregada (uma vez só). */
export function criarAnimacoes(cena: Phaser.Scene, chave: string): void {
  if (!cena.textures.exists(chave) || cena.anims.exists(`${chave}:idle`)) return;
  const m = metaDoAtlas(cena, chave);
  for (const mov of MOVIMENTOS) {
    const n = m.movimentos[mov] ?? 0;
    if (n === 0) continue;
    cena.anims.create({
      key: `${chave}:${mov}`,
      frames: Array.from({ length: n }, (_, i) => ({ key: chave, frame: `${mov}/${i}` })),
      frameRate: fpsDoMovimento(mov, m.fps, m.fpsMov),
      repeat: MOVIMENTOS_EM_LACO.has(mov) ? -1 : 0,
    });
  }
}

/** Libera da memória (textura + animações) as formas de lutadores que não estão em `manter`. */
export function liberarFormas(cena: Phaser.Scene, manter: Set<string>): string[] {
  const soltas: string[] = [];
  for (const k of cena.textures.getTextureKeys()) {
    if (!ehAtlasDeForma(k) || manter.has(k)) continue;
    for (const mov of MOVIMENTOS) cena.anims.remove(`${k}:${mov}`);
    cena.textures.remove(k);
    soltas.push(k);
  }
  return soltas;
}

/** v0.154: altura do desenho na tela (dos pés ao alto da cabeça/cabelo) no movimento atual do sprite — a mediana dos
 *  quadros do movimento, para a aura acompanhar o corpo sem ficar pulsando a cada quadro. Pés em 103/112 da célula. */
const alturasDoMovimento = new Map<string, number>();
export function alturaDoCorpo(s: Phaser.GameObjects.Sprite): number {
  const tex = s.texture, mov = String(s.frame.name).split('/')[0], chave = `${tex.key}:${mov}`;
  let celula = alturasDoMovimento.get(chave);
  if (celula === undefined) {
    const pes = (103 / 112) * s.frame.realHeight;
    const hs = tex.getFrameNames().filter((n) => n.startsWith(`${mov}/`)).map((n) => {
      const d = (tex.get(n) as unknown as { data?: { spriteSourceSize?: { y: number } } }).data?.spriteSourceSize;
      return pes - (d?.y ?? 0);
    }).sort((a, b) => a - b);
    celula = hs.length ? hs[Math.floor(hs.length / 2)] : pes;
    alturasDoMovimento.set(chave, celula);
  }
  return celula * Math.abs(s.scaleY);
}
