// v0.127: o toque no OK de um aviso não pode chegar ao jogo (o OK do TRANSMITIR PARA A TV ficava em cima de IDIOMAS
// e abria a tela de idiomas). O Phaser escuta toque/mouse também fora do canvas, então a janela barra todos.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('janelas do sistema', () => {
  it('barram toque e mouse (início e fim) antes de chegarem ao jogo', () => {
    const src = readFileSync(join(__dirname, '..', 'src', 'ui', 'janela.ts'), 'utf8');
    for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup']) expect(src).toContain(`'${ev}'`);
    expect(src).toContain('fundo.addEventListener(ev, (e) => e.stopPropagation())');
  });
});
