// v0.141: formas ainda não feitas em luta ficam travadas (silhueta, fora do tutorial) e cada uma é uma conquista.
import { describe, expect, it } from 'vitest';
import { CONQUISTAS, formaLiberada, idConquistaForma, nivelLiberado, RastreioDaLuta, Conquistas } from '../src/logica/conquistas';
import { limitarFormas, criarTutorial, avancarPasso, passoAtual } from '../src/logica/tutorial';
import { fichaDoPersonagem } from '../src/logica/ficha';

const memoria = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } }; };

describe('formas liberadas', () => {
  it('uma conquista por transformação (a forma normal não conta) e "todas as conquistas" continua por último', () => {
    expect(CONQUISTAS.some((c) => c.id === idConquistaForma('goku', 'ssj3'))).toBe(true);
    expect(CONQUISTAS.some((c) => c.id === idConquistaForma('goku', 'normal'))).toBe(false);
    expect(CONQUISTAS[CONQUISTAS.length - 1].id).toBe('all_achievements');
  });
  it('a normal sempre liberada; as outras só depois de feitas, em ordem', () => {
    const c = new Conquistas(memoria());
    expect(formaLiberada(c, 'goku', 0)).toBe(true);
    expect(formaLiberada(c, 'goku', 1)).toBe(false);
    expect(nivelLiberado(c, 'goku')).toBe(0);
    c.destravar(idConquistaForma('goku', 'ssj'));
    c.destravar(idConquistaForma('goku', 'ssj3'));
    expect(nivelLiberado(c, 'goku')).toBe(2);
  });
  it('transformar na luta destrava a conquista da forma (J1; o J2 só no VERSUS)', () => {
    const c = new Conquistas(memoria());
    const r = new RastreioDaLuta(c, 'cpu');
    const e = { p1: { personagem: 'vegeta', nivel: 1, comboParry: 0 }, p2: { personagem: 'freeza', nivel: 1 } } as never;
    r.passo(e, [{ tipo: 'transformou', dono: 'p1', nivel: 1, arremessados: 0 }, { tipo: 'transformou', dono: 'p2', nivel: 1, arremessados: 0 }]);
    expect(c.tem(idConquistaForma('vegeta', 'ssj'))).toBe(true);
    expect(c.tem(idConquistaForma('freeza', 'f2'))).toBe(false);
    new RastreioDaLuta(c, 'versus').passo(e, [{ tipo: 'transformou', dono: 'p2', nivel: 1, arremessados: 0 }]);
    expect(c.tem(idConquistaForma('freeza', 'f2'))).toBe(true);
  });
  it('tutorial: só chega às formas feitas; sem nenhuma, o passo TRANSFORMAR é pulado', () => {
    const tu = criarTutorial(fichaDoPersonagem('goku'), 1, 0);
    limitarFormas(tu.luta.p1, 0);
    expect(tu.luta.p1.alturas.length).toBe(1);
    while (passoAtual(tu.t) && passoAtual(tu.t)!.chave !== 'parry') avancarPasso(tu.luta, tu.t);
    avancarPasso(tu.luta, tu.t);   // depois do parry viria TRANSFORMAR
    expect(passoAtual(tu.t)?.chave).not.toBe('transform');
  });
});
