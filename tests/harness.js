// tests/harness.js — carrega os .js do jogo num contexto Node `vm` com um DOM/canvas mínimo simulado,
// para testar toques, controle, menus e estado do jogo SEM abrir um navegador. Mais barato/rápido que um
// browser real para verificar lógica e input; use o navegador quando o que importa é o visual em si
// (ver "Run and validation" no AGENTS.md).
//
// Uso: node tests/harness.js [pasta_do_jogo] [largura_da_janela]
//   node tests/harness.js .          -> roda contra a pasta atual, 800px de largura
//   node tests/harness.js . 375      -> simula uma tela de celular
//
// Este arquivo só fornece a INFRAESTRUTURA (contexto vm, DOM/canvas falsos, helpers de toque/checagem).
// Os cenários de teste em si (o que checar) vivem em scripts separados que fazem `require("./harness.js")`
// ou copiam o padrão abaixo — não acumule dezenas de asserções de uma feature específica aqui dentro.

const vm = require("vm"), fs = require("fs"), path = require("path");

function createHarness(dir, width = 800, height = 360) {
    dir = path.resolve(dir);

    const calls = [];
    const ctx2d = new Proxy({}, {
        get(t, k) {
            if (k in t) return t[k];
            if (k === "createLinearGradient" || k === "createRadialGradient") return () => ({ addColorStop() {} });
            if (k === "measureText") return () => ({ width: 10 });
            return (...a) => { calls.push([k, a]); };
        },
        set(t, k, v) { if (k === "fillStyle") calls.push(["set:fillStyle", [v]]); t[k] = v; return true; }
    });

    function makeEl(id) {
        const el = {
            id, style: {}, value: "", innerText: "", innerHTML: "", width: 800, height: 350, listeners: {},
            classList: (() => { const set = new Set(); return { add: c => set.add(c), remove: c => set.delete(c), contains: c => set.has(c), toggle(c, f) { (f === undefined ? !set.has(c) : f) ? set.add(c) : set.delete(c); } }; })(),
            dataset: {},
            addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
            getContext: () => ctx2d,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: el.width, height: el.height }),
            setPointerCapture() {}, hasPointerCapture: () => false, releasePointerCapture() {},
            querySelector: () => null, focus() {}, click() {}, children: [], appendChild(child) { this.children.push(child); },
            append(...kids) { this.children.push(...kids); }, attributes: {}, setAttribute(k, v) { this.attributes[k] = String(v); },
            options: [], add(opt) { this.options.push(opt); },   // <select>: new Option(...) + add()
            get parentElement() { return id === "game" ? document.getElementById("game-container") : { clientWidth: 800 }; },
            get clientWidth() { return context.innerWidth; }
        };
        return el;
    }

    const els = {};
    const winL = {}, docL = {};
    const MQ = { "(pointer: coarse)": true };
    const document = {
        getElementById: (id) => (els[id] = els[id] || makeEl(id)),
        querySelectorAll: () => [],
        addEventListener(t, f) { (docL[t] = docL[t] || []).push(f); },
        hidden: false,
        createElement: () => { const e = makeEl("x"); e.getContext = () => ctx2d; return e; },
        activeElement: null
    };

    const store = {};
    const context = {
        Option: function (text, value) { this.textContent = text; this.value = value; },
        console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, setInterval, clearInterval,
        document, innerWidth: width, innerHeight: height, addEventListener(t, f) { (winL[t] = winL[t] || []).push(f); },
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
        navigator: { maxTouchPoints: 5 }, matchMedia: (q) => ({ matches: Boolean(MQ[q]) }), userAgent: "", screen: {},
        performance: { now: () => Date.now() }, requestAnimationFrame() {},
        ResizeObserver: class { observe() {} },
        HTMLCanvasElement: class {},
        Event: class { constructor(type, init) { this.type = type; Object.assign(this, init || {}); } },
        Image: class {
            // onload dispara na hora (síncrono) para não depender do event loop do Node — mais simples de testar.
            set src(v) { this._s = v; this.complete = true; this.naturalWidth = 32; this.naturalHeight = 32; if (this.onload) this.onload(); }
            get src() { return this._s; }
        }
    };
    context.window = context;
    vm.createContext(context);

    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
    for (const s of scripts) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), context, { filename: s });

    const run = (code) => vm.runInContext(code, context);
    const canvas = els["game"];

    const touch = (id, x, y) => ({ identifier: id, clientX: x, clientY: y });
    const fire = (type, active, changed) => canvas.listeners[type].forEach(f =>
        f({ preventDefault() {}, touches: active, changedTouches: changed }));

    let fails = 0;
    const check = (name, ok, extra = "") => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${extra}`); };
    const step = (n = 1) => { for (let i = 0; i < n; i++) run("update(1/60)"); };
    // falha marca o processo como erro (o GitHub Actions fica vermelho mesmo que o teste não chame process.exit)
    const summary = () => { console.log(fails === 0 ? "\nTUDO OK" : `\n${fails} FALHA(S)`); if (fails) process.exitCode = 1; return fails; };

    return { context, document, docL, els, store, run, canvas, touch, fire, check, step, summary, calls, MQ, scripts };
}

module.exports = { createHarness };

// Executado diretamente (`node tests/harness.js`): só valida que o jogo carrega e o loop roda sem erro.
// Cenários específicos devem importar `createHarness` e escrever seus próprios `check(...)`.
if (require.main === module) {
    const h = createHarness(process.argv[2] || ".", Number(process.argv[3] || 800));
    h.run("startGame()");
    h.check("o jogo inicia sem lançar exceção", h.run("gameState") === "playing");
    h.step(5);
    h.check("o loop de update roda alguns quadros sem lançar exceção", true);
    process.exit(h.summary());
}
