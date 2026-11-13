// EDITOR DE ARENAS do jogo novo (não usa o jogo antigo). As peças, planícies, chãos, céus, horas, climas, a
// validação, o arquivo .arena.json e o desenho (3D e a planta vista de cima) são os do arenas.js, gerados em
// cenarios-legado.js — então a arena fica igual à do antigo. Partes do editor:
//  - lista: as arenas (do novo e, só lendo, do antigo), NOVA ARENA, IMPORTAR ARQUIVO; EDITAR / EXPORTAR / EXCLUIR;
//  - visualização grande girando (ou andando, no SEGUIR), ângulo, ver a peça de perto, USAR COMO CAPA;
//  - DADOS DA ARENA: nome, cor, música, minion, câmera, movimento, céu (topo e horizonte), chão (tipo e cor), hora, clima;
//  - abas de peças (CONSTRUÇÃO, NAVE, NATUREZA, CHÃO, PINCEL, PLANÍCIES, CÉU, EFEITOS, ENFEITES) e NA ARENA (a lista);
//  - planta vista de cima: tocar coloca a peça escolhida (sem ocupar o lugar de outra), arrastar move, zoom;
//    PINCEL: arrastar pinta o chão; CÉU: a faixa do céu de 360°;
//  - peça escolhida: cor, tamanho, giro, formato e altura (pisos), texto (placas), material/largura (pincel),
//    GIRAR 45°, DUPLICAR, APAGAR, ESCONDER, TRAVAR; ↶ DESFAZER / ↷ REFAZER; GRADE; TESTAR (luta nesta arena).
import { T, TF } from '../logica/idioma';
import { TEMAS } from '../dados/temas';
import { arenasDoJogo, excluirArena, giroNaGrade, Historico, naGrade, novoIdDeArena, plantaParaCeu, plantaParaMundo, ceuParaPlanta, mundoParaPlanta, salvarArena, type ArenaListada } from '../logica/editorArena';
import { armazenamentoPadrao } from '../logica/progresso';
import { ARENAS_MAX } from '../logica/criados';
import { carregarCenarios } from '../ui/arena';
import { avisar, confirmar } from '../ui/janela';
import type { ArenaBruta, CenariosLegado, EditorArenasLegado } from '../legado/cenarios-legado';
import { baixar, btn, camadaDoEditor, campo, deslizar, el, entradaCor, entradaTexto, escolha, escolherArquivo, lerComoTexto } from './dom';

type Peca = Record<string, unknown> & { t: string; x?: number; z?: number; r?: number; e?: number; c?: string; a?: number; h?: number; oc?: boolean; tr?: boolean };
const L = 320; // lado da planta (px do canvas)
const MARGEM = 18;

export class EditorDeArenas {
  private raiz: HTMLDivElement;
  private corpo!: HTMLDivElement;
  private ed!: EditorArenasLegado;
  private leg!: CenariosLegado;
  private cvPrevia!: HTMLCanvasElement;
  private arena: ArenaBruta | null = null;
  private hist: Historico | null = null;
  private mudou = false;
  private aba = 'construcao';
  private tipo: string | null = null;
  private pincel: string | null = null;
  private sel = -1;
  private grade = false;
  private zoom = 1;
  private centro = { x: 0, z: 0 };
  private girar = true;
  private ang = 0;
  private andado = 0;
  private vista: 'arena' | 'peca' = 'arena';
  private raf = 0;
  private gesto: { tipo: 'mover' | 'pincel' | 'ceu'; i: number; antes: Peca; moveu: boolean } | null = null;
  private vermelho = -1;
  private painelSel!: HTMLDivElement;
  private planta!: HTMLCanvasElement;
  private dica!: HTMLSpanElement;

  constructor(private aoFechar: (testar?: string) => void) {
    this.raiz = camadaDoEditor('sf-editor-arenas');
    this.raiz.append(el('p', { cls: 'sfe-dica', estilo: 'padding:12px', textContent: T('CARREGANDO') + '...' }));
    void carregarCenarios().then((m) => {
      this.cvPrevia = el('canvas', { cls: 'sfe-previa', estilo: 'width:100%;max-width:520px;aspect-ratio:800/350' });
      this.leg = m.criarCenariosLegado(this.cvPrevia);
      this.leg.escala(1);
      this.ed = this.leg.editor;
      this.mostrarLista();
    });
  }

  fechar(testar?: string): void {
    cancelAnimationFrame(this.raf);
    this.raiz.remove();
    this.aoFechar(testar);
  }

  private moldura(titulo: string, botoes: HTMLElement[]): void {
    cancelAnimationFrame(this.raf);
    this.raiz.replaceChildren();
    const topo = el('div', { cls: 'sfe-topo' }, [el('h2', { textContent: titulo }), ...botoes]);
    this.corpo = el('div', { cls: 'sfe-corpo' });
    this.raiz.append(topo, this.corpo);
  }

  // ---------------- lista ----------------
  private mostrarLista(): void {
    this.arena = null;
    const lista = arenasDoJogo(armazenamentoPadrao());
    const nova = btn('+ NOVA ARENA', () => this.editar(this.ed.padrao(), true));
    nova.disabled = lista.length >= ARENAS_MAX;
    this.moldura(T('EDITOR DE ARENAS'), [el('span', { cls: 'sfe-esp' }), nova, btn('IMPORTAR ARQUIVO', () => this.importar()), btn('VOLTAR', () => this.fechar())]);
    this.corpo.append(el('p', { cls: 'sfe-dica', textContent: TF('ARENAS CRIADAS: {0} / {1}. AS DO JOGO ANTIGO APARECEM AQUI SÓ PARA LER: AO SALVAR, UMA CÓPIA FICA NO JOGO NOVO.', lista.length, ARENAS_MAX) }));
    if (!lista.length) this.corpo.append(el('p', { cls: 'sfe-dica', textContent: T('NENHUMA ARENA CRIADA AINDA. TOQUE EM + NOVA ARENA PARA COMEÇAR.') }));
    const grade = el('div', { cls: 'sfe-grade' });
    for (const item of lista) grade.append(this.cartao(item));
    this.corpo.append(grade);
  }

  private cartao(item: ArenaListada): HTMLElement {
    const a = this.ed.normalizar(item.arena);
    a.id = item.arena.id as string;
    const foto = el('canvas', { width: 800, height: 350, estilo: 'width:110px;height:48px;border-radius:4px' });
    try { this.leg.editor.previa(a, (a.capa as { ang?: number } | null)?.ang ?? 0, { chave: '_cartao_' + a.id }); foto.getContext('2d')!.drawImage(this.cvPrevia, 0, 0, 800, 350); } catch { /* sem foto */ }
    const c = el('div', { cls: 'sfe-cartao' }, [
      foto, el('b', { textContent: a.nome, estilo: `color:${a.cor}` }),
      el('span', { cls: 'sfe-dica', textContent: TF('{0} PEÇAS', a.pecas.length) }),
      item.origem === 'antigo' ? el('span', { cls: 'sfe-selo', textContent: T('DO JOGO ANTIGO') }) : null,
      el('div', { cls: 'sfe-linha' }, [btn('EDITAR', () => this.editar(a, false)), btn('EXPORTAR', () => baixar(JSON.stringify(this.ed.paraArquivo(a)), this.nomeArquivo(a.nome)))]),
      btn('EXCLUIR', () => confirmar('EXCLUIR', item.origem === 'antigo' ? 'ESCONDER ESTA ARENA DO JOGO NOVO? (NO JOGO ANTIGO ELA CONTINUA)' : 'EXCLUIR ESTA ARENA?', () => { excluirArena(armazenamentoPadrao(), a.id); this.mostrarLista(); }), 'sfe-perigo'),
    ]);
    c.addEventListener('click', () => this.editar(a, false));
    return c;
  }

  private nomeArquivo(nome: string): string {
    return (nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'arena') + '.arena.json';
  }

  private importar(): void {
    escolherArquivo('application/json,.json', false, async ([f]) => {
      if (!f) return;
      let dados: unknown;
      try { dados = JSON.parse(await lerComoTexto(f)); } catch { avisar('ARQUIVO', 'ESTE ARQUIVO NÃO É DE ARENA DO SAIYAN FIGHT.'); return; }
      const r = this.ed.validarArquivo(dados);
      if ('erro' in r) { avisar('ARQUIVO', r.erro); return; }
      if (arenasDoJogo(armazenamentoPadrao()).length >= ARENAS_MAX) { avisar('ARQUIVO', TF('JÁ TEM {0} ARENAS: EXCLUA UMA ANTES.', ARENAS_MAX)); return; }
      this.editar(r.arena, true);
    });
  }

  // ---------------- edição ----------------
  private editar(a: ArenaBruta, nova: boolean): void {
    this.arena = this.ed.normalizar(a);
    this.arena.id = (a.id as string) || '';
    this.hist = new Historico(this.arena);
    this.mudou = nova;
    this.sel = -1; this.tipo = null; this.pincel = null; this.zoom = 1; this.centro = { x: 0, z: 0 }; this.vista = 'arena'; this.aba = 'construcao';
    this.ang = (this.arena.capa as { ang?: number } | null)?.ang ?? 0;
    this.desenharEdicao();
  }

  private get pecas(): Peca[] { return this.arena!.pecas as Peca[]; }
  private passo(): void { this.hist!.registrar(this.arena); this.mudou = true; this.atualizarBotoes(); }
  private botoes: { desfazer?: HTMLButtonElement; refazer?: HTMLButtonElement; grade?: HTMLButtonElement } = {};
  private atualizarBotoes(): void {
    if (this.botoes.desfazer) this.botoes.desfazer.disabled = !this.hist?.podeDesfazer;
    if (this.botoes.refazer) this.botoes.refazer.disabled = !this.hist?.podeRefazer;
    this.botoes.grade?.classList.toggle('sfe-ativo', this.grade);
  }
  private aviso(t: string): void { if (this.dica) this.dica.textContent = T(t); }

  private desenharEdicao(): void {
    const a = this.arena!;
    const bd = btn('↶ DESFAZER', () => this.voltarNoTempo(-1)), br = btn('↷ REFAZER', () => this.voltarNoTempo(1));
    const bg = btn('GRADE', () => { this.grade = !this.grade; this.atualizarBotoes(); });
    this.botoes = { desfazer: bd, refazer: br, grade: bg };
    this.moldura(a.nome, [bd, br, bg, el('span', { cls: 'sfe-esp' }),
      btn('SALVAR', () => this.salvar()), btn('TESTAR', () => this.testar()), btn('EXPORTAR', () => baixar(JSON.stringify(this.ed.paraArquivo(a)), this.nomeArquivo(a.nome))), btn('VOLTAR', () => this.sair())]);
    this.atualizarBotoes();
    this.dica = el('span', { cls: 'sfe-dica' });
    const esquerda = el('div', {}, [this.cvPrevia, this.barraDaPrevia(), this.dica, this.caixaDados()]);
    const direita = el('div', {}, [this.abas(), this.paleta(), el('div', { cls: 'sfe-duas' }, [this.criarPlanta(), (this.painelSel = el('div', { cls: 'sfe-caixa' }))])]);
    this.corpo.append(el('div', { cls: 'sfe-duas' }, [esquerda, direita]));
    this.atualizarPainelSel();
    this.desenharPlanta();
    let antes = performance.now();
    const quadro = (agora: number) => {
      if (!this.cvPrevia.isConnected) return;
      const dt = Math.min(0.1, (agora - antes) / 1000); antes = agora;
      if (this.girar) { if (a.movimento === 'seguir') this.andado += dt * 70; else this.ang = (this.ang + dt * 0.35) % (Math.PI * 2); }
      this.desenharPrevia();
      this.raf = requestAnimationFrame(quadro);
    };
    this.raf = requestAnimationFrame(quadro);
  }

  private desenharPrevia(): void {
    const a = this.arena!, p = this.pecas[this.sel];
    try {
      if (this.vista === 'peca' && p && !this.ed.PECAS[p.t]?.ceu) this.ed.previa(a, this.ang, { chave: '_vista_foco', cam: this.ed.cameraPerto(p), desl: { x: p.x ?? 0, z: p.z ?? 0 }, esconder: true });
      else if (a.movimento === 'seguir') this.ed.previa(a, 0, { chave: '_vista', andado: this.andado, esconder: true });
      else this.ed.previa(a, this.ang, { chave: '_vista', esconder: true });
    } catch { /* peça com dado estranho: não trava o editor */ }
  }

  private barraDaPrevia(): HTMLElement {
    const ang = deslizar(Math.round(this.ang / (Math.PI * 2) * 360), 0, 359, 1, (v) => { this.girar = false; girar.textContent = T('▶ GIRAR'); this.ang = v / 360 * Math.PI * 2; });
    const girar = btn(this.girar ? '❚❚ PARAR' : '▶ GIRAR', () => { this.girar = !this.girar; girar.textContent = T(this.girar ? '❚❚ PARAR' : '▶ GIRAR'); });
    const perto = btn(this.vista === 'peca' ? 'VER A ARENA' : 'VER A PEÇA DE PERTO', () => { this.vista = this.vista === 'peca' ? 'arena' : 'peca'; perto.textContent = T(this.vista === 'peca' ? 'VER A ARENA' : 'VER A PEÇA DE PERTO'); });
    return el('div', { cls: 'sfe-linha' }, [girar, campo('ÂNGULO', ang), perto,
      btn('USAR COMO CAPA', () => { this.arena!.capa = { ang: Math.round((((this.ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * 1000) / 1000, andado: Math.round(this.andado) }; this.passo(); this.aviso('CAPA ESCOLHIDA: O CARTÃO DA ARENA MOSTRA ESTA VISTA (SALVE A ARENA).'); })]);
  }

  private caixaDados(): HTMLElement {
    const a = this.arena! as ArenaBruta & { cor: string; musica: string; minion: string; camera: string; movimento: string; planicie: string; hora: string; clima: string; ceu: { topo: string; horizonte: string }; chao: { tipo: string; cor: string } };
    const p = () => this.passo();
    const temas = Object.entries(TEMAS).map(([id, t]) => [id, t.nome] as [string, string]);
    return el('div', { cls: 'sfe-caixa' }, [
      el('h4', { textContent: T('DADOS DA ARENA') }),
      el('div', { cls: 'sfe-linha' }, [
        campo('NOME', entradaTexto(a.nome, 24, (v) => { a.nome = v.toUpperCase() || 'MINHA ARENA'; this.mudou = true; })),
        campo('COR DA ARENA', entradaCor(a.cor, (v) => { a.cor = v; }, p)),
        campo('MÚSICA', escolha(temas, a.musica, (v) => { a.musica = v; p(); }, false)),
        campo('MINION', escolha([['saibaman', 'SAIBAMAN'], ['celljr', 'CELL JR.']], a.minion === 'celljr' ? 'celljr' : 'saibaman', (v) => { a.minion = v; p(); })),
      ]),
      el('div', { cls: 'sfe-linha' }, [
        campo('CÂMERA', escolha([['baixa', 'BAIXA'], ['media', 'MÉDIA'], ['alta', 'ALTA']], a.camera, (v) => { a.camera = v; p(); })),
        campo('MOVIMENTO DA CÂMERA', escolha([['girar', 'GIRAR EM VOLTA'], ['seguir', 'SEGUIR EM FRENTE']], a.movimento, (v) => { a.movimento = v; p(); })),
        campo('HORA DO DIA', escolha(this.ed.HORAS as [string, string][], a.hora, (v) => { a.hora = v; p(); })),
        campo('CLIMA', escolha(this.ed.CLIMAS as [string, string][], a.clima, (v) => { a.clima = v; p(); })),
      ]),
      el('div', { cls: 'sfe-linha' }, [
        campo('CÉU (TOPO)', entradaCor(a.ceu.topo, (v) => { a.ceu.topo = v; }, p)),
        campo('CÉU (HORIZONTE)', entradaCor(a.ceu.horizonte, (v) => { a.ceu.horizonte = v; }, p)),
        campo('TIPO DE CHÃO', escolha(Object.entries(this.ed.CHAOS).map(([k, c]) => [k, c.nome] as [string, string]), a.chao.tipo, (v) => { a.chao.tipo = v; a.chao.cor = this.ed.CHAOS[v].cor; p(); this.desenharEdicao(); })),
        campo('COR DO CHÃO', entradaCor(a.chao.cor, (v) => { a.chao.cor = v; this.desenharPlanta(); }, p)),
      ]),
    ]);
  }

  private abas(): HTMLElement {
    const abas = this.ed.ABAS.filter(([k]) => k !== 'conjuntos');
    return el('div', { cls: 'sfe-abas' }, abas.map(([k, t]) => {
      const b = btn(t, () => { this.aba = k; this.tipo = null; this.pincel = null; this.desenharEdicao(); });
      if (k === this.aba) b.classList.add('sfe-ativo');
      return b;
    }));
  }

  private paleta(): HTMLElement {
    const caixa = el('div', { cls: 'sfe-lista-pecas', estilo: 'margin:4px 0' });
    const item = (rotulo: string, ativo: boolean, f: () => void, cor?: string) => {
      const b = el('div', { cls: 'sfe-peca' + (ativo ? ' sfe-ativo' : '') }, [cor ? el('span', { estilo: `display:inline-block;width:9px;height:9px;border-radius:50%;background:${cor};margin-right:3px` }) : null, T(rotulo)]);
      b.addEventListener('click', f);
      caixa.append(b);
    };
    if (this.aba === 'lista') {
      if (!this.pecas.length) caixa.append(el('span', { cls: 'sfe-dica', textContent: T('NENHUMA PEÇA NA ARENA.') }));
      this.pecas.forEach((p, i) => item(`${i + 1}. ${this.ed.PECAS[p.t]?.nome ?? p.t}${p.oc ? ' 👁' : ''}${p.tr ? ' 🔒' : ''}`, i === this.sel, () => { this.sel = i; this.tipo = null; this.desenharEdicao(); }, p.c));
    } else if (this.aba === 'planicies') {
      item('NENHUMA (CHÃO LIVRE)', !this.arena!.planicie, () => { this.arena!.planicie = ''; this.passo(); this.desenharEdicao(); });
      for (const [k, pl] of Object.entries(this.ed.PLANICIES)) item(pl.nome, this.arena!.planicie === k, () => {
        const a = this.arena! as ArenaBruta & { ceu: unknown; chao: unknown };
        a.planicie = k; a.ceu = { ...pl.ceu }; a.chao = { ...pl.chao };
        this.passo(); this.desenharEdicao();
      }, pl.chao.cor);
    } else if (this.aba === 'pincel') {
      for (const [k, [nome, cor]] of Object.entries(this.ed.PINCEL)) item(nome, this.pincel === k, () => { this.pincel = this.pincel === k ? null : k; this.sel = -1; this.desenharEdicao(); }, cor);
      caixa.append(el('span', { cls: 'sfe-dica', textContent: T('ESCOLHA O MATERIAL E ARRASTE O DEDO NA PLANTA PARA PINTAR O CHÃO.') }));
    } else {
      for (const [k, d] of Object.entries(this.ed.PECAS)) if (d.aba === this.aba && !d.pincel) item(d.nome, this.tipo === k, () => { this.tipo = this.tipo === k ? null : k; this.sel = -1; this.desenharEdicao(); this.aviso(this.tipo ? (d.ceu ? 'TOQUE NA FAIXA DO CÉU PARA COLOCAR.' : 'TOQUE NUM LUGAR LIVRE DA PLANTA PARA COLOCAR.') : ''); }, d.cor);
    }
    return caixa;
  }

  // ---------------- planta ----------------
  private get modoCeu() { return this.aba === 'ceu'; }
  private escala() { return (L - MARGEM * 2) / (this.ed.RAIO * 2) * this.zoom; }

  private criarPlanta(): HTMLElement {
    const cv = el('canvas', { width: L, height: L, estilo: 'width:100%;max-width:320px;aspect-ratio:1;border-radius:6px;touch-action:none;background:#0b1f45' });
    this.planta = cv;
    const ponto = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * L / r.width, (e.clientY - r.top) * L / r.height] as const; };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); this.tocarPlanta(...ponto(e)); });
    cv.addEventListener('pointermove', (e) => { if (this.gesto) this.arrastarPlanta(...ponto(e)); });
    const soltar = () => this.soltarPlanta();
    cv.addEventListener('pointerup', soltar);
    cv.addEventListener('pointercancel', soltar);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom = Math.max(1, Math.min(4, this.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); if (this.zoom === 1) this.centro = { x: 0, z: 0 }; this.desenharPlanta(); }, { passive: false });
    const zoom = (k: number) => () => { this.zoom = k === 0 ? 1 : Math.max(1, Math.min(4, this.zoom * k)); if (this.zoom === 1) this.centro = { x: 0, z: 0 }; this.desenharPlanta(); };
    const cont = el('span', { cls: 'sfe-dica', id: 'sfe-contagem' });
    return el('div', { estilo: 'flex:0 1 320px' }, [cv, el('div', { cls: 'sfe-linha' }, [btn('+', zoom(1.25)), btn('−', zoom(0.8)), btn('1:1', zoom(0)), cont])]);
  }

  private desenharPlanta(): void {
    const g = this.planta?.getContext('2d');
    if (!g || !this.arena) return;
    const a = this.arena as ArenaBruta & { ceu: { topo: string; horizonte: string }; chao: { cor: string } };
    const s = this.escala();
    g.save();
    g.clearRect(0, 0, L, L);
    if (this.modoCeu) {
      const H = L * 0.45, gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, a.ceu.topo); gr.addColorStop(1, a.ceu.horizonte);
      g.fillStyle = gr; g.fillRect(0, 0, L, H);
      g.fillStyle = a.chao.cor; g.fillRect(0, H, L, L - H);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center';
      ['N', 'L', 'S', 'O'].forEach((t, i) => g.fillText(T(t), (i / 4) * L + 8, H + 14));
      this.pecas.forEach((p, i) => {
        if (!this.ed.PECAS[p.t]?.ceu || p.oc) return;
        const [x, y] = ceuParaPlanta(p.a ?? 0, p.h ?? 0.5, L), r = 6 + 4 * (p.e ?? 1);
        g.fillStyle = p.c ?? '#fff'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = i === this.sel ? '#ffd23f' : 'rgba(0,0,0,.6)'; g.lineWidth = i === this.sel ? 3 : 1; g.stroke();
      });
    } else {
      try { this.ed.plantaChao(g, a, s, L, this.centro); } catch { g.fillStyle = a.chao.cor; g.fillRect(0, 0, L, L); }
      // a borda da arena e o centro da luta
      const [x0, y0] = mundoParaPlanta(-this.ed.RAIO, -this.ed.RAIO, L, s, this.centro);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.strokeRect(x0, y0, this.ed.RAIO * 2 * s, this.ed.RAIO * 2 * s);
      // primeiro o chão (pisos, pinceladas), depois o que fica de pé
      const ordem = this.pecas.map((p, i) => ({ p, i })).filter(({ p }) => !this.ed.PECAS[p.t]?.ceu && !p.oc)
        .sort((u, v) => Number(!!this.ed.PECAS[v.p.t]?.chao) - Number(!!this.ed.PECAS[u.p.t]?.chao));
      for (const { p, i } of ordem) {
        const [px, py] = mundoParaPlanta(p.x ?? 0, p.z ?? 0, L, s, this.centro);
        g.save(); g.translate(px, py); g.rotate(((p.r ?? 0) * Math.PI) / 180);
        try { this.ed.plantaPeca(g, p, s, i === this.vermelho ? '#ef4444' : undefined); } catch { /* peça estranha */ }
        g.restore();
        if (i === this.sel) { g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(px, py, Math.max(6, this.ed.raio(p) * s + 3), 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
      }
      const [cx, cy] = mundoParaPlanta(0, 0, L, s, this.centro);
      g.strokeStyle = 'rgba(255,210,63,.9)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 6, cy); g.lineTo(cx + 6, cy); g.moveTo(cx, cy - 6); g.lineTo(cx, cy + 6); g.stroke();
    }
    g.restore();
    const cont = document.getElementById('sfe-contagem');
    if (cont) cont.textContent = TF('PEÇAS: {0} / {1}', this.pecas.length, this.ed.PECAS_MAX);
  }

  private pecaNoPonto(px: number, py: number): number {
    const s = this.escala();
    if (this.modoCeu) {
      for (let i = this.pecas.length - 1; i >= 0; i--) {
        const p = this.pecas[i];
        if (!this.ed.PECAS[p.t]?.ceu || p.oc) continue;
        const [x, y] = ceuParaPlanta(p.a ?? 0, p.h ?? 0.5, L);
        if (Math.hypot(px - x, py - y) <= 8 + 4 * (p.e ?? 1)) return i;
      }
      return -1;
    }
    const [x, z] = plantaParaMundo(px, py, L, s, this.centro);
    let melhor = -1, dist = Infinity;
    this.pecas.forEach((p, i) => {
      if (this.ed.PECAS[p.t]?.ceu || p.oc) return;
      const d = Math.hypot(x - (p.x ?? 0), z - (p.z ?? 0)), r = Math.max(8 / s, this.ed.raio(p));
      // as de pé ganham das do chão (o piso fica embaixo de tudo)
      const peso = d / r + (this.ed.PECAS[p.t]?.chao ? 0.5 : 0);
      if (d <= r && peso < dist) { dist = peso; melhor = i; }
    });
    return melhor;
  }

  private tocarPlanta(px: number, py: number): void {
    const s = this.escala(), R = this.ed.RAIO;
    const [wx, wz] = plantaParaMundo(px, py, L, s, this.centro);
    const x = Math.max(-R, Math.min(R, naGrade(wx, this.grade, this.ed.GRADE))), z = Math.max(-R, Math.min(R, naGrade(wz, this.grade, this.ed.GRADE)));
    if (this.pincel && !this.modoCeu) {
      if (this.pecas.length >= this.ed.PECAS_MAX) { this.aviso('LIMITE DE PEÇAS: APAGUE ALGUMA ANTES.'); return; }
      const p = this.ed.normalizarPeca({ t: 'pincel', m: this.pincel, c: this.ed.PINCEL[this.pincel][1], w: 24, pts: [[0, 0]], x, z }) as Peca;
      this.pecas.push(p);
      this.gesto = { tipo: 'pincel', i: this.pecas.length - 1, antes: p, moveu: true };
      this.desenharPlanta();
      return;
    }
    const i = this.pecaNoPonto(px, py);
    if (i >= 0 && !this.tipo) {
      this.sel = i;
      const p = this.pecas[i];
      this.gesto = p.tr ? null : { tipo: this.modoCeu ? 'ceu' : 'mover', i, antes: { ...p }, moveu: false };
      if (p.tr) this.aviso('PEÇA TRAVADA: DESTRAVE PARA MOVER.');
      this.atualizarPainelSel(); this.desenharPlanta();
      return;
    }
    if (this.tipo) { this.colocar(this.tipo, x, z, px, py); return; }
    this.sel = -1;
    this.atualizarPainelSel(); this.desenharPlanta();
  }

  private colocar(tipo: string, x: number, z: number, px: number, py: number): void {
    const def = this.ed.PECAS[tipo];
    if (!def) return;
    if (this.pecas.length >= this.ed.PECAS_MAX) { this.aviso('LIMITE DE PEÇAS: APAGUE ALGUMA ANTES.'); return; }
    if (def.ceu !== this.modoCeu) return;
    const base: Record<string, unknown> = { t: tipo, c: def.cor, e: 1, txt: def.texto };
    if (def.ceu) { const [a, h] = plantaParaCeu(px, py, L); Object.assign(base, { a, h }); } else Object.assign(base, { x, z });
    const p = this.ed.normalizarPeca(base) as Peca | null;
    if (!p) return;
    if (!def.ceu && this.ed.colide(this.pecas, p, -1)) { this.piscarVermelho(-1); this.aviso('LUGAR OCUPADO: ESCOLHA UM ESPAÇO LIVRE PARA A PEÇA.'); return; }
    this.pecas.push(p);
    this.sel = this.pecas.length - 1;
    this.passo();
    this.atualizarPainelSel(); this.desenharPlanta();
  }

  private piscarVermelho(i: number): void { this.vermelho = i; this.desenharPlanta(); setTimeout(() => { this.vermelho = -1; this.desenharPlanta(); }, 700); }

  private arrastarPlanta(px: number, py: number): void {
    const gst = this.gesto!, p = this.pecas[gst.i], s = this.escala(), R = this.ed.RAIO;
    if (!p) return;
    if (gst.tipo === 'ceu') { const [a, h] = plantaParaCeu(px, py, L); p.a = a; p.h = Math.round(h * 100) / 100; gst.moveu = true; this.desenharPlanta(); return; }
    const [wx, wz] = plantaParaMundo(px, py, L, s, this.centro);
    if (gst.tipo === 'pincel') {
      const pts = p.pts as number[][];
      if (pts.length >= this.ed.PINCEL_PONTOS) return;
      const lx = Math.round(Math.max(-R, Math.min(R, wx)) - (p.x ?? 0)), lz = Math.round(Math.max(-R, Math.min(R, wz)) - (p.z ?? 0)), u = pts[pts.length - 1];
      if (Math.hypot(lx - u[0], lz - u[1]) < 10) return;
      pts.push([lx, lz]);
      this.desenharPlanta();
      return;
    }
    p.x = Math.max(-R, Math.min(R, naGrade(wx, this.grade, this.ed.GRADE)));
    p.z = Math.max(-R, Math.min(R, naGrade(wz, this.grade, this.ed.GRADE)));
    gst.moveu = true;
    this.vermelho = this.ed.colide(this.pecas, p, gst.i) ? gst.i : -1;
    this.desenharPlanta();
  }

  private soltarPlanta(): void {
    const gst = this.gesto;
    this.gesto = null;
    if (!gst || !gst.moveu) return;
    const p = this.pecas[gst.i];
    if (gst.tipo === 'mover' && p && this.ed.colide(this.pecas, p, gst.i)) {
      p.x = gst.antes.x; p.z = gst.antes.z; // não cabe aí: volta
      this.aviso('LUGAR OCUPADO: A PEÇA VOLTOU PARA ONDE ESTAVA.');
      this.vermelho = -1;
      this.desenharPlanta();
      return;
    }
    this.vermelho = -1;
    this.passo();
    this.atualizarPainelSel(); this.desenharPlanta();
  }

  // ---------------- peça escolhida ----------------
  private atualizarPainelSel(): void {
    const c = this.painelSel;
    if (!c) return;
    c.replaceChildren();
    const p = this.pecas[this.sel];
    if (!p) { c.append(el('h4', { textContent: T('PEÇA ESCOLHIDA') }), el('p', { cls: 'sfe-dica', textContent: T('TOQUE NUMA PEÇA DA PLANTA PARA AJUSTAR, OU ESCOLHA UMA PEÇA NA LISTA PARA COLOCAR.') })); return; }
    const def = this.ed.PECAS[p.t];
    const mudar = (f: () => void, registrar = false) => { f(); const n = this.ed.normalizarPeca(p); if (n) Object.assign(p, n); this.desenharPlanta(); if (registrar) this.passo(); };
    const registrar = () => this.passo();
    c.append(el('h4', { textContent: T(def.nome) }));
    c.append(el('div', { cls: 'sfe-linha' }, [
      campo('COR', entradaCor(p.c ?? def.cor, (v) => mudar(() => { p.c = v; }), registrar)),
      campo('TAMANHO', deslizar(p.e ?? 1, 0.3, 3, 0.05, (v) => mudar(() => { p.e = v; }), registrar)),
      def.ceu ? null : campo('GIRO', deslizar(p.r ?? 0, 0, 359, 1, (v) => mudar(() => { p.r = giroNaGrade(v, this.grade); }), registrar)),
    ]));
    if (def.ceu) c.append(el('div', { cls: 'sfe-linha' }, [
      campo('DIREÇÃO NO CÉU', deslizar(p.a ?? 0, 0, 359, 1, (v) => mudar(() => { p.a = v; }), registrar)),
      campo('ALTURA NO CÉU', deslizar(p.h ?? 0.5, 0, 1, 0.01, (v) => mudar(() => { p.h = v; }), registrar)),
    ]));
    if (def.forma) c.append(el('div', { cls: 'sfe-linha' }, [
      campo('FORMATO', escolha(this.ed.FORMATOS as [string, string][], String(p.f ?? 'circulo'), (v) => mudar(() => { p.f = v; }, true))),
      campo('ALTURA (MONTE)', deslizar(Number(p.v ?? 0), 0, 3, 0.1, (v) => mudar(() => { p.v = v; }), registrar)),
    ]));
    if (def.texto !== undefined) c.append(campo('TEXTO', entradaTexto(String(p.txt ?? ''), 16, (v) => mudar(() => { p.txt = v; }))));
    if (def.pincel) c.append(el('div', { cls: 'sfe-linha' }, [
      campo('MATERIAL', escolha(Object.entries(this.ed.PINCEL).map(([k, [n]]) => [k, n] as [string, string]), String(p.m ?? 'grama'), (v) => mudar(() => { p.m = v; p.c = this.ed.PINCEL[v][1]; }, true))),
      campo('LARGURA', deslizar(Number(p.w ?? 24), 6, 80, 1, (v) => mudar(() => { p.w = v; }), registrar)),
    ]));
    c.append(el('div', { cls: 'sfe-linha' }, [
      def.ceu ? null : btn('GIRAR 45°', () => mudar(() => { p.r = ((p.r ?? 0) + 45) % 360; }, true)),
      btn('DUPLICAR', () => this.duplicar()),
      btn(p.oc ? 'MOSTRAR' : 'ESCONDER', () => { mudar(() => { p.oc = !p.oc || undefined; if (!p.oc) delete p.oc; }, true); this.atualizarPainelSel(); }),
      btn(p.tr ? 'DESTRAVAR' : 'TRAVAR', () => { mudar(() => { if (p.tr) delete p.tr; else p.tr = true; }, true); this.atualizarPainelSel(); }),
      btn('APAGAR', () => { this.pecas.splice(this.sel, 1); this.sel = -1; this.passo(); this.atualizarPainelSel(); this.desenharPlanta(); }, 'sfe-perigo'),
    ]));
  }

  private duplicar(): void {
    const p = this.pecas[this.sel];
    if (!p) return;
    if (this.pecas.length >= this.ed.PECAS_MAX) { this.aviso('LIMITE DE PEÇAS: APAGUE ALGUMA ANTES.'); return; }
    const q = JSON.parse(JSON.stringify(p)) as Peca;
    delete q.tr; delete q.oc;
    if (this.ed.PECAS[p.t].ceu) q.a = ((q.a ?? 0) + 20) % 360;
    else {
      // procura um lugar livre ao lado
      for (const d of [40, 80, 120, 160, 200]) for (const [dx, dz] of [[d, 0], [0, d], [-d, 0], [0, -d]]) {
        q.x = Math.max(-this.ed.RAIO, Math.min(this.ed.RAIO, (p.x ?? 0) + dx)); q.z = Math.max(-this.ed.RAIO, Math.min(this.ed.RAIO, (p.z ?? 0) + dz));
        if (!this.ed.colide(this.pecas, q, -1)) { this.pecas.push(q); this.sel = this.pecas.length - 1; this.passo(); this.atualizarPainelSel(); this.desenharPlanta(); return; }
      }
      this.aviso('SEM ESPAÇO LIVRE PERTO PARA A CÓPIA.');
      return;
    }
    this.pecas.push(q); this.sel = this.pecas.length - 1; this.passo(); this.atualizarPainelSel(); this.desenharPlanta();
  }

  private voltarNoTempo(d: -1 | 1): void {
    const a = d < 0 ? this.hist!.desfazer<ArenaBruta>() : this.hist!.refazer<ArenaBruta>();
    if (!a) return;
    this.arena = a;
    this.mudou = true;
    this.sel = Math.min(this.sel, this.pecas.length - 1);
    this.desenharEdicao();
  }

  // ---------------- salvar / sair / testar ----------------
  private gravar(): boolean {
    const a = this.arena!;
    if (!a.id) a.id = novoIdDeArena();
    const n = this.ed.normalizar(a);
    n.id = a.id;
    if (!salvarArena(armazenamentoPadrao(), n)) { avisar('EDITOR DE ARENAS', TF('JÁ TEM {0} ARENAS: EXCLUA UMA ANTES.', ARENAS_MAX)); return false; }
    this.mudou = false;
    return true;
  }
  private salvar(): void { if (this.gravar()) avisar('SALVO!', TF('A ARENA {0} JÁ APARECE EM ARENAS, NO MAPA E NAS LUTAS.', this.arena!.nome)); }
  private testar(): void { if (this.gravar()) this.fechar(this.arena!.id); }
  private sair(): void {
    if (!this.mudou) { this.mostrarLista(); return; }
    confirmar('SAIR SEM SALVAR?', 'AS MUDANÇAS DESTA ARENA VÃO SE PERDER.', () => this.mostrarLista());
  }
}
