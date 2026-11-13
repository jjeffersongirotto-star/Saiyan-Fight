// EDITOR DE PERSONAGENS do jogo novo (sem o jogo antigo): os dados de um personagem criado e as contas do editor
// (sem DOM, testáveis). Cada forma (normal + transformações) tem os SEUS quadros por movimento (imagens PNG em
// data URL recortadas da sprite sheet) e o fps de cada movimento. Fica guardado no IndexedDB `saiyan-novo`
// (ui/armazemCriados.ts), nunca nas chaves do antigo. Os criados no antigo entram só lendo (importarDoAntigo).
import { MOVIMENTOS, type Movimento } from './animacao';
import type { Alinhamento, Aura, DadosPersonagem, EfeitoEspecial } from '../dados/personagens';
import { idDoCriado, type PersonagemCriado, type Quadros } from './criados';

export const AURAS_EDITOR: [Aura, string][] = [['gelo', 'BRANCA'], ['amarelo', 'AMARELA'], ['vermelho', 'VERMELHA'], ['rosa', 'ROSA'], ['azul', 'AZUL'], ['verde', 'VERDE'], ['roxo', 'ROXA'], ['blue', 'AZUL BLUE (CHAMA)'], ['azul_escuro', 'AZUL ESCURA']];
export const ALINHAMENTOS: Alinhamento[] = ['HERÓI', 'ANTI-HERÓI', 'VILÃO'];
export const EFEITOS_TIRO: [string, string][] = [['', 'PADRÃO'], ['cor', 'PELA COR DO TIRO'], ['tiro_pixel', 'TIRO PIXEL (AZUL E LARANJA)'], ['tiro_freeza', 'TIRO DO DEDO (ROSA)'], ['tiro_vermelho', 'BOLA VERMELHA'], ['tiro_laranja', 'TIRO LARANJA'], ['tiro_amarelo', 'TIRO AMARELO'], ['cometa_azul', 'COMETA AZUL'], ['bola_azul', 'BOLA AZUL-CLARA'], ['tiro_verde', 'TIRO VERDE E AZUL'], ['esfera_roxa', 'ESFERA ROXA'], ['esfera_rosa', 'ESFERA ROSA'], ['bola_eletrica', 'BOLA ELÉTRICA'], ['cometa_fogo', 'COMETINHA DE FOGO'], ['esfera_fogo', 'ESFERA DE FOGO']];
export const EFEITOS_ESPECIAL: [EfeitoEspecial, string][] = [['cor', 'RAIO DESENHADO (PELA COR)'], ['kamehameha', 'KAMEHAMEHA (RAIO AZUL LARGO)'], ['raio_azul', 'RAIO AZUL COM CABEÇA'], ['raio_verde', 'RAIO VERDE'], ['raio_vermelho', 'RAIO VERMELHO'], ['sol_freeza', 'BOLA DE ENERGIA (SOL DO FREEZA)']];
export const NOMES_MOVIMENTOS: Record<Movimento, string> = {
  idle: 'PARADO', flyRight: 'VOAR PARA FRENTE', flyLeft: 'VOAR PARA TRÁS', flyUp: 'VOAR PARA CIMA', flyDown: 'VOAR PARA BAIXO',
  flyUpRight: 'DIAGONAL CIMA-FRENTE', flyUpLeft: 'DIAGONAL CIMA-TRÁS', flyDownRight: 'DIAGONAL BAIXO-FRENTE', flyDownLeft: 'DIAGONAL BAIXO-TRÁS',
  parry: 'PARRY', attackKi: 'ATAQUE DE KI', chargeKi: 'CARREGAR KI', transform: 'TRANSFORMAR', special: 'ESPECIAL',
};
export const QUADROS_MAX = 30; // por movimento (sprite-animation-frames max do antigo)
export const TRANSFORMACOES_MAX = 12;
export const FPS_PADRAO = 12;
export const ALTURA_MIN = 60, ALTURA_MAX = 400;

export interface FormaEditavel {
  nome: string;
  aura: Aura;
  altura: number;
  quadros: Quadros;
  fps: Partial<Record<Movimento, number>>;
}
export interface PersonagemEditavel {
  /** id da textura/registro no jogo (c_...) */
  id: string;
  /** de onde veio: criado no novo ou importado (cópia) do antigo — o antigo nunca é alterado */
  origem: 'novo' | 'antigo';
  /** chave no characterDB do antigo (quando veio de lá): o editado no novo passa a valer no lugar do antigo */
  chaveAntiga: string;
  nome: string;
  alinhamento: Alinhamento;
  especial: string;
  corKi: string; // #rrggbb
  efeitoTiro: string;
  efeitoEspecial: EfeitoEspecial;
  formas: FormaEditavel[]; // [0] = normal
  /** quando foi salvo (ms) */
  salvo: number;
}

const ehObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const corValida = (x: unknown, p: string) => (typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? x.toLowerCase() : p);
const AURAS = AURAS_EDITOR.map((a) => a[0]);
const aura = (x: unknown, p: Aura): Aura => (AURAS.includes(x as Aura) ? (x as Aura) : p);
export const limitarAltura = (x: unknown, p = 175) => { const n = Math.round(Number(x)); return Number.isFinite(n) && n > 0 ? Math.max(ALTURA_MIN, Math.min(ALTURA_MAX, n)) : p; };
const texto = (x: unknown, max: number, p: string) => (typeof x === 'string' && x.trim() ? x.trim().slice(0, max) : p);

function limparQuadros(x: unknown): Quadros {
  const q: Quadros = {};
  if (!ehObj(x)) return q;
  for (const m of MOVIMENTOS) {
    const l = x[m];
    if (Array.isArray(l)) { const ok = l.filter((u): u is string => typeof u === 'string' && u.startsWith('data:image/')).slice(0, QUADROS_MAX); if (ok.length) q[m] = ok; }
  }
  return q;
}
function limparFps(x: unknown): Partial<Record<Movimento, number>> {
  const r: Partial<Record<Movimento, number>> = {};
  if (ehObj(x)) for (const m of MOVIMENTOS) { const n = Math.round(Number(x[m])); if (Number.isFinite(n) && n > 0) r[m] = Math.max(1, Math.min(60, n)); }
  return r;
}

export function novaForma(nome: string, base?: Partial<FormaEditavel>): FormaEditavel {
  return { nome, aura: base?.aura ?? 'amarelo', altura: base?.altura ?? 175, quadros: {}, fps: {} };
}
export function novoPersonagem(agora = Date.now()): PersonagemEditavel {
  return {
    id: 'c_novo_' + agora.toString(36), origem: 'novo', chaveAntiga: '', nome: 'NOVO LUTADOR', alinhamento: 'HERÓI', especial: 'KAMEHAMEHA',
    corKi: '#00ffff', efeitoTiro: '', efeitoEspecial: 'cor', formas: [{ ...novaForma('Normal'), aura: 'gelo' }], salvo: 0,
  };
}

/** limpa o que veio do armazém ou de um arquivo (nunca confia) */
export function normalizarPersonagem(x: unknown): PersonagemEditavel | null {
  if (!ehObj(x) || typeof x.id !== 'string' || !/^c_\w+$/.test(x.id)) return null;
  const formas = (Array.isArray(x.formas) ? x.formas : []).filter(ehObj).slice(0, TRANSFORMACOES_MAX + 1).map((f, i) => ({
    nome: texto(f.nome, 32, i === 0 ? 'Normal' : `Transformação ${i}`), aura: aura(f.aura, i === 0 ? 'gelo' : 'amarelo'), altura: limitarAltura(f.altura),
    quadros: limparQuadros(f.quadros), fps: limparFps(f.fps),
  }));
  if (!formas.length) formas.push({ ...novaForma('Normal'), aura: 'gelo' });
  const ef = EFEITOS_ESPECIAL.map((e) => e[0]);
  return {
    id: x.id, origem: x.origem === 'antigo' ? 'antigo' : 'novo', chaveAntiga: typeof x.chaveAntiga === 'string' ? x.chaveAntiga : '',
    nome: texto(x.nome, 20, 'NOVO LUTADOR').toUpperCase(), alinhamento: ALINHAMENTOS.includes(x.alinhamento as Alinhamento) ? (x.alinhamento as Alinhamento) : 'HERÓI',
    especial: texto(x.especial, 28, 'KAMEHAMEHA').toUpperCase(), corKi: corValida(x.corKi, '#00ffff'),
    efeitoTiro: EFEITOS_TIRO.some((e) => e[0] === x.efeitoTiro) ? (x.efeitoTiro as string) : '',
    efeitoEspecial: ef.includes(x.efeitoEspecial as EfeitoEspecial) ? (x.efeitoEspecial as EfeitoEspecial) : 'cor',
    formas, salvo: Number.isFinite(Number(x.salvo)) ? Number(x.salvo) : 0,
  };
}

/** o que falta para dar para lutar com ele (vazio = pronto) */
export function problemasDoPersonagem(p: PersonagemEditavel): string[] {
  const r: string[] = [];
  if (!p.nome.trim()) r.push('FALTA O NOME DO PERSONAGEM.');
  if (!p.formas[0]?.quadros.idle?.length) r.push('A FORMA NORMAL PRECISA DE PELO MENOS 1 QUADRO EM PARADO.');
  return r;
}

/** forma que desenha a forma i: a própria, ou (sem quadros) a anterior com quadros — como o antigo fazia */
export function formaComQuadros(p: PersonagemEditavel, i: number): number {
  for (let k = Math.min(i, p.formas.length - 1); k > 0; k--) if (p.formas[k].quadros.idle?.length) return k;
  return 0;
}

/** para lutar: o formato dos criados (ui/criados.ts monta uma textura por forma) */
export function paraCriado(p: PersonagemEditavel): PersonagemCriado {
  const fontes: PersonagemCriado['fontes'] = {}, quadros: PersonagemCriado['quadros'] = {}, fps: PersonagemCriado['fps'] = {};
  const formas: DadosPersonagem['formas'] = p.formas.map((f, i) => {
    const k = formaComQuadros(p, i), chave = 'f' + k;
    fontes[chave] = { tipo: 'original' };
    quadros[chave] = p.formas[k].quadros;
    fps[chave] = p.formas[k].fps;
    return { forma: chave, nome: f.nome, aura: f.aura, altura: f.altura };
  });
  return {
    id: p.id, chaveAntiga: p.chaveAntiga || p.id, nome: p.nome, alinhamento: p.alinhamento, especial: p.especial, corKi: parseInt(p.corKi.slice(1), 16),
    efeitoTiro: p.efeitoTiro, efeitoEspecial: p.efeitoEspecial, formas, criado: true, fontes, quadros, fps, noIndexedDb: [],
  };
}

/** cópia editável de um personagem criado no antigo (já com as imagens das formas lidas) */
export function doCriadoAntigo(c: PersonagemCriado): PersonagemEditavel {
  const hex = '#' + c.corKi.toString(16).padStart(6, '0');
  return {
    id: c.id, origem: 'antigo', chaveAntiga: c.chaveAntiga, nome: c.nome, alinhamento: c.alinhamento, especial: c.especial, corKi: hex,
    efeitoTiro: c.efeitoTiro, efeitoEspecial: c.efeitoEspecial,
    formas: c.formas.map((f) => ({ nome: f.nome, aura: f.aura, altura: f.altura, quadros: clonarQuadros(c.quadros[f.forma] ?? {}), fps: { ...(c.fps[f.forma] ?? {}) } })),
    salvo: 0,
  };
}
export const clonarQuadros = (q: Quadros): Quadros => Object.fromEntries(Object.entries(q).map(([m, l]) => [m, [...(l ?? [])]])) as Quadros;
export const clonarPersonagem = (p: PersonagemEditavel): PersonagemEditavel => ({ ...p, formas: p.formas.map((f) => ({ ...f, quadros: clonarQuadros(f.quadros), fps: { ...f.fps } })) });

// ---------------- quadros de um movimento ----------------
export function moverQuadro(l: string[], de: number, para: number): string[] {
  const r = [...l];
  if (de < 0 || de >= r.length) return r;
  const [x] = r.splice(de, 1);
  r.splice(Math.max(0, Math.min(para, r.length)), 0, x);
  return r;
}
export const apagarQuadro = (l: string[], i: number) => l.filter((_, k) => k !== i);
export const clonarQuadro = (l: string[], i: number) => (i >= 0 && i < l.length && l.length < QUADROS_MAX ? [...l.slice(0, i + 1), l[i], ...l.slice(i + 1)] : [...l]);
export const juntarQuadros = (l: string[], novos: string[]) => [...l, ...novos].slice(0, QUADROS_MAX);

// ---------------- transformações ----------------
export function adicionarTransformacao(p: PersonagemEditavel): boolean {
  if (p.formas.length > TRANSFORMACOES_MAX) return false;
  const ant = p.formas[p.formas.length - 1];
  p.formas.push(novaForma(`Transformação ${p.formas.length}`, { aura: 'amarelo', altura: ant.altura }));
  return true;
}
export function removerTransformacao(p: PersonagemEditavel, i: number): void { if (i > 0 && i < p.formas.length) p.formas.splice(i, 1); }
export function moverTransformacao(p: PersonagemEditavel, i: number, d: -1 | 1): void {
  const j = i + d;
  if (i <= 0 || j <= 0 || j >= p.formas.length) return; // a normal fica sempre em primeiro
  [p.formas[i], p.formas[j]] = [p.formas[j], p.formas[i]];
}

// ---------------- sprite sheet ----------------
export interface Celula { x: number; y: number; w: number; h: number; i: number }
/** quadros da grade (da esquerda para a direita, de cima para baixo), como getSpriteSheetGrid do antigo */
export function gradeDaFolha(largImg: number, altImg: number, fw: number, fh: number, total = 0, espaco = 0): Celula[] {
  fw = Math.max(1, Math.round(fw)); fh = Math.max(1, Math.round(fh)); espaco = Math.max(0, Math.round(espaco));
  const cols = Math.max(1, Math.floor((largImg + espaco) / (fw + espaco))), linhas = Math.max(1, Math.floor((altImg + espaco) / (fh + espaco)));
  const n = total > 0 ? Math.min(total, cols * linhas) : cols * linhas;
  const r: Celula[] = [];
  for (let i = 0; i < n; i++) r.push({ x: (i % cols) * (fw + espaco), y: Math.floor(i / cols) * (fh + espaco), w: fw, h: fh, i });
  return r;
}

export type ModoFundo = 'auto' | 'color' | 'none';
/** apaga o fundo (getBgRemovalFromForm do antigo): auto = o branco; color = a cor escolhida, com tolerância (%) */
export function removerFundo(px: Uint8ClampedArray, modo: ModoFundo, cor = '#ffffff', tolerancia = 10): number {
  if (modo === 'none') return 0;
  const alvo = modo === 'auto' ? [255, 255, 255] : [1, 3, 5].map((k) => parseInt(corValida(cor, '#ffffff').slice(k, k + 2), 16));
  const lim = (Math.max(0, Math.min(100, tolerancia)) / 100) * 441.7 + (modo === 'auto' ? 30 : 0);
  let apagados = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const d = Math.hypot(px[i] - alvo[0], px[i + 1] - alvo[1], px[i + 2] - alvo[2]);
    if (d <= lim) { px[i + 3] = 0; apagados++; }
  }
  return apagados;
}

/** cor do canto de cima à esquerda (pickBgColorFromCorner) */
export function corDoCanto(px: Uint8ClampedArray): string {
  return '#' + [px[0], px[1], px[2]].map((v) => (v ?? 255).toString(16).padStart(2, '0')).join('');
}

// ---------------- arquivo .saiyan.json (o mesmo formato do antigo + as formas do novo) ----------------
export const FORMATO_PERSONAGEM = 'saiyan-fight-personagem';
export function paraArquivo(p: PersonagemEditavel): Record<string, unknown> {
  const base = p.formas[0];
  return {
    formato: FORMATO_PERSONAGEM, versao: 1,
    personagem: {
      name: p.nome, alignment: p.alinhamento, aura: base.aura, special: p.especial, projColor: p.corKi, projSize: 'normal',
      ...(p.efeitoTiro ? { efeitoTiro: p.efeitoTiro } : {}), efeitoEspecial: p.efeitoEspecial, altura: base.altura,
      animations: clonarQuadros(base.quadros), fpsSettings: { ...base.fps },
      transformations: p.formas.slice(1).map((f) => ({ name: f.nome, aura: f.aura, altura: f.altura })),
      // o jogo antigo ignora este campo; o novo lê os quadros de cada transformação daqui
      formasNovo: p.formas.slice(1).map((f) => ({ nome: f.nome, aura: f.aura, altura: f.altura, animations: clonarQuadros(f.quadros), fps: { ...f.fps } })),
    },
  };
}
export const nomeDoArquivo = (nome: string, ext = '.saiyan.json') =>
  (nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'personagem') + ext;

/** lê um .saiyan.json (do antigo ou do novo): { p } ou { erro } */
export function deArquivo(dados: unknown, agora = Date.now()): { p: PersonagemEditavel } | { erro: string } {
  if (!ehObj(dados) || dados.formato !== FORMATO_PERSONAGEM || !ehObj(dados.personagem)) return { erro: 'ESTE ARQUIVO NÃO É DE PERSONAGEM DO SAIYAN FIGHT.' };
  if (Number(dados.versao) > 1) return { erro: 'ARQUIVO FEITO POR UMA VERSÃO MAIS NOVA DO JOGO. ATUALIZE O JOGO.' };
  const d = dados.personagem;
  if (typeof d.name !== 'string' || !d.name.trim()) return { erro: 'FALTA O NOME DO PERSONAGEM (name).' };
  if (d.minionClassico) return { erro: 'MINIONS NÃO LUTAM: ESTE ARQUIVO É DE UM MINION.' };
  if (d.folha) return { erro: 'ARQUIVO COM FOLHA DE SPRITES POR NOME: ABRA A IMAGEM NA ABA ANIMAÇÕES E RECORTE OS QUADROS.' };
  const quadros = limparQuadros(d.animations);
  if (!quadros.idle?.length) return { erro: 'FALTA O MOVIMENTO idle (PARADO).' };
  const transf = (Array.isArray(d.transformations) ? d.transformations : []).filter(ehObj).slice(0, TRANSFORMACOES_MAX);
  const extras = (Array.isArray(d.formasNovo) ? d.formasNovo : []).filter(ehObj);
  const auraBase = aura(typeof d.aura === 'string' ? d.aura.toLowerCase() : d.aura, 'gelo');
  const p = normalizarPersonagem({
    id: 'c_novo_' + agora.toString(36), origem: 'novo', nome: d.name, alinhamento: typeof d.alignment === 'string' ? d.alignment.toUpperCase() : 'HERÓI',
    especial: d.special, corKi: d.projColor, efeitoTiro: d.efeitoTiro, efeitoEspecial: d.efeitoEspecial,
    formas: [{ nome: 'Normal', aura: auraBase, altura: d.altura, quadros, fps: d.fpsSettings },
      ...transf.map((t, i) => ({ nome: t.name, aura: t.aura, altura: t.altura ?? d.altura, quadros: extras[i]?.animations ?? {}, fps: extras[i]?.fps ?? {} }))],
  });
  return p ? { p } : { erro: 'ARQUIVO INVÁLIDO.' };
}

/** quantos quadros tem no total (para mostrar no cartão da lista) */
export const totalDeQuadros = (p: PersonagemEditavel) => p.formas.reduce((n, f) => n + Object.values(f.quadros).reduce((k, l) => k + (l?.length ?? 0), 0), 0);
export { idDoCriado };
