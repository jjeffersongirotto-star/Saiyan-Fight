// Efeitos: o atlas gerado tem todos os quadros da tabela, e as contas portadas do menu.js batem.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as C from '../src/logica/constantes';
import { EFEITOS, type NomeEfeito } from '../src/dados/efeitos';
import { PERSONAGENS } from '../src/dados/personagens';
import {
  auraDoLutador, auraForte, caminhoDoSol, corDoRaio, efeitoDaAura, efeitoDoEspecial, efeitoDoTiro, meioDoChoqueX,
  quadroDoEfeito, quadroUnico, SOL_CRESCE, SOL_EMPURRA, suavizarAura,
} from '../src/logica/efeitos';

const PASTA = join(__dirname, '..', 'public', 'efeitos');

describe('atlas dos efeitos', () => {
  const atlas = JSON.parse(readFileSync(join(PASTA, 'efeitos.json'), 'utf8'));
  const quadros = new Map<string, { frame: { x: number; y: number; w: number; h: number }; sourceSize: { w: number; h: number }; pagina: { w: number; h: number } }>();
  for (const t of atlas.textures) {
    expect(existsSync(join(PASTA, t.image)), t.image).toBe(true);
    expect(t.size.w).toBeLessThanOrEqual(2048);
    expect(t.size.h).toBeLessThanOrEqual(2048);
    for (const f of t.frames) quadros.set(f.filename, { ...f, pagina: t.size });
  }

  it('todos os efeitos do jogo antigo, com todos os quadros, cabendo na página', () => {
    expect(Object.keys(EFEITOS).length).toBe(33);
    for (const [nome, e] of Object.entries(EFEITOS)) {
      expect(existsSync(join(__dirname, '..', '..', 'efeitos', `${nome}.png`)), nome).toBe(true);
      for (let i = 0; i < e.n; i++) {
        const f = quadros.get(`${nome}/${i}`);
        expect(f, `${nome}/${i}`).toBeDefined();
        expect(f!.sourceSize).toEqual({ w: e.w, h: e.h });
        expect(f!.frame.x + f!.frame.w).toBeLessThanOrEqual(f!.pagina.w);
        expect(f!.frame.y + f!.frame.h).toBeLessThanOrEqual(f!.pagina.h);
      }
    }
  });

  it('todo tiro e especial dos personagens tem animação (ou é o raio "cor")', () => {
    for (const p of Object.values(PERSONAGENS)) {
      expect(p.efeitoTiro in EFEITOS, p.id).toBe(true);
      expect(p.efeitoEspecial === 'cor' || p.efeitoEspecial in EFEITOS, p.id).toBe(true);
    }
  });
});

describe('quadros das animações (efeitoQuadro / efeitoQuadroUnico)', () => {
  it('em laço pelo tempo', () => {
    expect(quadroDoEfeito('kamehameha', 0)).toBe(0);
    expect(quadroDoEfeito('kamehameha', 0.061)).toBe(1);
    expect(quadroDoEfeito('kamehameha', 0.36)).toBe(0); // 6 quadros de 60 ms
  });
  it('com `laco`: depois da 1ª passada repete só o final', () => {
    // raio_vermelho: 12 quadros de 40 ms, repete a partir do 7
    expect(quadroDoEfeito('raio_vermelho', 0.44)).toBe(11);
    expect(quadroDoEfeito('raio_vermelho', 0.48)).toBe(7);
    for (let t = 0.48; t < 3; t += 0.04) expect(quadroDoEfeito('raio_vermelho', t)).toBeGreaterThanOrEqual(7);
  });
  it('uma vez só: null quando acaba', () => {
    expect(quadroUnico('explosao', 0)).toBe(0);
    expect(quadroUnico('explosao', 0.999)).toBe(13);
    expect(quadroUnico('explosao', 1)).toBeNull();
    expect(quadroUnico('parry_onda', -0.1)).toBeNull();
  });
  it('nunca passa do último quadro', () => {
    for (const nome of Object.keys(EFEITOS) as NomeEfeito[])
      for (let t = 0; t < 5; t += 0.037) expect(quadroDoEfeito(nome, t)).toBeLessThan(EFEITOS[nome].n);
  });
});

describe('qual efeito cada um usa', () => {
  it('aura: animação por cor (AURA_EFEITOS); gelo e rosa ficam com a labareda desenhada', () => {
    expect(efeitoDaAura('amarelo', false)).toBe('aura_amarela');
    expect(efeitoDaAura('amarelo', true)).toBe('aura_amarela_forte');
    expect(efeitoDaAura('blue', true)).toBe('aura_azul_chama');
    expect(efeitoDaAura('gelo', true)).toBeNull();
    expect(efeitoDaAura('rosa', false)).toBeNull();
  });
  it('aura da forma só enquanto dura o poder da transformação (getTransformationAura)', () => {
    expect(auraDoLutador('goku', 0, 0)).toBe('gelo');
    expect(auraDoLutador('goku', 1, 100)).toBe('amarelo');
    expect(auraDoLutador('goku', 4, 100)).toBe('blue');
    expect(auraDoLutador('goku', 4, 0)).toBe('gelo'); // continua transformado, a aura volta
  });
  it('aura forte: carregando, transformando ou com o poder', () => {
    expect(auraForte({ acao: 'livre', nivel: 0, poder: 0 })).toBe(false);
    expect(auraForte({ acao: 'carregando', nivel: 0, poder: 0 })).toBe(true);
    expect(auraForte({ acao: 'livre', nivel: 2, poder: 5 })).toBe(true);
    expect(suavizarAura(0, true, 1 / 60)).toBeCloseTo(0.1, 5);
    expect(suavizarAura(0.5, false, 1)).toBe(0);
  });
  it('tiro, especial e cor do raio', () => {
    expect(efeitoDoTiro('freeza')).toBe('esfera_roxa');
    expect(efeitoDoTiro('goku')).toBe('tiro_pixel');
    expect(efeitoDoEspecial('goku')).toBe('kamehameha');
    expect(efeitoDoEspecial('vegeta')).toBeNull();
    expect(corDoRaio('vegeta')).toBe(0xffff00);
    expect(corDoRaio('piccolo')).toBe(0xff0055);
    expect(corDoRaio('buu')).toBe(0x00ffff);
  });
});

describe('sol do Freeza e choque', () => {
  const dedo = { x: 100, y: 200 }, frente = { x: 140, y: 250 }, alvo = { x: 600, y: 260 };
  it('nasce pequeno em cima do dedo e cresce até 34', () => {
    const a = caminhoDoSol(0, dedo, frente, alvo, 1);
    expect(a.r).toBe(5);
    expect(a.x).toBe(dedo.x);
    expect(a.y).toBeLessThan(dedo.y);
    expect(caminhoDoSol(SOL_CRESCE, dedo, frente, alvo, 1).r).toBe(34);
  });
  it('é empurrado para a frente e chega no alvo em SOL_CHEGA, onde explode', () => {
    const e = caminhoDoSol(SOL_EMPURRA, dedo, frente, alvo, 1);
    expect(e.x).toBeCloseTo(frente.x + 40, 5);
    expect(e.y).toBeCloseTo(frente.y, 5);
    const quase = caminhoDoSol(C.SOL_CHEGA - 0.001, dedo, frente, alvo, 1);
    expect(quase.x).toBeCloseTo(alvo.x, 0);
    const exp = caminhoDoSol(C.SOL_CHEGA + 5, dedo, frente, alvo, 1);
    expect(exp.explosao).toBeGreaterThan(0);
    expect(caminhoDoSol(40, dedo, frente, alvo, 1).explosao).toBe(-1);
  });
  it('ponto do choque vai para o lado de quem aperta menos', () => {
    expect(meioDoChoqueX(0)).toBe(400);
    expect(meioDoChoqueX(1)).toBe(740); // P1 apertou mais: empurra para o lado do P2
    expect(meioDoChoqueX(-5)).toBe(60);
  });
});
