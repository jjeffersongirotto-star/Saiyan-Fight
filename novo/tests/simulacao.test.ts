import { describe, expect, it } from 'vitest';
import { fichaDoPersonagem } from '../src/logica/ficha';
import { entradaDaIA } from '../src/logica/ia';
import { criarLuta, passoLuta } from '../src/logica/luta';
import { PERSONAGENS } from '../src/dados/personagens';
import type { Evento } from '../src/logica/tipos';

// Partidas inteiras CPU x CPU: nada trava, sempre termina, os dois usam tudo (sem ninguém "congelado").
describe('simulação CPU x CPU', () => {
  const ids = Object.keys(PERSONAGENS);
  it.each(ids.map((a, i) => [a, ids[(i + 5) % ids.length], i + 1] as const))('%s x %s termina', (a, b, semente) => {
    const e = criarLuta(fichaDoPersonagem(a), fichaDoPersonagem(b), semente);
    const conta: Record<string, number> = {};
    let q = 0;
    for (; q < 60 * 60 * 8 && e.fase !== 'fimPartida'; q++) {
      const ev: Evento[] = passoLuta(e, { p1: entradaDaIA(e, 'p1', { dificuldade: 0.5 }), p2: entradaDaIA(e, 'p2', { dificuldade: 0.7 }) });
      for (const x of ev) conta[x.tipo] = (conta[x.tipo] ?? 0) + 1;
    }
    expect(e.fase).toBe('fimPartida');
    expect(conta.tiro).toBeGreaterThan(10);
    expect(conta.acerto).toBeGreaterThan(3);
    expect((conta.parry ?? 0) + (conta.especial ?? 0)).toBeGreaterThan(0);
  });
});
