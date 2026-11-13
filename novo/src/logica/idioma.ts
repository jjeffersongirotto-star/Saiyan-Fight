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
  'J1: setas mover · F atacar · S carregar · Q especial · Espaço parry': [
    'P1: arrows move · F attack · S charge · Q special · Space parry',
    'J1: flechas mover · F atacar · S cargar · Q especial · Espacio parry',
  ],
  'J2: IJKL mover · U atacar · O carregar · Y especial · P parry (ou teclado numérico)': [
    'P2: IJKL move · U attack · O charge · Y special · P parry (or numpad)',
    'J2: IJKL mover · U atacar · O cargar · Y especial · P parry (o teclado numérico)',
  ],
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
