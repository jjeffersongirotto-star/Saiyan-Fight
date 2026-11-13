// Opções do jogador (OPÇÕES → CONTROLES / ÁUDIO / IDIOMAS do jogo antigo), sem Phaser.
// O jogo antigo guarda cada opção numa chave `saiyan_*` (database.js: saveControls / saveAudioSettings). O novo
// LÊ essas chaves só como ponto de partida (quem já arrumou as teclas no antigo continua igual) e grava tudo numa
// chave própria, `saiyan-novo-opcoes`, para nunca mexer no jogo antigo.
import type { Armazenamento } from './progresso';
import { armazenamentoPadrao } from './progresso';

export const CHAVE_OPCOES = 'saiyan-novo-opcoes';

export const ACOES_TECLA = ['up', 'down', 'left', 'right', 'attack', 'charge', 'transform', 'parry', 'special'] as const;
export type AcaoTecla = (typeof ACOES_TECLA)[number];
export type TeclasJogador = Record<AcaoTecla, string>;

/** PADRÃO das teclas do jogo antigo (DEFAULT_KEY_BINDINGS); o ataque do J1 no mouse esquerdo vira F no modo TECLADO */
export const TECLAS_PADRAO: Record<'p1' | 'p2', TeclasJogador> = {
  p1: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', attack: 'KeyF', charge: 'KeyS', transform: 'KeyA', parry: 'Space', special: 'KeyQ' },
  p2: { up: 'Numpad5', down: 'Numpad2', left: 'Numpad1', right: 'Numpad3', attack: 'Enter', charge: 'NumpadEnter', transform: 'Numpad9', parry: 'Numpad0', special: 'Numpad7' },
};

/** ações do controle (PAD_ACTIONS) e o PADRÃO PS5 do antigo (DEFAULT_PAD_BINDINGS) */
export const ACOES_CONTROLE = ['attack', 'parry', 'charge', 'transform', 'special', 'pause'] as const;
export type AcaoControle = (typeof ACOES_CONTROLE)[number];
export type BotoesControle = Record<AcaoControle, number[]>;
export const CONTROLE_PADRAO: BotoesControle = { attack: [2], parry: [5], charge: [0], transform: [3], special: [1], pause: [9] };
export const NOMES_BOTOES = ['CRUZ', 'BOLA', 'QUADRADO', 'TRIÂNGULO', 'L1', 'R1', 'L2', 'R2', 'CRIAR', 'OPTIONS', 'L3', 'R3', '↑', '↓', '←', '→', 'PS', 'TOUCHPAD'];
export const SENS_MIN = 1, SENS_MAX = 5, SENS_PADRAO = 3;

export type ModoControle = 'auto' | 'pc' | 'touch' | 'joystick';
export type ModoToque = 'analog' | 'swipe';
export type ModoPc = 'keyboard' | 'mouse';
export type BotaoHud = 'charge' | 'special' | 'attack' | 'parry';
export const BOTOES_HUD: BotaoHud[] = ['charge', 'special', 'attack', 'parry'];
/** posição de um botão do HUD de toque: centro (px lógicos), raio, tamanho (escala) e opacidade */
export interface PosHud { x: number; y: number; r: number; escala: number; opacidade: number }
export type LayoutHud = Record<BotaoHud, PosHud>;
export const HUD_ESCALA = { min: 0.6, max: 1.6 };
export const HUD_OPACIDADE = { min: 0.3, max: 1 };

/** o arranjo do novo (CARREGAR grande no canto, PARRY embaixo, ATAQUE no meio, ESPECIAL em cima) */
export const HUD_PADRAO: LayoutHud = {
  charge: { x: 738, y: 288, r: 44, escala: 1, opacidade: 0.75 },
  parry: { x: 646, y: 310, r: 30, escala: 1, opacidade: 0.75 },
  attack: { x: 654, y: 228, r: 36, escala: 1, opacidade: 0.75 },
  special: { x: 740, y: 186, r: 32, escala: 1, opacidade: 0.75 },
};

export interface Opcoes {
  modoControle: ModoControle;
  modoPc: ModoPc;
  teclas: Record<'p1' | 'p2', TeclasJogador>;
  controle: BotoesControle;
  sensibilidade: number;
  modoToque: ModoToque;
  duploToqueParry: boolean;
  vibracao: boolean;
  tiroContinuo: boolean;
  dicaTiroVista: boolean;
  hud: LayoutHud;
}

export function opcoesPadrao(): Opcoes {
  return {
    modoControle: 'auto', modoPc: 'keyboard',
    teclas: { p1: { ...TECLAS_PADRAO.p1 }, p2: { ...TECLAS_PADRAO.p2 } },
    controle: clonarBotoes(CONTROLE_PADRAO), sensibilidade: SENS_PADRAO,
    modoToque: 'analog', duploToqueParry: true, vibracao: true, tiroContinuo: true, dicaTiroVista: false,
    hud: clonarHud(HUD_PADRAO),
  };
}

export const clonarBotoes = (b: BotoesControle): BotoesControle =>
  Object.fromEntries(ACOES_CONTROLE.map((a) => [a, [...b[a]]])) as BotoesControle;
export const clonarHud = (h: LayoutHud): LayoutHud =>
  Object.fromEntries(BOTOES_HUD.map((k) => [k, { ...h[k] }])) as LayoutHud;

const um = <T extends string>(v: unknown, lista: readonly T[], padrao: T): T => (lista.includes(v as T) ? (v as T) : padrao);
const num = (v: unknown, min: number, max: number, padrao: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : padrao;
};
const ehObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** normalizePadBindings do antigo: o que veio salvo (pode estar velho) vira sempre um objeto válido */
export function normalizarBotoes(salvo: unknown): BotoesControle {
  const out = clonarBotoes(CONTROLE_PADRAO);
  if (!ehObj(salvo)) return out;
  for (const a of ACOES_CONTROLE) {
    const l = salvo[a];
    if (!Array.isArray(l)) continue;
    const limpo = [...new Set(l.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < 32))];
    if (limpo.length) out[a] = limpo;
  }
  return out;
}

/** assignPadButton do antigo: se outra ação usava o botão, as duas TROCAM (nenhuma fica sem botão) */
export function atribuirBotao(b: BotoesControle, acao: AcaoControle, botao: number): { botoes: BotoesControle; deslocada: AcaoControle | null } {
  const prox = clonarBotoes(b);
  const antes = prox[acao];
  prox[acao] = [botao];
  let deslocada: AcaoControle | null = null;
  for (const outra of ACOES_CONTROLE) {
    if (outra === acao || !prox[outra].includes(botao)) continue;
    prox[outra] = prox[outra].filter((i) => i !== botao);
    if (!prox[outra].length) prox[outra] = [antes[0]];
    deslocada = outra;
  }
  return { botoes: prox, deslocada };
}

/** Trocar uma tecla: se outra ação do MESMO jogador usava a tecla, as duas trocam. */
export function atribuirTecla(t: TeclasJogador, acao: AcaoTecla, codigo: string): TeclasJogador {
  const prox = { ...t };
  const antes = prox[acao];
  for (const a of ACOES_TECLA) if (a !== acao && prox[a] === codigo) prox[a] = antes;
  prox[acao] = codigo;
  return prox;
}

/** quanto o analógico precisa inclinar (getPadStickThreshold): 1 = pouca sensibilidade … 5 = muita */
export function limiarDoAnalogico(nivel: number): number {
  const n = Math.round(num(nivel, SENS_MIN, SENS_MAX, SENS_PADRAO));
  return [0.6, 0.5, 0.4, 0.3, 0.2][n - 1];
}

function normalizarTeclas(x: unknown, padrao: TeclasJogador): TeclasJogador {
  const t = { ...padrao };
  if (!ehObj(x)) return t;
  for (const a of ACOES_TECLA) if (typeof x[a] === 'string' && x[a]) t[a] = x[a] as string;
  return t;
}

function normalizarHud(x: unknown): LayoutHud {
  const h = clonarHud(HUD_PADRAO);
  if (!ehObj(x)) return h;
  for (const k of BOTOES_HUD) {
    const b = x[k];
    if (!ehObj(b)) continue;
    h[k] = {
      x: num(b.x, 0, 800, h[k].x), y: num(b.y, 0, 350, h[k].y), r: num(b.r, 12, 90, h[k].r),
      escala: num(b.escala, HUD_ESCALA.min, HUD_ESCALA.max, 1), opacidade: num(b.opacidade, HUD_OPACIDADE.min, HUD_OPACIDADE.max, h[k].opacidade),
    };
  }
  return h;
}

/** HUD salvo pelo antigo ({x,y} do canto em 0..1, w, scale, opacity) → centro e raio do novo */
export function hudDoAntigo(x: unknown): LayoutHud | null {
  if (!ehObj(x)) return null;
  const h = clonarHud(HUD_PADRAO);
  let algum = false;
  for (const k of BOTOES_HUD) {
    const b = x[k];
    if (!ehObj(b) || !Number.isFinite(Number(b.x)) || !Number.isFinite(Number(b.y))) continue;
    const w = num(b.w, 20, 160, 46), esc = num(b.scale, HUD_ESCALA.min, HUD_ESCALA.max, 1);
    const bx = Number(b.x) <= 1 ? Number(b.x) * 800 : Number(b.x), by = Number(b.y) <= 1 ? Number(b.y) * 350 : Number(b.y);
    h[k] = { x: bx + w / 2, y: by + w / 2, r: h[k].r, escala: esc, opacidade: num(b.opacity, HUD_OPACIDADE.min, HUD_OPACIDADE.max, 0.8) };
    algum = true;
  }
  return algum ? h : null;
}

const ler = (a: Armazenamento | null, k: string) => { try { return a?.getItem(k) ?? null; } catch { return null; } };
const lerJson = (a: Armazenamento | null, k: string): unknown => { try { const t = ler(a, k); return t ? JSON.parse(t) : null; } catch { return null; } };

/** As opções salvas no novo; se ainda não houver, parte das do jogo antigo. */
export function lerOpcoes(a = armazenamentoPadrao()): Opcoes {
  const p = opcoesPadrao();
  const novo = lerJson(a, CHAVE_OPCOES);
  if (ehObj(novo)) return normalizarOpcoes(novo);
  // primeira vez no novo: o que o jogador escolheu no antigo
  const teclasAntigas = lerJson(a, 'saiyan_controls');
  const vAntigo = ler(a, 'saiyan_controls_v') === '2';
  const t1 = vAntigo && ehObj(teclasAntigas) ? normalizarTeclas(teclasAntigas.p1, p.teclas.p1) : p.teclas.p1;
  if (t1.attack === 'MouseLeft' && ler(a, 'saiyan_pc_mode') !== 'mouse') t1.attack = 'KeyF';
  const sens = Number(ler(a, 'saiyan_pad_sens'));
  return {
    ...p,
    modoControle: um(ler(a, 'saiyan_control_selection'), ['auto', 'pc', 'touch', 'joystick'], 'auto'),
    modoPc: um(ler(a, 'saiyan_pc_mode'), ['keyboard', 'mouse'], 'keyboard'),
    teclas: { p1: t1, p2: vAntigo && ehObj(teclasAntigas) ? normalizarTeclas(teclasAntigas.p2, p.teclas.p2) : p.teclas.p2 },
    controle: ler(a, 'saiyan_pad_bindings_v') === '2' ? normalizarBotoes(lerJson(a, 'saiyan_pad_bindings')) : p.controle,
    sensibilidade: sens >= SENS_MIN && sens <= SENS_MAX ? Math.round(sens) : SENS_PADRAO,
    modoToque: um(ler(a, 'saiyan_touch_mode'), ['analog', 'swipe'], 'analog'),
    duploToqueParry: ler(a, 'saiyan_doubletap') !== 'false',
    vibracao: ler(a, 'saiyan_vibration') !== 'false',
    tiroContinuo: ler(a, 'saiyan_autofire') !== 'false',
    dicaTiroVista: ler(a, 'saiyan_hint_autofire') === '1',
    hud: (ler(a, 'saiyan_touch_hud_customized') === '1' && hudDoAntigo(lerJson(a, 'saiyan_touch_hud'))) || p.hud,
  };
}

export function normalizarOpcoes(x: Record<string, unknown>): Opcoes {
  const p = opcoesPadrao();
  const t = ehObj(x.teclas) ? x.teclas : {};
  return {
    modoControle: um(x.modoControle, ['auto', 'pc', 'touch', 'joystick'], p.modoControle),
    modoPc: um(x.modoPc, ['keyboard', 'mouse'], p.modoPc),
    teclas: { p1: normalizarTeclas(t.p1, p.teclas.p1), p2: normalizarTeclas(t.p2, p.teclas.p2) },
    controle: normalizarBotoes(x.controle),
    sensibilidade: Math.round(num(x.sensibilidade, SENS_MIN, SENS_MAX, SENS_PADRAO)),
    modoToque: um(x.modoToque, ['analog', 'swipe'], p.modoToque),
    duploToqueParry: x.duploToqueParry !== false,
    vibracao: x.vibracao !== false,
    tiroContinuo: x.tiroContinuo !== false,
    dicaTiroVista: x.dicaTiroVista === true,
    hud: normalizarHud(x.hud),
  };
}

export function salvarOpcoes(o: Opcoes, a = armazenamentoPadrao()): void {
  try { a?.setItem(CHAVE_OPCOES, JSON.stringify(o)); } catch { /* cheio ou sem acesso: só nesta sessão */ }
}

/** Opções vivas do jogo (uma cópia só para todas as cenas). */
let atuais: Opcoes | null = null;
export function opcoes(): Opcoes {
  atuais ??= lerOpcoes();
  return atuais;
}
export function mudarOpcoes(f: (o: Opcoes) => void): Opcoes {
  const o = opcoes();
  f(o);
  salvarOpcoes(o);
  return o;
}
/** para os testes */
export function esquecerOpcoes(): void { atuais = null; }

/** Nome curto de uma tecla (event.code) para mostrar na tela (getBindingDisplayName do antigo). */
export function nomeDaTecla(c: string): string {
  if (!c) return '—';
  if (c === 'MouseLeft') return 'MOUSE ESQ.';
  if (c === 'MouseRight') return 'MOUSE DIR.';
  if (c === 'MouseMiddle') return 'MOUSE MEIO';
  const setas: Record<string, string> = { ArrowUp: 'SETA CIMA', ArrowDown: 'SETA BAIXO', ArrowLeft: 'SETA ESQ.', ArrowRight: 'SETA DIR.', Space: 'ESPAÇO', Enter: 'ENTER', NumpadEnter: 'ENTER NUM', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT DIR.', ControlLeft: 'CTRL', ControlRight: 'CTRL DIR.', AltLeft: 'ALT', Backspace: 'APAGAR', Tab: 'TAB' };
  if (setas[c]) return setas[c];
  if (c.startsWith('Key')) return c.slice(3);
  if (c.startsWith('Digit')) return c.slice(5);
  if (c.startsWith('Numpad')) return 'NUM ' + c.slice(6);
  return c.toUpperCase();
}

/** modo de controle efetivo (getEffectiveControlMode): no AUTOMÁTICO, o último tipo de entrada usado manda */
export function modoEfetivo(o: Opcoes, ultimo: 'pc' | 'touch' | 'joystick' | null, temToque: boolean): 'pc' | 'touch' | 'joystick' {
  if (o.modoControle !== 'auto') return o.modoControle;
  return ultimo ?? (temToque ? 'touch' : 'pc');
}
