// Passo fixo: o desenho roda na velocidade da tela (30, 60, 120 Hz...), a lógica sempre a 60 passos por segundo.
import { PASSO_MS, PASSOS_MAX_POR_QUADRO } from './constantes';

export class RelogioFixo {
  private acumulado = 0;
  constructor(private readonly passoMs = PASSO_MS, private readonly maxPassos = PASSOS_MAX_POR_QUADRO) {}

  /** Recebe o tempo do quadro (ms) e diz quantos passos de lógica rodar agora. */
  avancar(dtMs: number): number {
    if (!(dtMs > 0)) return 0;
    this.acumulado += Math.min(dtMs, this.passoMs * this.maxPassos);
    let n = Math.floor(this.acumulado / this.passoMs);
    if (n > this.maxPassos) n = this.maxPassos;
    this.acumulado -= n * this.passoMs;
    if (this.acumulado > this.passoMs) this.acumulado = this.passoMs; // aba voltou de segundo plano: não acumula atraso
    return n;
  }

  /** 0..1: quanto já andou para o próximo passo (para interpolar o desenho). */
  get alfa(): number {
    return this.acumulado / this.passoMs;
  }

  zerar(): void {
    this.acumulado = 0;
  }
}

export const interpolar = (a: number, b: number, t: number) => a + (b - a) * t;
