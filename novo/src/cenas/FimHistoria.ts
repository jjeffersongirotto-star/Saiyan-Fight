// Fim de uma fase do modo história: vitória (grava o progresso e diz o que foi liberado) ou fim de jogo, com os
// números da luta. O progresso vai para a chave do jogo novo (logica/progresso.ts), nunca para a do antigo.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { escalaDaAltura } from '../logica/luta';
import { dificilLiberado, faseLiberada, semLimiteLiberado, type ModoFase } from '../logica/ondas';
import { lerProgresso, salvarModoCompleto, salvarRecorde } from '../logica/progresso';
import type { EstatisticasHistoria } from '../logica/historia';
import { faseDe, fasesEmOrdem } from '../dados/fases';
import { criarBotao } from '../ui/botao';
import { metaDoAtlas } from '../ui/formas';
import { desenharIcone } from '../ui/historia';
import type { DadosDaLuta } from './Menu';
import { aoApertar } from '../entrada/teclas';
import { som } from '../audio/som';
import { conquistas } from '../logica/conquistas';

export interface DadosDoFimHistoria {
  luta: DadosDaLuta;
  resultado: 'vitoria' | 'derrota';
  pontos: number;
  onda: number;
  passo: number;
  stats: EstatisticasHistoria;
  segundos: number;
  atlas: string;
  altura: number;
}

/** O que a vitória liberou (compara o progresso antes e depois de gravar). */
export function novidadesDaVitoria(fase: string, modo: ModoFase, ordem: string[], antes: ReturnType<typeof lerProgresso>, depois: ReturnType<typeof lerProgresso>): string[] {
  const r: string[] = [];
  const i = ordem.indexOf(fase);
  const prox = ordem[i + 1];
  if (prox && !faseLiberada(prox, ordem, antes) && faseLiberada(prox, ordem, depois)) r.push('PRÓXIMA FASE LIBERADA!');
  if (modo === 'normal' && !dificilLiberado(fase, antes) && dificilLiberado(fase, depois)) r.push('DIFÍCIL LIBERADO!');
  if (!semLimiteLiberado(fase, antes) && semLimiteLiberado(fase, depois)) r.push('SEM LIMITE LIBERADO!');
  return r;
}

export class FimHistoria extends Phaser.Scene {
  constructor() {
    super('FimHistoria');
  }

  create(d: DadosDoFimHistoria): void {
    som.musica(null);
    ajustarCamera(this);
    const fase = faseDe(d.luta.fase ?? '');
    const modo = d.luta.modoFase ?? 'normal';
    const ordem = fasesEmOrdem().map((f) => f.id);
    const venceu = d.resultado === 'vitoria';
    let novidades: string[] = [];
    if (venceu) {
      const antes = lerProgresso();
      novidades = novidadesDaVitoria(fase.id, modo, ordem, antes, salvarModoCompleto(fase.id, modo));
    }
    const ondaFinal = modo === 'unlimited' ? d.passo + 1 : d.passo + (venceu ? 1 : 0);
    const recorde = salvarRecorde(fase.id, modo, d.pontos, ondaFinal);
    // RANKING (geral e da fase) e as conquistas de fase, como saveRankingScore / checkStageModeAchievements do antigo
    const c = conquistas();
    c.registrarPontuacao(fase.id, { score: d.pontos, date: new Date().toLocaleDateString(), tempo: d.segundos, golpes: d.stats.golpes, apelido: c.apelido() || undefined });
    if (venceu) c.checarFases(ordem, lerProgresso());

    this.add.rectangle(TELA_L / 2, TELA_A / 2, TELA_L, TELA_A, 0x0a0f1f, 1);
    this.add.rectangle(TELA_L / 2, TELA_A / 2, TELA_L, TELA_A, fase.cor, 0.12);
    if (this.textures.exists(d.atlas)) {
      const k = Math.min(1.15, escalaDaAltura(d.altura));
      const s = this.add.sprite(150, 268, d.atlas, 'idle/0').setOrigin(0.5, 103 / 112).setScale(k / metaDoAtlas(this, d.atlas).escala);
      const anim = `${d.atlas}:${venceu ? 'idle' : 'hit'}`;
      if (this.anims.exists(anim)) s.play(anim);
      else if (this.anims.exists(`${d.atlas}:idle`)) s.play(`${d.atlas}:idle`);
      if (!venceu) s.setAlpha(0.6);
    }
    const titulo = venceu ? T('FASE COMPLETA!') : T('FIM DE JOGO');
    this.add
      .text(TELA_L / 2, 34, titulo, estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '30px', color: venceu ? '#ffd23a' : '#ff6b6b', stroke: '#2a0a00', strokeThickness: 6 }))
      .setOrigin(0.5);
    const modoTxt = modo === 'hard' ? T('DIFÍCIL') : modo === 'unlimited' ? T('SEM LIMITE') : T('NORMAL');
    this.add.text(TELA_L / 2, 64, `${T(fase.nome)} · ${modoTxt}`, estiloTexto({ fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' })).setOrigin(0.5);

    // números da luta
    const st = d.stats;
    const min = Math.floor(d.segundos / 60), seg = String(d.segundos % 60).padStart(2, '0');
    const linhas: [string, string][] = [
      [T('PONTOS'), String(d.pontos) + (recorde ? `  ★ ${T('RECORDE')}` : '')],
      [T('ONDA'), modo === 'unlimited' ? String(d.passo + 1) : `${Math.min(5, ondaFinal)}/5`],
      [T('TEMPO'), `${min}:${seg}`],
      [T('ATAQUES'), String(st.ataques)],
      [T('REBATIDAS'), String(st.rebatidas)],
      [T('GOLPES RECEBIDOS'), String(st.golpes)],
      [T('MINIONS'), String(st.minions)],
    ];
    const estilo = estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#dfe7ff' });
    const estiloV = estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ffd23a' });
    linhas.forEach(([k, v], i) => {
      this.add.text(300, 90 + i * 22, k, estilo);
      this.add.text(560, 90 + i * 22, v, estiloV).setOrigin(1, 0);
    });
    // itens pegos
    const g = this.add.graphics();
    this.add.text(690, 90, T('ITENS'), estilo).setOrigin(0.5, 0);
    (['senzu', 'capsula', 'nuvem', 'bastao'] as const).forEach((tipo, i) => {
      const x = 640 + (i % 2) * 80, y = 128 + Math.floor(i / 2) * 34;
      desenharIcone(g, tipo, x, y, 0.9);
      this.add.text(x + 16, y - 8, `x${st.itens[tipo]}`, estiloV);
    });
    novidades.forEach((n, i) => {
      this.add.text(TELA_L / 2 + 80, 250 + i * 18, T(n), estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#7dff9a', stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5);
    });

    const deNovo = () => this.scene.start('Luta', d.luta);
    const mapa = () => this.scene.start('Mapa', { fase: fase.id });
    const menu = () => this.scene.start('Menu');
    const prox = ordem[ordem.indexOf(fase.id) + 1];
    const temProx = venceu && modo === 'normal' && !!prox;
    criarBotao(this, TELA_L / 2 - 250, 318, venceu ? T('JOGAR DE NOVO') : T('TENTAR DE NOVO'), deNovo, 220);
    criarBotao(this, TELA_L / 2, 318, temProx ? T('PRÓXIMA FASE') : T('MAPA'), temProx ? () => this.scene.start('Mapa', { fase: prox }) : mapa, 220);
    criarBotao(this, TELA_L / 2 + 250, 318, T('MENU'), menu, 220);
    let foi = false;
    aoApertar(this, (c, ev) => {
      if (foi || ev.repeat) return;
      if (c === 'Enter' || c === 'NumpadEnter') { foi = true; deNovo(); }
      else if (c === 'Escape') { foi = true; mapa(); }
    });
  }
}
