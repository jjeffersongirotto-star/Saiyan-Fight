// ATUALIZAÇÕES (a janela UPDATES do jogo antigo): versão/build, novidades e a setinha ATUALIZAR do app.
//  - no app (APK): ⟳ ATUALIZAR procura versão nova e, se o jogador aceitar, baixa e troca o pacote do jogo
//    (src/app/plataforma.ts). Nada disso acontece sozinho.
//  - no navegador do Android: BAIXAR APP leva ao APK; no resto do site não há botão (o site já abre a versão nova).
//  - JOGO ANTIGO abre o jogo antigo (HTML/JS) que continua no site, em /antigo/.
import Phaser from 'phaser';
import { ajustarCamera, estiloTexto } from '../ui/resolucao';
import { TELA_A, TELA_L } from '../logica/constantes';
import { T } from '../logica/idioma';
import { criarBotao } from '../ui/botao';
import { desenharFundo } from './fundo';
import { aoApertar } from '../entrada/teclas';
import { NOVIDADES } from '../dados/novidades';
import { abrirApk, abrirJogoAntigo, androidNoNavegador, baixarEAtualizar, infoVersao, noApp, procurarAtualizacao, versaoDoAppInstalado } from '../app/plataforma';


export class Atualizacoes extends Phaser.Scene {
  private ocupado = false;
  private dialogo: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Atualizacoes');
  }

  create(): void {
    this.ocupado = false;
    this.dialogo = null;
    ajustarCamera(this);
    desenharFundo(this);
    this.add.rectangle(TELA_L / 2, TELA_A / 2, TELA_L, TELA_A, 0x000000, 0.55);
    this.add.text(TELA_L / 2, 24, T('ATUALIZAÇÕES'), estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffd23a', stroke: '#8a2b00', strokeThickness: 5 })).setOrigin(0.5);
    const v = infoVersao();
    const linhaVersao = this.add.text(TELA_L / 2, 50, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ffffff' })).setOrigin(0.5);
    const escreverVersao = (apk: string) => linhaVersao.setText(`${T('VERSÃO')} ${v.jogo} · BUILD ${v.build}${apk ? ` · ${T('APP')} ${apk}` : ''}`);
    escreverVersao(v.apk);
    if (noApp()) versaoDoAppInstalado().then((a) => { if (this.sys.isActive()) escreverVersao(a); }).catch(() => undefined);

    // novidades (só em português, como as UPDATES do jogo antigo)
    this.add.rectangle(TELA_L / 2, 166, 740, 196, 0x0a0f1f, 0.85).setStrokeStyle(2, 0xffd23a, 0.8);
    const linhas: string[] = [];
    for (const n of NOVIDADES) {
      linhas.push(`VERSÃO ${n.versao}${n === NOVIDADES[0] ? ' (ATUAL)' : ''} — ${n.titulo}`);
      for (const i of n.itens) linhas.push(`  • ${i}`);
      linhas.push('');
    }
    const texto = this.add.text(42, 76, linhas.join('\n'), estiloTexto({ fontFamily: 'Arial', fontSize: '12px', color: '#dfe7ff', wordWrap: { width: 716 }, lineSpacing: 2 }));
    const mascara = this.make.graphics({}).fillRect(32, 70, 736, 192);
    texto.setMask(mascara.createGeometryMask());
    const rolar = (dy: number) => texto.setY(Phaser.Math.Clamp(texto.y - dy, Math.min(76, 76 - (texto.height - 184)), 76));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => rolar(dy * 0.5));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown && p.y > 70 && p.y < 262) rolar(p.prevPosition.y - p.y); });

    const status = this.add.text(TELA_L / 2, 282, '', estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#7dffb0' })).setOrigin(0.5);
    const avisar = (t: string, cor = '#7dffb0') => status.setColor(cor).setText(t);

    const temBotao = noApp() || androidNoNavegador();
    const xs = temBotao ? [-250, 0, 250] : [-130, 130];
    let i = 0;
    if (noApp()) criarBotao(this, TELA_L / 2 + xs[i++], 318, T('⟳ ATUALIZAR'), () => this.procurar(avisar), 220);
    else if (androidNoNavegador()) criarBotao(this, TELA_L / 2 + xs[i++], 318, T('BAIXAR APP'), () => abrirApk(), 220);
    else avisar(T('NO SITE O JOGO JÁ ABRE SEMPRE NA VERSÃO MAIS NOVA'), '#dfe7ff');
    criarBotao(this, TELA_L / 2 + xs[i++], 318, T('JOGO ANTIGO'), () => abrirJogoAntigo(), 220);
    criarBotao(this, TELA_L / 2 + xs[i], 318, T('VOLTAR'), () => this.voltar(), 220);
    aoApertar(this, (c) => {
      if (c !== 'Escape') return;
      if (this.dialogo) this.fecharDialogo();
      else this.voltar();
    });
  }

  private voltar(): void {
    if (!this.ocupado) this.scene.start('Menu');
  }

  private async procurar(avisar: (t: string, cor?: string) => void): Promise<void> {
    if (this.ocupado || this.dialogo) return;
    this.ocupado = true;
    avisar(T('VERIFICANDO...'), '#ffffff');
    const d = await procurarAtualizacao();
    this.ocupado = false;
    if (!this.sys.isActive()) return;
    if (d.tipo === 'nada') return void avisar(T('JÁ ESTÁ ATUALIZADO'));
    if (d.tipo === 'offline') return void avisar(T('SEM CONEXÃO'), '#ffb03a');
    if (d.tipo === 'erro') return void avisar(T('ERRO AO ATUALIZAR'), '#ff6a6a');
    avisar('');
    if (d.tipo === 'apk') {
      this.perguntar(T('NOVA VERSÃO'), T('Esta versão do jogo precisa do app novo. Baixar o APK agora? Depois é só instalar por cima: o progresso continua salvo.'), T('BAIXAR'), () => abrirApk(d.url));
      return;
    }
    this.perguntar(T('ATUALIZAR AGORA?'), `${T('Saiu a versão')} ${d.versao}. ${T('O jogo baixa a versão nova e reinicia; o progresso continua salvo.')}`, T('ATUALIZAR'), async () => {
      this.ocupado = true;
      avisar(T('BAIXANDO...'), '#ffffff');
      const ok = await baixarEAtualizar(d);
      // deu certo: o plugin já está reiniciando o jogo na versão nova
      this.ocupado = false;
      if (this.sys.isActive()) avisar(ok ? T('ATUALIZANDO...') : T('ERRO AO ATUALIZAR'), ok ? '#7dffb0' : '#ff6a6a');
    });
  }

  /** Caixa de confirmação (SIM / AGORA NÃO) desenhada no próprio jogo. */
  private perguntar(titulo: string, mensagem: string, sim: string, aoAceitar: () => void): void {
    this.fecharDialogo();
    const fundo = this.add.rectangle(TELA_L / 2, TELA_A / 2, TELA_L, TELA_A, 0x000000, 0.6).setInteractive();
    const caixa = this.add.rectangle(TELA_L / 2, TELA_A / 2, 520, 200, 0x1d2a4d, 1).setStrokeStyle(3, 0xffd23a, 1);
    const t = this.add.text(TELA_L / 2, TELA_A / 2 - 70, titulo, estiloTexto({ fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffd23a' })).setOrigin(0.5);
    const m = this.add.text(TELA_L / 2, TELA_A / 2 - 12, mensagem, estiloTexto({ fontFamily: 'Arial', fontSize: '14px', color: '#ffffff', align: 'center', wordWrap: { width: 470 } })).setOrigin(0.5);
    this.dialogo = this.add.container(0, 0, [fundo, caixa, t, m]).setDepth(50);
    const a = criarBotao(this, TELA_L / 2 - 120, TELA_A / 2 + 62, sim, () => { this.fecharDialogo(); aoAceitar(); }, 200);
    const b = criarBotao(this, TELA_L / 2 + 120, TELA_A / 2 + 62, T('AGORA NÃO'), () => this.fecharDialogo(), 200);
    a.container.setDepth(51);
    b.container.setDepth(51);
    this.dialogo.setData('botoes', [a.container, b.container]);
  }

  private fecharDialogo(): void {
    if (!this.dialogo) return;
    for (const c of (this.dialogo.getData('botoes') as Phaser.GameObjects.Container[]) ?? []) c.destroy();
    this.dialogo.destroy();
    this.dialogo = null;
  }
}
