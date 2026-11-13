// EDITORES do jogo novo (src/editor/): os dados e as contas que não dependem de tela, e que eles não precisam do
// jogo antigo (nada de iframe/antigo/index.html) nem gravam nas chaves dele.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  adicionarTransformacao, apagarQuadro, clonarQuadro, corDoCanto, deArquivo, doCriadoAntigo, formaComQuadros, gradeDaFolha, juntarQuadros, moverQuadro,
  moverTransformacao, nomeDoArquivo, normalizarPersonagem, novoPersonagem, paraArquivo, paraCriado, problemasDoPersonagem, QUADROS_MAX, removerFundo, removerTransformacao,
} from '../src/logica/editorPersonagem';
import { arenasDoJogo, excluirArena, giroNaGrade, Historico, lerOcultos, naGrade, novoIdDeArena, plantaParaCeu, ceuParaPlanta, plantaParaMundo, mundoParaPlanta, salvarArena, CHAVE_ARENAS_NOVO } from '../src/logica/editorArena';
import { lerPersonagensCriados } from '../src/logica/criados';
import { CHAVES_ANTIGAS_PADRAO } from '../src/dados/personagens';

class Memoria {
  m = new Map<string, string>();
  constructor(x: Record<string, unknown> = {}) { for (const [k, v] of Object.entries(x)) this.m.set(k, JSON.stringify(v)); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const PNG2 = 'data:image/png;base64,AAAA';
const src = (...p: string[]) => fs.readFileSync(path.join(__dirname, '../src', ...p), 'utf8');

describe('editor de personagens: dados', () => {
  it('novo personagem: forma normal sem quadros = incompleto; com 1 quadro parado = pronto', () => {
    const p = novoPersonagem(1000);
    expect(p.id).toMatch(/^c_novo_/);
    expect(problemasDoPersonagem(p)).toEqual(['A FORMA NORMAL PRECISA DE PELO MENOS 1 QUADRO EM PARADO.']);
    p.formas[0].quadros.idle = [PNG];
    expect(problemasDoPersonagem(p)).toEqual([]);
  });
  it('normalizar não confia no que vem guardado (nomes, cores, auras, quadros que não são imagens, limites)', () => {
    const p = normalizarPersonagem({ id: 'c_x', nome: '  goku de teste muito muito comprido  ', alinhamento: 'MINION', corKi: 'azul', efeitoEspecial: 'xx',
      formas: [{ nome: '', aura: 'preta', altura: 9999, quadros: { idle: [PNG, 'http://x', 3], voar: [PNG] }, fps: { idle: 200, parry: -1 } }] })!;
    expect(p.nome).toBe('GOKU DE TESTE MUITO ');
    expect([p.alinhamento, p.corKi, p.efeitoEspecial]).toEqual(['HERÓI', '#00ffff', 'cor']);
    expect(p.formas[0]).toEqual({ nome: 'Normal', aura: 'gelo', altura: 400, quadros: { idle: [PNG] }, fps: { idle: 60 } });
    expect(normalizarPersonagem({ id: 'sem-prefixo' })).toBeNull();
  });
  it('transformações: adicionar (até 12), mover (a normal fica em 1º), remover', () => {
    const p = novoPersonagem();
    for (let i = 0; i < 20; i++) adicionarTransformacao(p);
    expect(p.formas.length).toBe(13);
    p.formas[1].nome = 'A'; p.formas[2].nome = 'B';
    moverTransformacao(p, 1, 1);
    expect(p.formas.slice(1, 3).map((f) => f.nome)).toEqual(['B', 'A']);
    moverTransformacao(p, 1, -1); // não passa a normal
    expect(p.formas[0].nome).toBe('Normal');
    removerTransformacao(p, 0); // a normal não sai
    removerTransformacao(p, 1);
    expect(p.formas.length).toBe(12);
  });
  it('fila de quadros: mover, apagar, clonar (até 30), juntar', () => {
    expect(moverQuadro(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(apagarQuadro(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
    expect(clonarQuadro(['a', 'b'], 0)).toEqual(['a', 'a', 'b']);
    expect(juntarQuadros(Array(29).fill('x'), ['y', 'z']).length).toBe(QUADROS_MAX);
  });
  it('grade da sprite sheet (com espaço e total) e apagar o fundo (branco, cor escolhida, nada)', () => {
    const g = gradeDaFolha(100, 52, 32, 25, 0, 2);
    expect(g.length).toBe(3 * 2);
    expect(g[4]).toEqual({ x: 34, y: 27, w: 32, h: 25, i: 4 });
    expect(gradeDaFolha(100, 50, 32, 25, 4).length).toBe(4);
    const px = new Uint8ClampedArray([255, 255, 255, 255, 250, 250, 250, 255, 10, 200, 30, 255, 0, 255, 0, 255]);
    expect(removerFundo(new Uint8ClampedArray(px), 'none')).toBe(0);
    const a = new Uint8ClampedArray(px);
    expect(removerFundo(a, 'auto')).toBe(2);
    expect([a[3], a[7], a[11]]).toEqual([0, 0, 255]);
    const b = new Uint8ClampedArray(px);
    expect(removerFundo(b, 'color', '#00ff00', 15)).toBe(2); // o verde e o quase verde
    expect(corDoCanto(px)).toBe('#ffffff');
  });
  it('para lutar: uma textura por forma com quadros; forma sem quadros usa a anterior', () => {
    const p = novoPersonagem();
    p.formas[0].quadros.idle = [PNG];
    adicionarTransformacao(p); adicionarTransformacao(p);
    p.formas[2].quadros.idle = [PNG2];
    expect(formaComQuadros(p, 1)).toBe(0);
    const c = paraCriado(p);
    expect(c.formas.map((f) => f.forma)).toEqual(['f0', 'f0', 'f2']);
    expect(c.quadros.f2.idle).toEqual([PNG2]);
    expect(c.criado).toBe(true);
  });
  it('arquivo .saiyan.json: o formato do antigo (o antigo abre) + as formas do novo (o novo abre de volta igual)', () => {
    const p = novoPersonagem(5);
    p.nome = 'TESTE'; p.formas[0].quadros = { idle: [PNG], attackKi: [PNG2] }; p.formas[0].fps = { idle: 8 };
    adicionarTransformacao(p); p.formas[1].nome = 'SSJ'; p.formas[1].quadros = { idle: [PNG2] };
    const arq = paraArquivo(p) as { formato: string; personagem: Record<string, unknown> };
    expect(arq.formato).toBe('saiyan-fight-personagem');
    expect(arq.personagem.animations).toEqual({ idle: [PNG], attackKi: [PNG2] });
    expect(arq.personagem.transformations).toEqual([{ name: 'SSJ', aura: 'amarelo', altura: 175 }]);
    const r = deArquivo(JSON.parse(JSON.stringify(arq)), 7);
    if ('erro' in r) throw new Error(r.erro);
    expect(r.p.formas.map((f) => [f.nome, f.quadros])).toEqual([['Normal', { idle: [PNG], attackKi: [PNG2] }], ['SSJ', { idle: [PNG2] }]]);
    expect(deArquivo({ formato: 'x' })).toEqual({ erro: 'ESTE ARQUIVO NÃO É DE PERSONAGEM DO SAIYAN FIGHT.' });
    expect(deArquivo({ formato: 'saiyan-fight-personagem', versao: 1, personagem: { name: 'A', animations: {} } })).toEqual({ erro: 'FALTA O MOVIMENTO idle (PARADO).' });
    expect(nomeDoArquivo('Goku Ação!')).toBe('goku-acao.saiyan.json');
  });
  it('personagem do antigo vira uma cópia editável com o mesmo id (o editado no novo vale no lugar dele)', () => {
    const db = { char_9: { name: 'Velho', animations: { idle: [PNG] }, transformations: [{ name: 'T1', aura: 'azul' }] } };
    const [c] = lerPersonagensCriados(new Memoria({ saiyan_db_v8_8bit: db }), CHAVES_ANTIGAS_PADRAO);
    const e = doCriadoAntigo(c);
    expect([e.id, e.origem, e.chaveAntiga, e.nome]).toEqual([c.id, 'antigo', 'char_9', 'VELHO']);
    expect(e.formas.map((f) => [f.nome, f.aura, f.quadros.idle])).toEqual([['Normal', 'gelo', [PNG]], ['T1', 'azul', [PNG]]]);
    e.formas[0].quadros.idle!.push(PNG2); // mexer na cópia não muda o lido do antigo
    expect(c.quadros.orig.idle).toEqual([PNG]);
  });
});

describe('editor de arenas: onde fica guardado', () => {
  const antigo = [{ id: 'arena_a', nome: 'VELHA', pecas: [] }, { id: 'arena_b', nome: 'OUTRA', pecas: [] }];
  it('lista = as do antigo (só lendo) + as do novo; editar uma do antigo grava a cópia no novo; excluir a do antigo só esconde', () => {
    const m = new Memoria({ saiyan_arenas: antigo });
    expect(arenasDoJogo(m).map((x) => [x.arena.id, x.origem])).toEqual([['arena_a', 'antigo'], ['arena_b', 'antigo']]);
    expect(salvarArena(m, { id: 'arena_a', nome: 'VELHA EDITADA', pecas: [] })).toBe(true);
    expect(arenasDoJogo(m).map((x) => [x.arena.nome, x.origem])).toEqual([['OUTRA', 'antigo'], ['VELHA EDITADA', 'novo']]);
    excluirArena(m, 'arena_b');
    expect(lerOcultos(m).arenas).toEqual(['arena_b']);
    expect(arenasDoJogo(m).map((x) => x.arena.id)).toEqual(['arena_a']);
    expect(JSON.parse(m.getItem('saiyan_arenas')!)).toEqual(antigo); // o antigo nunca muda
    excluirArena(m, 'arena_a'); // a cópia do novo sai e a do antigo fica escondida
    expect(arenasDoJogo(m)).toEqual([]);
    expect(JSON.parse(m.getItem(CHAVE_ARENAS_NOVO)!)).toEqual([]);
  });
  it('no máximo 7 arenas no total', () => {
    const m = new Memoria({ saiyan_arenas: antigo });
    for (let i = 0; i < 5; i++) expect(salvarArena(m, { id: `arena_n${i}`, nome: 'N', pecas: [] })).toBe(true);
    expect(salvarArena(m, { id: 'arena_n9', nome: 'N', pecas: [] })).toBe(false);
    expect(salvarArena(m, { id: 'arena_n0', nome: 'TROCADA', pecas: [] })).toBe(true); // trocar uma que já existe pode
    expect(arenasDoJogo(m).length).toBe(7);
    expect(novoIdDeArena(36)).toBe('arena_10');
  });
  it('desfazer/refazer, grade e conversões da planta e do céu', () => {
    const h = new Historico({ n: 1 });
    h.registrar({ n: 2 }); h.registrar({ n: 3 });
    expect(h.desfazer()).toEqual({ n: 2 });
    expect(h.desfazer()).toEqual({ n: 1 });
    expect(h.desfazer()).toBeNull();
    expect(h.refazer()).toEqual({ n: 2 });
    h.registrar({ n: 9 });
    expect(h.podeRefazer).toBe(false);
    expect([naGrade(29, true), naGrade(29.4, false), giroNaGrade(-20, true), giroNaGrade(370, false)]).toEqual([20, 29, 345, 10]);
    const [px, py] = mundoParaPlanta(100, -50, 320, 0.5);
    expect(plantaParaMundo(px, py, 320, 0.5)).toEqual([100, -50]);
    const [cx, cy] = ceuParaPlanta(90, 0.5, 320);
    expect(plantaParaCeu(cx, cy, 320)).toEqual([90, 0.5]);
  });
});

describe('editores sem o jogo antigo', () => {
  let docAntes: unknown;
  beforeAll(() => {
    docAntes = (globalThis as { document?: unknown }).document;
    const ctx = () => new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createPattern: () => ({ setTransform() {} }), measureText: () => ({ width: 10 }),
      getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }) } as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : () => {}), set: (t, k: string, v) => { t[k] = v; return true; } });
    const canvas = () => { const c: Record<string, unknown> = { width: 800, height: 350, style: {} }; const g = ctx(); c.getContext = () => g; return c; };
    (globalThis as { document?: unknown }).document = { createElement: () => canvas() };
  });
  afterAll(() => { (globalThis as { document?: unknown }).document = docAntes; });

  it('o editor de personagens, o de arenas e o abridor não usam iframe nem o endereço do jogo antigo', () => {
    for (const f of [['ui', 'editores.ts'], ['editor', 'personagens.ts'], ['editor', 'arenas.ts'], ['editor', 'dom.ts'], ['ui', 'armazemCriados.ts']]) {
      const s = src(...f);
      expect(s, f.join('/')).not.toMatch(/iframe|antigo\/index\.html|\.\.\/index\.html|setGameState|abrirEditorArenas/);
    }
    // e só gravam nas chaves do novo
    expect(src('ui', 'armazemCriados.ts')).not.toMatch(/setItem\(['"]saiyan_|saiyan_conjuntos'/);
    expect(src('logica', 'editorArena.ts')).toMatch(/setItem\(CHAVE_ARENAS_NOVO/);
    expect(src('logica', 'editorArena.ts')).not.toMatch(/setItem\(CHAVE_ARENAS_ANTIGO/);
  });

  it('as tabelas do arenas.js chegam ao editor novo: peças, planícies, validação do .arena.json, planta e prévia desenham', async () => {
    const { criarCenariosLegado, definirTemas } = await import('../src/legado/cenarios-legado.js');
    definirTemas(['classico', 'namek']);
    const c = (globalThis as unknown as { document: { createElement: () => HTMLCanvasElement } }).document.createElement();
    const ed = criarCenariosLegado(c).editor;
    expect(Object.keys(ed.PECAS).length).toBeGreaterThan(50);
    expect(Object.keys(ed.PLANICIES)).toContain('namek');
    expect(ed.ABAS.map((a) => a[0])).toContain('pincel');
    const a = ed.normalizar({ nome: 'teste', musica: 'namek', pecas: [{ t: 'bloco', x: 10, z: 0 }, { t: 'sol', a: 40, h: 0.7 }, { t: 'nao_existe' }] });
    expect([a.nome, a.musica, a.pecas.length]).toEqual(['TESTE', 'namek', 2]);
    expect(ed.normalizar({ musica: 'nao_existe' }).musica).toBe('classico');
    const arq = ed.paraArquivo(a);
    expect(arq.formato).toBe('saiyan-fight-arena');
    const v = ed.validarArquivo(JSON.parse(JSON.stringify(arq)));
    expect('arena' in v && v.arena.pecas.length).toBe(2);
    expect(ed.validarArquivo({ formato: 'x' })).toEqual({ erro: 'ESTE ARQUIVO NÃO É DE ARENA DO SAIYAN FIGHT.' });
    // duas peças no mesmo lugar se chocam
    const b1 = ed.normalizarPeca({ t: 'bloco', x: 0, z: 0 }), b2 = ed.normalizarPeca({ t: 'bloco', x: 5, z: 0 }), b3 = ed.normalizarPeca({ t: 'bloco', x: 200, z: 0 });
    expect(ed.colide([b1], b2, -1)).toBe(true);
    expect(ed.colide([b1], b3, -1)).toBe(false);
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    for (const t of Object.keys(ed.PECAS)) ed.plantaPeca(g, ed.normalizarPeca({ t, x: 0, z: 0, pts: [[0, 0], [30, 10]] }), 0.4);
    for (const tipo of Object.keys(ed.CHAOS)) ed.plantaChao(g, { ...a, chao: { tipo, cor: '#336699' } }, 0.4, 320);
    ed.previa(a, 0.3, { chave: '_t' });
    ed.previa({ ...a, movimento: 'seguir' }, 0, { chave: '_t2', andado: 120 });
    ed.previa(a, 0, { chave: '_t3', cam: ed.cameraPerto(b1), desl: { x: 0, z: 0 } });
    definirTemas(null);
  });
});
