// tests/tela-cheia-e-atualizar.test.js — no celular, se a tela cheia sair sem querer (gesto na borda da tela),
// o jogo volta para a tela cheia no próximo toque; e a janela UPDATES tem o botão ATUALIZAR (flecha girando)
// que baixa a versão nova e recarrega na hora.
//
// Uso: node tests/tela-cheia-e-atualizar.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary, context } = h;

// navegador de mentira: conta os pedidos de tela cheia e deixa a gente "sair" dela
context.__pedidos = 0;
run(`
    isMobileDevice = () => true;
    isInstalledApp = () => false;
    var __cont = document.getElementById("game-container");
    __cont.requestFullscreen = function () { __pedidos++; document.fullscreenElement = __cont; syncFullscreenState(); return Promise.resolve(); };
    document.exitFullscreen = function () { document.fullscreenElement = null; syncFullscreenState(); return Promise.resolve(); };
    document.fullscreenElement = null;
`);

run("toggleFullscreen()");
check("o botão liga a tela cheia", run("__pedidos") === 1 && run("isFullscreenActive()") === true);
run("document.fullscreenElement = null; syncFullscreenState();");   // gesto na borda: o navegador saiu sozinho
check("saiu sem querer: marca para voltar no próximo toque", run("voltarTelaCheiaNoToque") === true);
run("voltarParaTelaCheia()");
check("no próximo toque volta para a tela cheia", run("__pedidos") === 2 && run("isFullscreenActive()") === true);

run("toggleFullscreen()");
check("o mesmo toque que trouxe a tela cheia de volta não a desliga (se foi no botão)", run("isFullscreenActive()") === true);
run("telaCheiaVoltouEm = -1e9; toggleFullscreen()");   // depois, o jogador sai pelo botão do jogo
check("sair pelo botão do jogo sai de verdade", run("isFullscreenActive()") === false);
run("voltarParaTelaCheia()");
check("e o próximo toque NÃO volta para a tela cheia", run("__pedidos") === 2 && run("isFullscreenActive()") === false);

run("isMobileDevice = () => false; toggleFullscreen(); document.fullscreenElement = null; syncFullscreenState(); voltarParaTelaCheia();");
check("no computador (sair com Esc) não volta sozinho", run("isFullscreenActive()") === false);

// botão ATUALIZAR na janela UPDATES
const html = fs.readFileSync(__dirname + "/../index.html", "utf8");
check("a janela UPDATES tem o botão ATUALIZAR com a flecha", /id="btn-atualizar-jogo"[^>]*onclick="atualizarJogoAgora\(\)"/.test(html) && html.includes("<svg") && html.includes("girar-atualizar"));
check("o botão fica dentro do jogo (funciona em tela cheia)", html.indexOf('id="btn-atualizar-jogo"') > html.indexOf('id="game-container"'));

context.__recarregou = 0;
context.__baixou = [];
run(`
    location = { href: "https://exemplo/jogo/", protocol: "https:", reload() { __recarregou++; } };
    URL = class { constructor(p, base) { this.href = base + p; } };
    document.querySelectorAll = (sel) => sel === "script[src]" ? [{ src: "https://exemplo/jogo/menu.js" }] : [];
    sessionStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; } };
    fetch = async (url, opts) => { if (opts && opts.cache === "reload") __baixou.push(url); return { ok: true, headers: { get: () => null } }; };
`);
(async () => {
    await run("atualizarJogoAgora()");
    check("ATUALIZAR baixa de novo os arquivos do jogo sem usar a cópia guardada", context.__baixou.length >= 3);
    check("e recarrega o jogo na hora", context.__recarregou === 1);
    summary();
})();
