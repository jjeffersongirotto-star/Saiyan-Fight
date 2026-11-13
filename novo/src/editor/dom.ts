// Peças de tela (HTML) dos EDITORES do jogo novo: o mesmo visual das janelas do jogo (azul-escuro, borda laranja,
// botões dourados), feitas para caber deitado no celular (800x350) e no computador. Os textos passam por T().
import { T } from '../logica/idioma';

const CSS = `
.sfe{position:fixed;inset:0;z-index:40;background:#050d24;color:#e2e8f0;font:12px 'Segoe UI',Arial,sans-serif;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.sfe *{box-sizing:border-box}
.sfe-topo{display:flex;align-items:center;gap:6px;padding:4px 8px;background:linear-gradient(#0b2350,#061433);border-bottom:2px solid #e85d04;flex-wrap:wrap}
.sfe-topo h2{margin:0 8px 0 0;font:900 14px 'Arial Black',Arial;color:#ffd23f;letter-spacing:.5px;white-space:nowrap}
.sfe-esp{flex:1}
.sfe-corpo{flex:1;overflow:auto;padding:6px 8px;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y}
.sfe-b{padding:5px 10px;border-radius:4px;border:1.5px solid #e85d04;background:linear-gradient(#123765,#071d3a);color:#fff0a6;font-weight:bold;font-size:11px;cursor:pointer;white-space:nowrap}
.sfe-b:hover,.sfe-b.sfe-ativo{background:linear-gradient(#ffb703,#e85d04);color:#1a0b00}
.sfe-b:disabled{opacity:.45;cursor:default}
.sfe-b.sfe-perigo{border-color:#ef4444;color:#fecaca}
.sfe-abas{display:flex;gap:4px;flex-wrap:wrap}
.sfe-linha{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:3px 0}
.sfe-campo{display:flex;flex-direction:column;gap:2px;min-width:90px}
.sfe-campo label{font-size:10px;color:#9fb3d8;font-weight:bold;text-transform:uppercase}
.sfe input,.sfe select{background:#0b1f45;color:#fff;border:1px solid #2b4a85;border-radius:4px;padding:4px 5px;font-size:12px;max-width:100%}
.sfe input[type=color]{padding:0;width:44px;height:26px}
.sfe input[type=number]{width:70px}
.sfe input[type=range]{padding:0}
.sfe-caixa{background:#0a1a3d;border:1px solid #1f3a70;border-radius:8px;padding:6px;margin:4px 0}
.sfe-caixa h4{margin:0 0 4px;font-size:11px;color:#ffd23f;letter-spacing:.4px}
.sfe-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px}
.sfe-cartao{background:#0a1a3d;border:1.5px solid #1f3a70;border-radius:8px;padding:5px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer}
.sfe-cartao:hover{border-color:#ffd23f}
.sfe-cartao b{font-size:11px;text-align:center}
.sfe-selo{font-size:9px;color:#1a0b00;background:#fbbf24;border-radius:6px;padding:1px 5px}
.sfe-dica{font-size:10px;color:#9fb3d8}
.sfe-quadros{display:flex;gap:4px;overflow-x:auto;padding:3px;min-height:64px;background:#061433;border-radius:6px}
.sfe-q{flex:0 0 auto;width:52px;height:60px;border:1.5px solid #2b4a85;border-radius:4px;background:repeating-conic-gradient(#1b2b52 0 25%,#13213f 0 50%) 0 0/10px 10px;display:flex;align-items:flex-end;justify-content:center;position:relative;cursor:pointer}
.sfe-q img{max-width:100%;max-height:100%;image-rendering:pixelated}
.sfe-q.sfe-sel{border-color:#ffd23f;box-shadow:0 0 0 2px #e85d04}
.sfe-q span{position:absolute;top:0;left:2px;font-size:9px;color:#fff;text-shadow:0 0 2px #000}
.sfe-folha{position:relative;overflow:auto;max-height:46vh;background:repeating-conic-gradient(#1b2b52 0 25%,#13213f 0 50%) 0 0/16px 16px;border-radius:6px;touch-action:pan-x pan-y}
.sfe-folha canvas{display:block;image-rendering:pixelated}
.sfe-duas{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}
.sfe-duas>*{flex:1 1 300px;min-width:0}
.sfe canvas.sfe-previa{background:#0b1f45;border-radius:6px;image-rendering:pixelated}
.sfe-lista-pecas{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:4px;max-height:30vh;overflow:auto}
.sfe-peca{padding:4px;border:1px solid #2b4a85;border-radius:4px;background:#0b1f45;color:#e2e8f0;font-size:10px;cursor:pointer;text-align:center}
.sfe-peca.sfe-ativo{border-color:#ffd23f;background:#3a2a05;color:#ffe08a}
`;
export function garantirCss(): void {
  if (document.getElementById('sfe-css')) return;
  const s = document.createElement('style');
  s.id = 'sfe-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

type Filhos = (Node | string | null | undefined | false)[];
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string; estilo?: string } = {}, filhos: Filhos = []): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  const { cls, estilo, ...resto } = props as Record<string, unknown>;
  if (cls) e.className = cls as string;
  if (estilo) e.style.cssText = estilo as string;
  Object.assign(e, resto);
  for (const f of filhos) if (f) e.append(f);
  return e;
}
/** botão (o texto é traduzido) */
export function btn(texto: string, f: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', { cls: 'sfe-b ' + cls, textContent: T(texto), type: 'button' });
  b.addEventListener('click', (e) => { e.stopPropagation(); f(); });
  return b;
}
export function campo(rotulo: string, entrada: HTMLElement): HTMLDivElement {
  return el('div', { cls: 'sfe-campo' }, [el('label', { textContent: T(rotulo) }), entrada]);
}
export function entradaTexto(valor: string, max: number, f: (v: string) => void): HTMLInputElement {
  const i = el('input', { type: 'text', value: valor, maxLength: max });
  i.addEventListener('input', () => f(i.value));
  return i;
}
export function entradaNumero(valor: number, min: number, max: number, passo: number, f: (v: number) => void): HTMLInputElement {
  const i = el('input', { type: 'number', value: String(valor), min: String(min), max: String(max), step: String(passo) });
  i.addEventListener('change', () => { const n = Number(i.value); if (Number.isFinite(n)) { const v = Math.max(min, Math.min(max, n)); i.value = String(v); f(v); } });
  return i;
}
export function entradaCor(valor: string, f: (v: string) => void, aoSoltar?: (v: string) => void): HTMLInputElement {
  const i = el('input', { type: 'color', value: valor });
  i.addEventListener('input', () => f(i.value));
  if (aoSoltar) i.addEventListener('change', () => aoSoltar(i.value));
  return i;
}
export function escolha<V extends string>(opcoes: [V, string][], valor: V, f: (v: V) => void, traduzir = true): HTMLSelectElement {
  const s = el('select');
  for (const [v, t] of opcoes) s.append(el('option', { value: v, textContent: traduzir ? T(t) : t, selected: v === valor }));
  s.addEventListener('change', () => f(s.value as V));
  return s;
}
export function deslizar(valor: number, min: number, max: number, passo: number, f: (v: number) => void, aoSoltar?: () => void): HTMLInputElement {
  const i = el('input', { type: 'range', value: String(valor), min: String(min), max: String(max), step: String(passo) });
  i.addEventListener('input', () => f(Number(i.value)));
  if (aoSoltar) i.addEventListener('change', aoSoltar);
  return i;
}
/** escolher arquivo(s) do aparelho */
export function escolherArquivo(aceita: string, varios: boolean, f: (l: File[]) => void): void {
  const i = el('input', { type: 'file', accept: aceita, multiple: varios, estilo: 'display:none' });
  i.addEventListener('change', () => { f([...(i.files ?? [])]); i.remove(); });
  (document.fullscreenElement ?? document.body).appendChild(i);
  i.click();
}
export const lerComoTexto = (f: File) => new Promise<string>((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => erro(r.error); r.readAsText(f); });
export const lerComoUrl = (f: File) => new Promise<string>((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => erro(r.error); r.readAsDataURL(f); });
export function carregarImagem(url: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; });
}
/** baixa um arquivo de texto (exportar) */
export function baixar(texto: string, nome: string): void {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const a = el('a', { href: url, download: nome, estilo: 'display:none' });
  (document.fullscreenElement ?? document.body).appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}
/** a camada do editor (dentro da tela cheia, se estiver) */
export function camadaDoEditor(id: string): HTMLDivElement {
  garantirCss();
  document.getElementById(id)?.remove();
  const c = el('div', { cls: 'sfe', id });
  c.addEventListener('pointerdown', (e) => e.stopPropagation());
  c.addEventListener('keydown', (e) => e.stopPropagation());
  (document.fullscreenElement ?? document.body).appendChild(c);
  return c;
}
