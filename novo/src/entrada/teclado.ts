// Ouve o teclado (event.code) e entrega a Entrada de cada jogador. Gatilhos (especial/parry) ficam guardados
// até a lógica ler, então um toque rápido entre dois passos nunca se perde.
import { entradaDoTeclado, TECLAS_DO_JOGO, TECLAS_P1, TECLAS_P2 } from '../logica/entrada';
import type { Entrada, IdJogador } from '../logica/tipos';

export class Teclado {
  private segurando = new Set<string>();
  private apertadas: Record<IdJogador, Set<string>> = { p1: new Set(), p2: new Set() };
  private readonly desce = (ev: KeyboardEvent) => {
    if (TECLAS_DO_JOGO.has(ev.code)) ev.preventDefault();
    if (ev.repeat) return;
    this.segurando.add(ev.code);
    this.apertadas.p1.add(ev.code);
    this.apertadas.p2.add(ev.code);
  };
  private readonly sobe = (ev: KeyboardEvent) => this.segurando.delete(ev.code);
  private readonly perdeuFoco = () => this.segurando.clear();

  ligar(): void {
    window.addEventListener('keydown', this.desce);
    window.addEventListener('keyup', this.sobe);
    window.addEventListener('blur', this.perdeuFoco);
  }
  desligar(): void {
    window.removeEventListener('keydown', this.desce);
    window.removeEventListener('keyup', this.sobe);
    window.removeEventListener('blur', this.perdeuFoco);
    this.segurando.clear();
  }

  ler(id: IdJogador): Entrada {
    const ent = entradaDoTeclado(id === 'p1' ? TECLAS_P1 : TECLAS_P2, this.segurando, this.apertadas[id]);
    this.apertadas[id].clear();
    return ent;
  }
}
