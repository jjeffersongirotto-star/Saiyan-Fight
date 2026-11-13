// Escolha da arena no VERSUS / contra a CPU: a arena focada aparece ao vivo no fundo (o mesmo desenho da luta),
// e a luta toca a música dela. ALEATÓRIA sorteia uma das 11.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { todasAsFases } from '../dados/fases';
import { TEMAS } from '../dados/temas';
import { ArenaAntiga, carregarCenarios, cenariosProntos } from '../ui/arena';
import { criarBotao } from '../ui/botao';
import { desenharFundo } from './fundo';
import type { DadosDaLuta } from './Menu';
import { aoApertar } from '../entrada/teclas';
import { som } from '../audio/som';

const BL = 186, BA = 34, ESP_X = 8, ESP_Y = 6;
const Y0 = 210;

/** a última arena escolhida fica para a próxima vez (só nesta sessão) */
let ultima = 0;

export class Arenas extends Phaser.Scene {
  private dados!: DadosDaLuta;
  private foco = 0;
  private arena: ArenaAntiga | null = null;
  private quadro = 0;
  private botoes: ReturnType<typeof criarBotao>[] = [];
  private nome!: Phaser.GameObjects.Text;

  constructor() {
    super('Arenas');
  }

  init(d: DadosDaLuta): void {
    this.dados = d;
    this.foco = ultima;
    this.botoes = [];
    this.arena = null;
  }

  create(): void {
    som.musica(null);
    ajustarCamera(this);
    desenharFundo(this);
    const ligar = (assincrono: boolean) => {
      const m = cenariosProntos();
      // (durante o create a cena ainda não conta como ativa: só confere quando chegou depois)
      if (!m || this.arena || (assincrono && !this.sys.isActive())) return;
      this.arena = new ArenaAntiga(this, this.idFocado(), m, 'arena-previa');
    };
    if (cenariosProntos()) ligar(false);
    else carregarCenarios().then(() => ligar(true)).catch(() => undefined);
    this.add.rectangle(TELA_L / 2, 270, TELA_L, 160, 0x000000, 0.45);
    this.add.text(TELA_L / 2, 22, T('ESCOLHA A ARENA'), estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffd23a', stroke: '#8a2b00', strokeThickness: 5 })).setOrigin(0.5);
    this.nome = this.add.text(TELA_L / 2, 176, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 })).setOrigin(0.5);
    const itens = [...todasAsFases().map((f) => T(f.nome)), T('ALEATÓRIA')];
    // com as arenas criadas no editor (até 7 a mais) os botões ficam menores, em 5 colunas
    const muitas = itens.length > 12;
    const COLS = muitas ? 5 : 4, bl = muitas ? 150 : BL, ba = muitas ? 26 : BA, ey = muitas ? 6 : ESP_Y;
    const x0 = (TELA_L - (COLS * bl + (COLS - 1) * ESP_X)) / 2 + bl / 2, y0 = muitas ? 202 : Y0;
    itens.forEach((rotulo, i) => {
      const x = x0 + (i % COLS) * (bl + ESP_X), y = y0 + Math.floor(i / COLS) * (ba + ey);
      const b = criarBotao(this, x, y, rotulo, () => (this.foco === i ? this.escolher() : this.focar(i)), bl, muitas ? 26 : 40);
      b.rotulo.setFontSize(muitas ? 9 : 11);
      b.container.setSize(bl, ba);
      this.botoes.push(b);
    });
    criarBotao(this, TELA_L - 60, 22, T('VOLTAR'), () => this.scene.start('Selecao', { modo: this.dados.modo }), 100);
    aoApertar(this, (c, ev) => {
      const n = itens.length;
      const m: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS, KeyL: 1, KeyJ: -1, KeyK: COLS, KeyI: -COLS };
      if (m[c] !== undefined) { ev.preventDefault(); this.focar((this.foco + m[c] + n) % n); }
      else if (ev.repeat) return;
      else if (['Enter', 'NumpadEnter', 'Space', 'KeyF', 'KeyU'].includes(c)) this.escolher();
      else if (c === 'Escape') this.scene.start('Selecao', { modo: this.dados.modo });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.arena?.destruir(); this.arena = null; });
    this.focar(this.foco);
  }

  /** ALEATÓRIA mostra uma arena que vai trocando */
  private idFocado(): string {
    return this.foco < todasAsFases().length ? todasAsFases()[this.foco].id : todasAsFases()[Math.floor(this.quadro / 120) % todasAsFases().length].id;
  }

  private focar(i: number): void {
    this.foco = i;
    this.botoes.forEach((b, j) => b.desenhar(j === i));
    const f = todasAsFases()[i];
    this.nome.setText(f ? `${T(f.nome)} · ♪ ${TEMAS[f.musica]?.nome ?? f.musica}` : T('ALEATÓRIA'));
    this.trocarArena();
  }

  private trocarArena(): void {
    const id = this.idFocado();
    if (!this.arena || this.arena.id === id) return;
    const m = cenariosProntos();
    if (!m) return;
    this.arena.destruir();
    this.arena = new ArenaAntiga(this, id, m, 'arena-previa');
  }

  private escolher(): void {
    const i = this.foco < todasAsFases().length ? this.foco : Math.floor(Math.random() * todasAsFases().length);
    ultima = this.foco;
    this.scene.start('Luta', { ...this.dados, arena: todasAsFases()[i].id } satisfies DadosDaLuta);
  }

  update(): void {
    this.quadro++;
    if (this.foco >= todasAsFases().length && this.quadro % 120 === 0) this.trocarArena();
    this.arena?.desenhar(this.quadro);
  }
}
