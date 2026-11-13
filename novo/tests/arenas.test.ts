// As arenas usam o código de desenho do jogo antigo (gerado em src/legado). Aqui: o gerado está em dia com o
// antigo e as 11 arenas desenham sem erro (num canvas de mentira) em vários momentos da luta.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FASES } from '../src/dados/fases';

const raiz = path.join(__dirname, '../..');
const gerado = fs.readFileSync(path.join(__dirname, '../src/legado/cenarios-legado.js'), 'utf8');

function contexto(c: { width: number; height: number }) {
  const grad = () => ({ addColorStop() {} });
  const chamadas = { n: 0 };
  const base: Record<string, unknown> = {
    canvas: c, createLinearGradient: grad, createRadialGradient: grad, createPattern: () => ({ setTransform() {} }),
    measureText: () => ({ width: 10 }), getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }),
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), __chamadas: chamadas,
  };
  return new Proxy(base, {
    get: (t, k: string) => (k in t ? t[k] : (..._a: unknown[]) => { chamadas.n++; }),
    set: (t, k: string, v) => { t[k] = v; return true; },
  });
}
function canvasFalso() {
  const c: { width: number; height: number; style: object; getContext?: () => unknown } = { width: 800, height: 350, style: {} };
  const g = contexto(c);
  c.getContext = () => g;
  return c;
}

let docAntes: unknown;
beforeAll(() => {
  docAntes = (globalThis as { document?: unknown }).document;
  (globalThis as { document?: unknown }).document = { createElement: () => canvasFalso() };
});
afterAll(() => { (globalThis as { document?: unknown }).document = docAntes; });

describe('arenas do jogo antigo', () => {
  it('o arquivo gerado tem o cenarios3d.js inteiro e os trechos do menu.js (rodar scripts/gerar-cenarios-legado.mjs)', () => {
    expect(gerado).toContain(fs.readFileSync(path.join(raiz, 'cenarios3d.js'), 'utf8'));
    const menu = fs.readFileSync(path.join(raiz, 'menu.js'), 'utf8');
    const i = menu.indexOf('// ==================== SALA DO TEMPO'), j = menu.indexOf('// ==================== RENDERIZAÇÃO DE ENTIDADES');
    expect(gerado).toContain(menu.slice(i, j));
    const arenas = fs.readFileSync(path.join(raiz, 'arenas.js'), 'utf8');
    expect(gerado).toContain(arenas.slice(0, arenas.indexOf('// ---------------- arquivo .arena.json')));
  });

  it('arena criada no EDITOR DE ARENAS do antigo desenha com todas as peças, horas, climas e movimentos', async () => {
    const { criarCenariosLegado, definirArenasCriadas } = await import('../src/legado/cenarios-legado.js');
    const t = fs.readFileSync(path.join(raiz, 'arenas.js'), 'utf8');
    const tipos = [...t.slice(t.indexOf('const ARENA_PECAS = {'), t.indexOf('const ARENA_PLANICIES')).matchAll(/^ {4}(\w+): \{/gm)].map((m) => m[1]);
    expect(tipos.length).toBeGreaterThan(50);
    const pecas = tipos.map((tp, i) => ({ t: tp, x: ((i % 9) - 4) * 80, z: (Math.floor(i / 9) - 3) * 80, a: (i * 37) % 360, h: 0.4, pts: [[0, 0], [40, 20]] }));
    const lista = [];
    for (const hora of ['dia', 'tarde', 'noite']) for (const clima of ['nenhum', 'chuva', 'neve', 'neblina', 'vento', 'lava']) for (const movimento of ['girar', 'seguir'])
      lista.push({ id: `arena_${hora}_${clima}_${movimento}`, nome: 'TESTE', hora, clima, movimento, pecas, planicie: '', camera: 'media' });
    definirArenasCriadas(lista);
    const c = canvasFalso();
    const leg = criarCenariosLegado(c as unknown as HTMLCanvasElement);
    const g = c.getContext!() as { __chamadas: { n: number } };
    for (const a of lista) {
      const antes = g.__chamadas.n;
      for (const q of [0, 1, 600]) leg.desenhar(a.id, q * 1.5, q / 60);
      expect(g.__chamadas.n - antes, a.id).toBeGreaterThan(200);
    }
    definirArenasCriadas([]);
  });

  it('as 11 arenas desenham sem erro em vários momentos (1x e 2x)', async () => {
    const { criarCenariosLegado } = await import('../src/legado/cenarios-legado.js');
    for (const k of [1, 2]) {
      const c = canvasFalso();
      const leg = criarCenariosLegado(c as unknown as HTMLCanvasElement);
      leg.escala(k);
      expect(c.width).toBe(800 * k);
      for (const f of FASES) {
        const g = c.getContext!() as { __chamadas: { n: number } };
        const antes = g.__chamadas.n;
        for (const q of [0, 1, 600, 3600, 20000]) leg.desenhar(f.id, q * 1.5, q / 60);
        expect(g.__chamadas.n - antes, f.id).toBeGreaterThan(50); // desenhou alguma coisa
      }
    }
  });
});
