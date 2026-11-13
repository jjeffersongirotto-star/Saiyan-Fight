// Personagens e arenas feitos nos EDITORES do jogo antigo, lidos (só leitura) pelo jogo novo.
import { describe, expect, it } from 'vitest';
import { abrirCelula, caixaNaCelula, idDoCriado, lerArenasCriadas, lerPersonagensCriados, quadrosDoMovimento } from '../src/logica/criados';
import { CHAVES_ANTIGAS_PADRAO, ORDEM_PERSONAGENS, PERSONAGENS, registrarCriados } from '../src/dados/personagens';
import { definirArenasDoJogador, fasePadrao, ordenarFases, todasAsFases } from '../src/dados/fases';
import { faseLiberada } from '../src/logica/ondas';

class Memoria {
  m = new Map<string, string>();
  constructor(x: Record<string, unknown> = {}) { for (const [k, v] of Object.entries(x)) this.m.set(k, JSON.stringify(v)); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const cel = (x: number) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="168" viewBox="0 0 96 112" shape-rendering="crispEdges"><image x="${x}" y="40.5" width="40" height="63" preserveAspectRatio="none" href="${PNG}"/></svg>`);

describe('personagens criados no editor do antigo', () => {
  const db = {
    goku_adult: { name: 'Goku', defaultUrl: PNG, animations: { idle: [PNG] } },
    saibaman: { name: 'Saibaman', minion: true, defaultUrl: PNG, animations: { idle: [PNG] } },
    char_1: { name: 'Meu Herói', defaultUrl: PNG, alignment: 'VILÃO', aura: 'roxo', special: 'raio', projColor: '#ff0000', altura: 190,
      animations: { idle: [PNG, PNG], attackKi: [PNG], special: [], flyRight: ['nao-e-imagem'] }, fpsSettings: { idle: 8 },
      transformations: [{ name: 'Forma 2', aura: 'amarelo' }, { name: 'Forma 3' }] },
    char_2: { name: 'Conjunto', defaultUrl: PNG, animations: {}, transformations: [{ name: 'T1' }, { name: 'T2' }],
      spriteForms: [{ id: 'b1', tipo: 'base', animations: { idle: [cel(28)] } }, { id: 't1', tipo: 'transf', nivel: 1, noIdb: true }],
      spriteGroups: [{ id: 'g', base: 'b1', transfs: ['t1'] }], spriteActive: 'g' },
    char_vazio: { name: 'Sem quadros', defaultUrl: PNG, animations: {} },
  };
  const lista = lerPersonagensCriados(new Memoria({ saiyan_db_v8_8bit: db }), CHAVES_ANTIGAS_PADRAO);
  it('só os criados com quadros (sem os 16 do jogo, minions e vazios)', () => {
    expect(lista.map((p) => p.chaveAntiga)).toEqual(['char_1', 'char_2']);
    expect(lista[0].id).toBe(idDoCriado('char_1'));
  });
  it('ORIGINAL: todas as formas usam os quadros do personagem; nomes, auras, altura e golpe do antigo', () => {
    const p = lista[0];
    expect(p.formas.map((f) => [f.forma, f.nome, f.aura, f.altura])).toEqual([['orig', 'Normal', 'roxo', 190], ['orig', 'Forma 2', 'amarelo', 190], ['orig', 'Forma 3', 'roxo', 190]]);
    expect([p.alinhamento, p.especial, p.corKi]).toEqual(['VILÃO', 'RAIO', 0xff0000]);
    expect(p.quadros.orig.flyRight).toBeUndefined();
    expect(p.fps.orig).toEqual({ idle: 8 });
  });
  it('CONJUNTO: o grupo em uso dá a base e cada transformação sobe uma forma; acabando, fica na última', () => {
    const p = lista[1];
    expect(p.formas.map((f) => f.forma)).toEqual(['fb1', 'ft1', 'ft1']);
    expect(p.noIndexedDb).toEqual(['t1']);
  });
  it('movimento que falta: especial → ataque → parado', () => {
    const q = lista[0].quadros.orig;
    expect(quadrosDoMovimento(q, 'special')).toBe(q.attackKi);
    expect(quadrosDoMovimento(q, 'flyUp')).toBe(q.idle);
  });
  it('a célula SVG do antigo é aberta para desenhar a imagem de dentro', () => {
    expect(abrirCelula(cel(28))).toEqual({ x: 28, y: 40.5, w: 40, h: 63, href: PNG });
    expect(abrirCelula(PNG)).toBeNull();
    const c = caixaNaCelula();
    expect(c.w).toBeCloseTo(144 / 1.54);
    expect(c.y + c.h * 103 / 112).toBeCloseTo(168 * 103 / 112);
  });
  it('entram depois dos 16 e saem ao registrar de novo', () => {
    registrarCriados(lista);
    expect(ORDEM_PERSONAGENS.slice(16)).toEqual(lista.map((p) => p.id));
    registrarCriados([]);
    expect(ORDEM_PERSONAGENS).toHaveLength(16);
    expect(Object.values(PERSONAGENS).some((p) => p.criado)).toBe(false);
  });
  it('nada é gravado nas chaves do antigo', () => {
    const a = new Memoria({ saiyan_db_v8_8bit: db });
    const antes = a.getItem('saiyan_db_v8_8bit');
    lerPersonagensCriados(a, CHAVES_ANTIGAS_PADRAO);
    expect(a.getItem('saiyan_db_v8_8bit')).toBe(antes);
    expect(a.m.size).toBe(1);
  });
});

describe('arenas criadas no editor do antigo', () => {
  it('até 7, com id válido; viram fases no fim, sempre liberadas, com música e minion do antigo', () => {
    const l = lerArenasCriadas(new Memoria({ saiyan_arenas: [...Array.from({ length: 9 }, (_, i) => ({ id: `arena_${i}`, nome: `a${i}`, musica: i === 0 ? 'namek' : 'nao-existe', minion: i === 0 ? 'celljr' : 'x' })), { id: 'ruim' }] }));
    expect(l).toHaveLength(7);
    definirArenasDoJogador(l);
    expect(todasAsFases()).toHaveLength(18);
    expect(fasePadrao('arena_0')).toMatchObject({ nome: 'A0', musica: 'namek', minion: 'celljr', criada: true });
    expect(fasePadrao('arena_1').musica).toBe('classico');
    const ordem = ordenarFases(['arena_3', 'kame']).map((f) => f.id);
    expect(ordem.slice(0, 2)).toEqual(['arena_3', 'kame']);
    expect(ordem).toHaveLength(18);
    expect(faseLiberada('arena_5', ordem, {})).toBe(true);
    definirArenasDoJogador([]);
    expect(todasAsFases()).toHaveLength(11);
  });
});
