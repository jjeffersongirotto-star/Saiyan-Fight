// Gera novo/src/legado/cenarios-legado.js com o desenho das 11 arenas do jogo antigo, SEM reescrever nada:
// junta os trechos de game-logic-core.js (ângulo da câmera de cada fase), menu.js (Sala do Tempo, Torneio de
// Cell, Nave de Freeza e drawStageBackground) e cenarios3d.js inteiro, e embrulha numa função que recebe o canvas.
// Assim o visual é exatamente o do jogo antigo. Rodar de novo quando uma arena mudar no jogo antigo:
//   node novo/scripts/gerar-cenarios-legado.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ler = (n) => fs.readFileSync(path.join(raiz, n), 'utf8');

/** trecho entre a linha que começa com `de` (incluída) e a que começa com `ate` (excluída, ou incluída até o fim da função) */
function trecho(texto, de, ate, incluirAte = false) {
  const i = texto.indexOf(de);
  if (i < 0) throw new Error(`marcador não achado: ${de}`);
  let j = texto.indexOf(ate, i + de.length);
  if (j < 0) throw new Error(`marcador não achado: ${ate}`);
  if (incluirAte) j = texto.indexOf('\n}\n', j) + 3;
  return texto.slice(i, j);
}

const nucleo = trecho(ler('game-logic-core.js'), '// Sala do Tempo: o cenário', 'function getForwardTravel', true);
const menu = trecho(ler('menu.js'), '// ==================== SALA DO TEMPO', '// ==================== RENDERIZAÇÃO DE ENTIDADES');
const c3d = ler('cenarios3d.js');

const saida = `// @ts-nocheck
// GERADO por novo/scripts/gerar-cenarios-legado.mjs a partir do jogo antigo — NÃO EDITAR À MÃO.
// Trechos: game-logic-core.js (ângulos), menu.js (Sala do Tempo, Torneio de Cell, Nave de Freeza,
// drawStageBackground) e cenarios3d.js. O canvas é a "tela" do jogo antigo: 800x350 lógicos, contexto escalado.
/* eslint-disable */
export function criarCenariosLegado(canvasEl) {
  const GAME_WIDTH = 800, GAME_HEIGHT = 350;
  let renderScale = 1;
  const canvas = { get width() { return GAME_WIDTH; }, get height() { return GAME_HEIGHT; } };
  const ctx = canvasEl.getContext('2d');
  let gameplayClock = 0;
  const gameState = 'playing';
  const world = { stageScrollX: 0 };
  let selectedStage = 'kame';
${nucleo}
${menu}
${c3d}
  return {
    /** desenha a arena \`id\` com o avanço \`scroll\` (1,5 por quadro, como o antigo) e o relógio \`t\` em segundos */
    desenhar(id, scroll, t) {
      selectedStage = id;
      world.stageScrollX = scroll;
      gameplayClock = t;
      ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
      ctx.imageSmoothingEnabled = true;
      drawStageBackground();
    },
    /** troca a resolução (pixels reais por pixel do jogo); as imagens guardadas se refazem sozinhas (c3Valida) */
    escala(k) {
      renderScale = k;
      canvasEl.width = Math.round(GAME_WIDTH * k);
      canvasEl.height = Math.round(GAME_HEIGHT * k);
    },
  };
}
`;
const destino = path.join(raiz, 'novo/src/legado/cenarios-legado.js');
fs.writeFileSync(destino, saida);
console.log(`ok: ${path.relative(raiz, destino)} (${(saida.length / 1024).toFixed(0)} KB)`);
