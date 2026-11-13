// TUTORIAL INTERATIVO do jogo antigo (gameplay.js TUTORIAL_STEPS / updateTutorial): 7 passos — mover, atirar,
// carregar, rebater, transformar, especial, pausar. O passo só conta quando a ação acontece DE VERDADE (a mesma
// lógica da luta, passoLuta); aí toca o efeito ("MUITO BEM! ISSO MESMO.") por alguns quadros e vem o próximo.
// Não há adversário: o J2 fica fora da tela, sem agir e sem apanhar; o J1 não perde vida.
import * as C from './constantes';
import { alturaDoNivel, criarLuta, nivelMaximo, passoLuta, tamanhoDaCaixa } from './luta';
import { ENTRADA_VAZIA, type Entrada, type EstadoLuta, type Evento, type FichaLuta } from './tipos';

export const PASSOS_DO_TUTORIAL = [
  { chave: 'move', titulo: 'MOVIMENTO' },
  { chave: 'attack', titulo: 'ATAQUE DE KI' },
  { chave: 'charge', titulo: 'CARREGAR KI' },
  { chave: 'parry', titulo: 'PARRY (REBATER)' },
  { chave: 'transform', titulo: 'TRANSFORMAR' },
  { chave: 'special', titulo: 'ATAQUE ESPECIAL' },
  { chave: 'pause', titulo: 'PAUSAR O JOGO' },
] as const;
export type PassoTutorial = (typeof PASSOS_DO_TUTORIAL)[number]['chave'];
/** TUTORIAL_EFFECT_FRAMES */
export const QUADROS_DO_EFEITO: Record<PassoTutorial, number> = { move: 24, attack: 40, charge: 30, parry: 30, transform: 70, special: 50, pause: 30 };
/** TUTORIAL_CHARGE_HOLD_FRAMES: ~0,5 s segurando CARREGAR */
export const QUADROS_SEGURANDO_CARGA = 30;
/** TUTORIAL_MOVE_DISTANCE */
export const DISTANCIA_DO_MOVIMENTO = 40;

export interface EstadoTutorial {
  passo: number;
  fase: 'esperando' | 'efeito' | 'fim';
  efeito: number;
  inicio: { x: number; y: number };
  carga: number;
  /** forma escolhida antes de começar (0 = normal); o passo TRANSFORMAR leva até ela (ou até a 1ª, se for a normal) */
  nivel: number;
}

export interface Tutorial { luta: EstadoLuta; t: EstadoTutorial }

export const passoAtual = (t: EstadoTutorial) => PASSOS_DO_TUTORIAL[t.passo] ?? null;

/** startTutorial: o J1 na esquerda (x 120, y 150 do antigo = centro 144,178), sem ki; o J2 longe */
export function criarTutorial(ficha: FichaLuta | string, semente = 1, nivel = 0): Tutorial {
  const luta = criarLuta(ficha, ficha, semente);
  const p = luta.p1;
  const n = Math.max(0, Math.min(Math.floor(nivel) || 0, nivelMaximo(p)));
  porNoNivel(p, n);
  p.x = p.xAnt = 120 + p.l / 2;
  p.y = p.yAnt = 150 + p.a / 2;
  p.ki = 0;
  p.invulneravel = 0;
  estacionarJ2(luta);
  const t: EstadoTutorial = { passo: 0, fase: 'esperando', efeito: 0, inicio: { x: p.x, y: p.y }, carga: 0, nivel: n };
  prepararPasso(luta, t);
  return { luta, t };
}

/** muda a forma na hora (sem animação), mantendo os pés no lugar */
export function porNoNivel(p: EstadoLuta['p1'], nivel: number): void {
  if (p.nivel === nivel) return;
  const pes = p.y + p.a / 2;
  p.nivel = nivel;
  p.poder = 0;
  [p.l, p.a] = tamanhoDaCaixa(alturaDoNivel(p, nivel));
  p.y = pes - p.a / 2;
}

/** a forma de onde o passo TRANSFORMAR começa: a anterior à escolhida (ou a normal) */
export const nivelAntesDeTransformar = (t: Pick<EstadoTutorial, 'nivel'>) => Math.max(0, t.nivel - 1);

// ---- TUTORIAL LIVRE: a mesma arena de treino, sem passos nem instruções, só para testar os botões ----
export interface Treino { luta: EstadoLuta; nivel: number }
export function criarTreino(ficha: FichaLuta | string, semente = 1, nivel = 0): Treino {
  const tu = criarTutorial(ficha, semente, nivel);
  return { luta: tu.luta, nivel: tu.t.nivel };
}
/** Um passo fixo (1/60 s) do TUTORIAL LIVRE: a luta normal, sem adversário e sem perder vida. */
export function passoTreino(e: EstadoLuta, entrada: Entrada): Evento[] {
  const eventos = passoLuta(e, { p1: entrada, p2: ENTRADA_VAZIA });
  estacionarJ2(e);
  e.p1.vida = e.p1.vidaMax;
  if (e.fase !== 'luta') { e.fase = 'luta'; e.faseQuadros = 0; }
  return eventos;
}

function estacionarJ2(e: EstadoLuta): void {
  const q = e.p2;
  q.x = q.xAnt = -400;
  q.invulneravel = 1e9;
  q.vida = q.vidaMax;
  q.ki = 0;
}

/** setupTutorialStep: dá o ki que o passo precisa, volta à forma normal antes de TRANSFORMAR, cria o alvo do parry */
export function prepararPasso(e: EstadoLuta, t: EstadoTutorial): void {
  const s = passoAtual(t);
  if (!s) return;
  t.fase = 'esperando';
  t.efeito = 0;
  t.carga = 0;
  const p = e.p1;
  if (s.chave === 'move') t.inicio = { x: p.x, y: p.y };
  else if (s.chave === 'transform') {
    p.ki = C.KI_MAX;
    porNoNivel(p, nivelAntesDeTransformar(t));
  } else if (s.chave === 'special') p.ki = C.KI_MAX;
  else if (s.chave === 'parry') criarAlvoDoParry(e);
}

/** spawnTutorialParryTarget: um tiro amarelo vindo devagar da direita, para rebater */
export function criarAlvoDoParry(e: EstadoLuta): void {
  const p = e.p1;
  e.tiros = e.tiros.filter((x) => x.dono === 'p1');
  e.tiros.push({ id: e.proximoId++, dono: 'p2', atirador: 'p2', x: p.x + 260, y: p.y, vx: -2.2, vy: 0, raio: 10, dano: 0, refletido: false });
}

/** PULAR, ou o fim do efeito: o próximo passo (ou o fim) */
export function avancarPasso(e: EstadoLuta, t: EstadoTutorial): void {
  t.passo++;
  if (t.passo >= PASSOS_DO_TUTORIAL.length) {
    t.fase = 'fim';
    e.tiros = e.tiros.filter((x) => x.dono === 'p1');
  } else prepararPasso(e, t);
}

/** markTutorialActionDone: só vale a ação pedida no passo atual */
export function marcarFeito(t: EstadoTutorial, chave: PassoTutorial): boolean {
  const s = passoAtual(t);
  if (t.fase !== 'esperando' || !s || s.chave !== chave) return false;
  t.fase = 'efeito';
  t.efeito = QUADROS_DO_EFEITO[chave];
  return true;
}

/** Um passo fixo (1/60 s) do tutorial. */
export function passoTutorial(e: EstadoLuta, t: EstadoTutorial, entrada: Entrada): Evento[] {
  const s = passoAtual(t);
  // durante o efeito só o movimento continua livre (os tiros seguem voando)
  const ent = t.fase === 'efeito' && s?.chave !== 'move' ? ENTRADA_VAZIA : entrada;
  if (t.fase === 'esperando' && s?.chave === 'parry') {
    const p = e.p1;
    const alvo = e.tiros.find((x) => x.dono === 'p2');
    // o alvo passou do lutador (ou ficou longe demais): vem outro, sem machucar
    if (!alvo || alvo.x < p.x + p.l / 2 + alvo.raio + 3 || alvo.x > p.x + 400) criarAlvoDoParry(e);
  }
  const eventos = passoLuta(e, { p1: ent, p2: ENTRADA_VAZIA });
  estacionarJ2(e);
  e.p1.vida = e.p1.vidaMax;
  if (e.fase !== 'luta') { e.fase = 'luta'; e.faseQuadros = 0; }

  if (t.fase === 'efeito') {
    if (--t.efeito <= 0) avancarPasso(e, t);
    return eventos;
  }
  if (t.fase !== 'esperando' || !s) return eventos;
  for (const ev of eventos) {
    if (ev.tipo === 'tiro' && ev.dono === 'p1') marcarFeito(t, 'attack');
    else if (ev.tipo === 'parry' && ev.dono === 'p1' && ev.refletidos > 0) marcarFeito(t, 'parry');
    else if (ev.tipo === 'transformou' && ev.dono === 'p1') marcarFeito(t, 'transform');
    else if (ev.tipo === 'especial' && ev.dono === 'p1') marcarFeito(t, 'special');
  }
  if (s.chave === 'move' && Math.hypot(e.p1.x - t.inicio.x, e.p1.y - t.inicio.y) >= DISTANCIA_DO_MOVIMENTO) marcarFeito(t, 'move');
  else if (s.chave === 'charge') {
    if (e.p1.acao === 'carregando') { if (++t.carga >= QUADROS_SEGURANDO_CARGA) marcarFeito(t, 'charge'); }
    else t.carga = Math.max(0, t.carga - 0.5);
  }
  return eventos;
}

/** getTutorialInstructionLines: o comando do passo, só da plataforma em uso */
export interface ComandosTutorial {
  plataforma: 'pc' | 'touch' | 'joystick';
  teclas: Record<'up' | 'left' | 'down' | 'right' | 'attack' | 'charge' | 'parry' | 'transform' | 'special', string>;
  botoes: Record<'attack' | 'charge' | 'parry' | 'transform' | 'special' | 'pause', string>;
  modoToque: 'analog' | 'swipe';
  duploToqueParry: boolean;
  tiroContinuo: boolean;
}
/** linhas como [texto, ...valores] para o TF traduzir */
export function instrucoesDoPasso(chave: PassoTutorial, c: ComandosTutorial): [string, ...string[]][] {
  const l: [string, ...string[]][] = [];
  const segure = () => { if (chave === 'charge') l.push(['(SEGURE POR UM INSTANTE)']); };
  if (c.plataforma === 'joystick') {
    l.push(chave === 'move' ? ['CONTROLE: {0}', 'ANALÓGICO ESQUERDO OU DIRECIONAL'] : ['CONTROLE: {0}', c.botoes[chave]]);
    segure();
  } else if (c.plataforma === 'touch') {
    if (chave === 'move') l.push([c.modoToque === 'swipe' ? 'ARRASTE O DEDO NA TELA PARA VOAR' : 'TOQUE E ARRASTE NO ANALÓGICO (ESQUERDA DA TELA), OU SEGURE PRA ATIRAR SEM PARAR']);
    else if (chave === 'pause') l.push(['TOQUE NO ÍCONE DE PAUSA NO TOPO DA TELA']);
    else if (chave === 'parry' && c.duploToqueParry) l.push(['TOQUE 2 VEZES SEGUIDAS EM QUALQUER LUGAR LIVRE DA TELA']);
    else {
      const nomes = { attack: 'ATAQUE', charge: 'CARREGAR', parry: 'PARRY', special: 'ESPECIAL' } as const;
      if (chave === 'transform') l.push(['COM O KI CHEIO O BOTÃO "CARREGAR" VIRA "TRANSFORMAR": TOQUE NELE']);
      else if (chave === 'attack' && c.tiroContinuo) l.push(['SEGURE O DEDO NO ANALÓGICO PARA ATIRAR SEM PARAR']);
      else l.push(['TOQUE (OU SEGURE) NO BOTÃO "{0}" NA TELA', nomes[chave]]);
      segure();
    }
  } else {
    if (chave === 'move') {
      l.push(['TECLADO: {0}', (['up', 'left', 'down', 'right'] as const).map((k) => c.teclas[k]).join(' / ')]);
      l.push(["MOUSE: ATIVE O MODO 'SEGUIR MOUSE' NAS OPÇÕES"]);
    } else if (chave === 'pause') l.push(['TECLADO: {0} OU {1}', 'ESC', 'P']);
    else l.push(['TECLADO/MOUSE: {0}', c.teclas[chave]]);
    segure();
  }
  return l;
}
