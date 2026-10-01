// tests/atualizacao.test.js — o jogo se atualiza sozinho quando sai versão nova: compara a "impressão digital"
// (ETag) de cada arquivo guardado no navegador com a do servidor; se mudou, baixa de novo e recarrega — mas
// nunca no meio da luta nem com uma janela aberta, e não fica recarregando em sequência.
//
// Uso: node tests/atualizacao.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary, context } = h;

// servidor de mentira: tags guardadas (cache) x tags no servidor
context.__tags = { cache: {}, server: {} };
context.__recarregou = 0;
context.__baixou = [];
run(`
    location = { href: "https://exemplo/jogo/", protocol: "https:", reload() { __recarregou++; } };
    URL = class { constructor(p, base) { this.href = base + p; } };
    document.querySelectorAll = (sel) => sel === "script[src]" ? [{ src: "https://exemplo/jogo/menu.js" }] : [];
    sessionStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; } };
    fetch = async (url, opts) => {
        if (opts.cache === "reload") __baixou.push(url);
        const lado = opts.cache === "force-cache" ? "cache" : "server";
        const tag = __tags[lado][url] || "v1";
        return { ok: true, headers: { get: (n) => n === "etag" ? tag : null } };
    };
`);
const esperar = () => new Promise(r => setImmediate(r));

(async () => {
    let achou = await run("checkForGameUpdate(true)");
    check("sem nada novo no servidor: não atualiza", achou === false && run("__recarregou") === 0);

    context.__tags.server["https://exemplo/jogo/menu.js"] = "v2";
    run("gameMode = 'singleplayer'; startGame()");
    achou = await run("checkForGameUpdate(true)");
    check("arquivo mudou no servidor: percebe a versão nova", achou === true);
    check("e baixa os arquivos novos antes de recarregar", run("__baixou.length") === 3, JSON.stringify(run("__baixou")));
    check("no meio da luta NÃO recarrega", run("__recarregou") === 0);

    run("setGameState('menu'); openModal(null); reloadWhenSafe()");
    check("com o editor aberto (alterações não salvas) NÃO recarrega", run("__recarregou") === 0);

    run("closeModal(); reloadWhenSafe()");
    check("de volta ao menu, sem janela aberta: recarrega sozinho", run("__recarregou") === 1);

    run("updatePending = true; reloadWhenSafe()");
    check("não recarrega de novo em sequência (trava de 1 minuto)", run("__recarregou") === 1 && run("updatePending") === false);

    await esperar();
    process.exit(summary());
})();
