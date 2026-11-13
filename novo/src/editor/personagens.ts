// EDITOR DE PERSONAGENS do jogo novo (não usa o jogo antigo). Mesmas partes do editor antigo:
//  - lista: os personagens criados (no novo e, só lendo, no antigo), NOVO, IMPORTAR ARQUIVO (.saiyan.json),
//    e em cada um EDITAR / DUPLICAR / EXPORTAR / EXCLUIR;
//  - DADOS: nome, alinhamento, aura, ataque especial, animação do tiro e do especial, cor do tiro, altura;
//  - ANIMAÇÕES: para cada forma e movimento, abrir a sprite sheet (arquivo, link ou imagens soltas), grade de
//    quadros (largura, altura, espaço, total), apagar o fundo (branco, cor escolhida ou nada; tolerância; cor do
//    canto), escolher os quadros na grade, e na fila do movimento: reordenar, clonar, espelhar, apagar, limpar,
//    copiar de outro movimento (normal ou espelhado), fps e a prévia animada;
//  - TRANSFORMAÇÕES: adicionar, renomear, aura, altura, subir/descer, remover, copiar os quadros da anterior.
// Salva no IndexedDB do novo (ui/armazemCriados.ts). Um personagem do antigo editado aqui vira uma cópia no novo.
import { conquistas } from '../logica/conquistas';
import { T, TF } from '../logica/idioma';
import { MOVIMENTOS, type Movimento } from '../logica/animacao';
import {
  ALINHAMENTOS, AURAS_EDITOR, EFEITOS_ESPECIAL, EFEITOS_TIRO, FPS_PADRAO, NOMES_MOVIMENTOS, QUADROS_MAX, TRANSFORMACOES_MAX, ALTURA_MAX, ALTURA_MIN,
  adicionarTransformacao, apagarQuadro, clonarPersonagem, clonarQuadro, clonarQuadros, corDoCanto, deArquivo, gradeDaFolha, juntarQuadros, moverQuadro,
  moverTransformacao, nomeDoArquivo, novoPersonagem, paraArquivo, problemasDoPersonagem, removerFundo, removerTransformacao, totalDeQuadros,
  type Celula, type ModoFundo, type PersonagemEditavel,
} from '../logica/editorPersonagem';
import { avisar, confirmar } from '../ui/janela';
import { personagensParaEditar, type PersonagemDoEditor } from '../ui/criados';
import { excluirPersonagemDoNovo, salvarPersonagemNoNovo } from '../ui/armazemCriados';
import { baixar, btn, camadaDoEditor, campo, carregarImagem, deslizar, el, entradaCor, entradaNumero, entradaTexto, escolha, escolherArquivo, lerComoTexto, lerComoUrl } from './dom';

type Aba = 'dados' | 'animacoes' | 'transformacoes';
const MOV_OPCOES = MOVIMENTOS.map((m) => [m, NOMES_MOVIMENTOS[m]] as [Movimento, string]);

/** espelha uma imagem (data URL) na horizontal */
async function espelhar(url: string): Promise<string> {
  const img = await carregarImagem(url);
  if (!img) return url;
  const c = el('canvas', { width: img.naturalWidth, height: img.naturalHeight });
  const g = c.getContext('2d')!;
  g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0);
  return c.toDataURL('image/png');
}

export class EditorDePersonagens {
  private raiz: HTMLDivElement;
  private corpo!: HTMLDivElement;
  private topo!: HTMLDivElement;
  private lista: PersonagemDoEditor[] = [];
  private p: PersonagemEditavel | null = null;
  private mudou = false;
  private aba: Aba = 'dados';
  private forma = 0;
  private mov: Movimento = 'idle';
  private selQuadro = -1;
  // sprite sheet aberta
  private folha: HTMLImageElement | null = null;
  private grade = { fw: 32, fh: 32, espaco: 0, total: 0, zoom: 2 };
  private fundo: { modo: ModoFundo; cor: string; tol: number } = { modo: 'auto', cor: '#ffffff', tol: 10 };
  private escolhidas: number[] = [];
  private relogioPrevia = 0;

  constructor(private aoFechar: () => void) {
    this.raiz = camadaDoEditor('sf-editor-personagens');
    void this.mostrarLista();
  }

  fechar(): void {
    window.clearInterval(this.relogioPrevia);
    this.raiz.remove();
    this.aoFechar();
  }

  private moldura(titulo: string, botoes: HTMLElement[]): void {
    window.clearInterval(this.relogioPrevia);
    this.raiz.replaceChildren();
    this.topo = el('div', { cls: 'sfe-topo' }, [el('h2', { textContent: titulo }), ...botoes]);
    this.corpo = el('div', { cls: 'sfe-corpo' });
    this.raiz.append(this.topo, this.corpo);
  }

  // ---------------- lista ----------------
  private async mostrarLista(): Promise<void> {
    this.p = null;
    this.moldura(T('EDITOR DE PERSONAGENS'), [
      el('span', { cls: 'sfe-esp' }),
      btn('+ NOVO PERSONAGEM', () => this.editar(novoPersonagem(), true)),
      btn('IMPORTAR ARQUIVO', () => this.importar()),
      btn('VOLTAR', () => this.fechar()),
    ]);
    this.corpo.append(el('div', { cls: 'sfe-dica', textContent: T('CARREGANDO') + '...' }));
    this.lista = await personagensParaEditar();
    this.corpo.replaceChildren();
    if (!this.lista.length) {
      this.corpo.append(el('p', { cls: 'sfe-dica', textContent: T('NENHUM PERSONAGEM CRIADO AINDA. TOQUE EM + NOVO PERSONAGEM PARA COMEÇAR.') }));
      return;
    }
    this.corpo.append(el('p', { cls: 'sfe-dica', textContent: T('OS PERSONAGENS DO JOGO ANTIGO APARECEM AQUI SÓ PARA LER: AO SALVAR, UMA CÓPIA FICA NO JOGO NOVO.') }));
    const grade = el('div', { cls: 'sfe-grade' });
    for (const item of this.lista) {
      const p = item.p, foto = p.formas[0].quadros.idle?.[0];
      const prob = problemasDoPersonagem(p);
      const c = el('div', { cls: 'sfe-cartao' }, [
        el('div', { cls: 'sfe-q', estilo: 'width:64px;height:72px' }, [foto ? el('img', { src: foto }) : el('span', { textContent: '?' })]),
        el('b', { textContent: p.nome }),
        el('span', { cls: 'sfe-dica', textContent: `${T(p.alinhamento)} · ${TF('{0} FORMA(S)', p.formas.length)}` }),
        item.origem === 'antigo' ? el('span', { cls: 'sfe-selo', textContent: T('DO JOGO ANTIGO') }) : null,
        prob.length ? el('span', { cls: 'sfe-dica', estilo: 'color:#fca5a5', textContent: T('INCOMPLETO') }) : null,
        el('div', { cls: 'sfe-linha' }, [
          btn('EDITAR', () => this.editar(clonarPersonagem(p), false)),
          btn('DUPLICAR', () => this.duplicar(p)),
        ]),
        el('div', { cls: 'sfe-linha' }, [
          btn('EXPORTAR', () => baixar(JSON.stringify(paraArquivo(p)), nomeDoArquivo(p.nome))),
          btn('EXCLUIR', () => this.excluir(item), 'sfe-perigo'),
        ]),
      ]);
      c.addEventListener('click', () => this.editar(clonarPersonagem(p), false));
      grade.append(c);
    }
    this.corpo.append(grade);
  }

  private duplicar(p: PersonagemEditavel): void {
    const n = clonarPersonagem(p);
    const base = novoPersonagem();
    n.id = base.id; n.origem = 'novo'; n.chaveAntiga = ''; n.salvo = 0; n.nome = (p.nome + ' 2').slice(0, 20);
    void salvarPersonagemNoNovo(n).then((ok) => (ok ? this.mostrarLista() : avisar('EDITOR', 'NÃO DEU PARA SALVAR (MEMÓRIA DO NAVEGADOR CHEIA?).')));
  }

  private excluir(item: PersonagemDoEditor): void {
    confirmar('EXCLUIR', item.origem === 'antigo' ? 'ESCONDER ESTE PERSONAGEM DO JOGO NOVO? (NO JOGO ANTIGO ELE CONTINUA)' : 'EXCLUIR ESTE PERSONAGEM?', () => {
      void excluirPersonagemDoNovo(item.p).then(() => this.mostrarLista());
    });
  }

  private importar(): void {
    escolherArquivo('application/json,.json', false, async ([f]) => {
      if (!f) return;
      let dados: unknown;
      try { dados = JSON.parse(await lerComoTexto(f)); } catch { avisar('ARQUIVO', 'ESTE ARQUIVO NÃO É DE PERSONAGEM DO SAIYAN FIGHT.'); return; }
      const r = deArquivo(dados);
      if ('erro' in r) { avisar('ARQUIVO', r.erro); return; }
      this.editar(r.p, true);
    });
  }

  // ---------------- edição ----------------
  private editar(p: PersonagemEditavel, novo: boolean): void {
    this.p = p;
    this.mudou = novo;
    this.forma = 0;
    this.mov = 'idle';
    this.selQuadro = -1;
    this.aba = 'dados';
    this.desenharEdicao();
  }

  private marcarMudou(): void { this.mudou = true; }

  private desenharEdicao(): void {
    const p = this.p!;
    const abas = el('div', { cls: 'sfe-abas' }, ([['dados', 'DADOS'], ['animacoes', 'ANIMAÇÕES DOS MOVIMENTOS'], ['transformacoes', 'TRANSFORMAÇÃO']] as [Aba, string][]).map(([a, t]) => {
      const b = btn(t, () => { this.aba = a; this.desenharEdicao(); });
      if (a === this.aba) b.classList.add('sfe-ativo');
      return b;
    }));
    this.moldura(p.nome || T('PERSONAGEM'), [abas, el('span', { cls: 'sfe-esp' }), btn('SALVAR', () => void this.salvar()), btn('EXPORTAR', () => baixar(JSON.stringify(paraArquivo(p)), nomeDoArquivo(p.nome))), btn('VOLTAR', () => this.sairDaEdicao())]);
    if (this.aba === 'dados') this.abaDados();
    else if (this.aba === 'animacoes') this.abaAnimacoes();
    else this.abaTransformacoes();
  }

  private sairDaEdicao(): void {
    if (!this.mudou) { void this.mostrarLista(); return; }
    confirmar('SAIR SEM SALVAR?', 'AS MUDANÇAS DESTE PERSONAGEM VÃO SE PERDER.', () => void this.mostrarLista());
  }

  private async salvar(): Promise<void> {
    const p = this.p!;
    const prob = problemasDoPersonagem(p);
    if (prob.length) { avisar('FALTA ALGO', prob.map((x) => T(x)).join('\n')); return; }
    const primeiraVez = !p.salvo && !p.chaveAntiga;
    p.salvo = p.salvo || Date.now();
    const ok = await salvarPersonagemNoNovo(p);
    if (!ok) { p.salvo = primeiraVez ? 0 : p.salvo; avisar('EDITOR', 'NÃO DEU PARA SALVAR (MEMÓRIA DO NAVEGADOR CHEIA?).'); return; }
    if (primeiraVez) { // conquistas do construtor (Fábrica de Guerreiros / Elenco Próprio), como no editor antigo
      const c = conquistas();
      c.somar('customCharactersCreated', 1);
      c.destravar('builder_first');
      c.checarLimiares();
    }
    p.origem = p.chaveAntiga ? 'antigo' : 'novo';
    this.mudou = false;
    avisar('SALVO!', TF('{0} JÁ PODE SER ESCOLHIDO NAS LUTAS.', p.nome));
  }

  /** prévia animada do movimento (canvas) */
  private previa(tam: number, forma: () => number, mov: () => Movimento): HTMLCanvasElement {
    const c = el('canvas', { cls: 'sfe-previa', width: tam, height: Math.round(tam * 1.15) });
    const g = c.getContext('2d')!;
    const imgs = new Map<string, HTMLImageElement>();
    let i = 0, ultimo = 0;
    const passo = () => {
      if (!c.isConnected) return;
      const f = this.p!.formas[forma()], l = f?.quadros[mov()] ?? [];
      const fps = f?.fps[mov()] ?? FPS_PADRAO, agora = performance.now();
      if (agora - ultimo >= 1000 / fps) { i++; ultimo = agora; }
      g.clearRect(0, 0, c.width, c.height);
      if (!l.length) { g.fillStyle = '#9fb3d8'; g.font = 'bold 11px Arial'; g.textAlign = 'center'; g.fillText(T('SEM QUADROS'), c.width / 2, c.height / 2); return; }
      const u = l[i % l.length];
      let img = imgs.get(u);
      if (!img) { img = new Image(); img.src = u; imgs.set(u, img); }
      if (!img.complete || !img.naturalWidth) return;
      g.imageSmoothingEnabled = false;
      // como na luta: a imagem esticada na caixa do lutador (48x56), com os pés embaixo
      const w = c.width * 0.62, h = w * 56 / 48;
      g.drawImage(img, (c.width - w) / 2, c.height - h - 4, w, h);
    };
    window.clearInterval(this.relogioPrevia);
    this.relogioPrevia = window.setInterval(passo, 1000 / 30);
    return c;
  }

  private abaDados(): void {
    const p = this.p!, base = p.formas[0];
    const m = () => this.marcarMudou();
    const nome = entradaTexto(p.nome, 20, (v) => { p.nome = v.toUpperCase(); m(); this.topo.querySelector('h2')!.textContent = p.nome; });
    this.corpo.append(el('div', { cls: 'sfe-duas' }, [
      el('div', {}, [
        el('div', { cls: 'sfe-linha' }, [
          campo('NOME DO PERSONAGEM', nome),
          campo('ALINHAMENTO', escolha(ALINHAMENTOS.map((a) => [a, a] as [typeof a, string]), p.alinhamento, (v) => { p.alinhamento = v; m(); })),
          campo('COR DA AURA', escolha(AURAS_EDITOR, base.aura, (v) => { base.aura = v; m(); })),
        ]),
        el('div', { cls: 'sfe-linha' }, [
          campo('ATAQUE ESPECIAL', entradaTexto(p.especial, 28, (v) => { p.especial = v.toUpperCase(); m(); })),
          campo('COR DO PROJÉTIL', entradaCor(p.corKi, (v) => { p.corKi = v; m(); })),
          campo('ALTURA (CM)', entradaNumero(base.altura, ALTURA_MIN, ALTURA_MAX, 1, (v) => { base.altura = v; m(); })),
        ]),
        el('div', { cls: 'sfe-linha' }, [
          campo('ANIMAÇÃO DO TIRO', escolha(EFEITOS_TIRO, p.efeitoTiro, (v) => { p.efeitoTiro = v; m(); })),
          campo('ANIMAÇÃO DO ESPECIAL', escolha(EFEITOS_ESPECIAL, p.efeitoEspecial, (v) => { p.efeitoEspecial = v; m(); })),
        ]),
        el('p', { cls: 'sfe-dica', textContent: T('OS DESENHOS DE CADA MOVIMENTO FICAM NA ABA ANIMAÇÕES; AS FORMAS, NA ABA TRANSFORMAÇÃO.') }),
        el('p', { cls: 'sfe-dica', textContent: TF('QUADROS NO TOTAL: {0}', totalDeQuadros(p)) }),
      ]),
      el('div', { estilo: 'flex:0 0 auto' }, [this.previa(120, () => 0, () => 'idle')]),
    ]));
  }

  // ---------------- ANIMAÇÕES ----------------
  private abaAnimacoes(): void {
    const p = this.p!;
    if (this.forma >= p.formas.length) this.forma = 0;
    const f = p.formas[this.forma];
    const lista = () => f.quadros[this.mov] ?? [];
    const definir = (l: string[]) => { if (l.length) f.quadros[this.mov] = l; else delete f.quadros[this.mov]; this.marcarMudou(); };
    const formaSel = escolha(p.formas.map((x, i) => [String(i), `${i === 0 ? '' : i + '. '}${x.nome}`] as [string, string]), String(this.forma), (v) => { this.forma = Number(v); this.selQuadro = -1; this.desenharEdicao(); }, false);
    const movSel = escolha(MOV_OPCOES, this.mov, (v) => { this.mov = v; this.selQuadro = -1; this.desenharEdicao(); });
    const fps = entradaNumero(f.fps[this.mov] ?? FPS_PADRAO, 1, 60, 1, (v) => { f.fps[this.mov] = v; this.marcarMudou(); });
    const fila = el('div', { cls: 'sfe-quadros' });
    const redesenharFila = () => {
      fila.replaceChildren();
      lista().forEach((u, i) => {
        const q = el('div', { cls: 'sfe-q' + (i === this.selQuadro ? ' sfe-sel' : '') }, [el('img', { src: u }), el('span', { textContent: String(i + 1) })]);
        q.addEventListener('click', () => { this.selQuadro = this.selQuadro === i ? -1 : i; redesenharFila(); });
        fila.append(q);
      });
      if (!lista().length) fila.append(el('span', { cls: 'sfe-dica', estilo: 'align-self:center', textContent: T('NENHUM QUADRO NESTE MOVIMENTO: ESCOLHA NA SPRITE SHEET ABAIXO.') }));
      contagem.textContent = TF('{0} / {1} QUADROS', lista().length, QUADROS_MAX);
    };
    const contagem = el('span', { cls: 'sfe-dica' });
    const sel = (f2: (l: string[], i: number) => string[] | Promise<string[]>) => async () => {
      if (this.selQuadro < 0 || this.selQuadro >= lista().length) { avisar('QUADROS', 'TOQUE NUM QUADRO DA FILA PRIMEIRO.'); return; }
      definir(await f2(lista(), this.selQuadro));
      redesenharFila();
    };
    const copiarDe = escolha<Movimento | ''>([['', 'COPIAR DE...'], ...MOV_OPCOES.filter(([m2]) => m2 !== this.mov)], '', () => {});
    this.corpo.append(
      el('div', { cls: 'sfe-linha' }, [campo('FORMA', formaSel), campo('MOVIMENTO', movSel), campo('FPS', fps), contagem]),
      el('div', { cls: 'sfe-duas' }, [
        el('div', {}, [
          fila,
          el('div', { cls: 'sfe-linha' }, [
            btn('◀', sel((l, i) => { this.selQuadro = Math.max(0, i - 1); return moverQuadro(l, i, i - 1); })),
            btn('▶', sel((l, i) => { this.selQuadro = Math.min(l.length - 1, i + 1); return moverQuadro(l, i, i + 1); })),
            btn('CLONAR', sel((l, i) => clonarQuadro(l, i))),
            btn('ESPELHAR', sel(async (l, i) => { const r = [...l]; r[i] = await espelhar(l[i]); return r; })),
            btn('APAGAR', sel((l, i) => { this.selQuadro = -1; return apagarQuadro(l, i); }), 'sfe-perigo'),
            btn('LIMPAR TUDO', () => confirmar('LIMPAR', 'APAGAR TODOS OS QUADROS DESTE MOVIMENTO?', () => { definir([]); this.selQuadro = -1; redesenharFila(); }), 'sfe-perigo'),
          ]),
          el('div', { cls: 'sfe-linha' }, [
            copiarDe,
            btn('COPIAR', () => { const de = copiarDe.value as Movimento; if (!de) return; definir(juntarQuadros([], f.quadros[de] ?? [])); redesenharFila(); }),
            btn('COPIAR ESPELHADO', async () => { const de = copiarDe.value as Movimento; if (!de) return; definir(await Promise.all((f.quadros[de] ?? []).map(espelhar))); redesenharFila(); }),
            this.forma > 0 ? btn('COPIAR TUDO DA FORMA ANTERIOR', () => { f.quadros = clonarQuadros(p.formas[this.forma - 1].quadros); f.fps = { ...p.formas[this.forma - 1].fps }; this.marcarMudou(); this.desenharEdicao(); }) : null,
          ]),
        ]),
        el('div', { estilo: 'flex:0 0 auto' }, [this.previa(110, () => this.forma, () => this.mov)]),
      ]),
      this.caixaDaFolha((novos) => { definir(juntarQuadros(lista(), novos)); redesenharFila(); }),
    );
    redesenharFila();
  }

  /** SPRITE SHEET: abrir, grade, fundo, escolher quadros */
  private caixaDaFolha(aoAdicionar: (urls: string[]) => void): HTMLElement {
    const cv = el('canvas');
    const status = el('span', { cls: 'sfe-dica' });
    const caixa = el('div', { cls: 'sfe-caixa' });
    const celulas = (): Celula[] => (this.folha ? gradeDaFolha(this.folha.naturalWidth, this.folha.naturalHeight, this.grade.fw, this.grade.fh, this.grade.total, this.grade.espaco) : []);
    const desenhar = () => {
      const img = this.folha;
      if (!img) { cv.width = 1; cv.height = 1; status.textContent = T('NENHUMA SPRITE SHEET CARREGADA.'); return; }
      const z = this.grade.zoom;
      cv.width = img.naturalWidth * z; cv.height = img.naturalHeight * z;
      const g = cv.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      g.drawImage(img, 0, 0, cv.width, cv.height);
      g.lineWidth = 1;
      g.font = `bold ${Math.max(9, Math.min(14, this.grade.fh * z / 4))}px Arial`;
      for (const c of celulas()) {
        const k = this.escolhidas.indexOf(c.i);
        g.strokeStyle = k >= 0 ? '#ffd23f' : 'rgba(80,200,255,.75)';
        g.lineWidth = k >= 0 ? 3 : 1;
        g.strokeRect(c.x * z + 0.5, c.y * z + 0.5, c.w * z - 1, c.h * z - 1);
        if (k >= 0) { g.fillStyle = 'rgba(255,210,63,.25)'; g.fillRect(c.x * z, c.y * z, c.w * z, c.h * z); g.fillStyle = '#ffd23f'; g.fillText(String(k + 1), c.x * z + 3, c.y * z + 13); }
      }
      status.textContent = TF('{0} QUADROS NA GRADE · {1} ESCOLHIDOS', celulas().length, this.escolhidas.length);
    };
    cv.addEventListener('click', (e) => {
      if (!this.folha) return;
      const r = cv.getBoundingClientRect(), z = this.grade.zoom;
      const x = (e.clientX - r.left) * (cv.width / r.width) / z, y = (e.clientY - r.top) * (cv.height / r.height) / z;
      const c = celulas().find((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h);
      if (!c) return;
      const k = this.escolhidas.indexOf(c.i);
      if (k >= 0) this.escolhidas.splice(k, 1); else this.escolhidas.push(c.i);
      desenhar();
    });
    const abrirUrl = async (url: string) => {
      const img = await carregarImagem(url);
      if (!img) { avisar('SPRITE SHEET', 'NÃO DEU PARA ABRIR ESTA IMAGEM.'); return; }
      this.folha = img;
      this.escolhidas = [];
      if (this.grade.fw > img.naturalWidth || this.grade.fh > img.naturalHeight) { this.grade.fw = img.naturalWidth; this.grade.fh = img.naturalHeight; }
      this.grade.zoom = Math.max(1, Math.min(4, Math.floor(560 / Math.max(1, img.naturalWidth)) || 1));
      this.desenharEdicao();
    };
    const link = el('input', { type: 'text', placeholder: T('COLE AQUI O LINK DA IMAGEM'), estilo: 'flex:1;min-width:140px' });
    const recortar = async (lista: Celula[], img: HTMLImageElement = this.folha!): Promise<string[]> => {
      const r: string[] = [];
      for (const c of lista) {
        const cnv = el('canvas', { width: c.w, height: c.h });
        const g = cnv.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(img, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
        try {
          const d = g.getImageData(0, 0, c.w, c.h);
          removerFundo(d.data, this.fundo.modo, this.fundo.cor, this.fundo.tol);
          g.putImageData(d, 0, 0);
          r.push(cnv.toDataURL('image/png'));
        } catch { avisar('SPRITE SHEET', 'ESTA IMAGEM DE OUTRO SITE NÃO DEIXA RECORTAR. BAIXE ELA E ABRA COMO ARQUIVO.'); return []; }
      }
      return r;
    };
    const gr = this.grade, fu = this.fundo;
    caixa.append(
      el('h4', { textContent: T('SPRITE SHEET') }),
      el('div', { cls: 'sfe-linha' }, [
        btn('ABRIR IMAGEM', () => escolherArquivo('image/*', false, async ([f]) => { if (f) await abrirUrl(await lerComoUrl(f)); })),
        link, btn('ABRIR LINK', () => { if (link.value.trim()) void abrirUrl(link.value.trim()); }),
        btn('IMAGENS SOLTAS (1 POR QUADRO)', () => escolherArquivo('image/*', true, async (l) => {
          const urls: string[] = [];
          for (const f of l) {
            const img = await carregarImagem(await lerComoUrl(f));
            if (!img) continue;
            // a imagem inteira é o quadro (com o fundo apagado)
            urls.push(...(await recortar([{ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight, i: 0 }], img)));
          }
          if (urls.length) aoAdicionar(urls);
        })),
      ]),
      el('div', { cls: 'sfe-linha' }, [
        campo('LARGURA QUADRO (PX)', entradaNumero(gr.fw, 1, 4096, 1, (v) => { gr.fw = v; this.escolhidas = []; desenhar(); })),
        campo('ALTURA QUADRO (PX)', entradaNumero(gr.fh, 1, 4096, 1, (v) => { gr.fh = v; this.escolhidas = []; desenhar(); })),
        campo('ESPAÇO ENTRE QUADROS', entradaNumero(gr.espaco, 0, 256, 1, (v) => { gr.espaco = v; this.escolhidas = []; desenhar(); })),
        campo('TOTAL DE QUADROS (0 = TODOS)', entradaNumero(gr.total, 0, 999, 1, (v) => { gr.total = v; this.escolhidas = []; desenhar(); })),
        campo('ZOOM', deslizar(gr.zoom, 1, 6, 1, (v) => { gr.zoom = v; desenhar(); })),
      ]),
      el('div', { cls: 'sfe-linha' }, [
        campo('FUNDO DA IMAGEM', escolha<ModoFundo>([['auto', 'APAGAR BRANCO (AUTOMÁTICO)'], ['color', 'APAGAR A COR ESCOLHIDA'], ['none', 'NÃO APAGAR NADA']], fu.modo, (v) => { fu.modo = v; })),
        campo('COR DO FUNDO A APAGAR', entradaCor(fu.cor, (v) => { fu.cor = v; })),
        campo('TOLERÂNCIA DA COR (%)', entradaNumero(fu.tol, 0, 100, 1, (v) => { fu.tol = v; })),
        btn('PEGAR A COR DO CANTO', () => {
          if (!this.folha) return;
          const c = el('canvas', { width: 1, height: 1 }), g = c.getContext('2d')!;
          g.drawImage(this.folha, 0, 0, 1, 1, 0, 0, 1, 1);
          try { fu.cor = corDoCanto(g.getImageData(0, 0, 1, 1).data); fu.modo = 'color'; this.desenharEdicao(); } catch { /* imagem de outro site */ }
        }),
      ]),
      el('div', { cls: 'sfe-linha' }, [
        status,
        btn('TODOS', () => { this.escolhidas = celulas().map((c) => c.i); desenhar(); }),
        btn('NENHUM', () => { this.escolhidas = []; desenhar(); }),
        btn('ADICIONAR AO MOVIMENTO', async () => {
          if (!this.escolhidas.length) { avisar('SPRITE SHEET', 'TOQUE NOS QUADROS DA GRADE (NA ORDEM DA ANIMAÇÃO).'); return; }
          const cs = celulas();
          const urls = await recortar(this.escolhidas.map((i) => cs.find((c) => c.i === i)!).filter(Boolean));
          if (urls.length) { aoAdicionar(urls); this.escolhidas = []; desenhar(); }
        }),
      ]),
      el('div', { cls: 'sfe-folha' }, [cv]),
      el('p', { cls: 'sfe-dica', textContent: T('TOQUE NOS QUADROS DA GRADE NA ORDEM DA ANIMAÇÃO E DEPOIS EM ADICIONAR AO MOVIMENTO.') }),
    );
    desenhar();
    return caixa;
  }

  // ---------------- TRANSFORMAÇÕES ----------------
  private abaTransformacoes(): void {
    const p = this.p!;
    const m = () => this.marcarMudou();
    const caixa = el('div', {});
    p.formas.forEach((f, i) => {
      const n = Object.values(f.quadros).reduce((k, l) => k + (l?.length ?? 0), 0);
      caixa.append(el('div', { cls: 'sfe-caixa sfe-linha' }, [
        el('div', { cls: 'sfe-q' }, [f.quadros.idle?.[0] ? el('img', { src: f.quadros.idle[0] }) : el('span', { textContent: i === 0 ? '—' : '↑' })]),
        el('b', { textContent: i === 0 ? T('NORMAL') : `${i}.`, estilo: 'min-width:40px' }),
        i === 0 ? el('span', { textContent: f.nome }) : campo('NOME', entradaTexto(f.nome, 32, (v) => { f.nome = v; m(); })),
        campo('COR DA AURA', escolha(AURAS_EDITOR, f.aura, (v) => { f.aura = v; m(); })),
        campo('ALTURA (CM)', entradaNumero(f.altura, ALTURA_MIN, ALTURA_MAX, 1, (v) => { f.altura = v; m(); })),
        el('span', { cls: 'sfe-dica', textContent: n ? TF('{0} QUADROS', n) : T('SEM QUADROS (USA OS DA FORMA ANTERIOR)') }),
        btn('EDITAR QUADROS', () => { this.forma = i; this.aba = 'animacoes'; this.desenharEdicao(); }),
        i > 0 ? btn('COPIAR DA ANTERIOR', () => { f.quadros = clonarQuadros(p.formas[i - 1].quadros); f.fps = { ...p.formas[i - 1].fps }; m(); this.desenharEdicao(); }) : null,
        i > 1 ? btn('↑', () => { moverTransformacao(p, i, -1); m(); this.desenharEdicao(); }) : null,
        i > 0 && i < p.formas.length - 1 ? btn('↓', () => { moverTransformacao(p, i, 1); m(); this.desenharEdicao(); }) : null,
        i > 0 ? btn('✕', () => confirmar('REMOVER', TF('REMOVER A TRANSFORMAÇÃO {0}?', f.nome), () => { removerTransformacao(p, i); m(); this.desenharEdicao(); }), 'sfe-perigo') : null,
      ]));
    });
    const add = btn('+ ADICIONAR TRANSFORMAÇÃO', () => { if (adicionarTransformacao(p)) { m(); this.desenharEdicao(); } });
    add.disabled = p.formas.length > TRANSFORMACOES_MAX;
    this.corpo.append(
      el('p', { cls: 'sfe-dica', textContent: T('NA LUTA, COM O KI CHEIO, O LUTADOR SOBE PARA A PRÓXIMA FORMA DA LISTA.') }),
      caixa, add,
    );
  }
}
