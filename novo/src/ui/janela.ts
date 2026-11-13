// Janelas do sistema (showSystemAlert / showSystemConfirm / showSystemPrompt do antigo): HTML por cima do jogo,
// com o mesmo visual (fundo azul-escuro, borda laranja). Funcionam com toque, mouse, teclado e controle.
import { T } from '../logica/idioma';
import { padsConectados, intencaoDe } from '../entrada/controles';

let aberta: HTMLElement | null = null;
export const janelaAberta = () => !!aberta;

const CSS = `
.sf-janela-fundo{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:50;font-family:'Segoe UI',Arial,sans-serif}
.sf-janela{background:#061433;border:2px solid #e85d04;border-radius:10px;box-shadow:0 0 24px rgba(232,93,4,.45);padding:18px 22px;max-width:min(92vw,460px);color:#e2e8f0;text-align:center}
.sf-janela h3{margin:0 0 8px;color:#ffd23f;font-size:18px;letter-spacing:.5px}
.sf-janela p{margin:0 0 14px;font-size:14px;white-space:pre-line}
.sf-janela input{width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid #e85d04;background:#0b1f45;color:#fff;font-size:15px;margin-bottom:12px}
.sf-janela button{margin:0 6px;padding:8px 16px;border-radius:4px;border:1.5px solid #e85d04;background:linear-gradient(#123765,#071d3a);color:#fff0a6;font-weight:bold;font-size:13px;cursor:pointer}
.sf-janela button.sf-foco,.sf-janela button:hover{background:linear-gradient(#ffb703,#e85d04);color:#1a0b00}
`;

function garantirCss() {
  if (document.getElementById('sf-janela-css')) return;
  const s = document.createElement('style');
  s.id = 'sf-janela-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

interface Botao { texto: string; acao?: () => void }

function abrir(titulo: string, msg: string, botoes: Botao[], campo?: { valor: string; max: number; aoConfirmar: (v: string) => void }): void {
  fechar();
  garantirCss();
  const fundo = document.createElement('div');
  fundo.className = 'sf-janela-fundo';
  const caixa = document.createElement('div');
  caixa.className = 'sf-janela';
  const h = document.createElement('h3'); h.textContent = T(titulo);
  const p = document.createElement('p'); p.textContent = T(msg);
  caixa.append(h, p);
  let input: HTMLInputElement | null = null;
  if (campo) {
    input = document.createElement('input');
    input.maxLength = campo.max;
    input.value = campo.valor;
    caixa.appendChild(input);
  }
  const els: HTMLButtonElement[] = [];
  for (const b of botoes) {
    const el = document.createElement('button');
    el.textContent = T(b.texto);
    el.onclick = (ev) => { ev.stopPropagation(); fechar(); if (campo && b === botoes[0]) campo.aoConfirmar(input!.value); else b.acao?.(); };
    els.push(el);
    caixa.appendChild(el);
  }
  fundo.appendChild(caixa);
  fundo.addEventListener('pointerdown', (e) => e.stopPropagation());
  document.body.appendChild(fundo);
  aberta = fundo;
  let foco = 0;
  const marcar = () => els.forEach((e, i) => e.classList.toggle('sf-foco', i === foco));
  marcar();
  const tecla = (e: KeyboardEvent) => {
    if (!aberta) return;
    if (e.code === 'Escape') { e.preventDefault(); fechar(); botoes[botoes.length - 1].acao?.(); }
    else if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); els[foco].click(); }
    else if (!input && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) { foco = (foco + (e.code === 'ArrowRight' ? 1 : els.length - 1)) % els.length; marcar(); }
    e.stopPropagation();
  };
  window.addEventListener('keydown', tecla, true);
  // controle: ←/→ muda o botão, CRUZ aperta, BOLA fecha
  let antes = { esq: true, dir: true, ok: true, volta: true };
  const vigia = window.setInterval(() => {
    if (!aberta) return;
    const it = intencaoDe(padsConectados()[0]);
    const agora = { esq: it.esquerda, dir: it.direita, ok: it.confirmar, volta: it.voltar };
    if (agora.esq && !antes.esq) { foco = (foco + els.length - 1) % els.length; marcar(); }
    if (agora.dir && !antes.dir) { foco = (foco + 1) % els.length; marcar(); }
    if (agora.ok && !antes.ok) els[foco].click();
    if (agora.volta && !antes.volta) { fechar(); botoes[botoes.length - 1].acao?.(); }
    antes = agora;
  }, 50);
  (fundo as HTMLElement & { limpar?: () => void }).limpar = () => { window.removeEventListener('keydown', tecla, true); window.clearInterval(vigia); };
  if (input) setTimeout(() => { input!.focus(); input!.select(); }, 30);
}

export function fechar(): void {
  if (!aberta) return;
  (aberta as HTMLElement & { limpar?: () => void }).limpar?.();
  aberta.remove();
  aberta = null;
}

export function avisar(titulo: string, msg: string, aoFechar?: () => void): void {
  abrir(titulo, msg, [{ texto: 'OK', acao: aoFechar }]);
}
export function confirmar(titulo: string, msg: string, aoSim: () => void, aoNao?: () => void): void {
  abrir(titulo, msg, [{ texto: 'SIM', acao: aoSim }, { texto: 'CANCELAR', acao: aoNao }]);
}
export function pedirTexto(titulo: string, msg: string, valor: string, max: number, aoConfirmar: (v: string) => void): void {
  abrir(titulo, msg, [{ texto: 'SALVAR' }, { texto: 'CANCELAR' }], { valor, max, aoConfirmar });
}
/** janela sem botão de confirmar (ex.: "aperte uma tecla"); devolve a função que fecha */
export function mensagem(titulo: string, msg: string, aoCancelar?: () => void): () => void {
  abrir(titulo, msg, [{ texto: 'CANCELAR', acao: aoCancelar }]);
  return fechar;
}
