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

type ObjetoComTextura = Phaser.GameObjects.GameObject & { frame?: Phaser.Textures.Frame; texture?: Phaser.Textures.Texture; anims?: Phaser.Animations.AnimationState; list?: Phaser.GameObjects.GameObject[] };
/** percorre todos os objetos de todas as cenas ativas (entrando em containers e camadas) */
export function cadaObjeto(jogo: Phaser.Game, f: (o: ObjetoComTextura, cena: Phaser.Scene) => void): void {
  const visitar = (lista: Phaser.GameObjects.GameObject[], cena: Phaser.Scene) => {
    for (const o of lista as ObjetoComTextura[]) { f(o, cena); if (Array.isArray(o.list)) visitar(o.list, cena); }
  };
  for (const cena of jogo.scene.getScenes(false)) if (cena.sys.displayList) visitar(cena.sys.displayList.list, cena);
}
/** v0.157: texturas que algum objeto de alguma cena ainda usa (a imagem atual ou a animação que está tocando) */
export function texturasEmUso(jogo: Phaser.Game): Set<string> {
  const r = new Set<string>();
  cadaObjeto(jogo, (o) => {
    if (o.frame?.texture) r.add(o.frame.texture.key);
    const anim = o.anims?.currentAnim;
    if (anim) { const [k] = anim.key.split(':'); r.add(k); }
  });
  return r;
}

/** Libera da memória (textura + animações) as formas de lutadores que não estão em `manter`. v0.157: nunca as que
 *  algum objeto ainda usa — apagar a textura de um objeto na tela trava o desenho (lutadores brancos, FPS caindo). */
export function liberarFormas(cena: Phaser.Scene, manter: Set<string>): string[] {
  const soltas: string[] = [];
  const emUso = texturasEmUso(cena.game);
  for (const k of cena.textures.getTextureKeys()) {
    if (!ehAtlasDeForma(k) || manter.has(k) || emUso.has(k)) continue;
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
