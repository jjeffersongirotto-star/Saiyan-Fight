// Contas dos efeitos animados (sem Phaser): qual quadro mostrar, qual aura/tiro/raio cada um usa e o caminho do
// sol do Freeza. Portado de menu.js (efeitoQuadro, efeitoQuadroUnico, AURA_EFEITOS, drawSolDoFreeza, drawKiAura).
import { EFEITOS, ehEfeito, type NomeEfeito } from '../dados/efeitos';
import type { Aura } from '../dados/personagens';
import { PERSONAGENS } from '../dados/personagens';
import * as C from './constantes';

/** Quadro da animação em laço no tempo t (segundos); com `laco`, depois da 1ª passada repete a partir dele. */
export function quadroDoEfeito(nome: NomeEfeito, t: number): number {
  const e: { n: number; ms: number; laco?: number } = EFEITOS[nome];
  const q = Math.floor((Math.max(0, t) * 1000) / e.ms);
  if (e.laco !== undefined && q >= e.n) return e.laco + ((q - e.n) % (e.n - e.laco));
  return q % e.n;
}

/** Efeito que toca uma vez só (explosão, onda do parry): quadro pelo progresso 0..1; null quando acabou. */
export function quadroUnico(nome: NomeEfeito, prog: number): number | null {
  return prog >= 0 && prog < 1 ? Math.floor(prog * EFEITOS[nome].n) : null;
}

/** Cor da aura -> animação [normal, forte (carregando ou com o poder da transformação)]. Sem imagem (gelo, rosa):
 *  null, e a aura é a labareda desenhada (traceKiAuraFlame). */
const AURA_EFEITOS: Partial<Record<Aura, [NomeEfeito, NomeEfeito]>> = {
  verde: ['aura_verde', 'aura_verde_forte'], azul: ['aura_azul', 'aura_azul'], amarelo: ['aura_amarela', 'aura_amarela_forte'],
  vermelho: ['aura_vermelha', 'aura_vermelha_forte'], roxo: ['aura_roxa', 'aura_roxa'],
  blue: ['aura_azul_chama', 'aura_azul_chama'], azul_escuro: ['aura_azul_escura', 'aura_azul_escura'],
};
export const efeitoDaAura = (aura: Aura, forte: boolean): NomeEfeito | null => AURA_EFEITOS[aura]?.[forte ? 1 : 0] ?? null;

/** Cores da labareda desenhada (KI_AURA_PALETTES): borda, meio, núcleo. */
export const PALETAS_AURA: Record<Aura, [number, number, number]> = {
  gelo: [0x5ec8ff, 0xc8f0ff, 0xffffff], amarelo: [0xff8a00, 0xffd23f, 0xfff8c8], vermelho: [0xc21a1a, 0xff6a3d, 0xffd6be],
  rosa: [0xd63c96, 0xff9ad6, 0xffe8f6], blue: [0x1c5fe0, 0x38a8ff, 0xe2f4ff], azul: [0x1c5fe0, 0x5cb8ff, 0xe2f4ff],
  verde: [0x1d9a2a, 0x6cff6a, 0xe8ffe2], azul_escuro: [0x0b1f8a, 0x2f6cff, 0xc4d8ff], roxo: [0x6a1fb0, 0xb878ff, 0xf2e4ff],
};

/** Aura que aparece agora: a da forma transformada enquanto dura o poder; senão a do personagem (drawKiAura). */
export function auraDoLutador(personagem: string, nivel: number, poder: number): Aura {
  const formas = PERSONAGENS[personagem].formas;
  return nivel > 0 && poder > 0 ? formas[Math.min(nivel, formas.length - 1)].aura : formas[0].aura;
}

/** A aura fica "forte" (maior, animação forte) carregando ki, transformando ou com o poder da transformação. */
export const auraForte = (l: { acao: string; nivel: number; poder: number }) =>
  l.acao === 'carregando' || l.acao === 'transformando' || (l.nivel > 0 && l.poder > 0);

/** Nível da aura (0..1) indo em direção ao alvo, suave (kiAuraLevel: 6 por segundo). */
export const suavizarAura = (atual: number, forte: boolean, dtSeg: number) =>
  atual + ((forte ? 1 : 0) - atual) * Math.min(1, dtSeg * 6);

export function efeitoDoTiro(personagem: string): NomeEfeito {
  const e = PERSONAGENS[personagem]?.efeitoTiro;
  return e && ehEfeito(e) ? e : 'tiro_pixel';
}

/** Raio animado do especial, ou null = raio desenhado na cor do golpe ("cor"). */
export function efeitoDoEspecial(personagem: string): NomeEfeito | null {
  const e = PERSONAGENS[personagem]?.efeitoEspecial;
  return e && e !== 'cor' && ehEfeito(e) ? e : null;
}

/** Cor do raio desenhado (drawSpecialBeams): pelo nome do golpe. */
export function corDoRaio(personagem: string): number {
  const golpe = PERSONAGENS[personagem]?.especial;
  if (golpe === 'FINAL FLASH') return 0xffff00;
  if (golpe === 'MAKAN KOSAPPO') return 0xff0055;
  if (golpe === 'DEATH BEAM') return 0xaa00ff;
  return 0x00ffff;
}

/** Fases do sol do Freeza (gameplay.js): nasce no dedo e cresce, é empurrado para a frente, voa até o alvo. */
export const SOL_CRESCE = 22;
export const SOL_EMPURRA = 32;
export const SOL_RAIO = 34;

type Ponto = { x: number; y: number };
/** Onde a bola do sol está `passou` quadros depois do disparo (drawSolDoFreeza). `prog` > 0 = explodindo. */
export function caminhoDoSol(passou: number, dedo: Ponto, frente: Ponto, alvo: Ponto, lado: 1 | -1) {
  const R = SOL_RAIO;
  if (passou < SOL_CRESCE) {
    const k = passou / SOL_CRESCE;
    const r = 5 + (R - 5) * (1 - (1 - k) * (1 - k));
    return { x: dedo.x, y: dedo.y - r - 2, r, explosao: -1 };
  }
  if (passou < SOL_EMPURRA) {
    const k = (passou - SOL_CRESCE) / (SOL_EMPURRA - SOL_CRESCE);
    const y0 = dedo.y - R - 2;
    // vai para a frente primeiro e só depois desce (não passa por cima do corpo)
    return { x: dedo.x + (frente.x + lado * (R + 6) - dedo.x) * Math.min(1, k * 1.6), y: y0 + (frente.y - y0) * k * k, r: R, explosao: -1 };
  }
  if (passou < C.SOL_CHEGA) {
    const k = (passou - SOL_EMPURRA) / (C.SOL_CHEGA - SOL_EMPURRA), ke = k * k * (3 - 2 * k);
    const x0 = frente.x + lado * (R + 6);
    return { x: x0 + (alvo.x - x0) * ke, y: frente.y + (alvo.y - frente.y) * ke, r: R, explosao: -1 };
  }
  const prog = (passou - C.SOL_CHEGA) / Math.max(1, C.SOL_DURACAO - C.SOL_CHEGA);
  return { x: alvo.x, y: alvo.y, r: R * (1 + prog), explosao: prog };
}

/** Ponto de encontro do choque na tela (drawSpecialBeams): meio da tela deslocado pelo empurrão. */
export const meioDoChoqueX = (empurrao: number) => C.TELA_L / 2 + Math.max(-1, Math.min(1, empurrao)) * (C.TELA_L / 2 - 60);

/** Agora os dois andam no choque: o raio liga as duas mãos (pode ficar inclinado) e o ponto de encontro fica na
 *  mesma fração do caminho que o meioDoChoqueX ocupa na tela (empurrão 0 = no meio das mãos). */
export function pontoDoChoque(m1: { x: number; y: number }, m2: { x: number; y: number }, empurrao: number) {
  const f = (meioDoChoqueX(empurrao) - 60) / (C.TELA_L - 120);
  return { x: m1.x + (m2.x - m1.x) * f, y: m1.y + (m2.y - m1.y) * f, ang: Math.atan2(m2.y - m1.y, m2.x - m1.x), dist: Math.hypot(m2.x - m1.x, m2.y - m1.y) };
}

/** Escudo/onda do parry: o parry_onda toca uma vez em 10 quadros (parryHighlightTimer). */
export const PARRY_ONDA_QUADROS = 10;
/** A esfera de escudo_azul.png ocupa 91% do quadro. */
export const ESCUDO_FRACAO_VISIVEL = 0.91;
