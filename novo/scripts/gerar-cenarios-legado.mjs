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
// MAPA DE FASES em "3D": a geometria do caminho (game-logic-core.js), o desenho (mapa.js inteiro) e o cadeado e a
// foto redonda das fases (menu.js). Os textos fixos do desenho passam pela tradução do jogo novo.
const mapaNucleo = trecho(ler('game-logic-core.js'), '// ==================== MAPA DE PROGRESSO (fases em linha)', '// Altura do personagem');
const funcao = (t, nome) => { const i = t.indexOf(`function ${nome}(`); if (i < 0) throw new Error(`função não achada: ${nome}`); return t.slice(i, t.indexOf('\n}\n', i) + 3); };
const menuJs = ler('menu.js');
const mapaJs = ler('mapa.js').replace(/ctx\.fillText\("([^"]+)"/g, 'ctx.fillText(traduzir("$1")');
const mapaMenu = ['drawPadlock', 'drawStageThumbCircle'].map((n) => funcao(menuJs, n)).join('\n');
// EDITOR DE ARENAS (arenas.js): só a parte do desenho (peças, céu, chão, hora, clima), até o arquivo .arena.json
const arenas = trecho(ler('arenas.js'), '// arenas.js — EDITOR DE ARENAS', '// ---------------- arquivo .arena.json');

const saida = `// @ts-nocheck
// GERADO por novo/scripts/gerar-cenarios-legado.mjs a partir do jogo antigo — NÃO EDITAR À MÃO.
// Trechos: game-logic-core.js (ângulos), menu.js (Sala do Tempo, Torneio de Cell, Nave de Freeza,
// drawStageBackground) e cenarios3d.js. O canvas é a "tela" do jogo antigo: 800x350 lógicos, contexto escalado.
/* eslint-disable */
// arenas criadas no EDITOR DE ARENAS do antigo (saiyan_arenas, lidas pelo jogo novo): id -> arena
let arenasDoJogador = new Map();
export function definirArenasCriadas(lista) {
  arenasDoJogador = new Map((Array.isArray(lista) ? lista : []).filter((a) => a && typeof a.id === 'string').map((a) => [a.id, a]));
}
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
  // ---- mapa de fases (game-logic-core.js, mapa.js, menu.js) ----
  let traduzir = (t) => t;
  let mapaTotal = 60;
  function getMapaTotalFases() { return mapaTotal; }
${mapaNucleo}
${mapaJs}
${mapaMenu}
  // ---- arenas.js (desenho das arenas criadas) ----
  const readJsonStorage = (_k, padrao) => padrao;
  const writeStorage = () => false;
  const normalizadas = new WeakMap();
  function getFaseDef(id) {
    const bruta = arenasDoJogador.get(id);
    if (!bruta) return null;
    let a = normalizadas.get(bruta);
    if (!a) { a = normalizarArena(bruta); normalizadas.set(bruta, a); }
    return { id, arena: a, criada: true, camera: { tipo: a.movimento === 'seguir' ? 'anda' : 'orbita', volta: 10800 } };
  }
${arenas}
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
    /** MAPA DE FASES: o desenho do antigo (céu, horizonte, objetos e estrada) com a rolagem \`rolagem\` */
    mapa: {
      TOTAL_FASES: MAPA_TOTAL_FASES, NO_R: 26,
      posicao: (i) => getMapaPosicaoFase(i),
      limitar: (r, total) => limitarRolagemMapa(r, total),
      rolagemPara: (i, total) => rolagemParaFase(i, total),
      traducao(f) { traduzir = f; },
      desenhar(rolagem, total, acesaAte) {
        mapaTotal = total;
        ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        drawMapaFundo(rolagem);
        const de = Math.max(0, Math.floor((rolagem - MAPA_MARGEM_X) / MAPA_PASSO_X) - 1);
        const ate = Math.min(total - 1, Math.ceil((rolagem + 800 - MAPA_MARGEM_X) / MAPA_PASSO_X) + 1);
        const pontos = [];
        for (let i = de; i <= ate; i++) { const p = getMapaPosicaoFase(i); pontos.push({ x: p.x - rolagem, y: p.y }); }
        drawMapaEstrada(pontos, acesaAte - de);
      },
      sombra: (x, y, r) => drawMapaSombraFase(x, y, r),
      placa: (x, y) => drawMapaPlaca(x, y),
      cadeado: (x, y, s, aberto) => drawPadlock(x, y, s, aberto || 0),
      foto: (x, y, r, img) => drawStageThumbCircle(x, y, r, img),
      ctx: () => ctx,
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
