import { describe, expect, it } from 'vitest';
import { CHAVE_ESTATISTICAS, estatisticaDe, lerEstatisticas, registrarLuta } from '../src/logica/estatisticas';

const memoria = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };

describe('estatísticas por personagem', () => {
  it('soma lutas e vitórias e grava na chave própria', () => {
    const a = memoria();
    registrarLuta('goku', true, a);
    registrarLuta('goku', false, a);
    registrarLuta('vegeta', true, a);
    const e = lerEstatisticas(a);
    expect(estatisticaDe(e, 'goku')).toEqual({ lutas: 2, vitorias: 1 });
    expect(estatisticaDe(e, 'vegeta')).toEqual({ lutas: 1, vitorias: 1 });
    expect(estatisticaDe(e, 'cell')).toEqual({ lutas: 0, vitorias: 0 });
    expect(a.getItem(CHAVE_ESTATISTICAS)).toContain('goku');
  });
  it('dado estragado vira vazio e vitórias nunca passam das lutas', () => {
    const a = memoria();
    a.setItem(CHAVE_ESTATISTICAS, '{"goku":{"lutas":2,"vitorias":9},"x":"lixo"}');
    expect(lerEstatisticas(a)).toEqual({ goku: { lutas: 2, vitorias: 2 } });
    a.setItem(CHAVE_ESTATISTICAS, 'não é json');
    expect(lerEstatisticas(a)).toEqual({});
  });
});

describe('opções de qualidade de vida (v0.147)', async () => {
  const { normalizarOpcoes, opcoesPadrao } = await import('../src/logica/opcoes');
  const { FORCA_DA_CPU } = await import('../src/logica/ia');
  it('padrões e valores estragados', () => {
    const p = opcoesPadrao();
    expect([p.dificuldadeCpu, p.textoGrande, p.tremor, p.ultima]).toEqual(['normal', false, true, { p1: '', p2: '', arena: '' }]);
    const o = normalizarOpcoes({ dificuldadeCpu: 'impossivel', textoGrande: true, tremor: false, ultima: { p1: 'goku', arena: 7 } });
    expect([o.dificuldadeCpu, o.textoGrande, o.tremor, o.ultima]).toEqual(['normal', true, false, { p1: 'goku', p2: '', arena: '' }]);
    expect(FORCA_DA_CPU.facil < FORCA_DA_CPU.normal && FORCA_DA_CPU.normal < FORCA_DA_CPU.dificil).toBe(true);
  });
});

describe('quem cai é arremessado para fora da tela (v0.148/0.149)', async () => {
  const { criarLuta, passoLuta } = await import('../src/logica/luta');
  const { fichaDoPersonagem } = await import('../src/logica/ficha');
  const { ENTRADA_VAZIA } = await import('../src/logica/tipos');
  const C = await import('../src/logica/constantes');
  it('o J1 caído vai para a esquerda até sair da tela e o J2 para a direita', () => {
    for (const id of ['p1', 'p2'] as const) {
      const e = criarLuta(fichaDoPersonagem('goku'), fichaDoPersonagem('vegeta'), 1);
      e[id].vida = 0; e[id].acao = 'caido';
      for (let i = 0; i < 120; i++) passoLuta(e, { p1: ENTRADA_VAZIA, p2: ENTRADA_VAZIA });
      if (id === 'p1') expect(e.p1.x).toBeLessThan(-C.QUEDA_FORA + 1);
      else expect(e.p2.x).toBeGreaterThan(C.TELA_L + C.QUEDA_FORA - 1);
    }
  });
  it('vai para o lado do último golpe, numa curva, sem passar do chão', async () => {
    const { aplicarDano } = await import('../src/logica/luta');
    const e = criarLuta(fichaDoPersonagem('goku'), fichaDoPersonagem('vegeta'), 1);
    e.p2.vida = 1; e.p2.zenkaiUsada = true; e.p2.invulneravel = 0;
    aplicarDano(e, e.p2, 1, false, 1, []);
    expect(e.p2.acao).toBe('caido');
    expect(e.p2.quedaVx).toBeGreaterThan(0);
    const y0 = e.p2.y;
    let subiu = false;
    // (antes da próxima rodada, que recria o lutador: FIM_RODADA_QUADROS)
    for (let i = 0; i < C.FIM_RODADA_QUADROS - 5; i++) {
      passoLuta(e, { p1: ENTRADA_VAZIA, p2: ENTRADA_VAZIA });
      if (e.p2.y < y0) subiu = true;
      expect(e.p2.y).toBeLessThanOrEqual(C.CHAO_Y - e.p2.a / 2 + 0.001);
    }
    expect(subiu).toBe(true);
    expect(e.p2.x).toBeGreaterThan(C.TELA_L + C.QUEDA_FORA - 1);
  });
});
