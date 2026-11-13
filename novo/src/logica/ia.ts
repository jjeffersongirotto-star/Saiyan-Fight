// Jogador 2 controlado pelo computador (modo 1 JOGADOR). Simples e previsível; usa as mesmas regras do humano.
import * as C from './constantes';
import { dentroDoParry, nivelMaximo, outro } from './luta';
import type { Entrada, EstadoLuta, IdJogador } from './tipos';
import { ENTRADA_VAZIA } from './tipos';

export interface OpcoesIA {
  /** 0..1: quanto mais alto, mais parries certeiros */
  dificuldade: number;
}

export function entradaDaIA(e: EstadoLuta, id: IdJogador, op: OpcoesIA = { dificuldade: 0.6 }): Entrada {
  const eu = e[id];
  const ele = e[outro(id)];
  const ent: Entrada = { ...ENTRADA_VAZIA };
  if (e.fase !== 'luta' || eu.acao === 'caido') return ent;

  // choque de raios: aperta ATAQUE num ritmo que depende da dificuldade
  if (e.choque) {
    ent.atacar = e.quadro % (op.dificuldade > 0.7 ? 4 : 6) < 2;
    return ent;
  }
  // o adversário soltou o especial e eu tenho ki cheio: respondo (vira choque)
  if (eu.ki >= C.KI_MAX && e.raios.some((r) => r.dono !== id && r.idade < r.chega)) {
    ent.especial = true;
    return ent;
  }

  const dy = ele.y - eu.y;
  const alinhado = Math.abs(dy) < eu.a * 0.4;

  // tiro do outro dentro do alcance do parry: parry (às vezes, sem sorteio: depende do id do tiro)
  const ameaca = e.tiros.find((t) => t.dono !== id && Math.sign(t.vx) === -eu.olhando && dentroDoParry(t, eu));
  if (ameaca && eu.esperaParry <= 0 && (ameaca.id * 37) % 100 < op.dificuldade * 100) {
    ent.parry = true;
    return ent;
  }
  // ki cheio: transforma primeiro (enquanto houver forma), depois especial
  if (eu.ki >= C.KI_MAX) {
    if (eu.nivel < nivelMaximo(eu) && eu.vida > 1) ent.transformar = true;
    else ent.especial = true;
    return ent;
  }
  const vindo = e.tiros.find((t) => t.dono !== id && Math.sign(t.vx) === -eu.olhando && Math.abs(t.x - eu.x) < 140 && Math.abs(t.y - eu.y) < eu.a / 2 + 10);
  if (vindo) ent.y = eu.y > (C.TETO_Y + C.CHAO_Y) / 2 ? -1 : 1;
  else if (!alinhado) ent.y = Math.sign(dy);
  ent.x = Math.sin(e.quadro / 50) * 0.6;
  // carrega ki em ciclos quando nada está vindo
  if (!vindo && Math.floor(e.quadro / 90) % 3 === 2) {
    ent.carregar = true;
    ent.x = ent.y = 0;
    return ent;
  }
  if (alinhado) ent.atacar = Math.floor(e.quadro / 30) % 4 !== 0 || op.dificuldade > 0.8;
  return ent;
}
