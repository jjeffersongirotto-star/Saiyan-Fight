// Fase "menus": opções, controle, conquistas/ranking, configuração das fases e dados gerados do jogo antigo.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONTROLE_PADRAO, HUD_PADRAO, TECLAS_PADRAO, atribuirBotao, atribuirTecla, hudDoAntigo, lerOpcoes, limiarDoAnalogico,
  modoEfetivo, nomeDaTecla, normalizarBotoes, opcoesPadrao, salvarOpcoes, CHAVE_OPCOES,
} from '../src/logica/opcoes';
import { INTENCAO_VAZIA, donosDosControles, entradaDoControle, intencaoDoControle } from '../src/logica/controle';
import { CONQUISTAS, Conquistas, CHAVE_APELIDO, CHAVE_RANKING } from '../src/logica/conquistas';
import { lerConfigFases, trocarPosicao } from '../src/logica/configFases';
import { prefsDoAntigo } from '../src/audio/som';
import { LINHAS_LEGADO } from '../src/legado/idiomas-legado';
import { UPDATES_LEGADO } from '../src/legado/updates-legado';
// @ts-expect-error script .mjs sem tipos
import { gerarConquistas, gerarIdiomas, gerarUpdates } from '../scripts/gerar-dados-legado.mjs';

class Memoria {
  m = new Map<string, string>();
  constructor(x: Record<string, unknown> = {}) { for (const [k, v] of Object.entries(x)) this.m.set(k, typeof v === 'string' ? v : JSON.stringify(v)); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
const pad = (apertados: number[] = [], axes = [0, 0]) => ({ axes, buttons: Array.from({ length: 18 }, (_, i) => ({ pressed: apertados.includes(i), value: apertados.includes(i) ? 1 : 0 })) });

describe('opções', () => {
  it('trocar o botão do controle troca com a ação que já usava aquele botão', () => {
    const { botoes, deslocada } = atribuirBotao(CONTROLE_PADRAO, 'attack', CONTROLE_PADRAO.parry[0]);
    expect(botoes.attack).toEqual([CONTROLE_PADRAO.parry[0]]);
    expect(botoes.parry).toEqual(CONTROLE_PADRAO.attack);
    expect(deslocada).toBe('parry');
    expect(CONTROLE_PADRAO.attack).toEqual([2]); // não muda o original
  });
  it('trocar uma tecla troca com a ação do mesmo jogador que usava a tecla', () => {
    const t = atribuirTecla(TECLAS_PADRAO.p1, 'attack', TECLAS_PADRAO.p1.charge);
    expect(t.attack).toBe(TECLAS_PADRAO.p1.charge);
    expect(t.charge).toBe(TECLAS_PADRAO.p1.attack);
  });
  it('botões salvos velhos ou estragados viram o padrão', () => {
    expect(normalizarBotoes(null)).toEqual(CONTROLE_PADRAO);
    expect(normalizarBotoes({ attack: [7, 7, 'x', -1], parry: 'R1' }).attack).toEqual([7]);
  });
  it('sensibilidade 1..5 = analógico de 0.6 a 0.2', () => {
    expect([1, 2, 3, 4, 5].map(limiarDoAnalogico)).toEqual([0.6, 0.5, 0.4, 0.3, 0.2]);
    expect(limiarDoAnalogico(99)).toBe(0.2);
  });
  it('na 1ª vez lê as escolhas do jogo antigo (só leitura) e depois só as do novo', () => {
    const a = new Memoria({
      saiyan_controls_v: '2', saiyan_controls: { p1: { ...TECLAS_PADRAO.p1, attack: 'KeyJ' }, p2: TECLAS_PADRAO.p2 },
      saiyan_control_selection: 'pc', saiyan_touch_mode: 'swipe', saiyan_doubletap: 'false', saiyan_vibration: 'false',
      saiyan_autofire: 'false', saiyan_pad_sens: '5', saiyan_pad_bindings_v: '2', saiyan_pad_bindings: { ...CONTROLE_PADRAO, special: [7] },
    });
    const o = lerOpcoes(a);
    expect(o.teclas.p1.attack).toBe('KeyJ');
    expect([o.modoControle, o.modoToque, o.duploToqueParry, o.vibracao, o.tiroContinuo, o.sensibilidade]).toEqual(['pc', 'swipe', false, false, false, 5]);
    expect(o.controle.special).toEqual([7]);
    const antes = new Map(a.m);
    salvarOpcoes({ ...o, modoToque: 'analog' }, a);
    expect([...a.m.keys()].filter((k) => !antes.has(k))).toEqual([CHAVE_OPCOES]);
    expect(lerOpcoes(a).modoToque).toBe('analog');
    expect(a.getItem('saiyan_touch_mode')).toBe('swipe');
  });
  it('ataque no mouse do antigo só vale no modo mouse', () => {
    const a = new Memoria({ saiyan_controls_v: '2', saiyan_controls: { p1: { ...TECLAS_PADRAO.p1, attack: 'MouseLeft' } } });
    expect(lerOpcoes(a).teclas.p1.attack).toBe('KeyF');
    a.setItem('saiyan_pc_mode', 'mouse');
    expect(lerOpcoes(a).teclas.p1.attack).toBe('MouseLeft');
  });
  it('HUD do antigo (canto em 0..1) vira centro no novo; nada salvo = padrão', () => {
    const h = hudDoAntigo({ attack: { x: 0.5, y: 0.5, w: 40, scale: 1.2, opacity: 0.6 } })!;
    expect(h.attack).toMatchObject({ x: 420, y: 195, escala: 1.2, opacidade: 0.6 });
    expect(h.parry).toEqual(HUD_PADRAO.parry);
    expect(hudDoAntigo(null)).toBeNull();
  });
  it('nomes das teclas como no antigo', () => {
    expect(['ArrowUp', 'Space', 'KeyQ', 'Digit3', 'Numpad5', 'MouseLeft', ''].map(nomeDaTecla)).toEqual(['SETA CIMA', 'ESPAÇO', 'Q', '3', 'NUM 5', 'MOUSE ESQ.', '—']);
  });
  it('modo AUTOMÁTICO segue o último tipo de entrada', () => {
    const o = opcoesPadrao();
    expect(modoEfetivo({ ...o, modoControle: 'touch' }, 'pc', false)).toBe('touch');
    expect(modoEfetivo(o, 'joystick', true)).toBe('joystick');
  });
});

describe('controle (gamepad)', () => {
  it('analógico com limiar, direcional e botões escolhidos', () => {
    const i = intencaoDoControle(pad([2, 15], [0.3, -0.9]));
    expect([i.cima, i.direita, i.esquerda, i.acoes.attack, i.ax]).toEqual([true, true, false, true, 0]);
    expect(intencaoDoControle(null)).toBe(INTENCAO_VAZIA);
  });
  it('especial, parry e transformar só no aperto novo; ataque e carregar enquanto segura', () => {
    const agora = intencaoDoControle(pad([1, 5, 0, 2]));
    const e1 = entradaDoControle(agora, INTENCAO_VAZIA), e2 = entradaDoControle(agora, agora);
    expect([e1.especial, e1.parry, e1.atacar, e1.carregar]).toEqual([true, true, true, true]);
    expect([e2.especial, e2.parry, e2.atacar, e2.carregar]).toEqual([false, false, true, true]);
  });
  it('VERSUS no celular com 1 controle: ele fica com o J2', () => {
    expect(donosDosControles(['a'], true, true)).toEqual({ p2: 'a' });
    expect(donosDosControles(['a', 'b'], true, false)).toEqual({ p1: 'a', p2: 'b' });
  });
});

describe('conquistas e ranking', () => {
  it('juntam as do antigo (só leitura) com as do novo e avisam ao destravar', () => {
    const a = new Memoria({ saiyan_badges: { reflect_10: true, nao_existe: true }, saiyan_stats: { reflectsTotal: 40 } });
    const c = new Conquistas(a);
    expect(c.tem('reflect_10')).toBe(true);
    const avisos: string[] = [];
    c.aoDestravar((x) => avisos.push(x.id));
    c.somar('reflectsTotal', 10);
    expect(avisos).toEqual(['reflect_50']);
    expect(a.getItem('saiyan_badges')).toBe(JSON.stringify({ reflect_10: true, nao_existe: true }));
    expect(c.contagem().total.total).toBe(CONQUISTAS.length);
    expect(CONQUISTAS.length).toBe(57);
  });
  it('ranking: top 5 juntando antigo e novo, sem repetir', () => {
    const velho = [{ score: 10, date: 'a' }, { score: 30, date: 'b' }];
    const a = new Memoria({ saiyan_ranking: velho });
    const c = new Conquistas(a);
    for (const s of [5, 50, 20, 40]) c.registrarPontuacao('kame', { score: s, date: 'x' });
    expect(c.rankingGeral().map((r) => r.score)).toEqual([50, 40, 30, 20, 10]);
    expect(c.rankingDaFase('kame').map((r) => r.score)).toEqual([50, 40, 20, 5]);
    expect(JSON.parse(a.getItem('saiyan_ranking')!)).toEqual(velho);
    expect(JSON.parse(a.getItem(CHAVE_RANKING)!)).toHaveLength(4);
    expect(c.estat.highScoreEver).toBe(50);
  });
  it('apelido: lê o do antigo, grava só no novo, até 16 letras', () => {
    const a = new Memoria({ saiyan_apelido: 'GOKU' });
    const c = new Conquistas(a);
    expect(c.apelido()).toBe('GOKU');
    expect(c.definirApelido('  VEGETA PRINCIPE DOS SAIYAJINS ')).toHaveLength(16);
    expect(a.getItem('saiyan_apelido')).toBe('GOKU');
    expect(a.getItem(CHAVE_APELIDO)).toHaveLength(16);
  });
});

describe('ARENAS: posição, vilão e minion', () => {
  it('trocar posição tira a fase do lugar e as outras andam uma casa', () => {
    expect(trocarPosicao(['a', 'b', 'c', 'd'], 'd', 2)).toEqual(['a', 'd', 'b', 'c']);
    expect(trocarPosicao(['a', 'b', 'c'], 'a', 9)).toEqual(['b', 'c', 'a']);
    expect(trocarPosicao(['a', 'b'], 'z', 1)).toEqual(['a', 'b']);
  });
  it('lê as escolhas do antigo traduzindo a chave do personagem; personagem desconhecido é ignorado', () => {
    const a = new Memoria({ saiyan_ordem_fases: ['b', 'a'], saiyan_viloes_fase: { a: { key: 'freeza_1', nivel: 2 }, b: { key: 'custom_x' } }, saiyan_minions_fase: { a: 'celljr', b: 'dragao' } });
    const cfg = lerConfigFases((k) => (k === 'freeza_1' ? 'freeza' : null), (id) => id === 'freeza', a);
    expect(cfg).toEqual({ ordem: ['b', 'a'], viloes: { a: { personagem: 'freeza', nivel: 2 } }, minions: { a: 'celljr' } });
  });
});

describe('áudio do antigo', () => {
  it('volume e mudo do antigo na 1ª vez', () => {
    const p = { mudo: false, volEfeitos: 0.5, volMusica: 0.5 };
    const m: Record<string, string> = { saiyan_mute: 'true', saiyan_sfx_vol: '0.3', saiyan_bgm_vol: '7' };
    expect(prefsDoAntigo(p, (k) => m[k] ?? null)).toEqual({ mudo: true, volEfeitos: 0.3, volMusica: 1 });
    expect(prefsDoAntigo(p, () => null)).toEqual(p);
  });
});

describe('dados gerados do jogo antigo', () => {
  const dir = path.resolve(__dirname, '../src/legado');
  it('estão em dia com idiomas.js, progress.js e o histórico de updates (rodar node novo/scripts/gerar-dados-legado.mjs)', () => {
    expect(fs.readFileSync(path.join(dir, 'idiomas-legado.ts'), 'utf8')).toBe(gerarIdiomas());
    expect(fs.readFileSync(path.join(dir, 'conquistas-legado.ts'), 'utf8')).toBe(gerarConquistas());
    expect(fs.readFileSync(path.join(dir, 'updates-legado.ts'), 'utf8')).toBe(gerarUpdates());
    expect(LINHAS_LEGADO.length).toBeGreaterThan(800);
    expect(UPDATES_LEGADO.length).toBeGreaterThan(100);
  });
});
