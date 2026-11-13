// Jogador 2 controlado pelo computador (modo 1 JOGADOR). Simples e previsível, só para testar a luta sozinho.
import * as C from './constantes';
import type { Entrada, EstadoLuta, IdJogador } from './tipos';
import { ENTRADA_VAZIA } from './tipos';

export interface OpcoesIA {
  /** 0..1: quanto mais alto, mais tiros e parries certeiros */
  dificuldade: number;
}

export function entradaDaIA(e: EstadoLuta, id: IdJogador, op: OpcoesIA = { dificuldade: 0.6 }): Entrada {
  const eu = e[id];
  const ele = e[id === 'p1' ? 'p2' : 'p1'];
  const ent: Entrada = { ...ENTRADA_VAZIA };
  if (e.fase !== 'luta' || eu.acao === 'caido') return ent;

  const dy = ele.y - eu.y;
  const alinhado = Math.abs(dy) < C.LUTADOR_A * 0.4;

  // tiro vindo na minha direção e perto: parry (às vezes)
  const ameaca = e.tiros.find((t) => t.dono !== id && Math.sign(t.vx) === -eu.olhando && Math.abs(t.x - eu.x) < 90 && Math.abs(t.y - eu.y) < C.LUTADOR_A / 2 + 10);
  // "às vezes" sem sorteio: depende do id do tiro (a mesma luta reage sempre igual)
  if (ameaca && (ameaca.id * 37) % 100 < op.dificuldade * 100) {
    ent.parry = true;
    return ent;
  }
  // ki cheio e alinhado: especial
  if (eu.ki >= C.KI_MAX && alinhado) {
    ent.especial = true;
    return ent;
  }
  // longe da linha do adversário: vai até ela; desvia de tiros mudando de altura
  if (ameaca) ent.y = eu.y > (C.TETO_Y + C.CHAO_Y) / 2 ? -1 : 1;
  else if (!alinhado) ent.y = Math.sign(dy);
  // anda um pouco para frente e para trás (ritmo pelo quadro)
  ent.x = Math.sin(e.quadro / 50) * 0.6;
  // carrega ki quando não há tiros vindo e o ki está baixo, em ciclos
  if (!ameaca && eu.ki < 60 && Math.floor(e.quadro / 90) % 3 === 2) {
    ent.carregar = true;
    ent.x = ent.y = 0;
    return ent;
  }
  if (alinhado) ent.atacar = (Math.floor(e.quadro / 30) % 4) !== 0 || op.dificuldade > 0.8;
  return ent;
}
