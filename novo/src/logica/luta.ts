// Lógica da luta VERSUS em TypeScript puro: sem Phaser, sem DOM, sem Math.random (sorteio com semente).
// Um passo = 1/60 s. A cena só lê o estado para desenhar e toca os efeitos/sons dos eventos devolvidos.
import * as C from './constantes';
import type { Entrada, Evento, EstadoLuta, IdJogador, Lutador, Raio, Tiro } from './tipos';

/** Sorteio determinístico (mulberry32): o mesmo começo dá sempre a mesma luta — bom para testes e replays. */
export function sortear(estado: { semente: number }): number {
  let t = (estado.semente = (estado.semente + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Faixa de X permitida para cada jogador: cada um na sua metade da tela. */
export function limitesX(id: IdJogador): [number, number] {
  const meia = C.LUTADOR_L / 2;
  return id === 'p1' ? [C.MARGEM_X + meia, C.MEIO_X - meia] : [C.MEIO_X + meia, C.TELA_L - C.MARGEM_X - meia];
}
export function limitesY(): [number, number] {
  return [C.TETO_Y + C.LUTADOR_A / 2, C.CHAO_Y - C.LUTADOR_A / 2];
}

export function posicaoInicial(id: IdJogador): { x: number; y: number } {
  return { x: id === 'p1' ? 110 : C.TELA_L - 110, y: limitesY()[1] };
}

export function criarLutador(id: IdJogador, personagem: string): Lutador {
  const { x, y } = posicaoInicial(id);
  return {
    id, personagem, x, y, xAnt: x, yAnt: y, movX: 0, movY: 0,
    olhando: id === 'p1' ? 1 : -1,
    vida: C.VIDA_VERSUS, vidaMax: C.VIDA_VERSUS, ki: 0,
    acao: 'livre', acaoQuadros: 0, poseTiro: 0, esperaTiro: 0, esperaParry: 0, parryAcertou: false,
    invulneravel: 0, empurraoX: 0, pedidoEspecial: 0, pedidoParry: 0,
  };
}

export function criarLuta(personagemP1: string, personagemP2: string, semente = 1): EstadoLuta {
  return {
    quadro: 0, rodada: 1, placar: { p1: 0, p2: 0 }, fase: 'luta', faseQuadros: 0,
    vencedorRodada: null, vencedorPartida: null,
    p1: criarLutador('p1', personagemP1), p2: criarLutador('p2', personagemP2),
    tiros: [], raios: [], proximoId: 1, semente,
  };
}

/** Recomeça a rodada (posições, vida e ki cheios de novo, sem tiros na tela). Placar e rodada continuam. */
export function recomecarRodada(e: EstadoLuta): void {
  for (const id of ['p1', 'p2'] as const) {
    const novo = criarLutador(id, e[id].personagem);
    novo.invulneravel = 60;
    e[id] = novo;
  }
  e.tiros.length = 0;
  e.raios.length = 0;
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

const outro = (id: IdJogador): IdJogador => (id === 'p1' ? 'p2' : 'p1');

/** Círculo (tiro) encosta na caixa do lutador? */
export function tiroAcerta(t: { x: number; y: number; raio: number }, l: { x: number; y: number }): boolean {
  const dx = Math.abs(t.x - l.x) - C.LUTADOR_L / 2;
  const dy = Math.abs(t.y - l.y) - C.LUTADOR_A / 2;
  const fx = Math.max(dx, 0), fy = Math.max(dy, 0);
  return fx * fx + fy * fy <= t.raio * t.raio;
}

/** Faixa vertical do raio do especial encosta na caixa do lutador (e ele está do lado para onde o raio vai)? */
export function raioAcerta(r: Raio, l: { x: number; y: number }): boolean {
  const naFrente = r.direcao === 1 ? l.x + C.LUTADOR_L / 2 >= r.x0 : l.x - C.LUTADOR_L / 2 <= r.x0;
  return naFrente && Math.abs(l.y - r.y) <= C.LUTADOR_A / 2 + C.ESPECIAL_ALTURA / 2;
}

export const raioAtivo = (r: Raio) => r.idade >= 0 && r.idade < C.ESPECIAL_RAIO;
export const pertoDoParry = (t: Tiro, l: Lutador) => Math.hypot(t.x - l.x, t.y - l.y) <= C.PARRY_RAIO + t.raio;

/** Pode receber dano agora? (invulnerável depois de apanhar; ninguém apanha fora da luta: fim de rodada protege o vencedor) */
export function podeApanhar(e: EstadoLuta, l: Lutador): boolean {
  return e.fase === 'luta' && l.invulneravel <= 0 && l.acao !== 'caido';
}

function aplicarDano(e: EstadoLuta, alvo: Lutador, dano: number, deEspecial: boolean, direcao: number, eventos: Evento[]) {
  alvo.vida = Math.max(0, alvo.vida - dano);
  alvo.invulneravel = C.INVULNERAVEL_QUADROS;
  alvo.empurraoX = direcao * C.EMPURRAO * (deEspecial ? 2 : 1);
  eventos.push({ tipo: 'acerto', alvo: alvo.id, dano, deEspecial });
  if (alvo.acao !== 'especial') {
    alvo.acao = alvo.vida <= 0 ? 'caido' : 'atingido';
    alvo.acaoQuadros = 0;
  } else if (alvo.vida <= 0) {
    alvo.acao = 'caido';
    alvo.acaoQuadros = 0;
  }
  // levar um especial interrompe o raio de quem apanhou
  if (deEspecial || alvo.vida <= 0) e.raios = e.raios.filter((r) => r.dono !== alvo.id);
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
  l.pedidoEspecial = ent.especial ? C.GUARDA_GATILHO : Math.max(0, l.pedidoEspecial - 1);
  l.pedidoParry = ent.parry ? C.GUARDA_GATILHO : Math.max(0, l.pedidoParry - 1);
  l.acaoQuadros++;

  // empurrão de quem apanhou (vai diminuindo)
  if (l.empurraoX !== 0) {
    l.x += l.empurraoX;
    l.empurraoX *= 0.8;
    if (Math.abs(l.empurraoX) < 0.2) l.empurraoX = 0;
  }

  if (l.acao === 'caido' || l.acao === 'vitoria') return clampar(l);
  if (e.fase !== 'luta') {
    // fim de rodada: ninguém mexe nem atira
    if (l.acao !== 'livre') { l.acao = 'livre'; l.acaoQuadros = 0; }
    return clampar(l);
  }

  // ações com tempo
  if (l.acao === 'atingido' && l.acaoQuadros >= C.ATINGIDO_QUADROS) { l.acao = 'livre'; l.acaoQuadros = 0; }
  if (l.acao === 'parry' && l.acaoQuadros >= C.PARRY_QUADROS) {
    if (!l.parryAcertou) l.esperaParry = C.PARRY_ERROU_ESPERA;
    l.acao = 'livre';
    l.acaoQuadros = 0;
  }
  if (l.acao === 'especial') {
    if (l.acaoQuadros === C.ESPECIAL_CARGA) {
      e.raios.push({ dono: l.id, idade: 0, x0: l.x + l.olhando * (C.LUTADOR_L / 2 + 4), y: l.y - C.LUTADOR_A * 0.08, direcao: l.olhando, acertou: false });
      eventos.push({ tipo: 'raio', dono: l.id });
    }
    if (l.acaoQuadros >= C.ESPECIAL_CARGA + C.ESPECIAL_RAIO) { l.acao = 'livre'; l.acaoQuadros = 0; }
    return clampar(l);
  }
  if (l.acao === 'atingido') return clampar(l);

  // gatilhos (valem mesmo parado)
  if (l.pedidoEspecial > 0 && l.ki >= C.KI_MAX) {
    l.pedidoEspecial = l.pedidoParry = 0;
    l.ki = 0;
    l.acao = 'especial';
    l.acaoQuadros = 0;
    eventos.push({ tipo: 'especial', dono: l.id });
    return clampar(l);
  }
  if (l.pedidoParry > 0 && l.esperaParry <= 0 && l.acao !== 'parry') {
    l.pedidoParry = 0;
    l.acao = 'parry';
    l.acaoQuadros = 0;
    l.parryAcertou = false;
    eventos.push({ tipo: 'parry', dono: l.id });
  }
  if (l.acao === 'parry') return clampar(l);

  // carregar ki: fica parado acumulando
  if (ent.carregar) {
    if (l.acao !== 'carregando') { l.acao = 'carregando'; l.acaoQuadros = 0; }
    l.ki = Math.min(C.KI_MAX, l.ki + C.KI_CARREGAR_POR_QUADRO);
    return clampar(l);
  }
  if (l.acao === 'carregando') { l.acao = 'livre'; l.acaoQuadros = 0; }
  l.ki = Math.min(C.KI_MAX, l.ki + C.KI_PASSIVO_POR_QUADRO);

  // andar/voar (diagonal com a mesma velocidade)
  let mx = limitar(ent.x, -1, 1), my = limitar(ent.y, -1, 1);
  const tam = Math.hypot(mx, my);
  if (tam > 1) { mx /= tam; my /= tam; }
  l.x += mx * C.VELOCIDADE;
  l.y += my * C.VELOCIDADE;
  l.movX = mx;
  l.movY = my;

  // tiro de ki: segurando ATAQUE sai ~5 por segundo
  if (ent.atacar && l.esperaTiro <= 0 && e.tiros.length < C.TIROS_MAX) {
    e.tiros.push({
      id: e.proximoId++, dono: l.id,
      x: l.x + l.olhando * (C.LUTADOR_L / 2 + 10), y: l.y - C.LUTADOR_A * 0.08 + (sortear(e) - 0.5) * 16,
      vx: l.olhando * C.TIRO_VELOCIDADE, vy: (sortear(e) - 0.5) * 1.5,
      raio: C.TIRO_RAIO, dano: C.TIRO_DANO, refletido: false,
    });
    l.esperaTiro = C.TIRO_INTERVALO;
    l.poseTiro = C.POSE_TIRO_QUADROS;
    eventos.push({ tipo: 'tiro', dono: l.id });
  }
  clampar(l);
}

function clampar(l: Lutador) {
  const [x0, x1] = limitesX(l.id);
  const [y0, y1] = limitesY();
  l.x = limitar(l.x, x0, x1);
  l.y = limitar(l.y, y0, y1);
}

function passoTiros(e: EstadoLuta, eventos: Evento[]) {
  const ficam: Tiro[] = [];
  for (const t of e.tiros) {
    t.x += t.vx;
    t.y += t.vy;
    if (t.x < -20 || t.x > C.TELA_L + 20 || t.y < 0 || t.y > C.TELA_A) continue;
    const alvo = e[outro(t.dono)];
    // parry: o tiro volta para quem atirou, mais rápido
    if (alvo.acao === 'parry' && pertoDoParry(t, alvo)) {
      t.dono = alvo.id;
      t.vx = -t.vx * C.PARRY_REFLEXO_VEL;
      t.vy = -t.vy;
      t.refletido = true;
      alvo.parryAcertou = true;
      eventos.push({ tipo: 'reflexo', dono: alvo.id });
      ficam.push(t);
      continue;
    }
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
    if (!raioAtivo(r)) continue;
    const dono = e[r.dono];
    r.y = dono.y - C.LUTADOR_A * 0.08; // segue a mão de quem solta
    r.x0 = dono.x + dono.olhando * (C.LUTADOR_L / 2 + 4);
    // apaga os tiros do outro que estão na faixa
    e.tiros = e.tiros.filter((t) => t.dono === r.dono || !(Math.abs(t.y - r.y) <= C.ESPECIAL_ALTURA / 2 + t.raio && (r.direcao === 1 ? t.x >= r.x0 : t.x <= r.x0)));
    const alvo = e[outro(r.dono)];
    if (!r.acertou && raioAcerta(r, alvo) && podeApanhar(e, alvo)) {
      r.acertou = true;
      aplicarDano(e, alvo, C.ESPECIAL_DANO, true, r.direcao, eventos);
    }
  }
  e.raios = e.raios.filter((r) => r.idade < C.ESPECIAL_RAIO);
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
    passoTiros(e, eventos);
    passoRaios(e, eventos);
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
