// v0.155: a lista dos últimos erros (faixa vermelha do app/erros.ts)
import { describe, expect, it } from 'vitest';
import { guardarErro, MAX_ERROS, textoDoErro, type ErroGuardado } from '../src/logica/erros';

const e = (msg: string, quando = '2026-01-01T00:00:00Z'): ErroGuardado => ({ msg, quando, versao: '0.155.0' });

describe('erros guardados', () => {
  it('guarda no máximo MAX_ERROS, o mais novo no fim', () => {
    let l: ErroGuardado[] = [];
    for (let i = 0; i < 8; i++) l = guardarErro(l, e(`erro ${i}`));
    expect(l.length).toBe(MAX_ERROS);
    expect(l[l.length - 1].msg).toBe('erro 7');
  });
  it('o mesmo erro seguido não repete: só atualiza a hora', () => {
    const l = guardarErro(guardarErro([], e('x', 'a')), e('x', 'b'));
    expect(l).toEqual([{ msg: 'x', quando: 'b', versao: '0.155.0' }]);
  });
  it('texto curto: mensagem, onde e a primeira linha da pilha', () => {
    expect(textoDoErro('boom', 'index.js:10', 'Error: boom\n    at f (index.js:10:3)\n    at g (x.js:1:1)')).toBe('boom | index.js:10 | at f (index.js:10:3)');
    expect(textoDoErro('só')).toBe('só');
  });
});
