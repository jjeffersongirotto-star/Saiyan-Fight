// tests/versao-091.test.js — versão 0.91: esfera de 4 estrelas (menu de ajustes no canto do menu principal: perfil
// com apelido, EDITOR DE PERSONAGENS, EDITOR DE ARENAS em breve e UPDATES) e os arquivos de personagem
// (.saiyan.json: exportar e anexar; os exemplos de formatos/ entram no jogo).
//
// Uso: node tests/versao-091.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const dir = __dirname + "/..";
const h = createHarness(dir, 800);
const { run, check, summary } = h;
run("deltaTime = 1/60; openUpdatesModal = () => { window.__updates = true; }");
const centro = (expr) => run(`(() => { const r = ${expr}; return [r.x + r.w / 2, r.y + r.h / 2]; })()`);
const clicar = (expr) => { const [x, y] = centro(expr); run(`handleMenuClick(${x}, ${y})`); };

// ---------- esfera ----------
run("setGameState('menu'); esferaAberta = false");
check("o menu principal não tem mais DATABASE nem UPDATES soltos", run("!MENU_LAYOUT.main.database && !MENU_LAYOUT.main.updates"));
h.calls.length = 0; run("render()");
check("a esfera aparece fechada no canto (sem o painel)", !h.calls.some(c => c[0] === "fillText" && c[1][0] === "EDITOR DE PERSONAGENS"));
clicar("MENU_LAYOUT.esfera.botao");
check("tocar na esfera abre o menu", run("esferaAberta") === true);
h.calls.length = 0; run("render()");
const textos = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("o menu mostra perfil, EDITOR DE PERSONAGENS, EDITOR DE ARENAS e UPDATES (por último)", ["PERFIL", "EDITOR DE PERSONAGENS", "EDITOR DE ARENAS", "UPDATES"].every(t => textos.includes(t))
    && run("(() => { const it = getEsferaItens(); return it.updates.y > it.editorArenas.y && it.editorArenas.y > it.editorPersonagens.y && it.editorPersonagens.y > it.perfil.y; })()"));
check("com o menu aberto, os botões de baixo não contam para o controle", !run("menuTargets.some(t => t.x === MENU_LAYOUT.main.play.x && t.y === MENU_LAYOUT.main.play.y)"));
clicar("MENU_LAYOUT.main.play");
check("tocar fora do menu só fecha (não abre o JOGAR)", run("esferaAberta") === false && run("gameState") === "menu");
clicar("MENU_LAYOUT.esfera.botao"); clicar("getEsferaItens().perfil");
check("tocar na foto mostra TROCAR FOTO e APELIDO", run("esferaPerfilAberto") === true && !!run("getEsferaItens().apelido"));
clicar("getEsferaItens().foto");
check("TROCAR FOTO está desabilitado (nada acontece)", run("esferaAberta") === true && run("document.getElementById('modal-alert').style.display") !== "flex");
clicar("getEsferaItens().apelido");
check("APELIDO abre a janela com o campo", run("document.getElementById('modal-alert').style.display") === "flex" && run("document.getElementById('modal-alert-msg').children.length") === 1);
run("document.getElementById('modal-alert-msg').children[0].id = 'modal-alert-campo'; document.getElementById('modal-alert-campo').value = '  Kakarotto  '; executeSystemConfirm(true)");
check("o apelido é salvo (sem espaços nas pontas)", run("getApelido()") === "Kakarotto" && h.store.saiyan_apelido === "Kakarotto");
check("apelido longo é cortado em 16", run("setApelido('ABCDEFGHIJKLMNOPQRSTU')") === "ABCDEFGHIJKLMNOP");
clicar("getEsferaItens().editorArenas");
check("EDITOR DE ARENAS abre a janela do editor (0.92)", run("arenaEditorAberto()") === true);
run("fecharEditorArenas(); esferaAberta = true");
clicar("getEsferaItens().editorPersonagens");
check("EDITOR DE PERSONAGENS abre o antigo DATABASE (e fecha o menu)", run("gameState") === "database" && run("esferaAberta") === false);
run("setGameState('menu'); esferaAberta = true; esferaPerfilAberto = false");
clicar("getEsferaItens().updates");
check("UPDATES abre as novidades", run("window.__updates") === true);

// ---------- arquivos de personagem ----------
const importar = (texto, imagens = {}) => run(`(async () => { window.__r = await importarPersonagemDeTexto(${JSON.stringify(texto)}, ${JSON.stringify(imagens)}); })()`);
const espera = () => new Promise(r => setTimeout(r, 30));
(async () => {
    const exp = run("JSON.stringify(dadosDoPersonagemParaArquivo('vegeta'))");
    importar(exp); await espera();
    const k1 = run("window.__r.key");
    check("exportar e anexar de volta: vira um personagem igual", !!k1 && run(`characterDB['${k1}'].name`) === "VEGETA" && run(`JSON.stringify(characterDB['${k1}'].builderAppearance) === JSON.stringify(normalizeAppearance(characterDB.vegeta.builderAppearance))`));
    check("e fica salvo no navegador", JSON.parse(h.store.saiyan_db_v8_8bit)[k1] !== undefined);
    for (const nome of ["exemplo-construtor", "exemplo-minion"]) {
        importar(fs.readFileSync(`${dir}/formatos/${nome}.saiyan.json`, "utf8")); await espera();
        check(`formatos/${nome}.saiyan.json entra no jogo`, !!run("window.__r.key"), JSON.stringify(run("window.__r")));
    }
    check("o minion do arquivo é o clássico com as cores do arquivo", run("(() => { const c = characterDB[window.__r.key]; return c.minionClassico.modelo === 'saibaman' && c.minionClassico.cores.pele === '#9b5de5' && c.alignment === 'MINION'; })()"));
    check("e aparece no campo MINION das arenas", run("getMinionsDisponiveis().some(m => m.id === window.__r.key)"));
    const png = "data:image/png;base64,AAAA";
    const quadros = fs.readFileSync(`${dir}/formatos/exemplo-quadros.saiyan.json`, "utf8");
    importar(quadros, { "parado1.png": png }); await espera();
    check("imagem que falta: erro dizendo qual", /IMAGEM NÃO ENCONTRADA.*\[parado2\.png\]/.test(run("window.__r.erro") || ""));
    const todas = {}; ["parado1", "parado2", "parado3", "frente1", "frente2", "tras1", "tiro1", "tiro2", "carregar1", "carregar2"].forEach(n => { todas[n + ".png"] = png; });
    importar(quadros, todas); await espera();
    check("formatos/exemplo-quadros.saiyan.json com as imagens entra no jogo (movimento que falta usa o parado)", !!run("window.__r.key") && run("characterDB[window.__r.key].animations.flyUp.length") === 3 && run("characterDB[window.__r.key].fpsSettings.idle") === 6);
    const folha = JSON.parse(fs.readFileSync(`${dir}/formatos/exemplo-folha.saiyan.json`, "utf8"));
    importar(JSON.stringify(folha), { "folha.png": png }); await espera();
    check("folha: quadro fora da imagem dá erro", /QUADRO FORA DA IMAGEM/.test(run("window.__r.erro") || ""));
    folha.personagem.folha.largura = folha.personagem.folha.altura = 8;   // a imagem do teste tem 32x32: 16 quadros de 8x8
    importar(JSON.stringify(folha), { "folha.png": png }); await espera();
    check("folha de sprites cortada em quadros", !!run("window.__r.key") && run("characterDB[window.__r.key].animations.transform.length") === 4);
    const erros = [
        ["texto que não é JSON", "{ nada", /JSON VÁLIDO/],
        ["outro formato", JSON.stringify({ formato: "outro" }), /NÃO É DE PERSONAGEM/],
        ["sem nome", JSON.stringify({ formato: "saiyan-fight-personagem", versao: 1, personagem: { minionClassico: { modelo: "saibaman" } } }), /NOME/],
        ["dois desenhos", JSON.stringify({ formato: "saiyan-fight-personagem", versao: 1, personagem: { name: "X", minionClassico: { modelo: "saibaman" }, animations: { idle: ["a.png"] } } }), /SÓ UM DESENHO/],
        ["movimento errado", JSON.stringify({ formato: "saiyan-fight-personagem", versao: 1, personagem: { name: "X", animations: { idle: ["a.png"], voar: ["a.png"] } } }), /MOVIMENTO DESCONHECIDO \[voar\]/],
        ["versão nova", JSON.stringify({ formato: "saiyan-fight-personagem", versao: 99, personagem: { name: "X" } }), /VERSÃO MAIS NOVA/]
    ];
    const antes = run("Object.keys(characterDB).length");
    for (const [nome, texto, re] of erros) { importar(texto); await espera(); check(`erro claro: ${nome}`, re.test(run("window.__r.erro") || ""), run("window.__r.erro")); }
    check("arquivo com erro não muda nada", run("Object.keys(characterDB).length") === antes);
    run("trocarIdioma('en')");
    check("os erros saem traduzidos (o detalhe fica)", run("T('MOVIMENTO DESCONHECIDO [voar]')") === "UNKNOWN MOVE [voar]");
    run("trocarIdioma('pt')");
    process.exit(summary());
})();
