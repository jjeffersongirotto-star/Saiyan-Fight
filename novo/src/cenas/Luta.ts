// Cena da luta: carrega só as formas que a luta precisa (atlas WebP), roda a lógica pura em passo fixo de 1/60 s
// e só desenha. Ao transformar, a próxima forma é pedida em segundo plano e as que não servem mais são liberadas.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import * as C from '../logica/constantes';
import { poseDoLutador } from '../logica/animacao';
import { juntarEntradas } from '../logica/entrada';
import { fichaDoPersonagem } from '../logica/ficha';
import { formaParaDesenhar, formasDaLuta, formasNecessarias } from '../logica/formas';
import { entradaDaIA, FORCA_DA_CPU } from '../logica/ia';
import { T } from '../logica/idioma';
import { criarLuta, escalaDaAltura, alturaDoNivel, maoDe, passoLuta, podeTransformar } from '../logica/luta';
import { interpolar, RelogioFixo } from '../logica/relogio';
import { ENTRADA_VAZIA, type Entrada, type EstadoLuta, type Evento, type IdJogador, type Lutador } from '../logica/tipos';
import { PERSONAGENS, formaDoNivel } from '../dados/personagens';
import { Teclado } from '../entrada/teclado';
import { mostrarBarraDeCarregamento } from '../ui/barra';
import { ControlesToque } from '../ui/controlesToque';
import { alturaDoCorpo, criarAnimacoes, liberarFormas, metaDoAtlas, pedirFormas } from '../ui/formas';
import { Hud } from '../ui/hud';
import { mostrarVersus } from '../ui/apresentacao';
import { registrarLuta } from '../logica/estatisticas';
import { desenharFundo } from './fundo';
import type { DadosDaLuta } from './Menu';
import type { DadosDaVitoria } from './Vitoria';
import { aoApertar } from '../entrada/teclas';
import { som, vibrar } from '../audio/som';
import { CHANCE_SOM_CARREGANDO, TEMA_DA_LUTA } from '../logica/musica';
import { EfeitosDaLuta, pedirEfeitos } from '../ui/efeitos';
import { faseDe, type Fase } from '../dados/fases';
import { criarHistoria, passoHistoria } from '../logica/historia';
import { DesenhoHistoria, pedirMinion } from '../ui/historia';
import type { DadosDoFimHistoria } from './FimHistoria';
import { ArenaAntiga, carregarCenarios, cenariosProntos } from '../ui/arena';
import { botao, ret, Navegacao, texto } from '../ui/telas';
import { donosDosControles, entradaDoControle, INTENCAO_VAZIA, type Intencao } from '../logica/controle';
import { intencaoDe, padsConectados, ultimaEntrada, marcarEntrada } from '../entrada/controles';
import { modoEfetivo, mudarOpcoes, opcoes } from '../logica/opcoes';

const mudarOpcoesSemPerder = () => mudarOpcoes((o) => { o.dicaTiroVista = true; });
import { conquistas, nivelLiberado, RastreioDaLuta } from '../logica/conquistas';
import { criarTreino, limitarFormas, passoTreino, nivelAntesDeTransformar, criarTutorial, passoTutorial, marcarFeito, avancarPasso, passoAtual, instrucoesDoPasso, PASSOS_DO_TUTORIAL, type EstadoTutorial } from '../logica/tutorial';
import { TF } from '../logica/idioma';
import { nomeDaTecla, NOMES_BOTOES } from '../logica/opcoes';

/** as setas do teclado na LISTA DE GOLPES (o nome comprido delas não cabe) */
const SETAS: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };

/** câmera lenta do golpe final: ~0,8 s a 30% da velocidade */
const LENTO_MS = 800, VELOCIDADE_LENTA = 0.3;

export class Luta extends Phaser.Scene {
  private dados!: DadosDaLuta;
  private estado!: EstadoLuta;
  private relogio = new RelogioFixo();
  /** tela de VERSUS na frente: a luta ainda não corre */
  private apresentando = false;
  /** v0.144: câmera lenta no golpe que fecha a rodada (ms que faltam) */
  private lentoMs = 0;
  private teclado = new Teclado();
  private toque!: ControlesToque;
  private hud!: Hud;
  private sprites!: Record<IdJogador, Phaser.GameObjects.Sprite>;
  private efeitos!: EfeitosDaLuta;
  private grafChoque!: Phaser.GameObjects.Graphics;
  private grafTela!: Phaser.GameObjects.Graphics;
  private aviso!: Phaser.GameObjects.Text;
  private textoChoque!: Phaser.GameObjects.Text;
  private flash = { cor: 0xffffff, quadros: 0, max: 1 };
  private carregandoNoFundo = false;
  private pausado = false;
  private camadaPausa: Phaser.GameObjects.Container | null = null;
  private textoChoqueAtual = '';
  /** faíscas do impacto: um emissor só (antes eram 12–20 retângulos + tweens novos a cada acerto) */
  private faiscas!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** modo história: a fase e o desenho dos minions/itens (null nos outros modos) */
  private fase: Fase | null = null;
  private historia: DesenhoHistoria | null = null;
  /** a arena do jogo antigo (null enquanto o código dela não chegou ou se a luta não tem arena) */
  private arena: ArenaAntiga | null = null;
  private idArena: string | null = null;
  /** o que vale conquista nesta luta (só o jogador 1, como no antigo) */
  private rastreio!: RastreioDaLuta;
  /** intenção do controle no passo anterior (gatilhos só no aperto novo) */
  private padAntes: Record<IdJogador, Intencao> = { p1: INTENCAO_VAZIA, p2: INTENCAO_VAZIA };
  private pausaPadAntes = false;
  private voltarPadAntes = false;
  /** MODO MOUSE: onde o ponteiro está (o lutador segue) */
  private ponteiro: { x: number; y: number } | null = null;
  /** pausa automática (trocou de app) e a contagem 3-2-1 ao voltar */
  private pausaAuto = false;
  private contagem = 0;
  private navPausa: Navegacao | null = null;
  private dicaTiro: Phaser.GameObjects.Container | null = null;
  private dicaTiroSeg = 0;
  /** TUTORIAL: o passo a passo (null nas lutas) e o balão com PULAR / VOLTAR AO MENU */
  private tutorial: EstadoTutorial | null = null;
  /** TUTORIAL LIVRE: a arena de treino sem passos (sair pela pausa) */
  private treino = false;
  private uiTutorial: { g: Phaser.GameObjects.Graphics; titulo: Phaser.GameObjects.Text; sub: Phaser.GameObjects.Text; pular: ReturnType<typeof botao>; voltar: ReturnType<typeof botao>; ki: Phaser.GameObjects.Graphics; chave: string } | null = null;
  private criarAntes = false;

  constructor() {
    super('Luta');
  }

  init(d: DadosDaLuta): void {
    this.dados = d;
    this.fase = d.modo === 'historia' ? faseDe(d.fase ?? '') : null;
    this.idArena = this.fase?.id ?? (d.modo === 'tutorial' || d.modo === 'treino' ? 'terra' : d.arena ? faseDe(d.arena).id : null);
  }

  preload(): void {
    // começo da luta: forma normal + a 1ª transformação de cada um (o resto vem durante a luta)
    const nivelP2 = this.fase?.vilao.nivel ?? 0; // na história o vilão pode começar transformado (Freeza na nave)
    const semRival = this.dados.modo === 'tutorial' || this.dados.modo === 'treino';
    const n1 = semRival ? Math.max(0, this.dados.nivel ?? 0) : 0;
    const chaves = formasNecessarias(semRival
      ? [{ personagem: this.dados.p1, nivel: n1 }, { personagem: this.dados.p1, nivel: nivelAntesDeTransformar({ nivel: n1 }) }]
      : [{ personagem: this.dados.p1, nivel: 0 }, { personagem: this.dados.p2, nivel: nivelP2 }]);
    liberarFormas(this, new Set(chaves));
    const faltam = pedirFormas(this, chaves) + (pedirEfeitos(this) ? 1 : 0) + (this.fase && pedirMinion(this, this.fase.minion) ? 1 : 0);
    if (faltam > 0) mostrarBarraDeCarregamento(this);
  }

  create(): void {
    ajustarCamera(this);
    this.apresentando = false;
    this.lentoMs = 0;
    this.arena = null;
    this.ligarArena();
    const semente = Date.now() | 0;
    this.tutorial = null;
    this.uiTutorial = null;
    this.treino = this.dados.modo === 'treino';
    if (this.dados.modo === 'tutorial') {
      const tu = criarTutorial(fichaDoPersonagem(this.dados.p1), semente, this.dados.nivel ?? 0);
      this.tutorial = tu.t;
      this.estado = tu.luta;
    } else if (this.treino) this.estado = criarTreino(fichaDoPersonagem(this.dados.p1), semente, this.dados.nivel ?? 0).luta;
    // TUTORIAL / TUTORIAL LIVRE: transformar só nas formas já feitas em luta (v0.141)
    if (this.tutorial || this.treino) limitarFormas(this.estado.p1, Math.max(this.dados.nivel ?? 0, nivelLiberado(conquistas(), this.dados.p1)));
    else this.estado = this.fase
      ? criarHistoria(fichaDoPersonagem(this.dados.p1), fichaDoPersonagem(this.dados.p2), this.fase, this.dados.modoFase ?? 'normal', semente)
      : criarLuta(fichaDoPersonagem(this.dados.p1), fichaDoPersonagem(this.dados.p2), semente);
    for (const k of formasDaLuta(this.estado)) criarAnimacoes(this, k);
    this.relogio.zerar();
    this.carregandoNoFundo = false;
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, (chave: string) => criarAnimacoes(this, chave));

    this.efeitos = new EfeitosDaLuta(this);
    this.grafChoque = this.add.graphics().setDepth(850);
    this.grafTela = this.add.graphics().setDepth(840);
    this.sprites = { p1: this.criarSprite('p1'), p2: this.criarSprite('p2') };
    this.hud = new Hud(this, this.dados.modo === 'cpu' ? ' (CPU)' : '');
    this.historia = this.fase ? new DesenhoHistoria(this, this.fase.minion) : null;
    this.aviso = this.add
      .text(C.TELA_L / 2, 130, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#ffd23a', stroke: '#8a2b00', strokeThickness: 7 }))
      .setOrigin(0.5)
      .setDepth(850);
    this.textoChoque = this.add
      .text(C.TELA_L / 2, 78, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }))
      .setOrigin(0.5)
      .setDepth(850);
    // v0.136: nada escrito no meio da tela durante a luta (só o placar das rodadas do VERSUS / 1 x CPU)
    if (this.fase) { /* história: começa direto */ }
    else if (this.tutorial) { this.hud.esconder(); this.sprites.p2.setVisible(false); }
    else if (this.treino) { this.hud.esconder(); this.sprites.p2.setVisible(false); this.criarDicaDoTreino(); }
    else if (this.dados.reinicio) this.mostrarAviso(`${T('RODADA')} 1 — ${T('LUTEM!')}`, 1200);
    else {
      // v0.144: tela de VERSUS antes da 1ª rodada (a luta só começa depois dela)
      this.apresentando = true;
      mostrarVersus(this, { id: this.dados.p1, nivel: this.estado.p1.nivel }, { id: this.dados.p2, nivel: this.estado.p2.nivel }, () => {
        this.apresentando = false;
        this.relogio.zerar();
        this.mostrarAviso(`${T('RODADA')} 1 — ${T('LUTEM!')}`, 1200);
      });
    }
    som.musica(this.fase?.musica ?? (this.idArena ? faseDe(this.idArena).musica : TEMA_DA_LUTA));

    this.toque = new ControlesToque(this);
    this.teclado.ligar();
    this.pausado = false;
    this.camadaPausa = null;
    this.pausaAuto = false;
    this.contagem = 0;
    this.navPausa = null;
    this.padAntes = { p1: INTENCAO_VAZIA, p2: INTENCAO_VAZIA };
    this.pausaPadAntes = this.voltarPadAntes = true; // o botão que abriu a luta ainda pode estar apertado
    this.ponteiro = null;
    this.rastreio = new RastreioDaLuta(conquistas(), this.dados.modo === 'treino' ? 'tutorial' : this.dados.modo);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => { if (!p.wasTouch) this.ponteiro = { x: p.worldX, y: p.worldY }; });
    // voltou das OPÇÕES (pausa → OPÇÕES): teclas, botões e HUD podem ter mudado
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.teclado.recarregar();
      this.toque.recarregar();
      this.teclado.soltar();
      if (this.pausado) { this.camadaPausa?.destroy(); this.camadaPausa = null; this.mostrarPausa(); }
    });
    this.dicaTiro = null;
    this.dicaTiroSeg = 0;
    this.textoChoqueAtual = '';
    this.criarFaiscas();
    this.criarBotaoDePausa();
    // (no tutorial o P também pausa, como no antigo)
    aoApertar(this, (c) => { if ((c === 'Escape' || (c === 'KeyP' && (this.tutorial || this.treino))) && !this.scene.isPaused()) (this.pausado ? this.continuar() : this.pausar()); });
    this.criarAntes = true;
    if (this.tutorial) this.criarBalaoDoTutorial();
    // celular: trocou de app / apagou a tela no meio da luta = pausa (na volta ninguém leva tiro sem ver)
    const aoEsconder = () => this.pausar(true);
    this.game.events.on(Phaser.Core.Events.HIDDEN, aoEsconder);
    // v0.147: o controle desconectou (bateria, cabo) no meio da luta = pausa automática
    const aoDesconectar = () => { if (!this.apresentando) this.pausar(true); };
    window.addEventListener('gamepaddisconnected', aoDesconectar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, aoEsconder);
      window.removeEventListener('gamepaddisconnected', aoDesconectar);
      this.teclado.desligar();
      this.toque.destruir();
      this.efeitos.destruir();
      this.historia?.destruir();
      this.arena?.destruir();
      this.arena = null;
      this.load.off(Phaser.Loader.Events.FILE_COMPLETE);
    });
  }

  /** arena do jogo antigo; sem ela (ou enquanto o código não chegou), o céu e o chão pintados */
  private ligarArena(): void {
    const id = this.idArena;
    const cores = id ? faseDe(id) : undefined;
    if (!id) { desenharFundo(this); return; }
    const m = cenariosProntos();
    if (m) {
      try { this.arena = new ArenaAntiga(this, id, m); return; } catch { this.arena = null; }
    }
    const fundo = desenharFundo(this, cores);
    if (!m) {
      carregarCenarios().then((mod) => {
        if (!this.sys.isActive() || this.arena) return;
        try { this.arena = new ArenaAntiga(this, id, mod); } catch { return; }
        for (const o of this.children.list) if (o instanceof Phaser.GameObjects.Image && o.texture.key === fundo) o.destroy();
      }).catch(() => undefined);
    }
  }

  private criarSprite(id: IdJogador): Phaser.GameObjects.Sprite {
    const l = this.estado[id];
    // a forma em que ele começa (o vilão da NAVE já entra na 3ª forma; a 1ª nem é carregada) — antes pedia a 0 e caía
    // na textura __MISSING até o 1º desenho (v0.156)
    const chave = formaParaDesenhar(l.personagem, l.nivel, (k) => this.textures.exists(k)) ?? '__DEFAULT';
    // desenho 96x112 com os pés na linha 103 (mesmo formato dos pacotes do jogo antigo)
    return this.add.sprite(0, 0, chave, 'idle/0').setOrigin(0.5, 103 / 112).setDepth(10);
  }

  /** intenção atual do controle de cada jogador (getGamepadAssignments: 1º controle = J1, 2º = J2) */
  private intencoes(): Record<IdJogador, Intencao> {
    const pads = padsConectados();
    const d = donosDosControles(pads, this.dados.modo === 'versus', this.toque.ativo);
    return { p1: d.p1 ? intencaoDe(d.p1) : INTENCAO_VAZIA, p2: d.p2 ? intencaoDe(d.p2) : INTENCAO_VAZIA };
  }

  private lerEntradas(): Record<IdJogador, Entrada> {
    const it = this.intencoes();
    const pad = (id: IdJogador) => { const e = entradaDoControle(it[id], this.padAntes[id]); this.padAntes[id] = it[id]; return e; };
    if (Object.values(it.p1.acoes).some(Boolean) || it.p1.ax || it.p1.ay) marcarEntrada('joystick');
    let p1 = juntarEntradas(juntarEntradas(this.teclado.ler('p1'), this.toque.ler(podeTransformar(this.estado.p1))), pad('p1'));
    // MODO MOUSE (OPÇÕES → CONTROLES PC): o lutador do J1 segue o ponteiro
    const o = opcoes();
    if (o.modoPc === 'mouse' && this.ponteiro && modoEfetivo(o, ultimaEntrada(), this.toque.ativo) === 'pc' && p1.x === 0 && p1.y === 0) p1 = { ...p1, seguir: { ...this.ponteiro } };
    const tecladoP2 = this.teclado.ler('p2');
    const padP2 = pad('p2');
    const p2 = this.dados.modo === 'cpu' ? entradaDaIA(this.estado, 'p2', { dificuldade: FORCA_DA_CPU[opcoes().dificuldadeCpu] }) : this.dados.modo === 'historia' ? ENTRADA_VAZIA : juntarEntradas(tecladoP2, padP2);
    return { p1, p2 };
  }

  private criarFaiscas(): void {
    if (!this.textures.exists('faisca-px')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false).fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
      g.generateTexture('faisca-px', 4, 4);
      g.destroy();
    }
    this.faiscas = this.add.particles(0, 0, 'faisca-px', {
      speed: { min: 28 / 0.38, max: 84 / 0.38 }, lifespan: 380, alpha: { start: 1, end: 0 }, scale: { min: 0.5, max: 1.25 },
      emitting: false,
    }).setDepth(30);
  }

  /** botão II no meio de cima (toque e mouse); ESC também pausa */
  private criarBotaoDePausa(): void {
    const x = C.TELA_L / 2, y = 18;
    const g = this.add.graphics().setDepth(880);
    g.fillStyle(0x101a33, 0.55).fillCircle(x, y, 13).lineStyle(2, 0xffd23a, 0.8).strokeCircle(x, y, 13);
    g.fillStyle(0xffffff, 0.9).fillRect(x - 5, y - 6, 3, 12).fillRect(x + 2, y - 6, 3, 12);
    const zona = this.add.zone(x, y, 44, 36).setInteractive().setDepth(881);
    zona.on('pointerup', () => (this.pausado ? this.continuar() : this.pausar()));
    zona.on('pointerdown', (p: Phaser.Input.Pointer) => p.event.stopPropagation());
  }

  /** pauseGame: congela a luta e mostra CONTINUAR / OPÇÕES / SAIR PARA MENU (auto = trocou de app) */
  private pausar(auto = false): void {
    if (this.estado.fase === 'fimPartida') return;
    if (this.tutorial && !auto) marcarFeito(this.tutorial, 'pause');
    if (this.pausado) { if (auto) { this.pausaAuto = true; this.contagem = 0; this.camadaPausa?.destroy(); this.camadaPausa = null; this.mostrarPausa(); } return; }
    this.pausado = true;
    this.pausaAuto = auto;
    this.contagem = 0;
    this.toque.soltarTudo();
    this.teclado.soltar();
    this.tweens.pauseAll();
    this.time.paused = true;
    this.mostrarPausa();
  }

  private mostrarPausa(): void {
    this.navPausa?.limpar();
    this.navPausa ??= new Navegacao(this, null);
    this.navPausa.ativa = true;
    const fundo = this.add.rectangle(C.TELA_L / 2, C.TELA_A / 2, C.TELA_L, C.TELA_A, 0x000000, 0.7).setInteractive();
    // pausa automática: tocar em qualquer lugar continua
    fundo.on('pointerup', () => { if (this.pausaAuto && this.contagem <= 0) this.continuar(); });
    const itens: Phaser.GameObjects.GameObject[] = [fundo];
    if (this.pausaAuto) {
      itens.push(texto(this, C.TELA_L / 2, 62, T('PAUSADO AUTOMATICAMENTE'), 18, '#fbbf24').setOrigin(0.5, 0.75));
      itens.push(texto(this, C.TELA_L / 2, 86, T('TOQUE OU CLIQUE EM QUALQUER LUGAR PARA CONTINUAR'), 12, '#e2e8f0', { fontStyle: 'normal' }).setOrigin(0.5, 0.75));
    }
    const b = (r: ReturnType<typeof ret>, t: string, f: () => void) => {
      const x = botao(this, r, t, f, { prof: 2001 });
      this.navPausa!.add({ ...r, acionar: x.acionar });
      itens.push(x.container);
    };
    const y0 = this.pausaAuto ? 104 : 84, passo = 44;
    b(ret(300, y0, 200, 34), 'CONTINUAR', () => this.continuar());
    b(ret(300, y0 + passo, 200, 34), 'REINICIAR', () => this.reiniciar());
    b(ret(300, y0 + passo * 2, 200, 34), 'LISTA DE GOLPES', () => this.mostrarGolpes());
    b(ret(300, y0 + passo * 3, 200, 34), 'OPÇÕES', () => this.abrirOpcoes());
    b(ret(300, y0 + passo * 4, 200, 34), 'SAIR PARA MENU', () => this.scene.start('Menu'));
    this.camadaPausa = this.add.container(0, 0, itens).setDepth(2000);
  }

  /** REINICIAR (v0.147): a mesma luta/fase do começo, sem passar por menu e seleção */
  private reiniciar(): void {
    if (this.contagem > 0) return;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.scene.restart({ ...this.dados, reinicio: true });
  }

  /** GOLPES (v0.147): o que cada botão faz, com a tecla e o botão do controle de agora */
  private mostrarGolpes(): void {
    if (this.contagem > 0) return;
    this.camadaPausa?.destroy();
    this.navPausa?.limpar();
    const o = opcoes();
    const fundo = this.add.rectangle(C.TELA_L / 2, C.TELA_A / 2, C.TELA_L, C.TELA_A, 0x000000, 0.8).setInteractive();
    const caixa = this.add.graphics().fillStyle(0x030d23, 0.96).fillRect(70, 26, 660, 296).lineStyle(2, 0xf2a900, 1).strokeRect(70, 26, 660, 296)
      .fillStyle(0xe85d04, 1).fillRect(70, 26, 7, 296);
    const itens: Phaser.GameObjects.GameObject[] = [fundo, caixa];
    itens.push(this.add.text(C.TELA_L / 2, 52, T('LISTA DE GOLPES'), estiloTexto({ fontFamily: "'Trebuchet MS', sans-serif", fontStyle: 'bold', fontSize: '20px', color: '#fff0a6' })).setOrigin(0.5));
    const col = [96, 232, 352, 452];
    ['AÇÃO', 'TECLADO', 'CONTROLE', 'O QUE FAZ'].forEach((t, i) => itens.push(texto(this, col[i], 82, T(t), 10, '#8fd3ff').setOrigin(0, 0.75)));
    const linhas: [string, string, string, string][] = [
      ['MOVER', [o.teclas.p1.up, o.teclas.p1.left, o.teclas.p1.down, o.teclas.p1.right].map((k) => SETAS[k] ?? nomeDaTecla(k)).join(' '), T('ANALÓGICO'), 'VOAR PARA QUALQUER LADO'],
      ['ATAQUE', nomeDaTecla(o.teclas.p1.attack), NOMES_BOTOES[o.controle.attack[0]] ?? '—', 'TIRO DE KI (SEGURE PARA ATIRAR SEM PARAR)'],
      ['CARREGAR', nomeDaTecla(o.teclas.p1.charge), NOMES_BOTOES[o.controle.charge[0]] ?? '—', 'SEGURE PARA ENCHER O KI'],
      ['PARRY', nomeDaTecla(o.teclas.p1.parry), NOMES_BOTOES[o.controle.parry[0]] ?? '—', 'REBATE OS TIROS NA HORA CERTA'],
      ['TRANSFORMAR', nomeDaTecla(o.teclas.p1.transform), NOMES_BOTOES[o.controle.transform[0]] ?? '—', 'PRÓXIMA FORMA: PRECISA DO KI CHEIO'],
      ['ESPECIAL', nomeDaTecla(o.teclas.p1.special), NOMES_BOTOES[o.controle.special[0]] ?? '—', 'RAIO PODEROSO: PRECISA DO KI CHEIO'],
    ];
    linhas.forEach(([a, tec, ctl, desc], i) => {
      const y = 106 + i * 30;
      itens.push(this.add.graphics().fillStyle(0xffffff, i % 2 ? 0.03 : 0.07).fillRect(84, y - 13, 632, 26));
      itens.push(texto(this, col[0], y + 4, T(a), 12, '#fff0a6').setOrigin(0, 0.75));
      for (const [t, x, w] of [[tec, col[1], 112], [ctl, col[2], 92], [T(desc), col[3], 262]] as const) {
        const tx = texto(this, x, y + 4, String(t), 10, '#e2e8f0', { fontStyle: 'normal' }).setOrigin(0, 0.75);
        if (tx.width > w) tx.setScale(w / tx.width, 1);
        itens.push(tx);
      }
    });
    const nav = this.navPausa!;
    const v = botao(this, ret(330, 282, 140, 30), 'VOLTAR', () => { this.camadaPausa?.destroy(); this.camadaPausa = null; this.mostrarPausa(); }, { prof: 2001 });
    nav.add({ ...v.r, acionar: v.acionar });
    itens.push(v.container);
    this.camadaPausa = this.add.container(0, 0, itens).setDepth(2000);
  }

  private abrirOpcoes(): void {
    if (this.contagem > 0) return;
    this.navPausa!.ativa = false;
    this.scene.launch('Opcoes', { voltar: 'Luta' });
    this.scene.pause();
  }

  /** requestResume: no celular e depois da pausa automática conta 3-2-1 (dá tempo de pôr os dedos) */
  private continuar(): void {
    if (!this.pausado || this.contagem > 0) return;
    if (this.pausaAuto || this.toque.ativo) {
      this.contagem = 3;
      this.camadaPausa?.destroy();
      const fundo = this.add.rectangle(C.TELA_L / 2, C.TELA_A / 2, C.TELA_L, C.TELA_A, 0x000000, 0.7).setInteractive();
      const n = this.add.text(C.TELA_L / 2, 190, '3', estiloTexto({ fontFamily: "'Courier New', monospace", fontStyle: 'bold', fontSize: '72px', color: '#fff0a6' })).setOrigin(0.5, 0.75);
      const t = texto(this, C.TELA_L / 2, 225, T('PREPARE-SE...'), 14, '#e2e8f0').setOrigin(0.5, 0.75);
      this.camadaPausa = this.add.container(0, 0, [fundo, n, t]).setDepth(2000);
      this.camadaPausa.setData('n', n);
      this.navPausa?.limpar();
      return;
    }
    this.retomar();
  }

  private retomar(): void {
    this.pausado = false;
    this.pausaAuto = false;
    this.contagem = 0;
    this.camadaPausa?.destroy();
    this.camadaPausa = null;
    this.navPausa?.limpar();
    if (this.navPausa) this.navPausa.ativa = false;
    this.tweens.resumeAll();
    this.time.paused = false;
    this.relogio.zerar();
    // apertos feitos durante a pausa não valem
    this.teclado.ler('p1');
    this.teclado.ler('p2');
    this.toque.soltarTudo();
    this.padAntes = this.intencoes();
  }

  /** pausa pelo controle (OPTIONS) e BOLA continua; durante a contagem só o relógio anda */
  private vigiarPausa(dt: number): void {
    const it = this.intencoes();
    const pausa = it.p1.acoes.pause || it.p2.acoes.pause, voltar = it.p1.voltar || it.p2.voltar;
    if (pausa && !this.pausaPadAntes) { if (this.pausado) this.continuar(); else this.pausar(); }
    else if (this.pausado && voltar && !this.voltarPadAntes && this.navPausa?.ativa) this.continuar();
    this.pausaPadAntes = pausa;
    this.voltarPadAntes = voltar;
    if (this.contagem > 0) {
      this.contagem -= dt / 1000;
      const n = this.camadaPausa?.getData('n') as Phaser.GameObjects.Text | undefined;
      if (this.contagem <= 0) this.retomar();
      else n?.setText(String(Math.ceil(this.contagem)));
    }
  }

  /** drawAutofireHint: "APOIE O DEDO NO ANALÓGICO PARA ATIRAR SEM PARAR" (some depois de 2 s segurando ou 10 s) */
  private dicaDoTiroContinuo(dt: number): void {
    const o = opcoes();
    if (o.dicaTiroVista || !o.tiroContinuo || !this.toque.ativo || this.estado.fase === 'fimPartida') { this.dicaTiro?.setVisible(false); return; }
    this.dicaTiroSeg += dt;
    if (this.toque.seguradoSeg >= 2 || this.dicaTiroSeg >= 10) {
      mudarOpcoesSemPerder();
      this.dicaTiro?.destroy();
      this.dicaTiro = null;
      return;
    }
    if (!this.dicaTiro) {
      const g = this.add.graphics().fillStyle(0x030d23, 0.85).fillRect(180, 294, 330, 44).lineStyle(2, 0xffd23f, 1).strokeRect(180, 294, 330, 44);
      const alvo = o.modoToque === 'swipe' ? 'NA TELA' : 'NO ANALÓGICO';
      const t1 = texto(this, 345, 312, T(`APOIE O DEDO ${alvo}`), 12, '#fff0a6').setOrigin(0.5, 0.75);
      const t2 = texto(this, 345, 328, T('PARA ATIRAR SEM PARAR'), 12, '#fff0a6').setOrigin(0.5, 0.75);
      this.dicaTiro = this.add.container(0, 0, [g, t1, t2]).setDepth(870);
    }
    this.dicaTiro.setVisible(true).setAlpha(0.75 + Math.sin(this.dicaTiroSeg * 5) * 0.25);
  }

  update(_t: number, dt: number): void {
    if (this.apresentando) { this.desenhar(this.relogio.alfa, dt / 1000); return; }
    this.vigiarPausa(dt);
    if (this.pausado) return;
    this.dicaDoTiroContinuo(dt / 1000);
    const lento = this.lentoMs > 0;
    if (lento) this.lentoMs -= dt;
    const passos = this.relogio.avancar(lento ? dt * VELOCIDADE_LENTA : dt);
    for (let i = 0; i < passos; i++) {
      const entradas = this.lerEntradas();
      const eventos = this.tutorial ? passoTutorial(this.estado, this.tutorial, entradas.p1)
        : this.treino ? passoTreino(this.estado, entradas.p1)
        : this.estado.historia ? passoHistoria(this.estado, entradas.p1) : passoLuta(this.estado, entradas);
      this.efeitos.passo();
      if (!this.tutorial && !this.treino) this.rastreio.passo(this.estado, eventos); // treino não vale conquista
      for (const ev of eventos) this.aoEvento(ev);
      // carregando ki: o "zumbido" do jogo antigo (charge em ~20% dos quadros)
      for (const id of ['p1', 'p2'] as const) if (this.estado[id].acao === 'carregando' && Math.random() < CHANCE_SOM_CARREGANDO) som.tocar('charge');
      if (this.estado.fase === 'fimPartida') return;
    }
    this.cuidarDasFormas();
    this.desenhar(this.relogio.alfa, dt / 1000);
    if (this.tutorial) this.atualizarBalaoDoTutorial();
  }

  /** TUTORIAL LIVRE: só um aviso de como sair e a barra de ki (para ver quando dá para transformar/especial) */
  private kiTreino: Phaser.GameObjects.Graphics | null = null;
  private criarDicaDoTreino(): void {
    this.add.text(C.TELA_L / 2, C.TELA_A - 8, T('TESTE OS BOTÕES À VONTADE. PARA SAIR: PAUSA → SAIR PARA MENU'),
      estiloTexto({ fontFamily: 'Arial', fontSize: '11px', color: '#fff0a6', stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5, 1).setDepth(850);
    this.kiTreino = this.add.graphics().setDepth(850);
  }
  private desenharKiDoTreino(e: EstadoLuta): void {
    const g = this.kiTreino;
    if (!g) return;
    const w = 160, x = 60, y = 14, k = Math.max(0, Math.min(1, e.p1.ki / C.KI_MAX));
    g.clear().fillStyle(0x000000, 0.55).fillRoundedRect(x - 2, y - 2, w + 4, 12, 4).fillStyle(k >= 1 ? 0xffd23a : 0x3fa9ff, 1).fillRoundedRect(x, y, Math.max(2, w * k), 8, 3);
  }

  /** getTutorialUiLayout / drawTutorialScreen: balão abaixo do ícone de pausa, PULAR à esquerda, barra de ki */
  private criarBalaoDoTutorial(): void {
    const g = this.add.graphics().setDepth(860);
    const titulo = this.add.text(C.TELA_L / 2, 52, '', estiloTexto({ fontFamily: "'Trebuchet MS', sans-serif", fontStyle: 'bold', fontSize: '10px', color: '#ffd23f' })).setOrigin(0.5, 0.75).setDepth(861);
    const sub = this.add.text(C.TELA_L / 2, 66, '', estiloTexto({ fontFamily: "'Trebuchet MS', sans-serif", fontSize: '9px', color: '#dbe6ff' })).setOrigin(0.5, 0.75).setDepth(861);
    const pular = botao(this, ret(6, 51, 50, 16), 'PULAR', () => this.pularPasso(), { cor: '#93c5fd', fonte: 8, prof: 862 });
    const voltar = botao(this, ret(C.TELA_L / 2 - 70, 70, 140, 18), 'VOLTAR AO MENU', () => this.scene.start('Menu'), { cor: '#86efac', fonte: 9, prof: 862 });
    const ki = this.add.graphics().setDepth(860);
    this.uiTutorial = { g, titulo, sub, pular, voltar, ki, chave: '' };
  }

  private pularPasso(): void {
    if (!this.tutorial || this.pausado) return;
    if (this.tutorial.fase === 'fim') { this.scene.start('Menu'); return; }
    avancarPasso(this.estado, this.tutorial);
  }

  private atualizarBalaoDoTutorial(): void {
    const t = this.tutorial!, u = this.uiTutorial!;
    // CRIAR (botão 8 do controle) pula o passo / volta ao menu no fim
    const criar = padsConectados().some((p) => p.buttons[8]?.pressed);
    if (criar && !this.criarAntes && !this.pausado) this.pularPasso();
    this.criarAntes = criar;
    if (!this.tutorial) return;
    const s = passoAtual(t);
    const fim = t.fase === 'fim';
    const titulo = fim ? T('TUTORIAL CONCLUÍDO! VOCÊ JÁ SABE TODOS OS COMANDOS.') : s ? TF('PASSO {0}/{1}: {2}', t.passo + 1, PASSOS_DO_TUTORIAL.length, T(s.titulo)) : '';
    let sub = '';
    if (!fim && s) {
      if (t.fase === 'efeito') sub = T('MUITO BEM! ISSO MESMO.');
      else {
        const o = opcoes();
        const pl = modoEfetivo(o, ultimaEntrada(), this.toque.ativo);
        const tk = o.teclas.p1, bt = (a: keyof typeof o.controle) => NOMES_BOTOES[o.controle[a][0]] ?? '?';
        const linha = instrucoesDoPasso(s.chave, {
          plataforma: pl, modoToque: o.modoToque, duploToqueParry: o.duploToqueParry, tiroContinuo: o.tiroContinuo,
          teclas: { up: nomeDaTecla(tk.up), left: nomeDaTecla(tk.left), down: nomeDaTecla(tk.down), right: nomeDaTecla(tk.right), attack: nomeDaTecla(tk.attack), charge: nomeDaTecla(tk.charge), parry: nomeDaTecla(tk.parry), transform: nomeDaTecla(tk.transform), special: nomeDaTecla(tk.special) },
          botoes: { attack: bt('attack'), charge: bt('charge'), parry: bt('parry'), transform: bt('transform'), special: bt('special'), pause: bt('pause') },
        })[0];
        if (linha) sub = TF(linha[0], ...linha.slice(1).map((v) => T(v)));
      }
    }
    const chave = `${titulo}|${sub}|${t.fase}`;
    if (chave !== u.chave) {
      u.chave = chave;
      u.titulo.setText(titulo).setColor(t.fase === 'efeito' ? '#86efac' : '#ffd23f');
      u.sub.setText(sub).setColor(t.fase === 'efeito' ? '#eafff0' : '#dbe6ff');
      const w = Math.min(C.TELA_L - 24, Math.max(u.titulo.width, sub ? u.sub.width : 0) + 28), h = sub ? 38 : 24, x = (C.TELA_L - w) / 2, y = 40;
      u.g.clear().fillStyle(0x040814, 0.88).fillRoundedRect(x, y, w, h, 8).lineStyle(1.5, t.fase === 'efeito' ? 0x4ade80 : 0x3a5a8a, 1).strokeRoundedRect(x, y, w, h, 8);
      u.titulo.setY(y + 12);
      u.sub.setY(y + 26).setVisible(!!sub);
      u.pular.container.setVisible(!fim).setY(y + h / 2 - 8);
      u.voltar.container.setVisible(fim).setY(y + h + 6);
    }
    // barra de ki embaixo à esquerda (amarela quando dá para soltar o especial)
    const p = this.estado.p1;
    u.ki.clear().fillStyle(0x222244, 1).fillRect(14, C.TELA_A - 20, 120, 7)
      .fillStyle(p.ki >= C.KI_MAX ? 0xffd23f : 0x00ffff, 1).fillRect(14, C.TELA_A - 20, (p.ki / C.KI_MAX) * 120, 7)
      .lineStyle(1, 0xffffff, 1).strokeRect(14, C.TELA_A - 20, 120, 7);
  }

  /** Mantém carregadas a forma atual + a próxima de cada um; libera as outras quando nada está baixando. */
  private cuidarDasFormas(): void {
    const precisa = formasDaLuta(this.estado);
    if (this.load.isLoading()) return;
    if (pedirFormas(this, precisa) > 0) {
      this.carregandoNoFundo = true;
      this.load.start();
      return;
    }
    if (this.carregandoNoFundo || this.estado.quadro % 120 === 0) {
      this.carregandoNoFundo = false;
      // não solta a forma que ainda aparece na tela (a nova pode ter acabado de chegar)
      const naTela = new Set(precisa);
      for (const id of ['p1', 'p2'] as const) naTela.add(this.sprites[id].texture.key);
      liberarFormas(this, naTela);
    }
  }

  private aoEvento(ev: Evento): void {
    this.somDoEvento(ev);
    switch (ev.tipo) {
      case 'acerto': {
        const s = this.sprites[ev.alvo];
        s.setTintFill(0xffffff);
        this.time.delayedCall(70, () => s.clearTint());
        this.tremer(ev.deEspecial ? 260 : 80, ev.deEspecial ? 0.012 : 0.004);
        const alvo = this.estado[ev.alvo];
        this.particulas(alvo.x, alvo.y - alvo.a * 0.1, ev.deEspecial ? 0xffd34d : 0xffff00, ev.deEspecial ? 20 : 12);
        break;
      }
      case 'parry':
        this.efeitos.lutador[ev.dono].parry();
        if (ev.refletidos > 0) {
          const c = this.estado[ev.dono];
          this.faisca(c.x + c.olhando * 20, c.y - c.a * 0.3, 0x7fe9ff, 4);
          this.tremer(100, 0.004);
        }
        break;
      case 'transformou': {
        this.piscarTela(0xfff3b0, 18);
        this.tremer(400, 0.01);
        break;
      }
      case 'zenkai':
        this.efeitos.lutador[ev.dono].escudoLigado = true;
        this.piscarTela(0xffe45a, 30);
        this.tremer(400, 0.014);
        break;
      case 'especial':
        this.tremer(500, 0.006);
        break;
      case 'choque':
        this.piscarTela(0xffffff, 18);
        this.tremer(300, 0.01);
        break;
      case 'fimChoque':
        this.piscarTela(0xffffff, 22);
        this.tremer(400, 0.016);
        break;
      case 'fimRodada': {
        const v = ev.vencedor;
        if (v) { this.lentoMs = LENTO_MS; this.piscarTela(0xffffff, 10); }
        if (this.estado.historia) break; // a tela FimHistoria já mostra o resultado
        this.mostrarAviso(v ? `${PERSONAGENS[this.estado[v].personagem].nome} ${T('VENCEU')}!` : T('EMPATE'), 2200);
        break;
      }
      case 'novaRodada':
        this.mostrarAviso(`${T('RODADA')} ${ev.rodada} — ${T('LUTEM!')}`, 1200);
        break;
      case 'fimPartida': {
        const venc = this.estado[ev.vencedor];
        const h = this.estado.historia;
        // v0.147: lutas/vitórias de cada personagem (o J1; no VERSUS também o J2)
        if (!this.tutorial && !this.treino) {
          registrarLuta(this.estado.p1.personagem, h ? h.resultado === 'vitoria' : ev.vencedor === 'p1');
          if (this.dados.modo === 'versus') registrarLuta(this.estado.p2.personagem, ev.vencedor === 'p2');
        }
        if (h) {
          const heroi = this.estado.p1;
          this.time.delayedCall(200, () =>
            this.scene.start('FimHistoria', {
              luta: this.dados, resultado: h.resultado ?? 'derrota', pontos: h.pontos, onda: h.onda, passo: h.passo, stats: h.stats,
              segundos: Math.round(this.estado.quadro / 60), atlas: this.sprites.p1.texture.key, altura: alturaDoNivel(heroi, heroi.nivel),
            } satisfies DadosDoFimHistoria),
          );
          break;
        }
        this.time.delayedCall(200, () =>
          this.scene.start('Vitoria', {
            luta: this.dados, vencedor: ev.vencedor, placar: this.estado.placar, atlas: this.sprites[ev.vencedor].texture.key, altura: alturaDoNivel(venc, venc.nivel),
          } satisfies DadosDaVitoria),
        );
        break;
      }
      // ---- modo história ----
      case 'minionExplodiu':
        this.historia?.explodir(ev.x, ev.y);
        this.tremer(ev.machucou ? 220 : 120, ev.machucou ? 0.01 : 0.005);
        break;
      case 'minionAcertado':
        this.particulas(ev.x, ev.y, 0x9dff6a, ev.morreu ? 14 : 6);
        if (ev.morreu) this.historia?.explodir(ev.x, ev.y);
        break;
      case 'minionAgarrou':
        break;
      case 'item':
        this.particulas(ev.x, ev.y, 0xfff3b0, 12);
        break;
      case 'escudo':
        this.faisca(this.estado[ev.dono].x, this.estado[ev.dono].y, 0x7fe9ff, 4);
        break;
      case 'vilaoCaiu':
        this.piscarTela(0xffffff, 16);
        this.tremer(350, 0.012);
        break;
      case 'novaOnda':
        break;
      default:
        break;
    }
  }

  /** sons e vibração de cada acontecimento (os mesmos playSound/vibrate do jogo antigo) */
  private somDoEvento(ev: Evento): void {
    const meu = (id: IdJogador) => id === 'p1' || this.dados.modo === 'versus';
    switch (ev.tipo) {
      case 'tiro': som.tocar('shoot'); break;
      case 'apertoChoque': som.tocar('shoot'); break;
      case 'acerto': som.tocar('hit'); if (meu(ev.alvo)) vibrar(140); break; // o herói antigo vibrava 140 ms ao apanhar; agora qualquer humano
      case 'parry':
        if (ev.refletidos > 0) { som.tocar('reflect'); if (meu(ev.dono)) vibrar(45); }
        break;
      case 'especial': som.tocar('super'); if (meu(ev.dono)) vibrar([80, 40, 160]); break;
      case 'choque': som.tocar('super'); break;
      case 'fimChoque': som.tocar('hit'); break;
      case 'transformou': som.tocar('transform'); if (meu(ev.dono)) vibrar([60, 40, 120]); break;
      case 'kiCheio': som.tocar('max_ki'); break;
      case 'zenkai': som.tocar('powerup'); vibrar([60, 30, 60, 30, 160]); break;
      case 'novaRodada': som.tocar('powerup'); break;
      case 'item': som.tocar('powerup'); vibrar(40); break;
      case 'escudo': som.tocar('reflect'); break;
      case 'minionAgarrou': vibrar([40, 30, 40]); break;
      case 'minionExplodiu': som.tocar('hit'); if (ev.machucou) vibrar(140); break;
      case 'minionAcertado': if (ev.morreu) som.tocar('hit'); break;
      case 'vilaoCaiu': som.tocar('super'); break;
      case 'novaOnda': som.tocar('powerup'); break;
      default: break;
    }
  }

  /** tremor da tela (OPÇÕES → JOGO → TREMOR E CLARÕES pode desligar, v0.147) */
  private tremer(ms: number, forca: number): void {
    if (opcoes().tremor) this.cameras.main.shake(ms, forca);
  }

  private piscarTela(cor: number, quadros: number): void {
    if (!opcoes().tremor) return;
    this.flash = { cor, quadros, max: quadros };
  }

  private faisca(x: number, y: number, cor = 0xfff2a8, tamanho = 3): void {
    const c = this.add.circle(x, y, 10, cor, 0.9).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, scale: tamanho, alpha: 0, duration: 220, onComplete: () => c.destroy() });
  }

  /** faíscas do impacto (createImpactParticles): voam para todo lado e somem */
  private particulas(x: number, y: number, cor: number, n: number): void {
    this.faiscas.setParticleTint(cor);
    this.faiscas.explode(n, x, y);
  }

  private mostrarAviso(texto: string, ms: number, tamanho = 34): void {
    this.aviso.setText(texto).setFontSize(tamanho).setAlpha(1).setScale(0.6);
    this.tweens.killTweensOf(this.aviso);
    this.tweens.add({ targets: this.aviso, scale: 1, duration: 180, ease: 'Back.Out' });
    this.tweens.add({ targets: this.aviso, alpha: 0, delay: ms, duration: 300 });
  }

  /** Onde a mão do desenho está agora (ponto "mao" do pacote, fração do quadro 96x112), espelhada se preciso. */
  private maoNaTela(l: Lutador): { x: number; y: number } {
    const s = this.sprites[l.id];
    const meta = metaDoAtlas(this, s.texture.key);
    const ponto = (l.especialLento ? meta.dedo : null) ?? meta.mao;
    if (!ponto) return maoDe(l);
    const k = escalaDaAltura(alturaDoNivel(l, l.nivel));
    const fx = l.olhando === 1 ? ponto[0] : 1 - ponto[0];
    return { x: s.x + (fx - 0.5) * 96 * k, y: s.y + (ponto[1] - 103 / 112) * 112 * k };
  }

  private desenharLutador(l: Lutador, alfa: number): void {
    const s = this.sprites[l.id];
    const chave = formaParaDesenhar(l.personagem, l.nivel, (k) => this.textures.exists(k) && this.anims.exists(`${k}:idle`));
    if (!chave) return;
    // v0.157: a rede de segurança (app/erros.ts) esconde o sprite que ficou com a imagem apagada; recarregada, ele volta
    if (!s.visible) { s.setVisible(true); if (s.texture.key !== chave) s.play(`${chave}:idle`); }
    const meta = metaDoAtlas(this, chave);
    const k = escalaDaAltura(alturaDoNivel(l, l.nivel));
    s.setScale(k / meta.escala);
    s.setPosition(interpolar(l.xAnt, l.x, alfa), interpolar(l.yAnt, l.y, alfa) + l.a / 2);
    const pose = poseDoLutador(l);
    s.setFlipX(pose.espelhar);
    const anim = `${chave}:${pose.movimento}`;
    let animFinal = this.anims.exists(anim) ? anim : `${chave}:${pose.movimento === 'special' ? 'attackKi' : 'idle'}`;
    // golpe de ki (v0.142): o movimento vai até o fim mesmo depois da pose curta do tiro, e apertando de novo ele
    // continua/recomeça em vez de voltar sempre ao 1º quadro (antes ficava travado no começo do golpe)
    const golpe = `${chave}:attackKi`, atual = s.anims.currentAnim?.key;
    const solto = l.acao === 'livre' && l.poseAtingido <= 0 && !l.emEspecial && l.poseParry <= 0;
    if (solto && atual === golpe && s.anims.isPlaying && this.anims.exists(golpe)) animFinal = golpe;
    if (atual !== animFinal) {
      // v0.155: o especial chega no último quadro (braço estendido) quando o raio sai (ESPECIAL_PREPARO); o sol não
      const n = this.anims.get(animFinal)?.frames.length ?? 0;
      if (pose.movimento === 'special' && !l.especialLento && n > 1 && this.estado.regras.danoDoEspecialNaChegada) s.play({ key: animFinal, frameRate: ((n - 1) * 60) / C.ESPECIAL_PREPARO });
      else s.play(animFinal);
    }
    else if (pose.movimento === 'attackKi' && !s.anims.isPlaying) s.play(animFinal);
    // pisca só quando foi atingido: a proteção do começo de cada rodada (INVULNERAVEL_INICIO) não pisca (v0.139)
    const pisca = l.invulneravel > 0 && this.estado.faseQuadros > C.INVULNERAVEL_INICIO && Math.floor(l.invulneravel / 4) % 2 === 0;
    s.setAlpha(pisca && l.acao !== 'caido' ? 0.45 : 1);
    // tom da forma (Goku normal levemente vermelho, Kaioken); o clarão branco do golpe tem prioridade
    const tom = formaDoNivel(l.personagem, l.nivel)?.tom;
    if (!s.tintFill) { if (tom) s.setTint(tom); else if (s.isTinted) s.clearTint(); } // v0.148: quem cai não fica mais translúcido (sai voando)
    this.efeitos.lutador[l.id].desenhar(l, { x: s.x, y: s.y }, k, this.estado.quadro / 60, this.dtSeg, alturaDoCorpo(s));
  }

  private dtSeg = 1 / 60;

  private desenhar(alfa: number, dtSeg: number): void {
    const e = this.estado;
    this.dtSeg = Math.min(0.1, dtSeg);
    this.desenharLutador(e.p1, alfa);
    if (!this.tutorial && !this.treino) this.desenharLutador(e.p2, alfa);

    this.arena?.desenhar(e.quadro);
    const relogio = e.quadro / 60;
    this.efeitos.desenharTiros(e, relogio);
    this.efeitos.desenharRaios(e, (l) => this.maoNaTela(l), relogio);
    this.desenharPlacarDoChoque();

    const tela = this.grafTela.clear();
    if (this.flash.quadros > 0) {
      tela.fillStyle(this.flash.cor, 0.6 * (this.flash.quadros / this.flash.max)).fillRect(0, 0, C.TELA_L, C.TELA_A);
      this.flash.quadros--;
    }

    this.historia?.desenhar(e, this.dtSeg);
    if (!this.tutorial && !this.treino) this.hud.desenhar(e);
    else if (this.treino) this.desenharKiDoTreino(e);
    this.toque.desenhar(e.p1.ki >= C.KI_MAX, podeTransformar(e.p1), this.dtSeg);
  }

  /** placar de apertos do choque + tempo que falta (para deixar claro que é para apertar ATAQUE sem parar) */
  private desenharPlacarDoChoque(): void {
    const g = this.grafChoque.clear();
    const ch = this.estado.choque;
    // setText redesenha a textura do texto: só quando muda (antes era a cada quadro)
    const texto = ch ? `${ch.apertos.p1}   ${T('CHOQUE! APERTE ATAQUE!')}   ${ch.apertos.p2}` : '';
    if (texto !== this.textoChoqueAtual) { this.textoChoque.setText(texto); this.textoChoqueAtual = texto; }
    if (!ch) return;
    const w = 160, x = C.TELA_L / 2 - w / 2, y = 94;
    g.fillStyle(0xffffff, 0.9).fillRect(x, y, w, 6);
    g.fillStyle(0xfff3b0, 1).fillRect(x, y, w * Math.max(0, 1 - ch.idade / C.CHOQUE_DURACAO), 6);
    g.fillStyle(0x00ffff, 1).fillRect(x - 8, y - 1, 6, 8);
    g.fillStyle(0xff0055, 1).fillRect(x + w + 2, y - 1, 6, 8);
  }
}
