import type { MinionAgarravel } from './minions';
import type { Regras } from './constantes';
export type IdJogador = 'p1' | 'p2';

/** O que cada jogador está apertando NESTE passo. atacar/carregar = segurando; especial/parry/transformar = acabou de apertar. */
export interface Entrada {
  x: number; // -1..1
  y: number; // -1..1 (positivo = para baixo)
  atacar: boolean;
  carregar: boolean;
  especial: boolean;
  parry: boolean;
  transformar: boolean;
}

// Como o herói do jogo antigo: apanhar e soltar o especial NÃO travam o lutador (só a pose de transformar trava).
export type Acao = 'livre' | 'carregando' | 'transformando' | 'caido' | 'vitoria';

/** Ficha de um personagem para a luta: só o que a lógica precisa (vem de dados/personagens.ts). */
export interface FichaLuta {
  personagem: string;
  /** altura (cm) de cada forma; alturas.length - 1 = última transformação */
  alturas: number[];
  /** especial lento (o sol do Freeza): o dano demora a chegar */
  especialLento: boolean;
}

export interface Lutador {
  id: IdJogador;
  personagem: string;
  alturas: number[];
  especialLento: boolean;
  x: number; // centro da caixa
  y: number;
  l: number; // tamanho da caixa (muda com a altura da forma)
  a: number;
  xAnt: number; // posição no passo anterior (o desenho interpola entre os dois)
  yAnt: number;
  movX: number; // para onde andou neste passo (-1..1), escolhe a pose de voo
  movY: number;
  olhando: 1 | -1;
  vida: number;
  vidaMax: number;
  ki: number;
  nivel: number; // 0 = forma normal
  poder: number; // quadros restantes do bônus da transformação
  acao: Acao;
  acaoQuadros: number;
  poseTiro: number;
  poseParry: number;
  esperaTiro: number;
  esperaParry: number;
  invulneravel: number;
  /** quadros da pose de "apanhou" (só o desenho: apanhar não trava, como o herói do jogo antigo) */
  poseAtingido: number;
  /** nível da aura 0..1 (kiAuraLevel): o desenho e o círculo do parry crescem com ele */
  nivelAura: number;
  /** quadros do brilho do parry (parryHighlightTimer): enquanto dura, segurar ATAQUE não atira */
  ondaParry: number;
  /** o próprio raio (ou o choque) está na tela: pose de especial */
  emEspecial: boolean;
  /** combo de parry (rebatidas seguidas): dá ki de bônus a cada degrau; apanhar ou 90 quadros sem rebater zera */
  comboParry: number;
  comboParryQuadros: number;
  ultimoBonusParry: number;
  zenkaiUsada: boolean;
  atacarAntes: boolean;
  pedidoEspecial: number;
  pedidoParry: number;
  pedidoTransformar: number;
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
  /** quem atirou (o desenho do tiro continua o dele depois do parry, como no jogo antigo) */
  atirador: IdJogador;
}

export interface Raio {
  dono: IdJogador;
  idade: number;
  duracao: number;
  /** idade em que o raio chega no alvo e o dano entra */
  chega: number;
  sol: boolean;
  acertou: boolean;
}

export interface Choque {
  idade: number;
  apertos: Record<IdJogador, number>;
  /** -1..1: positivo = empurrado para o lado do P2 (o P1 está ganhando) */
  empurrao: number;
}

export type Fase = 'luta' | 'fimRodada' | 'fimPartida';

export type Evento =
  | { tipo: 'tiro'; dono: IdJogador }
  | { tipo: 'acerto'; alvo: IdJogador; dano: number; deEspecial: boolean; direcao: number }
  | { tipo: 'parry'; dono: IdJogador; refletidos: number; bonusKi: number }
  | { tipo: 'especial'; dono: IdJogador; sol: boolean; agarradosDestruidos: number }
  | { tipo: 'transformou'; dono: IdJogador; nivel: number; arremessados: number }
  | { tipo: 'kiCheio'; dono: IdJogador }
  | { tipo: 'zenkai'; dono: IdJogador }
  | { tipo: 'choque' }
  | { tipo: 'apertoChoque'; dono: IdJogador }
  | { tipo: 'fimChoque'; dano: Record<IdJogador, number> }
  | { tipo: 'fimRodada'; vencedor: IdJogador | null }
  | { tipo: 'novaRodada'; rodada: number }
  | { tipo: 'fimPartida'; vencedor: IdJogador };

export interface EstadoLuta {
  /** as diferenças em relação ao jogo antigo que estão ligadas nesta luta (constantes.ts) */
  regras: Regras;
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
  choque: Choque | null;
  /** minions na tela (Fase 3: modo história; no VERSUS fica vazia) */
  minions: MinionAgarravel[];
  proximoId: number;
  semente: number;
}

export const ENTRADA_VAZIA: Entrada = { x: 0, y: 0, atacar: false, carregar: false, especial: false, parry: false, transformar: false };
