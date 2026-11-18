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
