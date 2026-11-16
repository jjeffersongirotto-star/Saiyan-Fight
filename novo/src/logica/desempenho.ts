// Vigia do desempenho (vigiarDesempenho do jogo antigo): soma o tempo real de cada quadro em janelas de 30 quadros (meio segundo);
// duas janelas seguidas (1 s) abaixo de ~55 fps pedem para baixar a qualidade um degrau. Quadros muito longos (carregando
// algo, app voltando do fundo) zeram a janela em vez de contar. Nunca sobe de novo na mesma sessão.
// Puro: sem Phaser/DOM (testado em tests/desempenho.test.ts).

/** resoluções da tela, da mais nítida para a mais leve (ESCALA_RENDER) */
export const DEGRAUS_ESCALA = [2, 1.5, 1] as const;
/** quadros por janela de medida */
export const JANELA = 30;
/** média de ms por quadro acima da qual a janela conta como lenta (~55 fps) */
export const MS_LENTO = 1000 / 55;
/** quadro mais longo que isso é um soluço (carregando, aba no fundo): descarta a janela */
export const MS_SOLUCO = 250;
/** abaixo disso (~40 fps) a janela é muito lenta: desce direto para o degrau mais leve */
export const MS_MUITO_LENTO = 1000 / 40;
/** janelas lentas seguidas para baixar um degrau */
export const JANELAS_PARA_BAIXAR = 2;
/** janelas ignoradas depois de baixar (o novo degrau precisa assentar) */
export const ESPERA_DEPOIS = 2;

export interface VigiaDesempenho {
  soma: number;
  quadros: number;
  lentas: number;
  /** das lentas seguidas, quantas abaixo de ~40 fps */
  muitoLentas: number;
  espera: number;
}

export const criarVigia = (): VigiaDesempenho => ({ soma: 0, quadros: 0, lentas: 0, muitoLentas: 0, espera: ESPERA_DEPOIS });

/** o que fazer depois de um quadro: nada, baixar um degrau ou ir direto ao mais leve */
export type Pedido = 'nada' | 'baixar' | 'minimo';

/** Conta um quadro de `ms`; ao fechar duas janelas lentas seguidas pede para baixar a qualidade. */
export function medirQuadro(v: VigiaDesempenho, ms: number): Pedido {
  if (!(ms > 0) || ms > MS_SOLUCO) { v.soma = 0; v.quadros = 0; return 'nada'; }
  v.soma += ms;
  if (++v.quadros < JANELA) return 'nada';
  const media = v.soma / v.quadros;
  v.soma = 0; v.quadros = 0;
  if (v.espera > 0) { v.espera--; return 'nada'; }
  if (media <= MS_LENTO) { v.lentas = 0; v.muitoLentas = 0; return 'nada'; }
  v.muitoLentas = media > MS_MUITO_LENTO ? v.muitoLentas + 1 : 0;
  if (++v.lentas < JANELAS_PARA_BAIXAR) return 'nada';
  const muito = v.muitoLentas >= JANELAS_PARA_BAIXAR;
  v.lentas = 0; v.muitoLentas = 0;
  v.espera = ESPERA_DEPOIS;
  return muito ? 'minimo' : 'baixar';
}

/** maior resolução no computador (800x350 × 2,4 = 1920 de largura: Full HD; até 3 em telas maiores) */
export const ESCALA_MAX_PC = 3;
/**
 * Resolução inicial. Celular/tablet (toque): pela densidade da tela, de 1 a 2 (como antes).
 * Computador (v0.137): pelo tamanho REAL da tela em pixels, para o jogo ser desenhado na resolução do monitor
 * (Full HD = 2,4x) em vez de 800x350 esticado — antes ficava pixelado. `telaL`/`telaA` em pixels CSS.
 */
export function escalaInicial(dpr: number, telaL = 0, telaA = 0, toque = true): number {
  const d = dpr || 1;
  if (toque || !(telaL > 0 && telaA > 0)) return Math.min(2, Math.max(1, Math.round(d)));
  const cabe = Math.min((telaL * d) / 800, (telaA * d) / 350);
  return Math.min(ESCALA_MAX_PC, Math.max(1, Math.round(cabe * 10) / 10));
}

/** o próximo degrau abaixo de `k` (null = já está no mais leve) */
export function degrauAbaixo(k: number): number | null {
  // acima de 2 (computador em Full HD), o primeiro degrau é o 2
  for (const d of DEGRAUS_ESCALA) if (d < k - 1e-6) return d;
  return null;
}
