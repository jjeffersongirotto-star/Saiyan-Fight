import { describe, expect, it } from 'vitest';
import * as C from '../src/logica/constantes';
import { fichaDoPersonagem } from '../src/logica/ficha';
import { criarLuta, danoDoChoque, escalaDaAltura, limitesX, passoLuta, registrarRodada, tiroAcerta, velocidadeDe } from '../src/logica/luta';
import { ARREMESSO_ATORDOADO, ARREMESSO_VX, ARREMESSO_VY } from '../src/logica/minions';
import { ENTRADA_VAZIA, type Entrada, type EstadoLuta, type Evento } from '../src/logica/tipos';

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

  it('gatilho guardado: ESPECIAL apertado enquanto apanha sai logo depois; aperto velho demais não', () => {
    const e = luta();
    e.p1.invulneravel = 0;
    e.p1.ki = C.KI_MAX;
    e.p1.acao = 'atingido';
    e.p1.acaoQuadros = C.ATINGIDO_QUADROS - 4;
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

  it('guardaGatilho = false: ESPECIAL apertado enquanto apanha se perde', () => {
    const e = antiga({ guardaGatilho: false });
    e.p1.invulneravel = 0;
    e.p1.ki = C.KI_MAX;
    e.p1.acao = 'atingido';
    e.p1.acaoQuadros = C.ATINGIDO_QUADROS - 4;
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
      { x: e.p1.x + 15, y: e.p1.y, vx: 0, vy: 0, agarrando: 'p1', atordoado: 0 },
      { x: e.p1.x - 15, y: e.p1.y, vx: 0, vy: 0, agarrando: 'p1', atordoado: 0 },
      { x: e.p1.x + 200, y: e.p1.y, vx: 0, vy: 0, agarrando: null, atordoado: 0 },
    );
    const ev = rodar(e, 1, { transformar: true });
    expect(ev.find((x) => x.tipo === 'transformou')).toMatchObject({ arremessados: 2 });
    const [a, b, c] = e.minions;
    expect(a).toMatchObject({ agarrando: null, vx: ARREMESSO_VX, vy: ARREMESSO_VY, atordoado: ARREMESSO_ATORDOADO });
    expect(b.vx).toBe(-ARREMESSO_VX);
    expect(c).toMatchObject({ vx: 0, atordoado: 0 }); // quem não estava agarrado fica como estava
  });
});
