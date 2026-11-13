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
export const PARRY_RAIO = 56;         // PARRY_RADIUS (o mínimo; cresce com a aura)
export const PARRY_MARGEM_AURA = 6;   // PARRY_AURA_MARGIN
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
export const ATINGIDO_QUADROS = 15;     // hitTimer: só a pose de "apanhou" (o herói antigo não ficava preso nem era empurrado)
/** brilho do parry (parryHighlightTimer): enquanto dura, segurar ATAQUE não atira (pollTecladoTiro) */
export const PARRY_ONDA_QUADROS = 10;
/** combo de parry (getParryComboBonus): ~1,5 s sem rebater zera */
export const COMBO_PARRY_QUADROS = 90;
export const FIM_RODADA_QUADROS = 150;  // pausa com o resultado antes da próxima rodada
export const INVULNERAVEL_INICIO = 60;  // começo de cada rodada

/** quadros que um aperto de ESPECIAL/PARRY/TRANSFORMAR fica guardado (com REGRAS.guardaGatilho ligada) */
export const GUARDA_GATILHO = 8;

// ==================== DIFERENÇAS DO JOGO ANTIGO (confirmadas pelo Jefferson em 13/11/2026) ====================
// As 4 ficam ligadas por padrão. Cada uma ainda liga/desliga aqui: `true` = regra nova; `false` = como no antigo.
// (Regra nova, sem chave: na pose de transformar o lutador não leva dano nenhum — podeApanhar em luta.ts.)
export interface Regras {
  /** J2 com as regras do J1. false = J2 como no antigo: velocidade 4, sem invulnerabilidade depois de apanhar,
   *  e a transformação não dá o +1 de velocidade (no antigo só deixava a CPU mais agressiva) */
  j2IgualAoJ1: boolean;
  /** o dano do especial entra quando o raio CHEGA (18 quadros; sol 62) e o outro pode responder antes = choque.
   *  false = como no antigo: o dano entra na hora do disparo e responder com o raio no ar ainda vira choque */
  danoDoEspecialNaChegada: boolean;
  /** a pose de transformar (45 quadros) trava o movimento. false = dá para andar durante a pose */
  transformacaoTravaMovimento: boolean;
  /** aperto de ESPECIAL/PARRY/TRANSFORMAR guardado por GUARDA_GATILHO quadros. false = só vale no quadro do aperto */
  guardaGatilho: boolean;
}
export const REGRAS_NOVAS: Readonly<Regras> = {
  j2IgualAoJ1: true,
  danoDoEspecialNaChegada: true,
  transformacaoTravaMovimento: true,
  guardaGatilho: true,
};
export const REGRAS_ANTIGAS: Readonly<Regras> = {
  j2IgualAoJ1: false,
  danoDoEspecialNaChegada: false,
  transformacaoTravaMovimento: false,
  guardaGatilho: false,
};
/** as regras que o jogo usa (troque aqui, ou peça na criarLuta) */
export const REGRAS: Readonly<Regras> = REGRAS_NOVAS;
export const VELOCIDADE_J2_ANTIGA = 4;

// ---------- MODO HISTÓRIA (fase 3) ----------
export const VIDA_HISTORIA = 3;              // player.hp = 3 fora do VERSUS
/** o herói vai até x = 450 (BOUNDS.PLAYER_MAX_X, canto esquerdo da caixa) — não só até o meio */
export const HISTORIA_HEROI_MAX_X = 450;
export const NUVEM_VELOCIDADE = 1.4;         // CLOUD_SPEED_MULTIPLIER
export const ITEM_DURACAO = 480;             // PICKUP_BUFF_DURATION (8 s)
export const ITEM_DURACAO_MAX = 1200;        // PICKUP_BUFF_MAX_DURATION (20 s)
export const BASTAO_BONUS_TIRO = 1;          // POWER_BUFF_ATTACK_BONUS
export const ESCUDO_INVULNERAVEL = 30;       // o escudo segura um golpe e dá os mesmos 30 quadros

/** Chaves do modo história (true = regra nova). Cada uma é uma diferença do jogo antigo para o Jefferson confirmar. */
export interface RegrasHistoria {
  /** NOVA (candidata): +1 de vida para o herói a cada onda nova. Antigo: nada (só o feijão mágico cura). */
  curaEntreOndas: boolean;
  /** NOVA: o item que cai pousa no chão e fica ITEM_NO_CHAO quadros antes de sumir (piscando no fim).
   *  Antigo: atravessava o chão e sumia. */
  itemPousaNoChao: boolean;
  /** NOVA: o vilão rebate tiros do herói (chance pela agressividade). Antigo: o vilão nunca rebatia. */
  vilaoUsaParry: boolean;
  /** NOVA: o vilão junta ki depois da última forma e solta o especial (dano VILAO_ESPECIAL_DANO); responder vira
   *  choque. Antigo: o vilão nunca soltava especial. */
  vilaoUsaEspecial: boolean;
  /** NOVA: a agressividade (getWaveParams) passa a valer: chega mais perto, rebate mais, junta ki mais rápido.
   *  Antigo: era calculada mas nada usava. */
  agressividadeReal: boolean;
  /** NOVA: o vilão também fica 30 quadros invulnerável depois de apanhar. Antigo (false): não ficava (só o herói). */
  vilaoInvulneravel: boolean;
}
export const REGRAS_HISTORIA_NOVAS: Readonly<RegrasHistoria> = {
  curaEntreOndas: false, vilaoUsaParry: true, vilaoUsaEspecial: true, agressividadeReal: true, vilaoInvulneravel: false,
  itemPousaNoChao: true,
};
export const REGRAS_HISTORIA_ANTIGAS: Readonly<RegrasHistoria> = {
  curaEntreOndas: false, vilaoUsaParry: false, vilaoUsaEspecial: false, agressividadeReal: false, vilaoInvulneravel: false,
  itemPousaNoChao: false,
};
/** quadros que o item fica parado no chão (regra itemPousaNoChao); pisca no último segundo */
export const ITEM_NO_CHAO = 180;
export const REGRAS_HISTORIA: Readonly<RegrasHistoria> = REGRAS_HISTORIA_NOVAS;
/** dano do especial do VILÃO no modo história (o herói tem 3 de vida: 3 seria morte na hora) */
export const VILAO_ESPECIAL_DANO = 2;
/** o vilão só usa o especial a partir desta onda */
export const VILAO_ESPECIAL_ONDA_MIN = 3;
