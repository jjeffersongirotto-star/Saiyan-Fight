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
import { criarLuta, escalaDaAltura, alturaDoNivel, maoDe, passoLuta, podeTransformar } from '../logica/luta';
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
import { som, vibrar } from '../audio/som';
import { CHANCE_SOM_CARREGANDO, TEMA_DA_LUTA } from '../logica/musica';
import { EfeitosDaLuta, pedirEfeitos } from '../ui/efeitos';

export class Luta extends Phaser.Scene {
  private dados!: DadosDaLuta;
  private estado!: EstadoLuta;
  private relogio = new RelogioFixo();
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
    const faltam = pedirFormas(this, chaves) + (pedirEfeitos(this) ? 1 : 0);
    if (faltam > 0) mostrarBarraDeCarregamento(this);
  }

  create(): void {
    ajustarCamera(this);
    desenharFundo(this);
    this.estado = criarLuta(fichaDoPersonagem(this.dados.p1), fichaDoPersonagem(this.dados.p2), Date.now() | 0);
    for (const k of formasDaLuta(this.estado)) criarAnimacoes(this, k);
    this.relogio.zerar();
    this.carregandoNoFundo = false;
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, (chave: string) => criarAnimacoes(this, chave));

    this.efeitos = new EfeitosDaLuta(this);
    this.grafChoque = this.add.graphics().setDepth(850);
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
    som.musica(TEMA_DA_LUTA);

    this.toque = new ControlesToque(this);
    this.teclado.ligar();
    aoApertar(this, (c) => { if (c === 'Escape') this.scene.start('Menu'); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.teclado.desligar();
      this.toque.destruir();
      this.efeitos.destruir();
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
      this.efeitos.passo();
      for (const ev of eventos) this.aoEvento(ev);
      // carregando ki: o "zumbido" do jogo antigo (charge em ~20% dos quadros)
      for (const id of ['p1', 'p2'] as const) if (this.estado[id].acao === 'carregando' && Math.random() < CHANCE_SOM_CARREGANDO) som.tocar('charge');
      if (this.estado.fase === 'fimPartida') return;
    }
    this.cuidarDasFormas();
    this.desenhar(this.relogio.alfa, dt / 1000);
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
        this.cameras.main.shake(ev.deEspecial ? 260 : 80, ev.deEspecial ? 0.012 : 0.004);
        const alvo = this.estado[ev.alvo];
        this.particulas(alvo.x, alvo.y - alvo.a * 0.1, ev.deEspecial ? 0xffd34d : 0xffff00, ev.deEspecial ? 20 : 12);
        break;
      }
      case 'parry':
        this.efeitos.lutador[ev.dono].parry();
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
        this.efeitos.lutador[ev.dono].escudoLigado = true;
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

  /** sons e vibração de cada acontecimento (os mesmos playSound/vibrate do jogo antigo) */
  private somDoEvento(ev: Evento): void {
    const meu = (id: IdJogador) => id === 'p1' || this.dados.modo === 'versus';
    switch (ev.tipo) {
      case 'tiro': som.tocar('shoot'); break;
      case 'apertoChoque': som.tocar('shoot'); break;
      case 'acerto': som.tocar('hit'); break;
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
      default: break;
    }
  }

  private piscarTela(cor: number, quadros: number): void {
    this.flash = { cor, quadros, max: quadros };
  }

  private faisca(x: number, y: number, cor = 0xfff2a8, tamanho = 3): void {
    const c = this.add.circle(x, y, 10, cor, 0.9).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, scale: tamanho, alpha: 0, duration: 220, onComplete: () => c.destroy() });
  }

  /** faíscas do impacto (createImpactParticles): voam para todo lado e somem */
  private particulas(x: number, y: number, cor: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, vel = 2 + Math.random() * 4;
      const p = this.add.rectangle(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3, cor).setDepth(30);
      this.tweens.add({ targets: p, x: x + Math.cos(ang) * vel * 14, y: y + Math.sin(ang) * vel * 14, alpha: 0, duration: 380, onComplete: () => p.destroy() });
    }
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
    this.efeitos.lutador[l.id].desenhar(l, { x: s.x, y: s.y }, k, this.estado.quadro / 60, this.dtSeg);
  }

  private dtSeg = 1 / 60;

  private desenhar(alfa: number, dtSeg: number): void {
    const e = this.estado;
    this.dtSeg = Math.min(0.1, dtSeg);
    this.desenharLutador(e.p1, alfa);
    this.desenharLutador(e.p2, alfa);

    const relogio = e.quadro / 60;
    this.efeitos.desenharTiros(e, relogio);
    this.efeitos.desenharRaios(e, (l) => this.maoNaTela(l), (l) => ({ x: this.sprites[l.id].x, y: this.sprites[l.id].y - l.a / 2 }), relogio);
    this.desenharPlacarDoChoque();

    const tela = this.grafTela.clear();
    if (this.flash.quadros > 0) {
      tela.fillStyle(this.flash.cor, 0.6 * (this.flash.quadros / this.flash.max)).fillRect(0, 0, C.TELA_L, C.TELA_A);
      this.flash.quadros--;
    }

    this.hud.desenhar(e);
    this.toque.desenhar(e.p1.ki >= C.KI_MAX, podeTransformar(e.p1));
  }

  /** placar de apertos do choque + tempo que falta (para deixar claro que é para apertar ATAQUE sem parar) */
  private desenharPlacarDoChoque(): void {
    const g = this.grafChoque.clear();
    const ch = this.estado.choque;
    if (!ch) { this.textoChoque.setText(''); return; }
    this.textoChoque.setText(`${ch.apertos.p1}   ${T('CHOQUE! APERTE ATAQUE!')}   ${ch.apertos.p2}`);
    const w = 160, x = C.TELA_L / 2 - w / 2, y = 94;
    g.fillStyle(0xffffff, 0.9).fillRect(x, y, w, 6);
    g.fillStyle(0xfff3b0, 1).fillRect(x, y, w * Math.max(0, 1 - ch.idade / C.CHOQUE_DURACAO), 6);
    g.fillStyle(0x00ffff, 1).fillRect(x - 8, y - 1, 6, 8);
    g.fillStyle(0xff0055, 1).fillRect(x + w + 2, y - 1, 6, 8);
  }
}
