import { describe, expect, it } from 'vitest';
import * as C from '../src/logica/constantes';
import { criarLuta, limitesX, passoLuta, raioAcerta, registrarRodada, tiroAcerta } from '../src/logica/luta';
import { ENTRADA_VAZIA, type Entrada, type EstadoLuta } from '../src/logica/tipos';

const nada = (): Entrada => ({ ...ENTRADA_VAZIA });
const rodar = (e: EstadoLuta, n: number, p1: Partial<Entrada> = {}, p2: Partial<Entrada> = {}) => {
  const ev = [];
  for (let i = 0; i < n; i++) ev.push(...passoLuta(e, { p1: { ...nada(), ...p1 }, p2: { ...nada(), ...p2 } }));
  return ev;
};
/** coloca os dois na mesma altura e sem a proteção do começo da rodada */
const alinhar = (e: EstadoLuta) => {
  e.p1.y = e.p2.y = 200;
  e.p1.invulneravel = e.p2.invulneravel = 0;
};

describe('luta VERSUS (lógica pura)', () => {
  it('começa com 4 de vida para os dois, ki zerado, um olhando para o outro', () => {
    const e = criarLuta('goku', 'vegeta');
    expect(e.p1.vida).toBe(C.VIDA_VERSUS);
    expect(e.p2.vida).toBe(C.VIDA_VERSUS);
    expect(e.p1.olhando).toBe(1);
    expect(e.p2.olhando).toBe(-1);
    expect(e.p1.ki).toBe(0);
  });

  it('cada jogador fica na sua metade da tela', () => {
    const e = criarLuta('goku', 'vegeta');
    rodar(e, 300, { x: 1 }, { x: -1 });
    expect(e.p1.x).toBeLessThanOrEqual(limitesX('p1')[1]);
    expect(e.p2.x).toBeGreaterThanOrEqual(limitesX('p2')[0]);
    expect(e.p1.x).toBeLessThan(e.p2.x);
  });

  it('a diagonal anda na mesma velocidade que a reta', () => {
    const e = criarLuta('goku', 'vegeta');
    e.p1.y = 200;
    const x0 = e.p1.x, y0 = e.p1.y;
    rodar(e, 1, { x: 1, y: 1 });
    expect(Math.hypot(e.p1.x - x0, e.p1.y - y0)).toBeCloseTo(C.VELOCIDADE, 5);
  });

  it('segurando ATAQUE sai ~5 tiros por segundo', () => {
    const e = criarLuta('goku', 'vegeta');
    const ev = rodar(e, 60, { atacar: true });
    const tiros = ev.filter((x) => x.tipo === 'tiro' && x.dono === 'p1').length;
    expect(tiros).toBeGreaterThanOrEqual(5);
    expect(tiros).toBeLessThanOrEqual(6);
  });

  it('o tiro acerta, tira 1 de vida e deixa o alvo invulnerável um tempo', () => {
    const e = criarLuta('goku', 'vegeta');
    alinhar(e);
    const ev = rodar(e, 120, { atacar: true });
    const acertos = ev.filter((x) => x.tipo === 'acerto' && x.alvo === 'p2');
    expect(acertos.length).toBeGreaterThanOrEqual(1);
    expect(acertos[0]).toMatchObject({ dano: 1, deEspecial: false });
    // 2 s de tiro sem parar: a invulnerabilidade (1 s) segura vários tiros
    expect(acertos.length).toBeLessThanOrEqual(3);
  });

  it('carregar enche o ki e deixa o lutador parado', () => {
    const e = criarLuta('goku', 'vegeta');
    const x0 = e.p1.x;
    rodar(e, 80, { carregar: true, x: 1 });
    expect(e.p1.ki).toBe(C.KI_MAX);
    expect(e.p1.x).toBe(x0);
    expect(e.p1.acao).toBe('carregando');
  });

  it('o especial só sai com o ki cheio, gasta o ki e tira 3 de vida', () => {
    const e = criarLuta('goku', 'vegeta');
    alinhar(e);
    rodar(e, 1, { especial: true });
    expect(e.p1.acao).toBe('livre');
    e.p1.ki = C.KI_MAX;
    e.p2.invulneravel = 0;
    const ev = rodar(e, 1, { especial: true });
    expect(ev.some((x) => x.tipo === 'especial')).toBe(true);
    expect(e.p1.ki).toBe(0);
    const depois = rodar(e, C.ESPECIAL_CARGA + 5);
    expect(depois.find((x) => x.tipo === 'acerto')).toMatchObject({ alvo: 'p2', dano: C.ESPECIAL_DANO, deEspecial: true });
    expect(e.p2.vida).toBe(C.VIDA_VERSUS - C.ESPECIAL_DANO);
  });

  it('o raio do especial não acerta quem está fora da faixa', () => {
    const r = { dono: 'p1' as const, idade: 0, x0: 100, y: 100, direcao: 1 as const, acertou: false };
    expect(raioAcerta(r, { x: 600, y: 100 })).toBe(true);
    expect(raioAcerta(r, { x: 600, y: 260 })).toBe(false);
    expect(raioAcerta(r, { x: 50, y: 100 })).toBe(false); // atrás de quem soltou
  });

  it('parry na hora certa devolve o tiro para quem atirou', () => {
    const e = criarLuta('goku', 'vegeta');
    alinhar(e);
    rodar(e, 1, { atacar: true });
    // espera o tiro chegar perto do P2 e aperta parry
    let ev: ReturnType<typeof rodar> = [];
    for (let i = 0; i < 120 && !ev.some((x) => x.tipo === 'reflexo'); i++) {
      const t = e.tiros[0];
      const perto = t && Math.abs(t.x - e.p2.x) < C.PARRY_RAIO + 20;
      ev = rodar(e, 1, {}, { parry: perto && e.p2.acao !== 'parry' });
    }
    expect(ev.some((x) => x.tipo === 'reflexo' && x.dono === 'p2')).toBe(true);
    expect(e.tiros[0].dono).toBe('p2');
    expect(e.tiros[0].vx).toBeLessThan(0);
    expect(e.p2.vida).toBe(C.VIDA_VERSUS);
  });

  it('ESPECIAL apertado enquanto apanha fica guardado e sai logo depois', () => {
    const e = criarLuta('goku', 'vegeta');
    e.p1.ki = C.KI_MAX;
    e.p1.acao = 'atingido';
    e.p1.acaoQuadros = C.ATINGIDO_QUADROS - 4;
    const ev = rodar(e, 1, { especial: true }).concat(rodar(e, 6));
    expect(ev.some((x) => x.tipo === 'especial' && x.dono === 'p1')).toBe(true);
  });

  it('um aperto antigo demais não dispara nada', () => {
    const e = criarLuta('goku', 'vegeta');
    rodar(e, 1, { especial: true });
    rodar(e, C.GUARDA_GATILHO + 1);
    e.p1.ki = C.KI_MAX;
    expect(rodar(e, 1).some((x) => x.tipo === 'especial')).toBe(false);
  });

  it('parry no vazio tem espera antes de poder tentar de novo', () => {
    const e = criarLuta('goku', 'vegeta');
    rodar(e, 1, { parry: true });
    rodar(e, C.PARRY_QUADROS);
    expect(e.p1.esperaParry).toBeGreaterThan(0);
    const ev = rodar(e, 1, { parry: true });
    expect(ev.some((x) => x.tipo === 'parry')).toBe(false);
  });

  it('quem zera a vida perde a rodada; o vencedor não apanha mais depois disso', () => {
    const e = criarLuta('goku', 'vegeta');
    alinhar(e);
    e.p2.vida = 1;
    let ev = rodar(e, 120, { atacar: true }, { atacar: true });
    const fim = ev.find((x) => x.tipo === 'fimRodada');
    expect(fim).toBeDefined();
    expect(e.fase).toBe('fimRodada');
    expect(e.tiros.length).toBe(0);
    const vencedor = e.vencedorRodada!;
    const vida = e[vencedor].vida;
    ev = rodar(e, 60, { atacar: true }, { atacar: true });
    expect(e[vencedor].vida).toBe(vida);
    expect(ev.some((x) => x.tipo === 'tiro')).toBe(false);
  });

  it('melhor de 3: a partida acaba quando alguém vence 2 rodadas', () => {
    expect(registrarRodada({ p1: 0, p2: 0 }, 'p1')).toEqual({ placar: { p1: 1, p2: 0 }, partida: null });
    expect(registrarRodada({ p1: 1, p2: 1 }, 'p2')).toEqual({ placar: { p1: 1, p2: 2 }, partida: 'p2' });
    expect(registrarRodada({ p1: 1, p2: 0 }, null)).toEqual({ placar: { p1: 1, p2: 0 }, partida: null });
  });

  it('a rodada seguinte recomeça com vida cheia; a partida termina com fimPartida', () => {
    const e = criarLuta('goku', 'vegeta');
    const ate = (tipo: string) => {
      for (let i = 0; i < 600; i++) {
        const ev = rodar(e, 1, { atacar: e.fase === 'luta' });
        const achou = ev.find((x) => x.tipo === tipo);
        if (achou) return achou;
      }
      return undefined;
    };
    alinhar(e);
    e.p2.vida = 1;
    expect(ate('novaRodada')).toBeDefined();
    expect(e.p2.vida).toBe(C.VIDA_VERSUS);
    expect(e.p1.vida).toBe(C.VIDA_VERSUS);
    expect(e.placar).toEqual({ p1: 1, p2: 0 });
    expect(e.rodada).toBe(2);
    alinhar(e);
    e.p2.vida = 1;
    expect(ate('fimPartida')).toMatchObject({ vencedor: 'p1' });
    expect(e.fase).toBe('fimPartida');
    expect(e.placar).toEqual({ p1: 2, p2: 0 });
  });

  it('os dois caindo juntos é empate: ninguém marca ponto', () => {
    const e = criarLuta('goku', 'vegeta');
    e.p1.vida = e.p2.vida = 0;
    const ev = rodar(e, 1);
    expect(ev.find((x) => x.tipo === 'fimRodada')).toMatchObject({ vencedor: null });
    expect(e.placar).toEqual({ p1: 0, p2: 0 });
  });

  it('é determinística: a mesma semente e as mesmas entradas dão a mesma luta', () => {
    const a = criarLuta('goku', 'vegeta', 42), b = criarLuta('goku', 'vegeta', 42);
    rodar(a, 300, { atacar: true, y: -0.5 }, { atacar: true });
    rodar(b, 300, { atacar: true, y: -0.5 }, { atacar: true });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('colisão círculo x caixa', () => {
    expect(tiroAcerta({ x: 100, y: 100, raio: 8 }, { x: 100, y: 100 })).toBe(true);
    expect(tiroAcerta({ x: 100 + C.LUTADOR_L / 2 + 7, y: 100, raio: 8 }, { x: 100, y: 100 })).toBe(true);
    expect(tiroAcerta({ x: 100 + C.LUTADOR_L / 2 + 9, y: 100, raio: 8 }, { x: 100, y: 100 })).toBe(false);
  });
});
