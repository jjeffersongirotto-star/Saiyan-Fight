import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cadeadoAbrindo, inteiroNaTela, limitarRolagem, naTela, posicaoNoMapa, rolagemParaFase, recordeDeOnda, totalNoMapa, TOTAL_NO_MAPA } from '../src/logica/mapa';

// a geometria do antigo (game-logic-core.js), para conferir que o caminho é o mesmo
const core = readFileSync(new URL('../../game-logic-core.js', import.meta.url), 'utf8');
const ini = core.indexOf('// ==================== MAPA DE PROGRESSO (fases em linha)');
const fim = core.indexOf('// Altura do personagem', ini);
const antigo = new Function(`${core.slice(ini, fim)}; return { getMapaPosicaoFase, limitarRolagemMapa, rolagemParaFase, MAPA_TOTAL_FASES };`)() as {
  getMapaPosicaoFase(i: number): { x: number; y: number };
  limitarRolagemMapa(r: number, t: number): number;
  rolagemParaFase(i: number, t: number): number;
  MAPA_TOTAL_FASES: number;
};

describe('mapa de fases (geometria do antigo)', () => {
  it('mesmas posições das 60 fases', () => {
    for (let i = 0; i < 60; i++) expect(posicaoNoMapa(i)).toEqual(antigo.getMapaPosicaoFase(i));
  });
  it('mesmo total e mesmos limites de rolagem', () => {
    expect(TOTAL_NO_MAPA).toBe(antigo.MAPA_TOTAL_FASES);
    for (const r of [-50, 0, 300, 5000, 1e9, Infinity]) expect(limitarRolagem(r, 60)).toBe(antigo.limitarRolagemMapa(r, 60));
    for (const i of [0, 3, 10, 59]) expect(rolagemParaFase(i, 60)).toBe(antigo.rolagemParaFase(i, 60));
  });
  it('sempre sobra ao menos uma fase futura', () => {
    expect(totalNoMapa(11)).toBe(60);
    expect(totalNoMapa(70)).toBe(71);
  });
  it('o caminho fica no chão (abaixo do horizonte, acima do rodapé)', () => {
    for (let i = 0; i < 60; i++) { const y = posicaoNoMapa(i).y; expect(y).toBeGreaterThan(100 + 30); expect(y).toBeLessThan(350 - 60); }
  });
  it('visibilidade dos nós', () => {
    expect(naTela(-90)).toBe(true);
    expect(naTela(-100)).toBe(false);
    expect(inteiroNaTela(26)).toBe(true);
    expect(inteiroNaTela(20)).toBe(false);
    expect(inteiroNaTela(774)).toBe(true);
  });
  it('cadeado abrindo: espera, abre, cai e some', () => {
    expect(cadeadoAbrindo(0.1)).toEqual({ aberto: 0, queda: 0, alfa: 1 });
    expect(cadeadoAbrindo(0.8)!.aberto).toBe(1);
    expect(cadeadoAbrindo(1.5)!.alfa).toBeCloseTo(0);
    expect(cadeadoAbrindo(1.6)).toBeNull();
  });
  it('recorde de onda é o maior entre os modos', () => {
    expect(recordeDeOnda(undefined)).toBe(0);
    expect(recordeDeOnda({ normal: { pontos: 10, onda: 5 }, unlimited: { pontos: 99, onda: 12 } })).toBe(12);
  });
});
