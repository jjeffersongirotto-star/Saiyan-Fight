// Cena da luta: carrega os dois lutadores (atlas WebP), roda a lógica pura em passo fixo de 1/60 s e só desenha.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import * as C from '../logica/constantes';
import { MOVIMENTOS, MOVIMENTOS_EM_LACO, fpsDoMovimento, poseDoLutador } from '../logica/animacao';
import { juntarEntradas } from '../logica/entrada';
import { entradaDaIA } from '../logica/ia';
import { T } from '../logica/idioma';
import { criarLuta, passoLuta, raioAtivo } from '../logica/luta';
import { interpolar, RelogioFixo } from '../logica/relogio';
import type { Entrada, EstadoLuta, Evento, IdJogador } from '../logica/tipos';
import { PERSONAGENS } from '../dados/personagens';
import { Teclado } from '../entrada/teclado';
import { mostrarBarraDeCarregamento } from '../ui/barra';
import { ControlesToque } from '../ui/controlesToque';
import { Hud } from '../ui/hud';
import { desenharFundo } from './fundo';
import type { DadosDaLuta } from './Menu';
import type { DadosDaVitoria } from './Vitoria';

interface MetaAtlas {
  escala: number;
  fps: number;
  fpsMov: Record<string, number>;
  movimentos: Record<string, number>;
}

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
  private aviso!: Phaser.GameObjects.Text;
  private escalaSprite = 1;

  constructor() {
    super('Luta');
  }

  init(d: DadosDaLuta): void {
    this.dados = d;
  }

  preload(): void {
    const faltam = [this.dados.p1, this.dados.p2].map((id) => PERSONAGENS[id]).filter((p) => !this.textures.exists(p.atlas));
    if (faltam.length) mostrarBarraDeCarregamento(this);
    for (const p of faltam) this.load.atlas(p.atlas, `atlas/${p.atlas}.webp`, `atlas/${p.atlas}.json`);
  }

  create(): void {
    ajustarCamera(this);
    desenharFundo(this);
    for (const id of [this.dados.p1, this.dados.p2]) this.criarAnimacoes(id);
    this.estado = criarLuta(this.dados.p1, this.dados.p2, Date.now() | 0);
    this.relogio.zerar();

    this.grafTiros = this.add.graphics().setDepth(20);
    this.grafRaios = this.add.graphics().setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
    this.sprites = {
      p1: this.criarSprite('p1'),
      p2: this.criarSprite('p2'),
    };
    this.hud = new Hud(this, PERSONAGENS[this.dados.p1].nome, PERSONAGENS[this.dados.p2].nome + (this.dados.modo === 'cpu' ? ' (CPU)' : ''));
    this.aviso = this.add
      .text(C.TELA_L / 2, 130, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#ffd23a', stroke: '#8a2b00', strokeThickness: 7 }))
      .setOrigin(0.5)
      .setDepth(850);
    this.mostrarAviso(`${T('RODADA')} 1 — ${T('LUTEM!')}`, 1200);

    this.toque = new ControlesToque(this);
    this.teclado.ligar();
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.teclado.desligar();
      this.toque.destruir();
    });
  }

  private meta(personagem: string): MetaAtlas {
    // o Phaser guarda o resto do JSON do atlas (meta.saiyan, gerado por gerar-atlas.py) em customData da textura
    const tex = this.textures.get(PERSONAGENS[personagem].atlas);
    const meta = (tex.customData as { meta?: { saiyan?: MetaAtlas } }).meta?.saiyan;
    return meta ?? { escala: 1.5, fps: 10, fpsMov: {}, movimentos: {} };
  }

  private criarAnimacoes(personagem: string): void {
    const p = PERSONAGENS[personagem];
    const m = this.meta(personagem);
    this.escalaSprite = 1 / m.escala;
    for (const mov of MOVIMENTOS) {
      const chave = `${p.id}:${mov}`;
      const n = m.movimentos[mov] ?? 0;
      if (this.anims.exists(chave) || n === 0) continue;
      this.anims.create({
        key: chave,
        frames: Array.from({ length: n }, (_, i) => ({ key: p.atlas, frame: `${mov}/${i}` })),
        frameRate: fpsDoMovimento(mov, m.fps, m.fpsMov),
        repeat: MOVIMENTOS_EM_LACO.has(mov) ? -1 : 0,
      });
    }
  }

  private criarSprite(id: IdJogador): Phaser.GameObjects.Sprite {
    const p = PERSONAGENS[this.estado[id].personagem];
    // desenho 96x112 com os pés na linha 103 (mesmo formato dos pacotes do jogo antigo)
    return this.add.sprite(0, 0, p.atlas, 'idle/0').setOrigin(0.5, 103 / 112).setScale(this.escalaSprite).setDepth(10);
  }

  private lerEntradas(): Record<IdJogador, Entrada> {
    const p1 = juntarEntradas(this.teclado.ler('p1'), this.toque.ler());
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
    this.desenhar(this.relogio.alfa);
  }

  private aoEvento(ev: Evento): void {
    switch (ev.tipo) {
      case 'acerto': {
        const s = this.sprites[ev.alvo];
        s.setTintFill(0xffffff);
        this.time.delayedCall(70, () => s.clearTint());
        if (ev.deEspecial) this.cameras.main.shake(260, 0.012);
        else this.cameras.main.shake(80, 0.004);
        this.faisca(s.x, s.y - 40);
        break;
      }
      case 'reflexo':
        this.faisca(this.estado[ev.dono].x, this.estado[ev.dono].y, 0x7fe9ff);
        break;
      case 'fimRodada': {
        const v = ev.vencedor;
        this.mostrarAviso(v ? `${PERSONAGENS[this.estado[v].personagem].nome} ${T('VENCEU')}!` : T('EMPATE'), 2200);
        break;
      }
      case 'novaRodada':
        this.mostrarAviso(`${T('RODADA')} ${ev.rodada} — ${T('LUTEM!')}`, 1200);
        break;
      case 'fimPartida':
        this.time.delayedCall(200, () =>
          this.scene.start('Vitoria', { luta: this.dados, vencedor: ev.vencedor, placar: this.estado.placar } satisfies DadosDaVitoria),
        );
        break;
      default:
        break;
    }
  }

  private faisca(x: number, y: number, cor = 0xfff2a8): void {
    const c = this.add.circle(x, y, 10, cor, 0.9).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, scale: 3, alpha: 0, duration: 220, onComplete: () => c.destroy() });
  }

  private mostrarAviso(texto: string, ms: number): void {
    this.aviso.setText(texto).setAlpha(1).setScale(0.6);
    this.tweens.killTweensOf(this.aviso);
    this.tweens.add({ targets: this.aviso, scale: 1, duration: 180, ease: 'Back.Out' });
    this.tweens.add({ targets: this.aviso, alpha: 0, delay: ms, duration: 300 });
  }

  private desenhar(alfa: number): void {
    const e = this.estado;
    for (const id of ['p1', 'p2'] as const) {
      const l = e[id];
      const s = this.sprites[id];
      s.setPosition(interpolar(l.xAnt, l.x, alfa), interpolar(l.yAnt, l.y, alfa) + C.LUTADOR_A / 2);
      const pose = poseDoLutador(l);
      s.setFlipX(pose.espelhar);
      const chave = `${PERSONAGENS[l.personagem].id}:${pose.movimento}`;
      if (s.anims.currentAnim?.key !== chave && this.anims.exists(chave)) s.play(chave);
      // piscando enquanto está invulnerável; caído fica meio apagado
      s.setAlpha(l.acao === 'caido' ? 0.5 : l.invulneravel > 0 && Math.floor(l.invulneravel / 4) % 2 === 0 ? 0.45 : 1);
      // aura simples carregando ki
      if (l.acao === 'carregando' && e.quadro % 3 === 0) this.faisca(s.x + (Math.random() - 0.5) * 40, s.y - 20 - Math.random() * 60, 0xffe066);
    }

    const g = this.grafTiros.clear();
    for (const t of e.tiros) {
      const cor = PERSONAGENS[e[t.dono].personagem].corTiro;
      g.fillStyle(cor, 0.35).fillCircle(t.x, t.y, t.raio * 1.8);
      g.fillStyle(cor, 1).fillCircle(t.x, t.y, t.raio);
      g.fillStyle(0xffffff, 1).fillCircle(t.x, t.y, t.raio * 0.45);
    }

    const r = this.grafRaios.clear();
    for (const raio of e.raios) {
      if (!raioAtivo(raio)) continue;
      const cor = PERSONAGENS[e[raio.dono].personagem].corRaio;
      const cresce = Math.min(1, (raio.idade + 1) / 6);
      const fim = raio.direcao === 1 ? C.TELA_L : 0;
      const x = Math.min(raio.x0, interpolar(raio.x0, fim, cresce));
      const w = Math.abs(interpolar(raio.x0, fim, cresce) - raio.x0);
      const pulsa = 1 + Math.sin(e.quadro * 0.8) * 0.12;
      for (const [esp, a] of [[2.2, 0.25], [1.4, 0.5], [0.8, 1]] as const) {
        const h = C.ESPECIAL_ALTURA * esp * pulsa;
        r.fillStyle(a === 1 ? 0xffffff : cor, a).fillRect(x, raio.y - h / 2, w, h);
      }
      r.fillStyle(cor, 0.8).fillCircle(raio.x0, raio.y, C.ESPECIAL_ALTURA * 1.1 * pulsa);
    }
    // pose de carga do especial: bola crescendo na mão
    for (const id of ['p1', 'p2'] as const) {
      const l = e[id];
      if (l.acao === 'especial' && l.acaoQuadros < C.ESPECIAL_CARGA) {
        const cor = PERSONAGENS[l.personagem].corRaio;
        r.fillStyle(cor, 0.9).fillCircle(l.x + l.olhando * (C.LUTADOR_L / 2 + 4), l.y - C.LUTADOR_A * 0.08, 4 + l.acaoQuadros);
      }
    }

    this.hud.desenhar(e);
    this.toque.desenhar(e.p1.ki >= C.KI_MAX);
  }
}
