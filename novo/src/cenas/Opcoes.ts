// OPÇÕES do jogo antigo (options_main e as telas de dentro), com as mesmas posições (MENU_LAYOUT):
// CONTROLES (PC / TOUCH / JOYSTICK / TESTAR + chaves AUTOMÁTICO/PC/TOUCH/JOYSTICK), CONFIGURAÇÃO DE ÁUDIO
// (+ TRILHAS SONORAS), TRANSMITIR PARA A TV e IDIOMAS. Abre do menu ou da PAUSA (por cima da luta congelada:
// voltar da tela principal das opções devolve à pausa).
import Phaser from 'phaser';
import { ajustarCamera, ESCALA_RENDER } from '../ui/resolucao';
import { desenharFundo } from './fundo';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T, TF, definirIdioma, idiomaAtual, type Idioma } from '../logica/idioma';
import { som, vibrar } from '../audio/som';
import { botao, botaoNav, chave, montarTela, painel, ret, texto, type BotaoTela, type Navegacao, type Ret } from '../ui/telas';
import {
  ACOES_CONTROLE, ACOES_TECLA, BOTOES_HUD, CONTROLE_PADRAO, HUD_ESCALA, HUD_OPACIDADE, HUD_PADRAO, NOMES_BOTOES, SENS_MAX, SENS_MIN,
  atribuirBotao, atribuirTecla, clonarBotoes, clonarHud, modoEfetivo, mudarOpcoes, nomeDaTecla, opcoes,
  type AcaoControle, type AcaoTecla, type BotaoHud, type ModoControle,
} from '../logica/opcoes';
import { padsConectados, ultimaEntrada, intencaoDe, vigiarControles } from '../entrada/controles';
import { transmitindo, transmitirParaTV } from '../app/tv';
import { ICONES_HUD, botaoEscondido } from '../ui/controlesToque';
import { criarAnimacoes, pedirFormas } from '../ui/formas';
import { mostrarBarraDeCarregamento } from '../ui/barra';

/** de onde as opções foram abertas: do menu ou da pausa da luta */
let sobreLuta = false;
export const opcoesSobreALuta = () => sobreLuta;

function sairDasOpcoes(cena: Phaser.Scene): void {
  if (sobreLuta) {
    sobreLuta = false;
    cena.scene.stop();
    cena.scene.resume('Luta', { voltouDasOpcoes: true });
  } else cena.scene.start('Menu');
}

const temToque = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// ------------------------------------------------------------------------------------------------------------
export class Opcoes extends Phaser.Scene {
  constructor() { super('Opcoes'); }
  init(d: { voltar?: 'Menu' | 'Luta' }): void { if (d?.voltar) sobreLuta = d.voltar === 'Luta'; }
  create(): void {
    ajustarCamera(this);
    const nav = montarTela(this, () => sairDasOpcoes(this));
    painel(this, 180, 30, 440, 300, 'OPÇÕES DO JOGO', 'CONFIGURAÇÕES DA PARTIDA');
    botaoNav(this, nav, ret(220, 110, 360, 42), 'CONTROLES', () => this.scene.start('OpcoesControles'), { cor: '#7dd3fc' });
    botaoNav(this, nav, ret(220, 162, 360, 42), 'CONFIGURAÇÃO DE ÁUDIO', () => this.scene.start('OpcoesAudio'), { cor: '#c4b5fd' });
    const tv = botaoNav(this, nav, ret(220, 214, 360, 42), '', () => transmitirParaTV(this.game.canvas, marcar));
    let pronto = false;
    const marcar = () => { if (pronto && !this.sys.isActive()) return; tv.texto(T(transmitindo() ? 'PARAR TRANSMISSÃO PARA A TV' : 'TRANSMITIR PARA A TV')); tv.corTexto(transmitindo() ? '#fca5a5' : '#86efac'); };
    marcar();
    pronto = true;
    botaoNav(this, nav, ret(220, 266, 360, 42), 'IDIOMAS', () => this.scene.start('OpcoesIdiomas'), { cor: '#fde68a' });
  }
}

// ------------------------------------------------------------------------------------------------------------
const IDIOMAS_TELA: { id: Idioma; nome: string }[] = [{ id: 'pt', nome: 'PORTUGUÊS' }, { id: 'en', nome: 'ENGLISH' }, { id: 'es', nome: 'ESPAÑOL' }];
export class OpcoesIdiomas extends Phaser.Scene {
  constructor() { super('OpcoesIdiomas'); }
  create(): void {
    ajustarCamera(this);
    const nav = montarTela(this, () => this.scene.start('Opcoes'));
    painel(this, 200, 30, 400, 250, 'IDIOMAS', 'ESCOLHA O IDIOMA DO JOGO');
    IDIOMAS_TELA.forEach((idi, i) => {
      const atual = idiomaAtual() === idi.id;
      // o nome de cada idioma é escrito nele mesmo (não passa pela tradução)
      const b = botaoNav(this, nav, ret(250, 112 + i * 52, 300, 42), '', () => { definirIdioma(idi.id); this.scene.restart(); }, { cor: atual ? '#ffd23f' : '#7dd3fc' });
      b.rotulo.setText((atual ? '✓ ' : '') + idi.nome);
    });
  }
}

// ------------------------------------------------------------------------------------------------------------
export class OpcoesAudio extends Phaser.Scene {
  constructor() { super('OpcoesAudio'); }
  create(): void {
    ajustarCamera(this);
    const nav = montarTela(this, () => this.scene.start('Opcoes'));
    painel(this, 150, 50, 500, 260, 'VOLUME E ÁUDIO', 'Ajuste do som geral');
    const est = { fontFamily: "'Segoe UI', sans-serif", fontStyle: 'normal' };
    const tSfx = texto(this, 210, 125, '', 14, '#e2e8f0', est).setOrigin(0, 0.75);
    const tBgm = texto(this, 210, 180, '', 14, '#e2e8f0', est).setOrigin(0, 0.75);
    const atualizar = () => {
      tSfx.setText(TF('VOLUME SFX: {0}%', Math.round(som.prefs.volEfeitos * 100)));
      tBgm.setText(TF('VOLUME BGM: {0}%', Math.round(som.prefs.volMusica * 100)));
      mudo.texto(T(som.mudo ? 'ÁUDIO: MUTADO' : 'ÁUDIO: ATIVADO'));
      mudo.corTexto(som.mudo ? '#fca5a5' : '#86efac');
    };
    const vol = (q: 'volEfeitos' | 'volMusica', d: number) => () => { som.mudarVolume(q, d); atualizar(); };
    botaoNav(this, nav, ret(560, 105, 34, 34), '-', vol('volEfeitos', -0.1), { cor: '#fca5a5' });
    botaoNav(this, nav, ret(604, 105, 34, 34), '+', vol('volEfeitos', 0.1), { cor: '#86efac' });
    botaoNav(this, nav, ret(560, 160, 34, 34), '-', vol('volMusica', -0.1), { cor: '#fca5a5' });
    botaoNav(this, nav, ret(604, 160, 34, 34), '+', vol('volMusica', 0.1), { cor: '#86efac' });
    const mudo = botaoNav(this, nav, ret(250, 205, 300, 38), '', () => { som.alternarMudo(); atualizar(); });
    botaoNav(this, nav, ret(250, 252, 300, 38), '♪ TRILHAS SONORAS', () => this.scene.start('Trilhas'), { cor: '#fde68a' });
    atualizar();
  }
}

// ------------------------------------------------------------------------------------------------------------
const TOGGLES: { key: ModoControle; label: string; cx: number; r: Ret; cor: number }[] = [
  { key: 'auto', label: 'AUTOMÁTICO', cx: 215, r: ret(160, 236, 110, 70), cor: 0x22c55e },
  { key: 'pc', label: 'PC', cx: 338, r: ret(283, 236, 110, 70), cor: 0x7dd3fc },
  { key: 'touch', label: 'TOUCH', cx: 461, r: ret(406, 236, 110, 70), cor: 0x93c5fd },
  { key: 'joystick', label: 'JOYSTICK', cx: 584, r: ret(529, 236, 110, 70), cor: 0xc4b5fd },
];
export class OpcoesControles extends Phaser.Scene {
  private marcar: (() => void) | null = null;
  constructor() { super('OpcoesControles'); }
  create(): void {
    ajustarCamera(this);
    const nav = montarTela(this, () => this.scene.start('Opcoes'));
    painel(this, 120, 50, 560, 270, 'CONTROLES', 'SELEÇÃO DE ENTRADA');
    botaoNav(this, nav, ret(180, 120, 220, 42), 'CONTROLES PC', () => this.scene.start('OpcoesPc'), { cor: '#7dd3fc' });
    botaoNav(this, nav, ret(420, 120, 220, 42), 'CONTROLES TOUCH', () => this.scene.start('OpcoesToque'), { cor: '#93c5fd' });
    botaoNav(this, nav, ret(180, 172, 220, 42), 'CONTROLE JOYSTICK', () => this.scene.start('OpcoesJoystick'), { cor: '#c4b5fd' });
    botaoNav(this, nav, ret(420, 172, 220, 42), 'TESTAR CONTROLES', () => this.scene.start('TesteControles', { voltar: 'OpcoesControles' }), { cor: '#a7f3d0' });
    const chaves = TOGGLES.map((t) => {
      const c = chave(this, { ...t.r, cx: t.cx }, t.label, () => { mudarOpcoes((o) => { o.modoControle = t.key; }); this.marcar?.(); });
      nav.add({ ...t.r, acionar: c.acionar });
      return { t, c };
    });
    // no AUTOMÁTICO a chave da entrada em uso acende sozinha (controle, toque ou PC)
    this.marcar = () => {
      const o = opcoes(), ativo = modoEfetivo(o, ultimaEntrada(), temToque());
      for (const { t, c } of chaves) c.marcar(t.key === 'auto' ? o.modoControle === 'auto' : ativo === t.key, t.cor);
    };
    this.marcar();
  }
  update(): void { this.marcar?.(); }
}

// ------------------------------------------------------------------------------------------------------------
const ROTULOS_TECLA: Record<AcaoTecla, string> = { up: 'CIMA', down: 'BAIXO', left: 'ESQUERDA', right: 'DIREITA', attack: 'ATAQUE', charge: 'CARREGAR', transform: 'TRANSFORMAR', parry: 'PARRY', special: 'ESPECIAL' };
export const retTecla = (i: number) => ret(i % 2 === 0 ? 280 : 560, 148 + Math.floor(i / 2) * 27, 110, 24);
export class OpcoesPc extends Phaser.Scene {
  private perfil: 'p1' | 'p2' = 'p1';
  private capturando: AcaoTecla | null = null;
  constructor() { super('OpcoesPc'); }
  create(): void {
    ajustarCamera(this);
    this.capturando = null;
    const nav = montarTela(this, () => { if (!this.capturando) this.scene.start('OpcoesControles'); });
    painel(this, 90, 15, 620, 333, 'CONTROLES PC');
    const o = opcoes();
    texto(this, 400, 68, T(this.perfil === 'p2' ? 'CONTROLE 2' : 'CONTROLE 1'), 18).setOrigin(0.5, 0.75);
    const tr = (p: 'p1' | 'p2') => () => { this.perfil = p; this.scene.restart(); };
    botaoNav(this, nav, ret(130, 78, 150, 32), 'CONTROLE 1', tr('p1'), { cor: this.perfil === 'p1' ? '#fbbf24' : '#7dd3fc' });
    botaoNav(this, nav, ret(520, 78, 150, 32), 'CONTROLE 2', tr('p2'), { cor: this.perfil === 'p2' ? '#fbbf24' : '#7dd3fc' });
    const modo = (m: 'keyboard' | 'mouse') => () => {
      mudarOpcoes((x) => {
        x.modoPc = m;
        // MODO MOUSE: o ataque do J1 vai para o botão esquerdo (como no antigo); voltando ao teclado, para o F
        if (m === 'mouse' && x.teclas.p1.attack === 'KeyF') x.teclas.p1 = atribuirTecla(x.teclas.p1, 'attack', 'MouseLeft');
        if (m === 'keyboard' && x.teclas.p1.attack === 'MouseLeft') x.teclas.p1 = atribuirTecla(x.teclas.p1, 'attack', 'KeyF');
      });
      this.scene.restart();
    };
    botaoNav(this, nav, ret(130, 114, 150, 28), 'MODO TECLADO', modo('keyboard'), { cor: o.modoPc === 'keyboard' ? '#fbbf24' : '#7dd3fc', fonte: 10 });
    botaoNav(this, nav, ret(520, 114, 150, 28), 'MODO MOUSE', modo('mouse'), { cor: o.modoPc === 'mouse' ? '#fbbf24' : '#7dd3fc', fonte: 10 });
    const botoes: BotaoTela[] = [];
    ACOES_TECLA.forEach((a, i) => {
      const r = retTecla(i);
      texto(this, i % 2 === 0 ? 125 : 405, r.y + 16, `${T(ROTULOS_TECLA[a])}:`, 12, '#ffffff', { fontStyle: 'normal' }).setOrigin(0, 0.75);
      botoes.push(botaoNav(this, nav, r, nomeDaTecla(o.teclas[this.perfil][a]), () => this.capturar(a, botoes[i]), { fonte: 10 }));
    });
    // a próxima tecla (ou botão do mouse) vira a da ação; Esc cancela
    const tecla = (ev: KeyboardEvent) => {
      if (!this.capturando) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      if (ev.code === 'Escape') { this.capturando = null; this.scene.restart(); return; }
      this.gravar(ev.code);
    };
    const mouse = (ev: MouseEvent) => {
      if (!this.capturando || this.time.now - this.inicioCaptura < 250) return;
      this.gravar(['MouseLeft', 'MouseMiddle', 'MouseRight'][ev.button] ?? 'MouseLeft');
    };
    window.addEventListener('keydown', tecla, true);
    window.addEventListener('mousedown', mouse, true);
    const semMenu = (e: Event) => { if (this.capturando) e.preventDefault(); };
    window.addEventListener('contextmenu', semMenu, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', tecla, true);
      window.removeEventListener('mousedown', mouse, true);
      window.removeEventListener('contextmenu', semMenu, true);
    });
  }
  private inicioCaptura = 0;
  private capturar(a: AcaoTecla, b: BotaoTela): void {
    this.capturando = a;
    this.inicioCaptura = this.time.now;
    b.texto(T('PRESSIONE...'));
    b.corTexto('#fbbf24');
  }
  private gravar(codigo: string): void {
    const a = this.capturando!;
    this.capturando = null;
    mudarOpcoes((o) => { o.teclas[this.perfil] = atribuirTecla(o.teclas[this.perfil], a, codigo); });
    this.time.delayedCall(30, () => this.scene.restart());
  }
}

// ------------------------------------------------------------------------------------------------------------
export class OpcoesToque extends Phaser.Scene {
  constructor() { super('OpcoesToque'); }
  create(): void {
    ajustarCamera(this);
    // como no antigo, a seta ← daqui volta para a tela principal das OPÇÕES
    const nav = montarTela(this, () => this.scene.start('Opcoes'));
    painel(this, 120, 40, 560, 290, 'CONFIGURAÇÃO TOUCH / MOBILE', 'CONTROLES MÓVEIS');
    const o = opcoes();
    const mudar = (f: () => void) => () => { mudarOpcoes(f); this.scene.restart(); };
    botaoNav(this, nav, ret(170, 106, 180, 34), 'ANALÓGICO', mudar(() => { o.modoToque = 'analog'; }), { cor: o.modoToque === 'analog' ? '#fbbf24' : '#7dd3fc' });
    botaoNav(this, nav, ret(450, 106, 180, 34), 'DESLIZAR', mudar(() => { o.modoToque = 'swipe'; }), { cor: o.modoToque === 'swipe' ? '#fbbf24' : '#7dd3fc' });
    const liga = (v: boolean, f: boolean) => T(v ? (f ? 'ATIVADA' : 'ATIVADO') : f ? 'DESATIVADA' : 'DESATIVADO');
    const cor = (v: boolean) => (v ? '#a7f3d0' : '#fca5a5');
    botaoNav(this, nav, ret(200, 148, 400, 34), `${T('DUPLO TOQUE PARRY')}: ${liga(o.duploToqueParry, false)}`, mudar(() => { o.duploToqueParry = !o.duploToqueParry; }), { cor: cor(o.duploToqueParry) });
    botaoNav(this, nav, ret(200, 190, 400, 34), `${T('VIBRAÇÃO')}: ${liga(o.vibracao, true)}`, () => { mudarOpcoes(() => { o.vibracao = !o.vibracao; }); vibrar(60); this.scene.restart(); }, { cor: cor(o.vibracao) });
    botaoNav(this, nav, ret(200, 232, 400, 34), `${T('TIRO CONTÍNUO (DEDO NO ANALÓGICO)')}: ${liga(o.tiroContinuo, false)}`, mudar(() => { o.tiroContinuo = !o.tiroContinuo; }), { cor: cor(o.tiroContinuo), fonte: 11 });
    botaoNav(this, nav, ret(200, 274, 400, 34), 'REORGANIZAR BOTÕES HUD', () => this.scene.start('EditorHud'), { cor: '#c4b5fd' });
  }
}

// ------------------------------------------------------------------------------------------------------------
// REORGANIZAR BOTÕES HUD (options_hud): arrastar os botões; tocar num deles mostra TAMANHO e OPAC. com − e +.
export class EditorHud extends Phaser.Scene {
  private hud = clonarHud(HUD_PADRAO);
  private sel: BotaoHud | null = null;
  constructor() { super('EditorHud'); }
  create(): void {
    ajustarCamera(this);
    this.hud = clonarHud(opcoes().hud);
    this.sel = null;
    desenharFundo(this);
    this.add.rectangle(0, 0, TELA_L, TELA_A, 0x030a19, 0.58).setOrigin(0).setDepth(-5);
    const nav = montarTela(this, () => this.scene.start('OpcoesToque'));
    nav.limpar(); // aqui não tem a seta ←: SALVAR e VOLTAR AO PADRÃO ficam no canto
    this.children.list.filter((c) => c.type === 'Image' && (c as Phaser.GameObjects.Image).texture.key.startsWith('fundo-menu')).forEach((c) => (c as Phaser.GameObjects.Image).setVisible(false));
    botaoNav(this, nav, ret(20, 20, 100, 30), 'SALVAR', () => { mudarOpcoes((o) => { o.hud = clonarHud(this.hud); }); this.scene.start('OpcoesToque'); }, { cor: '#00ff55' });
    botaoNav(this, nav, ret(130, 20, 124, 30), 'VOLTAR AO PADRÃO', () => { this.hud = clonarHud(HUD_PADRAO); this.sel = null; mudarOpcoes((o) => { o.hud = clonarHud(HUD_PADRAO); }); this.redesenhar(); }, { cor: '#ff0055', fonte: 9 });
    texto(this, TELA_L / 2, 35, T('ARRASTE OS BOTÕES PARA O LUGAR DESEJADO'), 12, '#ffff00', { fontStyle: 'normal' }).setOrigin(0.5, 0.75);
    this.barra = this.add.container(0, 0);
    const g = this.add.graphics().setDepth(5);
    this.desenho = g;
    this.imagens = {} as Record<BotaoHud, Phaser.GameObjects.Image>;
    for (const k of BOTOES_HUD) {
      const img = this.add.image(0, 0, ICONES_HUD[k]).setDepth(6).setInteractive({ draggable: true, useHandCursor: true });
      img.on('pointerdown', () => { this.sel = k; this.redesenhar(); });
      img.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => {
        const b = this.hud[k], r = b.r * b.escala;
        b.x = Math.round(Phaser.Math.Clamp(x, r, TELA_L - r));
        b.y = Math.round(Phaser.Math.Clamp(y, 70 + r * 0.2, TELA_A - r * 0.5));
        this.redesenhar();
      });
      this.imagens[k] = img;
    }
    this.redesenhar();
  }
  private barra!: Phaser.GameObjects.Container;
  private desenho!: Phaser.GameObjects.Graphics;
  private imagens!: Record<BotaoHud, Phaser.GameObjects.Image>;
  private redesenhar(): void {
    const g = this.desenho.clear();
    const o = opcoes();
    for (const k of BOTOES_HUD) {
      const b = this.hud[k], r = b.r * b.escala, img = this.imagens[k];
      const some = botaoEscondido(o, k);
      img.setVisible(!some).setPosition(b.x, b.y).setAlpha(b.opacidade).setScale((r * 1.3) / Math.max(img.width, img.height));
      if (some) continue;
      g.fillStyle(0x101a33, 0.3 * b.opacidade / 0.75).fillCircle(b.x, b.y, r).lineStyle(3, k === this.sel ? 0x00ff55 : 0xffd23a, k === this.sel ? 1 : 0.7).strokeCircle(b.x, b.y, r);
    }
    this.barra.removeAll(true);
    const y = 46, h = 24;
    if (!this.sel) {
      this.barra.add(texto(this, TELA_L / 2, 58, T('TOQUE EM UM BOTÃO PARA AJUSTAR TAMANHO E OPACIDADE'), 11, '#cbd5e1', { fontStyle: 'normal' }).setOrigin(0.5));
      return;
    }
    const b = this.hud[this.sel];
    this.barra.add(texto(this, 250, 58, TF('TAMANHO {0}%', Math.round(b.escala * 100)), 11).setOrigin(0, 0.5));
    this.barra.add(texto(this, 440, 58, TF('OPAC. {0}%', Math.round(b.opacidade * 100)), 11).setOrigin(0, 0.5));
    const passo = (campo: 'escala' | 'opacidade', d: number) => () => {
      const lim = campo === 'escala' ? HUD_ESCALA : HUD_OPACIDADE;
      b[campo] = Math.round(Phaser.Math.Clamp(b[campo] + d, lim.min, lim.max) * 100) / 100;
      this.redesenhar();
    };
    for (const [x, t, c, f] of [[352, '-', '#fca5a5', passo('escala', -0.1)], [386, '+', '#86efac', passo('escala', 0.1)], [532, '-', '#fca5a5', passo('opacidade', -0.1)], [566, '+', '#86efac', passo('opacidade', 0.1)]] as const)
      this.barra.add(botao(this, ret(x, y, 30, h), t, f, { cor: c }).container);
  }
}

// ------------------------------------------------------------------------------------------------------------
const ROTULOS_CONTROLE: Record<AcaoControle, string> = { attack: 'ATAQUE', parry: 'PARRY', charge: 'CARREGAR', transform: 'TRANSFORMAR', special: 'ESPECIAL', pause: 'PAUSA' };
const CORES_FACE = ['#7dd3fc', '#fca5a5', '#f9a8d4', '#86efac'];
export class OpcoesJoystick extends Phaser.Scene {
  private captura: { acao: AcaoControle; fim: number; antes: boolean[] } | null = null;
  private aviso!: Phaser.GameObjects.Text;
  private avisoAte = 0;
  private camadaCaptura: Phaser.GameObjects.Container | null = null;
  private nav!: Navegacao;
  constructor() { super('OpcoesJoystick'); }
  create(): void {
    ajustarCamera(this);
    this.captura = null;
    this.camadaCaptura = null;
    this.nav = montarTela(this, () => { if (this.captura) this.cancelar(); else this.scene.start('OpcoesControles'); });
    painel(this, 90, 15, 620, 333, 'CONTROLE JOYSTICK', 'Escolha uma ação e aperte o botão desejado');
    const o = opcoes();
    ACOES_CONTROLE.forEach((a, i) => {
      const r = ret(330, 96 + i * 36, 210, 28);
      texto(this, 125, r.y + 19, T(ROTULOS_CONTROLE[a]), 13, '#ffffff').setOrigin(0, 0.75);
      const b0 = o.controle[a][0];
      if (b0 >= 0) texto(this, 300, r.y + 14, b0 <= 3 ? ['✕', '○', '□', '△'][b0] : '●', 13, CORES_FACE[b0] ?? '#cbd5e1').setOrigin(0.5);
      botaoNav(this, this.nav, r, o.controle[a].map((n) => NOMES_BOTOES[n] ?? `B${n}`).join(' / '), () => this.iniciar(a), { fonte: 11 });
    });
    botaoNav(this, this.nav, ret(570, 96, 120, 28), 'PADRÃO PS5', () => { mudarOpcoes((x) => { x.controle = clonarBotoes(CONTROLE_PADRAO); }); this.scene.restart(); }, { cor: '#a7f3d0', fonte: 11 });
    botaoNav(this, this.nav, ret(570, 136, 120, 28), 'TESTAR', () => this.scene.start('TesteControles', { voltar: 'OpcoesJoystick' }), { cor: '#93c5fd', fonte: 11 });
    // sensibilidade do analógico: −  [barra 1..5]  +
    const menos = ret(570, 246, 34, 28), mais = ret(656, 246, 34, 28);
    texto(this, (menos.x + mais.x + mais.w) / 2, menos.y - 19, T('SENSIBILIDADE'), 10, '#ffffff').setOrigin(0.5, 0.75);
    texto(this, (menos.x + mais.x + mais.w) / 2, menos.y - 7, T('DO ANALÓGICO'), 10, '#ffffff').setOrigin(0.5, 0.75);
    const barras = this.add.graphics();
    const desenharSens = () => {
      const x0 = menos.x + menos.w + 6, larg = mais.x - 6 - x0, passo = larg / SENS_MAX;
      barras.clear();
      for (let n = 1; n <= SENS_MAX; n++) {
        const h = 6 + n * 3;
        barras.fillStyle(n <= opcoes().sensibilidade ? 0xfbbf24 : 0x94a3b8, n <= opcoes().sensibilidade ? 1 : 0.35).fillRect(x0 + (n - 1) * passo + 1, menos.y + menos.h - 4 - h, passo - 2, h);
      }
    };
    const sens = (d: number) => () => { mudarOpcoes((x) => { x.sensibilidade = Math.max(SENS_MIN, Math.min(SENS_MAX, x.sensibilidade + d)); }); desenharSens(); };
    botaoNav(this, this.nav, menos, '−', sens(-1), { cor: '#e2e8f0', fonte: 16 });
    botaoNav(this, this.nav, mais, '+', sens(1), { cor: '#e2e8f0', fonte: 16 });
    desenharSens();
    this.aviso = texto(this, 630, 190, '', 10, '#fbbf24', { align: 'center', wordWrap: { width: 140 } }).setOrigin(0.5, 0);
    aoEsc(this, () => { if (this.captura) this.cancelar(); });
    this.input.on('pointerdown', () => { if (this.captura && this.time.now - (this.captura.fim - 5000) > 250) this.cancelar(); });
  }
  private iniciar(acao: AcaoControle): void {
    const pad = padsConectados()[0];
    if (!pad) { this.avisar(T('CONECTE UM CONTROLE E APERTE UM BOTÃO')); return; }
    // botões que já estavam apertados (a CRUZ que abriu a captura) só contam depois de soltar
    this.captura = { acao, fim: this.time.now + 5000, antes: pad.buttons.map((b) => b.pressed || b.value > 0.5) };
    this.nav.ativa = false;
    const fundo = this.add.rectangle(0, 0, TELA_L, TELA_A, 0x000000, 0.72).setOrigin(0);
    const t1 = texto(this, TELA_L / 2, 150, TF('APERTE O BOTÃO PARA: {0}', T(ROTULOS_CONTROLE[acao])), 20, '#fff0a6').setOrigin(0.5, 0.75);
    const t2 = texto(this, TELA_L / 2, 185, T('VALE QUALQUER BOTÃO, GATILHO OU O CLIQUE DO TOUCHPAD'), 13, '#e2e8f0', { fontStyle: 'normal' }).setOrigin(0.5, 0.75);
    const t3 = texto(this, TELA_L / 2, 215, '', 11, '#94a3b8', { fontStyle: 'normal' }).setOrigin(0.5, 0.75);
    this.camadaCaptura = this.add.container(0, 0, [fundo, t1, t2, t3]).setDepth(4000);
    this.camadaCaptura.setData('t3', t3);
  }
  private cancelar(): void {
    this.captura = null;
    this.camadaCaptura?.destroy(true);
    this.camadaCaptura = null;
    this.time.delayedCall(200, () => { this.nav.ativa = true; });
  }
  private avisar(t: string): void { this.aviso.setText(t); this.avisoAte = this.time.now + 3000; }
  update(): void {
    if (this.avisoAte && this.time.now > this.avisoAte) { this.aviso.setText(''); this.avisoAte = 0; }
    const c = this.captura;
    if (!c) return;
    const resta = Math.ceil((c.fim - this.time.now) / 1000);
    (this.camadaCaptura?.getData('t3') as Phaser.GameObjects.Text | undefined)?.setText(TF('ESC OU CLIQUE CANCELA  |  {0}s', Math.max(0, resta)));
    if (resta <= 0) { this.cancelar(); return; }
    const pad = padsConectados()[0];
    if (!pad) return;
    pad.buttons.forEach((b, i) => {
      if (!this.captura) return;
      const ap = b.pressed || b.value > 0.5;
      if (!ap) { c.antes[i] = false; return; }
      if (c.antes[i]) return;
      const r = atribuirBotao(opcoes().controle, c.acao, i);
      mudarOpcoes((o) => { o.controle = r.botoes; });
      this.cancelar();
      this.scene.restart();
      if (r.deslocada) this.time.delayedCall(50, () => this.avisar(TF('{0} FICOU COM O BOTÃO ANTERIOR', T(ROTULOS_CONTROLE[r.deslocada!]))));
    });
  }
}
function aoEsc(cena: Phaser.Scene, f: () => void) {
  const t = (ev: KeyboardEvent) => { if (ev.code === 'Escape') f(); };
  window.addEventListener('keydown', t, true);
  cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', t, true));
}

// ------------------------------------------------------------------------------------------------------------
// TESTE DE CONTROLES (controls_test): o que o jogo recebe agora — ações dos jogadores 1 e 2 (teclado, mouse,
// controle), um Goku de prévia que responde aos comandos e os botões/analógicos de cada controle conectado.
const TESTE_ACOES: [AcaoTecla, string][] = [['up', 'CIMA'], ['down', 'BAIXO'], ['left', 'ESQ.'], ['right', 'DIR.'], ['attack', 'ATAQUE'], ['charge', 'CARREGAR'], ['transform', 'TRANSF.'], ['parry', 'PARRY'], ['special', 'ESPECIAL']];
const Q = { x: 408, y: 54, w: 372, h: 182 };
export class TesteControles extends Phaser.Scene {
  private voltarPara = 'OpcoesControles';
  private apertadas = new Set<string>();
  private chips!: Phaser.GameObjects.Graphics;
  private textosChips: Phaser.GameObjects.Text[] = [];
  private pads!: Phaser.GameObjects.Graphics;
  private padTextos: Phaser.GameObjects.Text[] = [];
  private goku: Phaser.GameObjects.Sprite | null = null;
  private dono: 'p1' | 'p2' | null = null;
  private antes: Record<string, boolean> = {};
  private tiros: Phaser.GameObjects.Arc[] = [];
  private donoTxt!: Phaser.GameObjects.Text;
  private dedos = new Map<number, { x: number; y: number }>();
  constructor() { super('TesteControles'); }
  init(d: { voltar?: string }): void { this.voltarPara = d?.voltar ?? 'OpcoesControles'; this.dono = null; this.antes = {}; this.tiros = []; this.goku = null; }
  preload(): void {
    if (pedirFormas(this, ['goku-normal']) > 0) mostrarBarraDeCarregamento(this);
  }
  create(): void {
    ajustarCamera(this);
    montarTela(this, null).limpar();
    this.add.rectangle(0, 0, TELA_L, TELA_A, 0x020a1d, 0.72).setOrigin(0);
    texto(this, TELA_L / 2, 28, T('TESTE DE CONTROLES'), 18, '#fff0a6', { fontFamily: "'Trebuchet MS', sans-serif" }).setOrigin(0.5, 0.75);
    texto(this, TELA_L / 2, 44, T('Aperte teclas, botões do mouse, toque na tela ou use o controle (PAD = clique do touchpad). OPTIONS ou ESC sai.'), 10, '#94a3b8', { fontStyle: 'normal' }).setOrigin(0.5, 0.75);
    this.add.rectangle(Q.x, Q.y, Q.w, Q.h, 0x7ec8f2).setOrigin(0);
    // foto da planície no quadro da prévia (a 1ª fase)
    const chaveFundo = desenharFundo(this);
    this.children.list.filter((c) => (c as Phaser.GameObjects.Image).texture?.key === chaveFundo).forEach((c) => c.destroy());
    this.add.image(Q.x, Q.y, chaveFundo).setOrigin(0).setDisplaySize(Q.w, Q.h * 1.9).setCrop(0, 0, TELA_L * ESCALA_RENDER, TELA_A * ESCALA_RENDER * (1 / 1.9)).setDepth(1);
    criarAnimacoes(this, 'goku-normal');
    if (this.textures.exists('goku-normal')) {
      this.goku = this.add.sprite(Q.x + 90, Q.y + 110, 'goku-normal', 'idle/0').setScale(0.55).setDepth(3);
      if (this.anims.exists('goku-normal:idle')) this.goku.play('goku-normal:idle');
    }
    const g = this.add.graphics().setDepth(4);
    g.lineStyle(2, 0x7dd3fc, 1).strokeRect(Q.x, Q.y, Q.w, Q.h).fillStyle(0x020a1d, 0.7).fillRect(Q.x, Q.y, Q.w, 16);
    texto(this, Q.x + 6, Q.y + 11, T(temToque() ? 'PRÉVIA: TOQUE NO QUADRO PARA MOVER' : 'PRÉVIA: O GOKU RESPONDE AOS COMANDOS'), 9).setOrigin(0, 0.75).setDepth(5);
    this.donoTxt = texto(this, Q.x + Q.w - 6, Q.y + 11, '', 9).setOrigin(1, 0.75).setDepth(5);
    texto(this, 24, 78, T('JOGADOR 1 (TECLADO/MOUSE/CONTROLE 1/TOQUE)'), 10, '#7dd3fc').setOrigin(0, 0.75);
    texto(this, 24, 184, T('JOGADOR 2 (TECLADO/CONTROLE 2)'), 10, '#7dd3fc').setOrigin(0, 0.75);
    this.chips = this.add.graphics();
    this.textosChips = [];
    for (const [top, p] of [[78, 'p1'], [184, 'p2']] as const)
      TESTE_ACOES.forEach(([a, rot], i) => {
        const x = 24 + (i % 3) * 118, y = top + 6 + Math.floor(i / 3) * 24;
        this.textosChips.push(texto(this, x + 56, y + 14, `${T(rot)}: ${T(nomeDaTecla(opcoes().teclas[p][a]))}`.slice(0, 20), 9).setOrigin(0.5, 0.75).setDepth(2));
      });
    this.pads = this.add.graphics();
    this.padTextos = [0, 1, 2].map(() => texto(this, 0, 0, '', 8, '#94a3b8', { fontStyle: 'normal' }));
    this.padTextos[0].setFontSize(9).setColor('#7dd3fc').setFontStyle('bold');
    const baixo = (ev: KeyboardEvent) => { if (ev.code === 'Escape') { this.scene.start(this.voltarPara); return; } this.apertadas.add(ev.code); if (ev.code.startsWith('Arrow') || ev.code === 'Space') ev.preventDefault(); };
    const cima = (ev: KeyboardEvent) => this.apertadas.delete(ev.code);
    const md = (ev: MouseEvent) => this.apertadas.add(['MouseLeft', 'MouseMiddle', 'MouseRight'][ev.button] ?? '');
    const mu = (ev: MouseEvent) => this.apertadas.delete(['MouseLeft', 'MouseMiddle', 'MouseRight'][ev.button] ?? '');
    const sm = (e: Event) => e.preventDefault();
    window.addEventListener('keydown', baixo, true);
    window.addEventListener('keyup', cima, true);
    window.addEventListener('mousedown', md, true);
    window.addEventListener('mouseup', mu, true);
    window.addEventListener('contextmenu', sm, true);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.wasTouch) this.dedos.set(p.id, { x: p.worldX, y: p.worldY }); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.dedos.has(p.id)) this.dedos.set(p.id, { x: p.worldX, y: p.worldY }); });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.dedos.delete(p.id));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', baixo, true);
      window.removeEventListener('keyup', cima, true);
      window.removeEventListener('mousedown', md, true);
      window.removeEventListener('mouseup', mu, true);
      window.removeEventListener('contextmenu', sm, true);
      this.apertadas.clear();
      this.dedos.clear();
    });
    // a seta ← (no antigo é OPTIONS/ESC): aqui também um botão para quem só tem toque
    const v = botao(this, ret(20, 20, 42, 32), '←', () => this.scene.start(this.voltarPara), { cor: '#fff0a6', fonte: 18, prof: 10 });
    void v;
  }
  update(_t: number, dtMs: number): void {
    const pads = vigiarControles();
    const reais = padsConectados();
    if (pads[0]?.acoes.pause || pads[1]?.acoes.pause) { this.scene.start(this.voltarPara); return; }
    const o = opcoes();
    const ativa = (p: 'p1' | 'p2', a: AcaoTecla, pi?: ReturnType<typeof intencaoDe>) => {
      if (this.apertadas.has(o.teclas[p][a])) return true;
      if (!pi) return false;
      if (a === 'up') return pi.cima; if (a === 'down') return pi.baixo; if (a === 'left') return pi.esquerda; if (a === 'right') return pi.direita;
      return pi.acoes[a as AcaoControle] ?? false;
    };
    const a1: Record<string, boolean> = {}, a2: Record<string, boolean> = {};
    for (const [a] of TESTE_ACOES) { a1[a] = ativa('p1', a, pads[0]); a2[a] = ativa('p2', a, pads[1]); }
    // toque: dedo no quadro leva o Goku até ele
    for (const d of this.dedos.values()) {
      if (!this.goku || d.x < Q.x || d.x > Q.x + Q.w || d.y < Q.y || d.y > Q.y + Q.h) continue;
      if (d.x > this.goku.x + 8) a1.right = true; else if (d.x < this.goku.x - 8) a1.left = true;
      if (d.y > this.goku.y + 8) a1.down = true; else if (d.y < this.goku.y - 8) a1.up = true;
    }
    // chips
    this.chips.clear();
    let n = 0;
    for (const [top, acoes] of [[78, a1], [184, a2]] as const)
      TESTE_ACOES.forEach(([a], i) => {
        const x = 24 + (i % 3) * 118, y = top + 6 + Math.floor(i / 3) * 24, on = acoes[a];
        this.chips.fillStyle(on ? 0x22c55e : 0x0f172a, on ? 1 : 0.9).fillRect(x, y, 112, 20).lineStyle(1.5, on ? 0xbbf7d0 : 0x475569, 1).strokeRect(x, y, 112, 20);
        this.textosChips[n++].setColor(on ? '#052e16' : '#cbd5e1');
      });
    // quem manda: quem apertou primeiro; os dois juntos, ninguém (chooseControlsTestOwner)
    const algum = (a: Record<string, boolean>) => Object.values(a).some(Boolean);
    const u1 = algum(a1), u2 = algum(a2);
    if (u1 && u2) this.dono = this.dono ?? null; else if (u1) this.dono = 'p1'; else if (u2) this.dono = 'p2';
    this.donoTxt.setText(this.dono ? TF('NO COMANDO: JOGADOR {0}', this.dono === 'p1' ? 1 : 2) : T('AGUARDANDO')).setColor(this.dono ? '#86efac' : '#94a3b8');
    const a = this.dono === 'p1' ? a1 : this.dono === 'p2' ? a2 : {};
    const f = dtMs / (1000 / 60);
    if (this.goku) {
      const dx = (a.right ? 1 : 0) - (a.left ? 1 : 0), dy = (a.down ? 1 : 0) - (a.up ? 1 : 0);
      this.goku.x = Phaser.Math.Clamp(this.goku.x + dx * 3 * f, Q.x + 30, Q.x + Q.w - 30);
      this.goku.y = Phaser.Math.Clamp(this.goku.y + dy * 3 * f, Q.y + 50, Q.y + Q.h - 10);
      const mov = a.charge ? 'chargeKi' : a.parry ? 'parry' : a.attack ? 'attackKi' : a.special ? 'special' : dx || dy ? (dx > 0 ? 'flyRight' : dx < 0 ? 'flyLeft' : dy < 0 ? 'flyUp' : 'flyDown') : 'idle';
      const chaveAnim = this.anims.exists(`goku-normal:${mov}`) ? `goku-normal:${mov}` : 'goku-normal:idle';
      if (this.goku.anims.currentAnim?.key !== chaveAnim && this.anims.exists(chaveAnim)) this.goku.play(chaveAnim);
      if (a.attack && !this.antes.attack) this.tiros.push(this.add.circle(this.goku.x + 30, this.goku.y - 30, 6, 0xf0fbff).setStrokeStyle(4, 0x78dcff, 0.5).setDepth(3));
    }
    this.antes = { ...a };
    for (const t of this.tiros) t.x += 7 * f;
    this.tiros = this.tiros.filter((t) => { if (t.x < Q.x + Q.w) return true; t.destroy(); return false; });
    // controles conectados: analógicos e 18 botões
    const g = this.pads.clear();
    this.padTextos[0].setPosition(408, 250).setOrigin(0, 0.75).setText(reais.length ? TF('CONTROLES CONECTADOS: {0}', reais.length) : T('NENHUM CONTROLE DETECTADO — APERTE UM BOTÃO'));
    this.padTextos[1].setText(''); this.padTextos[2].setText('');
    reais.slice(0, 2).forEach((pad, k) => {
      const left = 408 + k * 188, top = 256;
      this.padTextos[k + 1].setPosition(left, top + 6).setOrigin(0, 0.75).setText(`C${k + 1}: ${String(pad.id || 'controle').slice(0, 28)}`);
      const stick = (cx: number, cy: number, ax: number, ay: number) => {
        g.lineStyle(1.5, 0x64748b, 1).strokeCircle(cx, cy, 11);
        g.fillStyle(Math.abs(ax) > 0.4 || Math.abs(ay) > 0.4 ? 0x22c55e : 0x38bdf8, 1).fillCircle(cx + Phaser.Math.Clamp(ax, -1, 1) * 8, cy + Phaser.Math.Clamp(ay, -1, 1) * 8, 3.5);
      };
      stick(left + 12, top + 24, pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      stick(left + 38, top + 24, pad.axes[2] ?? 0, pad.axes[3] ?? 0);
      for (let i = 0; i < 18; i++) {
        const b = pad.buttons[i], on = !!b && (b.pressed || b.value > 0.5);
        const bx = left + 54 + (i % 9) * 14, by = top + 11 + Math.floor(i / 9) * 15;
        g.fillStyle(on ? 0x22c55e : 0x0f172a, on ? 1 : 0.9).fillRect(bx, by, 12, 13).lineStyle(1, on ? 0xbbf7d0 : i === 17 ? 0xfbbf24 : 0x475569, 1).strokeRect(bx, by, 12, 13);
      }
    });
  }
}

export const CENAS_OPCOES = [Opcoes, OpcoesIdiomas, OpcoesAudio, OpcoesControles, OpcoesPc, OpcoesToque, EditorHud, OpcoesJoystick, TesteControles];
