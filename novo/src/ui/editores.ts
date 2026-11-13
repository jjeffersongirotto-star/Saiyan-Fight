// EDITOR DE PERSONAGENS e EDITOR DE ARENAS do jogo novo (src/editor/), escritos em TypeScript — não precisam mais
// do jogo antigo. Abrem por cima do jogo (HTML), com o jogo parado. O que o jogador salva fica nas chaves do novo
// (IndexedDB `saiyan-novo`, `saiyan-novo-arenas`); o que foi criado no antigo aparece para ler e editar (cópia).
// Ao fechar, o jogo lê tudo de novo (ui/criados.ts) e já dá para jogar com os criados.
import type Phaser from 'phaser';
import { avisar } from './janela';
import { T, TF } from '../logica/idioma';
import { carregarCriados } from './criados';
import { som } from '../audio/som';
import { EditorDePersonagens } from '../editor/personagens';
import { EditorDeArenas } from '../editor/arenas';
import type { DadosDaLuta } from '../cenas/Menu';

export type QualEditor = 'personagens' | 'arenas';

let aberto = false;
export const editorAberto = () => aberto;

export function abrirEditor(cena: Phaser.Scene, qual: QualEditor): void {
  if (aberto) return;
  aberto = true;
  const jogo = cena.game;
  som.musica(null);
  jogo.loop.sleep(); // o jogo para enquanto o editor está aberto
  // e não recebe os toques/teclas do editor (senão um toque em VOLTAR no canto apertava a tela cheia do jogo por baixo)
  const entrada = jogo.input;
  entrada.enabled = false;
  if (entrada.keyboard) entrada.keyboard.enabled = false;
  const fechar = (testarArena?: string) => {
    aberto = false;
    entrada.enabled = true;
    if (entrada.keyboard) entrada.keyboard.enabled = true;
    jogo.loop.wake();
    void carregarCriados(cena).then((r) => {
      if (!cena.sys.isActive()) return;
      if (testarArena) { cena.scene.start('Luta', { modo: 'cpu', p1: 'goku', p2: 'vegeta', arena: testarArena } satisfies DadosDaLuta); return; }
      cena.scene.restart();
      if (r.personagens || r.arenas) avisar(T('EDITOR'), TF('NO JOGO: {0} PERSONAGEM(NS) CRIADO(S) E {1} ARENA(S) CRIADA(S).', r.personagens, r.arenas));
    });
  };
  if (qual === 'personagens') new EditorDePersonagens(() => fechar());
  else new EditorDeArenas((id) => fechar(id));
}
