// Trilhas e sons: a notação das 11 músicas do jogo antigo lê sem erro e cada passo toca o que deveria.
import { describe, expect, it } from 'vitest';
import { ORDEM_TEMAS, TEMAS } from '../src/dados/temas';
import {
  compilarTema, duracaoDoPasso, lerLinha, midiParaFreq, notaParaMidi, SONS, TEMA_DA_LUTA, temaExiste, tocarPasso,
} from '../src/logica/musica';

describe('notação', () => {
  it('nota -> MIDI -> frequência', () => {
    expect(notaParaMidi('A4')).toBe(69);
    expect(notaParaMidi('C4')).toBe(60);
    expect(notaParaMidi('C#5')).toBe(73);
    expect(notaParaMidi('Bb1')).toBe(34);
    expect(notaParaMidi('-')).toBeNull();
    expect(midiParaFreq(69)).toBe(440);
    expect(midiParaFreq(81)).toBeCloseTo(880, 6);
  });
  it('linha em semicolcheias: a nota no 1º passo, o resto vazio', () => {
    expect(lerLinha('D5:4 -:2 | E5:1')).toEqual([{ nota: 'D5', dur: 4 }, null, null, null, null, null, { nota: 'E5', dur: 1 }]);
  });
});

describe('as 11 trilhas', () => {
  it('são 11, na ordem das fases, com a da luta entre elas', () => {
    expect(ORDEM_TEMAS).toEqual(['kame', 'classico', 'kaio', 'namek', 'freeza', 'explosao', 'gt', 'cell', 'boo', 'kami', 'capital']);
    expect(temaExiste(TEMA_DA_LUTA)).toBe(true);
  });
  for (const id of ORDEM_TEMAS) {
    it(`${id}: todas as notas existem e melodia/baixo/bateria fecham os 8 compassos`, () => {
      const t = TEMAS[id];
      const c = compilarTema(t);
      expect(t.acordes.length).toBe(8);
      expect(c.melodia.length).toBe(8 * t.compasso);
      expect(c.baixo.length).toBe(8 * t.compasso);
      for (const n of [...c.melodia, ...c.baixo]) if (n) expect(Number.isFinite(n.midi)).toBe(true);
      for (const b of [t.bumbo, t.caixa, t.chimbal]) expect(b === '' || b.length === t.compasso).toBe(true);
      expect(c.melodia.some(Boolean)).toBe(true);
    });
  }
});

describe('cada passo', () => {
  const t = TEMAS.classico;
  it('volta da música: prato + bumbo + a 1ª nota (G4) e o baixo (G2)', () => {
    const p = tocarPasso(t, 0, 1);
    expect(p.bateria.map((b) => b.tipo)).toEqual(['prato', 'bumbo']);
    expect(p.notas.map((n) => Math.round(n.freq))).toEqual([392, 98]);
    expect(p.notas[0].onda).toBe('square');
    expect(p.atraso).toBe(0);
  });
  it('balanço (swing): a 2ª colcheia de cada tempo chega atrasada', () => {
    expect(tocarPasso(t, 2, 1).atraso).toBeCloseTo(t.swing * duracaoDoPasso(t), 9);
    expect(tocarPasso(TEMAS.freeza, 2, 1).atraso).toBe(0);
  });
  it('o volume da música multiplica tudo; volume 0 = silêncio', () => {
    const p = tocarPasso(t, 0, 0.5);
    expect(p.notas[0].vol).toBeCloseTo(t.lead.vol * 0.5, 9);
    expect(tocarPasso(t, 0, 0).notas.every((n) => n.vol === 0)).toBe(true);
  });
  it('a música dá a volta (passo além do fim = começo)', () => {
    const c = compilarTema(t);
    expect(tocarPasso(t, c.total, 1)).toEqual(tocarPasso(t, 0, 1));
  });
  it('semicolcheia pelo andamento', () => {
    expect(duracaoDoPasso(TEMAS.classico)).toBeCloseTo(60 / 132 / 4, 9);
  });
});

describe('efeitos sonoros (playSound)', () => {
  it('os 9 sons do jogo antigo', () => {
    expect(Object.keys(SONS).sort()).toEqual(['charge', 'hit', 'max_ki', 'menu', 'powerup', 'reflect', 'shoot', 'super', 'transform']);
    expect(SONS.transform).toMatchObject({ onda: 'triangle', de: 100, para: 1200, dur: 0.8 });
    for (const s of Object.values(SONS)) expect(s.dur).toBeGreaterThan(0);
  });
});
