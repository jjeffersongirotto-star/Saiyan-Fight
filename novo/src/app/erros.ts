// v0.155: quando algo dá errado (erro de código ou a placa de vídeo perdeu o contexto do WebGL), aparece uma faixa
// vermelha pequena no canto para o jogador mandar print, e os últimos erros ficam guardados (logica/erros.ts).
// A faixa é HTML por cima do jogo e para os toques/cliques (o Phaser também escuta fora do canvas).
import { CHAVE_ERROS, guardarErro, textoDoErro, type ErroGuardado } from '../logica/erros';
import Phaser from 'phaser';
import { T } from '../logica/idioma';
import { cadaObjeto } from '../ui/formas';

let faixa: HTMLElement | null = null;

function ler(): ErroGuardado[] {
  try { const v = JSON.parse(localStorage.getItem(CHAVE_ERROS) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

export function anotar(msg: string): void {
  const versao = __VERSAO__;
  const lista = guardarErro(ler(), { quando: new Date().toISOString(), msg, versao });
  try { localStorage.setItem(CHAVE_ERROS, JSON.stringify(lista)); } catch { /* sem espaço: só mostra */ }
  mostrar(msg, versao);
}

function mostrar(msg: string, versao: string): void {
  if (!faixa) {
    faixa = document.createElement('div');
    faixa.style.cssText = 'position:fixed;left:6px;bottom:6px;max-width:min(96vw,640px);z-index:60;background:rgba(127,29,29,.94);'
      + 'border:1px solid #fca5a5;border-radius:6px;padding:6px 26px 6px 8px;color:#fff;font:12px/1.35 "Segoe UI",Arial,sans-serif;'
      + 'white-space:pre-wrap;word-break:break-word;user-select:text';
    for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click']) faixa.addEventListener(ev, (e) => e.stopPropagation());
    document.body.appendChild(faixa);
  }
  // v0.158: em tela cheia só o elemento da tela cheia aparece: a faixa vai para dentro dele
  const pai = document.fullscreenElement ?? document.body;
  if (faixa.parentElement !== pai) pai.appendChild(faixa);
  faixa.textContent = '';
  const titulo = document.createElement('b');
  titulo.textContent = `${T('ERRO NO JOGO — MANDE UM PRINT DESTA FAIXA')} (v${versao})`;
  const fechar = document.createElement('span');
  fechar.textContent = '✕';
  fechar.style.cssText = 'position:absolute;right:7px;top:4px;cursor:pointer;font-weight:bold';
  fechar.addEventListener('click', () => { faixa?.remove(); faixa = null; });
  faixa.append(titulo, document.createElement('br'), msg, fechar);
}

/** Liga a captura (uma vez, no main). `canvas` = o do jogo, para saber quando a placa de vídeo perde o contexto. */
export function vigiarErros(canvas?: HTMLCanvasElement): void {
  window.addEventListener('error', (e) => anotar(textoDoErro(String(e.message ?? e), e.filename ? `${e.filename.split('/').pop()}:${e.lineno}` : undefined, (e.error as Error | undefined)?.stack)));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as Error | undefined;
    anotar(textoDoErro(String(r?.message ?? r), undefined, r?.stack));
  });
  canvas?.addEventListener('webglcontextlost', () => anotar(T('A PLACA DE VÍDEO PERDEU O DESENHO DO JOGO (WEBGL)')));
}

/** v0.157: rede de segurança antes de cada desenho: um objeto que ficou com a imagem apagada (textura liberada da
 *  memória) travava o desenho inteiro ("Cannot read properties of null (reading 'glTexture')"). Ele é escondido e
 *  vai para a faixa, uma vez, dizendo qual era. */
export function protegerTexturas(jogo: Phaser.Game): void {
  const avisados = new Set<string>();
  jogo.events.on(Phaser.Core.Events.PRE_RENDER, () => {
    cadaObjeto(jogo, (o, cena) => {
      if (!o.frame || o.frame.source) return;
      const anim = o.anims?.currentAnim?.key ?? '-';
      const nome = `${cena.scene.key}/${o.type}${o.name ? ' ' + o.name : ''} anim=${anim}`;
      (o as unknown as { setTexture(k: string): void }).setTexture('__DEFAULT');
      (o as unknown as { setVisible(v: boolean): void }).setVisible(false);
      o.anims?.stop();
      if (!avisados.has(nome)) { avisados.add(nome); anotar(`${T('IMAGEM APAGADA EM USO (CONSERTADO)')}: ${nome}`); }
    });
  });
}
