// MENU PRINCIPAL do jogo antigo (gameState "menu"): painel SAIYAN FIGHT com JOGAR, PERSONAGENS, ARENAS, OPÇÕES,
// RANKING, CONQUISTAS e TUTORIAL; a esfera de 4 estrelas no canto abre o menu de ajustes (perfil com APELIDO,
// EDITOR DE PERSONAGENS, EDITOR DE ARENAS, UPDATES); tela cheia no canto direito. Mesmas posições (MENU_LAYOUT).
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { som } from '../audio/som';
import { botao, botaoNav, dentro, montarTela, painel, ret, type BotaoTela, type Navegacao } from '../ui/telas';
import { esferaDoDragao, fotoDoPerfil } from '../ui/esfera';
import { conquistas, APELIDO_MAX } from '../logica/conquistas';
import { pedirTexto } from '../ui/janela';
import { avisarQueOJogoAbriu, infoVersao } from '../app/plataforma';
import { abrirEditor } from '../ui/editores';
import { aoApertar } from '../entrada/teclas';
import type { ModoFase } from '../logica/ondas';

export interface DadosDaLuta {
  modo: 'cpu' | 'versus' | 'historia' | 'tutorial' | 'treino';
  p1: string;
  p2: string;
  /** TUTORIAL e TUTORIAL LIVRE: a forma escolhida para o jogador 1 (0 = normal) */
  nivel?: number;
  /** só no modo história: a fase (id de FASES) e o modo dela */
  fase?: string;
  modoFase?: ModoFase;
  /** arena (id de FASES ou de uma arena criada no editor): no VERSUS/CPU escolhida na tela Arenas; na história é a da fase */
  arena?: string;
}

const L = {
  play: ret(190, 95, 180, 36), characters: ret(430, 95, 180, 36),
  stages: ret(190, 150, 180, 36), options: ret(430, 150, 180, 36),
  ranking: ret(190, 205, 180, 36), achievements: ret(430, 205, 180, 36),
  tutorial: ret(190, 260, 180, 36), livre: ret(430, 260, 180, 36),
  esfera: ret(12, 12, 40, 40),
};
const E = { x: 12, y: 58, w: 216 };

export class Menu extends Phaser.Scene {
  private nav!: Navegacao;
  private esferaAberta = false;
  private perfilAberto = false;
  private camadaEsfera: Phaser.GameObjects.Container | null = null;
  private botoesEsfera: BotaoTela[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    ajustarCamera(this);
    som.musica(null); // fora da luta não toca música (como no jogo antigo: o BGM é só da luta)
    avisarQueOJogoAbriu(); // app Android: o jogo abriu de verdade (senão o plugin volta ao pacote anterior)
    this.esferaAberta = this.perfilAberto = false;
    this.camadaEsfera = null;
    this.nav = montarTela(this, null, true);
    painel(this, 150, 35, 500, 270, 'SAIYAN FIGHT', 'A BATALHA COMEÇA AGORA');
    const b = (r: typeof L.play, t: string, f: () => void) => botaoNav(this, this.nav, r, t, f, { cor: '#fff0a6' });
    b(L.play, 'JOGAR', () => this.scene.start('ModoJogo'));
    b(L.characters, 'PERSONAGENS', () => this.scene.start('Personagens'));
    b(L.stages, 'ARENAS', () => this.scene.start('ConfigArenas'));
    b(L.options, 'OPÇÕES', () => this.scene.start('Opcoes', { voltar: 'Menu' }));
    b(L.ranking, 'RANKING', () => this.scene.start('Ranking'));
    b(L.achievements, 'CONQUISTAS', () => this.scene.start('Conquistas'));
    // TUTORIAL e TUTORIAL LIVRE: antes escolhe o personagem e a forma (Selecao)
    b(L.tutorial, 'TUTORIAL', () => this.scene.start('Selecao', { modo: 'tutorial' }));
    b(L.livre, 'TUTORIAL LIVRE', () => this.scene.start('Selecao', { modo: 'treino' }));
    this.add.text(TELA_L - 6, TELA_A - 4, `v${infoVersao().jogo}`, estiloTexto({ fontFamily: 'Arial', fontSize: '10px', color: '#94a3b8' })).setOrigin(1, 1);

    // esfera de 4 estrelas
    const esf = this.add.image(L.esfera.x + 20, L.esfera.y + 20, esferaDoDragao(this)).setDisplaySize(40, 40).setInteractive({ useHandCursor: true });
    esf.on('pointerup', () => { som.tocar('menu'); this.alternarEsfera(); });
    this.nav.add({ ...L.esfera, acionar: () => this.alternarEsfera() });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.esferaAberta && !dentro(p.worldX, p.worldY, this.retPainelEsfera()) && !dentro(p.worldX, p.worldY, L.esfera)) this.fecharEsfera();
    });

    // atalhos do novo: 1 = CPU, 2 = VERSUS, H/3 = história
    aoApertar(this, (c) => {
      if (this.esferaAberta) { if (c === 'Escape') this.fecharEsfera(); return; }
      if (c === 'Digit1' || c === 'Numpad1') this.scene.start('Selecao', { modo: 'cpu' });
      else if (c === 'Digit2' || c === 'Numpad2') this.scene.start('Selecao', { modo: 'versus' });
      else if (c === 'KeyH' || c === 'Digit3' || c === 'Numpad3') this.scene.start('Mapa');
    });
  }

  private retPainelEsfera() {
    const y = E.y + 74 + (this.perfilAberto ? 34 : 0);
    return ret(E.x, E.y, E.w, y + 112 - E.y);
  }

  private alternarEsfera(): void {
    if (this.esferaAberta) this.fecharEsfera();
    else { this.esferaAberta = true; this.desenharEsfera(); }
  }
  private fecharEsfera(): void {
    this.esferaAberta = this.perfilAberto = false;
    this.desenharEsfera();
  }

  /** getEsferaItens + drawMenuEsfera */
  private desenharEsfera(): void {
    this.camadaEsfera?.destroy(true);
    for (const b of this.botoesEsfera) b.container.destroy();
    this.botoesEsfera = [];
    this.camadaEsfera = null;
    // com a esfera aberta, só ela responde ao controle/teclado (como no antigo)
    this.nav.limpar();
    if (!this.esferaAberta) { this.scene.restart(); return; }
    const p = this.retPainelEsfera();
    const g = this.add.graphics().setDepth(100);
    g.fillStyle(0x040c20, 0.94).fillRoundedRect(p.x, p.y, p.w, p.h, 8).lineStyle(1.5, 0xe85d04, 1).strokeRoundedRect(p.x, p.y, p.w, p.h, 8);
    const pf = ret(E.x + 8, E.y + 8, E.w - 16, 60);
    const foto = this.add.image(pf.x + 31, pf.y + 30, fotoDoPerfil(this)).setDisplaySize(58, 58).setDepth(101);
    const t1 = this.add.text(pf.x + 68, pf.y + 20, T('PERFIL'), estiloTexto({ fontFamily: "'Segoe UI', sans-serif", fontStyle: 'bold', fontSize: '9px', color: '#94a3b8' })).setOrigin(0, 0.5).setDepth(101);
    let nome = conquistas().apelido() || T('JOGADOR');
    const t2 = this.add.text(pf.x + 68, pf.y + 38, nome, estiloTexto({ fontFamily: "'Trebuchet MS', sans-serif", fontStyle: 'bold', fontSize: '13px', color: '#fff0a6' })).setOrigin(0, 0.5).setDepth(101);
    while (nome.length > 3 && t2.width > pf.w - 76) { nome = nome.slice(0, -2) + '…'; t2.setText(nome); }
    const zonaPerfil = this.add.zone(pf.x, pf.y, pf.w, pf.h).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(102);
    zonaPerfil.on('pointerup', () => { som.tocar('menu'); this.perfilAberto = !this.perfilAberto; this.desenharEsfera(); });
    this.nav.add({ ...pf, acionar: () => { this.perfilAberto = !this.perfilAberto; this.desenharEsfera(); } });
    this.camadaEsfera = this.add.container(0, 0, [g, foto, t1, t2, zonaPerfil]).setDepth(100);
    let y = E.y + 74;
    const fonte = { cor: '#fff0a6', fonte: 11, mono: false, prof: 110 } as const;
    const add = (r: ReturnType<typeof ret>, t: string, f: () => void, c?: string) => {
      const bt = botao(this, r, t, f, { ...fonte, ...(c ? { cor: c } : {}) });
      this.botoesEsfera.push(bt);
      this.nav.add({ ...r, acionar: bt.acionar });
    };
    if (this.perfilAberto) {
      const foto2 = botao(this, ret(E.x + 14, y, 92, 26), 'TROCAR FOTO', () => undefined, { cor: '#8b95a5', fonte: 10, mono: false, prof: 110 });
      foto2.ligado = false; // desabilitado por enquanto, como no antigo
      foto2.container.setAlpha(0.6);
      this.botoesEsfera.push(foto2);
      add(ret(E.x + 110, y, 92, 26), 'APELIDO', () => this.pedirApelido());
      y += 34;
    }
    add(ret(E.x + 12, y, E.w - 24, 30), 'EDITOR DE PERSONAGENS', () => abrirEditor(this, 'personagens'));
    add(ret(E.x + 12, y + 36, E.w - 24, 30), 'EDITOR DE ARENAS', () => abrirEditor(this, 'arenas'));
    add(ret(E.x + 12, y + 72, E.w - 24, 30), 'UPDATES', () => this.scene.start('Atualizacoes'), '#fbbf24');
    this.nav.add({ ...L.esfera, acionar: () => this.fecharEsfera() });
  }

  private pedirApelido(): void {
    pedirTexto('APELIDO', 'DIGITE SEU APELIDO (ATÉ 16 LETRAS):', conquistas().apelido(), APELIDO_MAX, (t) => {
      conquistas().definirApelido(t);
      this.desenharEsfera();
    });
  }
}
