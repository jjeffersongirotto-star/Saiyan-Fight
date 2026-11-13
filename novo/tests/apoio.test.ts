import { describe, expect, it } from 'vitest';
import { movimentoDeVoo, poseDoLutador } from '../src/logica/animacao';
import { entradaDoTeclado, juntarEntradas, TECLAS_P1, TECLAS_P2, vetorDoJoystick } from '../src/logica/entrada';
import { entradaDaIA } from '../src/logica/ia';
import { definirIdioma, T, textosCadastrados } from '../src/logica/idioma';
import { criarLuta } from '../src/logica/luta';
import { RelogioFixo } from '../src/logica/relogio';
import { ENTRADA_VAZIA } from '../src/logica/tipos';

describe('passo fixo', () => {
  it('60 Hz = 1 passo por quadro; 120 Hz = 1 passo a cada 2 quadros; 30 Hz = 2 passos', () => {
    const r = new RelogioFixo();
    let n = 0;
    for (let i = 0; i < 60; i++) n += r.avancar(1000 / 60);
    expect(n).toBeGreaterThanOrEqual(59);
    expect(n).toBeLessThanOrEqual(60);
    const r2 = new RelogioFixo();
    n = 0;
    for (let i = 0; i < 120; i++) n += r2.avancar(1000 / 120);
    expect(n).toBeGreaterThanOrEqual(59);
    expect(n).toBeLessThanOrEqual(60);
    const r3 = new RelogioFixo();
    n = 0;
    for (let i = 0; i < 30; i++) n += r3.avancar(1000 / 30);
    expect(n).toBeGreaterThanOrEqual(59);
  });
  it('um travão de 2 s não vira 120 passos de uma vez', () => {
    const r = new RelogioFixo();
    expect(r.avancar(2000)).toBe(5);
    expect(r.avancar(16)).toBeLessThanOrEqual(2);
  });
  it('alfa fica entre 0 e 1', () => {
    const r = new RelogioFixo();
    r.avancar(25);
    expect(r.alfa).toBeGreaterThanOrEqual(0);
    expect(r.alfa).toBeLessThan(1);
  });
});

describe('poses', () => {
  it('direção do voo vira o movimento do pacote', () => {
    expect(movimentoDeVoo(0, 0)).toBe('idle');
    expect(movimentoDeVoo(1, 0)).toBe('flyRight');
    expect(movimentoDeVoo(-1, -1)).toBe('flyUpLeft');
    expect(movimentoDeVoo(0, 1)).toBe('flyDown');
  });
  it('quem olha para a esquerda é espelhado e a frente dele vira flyRight', () => {
    const e = criarLuta('goku', 'vegeta');
    e.p2.movX = -1; // anda para a esquerda = para frente
    expect(poseDoLutador(e.p2)).toEqual({ movimento: 'flyRight', espelhar: true });
    e.p1.movX = -1; // P1 andando para trás
    expect(poseDoLutador(e.p1)).toEqual({ movimento: 'flyLeft', espelhar: false });
  });
  it('prioridade: especial > parry > carregar > tiro > voo', () => {
    const e = criarLuta('goku', 'vegeta');
    e.p1.poseTiro = 5;
    e.p1.movX = 1;
    expect(poseDoLutador(e.p1).movimento).toBe('attackKi');
    e.p1.acao = 'carregando';
    expect(poseDoLutador(e.p1).movimento).toBe('chargeKi');
    e.p1.acao = 'livre';
    e.p1.poseParry = 3;
    expect(poseDoLutador(e.p1).movimento).toBe('parry');
    e.p1.acao = 'transformando';
    expect(poseDoLutador(e.p1).movimento).toBe('transform');
    e.p1.emEspecial = true;
    expect(poseDoLutador(e.p1).movimento).toBe('special');
    e.p1.acao = 'livre';
    e.p1.emEspecial = false;
    e.p1.poseParry = 0;
    e.p1.poseAtingido = 3;
    expect(poseDoLutador(e.p1).movimento).toBe('flyLeft');
  });
});

describe('entrada', () => {
  it('teclado do J1 e do J2 (event.code)', () => {
    const e1 = entradaDoTeclado(TECLAS_P1, new Set(['ArrowRight', 'ArrowUp', 'KeyF']), new Set(['KeyQ']));
    expect(e1).toEqual({ x: 1, y: -1, atacar: true, carregar: false, especial: true, parry: false, transformar: false });
    expect(entradaDoTeclado(TECLAS_P1, new Set(), new Set(['KeyA'])).transformar).toBe(true);
    const e2 = entradaDoTeclado(TECLAS_P2, new Set(['Numpad1', 'KeyO']), new Set(['KeyP']));
    expect(e2).toMatchObject({ x: -1, carregar: true, parry: true });
  });
  it('joystick: zona morta, limite de 1 e direção certa', () => {
    expect(vetorDoJoystick(3, 0, 56)).toEqual({ x: 0, y: 0 });
    const v = vetorDoJoystick(200, 0, 56);
    expect(v.x).toBeCloseTo(1);
    const d = vetorDoJoystick(20, 20, 56);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(Math.hypot(20, 20) / 56);
  });
  it('teclado + toque juntos', () => {
    const j = juntarEntradas({ ...ENTRADA_VAZIA, x: 1 }, { ...ENTRADA_VAZIA, y: 0.5, especial: true });
    expect(j).toMatchObject({ x: 1, y: 0.5, especial: true });
  });
});

describe('CPU', () => {
  it('desalinhada vai para a altura do adversário; alinhada atira', () => {
    const e = criarLuta('goku', 'vegeta');
    e.p1.y = 100;
    e.p2.y = 250;
    expect(entradaDaIA(e, 'p2').y).toBe(-1);
    e.p2.y = 100;
    e.quadro = 40; // fora da pausa de ritmo
    expect(entradaDaIA(e, 'p2').atacar).toBe(true);
  });
  it('ki cheio: transforma enquanto houver forma; na última, especial', () => {
    const e = criarLuta('goku', 'vegeta');
    e.p1.y = e.p2.y = 200;
    e.p2.ki = 100;
    expect(entradaDaIA(e, 'p2').transformar).toBe(true);
    e.p2.nivel = e.p2.alturas.length - 1;
    expect(entradaDaIA(e, 'p2').especial).toBe(true);
  });
  it('responde ao especial do outro com o próprio (choque) e aperta ATAQUE no choque', () => {
    const e = criarLuta('goku', 'vegeta');
    e.p2.ki = 100;
    e.raios.push({ dono: 'p1', idade: 3, duracao: 40, chega: 18, sol: false, acertou: false });
    expect(entradaDaIA(e, 'p2').especial).toBe(true);
    e.raios.length = 0;
    e.choque = { idade: 0, apertos: { p1: 0, p2: 0 }, empurrao: 0 };
    const apertos = Array.from({ length: 12 }, (_, i) => { e.quadro = i; return entradaDaIA(e, 'p2').atacar; });
    expect(apertos.some(Boolean) && apertos.some((a) => !a)).toBe(true);
  });
  it('fora da luta não aperta nada', () => {
    const e = criarLuta('goku', 'vegeta');
    e.fase = 'fimRodada';
    expect(entradaDaIA(e, 'p2')).toEqual(ENTRADA_VAZIA);
  });
});

describe('idiomas', () => {
  it('todo texto cadastrado existe em EN e ES (e é diferente de vazio)', () => {
    for (const id of ['en', 'es'] as const) {
      definirIdioma(id, false);
      for (const t of textosCadastrados()) expect(T(t).length).toBeGreaterThan(0);
    }
    definirIdioma('en', false);
    expect(T('JOGAR DE NOVO')).toBe('PLAY AGAIN');
    definirIdioma('pt', false);
    expect(T('JOGAR DE NOVO')).toBe('JOGAR DE NOVO');
  });
});
