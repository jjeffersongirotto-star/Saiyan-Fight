// EDITOR DE PERSONAGENS e EDITOR DE ARENAS: são os editores do próprio jogo antigo (database.js, conjuntos.js,
// arquivos.js, arenas.js: abas, sprite sheet, recorte, formas, conjuntos, exportar/importar, desfazer, TESTAR...),
// abertos por cima do jogo novo numa moldura (iframe) do jogo antigo, no mesmo endereço. Assim o editor é o mesmo,
// sem reescrever. O que o jogador salva fica onde o antigo sempre guardou (saiyan_db_v8_8bit, IndexedDB
// saiyan_conjuntos, saiyan_arenas); ao fechar, o jogo novo lê de novo (ui/criados.ts) e já dá para jogar.
// O código do jogo antigo não muda: só chamamos as funções que o menu dele chama (setGameState("database") e
// abrirEditorArenas()).
import type Phaser from 'phaser';
import { avisar } from './janela';
import { T, TF } from '../logica/idioma';
import { carregarCriados } from './criados';
import { som } from '../audio/som';

export type QualEditor = 'personagens' | 'arenas';
/** onde o jogo antigo fica em relação ao novo: depois da troca, na pasta antigo/; antes, o novo é a pasta novo/ */
export const ENDERECOS_DO_ANTIGO = ['antigo/index.html', '../index.html'];

let achado: string | null | undefined;
async function enderecoDoAntigo(): Promise<string | null> {
  if (achado !== undefined) return achado;
  for (const e of ENDERECOS_DO_ANTIGO) {
    try {
      const r = await fetch(e, { cache: 'no-store' });
      if (r.ok && /database\.js/.test(await r.text())) return (achado = e);
    } catch { /* tenta o próximo */ }
  }
  return (achado = null);
}

type JanelaAntiga = Window & { setGameState?: (s: string) => void; abrirEditorArenas?: () => void; arenaEditorAberto?: () => boolean; eval(c: string): unknown };
const estadoDe = (w: JanelaAntiga): string => { try { return String(w.eval('typeof gameState === "undefined" ? "" : gameState')); } catch { return ''; } };

let aberto = false;
export const editorAberto = () => aberto;

export function abrirEditor(cena: Phaser.Scene, qual: QualEditor): void {
  if (aberto) return;
  void enderecoDoAntigo().then((url) => {
    if (!url) { avisar('EDITOR', 'O EDITOR USA O JOGO ANTIGO, QUE NÃO VEIO JUNTO DESTA VERSÃO.'); return; }
    if (!cena.sys.isActive()) return;
    aberto = true;
    const jogo = cena.game;
    som.musica(null);
    jogo.loop.sleep(); // o jogo novo para enquanto o editor está aberto
    const camada = document.createElement('div');
    camada.id = 'editor-do-antigo';
    camada.style.cssText = 'position:fixed;inset:0;z-index:1000;background:#000;display:flex;flex-direction:column';
    const moldura = document.createElement('iframe');
    moldura.title = T(qual === 'personagens' ? 'EDITOR DE PERSONAGENS' : 'EDITOR DE ARENAS');
    moldura.style.cssText = 'flex:1;width:100%;border:0;background:#000';
    moldura.src = url;
    const sair = document.createElement('button');
    sair.textContent = '✕ ' + T('VOLTAR AO JOGO NOVO');
    sair.style.cssText = 'position:absolute;bottom:6px;left:50%;transform:translateX(-50%);z-index:2;font:bold 12px "Courier New",monospace;color:#fff0a6;background:#123765cc;border:1.5px solid #e85d04;border-radius:14px;padding:4px 12px;cursor:pointer';
    camada.append(moldura, sair);
    document.body.appendChild(camada);

    let entrou = false, viu = false, relogio = 0;
    const fechar = () => {
      if (!aberto) return;
      aberto = false;
      window.clearInterval(relogio);
      camada.remove();
      jogo.loop.wake();
      void carregarCriados(cena).then((r) => {
        if (!cena.sys.isActive()) return;
        cena.scene.restart();
        if (r.personagens || r.arenas) avisar(T('EDITOR'), TF('NO JOGO NOVO: {0} PERSONAGEM(NS) CRIADO(S) E {1} ARENA(S) CRIADA(S).', r.personagens, r.arenas));
      });
    };
    sair.addEventListener('click', fechar);
    relogio = window.setInterval(() => {
      const w = moldura.contentWindow as JanelaAntiga | null;
      if (!w) return;
      const st = estadoDe(w);
      if (!entrou) {
        // espera o jogo antigo chegar no menu dele e abre o editor
        if (st !== 'menu' || typeof w.setGameState !== 'function') return;
        try {
          if (qual === 'personagens') { w.setGameState('database'); viu = true; } // muda na hora
          else w.abrirEditorArenas?.();
          entrou = true;
        } catch { /* tenta de novo */ }
        return;
      }
      // o jogador saiu do editor (o antigo voltaria para o menu dele): volta para o jogo novo
      const noEditor = qual === 'personagens' ? st !== 'menu' : (w.arenaEditorAberto?.() ?? false) || st !== 'menu';
      if (noEditor) viu = true;
      else if (viu) fechar();
    }, 250);
  });
}
