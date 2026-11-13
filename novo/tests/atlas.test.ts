// Confere os atlas gerados por scripts/gerar-atlas.py: todo movimento tem quadros, toda célula tem o tamanho do
// desenho do jogo antigo (96x112 x escala) e todo quadro cabe dentro da imagem.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOVIMENTOS } from '../src/logica/animacao';
import { PERSONAGENS } from '../src/dados/personagens';

const PASTA = join(__dirname, '..', 'public', 'atlas');

describe('atlas dos personagens', () => {
  it('existe um atlas (webp + json) para cada personagem da prévia', () => {
    const arquivos = readdirSync(PASTA);
    for (const p of Object.values(PERSONAGENS)) {
      expect(arquivos).toContain(`${p.atlas}.webp`);
      expect(arquivos).toContain(`${p.atlas}.json`);
    }
  });
  for (const p of Object.values(PERSONAGENS)) {
    it(`${p.atlas}: quadros válidos para os 14 movimentos`, () => {
      const j = JSON.parse(readFileSync(join(PASTA, `${p.atlas}.json`), 'utf8'));
      const { w: W, h: H } = j.meta.size;
      const esc = j.meta.saiyan.escala;
      expect(W).toBeLessThanOrEqual(2048);
      expect(H).toBeLessThanOrEqual(4096);
      for (const mov of MOVIMENTOS) {
        const n = j.meta.saiyan.movimentos[mov];
        expect(n, mov).toBeGreaterThan(0);
        for (let i = 0; i < n; i++) {
          const f = j.frames[`${mov}/${i}`];
          expect(f, `${mov}/${i}`).toBeDefined();
          expect(f.sourceSize).toEqual({ w: Math.round(96 * esc), h: Math.round(112 * esc) });
          expect(f.frame.x + f.frame.w).toBeLessThanOrEqual(W);
          expect(f.frame.y + f.frame.h).toBeLessThanOrEqual(H);
        }
      }
    });
  }
});
