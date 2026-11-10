// tests/apk-android.test.js — APK Android (Capacitor): o jogo vai dentro do app e roda sem internet.
// Dentro do APK nada se atualiza sozinho (nem ao abrir, nem nos menus): só a setinha ATUALIZAR da janela UPDATES
// procura um APK mais novo na página de Releases e oferece baixar. No navegador do Android, BAIXAR APP leva ao APK.
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

// navegador de mentira com o Capacitor (como dentro do APK)
context.__pedidos = [];
context.__timers = 0;
context.__navegou = [];
context.__confirmou = [];
context.__releases = { status: 200, body: { tag_name: "apk-v1.0.275", assets: [] } };
run(`
    Capacitor = { isNativePlatform: () => true };
    VERSAO_APK = "1.0.275";
    location = { href: "https://localhost/", protocol: "https:", reload() { __navegou.push("reload"); } };
    Object.defineProperty(location, "href", { get() { return "https://localhost/"; }, set(v) { __navegou.push(v); } });
    sessionStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; } };
    fetch = async (url, opts) => {
        __pedidos.push(url);
        const r = __releases;
        return { ok: r.status === 200, status: r.status, json: async () => r.body, headers: { get: () => null } };
    };
    var __st = setTimeout, __si = setInterval;
`);
check("dentro do APK: jogoNoApk() verdadeiro e o botão é ATUALIZAR", run("jogoNoApk()") === true && run("jogoEstaInstalado()") === true);

// Abrir o app: o atualizacao.js carregado com o Capacitor não agenda nenhuma verificação
const fonte = fs.readFileSync(path.join(RAIZ, "atualizacao.js"), "utf8");
run(`setTimeout = () => { __timers++; }; setInterval = () => { __timers++; };`);
run(`(function () { ${fonte}\n })()`);
run(`setTimeout = __st; setInterval = __si;`);
check("ao abrir o APK não agenda verificação automática", context.__timers === 0);

(async () => {
    check("nos menus a verificação por ETag não roda no APK", (await run("checkForGameUpdate(true)")) === false && context.__pedidos.length === 0);

    // setinha com a mesma versão publicada
    run("var __sc = showSystemConfirm; showSystemConfirm = (t, m, cb, a, b) => { __confirmou.push([t, m, a, b]); cb(); }");
    await run("atualizarJogoAgora()");
    check("setinha: pergunta à página de Releases", context.__pedidos.length === 1 && /api\.github\.com\/repos\/jjeffersongirotto-star\/Saiyan-Fight\/releases\/latest/.test(context.__pedidos[0]));
    check("mesma versão: avisa JÁ ESTÁ ATUALIZADO, sem baixar nem recarregar",
        context.__navegou.length === 0 && context.__confirmou.length === 0 &&
        (run("document.getElementById('btn-atualizar-rotulo')") === null || run("document.getElementById('btn-atualizar-rotulo').textContent") === "JÁ ESTÁ ATUALIZADO"));

    // setinha com uma versão mais nova publicada
    context.__releases = { status: 200, body: { tag_name: "apk-v1.0.280", assets: [{ name: "Saiyan-Fight-1.0.280.apk", browser_download_url: "https://x/a.apk" }, { name: "Saiyan-Fight.apk", browser_download_url: "https://x/Saiyan-Fight.apk" }] } };
    await run("atualizarJogoAgora()");
    check("versão nova: pergunta antes de baixar (BAIXAR / AGORA NÃO)", context.__confirmou.length === 1 && context.__confirmou[0][2] === "BAIXAR" && context.__confirmou[0][3] === "AGORA NÃO");
    check("e ao confirmar abre o APK novo", context.__navegou.length === 1 && context.__navegou[0] === "https://x/Saiyan-Fight.apk");

    context.__releases = { status: 404, body: {} };
    await run("atualizarJogoAgora()");
    check("sem nenhuma versão publicada ainda: não baixa nada", context.__navegou.length === 1);
    run("fetch = async () => { throw new Error('offline'); }");
    await run("atualizarJogoAgora()");
    check("sem internet: não baixa nada (avisa SEM CONEXÃO)", context.__navegou.length === 1);
    run("showSystemConfirm = __sc");

    check("comparação de versões do APK", run("compararVersoesApk('apk-v1.0.300', '1.0.275') > 0 && compararVersoesApk('1.1.0', '1.0.999') > 0 && compararVersoesApk('apk-v1.0.275', '1.0.275') === 0"));

    // navegador do Android (fora do APK): BAIXAR APP leva ao APK da última versão
    run("Capacitor = undefined; navigator.userAgent = 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile'; navigator.standalone = false");
    await run("atualizarJogoAgora()");
    check("Android no navegador: BAIXAR APP abre o APK de releases/latest",
        context.__navegou[context.__navegou.length - 1] === "https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/latest/download/Saiyan-Fight.apk");

    // cópia para www/: arquivos do jogo + versao-apk.js antes do atualizacao.js
    execFileSync(process.execPath, [path.join(RAIZ, "scripts/android/copiar-web.js")], { env: Object.assign({}, process.env, { SAIYAN_APK_PATCH: "7" }), stdio: "ignore" });
    const www = path.join(RAIZ, "www");
    const faltando = ["index.html", "tv.html", "manifest.webmanifest", "menu.js", "atualizacao.js", "icons/icon-512.png", "fases/indice.json", "conjuntos/retratos.json"]
        .filter(f => !fs.existsSync(path.join(www, f)));
    check("www/ tem os arquivos do jogo", faltando.length === 0, faltando.join(", "));
    check("www/ não leva testes nem o projeto Android", !fs.existsSync(path.join(www, "tests")) && !fs.existsSync(path.join(www, "android")));
    const html = fs.readFileSync(path.join(www, "index.html"), "utf8");
    check("index.html do APK carrega versao-apk.js logo antes do atualizacao.js", /<script src="versao-apk\.js"><\/script>\s*<script src="atualizacao\.js"><\/script>/.test(html));
    const v = JSON.parse(fs.readFileSync(path.join(www, "versao-apk.json"), "utf8"));
    check("versão do APK = major.minor do package.json + patch", v.versao === pkg.version.split(".").slice(0, 2).join(".") + ".7" && v.codigo % 10000 === 7);
    check("o index.html do site continua sem versao-apk.js", !fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").includes("versao-apk.js"));
    summary();
})();
