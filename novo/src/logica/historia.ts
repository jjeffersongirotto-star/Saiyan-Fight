// MODO HISTÓRIA (fase 3): o herói (p1) contra o vilão da fase (p2) em 5 ondas (NORMAL/DIFÍCIL) ou sem fim (SEM
// LIMITE), com minions e itens. Usa a MESMA luta do VERSUS (luta.ts: tiro, parry, especial, choque, transformação,
// invulnerabilidade...) e por cima põe o que só existe na história (gameplay.js do jogo antigo):
//  - vilão com a vida da onda (4 + onda − 1), que patrulha a metade dele (stepVilaoPatrulha) e ataca com os padrões
//    do chefe (FAST, TRIPLE, HOMING, SPREAD5, PINCER, BURST8, num "saco" embaralhado); da onda 3 em diante junta ki
//    sozinho e transforma; derrotado, sai voando da tela e volta mais forte na onda seguinte;
//  - herói com 3 de vida, sem Zenkai (no antigo a Zenkai era só do VERSUS) e protegido enquanto o vilão cai;
//  - Saibamans / Cell Jr. (minions.ts) e itens (itens.ts).
// Regras NOVAS (chaves em REGRAS_HISTORIA): o vilão solta especial e a agressividade passa a valer; o vilão
// NÃO rebate (vilaoUsaParry desligada); cura entre ondas só no DIFÍCIL, depois de vencer a ONDA 2/5.
import * as C from './constantes';
import { aplicarDano, criarLuta, criarLutador, dentroDoParry, nivelMaximo, passoLuta, podeTransformar, sortear } from './luta';
import { criarItem, moverItem, encostaNoItem, ITEM_INTERVALO, ITEM_PRIMEIRO, ITENS_MAX, pegarItem, type Item } from './itens';
import {
  AGARRAR_QUADROS, criarMinion, deveInvestir, encostaNoLutador, investir, MINION_INTERVALO, MINIONS_MAX, minionAtivo, moverMinion,
  podeSerAgarrado, soltarMinion,
} from './minions';
import { encherSaco, ondaDoPasso, ONDAS_POR_MODO, parametrosDaOnda, type ModoFase, type Padrao } from './ondas';
import type { Entrada, EstadoLuta, Evento, FichaLuta, TipoItem } from './tipos';
import { ENTRADA_VAZIA } from './tipos';
import type { Fase } from '../dados/fases';

export type SituacaoVilao = 'lutando' | 'caindo' | 'entrando';

export interface EstatisticasHistoria {
  ataques: number;
  rebatidas: number;
  golpes: number;
  minions: number;
  itens: Record<TipoItem, number>;
}

export interface DadosHistoria {
  regras: C.RegrasHistoria;
  fase: string;
  modo: ModoFase;
  minion: Fase['minion'];
  vilaoNivelInicial: number;
  /** luta número `passo` (0..4) do modo; `onda` = a dificuldade real dela */
  passo: number;
  onda: number;
  vilao: SituacaoVilao;
  vencida: boolean;
  /** patrulha do vilão (stepVilaoPatrulha) */
  alvoX: number | null;
  alvoTempo: number;
  vy: number;
  esperaAtaque: number;
  saco: Padrao[];
  esperaMinion: number;
  esperaItem: number;
  itens: Item[];
  pontos: number;
  stats: EstatisticasHistoria;
  resultado: 'vitoria' | 'derrota' | null;
}

/** limites da patrulha (VILAO_PATRULHA, convertidos para o centro da caixa) */
export const PATRULHA = { minX: 494, maxX: 704, velX: 1.6, tempoMin: 70, tempoMax: 200, margemTeto: 12, margemChao: 22 };
export const VILAO_ENTRA_X = C.TELA_L + 100;
export const VILAO_ENTRA_VEL = 3;
export const VILAO_CAI_VEL = 12;
export const VILAO_KI_TRANSFORMAR = 0.35;   // por quadro, da onda 3 em diante
export const VILAO_KI_ESPECIAL = 0.12;      // por quadro x agressividade (regra nova)
export const VILAO_TIRO_ESCALA = 1.5;       // BOSS_SHOT_SCALE

export function criarHistoria(heroi: FichaLuta, vilao: FichaLuta, fase: Fase, modo: ModoFase, semente = 1, regras: C.RegrasHistoria = C.REGRAS_HISTORIA): EstadoLuta {
  const e = criarLuta(heroi, vilao, semente);
  const onda = ondaDoPasso(modo, 0);
  e.historia = {
    regras: { ...regras }, fase: fase.id, modo, minion: fase.minion, vilaoNivelInicial: fase.vilao.nivel,
    passo: 0, onda, vilao: 'lutando', vencida: false,
    alvoX: null, alvoTempo: 0, vy: 2, esperaAtaque: 0, saco: [],
    esperaMinion: 0, esperaItem: ITEM_INTERVALO - ITEM_PRIMEIRO, itens: [], pontos: 0,
    stats: { ataques: 0, rebatidas: 0, golpes: 0, minions: 0, itens: { senzu: 0, capsula: 0, nuvem: 0, bastao: 0 } },
    resultado: null,
  };
  e.p1.vida = e.p1.vidaMax = C.VIDA_HISTORIA;
  e.p1.zenkaiUsada = e.p2.zenkaiUsada = true; // sem Zenkai fora do VERSUS (attemptZenkaiRevival)
  prepararVilao(e, onda, false);
  return e;
}

/** Vilão da onda: vida cheia, forma da fase, sem ki. `entrando` = vem voando da direita. */
function prepararVilao(e: EstadoLuta, onda: number, entrando: boolean): void {
  const h = e.historia!;
  const v = e.p2;
  const novo = criarLutador('p2', { personagem: v.personagem, alturas: v.alturas, especialLento: v.especialLento });
  novo.zenkaiUsada = true;
  novo.nivel = Math.min(h.vilaoNivelInicial, nivelMaximo(novo));
  const p = parametrosDaOnda(onda);
  novo.vida = novo.vidaMax = p.vidaVilao;
  novo.invulneravel = 0;
  e.p2 = novo;
  ajustarCaixaDoVilao(e);
  novo.x = entrando ? VILAO_ENTRA_X : PATRULHA.maxX;
  novo.xAnt = novo.x;
  h.vilao = entrando ? 'entrando' : 'lutando';
  h.alvoX = null;
  h.vy = 2;
  h.esperaAtaque = 0;
  h.saco = [];
}

function ajustarCaixaDoVilao(e: EstadoLuta) {
  const v = e.p2;
  const alt = v.alturas[Math.min(v.nivel, v.alturas.length - 1)] ?? C.ALTURA_PADRAO_CM;
  const k = Math.min(C.ESCALA_ALTURA_MAX, Math.max(C.ESCALA_ALTURA_MIN, alt / C.ALTURA_PADRAO_CM));
  const pes = v.y + v.a / 2;
  v.l = C.LUTADOR_L * k;
  v.a = C.LUTADOR_A * k;
  v.y = Math.min(pes - v.a / 2, C.CHAO_Y - v.a / 2 - PATRULHA.margemChao);
  v.yAnt = v.y;
}

/** agressividade do vilão agora (a da onda + 0,25 enquanto dura o poder da transformação, até 1) */
export function agressividadeDoVilao(e: EstadoLuta): number {
  const base = parametrosDaOnda(e.historia!.onda).agressividade;
  return Math.min(1, base + (e.p2.poder > 0 ? 0.25 : 0));
}
/** 0..1: quanto a agressividade está acima da onda 1 (0,45) — usado nas regras novas */
const forca = (a: number) => Math.max(0, Math.min(1, (a - 0.45) / 0.55));

/** chance de o vilão rebater um tiro (regra nova): 8% na onda 1 até 40% com tudo no máximo */
export const chanceDeParryDoVilao = (a: number) => 0.08 + 0.32 * forca(a);
/** quanto o vilão avança para a esquerda (regra nova): até 140 px mais perto do herói */
export const avancoDoVilao = (a: number) => 140 * forca(a);

/** Entrada do vilão neste passo (o movimento é a patrulha, feita depois). */
export function entradaDoVilao(e: EstadoLuta): Entrada {
  const h = e.historia!;
  const v = e.p2, heroi = e.p1;
  const ent: Entrada = { ...ENTRADA_VAZIA };
  if (h.vilao !== 'lutando' || e.fase !== 'luta' || v.acao === 'caido') return ent;
  const a = h.regras.agressividadeReal ? agressividadeDoVilao(e) : 0.45;
  if (e.choque) {
    // choque: aperta ATAQUE num ritmo que sobe com a agressividade
    ent.atacar = e.quadro % (a > 0.75 ? 4 : a > 0.6 ? 5 : 6) < 2;
    return ent;
  }
  // ki cheio na onda 3+: transforma (o antigo transformava sozinho)
  if (podeTransformar(v) && h.onda >= 3) { ent.transformar = true; return ent; }
  if (h.regras.vilaoUsaEspecial && v.ki >= C.KI_MAX) {
    // responde o especial do herói (vira choque) ou solta quando o herói não está protegido
    const raioDoHeroi = e.raios.some((r) => r.dono === 'p1' && !r.acertou);
    if (raioDoHeroi || (heroi.invulneravel <= 0 && heroi.acao !== 'transformando')) { ent.especial = true; return ent; }
  }
  if (h.regras.vilaoUsaParry && v.esperaParry <= 0) {
    const ameaca = e.tiros.find((t) => t.dono === 'p1' && t.vx > 0 && dentroDoParry(t, v));
    // sem sorteio: depende do id do tiro (o mesmo tiro sempre dá o mesmo resultado)
    if (ameaca && ((ameaca.id * 61 + 17) % 100) / 100 < chanceDeParryDoVilao(a)) ent.parry = true;
  }
  return ent;
}

/** Um passo do modo história: vilão (IA + patrulha + ataques), luta, minions, itens e ondas. */
export function passoHistoria(e: EstadoLuta, heroi: Entrada): Evento[] {
  const h = e.historia!;
  const eventos = passoLuta(e, { p1: heroi, p2: entradaDoVilao(e) });
  if (e.fase === 'fimPartida' || h.resultado) return eventos;
  contarEstatisticas(h, eventos);
  passoVilao(e, eventos);
  passoMinions(e, eventos);
  passoItens(e, eventos);
  verificarFim(e, eventos);
  return eventos;
}

function contarEstatisticas(h: DadosHistoria, eventos: Evento[]) {
  for (const ev of eventos) {
    if (ev.tipo === 'tiro' && ev.dono === 'p1') h.stats.ataques++;
    else if (ev.tipo === 'parry' && ev.dono === 'p1') h.stats.rebatidas += ev.refletidos;
    else if (ev.tipo === 'acerto' && ev.alvo === 'p1') h.stats.golpes++;
    else if (ev.tipo === 'especial' && ev.dono === 'p1') { h.pontos += ev.agarradosDestruidos; h.stats.minions += ev.agarradosDestruidos; }
  }
}

function passoVilao(e: EstadoLuta, eventos: Evento[]) {
  const h = e.historia!, v = e.p2;
  if (h.vilao === 'caindo') {
    v.xAnt = v.x; v.yAnt = v.y;
    v.x += VILAO_CAI_VEL;
    v.y += Math.sin(e.quadro * 0.25) * 3;
    if (v.x > C.TELA_L + 120) proximaOnda(e, eventos);
    return;
  }
  if (h.vilao === 'entrando') {
    v.xAnt = v.x; v.yAnt = v.y;
    v.x -= VILAO_ENTRA_VEL;
    if (v.x <= PATRULHA.maxX) { v.x = PATRULHA.maxX; h.vilao = 'lutando'; }
    return;
  }
  if (v.acao === 'caido') return;
  ajustarCaixaDoVilao(e); // a forma pode ter mudado (transformou)
  const p = parametrosDaOnda(h.onda);
  const a = h.regras.agressividadeReal ? agressividadeDoVilao(e) : 0;
  // patrulha: sobe e desce e de tempos em tempos escolhe outro X na metade dele
  if (v.acao !== 'transformando') {
    const minY = C.TETO_Y + v.a / 2 + PATRULHA.margemTeto, maxY = C.CHAO_Y - v.a / 2 - PATRULHA.margemChao;
    const vel = Math.abs(h.vy) || 2;
    const velY = p.multVelocidade * 0.8 * (v.poder > 0 ? 1.3 : 1);
    v.y += h.vy * velY;
    if (v.y <= minY) { v.y = minY; h.vy = vel; } else if (v.y >= maxY) { v.y = maxY; h.vy = -vel; }
    h.alvoTempo--;
    const minX = PATRULHA.minX - (h.regras.agressividadeReal ? avancoDoVilao(a) : 0);
    if (h.alvoTempo <= 0 || h.alvoX === null) {
      h.alvoX = minX + sortear(e) * (PATRULHA.maxX - minX);
      h.alvoTempo = PATRULHA.tempoMin + sortear(e) * (PATRULHA.tempoMax - PATRULHA.tempoMin);
      if (sortear(e) < 0.35) h.vy = -h.vy;
    }
    const dx = h.alvoX - v.x;
    v.x += Math.abs(dx) <= PATRULHA.velX ? dx : Math.sign(dx) * PATRULHA.velX;
    v.movX = Math.sign(dx) * 0.5;
    v.movY = Math.sign(h.vy);
    v.olhando = -1;
  }
  // ki do vilão: transforma da onda 3 em diante; depois da última forma, junta para o especial (regra nova)
  if (!e.choque && v.acao !== 'transformando') {
    if (h.onda >= 3 && v.nivel < nivelMaximo(v)) v.ki = Math.min(C.KI_MAX, v.ki + VILAO_KI_TRANSFORMAR);
    else if (h.regras.vilaoUsaEspecial && h.onda >= C.VILAO_ESPECIAL_ONDA_MIN && !e.raios.some((r) => r.dono === 'p2')) {
      v.ki = Math.min(C.KI_MAX, v.ki + VILAO_KI_ESPECIAL * (h.regras.agressividadeReal ? Math.max(0.45, a) : 0.6));
    }
  }
  // ataques com padrões
  if (!e.choque && v.acao !== 'transformando') {
    h.esperaAtaque++;
    if (h.esperaAtaque >= p.intervaloTiro) {
      h.esperaAtaque = 0;
      atacarComPadrao(e, eventos);
    }
  }
}

/** spawnBossAttackPadrao: as bolas de poder do vilão saem da frente dele, 50% maiores que o tiro comum. */
export function atacarComPadrao(e: EstadoLuta, eventos: Evento[]): void {
  const h = e.historia!, v = e.p2;
  if (h.saco.length === 0) h.saco = encherSaco(h.onda, () => sortear(e));
  const padrao = h.saco.pop()!;
  const p = parametrosDaOnda(h.onda);
  const r0 = 12 * VILAO_TIRO_ESCALA, m = p.multVelocidade;
  const x = v.x - v.l / 2 - 10, y = v.y;
  const tiro = (dx: number, dy: number, vx: number, vy: number, raio: number, teleguiado = false) => {
    if (e.tiros.length >= C.TIROS_MAX) return;
    e.tiros.push({ id: e.proximoId++, dono: 'p2', x: x + dx, y: y + dy, vx, vy, raio, dano: 1, refletido: false, atirador: 'p2', teleguiado, doVilao: true });
  };
  if (padrao === 'homing') tiro(0, 0, -4 * m, 0, r0 + 2, true);
  else if (padrao === 'triple') for (const vy of [-1.8, 0, 1.8]) tiro(0, 0, -5 * m, vy, r0);
  else if (padrao === 'spread5') for (const vy of [-3, -1.5, 0, 1.5, 3]) tiro(0, 0, -4.5 * m, vy, r0 - 2);
  else if (padrao === 'pincer') for (const lado of [-1, 1]) tiro(0, lado * 90, -5 * m, -lado * 1.6, r0);
  else if (padrao === 'burst8') {
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      tiro(v.l / 2 + 10, 0, Math.cos(ang) * 3.2 * m, Math.sin(ang) * 3.2 * m, r0 - 3);
    }
  } else tiro(0, 0, -(5.5 + Math.min(4, h.pontos * 0.2)) * m, 0, r0);
  v.poseTiro = C.POSE_TIRO_QUADROS;
  eventos.push({ tipo: 'ataqueVilao', padrao });
}

function passoMinions(e: EstadoLuta, eventos: Evento[]) {
  const h = e.historia!, heroi = e.p1, v = e.p2;
  if (h.vilao !== 'caindo') {
    h.esperaMinion++;
    if (h.esperaMinion > MINION_INTERVALO) {
      h.esperaMinion = 0;
      if (e.minions.length < MINIONS_MAX) {
        const x = 470 + sortear(e) * (C.TELA_L - 520) + 16;
        e.minions.push(criarMinion(e.proximoId++, x, C.TETO_Y + 40 + sortear(e) * 180, 2 + sortear(e) * 1.5, h.minion));
        eventos.push({ tipo: 'minionNasceu', x });
      }
    }
  }
  const alguemAgarrado = e.minions.some((m) => m.agarrando);
  const podeAgarrar = !alguemAgarrado && podeSerAgarrado(heroi) && e.fase === 'luta' && h.vilao === 'lutando' && heroi.acao !== 'caido';
  const alvoX = heroi.x, alvoY = heroi.y + heroi.a * 0.2;
  for (let i = e.minions.length - 1; i >= 0; i--) {
    const m = e.minions[i];
    if (m.fase === 'agarrar') {
      m.x = heroi.x + 14;
      m.y = heroi.y - heroi.a * 0.25 + 20;
      // como no antigo: carregar ki ou o brilho do parry arremessam (o do parry voa até o vilão)
      if (heroi.acao === 'carregando' || heroi.ondaParry > 0) {
        const forte = heroi.ondaParry > 0;
        soltarMinion(m, forte);
        eventos.push({ tipo: 'minionArremessado', forte });
        continue;
      }
      m.explode--;
      if (m.explode <= 0) {
        e.minions.splice(i, 1);
        const machucou = e.fase === 'luta' && h.vilao === 'lutando' && heroi.acao !== 'transformando';
        eventos.push({ tipo: 'minionExplodiu', x: m.x, y: m.y, machucou });
        // a explosão ignora o tempo invulnerável e o escudo (explodeSaibaman), mas não a pose de transformar
        if (machucou) {
          const escudo = heroi.escudo, inv = heroi.invulneravel;
          heroi.escudo = false;
          heroi.invulneravel = 0;
          aplicarDano(e, heroi, 1, false, 1, eventos);
          heroi.escudo = escudo;
          if (heroi.vida > 0) heroi.invulneravel = Math.max(inv, C.INVULNERAVEL_QUADROS);
        }
      }
      continue;
    }
    if (m.fase === 'arremessado' && m.lancadoParry && h.vilao === 'lutando' && v.acao !== 'caido' && encostaNoLutador(m, v)) {
      e.minions.splice(i, 1);
      eventos.push({ tipo: 'minionExplodiu', x: m.x, y: m.y, machucou: false });
      h.pontos += 1;
      h.stats.minions++;
      aplicarDano(e, v, 1, false, 1, eventos);
      continue;
    }
    if (m.fase === 'investir') {
      if (podeAgarrar) investir(m, alvoX, alvoY);
      else { m.fase = 'voar'; m.faseQuadros = 0; }
    } else if (podeAgarrar && deveInvestir(m, alvoX, alvoY)) {
      m.fase = 'investir';
      m.faseQuadros = 0;
    } else moverMinion(m);
    if (minionAtivo(m) && m.fase !== 'arremessado' && m.atordoado <= 0 && podeAgarrar && encostaNoLutador(m, heroi)) {
      m.fase = 'agarrar';
      m.agarrando = 'p1';
      m.explode = AGARRAR_QUADROS;
      eventos.push({ tipo: 'minionAgarrou', dono: 'p1' });
      continue;
    }
    if (m.x < -30 || m.x > C.TELA_L + 60) e.minions.splice(i, 1);
  }
}

function passoItens(e: EstadoLuta, eventos: Evento[]) {
  const h = e.historia!, heroi = e.p1;
  h.esperaItem++;
  if (h.esperaItem >= ITEM_INTERVALO) {
    h.esperaItem = 0;
    if (h.itens.length < ITENS_MAX) {
      const it = criarItem(e.proximoId++, [sortear(e), sortear(e), sortear(e)]);
      h.itens.push(it);
      eventos.push({ tipo: 'itemNasceu', item: it.tipo });
    }
  }
  for (let i = h.itens.length - 1; i >= 0; i--) {
    const it = h.itens[i];
    const sumiu = moverItem(it, h.regras.itemPousaNoChao);
    if (heroi.acao !== 'caido' && encostaNoItem(it, heroi)) {
      pegarItem(heroi, it, eventos);
      h.stats.itens[it.tipo]++;
      h.itens.splice(i, 1);
      continue;
    }
    if (sumiu) h.itens.splice(i, 1);
  }
}

function verificarFim(e: EstadoLuta, eventos: Evento[]) {
  const h = e.historia!;
  if (e.fase !== 'luta') return;
  // herói caiu: derrota (sem Zenkai)
  if (e.p1.vida <= 0) {
    h.resultado = 'derrota';
    encerrar(e, 'p2', eventos);
    return;
  }
  // vilão caiu: sai voando da tela; o herói fica protegido (nada mais o machuca até a próxima onda)
  if (h.vilao === 'lutando' && e.p2.vida <= 0) {
    const deEspecial = eventos.some((x) => x.tipo === 'acerto' && x.alvo === 'p2' && x.deEspecial);
    const pontos = deEspecial ? 3 : 5;
    h.pontos += pontos;
    h.vilao = 'caindo';
    e.tiros = e.tiros.filter((t) => t.dono === 'p1');
    e.raios.length = 0;
    e.choque = null;
    e.minions.length = 0;
    eventos.push({ tipo: 'vilaoCaiu', onda: h.onda, pontos });
    if (h.modo !== 'unlimited' && h.passo + 1 >= ONDAS_POR_MODO) h.vencida = true;
  }
}

function proximaOnda(e: EstadoLuta, eventos: Evento[]) {
  const h = e.historia!;
  if (h.vencida) {
    h.resultado = 'vitoria';
    encerrar(e, 'p1', eventos);
    eventos.push({ tipo: 'faseVencida' });
    return;
  }
  const ondaVencida = h.passo + 1; // ONDA X/5 que acabou (não o nível real do DIFÍCIL)
  h.passo++;
  h.onda = ondaDoPasso(h.modo, h.passo);
  prepararVilao(e, h.onda, true);
  e.tiros.length = 0;
  let curou = false;
  if (C.curaEntreOndasAplica(h.regras.curaEntreOndas, h.modo, ondaVencida) && e.p1.vida < e.p1.vidaMax) {
    e.p1.vida++;
    curou = true;
  }
  eventos.push({ tipo: 'novaOnda', onda: h.onda, passo: h.passo, curou });
}

function encerrar(e: EstadoLuta, vencedor: 'p1' | 'p2', eventos: Evento[]) {
  e.fase = 'fimRodada';
  e.faseQuadros = 0;
  e.vencedorRodada = vencedor;
  e.vencedorPartida = vencedor;
  e.tiros.length = 0;
  e.raios.length = 0;
  e.choque = null;
  e.minions.length = 0;
  if (e[vencedor].acao !== 'caido') { e[vencedor].acao = 'vitoria'; e[vencedor].acaoQuadros = 0; }
  eventos.push({ tipo: 'fimRodada', vencedor });
}

