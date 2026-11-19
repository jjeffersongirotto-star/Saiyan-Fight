// MENU PRINCIPAL. v0.143: à esquerda um lutador grande com aura (sorteado entre as formas já liberadas, troca a
// cada ~9 s; tocar nele solta um golpe), à direita SAIYAN FIGHT e as LÂMINAS (JOGAR maior, PERSONAGENS, ARENAS,
// TUTORIAL, TUTORIAL LIVRE) e embaixo os botões redondos RANKING, CONQUISTAS e OPÇÕES. A esfera de 4 estrelas no
// canto abre o menu de ajustes (perfil com APELIDO, EDITORES, UPDATES); tela cheia no canto direito.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { som } from '../audio/som';
import { botao, botaoIcone, botaoLamina, dentro, montarTela, ret, type BotaoTela, type Navegacao } from '../ui/telas';
import { ORDEM_PERSONAGENS, PERSONAGENS, chaveDoAtlas } from '../dados/personagens';
import { nivelLiberado } from '../logica/conquistas';
import { escalaDaAltura } from '../logica/luta';
import { PALETAS_AURA, auraDoLutador } from '../logica/efeitos';
import type { Lutador } from '../logica/tipos';
import { alturaDoCorpo, criarAnimacoes, liberarFormas, metaDoAtlas, pedirFormas } from '../ui/formas';
import { EfeitosDoLutador, pedirEfeitos } from '../ui/efeitos';
import { enfeitesLigados } from '../ui/transicao';
import { esferaDoDragao, fotoDoPerfil } from '../ui/esfera';
import { conquistas, APELIDO_MAX } from '../logica/conquistas';
import { pedirTexto } from '../ui/janela';
import { avisarQueOJogoAbriu, infoVersao } from '../app/plataforma';
import { aoMudarAviso, temVersaoNova, verificarAtualizacao } from '../app/aviso';
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
  /** REINICIAR da pausa (v0.147): recomeça sem a tela de VERSUS */
  reinicio?: boolean;
}

/** lâminas em diagonal (cada fileira um pouco à esquerda, seguindo a inclinação) */
const lamina = (y: number, h = 30, w = 290) => ret(Math.round(470 - (y - 84) * 0.42), y, w, h);
const L = {
  play: lamina(84, 46, 300), characters: lamina(140), stages: lamina(176), tutorial: lamina(212), livre: lamina(248),
  esfera: ret(12, 12, 40, 40),
};
/** botões redondos de baixo */
const ICONES_Y = 306;
/** pés do lutador da vitrine */
const VITRINE = { x: 205, y: 322, k: 2 };
const TROCA_MS = 9000;

/** quem está na vitrine (fica o mesmo quando a cena reinicia, ex.: ao fechar a esfera) */
let vitrineAtual: { id: string; nivel: number } | null = null;
/** um personagem (diferente do atual) numa forma já liberada */
function sortearLutador(fora?: string): { id: string; nivel: number } {
  const ids = ORDEM_PERSONAGENS.filter((id) => id !== fora && !PERSONAGENS[id].criado);
  const id = ids[Math.floor(Math.random() * ids.length)] ?? ORDEM_PERSONAGENS[0];
  return { id, nivel: Math.floor(Math.random() * (nivelLiberado(conquistas(), id) + 1)) };
}
/** pontinho de luz das faíscas (uma textura só) */
function faisca(cena: Phaser.Scene): string {
  if (!cena.textures.exists('faisca')) {
    const g = cena.make.graphics({}, false);
    g.fillStyle(0xffffff, 0.35).fillCircle(8, 8, 8).fillStyle(0xffffff, 1).fillCircle(8, 8, 3.5);
    g.generateTexture('faisca', 16, 16);
    g.destroy();
  }
  return 'faisca';
}
const E = { x: 12, y: 58, w: 216 };

/** bolinha vermelha com "!" (aviso de versão nova) */
function bolinhaDeAviso(cena: Phaser.Scene, x: number, y: number, r: number): Phaser.GameObjects.Container {
  const c = cena.add.circle(0, 0, r, 0xef4444).setStrokeStyle(1.5, 0xffffff);
  const t = cena.add.text(0, 0.5, '!', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: `${r * 1.6}px`, color: '#ffffff' })).setOrigin(0.5);
  return cena.add.container(x, y, [c, t]).setDepth(6);
}

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
    this.titulo();
    const b = (r: typeof L.play, t: string, f: () => void, destaque = false) => botaoLamina(this, this.nav, r, t, f, { destaque });
    b(L.play, 'JOGAR', () => this.scene.start('ModoJogo'), true);
    b(L.characters, 'PERSONAGENS', () => this.scene.start('Personagens'));
    b(L.stages, 'ARENAS', () => this.scene.start('ConfigArenas'));
    // TUTORIAL e TUTORIAL LIVRE: antes escolhe o personagem e a forma (Selecao)
    b(L.tutorial, 'TUTORIAL', () => this.scene.start('Selecao', { modo: 'tutorial' }));
    b(L.livre, 'TUTORIAL LIVRE', () => this.scene.start('Selecao', { modo: 'treino' }));
    botaoIcone(this, this.nav, 470, ICONES_Y, 16, 'trofeu', 'RANKING', () => this.scene.start('Ranking'));
    botaoIcone(this, this.nav, 545, ICONES_Y, 16, 'medalha', 'CONQUISTAS', () => this.scene.start('Conquistas'));
    botaoIcone(this, this.nav, 620, ICONES_Y, 16, 'engrenagem', 'OPÇÕES', () => this.scene.start('Opcoes', { voltar: 'Menu' }));
    this.montarVitrine();
    this.add.text(TELA_L - 6, TELA_A - 4, `v${infoVersao().jogo}`, estiloTexto({ fontFamily: 'Arial', fontSize: '10px', color: '#94a3b8' })).setOrigin(1, 1);

    // esfera de 4 estrelas
    const esf = this.add.image(L.esfera.x + 20, L.esfera.y + 20, esferaDoDragao(this)).setDisplaySize(40, 40).setInteractive({ useHandCursor: true });
    esf.on('pointerup', () => { som.tocar('menu'); this.alternarEsfera(); });
    this.nav.add({ ...L.esfera, acionar: () => this.alternarEsfera() });
    // aviso de versão nova: bolinha vermelha na esfera (confere em silêncio, no máximo a cada 10 min)
    const selo = bolinhaDeAviso(this, L.esfera.x + 36, L.esfera.y + 5, 5).setVisible(temVersaoNova());
    const parar = aoMudarAviso((n) => { if (selo.active) selo.setVisible(n); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, parar);
    verificarAtualizacao();
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

  private titulo(): void {
    const t = this.add.text(608, 40, 'SAIYAN FIGHT', estiloTexto({ fontFamily: "'Trebuchet MS', Arial, sans-serif", fontStyle: 'bold italic', fontSize: '34px', color: '#ffd23f' })).setOrigin(0.5);
    t.setStroke('#7c2d12', 7).setShadow(2, 3, '#000000', 4, true, true);
    // brilho de cima para baixo nas letras (amarelo claro → laranja)
    const grad = t.context.createLinearGradient(0, 0, 0, t.height);
    grad.addColorStop(0.15, '#fff7c2'); grad.addColorStop(0.55, '#ffd23f'); grad.addColorStop(0.95, '#ff8a00');
    t.setFill(grad);
    this.add.text(608, 66, T('A BATALHA COMEÇA AGORA'), estiloTexto({ fontFamily: "'Trebuchet MS', Arial, sans-serif", fontStyle: 'bold', fontSize: '10px', color: '#8fd3ff' })).setOrigin(0.5).setStroke('#020617', 3);
  }

  // ---------- vitrine: lutador grande com aura ----------
  private vitrine: { sprite: Phaser.GameObjects.Sprite; efeitos: EfeitosDoLutador; l: Lutador; k: number; chao: Phaser.GameObjects.Graphics; faiscas?: Phaser.GameObjects.Particles.ParticleEmitter } | null = null;

  /** a cena saiu (o carregamento da vitrine pode terminar depois) */
  private fechada = false;

  private montarVitrine(): void {
    this.vitrine = null;
    this.fechada = false;
    this.mostrarLutador(vitrineAtual ?? sortearLutador());
    this.time.addEvent({ delay: TROCA_MS, loop: true, callback: () => this.trocarLutador() });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.vitrine = null; this.fechada = true; });
  }

  private trocarLutador(): void {
    if (this.esferaAberta || !this.vitrine) return;
    const v = this.vitrine, novo = sortearLutador(vitrineAtual?.id);
    this.tweens.add({
      targets: [v.sprite, v.chao], alpha: 0, duration: 250,
      onComplete: () => { if (this.vitrine === v) { this.apagarVitrine(); this.mostrarLutador(novo); } },
    });
  }

  private apagarVitrine(): void {
    const v = this.vitrine;
    if (!v) return;
    v.sprite.destroy(); v.efeitos.destruir(); v.chao.destroy(); v.faiscas?.destroy();
    this.vitrine = null;
  }

  /** carrega (se faltar) o atlas da forma e os efeitos, e mostra o lutador com a aura */
  private mostrarLutador(esc: { id: string; nivel: number }): void {
    vitrineAtual = esc;
    const chave = chaveDoAtlas(esc.id, esc.nivel);
    const pronto = () => {
      // (no create o atlas já pode estar no cache: aqui a cena ainda não está "ativa", por isso olha só se foi fechada)
      if (this.fechada || vitrineAtual !== esc || !this.textures.exists(chave)) return;
      liberarFormas(this, new Set([chave])); // só a forma da vitrine fica na memória
      criarAnimacoes(this, chave);
      const meta = metaDoAtlas(this, chave);
      const k = VITRINE.k * escalaDaAltura(PERSONAGENS[esc.id].formas[esc.nivel].altura);
      const chao = this.add.graphics().setDepth(8);
      const cores = PALETAS_AURA[auraDoLutador(esc.id, esc.nivel)];
      chao.fillStyle(cores[1], 0.18).fillEllipse(VITRINE.x, VITRINE.y + 2, 190, 26).fillStyle(cores[2], 0.25).fillEllipse(VITRINE.x, VITRINE.y + 2, 110, 12)
        .fillStyle(0x000000, 0.35).fillEllipse(VITRINE.x, VITRINE.y + 1, 70, 8);
      const sprite = this.add.sprite(VITRINE.x, VITRINE.y, chave, 'idle/0').setOrigin(0.5, 103 / 112).setDepth(10).setScale(k / meta.escala);
      const tom = PERSONAGENS[esc.id].formas[esc.nivel].tom;
      if (tom) sprite.setTint(tom); // v0.154: Goku normal levemente vermelho (Kaioken), como na luta
      sprite.play(`${chave}:idle`);
      sprite.setInteractive({ useHandCursor: true, pixelPerfect: false }).on('pointerup', () => this.golpe());
      sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.play(`${chave}:idle`));
      const l = { acao: 'livre', nivelAura: 0.55, personagem: esc.id, nivel: esc.nivel, poder: 0, invulneravel: 0, escudo: false, olhando: 1 } as unknown as Lutador;
      const efeitos = new EfeitosDoLutador(this, 'p1');
      let faiscas: Phaser.GameObjects.Particles.ParticleEmitter | undefined;
      if (enfeitesLigados()) {
        faiscas = this.add.particles(0, 0, faisca(this), {
          x: { min: VITRINE.x - 55, max: VITRINE.x + 55 }, y: { min: VITRINE.y - 150, max: VITRINE.y },
          speedY: { min: -70, max: -25 }, speedX: { min: -8, max: 8 }, lifespan: { min: 600, max: 1200 },
          scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [cores[1], cores[2]], blendMode: 'ADD',
          frequency: 70, maxAliveParticles: 22,
        }).setDepth(11);
      }
      for (const o of [sprite, chao]) { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 300 }); }
      this.vitrine = { sprite, efeitos, l, k, chao, faiscas };
    };
    const faltam = pedirFormas(this, [chave]) + (pedirEfeitos(this) ? 1 : 0);
    if (!faltam) { pronto(); return; }
    this.load.once(Phaser.Loader.Events.COMPLETE, pronto);
    this.load.start();
  }

  /** tocar no lutador: ataque de ki (volta ao parado no fim) */
  private golpe(): void {
    const v = this.vitrine;
    if (!v) return;
    const chave = v.sprite.texture.key, a = `${chave}:attackKi`;
    if (this.anims.exists(a) && v.sprite.anims.currentAnim?.key !== a) { som.tocar('shoot'); v.sprite.play(a); }
  }

  update(tempo: number, delta: number): void {
    const v = this.vitrine;
    if (!v) return;
    if (v.faiscas && !enfeitesLigados()) { v.faiscas.destroy(); v.faiscas = undefined; }
    v.efeitos.desenhar(v.l, { x: v.sprite.x, y: v.sprite.y }, v.k, tempo / 1000, Math.min(0.1, delta / 1000), alturaDoCorpo(v.sprite));
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
      return bt;
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
    const upd = add(ret(E.x + 12, y + 72, E.w - 24, 30), 'UPDATES', () => this.scene.start('Atualizacoes'), '#fbbf24');
    if (temVersaoNova()) upd.container.add(bolinhaDeAviso(this, upd.r.w - 12, upd.r.h / 2, 5));
    this.nav.add({ ...L.esfera, acionar: () => this.fecharEsfera() });
  }

  private pedirApelido(): void {
    pedirTexto('APELIDO', 'DIGITE SEU APELIDO (ATÉ 16 LETRAS):', conquistas().apelido(), APELIDO_MAX, (t) => {
      conquistas().definirApelido(t);
      this.desenharEsfera();
    });
  }
}
