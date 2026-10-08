// ==================== IDIOMAS (Português / English / Español) ====================
// O texto em português é a chave: T("CONTINUAR") devolve a versão do idioma escolhido (ou o próprio texto, se
// não houver tradução). Não traduz nomes de personagens e de golpes, nem palavras que todo mundo conhece (PARRY,
// KI, COMBO...). É adaptação, não tradução ao pé da letra.
//  - Canvas: instalarTraducaoNoCanvas(ctx) troca o texto em fillText/strokeText/measureText (database.js chama
//    logo depois de criar o ctx), então os desenhos dos menus não precisam mudar.
//  - HTML: traduzirDom percorre os textos (e title/placeholder/aria-label) guardando o original; um
//    MutationObserver traduz o que o jogo escrever depois (alertas, editor). As notas antigas de #lista-updates
//    ficam em português (histórico).
// Carrega logo depois de storage.js.

const IDIOMA_CHAVE = "saiyan_idioma";
const IDIOMAS_DISPONIVEIS = [
    { id: "pt", nome: "PORTUGUÊS" },
    { id: "en", nome: "ENGLISH" },
    { id: "es", nome: "ESPAÑOL" }
];
let idiomaAtual = (() => {
    const v = typeof readStorage === "function" ? readStorage(IDIOMA_CHAVE) : null;
    return v === "en" || v === "es" ? v : "pt";
})();

// Uma linha por texto: PORTUGUÊS § ENGLISH § ESPAÑOL
const IDIOMA_LINHAS = `
SAIYAN FIGHT § SAIYAN FIGHT § SAIYAN FIGHT
A BATALHA COMEÇA AGORA § THE BATTLE BEGINS NOW § LA BATALLA EMPIEZA YA
JOGAR § PLAY § JUGAR
PERSONAGENS § CHARACTERS § PERSONAJES
ARENAS § ARENAS § ARENAS
OPÇÕES § OPTIONS § OPCIONES
RANKING § RANKING § RANKING
DATABASE § DATABASE § BASE DE DATOS
CONQUISTAS § ACHIEVEMENTS § LOGROS
TUTORIAL § TUTORIAL § TUTORIAL
UPDATES § UPDATES § NOVEDADES
IDIOMAS § LANGUAGES § IDIOMAS
IDIOMA § LANGUAGE § IDIOMA
ESCOLHA O IDIOMA DO JOGO § CHOOSE THE GAME LANGUAGE § ELIGE EL IDIOMA DEL JUEGO
ESCOLHA SEU CAMINHO § CHOOSE YOUR PATH § ELIGE TU CAMINO
PARTIDA RÁPIDA OU LOCAL § QUICK MATCH OR LOCAL § PARTIDA RÁPIDA O LOCAL
SINGLEPLAYER § SINGLE PLAYER § UN JUGADOR
VERSUS (2 JOGADORES) § VERSUS (2 PLAYERS) § VERSUS (2 JUGADORES)
OPÇÕES DO JOGO § GAME OPTIONS § OPCIONES DEL JUEGO
CONFIGURAÇÕES DA PARTIDA § MATCH SETTINGS § AJUSTES DE LA PARTIDA
CONTROLES § CONTROLS § CONTROLES
CONFIGURAÇÃO DE ÁUDIO § AUDIO SETTINGS § AJUSTES DE AUDIO
TRANSMITIR PARA A TV § CAST TO TV § TRANSMITIR A LA TV
PARAR TRANSMISSÃO PARA A TV § STOP CASTING TO TV § DETENER TRANSMISIÓN A LA TV
SELEÇÃO DE ENTRADA § INPUT SELECTION § SELECCIÓN DE ENTRADA
CONTROLES PC § PC CONTROLS § CONTROLES DE PC
CONTROLES TOUCH § TOUCH CONTROLS § CONTROLES TÁCTILES
CONTROLE JOYSTICK § GAMEPAD § MANDO
TESTAR CONTROLES § TEST CONTROLS § PROBAR CONTROLES
AUTOMÁTICO § AUTO § AUTOMÁTICO
TOUCH § TOUCH § TÁCTIL
JOYSTICK § GAMEPAD § MANDO
CONTROLE 1 § CONTROLLER 1 § MANDO 1
CONTROLE 2 § CONTROLLER 2 § MANDO 2
MODO TECLADO § KEYBOARD MODE § MODO TECLADO
MODO MOUSE § MOUSE MODE § MODO RATÓN
CIMA § UP § ARRIBA
BAIXO § DOWN § ABAJO
ESQUERDA § LEFT § IZQUIERDA
DIREITA § RIGHT § DERECHA
ESQ. § LEFT § IZQ.
DIR. § RIGHT § DER.
CIMA: § UP: § ARRIBA:
BAIXO: § DOWN: § ABAJO:
ESQUERDA: § LEFT: § IZQUIERDA:
DIREITA: § RIGHT: § DERECHA:
ATAQUE: § ATTACK: § ATAQUE:
CARREGAR: § CHARGE: § CARGAR:
TRANSFORMAR: § TRANSFORM: § TRANSFORMAR:
PARRY: § PARRY: § PARRY:
ESPECIAL: § SPECIAL: § ESPECIAL:
ATAQUE § ATTACK § ATAQUE
CARREGAR § CHARGE § CARGAR
TRANSFORMAR § TRANSFORM § TRANSFORMAR
TRANSF. § TRANSF. § TRANSF.
ESPECIAL § SPECIAL § ESPECIAL
PAUSAR § PAUSE § PAUSA
PARADO § IDLE § QUIETO
SETA CIMA § UP ARROW § FLECHA ARRIBA
SETA BAIXO § DOWN ARROW § FLECHA ABAJO
SETA ESQ. § LEFT ARROW § FLECHA IZQ.
SETA DIR. § RIGHT ARROW § FLECHA DER.
ESPAÇO § SPACE § ESPACIO
MOUSE ESQ. § LEFT CLICK § CLIC IZQ.
MOUSE MEIO § MIDDLE CLICK § CLIC CENTRAL
MOUSE DIR. § RIGHT CLICK § CLIC DER.
NENHUMA § NONE § NINGUNA
CRUZ § CROSS § EQUIS
BOLA § CIRCLE § CÍRCULO
QUADRADO § SQUARE § CUADRADO
TRIÂNGULO § TRIANGLE § TRIÁNGULO
CRIAR § CREATE § CREATE
CONFIGURAÇÃO TOUCH / MOBILE § TOUCH / MOBILE SETTINGS § AJUSTES TÁCTILES / MÓVIL
CONTROLES MÓVEIS § MOBILE CONTROLS § CONTROLES MÓVILES
ANALÓGICO § ANALOG STICK § STICK ANALÓGICO
DESLIZAR § SWIPE § DESLIZAR
REORGANIZAR BOTÕES HUD § REARRANGE HUD BUTTONS § REORGANIZAR BOTONES DEL HUD
Escolha uma ação e aperte o botão desejado § Pick an action and press the button you want § Elige una acción y pulsa el botón que quieras
PADRÃO PS5 § PS5 DEFAULT § PREDETERMINADO PS5
PADRÃO PS5 RESTAURADO § PS5 DEFAULT RESTORED § PREDETERMINADO PS5 RESTAURADO
TESTAR § TEST § PROBAR
SENSIBILIDADE § STICK § SENSIBILIDAD
DO ANALÓGICO § SENSITIVITY § DEL STICK
APERTE UM BOTÃO... § PRESS A BUTTON... § PULSA UN BOTÓN...
VALE QUALQUER BOTÃO, GATILHO OU O CLIQUE DO TOUCHPAD § ANY BUTTON, TRIGGER OR TOUCHPAD CLICK WORKS § VALE CUALQUIER BOTÓN, GATILLO O CLIC DEL TOUCHPAD
VOLUME E ÁUDIO § VOLUME & AUDIO § VOLUMEN Y AUDIO
Ajuste do som geral § Overall sound settings § Ajuste general del sonido
ÁUDIO: ATIVADO § AUDIO: ON § AUDIO: ACTIVADO
ÁUDIO: MUTADO § AUDIO: MUTED § AUDIO: SILENCIADO
♪ TRILHAS SONORAS § ♪ SOUNDTRACK § ♪ BANDA SONORA
TRILHAS SONORAS § SOUNDTRACK § BANDA SONORA
Toque para ouvir a música de cada fase § Tap to hear each stage's music § Toca para oír la música de cada fase
▶ TOCAR § ▶ PLAY § ▶ REPRODUCIR
❚❚ PAUSAR § ❚❚ PAUSE § ❚❚ PAUSA
O áudio está mutado: ative em VOLUME E ÁUDIO para ouvir § Audio is muted: turn it on in VOLUME & AUDIO to listen § El audio está silenciado: actívalo en VOLUMEN Y AUDIO para oír
O volume BGM está em 0%: aumente para ouvir § Music volume is at 0%: turn it up to listen § El volumen de la música está en 0%: súbelo para oír
AVENTURA NAS NUVENS § ADVENTURE IN THE CLOUDS § AVENTURA EN LAS NUBES
BRISA DA KAME HOUSE § KAME HOUSE BREEZE § BRISA DE LA KAME HOUSE
ACIMA DAS NUVENS § ABOVE THE CLOUDS § SOBRE LAS NUBES
AVENIDAS DA CAPITAL § CAPITAL AVENUES § AVENIDAS DE LA CAPITAL
Acima das Nuvens § Above the Clouds § Sobre las Nubes
Libere a Plataforma Celestial § Unlock the Celestial Lookout § Desbloquea la Plataforma Celestial
Visita à Corporação Cápsula § Capsule Corp Visit § Visita a la Corporación Cápsula
Libere a Capital do Oeste § Unlock West City § Desbloquea la Capital del Oeste
GALOPE DO PLANETA KAIOH § KING KAI'S PLANET GALLOP § GALOPE DEL PLANETA KAIO
BRISA DE NAMEK § NAMEK BREEZE § BRISA DE NAMEK
A AMEAÇA DO IMPERADOR § THE EMPEROR'S THREAT § LA AMENAZA DEL EMPERADOR
CONTAGEM FINAL § FINAL COUNTDOWN § CUENTA REGRESIVA
ESTRADA DAS ESTRELAS § ROAD OF STARS § CAMINO DE ESTRELLAS
TORNEIO DA PERFEIÇÃO § TOURNAMENT OF PERFECTION § TORNEO DE LA PERFECCIÓN
VALSA DO MAJIN § MAJIN WALTZ § VALS DEL MAJIN
TORNEIO ARTES MARCIAIS § MARTIAL ARTS TOURNAMENT § TORNEO DE ARTES MARCIALES
PLANETA DO SR. KAIOH § KING KAI'S PLANET § PLANETA DEL SR. KAIO
PLANETA NAMEK § PLANET NAMEK § PLANETA NAMEK
NAVE DE FREEZA § FREEZA'S SHIP § NAVE DE FREEZA
NAMEK PRESTES A EXPLODIR § NAMEK ABOUT TO EXPLODE § NAMEK A PUNTO DE EXPLOTAR
SALA DO TEMPO § TIME CHAMBER § HABITACIÓN DEL TIEMPO
PLATAFORMA CELESTIAL § CELESTIAL LOOKOUT § PLATAFORMA CELESTIAL
CAPITAL DO OESTE § WEST CITY § CAPITAL DEL OESTE
TORNEIO DE CELL § CELL GAMES § JUEGOS DE CELL
PLANETA SUPREMO KAIOH § SUPREME KAI'S PLANET § PLANETA DEL SUPREMO KAIO
ILHA DO MESTRE KAME § MASTER ROSHI'S ISLAND § ISLA DEL MAESTRO ROSHI
SALVAR § SAVE § GUARDAR
VOLTAR AO PADRÃO § RESET TO DEFAULT § RESTABLECER
ARRASTE OS BOTÕES PARA O LUGAR DESEJADO § DRAG THE BUTTONS WHERE YOU WANT THEM § ARRASTRA LOS BOTONES ADONDE QUIERAS
TOQUE EM UM BOTÃO PARA AJUSTAR TAMANHO E OPACIDADE § TAP A BUTTON TO ADJUST SIZE AND OPACITY § TOCA UN BOTÓN PARA AJUSTAR TAMAÑO Y OPACIDAD
TESTE DE CONTROLES § CONTROLS TEST § PRUEBA DE CONTROLES
Aperte teclas, botões do mouse, toque na tela ou use o controle (PAD = clique do touchpad). OPTIONS ou ESC sai. § Press keys, mouse buttons, tap the screen or use the gamepad (PAD = touchpad click). OPTIONS or ESC exits. § Pulsa teclas, botones del ratón, toca la pantalla o usa el mando (PAD = clic del touchpad). OPTIONS o ESC para salir.
JOGADOR 1 (TECLADO/MOUSE/CONTROLE 1/TOQUE) § PLAYER 1 (KEYBOARD/MOUSE/CONTROLLER 1/TOUCH) § JUGADOR 1 (TECLADO/RATÓN/MANDO 1/TÁCTIL)
JOGADOR 2 (TECLADO/CONTROLE 2) § PLAYER 2 (KEYBOARD/CONTROLLER 2) § JUGADOR 2 (TECLADO/MANDO 2)
PRÉVIA: TOQUE NO QUADRO PARA MOVER § PREVIEW: TAP THE BOX TO MOVE § VISTA PREVIA: TOCA EL RECUADRO PARA MOVER
PRÉVIA: O GOKU RESPONDE AOS COMANDOS § PREVIEW: GOKU FOLLOWS YOUR INPUTS § VISTA PREVIA: GOKU RESPONDE A TUS CONTROLES
AGUARDANDO § WAITING § ESPERANDO
NENHUM CONTROLE DETECTADO — APERTE UM BOTÃO § NO GAMEPAD DETECTED — PRESS A BUTTON § NINGÚN MANDO DETECTADO — PULSA UN BOTÓN
MELHORES PONTUAÇÕES § HIGH SCORES § MEJORES PUNTUACIONES
GERAL § OVERALL § GENERAL
POR FASE § BY STAGE § POR FASE
NENHUMA PONTUAÇÃO REGISTRADA AINDA! § NO SCORES YET! § ¡AÚN NO HAY PUNTUACIONES!
NENHUMA PONTUAÇÃO NESSA ARENA AINDA! § NO SCORES IN THIS ARENA YET! § ¡AÚN NO HAY PUNTUACIONES EN ESTA ARENA!
DIAMANTE § DIAMOND § DIAMANTE
OURO § GOLD § ORO
PRATA § SILVER § PLATA
BRONZE § BRONZE § BRONCE
GERENCIADOR DE PERSONAGENS § CHARACTER MANAGER § GESTOR DE PERSONAJES
+ CRIAR NOVO § + CREATE NEW § + CREAR NUEVO
EDITAR § EDIT § EDITAR
EXCLUIR § DELETE § ELIMINAR
SELEÇÃO DE ARENAS — CRONOLOGIA DBZ § ARENA SELECT — DBZ TIMELINE § SELECCIÓN DE ARENAS — CRONOLOGÍA DBZ
COMPLETE O MODO NORMAL (5 ONDAS) PRA LIBERAR A PRÓXIMA FASE § BEAT NORMAL MODE (5 WAVES) TO UNLOCK THE NEXT STAGE § SUPERA EL MODO NORMAL (5 OLEADAS) PARA DESBLOQUEAR LA SIGUIENTE FASE
COMPLETE O MODO NORMAL DA FASE ANTERIOR PRA LIBERAR § BEAT NORMAL MODE OF THE PREVIOUS STAGE TO UNLOCK § SUPERA EL MODO NORMAL DE LA FASE ANTERIOR PARA DESBLOQUEAR
BLOQUEADA § LOCKED § BLOQUEADA
BLOQUEADO § LOCKED § BLOQUEADO
ESCOLHA A FASE § CHOOSE THE STAGE § ELIGE LA FASE
ESCOLHA O MODO § CHOOSE THE MODE § ELIGE EL MODO
NORMAL (ONDAS 1-5) § NORMAL (WAVES 1-5) § NORMAL (OLEADAS 1-5)
DIFÍCIL § HARD § DIFÍCIL
SEM LIMITE § ENDLESS § SIN LÍMITE
NORMAL § NORMAL § NORMAL
NORMAL ✓ § NORMAL ✓ § NORMAL ✓
DIFÍCIL ✓ § HARD ✓ § DIFÍCIL ✓
NORMAL: EM ABERTO § NORMAL: NOT CLEARED § NORMAL: PENDIENTE
DIFÍCIL: EM ABERTO § HARD: NOT CLEARED § DIFÍCIL: PENDIENTE
DIFÍCIL: BLOQUEADO § HARD: LOCKED § DIFÍCIL: BLOQUEADO
HERÓIS § HEROES § HÉROES
VILÕES § VILLAINS § VILLANOS
HERÓI § HERO § HÉROE
VILÃO § VILLAIN § VILLANO
ANTI-HERÓI § ANTIHERO § ANTIHÉROE
FORMA BASE § BASE FORM § FORMA BASE
SEGUNDA FORMA § SECOND FORM § SEGUNDA FORMA
TERCEIRA FORMA § THIRD FORM § TERCERA FORMA
FORMA FINAL § FINAL FORM § FORMA FINAL
FREEZA CIBORGUE § CYBORG FREEZA § FREEZA CYBORG
SUPER SAIYAJIN § SUPER SAIYAN § SÚPER SAIYAJIN
SUPER SAIYAJIN 2 § SUPER SAIYAN 2 § SÚPER SAIYAJIN 2
SUPER SAIYAJIN LENDÁRIO § LEGENDARY SUPER SAIYAN § SÚPER SAIYAJIN LEGENDARIO
BUU GORDO § FAT BUU § BUU GORDO
SEMI-PERFEITO § SEMI-PERFECT § SEMIPERFECTO
PERFEITO § PERFECT § PERFECTO
SELEÇÃO DE PERSONAGEM § CHARACTER SELECT § SELECCIÓN DE PERSONAJE
LUTAR! § FIGHT! § ¡A PELEAR!
PRÓXIMO ▶ § NEXT ▶ § SIGUIENTE ▶
JOGADOR 1: ESCOLHA SEU LUTADOR § PLAYER 1: CHOOSE YOUR FIGHTER § JUGADOR 1: ELIGE TU LUCHADOR
JOGADOR 2: ESCOLHA SEU LUTADOR § PLAYER 2: CHOOSE YOUR FIGHTER § JUGADOR 2: ELIGE TU LUCHADOR
SELECIONAR PERSONAGEM § SELECT CHARACTER § SELECCIONAR PERSONAJE
SELECIONAR § SELECT § SELECCIONAR
CANCELAR § CANCEL § CANCELAR
CONFIRMAR § CONFIRM § CONFIRMAR
SIM § YES § SÍ
NÃO § NO § NO
OK § OK § OK
AVISO § NOTICE § AVISO
ALERTA § ALERT § ALERTA
ERRO § ERROR § ERROR
SUCESSO § SUCCESS § ÉXITO
FECHAR § CLOSE § CERRAR
ESPECIAL PRONTO! § SPECIAL READY! § ¡ESPECIAL LISTO!
MOVER § MOVE § MOVER
NA TELA § ON THE SCREEN § EN LA PANTALLA
NO ANALÓGICO § ON THE STICK § EN EL STICK
PARA ATIRAR SEM PARAR § TO KEEP FIRING § PARA DISPARAR SIN PARAR
★ NUVEM § ★ NIMBUS § ★ NUBE
★ BASTÃO § ★ POLE § ★ BÁCULO
CONTINUAR § CONTINUE § CONTINUAR
SAIR PARA MENU § QUIT TO MENU § SALIR AL MENÚ
PAUSADO AUTOMATICAMENTE § AUTO-PAUSED § PAUSA AUTOMÁTICA
TOQUE OU CLIQUE EM QUALQUER LUGAR PARA CONTINUAR § TAP OR CLICK ANYWHERE TO CONTINUE § TOCA O HAZ CLIC EN CUALQUIER LUGAR PARA CONTINUAR
PREPARE-SE... § GET READY... § PREPÁRATE...
VOCÊ FOI DERROTADO! § YOU WERE DEFEATED! § ¡HAS SIDO DERROTADO!
PONTUAÇÃO § SCORE § PUNTUACIÓN
PONTUAÇÃO: § SCORE: § PUNTUACIÓN:
ATAQUES FEITOS § ATTACKS MADE § ATAQUES HECHOS
ATAQUES FEITOS: § ATTACKS MADE: § ATAQUES HECHOS:
REBATIDAS (PARRY) § PARRIES § PARRIES
REBATIDAS (PARRY): § PARRIES: § PARRIES:
GOLPES RECEBIDOS § HITS TAKEN § GOLPES RECIBIDOS
GOLPES RECEBIDOS: § HITS TAKEN: § GOLPES RECIBIDOS:
ITENS COLETADOS: § ITEMS COLLECTED: § OBJETOS RECOGIDOS:
FEIJÃO MÁGICO § SENZU BEAN § SEMILLA DEL ERMITAÑO
FEIJÃO MÁGICO: § SENZU BEAN: § SEMILLA DEL ERMITAÑO:
ESCUDO § SHIELD § ESCUDO
ESCUDO: § SHIELD: § ESCUDO:
NUVEM VOADORA § FLYING NIMBUS § NUBE VOLADORA
NUVEM VOADORA: § FLYING NIMBUS: § NUBE VOLADORA:
BASTÃO MÁGICO § POWER POLE § BÁCULO SAGRADO
BASTÃO MÁGICO: § POWER POLE: § BÁCULO SAGRADO:
NOVO RECORDE GERAL! § NEW OVERALL RECORD! § ¡NUEVO RÉCORD GENERAL!
NOVO RECORDE DA FASE! § NEW STAGE RECORD! § ¡NUEVO RÉCORD DE LA FASE!
TOQUE OU CLIQUE PARA VOLTAR AO MAPA DE FASES § TAP OR CLICK TO RETURN TO THE STAGE MAP § TOCA O HAZ CLIC PARA VOLVER AL MAPA DE FASES
TOQUE OU CLIQUE PARA VOLTAR AO MENU § TAP OR CLICK TO RETURN TO THE MENU § TOCA O HAZ CLIC PARA VOLVER AL MENÚ
VITÓRIA! § VICTORY! § ¡VICTORIA!
PRÓXIMA FASE LIBERADA! § NEXT STAGE UNLOCKED! § ¡SIGUIENTE FASE DESBLOQUEADA!
MODO SEM LIMITE LIBERADO NESTA FASE! § ENDLESS MODE UNLOCKED ON THIS STAGE! § ¡MODO SIN LÍMITE DESBLOQUEADO EN ESTA FASE!
CHOQUE DE FEIXES § BEAM CLASH § CHOQUE DE RAYOS
CONQUISTA DESBLOQUEADA § ACHIEVEMENT UNLOCKED § LOGRO DESBLOQUEADO
MOVIMENTO § MOVEMENT § MOVIMIENTO
ATAQUE DE KI § KI ATTACK § ATAQUE DE KI
CARREGAR KI § CHARGE KI § CARGAR KI
PARRY (REBATER) § PARRY (DEFLECT) § PARRY (DESVIAR)
ATAQUE ESPECIAL § SPECIAL ATTACK § ATAQUE ESPECIAL
PAUSAR O JOGO § PAUSE THE GAME § PAUSAR EL JUEGO
PULAR § SKIP § SALTAR
VOLTAR AO MENU § BACK TO MENU § VOLVER AL MENÚ
TUTORIAL CONCLUÍDO! VOCÊ JÁ SABE TODOS OS COMANDOS. § TUTORIAL COMPLETE! YOU KNOW ALL THE MOVES NOW. § ¡TUTORIAL COMPLETADO! YA CONOCES TODOS LOS CONTROLES.
MUITO BEM! ISSO MESMO. § WELL DONE! THAT'S IT. § ¡MUY BIEN! ¡ESO ES!
ANALÓGICO ESQUERDO OU DIRECIONAL § LEFT STICK OR D-PAD § STICK IZQUIERDO O CRUCETA
(SEGURE POR UM INSTANTE) § (HOLD FOR A MOMENT) § (MANTÉN UN INSTANTE)
ARRASTE O DEDO NA TELA PARA VOAR § DRAG YOUR FINGER ON THE SCREEN TO FLY § ARRASTRA EL DEDO EN LA PANTALLA PARA VOLAR
TOQUE E ARRASTE NO ANALÓGICO (ESQUERDA DA TELA), OU SEGURE PRA ATIRAR SEM PARAR § TAP AND DRAG THE STICK (LEFT SIDE), OR HOLD IT TO KEEP FIRING § TOCA Y ARRASTRA EL STICK (IZQUIERDA), O MANTÉN PARA DISPARAR SIN PARAR
TOQUE NO ÍCONE DE PAUSA NO TOPO DA TELA § TAP THE PAUSE ICON AT THE TOP OF THE SCREEN § TOCA EL ICONO DE PAUSA ARRIBA DE LA PANTALLA
TOQUE 2 VEZES SEGUIDAS EM QUALQUER LUGAR LIVRE DA TELA § DOUBLE-TAP ANY EMPTY SPOT ON THE SCREEN § TOCA 2 VECES SEGUIDAS EN CUALQUIER LUGAR LIBRE DE LA PANTALLA
COM O KI CHEIO O BOTÃO "CARREGAR" VIRA "TRANSFORMAR": TOQUE NELE § WITH FULL KI THE "CHARGE" BUTTON BECOMES "TRANSFORM": TAP IT § CON EL KI LLENO EL BOTÓN "CARGAR" SE VUELVE "TRANSFORMAR": TÓCALO
SEGURE O DEDO NO ANALÓGICO PARA ATIRAR SEM PARAR § HOLD YOUR FINGER ON THE STICK TO KEEP FIRING § MANTÉN EL DEDO EN EL STICK PARA DISPARAR SIN PARAR
MOUSE: ATIVE O MODO 'SEGUIR MOUSE' NAS OPÇÕES § MOUSE: TURN ON 'FOLLOW MOUSE' IN THE OPTIONS § RATÓN: ACTIVA 'SEGUIR RATÓN' EN LAS OPCIONES
MAPEAMENTO § KEY MAPPING § ASIGNACIÓN
PRESSIONE QUALQUER TECLA OU BOTÃO DO MOUSE PARA RECONFIGURAR... § PRESS ANY KEY OR MOUSE BUTTON TO REBIND... § PULSA CUALQUIER TECLA O BOTÓN DEL RATÓN PARA REASIGNAR...
DEVE HAVER PELO MENOS UM PERSONAGEM! § THERE MUST BE AT LEAST ONE CHARACTER! § ¡DEBE HABER AL MENOS UN PERSONAJE!
NÃO FOI POSSÍVEL SALVAR OS CONTROLES § COULDN'T SAVE THE CONTROLS § NO SE PUDIERON GUARDAR LOS CONTROLES
NÃO FOI POSSÍVEL SALVAR OS PERSONAGENS! § COULDN'T SAVE THE CHARACTERS! § ¡NO SE PUDIERON GUARDAR LOS PERSONAJES!
NENHUMA TV COM CHROMECAST/GOOGLE TV NA MESMA REDE WI-FI § NO CHROMECAST/GOOGLE TV ON THE SAME WI-FI NETWORK § NINGUNA TV CON CHROMECAST/GOOGLE TV EN LA MISMA RED WI-FI
NÃO FOI POSSÍVEL CONECTAR À TV § COULDN'T CONNECT TO THE TV § NO SE PUDO CONECTAR A LA TV
ESTE NAVEGADOR NÃO PERMITE: ABRA NO CHROME § THIS BROWSER DOESN'T ALLOW IT: OPEN IN CHROME § ESTE NAVEGADOR NO LO PERMITE: ÁBRELO EN CHROME
VERIFICANDO... § CHECKING... § COMPROBANDO...
ATUALIZANDO... § UPDATING... § ACTUALIZANDO...
SEM CONEXÃO § NO CONNECTION § SIN CONEXIÓN
JÁ ESTÁ ATUALIZADO § ALREADY UP TO DATE § YA ESTÁ ACTUALIZADO
ATUALIZAR § UPDATE § ACTUALIZAR
Devolve pro Remetente § Return to Sender § Devuelto al Remitente
Rebata 10 bolas de Ki. Obrigado, não quero! § Deflect 10 Ki blasts. No thanks! § Desvía 10 bolas de Ki. ¡No, gracias!
Escudo Impenetrável § Impenetrable Shield § Escudo Impenetrable
Rebata 50 bolas de Ki. Aqui não passa nada! § Deflect 50 Ki blasts. Nothing gets through! § Desvía 50 bolas de Ki. ¡Aquí no pasa nada!
Muralha de Ki § Ki Wall § Muralla de Ki
Rebata 200 bolas de Ki. Pode mandar mais! § Deflect 200 Ki blasts. Bring it on! § Desvía 200 bolas de Ki. ¡Que vengan más!
Pegando o Ritmo § Getting the Rhythm § Agarrando el Ritmo
Rebata 3 seguidas sem errar o compasso § Deflect 3 in a row without missing a beat § Desvía 3 seguidas sin perder el compás
Dançando no Combate § Dancing in Battle § Bailando en Combate
Rebata 6 seguidas. Parece até coreografia! § Deflect 6 in a row. Looks like choreography! § Desvía 6 seguidas. ¡Parece coreografía!
Reflexo de Saiyajin § Saiyan Reflexes § Reflejos de Saiyajin
Rebata 10 seguidas. Piscou? Nem precisa! § Deflect 10 in a row. Blink? No need! § Desvía 10 seguidas. ¿Parpadear? ¡Ni hace falta!
Nem Encostou § Untouched § Ni Me Tocó
Faça 5 pontos sem levar nenhum arranhão § Score 5 points without a scratch § Haz 5 puntos sin un rasguño
Roupa Sem Amassar § Not a Wrinkle § Ni una Arruga
Chegue à onda 5 sem levar nenhum dano § Reach wave 5 without taking damage § Llega a la oleada 5 sin recibir daño
Saiyajin Não Desiste § Saiyans Never Give Up § Un Saiyajin No Se Rinde
Volte da derrota com a Zenkai pela 1ª vez § Come back from defeat with Zenkai for the 1st time § Vuelve de la derrota con el Zenkai por 1ª vez
Quase Morri, Mas Ganhei § Almost Died, Still Won § Casi Muero, Pero Gané
Use a Zenkai e ainda vença o Versus § Use Zenkai and still win Versus § Usa el Zenkai y aun así gana el Versus
Jardineiro de Saibamen § Saibamen Gardener § Jardinero de Saibamen
Derrote 50 Saibamen. Arranca tudo da terra! § Defeat 50 Saibamen. Pull them all out! § Derrota 50 Saibamen. ¡Arráncalos todos!
Praga na Plantação § Crop Pest § Plaga en la Cosecha
Derrote 200 Saibamen. Acabou a colheita! § Defeat 200 Saibamen. Harvest's over! § Derrota 200 Saibamen. ¡Se acabó la cosecha!
Cabelo Arrepiado § Spiky Hair § Pelo de Punta
Vire Super Saiyajin pela primeira vez § Go Super Saiyan for the first time § Conviértete en Súper Saiyajin por primera vez
Viciado em Dourado § Hooked on Gold § Adicto al Dorado
Transforme-se 10 vezes. Fica bonito, né? § Transform 10 times. Looks good, right? § Transfórmate 10 veces. Queda bien, ¿no?
Loiro e Perigoso § Blond and Dangerous § Rubio y Peligroso
Derrote um vilão estando transformado § Defeat a villain while transformed § Derrota a un villano estando transformado
Solte o ataque especial pela primeira vez § Fire your special attack for the first time § Lanza tu ataque especial por primera vez
Bastão Turbinado § Supercharged Pole § Báculo Turbo
Use o Super Ataque (especial + bastão mágico) § Use the Super Attack (special + power pole) § Usa el Súper Ataque (especial + báculo sagrado)
Exagerado de Poder § Power Overload § Exceso de Poder
Use o Super Ataque 10 vezes. Sem moderação! § Use the Super Attack 10 times. No holding back! § Usa el Súper Ataque 10 veces. ¡Sin moderación!
Cabo de Guerra de Ki § Ki Tug of War § Tira y Afloja de Ki
Provoque um Choque de Feixes no Versus § Trigger a Beam Clash in Versus § Provoca un Choque de Rayos en el Versus
Guerra de Kamehamehas § Kamehameha War § Guerra de Kamehamehas
Provoque 5 Choques de Feixes. Aperta, aperta! § Trigger 5 Beam Clashes. Push, push! § Provoca 5 Choques de Rayos. ¡Aprieta, aprieta!
Barriga Cheia § Full Belly § Panza Llena
Pegue 10 Feijões Mágicos. Nham! § Grab 10 Senzu Beans. Yum! § Toma 10 Semillas del Ermitaño. ¡Ñam!
Cliente da Cápsula § Capsule Customer § Cliente de Cápsula
Pegue 10 escudos. Segurança em 1º lugar! § Grab 10 shields. Safety first! § Toma 10 escudos. ¡La seguridad es primero!
Carona na Nuvem § Nimbus Ride § Aventón en la Nube
Pegue 10 Nuvens Voadoras. Vruum! § Grab 10 Flying Nimbus. Vroom! § Toma 10 Nubes Voladoras. ¡Brrum!
Pegue 10 Bastões Mágicos § Grab 10 Power Poles § Toma 10 Báculos Sagrados
Mochila Completa § Full Backpack § Mochila Completa
Pegue os 4 tipos de item numa mesma partida § Grab all 4 item types in one match § Toma los 4 tipos de objeto en una misma partida
Só Esquentando § Just Warming Up § Solo Calentando
Chegue à onda 5. Isso foi o aquecimento! § Reach wave 5. That was the warm-up! § Llega a la oleada 5. ¡Eso fue el calentamiento!
Agora Ficou Sério § Now It's Serious § Ahora Va en Serio
Chegue à onda 10 § Reach wave 10 § Llega a la oleada 10
Elite Saiyajin § Saiyan Elite § Élite Saiyajin
Chegue à onda 15. O príncipe aprovaria! § Reach wave 15. The prince would approve! § Llega a la oleada 15. ¡El príncipe lo aprobaría!
Lenda Viva § Living Legend § Leyenda Viviente
Chegue à onda 20. Já pode dar autógrafo! § Reach wave 20. Time to sign autographs! § Llega a la oleada 20. ¡Ya puedes firmar autógrafos!
Isso Ainda Não É Tudo! § And This Isn't Even My Final Form! § ¡Y Esto Aún No Es Todo!
Chegue à onda 25. Nem o Bills aguenta! § Reach wave 25. Not even Beerus can handle it! § Llega a la oleada 25. ¡Ni Bills lo aguanta!
Abrindo o Placar § Opening the Score § Abriendo el Marcador
Faça 10 pontos numa partida § Score 10 points in one match § Haz 10 puntos en una partida
Caçador de Recompensas § Bounty Hunter § Cazarrecompensas
Faça 50 pontos numa partida. Rende bem! § Score 50 points in one match. Pays well! § Haz 50 puntos en una partida. ¡Rinde bien!
Mais de 8000? Que Nada! § Over 9000? Please! § ¿Más de 8000? ¡Qué va!
Faça 100 pontos numa partida § Score 100 points in one match § Haz 100 puntos en una partida
Pesadelo dos Vilões § Villains' Nightmare § Pesadilla de los Villanos
Derrote 10 chefes. Eles já te conhecem! § Defeat 10 bosses. They know you by now! § Derrota 10 jefes. ¡Ya te conocen!
Coleção de Vilões § Villain Collection § Colección de Villanos
Derrote 50 chefes. Ninguém mais quer lutar! § Defeat 50 bosses. Nobody wants to fight anymore! § Derrota 50 jefes. ¡Ya nadie quiere pelear!
Campeão do Torneio § Tournament Champion § Campeón del Torneo
Férias na Kame House § Kame House Vacation § Vacaciones en la Kame House
Vença o NORMAL da Ilha do Mestre Kame § Beat NORMAL on Master Roshi's Island § Gana el NORMAL de la Isla del Maestro Roshi
Libere o Torneio de Artes Marciais § Unlock the Martial Arts Tournament § Desbloquea el Torneo de Artes Marciales
Vença o NORMAL do Torneio de Artes Marciais § Beat NORMAL on the Martial Arts Tournament § Gana el NORMAL del Torneo de Artes Marciales
Treino com Piadas Ruins § Training with Bad Jokes § Entrenando con Chistes Malos
Libere o Planeta do Sr. Kaioh § Unlock King Kai's Planet § Desbloquea el Planeta del Sr. Kaio
Turista em Namek § Tourist on Namek § Turista en Namek
Libere o Planeta Namek. Leve protetor! § Unlock Planet Namek. Bring sunscreen! § Desbloquea el Planeta Namek. ¡Lleva protector!
Fuga por um Triz § Narrow Escape § Escape por un Pelo
Libere Namek Prestes a Explodir. Corre! § Unlock Namek About to Explode. Run! § Desbloquea Namek a Punto de Explotar. ¡Corre!
Clandestino na Nave § Ship Stowaway § Polizón en la Nave
Libere a Nave de Freeza sem ser visto § Unlock Freeza's Ship without being seen § Desbloquea la Nave de Freeza sin que te vean
Um Ano em Um Dia § A Year in a Day § Un Año en un Día
Libere a Sala do Tempo. Sem relógio! § Unlock the Time Chamber. No clocks! § Desbloquea la Habitación del Tiempo. ¡Sin reloj!
Convidado do Cell § Cell's Guest § Invitado de Cell
Libere o Torneio de Cell § Unlock the Cell Games § Desbloquea los Juegos de Cell
Entre os Deuses § Among the Gods § Entre los Dioses
Libere o Planeta Supremo Kaioh § Unlock the Supreme Kai's Planet § Desbloquea el Planeta del Supremo Kaio
Difícil? Não Para Mim § Hard? Not for Me § ¿Difícil? Para Mí No
Vença o modo DIFÍCIL de uma fase pela primeira vez § Beat HARD mode on a stage for the first time § Gana el modo DIFÍCIL de una fase por primera vez
Rodei o Universo Inteiro § Toured the Whole Universe § Recorrí Todo el Universo
Vença o modo NORMAL de todas as fases § Beat NORMAL mode on every stage § Gana el modo NORMAL de todas las fases
Dificuldade? Pouco É Bobagem § Difficulty? Child's Play § ¿Dificultad? Pan Comido
Vença o modo DIFÍCIL de todas as fases § Beat HARD mode on every stage § Gana el modo DIFÍCIL de todas las fases
Rivalidade Saudável § Healthy Rivalry § Rivalidad Sana
Vença uma partida do Versus (melhor de 3) § Win a Versus match (best of 3) § Gana una partida de Versus (al mejor de 3)
Freguês Garantido § Regular Customer § Cliente Fijo
Vença 10 partidas do Versus. Pede revanche? § Win 10 Versus matches. Want a rematch? § Gana 10 partidas de Versus. ¿Pides revancha?
Fábrica de Guerreiros § Warrior Factory § Fábrica de Guerreros
Crie seu 1º personagem no construtor § Create your 1st character in the builder § Crea tu 1er personaje en el constructor
Elenco Próprio § Your Own Roster § Elenco Propio
Crie 5 personagens. Dá pra montar um time! § Create 5 characters. That's a whole team! § Crea 5 personajes. ¡Ya tienes un equipo!
Rabo de Macaco § Monkey Tail § Cola de Mono
Crie um personagem com cauda § Create a character with a tail § Crea un personaje con cola
Asa Delta Saiyajin § Saiyan Hang Glider § Ala Delta Saiyajin
Crie um personagem com asas § Create a character with wings § Crea un personaje con alas
Espada nas Costas § Sword on the Back § Espada a la Espalda
Crie um personagem com arma nas costas § Create a character with a back weapon § Crea un personaje con arma a la espalda
Pegou Gosto § Hooked § Le Agarraste el Gusto
Só Mais Uma... § Just One More... § Solo Una Más...
Jogue 20 partidas. Só mais uma, juro! § Play 20 matches. Just one more, I swear! § Juega 20 partidas. ¡Solo una más, lo juro!
Isso É Vida § This Is the Life § Esto Es Vida
Jogue 50 partidas. A luta é sua casa! § Play 50 matches. The arena is your home! § Juega 50 partidas. ¡La pelea es tu casa!
Quem Sabe, Sabe § Those Who Know, Know § El Que Sabe, Sabe
Complete todas as outras conquistas § Complete every other achievement § Completa todos los demás logros
EDITAR PERSONAGEM § EDIT CHARACTER § EDITAR PERSONAJE
CRIAR PERSONAGEM § CREATE CHARACTER § CREAR PERSONAJE
CONTROLE: ↑↓←→ navegar · CRUZ confirmar/ajustar · BOLA voltar/fechar · L1/R1 abas · OPTIONS salvar § GAMEPAD: ↑↓←→ navigate · CROSS confirm/adjust · CIRCLE back/close · L1/R1 tabs · OPTIONS save § MANDO: ↑↓←→ navegar · EQUIS confirmar/ajustar · CÍRCULO volver/cerrar · L1/R1 pestañas · OPTIONS guardar
Fechar editor de personagem § Close character editor § Cerrar editor de personaje
DADOS § INFO § DATOS
ANIMAÇÕES DOS MOVIMENTOS § MOVE ANIMATIONS § ANIMACIONES DE MOVIMIENTOS
CONSTRUTOR DE PERSONAGEM § CHARACTER BUILDER § CONSTRUCTOR DE PERSONAJE
TRANSFORMAÇÃO § TRANSFORMATION § TRANSFORMACIÓN
Nome do Personagem § Character Name § Nombre del Personaje
Ex: GOKU § E.g.: GOKU § Ej.: GOKU
Alinhamento § Alignment § Alineamiento
Cor da Aura § Aura Color § Color del Aura
Branca § White § Blanca
Amarela § Yellow § Amarilla
Vermelha § Red § Roja
Rosa § Pink § Rosa
Azul § Blue § Azul
Verde § Green § Verde
Preta § Black § Negra
Roxa § Purple § Morada
Ataque Especial § Special Attack § Ataque Especial
Cor do Projétil § Projectile Color § Color del Proyectil
Tamanho Projétil § Projectile Size § Tamaño del Proyectil
Pequeno § Small § Pequeño
Normal § Normal § Normal
Grande § Large § Grande
Escala do Personagem § Character Scale § Escala del Personaje
Largura Quadro (px) § Frame Width (px) § Ancho del Cuadro (px)
Altura Quadro (px) § Frame Height (px) § Alto del Cuadro (px)
Total de Quadros § Total Frames § Total de Cuadros
Fundo da Imagem § Image Background § Fondo de la Imagen
Apagar branco (automático) § Remove white (automatic) § Borrar blanco (automático)
Apagar a cor escolhida § Remove the chosen color § Borrar el color elegido
Não apagar nada § Don't remove anything § No borrar nada
Cor do Fundo a Apagar § Background Color to Remove § Color de Fondo a Borrar
Tolerância da Cor (%) § Color Tolerance (%) § Tolerancia del Color (%)
PEGAR COR DO CANTO § PICK CORNER COLOR § TOMAR COLOR DE LA ESQUINA
CLIQUE OU ARRASTE A SPRITE SHEET § CLICK OR DRAG THE SPRITE SHEET § HAZ CLIC O ARRASTRA LA SPRITE SHEET
O recorte será calculado pela grade abaixo § The cut will follow the grid below § El recorte se calculará con la cuadrícula de abajo
CARREGAR O SPRITE VIA URL BASE64 OU WEB URL § LOAD THE SPRITE FROM A BASE64 OR WEB URL § CARGAR EL SPRITE DESDE UNA URL BASE64 O WEB
Cole aqui o link da imagem ou data:image/...;base64,... § Paste the image link or data:image/...;base64,... here § Pega aquí el enlace de la imagen o data:image/...;base64,...
CARREGAR URL § LOAD URL § CARGAR URL
Nenhuma sprite sheet carregada. § No sprite sheet loaded. § Ninguna sprite sheet cargada.
LARGURA DO QUADRO (PX) § FRAME WIDTH (PX) § ANCHO DEL CUADRO (PX)
ALTURA DO QUADRO (PX) § FRAME HEIGHT (PX) § ALTO DEL CUADRO (PX)
TOTAL DE QUADROS § TOTAL FRAMES § TOTAL DE CUADROS
QUADROS DO MOVIMENTO § MOVE FRAMES § CUADROS DEL MOVIMIENTO
CAMPO DE EDIÇÃO § EDITING AREA § ÁREA DE EDICIÓN
Arraste sobre a grade para selecionar. A imagem permanece fixa. Use a alça amarela no canto do quadro ativo para movê-lo e a alça à esquerda da primeira linha para mover o grupo verticalmente. As alças laterais ajustam somente a largura. § Drag over the grid to select. The image stays fixed. Use the yellow handle on the active frame's corner to move it and the handle left of the first row to move the group vertically. The side handles only change the width. § Arrastra sobre la cuadrícula para seleccionar. La imagen queda fija. Usa el asa amarilla en la esquina del cuadro activo para moverlo y el asa a la izquierda de la primera fila para mover el grupo en vertical. Las asas laterales solo ajustan el ancho.
DISTÂNCIA HORIZONTAL (PX) § HORIZONTAL SPACING (PX) § DISTANCIA HORIZONTAL (PX)
DISTÂNCIA VERTICAL (PX) § VERTICAL SPACING (PX) § DISTANCIA VERTICAL (PX)
CIMA + DIREITA § UP + RIGHT § ARRIBA + DERECHA
CIMA + ESQUERDA § UP + LEFT § ARRIBA + IZQUIERDA
BAIXO + DIREITA § DOWN + RIGHT § ABAJO + DERECHA
BAIXO + ESQUERDA § DOWN + LEFT § ABAJO + IZQUIERDA
PRÉVIA: IDLE § PREVIEW: IDLE § VISTA PREVIA: QUIETO
PLAY / PAUSE § PLAY / PAUSE § PLAY / PAUSA
ADICIONAR QUADRO AO MOVIMENTO § ADD FRAME TO MOVE § AÑADIR CUADRO AL MOVIMIENTO
INVERTER FRAME DA PRÉVIA § FLIP PREVIEW FRAME § VOLTEAR CUADRO DE LA VISTA PREVIA
LIMPAR MOVIMENTO § CLEAR MOVE § LIMPIAR MOVIMIENTO
DUPLICAR MOVIMENTO INVERTIDO PARA § DUPLICATE FLIPPED MOVE TO § DUPLICAR MOVIMIENTO VOLTEADO EN
DUPLICAR § DUPLICATE § DUPLICAR
DUPLICAR INVERTIDO § DUPLICATE FLIPPED § DUPLICAR VOLTEADO
CLONAR § CLONE § CLONAR
APAGAR FRAME § DELETE FRAME § BORRAR CUADRO
Nenhum quadro atribuído ao movimento. § No frames assigned to this move. § Ningún cuadro asignado al movimiento.
EDITANDO A TRANSFORMAÇÃO: § EDITING TRANSFORMATION: § EDITANDO LA TRANSFORMACIÓN:
— mude só o que for diferente do personagem normal. § — change only what differs from the normal character. § — cambia solo lo que sea distinto del personaje normal.
CONCLUIR TRANSFORMAÇÃO § FINISH TRANSFORMATION § TERMINAR TRANSFORMACIÓN
COMEÇAR A PARTIR DE... § START FROM... § EMPEZAR A PARTIR DE...
— personalizado (do zero) — § — custom (from scratch) — § — personalizado (desde cero) —
PRÉVIA DA POSE § POSE PREVIEW § VISTA PREVIA DE LA POSE
VOANDO § FLYING § VOLANDO
Escolha as partes do personagem. A prévia ao lado é gerada na hora — não é preciso enviar nenhuma imagem. § Pick the character's parts. The preview is generated instantly — no image upload needed. § Elige las partes del personaje. La vista previa se genera al instante — no hace falta subir ninguna imagen.
CORPO § BODY § CUERPO
GÊNERO § GENDER § GÉNERO
Masculino § Male § Masculino
Feminino § Female § Femenino
RAÇA § RACE § RAZA
Humano § Human § Humano
Alienígena de pele lisa § Smooth-skinned alien § Alienígena de piel lisa
Androide § Android § Androide
Bio-Androide § Bio-Android § Bioandroide
Alienígena genérico § Generic alien § Alienígena genérico
PORTE FÍSICO § BUILD § COMPLEXIÓN
Magro § Slim § Delgado
Musculoso § Muscular § Musculoso
Gigante § Giant § Gigante
Jovem/Criança § Young/Child § Joven/Niño
Gordo § Chubby § Gordo
POSIÇÃO DOS BRAÇOS § ARM POSE § POSICIÓN DE LOS BRAZOS
Guarda de luta § Fighting stance § Guardia de pelea
Cruzados (parado e voando) § Crossed (idle and flying) § Cruzados (quieto y volando)
COR DA PELE § SKIN COLOR § COLOR DE PIEL
usar cor padrão da raça § use the race's default color § usar el color de la raza
CABEÇA E ROSTO § HEAD & FACE § CABEZA Y ROSTRO
CABELO § HAIR § PELO
Careca / sem cabelo § Bald / no hair § Calvo / sin pelo
Espetado § Spiky § Puntiagudo
Em chamas, para cima § Flame-like, upward § En llamas, hacia arriba
Repicado com mecha § Layered with a lock § Desfilado con mechón
Super Saiyajin 2 (mechas finas) § Super Saiyan 2 (thin locks) § Súper Saiyajin 2 (mechones finos)
Crista com pintas § Spotted crest § Cresta con manchas
Espetado para trás § Swept-back spikes § Puntas hacia atrás
Longo solto § Long and loose § Largo suelto
Longo, denso e espetado § Long, thick and spiky § Largo, denso y puntiagudo
3 picos § 3 spikes § 3 picos
Espetado de duas cores (centro e laterais) § Two-tone spikes (center and sides) § Puntas de dos colores (centro y lados)
Espetado alto com 2 mechas na testa § Tall spikes with 2 bangs § Puntas altas con 2 mechones en la frente
Chama jogada para trás com reflexo azulado § Swept-back flame with bluish shine § Llama hacia atrás con reflejo azulado
Espetos enormes (Lendário) § Huge spikes (Legendary) § Puntas enormes (Legendario)
Curto repartido ao meio § Short, center-parted § Corto con raya al medio
Liso curto § Short and straight § Liso corto
Liso até o ombro § Straight, shoulder-length § Liso hasta el hombro
Curto com franja lateral § Short with side bangs § Corto con flequillo lateral
Moicano § Mohawk § Mohicano
Longo espetado até a cintura § Long spikes down to the waist § Largo puntiagudo hasta la cintura
Solto, mechas caindo na testa § Loose, locks on the forehead § Suelto, mechones en la frente
Volumoso, muitas pontas § Voluminous, many spikes § Voluminoso, muchas puntas
Chama compacta e alta § Tall, compact flame § Llama compacta y alta
Pontas altas e franja curva (Blue) § Tall spikes and curved bangs (Blue) § Puntas altas y flequillo curvo (Blue)
Compacto (Blue) § Compact (Blue) § Compacto (Blue)
COR DO CABELO § HAIR COLOR § COLOR DEL PELO
COR 2 DO CABELO (laterais do de duas cores) § HAIR COLOR 2 (sides of two-tone hair) § COLOR 2 DEL PELO (lados del de dos colores)
ORELHAS § EARS § OREJAS
Normais § Normal § Normales
Pontudas § Pointy § Puntiagudas
Furinhos § Holes § Agujeritos
Sem orelha § No ears § Sin orejas
CARACTERÍSTICA DA CABEÇA § HEAD FEATURE § RASGO DE LA CABEZA
Nenhuma § None § Ninguna
Nenhum § None § Ninguno
Antenas § Antennae § Antenas
Antena curva com ponta § Curved antenna with tip § Antena curva con punta
Chifres § Horns § Cuernos
Capacete com chifres finos § Helmet with thin horns § Casco con cuernos finos
Capacete com chifres grandes § Helmet with big horns § Casco con cuernos grandes
Cabeça alongada com espinhos § Elongated head with spikes § Cabeza alargada con púas
Meia cabeça de metal com lente § Half-metal head with lens § Media cabeza de metal con lente
Antena longa curvada para a frente § Long forward-curving antenna § Antena larga curvada hacia delante
Capacete de inseto com pontas cruzadas § Insect helmet with crossed tips § Casco de insecto con puntas cruzadas
Chapa preta e pontas laterais § Black plate and side tips § Placa negra y puntas laterales
Chapa preta e pontas altas § Black plate and tall tips § Placa negra y puntas altas
OLHOS § EYES § OJOS
Gentil § Kind § Amable
Sério § Serious § Serio
Bravo/franzido § Angry/frowning § Enojado/fruncido
Arregalado § Wide-eyed § Ojos muy abiertos
Sem sobrancelha § No eyebrows § Sin cejas
Frio, pupila pequena § Cold, small pupils § Frío, pupila pequeña
Fechados § Closed § Cerrados
Brancos, sem pupila § White, no pupils § Blancos, sin pupila
COR DA ÍRIS § IRIS COLOR § COLOR DEL IRIS
COR DO OLHO (fundo) § EYE COLOR (white) § COLOR DEL OJO (fondo)
BOCA / EXPRESSÃO § MOUTH / EXPRESSION § BOCA / EXPRESIÓN
Sorridente § Smiling § Sonriente
Séria § Serious § Seria
Gritando § Shouting § Gritando
Maligna § Evil § Malvada
Risada maligna § Evil laugh § Risa malvada
Sorriso sádico com dentes § Sadistic toothy grin § Sonrisa sádica con dientes
Aberta e alegre § Open and cheerful § Abierta y alegre
CARACTERÍSTICAS ESPECIAIS § SPECIAL FEATURES § RASGOS ESPECIALES
MARCAS DA RAÇA § RACE MARKINGS § MARCAS DE LA RAZA
Placas rosadas e estrias § Pink plates and stripes § Placas rosadas y estrías
Marcas no rosto § Face markings § Marcas en el rostro
Domo e placas roxas § Dome and purple plates § Domo y placas moradas
Pele rosada listrada § Striped pink skin § Piel rosada a rayas
Placas brancas e pele listrada § White plates and striped skin § Placas blancas y piel a rayas
Corpo de metal (ciborgue) § Metal body (cyborg) § Cuerpo de metal (cyborg)
Furinhos nos braços § Holes in the arms § Agujeritos en los brazos
Bio-androide (1ª forma) § Bio-android (1st form) § Bioandroide (1ª forma)
Bio-androide (semi-perfeito) § Bio-android (semi-perfect) § Bioandroide (semiperfecto)
Bio-androide (perfeito) § Bio-android (perfect) § Bioandroide (perfecto)
CICATRIZ § SCAR § CICATRIZ
No olho § On the eye § En el ojo
Na bochecha § On the cheek § En la mejilla
No peito (aparece sem camisa) § On the chest (shows when shirtless) § En el pecho (se ve sin camisa)
De batalha: X no peito, ombro e barriga § Battle scars: X on chest, shoulder and belly § De batalla: X en pecho, hombro y barriga
RABO § TAIL § COLA
De macaco, solto § Monkey, loose § De mono, suelta
De macaco, na cintura § Monkey, around the waist § De mono, en la cintura
Longo e liso, de réptil § Long and smooth, reptile § Larga y lisa, de reptil
Grande com ferrão § Big with stinger § Grande con aguijón
ASAS § WINGS § ALAS
Asas de inseto § Insect wings § Alas de insecto
Asas de inseto abertas § Open insect wings § Alas de insecto abiertas
Asas de inseto longas (capa) § Long insect wings (cape) § Alas de insecto largas (capa)
Asas de morcego § Bat wings § Alas de murciélago
Asas de anjo § Angel wings § Alas de ángel
ROUPAS § CLOTHES § ROPA
CAMISA (por baixo) § SHIRT (underneath) § CAMISA (debajo)
Camiseta de manguinha § Short-sleeve tee § Camiseta de manga corta
Regata, sem manga § Tank top, sleeveless § Camiseta sin mangas
Malha de manga comprida § Long-sleeve top § Malla de manga larga
Malha gola alta § Turtleneck top § Malla de cuello alto
Macacão justo § Tight jumpsuit § Mono ajustado
Nenhuma (pele à mostra) § None (bare skin) § Ninguna (piel al aire)
COR DA CAMISA § SHIRT COLOR § COLOR DE LA CAMISA
ROUPA DE CIMA / CASACO § TOP / JACKET § PRENDA SUPERIOR / CHAQUETA
Gi tradicional § Traditional gi § Gi tradicional
Gi com faixa na cintura § Gi with waist sash § Gi con faja en la cintura
Gi rasgado (sem mangas) § Torn gi (sleeveless) § Gi rasgado (sin mangas)
Túnica com gola e faixa § Tunic with collar and sash § Túnica con cuello y faja
Armadura de combate § Battle armor § Armadura de combate
Armadura com ombreiras douradas § Armor with gold shoulder pads § Armadura con hombreras doradas
Armadura curta de ombreiras pequenas § Short armor with small pads § Armadura corta de hombreras pequeñas
Peitoral com gema e ombreiras verdes § Chestplate with gem and green pads § Peto con gema y hombreras verdes
Jaqueta curta § Cropped jacket § Chaqueta corta
Colete aberto com faixa § Open vest with sash § Chaleco abierto con faja
Colete curto com cinto § Short vest with belt § Chaleco corto con cinturón
Colete acolchoado aberto (fusão) § Open padded vest (fusion) § Chaleco acolchado abierto (fusión)
Só o cinto largo com fivela M § Just the wide M-buckle belt § Solo el cinturón ancho con hebilla M
Traje com gola § Suit with collar § Traje con cuello
Carapaça com pintas § Spotted carapace § Caparazón con manchas
Armadura orgânica § Organic armor § Armadura orgánica
CALÇA § PANTS § PANTALÓN
Larga § Baggy § Ancho
Justa § Tight § Ajustado
Bufante (balão) § Puffy (balloon) § Bombacho (globo)
Nenhuma (fica de cueca) § None (underwear only) § Ninguno (en ropa interior)
COR DA CALÇA § PANTS COLOR § COLOR DEL PANTALÓN
SÍMBOLO NO PEITO § CHEST SYMBOL § SÍMBOLO EN EL PECHO
Kame (tartaruga) § Kame (turtle) § Kame (tortuga)
Corporação Cápsula § Capsule Corp. § Corporación Cápsula
Exército Red Ribbon § Red Ribbon Army § Patrulla Roja
Símbolo Saiyajin § Saiyan symbol § Símbolo Saiyajin
CALÇADO § FOOTWEAR § CALZADO
Botas de artes marciais § Martial arts boots § Botas de artes marciales
Botas brancas § White boots § Botas blancas
Botas amarelas altas § Tall yellow boots § Botas amarillas altas
Botas de pano dobradas § Folded cloth boots § Botas de tela dobladas
Sandálias § Sandals § Sandalias
Botas simples § Plain boots § Botas simples
Botas escuras § Dark boots § Botas oscuras
Descalço § Barefoot § Descalzo
Pés com garras § Clawed feet § Pies con garras
Sapato preto de pontas laranjas § Black shoes with orange tips § Zapato negro de puntas naranjas
Sapato de ponta comprida § Long-tipped shoes § Zapato de punta larga
Caneleiras e pés com garras § Shin guards and clawed feet § Espinilleras y pies con garras
Botas brancas altas de ponta dourada § Tall white boots with gold tips § Botas blancas altas de punta dorada
Botas brancas de cano escuro e ponta verde § White boots with dark tops and green tips § Botas blancas de caña oscura y punta verde
Botas pretas de dobra dourada § Black boots with gold cuffs § Botas negras de doblez dorado
Botas douradas dobradas com meia § Folded gold boots with socks § Botas doradas dobladas con calcetín
Sapatilhas com faixas no tornozelo § Slippers with ankle wraps § Zapatillas con vendas en el tobillo
Botas brancas de bico dourado § White boots with gold toes § Botas blancas de puntera dorada
LUVAS § GLOVES § GUANTES
Munhequeiras § Wristbands § Muñequeras
Luvas brancas § White gloves § Guantes blancos
Luvas pretas § Black gloves § Guantes negros
Braçadeiras brancas § White bracers § Brazaletes blancos
Munhequeiras escuras de borda branca § Dark wristbands with white trim § Muñequeras oscuras con borde blanco
Munhequeiras pretas § Black wristbands § Muñequeras negras
Braçadeiras pretas longas (unhas pretas) § Long black bracers (black nails) § Brazaletes negros largos (uñas negras)
Luvas douradas § Gold gloves § Guantes dorados
Luvas brancas de punho largo § White gloves with wide cuffs § Guantes blancos de puño ancho
NA CABEÇA § ON THE HEAD § EN LA CABEZA
Nada § Nothing § Nada
Turbante § Turban § Turbante
Faixa na testa § Headband § Cinta en la frente
ACESSÓRIOS § ACCESSORIES § ACCESORIOS
NO ROSTO / ORELHA / PESCOÇO § FACE / EAR / NECK § ROSTRO / OREJA / CUELLO
Brincos Potara § Potara earrings § Pendientes Pothala
Scouter vermelho § Red scouter § Scouter rojo
Brincos Potara amarelos § Yellow Potara earrings § Pendientes Pothala amarillos
Coleira de metal (pescoço) § Metal collar (neck) § Collar de metal (cuello)
NAS COSTAS: CAPA / OMBREIRAS § BACK: CAPE / SHOULDER PADS § ESPALDA: CAPA / HOMBRERAS
Capa § Cape § Capa
Ombreiras § Shoulder pads § Hombreras
Capa + ombreiras § Cape + shoulder pads § Capa + hombreras
Capa com nó no pescoço § Cape knotted at the neck § Capa anudada al cuello
Manto felpudo na cintura § Furry waist mantle § Manto peludo en la cintura
COR DA CAPA § CAPE COLOR § COLOR DE LA CAPA
NAS COSTAS: ARMA § BACK: WEAPON § ESPALDA: ARMA
Espada § Sword § Espada
Bastão sagrado § Sacred staff § Báculo sagrado
CORES § COLORS § COLORES
COR DA ROUPA DE CIMA § TOP COLOR § COLOR DE LA PRENDA SUPERIOR
COR SECUNDÁRIA (faixa, munhequeira, cueca, top) § SECONDARY COLOR (sash, wristband, underwear, top) § COLOR SECUNDARIO (faja, muñequera, ropa interior, top)
COR DE DETALHE § DETAIL COLOR § COLOR DE DETALLE
COR DO KI / AURA § KI / AURA COLOR § COLOR DEL KI / AURA
USAR ESTE PERSONAGEM (gera as animações) § USE THIS CHARACTER (builds the animations) § USAR ESTE PERSONAJE (genera las animaciones)
As animações do personagem serão geradas automaticamente — nenhum desenho é necessário. § The character's animations are generated automatically — no drawing needed. § Las animaciones del personaje se generan automáticamente — no hace falta dibujar nada.
Na luta, com o ki cheio, cada TRANSFORMAR leva para a próxima desta lista, de cima para baixo. Cada uma dá o poder extra por um tempo e a aparência fica até o fim da luta. Use ▲▼ para mudar a ordem. § In battle, with full ki, each TRANSFORM goes to the next one in this list, top to bottom. Each gives extra power for a while and the look stays until the end of the fight. Use ▲▼ to reorder. § En la pelea, con el ki lleno, cada TRANSFORMAR pasa a la siguiente de esta lista, de arriba abajo. Cada una da poder extra un tiempo y el aspecto se queda hasta el final de la pelea. Usa ▲▼ para cambiar el orden.
Adicionar transformação § Add transformation § Añadir transformación
COPIAR O CORPO DE § COPY THE BODY OF § COPIAR EL CUERPO DE
Copiar o corpo de qual forma § Copy the body of which form § Copiar el cuerpo de qué forma
Original § Original § Original
Adicione uma transformação: ela começa igual ao personagem e você muda no construtor. § Add a transformation: it starts like the character and you change it in the builder. § Añade una transformación: empieza igual que el personaje y la cambias en el constructor.
CONJUNTOS DE SPRITES § SPRITE SETS § CONJUNTOS DE SPRITES
SALVAR PERSONAGEM § SAVE CHARACTER § GUARDAR PERSONAJE
Atualizar o jogo para a versão mais nova § Update the game to the newest version § Actualizar el juego a la versión más nueva
Atualizar o jogo § Update the game § Actualizar el juego
Fechar janela de novidades § Close the updates window § Cerrar la ventana de novedades
Novidades e correções do jogo. § Game news and fixes. § Novedades y correcciones del juego.
Área de jogo: batalha em canvas contra o vilão. Use as teclas de movimento e ação configuradas para jogar. § Game area: canvas battle against the villain. Use the configured movement and action keys to play. § Área de juego: batalla en canvas contra el villano. Usa las teclas de movimiento y acción configuradas para jugar.
Sprite sheet carregada. § Sprite sheet loaded. § Sprite sheet cargada.
Não foi possível carregar a sprite sheet. § Couldn't load the sprite sheet. § No se pudo cargar la sprite sheet.
Solte um arquivo de imagem válido. § Drop a valid image file. § Suelta un archivo de imagen válido.
Não foi possível ler o arquivo de imagem. § Couldn't read the image file. § No se pudo leer el archivo de imagen.
Cole uma URL ou um Data URL antes de carregar. § Paste a URL or Data URL before loading. § Pega una URL o Data URL antes de cargar.
Carregando sprite sheet... § Loading sprite sheet... § Cargando sprite sheet...
Clique em um quadro da grade para selecioná-lo. § Click a frame on the grid to select it. § Haz clic en un cuadro de la cuadrícula para seleccionarlo.
SUBSTITUIR QUADRO § REPLACE FRAME § REEMPLAZAR CUADRO
QUADRO ATIVO § ACTIVE FRAME § CUADRO ACTIVO
CLIQUE EM UM QUADRO CYAN ATIVO PARA FAZER A SUBSTITUIÇÃO. § CLICK AN ACTIVE CYAN FRAME TO REPLACE IT. § HAZ CLIC EN UN CUADRO CIAN ACTIVO PARA REEMPLAZARLO.
PAUSE A PRÉVIA § PAUSE THE PREVIEW § PAUSA LA VISTA PREVIA
PAUSE A PRÉVIA ANTES DE INVERTER UM FRAME. § PAUSE THE PREVIEW BEFORE FLIPPING A FRAME. § PAUSA LA VISTA PREVIA ANTES DE VOLTEAR UN CUADRO.
PAUSE A PRÉVIA ANTES DE CLONAR UM FRAME. § PAUSE THE PREVIEW BEFORE CLONING A FRAME. § PAUSA LA VISTA PREVIA ANTES DE CLONAR UN CUADRO.
PAUSE A PRÉVIA ANTES DE APAGAR UM FRAME. § PAUSE THE PREVIEW BEFORE DELETING A FRAME. § PAUSA LA VISTA PREVIA ANTES DE BORRAR UN CUADRO.
PRÉVIA VAZIA § EMPTY PREVIEW § VISTA PREVIA VACÍA
ADICIONE OU SALVE FRAMES NA PRÉVIA ANTES DE INVERTÊ-LOS. § ADD OR SAVE FRAMES IN THE PREVIEW BEFORE FLIPPING THEM. § AÑADE O GUARDA CUADROS EN LA VISTA PREVIA ANTES DE VOLTEARLOS.
NÃO FOI POSSÍVEL INVERTER O FRAME DA PRÉVIA. § COULDN'T FLIP THE PREVIEW FRAME. § NO SE PUDO VOLTEAR EL CUADRO DE LA VISTA PREVIA.
CADEADO § LOCK § CANDADO
NO 1º QUADRO O CADEADO NÃO MUDA NADA: A ANIMAÇÃO JÁ RECOMEÇA DELE. § ON THE 1ST FRAME THE LOCK DOES NOTHING: THE ANIMATION ALREADY RESTARTS THERE. § EN EL 1er CUADRO EL CANDADO NO CAMBIA NADA: LA ANIMACIÓN YA EMPIEZA AHÍ.
NÃO HÁ FRAMES PARA CLONAR. § THERE ARE NO FRAMES TO CLONE. § NO HAY CUADROS PARA CLONAR.
LIMITE DE FRAMES § FRAME LIMIT § LÍMITE DE CUADROS
O MOVIMENTO JÁ POSSUI O LIMITE DE 30 FRAMES. § THIS MOVE ALREADY HAS THE 30-FRAME LIMIT. § EL MOVIMIENTO YA TIENE EL LÍMITE DE 30 CUADROS.
NÃO HÁ FRAMES PARA APAGAR. § THERE ARE NO FRAMES TO DELETE. § NO HAY CUADROS PARA BORRAR.
MOVIMENTO VAZIO § EMPTY MOVE § MOVIMIENTO VACÍO
ADICIONE FRAMES AO MOVIMENTO ATUAL ANTES DE DUPLICÁ-LO. § ADD FRAMES TO THE CURRENT MOVE BEFORE DUPLICATING IT. § AÑADE CUADROS AL MOVIMIENTO ACTUAL ANTES DE DUPLICARLO.
MOVIMENTO IGUAL § SAME MOVE § MISMO MOVIMIENTO
ESCOLHA UM MOVIMENTO DE DESTINO DIFERENTE DO MOVIMENTO ATUAL. § PICK A TARGET MOVE DIFFERENT FROM THE CURRENT ONE. § ELIGE UN MOVIMIENTO DE DESTINO DISTINTO DEL ACTUAL.
MOVIMENTO DUPLICADO § MOVE DUPLICATED § MOVIMIENTO DUPLICADO
NÃO FOI POSSÍVEL INVERTER OS FRAMES DO MOVIMENTO. § COULDN'T FLIP THE MOVE'S FRAMES. § NO SE PUDIERON VOLTEAR LOS CUADROS DEL MOVIMIENTO.
SELECIONE UM QUADRO § SELECT A FRAME § SELECCIONA UN CUADRO
CLIQUE EM UM OU MAIS QUADROS DA SPRITE SHEET ANTES DE ADICIONAR. § CLICK ONE OR MORE SPRITE SHEET FRAMES BEFORE ADDING. § HAZ CLIC EN UNO O MÁS CUADROS DE LA SPRITE SHEET ANTES DE AÑADIR.
Toque em + NOVA FORMA (ou EDITAR numa forma) para montar os quadros. Adicionar um quadro já começa uma forma nova. § Tap + NEW FORM (or EDIT on a form) to build the frames. Adding a frame starts a new form. § Toca + NUEVA FORMA (o EDITAR en una forma) para armar los cuadros. Añadir un cuadro ya empieza una forma nueva.
Repetição recomeça neste quadro (toque para tirar) § The loop restarts on this frame (tap to remove) § La repetición vuelve a este cuadro (toca para quitar)
Travar: depois da 1ª volta, a animação recomeça neste quadro § Lock: after the 1st pass, the animation restarts on this frame § Bloquear: tras la 1ª vuelta, la animación vuelve a este cuadro
ERRO AO LER O ARQUIVO § ERROR READING THE FILE § ERROR AL LEER EL ARCHIVO
SEM FUNDO § NO BACKGROUND § SIN FONDO
OS CANTOS DA IMAGEM JÁ SÃO TRANSPARENTES. NÃO HÁ COR PARA APAGAR. § THE IMAGE CORNERS ARE ALREADY TRANSPARENT. THERE'S NO COLOR TO REMOVE. § LAS ESQUINAS DE LA IMAGEN YA SON TRANSPARENTES. NO HAY COLOR QUE BORRAR.
NÃO FOI POSSÍVEL LER A IMAGEM (ORIGEM EXTERNA BLOQUEADA PELO NAVEGADOR). ESCOLHA A COR MANUALMENTE. § COULDN'T READ THE IMAGE (EXTERNAL SOURCE BLOCKED BY THE BROWSER). PICK THE COLOR MANUALLY. § NO SE PUDO LEER LA IMAGEN (ORIGEN EXTERNO BLOQUEADO POR EL NAVEGADOR). ELIGE EL COLOR A MANO.
SEM IMAGEM § NO IMAGE § SIN IMAGEN
CARREGUE UMA IMAGEM ANTES DE ESCOLHER A COR DO FUNDO. § LOAD AN IMAGE BEFORE PICKING THE BACKGROUND COLOR. § CARGA UNA IMAGEN ANTES DE ELEGIR EL COLOR DE FONDO.
FORMA EM MONTAGEM § FORM IN PROGRESS § FORMA EN PROCESO
TOQUE EM SALVAR FORMA OU CANCELAR FORMA ANTES DE SALVAR O PERSONAGEM. § TAP SAVE FORM OR CANCEL FORM BEFORE SAVING THE CHARACTER. § TOCA GUARDAR FORMA O CANCELAR FORMA ANTES DE GUARDAR EL PERSONAJE.
CAMPO OBRIGATÓRIO § REQUIRED FIELD § CAMPO OBLIGATORIO
DIGITE O NOME DO PERSONAGEM! § TYPE THE CHARACTER'S NAME! § ¡ESCRIBE EL NOMBRE DEL PERSONAJE!
SEM ESPAÇO § OUT OF SPACE § SIN ESPACIO
O NAVEGADOR NÃO TEM ESPAÇO PARA SALVAR ESTE PERSONAGEM. USE MENOS QUADROS OU IMAGENS MENORES, OU EXCLUA OUTRO PERSONAGEM. § THE BROWSER HAS NO SPACE TO SAVE THIS CHARACTER. USE FEWER FRAMES OR SMALLER IMAGES, OR DELETE ANOTHER CHARACTER. § EL NAVEGADOR NO TIENE ESPACIO PARA GUARDAR ESTE PERSONAJE. USA MENOS CUADROS O IMÁGENES MÁS PEQUEÑAS, O ELIMINA OTRO PERSONAJE.
NÃO FOI POSSÍVEL CARREGAR A IMAGEM! § COULDN'T LOAD THE IMAGE! § ¡NO SE PUDO CARGAR LA IMAGEN!
Personagem gerado! Clique em SALVAR PERSONAGEM para guardar (ou ajuste a aparência e clique de novo). § Character generated! Click SAVE CHARACTER to keep it (or adjust the look and click again). § ¡Personaje generado! Haz clic en GUARDAR PERSONAJE para conservarlo (o ajusta el aspecto y vuelve a hacer clic).
Nome da transformação § Transformation name § Nombre de la transformación
Aura da transformação § Transformation aura § Aura de la transformación
Subir na ordem § Move up § Subir en el orden
Descer na ordem § Move down § Bajar en el orden
Editar no construtor § Edit in the builder § Editar en el constructor
Gere o personagem no CONSTRUTOR primeiro § Generate the character in the BUILDER first § Genera el personaje en el CONSTRUCTOR primero
Apagar transformação § Delete transformation § Borrar transformación
Toque em + para adicionar: ela começa igual à forma escolhida em COPIAR O CORPO DE e você muda no construtor. § Tap + to add one: it starts like the form chosen in COPY THE BODY OF and you change it in the builder. § Toca + para añadir: empieza igual que la forma elegida en COPIAR EL CUERPO DE y la cambias en el constructor.
Para mudar a aparência das transformações, gere o personagem no CONSTRUTOR (USAR ESTE PERSONAGEM). Sem isso, elas mudam só a aura, o poder e os raios. § To change how the transformations look, generate the character in the BUILDER (USE THIS CHARACTER). Without that, they only change the aura, power and lightning. § Para cambiar el aspecto de las transformaciones, genera el personaje en el CONSTRUCTOR (USAR ESTE PERSONAJE). Sin eso, solo cambian el aura, el poder y los rayos.
APAGAR TRANSFORMAÇÃO § DELETE TRANSFORMATION § BORRAR TRANSFORMACIÓN
APAGAR § DELETE § BORRAR
MONTE UMA FORMA § BUILD A FORM § ARMA UNA FORMA
TOQUE EM NOVA FORMA (OU EDITAR, NUMA FORMA JÁ CRIADA) PARA MEXER NOS QUADROS. ADICIONAR QUADRO AO MOVIMENTO JÁ COMEÇA UMA FORMA NOVA. § TAP NEW FORM (OR EDIT, ON AN EXISTING FORM) TO WORK ON THE FRAMES. ADD FRAME TO MOVE ALREADY STARTS A NEW FORM. § TOCA NUEVA FORMA (O EDITAR, EN UNA FORMA YA CREADA) PARA TOCAR LOS CUADROS. AÑADIR CUADRO AL MOVIMIENTO YA EMPIEZA UNA FORMA NUEVA.
Montando uma forma nova: adicione os quadros de cada movimento e toque em SALVAR FORMA. § Building a new form: add the frames of each move and tap SAVE FORM. § Armando una forma nueva: añade los cuadros de cada movimiento y toca GUARDAR FORMA.
CARREGANDO § LOADING § CARGANDO
OS QUADROS DESTA FORMA AINDA ESTÃO CARREGANDO. TENTE DE NOVO EM UM INSTANTE. § THIS FORM'S FRAMES ARE STILL LOADING. TRY AGAIN IN A MOMENT. § LOS CUADROS DE ESTA FORMA AÚN ESTÁN CARGANDO. INTÉNTALO DE NUEVO EN UN INSTANTE.
Forma descartada. § Form discarded. § Forma descartada.
FALTA O PARADO § IDLE IS MISSING § FALTA EL QUIETO
COLOQUE PELO MENOS UM QUADRO NO MOVIMENTO PARADO ANTES DE SALVAR A FORMA. § PUT AT LEAST ONE FRAME IN THE IDLE MOVE BEFORE SAVING THE FORM. § PON AL MENOS UN CUADRO EN EL MOVIMIENTO QUIETO ANTES DE GUARDAR LA FORMA.
CRIE AS TRANSFORMAÇÕES EM ORDEM: SÓ A PRÓXIMA DEPOIS DA ÚLTIMA. § CREATE THE TRANSFORMATIONS IN ORDER: ONLY THE NEXT ONE AFTER THE LAST. § CREA LAS TRANSFORMACIONES EN ORDEN: SOLO LA SIGUIENTE DESPUÉS DE LA ÚLTIMA.
APAGAR FORMA § DELETE FORM § BORRAR FORMA
APAGAR CONJUNTO § DELETE SET § BORRAR CONJUNTO
AGRUPAR § GROUP § AGRUPAR
MARQUE UMA FORMA BASE (SÓ UMA). § CHECK ONE BASE FORM (JUST ONE). § MARCA UNA FORMA BASE (SOLO UNA).
MARQUE TAMBÉM A TRANSFORMAÇÃO 1. § ALSO CHECK TRANSFORMATION 1. § MARCA TAMBIÉN LA TRANSFORMACIÓN 1.
AS TRANSFORMAÇÕES PRECISAM ESTAR EM ORDEM (1, 2, 3...), SEM REPETIR NEM PULAR. § TRANSFORMATIONS MUST BE IN ORDER (1, 2, 3...), NO REPEATS OR GAPS. § LAS TRANSFORMACIONES DEBEN IR EN ORDEN (1, 2, 3...), SIN REPETIR NI SALTAR.
ANIMAÇÕES PADRÃO § DEFAULT ANIMATIONS § ANIMACIONES PREDETERMINADAS
USAR CONJUNTO § USE SET § USAR CONJUNTO
VOLTAR ÀS ANIMAÇÕES PADRÃO DO PERSONAGEM? § GO BACK TO THE CHARACTER'S DEFAULT ANIMATIONS? § ¿VOLVER A LAS ANIMACIONES PREDETERMINADAS DEL PERSONAJE?
Pronto: o personagem já usa este conjunto (editor, DATABASE, seleção e luta). § Done: the character now uses this set (editor, DATABASE, select and fight). § Listo: el personaje ya usa este conjunto (editor, BASE DE DATOS, selección y pelea).
Escolhido. Vale ao SALVAR PERSONAGEM. § Chosen. Applies when you SAVE CHARACTER. § Elegido. Se aplica al GUARDAR PERSONAJE.
ORIGINAL § ORIGINAL § ORIGINAL
EM USO § IN USE § EN USO
Ver e editar as formas deste conjunto § View and edit this set's forms § Ver y editar las formas de este conjunto
Apagar conjunto § Delete set § Borrar conjunto
Forma base § Base form § Forma base
MONTANDO FORMA NOVA § BUILDING NEW FORM § ARMANDO FORMA NUEVA
SALVAR COMO § SAVE AS § GUARDAR COMO
SALVAR FORMA § SAVE FORM § GUARDAR FORMA
CANCELAR FORMA § CANCEL FORM § CANCELAR FORMA
agrupar § group § agrupar
+ NOVA FORMA § + NEW FORM § + NUEVA FORMA
Nome do conjunto § Set name § Nombre del conjunto
SIM, SALVAR § YES, SAVE § SÍ, GUARDAR
Altura (cm) § Height (cm) § Altura (cm)
VILÃO DA FASE § STAGE VILLAIN § VILLANO DE LA FASE
EM QUAL FORMA ELE APARECE NESTA FASE? § WHICH FORM DOES HE USE IN THIS STAGE? § ¿EN QUÉ FORMA APARECE EN ESTA FASE?
CONFIGURAR ARENA § ARENA SETUP § CONFIGURAR ARENA
FASE § STAGE § FASE
PERSONAGEM § CHARACTER § PERSONAJE
MINION § MINION § ESBIRRO
MINIONS § MINIONS § ESBIRROS
Minion § Minion § Esbirro
MINION CLÁSSICO: § CLASSIC MINION: § ESBIRRO CLÁSICO:
MINION CLÁSSICO § CLASSIC MINION § ESBIRRO CLÁSICO
Desenho original do jogo, com a aparência e os movimentos de sempre. Só muda a cor que você trocar. § The game's original drawing, with its usual look and moves. Only the colours you change are different. § El dibujo original del juego, con el aspecto y los movimientos de siempre. Solo cambia el color que cambies.
VOLTAR ÀS CORES ORIGINAIS § BACK TO ORIGINAL COLOURS § VOLVER A LOS COLORES ORIGINALES
Minion clássico escolhido! Troque as cores na aba DADOS e clique em SALVAR PERSONAGEM. § Classic minion chosen! Change the colours in the INFO tab and click SAVE CHARACTER. § ¡Esbirro clásico elegido! Cambia los colores en la pestaña DATOS y haz clic en GUARDAR PERSONAJE.
Saibaman (clássico) § Saibaman (classic) § Saibaman (clásico)
Cell Jr. (clássico) § Cell Jr. (classic) § Cell Jr. (clásico)
PELE § SKIN § PIEL
BOCA § MOUTH § BOCA
GARRAS § CLAWS § GARRAS
CONTORNO § OUTLINE § CONTORNO
MANCHAS § SPOTS § MANCHAS
ARMADURA § ARMOUR § ARMADURA
ROSTO § FACE § ROSTRO
MARCAS § MARKS § MARCAS
QUEIXEIRA § CHIN GUARD § BARBOQUEJO
MÃOS § HANDS § MANOS
BOTAS § BOOTS § BOTAS
Minion: cabeça de Saibaman § Minion: Saibaman head § Esbirro: cabeza de Saibaman
Minion: crista de Cell Jr. § Minion: Cell Jr. crest § Esbirro: cresta de Cell Jr.
Minion: anéis (Saibaman) § Minion: rings (Saibaman) § Esbirro: anillos (Saibaman)
Minion: manchas (Cell Jr.) § Minion: spots (Cell Jr.) § Esbirro: manchas (Cell Jr.)
Minion: pés com garras § Minion: clawed feet § Esbirro: pies con garras
Minion: mãos com garras § Minion: clawed hands § Esbirro: manos con garras
Minion (baixinho, cabeça grande) § Minion (short, big head) § Esbirro (bajito, cabeza grande)
COR DAS VEIAS / MANCHAS (PEÇAS DE MINION) § VEIN / SPOT COLOR (MINION PARTS) § COLOR DE VENAS / MANCHAS (PIEZAS DE ESBIRRO)
COR DAS GARRAS (PEÇAS DE MINION) § CLAW COLOR (MINION PARTS) § COLOR DE LAS GARRAS (PIEZAS DE ESBIRRO)
TROCAR § CHANGE § CAMBIAR
NENHUM ESCOLHIDO § NONE CHOSEN § NINGUNO ELEGIDO
ADVERSÁRIOS MAIS FORTES VIRÃO! § STRONGER OPPONENTS ARE COMING! § ¡VIENEN RIVALES MÁS FUERTES!
PREPARE-SE § GET READY § PREPÁRATE
ADVERSÁRIOS MAIS FORTES VIRÃO! PREPARE-SE § STRONGER OPPONENTS ARE COMING! GET READY § ¡VIENEN RIVALES MÁS FUERTES! PREPÁRATE
Altura da transformação (cm) § Transformation height (cm) § Altura de la transformación (cm)
Tamanho na luta: 175 cm = tamanho normal. Muito alto ou muito baixo tem limite, para o lutador caber na arena. § Size in battle: 175 cm = normal size. Very tall or very short is capped so the fighter fits the arena. § Tamaño en la pelea: 175 cm = tamaño normal. Muy alto o muy bajo tiene límite para que el luchador quepa en la arena.
`;

// Textos com partes que mudam (números, nomes): [expressão, inglês, espanhol]. "$1" = trecho igual;
// "{1}" = trecho traduzido também. Função recebe (m, T) e devolve o texto.
const IDIOMA_REGRAS = [
    [/^Deseja selecionar (.+) para o (JOGADOR \d)\?$/, (m, T) => `Select ${m[1]} for ${T(m[2])}?`, (m, T) => `¿Seleccionar a ${m[1]} para el ${T(m[2])}?`],
    [/^Em qual forma (.+) aparece nesta fase\?$/, "Which form does $1 appear in on this stage?", "¿En qué forma aparece $1 en esta fase?"],
    [/^TROCA DE LUGAR COM: (.*) \(VAI PARA A FASE (\d+)\)$/, "SWAPS PLACES WITH: $1 (GOES TO STAGE $2)", "CAMBIA DE LUGAR CON: $1 (VA A LA FASE $2)"],
    [/^Deseja selecionar (.+) para o herói\?$/, "Select $1 as the hero?", "¿Seleccionar a $1 como héroe?"],
    [/^Deseja selecionar (.+) para:$/, "Select $1 as:", "¿Seleccionar a $1 como:"],
    [/^JOGADOR (\d)$/, "PLAYER $1", "JUGADOR $1"],
    [/^SELEÇÃO DE PERSONAGEM — JOGADOR (\d)$/, "CHARACTER SELECT — PLAYER $1", "SELECCIÓN DE PERSONAJE — JUGADOR $1"],
    [/^TRANSFORMAÇÃO (\d+)$/i, "TRANSFORMATION $1", "TRANSFORMACIÓN $1"],
    [/^Transformação (\d+)$/, "Transformation $1", "Transformación $1"],
    [/^(.*)  ·  ESPECIAL: (.*)$/, (m, T) => `${T(m[1])}  ·  SPECIAL: ${m[2]}`, (m, T) => `${T(m[1])}  ·  ESPECIAL: ${m[2]}`],
    [/^SCORE: (.+)$/, "SCORE: $1", "PUNTOS: $1"],
    [/^WAVE: (.+)$/, "WAVE: $1", "OLEADA: $1"],
    [/^RODADA (\d+)$/, "ROUND $1", "RONDA $1"],
    [/^ONDA (\d+) — (.+)$/, (m, T) => `WAVE ${m[1]} — ${T(m[2])}`, (m, T) => `OLEADA ${m[1]} — ${T(m[2])}`],
    [/^RECORDE DA FASE: ONDA (\d+)$/, "STAGE RECORD: WAVE $1", "RÉCORD DE LA FASE: OLEADA $1"],
    [/^RECORDE: ONDA (\d+)$/, "RECORD: WAVE $1", "RÉCORD: OLEADA $1"],
    [/^PLACAR: J1 (\d+) x (\d+) J2$/, "SCORE: P1 $1 x $2 P2", "MARCADOR: J1 $1 x $2 J2"],
    [/^MELHOR DE (\d+) RODADAS$/, "BEST OF $1 ROUNDS", "AL MEJOR DE $1 RONDAS"],
    [/^COMBO x(\d+)$/, "COMBO x$1", "COMBO x$1"],
    [/^FASE (\d+)$/, "STAGE $1", "FASE $1"],
    [/^Fase (\d+): (.+)$/, (m, T) => `Stage ${m[1]}: ${T(m[2])}`, (m, T) => `Fase ${m[1]}: ${T(m[2])}`],
    [/^TOTAL: (.+)$/, "TOTAL: $1", "TOTAL: $1"],
    [/^MODO (.+) CONCLUÍDO!$/, (m, T) => `${T(m[1])} MODE CLEARED!`, (m, T) => `¡MODO ${T(m[1])} COMPLETADO!`],
    [/^JOGADOR (\d) VENCEU!$/, "PLAYER $1 WINS!", "¡GANA EL JUGADOR $1!"],
    [/^JOGADOR (\d) VENCEU A RODADA!$/, "PLAYER $1 WINS THE ROUND!", "¡EL JUGADOR $1 GANA LA RONDA!"],
    [/^RODADA (\d+)  —  (\d+) x (\d+)$/, "ROUND $1  —  $2 x $3", "RONDA $1  —  $2 x $3"],
    [/^PLACAR FINAL: (\d+) x (\d+)  \(ESTATÍSTICAS DO JOGADOR 1\)$/, "FINAL SCORE: $1 x $2  (PLAYER 1 STATS)", "MARCADOR FINAL: $1 x $2  (ESTADÍSTICAS DEL JUGADOR 1)"],
    [/^PASSO (\d+)\/(\d+): (.+)$/, (m, T) => `STEP ${m[1]}/${m[2]}: ${T(m[3])}`, (m, T) => `PASO ${m[1]}/${m[2]}: ${T(m[3])}`],
    [/^TECLADO: (.+) OU (.+)$/, (m, T) => `KEYBOARD: ${T(m[1])} OR ${T(m[2])}`, (m, T) => `TECLADO: ${T(m[1])} O ${T(m[2])}`],
    [/^TECLADO: (.+)$/, (m, T) => `KEYBOARD: ${idiomaLista(m[1], T)}`, (m, T) => `TECLADO: ${idiomaLista(m[1], T)}`],
    [/^TECLADO\/MOUSE: (.+)$/, (m, T) => `KEYBOARD/MOUSE: ${T(m[1])}`, (m, T) => `TECLADO/RATÓN: ${T(m[1])}`],
    [/^CONTROLE: (.+)$/, (m, T) => `GAMEPAD: ${T(m[1])}`, (m, T) => `MANDO: ${T(m[1])}`],
    [/^TOQUE \(OU SEGURE\) NO BOTÃO "(.+)" NA TELA$/, (m, T) => `TAP (OR HOLD) THE "${T(m[1])}" BUTTON ON SCREEN`, (m, T) => `TOCA (O MANTÉN) EL BOTÓN "${T(m[1])}" EN LA PANTALLA`],
    [/^APOIE O DEDO (.+)$/, (m, T) => `REST YOUR FINGER ${T(m[1])}`, (m, T) => `APOYA EL DEDO ${T(m[1])}`],
    [/^(CIMA|BAIXO|ESQ\.|DIR\.|ATAQUE|CARREGAR|TRANSF\.|PARRY|ESPECIAL): (.+)$/, (m, T) => `${T(m[1])}: ${idiomaLista(m[2], T)}`, (m, T) => `${T(m[1])}: ${idiomaLista(m[2], T)}`],
    [/^NUM (.+)$/, "NUM $1", "NUM $1"],
    [/^TECLAS: (.+)$/, (m, T) => `KEYS: ${idiomaLista(m[1], T)}`, (m, T) => `TECLAS: ${idiomaLista(m[1], T)}`],
    [/^MOUSE: (.+)    TOQUES NA TELA: (\d+)$/, (m, T) => `MOUSE: ${idiomaLista(m[1], T)}    SCREEN TOUCHES: ${m[2]}`, (m, T) => `RATÓN: ${idiomaLista(m[1], T)}    TOQUES EN PANTALLA: ${m[2]}`],
    [/^CONTROLES CONECTADOS: (\d+)$/, "GAMEPADS CONNECTED: $1", "MANDOS CONECTADOS: $1"],
    [/^NO COMANDO: JOGADOR (\d)$/, "IN CONTROL: PLAYER $1", "AL MANDO: JUGADOR $1"],
    [/^Direcional\/analógico: (.+)   \|   Vibração: (.+)$/, (m, T) => `D-pad/stick: ${T(m[1])}   |   Vibration: ${T(m[2])}`, (m, T) => `Cruceta/stick: ${T(m[1])}   |   Vibración: ${T(m[2])}`],
    [/^VOLUME SFX: (\d+)%$/, "SFX VOLUME: $1%", "VOLUMEN EFECTOS: $1%"],
    [/^VOLUME BGM: (\d+)%$/, "MUSIC VOLUME: $1%", "VOLUMEN MÚSICA: $1%"],
    [/^DUPLO TOQUE PARRY: (ATIVADO|DESATIVADO)$/, (m) => `DOUBLE-TAP PARRY: ${m[1] === "ATIVADO" ? "ON" : "OFF"}`, (m) => `PARRY CON DOBLE TOQUE: ${m[1] === "ATIVADO" ? "ACTIVADO" : "DESACTIVADO"}`],
    [/^VIBRAÇÃO: (ATIVADA|DESATIVADA)$/, (m) => `VIBRATION: ${m[1] === "ATIVADA" ? "ON" : "OFF"}`, (m) => `VIBRACIÓN: ${m[1] === "ATIVADA" ? "ACTIVADA" : "DESACTIVADA"}`],
    [/^TIRO CONTÍNUO \(DEDO NO ANALÓGICO\): (ATIVADO|DESATIVADO)$/, (m) => `AUTO-FIRE (FINGER ON STICK): ${m[1] === "ATIVADO" ? "ON" : "OFF"}`, (m) => `DISPARO CONTINUO (DEDO EN EL STICK): ${m[1] === "ATIVADO" ? "ACTIVADO" : "DESACTIVADO"}`],
    [/^TAMANHO (\d+)%$/, "SIZE $1%", "TAMAÑO $1%"],
    [/^OPAC\. (\d+)%$/, "OPAC. $1%", "OPAC. $1%"],
    [/^(\d+)\. SCORE: (.+)  -  DATA: (.+)$/, "$1. SCORE: $2  -  DATE: $3", "$1. PUNTOS: $2  -  FECHA: $3"],
    [/^(\d+)\. SCORE: (\S+)  -  TEMPO: (\S+)  -  GOLPES: (\S+)  -  (.+)$/, "$1. SCORE: $2  -  TIME: $3  -  HITS TAKEN: $4  -  $5", "$1. PUNTOS: $2  -  TIEMPO: $3  -  GOLPES RECIBIDOS: $4  -  $5"],
    [/^APERTE O BOTÃO PARA: (.+)$/, (m, T) => `PRESS THE BUTTON FOR: ${T(m[1])}`, (m, T) => `PULSA EL BOTÓN PARA: ${T(m[1])}`],
    [/^ESC OU CLIQUE CANCELA  \|  (\d+)s$/, "ESC OR CLICK CANCELS  |  $1s", "ESC O CLIC CANCELA  |  $1s"],
    [/^(.+) JÁ ERA DE (.+): OS DOIS FORAM TROCADOS$/, (m, T) => `${T(m[1])} WAS ALREADY ${T(m[2])}: THEY WERE SWAPPED`, (m, T) => `${T(m[1])} YA ERA DE ${T(m[2])}: SE INTERCAMBIARON`],
    [/^BOTÃO (\d+)$/, "BUTTON $1", "BOTÓN $1"],
    [/^COMPLETE O MODO NORMAL DE "(.+)" PRA LIBERAR$/, (m, T) => `BEAT NORMAL MODE ON "${T(m[1])}" TO UNLOCK`, (m, T) => `SUPERA EL MODO NORMAL DE "${T(m[1])}" PARA DESBLOQUEAR`],
    [/^REMOVER (.+)\?$/, "DELETE $1?", "¿ELIMINAR A $1?"],
    [/^APAGAR "(.+)"\?$/, "DELETE \"$1\"?", "¿BORRAR \"$1\"?"],
    [/^APAGAR (FORMA BASE|TRANSFORMAÇÃO \d+)\?(.*)$/, (m, T) => `DELETE ${T(m[1])}?${T(m[2])}`, (m, T) => `¿BORRAR ${T(m[1])}?${T(m[2])}`],
    [/^ ELA ESTÁ EM (.+), QUE TAMBÉM SERÁ APAGADO\.$/, " IT'S IN $1, WHICH WILL ALSO BE DELETED.", " ESTÁ EN $1, QUE TAMBIÉN SE BORRARÁ."],
    [/^APAGAR O CONJUNTO (.+)\? AS FORMAS CONTINUAM SALVAS\.$/, "DELETE THE SET $1? THE FORMS STAY SAVED.", "¿BORRAR EL CONJUNTO $1? LAS FORMAS SIGUEN GUARDADAS."],
    [/^USAR O CONJUNTO (.*)\?$/, "USE THE SET $1?", "¿USAR EL CONJUNTO $1?"],
    [/^Conjunto (.+) criado\. Toque nele para usar\.$/, "Set $1 created. Tap it to use it.", "Conjunto $1 creado. Tócalo para usarlo."],
    [/^(FORMA BASE|TRANSFORMAÇÃO \d+) salva\.$/, (m, T) => `${T(m[1])} saved.`, (m, T) => `${T(m[1])} guardada.`],
    [/^(FORMA BASE|TRANSFORMAÇÃO \d+) salva\. Vale ao SALVAR PERSONAGEM\.$/, (m, T) => `${T(m[1])} saved. Applies when you SAVE CHARACTER.`, (m, T) => `${T(m[1])} guardada. Se aplica al GUARDAR PERSONAJE.`],
    [/^Editando (.+)\. Toque em SALVAR FORMA para guardar\.$/, (m, T) => `Editing ${T(m[1])}. Tap SAVE FORM to keep it.`, (m, T) => `Editando ${T(m[1])}. Toca GUARDAR FORMA para conservarla.`],
    [/^EDITANDO (.+)$/, (m, T) => `EDITING ${T(m[1])}`, (m, T) => `EDITANDO ${T(m[1])}`],
    [/^FORMAS DE (.+):$/, "FORMS OF $1:", "FORMAS DE $1:"],
    [/^CONJUNTO (\d+)$/, "SET $1", "CONJUNTO $1"],
    [/^Formas do conjunto (.+)$/, "Forms of set $1", "Formas del conjunto $1"],
    [/^Apagar conjunto (.+)$/, "Delete set $1", "Borrar conjunto $1"],
    [/^PERSONAGEM (.+) SALVO!$/, "CHARACTER $1 SAVED!", "¡PERSONAJE $1 GUARDADO!"],
    [/^PERSONAGEM (.+) SALVO! COMO NENHUM QUADRO FOI ESCOLHIDO PARA "PARADO", FOI USADO O 1º QUADRO DA SPRITE SHEET\.$/, "CHARACTER $1 SAVED! SINCE NO FRAME WAS CHOSEN FOR \"IDLE\", THE SPRITE SHEET'S 1ST FRAME WAS USED.", "¡PERSONAJE $1 GUARDADO! COMO NO SE ELIGIÓ NINGÚN CUADRO PARA \"QUIETO\", SE USÓ EL 1er CUADRO DE LA SPRITE SHEET."],
    [/^Sprite sheet carregada: (.+)$/, "Sprite sheet loaded: $1", "Sprite sheet cargada: $1"],
    [/^DESEJA APAGAR (\d+) FRAME\(S\) SELECIONADO\(S\)\?$/, "DELETE $1 SELECTED FRAME(S)?", "¿BORRAR $1 CUADRO(S) SELECCIONADO(S)?"],
    [/^FRAMES COPIADOS PARA (.+)\.$/, (m, T) => `FRAMES COPIED TO ${T(m[1])}.`, (m, T) => `CUADROS COPIADOS A ${T(m[1])}.`],
    [/^FRAMES INVERTIDOS COPIADOS PARA (.+)\.$/, (m, T) => `FLIPPED FRAMES COPIED TO ${T(m[1])}.`, (m, T) => `CUADROS VOLTEADOS COPIADOS A ${T(m[1])}.`],
    [/^APAGAR TODOS OS (\d+) QUADRO\(S\) DO MOVIMENTO (.+)\?$/, (m, T) => `DELETE ALL ${m[1]} FRAME(S) OF THE ${T(m[2])} MOVE?`, (m, T) => `¿BORRAR LOS ${m[1]} CUADRO(S) DEL MOVIMIENTO ${T(m[2])}?`],
    [/^PRÉVIA: (.+) (\d+\/\d+|VAZIA)$/, (m, T) => `PREVIEW: ${T(m[1])} ${m[2] === "VAZIA" ? "EMPTY" : m[2]}`, (m, T) => `VISTA PREVIA: ${T(m[1])} ${m[2] === "VAZIA" ? "VACÍA" : m[2]}`],
    [/^PRÉVIA: (.+?)( \(.*\))?$/, (m, T) => `PREVIEW: ${T(m[1])}${m[2] || ""}`, (m, T) => `VISTA PREVIA: ${T(m[1])}${m[2] || ""}`],
    [/^F(\d+) está inativo\. Deseja substituir um quadro ativo por ele\?$/, "F$1 is inactive. Replace an active frame with it?", "F$1 está inactivo. ¿Reemplazar un cuadro activo por él?"],
    [/^F(\d+) aguardando substituição\. Clique em um quadro cyan ativo para confirmar a troca\.$/, "F$1 waiting to replace. Click an active cyan frame to confirm.", "F$1 esperando reemplazo. Haz clic en un cuadro cian activo para confirmar."],
    [/^MOTIVO: (.+)$/s, (m, T) => `REASON: ${T(m[1])}`, (m, T) => `MOTIVO: ${T(m[1])}`],
    [/^ERRO: (.+)$/, "ERROR: $1", "ERROR: $1"]
];

// "SETA CIMA / SETA ESQ." e "A + S": traduz cada parte
function idiomaLista(s, T) {
    return String(s).split(/( \/ | \+ )/).map(p => (p === " / " || p === " + ") ? p : T(p)).join("");
}

const idiomaTabela = { en: new Map(), es: new Map() };
(function montarTabela() {
    IDIOMA_LINHAS.split("\n").forEach(linha => {
        const partes = linha.split(" § ");
        if (partes.length !== 3) return;
        const pt = partes[0].trim();
        idiomaTabela.en.set(pt, partes[1].trim());
        idiomaTabela.es.set(pt, partes[2].trim());
    });
})();

const idiomaCache = { en: new Map(), es: new Map() };
function T(texto) {
    if (idiomaAtual === "pt" || typeof texto !== "string" || !texto) return texto;
    const cache = idiomaCache[idiomaAtual];
    const ja = cache.get(texto);
    if (ja !== undefined) return ja;
    const r = idiomaTraduzirSemCache(texto, idiomaAtual);
    if (cache.size > 3000) cache.clear();   // textos com números mudam (SCORE: 12...): não deixa crescer sem fim
    cache.set(texto, r);
    return r;
}

function idiomaTraduzirSemCache(texto, lingua) {
    const tabela = idiomaTabela[lingua];
    if (tabela.has(texto)) return tabela.get(texto);
    // espaços em volta (e quebras de linha do HTML): traduz o miolo e mantém as bordas
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(texto);
    const miolo = m[2].replace(/\s+/g, " ");
    if (miolo !== texto) {
        if (tabela.has(miolo)) return m[1] + tabela.get(miolo) + m[3];
    }
    const col = lingua === "en" ? 1 : 2;
    for (const regra of IDIOMA_REGRAS) {
        const achou = regra[0].exec(m[2]) || regra[0].exec(miolo);
        if (!achou) continue;
        const modelo = regra[col];
        const sub = (t) => idiomaTraduzirSemCache(t, lingua);
        const r = typeof modelo === "function" ? modelo(achou, sub) : modelo.replace(/\$(\d)/g, (_, n) => achou[n] || "");
        return m[1] + r + m[3];
    }
    return texto;
}

// ---------- canvas ----------
function instalarTraducaoNoCanvas(c) {
    if (!c || c.__traduzido === true) return;
    const fill = c.fillText, stroke = c.strokeText, medir = c.measureText;
    try {
        c.fillText = function (t, ...r) { return fill.call(this, T(t), ...r); };
        c.strokeText = function (t, ...r) { return stroke.call(this, T(t), ...r); };
        c.measureText = function (t) { return medir.call(this, T(t)); };
        c.__traduzido = true;
    } catch (e) { /* contexto sem como trocar: fica em português */ }
}

// ---------- HTML ----------
const idiomaOriginais = typeof WeakMap !== "undefined" ? new WeakMap() : null;
const IDIOMA_ATRIBUTOS = ["title", "placeholder", "aria-label"];
let idiomaMudandoDom = false;

function idiomaPularNo(no) {
    for (let e = no.nodeType === 1 ? no : no.parentNode; e; e = e.parentNode) {
        if (e.id === "lista-updates") return true;   // notas antigas: ficam em português
        if (e.tagName === "SCRIPT" || e.tagName === "STYLE" || e.tagName === "TEXTAREA") return true;
    }
    return false;
}

function idiomaTraduzirNoTexto(no) {
    if (!idiomaOriginais || idiomaPularNo(no)) return;
    let orig = idiomaOriginais.get(no);
    const atual = no.nodeValue;
    // o jogo escreveu um texto novo neste nó: ele vira o novo original
    if (orig === undefined || (atual !== orig.texto && atual !== orig.traduzido)) orig = { texto: atual };
    const novo = idiomaAtual === "pt" ? orig.texto : T(orig.texto);
    orig.traduzido = novo;
    idiomaOriginais.set(no, orig);
    if (no.nodeValue !== novo) no.nodeValue = novo;
}

function idiomaTraduzirAtributos(el) {
    if (!el.getAttribute || idiomaPularNo(el)) return;
    IDIOMA_ATRIBUTOS.forEach(a => {
        const chave = "data-pt-" + a;
        let orig = el.getAttribute(chave);
        const atual = el.getAttribute(a);
        if (atual === null) return;
        if (orig === null || (atual !== orig && atual !== T(orig))) { orig = atual; el.setAttribute(chave, orig); }
        const novo = idiomaAtual === "pt" ? orig : T(orig);
        if (atual !== novo) el.setAttribute(a, novo);
    });
}

function traduzirDom(raiz) {
    if (typeof document === "undefined" || !document.createTreeWalker || !raiz) return;
    idiomaMudandoDom = true;
    try {
        if (raiz.nodeType === 3) { idiomaTraduzirNoTexto(raiz); return; }
        const w = document.createTreeWalker(raiz, 4 /* NodeFilter.SHOW_TEXT */);
        let n;
        while ((n = w.nextNode())) if (/[A-Za-zÀ-ú]/.test(n.nodeValue)) idiomaTraduzirNoTexto(n);
        if (raiz.querySelectorAll) {
            idiomaTraduzirAtributos(raiz);
            raiz.querySelectorAll("[title],[placeholder],[aria-label]").forEach(idiomaTraduzirAtributos);
        }
    } finally { idiomaMudandoDom = false; }
}

// o que o jogo escreve depois (alertas, editor, botões de ATUALIZAR...) também é traduzido
let idiomaObservador = null;
function idiomaVigiarDom() {
    if (idiomaObservador || typeof MutationObserver === "undefined" || typeof document === "undefined" || !document.body) return;
    idiomaObservador = new MutationObserver(lista => {
        if (idiomaMudandoDom || idiomaAtual === "pt") return;
        lista.forEach(m => {
            if (m.type === "characterData") traduzirDom(m.target);
            else if (m.type === "attributes") { idiomaMudandoDom = true; try { idiomaTraduzirAtributos(m.target); } finally { idiomaMudandoDom = false; } }
            else m.addedNodes.forEach(n => traduzirDom(n));
        });
    });
    idiomaObservador.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: IDIOMA_ATRIBUTOS });
}

function trocarIdioma(id) {
    if (!IDIOMAS_DISPONIVEIS.some(i => i.id === id)) return;
    idiomaAtual = id;
    if (typeof writeStorage === "function") writeStorage(IDIOMA_CHAVE, id);
    if (typeof document !== "undefined" && document.documentElement) {
        try { document.documentElement.lang = id === "pt" ? "pt-BR" : id; } catch (e) { /* sem DOM */ }
        traduzirDom(document.body);
    }
}

if (typeof document !== "undefined" && typeof window !== "undefined" && window.addEventListener) {
    const iniciar = () => { idiomaVigiarDom(); if (idiomaAtual !== "pt") trocarIdioma(idiomaAtual); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
    else iniciar();
}

if (typeof module !== "undefined" && module.exports) module.exports = { T, trocarIdioma, idiomaTabela, IDIOMA_REGRAS };
