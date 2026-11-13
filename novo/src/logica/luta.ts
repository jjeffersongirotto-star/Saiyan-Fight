// Lógica da luta VERSUS em TypeScript puro: sem Phaser, sem DOM, sem Math.random (sorteio com semente).
// Um passo = 1/60 s. A cena só lê o estado para desenhar e toca os efeitos/sons dos eventos devolvidos.
// Regras do jogo antigo (gameplay.js): tiro 1, especial 3 com o ki cheio, parry devolve os tiros por perto,
// transformação com o ki cheio (sobe um nível, +velocidade por 15 s), Zenkai 1x por partida, choque de raios.
import * as C from './constantes';
import { arremessarAgarrados, destruirAgarrados } from './minions';
import type { Choque, Entrada, Evento, EstadoLuta, FichaLuta, IdJogador, Lutador, Raio, Tiro } from './tipos';

/** Sorteio determinístico (mulberry32): o mesmo começo dá sempre a mesma luta — bom para testes e replays. */
export function sortear(estado: { semente: number }): number {
  let t = (estado.semente = (estado.semente + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const outro = (id: IdJogador): IdJogador => (id === 'p1' ? 'p2' : 'p1');

/** Altura (cm) -> escala do lutador (escalaDaAltura do jogo antigo: 175 cm = 1, entre 0,75 e 1,4). */
export function escalaDaAltura(cm: number): number {
  if (!Number.isFinite(cm) || cm <= 0) return 1;
  return limitar(cm / C.ALTURA_PADRAO_CM, C.ESCALA_ALTURA_MIN, C.ESCALA_ALTURA_MAX);
}
export function tamanhoDaCaixa(alturaCm: number): [number, number] {
  const k = escalaDaAltura(alturaCm);
  return [C.LUTADOR_L * k, C.LUTADOR_A * k];
}
export const alturaDoNivel = (l: Pick<Lutador, 'alturas'>, nivel: number) => l.alturas[Math.min(nivel, l.alturas.length - 1)] ?? C.ALTURA_PADRAO_CM;
export const nivelMaximo = (l: Pick<Lutador, 'alturas'>) => Math.max(0, l.alturas.length - 1);
/** J2 com as regras antigas (REGRAS.j2IgualAoJ1 = false)? */
const j2Antigo = (r: C.Regras | undefined, l: Lutador) => !!r && !r.j2IgualAoJ1 && l.id === 'p2';
export const velocidadeDe = (l: Lutador, regras?: C.Regras) =>
  j2Antigo(regras, l) ? C.VELOCIDADE_J2_ANTIGA : C.VELOCIDADE + (l.poder > 0 ? C.PODER_BONUS_VELOCIDADE : 0);

/** Faixa de X permitida para o centro de cada jogador: cada um na sua metade da tela. */
export function limitesX(id: IdJogador, largura = C.LUTADOR_L): [number, number] {
  const meia = largura / 2;
  return id === 'p1' ? [C.MARGEM_X + meia, C.MEIO_X - meia] : [C.MEIO_X + meia, C.TELA_L - C.MARGEM_X - meia];
}
export function limitesY(altura = C.LUTADOR_A): [number, number] {
  return [C.TETO_Y + altura / 2, C.CHAO_Y - altura / 2];
}

const fichaPadrao = (personagem: string): FichaLuta => ({ personagem, alturas: [C.ALTURA_PADRAO_CM, C.ALTURA_PADRAO_CM], especialLento: false });
const comoFicha = (f: FichaLuta | string) => (typeof f === 'string' ? fichaPadrao(f) : f);

export function criarLutador(id: IdJogador, ficha: FichaLuta | string): Lutador {
  const fi = comoFicha(ficha);
  const [l, a] = tamanhoDaCaixa(fi.alturas[0] ?? C.ALTURA_PADRAO_CM);
  const x = id === 'p1' ? 110 : C.TELA_L - 110;
  const y = limitesY(a)[1];
  return {
    id, personagem: fi.personagem, alturas: fi.alturas.slice(), especialLento: fi.especialLento,
    x, y, l, a, xAnt: x, yAnt: y, movX: 0, movY: 0,
    olhando: id === 'p1' ? 1 : -1,
    vida: C.VIDA_VERSUS, vidaMax: C.VIDA_VERSUS, ki: 0, nivel: 0, poder: 0,
    acao: 'livre', acaoQuadros: 0, poseTiro: 0, poseParry: 0, esperaTiro: 0, esperaParry: 0,
    invulneravel: C.INVULNERAVEL_INICIO, poseAtingido: 0, ondaParry: 0, emEspecial: false,
    comboParry: 0, comboParryQuadros: 0, ultimoBonusParry: 0, zenkaiUsada: false, atacarAntes: false,
    pedidoEspecial: 0, pedidoParry: 0, pedidoTransformar: 0,
  };
}

export function criarLuta(p1: FichaLuta | string, p2: FichaLuta | string, semente = 1, regras: C.Regras = C.REGRAS): EstadoLuta {
  return {
    regras: { ...regras },
    quadro: 0, rodada: 1, placar: { p1: 0, p2: 0 }, fase: 'luta', faseQuadros: 0,
    vencedorRodada: null, vencedorPartida: null,
    p1: criarLutador('p1', p1), p2: criarLutador('p2', p2),
    tiros: [], raios: [], choque: null, minions: [], proximoId: 1, semente,
  };
}

/** Rodada nova: os dois voltam ao lugar com vida cheia, sem ki e na forma normal. A Zenkai NÃO volta (1 por partida). */
export function recomecarRodada(e: EstadoLuta): void {
  for (const id of ['p1', 'p2'] as const) {
    const velho = e[id];
    const novo = criarLutador(id, { personagem: velho.personagem, alturas: velho.alturas, especialLento: velho.especialLento });
    novo.zenkaiUsada = velho.zenkaiUsada;
    e[id] = novo;
  }
  e.tiros.length = 0;
  e.raios.length = 0;
  e.choque = null;
  e.fase = 'luta';
  e.faseQuadros = 0;
  e.vencedorRodada = null;
}

/** Placar depois da rodada; vencedor da partida quando alguém chega a RODADAS_PARA_VENCER (registerVersusRoundWin). */
export function registrarRodada(placar: Record<IdJogador, number>, vencedor: IdJogador | null) {
  const novo = { ...placar };
  if (vencedor) novo[vencedor]++;
  const partida: IdJogador | null =
    novo.p1 >= C.RODADAS_PARA_VENCER ? 'p1' : novo.p2 >= C.RODADAS_PARA_VENCER ? 'p2' : null;
  return { placar: novo, partida };
}

/** Círculo (tiro) encosta na caixa do lutador? */
export function tiroAcerta(t: { x: number; y: number; raio: number }, l: { x: number; y: number; l?: number; a?: number }): boolean {
  const dx = Math.abs(t.x - l.x) - (l.l ?? C.LUTADOR_L) / 2;
  const dy = Math.abs(t.y - l.y) - (l.a ?? C.LUTADOR_A) / 2;
  const fx = Math.max(dx, 0), fy = Math.max(dy, 0);
  return fx * fx + fy * fy <= t.raio * t.raio;
}

/** Centro do círculo do parry: na altura do peito (getParryCircle sem aura medida). */
export const centroDoParry = (l: Lutador) => ({ x: l.x, y: l.y - l.a * 0.3 });
export const dentroDoParry = (t: Tiro, l: Lutador) => {
  const c = centroDoParry(l);
  return Math.hypot(t.x - c.x, t.y - c.y) < C.PARRY_RAIO;
};
/** De onde sai o tiro/raio (a mão, um pouco acima do meio da caixa). */
export const maoDe = (l: Lutador) => ({ x: l.x + l.olhando * (l.l / 2 + 10), y: l.y - l.a * 0.08 });

/** Regra nova (Jefferson): na pose de transformar (movimento travado) ninguém machuca — tiro, especial, choque. */
export const podeApanhar = (e: EstadoLuta, l: Lutador) =>
  e.fase === 'luta' && l.invulneravel <= 0 && l.acao !== 'caido' && l.acao !== 'transformando';
export const podeTransformar = (l: Lutador) => l.ki >= C.KI_MAX && l.nivel < nivelMaximo(l);

/** Dano em quem pode apanhar. Chegando a 0: Zenkai (1 vez por partida) devolve 1 de vida e um tempo invulnerável. */
function aplicarDano(e: EstadoLuta, alvo: Lutador, dano: number, deEspecial: boolean, direcao: number, eventos: Evento[]) {
  alvo.vida = Math.max(0, alvo.vida - dano);
  alvo.invulneravel = j2Antigo(e.regras, alvo) ? 0 : C.INVULNERAVEL_QUADROS;
  alvo.poseAtingido = C.ATINGIDO_QUADROS;
  // apanhar zera o combo de parry (como o herói antigo: parryCombo = 0)
  alvo.comboParry = 0;
  alvo.comboParryQuadros = 0;
  alvo.ultimoBonusParry = 0;
  eventos.push({ tipo: 'acerto', alvo: alvo.id, dano, deEspecial, direcao });
  if (alvo.vida <= 0 && !alvo.zenkaiUsada) {
    alvo.zenkaiUsada = true;
    alvo.vida = 1;
    alvo.invulneravel = C.ZENKAI_INVULNERAVEL;
    eventos.push({ tipo: 'zenkai', dono: alvo.id });
  }
  if (alvo.vida <= 0) {
    alvo.acao = 'caido';
    alvo.acaoQuadros = 0;
    e.raios = e.raios.filter((r) => r.dono !== alvo.id);
  }
}

/** Troca a caixa para a altura da forma nova, mantendo os pés no mesmo lugar (ajustarCaixaDoLutador). */
function ajustarCaixa(l: Lutador) {
  const pes = l.y + l.a / 2;
  [l.l, l.a] = tamanhoDaCaixa(alturaDoNivel(l, l.nivel));
  l.y = pes - l.a / 2;
}

function transformar(e: EstadoLuta, l: Lutador, eventos: Evento[]) {
  l.ki = 0;
  l.nivel++;
  l.poder = C.PODER_TRANSFORMACAO_QUADROS; // transformou de novo durante o bônus: renova, não acumula
  l.acao = 'transformando';
  l.acaoQuadros = 0;
  ajustarCaixa(l);
  // regra nova: quem estiver agarrado nas pernas é arremessado para longe (gancho para os minions da Fase 3)
  const arremessados = arremessarAgarrados(l, e.minions);
  eventos.push({ tipo: 'transformou', dono: l.id, nivel: l.nivel, arremessados });
}

function soltarEspecial(e: EstadoLuta, l: Lutador, eventos: Evento[]) {
  l.ki = 0;
  if (l.acao === 'carregando') { l.acao = 'livre'; l.acaoQuadros = 0; }
  const sol = l.especialLento;
  e.raios.push({ dono: l.id, idade: 0, duracao: sol ? C.SOL_DURACAO : C.ESPECIAL_DURACAO, chega: sol ? C.SOL_CHEGA : C.ESPECIAL_CHEGA, sol, acertou: false });
  e.tiros.length = 0; // o especial varre os tiros da tela (world.obstacles = [])
  // o poder do especial destrói quem está agarrado nas pernas (destruirSaibamansAgarrados; gancho da fase 3)
  const agarradosDestruidos = destruirAgarrados(l, e.minions);
  eventos.push({ tipo: 'especial', dono: l.id, sol, agarradosDestruidos });
  if (!e.regras.danoDoEspecialNaChegada) acertarRaio(e, e.raios[e.raios.length - 1], eventos); // como no antigo: na hora
}

/** O especial sempre acerta (como no jogo antigo), só não passa da invulnerabilidade. */
function acertarRaio(e: EstadoLuta, r: Raio, eventos: Evento[]) {
  r.acertou = true;
  const alvo = e[outro(r.dono)];
  if (podeApanhar(e, alvo)) aplicarDano(e, alvo, C.ESPECIAL_DANO, true, e[r.dono].olhando, eventos);
}

/** O outro já tem um raio no ar que ainda não chegou: soltar o especial agora vira CHOQUE (resolveBeamClash). */
function raioDoOutroNoAr(e: EstadoLuta, id: IdJogador) {
  // regra antiga: qualquer raio ainda na tela (o dano já entrou no disparo)
  if (!e.regras.danoDoEspecialNaChegada) return e.raios.find((r) => r.dono !== id && r.idade < r.duracao);
  return e.raios.find((r) => r.dono !== id && !r.acertou && r.idade < r.chega);
}

// Regras do HERÓI do jogo antigo, iguais para os dois (Jefferson): apanhar não trava nem empurra; soltar o
// especial não trava (dá para andar, carregar e rebater com o raio na tela); um aperto NOVO de ATAQUE sempre atira
// (se o intervalo passou), mas SEGURAR só repete fora da carga, do brilho do parry e sem raio na tela.
// A pose de transformar continua travando tudo (regra nova confirmada), e nela ninguém leva dano.
function passoLutador(e: EstadoLuta, l: Lutador, ent: Entrada, eventos: Evento[]) {
  l.xAnt = l.x;
  l.yAnt = l.y;
  l.movX = 0;
  l.movY = 0;
  if (l.invulneravel > 0) l.invulneravel--;
  if (l.esperaTiro > 0) l.esperaTiro--;
  if (l.esperaParry > 0) l.esperaParry--;
  if (l.poseTiro > 0) l.poseTiro--;
  if (l.poseParry > 0) l.poseParry--;
  if (l.poseAtingido > 0) l.poseAtingido--;
  if (l.ondaParry > 0) l.ondaParry--;
  if (l.poder > 0) l.poder--;
  if (l.comboParryQuadros > 0 && --l.comboParryQuadros === 0) { l.comboParry = 0; l.ultimoBonusParry = 0; }
  l.acaoQuadros++;
  l.emEspecial = !!e.choque || e.raios.some((r) => r.dono === l.id);
  const apertouAtaque = ent.atacar && !l.atacarAntes;
  l.atacarAntes = ent.atacar;
  // sem a guarda, o aperto vale só neste quadro (1 = usa agora, some no próximo)
  const guarda = e.regras.guardaGatilho ? C.GUARDA_GATILHO : 1;
  l.pedidoEspecial = ent.especial ? guarda : Math.max(0, l.pedidoEspecial - 1);
  l.pedidoParry = ent.parry ? guarda : Math.max(0, l.pedidoParry - 1);
  l.pedidoTransformar = ent.transformar ? guarda : Math.max(0, l.pedidoTransformar - 1);

  if (l.acao === 'caido' || l.acao === 'vitoria') return clampar(l);
  if (e.fase !== 'luta') {
    if (l.acao !== 'livre') { l.acao = 'livre'; l.acaoQuadros = 0; }
    return clampar(l);
  }
  if (l.acao === 'transformando') {
    if (l.acaoQuadros >= C.TRANSFORMANDO_QUADROS) { l.acao = 'livre'; l.acaoQuadros = 0; }
    else {
      if (!e.regras.transformacaoTravaMovimento) andar(e, l, ent);
      return clampar(l);
    }
  }

  // choque de raios: cada aperto NOVO de ATAQUE conta (registerClashMash); não sai tiro nem outro especial
  const noChoque = !!e.choque;
  if (noChoque && apertouAtaque) { e.choque!.apertos[l.id]++; eventos.push({ tipo: 'apertoChoque', dono: l.id }); }

  // gatilhos: especial (ou choque), transformar, parry
  if (!noChoque && l.pedidoEspecial > 0 && l.ki >= C.KI_MAX && !e.raios.some((r) => r.dono === l.id)) {
    l.pedidoEspecial = 0;
    const noAr = raioDoOutroNoAr(e, l.id);
    if (noAr) {
      l.ki = 0;
      e.raios.length = 0;
      e.tiros.length = 0;
      e.choque = { idade: 0, apertos: { p1: 0, p2: 0 }, empurrao: 0 };
      for (const id of ['p1', 'p2'] as const) e[id].emEspecial = true;
      eventos.push({ tipo: 'choque' });
    } else soltarEspecial(e, l, eventos);
    l.emEspecial = true;
  }
  if (l.pedidoTransformar > 0 && podeTransformar(l)) {
    l.pedidoTransformar = 0;
    transformar(e, l, eventos);
    return clampar(l);
  }
  if (l.pedidoParry > 0 && l.esperaParry <= 0) {
    l.pedidoParry = 0;
    rebater(l, e, eventos);
  }

  // carregar ki: fica parado acumulando (o aperto novo de ATAQUE ainda atira, como no antigo)
  if (ent.carregar) {
    if (l.acao !== 'carregando') { l.acao = 'carregando'; l.acaoQuadros = 0; }
    ganharKi(l, C.KI_CARREGAR_POR_QUADRO, eventos);
  } else {
    if (l.acao === 'carregando') { l.acao = 'livre'; l.acaoQuadros = 0; }
    andar(e, l, ent);
  }

  // tiro de ki: aperto novo sempre; segurando, ~5 por segundo fora da carga, do brilho do parry e sem raio na tela
  const segurandoPode = !ent.carregar && l.ondaParry <= 0 && e.raios.length === 0;
  if (!noChoque && ent.atacar && (apertouAtaque || segurandoPode) && l.esperaTiro <= 0 && e.tiros.length < C.TIROS_MAX) atirar(e, l, eventos);
  clampar(l);
}

function ganharKi(l: Lutador, quanto: number, eventos: Evento[]) {
  const antes = l.ki;
  l.ki = Math.min(C.KI_MAX, l.ki + quanto);
  if (antes < C.KI_MAX && l.ki >= C.KI_MAX) eventos.push({ tipo: 'kiCheio', dono: l.id });
}

/** Ki de bônus do combo de parry (getParryComboBonus): 3 rebatidas seguidas = +2, 6 = +5, 10 = +10. */
export function bonusDoComboDeParry(combo: number): number {
  if (combo >= 10) return 10;
  if (combo >= 6) return 5;
  if (combo >= 3) return 2;
  return 0;
}

/** Parry (tryReflect): devolve na hora os tiros do outro que estão no círculo. Errou = espera; acertou = combo. */
function rebater(l: Lutador, e: EstadoLuta, eventos: Evento[]) {
  l.poseParry = C.PARRY_POSE_QUADROS;
  l.ondaParry = C.PARRY_ONDA_QUADROS;
  let refletidos = 0;
  for (const t of e.tiros) {
    if (t.dono === l.id || !dentroDoParry(t, l)) continue;
    const vel = Math.hypot(t.vx, t.vy) || 4;
    t.vx = l.olhando * vel * C.PARRY_REFLEXO_VEL; // volta reto, rumo ao adversário
    t.vy = 0;
    t.dono = l.id;
    t.refletido = true;
    refletidos++;
  }
  let bonusKi = 0;
  if (refletidos === 0) l.esperaParry = C.PARRY_ERROU_ESPERA;
  else {
    l.comboParry++;
    l.comboParryQuadros = C.COMBO_PARRY_QUADROS;
    const bonus = bonusDoComboDeParry(l.comboParry);
    if (bonus > 0 && bonus !== l.ultimoBonusParry) {
      bonusKi = bonus;
      l.ultimoBonusParry = bonus;
    }
  }
  eventos.push({ tipo: 'parry', dono: l.id, refletidos, bonusKi });
  if (bonusKi > 0) ganharKi(l, bonusKi, eventos);
}

function atirar(e: EstadoLuta, l: Lutador, eventos: Evento[]) {
  const m = maoDe(l);
  e.tiros.push({
    id: e.proximoId++, dono: l.id,
    x: m.x, y: m.y + (sortear(e) - 0.5) * 20,
    vx: l.olhando * C.TIRO_VELOCIDADE, vy: (sortear(e) - 0.5) * 2,
    raio: C.TIRO_RAIO, dano: C.TIRO_DANO, refletido: false, atirador: l.id,
  });
  l.esperaTiro = C.TIRO_INTERVALO;
  l.poseTiro = C.POSE_TIRO_QUADROS;
  eventos.push({ tipo: 'tiro', dono: l.id });
}

/** andar/voar (diagonal com a mesma velocidade) */
function andar(e: EstadoLuta, l: Lutador, ent: Entrada) {
  let mx = limitar(ent.x, -1, 1), my = limitar(ent.y, -1, 1);
  const tam = Math.hypot(mx, my);
  if (tam > 1) { mx /= tam; my /= tam; }
  const v = velocidadeDe(l, e.regras);
  l.x += mx * v;
  l.y += my * v;
  l.movX = mx;
  l.movY = my;
}

function clampar(l: Lutador) {
  const [x0, x1] = limitesX(l.id, l.l);
  const [y0, y1] = limitesY(l.a);
  l.x = limitar(l.x, x0, x1);
  l.y = limitar(l.y, y0, y1);
}

function passoTiros(e: EstadoLuta, eventos: Evento[]) {
  const ficam: Tiro[] = [];
  for (const t of e.tiros) {
    t.x += t.vx;
    t.y += t.vy;
    if (t.x < -50 || t.x > C.TELA_L + 50 || t.y < -50 || t.y > C.TELA_A + 50) continue;
    const alvo = e[outro(t.dono)];
    if (tiroAcerta(t, alvo)) {
      if (podeApanhar(e, alvo)) aplicarDano(e, alvo, t.dano, false, Math.sign(t.vx), eventos);
      continue; // encostou: some (mesmo se o alvo estava invulnerável)
    }
    ficam.push(t);
  }
  e.tiros = ficam;
}

function passoRaios(e: EstadoLuta, eventos: Evento[]) {
  for (const r of e.raios) {
    r.idade++;
    if (!r.acertou && r.idade >= r.chega) acertarRaio(e, r, eventos);
  }
  e.raios = e.raios.filter((r) => r.idade < r.duracao);
}

/** Dano de cada lado no fim do choque (resolveClashDamage): quem empurrou mais machuca mais, ninguém sai ileso. */
export function danoDoChoque(empurrao: number): Record<IdJogador, number> {
  const base = C.ESPECIAL_DANO;
  return {
    p1: Math.max(1, Math.round(base * (0.35 + 0.65 * Math.max(0, -empurrao)))),
    p2: Math.max(1, Math.round(base * (0.35 + 0.65 * Math.max(0, empurrao)))),
  };
}
export const empurraoDoChoque = (c: Choque) => limitar((c.apertos.p1 - c.apertos.p2) / C.CHOQUE_ESCALA, -1, 1);

function passoChoque(e: EstadoLuta, eventos: Evento[]) {
  const c = e.choque!;
  c.idade++;
  c.empurrao = empurraoDoChoque(c);
  if (c.idade < C.CHOQUE_DURACAO) return;
  const dano = danoDoChoque(c.empurrao);
  e.choque = null;
  eventos.push({ tipo: 'fimChoque', dano });
  for (const id of ['p1', 'p2'] as const) {
    const l = e[id];
    if (podeApanhar(e, l)) aplicarDano(e, l, dano[id], true, id === 'p1' ? -1 : 1, eventos);
  }
}

function verificarFimDaRodada(e: EstadoLuta, eventos: Evento[]) {
  const p1Caiu = e.p1.vida <= 0, p2Caiu = e.p2.vida <= 0;
  if (!p1Caiu && !p2Caiu) return;
  const vencedor: IdJogador | null = p1Caiu && p2Caiu ? null : p1Caiu ? 'p2' : 'p1';
  e.fase = 'fimRodada';
  e.faseQuadros = 0;
  e.vencedorRodada = vencedor;
  e.tiros.length = 0; // depois que um cai, o vencedor não pode mais perder (protegerHeroiAposVitoria)
  e.raios.length = 0;
  e.choque = null;
  if (vencedor) { e[vencedor].acao = 'vitoria'; e[vencedor].acaoQuadros = 0; }
  const r = registrarRodada(e.placar, vencedor);
  e.placar = r.placar;
  eventos.push({ tipo: 'fimRodada', vencedor });
  if (r.partida) e.vencedorPartida = r.partida;
}

/** Avança a luta UM passo fixo (1/60 s). Devolve o que aconteceu, para a cena tocar efeitos e sons. */
export function passoLuta(e: EstadoLuta, entradas: Record<IdJogador, Entrada>): Evento[] {
  const eventos: Evento[] = [];
  e.quadro++;
  e.faseQuadros++;
  if (e.fase === 'fimPartida') return eventos;

  passoLutador(e, e.p1, entradas.p1, eventos);
  passoLutador(e, e.p2, entradas.p2, eventos);
  if (e.fase === 'luta') {
    if (e.choque) passoChoque(e, eventos);
    else {
      passoTiros(e, eventos);
      passoRaios(e, eventos);
    }
    verificarFimDaRodada(e, eventos);
  } else if (e.fase === 'fimRodada' && e.faseQuadros >= C.FIM_RODADA_QUADROS) {
    if (e.vencedorPartida) {
      e.fase = 'fimPartida';
      e.faseQuadros = 0;
      eventos.push({ tipo: 'fimPartida', vencedor: e.vencedorPartida });
    } else {
      e.rodada++;
      recomecarRodada(e);
      eventos.push({ tipo: 'novaRodada', rodada: e.rodada });
    }
  }
  return eventos;
}
