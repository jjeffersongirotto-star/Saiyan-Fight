import { describe, expect, it } from 'vitest';
import * as C from '../src/logica/constantes';
import { FASES, faseDe, ordenarFases } from '../src/dados/fases';
import { fichaDoPersonagem } from '../src/logica/ficha';
import {
  atacarComPadrao, chanceDeParryDoVilao, criarHistoria, entradaDoVilao, passoHistoria, PATRULHA, VILAO_ENTRA_X,
} from '../src/logica/historia';
import { entradaDaIA } from '../src/logica/ia';
import { criarItem, ITEM_INTERVALO, tipoDoSorteio } from '../src/logica/itens';
import { circuloDoParry, limitesX, velocidadeDe } from '../src/logica/luta';
import { AGARRAR_QUADROS, criarMinion, MINION_INTERVALO } from '../src/logica/minions';
import {
  dificilLiberado, encherSaco, faseLiberada, juntarProgresso, ondaDoPasso, padroesDaOnda, parametrosDaOnda, registrarModoCompleto, semLimiteLiberado,
} from '../src/logica/ondas';
import { ENTRADA_VAZIA, type Entrada, type EstadoLuta, type Evento } from '../src/logica/tipos';

const fase = faseDe('kame');
const nova = (modo: 'normal' | 'hard' | 'unlimited' = 'normal', regras: Partial<C.RegrasHistoria> = {}, heroi = 'goku', vilao = 'raditz') =>
  criarHistoria(fichaDoPersonagem(heroi), fichaDoPersonagem(vilao), { ...fase, vilao: { personagem: vilao, nivel: 0 } }, modo, 7, { ...C.REGRAS_HISTORIA, ...regras });
const rodar = (e: EstadoLuta, n: number, ent: Partial<Entrada> = {}) => {
  const ev: Evento[] = [];
  for (let i = 0; i < n; i++) ev.push(...passoHistoria(e, { ...ENTRADA_VAZIA, ...ent }));
  return ev;
};
/** sem minions/itens/ataques atrapalhando o teste */
const calmo = (e: EstadoLuta) => {
  const h = e.historia!;
  h.esperaMinion = -1e9; h.esperaItem = -1e9; h.esperaAtaque = -1e9;
  e.p1.invulneravel = 0;
  return e;
};
const tiroNoVilao = (e: EstadoLuta, dano = 1) =>
  e.tiros.push({ id: e.proximoId++, dono: 'p1', x: e.p2.x, y: e.p2.y, vx: 0, vy: 0, raio: 8, dano, refletido: false, atirador: 'p1' });
const tiroNoHeroi = (e: EstadoLuta) =>
  e.tiros.push({ id: e.proximoId++, dono: 'p2', x: e.p1.x, y: e.p1.y, vx: 0, vy: 0, raio: 8, dano: 1, refletido: false, atirador: 'p2' });
/** derruba o vilão e espera ele sair e o próximo chegar */
const derrubar = (e: EstadoLuta) => {
  e.p2.vida = 1;
  tiroNoVilao(e);
  const ev = rodar(e, 1);
  return ev.concat(rodar(e, 200));
};

describe('ondas e modos (game-logic-core.js)', () => {
  it('parâmetros da onda com teto na 10', () => {
    expect(parametrosDaOnda(1)).toMatchObject({ intervaloTiro: 102, vidaVilao: 4 });
    expect(parametrosDaOnda(1).multVelocidade).toBeCloseTo(0.9, 5);
    expect(parametrosDaOnda(1).agressividade).toBeCloseTo(0.45, 5);
    expect(parametrosDaOnda(10)).toMatchObject({ intervaloTiro: 30, vidaVilao: 13 });
    expect(parametrosDaOnda(25)).toEqual(parametrosDaOnda(10));
  });
  it('padrões liberados na 3, 5, 7 e 9; o saco tem cada um 2 vezes', () => {
    expect(padroesDaOnda(1)).toEqual(['fast', 'triple']);
    expect(padroesDaOnda(9)).toEqual(['fast', 'triple', 'homing', 'spread5', 'pincer', 'burst8']);
    const saco = encherSaco(5, () => 0.3);
    expect(saco.length).toBe(8);
    expect(saco.filter((p) => p === 'spread5').length).toBe(2);
  });
  it('NORMAL 1..5, DIFÍCIL 2,4,6,8,10, SEM LIMITE sem fim', () => {
    expect([0, 1, 2, 3, 4].map((p) => ondaDoPasso('normal', p))).toEqual([1, 2, 3, 4, 5]);
    expect([0, 1, 2, 3, 4].map((p) => ondaDoPasso('hard', p))).toEqual([2, 4, 6, 8, 10]);
    expect(ondaDoPasso('unlimited', 14)).toBe(15);
  });
  it('liberação das fases e dos modos (isStageUnlockedByProgress)', () => {
    const ordem = FASES.map((f) => f.id);
    expect(faseLiberada('kame', ordem, {})).toBe(true);
    expect(faseLiberada('terra', ordem, {})).toBe(false);
    let prog = registrarModoCompleto({}, 'kame', 'normal');
    expect(faseLiberada('terra', ordem, prog)).toBe(true);
    expect(dificilLiberado('kame', prog)).toBe(true);
    expect(semLimiteLiberado('kame', prog)).toBe(false);
    prog = registrarModoCompleto(prog, 'kame', 'hard');
    expect(semLimiteLiberado('kame', prog)).toBe(true);
    expect(registrarModoCompleto(prog, 'kame', 'unlimited')).toBe(prog);
    expect(juntarProgresso({ a: { normalDone: true } }, { a: { hardDone: true }, b: { normalDone: true } }))
      .toEqual({ a: { normalDone: true, hardDone: true }, b: { normalDone: true, hardDone: false } });
  });
  it('11 fases na ordem do antigo; a ordem salva em ARENAS é respeitada', () => {
    expect(FASES.length).toBe(11);
    expect(FASES[0].id).toBe('kame');
    expect(FASES[10].id).toBe('capital_oeste');
    expect(ordenarFases(['namek', 'xx', 'kame']).map((f) => f.id).slice(0, 3)).toEqual(['namek', 'kame', 'terra']);
    expect(faseDe('cell_games').minion).toBe('celljr');
  });
});

describe('começo da fase', () => {
  it('herói com 3 de vida e sem Zenkai; vilão com a vida da onda', () => {
    const e = nova();
    expect(e.p1.vida).toBe(3);
    expect(e.p2.vida).toBe(4);
    expect(e.p1.zenkaiUsada && e.p2.zenkaiUsada).toBe(true);
    expect(nova('hard').p2.vida).toBe(5);
    expect(nova().historia!.onda).toBe(1);
  });
  it('o herói vai até x = 450 (não só até o meio)', () => {
    const e = nova();
    expect(limitesX('p1', 40, true)[1]).toBe(C.HISTORIA_HEROI_MAX_X + 20);
    calmo(e);
    rodar(e, 200, { x: 1 });
    expect(e.p1.x).toBeCloseTo(C.HISTORIA_HEROI_MAX_X + e.p1.l / 2, 3);
  });
  it('vilão na forma da fase (Freeza na Nave começa na terceira forma)', () => {
    const f = faseDe('freeza_ship');
    const e = criarHistoria(fichaDoPersonagem('goku'), fichaDoPersonagem('freeza'), f, 'normal', 1);
    expect(e.p2.nivel).toBe(2);
  });
});

describe('vilão cai, sai voando e volta mais forte', () => {
  it('derrubado por tiro: +5 pontos, herói protegido, próxima onda com mais vida', () => {
    const e = calmo(nova());
    e.p2.vida = 1;
    tiroNoVilao(e);
    const ev = rodar(e, 1);
    expect(ev.find((x) => x.tipo === 'vilaoCaiu')).toMatchObject({ onda: 1, pontos: 5 });
    expect(e.historia!.vilao).toBe('caindo');
    // protegido: tiro do vilão encosta e some sem machucar
    tiroNoHeroi(e);
    rodar(e, 2);
    expect(e.p1.vida).toBe(3);
    let depois: Evento[] = [];
    for (let i = 0; i < 200 && !depois.some((x) => x.tipo === 'novaOnda'); i++) depois = depois.concat(rodar(e, 1));
    expect(depois.find((x) => x.tipo === 'novaOnda')).toMatchObject({ onda: 2, passo: 1, curou: false });
    expect(e.p2.vida).toBe(5);
    expect(e.historia!.vilao).toBe('entrando');
    expect(e.p2.x).toBeGreaterThan(C.TELA_L);
    rodar(e, Math.ceil((VILAO_ENTRA_X - PATRULHA.maxX) / 3) + 2);
    expect(e.historia!.vilao).toBe('lutando');
  });
  it('derrubado pelo especial: +3 pontos', () => {
    const e = calmo(nova());
    e.p2.vida = 2;
    e.p1.ki = C.KI_MAX;
    const ev = rodar(e, 1, { especial: true }).concat(rodar(e, C.ESPECIAL_CHEGA + 2));
    expect(ev.find((x) => x.tipo === 'vilaoCaiu')).toMatchObject({ pontos: 3 });
  });
  it('NORMAL: depois do 5º vilão, fase vencida', () => {
    const e = calmo(nova());
    let ev: Evento[] = [];
    for (let i = 0; i < 5; i++) { ev = derrubar(e); calmo(e); rodar(e, 60); }
    const tudo = ev.concat(rodar(e, C.FIM_RODADA_QUADROS + 5));
    expect(e.historia!.resultado).toBe('vitoria');
    expect(e.fase).toBe('fimPartida');
    expect(e.vencedorPartida).toBe('p1');
    expect(tudo.some((x) => x.tipo === 'faseVencida' || x.tipo === 'fimPartida')).toBe(true);
  });
  it('SEM LIMITE não acaba', () => {
    const e = calmo(nova('unlimited'));
    for (let i = 0; i < 7; i++) { derrubar(e); calmo(e); rodar(e, 60); }
    expect(e.historia!.resultado).toBeNull();
    expect(e.historia!.onda).toBe(8);
  });
  it('herói sem vida: derrota (sem Zenkai)', () => {
    const e = calmo(nova());
    e.p1.vida = 1;
    tiroNoHeroi(e);
    rodar(e, 1);
    expect(e.historia!.resultado).toBe('derrota');
    rodar(e, C.FIM_RODADA_QUADROS + 2);
    expect(e.vencedorPartida).toBe('p2');
  });
  it('cura entre ondas: padrão só no DIFÍCIL, só depois de vencer a ONDA 2/5', () => {
    expect(C.REGRAS_HISTORIA.curaEntreOndas).toEqual({ dificuldades: ['hard'], aPartirDaOnda: 2 });
    const r = C.REGRAS_HISTORIA.curaEntreOndas;
    expect(C.curaEntreOndasAplica(r, 'normal', 2)).toBe(false);
    expect(C.curaEntreOndasAplica(r, 'unlimited', 5)).toBe(false);
    expect(C.curaEntreOndasAplica(r, 'hard', 1)).toBe(false);
    expect(C.curaEntreOndasAplica(r, 'hard', 2)).toBe(true);
    expect(C.curaEntreOndasAplica(r, 'hard', 3)).toBe(true);
    expect(C.curaEntreOndasAplica(false, 'hard', 2)).toBe(false);
  });
  const proteger = (e: EstadoLuta) => { calmo(e); e.p1.invulneravel = 9999; return e; };
  it('no DIFÍCIL: após a 1ª luta (ONDA 1/5) não cura; após a 2ª e as seguintes, +1 vida', () => {
    const e = proteger(nova('hard'));
    e.p1.vida = 2;
    const ev1 = derrubar(e);
    expect(ev1.find((x) => x.tipo === 'novaOnda')).toMatchObject({ passo: 1, curou: false });
    expect(e.p1.vida).toBe(2);
    expect(e.historia!.onda).toBe(4); // 2ª luta = NÍVEL 4
    proteger(e); rodar(e, 60);
    const ev2 = derrubar(e);
    expect(ev2.find((x) => x.tipo === 'novaOnda')).toMatchObject({ passo: 2, curou: true });
    expect(e.p1.vida).toBe(3);
    e.p1.vida = 1;
    proteger(e); rodar(e, 60);
    const ev3 = derrubar(e);
    expect(ev3.find((x) => x.tipo === 'novaOnda')).toMatchObject({ passo: 3, curou: true });
    expect(e.p1.vida).toBe(2);
  });
  it('no DIFÍCIL, vida já no máximo: curou=false e não passa do teto', () => {
    const e = proteger(nova('hard'));
    derrubar(e);
    proteger(e); rodar(e, 60);
    expect(e.p1.vida).toBe(3);
    const ev = derrubar(e);
    expect(ev.find((x) => x.tipo === 'novaOnda')).toMatchObject({ passo: 2, curou: false });
    expect(e.p1.vida).toBe(3);
  });
  it('no NORMAL e no SEM LIMITE, mesmo com vida baixa, não cura', () => {
    for (const modo of ['normal', 'unlimited'] as const) {
      const e = proteger(nova(modo));
      e.p1.vida = 2;
      derrubar(e);
      proteger(e); rodar(e, 60);
      const ev = derrubar(e);
      expect(ev.find((x) => x.tipo === 'novaOnda')).toMatchObject({ curou: false });
      expect(e.p1.vida).toBe(2);
    }
  });
  it('chave desligada: no DIFÍCIL também não cura', () => {
    const e = proteger(nova('hard', { curaEntreOndas: false }));
    e.p1.vida = 2;
    derrubar(e);
    proteger(e); rodar(e, 60);
    derrubar(e);
    expect(e.p1.vida).toBe(2);
  });
});

describe('ataques do vilão (spawnBossAttackPadrao)', () => {
  it('cada padrão solta o número certo de bolas 50% maiores; HOMING persegue o herói', () => {
    const conta: Record<string, number> = { fast: 1, triple: 3, homing: 1, spread5: 5, pincer: 2, burst8: 8 };
    for (const p of Object.keys(conta)) {
      const e = nova();
      e.historia!.saco = [p as never];
      const ev: Evento[] = [];
      atacarComPadrao(e, ev);
      expect(e.tiros.length).toBe(conta[p]);
      expect(e.tiros.every((t) => t.dono === 'p2' && t.doVilao)).toBe(true);
      if (p === 'homing') {
        e.p1.y = 300;
        const t = e.tiros[0];
        t.y = 100;
        for (let i = 0; i < 10; i++) rodar(e, 1);
        expect(t.vy).toBeGreaterThan(0);
      }
    }
  });
  it('ataca no intervalo da onda', () => {
    const e = nova();
    e.p1.invulneravel = 999;
    e.historia!.esperaMinion = -1e9; e.historia!.esperaItem = -1e9;
    const ev = rodar(e, parametrosDaOnda(1).intervaloTiro * 3 + 2);
    expect(ev.filter((x) => x.tipo === 'ataqueVilao').length).toBe(3);
  });
  it('transforma sozinho da onda 3 em diante', () => {
    const e = calmo(nova('normal', {}, 'goku', 'freeza'));
    expect(rodar(e, 400).some((x) => x.tipo === 'transformou' && x.dono === 'p2')).toBe(false);
    const d = calmo(nova('hard', {}, 'goku', 'freeza'));
    d.historia!.onda = 4;
    expect(rodar(d, 400).some((x) => x.tipo === 'transformou' && x.dono === 'p2')).toBe(true);
  });
});

describe('regras novas do vilão (chaves em REGRAS_HISTORIA)', () => {
  it('parry: rebate alguns tiros do herói; com a chave desligada, nunca', () => {
    expect(C.REGRAS_HISTORIA.vilaoUsaParry).toBe(false);
    for (const vilaoUsaParry of [true, false]) {
      const e = calmo(nova('normal', { vilaoUsaParry }));
      let rebateu = 0;
      for (let i = 0; i < 60; i++) {
        e.tiros.length = 0;
        e.p2.esperaParry = 0;
        const c = circuloDoParry(e.p2);
        e.tiros.push({ id: e.proximoId++, dono: 'p1', x: c.x - 20, y: c.y, vx: 7, vy: 0, raio: 8, dano: 1, refletido: false, atirador: 'p1' });
        if (entradaDoVilao(e).parry) rebateu++;
      }
      if (vilaoUsaParry) { expect(rebateu).toBeGreaterThan(0); expect(rebateu).toBeLessThan(30); } else expect(rebateu).toBe(0);
    }
    expect(chanceDeParryDoVilao(0.45)).toBeCloseTo(0.08, 5);
    expect(chanceDeParryDoVilao(1)).toBeCloseTo(0.4, 5);
  });
  it('especial: na onda 3+ depois da última forma junta ki e solta (2 de dano); desligado, nunca', () => {
    for (const vilaoUsaEspecial of [true, false]) {
      const e = calmo(nova('hard', { vilaoUsaEspecial }, 'goku', 'raditz'));
      e.historia!.onda = 6;
      e.p2.nivel = e.p2.alturas.length - 1; // já na última forma
      let ev: Evento[] = [];
      for (let i = 0; i < 2000 && !ev.some((x) => x.tipo === 'especial'); i++) { e.p1.invulneravel = 0; e.tiros.length = 0; ev = ev.concat(rodar(e, 1)); }
      const solto = ev.some((x) => x.tipo === 'especial' && x.dono === 'p2');
      expect(solto).toBe(vilaoUsaEspecial);
      if (solto) {
        const dano = rodar(e, C.ESPECIAL_CHEGA + 2).find((x) => x.tipo === 'acerto' && x.alvo === 'p1');
        expect(dano).toMatchObject({ dano: C.VILAO_ESPECIAL_DANO, deEspecial: true });
      }
    }
  });
  it('agressividade real: o vilão chega mais perto nas ondas altas', () => {
    const minX = (onda: number, agressividadeReal: boolean) => {
      const e = calmo(nova('unlimited', { agressividadeReal }));
      e.historia!.onda = onda;
      let m = 9999;
      for (let i = 0; i < 3000; i++) { rodar(e, 1); e.p1.invulneravel = 999; e.tiros.length = 0; e.minions.length = 0; m = Math.min(m, e.p2.x); }
      return m;
    };
    expect(minX(10, true)).toBeLessThan(PATRULHA.minX - 60);
    expect(minX(10, false)).toBeGreaterThanOrEqual(PATRULHA.minX - 1);
  });
  it('o vilão não fica invulnerável depois de apanhar (como no antigo)', () => {
    const e = calmo(nova());
    tiroNoVilao(e);
    rodar(e, 1);
    expect(e.p2.vida).toBe(3);
    expect(e.p2.invulneravel).toBe(0);
    tiroNoVilao(e);
    rodar(e, 1);
    expect(e.p2.vida).toBe(2);
  });
});

describe('minions (Saibaman / Cell Jr.)', () => {
  const comMinion = (e: EstadoLuta) => {
    const m = criarMinion(e.proximoId++, e.p1.x, e.p1.y, 2);
    m.fase = 'voar';
    m.y = e.p1.y;
    e.minions.push(m);
    return m;
  };
  it('nasce a cada 300 quadros, brota, salta e voa para a esquerda', () => {
    const e = calmo(nova());
    e.historia!.esperaMinion = 0;
    e.p1.invulneravel = 999;
    const ev = rodar(e, MINION_INTERVALO + 1);
    expect(ev.some((x) => x.tipo === 'minionNasceu')).toBe(true);
    const m = e.minions[0];
    expect(m.fase).toBe('brotar');
    rodar(e, 80);
    expect(['saltar', 'voar']).toContain(m.fase);
  });
  it('agarra o herói e explode em 40 quadros (tira 1); invulnerável não é agarrado', () => {
    const e = calmo(nova());
    const m = comMinion(e);
    expect(rodar(e, 1).some((x) => x.tipo === 'minionAgarrou')).toBe(true);
    expect(m.agarrando).toBe('p1');
    const ev = rodar(e, AGARRAR_QUADROS + 1);
    expect(ev.find((x) => x.tipo === 'minionExplodiu')).toMatchObject({ machucou: true });
    expect(e.p1.vida).toBe(2);
    const f = calmo(nova());
    f.p1.invulneravel = 999;
    comMinion(f);
    expect(rodar(f, 1).some((x) => x.tipo === 'minionAgarrou')).toBe(false);
  });
  it('CARREGAR arremessa (fraco); PARRY arremessa forte até o vilão, que perde 1', () => {
    const e = calmo(nova());
    const m = comMinion(e);
    rodar(e, 1);
    expect(rodar(e, 1, { carregar: true }).find((x) => x.tipo === 'minionArremessado')).toMatchObject({ forte: false });
    expect(m.fase).toBe('arremessado');
    const f = calmo(nova());
    comMinion(f);
    rodar(f, 1);
    f.p2.y = f.p1.y; f.historia!.alvoX = f.p2.x; f.historia!.alvoTempo = 1e9; f.historia!.vy = 0.0001;
    expect(rodar(f, 1, { parry: true }).find((x) => x.tipo === 'minionArremessado')).toMatchObject({ forte: true });
    let ev: Evento[] = [];
    for (let i = 0; i < 80 && !ev.some((x) => x.tipo === 'minionExplodiu'); i++) { f.p2.y = f.p1.y; ev = ev.concat(rodar(f, 1)); }
    expect(ev.some((x) => x.tipo === 'acerto' && x.alvo === 'p2')).toBe(true);
    expect(f.p2.vida).toBe(3);
  });
  it('TRANSFORMAR arremessa para longe (regra nova); ESPECIAL destrói (+1 ponto)', () => {
    const e = calmo(nova());
    comMinion(e);
    rodar(e, 1);
    e.p1.ki = C.KI_MAX;
    expect(rodar(e, 1, { transformar: true }).find((x) => x.tipo === 'transformou')).toMatchObject({ arremessados: 1 });
    const f = calmo(nova());
    comMinion(f);
    rodar(f, 1);
    f.p1.ki = C.KI_MAX;
    expect(rodar(f, 1, { especial: true }).find((x) => x.tipo === 'especial')).toMatchObject({ agarradosDestruidos: 1 });
    expect(f.minions.length).toBe(0);
    expect(f.historia!.pontos).toBe(1);
  });
  it('2 tiros do herói derrubam um minion (+1 ponto)', () => {
    const e = calmo(nova());
    e.p1.invulneravel = 999;
    const m = criarMinion(e.proximoId++, 300, e.p1.y, 0);
    m.fase = 'voar';
    m.velocidade = 0;
    m.y = e.p1.y - 6;
    e.minions.push(m);
    let ev: Evento[] = [];
    for (let i = 0; i < 120 && e.minions.length; i++) ev = ev.concat(rodar(e, 1, { atacar: i % 2 === 0 }));
    expect(ev.filter((x) => x.tipo === 'minionAcertado').length).toBe(2);
    expect(e.historia!.pontos).toBe(1);
  });
});

describe('itens', () => {
  it('pesos do sorteio', () => {
    expect([0, 0.4, 0.7, 0.9].map(tipoDoSorteio)).toEqual(['senzu', 'capsula', 'nuvem', 'bastao']);
  });
  it('caem do céu no lado do herói; pegar aplica o efeito', () => {
    const e = calmo(nova());
    e.historia!.esperaItem = ITEM_INTERVALO - 1;
    expect(rodar(e, 1).some((x) => x.tipo === 'itemNasceu')).toBe(true);
    const it = e.historia!.itens[0];
    expect(it.x).toBeLessThan(450);
    for (const tipo of ['senzu', 'capsula', 'nuvem', 'bastao'] as const) {
      const f = calmo(nova());
      f.p1.vida = 2;
      f.historia!.itens.push({ ...criarItem(1, [0, 0, 0]), tipo, x: f.p1.x, y: f.p1.y });
      const ev = rodar(f, 1);
      expect(ev.find((x) => x.tipo === 'item')).toMatchObject({ item: tipo });
      if (tipo === 'senzu') expect(f.p1.vida).toBe(3);
      if (tipo === 'capsula') {
        expect(f.p1.escudo).toBe(true);
        tiroNoHeroi(f);
        expect(rodar(f, 1).some((x) => x.tipo === 'escudo')).toBe(true);
        expect(f.p1.vida).toBe(2);
        expect(f.p1.escudo).toBe(false);
      }
      if (tipo === 'nuvem') expect(velocidadeDe(f.p1)).toBeCloseTo(C.VELOCIDADE * C.NUVEM_VELOCIDADE, 5);
      if (tipo === 'bastao') {
        rodar(f, 1, { atacar: true });
        expect(f.tiros.find((t) => t.dono === 'p1')!.dano).toBe(2);
      }
    }
  });
  it('bastão + especial = SUPER ATAQUE (dano x2)', () => {
    const e = calmo(nova('hard'));
    e.p2.vida = 10;
    e.p1.bastao = 100;
    e.p1.ki = C.KI_MAX;
    const ev = rodar(e, 1, { especial: true }).concat(rodar(e, C.ESPECIAL_CHEGA + 2));
    expect(ev.find((x) => x.tipo === 'acerto' && x.alvo === 'p2')).toMatchObject({ dano: C.ESPECIAL_DANO * 2 });
  });
  it('nuvem e bastão: 8 s por item, no máximo 20 s', () => {
    const e = calmo(nova());
    for (let i = 0; i < 4; i++) e.historia!.itens.push({ ...criarItem(i, [0.9, 0, 0]), x: e.p1.x, y: e.p1.y });
    rodar(e, 1);
    expect(e.p1.bastao).toBe(C.ITEM_DURACAO_MAX); // 4 x 480 passaria de 1200
  });
});

describe('lições do jogo antigo', () => {
  it('teclado: apertar ATAQUE sem parar não passa de 1 tiro a cada 11 quadros', () => {
    const e = calmo(nova());
    e.p1.invulneravel = 999;
    let tiros = 0;
    for (let i = 0; i < 120; i++) tiros += rodar(e, 1, { atacar: i % 2 === 0 }).filter((x) => x.tipo === 'tiro' && x.dono === 'p1').length;
    expect(tiros).toBeLessThanOrEqual(Math.ceil(120 / C.TIRO_INTERVALO));
  });
  it('depois que o vilão cai, o herói não perde mais (nem com tiro atrasado nem minion explodindo)', () => {
    const e = calmo(nova());
    e.p1.vida = 1;
    const m = criarMinion(e.proximoId++, e.p1.x, e.p1.y, 2);
    m.fase = 'voar';
    e.minions.push(m);
    rodar(e, 1);
    e.p2.vida = 1;
    tiroNoVilao(e);
    tiroNoHeroi(e);
    rodar(e, 200);
    expect(e.p1.vida).toBe(1);
    expect(e.historia!.resultado).toBeNull();
  });
});

describe('simulação: CPU jogando a fase inteira', () => {
  it.each(FASES.map((f) => [f.id] as const))('%s termina sem travar', (id) => {
    const f = faseDe(id);
    const e = criarHistoria(fichaDoPersonagem('goku'), fichaDoPersonagem(f.vilao.personagem), f, 'normal', 3);
    let q = 0;
    for (; q < 60 * 60 * 6 && e.fase !== 'fimPartida'; q++) passoHistoria(e, entradaDaIA(e, 'p1', { dificuldade: 0.9 }));
    expect(['vitoria', 'derrota', null]).toContain(e.historia!.resultado);
    expect(Number.isFinite(e.p2.x) && Number.isFinite(e.p2.y)).toBe(true);
  });
});

describe('desenho dos minions', () => {
  it('cada fase usa a célula certa da tira (8 poses do jogo antigo)', async () => {
    const { poseDoMinion, criarMinion: cm, MINION_POSES } = await import('../src/logica/minions');
    expect(MINION_POSES.length).toBe(8);
    const m = cm(1, 300, 200, 2);
    expect(poseDoMinion(m, 0)).toMatchObject({ celula: 0, afundado: 1 });
    m.fase = 'voar';
    const voo = new Set([0, 8, 16, 24, 32].map((q) => poseDoMinion(m, q).celula));
    expect([...voo].sort()).toEqual([1, 2, 3, 4]);
    m.fase = 'arremessado'; m.vx = 15;
    expect(poseDoMinion(m, 0)).toMatchObject({ celula: 7, espelhar: true });
    m.fase = 'agarrar';
    expect(poseDoMinion(m, 0).celula).toBe(6);
  });
});

describe('ajustes da noite (itens no chão, rótulo da onda)', () => {
  it('com itemPousaNoChao o item para no chão, fica ITEM_NO_CHAO quadros e some', async () => {
    const { moverItem, ITEM_Y_CHAO } = await import('../src/logica/itens');
    const it = { ...criarItem(1, [0, 0.5, 0]), y: ITEM_Y_CHAO - 1 };
    let q = 0;
    while (!moverItem(it, true) && q < 1000) q++;
    expect(it.y).toBe(ITEM_Y_CHAO);
    expect(q).toBeGreaterThanOrEqual(C.ITEM_NO_CHAO - 2);
    const antigo = { ...criarItem(2, [0, 0.5, 0]), y: ITEM_Y_CHAO - 1 };
    let n = 0;
    while (!moverItem(antigo, false) && n < 1000) n++;
    expect(antigo.y).toBeGreaterThan(C.TELA_A); // como no antigo: atravessa o chão
    expect(n).toBeLessThan(80);
  });
  it('herói pega o item parado no chão', () => {
    const e = calmo(nova());
    e.historia!.itens.push({ ...criarItem(9, [0.1, 0, 0]), x: e.p1.x, y: C.CHAO_Y - 12, noChao: 30 });
    e.p1.y = C.CHAO_Y - e.p1.a / 2;
    rodar(e, 2);
    expect(e.historia!.itens.length).toBe(0);
  });
  it('rótulo: NORMAL "ONDA 3/5", DIFÍCIL com o nível real, SEM LIMITE sem total', async () => {
    const { rotuloDaOnda } = await import('../src/logica/ondas');
    expect(rotuloDaOnda('normal', 2, 3)).toBe('ONDA 3/5');
    expect(rotuloDaOnda('hard', 2, 6)).toBe('ONDA 3/5 · NÍVEL 6');
    expect(rotuloDaOnda('unlimited', 6, 7)).toBe('ONDA 7');
  });
});
