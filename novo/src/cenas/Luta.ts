// Cena da luta: carrega só as formas que a luta precisa (atlas WebP), roda a lógica pura em passo fixo de 1/60 s
// e só desenha. Ao transformar, a próxima forma é pedida em segundo plano e as que não servem mais são liberadas.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import * as C from '../logica/constantes';
import { poseDoLutador } from '../logica/animacao';
import { juntarEntradas } from '../logica/entrada';
import { fichaDoPersonagem } from '../logica/ficha';
import { formaParaDesenhar, formasDaLuta, formasNecessarias } from '../logica/formas';
import { entradaDaIA } from '../logica/ia';
import { T } from '../logica/idioma';
import { criarLuta, escalaDaAltura, alturaDoNivel, maoDe, outro, passoLuta, podeTransformar } from '../logica/luta';
import { interpolar, RelogioFixo } from '../logica/relogio';
import type { Entrada, EstadoLuta, Evento, IdJogador, Lutador } from '../logica/tipos';
import { formaDoNivel, PERSONAGENS } from '../dados/personagens';
import { Teclado } from '../entrada/teclado';
import { mostrarBarraDeCarregamento } from '../ui/barra';
import { ControlesToque } from '../ui/controlesToque';
import { criarAnimacoes, liberarFormas, metaDoAtlas, pedirFormas } from '../ui/formas';
import { Hud } from '../ui/hud';
import { desenharFundo } from './fundo';
import type { DadosDaLuta } from './Menu';
import type { DadosDaVitoria } from './Vitoria';
import { aoApertar } from '../entrada/teclas';

export class Luta extends Phaser.Scene {
  private dados!: DadosDaLuta;
  private estado!: EstadoLuta;
  private relogio = new RelogioFixo();
  private teclado = new Teclado();
  private toque!: ControlesToque;
  private hud!: Hud;
  private sprites!: Record<IdJogador, Phaser.GameObjects.Sprite>;
  private grafTiros!: Phaser.GameObjects.Graphics;
  private grafRaios!: Phaser.GameObjects.Graphics;
  private grafTela!: Phaser.GameObjects.Graphics;
  private aviso!: Phaser.GameObjects.Text;
  private textoChoque!: Phaser.GameObjects.Text;
  private flash = { cor: 0xffffff, quadros: 0, max: 1 };
  private carregandoNoFundo = false;

  constructor() {
    super('Luta');
  }

  init(d: DadosDaLuta): void {
    this.dados = d;
  }

  preload(): void {
    // começo da luta: forma normal + a 1ª transformação de cada um (o resto vem durante a luta)
    const chaves = formasNecessarias([{ personagem: this.dados.p1, nivel: 0 }, { personagem: this.dados.p2, nivel: 0 }]);
    liberarFormas(this, new Set(chaves));
    if (pedirFormas(this, chaves) > 0) mostrarBarraDeCarregamento(this);
  }

  create(): void {
    ajustarCamera(this);
    desenharFundo(this);
    this.estado = criarLuta(fichaDoPersonagem(this.dados.p1), fichaDoPersonagem(this.dados.p2), Date.now() | 0);
    for (const k of formasDaLuta(this.estado)) criarAnimacoes(this, k);
    this.relogio.zerar();
    this.carregandoNoFundo = false;
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, (chave: string) => criarAnimacoes(this, chave));

    this.grafRaios = this.add.graphics().setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
    this.grafTiros = this.add.graphics().setDepth(20);
    this.grafTela = this.add.graphics().setDepth(840);
    this.sprites = { p1: this.criarSprite('p1'), p2: this.criarSprite('p2') };
    this.hud = new Hud(this, this.dados.modo === 'cpu' ? ' (CPU)' : '');
    this.aviso = this.add
      .text(C.TELA_L / 2, 130, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#ffd23a', stroke: '#8a2b00', strokeThickness: 7 }))
      .setOrigin(0.5)
      .setDepth(850);
    this.textoChoque = this.add
      .text(C.TELA_L / 2, 78, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }))
      .setOrigin(0.5)
      .setDepth(850);
    this.mostrarAviso(`${T('RODADA')} 1 — ${T('LUTEM!')}`, 1200);

    this.toque = new ControlesToque(this);
    this.teclado.ligar();
    aoApertar(this, (c) => { if (c === 'Escape') this.scene.start('Menu'); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.teclado.desligar();
      this.toque.destruir();
      this.load.off(Phaser.Loader.Events.FILE_COMPLETE);
    });
  }

  private criarSprite(id: IdJogador): Phaser.GameObjects.Sprite {
    const l = this.estado[id];
    const chave = formaParaDesenhar(l.personagem, 0, (k) => this.textures.exists(k))!;
    // desenho 96x112 com os pés na linha 103 (mesmo formato dos pacotes do jogo antigo)
    return this.add.sprite(0, 0, chave, 'idle/0').setOrigin(0.5, 103 / 112).setDepth(10);
  }

  private lerEntradas(): Record<IdJogador, Entrada> {
    const p1 = juntarEntradas(this.teclado.ler('p1'), this.toque.ler(podeTransformar(this.estado.p1)));
    const tecladoP2 = this.teclado.ler('p2');
    const p2 = this.dados.modo === 'cpu' ? entradaDaIA(this.estado, 'p2') : tecladoP2;
    return { p1, p2 };
  }

  update(_t: number, dt: number): void {
    const passos = this.relogio.avancar(dt);
    for (let i = 0; i < passos; i++) {
      const eventos = passoLuta(this.estado, this.lerEntradas());
      for (const ev of eventos) this.aoEvento(ev);
      if (this.estado.fase === 'fimPartida') return;
    }
    this.cuidarDasFormas();
    this.desenhar(this.relogio.alfa);
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
    switch (ev.tipo) {
      case 'acerto': {
        const s = this.sprites[ev.alvo];
        s.setTintFill(0xffffff);
        this.time.delayedCall(70, () => s.clearTint());
        this.cameras.main.shake(ev.deEspecial ? 260 : 80, ev.deEspecial ? 0.012 : 0.004);
        this.faisca(s.x, s.y - 40);
        break;
      }
      case 'parry':
        if (ev.refletidos > 0) {
          const c = this.estado[ev.dono];
          this.faisca(c.x + c.olhando * 20, c.y - c.a * 0.3, 0x7fe9ff, 4);
          this.cameras.main.shake(100, 0.004);
        }
        break;
      case 'transformou': {
        const l = this.estado[ev.dono];
        this.piscarTela(0xfff3b0, 18);
        this.cameras.main.shake(400, 0.01);
        this.mostrarAviso(formaDoNivel(l.personagem, ev.nivel).nome.toUpperCase(), 900, 22);
        break;
      }
      case 'zenkai':
        this.piscarTela(0xffe45a, 30);
        this.cameras.main.shake(400, 0.014);
        this.mostrarAviso('ZENKAI!', 900);
        break;
      case 'especial':
        this.cameras.main.shake(500, 0.006);
        break;
      case 'choque':
        this.piscarTela(0xffffff, 18);
        this.cameras.main.shake(300, 0.01);
        break;
      case 'fimChoque':
        this.piscarTela(0xffffff, 22);
        this.cameras.main.shake(400, 0.016);
        break;
      case 'fimRodada': {
        const v = ev.vencedor;
        this.mostrarAviso(v ? `${PERSONAGENS[this.estado[v].personagem].nome} ${T('VENCEU')}!` : T('EMPATE'), 2200);
        break;
      }
      case 'novaRodada':
        this.mostrarAviso(`${T('RODADA')} ${ev.rodada} — ${T('LUTEM!')}`, 1200);
        break;
      case 'fimPartida': {
        const venc = this.estado[ev.vencedor];
        this.time.delayedCall(200, () =>
          this.scene.start('Vitoria', {
            luta: this.dados, vencedor: ev.vencedor, placar: this.estado.placar, atlas: this.sprites[ev.vencedor].texture.key, altura: alturaDoNivel(venc, venc.nivel),
          } satisfies DadosDaVitoria),
        );
        break;
      }
      default:
        break;
    }
  }

  private piscarTela(cor: number, quadros: number): void {
    this.flash = { cor, quadros, max: quadros };
  }

  private faisca(x: number, y: number, cor = 0xfff2a8, tamanho = 3): void {
    const c = this.add.circle(x, y, 10, cor, 0.9).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, scale: tamanho, alpha: 0, duration: 220, onComplete: () => c.destroy() });
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
    const meta = metaDoAtlas(this, chave);
    const k = escalaDaAltura(alturaDoNivel(l, l.nivel));
    s.setScale(k / meta.escala);
    s.setPosition(interpolar(l.xAnt, l.x, alfa), interpolar(l.yAnt, l.y, alfa) + l.a / 2);
    const pose = poseDoLutador(l);
    s.setFlipX(pose.espelhar);
    const anim = `${chave}:${pose.movimento}`;
    const animFinal = this.anims.exists(anim) ? anim : `${chave}:${pose.movimento === 'special' ? 'attackKi' : 'idle'}`;
    if (s.anims.currentAnim?.key !== animFinal) s.play(animFinal);
    s.setAlpha(l.acao === 'caido' ? 0.5 : l.invulneravel > 0 && Math.floor(l.invulneravel / 4) % 2 === 0 ? 0.45 : 1);
    // aura provisória (as auras animadas do jogo antigo entram na próxima etapa)
    if ((l.acao === 'carregando' || l.poder > 0 || l.acao === 'transformando') && this.estado.quadro % 3 === 0) {
      const cor = corDaAura(formaDoNivel(l.personagem, l.nivel).aura);
      this.faisca(s.x + (Math.random() - 0.5) * 40 * k, s.y - 10 - Math.random() * 70 * k, cor, 2.5);
    }
  }

  private desenhar(alfa: number): void {
    const e = this.estado;
    this.desenharLutador(e.p1, alfa);
    this.desenharLutador(e.p2, alfa);

    const g = this.grafTiros.clear();
    for (const t of e.tiros) {
      const cor = t.refletido ? 0x7fe9ff : PERSONAGENS[e[t.dono].personagem].corKi;
      g.fillStyle(cor, 0.35).fillCircle(t.x, t.y, t.raio * 1.8);
      g.fillStyle(cor, 1).fillCircle(t.x, t.y, t.raio);
      g.fillStyle(0xffffff, 1).fillCircle(t.x, t.y, t.raio * 0.45);
    }

    const r = this.grafRaios.clear();
    for (const raio of e.raios) {
      const dono = e[raio.dono], alvo = e[outro(raio.dono)];
      const de = this.maoNaTela(dono);
      const para = { x: this.sprites[alvo.id].x, y: this.sprites[alvo.id].y - alvo.a / 2 };
      const cor = PERSONAGENS[dono.personagem].corKi;
      if (raio.sol) this.desenharSol(r, de, para, raio.idade, cor);
      else this.desenharRaio(r, de, para, Math.min(1, raio.idade / raio.chega), cor, e.quadro);
    }
    if (e.choque) {
      const m1 = this.maoNaTela(e.p1), m2 = this.maoNaTela(e.p2);
      const meio = (1 + e.choque.empurrao) / 2; // 0 = na mão do P1, 1 = na mão do P2
      const encontro = { x: interpolar(m1.x, m2.x, 0.15 + 0.7 * meio), y: interpolar(m1.y, m2.y, 0.15 + 0.7 * meio) };
      this.desenharRaio(r, m1, encontro, 1, PERSONAGENS[e.p1.personagem].corKi, e.quadro);
      this.desenharRaio(r, m2, encontro, 1, PERSONAGENS[e.p2.personagem].corKi, e.quadro);
      const pulsa = 28 + Math.sin(e.quadro * 0.7) * 6;
      r.fillStyle(0xffffff, 0.5).fillCircle(encontro.x, encontro.y, pulsa * 1.6);
      r.fillStyle(0xffffff, 1).fillCircle(encontro.x, encontro.y, pulsa);
      this.textoChoque.setText(`${T('CHOQUE! APERTE ATAQUE!')}   ${e.choque.apertos.p1} x ${e.choque.apertos.p2}`);
    } else this.textoChoque.setText('');

    const tela = this.grafTela.clear();
    if (this.flash.quadros > 0) {
      tela.fillStyle(this.flash.cor, 0.6 * (this.flash.quadros / this.flash.max)).fillRect(0, 0, C.TELA_L, C.TELA_A);
      this.flash.quadros--;
    }

    this.hud.desenhar(e);
    this.toque.desenhar(e.p1.ki >= C.KI_MAX, podeTransformar(e.p1));
  }

  private desenharRaio(r: Phaser.GameObjects.Graphics, de: { x: number; y: number }, para: { x: number; y: number }, cresce: number, cor: number, quadro: number): void {
    const fim = { x: interpolar(de.x, para.x, cresce), y: interpolar(de.y, para.y, cresce) };
    const pulsa = 1 + Math.sin(quadro * 0.8) * 0.12;
    for (const [esp, a] of [[2.2, 0.25], [1.4, 0.5], [0.7, 1]] as const) {
      r.lineStyle(C.ESPECIAL_ALTURA * esp * pulsa, a === 1 ? 0xffffff : cor, a).lineBetween(de.x, de.y, fim.x, fim.y);
    }
    r.fillStyle(cor, 0.8).fillCircle(de.x, de.y, C.ESPECIAL_ALTURA * 0.9 * pulsa);
    r.fillStyle(0xffffff, 0.9).fillCircle(fim.x, fim.y, C.ESPECIAL_ALTURA * 0.7 * pulsa);
  }

  /** Sol do Freeza: cresce em cima do dedo, é empurrado e voa até o alvo (SOL_CRESCE/SOL_EMPURRA/SOL_CHEGA). */
  private desenharSol(r: Phaser.GameObjects.Graphics, dedo: { x: number; y: number }, alvo: { x: number; y: number }, idade: number, cor: number): void {
    const CRESCE = 22, EMPURRA = 32;
    const raio = 10 + 30 * Math.min(1, idade / CRESCE);
    const t = idade <= EMPURRA ? 0 : Math.min(1, (idade - EMPURRA) / (C.SOL_CHEGA - EMPURRA));
    const x = interpolar(dedo.x, alvo.x, t), y = interpolar(dedo.y - raio, alvo.y, t);
    r.fillStyle(cor, 0.35).fillCircle(x, y, raio * 1.5);
    r.fillStyle(0xffb347, 0.9).fillCircle(x, y, raio);
    r.fillStyle(0xffffff, 0.8).fillCircle(x, y, raio * 0.5);
  }
}

/** Cor provisória de cada aura (as imagens animadas entram na etapa dos efeitos). */
export function corDaAura(aura: string): number {
  const cores: Record<string, number> = {
    gelo: 0xbff4ff, amarelo: 0xffe066, verde: 0x7dff7a, roxo: 0xc77dff, azul: 0x6fb8ff, rosa: 0xff9de0,
    vermelho: 0xff5a4a, blue: 0x4fc3ff, azul_escuro: 0x3a5bff,
  };
  return cores[aura] ?? 0xffe066;
}
