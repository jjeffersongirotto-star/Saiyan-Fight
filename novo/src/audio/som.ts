// Som do jogo: os efeitos sintetizados e as 11 trilhas do jogo antigo (audio.js), em Web Audio puro, sem arquivos.
// As contas (notas, passos, qual som) ficam em logica/musica.ts. O navegador só deixa ligar o áudio depois de um
// toque/tecla: o contexto é criado no 1º toque em qualquer lugar (criar na hora da luta engasgava o celular).
import { TEMAS, type IdTema } from '../dados/temas';
import { duracaoDoPasso, SONS, tocarPasso, type NomeSom, type NotaTocada } from '../logica/musica';

const CHAVE_PREFS = 'saiyan-novo-som';
interface Prefs { mudo: boolean; volEfeitos: number; volMusica: number }

class Audio {
  private ctx: AudioContext | null = null;
  private ruido: AudioBuffer | null = null;
  private relogio: number | null = null;
  private tema: IdTema | null = null;
  private passo = 0;
  private proximo = 0;
  prefs: Prefs = { mudo: false, volEfeitos: 0.5, volMusica: 0.5 };

  constructor() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_PREFS) ?? 'null');
      if (salvo) this.prefs = { ...this.prefs, ...salvo };
    } catch { /* sem localStorage: fica o padrão */ }
    if (typeof document !== 'undefined') {
      const eventos = ['pointerdown', 'touchstart', 'keydown'] as const;
      const ligar = () => {
        this.ligar();
        for (const t of eventos) document.removeEventListener(t, ligar, true);
      };
      for (const t of eventos) document.addEventListener(t, ligar, { capture: true, passive: true });
      // aba escondida / app em segundo plano: a música para; volta quando aparecer
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else void this.ctx.resume();
      });
    }
  }

  private salvar(): void {
    try { localStorage.setItem(CHAVE_PREFS, JSON.stringify(this.prefs)); } catch { /* ignora */ }
  }

  /** cria/retoma o contexto (precisa de um toque antes) */
  ligar(): boolean {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return false;
      try { this.ctx = new Ctx(); } catch { return false; }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    return true;
  }

  get mudo(): boolean { return this.prefs.mudo; }
  alternarMudo(): boolean {
    this.prefs.mudo = !this.prefs.mudo;
    this.salvar();
    return this.prefs.mudo;
  }

  /** efeito sonoro (playSound) */
  tocar(nome: NomeSom): void {
    const ctx = this.ctx, vol = this.prefs.volEfeitos;
    if (!ctx || this.prefs.mudo || vol <= 0) return;
    const s = SONS[nome], t = ctx.currentTime;
    const osc = ctx.createOscillator(), ganho = ctx.createGain();
    osc.type = s.onda;
    osc.frequency.setValueAtTime(s.de, t);
    if (s.rampa === 'exp') osc.frequency.exponentialRampToValueAtTime(s.para, t + s.dur);
    else osc.frequency.linearRampToValueAtTime(s.para, t + s.dur);
    ganho.gain.setValueAtTime(s.vol * vol, t);
    ganho.gain.linearRampToValueAtTime(0.01 * vol, t + s.dur);
    osc.connect(ganho).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + s.dur);
  }

  /** troca a trilha (null = silêncio). Tocar a mesma que já toca não recomeça. */
  musica(id: IdTema | null): void {
    if (id === this.tema && this.relogio !== null) return;
    this.pararMusica();
    if (!id) return;
    this.tema = id;
    this.passo = 0;
    this.proximo = 0;
    // agenda um pouco à frente a cada 25 ms (startThemeLoop): o tempo da música não depende do quadro do jogo
    this.relogio = window.setInterval(() => this.agendar(), 25);
  }

  get musicaAtual(): IdTema | null { return this.relogio !== null ? this.tema : null; }

  pararMusica(): void {
    if (this.relogio !== null) window.clearInterval(this.relogio);
    this.relogio = null;
    this.tema = null;
  }

  private agendar(): void {
    const ctx = this.ctx;
    if (!ctx || !this.tema || this.prefs.mudo || ctx.state !== 'running') { this.proximo = 0; return; }
    const tema = TEMAS[this.tema], seg = duracaoDoPasso(tema), agora = ctx.currentTime;
    if (this.proximo < agora) this.proximo = agora + 0.03;
    while (this.proximo < agora + 0.12) {
      const p = tocarPasso(tema, this.passo, this.prefs.volMusica);
      const t = this.proximo + p.atraso;
      for (const n of p.notas) this.nota(ctx, n, t);
      for (const b of p.bateria) this.bateria(ctx, b.tipo, b.vol, t);
      this.proximo += seg;
      this.passo++;
    }
  }

  private nota(ctx: AudioContext, n: NotaTocada, t: number): void {
    const osc = ctx.createOscillator(), ganho = ctx.createGain();
    osc.type = n.onda;
    osc.frequency.setValueAtTime(n.freq, t);
    if (n.vibrato) {
      const lfo = ctx.createOscillator(), g = ctx.createGain();
      lfo.frequency.setValueAtTime(5.5, t);
      g.gain.setValueAtTime(n.vibrato, t);
      lfo.connect(g).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + n.dur + 0.05);
    }
    ganho.gain.setValueAtTime(0.0008, t);
    ganho.gain.linearRampToValueAtTime(n.vol, t + 0.012);
    ganho.gain.exponentialRampToValueAtTime(0.0008, t + n.dur);
    osc.connect(ganho).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + n.dur + 0.02);
  }

  private bateria(ctx: AudioContext, tipo: 'bumbo' | 'caixa' | 'chimbal' | 'prato', vol: number, t: number): void {
    if (tipo === 'bumbo') {
      const osc = ctx.createOscillator(), ganho = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      ganho.gain.setValueAtTime(vol * 1.6, t);
      ganho.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
      osc.connect(ganho).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
      return;
    }
    if (!this.ruido) {
      const n = Math.floor(ctx.sampleRate * 0.6);
      this.ruido = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = this.ruido.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource(), ganho = ctx.createGain();
    const dur = tipo === 'prato' ? 0.55 : tipo === 'caixa' ? 0.12 : 0.035;
    const nivel = tipo === 'prato' ? vol * 0.8 : tipo === 'caixa' ? vol : vol * 0.45;
    src.buffer = this.ruido;
    ganho.gain.setValueAtTime(Math.max(0.0009, nivel), t);
    ganho.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(ganho).connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.01);
  }
}

/** um só para o jogo todo (as cenas trocam a trilha) */
export const som = new Audio();

/** vibração curta no celular (vibrate do jogo antigo); ignora onde não tem */
export function vibrar(padrao: number | number[]): void {
  try { navigator.vibrate?.(padrao); } catch { /* ignora */ }
}
