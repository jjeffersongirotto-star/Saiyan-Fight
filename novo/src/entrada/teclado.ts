// Ouve o teclado (event.code) e entrega a Entrada de cada jogador, com as teclas de OPÇÕES → CONTROLES PC.
// Gatilhos (especial/parry) ficam guardados até a lógica ler, então um toque rápido entre dois passos nunca se
// perde. No MODO MOUSE os botões do mouse também contam (ex.: ATAQUE no botão esquerdo, como no antigo).
import { entradaDoTeclado, mapaDasTeclas, TECLAS_P1, TECLAS_P2, type MapaTeclas } from '../logica/entrada';
import { opcoes, type AcaoTecla } from '../logica/opcoes';
import type { Entrada, IdJogador } from '../logica/tipos';

const BOTOES_MOUSE = ['MouseLeft', 'MouseMiddle', 'MouseRight'];
const CAMPO: Record<AcaoTecla, keyof MapaTeclas> = { up: 'cima', down: 'baixo', left: 'esquerda', right: 'direita', attack: 'atacar', charge: 'carregar', transform: 'transformar', parry: 'parry', special: 'especial' };

/** mapas da luta com as teclas escolhidas (as extras do novo valem se ninguém as usou) */
export function mapasDasOpcoes(): Record<IdJogador, MapaTeclas> {
  const t = opcoes().teclas;
  return {
    p1: mapaDasTeclas(t.p1, TECLAS_P1, new Set(Object.values(t.p2))),
    p2: mapaDasTeclas(t.p2, TECLAS_P2, new Set(Object.values(t.p1))),
  };
}

export class Teclado {
  private segurando = new Set<string>();
  private apertadas: Record<IdJogador, Set<string>> = { p1: new Set(), p2: new Set() };
  private mapas = mapasDasOpcoes();
  private usadas = new Set<string>();
  private mouse = false;
  private readonly desce = (ev: KeyboardEvent) => {
    if (this.usadas.has(ev.code)) ev.preventDefault();
    if (ev.repeat) return;
    this.segurando.add(ev.code);
    this.apertadas.p1.add(ev.code);
    this.apertadas.p2.add(ev.code);
  };
  private readonly sobe = (ev: KeyboardEvent) => this.segurando.delete(ev.code);
  private readonly perdeuFoco = () => this.segurando.clear();
  private readonly mouseDesce = (ev: PointerEvent) => {
    if (ev.pointerType !== 'mouse') return;
    const c = BOTOES_MOUSE[ev.button];
    if (!c) return;
    this.segurando.add(c);
    this.apertadas.p1.add(c);
    this.apertadas.p2.add(c);
  };
  private readonly mouseSobe = (ev: PointerEvent) => { if (ev.pointerType === 'mouse') this.segurando.delete(BOTOES_MOUSE[ev.button] ?? ''); };
  private readonly semMenu = (ev: Event) => { if (this.mouse) ev.preventDefault(); };

  ligar(): void {
    this.recarregar();
    window.addEventListener('keydown', this.desce);
    window.addEventListener('keyup', this.sobe);
    window.addEventListener('blur', this.perdeuFoco);
    window.addEventListener('pointerdown', this.mouseDesce, true);
    window.addEventListener('pointerup', this.mouseSobe, true);
    window.addEventListener('contextmenu', this.semMenu, true);
  }
  desligar(): void {
    window.removeEventListener('keydown', this.desce);
    window.removeEventListener('keyup', this.sobe);
    window.removeEventListener('blur', this.perdeuFoco);
    window.removeEventListener('pointerdown', this.mouseDesce, true);
    window.removeEventListener('pointerup', this.mouseSobe, true);
    window.removeEventListener('contextmenu', this.semMenu, true);
    this.segurando.clear();
  }

  /** relê as teclas (voltou da pausa → OPÇÕES) */
  recarregar(): void {
    this.mapas = mapasDasOpcoes();
    this.usadas = new Set([...Object.values(this.mapas.p1).flat(), ...Object.values(this.mapas.p2).flat()]);
    this.mouse = opcoes().modoPc === 'mouse';
  }

  /** limpa tudo (pausa: nada fica "preso" apertado) */
  soltar(): void {
    this.segurando.clear();
    this.apertadas.p1.clear();
    this.apertadas.p2.clear();
  }

  ler(id: IdJogador): Entrada {
    const m = this.mapas[id];
    if (this.mouse) {
      // botões do mouse escolhidos para alguma ação deste jogador
      const t = opcoes().teclas[id];
      for (const a of Object.keys(CAMPO) as AcaoTecla[]) if (t[a].startsWith('Mouse') && !m[CAMPO[a]].includes(t[a])) m[CAMPO[a]] = [...m[CAMPO[a]], t[a]];
    }
    const ent = entradaDoTeclado(m, this.segurando, this.apertadas[id]);
    this.apertadas[id].clear();
    return ent;
  }
}
