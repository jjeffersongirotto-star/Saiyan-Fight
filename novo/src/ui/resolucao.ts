// Nitidez: o jogo continua com as coordenadas lógicas 800x350 (como o jogo antigo), mas o canvas real tem
// ESCALA_RENDER vezes mais pixels (até 2x em telas de alta densidade) e a câmera dá zoom nessa escala.
// Assim textos e desenhos ficam nítidos no celular, sem mudar nenhuma conta da luta (renderScale do jogo antigo).
// v0.125: se o aparelho não segura 60 fps, a resolução baixa sozinha (2x → 1,5x → 1x; abaixo de ~40 fps direto a 1x) e depois o cenário 3D passa
// a ser redesenhado a cada 2 ou 3 quadros (vigiarDesempenho, logica/desempenho.ts). Nunca volta a subir na sessão.
import Phaser from 'phaser';
import { TELA_A, TELA_L } from '../logica/constantes';
import { criarVigia, degrauAbaixo, DEGRAUS_ESCALA, escalaInicial, medirQuadro } from '../logica/desempenho';

/** resolução atual da tela (muda só para baixo, por mudarEscala) */
export let ESCALA_RENDER = escalaInicial(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

/** Chamar no create() de toda cena: mostra o mundo 0..800 x 0..350 inteiro no canvas maior. */
export function ajustarCamera(cena: Phaser.Scene): void {
  cena.cameras.main.setZoom(ESCALA_RENDER).centerOn(TELA_L / 2, TELA_A / 2);
}

/** Estilo de texto com a resolução certa para o zoom (senão o texto sai borrado). */
export function estiloTexto(s: Phaser.Types.GameObjects.Text.TextStyle): Phaser.Types.GameObjects.Text.TextStyle {
  return { resolution: Math.ceil(ESCALA_RENDER), ...s };
}

/** Troca a resolução do canvas e acerta a câmera de todas as cenas (as que vierem depois usam a nova). */
export function mudarEscala(jogo: Phaser.Game, k: number): void {
  ESCALA_RENDER = k;
  jogo.scale.setGameSize(Math.round(TELA_L * k), Math.round(TELA_A * k));
  for (const cena of jogo.scene.scenes) if (cena.cameras?.main) ajustarCamera(cena);
}

/** depois da resolução mínima, quem mais pode aliviar (o cenário 3D da luta); devolve true se aliviou */
const alivios = new Set<() => boolean>();
export function aoFaltarDesempenho(f: () => boolean): () => void {
  alivios.add(f);
  return () => alivios.delete(f);
}

/** Baixa um degrau (ou, muito lento, direto à resolução mínima): primeiro a resolução, depois os alívios. */
export function baixarQualidade(jogo: Phaser.Game, minimo = false): void {
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
