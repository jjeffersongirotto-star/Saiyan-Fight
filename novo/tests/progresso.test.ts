import { describe, expect, it } from 'vitest';
import {
  CHAVE_PROGRESSO, CHAVE_PROGRESSO_ANTIGO, lerProgresso, lerRecordes, limparProgresso, salvarModoCompleto, salvarRecorde, type Armazenamento,
} from '../src/logica/progresso';

const memoria = (ini: Record<string, string> = {}): Armazenamento & { dados: Record<string, string> } => {
  const dados = { ...ini };
  return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
};

describe('progresso da história', () => {
  it('lê o progresso do jogo antigo e junta com o novo', () => {
    const a = memoria({
      [CHAVE_PROGRESSO_ANTIGO]: JSON.stringify({ kame: { normalDone: true }, terra: { normalDone: true, hardDone: true } }),
      [CHAVE_PROGRESSO]: JSON.stringify({ kaio: { normalDone: true } }),
    });
    const p = lerProgresso(a);
    expect(p.kame.normalDone && p.terra.hardDone && p.kaio.normalDone).toBe(true);
  });
  it('nunca escreve na chave do jogo antigo', () => {
    const antigo = JSON.stringify({ kame: { normalDone: true } });
    const a = memoria({ [CHAVE_PROGRESSO_ANTIGO]: antigo });
    const p = salvarModoCompleto('terra', 'normal', a);
    expect(a.dados[CHAVE_PROGRESSO_ANTIGO]).toBe(antigo);
    expect(JSON.parse(a.dados[CHAVE_PROGRESSO])).toEqual({ terra: { normalDone: true, hardDone: false } });
    expect(p.kame.normalDone && p.terra.normalDone).toBe(true);
  });
  it('lixo ou JSON quebrado viram progresso vazio', () => {
    expect(lerProgresso(memoria({ [CHAVE_PROGRESSO_ANTIGO]: '{quebrado' }))).toEqual({});
    expect(limparProgresso([1, 2])).toEqual({});
    expect(limparProgresso({ kame: 'sim', terra: { normalDone: 1 } })).toEqual({ terra: { normalDone: false, hardDone: false } });
  });
  it('sem localStorage não quebra', () => {
    expect(lerProgresso(null)).toEqual({});
    expect(salvarModoCompleto('kame', 'normal', null)).toEqual({});
  });
  it('recorde só grava quando bate', () => {
    const a = memoria();
    expect(salvarRecorde('kame', 'normal', 20, 5, a)).toBe(true);
    expect(salvarRecorde('kame', 'normal', 15, 5, a)).toBe(false);
    expect(salvarRecorde('kame', 'normal', 25, 5, a)).toBe(true);
    expect(lerRecordes(a).kame?.normal).toEqual({ pontos: 25, onda: 5 });
  });
});
