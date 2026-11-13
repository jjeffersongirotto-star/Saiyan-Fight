// Confere os atlas gerados por scripts/gerar-atlas.py para TODAS as formas dos 16 personagens: existe, todo
// movimento tem quadros, toda célula tem o tamanho do desenho do jogo antigo e todo quadro cabe na imagem.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOVIMENTOS } from '../src/logica/animacao';
import { chaveDoAtlas, ORDEM_PERSONAGENS, PERSONAGENS } from '../src/dados/personagens';
import { formaParaDesenhar, formasNecessarias } from '../src/logica/formas';

const PASTA = join(__dirname, '..', 'public', 'atlas');
const PACOTES = join(__dirname, '..', '..', 'conjuntos');

describe('personagens e formas', () => {
  it('16 personagens jogáveis e 47 formas, as mesmas dos pacotes do jogo antigo', () => {
    expect(ORDEM_PERSONAGENS.length).toBe(16);
    const formas = Object.values(PERSONAGENS).flatMap((p) => p.formas.map((f) => `${p.id}/${f.forma}`));
    expect(formas.length).toBe(47);
    for (const f of formas) expect(existsSync(join(PACOTES, `${f}.json`)), f).toBe(true);
  });

  it('a ordem das formas é a ordem das variantes do pacote (base + transformações)', () => {
    for (const p of Object.values(PERSONAGENS)) {
      const pacote = JSON.parse(readFileSync(join(PACOTES, p.id, `${p.formas[0].forma}.json`), 'utf8'));
      expect(p.formas.map((f) => f.forma), p.id).toEqual(pacote.variantes);
    }
  });

  it('retratos da seleção', () => {
    const j = JSON.parse(readFileSync(join(PASTA, 'retratos.json'), 'utf8'));
    for (const id of ORDEM_PERSONAGENS) expect(j.frames[id], id).toBeDefined();
  });

  it('a luta pede a forma atual + a próxima de cada um', () => {
    expect(formasNecessarias([{ personagem: 'goku', nivel: 0 }, { personagem: 'raditz', nivel: 0 }]).sort()).toEqual(['goku-normal', 'goku-ssj', 'raditz-normal']);
    expect(formasNecessarias([{ personagem: 'goku', nivel: 5 }])).toEqual(['goku-instinto']);
    // mesmo personagem dos dois lados: não pede duas vezes
    expect(formasNecessarias([{ personagem: 'cell', nivel: 0 }, { personagem: 'cell', nivel: 0 }]).length).toBe(2);
  });

  it('enquanto a forma nova baixa, desenha a anterior', () => {
    const carregadas = new Set(['goku-normal', 'goku-ssj']);
    expect(formaParaDesenhar('goku', 2, (k) => carregadas.has(k))).toBe('goku-ssj');
    expect(formaParaDesenhar('goku', 1, (k) => carregadas.has(k))).toBe('goku-ssj');
    expect(formaParaDesenhar('vegeta', 0, (k) => carregadas.has(k))).toBeNull();
  });
});

describe('atlas de cada forma', () => {
  for (const p of Object.values(PERSONAGENS)) {
    p.formas.forEach((_, nivel) => {
      const chave = chaveDoAtlas(p.id, nivel);
      it(`${chave}: quadros válidos para os 14 movimentos`, () => {
        expect(existsSync(join(PASTA, `${chave}.webp`))).toBe(true);
        const j = JSON.parse(readFileSync(join(PASTA, `${chave}.json`), 'utf8'));
        const { w: W, h: H } = j.meta.size;
        const esc = j.meta.saiyan.escala;
        expect(W).toBeLessThanOrEqual(2048);
        expect(H).toBeLessThanOrEqual(2048);
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
    });
  }
});
