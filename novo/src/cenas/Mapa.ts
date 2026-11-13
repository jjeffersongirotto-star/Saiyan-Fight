// MAPA DE FASES do antigo (stage_map do menu.js + mapa.js): um caminho longo em perspectiva rolando na
// horizontal, com céu, horizonte e objetos de cada trecho (o MESMO desenho do antigo, via legado), a estrada
// dourada até a última fase liberada, as fases com a foto da arena num círculo, o número, o nome e o estado
// (NORMAL ✓ / DIFÍCIL ✓ / RECORDE), as fases futuras escuras com cadeado e a placa "ADVERSÁRIOS MAIS FORTES
// VIRÃO!". Arrastar ou as setas ‹ › rolam; clicar numa fase liberada abre a escolha do modo (NORMAL (ONDAS
// 1-5) / DIFÍCIL / SEM LIMITE); numa bloqueada, o aviso embaixo. A fase recém-liberada abre o cadeado.
import Phaser from 'phaser';
import { ajustarCamera, ESCALA_RENDER } from '../ui/resolucao';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T, TF } from '../logica/idioma';
import { dificilLiberado, faseLiberada, semLimiteLiberado, type ModoFase, type ProgressoFases } from '../logica/ondas';
import { lerProgresso, lerRecordes, type Recordes } from '../logica/progresso';
import { fasesEmOrdem, type Fase } from '../dados/fases';
import { mostrarBarraDeCarregamento } from '../ui/barra';
import { som } from '../audio/som';
import { carregarCenarios, cenariosProntos } from '../ui/arena';
import { chaveFoto, fazerFotos } from '../ui/fotoFase';
import { botao, botaoNav, montarTela, ret, texto, type Alvo, type BotaoTela, type Navegacao } from '../ui/telas';
import { cadeadoAbrindo, inteiroNaTela, limitarRolagem, naTela, PASSO_DAS_SETAS, posicaoNoMapa, RAIO_NO, recordeDeOnda, rolagemParaFase, totalNoMapa } from '../logica/mapa';
import type { CenariosLegado } from '../legado/cenarios-legado';

export { posicaoNoMapa };
const R = RAIO_NO;
const css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;


export class Mapa extends Phaser.Scene {
  private fases: Fase[] = [];
  private prog: ProgressoFases = {};
  private recordes: Recordes = {};
  private inicial: string | undefined;
  private liberou: string | undefined;
  private rolagem = 0;
  private alvo: number | null = null;
  private total = 60;
  private legado: CenariosLegado | null = null;
  private tex: Phaser.Textures.CanvasTexture | null = null;
  private nav!: Navegacao;
  private alvosDasFases: Alvo[] = [];
  private focoAntes = -1;
  private escolha: Phaser.GameObjects.Container | null = null;
  private escolhida: string | null = null;
  private aviso!: Phaser.GameObjects.Text;
  private avisoAte = 0;
  private esq!: BotaoTela;
  private dir!: BotaoTela;
  private animT = -1;
  private arrasto: { x: number; r: number; moveu: boolean } | null = null;

  constructor() {
    super('Mapa');
  }

  init(d: { fase?: string; liberou?: string } = {}): void {
    this.inicial = d?.fase;
    this.liberou = d?.liberou;
    this.escolha = null;
    this.escolhida = null;
    this.alvo = null;
    this.legado = null;
    this.tex = null;
    this.alvosDasFases = [];
    this.focoAntes = -1;
    this.animT = -1;
    this.arrasto = null;
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
    this.fases = fasesEmOrdem();
    this.prog = lerProgresso();
    this.recordes = lerRecordes();
    this.total = totalNoMapa(this.fases.length);
    const ids = this.fases.map((f) => f.id);
    const pedida = this.inicial ? ids.indexOf(this.inicial) : -1;
    const centro = pedida >= 0 ? pedida : this.ultimaLiberada();
    this.rolagem = rolagemParaFase(centro, this.total);

    this.nav = montarTela(this, () => this.voltar());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.tex = null; this.legado = null; });
    // o desenho do mapa (legado) num canvas que vira textura; até o módulo chegar, fica o fundo dos menus
    const k = ESCALA_RENDER;
    const chave = 'mapa-3d';
    if (this.textures.exists(chave)) this.textures.remove(chave);
    this.tex = this.textures.createCanvas(chave, TELA_L * k, TELA_A * k)!;
    this.add.image(0, 0, chave).setOrigin(0).setDisplaySize(TELA_L, TELA_A).setDepth(-10);
    const tex = this.tex;
    const pronto = (m: NonNullable<ReturnType<typeof cenariosProntos>>) => {
      if (this.tex !== tex) return;   // a cena já saiu (ou recomeçou) antes do módulo chegar
      const l = m.criarCenariosLegado(this.tex.getSourceImage() as HTMLCanvasElement);
      l.escala(k);
      l.mapa.traducao((t: string) => T(t));
      this.legado = l;
    };
    const m = cenariosProntos();
    if (m) pronto(m); else carregarCenarios().then(pronto).catch(() => undefined);
    fazerFotos(this, ids, () => undefined);

    // as fases entram na navegação do controle (a posição acompanha a rolagem)
    this.fases.forEach((f, i) => {
      const a = this.nav.add({ x: 0, y: posicaoNoMapa(i).y - R, w: R * 2, h: R * 2, acionar: () => this.tocarFase(i) });
      this.alvosDasFases.push(a);
      void f;
    });
    this.esq = botao(this, ret(6, 165, 30, 44), '‹', () => this.rolarPara(this.rolagem - PASSO_DAS_SETAS), { cor: '#ffd23f', fonte: 22 });
    this.dir = botao(this, ret(764, 165, 30, 44), '›', () => this.rolarPara(this.rolagem + PASSO_DAS_SETAS), { cor: '#ffd23f', fonte: 22 });
    this.aviso = texto(this, TELA_L / 2, TELA_A - 14, '', 11, '#ff5555', { fontFamily: 'monospace', fontStyle: 'bold', backgroundColor: 'rgba(6,10,26,0.85)', padding: { x: 10, y: 3 } })
      .setOrigin(0.5).setDepth(50).setVisible(false);

    // arrastar rola o mapa; um toque sem arrastar escolhe a fase
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer, objs: unknown[]) => {
      if (this.escolha || objs.length) return;
      this.arrasto = { x: p.x, r: this.rolagem, moveu: false };
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      const a = this.arrasto;
      if (!a || !p.isDown) return;
      if (Math.abs(p.x - a.x) > 6) a.moveu = true;
      if (a.moveu) { this.alvo = null; this.rolagem = limitarRolagem(a.r - (p.x - a.x), this.total); }
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      const a = this.arrasto;
      this.arrasto = null;
      if (!a || a.moveu || this.escolha) return;
      this.clicar(p.x, p.y);
    });

    if (this.liberou && ids.includes(this.liberou)) { this.animT = 0; som.tocar('powerup'); }
    this.posicionarAlvos();
  }

  private ultimaLiberada(): number {
    const ids = this.fases.map((f) => f.id);
    let u = 0;
    ids.forEach((id, i) => { if (faseLiberada(id, ids, this.prog)) u = i; });
    return u;
  }

  private liberado(i: number, modo: ModoFase): boolean {
    const ids = this.fases.map((f) => f.id), id = ids[i];
    if (!faseLiberada(id, ids, this.prog)) return false;
    return modo === 'normal' || (modo === 'hard' ? dificilLiberado(id, this.prog) : semLimiteLiberado(id, this.prog));
  }

  private voltar(): void {
    if (this.escolha) { this.fecharEscolha(); return; }
    this.scene.start('ModoJogo');
  }

  private rolarPara(r: number): void { this.alvo = limitarRolagem(r, this.total); }

  private avisar(t: string): void {
    this.aviso.setText(T(t)).setVisible(true);
    this.avisoAte = this.time.now + 2000;
  }

  private clicar(x: number, y: number): void {
    const dentroDo = (i: number) => { const p = posicaoNoMapa(i); return Math.abs(x - (p.x - this.rolagem)) <= R && Math.abs(y - p.y) <= R; };
    for (let i = 0; i < this.total; i++) {
      if (!dentroDo(i)) continue;
      if (i >= this.fases.length) { this.avisar('ADVERSÁRIOS MAIS FORTES VIRÃO! PREPARE-SE'); return; }
      this.tocarFase(i);
      return;
    }
  }

  private tocarFase(i: number): void {
    if (!this.liberado(i, 'normal')) { this.avisar('COMPLETE O MODO NORMAL DA FASE ANTERIOR PRA LIBERAR'); som.tocar('menu'); return; }
    som.tocar('menu');
    this.abrirEscolha(i);
  }

  /** o quadro de escolha do modo, por cima do mapa (como o stageChoicePendingId do antigo) */
  private abrirEscolha(i: number): void {
    const f = this.fases[i];
    this.escolhida = f.id;
    const fundo = this.add.rectangle(0, 0, TELA_L, TELA_A, 0x040814, 0.92).setOrigin(0).setInteractive();
    const nome = texto(this, TELA_L / 2, 92, T(f.nome), 15, '#ffd23f', { fontFamily: "'Trebuchet MS', sans-serif", fontStyle: 'bold' }).setOrigin(0.5);
    const sub = texto(this, TELA_L / 2, 114, T('ESCOLHA O MODO'), 11, '#dbe6ff', { fontFamily: "'Trebuchet MS', sans-serif" }).setOrigin(0.5);
    this.escolha = this.add.container(0, 0, [fundo, nome, sub]).setDepth(100);
    this.nav.limpar();
    const voltar = botaoNav(this, this.nav, ret(20, 20, 42, 32), '←', () => this.fecharEscolha(), { cor: '#fff0a6', fonte: 18, prof: 101 });
    const modos: [ModoFase, string, string, number][] = [
      ['normal', 'NORMAL (ONDAS 1-5)', '#93c5fd', 130], ['hard', 'DIFÍCIL', '#f87171', 315], ['unlimited', 'SEM LIMITE', '#86efac', 500],
    ];
    const bs = [voltar];
    for (const [modo, rot, c, x] of modos) {
      const ok = this.liberado(i, modo);
      const b = botaoNav(this, this.nav, ret(x, 140, 170, 60), ok ? rot : `🔒 ${T(rot)}`, () => this.jogar(modo), { cor: ok ? c : '#64748b', fonte: modo === 'normal' ? 10 : 12, prof: 101 });
      if (!ok) { b.ligado = false; b.container.setAlpha(0.55); }
      bs.push(b);
    }
    this.escolha.setData('botoes', bs);
    this.nav.foco = 1;
    this.esq.container.setVisible(false);
    this.dir.container.setVisible(false);
  }

  private fecharEscolha(): void {
    const bs = (this.escolha?.getData('botoes') ?? []) as BotaoTela[];
    for (const b of bs) b.container.destroy();
    this.escolha?.destroy(true);
    this.escolha = null;
    this.escolhida = null;
    this.nav.limpar();
    // de volta a seta ←, a tela cheia e as fases
    const v = botaoNav(this, this.nav, ret(20, 20, 42, 32), '←', () => this.voltar(), { cor: '#fff0a6', fonte: 18 });
    void v;
    for (const a of this.alvosDasFases) this.nav.add(a);
    this.focoAntes = -1;
  }

  private jogar(modo: ModoFase): void {
    if (!this.escolhida) return;
    this.scene.start('Selecao', { modo: 'historia', fase: this.escolhida, modoFase: modo });
  }

  private posicionarAlvos(): void {
    this.fases.forEach((_, i) => {
      const a = this.alvosDasFases[i];
      const x = posicaoNoMapa(i).x - this.rolagem;
      a.x = inteiroNaTela(x) ? x - R : -9999;
    });
  }

  update(_t: number, dms: number): void {
    const dt = Math.min(0.1, dms / 1000);
    if (this.alvo !== null) {
      const d = this.alvo - this.rolagem;
      if (Math.abs(d) < 1) { this.rolagem = this.alvo; this.alvo = null; }
      else this.rolagem += d * Math.min(1, dt * 9);
    }
    // controle: o foco numa fase perto da borda traz a fase para o meio
    if (!this.escolha && this.nav.foco !== this.focoAntes) {
      this.focoAntes = this.nav.foco;
      const i = this.alvosDasFases.indexOf(this.nav.alvos[this.nav.foco]);
      if (i >= 0) {
        const x = posicaoNoMapa(i).x - this.rolagem;
        if (x < 140 || x > TELA_L - 140) this.rolarPara(posicaoNoMapa(i).x - TELA_L / 2);
      }
    }
    this.posicionarAlvos();
    if (!this.escolha) this.nav.desenhar();
    if (this.animT >= 0) { this.animT += dt; if (this.animT > 1.5) this.animT = -1; }
    if (this.aviso.visible && this.time.now > this.avisoAte) this.aviso.setVisible(false);
    if (!this.escolha) {
      this.esq.container.setVisible(this.rolagem > 0);
      this.dir.container.setVisible(this.rolagem < limitarRolagem(Infinity, this.total));
    }
    this.desenhar();
  }

  /** o quadro do mapa: o fundo e a estrada pelo antigo; as fases como no render de "stage_map" */
  private desenhar(): void {
    const l = this.legado, tex = this.tex;
    if (!l || !tex) return;
    const rol = this.rolagem;
    l.mapa.desenhar(rol, this.total, this.ultimaLiberada());
    const ctx = l.mapa.ctx() as CanvasRenderingContext2D;
    ctx.save();
    // faixa escura atrás do título
    const gr = ctx.createLinearGradient(0, 0, 0, 52);
    gr.addColorStop(0, 'rgba(6, 10, 26, 0.85)');
    gr.addColorStop(1, 'rgba(6, 10, 26, 0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, TELA_L, 52);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(T('ESCOLHA A FASE'), TELA_L / 2, 24);
    ctx.fillStyle = '#cfe0ff';
    ctx.font = '9px monospace';
    ctx.fillText(T('COMPLETE O MODO NORMAL (5 ONDAS) PRA LIBERAR A PRÓXIMA FASE'), TELA_L / 2, 38);

    const numero = (x: number, y: number, n: number, cor: string) => {
      ctx.fillStyle = '#0a1024';
      ctx.beginPath(); ctx.arc(x - R + 3, y - R + 3, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cor;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(n), x - R + 3, y - R + 6);
    };
    // fases futuras: escuras com cadeado; a primeira leva a placa
    for (let i = this.fases.length; i < this.total; i++) {
      const p = posicaoNoMapa(i), x = p.x - rol;
      if (!naTela(x)) continue;
      l.mapa.sombra(x, p.y, R);
      ctx.fillStyle = '#11131c';
      ctx.beginPath(); ctx.arc(x, p.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2c2f3c'; ctx.lineWidth = 2; ctx.stroke();
      l.mapa.cadeado(x, p.y - 2, R * 0.42, 0);
      numero(x, p.y, i + 1, '#55586a');
      if (i === this.fases.length) l.mapa.placa(x, p.y - R - 8);
    }
    const foco = this.escolha ? -1 : this.alvosDasFases.indexOf(this.nav.alvos[this.nav.foco]);
    this.fases.forEach((f, i) => {
      const p = posicaoNoMapa(i), x = p.x - rol, y = p.y;
      if (!naTela(x)) return;
      const aberta = this.liberado(i, 'normal');
      l.mapa.sombra(x, y, R);
      const chave = chaveFoto(f.id, !aberta);
      if (this.textures.exists(chave)) {
        ctx.save();
        if (!aberta) ctx.globalAlpha = 0.6;
        l.mapa.foto(x, y, R - 3, this.textures.get(chave).getSourceImage() as HTMLCanvasElement);
        ctx.restore();
      } else {
        ctx.fillStyle = aberta ? css(f.cor) : '#2a2d38';
        ctx.beginPath(); ctx.arc(x, y, R - 3, 0, Math.PI * 2); ctx.fill();
      }
      const sel = i === foco || f.id === this.escolhida || (foco < 0 && f.id === this.inicial);
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.strokeStyle = sel ? '#ffff00' : aberta ? css(f.cor) : '#3a3a48';
      ctx.lineWidth = sel ? 4 : aberta ? 3 : 2;
      ctx.stroke();
      const anim = this.animT >= 0 && f.id === this.liberou ? cadeadoAbrindo(this.animT) : null;
      if (!aberta) l.mapa.cadeado(x, y - 4, R * 0.42, 0);
      else if (anim) {
        ctx.save();
        ctx.globalAlpha = anim.alfa;
        ctx.translate(x, y - 4 + anim.queda * anim.queda * 40);
        ctx.rotate(anim.queda * 0.6);
        l.mapa.cadeado(0, 0, R * 0.42, anim.aberto);
        ctx.restore();
      }
      numero(x, y, i + 1, aberta ? '#ffffff' : '#6a6a78');
      const nome = T(f.nome);
      const rec = recordeDeOnda(this.recordes[f.id]);
      const linhas = aberta ? (rec > 0 ? 4 : 3) : 1;
      ctx.font = 'bold 9px monospace';
      const larg = Math.min(118, ctx.measureText(nome).width) + 10;
      ctx.fillStyle = 'rgba(8, 12, 30, 0.92)';
      ctx.fillRect(Math.round(x - larg / 2), Math.round(y + R + 3), Math.round(larg), linhas === 1 ? 12 : linhas * 9 + 5);
      ctx.fillStyle = aberta ? '#dbe6ff' : '#5a5a68';
      ctx.textAlign = 'center';
      ctx.fillText(nome, x, y + R + 12, 116);
      if (aberta) {
        const pr = this.prog[f.id] ?? {};
        ctx.font = '8px monospace';
        ctx.fillStyle = pr.normalDone ? '#ffd23f' : '#a7f3d0';
        ctx.fillText(T(pr.normalDone ? 'NORMAL ✓' : 'NORMAL: EM ABERTO'), x, y + R + 23);
        ctx.fillStyle = pr.hardDone ? '#ffd23f' : pr.normalDone ? '#93c5fd' : '#5a5a68';
        ctx.fillText(T(pr.hardDone ? 'DIFÍCIL ✓' : pr.normalDone ? 'DIFÍCIL: EM ABERTO' : 'DIFÍCIL: BLOQUEADO'), x, y + R + 32);
        if (rec > 0) {
          ctx.fillStyle = '#93c5fd';
          ctx.font = '7px monospace';
          ctx.fillText(TF('RECORDE: ONDA {0}', rec), x, y + R + 41);
        }
      }
    });
    ctx.restore();
    tex.refresh();
  }
}
