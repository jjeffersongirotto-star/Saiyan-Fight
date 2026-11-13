// Números da luta. Tudo em pixels lógicos (tela 800x350, igual ao jogo antigo) e em QUADROS de 1/60 s:
// a lógica roda sempre no passo fixo, então o jogo se comporta igual em qualquer celular ou monitor.
// Os valores vêm do jogo antigo (game-logic-core.js / gameplay.js) sempre que existiam lá.

export const TELA_L = 800;
export const TELA_A = 350;
export const PASSO_MS = 1000 / 60;
/** No máximo tantos passos por quadro desenhado (celular travou 1 s: não "corre" 60 passos de uma vez). */
export const PASSOS_MAX_POR_QUADRO = 5;

export const CHAO_Y = 318;            // linha dos pés quando está no chão
export const TETO_Y = 44;             // abaixo da faixa das barras de vida
export const MARGEM_X = 24;
export const MEIO_X = TELA_L / 2;  // cada jogador fica na sua metade (getPlayer1MaxX/getPlayer2MinX)

export const LUTADOR_L = 44;          // caixa de acerto
export const LUTADOR_A = 76;
export const VELOCIDADE = 4.5;        // player.speed

export const VIDA_VERSUS = 4;         // VERSUS_FIGHTER_HP
export const RODADAS_PARA_VENCER = 2; // VERSUS_ROUNDS_TO_WIN (melhor de 3)
export const KI_MAX = 100;
export const KI_CARREGAR_POR_QUADRO = 1.4;
export const KI_PASSIVO_POR_QUADRO = 0.12;

export const TIRO_INTERVALO = 11;     // KI_TIRO_INTERVALO_QUADROS: ~5 tiros por segundo
export const TIRO_VELOCIDADE = 7;
export const TIRO_RAIO = 8;
export const TIRO_DANO = 1;           // NORMAL_ATTACK_DAMAGE
export const TIROS_MAX = 60;
export const POSE_TIRO_QUADROS = 18;

export const PARRY_QUADROS = 16;
export const PARRY_RAIO = 56;         // PARRY_RADIUS
export const PARRY_ERROU_ESPERA = 30; // PARRY_WHIFF_COOLDOWN
export const PARRY_REFLEXO_VEL = 1.25;

export const ESPECIAL_DANO = 3;       // getSpecialDamage = 1 x 3
export const ESPECIAL_CARGA = 16;     // quadros da pose antes do raio sair
export const ESPECIAL_RAIO = 36;      // quadros com o raio na tela
export const ESPECIAL_ALTURA = 26;    // espessura da faixa do raio

/** quadros que um aperto de ESPECIAL/PARRY fica guardado enquanto o lutador ainda não pode (apanhando, outra ação) */
export const GUARDA_GATILHO = 8;

export const INVULNERAVEL_QUADROS = 60;
export const ATINGIDO_QUADROS = 20;
export const EMPURRAO = 3;
export const FIM_RODADA_QUADROS = 150; // pausa com o resultado antes da próxima rodada
