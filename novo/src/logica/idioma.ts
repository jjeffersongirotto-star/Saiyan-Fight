// Textos em PT/EN/ES. O texto em português é a chave (como IDIOMA_LINHAS no jogo antigo) e o idioma escolhido
// fica salvo na mesma chave do jogo antigo (saiyan_idioma), então quem já escolheu EN/ES continua igual.
export type Idioma = 'pt' | 'en' | 'es';
export const IDIOMAS: Idioma[] = ['pt', 'en', 'es'];
export const CHAVE_IDIOMA = 'saiyan_idioma';

const LINHAS: Record<string, [string, string]> = {
  CARREGANDO: ['LOADING', 'CARGANDO'],
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
  PAUSA: ['PAUSED', 'PAUSA'],
  CONTINUAR: ['RESUME', 'CONTINUAR'],
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
  // modo história (os nomes das fases e dos itens são os mesmos do idiomas.js do jogo antigo)
  'MODO HISTÓRIA': ['STORY MODE', 'MODO HISTORIA'],
  'ESCOLHA A ARENA': ['CHOOSE THE ARENA', 'ELIGE LA ARENA'],
  'ALEATÓRIA': ['RANDOM', 'ALEATORIA'],
  'ESCOLHA A FASE': ['CHOOSE THE STAGE', 'ELIGE LA FASE'],
  'ESCOLHA O SEU HERÓI': ['CHOOSE YOUR HERO', 'ELIGE TU HÉROE'],
  NORMAL: ['NORMAL', 'NORMAL'],
  'DIFÍCIL': ['HARD', 'DIFÍCIL'],
  'SEM LIMITE': ['ENDLESS', 'SIN LÍMITE'],
  BLOQUEADA: ['LOCKED', 'BLOQUEADA'],
  'VENÇA O NORMAL DA FASE ANTERIOR': ['BEAT THE PREVIOUS STAGE ON NORMAL', 'GANA EL NORMAL DE LA FASE ANTERIOR'],
  'VENÇA O NORMAL PARA LIBERAR O DIFÍCIL': ['BEAT NORMAL TO UNLOCK HARD', 'GANA EL NORMAL PARA DESBLOQUEAR EL DIFÍCIL'],
  'VENÇA O DIFÍCIL PARA LIBERAR O SEM LIMITE': ['BEAT HARD TO UNLOCK ENDLESS', 'GANA EL DIFÍCIL PARA DESBLOQUEAR SIN LÍMITE'],
  ONDA: ['WAVE', 'OLEADA'],
  'NÍVEL': ['LEVEL', 'NIVEL'],
  PONTOS: ['SCORE', 'PUNTOS'],
  VIDA: ['LIFE', 'VIDA'],
  RECORDE: ['RECORD', 'RÉCORD'],
  'FASE COMPLETA!': ['STAGE CLEAR!', '¡FASE COMPLETADA!'],
  'FIM DE JOGO': ['GAME OVER', 'FIN DEL JUEGO'],
  'VOLTOU MAIS FORTE!': ['IS BACK STRONGER!', '¡VOLVIÓ MÁS FUERTE!'],
  'AGARRADO! CARREGUE OU DÊ PARRY!': ['GRABBED! CHARGE OR PARRY!', '¡ATRAPADO! ¡CARGA O HAZ PARRY!'],
  'SUPER ATAQUE!': ['SUPER ATTACK!', '¡SUPER ATAQUE!'],
  'PRÓXIMA FASE LIBERADA!': ['NEXT STAGE UNLOCKED!', '¡SIGUIENTE FASE DESBLOQUEADA!'],
  'DIFÍCIL LIBERADO!': ['HARD UNLOCKED!', '¡DIFÍCIL DESBLOQUEADO!'],
  'SEM LIMITE LIBERADO!': ['ENDLESS UNLOCKED!', '¡SIN LÍMITE DESBLOQUEADO!'],
  'TENTAR DE NOVO': ['TRY AGAIN', 'INTENTAR DE NUEVO'],
  'PRÓXIMA FASE': ['NEXT STAGE', 'SIGUIENTE FASE'],
  MAPA: ['MAP', 'MAPA'],
  TEMPO: ['TIME', 'TIEMPO'],
  ATAQUES: ['ATTACKS', 'ATAQUES'],
  REBATIDAS: ['PARRIES', 'PARRIES'],
  'GOLPES RECEBIDOS': ['HITS TAKEN', 'GOLPES RECIBIDOS'],
  MINIONS: ['MINIONS', 'MINIONS'],
  ITENS: ['ITEMS', 'OBJETOS'],
  'FEIJÃO MÁGICO': ['SENZU BEAN', 'SEMILLA DEL ERMITAÑO'],
  ESCUDO: ['SHIELD', 'ESCUDO'],
  'NUVEM VOADORA': ['FLYING NIMBUS', 'NUBE VOLADORA'],
  'BASTÃO MÁGICO': ['POWER POLE', 'BÁCULO SAGRADO'],
  'ILHA DO MESTRE KAME': ["MASTER ROSHI'S ISLAND", 'ISLA DEL MAESTRO ROSHI'],
  'TORNEIO ARTES MARCIAIS': ['MARTIAL ARTS TOURNAMENT', 'TORNEO DE ARTES MARCIALES'],
  'PLANETA DO SR. KAIOH': ["KING KAI'S PLANET", 'PLANETA DEL SR. KAIO'],
  'PLANETA NAMEK': ['PLANET NAMEK', 'PLANETA NAMEK'],
  'NAVE DE FREEZA': ["FREEZA'S SHIP", 'NAVE DE FREEZA'],
  'NAMEK PRESTES A EXPLODIR': ['NAMEK ABOUT TO EXPLODE', 'NAMEK A PUNTO DE EXPLOTAR'],
  'SALA DO TEMPO': ['TIME CHAMBER', 'HABITACIÓN DEL TIEMPO'],
  'TORNEIO DE CELL': ['CELL GAMES', 'JUEGOS DE CELL'],
  'PLANETA SUPREMO KAIOH': ["SUPREME KAI'S PLANET", 'PLANETA DEL SUPREMO KAIO'],
  'PLATAFORMA CELESTIAL': ['CELESTIAL LOOKOUT', 'PLATAFORMA CELESTIAL'],
  'CAPITAL DO OESTE': ['WEST CITY', 'CAPITAL DEL OESTE'],
  'ATUALIZAÇÕES': ["UPDATES", "ACTUALIZACIONES"],
  '⟳ ATUALIZAÇÕES': ["⟳ UPDATES", "⟳ ACTUALIZACIONES"],
  '⟳ ATUALIZAR': ["⟳ UPDATE", "⟳ ACTUALIZAR"],
  ATUALIZAR: ["UPDATE", "ACTUALIZAR"],
  'VERSÃO': ["VERSION", "VERSIÓN"],
  APP: ["APP", "APP"],
  'BAIXAR APP': ["GET THE APP", "DESCARGAR APP"],
  'JOGO ANTIGO': ["OLD GAME", "JUEGO ANTIGUO"],
  'VERIFICANDO...': ["CHECKING...", "VERIFICANDO..."],
  'JÁ ESTÁ ATUALIZADO': ["ALREADY UP TO DATE", "YA ESTÁ ACTUALIZADO"],
  'SEM CONEXÃO': ["NO CONNECTION", "SIN CONEXIÓN"],
  'ERRO AO ATUALIZAR': ["UPDATE FAILED", "ERROR AL ACTUALIZAR"],
  'BAIXANDO...': ["DOWNLOADING...", "DESCARGANDO..."],
  'ATUALIZANDO...': ["UPDATING...", "ACTUALIZANDO..."],
  'ATUALIZAR AGORA?': ["UPDATE NOW?", "¿ACTUALIZAR AHORA?"],
  'NOVA VERSÃO': ["NEW VERSION", "NUEVA VERSIÓN"],
  'AGORA NÃO': ["NOT NOW", "AHORA NO"],
  BAIXAR: ["DOWNLOAD", "DESCARGAR"],
  'Saiu a versão': ["New version", "Salió la versión"],
  'O jogo baixa a versão nova e reinicia; o progresso continua salvo.': ["The game downloads it and restarts; your progress stays saved.", "El juego descarga la versión nueva y se reinicia; el progreso sigue guardado."],
  'Esta versão do jogo precisa do app novo. Baixar o APK agora? Depois é só instalar por cima: o progresso continua salvo.': ["This version needs the new app. Download the APK now? Just install it over the old one: your progress stays saved.", "Esta versión necesita la app nueva. ¿Descargar el APK ahora? Luego instálalo encima: el progreso sigue guardado."],
  'NO SITE O JOGO JÁ ABRE SEMPRE NA VERSÃO MAIS NOVA': ["ON THE WEBSITE THE GAME ALWAYS OPENS IN THE LATEST VERSION", "EN EL SITIO EL JUEGO SIEMPRE ABRE EN LA VERSIÓN MÁS NUEVA"],
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
