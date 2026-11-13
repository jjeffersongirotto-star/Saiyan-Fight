// Números da luta. Tudo em pixels lógicos (tela 800x350, igual ao jogo antigo) e em QUADROS de 1/60 s:
// a lógica roda sempre no passo fixo, então o jogo se comporta igual em qualquer celular ou monitor.
// Os valores vêm do jogo antigo (game-logic-core.js / gameplay.js); onde o antigo tratava o jogador 2 diferente
// (velocidade 4, sem invulnerabilidade, transformação só "agressividade"), o VERSUS novo usa a regra do jogador 1
// para os dois — "um contra o outro em pé de igualdade" (AGENTS.md).

export const TELA_L = 800;
export const TELA_A = 350;
export const PASSO_MS = 1000 / 60;
/** No máximo tantos passos por quadro desenhado (celular travou 1 s: não "corre" 60 passos de uma vez). */
export const PASSOS_MAX_POR_QUADRO = 5;

export const CHAO_Y = 318;            // linha dos pés quando está no chão
export const TETO_Y = 44;             // abaixo da faixa das barras de vida
export const MARGEM_X = 24;
export const MEIO_X = TELA_L / 2;     // cada jogador fica na sua metade (getPlayer1MaxX/getPlayer2MinX)

// caixa de acerto de quem tem 175 cm; cresce/encolhe com a altura (escalaDaAltura)
export const LUTADOR_L = 40;
export const LUTADOR_A = 72;
export const ALTURA_PADRAO_CM = 175;
export const ESCALA_ALTURA_MIN = 0.75;
export const ESCALA_ALTURA_MAX = 1.4;

export const VELOCIDADE = 4.5;        // player.speed
export const VIDA_VERSUS = 4;         // VERSUS_FIGHTER_HP
export const RODADAS_PARA_VENCER = 2; // VERSUS_ROUNDS_TO_WIN (melhor de 3)
export const KI_MAX = 100;
export const KI_CARREGAR_POR_QUADRO = 0.8; // gameplay.js: player.ki + 0.8 por quadro segurando CARREGAR

export const TIRO_INTERVALO = 11;     // KI_TIRO_INTERVALO_QUADROS: ~5 tiros por segundo
export const TIRO_VELOCIDADE = 7;
export const TIRO_RAIO = 8;
export const TIRO_DANO = 1;           // NORMAL_ATTACK_DAMAGE
export const TIROS_MAX = 60;
export const POSE_TIRO_QUADROS = 18;

// parry (tryReflect): na hora do aperto, devolve os tiros do outro que estão dentro do círculo
export const PARRY_POSE_QUADROS = 14;
export const PARRY_RAIO = 56;         // PARRY_RADIUS
export const PARRY_ERROU_ESPERA = 30; // PARRY_WHIFF_COOLDOWN
export const PARRY_REFLEXO_VEL = 1.4;

// transformação (transformPlayer): ki cheio, sobe um nível; +1 de velocidade por 15 s (renova, não acumula)
export const TRANSFORMANDO_QUADROS = 45;
export const PODER_TRANSFORMACAO_QUADROS = 15 * 60; // TRANSFORM_POWER_DURATION
export const PODER_BONUS_VELOCIDADE = 1;

// especial: só com o ki cheio, 3 de dano (getSpecialDamage), o raio dura 40 quadros
export const ESPECIAL_DANO = 3;
export const ESPECIAL_DURACAO = 40;
/** quadros até o raio chegar no adversário (o dano entra aí; antes disso ele ainda pode responder = choque) */
export const ESPECIAL_CHEGA = 18;
export const SOL_DURACAO = 72;        // sol do Freeza: cresce no dedo e voa devagar
export const SOL_CHEGA = 62;
export const ESPECIAL_ALTURA = 26;    // espessura do raio (desenho)

// choque de raios: disputa de apertar ATAQUE (getBeamClashPush / resolveClashDamage)
export const CHOQUE_DURACAO = 90;     // CLASH_MASH_DURATION
export const CHOQUE_ESCALA = 8;       // CLASH_MASH_PUSH_SCALE

// Zenkai: uma vez por lutador por PARTIDA, quem cairia volta com 1 de vida e 90 quadros invulnerável
export const ZENKAI_INVULNERAVEL = 90;

export const INVULNERAVEL_QUADROS = 30; // player.invulnerableTimer = 30 depois de apanhar
export const ATINGIDO_QUADROS = 15;     // hitTimer
export const EMPURRAO = 3;
export const FIM_RODADA_QUADROS = 150;  // pausa com o resultado antes da próxima rodada
export const INVULNERAVEL_INICIO = 60;  // começo de cada rodada

/** quadros que um aperto de ESPECIAL/PARRY/TRANSFORMAR fica guardado enquanto o lutador ainda não pode */
export const GUARDA_GATILHO = 8;
