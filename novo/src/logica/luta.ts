// Lógica da luta VERSUS em TypeScript puro: sem Phaser, sem DOM, sem Math.random (sorteio com semente).
// Um passo = 1/60 s. A cena só lê o estado para desenhar e toca os efeitos/sons dos eventos devolvidos.
// Regras do jogo antigo (gameplay.js): tiro 1, especial 3 com o ki cheio, parry devolve os tiros por perto,
// transformação com o ki cheio (sobe um nível, +velocidade por 15 s), Zenkai 1x por partida, choque de raios.
import * as C from './constantes';
import type { Choque, Entrada, Evento, EstadoLuta, FichaLuta, IdJogador, Lutador, Tiro } from './tipos';

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
export const velocidadeDe = (l: Lutador) => C.VELOCIDADE + (l.poder > 0 ? C.PODER_BONUS_VELOCIDADE : 0);

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
    invulneravel: C.INVULNERAVEL_INICIO, empurraoX: 0, zenkaiUsada: false, atacarAntes: false,
    pedidoEspecial: 0, pedidoParry: 0, pedidoTransformar: 0,
  };
}

export function criarLuta(p1: FichaLuta | string, p2: FichaLuta | string, semente = 1): EstadoLuta {
  return {
    quadro: 0, rodada: 1, placar: { p1: 0, p2: 0 }, fase: 'luta', faseQuadros: 0,
    vencedorRodada: null, vencedorPartida: null,
    p1: criarLutador('p1', p1), p2: criarLutador('p2', p2),
    tiros: [], raios: [], choque: null, proximoId: 1, semente,
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

export const podeApanhar = (e: EstadoLuta, l: Lutador) => e.fase === 'luta' && l.invulneravel <= 0 && l.acao !== 'caido';
export const podeTransformar = (l: Lutador) => l.ki >= C.KI_MAX && l.nivel < nivelMaximo(l);

/** Dano em quem pode apanhar. Chegando a 0: Zenkai (1 vez por partida) devolve 1 de vida e um tempo invulnerável. */
function aplicarDano(e: EstadoLuta, alvo: Lutador, dano: number, deEspecial: boolean, direcao: number, eventos: Evento[]) {
  alvo.vida = Math.max(0, alvo.vida - dano);
  alvo.invulneravel = C.INVULNERAVEL_QUADROS;
  alvo.empurraoX = direcao * C.EMPURRAO * (deEspecial ? 2 : 1);
  eventos.push({ tipo: 'acerto', alvo: alvo.id, dano, deEspecial });
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
  } else if (alvo.acao !== 'especial' && alvo.acao !== 'transformando') {
    alvo.acao = 'atingido';
    alvo.acaoQuadros = 0;
  }
}

/** Troca a caixa para a altura da forma nova, mantendo os pés no mesmo lugar (ajustarCaixaDoLutador). */
function ajustarCaixa(l: Lutador) {
  const pes = l.y + l.a / 2;
  [l.l, l.a] = tamanhoDaCaixa(alturaDoNivel(l, l.nivel));
  l.y = pes - l.a / 2;
}

function transformar(l: Lutador, eventos: Evento[]) {
  l.ki = 0;
  l.nivel++;
  l.poder = C.PODER_TRANSFORMACAO_QUADROS; // transformou de novo durante o bônus: renova, não acumula
  l.acao = 'transformando';
  l.acaoQuadros = 0;
  ajustarCaixa(l);
  eventos.push({ tipo: 'transformou', dono: l.id, nivel: l.nivel });
}

function soltarEspecial(e: EstadoLuta, l: Lutador, eventos: Evento[]) {
  l.ki = 0;
  l.acao = 'especial';
  l.acaoQuadros = 0;
  const sol = l.especialLento;
  e.raios.push({ dono: l.id, idade: 0, duracao: sol ? C.SOL_DURACAO : C.ESPECIAL_DURACAO, chega: sol ? C.SOL_CHEGA : C.ESPECIAL_CHEGA, sol, acertou: false });
  e.tiros.length = 0; // o especial varre os tiros da tela (world.obstacles = [])
  eventos.push({ tipo: 'especial', dono: l.id, sol });
}

/** O outro já tem um raio no ar que ainda não chegou: soltar o especial agora vira CHOQUE (resolveBeamClash). */
function raioDoOutroNoAr(e: EstadoLuta, id: IdJogador) {
  return e.raios.find((r) => r.dono !== id && !r.acertou && r.idade < r.chega);
}

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
  if (l.poder > 0) l.poder--;
  l.acaoQuadros++;
  const apertouAtaque = ent.atacar && !l.atacarAntes;
  l.atacarAntes = ent.atacar;
  l.pedidoEspecial = ent.especial ? C.GUARDA_GATILHO : Math.max(0, l.pedidoEspecial - 1);
  l.pedidoParry = ent.parry ? C.GUARDA_GATILHO : Math.max(0, l.pedidoParry - 1);
  l.pedidoTransformar = ent.transformar ? C.GUARDA_GATILHO : Math.max(0, l.pedidoTransformar - 1);

  if (l.empurraoX !== 0) {
    l.x += l.empurraoX;
    l.empurraoX *= 0.8;
    if (Math.abs(l.empurraoX) < 0.2) l.empurraoX = 0;
  }

  if (l.acao === 'caido' || l.acao === 'vitoria') return clampar(l);
  if (e.fase !== 'luta') {
    if (l.acao !== 'livre') { l.acao = 'livre'; l.acaoQuadros = 0; }
    return clampar(l);
  }
  // choque de raios: os dois param e só contam os apertos de ATAQUE
  if (e.choque) {
    if (apertouAtaque) e.choque.apertos[l.id]++;
    return clampar(l);
  }

  if (l.acao === 'atingido' && l.acaoQuadros >= C.ATINGIDO_QUADROS) { l.acao = 'livre'; l.acaoQuadros = 0; }
  if (l.acao === 'transformando') {
    if (l.acaoQuadros >= C.TRANSFORMANDO_QUADROS) { l.acao = 'livre'; l.acaoQuadros = 0; }
    return clampar(l);
  }
  if (l.acao === 'especial') {
    const meu = e.raios.find((r) => r.dono === l.id);
    if (!meu) { l.acao = 'livre'; l.acaoQuadros = 0; }
    return clampar(l);
  }
  if (l.acao === 'atingido') return clampar(l);

  // gatilhos: especial (ou choque), transformar, parry
  if (l.pedidoEspecial > 0 && l.ki >= C.KI_MAX) {
    l.pedidoEspecial = 0;
    const noAr = raioDoOutroNoAr(e, l.id);
    if (noAr) {
      l.ki = 0;
      e.raios.length = 0;
      e.tiros.length = 0;
      e.choque = { idade: 0, apertos: { p1: 0, p2: 0 }, empurrao: 0 };
      for (const id of ['p1', 'p2'] as const) { e[id].acao = 'especial'; e[id].acaoQuadros = 0; }
      eventos.push({ tipo: 'choque' });
      return clampar(l);
    }
    soltarEspecial(e, l, eventos);
    return clampar(l);
  }
  if (l.pedidoTransformar > 0 && podeTransformar(l)) {
    l.pedidoTransformar = 0;
    transformar(l, eventos);
    return clampar(l);
  }
  if (l.pedidoParry > 0 && l.esperaParry <= 0) {
    l.pedidoParry = 0;
    l.poseParry = C.PARRY_POSE_QUADROS;
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
    if (refletidos === 0) l.esperaParry = C.PARRY_ERROU_ESPERA;
    eventos.push({ tipo: 'parry', dono: l.id, refletidos });
  }

  // carregar ki: fica parado acumulando
  if (ent.carregar) {
    if (l.acao !== 'carregando') { l.acao = 'carregando'; l.acaoQuadros = 0; }
    const antes = l.ki;
    l.ki = Math.min(C.KI_MAX, l.ki + C.KI_CARREGAR_POR_QUADRO);
    if (antes < C.KI_MAX && l.ki >= C.KI_MAX) eventos.push({ tipo: 'kiCheio', dono: l.id });
    return clampar(l);
  }
  if (l.acao === 'carregando') { l.acao = 'livre'; l.acaoQuadros = 0; }

  // andar/voar (diagonal com a mesma velocidade)
  let mx = limitar(ent.x, -1, 1), my = limitar(ent.y, -1, 1);
  const tam = Math.hypot(mx, my);
  if (tam > 1) { mx /= tam; my /= tam; }
  const v = velocidadeDe(l);
  l.x += mx * v;
  l.y += my * v;
  l.movX = mx;
  l.movY = my;

  // tiro de ki: segurando ATAQUE sai ~5 por segundo
  if (ent.atacar && l.esperaTiro <= 0 && e.tiros.length < C.TIROS_MAX) {
    const m = maoDe(l);
    e.tiros.push({
      id: e.proximoId++, dono: l.id,
      x: m.x, y: m.y + (sortear(e) - 0.5) * 20,
      vx: l.olhando * C.TIRO_VELOCIDADE, vy: (sortear(e) - 0.5) * 2,
      raio: C.TIRO_RAIO, dano: C.TIRO_DANO, refletido: false,
    });
    l.esperaTiro = C.TIRO_INTERVALO;
    l.poseTiro = C.POSE_TIRO_QUADROS;
    eventos.push({ tipo: 'tiro', dono: l.id });
  }
  clampar(l);
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
    if (!r.acertou && r.idade >= r.chega) {
      r.acertou = true; // o especial sempre acerta (como no jogo antigo), só não passa da invulnerabilidade
      const alvo = e[outro(r.dono)];
      if (podeApanhar(e, alvo)) aplicarDano(e, alvo, C.ESPECIAL_DANO, true, e[r.dono].olhando, eventos);
    }
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
    l.acao = 'livre';
    l.acaoQuadros = 0;
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
