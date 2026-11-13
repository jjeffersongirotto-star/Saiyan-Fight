// Quais formas (atlas) cada luta precisa ter carregadas — mesma ideia do formasDaLutaNecessarias do jogo antigo:
// a forma atual de cada lutador + a próxima (para a transformação já estar pronta). O resto pode ser liberado.
import { chaveDoAtlas, PERSONAGENS } from '../dados/personagens';
import type { EstadoLuta } from './tipos';

export function formasNecessarias(lutadores: { personagem: string; nivel: number }[]): string[] {
  const chaves = new Set<string>();
  for (const l of lutadores) {
    const p = PERSONAGENS[l.personagem];
    if (!p) continue;
    chaves.add(chaveDoAtlas(l.personagem, l.nivel));
    if (l.nivel + 1 < p.formas.length) chaves.add(chaveDoAtlas(l.personagem, l.nivel + 1));
  }
  return [...chaves];
}

export const formasDaLuta = (e: EstadoLuta) => formasNecessarias([e.p1, e.p2]);

/** Forma para desenhar agora: a do nível, ou a mais alta já carregada abaixo dele (enquanto a nova baixa). */
export function formaParaDesenhar(personagem: string, nivel: number, carregada: (chave: string) => boolean): string | null {
  for (let n = nivel; n >= 0; n--) {
    const k = chaveDoAtlas(personagem, n);
    if (carregada(k)) return k;
  }
  return null;
}
