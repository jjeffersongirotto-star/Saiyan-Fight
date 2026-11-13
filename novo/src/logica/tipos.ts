export type IdJogador = 'p1' | 'p2';

/** O que cada jogador está apertando NESTE passo. atacar/carregar = segurando; especial/parry = acabou de apertar. */
export interface Entrada {
  x: number; // -1..1
  y: number; // -1..1 (positivo = para baixo)
  atacar: boolean;
  carregar: boolean;
  especial: boolean;
  parry: boolean;
}

export type Acao = 'livre' | 'carregando' | 'parry' | 'especial' | 'atingido' | 'caido' | 'vitoria';

export interface Lutador {
  id: IdJogador;
  personagem: string;
  x: number; // centro da caixa
  y: number;
  xAnt: number; // posição no passo anterior (o desenho interpola entre os dois)
  yAnt: number;
  movX: number; // para onde andou neste passo (-1..1), escolhe a pose de voo
  movY: number;
  olhando: 1 | -1;
  vida: number;
  vidaMax: number;
  ki: number;
  acao: Acao;
  acaoQuadros: number; // quadros que a ação já durou
  poseTiro: number; // >0 = mostrando a pose de tiro
  esperaTiro: number;
  esperaParry: number;
  parryAcertou: boolean;
  invulneravel: number;
  empurraoX: number;
  /** gatilhos guardados por alguns quadros: apertar ESPECIAL/PARRY um pouco antes de poder ainda vale */
  pedidoEspecial: number;
  pedidoParry: number;
}

export interface Tiro {
  id: number;
  dono: IdJogador;
  x: number;
  y: number;
  vx: number;
  vy: number;
  raio: number;
  dano: number;
  refletido: boolean;
}

export interface Raio {
  dono: IdJogador;
  /** quadros desde que o raio saiu */
  idade: number;
  x0: number;
  y: number;
  direcao: 1 | -1;
  acertou: boolean;
}

export type Fase = 'luta' | 'fimRodada' | 'fimPartida';

export type Evento =
  | { tipo: 'tiro'; dono: IdJogador }
  | { tipo: 'acerto'; alvo: IdJogador; dano: number; deEspecial: boolean }
  | { tipo: 'parry'; dono: IdJogador }
  | { tipo: 'reflexo'; dono: IdJogador }
  | { tipo: 'especial'; dono: IdJogador }
  | { tipo: 'raio'; dono: IdJogador }
  | { tipo: 'fimRodada'; vencedor: IdJogador | null }
  | { tipo: 'novaRodada'; rodada: number }
  | { tipo: 'fimPartida'; vencedor: IdJogador };

export interface EstadoLuta {
  quadro: number;
  rodada: number;
  placar: Record<IdJogador, number>;
  fase: Fase;
  faseQuadros: number;
  vencedorRodada: IdJogador | null;
  vencedorPartida: IdJogador | null;
  p1: Lutador;
  p2: Lutador;
  tiros: Tiro[];
  raios: Raio[];
  proximoId: number;
  semente: number;
}

export const ENTRADA_VAZIA: Entrada = { x: 0, y: 0, atacar: false, carregar: false, especial: false, parry: false };
