// Nitidez: o jogo continua com as coordenadas lógicas 800x350 (como o jogo antigo), mas o canvas real tem
// ESCALA_RENDER vezes mais pixels (até 2x em telas de alta densidade) e a câmera dá zoom nessa escala.
// Assim textos e desenhos ficam nítidos no celular, sem mudar nenhuma conta da luta (renderScale do jogo antigo).
// v0.125: se o aparelho não segura 60 fps, a resolução baixa sozinha (2x → 1,5x → 1x; abaixo de ~40 fps direto a 1x) e depois o cenário 3D passa
// a ser redesenhado a cada 2 ou 3 quadros (vigiarDesempenho, logica/desempenho.ts). Nunca volta a subir na sessão.
import Phaser from 'phaser';
import { TELA_A, TELA_L } from '../logica/constantes';
import { criarVigia, degrauAbaixo, DEGRAUS_ESCALA, escalaInicial, medirQuadro } from '../logica/desempenho';
import { desligarEnfeites, entrarNaCena } from './transicao';
import { opcoes } from '../logica/opcoes';

/** resolução atual da tela (muda só para baixo, por mudarEscala) */
export let ESCALA_RENDER = typeof window === 'undefined' ? 1 : escalaInicial(
  window.devicePixelRatio || 1,
  Math.max(window.screen?.width || 0, window.innerWidth || 0),
  Math.max(window.screen?.height || 0, window.innerHeight || 0),
  'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0,
);
/** computador (sem toque): o cenário 3D pode ser desenhado em 2x (no celular fica 1x, pesava) */
export const NO_PC = typeof window !== 'undefined' && !('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0);

/** Chamar no create() de toda cena: mostra o mundo 0..800 x 0..350 inteiro no canvas maior (e faz a transição). */
export function ajustarCamera(cena: Phaser.Scene): void {
  zoomDaCamera(cena);
  entrarNaCena(cena);
}
function zoomDaCamera(cena: Phaser.Scene): void {
  cena.cameras.main.setZoom(ESCALA_RENDER).centerOn(TELA_L / 2, TELA_A / 2);
}

/** OPÇÕES → JOGO → TAMANHO DO TEXTO (v0.147): GRANDE aumenta os textos em 12% (os botões encolhem o que não cabe) */
export const fatorTexto = () => (opcoes().textoGrande ? 1.12 : 1);

/** Estilo de texto com a resolução certa para o zoom (senão o texto sai borrado) e o tamanho escolhido nas opções. */
export function estiloTexto(s: Phaser.Types.GameObjects.Text.TextStyle): Phaser.Types.GameObjects.Text.TextStyle {
  const px = typeof s.fontSize === 'string' ? parseFloat(s.fontSize) : NaN;
  const f = fatorTexto();
  return { resolution: Math.ceil(ESCALA_RENDER), ...s, ...(f !== 1 && Number.isFinite(px) ? { fontSize: `${Math.round(px * f * 10) / 10}px` } : {}) };
}

/** Troca a resolução do canvas e acerta a câmera de todas as cenas (as que vierem depois usam a nova). */
export function mudarEscala(jogo: Phaser.Game, k: number): void {
  ESCALA_RENDER = k;
  jogo.scale.setGameSize(Math.round(TELA_L * k), Math.round(TELA_A * k));
  for (const cena of jogo.scene.scenes) if (cena.cameras?.main) zoomDaCamera(cena);
}

/** depois da resolução mínima, quem mais pode aliviar (o cenário 3D da luta); devolve true se aliviou */
const alivios = new Set<() => boolean>();
export function aoFaltarDesempenho(f: () => boolean): () => void {
  alivios.add(f);
  return () => alivios.delete(f);
}

/** Baixa um degrau (ou, muito lento, direto à resolução mínima): primeiro a resolução, depois os alívios. */
export function baixarQualidade(jogo: Phaser.Game, minimo = false): void {
  desligarEnfeites(); // v0.145: aparelho apertado: sem faixa de transição nem faíscas no menu
  const abaixo = degrauAbaixo(ESCALA_RENDER);
  if (abaixo !== null) { mudarEscala(jogo, minimo ? DEGRAUS_ESCALA[DEGRAUS_ESCALA.length - 1] : abaixo); return; }
  for (const f of alivios) if (f()) return;
}

/** Liga o vigia: mede o tempo real de cada quadro (inclui a placa de vídeo) e baixa a qualidade se faltar. */
export function vigiarDesempenho(jogo: Phaser.Game): void {
  const v = criarVigia();
  jogo.events.on(Phaser.Core.Events.STEP, () => {
    if (document.hidden) { v.soma = 0; v.quadros = 0; return; }
    const pedido = medirQuadro(v, jogo.loop.rawDelta);
    if (pedido !== 'nada') baixarQualidade(jogo, pedido === 'minimo');
  });
}
