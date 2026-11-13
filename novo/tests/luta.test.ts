import { describe, expect, it } from 'vitest';
import * as C from '../src/logica/constantes';
import { fichaDoPersonagem } from '../src/logica/ficha';
import { bonusDoComboDeParry, centroDoParry, circuloDoParry, criarLuta, danoDoChoque, escalaDaAltura, limitesX, passoLuta, registrarRodada, tiroAcerta, velocidadeDe } from '../src/logica/luta';
import { ARREMESSO_ATORDOADO, ARREMESSO_VX, ARREMESSO_VY, criarMinion, podeSerAgarrado } from '../src/logica/minions';
const agarrado = (x: number, y: number, agarrando: 'p1' | 'p2' | null) => ({ ...criarMinion(0, x, y, 2), x, y, agarrando, fase: agarrando ? ('agarrar' as const) : ('voar' as const) });
import { poseDoLutador } from '../src/logica/animacao';
import { ENTRADA_VAZIA, type Entrada, type EstadoLuta, type Evento, type IdJogador } from '../src/logica/tipos';

const nada = (): Entrada => ({ ...ENTRADA_VAZIA });
const rodar = (e: EstadoLuta, n: number, p1: Partial<Entrada> = {}, p2: Partial<Entrada> = {}) => {
  const ev: Evento[] = [];
  for (let i = 0; i < n; i++) ev.push(...passoLuta(e, { p1: { ...nada(), ...p1 }, p2: { ...nada(), ...p2 } }));
  return ev;
};
const luta = (a = 'goku', b = 'vegeta', semente = 1) => criarLuta(fichaDoPersonagem(a), fichaDoPersonagem(b), semente);
/** os dois na mesma altura e sem a proteção do começo da rodada */
const alinhar = (e: EstadoLuta) => {
  e.p1.y = e.p2.y = 200;
  e.p1.invulneravel = e.p2.invulneravel = 0;
};

describe('luta VERSUS: básico', () => {
  it('começa com 4 de vida, ki zerado, forma normal, um olhando para o outro', () => {
    const e = luta();
    expect([e.p1.vida, e.p2.vida]).toEqual([C.VIDA_VERSUS, C.VIDA_VERSUS]);
    expect([e.p1.olhando, e.p2.olhando]).toEqual([1, -1]);
    expect([e.p1.ki, e.p1.nivel]).toEqual([0, 0]);
  });

  it('cada jogador fica na sua metade da tela', () => {
    const e = luta();
    rodar(e, 300, { x: 1 }, { x: -1 });
    expect(e.p1.x).toBeLessThanOrEqual(limitesX('p1', e.p1.l)[1]);
    expect(e.p2.x).toBeGreaterThanOrEqual(limitesX('p2', e.p2.l)[0]);
  });

  it('os dois andam na mesma velocidade (4,5) e a diagonal não é mais rápida', () => {
    const e = luta();
    e.p1.y = e.p2.y = 200;
    const a = { x: e.p1.x, y: e.p1.y }, b = { x: e.p2.x, y: e.p2.y };
    rodar(e, 1, { x: 1, y: 1 }, { x: -1 });
    expect(Math.hypot(e.p1.x - a.x, e.p1.y - a.y)).toBeCloseTo(C.VELOCIDADE, 5);
    expect(Math.abs(e.p2.x - b.x)).toBeCloseTo(C.VELOCIDADE, 5);
  });

  it('segurando ATAQUE sai ~5 tiros por segundo', () => {
    const e = luta();
    const tiros = rodar(e, 60, { atacar: true }).filter((x) => x.tipo === 'tiro').length;
    expect(tiros).toBeGreaterThanOrEqual(5);
    expect(tiros).toBeLessThanOrEqual(6);
  });

  it('o tiro tira 1 de vida e dá 30 quadros de invulnerabilidade', () => {
    const e = luta();
    alinhar(e);
    let ev: Evento[] = [];
    for (let i = 0; i < 300 && !ev.length; i++) ev = rodar(e, 1, { atacar: true }).filter((x) => x.tipo === 'acerto');
    expect(ev[0]).toMatchObject({ alvo: 'p2', dano: 1, deEspecial: false });
    expect(e.p2.vida).toBe(C.VIDA_VERSUS - 1);
    expect(e.p2.invulneravel).toBe(C.INVULNERAVEL_QUADROS);
  });

  it('carregar enche o ki a 0,8 por quadro, parado', () => {
    const e = luta();
    const x0 = e.p1.x;
    rodar(e, 50, { carregar: true, x: 1 });
    expect(e.p1.ki).toBeCloseTo(40, 5);
    expect(e.p1.x).toBe(x0);
    const ev = rodar(e, 80, { carregar: true });
    expect(e.p1.ki).toBe(C.KI_MAX);
    expect(ev.filter((x) => x.tipo === 'kiCheio').length).toBe(1);
  });

  it('sem carregar o ki não sobe sozinho', () => {
    const e = luta();
    rodar(e, 300);
    expect(e.p1.ki).toBe(0);
  });

  it('colisão círculo x caixa', () => {
    const l = { x: 100, y: 100, l: C.LUTADOR_L, a: C.LUTADOR_A };
    expect(tiroAcerta({ x: 100, y: 100, raio: 8 }, l)).toBe(true);
    expect(tiroAcerta({ x: 100 + C.LUTADOR_L / 2 + 7, y: 100, raio: 8 }, l)).toBe(true);
    expect(tiroAcerta({ x: 100 + C.LUTADOR_L / 2 + 9, y: 100, raio: 8 }, l)).toBe(false);
  });

  it('é determinística: a mesma semente e as mesmas entradas dão a mesma luta', () => {
    const a = luta('goku', 'vegeta', 42), b = luta('goku', 'vegeta', 42);
    rodar(a, 400, { atacar: true, y: -0.5 }, { atacar: true, carregar: false });
    rodar(b, 400, { atacar: true, y: -0.5 }, { atacar: true, carregar: false });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('parry (tryReflect)', () => {
  it('na hora do aperto devolve os tiros que estão no círculo, mais rápidos e retos', () => {
    const e = luta();
    alinhar(e);
    rodar(e, 1, { atacar: true });
    const t = e.tiros[0];
    // traz o tiro para perto do peito do P2
    t.x = e.p2.x - 30;
    t.y = e.p2.y - e.p2.a * 0.3;
    const ev = rodar(e, 1, {}, { parry: true });
    expect(ev.find((x) => x.tipo === 'parry')).toMatchObject({ dono: 'p2', refletidos: 1 });
    expect(t.dono).toBe('p2');
    expect(t.vx).toBeLessThan(0);
    expect(Math.abs(t.vx)).toBeGreaterThan(C.TIRO_VELOCIDADE * C.PARRY_REFLEXO_VEL - 0.01);
    expect(t.vy).toBe(0);
  });

  it('parry no vazio: espera de 30 quadros antes de tentar de novo', () => {
    const e = luta();
    rodar(e, 1, { parry: true });
    expect(e.p1.esperaParry).toBe(C.PARRY_ERROU_ESPERA);
    expect(rodar(e, 10, { parry: true }).some((x) => x.tipo === 'parry')).toBe(false);
  });
});

describe('especial e choque de raios', () => {
  it('só sai com o ki cheio, gasta o ki, limpa os tiros e acerta 3 quando chega (mesmo desalinhado)', () => {
    const e = luta();
    alinhar(e);
    e.p2.y = 120; // desalinhado: o especial acerta igual (como no jogo antigo)
    expect(rodar(e, 1, { especial: true }).some((x) => x.tipo === 'especial')).toBe(false);
    rodar(e, 12); // deixa o pedido antigo expirar (gatilho guardado por 8 quadros)
    rodar(e, 1, { atacar: true });
    e.p1.ki = C.KI_MAX;
    e.p2.invulneravel = 0;
    const ev = rodar(e, 1, { especial: true });
    expect(ev.some((x) => x.tipo === 'especial')).toBe(true);
    expect(e.p1.ki).toBe(0);
    expect(e.tiros.length).toBe(0);
    const depois = rodar(e, C.ESPECIAL_CHEGA + 2);
    expect(depois.find((x) => x.tipo === 'acerto')).toMatchObject({ alvo: 'p2', dano: C.ESPECIAL_DANO, deEspecial: true });
    expect(e.p2.vida).toBe(C.VIDA_VERSUS - C.ESPECIAL_DANO);
  });

  it('o sol do Freeza demora mais para chegar', () => {
    const e = luta('freeza', 'goku');
    alinhar(e);
    e.p1.ki = C.KI_MAX;
    rodar(e, 1, { especial: true });
    expect(rodar(e, C.ESPECIAL_CHEGA + 2).some((x) => x.tipo === 'acerto')).toBe(false);
    expect(rodar(e, C.SOL_CHEGA).some((x) => x.tipo === 'acerto' && x.alvo === 'p2')).toBe(true);
  });

  it('respondendo com o especial antes do raio chegar vira CHOQUE; quem aperta mais ATAQUE machuca mais', () => {
    const e = luta();
    alinhar(e);
    e.p1.ki = e.p2.ki = C.KI_MAX;
    rodar(e, 1, { especial: true });
    rodar(e, 5);
    const ev = rodar(e, 1, {}, { especial: true });
    expect(ev.some((x) => x.tipo === 'choque')).toBe(true);
    expect(e.choque).not.toBeNull();
    expect(e.p2.ki).toBe(0);
    // P1 aperta (sobe e desce) a cada 2 quadros, P2 não aperta
    let fim: Evento | undefined;
    for (let i = 0; i < C.CHOQUE_DURACAO + 2 && !fim; i++) fim = rodar(e, 1, { atacar: i % 2 === 0 }).find((x) => x.tipo === 'fimChoque');
    expect(fim).toMatchObject({ tipo: 'fimChoque', dano: { p1: 1, p2: 3 } });
    expect(e.choque).toBeNull();
  });

  it('dano do choque (resolveClashDamage)', () => {
    expect(danoDoChoque(0)).toEqual({ p1: 1, p2: 1 });
    expect(danoDoChoque(1)).toEqual({ p1: 1, p2: 3 });
    expect(danoDoChoque(-1)).toEqual({ p1: 3, p2: 1 });
  });
});

describe('transformação', () => {
  it('com o ki cheio sobe um nível, zera o ki e dá +1 de velocidade por 15 s', () => {
    const e = luta();
    e.p1.ki = C.KI_MAX;
    const ev = rodar(e, 1, { transformar: true });
    expect(ev.find((x) => x.tipo === 'transformou')).toMatchObject({ dono: 'p1', nivel: 1 });
    expect(e.p1.ki).toBe(0);
    expect(velocidadeDe(e.p1)).toBe(C.VELOCIDADE + 1);
    rodar(e, C.PODER_TRANSFORMACAO_QUADROS);
    expect(velocidadeDe(e.p1)).toBe(C.VELOCIDADE);
    expect(e.p1.nivel).toBe(1); // continua transformado
  });

  it('sem ki cheio não transforma; na última forma também não', () => {
    const e = luta('raditz', 'goku'); // Raditz só tem a forma normal
    e.p1.ki = C.KI_MAX;
    expect(rodar(e, 1, { transformar: true }).some((x) => x.tipo === 'transformou')).toBe(false);
    const g = luta('goku', 'vegeta');
    g.p1.ki = 50;
    expect(rodar(g, 1, { transformar: true }).some((x) => x.tipo === 'transformou')).toBe(false);
  });

  it('o Goku passa pelas 6 formas, uma por vez', () => {
    const e = luta();
    for (let n = 1; n <= 5; n++) {
      e.p1.ki = C.KI_MAX;
      rodar(e, 1, { transformar: true });
      rodar(e, C.TRANSFORMANDO_QUADROS + 1);
      expect(e.p1.nivel).toBe(n);
    }
    e.p1.ki = C.KI_MAX;
    expect(rodar(e, 1, { transformar: true }).some((x) => x.tipo === 'transformou')).toBe(false);
  });

  it('a caixa muda com a altura da forma, mantendo os pés no lugar (Freeza 1ª forma 132 cm -> 2ª 221 cm)', () => {
    const e = luta('freeza', 'goku');
    const pes = e.p1.y + e.p1.a / 2;
    const a0 = e.p1.a;
    e.p1.ki = C.KI_MAX;
    rodar(e, 1, { transformar: true });
    expect(e.p1.a).toBeCloseTo(C.LUTADOR_A * escalaDaAltura(221), 5);
    expect(e.p1.a).toBeGreaterThan(a0);
    expect(e.p1.y + e.p1.a / 2).toBeCloseTo(pes, 5);
  });

  it('escala da altura: 175 cm = 1, limitada entre 0,75 e 1,4', () => {
    expect(escalaDaAltura(175)).toBe(1);
    expect(escalaDaAltura(100)).toBe(0.75);
    expect(escalaDaAltura(300)).toBe(1.4);
  });

  it('a rodada nova volta à forma normal', () => {
    const e = luta();
    alinhar(e);
    e.p1.ki = C.KI_MAX;
    rodar(e, 1, { transformar: true });
    e.p2.vida = 1;
    e.p2.zenkaiUsada = true;
    let nova = false;
    for (let i = 0; i < 600 && !nova; i++) nova = rodar(e, 1, { atacar: e.fase === 'luta' }).some((x) => x.tipo === 'novaRodada');
    expect(nova).toBe(true);
    expect(e.p1.nivel).toBe(0);
    expect(e.p1.poder).toBe(0);
  });
});

describe('Zenkai, rodadas e partida', () => {
  it('Zenkai: a 1ª vez que cairia volta com 1 de vida e 90 quadros invulnerável; só uma vez por partida', () => {
    const e = luta();
    alinhar(e);
    e.p2.vida = 1;
    let ev = rodar(e, 120, { atacar: true });
    expect(ev.some((x) => x.tipo === 'zenkai' && x.dono === 'p2')).toBe(true);
    expect(e.p2.zenkaiUsada).toBe(true);
    expect(e.fase).toBe('luta');
    // a Zenkai não volta na rodada seguinte
    e.p2.vida = 1;
    e.p2.invulneravel = 0;
    ev = rodar(e, 120, { atacar: true });
    expect(ev.some((x) => x.tipo === 'zenkai')).toBe(false);
    expect(ev.some((x) => x.tipo === 'fimRodada' && x.vencedor === 'p1')).toBe(true);
    let nova = false;
    for (let i = 0; i < 300 && !nova; i++) nova = rodar(e, 1).some((x) => x.tipo === 'novaRodada');
    expect(e.p2.zenkaiUsada).toBe(true);
  });

  it('o vencedor da rodada não apanha mais depois que o outro caiu', () => {
    const e = luta();
    alinhar(e);
    e.p2.vida = 1;
    e.p2.zenkaiUsada = true;
    rodar(e, 120, { atacar: true }, { atacar: true });
    expect(e.fase).toBe('fimRodada');
    const v = e.vencedorRodada!;
    const vida = e[v].vida;
    const ev = rodar(e, 60, { atacar: true }, { atacar: true });
    expect(e[v].vida).toBe(vida);
    expect(ev.some((x) => x.tipo === 'tiro')).toBe(false);
  });

  it('melhor de 3', () => {
    expect(registrarRodada({ p1: 0, p2: 0 }, 'p1')).toEqual({ placar: { p1: 1, p2: 0 }, partida: null });
    expect(registrarRodada({ p1: 1, p2: 1 }, 'p2')).toEqual({ placar: { p1: 1, p2: 2 }, partida: 'p2' });
    expect(registrarRodada({ p1: 1, p2: 0 }, null)).toEqual({ placar: { p1: 1, p2: 0 }, partida: null });
  });

  it('2 rodadas vencidas = fimPartida', () => {
    const e = luta();
    e.p2.zenkaiUsada = true;
    const ate = (tipo: string) => {
      for (let i = 0; i < 600; i++) {
        const achou = rodar(e, 1, { atacar: e.fase === 'luta' }).find((x) => x.tipo === tipo);
        if (achou) return achou;
      }
      return undefined;
    };
    alinhar(e);
    e.p2.vida = 1;
    expect(ate('novaRodada')).toBeDefined();
    expect(e.p2.vida).toBe(C.VIDA_VERSUS);
    alinhar(e);
    e.p2.vida = 1;
    expect(ate('fimPartida')).toMatchObject({ vencedor: 'p1' });
    expect(e.placar).toEqual({ p1: 2, p2: 0 });
  });

  it('os dois caindo juntos é empate', () => {
    const e = luta();
    e.p1.vida = e.p2.vida = 0;
    expect(rodar(e, 1).find((x) => x.tipo === 'fimRodada')).toMatchObject({ vencedor: null });
    expect(e.placar).toEqual({ p1: 0, p2: 0 });
  });

  it('gatilho guardado: ESPECIAL apertado na pose de transformar sai logo depois; aperto velho demais não', () => {
    const e = luta();
    e.p1.invulneravel = 0;
    e.p1.ki = C.KI_MAX;
    e.p1.acao = 'transformando'; // a única trava que sobrou (apanhar não trava mais)
    e.p1.acaoQuadros = C.TRANSFORMANDO_QUADROS - 4;
    expect(rodar(e, 1, { especial: true }).concat(rodar(e, 6)).some((x) => x.tipo === 'especial')).toBe(true);
    const f = luta();
    rodar(f, 1, { especial: true });
    rodar(f, C.GUARDA_GATILHO + 1);
    f.p1.ki = C.KI_MAX;
    expect(rodar(f, 1).some((x) => x.tipo === 'especial')).toBe(false);
  });
});

describe('chaves das diferenças (REGRAS) — regra antiga quando desligada', () => {
  const antiga = (mudar: Partial<C.Regras>, a = 'goku', b = 'vegeta') => criarLuta(fichaDoPersonagem(a), fichaDoPersonagem(b), 1, { ...C.REGRAS_NOVAS, ...mudar });

  it('o jogo usa as regras novas por padrão', () => {
    expect(luta().regras).toEqual(C.REGRAS_NOVAS);
    expect(C.REGRAS).toEqual(C.REGRAS_NOVAS);
  });

  it('j2IgualAoJ1 = false: J2 anda a 4, não fica invulnerável depois de apanhar e não ganha velocidade ao transformar', () => {
    const e = antiga({ j2IgualAoJ1: false });
    alinhar(e);
    const x0 = e.p2.x;
    rodar(e, 1, {}, { x: -1 });
    expect(x0 - e.p2.x).toBeCloseTo(C.VELOCIDADE_J2_ANTIGA, 5);
    let ev: Evento[] = [];
    for (let i = 0; i < 300 && !ev.length; i++) ev = rodar(e, 1, { atacar: true }).filter((x) => x.tipo === 'acerto');
    expect(e.p2.invulneravel).toBe(0);
    e.tiros.length = 0; // sem invulnerabilidade, os outros tiros no ar continuariam acertando
    rodar(e, C.ATINGIDO_QUADROS + 1);
    e.p2.ki = C.KI_MAX;
    rodar(e, 1, {}, { transformar: true });
    expect(e.p2.nivel).toBe(1);
    expect(velocidadeDe(e.p2, e.regras)).toBe(C.VELOCIDADE_J2_ANTIGA);
    expect(velocidadeDe(e.p1, e.regras)).toBe(C.VELOCIDADE); // o J1 não muda
  });

  it('danoDoEspecialNaChegada = false: o dano entra no disparo e responder com o raio na tela ainda vira choque', () => {
    const e = antiga({ danoDoEspecialNaChegada: false });
    alinhar(e);
    e.p1.ki = e.p2.ki = C.KI_MAX;
    const ev = rodar(e, 1, { especial: true });
    expect(ev.find((x) => x.tipo === 'acerto')).toMatchObject({ alvo: 'p2', dano: C.ESPECIAL_DANO });
    rodar(e, C.ESPECIAL_CHEGA + 5); // depois de onde a regra nova já não deixaria responder
    e.p2.acao = 'livre';
    expect(rodar(e, 1, {}, { especial: true }).some((x) => x.tipo === 'choque')).toBe(true);
  });

  it('transformacaoTravaMovimento = false: anda durante a pose de transformar', () => {
    const trava = luta(), solta = antiga({ transformacaoTravaMovimento: false });
    const ys = [trava, solta].map((e) => {
      e.p1.y = 200;
      e.p1.ki = C.KI_MAX;
      rodar(e, 1, { transformar: true });
      const y0 = e.p1.y;
      rodar(e, 5, { y: -1 });
      expect(e.p1.acao).toBe('transformando');
      return y0 - e.p1.y;
    });
    expect(ys[0]).toBe(0);
    expect(ys[1]).toBeCloseTo(5 * (C.VELOCIDADE + 1), 5);
  });

  it('guardaGatilho = false: ESPECIAL apertado na pose de transformar se perde', () => {
    const e = antiga({ guardaGatilho: false });
    e.p1.invulneravel = 0;
    e.p1.ki = C.KI_MAX;
    e.p1.acao = 'transformando'; // a única trava que sobrou (apanhar não trava mais)
    e.p1.acaoQuadros = C.TRANSFORMANDO_QUADROS - 4;
    expect(rodar(e, 1, { especial: true }).concat(rodar(e, 6)).some((x) => x.tipo === 'especial')).toBe(false);
    expect(rodar(e, 1, { especial: true }).some((x) => x.tipo === 'especial')).toBe(true);
  });
});

describe('regra nova: invulnerável na pose de transformar', () => {
  const transformando = () => {
    const e = luta();
    alinhar(e);
    e.p2.ki = C.KI_MAX;
    rodar(e, 1, {}, { transformar: true });
    expect(e.p2.acao).toBe('transformando');
    return e;
  };

  it('tiro encosta e some, sem dano', () => {
    const e = transformando();
    rodar(e, 1, { atacar: true });
    const t = e.tiros[0];
    t.x = e.p2.x - 10; t.y = e.p2.y; t.vy = 0;
    const ev = rodar(e, 1);
    expect(ev.some((x) => x.tipo === 'acerto')).toBe(false);
    expect(e.tiros.length).toBe(0);
    expect(e.p2.vida).toBe(C.VIDA_VERSUS);
  });

  it('especial que chega durante a pose não machuca; depois da pose volta a machucar', () => {
    const e = transformando();
    e.p1.ki = C.KI_MAX;
    rodar(e, 1, { especial: true });
    const ev = rodar(e, C.ESPECIAL_CHEGA + 1);
    expect(e.p2.acao).toBe('transformando'); // 18 quadros < 45 da pose
    expect(ev.some((x) => x.tipo === 'acerto')).toBe(false);
    expect(e.p2.vida).toBe(C.VIDA_VERSUS);
    rodar(e, C.TRANSFORMANDO_QUADROS + C.ESPECIAL_DURACAO);
    expect(e.p2.acao).toBe('livre');
    e.p1.ki = C.KI_MAX;
    rodar(e, 1, { especial: true });
    expect(rodar(e, C.ESPECIAL_CHEGA + 1).some((x) => x.tipo === 'acerto' && x.alvo === 'p2')).toBe(true);
  });

  it('também vale com o dano do especial na hora (regra antiga do dano)', () => {
    const e = criarLuta(fichaDoPersonagem('goku'), fichaDoPersonagem('vegeta'), 1, { ...C.REGRAS_NOVAS, danoDoEspecialNaChegada: false });
    alinhar(e);
    e.p2.ki = C.KI_MAX;
    rodar(e, 1, {}, { transformar: true });
    e.p1.ki = C.KI_MAX;
    expect(rodar(e, 1, { especial: true }).some((x) => x.tipo === 'acerto')).toBe(false);
  });

  it('ao transformar, os minions agarrados são arremessados para longe (gancho da Fase 3)', () => {
    const e = luta();
    e.p1.ki = C.KI_MAX;
    e.minions.push(
      agarrado(e.p1.x + 15, e.p1.y, 'p1'),
      agarrado(e.p1.x - 15, e.p1.y, 'p1'),
      agarrado(e.p1.x + 200, e.p1.y, null),
    );
    const ev = rodar(e, 1, { transformar: true });
    expect(ev.find((x) => x.tipo === 'transformou')).toMatchObject({ arremessados: 2 });
    const [a, b, c] = e.minions;
    expect(a).toMatchObject({ agarrando: null, vx: ARREMESSO_VX, vy: ARREMESSO_VY, atordoado: ARREMESSO_ATORDOADO });
    expect(b.vx).toBe(-ARREMESSO_VX);
    expect(c).toMatchObject({ vx: 0, atordoado: 0 }); // quem não estava agarrado fica como estava
  });
});

// Jefferson: no VERSUS, o que valia para o herói (J1) da história vale igual para os DOIS.
describe('regras do herói da história valem para os dois (VERSUS)', () => {
  const outro = (id: IdJogador): IdJogador => (id === 'p1' ? 'p2' : 'p1');
  /** roda n quadros com a entrada `ent` só no lutador `id` */
  const rodarSo = (e: EstadoLuta, id: IdJogador, n: number, ent: Partial<Entrada> = {}, doOutro: Partial<Entrada> = {}) =>
    id === 'p1' ? rodar(e, n, ent, doOutro) : rodar(e, n, doOutro, ent);
  const tiroDo = (e: EstadoLuta, dono: IdJogador, x: number, y: number) =>
    e.tiros.push({ id: e.proximoId++, dono, x, y, vx: 0, vy: 0, raio: C.TIRO_RAIO, dano: C.TIRO_DANO, refletido: false, atirador: dono });
  const tirosDe = (e: EstadoLuta, id: IdJogador) => e.tiros.filter((t) => t.atirador === id).length;

  it.each(['p1', 'p2'] as const)('%s: apanhar não trava nem empurra (só a pose) e dá 30 quadros invulnerável', (id) => {
    const e = luta();
    alinhar(e);
    const l = e[id];
    tiroDo(e, outro(id), l.x, l.y);
    const x0 = l.x, y0 = l.y;
    const ev = rodarSo(e, id, 1, { y: -1 });
    expect(ev.find((x) => x.tipo === 'acerto')).toMatchObject({ alvo: id, dano: C.TIRO_DANO });
    expect(l.x).toBe(x0); // sem empurrão
    expect(y0 - l.y).toBeCloseTo(C.VELOCIDADE, 5); // andou no mesmo quadro
    expect(l.acao).toBe('livre');
    expect(l.invulneravel).toBe(C.INVULNERAVEL_QUADROS);
    expect(poseDoLutador(l).movimento).toBe('flyLeft');
    const y1 = l.y;
    rodarSo(e, id, 3, { y: -1 });
    expect(y1 - l.y).toBeCloseTo(3 * C.VELOCIDADE, 5);
    rodarSo(e, id, C.ATINGIDO_QUADROS);
    expect(poseDoLutador(l).movimento).not.toBe('flyLeft');
  });

  it.each(['p1', 'p2'] as const)('%s: soltar o especial não trava (anda, carrega) e fica na pose de especial com o raio na tela', (id) => {
    const e = luta();
    alinhar(e);
    const l = e[id];
    l.ki = C.KI_MAX;
    rodarSo(e, id, 1, { especial: true });
    expect(e.raios.some((r) => r.dono === id)).toBe(true);
    expect(poseDoLutador(l).movimento).toBe('special');
    const y0 = l.y;
    rodarSo(e, id, 5, { y: -1 });
    expect(y0 - l.y).toBeCloseTo(5 * C.VELOCIDADE, 5);
    rodarSo(e, id, 5, { carregar: true });
    expect(l.acao).toBe('carregando');
    expect(l.ki).toBeCloseTo(5 * C.KI_CARREGAR_POR_QUADRO, 5);
    rodarSo(e, id, C.ESPECIAL_DURACAO + 2);
    expect(e.raios.length).toBe(0);
    expect(poseDoLutador(l).movimento).not.toBe('special');
  });

  it('não solta outro especial enquanto o próprio raio está na tela', () => {
    const e = luta();
    alinhar(e);
    e.p1.ki = C.KI_MAX;
    rodar(e, 1, { especial: true });
    rodar(e, C.GUARDA_GATILHO + 1);
    e.p1.ki = C.KI_MAX;
    expect(rodar(e, 1, { especial: true }).some((x) => x.tipo === 'especial' || x.tipo === 'choque')).toBe(false);
    expect(e.p1.ki).toBe(C.KI_MAX);
  });

  it('no choque os DOIS andam e cada aperto novo de ATAQUE conta (sem tiro)', () => {
    const e = luta();
    alinhar(e);
    e.p1.ki = e.p2.ki = C.KI_MAX;
    rodar(e, 1, { especial: true });
    rodar(e, 1, {}, { especial: true });
    expect(e.choque).not.toBeNull();
    expect(poseDoLutador(e.p1).movimento).toBe('special');
    expect(poseDoLutador(e.p2).movimento).toBe('special');
    const y1 = e.p1.y, y2 = e.p2.y;
    rodar(e, 4, { y: -1 }, { y: 1 });
    expect(y1 - e.p1.y).toBeCloseTo(4 * C.VELOCIDADE, 5);
    expect(e.p2.y - y2).toBeCloseTo(4 * C.VELOCIDADE, 5);
    const ev = [...rodar(e, 1, { atacar: true }, { atacar: true }), ...rodar(e, 1), ...rodar(e, 1, {}, { atacar: true })];
    expect(e.choque!.apertos).toEqual({ p1: 1, p2: 2 });
    expect(ev.filter((x) => x.tipo === 'apertoChoque').length).toBe(3);
    expect(e.tiros.length).toBe(0);
  });

  it.each(['p1', 'p2'] as const)('%s: carregando não anda; segurar ATAQUE não repete, mas o aperto novo atira', (id) => {
    const e = luta();
    alinhar(e);
    const l = e[id];
    const x0 = l.x, y0 = l.y;
    rodarSo(e, id, 30, { carregar: true, atacar: true, y: -1 });
    expect([l.x, l.y]).toEqual([x0, y0]);
    expect(tirosDe(e, id)).toBe(1); // só o primeiro aperto
    rodarSo(e, id, 1, { carregar: true });
    rodarSo(e, id, 1, { carregar: true, atacar: true });
    expect(tirosDe(e, id)).toBe(2);
  });

  it.each(['p1', 'p2'] as const)('%s: com qualquer raio na tela, segurar ATAQUE não repete (aperto novo sim)', (id) => {
    const e = luta();
    alinhar(e);
    e[outro(id)].ki = C.KI_MAX;
    rodarSo(e, outro(id), 1, { especial: true });
    rodarSo(e, id, 20, { atacar: true });
    expect(tirosDe(e, id)).toBe(1);
    rodarSo(e, id, 1);
    rodarSo(e, id, 1, { atacar: true });
    expect(tirosDe(e, id)).toBe(2);
  });

  it.each(['p1', 'p2'] as const)('%s: no brilho do parry (10 quadros) segurar ATAQUE não atira', (id) => {
    const e = luta();
    alinhar(e);
    const l = e[id];
    rodarSo(e, id, 1, { atacar: true }); // 1º tiro (aperto novo)
    rodarSo(e, id, C.TIRO_INTERVALO, { atacar: true }); // segurando: repete
    const antes = tirosDe(e, id);
    expect(antes).toBeGreaterThan(1);
    rodarSo(e, id, 1, { atacar: true, parry: true });
    rodarSo(e, id, C.PARRY_ONDA_QUADROS - 2, { atacar: true });
    expect(l.ondaParry).toBeGreaterThan(0);
    expect(tirosDe(e, id)).toBe(antes);
    rodarSo(e, id, C.TIRO_INTERVALO + 2, { atacar: true });
    expect(tirosDe(e, id)).toBeGreaterThan(antes);
  });

  it('bônus do combo de parry (getParryComboBonus)', () => {
    expect([0, 1, 2, 3, 5, 6, 9, 10, 20].map(bonusDoComboDeParry)).toEqual([0, 0, 0, 2, 2, 5, 5, 10, 10]);
  });

  it.each(['p1', 'p2'] as const)('%s: combo de parry dá ki (+2 no 3º, +5 no 6º, +10 no 10º); apanhar ou 90 quadros zera', (id) => {
    const e = luta();
    alinhar(e);
    const l = e[id];
    const rebater = () => {
      const c = centroDoParry(l);
      tiroDo(e, outro(id), c.x, c.y);
      const ev = rodarSo(e, id, 1, { parry: true });
      e.tiros.length = 0;
      rodarSo(e, id, 2);
      return ev.find((x) => x.tipo === 'parry');
    };
    const bonus = Array.from({ length: 10 }, () => rebater()).map((x) => x && 'bonusKi' in x ? x.bonusKi : -1);
    expect(bonus).toEqual([0, 0, 2, 0, 0, 5, 0, 0, 0, 10]);
    expect(l.ki).toBe(17);
    expect(l.comboParry).toBe(10);
    rodarSo(e, id, C.COMBO_PARRY_QUADROS);
    expect(l.comboParry).toBe(0);
    rebater(); rebater();
    expect(l.comboParry).toBe(2);
    tiroDo(e, outro(id), l.x, l.y);
    rodarSo(e, id, 1);
    expect(l.comboParry).toBe(0);
  });

  it.each(['p1', 'p2'] as const)('%s: o especial destrói quem está agarrado nas pernas (gancho da Fase 3)', (id) => {
    const e = luta();
    const l = e[id];
    l.ki = C.KI_MAX;
    e.minions.push(
      agarrado(l.x, l.y, id),
      agarrado(l.x, l.y, outro(id)),
      agarrado(400, 100, null),
    );
    const ev = rodarSo(e, id, 1, { especial: true });
    expect(ev.find((x) => x.tipo === 'especial')).toMatchObject({ agarradosDestruidos: 1 });
    expect(e.minions.map((m) => m.agarrando)).toEqual([outro(id), null]);
    expect(l.vida).toBe(C.VIDA_VERSUS);
  });

  it('invulnerável ou transformando não pode ser agarrado (os dois)', () => {
    const e = luta();
    for (const id of ['p1', 'p2'] as const) {
      const l = e[id];
      l.invulneravel = 5;
      expect(podeSerAgarrado(l)).toBe(false);
      l.invulneravel = 0;
      expect(podeSerAgarrado(l)).toBe(true);
      l.acao = 'transformando';
      expect(podeSerAgarrado(l)).toBe(false);
    }
  });

  it('vida, velocidade, invulnerabilidade e Zenkai iguais para os dois', () => {
    const e = luta();
    expect(e.p1.vidaMax).toBe(e.p2.vidaMax);
    expect(e.p1.invulneravel).toBe(e.p2.invulneravel);
    expect(velocidadeDe(e.p1, e.regras)).toBe(velocidadeDe(e.p2, e.regras));
    for (const id of ['p1', 'p2'] as const) {
      alinhar(e);
      e[id].vida = 1;
      tiroDo(e, outro(id), e[id].x, e[id].y);
      const ev = rodar(e, 1);
      expect(ev.some((x) => x.tipo === 'zenkai' && x.dono === id)).toBe(true);
      expect(e[id].invulneravel).toBe(C.ZENKAI_INVULNERAVEL);
    }
  });
});

describe('círculo do parry cresce com a aura (getParryCircle)', () => {
  it('calmo ~75 (aura do corpo + 6), forte maior; nunca menor que PARRY_RAIO; maior para quem é mais alto', () => {
    const e = luta();
    const calmo = circuloDoParry(e.p1).r;
    expect(calmo).toBeGreaterThan(C.PARRY_RAIO);
    expect(calmo).toBeCloseTo(112 * 0.9 * 1.18 * 0.58 + C.PARRY_MARGEM_AURA, 3);
    rodar(e, 60, { carregar: true });
    expect(e.p1.nivelAura).toBeGreaterThan(0.99);
    expect(circuloDoParry(e.p1).r).toBeGreaterThan(calmo + 4);
    const baixinho = luta('gotenks', 'goku');
    expect(circuloDoParry(baixinho.p1).r).toBeGreaterThanOrEqual(C.PARRY_RAIO);
    expect(circuloDoParry(baixinho.p1).r).toBeLessThan(calmo);
  });

  it.each(['p1', 'p2'] as const)('%s: rebate um tiro a 65 do centro (fora do raio fixo antigo de 56)', (id) => {
    const e = luta();
    alinhar(e);
    const l = e[id], c = circuloDoParry(l), dono = id === 'p1' ? 'p2' : 'p1';
    e.tiros.push({ id: 999, dono, x: c.x + l.olhando * 65, y: c.y, vx: 0, vy: 0, raio: C.TIRO_RAIO, dano: 1, refletido: false, atirador: dono });
    const ev = id === 'p1' ? rodar(e, 1, { parry: true }) : rodar(e, 1, {}, { parry: true });
    expect(ev.find((x) => x.tipo === 'parry')).toMatchObject({ refletidos: 1 });
  });
});
