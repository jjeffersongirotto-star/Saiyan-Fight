// Transição entre telas (v0.143): ao entrar numa cena NOVA, uma faixa de energia escura com a borda acesa varre a
// tela da esquerda para a direita em ~0,25 s. Reiniciar a mesma cena (abas, opções) não repete a faixa, e as camadas
// por cima (aviso de conquista, carregamento) não têm. Não segura o toque: a cena já responde por baixo.
import Phaser from 'phaser';
import { TELA_A, TELA_L } from '../logica/constantes';

const SEM_TRANSICAO = new Set(['AvisoConquista', 'Preload', 'Boot']);
let ultimaCena = '';
/** os enfeites (transição, partículas do menu) somem quando o vigia baixa a qualidade (v0.143) */
let enfeites = true;
export const enfeitesLigados = () => enfeites;
export function desligarEnfeites(): void { enfeites = false; }

/** inclinação da borda da faixa */
const INCL = 70;
export const DURACAO_TRANSICAO = 260;

export function entrarNaCena(cena: Phaser.Scene): void {
  const chave = cena.scene.key;
  if (SEM_TRANSICAO.has(chave)) return;
  // a primeira tela do jogo (o menu ao abrir) entra sem faixa
  const nova = ultimaCena !== '' && chave !== ultimaCena;
  ultimaCena = chave;
  if (!nova || !enfeites) return;
  const g = cena.add.graphics().setDepth(9500);
  const prog = { t: 0 };
  const desenhar = () => {
    // a borda vai de -INCL até a direita da tela; à direita dela fica a cortina escura
    const x = -INCL + prog.t * (TELA_L + INCL * 2);
    g.clear();
    g.fillStyle(0x030d23, 1).fillPoints([{ x: x + INCL, y: 0 }, { x: TELA_L + 10, y: 0 }, { x: TELA_L + 10, y: TELA_A }, { x, y: TELA_A }], true);
    g.lineStyle(10, 0xe85d04, 0.55).lineBetween(x + INCL, 0, x, TELA_A);
    g.lineStyle(4, 0xffd23f, 1).lineBetween(x + INCL, 0, x, TELA_A);
    g.lineStyle(1.5, 0xffffff, 1).lineBetween(x + INCL, 0, x, TELA_A);
  };
  desenhar();
  cena.tweens.add({ targets: prog, t: 1, duration: DURACAO_TRANSICAO, ease: 'Cubic.easeIn', onUpdate: desenhar, onComplete: () => g.destroy() });
}
