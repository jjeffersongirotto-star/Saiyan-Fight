// Monta a ficha da luta a partir dos dados do personagem (a lógica não precisa dos nomes nem das cores).
import { PERSONAGENS } from '../dados/personagens';
import type { FichaLuta } from './tipos';

export function fichaDoPersonagem(id: string): FichaLuta {
  const p = PERSONAGENS[id];
  if (!p) return { personagem: id, alturas: [175], especialLento: false };
  return { personagem: id, alturas: p.formas.map((f) => f.altura), especialLento: p.efeitoEspecial === 'sol_freeza' };
}
