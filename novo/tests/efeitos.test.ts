// Efeitos: o atlas gerado tem todos os quadros da tabela, e as contas portadas do menu.js batem.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as C from '../src/logica/constantes';
import { EFEITOS, type NomeEfeito } from '../src/dados/efeitos';
import { PERSONAGENS } from '../src/dados/personagens';
import {
  auraDoLutador, auraForte, caminhoDoSol, corDoRaio, efeitoDaAura, efeitoDoEspecial, efeitoDoTiro, meioDoChoqueX,
  quadroDoEfeito, quadroUnico, SOL_CRESCE, suavizarAura,
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
      expect(existsSync(join(__dirname, '..', 'fontes', 'efeitos', `${nome}.png`)), nome).toBe(true);
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
    expect(auraDoLutador('goku', 0, 0)).toBe('vermelho'); // v0.154: Kaioken
    expect(auraDoLutador('goku', 1, 100)).toBe('amarelo');
    expect(auraDoLutador('goku', 4, 100)).toBe('blue');
    expect(auraDoLutador('goku', 4, 0)).toBe('blue');   // v0.135: transformado, a aura é sempre a da forma
    expect(auraDoLutador('goku', 2, 0)).toBe('amarelo'); // SSJ3 sem poder continua amarelo (estava azul)
    // todo Super Saiyajin tem aura amarela
    for (const [p, f] of [['goku', 'ssj'], ['goku', 'ssj3'], ['vegeta', 'ssj'], ['gohan', 'ssj'], ['gohan', 'ssj2'], ['trunks', 'ssj'], ['gotenks', 'ssj'], ['gotenks', 'ssj3'], ['bardock', 'ssj'], ['vegetto', 'ssj']] as const)
      expect(auraDoLutador(p, PERSONAGENS[p].formas.findIndex((x) => x.forma === f), 0), `${p}-${f}`).toBe('amarelo');
    // v0.154: azul só no Blue; os Saiyajins na forma normal têm a aura clara (o Goku, a vermelha do Kaioken)
    for (const p of ['vegeta', 'gohan', 'trunks', 'gotenks', 'bardock', 'vegetto', 'raditz']) expect(auraDoLutador(p, 0, 0), p).toBe('branca');
    for (const p of Object.values(PERSONAGENS)) for (const f of p.formas)
      if (f.aura === 'azul' || f.aura === 'blue') expect(f.forma, `${p.id}-${f.forma}`).toMatch(/blue/);
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
  const origem = { x: 100, y: 120 }, destino = { x: 868, y: 240 };
  it('nasce pequeno em cima da cabeça e cresce até 34, apoiado no mesmo ponto', () => {
    const a = caminhoDoSol(0, origem, destino);
    expect(a.r).toBe(5);
    expect(a.x).toBe(origem.x);
    expect(a.y + a.r).toBeCloseTo(origem.y + 34, 5);
    expect(caminhoDoSol(SOL_CRESCE, origem, destino).r).toBe(34);
  });
  it('v0.155: desce reto (na diagonal, sem tranco) até a altura do peito do outro lado da tela', () => {
    const meio = caminhoDoSol(SOL_CRESCE + C.SOL_VIAGEM / 2, origem, destino);
    expect(meio.x).toBeCloseTo((origem.x + destino.x) / 2, 5);
    expect(meio.y).toBeCloseTo((origem.y + destino.y) / 2, 5);
    const fim = caminhoDoSol(SOL_CRESCE + C.SOL_VIAGEM, origem, destino);
    expect(fim).toMatchObject({ x: destino.x, y: destino.y, explosao: -1 });
    // passo a passo: anda sempre o mesmo tanto (sem tranco)
    const p = [10, 11, 12].map((t) => caminhoDoSol(SOL_CRESCE + t, origem, destino));
    expect(p[1].x - p[0].x).toBeCloseTo(p[2].x - p[1].x, 5);
    expect(p[1].y - p[0].y).toBeCloseTo(p[2].y - p[1].y, 5);
  });
  it('explode onde acertou', () => {
    const ex = { quando: 50, x: 400, y: 200 };
    expect(caminhoDoSol(49, origem, destino, ex).explosao).toBe(-1);
    const e = caminhoDoSol(55, origem, destino, ex);
    expect(e).toMatchObject({ x: 400, y: 200 });
    expect(e.explosao).toBeGreaterThan(0);
  });
  it('ponto do choque vai para o lado de quem aperta menos', () => {
    expect(meioDoChoqueX(0)).toBe(400);
    expect(meioDoChoqueX(1)).toBe(740); // P1 apertou mais: empurra para o lado do P2
    expect(meioDoChoqueX(-5)).toBe(60);
  });
});

describe('pontoDoChoque (os dois andam no choque)', () => {
  it('liga as mãos; empurrão 0 = meio; ±1 perto de cada mão; inclinado se estão em alturas diferentes', async () => {
    const { pontoDoChoque } = await import('../src/logica/efeitos');
    const a = { x: 100, y: 200 }, b = { x: 700, y: 100 };
    const m = pontoDoChoque(a, b, 0);
    expect(m.x).toBeCloseTo(400, 5);
    expect(m.y).toBeCloseTo(150, 5);
    expect(pontoDoChoque(a, b, 1).x).toBeCloseTo(700, 5);
    expect(pontoDoChoque(a, b, -1).x).toBeCloseTo(100, 5);
    expect(m.ang).toBeLessThan(0);
    expect(m.dist).toBeCloseTo(Math.hypot(600, 100), 5);
  });
});
