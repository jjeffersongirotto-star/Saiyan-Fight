// Mapa do modo história: as 11 fases num caminho (na ordem arrumada no jogo antigo, se houver), com cadeado
// nas que faltam liberar, marcas de NORMAL/DIFÍCIL completos e os 3 modos de cada fase.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { dificilLiberado, faseLiberada, semLimiteLiberado, type ModoFase, type ProgressoFases } from '../logica/ondas';
import { lerProgresso, lerRecordes, type Recordes } from '../logica/progresso';
import { fasesEmOrdem, type Fase } from '../dados/fases';
import { retratoDe } from '../ui/criados';
import { formaDoNivel, PERSONAGENS } from '../dados/personagens';
import { mostrarBarraDeCarregamento } from '../ui/barra';
import { criarBotao } from '../ui/botao';
import { desenharFundo } from './fundo';
import { aoApertar } from '../entrada/teclas';
import { som } from '../audio/som';
import { ArenaAntiga, carregarCenarios, cenariosProntos } from '../ui/arena';

const RAIO = 22;
/** caminho em S: 6 fases em cima (esquerda → direita) e 5 embaixo (direita → esquerda) */
export function posicaoNoMapa(i: number): { x: number; y: number } {
  if (i < 6) return { x: 80 + i * 128, y: 78 };
  return { x: 720 - 64 - (i - 6) * 128, y: 150 };
}

export class Mapa extends Phaser.Scene {
  private fases: Fase[] = [];
  private prog: ProgressoFases = {};
  private recordes: Recordes = {};
  private foco = 0;
  private gNos!: Phaser.GameObjects.Graphics;
  private nome!: Phaser.GameObjects.Text;
  private detalhe!: Phaser.GameObjects.Text;
  private retrato!: Phaser.GameObjects.Image;
  private botoes: { modo: ModoFase; b: ReturnType<typeof criarBotao> }[] = [];
  private inicial: string | undefined;
  /** a arena da fase focada, ao vivo atrás do mapa */
  private arena: ArenaAntiga | null = null;
  private quadro = 0;

  constructor() {
    super('Mapa');
  }

  init(d: { fase?: string } = {}): void {
    this.inicial = d?.fase;
    this.botoes = [];
  }

  preload(): void {
    if (!this.textures.exists('retratos')) {
      mostrarBarraDeCarregamento(this);
      this.load.atlas('retratos', 'atlas/retratos.webp', 'atlas/retratos.json');
    }
  }

  create(): void {
    som.musica(null);
    ajustarCamera(this);
    desenharFundo(this);
    this.arena = null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.arena?.destruir(); this.arena = null; });
    if (!cenariosProntos()) carregarCenarios().then(() => this.sys.isActive() && this.atualizar()).catch(() => undefined);
    this.add.rectangle(TELA_L / 2, 175, TELA_L, 350, 0x000000, 0.5);
    this.fases = fasesEmOrdem();
    this.prog = lerProgresso();
    this.recordes = lerRecordes();
    const ids = this.fases.map((f) => f.id);
    // começa na fase pedida, ou na última liberada
    const pedida = this.inicial ? ids.indexOf(this.inicial) : -1;
    let ultima = 0;
    ids.forEach((id, i) => { if (faseLiberada(id, ids, this.prog)) ultima = i; });
    this.foco = pedida >= 0 && faseLiberada(ids[pedida], ids, this.prog) ? pedida : ultima;

    this.add.text(TELA_L / 2, 22, T('ESCOLHA A FASE'), estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffd23a', stroke: '#8a2b00', strokeThickness: 5 })).setOrigin(0.5);
    // caminho
    const linha = this.add.graphics();
    linha.lineStyle(4, 0xffffff, 0.35);
    for (let i = 1; i < this.fases.length; i++) {
      const a = posicaoNoMapa(i - 1), b = posicaoNoMapa(i);
      linha.lineBetween(a.x, a.y, b.x, b.y);
    }
    this.gNos = this.add.graphics();
    this.fases.forEach((f, i) => {
      const p = posicaoNoMapa(i);
      this.add.text(p.x, p.y, String(i + 1), estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5).setDepth(2);
      const zona = this.add.zone(p.x, p.y, RAIO * 2 + 16, RAIO * 2 + 16).setInteractive({ useHandCursor: true });
      zona.on('pointerover', (pt: Phaser.Input.Pointer) => { if (!pt.wasTouch) this.focar(i); });
      zona.on('pointerup', () => this.focar(i));
      void f;
    });

    // painel da fase escolhida
    this.add.rectangle(TELA_L / 2, 252, TELA_L - 40, 104, 0x0d1633, 0.85).setStrokeStyle(2, 0xffd23a, 0.6);
    this.retrato = this.add.image(76, 300, 'retratos', 'goku').setOrigin(0.5, 103 / 112).setScale(0.62);
    this.nome = this.add.text(124, 210, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#ffffff' }));
    this.detalhe = this.add.text(124, 234, '', estiloTexto({ fontFamily: 'Arial', fontSize: '12px', color: '#dfe7ff', lineSpacing: 2, wordWrap: { width: 280 } }));
    const modos: [ModoFase, string][] = [['normal', 'NORMAL'], ['hard', 'DIFÍCIL'], ['unlimited', 'SEM LIMITE']];
    modos.forEach(([modo, rotulo], i) => {
      const b = criarBotao(this, 470 + i * 118, 252, T(rotulo), () => this.jogar(modo), 112);
      this.botoes.push({ modo, b });
    });
    criarBotao(this, TELA_L - 70, 22, T('VOLTAR'), () => this.scene.start('ModoJogo'), 110);

    aoApertar(this, (c, ev) => {
      const n = this.fases.length;
      if (c === 'ArrowRight' || c === 'ArrowDown') { ev.preventDefault(); this.focar((this.foco + 1) % n); }
      else if (c === 'ArrowLeft' || c === 'ArrowUp') { ev.preventDefault(); this.focar((this.foco - 1 + n) % n); }
      else if (ev.repeat) return;
      else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space' || c === 'Digit1' || c === 'KeyF') this.jogar('normal');
      else if (c === 'Digit2') this.jogar('hard');
      else if (c === 'Digit3') this.jogar('unlimited');
      else if (c === 'Escape') this.scene.start('ModoJogo');
    });
    this.atualizar();
  }

  update(): void {
    this.arena?.desenhar(this.quadro++);
  }

  private liberado(i: number, modo: ModoFase): boolean {
    const ids = this.fases.map((f) => f.id), id = ids[i];
    if (!faseLiberada(id, ids, this.prog)) return false;
    return modo === 'normal' || (modo === 'hard' ? dificilLiberado(id, this.prog) : semLimiteLiberado(id, this.prog));
  }

  private focar(i: number): void {
    this.foco = i;
    this.atualizar();
  }

  private jogar(modo: ModoFase): void {
    if (!this.liberado(this.foco, modo)) {
      this.cameras.main.shake(120, 0.004);
      return;
    }
    this.scene.start('Selecao', { modo: 'historia', fase: this.fases[this.foco].id, modoFase: modo });
  }

  private atualizar(): void {
    const g = this.gNos.clear();
    this.fases.forEach((f, i) => {
      const p = posicaoNoMapa(i);
      const aberto = this.liberado(i, 'normal');
      const pr = this.prog[f.id];
      if (i === this.foco) g.lineStyle(4, 0xffffff, 1).strokeCircle(p.x, p.y, RAIO + 5);
      g.fillStyle(aberto ? f.cor : 0x3a3f4f, 1).fillCircle(p.x, p.y, RAIO);
      g.lineStyle(2, 0x000000, 0.6).strokeCircle(p.x, p.y, RAIO);
      if (!aberto) {
        // cadeado
        g.fillStyle(0xd9dde6, 1).fillRect(p.x + 6, p.y + 6, 12, 9);
        g.lineStyle(2, 0xd9dde6, 1).strokeCircle(p.x + 12, p.y + 5, 4);
      }
      // estrelas: NORMAL e DIFÍCIL completos
      if (pr?.normalDone) g.fillStyle(0xffd23a, 1).fillCircle(p.x - 8, p.y + RAIO + 6, 4);
      if (pr?.hardDone) g.fillStyle(0xff6a00, 1).fillCircle(p.x + 8, p.y + RAIO + 6, 4);
    });
    const f = this.fases[this.foco];
    const v = PERSONAGENS[f.vilao.personagem];
    const forma = f.vilao.nivel > 0 ? ` (${formaDoNivel(f.vilao.personagem, f.vilao.nivel).nome})` : '';
    this.nome.setText(`${this.foco + 1}. ${T(f.nome)}`).setColor(this.liberado(this.foco, 'normal') ? '#ffffff' : '#9aa3b5');
    const rec = this.recordes[f.id];
    const recTxt = (['normal', 'hard', 'unlimited'] as const)
      .filter((m) => rec?.[m])
      .map((m) => `${T(m === 'normal' ? 'NORMAL' : m === 'hard' ? 'DIFÍCIL' : 'SEM LIMITE')} ${rec![m]!.pontos}`)
      .join(' · ');
    const linhas = [`${T('VILÃO')}: ${v?.nome ?? f.vilao.personagem}${forma}`];
    if (!this.liberado(this.foco, 'normal')) linhas.push(T('BLOQUEADA') + ' — ' + T('VENÇA O NORMAL DA FASE ANTERIOR'));
    else if (!this.liberado(this.foco, 'hard')) linhas.push(T('VENÇA O NORMAL PARA LIBERAR O DIFÍCIL'));
    else if (!this.liberado(this.foco, 'unlimited')) linhas.push(T('VENÇA O DIFÍCIL PARA LIBERAR O SEM LIMITE'));
    if (recTxt) linhas.push(`${T('RECORDE')}: ${recTxt}`);
    this.detalhe.setText(linhas.join('\n'));
    const [kr, fr] = retratoDe(f.vilao.personagem);
    if (kr !== 'retratos' || this.textures.get('retratos').has(fr)) this.retrato.setTexture(kr, fr).setFlipX(true);
    for (const { modo, b } of this.botoes) b.container.setAlpha(this.liberado(this.foco, modo) ? 1 : 0.35);
    // fundo: a arena da fase (as bloqueadas também, para dar vontade)
    const m = cenariosProntos();
    if (m && this.arena?.id !== f.id) {
      this.arena?.destruir();
      this.arena = new ArenaAntiga(this, f.id, m, 'arena-previa');
    }
  }
}
