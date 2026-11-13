import { describe, expect, it } from 'vitest';
import * as C from '../src/logica/constantes';
import { avancarPasso, criarTutorial, instrucoesDoPasso, marcarFeito, passoAtual, passoTutorial, PASSOS_DO_TUTORIAL, QUADROS_DO_EFEITO, type ComandosTutorial } from '../src/logica/tutorial';
import { ENTRADA_VAZIA, type Entrada } from '../src/logica/tipos';
import { textosCadastrados } from '../src/logica/idioma';
import { fichaDoPersonagem } from '../src/logica/ficha';

const ent = (o: Partial<Entrada> = {}): Entrada => ({ ...ENTRADA_VAZIA, ...o });
const novo = () => criarTutorial(fichaDoPersonagem('goku'), 7);
/** roda até o efeito acabar e o próximo passo começar */
function terminarEfeito(tu: ReturnType<typeof novo>) {
  for (let i = 0; i < 200 && tu.t.fase === 'efeito'; i++) passoTutorial(tu.luta, tu.t, ENTRADA_VAZIA);
}

describe('tutorial (TUTORIAL_STEPS do antigo)', () => {
  it('7 passos na ordem do antigo, todos com título traduzível', () => {
    expect(PASSOS_DO_TUTORIAL.map((p) => p.chave)).toEqual(['move', 'attack', 'charge', 'parry', 'transform', 'special', 'pause']);
    expect(QUADROS_DO_EFEITO).toEqual({ move: 24, attack: 40, charge: 30, parry: 30, transform: 70, special: 50, pause: 30 });
  });
  it('começa parado na esquerda, sem ki, e sem adversário na tela', () => {
    const { luta } = novo();
    expect(luta.p1.ki).toBe(0);
    expect(luta.p1.x).toBeLessThan(200);
    expect(luta.p2.x).toBeLessThan(0);
  });
  it('MOVIMENTO só conta depois de 40 px', () => {
    const tu = novo();
    passoTutorial(tu.luta, tu.t, ent({ x: 1 }));
    expect(tu.t.fase).toBe('esperando');
    for (let i = 0; i < 20; i++) passoTutorial(tu.luta, tu.t, ent({ x: 1 }));
    expect(tu.t.fase).toBe('efeito');
    terminarEfeito(tu);
    expect(passoAtual(tu.t)?.chave).toBe('attack');
  });
  it('a ação errada não conta (ESPECIAL no passo de ATAQUE); o tiro conta', () => {
    const tu = novo();
    avancarPasso(tu.luta, tu.t);
    expect(marcarFeito(tu.t, 'special')).toBe(false);
    passoTutorial(tu.luta, tu.t, ent({ atacar: true }));
    expect(tu.t.fase).toBe('efeito');
  });
  it('CARREGAR precisa segurar ~0,5 s', () => {
    const tu = novo();
    avancarPasso(tu.luta, tu.t); avancarPasso(tu.luta, tu.t);
    expect(passoAtual(tu.t)?.chave).toBe('charge');
    for (let i = 0; i < 20; i++) passoTutorial(tu.luta, tu.t, ent({ carregar: true }));
    expect(tu.t.fase).toBe('esperando');
    for (let i = 0; i < 15; i++) passoTutorial(tu.luta, tu.t, ent({ carregar: true }));
    expect(tu.t.fase).toBe('efeito');
  });
  it('PARRY: vem um alvo; ele nunca machuca e volta se passar; rebater conta', () => {
    const tu = novo();
    for (let i = 0; i < 3; i++) avancarPasso(tu.luta, tu.t);
    expect(passoAtual(tu.t)?.chave).toBe('parry');
    expect(tu.luta.tiros.filter((t) => t.dono === 'p2')).toHaveLength(1);
    let acertos = 0;
    for (let i = 0; i < 400; i++) for (const ev of passoTutorial(tu.luta, tu.t, ENTRADA_VAZIA)) if (ev.tipo === 'acerto') acertos++;
    expect(acertos).toBe(0);
    expect(tu.luta.p1.vida).toBe(tu.luta.p1.vidaMax);
    expect(tu.t.fase).toBe('esperando');
    // aperta parry quando o alvo está perto
    for (let i = 0; i < 400 && tu.t.fase === 'esperando'; i++) {
      const alvo = tu.luta.tiros.find((t) => t.dono === 'p2');
      passoTutorial(tu.luta, tu.t, ent({ parry: !!alvo && alvo.x - tu.luta.p1.x < 50 }));
    }
    expect(tu.t.fase).toBe('efeito');
  });
  it('TRANSFORMAR dá o ki cheio; transformar conta; ESPECIAL também', () => {
    const tu = novo();
    for (let i = 0; i < 4; i++) avancarPasso(tu.luta, tu.t);
    expect(tu.luta.p1.ki).toBe(C.KI_MAX);
    passoTutorial(tu.luta, tu.t, ent({ transformar: true }));
    expect(tu.luta.p1.nivel).toBe(1);
    expect(tu.t.fase).toBe('efeito');
    terminarEfeito(tu);
    expect(passoAtual(tu.t)?.chave).toBe('special');
    expect(tu.luta.p1.ki).toBe(C.KI_MAX);
    for (let i = 0; i < 80 && tu.t.fase === 'esperando'; i++) passoTutorial(tu.luta, tu.t, ent({ especial: true }));
    expect(tu.t.fase).toBe('efeito');
    terminarEfeito(tu);
    expect(passoAtual(tu.t)?.chave).toBe('pause');
    expect(marcarFeito(tu.t, 'pause')).toBe(true);
    terminarEfeito(tu);
    expect(tu.t.fase).toBe('fim');
  });
  it('PULAR avança e no fim fica livre (o J1 continua jogando, sem adversário)', () => {
    const tu = novo();
    for (let i = 0; i < 7; i++) avancarPasso(tu.luta, tu.t);
    expect(tu.t.fase).toBe('fim');
    for (let i = 0; i < 60; i++) passoTutorial(tu.luta, tu.t, ent({ atacar: true, x: 1 }));
    expect(tu.luta.fase).toBe('luta');
    expect(tu.luta.p2.vida).toBe(tu.luta.p2.vidaMax);
  });
  it('instruções por plataforma, como getTutorialInstructionLines', () => {
    const c: ComandosTutorial = { plataforma: 'pc', modoToque: 'analog', duploToqueParry: true, tiroContinuo: true,
      teclas: { up: 'W', left: 'A', down: 'S', right: 'D', attack: 'J', charge: 'K', parry: 'L', transform: 'U', special: 'I' },
      botoes: { attack: 'QUADRADO', charge: 'CRUZ', parry: 'R1', transform: 'TRIÂNGULO', special: 'BOLA', pause: 'OPTIONS' } };
    expect(instrucoesDoPasso('move', c)[0]).toEqual(['TECLADO: {0}', 'W / A / S / D']);
    expect(instrucoesDoPasso('charge', c)).toEqual([['TECLADO/MOUSE: {0}', 'K'], ['(SEGURE POR UM INSTANTE)']]);
    expect(instrucoesDoPasso('pause', { ...c, plataforma: 'joystick' })[0]).toEqual(['CONTROLE: {0}', 'OPTIONS']);
    expect(instrucoesDoPasso('parry', { ...c, plataforma: 'touch' })[0]).toEqual(['TOQUE 2 VEZES SEGUIDAS EM QUALQUER LUGAR LIVRE DA TELA']);
    expect(instrucoesDoPasso('special', { ...c, plataforma: 'touch' })[0]).toEqual(['TOQUE (OU SEGURE) NO BOTÃO "{0}" NA TELA', 'ESPECIAL']);
    // todas as frases existem na tradução
    const cad = new Set(textosCadastrados());
    for (const p of PASSOS_DO_TUTORIAL) expect(cad.has(p.titulo), p.titulo).toBe(true);
    for (const t of ['ESPECIAL', 'ATAQUE', 'CARREGAR', 'PARRY', 'ANALÓGICO ESQUERDO OU DIRECIONAL', 'MUITO BEM! ISSO MESMO.', 'TUTORIAL CONCLUÍDO! VOCÊ JÁ SABE TODOS OS COMANDOS.']) expect(cad.has(t), t).toBe(true);
    for (const pl of ['pc', 'touch', 'joystick'] as const) for (const tq of ['analog', 'swipe'] as const) for (const d of [true, false]) for (const p of PASSOS_DO_TUTORIAL)
      for (const [f] of instrucoesDoPasso(p.chave, { ...c, plataforma: pl, modoToque: tq, duploToqueParry: d, tiroContinuo: d })) expect(cad.has(f), f).toBe(true);
  });
});

describe('tutorial com personagem e forma escolhidos', () => {
  it('começa na forma escolhida e o passo TRANSFORMAR vai da anterior até ela', async () => {
    const { avancarPasso: av, criarTutorial: ct, passoAtual: pa } = await import('../src/logica/tutorial');
    const tu = ct(fichaDoPersonagem('vegeta'), 3, 2);
    expect(tu.t.nivel).toBe(2);
    expect(tu.luta.p1.nivel).toBe(2);
    while (pa(tu.t)?.chave !== 'transform') av(tu.luta, tu.t);
    expect(tu.luta.p1.nivel).toBe(1);
    expect(tu.luta.p1.ki).toBe(C.KI_MAX);
    passoTutorial(tu.luta, tu.t, ent({ transformar: true }));
    expect(tu.luta.p1.nivel).toBe(2);
    expect(tu.t.fase).toBe('efeito');
  });
  it('forma normal escolhida: TRANSFORMAR vai da normal para a 1ª; nível fora da lista é limitado', async () => {
    const { criarTutorial: ct, avancarPasso: av, passoAtual: pa } = await import('../src/logica/tutorial');
    const tu = ct(fichaDoPersonagem('goku'), 3, 0);
    while (pa(tu.t)?.chave !== 'transform') av(tu.luta, tu.t);
    expect(tu.luta.p1.nivel).toBe(0);
    expect(ct(fichaDoPersonagem('goku'), 3, 99).t.nivel).toBe(fichaDoPersonagem('goku').alturas.length - 1);
    expect(ct(fichaDoPersonagem('goku'), 3, -4).t.nivel).toBe(0);
  });
});

describe('TUTORIAL LIVRE (treino sem passos)', () => {
  it('sem adversário, sem perder vida, na forma escolhida, e dá para transformar e soltar especial', async () => {
    const { criarTreino, passoTreino } = await import('../src/logica/tutorial');
    const tr = criarTreino(fichaDoPersonagem('goku'), 5, 1);
    const e = tr.luta;
    expect(e.p1.nivel).toBe(1);
    expect(e.p2.x).toBeLessThan(0);
    e.p1.vida = 1;
    passoTreino(e, ent({ x: 1 }));
    expect(e.p1.vida).toBe(e.p1.vidaMax);
    e.p1.ki = C.KI_MAX;
    const evs = [];
    for (let i = 0; i < 5; i++) evs.push(...passoTreino(e, ent({ transformar: i === 0 })));
    expect(evs.some((v) => v.tipo === 'transformou')).toBe(true);
    expect(e.p1.nivel).toBe(2);
    for (let i = 0; i < 600; i++) passoTreino(e, ENTRADA_VAZIA);
    expect(e.fase).toBe('luta'); // nunca acaba sozinho: sai pela pausa
    expect(e.p2.x).toBeLessThan(0);
  });
  it('o menu tem TUTORIAL e TUTORIAL LIVRE, e os dois passam pela escolha de personagem e forma', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const menu = fs.readFileSync(path.join(__dirname, '../src/cenas/Menu.ts'), 'utf8');
    expect(menu).toMatch(/'TUTORIAL',\s*\(\) => this\.scene\.start\('Selecao', \{ modo: 'tutorial' \}\)/);
    expect(menu).toMatch(/'TUTORIAL LIVRE',\s*\(\) => this\.scene\.start\('Selecao', \{ modo: 'treino' \}\)/);
    const luta = fs.readFileSync(path.join(__dirname, '../src/cenas/Luta.ts'), 'utf8');
    expect(luta).toMatch(/if \(!this\.tutorial && !this\.treino\) this\.rastreio\.passo/); // treino não dá conquista
  });
});
