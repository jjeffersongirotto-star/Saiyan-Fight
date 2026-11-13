// Itens que caem do céu no modo história (spawnPickup + coleta em gameplay.js). Puros.
//  senzu (feijão mágico) = +1 de vida · cápsula = escudo que segura um golpe · nuvem voadora = velocidade x1,4
//  · bastão mágico = +1 no tiro e especial x2 (SUPER ATAQUE). Nuvem e bastão: 8 s por item, até 20 s.
import * as C from './constantes';
import type { Evento, Lutador, TipoItem } from './tipos';

export interface Item {
  id: number;
  tipo: TipoItem;
  x: number; // centro
  y: number;
  vy: number;
  /** quadros parado no chão (regra itemPousaNoChao) */
  noChao: number;
}

/** nome mostrado ao pegar (os mesmos textos do jogo antigo; a cápsula mostra o efeito, ESCUDO) */
export const NOME_DO_ITEM: Record<TipoItem, string> = {
  senzu: 'FEIJÃO MÁGICO', capsula: 'ESCUDO', nuvem: 'NUVEM VOADORA', bastao: 'BASTÃO MÁGICO',
};

export const ITEM_TAM = 24;
export const ITENS_MAX = 2;
export const ITEM_INTERVALO = 420;     // SPAWN_TIMERS.PICKUP_FRAMES
export const ITEM_PRIMEIRO = 240;      // o 1º sai em 4 s (pickupSpawnTimer começa em 180)
export const ITEM_X_MIN = 10 + ITEM_TAM / 2, ITEM_X_MAX = 450 - ITEM_TAM / 2; // metade do herói

/** sorteio com os pesos do antigo: 38% senzu, 24% cápsula, 19% nuvem, 19% bastão */
export function tipoDoSorteio(r: number): TipoItem {
  return r < 0.38 ? 'senzu' : r < 0.62 ? 'capsula' : r < 0.81 ? 'nuvem' : 'bastao';
}

export function criarItem(id: number, sorteios: [number, number, number]): Item {
  return { id, tipo: tipoDoSorteio(sorteios[0]), x: ITEM_X_MIN + sorteios[1] * (ITEM_X_MAX - ITEM_X_MIN), y: -ITEM_TAM, vy: 1.2 + sorteios[2] * 0.8, noChao: 0 };
}

/** y do item parado no chão */
export const ITEM_Y_CHAO = C.CHAO_Y - ITEM_TAM / 2;

/** Cai; com `pousa`, para no chão e conta o tempo lá. true = já pode sumir. */
export function moverItem(it: Item, pousa: boolean): boolean {
  if (pousa && it.y >= ITEM_Y_CHAO) {
    it.y = ITEM_Y_CHAO;
    it.noChao++;
    return it.noChao >= C.ITEM_NO_CHAO;
  }
  it.y += it.vy;
  return it.y > C.TELA_A + 30;
}

export function encostaNoItem(it: Item, l: Lutador): boolean {
  return Math.abs(it.x - l.x) < (ITEM_TAM + l.l) / 2 && Math.abs(it.y - l.y) < (ITEM_TAM + l.a) / 2;
}

/** Aplica o item em quem pegou. */
export function pegarItem(l: Lutador, it: Item, eventos: Evento[]): void {
  if (it.tipo === 'senzu') l.vida = Math.min(l.vidaMax, l.vida + 1);
  else if (it.tipo === 'capsula') l.escudo = true;
  else if (it.tipo === 'nuvem') l.nuvem = Math.min(C.ITEM_DURACAO_MAX, l.nuvem + C.ITEM_DURACAO);
  else l.bastao = Math.min(C.ITEM_DURACAO_MAX, l.bastao + C.ITEM_DURACAO);
  eventos.push({ tipo: 'item', item: it.tipo, x: it.x, y: it.y });
}
