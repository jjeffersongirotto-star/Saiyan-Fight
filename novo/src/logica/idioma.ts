// Textos em PT/EN/ES. O texto em português é a chave (como IDIOMA_LINHAS no jogo antigo) e o idioma escolhido
// fica salvo na mesma chave do jogo antigo (saiyan_idioma), então quem já escolheu EN/ES continua igual.
export type Idioma = 'pt' | 'en' | 'es';
export const IDIOMAS: Idioma[] = ['pt', 'en', 'es'];
export const CHAVE_IDIOMA = 'saiyan_idioma';

const LINHAS: Record<string, [string, string]> = {
  CARREGANDO: ['LOADING', 'CARGANDO'],
  'PRÉVIA PHASER': ['PHASER PREVIEW', 'VISTA PREVIA PHASER'],
  '1 JOGADOR (CONTRA A CPU)': ['1 PLAYER (VS CPU)', '1 JUGADOR (CONTRA LA CPU)'],
  '2 JOGADORES (VERSUS)': ['2 PLAYERS (VERSUS)', '2 JUGADORES (VERSUS)'],
  IDIOMA: ['LANGUAGE', 'IDIOMA'],
  'TELA CHEIA': ['FULLSCREEN', 'PANTALLA COMPLETA'],
  RODADA: ['ROUND', 'RONDA'],
  'LUTEM!': ['FIGHT!', '¡PELEEN!'],
  VENCEU: ['WINS', 'GANA'],
  EMPATE: ['DRAW', 'EMPATE'],
  'VENCEU A PARTIDA!': ['WINS THE MATCH!', '¡GANA LA PARTIDA!'],
  'JOGAR DE NOVO': ['PLAY AGAIN', 'JUGAR DE NUEVO'],
  MENU: ['MENU', 'MENÚ'],
  ATAQUE: ['ATTACK', 'ATAQUE'],
  CARREGAR: ['CHARGE', 'CARGAR'],
  ESPECIAL: ['SPECIAL', 'ESPECIAL'],
  PARRY: ['PARRY', 'PARRY'],
  'GIRE O CELULAR': ['TURN YOUR PHONE', 'GIRA EL CELULAR'],
  'J1: setas mover · F atacar · S carregar · A transformar · Q especial · Espaço parry': [
    'P1: arrows move · F attack · S charge · A transform · Q special · Space parry',
    'J1: flechas mover · F atacar · S cargar · A transformar · Q especial · Espacio parry',
  ],
  'J2: IJKL mover · U atacar · O carregar · H transformar · Y especial · P parry (ou teclado numérico)': [
    'P2: IJKL move · U attack · O charge · H transform · Y special · P parry (or numpad)',
    'J2: IJKL mover · U atacar · O cargar · H transformar · Y especial · P parry (o teclado numérico)',
  ],
  'CHOQUE! APERTE ATAQUE!': ['CLASH! MASH ATTACK!', '¡CHOQUE! ¡APRIETA ATAQUE!'],
  'TROCAR PERSONAGENS': ['CHANGE FIGHTERS', 'CAMBIAR PERSONAJES'],
  'JOGADOR 1: ESCOLHA O LUTADOR': ['PLAYER 1: CHOOSE YOUR FIGHTER', 'JUGADOR 1: ELIGE TU LUCHADOR'],
  'JOGADOR 2: ESCOLHA O LUTADOR': ['PLAYER 2: CHOOSE YOUR FIGHTER', 'JUGADOR 2: ELIGE TU LUCHADOR'],
  'ESCOLHA O ADVERSÁRIO (CPU)': ['CHOOSE THE OPPONENT (CPU)', 'ELIGE EL RIVAL (CPU)'],
  FORMAS: ['FORMS', 'FORMAS'],
  'ALEATÓRIO': ['RANDOM', 'ALEATORIO'],
  VOLTAR: ['BACK', 'VOLVER'],
  'SOM: LIGADO': ['SOUND: ON', 'SONIDO: SÍ'],
  'SOM: DESLIGADO': ['SOUND: OFF', 'SONIDO: NO'],
  'TRILHAS SONORAS': ['SOUNDTRACKS', 'BANDAS SONORAS'],
  'TOQUE NUMA TRILHA PARA OUVIR (DE NOVO PARA PAUSAR)': ['TAP A TRACK TO LISTEN (AGAIN TO PAUSE)', 'TOCA UNA PISTA PARA ESCUCHAR (OTRA VEZ PARA PAUSAR)'],
  'SOM DESLIGADO NO MENU': ['SOUND IS OFF IN THE MENU', 'SONIDO APAGADO EN EL MENÚ'],
  'HERÓI': ['HERO', 'HÉROE'],
  'ANTI-HERÓI': ['ANTI-HERO', 'ANTIHÉROE'],
  'VILÃO': ['VILLAIN', 'VILLANO'],
};

let atual: Idioma = 'pt';

export function idiomaAtual(): Idioma {
  return atual;
}
export function definirIdioma(id: Idioma, salvar = true): void {
  if (!IDIOMAS.includes(id)) return;
  atual = id;
  if (salvar) {
    try { localStorage.setItem(CHAVE_IDIOMA, id); } catch { /* sem localStorage: só nesta sessão */ }
  }
}
/** Lê o idioma salvo (ou o do aparelho) ao abrir o jogo. */
export function carregarIdioma(): Idioma {
  let id: string | null = null;
  try { id = localStorage.getItem(CHAVE_IDIOMA); } catch { /* ignora */ }
  if (!id && typeof navigator !== 'undefined') id = navigator.language?.slice(0, 2) ?? null;
  definirIdioma(IDIOMAS.includes(id as Idioma) ? (id as Idioma) : 'pt', false);
  return atual;
}

/** Traduz um texto em português. Sem linha cadastrada: devolve o próprio texto (os testes pegam isso). */
export function T(texto: string): string {
  if (atual === 'pt') return texto;
  const linha = LINHAS[texto];
  return linha ? linha[atual === 'en' ? 0 : 1] : texto;
}
export const textosCadastrados = () => Object.keys(LINHAS);
