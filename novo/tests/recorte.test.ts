// v0.156: recorte ajustável do editor de personagens (portado do editor de sprite sheet do jogo antigo) e os
// quadros dos personagens do jogo no editor
import { describe, expect, it } from 'vitest';
import {
  alcaNoPonto, alinharEspacamento, celulaNoPonto, celulasAjustadas, celulasNoRetangulo, gradeDaFolha, moverRet, quadrosDoAtlas, redimensionarRet,
} from '../src/logica/editorPersonagem';

describe('recorte ajustável', () => {
  const grade = gradeDaFolha(200, 100, 50, 50); // 4 x 2
  it('ajustes trocam só o quadro mexido', () => {
    const c = celulasAjustadas(grade, { 1: { x: 60, y: 5, w: 40, h: 45 } });
    expect(c[1]).toEqual({ x: 60, y: 5, w: 40, h: 45, i: 1 });
    expect(c[0]).toEqual(grade[0]);
  });
  it('ponto e retângulo arrastado', () => {
    expect(celulaNoPonto(grade, 75, 10)?.i).toBe(1);
    expect(celulaNoPonto(grade, 300, 10)).toBeNull();
    expect(celulasNoRetangulo(grade, 40, 40, 110, 60)).toEqual([0, 1, 2, 4, 5, 6]);
  });
  it('mover e redimensionar não saem da imagem', () => {
    expect(moverRet({ x: 10, y: 10, w: 50, h: 50 }, -30, 200, 200, 100)).toEqual({ x: 0, y: 50, w: 50, h: 50 });
    expect(redimensionarRet({ x: 10, y: 10, w: 50, h: 50 }, 'e', 500, 0, 200, 100).w).toBe(190);
    expect(redimensionarRet({ x: 10, y: 10, w: 50, h: 50 }, 'w', -30, 0, 200, 100)).toEqual({ x: 0, y: 10, w: 60, h: 50 });
    expect(redimensionarRet({ x: 10, y: 10, w: 50, h: 50 }, 'n', 0, 100, 200, 100)).toEqual({ x: 10, y: 59, w: 50, h: 1 });
  });
  it('alças: canto de cima à direita move, bordas redimensionam', () => {
    const r = { x: 10, y: 10, w: 50, h: 50 };
    expect(alcaNoPonto(r, 58, 12, 4)).toBe('mover');
    expect(alcaNoPonto(r, 10, 35, 4)).toBe('w');
    expect(alcaNoPonto(r, 60, 35, 4)).toBe('e');
    expect(alcaNoPonto(r, 30, 60, 4)).toBe('s');
    expect(alcaNoPonto(r, 30, 35, 4)).toBeNull();
    expect(alcaNoPonto(r, 150, 35, 4)).toBeNull();
  });
  it('alinhar o espaço entre os escolhidos (linha a linha)', () => {
    const r = alinharEspacamento({ 0: { x: 3, y: 2, w: 40, h: 40 }, 1: { x: 70, y: 4, w: 40, h: 40 }, 2: { x: 10, y: 60, w: 40, h: 30 } }, 5, 2, 300, 200);
    expect(r[1].x).toBe(3 + 40 + 5);
    expect(r[2].y).toBe(4 + 40 + 2); // a 2ª linha começa embaixo do mais baixo da 1ª
  });
});

describe('quadros dos personagens do jogo', () => {
  it('separa por movimento, na ordem dos números', () => {
    const q = (x: number) => ({ frame: { x, y: 0, w: 1, h: 1 }, sourceSize: { w: 144, h: 168 }, spriteSourceSize: { x: 0, y: 0 } });
    const r = quadrosDoAtlas({ 'idle/10': q(10), 'idle/2': q(2), 'attackKi/0': q(0), 'lixo/0': q(99), 'idle/x': q(98) });
    expect(r.idle!.map((f) => f.frame.x)).toEqual([2, 10]);
    expect(r.attackKi!.length).toBe(1);
    expect(Object.keys(r)).not.toContain('lixo');
  });
});
