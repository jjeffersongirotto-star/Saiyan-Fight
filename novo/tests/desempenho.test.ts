// v0.125: vigia de desempenho (60 fps em qualquer fase): baixa a resolução 2x → 1,5x → 1x quando faltam quadros.
import { describe, expect, it } from 'vitest';
import { criarVigia, degrauAbaixo, escalaInicial, JANELA, JANELAS_PARA_BAIXAR, ESPERA_DEPOIS, medirQuadro } from '../src/logica/desempenho';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const janelas = (v: ReturnType<typeof criarVigia>, n: number, ms: number) => {
  let baixou = 0;
  for (let i = 0; i < n * JANELA; i++) if (medirQuadro(v, ms) !== 'nada') baixou++;
  return baixou;
};

describe('vigia de desempenho', () => {
  it('a 60 fps nunca baixa', () => {
    expect(janelas(criarVigia(), 50, 1000 / 60)).toBe(0);
  });
  it('a 40 fps baixa depois da espera inicial e de duas janelas lentas', () => {
    const v = criarVigia();
    expect(janelas(v, ESPERA_DEPOIS + JANELAS_PARA_BAIXAR - 1, 25)).toBe(0);
    expect(janelas(v, 1, 25)).toBe(1);
  });
  it('depois de baixar, espera o novo degrau assentar', () => {
    const v = criarVigia();
    janelas(v, ESPERA_DEPOIS + JANELAS_PARA_BAIXAR, 25);
    expect(janelas(v, ESPERA_DEPOIS + JANELAS_PARA_BAIXAR - 1, 25)).toBe(0);
    expect(janelas(v, 1, 25)).toBe(1);
  });
  it('soluços (carregando, app no fundo) não contam', () => {
    const v = criarVigia();
    let baixou = 0;
    for (let i = 0; i < 20 * JANELA; i++) if (medirQuadro(v, i % 30 === 0 ? 900 : 1000 / 60) !== 'nada') baixou++;
    expect(baixou).toBe(0);
  });
  it('uma janela lenta isolada não baixa', () => {
    const v = criarVigia();
    janelas(v, ESPERA_DEPOIS, 16);
    expect(janelas(v, 1, 25) + janelas(v, 1, 16) + janelas(v, 1, 25) + janelas(v, 1, 16)).toBe(0);
  });
  it('entre 40 e 55 fps desce um degrau; abaixo de 40 fps vai direto ao mais leve', () => {
    const pedidos = (ms: number) => { const v = criarVigia(); const r: string[] = []; for (let i = 0; i < (ESPERA_DEPOIS + JANELAS_PARA_BAIXAR) * JANELA; i++) { const p = medirQuadro(v, ms); if (p !== 'nada') r.push(p); } return r; };
    expect(pedidos(21)).toEqual(['baixar']);
    expect(pedidos(34)).toEqual(['minimo']);
  });
  it('degraus: 2 → 1,5 → 1 e para', () => {
    expect(degrauAbaixo(2)).toBe(1.5);
    expect(degrauAbaixo(1.5)).toBe(1);
    expect(degrauAbaixo(1)).toBeNull();
    expect(escalaInicial(2.625)).toBe(2);
    expect(escalaInicial(1)).toBe(1);
  });
  it('o cenário 3D é desenhado em 1x e só alivia pelo vigia (não pelo tempo do processador)', () => {
    const src = readFileSync(join(__dirname, '..', 'src', 'ui', 'arena.ts'), 'utf8');
    expect(src).toContain('private readonly k = 1;');
    expect(src).toContain('aoFaltarDesempenho');
    expect(src).not.toContain('LIMITE_MS');
  });
});
