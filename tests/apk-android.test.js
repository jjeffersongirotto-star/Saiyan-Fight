// tests/apk-android.test.js — APK Android (Capacitor): o jogo vai dentro do app e roda sem internet.
// Dentro do APK nada se atualiza sozinho (nem ao abrir, nem nos menus): só a setinha ATUALIZAR da janela UPDATES
// lê o latest.json da Release app-bundle e, se o jogo tiver versão nova, pergunta e atualiza o JOGO dentro do app
// (@capgo/capacitor-updater: download com sha256 + set, nunca no meio da luta). APK novo só quando o latest.json
// exige um app mais novo. No navegador do Android, BAIXAR APP leva ao APK.
// Também confere a cópia dos arquivos para www/ (webDir do Capacitor) e o capacitor.config.json.
//
// Uso: node tests/apk-android.test.js

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createHarness } = require("./harness.js");
const RAIZ = path.join(__dirname, "..");
const h = createHarness(RAIZ, 800);
const { run, check, summary, context } = h;

const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, "capacitor.config.json"), "utf8"));
check("capacitor.config: appId, nome e webDir www", cfg.appId === "io.github.jjeffersongirotto.saiyanfight" && cfg.appName === "Saiyan Fight" && cfg.webDir === "www");
const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, "package.json"), "utf8"));
check("package.json não vira módulo (os .js do jogo continuam scripts comuns)", !pkg.type);

// fora do APK continua igual: sem Capacitor, jogoNoApk() é falso
check("no navegador não está no APK", run("jogoNoApk()") === false);

// navegador de mentira com o Capacitor (como dentro do APK) e os plugins CapacitorHttp e CapacitorUpdater
context.__pedidos = [];
context.__timers = 0;
context.__navegou = [];
context.__confirmou = [];
context.__updater = { prontos: 0, baixados: [], trocou: [], falhar: false };
context.__latest = { status: 404, data: null };
const latestBase = { versao: "0.117", build: 280, url: "https://x/saiyan-fight-web-0.117-280.zip", sha256: "ab".repeat(32), nativoMinimo: "1.0.0", apk: "https://x/Saiyan-Fight.apk" };
run(`
    Capacitor = { isNativePlatform: () => true, Plugins: {
        CapacitorHttp: { get: async (o) => { __pedidos.push(o.url); if (__latest.status === "offline") throw new Error("offline"); return { status: __latest.status, data: __latest.data }; } },
        CapacitorUpdater: {
            notifyAppReady: () => { __updater.prontos++; return Promise.resolve({}); },
            current: async () => ({ bundle: { id: "builtin" }, native: "1.0.275" }),
            download: async (o) => { if (__updater.falhar) throw new Error("Checksum failed"); __updater.baixados.push(o); return { id: "b1", version: o.version }; },
            set: (o) => { __updater.trocou.push(o.id); return new Promise(() => {}); }
        } } };
    VERSAO_APK = "1.0.275"; VERSAO_JOGO_NO_APK = "0.116"; BUILD_WEB = 276;
    location = { href: "https://localhost/", protocol: "https:", reload() { __navegou.push("reload"); } };
    Object.defineProperty(location, "href", { get() { return "https://localhost/"; }, set(v) { __navegou.push(v); } });
    sessionStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; } };
    fetch = async (url) => { __pedidos.push("fetch " + url); throw new Error("não devia usar fetch"); };
    var __st = setTimeout, __si = setInterval;
`);
check("dentro do APK: jogoNoApk() verdadeiro e o botão é ATUALIZAR", run("jogoNoApk()") === true && run("jogoEstaInstalado()") === true);

// Abrir o app: o atualizacao.js carregado com o Capacitor não agenda nenhuma verificação e avisa que abriu bem
const fonte = fs.readFileSync(path.join(RAIZ, "atualizacao.js"), "utf8");
run(`setTimeout = () => { __timers++; }; setInterval = () => { __timers++; };`);
run(`(function () { ${fonte}\n })()`);
run(`setTimeout = __st; setInterval = __si;`);
check("ao abrir o APK não agenda verificação automática", context.__timers === 0 && context.__pedidos.length === 0);
check("ao abrir o APK avisa o plugin que o jogo carregou (notifyAppReady, senão volta à versão anterior)", context.__updater.prontos === 1);

// decisão (pura)
const decidir = (latest, atual) => run(`decidirAtualizacaoNoApp(${JSON.stringify(latest)}, ${JSON.stringify(atual)})`);
check("decisão: build igual ou menor = nada", decidir(Object.assign({}, latestBase, { build: 276 }), { build: 276, nativo: "1.0.275" }).tipo === "nada");
check("decisão: build maior = atualiza o jogo dentro do app", (() => { const d = decidir(latestBase, { build: 276, nativo: "1.0.275" }); return d.tipo === "jogo" && d.versao === "0.117" && d.sha256 === latestBase.sha256 && d.id === "0.117-280"; })());
check("decisão: precisa de um app mais novo (nativoMinimo > instalado) = APK", decidir(Object.assign({}, latestBase, { nativoMinimo: "1.1.0" }), { build: 276, nativo: "1.0.275" }).tipo === "apk");
check("decisão: app novo já instalado = atualiza só o jogo", decidir(Object.assign({}, latestBase, { nativoMinimo: "1.1.0" }), { build: 276, nativo: "1.1.290" }).tipo === "jogo");
check("decisão: latest.json sem sha256 ou url = erro (não baixa)", decidir(Object.assign({}, latestBase, { sha256: "" }), { build: 1, nativo: "1.0.0" }).tipo === "erro" && decidir(null, { build: 1 }).tipo === "erro");

const rotulo = () => run("document.getElementById('btn-atualizar-rotulo') && document.getElementById('btn-atualizar-rotulo').textContent");
(async () => {
    check("nos menus a verificação por ETag não roda no APK", (await run("checkForGameUpdate(true)")) === false && context.__pedidos.length === 0);

    run("var __sc = showSystemConfirm; showSystemConfirm = (t, m, cb, a, b) => { __confirmou.push([t, m, a, b]); if (__aceitar) return cb(); }; var __aceitar = true;");
    // nada publicado ainda
    await run("atualizarJogoAgora()");
    check("setinha: lê o latest.json da Release app-bundle pelo HTTP nativo", context.__pedidos.length === 1 && /releases\/download\/app-bundle\/latest\.json/.test(context.__pedidos[0]));
    check("nada publicado ainda: JÁ ESTÁ ATUALIZADO, sem baixar", context.__updater.baixados.length === 0 && context.__confirmou.length === 0 && [null, "JÁ ESTÁ ATUALIZADO"].includes(rotulo()));
    // mesma versão
    context.__latest = { status: 200, data: Object.assign({}, latestBase, { build: 276, versao: "0.116" }) };
    await run("atualizarJogoAgora()");
    check("mesma versão: não pergunta nem baixa", context.__updater.baixados.length === 0 && context.__confirmou.length === 0);
    // sem internet
    context.__latest = { status: "offline" };
    await run("atualizarJogoAgora()");
    check("sem internet: SEM CONEXÃO, nada muda", context.__updater.baixados.length === 0 && [null, "SEM CONEXÃO"].includes(rotulo()));

    // versão nova do jogo: jogador diz AGORA NÃO
    context.__latest = { status: 200, data: latestBase };
    run("__aceitar = false");
    await run("atualizarJogoAgora()");
    check("versão nova: pergunta ATUALIZAR AGORA? com a versão do jogo (0.117)", context.__confirmou.length === 1 && context.__confirmou[0][0] === "ATUALIZAR AGORA?" && context.__confirmou[0][1].includes("0.117") && context.__confirmou[0][2] === "ATUALIZAR" && context.__confirmou[0][3] === "AGORA NÃO");
    check("AGORA NÃO: não baixa nada", context.__updater.baixados.length === 0 && context.__updater.trocou.length === 0);

    // aceita, mas no meio da luta: baixa e só troca quando volta ao menu
    run("__aceitar = true; gameMode = 'singleplayer'; startGame()");
    await run("atualizarJogoAgora()");
    await new Promise(r => setImmediate(r));
    const baixado = context.__updater.baixados[0];
    check("ATUALIZAR: baixa o pacote com a url, a versão e o sha256 do latest.json", baixado && baixado.url === latestBase.url && baixado.checksum === latestBase.sha256 && baixado.version === "0.117-280");
    check("no meio da luta NÃO troca de versão", context.__updater.trocou.length === 0);
    run("setGameState('menu')");
    await new Promise(r => setTimeout(r, 1200));
    check("de volta ao menu: troca para o pacote novo (set)", context.__updater.trocou.length === 1 && context.__updater.trocou[0] === "b1");
    check("e não abriu nenhum APK", context.__navegou.length === 0);

    // download/sha256 falhou
    context.__updater.falhar = true; context.__updater.trocou.length = 0;
    run("atualizandoAgora = false");
    await run("atualizarJogoAgora()");
    await new Promise(r => setImmediate(r));
    check("sha256 errado/download falhou: avisa e continua na versão atual", context.__updater.trocou.length === 0 && [null, "ERRO AO ATUALIZAR"].includes(rotulo()));
    context.__updater.falhar = false;

    // versão nova que precisa de app novo: só então oferece o APK
    context.__latest = { status: 200, data: Object.assign({}, latestBase, { build: 300, nativoMinimo: "1.1.0" }) };
    context.__confirmou.length = 0; context.__updater.baixados.length = 0;
    await run("atualizarJogoAgora()");
    check("precisa de app novo: oferece baixar o APK (BAIXAR / AGORA NÃO)", context.__confirmou.length === 1 && context.__confirmou[0][2] === "BAIXAR" && context.__navegou[0] === "https://x/Saiyan-Fight.apk" && context.__updater.baixados.length === 0);
    run("showSystemConfirm = __sc");

    check("comparação de versões do APK", run("compararVersoesApk('apk-v1.0.300', '1.0.275') > 0 && compararVersoesApk('1.1.0', '1.0.999') > 0 && compararVersoesApk('apk-v1.0.275', '1.0.275') === 0"));
    check("textos novos traduzidos (EN)", run("trocarIdioma('en'), T('ATUALIZAR AGORA?') === 'UPDATE NOW?' && T('Saiu a versão 0.117 do jogo. Atualizar agora? O jogo baixa a versão nova e reinicia; o progresso continua salvo.').startsWith('Version 0.117')") === true);
    run("trocarIdioma('pt')");

    // navegador do Android (fora do APK): BAIXAR APP leva ao APK da última versão
    run("Capacitor = undefined; navigator.userAgent = 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile'; navigator.standalone = false");
    await run("atualizarJogoAgora()");
    check("Android no navegador: BAIXAR APP abre o APK de releases/latest",
        context.__navegou[context.__navegou.length - 1] === "https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/latest/download/Saiyan-Fight.apk");

    // cópia para www/ (v0.121): o JOGO NOVO construído (novo/dist) + versao-apk.js antes do script do jogo.
    // Aqui um dist de mentira (o build de verdade é conferido no CI do jogo novo); SAIYAN_DIST aponta para ele.
    const distFalso = fs.mkdtempSync(path.join(require("os").tmpdir(), "dist-novo-"));
    fs.mkdirSync(path.join(distFalso, "assets"));
    fs.writeFileSync(path.join(distFalso, "index.html"), '<!doctype html><html><head><script type="module" crossorigin src="./assets/index-x.js"></script></head><body><div id="jogo"></div></body></html>');
    fs.writeFileSync(path.join(distFalso, "assets/index-x.js"), "console.log('jogo novo')");
    execFileSync(process.execPath, [path.join(RAIZ, "scripts/android/copiar-web.js")], { env: Object.assign({}, process.env, { SAIYAN_APK_PATCH: "7", SAIYAN_DIST: distFalso }), stdio: "ignore" });
    const www = path.join(RAIZ, "www");
    const faltando = ["index.html", "assets/index-x.js", "versao-apk.js", "versao-apk.json"].filter(f => !fs.existsSync(path.join(www, f)));
    check("www/ tem o jogo novo construído", faltando.length === 0, faltando.join(", "));
    check("www/ não leva o jogo antigo, testes nem o projeto Android", !fs.existsSync(path.join(www, "menu.js")) && !fs.existsSync(path.join(www, "tests")) && !fs.existsSync(path.join(www, "android")));
    const html = fs.readFileSync(path.join(www, "index.html"), "utf8");
    check("index.html do APK carrega versao-apk.js antes do script do jogo", /<script src="versao-apk\.js"><\/script>\s*<script type="module"/.test(html));
    // site: jogo novo na raiz e o antigo inteiro em antigo/
    const site = fs.mkdtempSync(path.join(require("os").tmpdir(), "site-"));
    execFileSync(process.execPath, [path.join(RAIZ, "scripts/montar-site.js"), site], { env: Object.assign({}, process.env, { SAIYAN_DIST: distFalso }), stdio: "ignore" });
    const faltaSite = ["index.html", "assets/index-x.js", "antigo/index.html", "antigo/menu.js", "antigo/atualizacao.js", "antigo/icons/icon-512.png", "antigo/fases/indice.json", "antigo/conjuntos/retratos.json"]
        .filter(f => !fs.existsSync(path.join(site, f)));
    check("site: jogo novo na raiz e o jogo antigo em antigo/", faltaSite.length === 0, faltaSite.join(", "));
    check("site: o jogo antigo continua sem versao-apk.js", !fs.readFileSync(path.join(site, "antigo/index.html"), "utf8").includes("versao-apk.js"));
    fs.rmSync(site, { recursive: true, force: true });
    fs.rmSync(distFalso, { recursive: true, force: true });
    const v = JSON.parse(fs.readFileSync(path.join(www, "versao-apk.json"), "utf8"));
    check("versão do APK = major.minor do package.json + patch", v.versao === pkg.version.split(".").slice(0, 2).join(".") + ".7" && v.codigo % 10000 === 7);
    check("versao-apk.js leva a versão do jogo novo (novo/package.json) e o build", /VERSAO_JOGO_NO_APK = "0\.\d+"/.test(fs.readFileSync(path.join(www, "versao-apk.js"), "utf8")) && /BUILD_WEB = 7;/.test(fs.readFileSync(path.join(www, "versao-apk.js"), "utf8")) && v.nativoMinimo === pkg.version.split(".").slice(0, 2).join(".") + ".0");
    // pacote .zip + latest.json (o que a CI publica na Release app-bundle)
    const saida = fs.mkdtempSync(path.join(require("os").tmpdir(), "pacote-web-"));
    let python = true;
    try { execFileSync("python3", [path.join(RAIZ, "scripts/android/pacote-web.py"), saida, "https://exemplo/app-bundle"], { cwd: RAIZ, stdio: "ignore" }); } catch (e) { python = false; }
    if (python) {
        const latest = JSON.parse(fs.readFileSync(path.join(saida, "latest.json"), "utf8"));
        const zip = path.join(saida, latest.arquivo);
        const sha = require("crypto").createHash("sha256").update(fs.readFileSync(zip)).digest("hex");
        check("pacote-web.py: latest.json com versão do jogo, build, url, sha256 do zip e nativoMinimo",
            latest.versao === v.jogo && latest.build === 7 && latest.url === "https://exemplo/app-bundle/" + latest.arquivo && latest.sha256 === sha && latest.nativoMinimo === v.nativoMinimo);
        const zipTxt = fs.readFileSync(zip).toString("latin1");
        check("o zip tem index.html na raiz (o que o plugin exige)", zipTxt.includes("index.html") && !zipTxt.includes("www/index.html"));
        fs.rmSync(saida, { recursive: true, force: true });
    } else check("pacote-web.py precisa do python3", false);
    check("o index.html do site continua sem versao-apk.js", !fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").includes("versao-apk.js"));
    summary();
})();
