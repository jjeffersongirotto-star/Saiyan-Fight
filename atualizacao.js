// ==================== ATUALIZACAO.JS - JOGO SE ATUALIZA SOZINHO ====================
// Quando sai uma versão nova no GitHub Pages, o celular pode continuar rodando a cópia antiga guardada pelo
// navegador (até uns 10 minutos, ou mais numa aba/app que ficou aberto). Aqui o jogo confere, de tempos em
// tempos, se algum arquivo mudou no servidor — só pergunta (HEAD), sem baixar nada — e, se mudou, baixa os
// arquivos novos e recarrega sozinho. Nunca recarrega no meio da luta ou com uma janela aberta (ex.: editor
// com alterações não salvas): espera voltar a um menu. Personagens, conquistas e recordes ficam no
// localStorage e não se perdem.
// Carregar por último (usa gameState/isModalCoveringScreen do menu.js).
//
// APK Android (Capacitor, window.Capacitor): os arquivos do jogo vão DENTRO do app e ele roda sem internet. Lá não
// existe verificação automática nenhuma (nem ao abrir, nem nos menus): só quando o jogador aperta a setinha de
// ATUALIZAR na janela UPDATES o jogo procura uma versão nova e, se ele aceitar, se atualiza dentro do próprio app
// (procurarAtualizacaoNoApp, mais abaixo). APK novo só quando a versão nova exige um app mais novo.

const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;   // de 10 em 10 minutos com o jogo aberto
const UPDATE_MIN_GAP_MS = 2 * 60 * 1000;           // e ao voltar para o jogo, no máximo a cada 2 minutos
let lastUpdateCheck = 0;
let updateCheckRunning = false;
let updatePending = false;

// APK Android: endereço fixo do APK mais novo (a CI publica também com este nome) e a API da última versão.
const APK_DOWNLOAD_URL = "https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/latest/download/Saiyan-Fight.apk";
function jogoNoApk() {
    try {
        const cap = typeof window !== "undefined" ? window.Capacitor : null;
        return Boolean(cap && (typeof cap.isNativePlatform !== "function" || cap.isNativePlatform()));
    } catch (e) { return false; }
}
function celularAndroid() {
    return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");
}
// > 0 quando a versão `a` é mais nova que `b` ("1.0.280" > "1.0.275"; aceita "apk-v"/"v" na frente).
function compararVersoesApk(a, b) {
    const partes = v => String(v || "").replace(/^[^0-9]*/, "").split(".").map(n => parseInt(n, 10) || 0);
    const pa = partes(a), pb = partes(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d) return d;
    }
    return 0;
}

// Arquivos do jogo: a própria página, os scripts e o manifest.
function getGameFileUrls() {
    const page = String(location.href).split("#")[0];
    const scripts = Array.from(document.querySelectorAll("script[src]")).map(s => s.src);
    return [page].concat(scripts, [new URL("manifest.webmanifest", page).href]);
}

// "Impressão digital" de um arquivo: ETag (ou data de modificação) que o servidor manda junto.
function getFileTag(response) {
    if (!response || !response.ok) return null;
    return response.headers.get("etag") || response.headers.get("last-modified");
}

// Compara a cópia que o navegador tem guardada (a que está rodando) com a do servidor.
async function isGameFileOutdated(url) {
    try {
        const cached = getFileTag(await fetch(url, { cache: "force-cache" }));
        const server = getFileTag(await fetch(url, { method: "HEAD", cache: "no-store" }));
        return Boolean(cached && server && cached !== server);
    } catch (e) {
        return false;   // sem internet, aberto como arquivo local etc.: não faz nada
    }
}

async function checkForGameUpdate(force = false) {
    if (jogoNoApk()) return false;   // no APK só a setinha procura versão nova (procurarAtualizacaoNoApp)
    if (typeof fetch !== "function" || updateCheckRunning || updatePending) return false;
    const now = Date.now();
    if (!force && now - lastUpdateCheck < UPDATE_MIN_GAP_MS) return false;
    lastUpdateCheck = now;
    updateCheckRunning = true;
    try {
        const urls = getGameFileUrls();
        const outdated = await Promise.all(urls.map(isGameFileOutdated));
        if (!outdated.some(Boolean)) return false;
        // Baixa as versões novas para a memória do navegador; assim o recarregamento já pega tudo novo.
        await Promise.all(urls.map(url => fetch(url, { cache: "reload" }).catch(() => null)));
        updatePending = true;
        reloadWhenSafe();
        return true;
    } finally {
        updateCheckRunning = false;
    }
}

// Só recarrega fora da luta/tutorial/pausa e sem janela aberta; senão tenta de novo daqui a pouco.
function isSafeToReloadForUpdate() {
    const busyStates = ["playing", "tutorial", "paused", "options_hud", "controls_test"];
    if (busyStates.includes(gameState)) return false;
    if (typeof isModalCoveringScreen === "function" && isModalCoveringScreen()) return false;
    return true;
}

function reloadWhenSafe() {
    if (!updatePending) return;
    if (!isSafeToReloadForUpdate()) {
        setTimeout(reloadWhenSafe, 1000);
        return;
    }
    // Trava contra recarregar em sequência (se por algum motivo a cópia guardada não se atualizar).
    try {
        const last = Number(sessionStorage.getItem("saiyan_atualizou_em")) || 0;
        if (Date.now() - last < 60 * 1000) { updatePending = false; return; }
        sessionStorage.setItem("saiyan_atualizou_em", String(Date.now()));
    } catch (e) {}
    location.reload();
}

// Botão ATUALIZAR (flecha girando) da janela UPDATES: baixa de novo todos os arquivos do jogo, ignorando a
// cópia guardada pelo navegador, e recarrega na hora — sem precisar fechar e abrir o jogo várias vezes.
let atualizandoAgora = false;
// Texto da lista de novidades (sem espaços extras), para comparar a versão que está rodando com a do servidor.
function textoListaUpdates(raiz) {
    const lista = raiz && raiz.getElementById ? raiz.getElementById("lista-updates") : null;
    return lista ? String(lista.textContent || "").replace(/\s+/g, " ").trim() : "";
}

// Lista de novidades do servidor (baixa a página sem cache). null = não deu para ler (sem internet etc.).
async function lerListaUpdatesDoServidor() {
    try {
        const resposta = await fetch(String(location.href).split("#")[0], { cache: "reload" });
        if (!resposta || !resposta.ok || typeof DOMParser !== "function") return null;
        return textoListaUpdates(new DOMParser().parseFromString(await resposta.text(), "text/html"));
    } catch (e) {
        return null;
    }
}

// Botão ATUALIZAR: só recarrega (e fecha a janela) quando a lista de novidades do servidor é diferente da que
// está aberta. Se nada mudou, a janela UPDATES continua aberta e o botão avisa que já está na versão mais nova.
// v0.107: o mesmo botão também BAIXA o jogo como app. Fora do app (aberto no navegador) ele vira BAIXAR APP:
// usa o pedido de instalação do navegador (beforeinstallprompt) ou explica como instalar pelo menu. Já instalado,
// ATUALIZAR só baixa os arquivos que mudaram (não reinstala nada).
let pedidoInstalarApp = null;
function jogoEstaInstalado() {
    if (jogoNoApk()) return true;
    try {
        if (typeof navigator !== "undefined" && navigator.standalone) return true;
        if (typeof matchMedia === "function") return ["fullscreen", "standalone", "minimal-ui"].some(m => matchMedia("(display-mode: " + m + ")").matches);
    } catch (e) {}
    return false;
}
function atualizarRotuloDoBotao() {
    const rotulo = typeof document !== "undefined" ? document.getElementById("btn-atualizar-rotulo") : null;
    if (rotulo && !atualizandoAgora) rotulo.textContent = jogoEstaInstalado() ? "ATUALIZAR" : "BAIXAR APP";
}
if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); pedidoInstalarApp = e; atualizarRotuloDoBotao(); });
    window.addEventListener("appinstalled", () => { pedidoInstalarApp = null; atualizarRotuloDoBotao(); });
    if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", atualizarRotuloDoBotao); atualizarRotuloDoBotao(); }
}
async function baixarApp() {
    // Android no navegador: baixa o APK (abre rápido e funciona sem internet) em vez do atalho do Chrome.
    if (celularAndroid() && !jogoNoApk()) {
        try { location.href = APK_DOWNLOAD_URL; } catch (e) {}
        return;
    }
    if (pedidoInstalarApp) {
        const pedido = pedidoInstalarApp;
        pedidoInstalarApp = null;
        try { pedido.prompt(); await pedido.userChoice; } catch (e) {}
        atualizarRotuloDoBotao();
        return;
    }
    const iphone = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    if (typeof showSystemAlert === "function") showSystemAlert("BAIXAR APP", iphone
        ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
        : "No Chrome, toque no menu (⋮) e depois em Instalar app ou Adicionar à tela inicial. Se acabou de desinstalar, feche e abra o Chrome antes.");
}

// ---------- APK: atualização do JOGO dentro do app (sem instalar APK novo) ----------
// Só roda quando o jogador aperta a setinha ATUALIZAR. Lê o latest.json publicado pela CI nas Releases
// (tag app-bundle), decide (decidirAtualizacaoNoApp) e:
//  - "jogo": pergunta ATUALIZAR AGORA?, baixa o pacote .zip da pasta www com o plugin @capgo/capacitor-updater
//    (que confere o sha256), guarda no celular e troca para ele (reinicia o jogo, nunca no meio da luta). Depois
//    disso roda sem internet, como antes.
//  - "apk": só quando o latest.json diz que a versão nova precisa de um app (casca nativa) mais novo
//    (nativoMinimo > versão do APK instalado): oferece baixar o APK.
// Ao abrir, o jogo avisa o plugin que carregou bem (notifyAppReady); se um pacote novo não chegar a esse ponto em
// 15 s, o plugin volta sozinho para a última versão que funcionava.
const APP_BUNDLE_LATEST_URL = "https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/download/app-bundle/latest.json";
function pluginDoApp(nome) {
    try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[nome]) || null; } catch (e) { return null; }
}
// Pacote do jogo que está rodando (www/versao-apk.js de cada pacote): versão 0.X das UPDATES e número do build.
function versaoWebCarregada() {
    return {
        versao: typeof VERSAO_JOGO_NO_APK === "string" ? VERSAO_JOGO_NO_APK : "",
        build: typeof BUILD_WEB === "number" ? BUILD_WEB : 0
    };
}
// Versão do app instalado (casca nativa, 1.<geração>.<N>). O pacote baixado não sabe disso: pergunta ao plugin.
async function versaoNativaInstalada() {
    const updater = pluginDoApp("CapacitorUpdater");
    try { if (updater) { const c = await updater.current(); if (c && c.native) return String(c.native); } } catch (e) {}
    return typeof VERSAO_APK === "string" ? VERSAO_APK : "0";
}
// Decisão (pura): o que fazer com o latest.json. atual = { build, nativo }.
function decidirAtualizacaoNoApp(latest, atual) {
    if (!latest || typeof latest !== "object" || !latest.url || !latest.sha256 || !Number.isFinite(Number(latest.build))) return { tipo: "erro" };
    const build = Number(latest.build);
    if (build <= (Number(atual && atual.build) || 0)) return { tipo: "nada" };
    if (latest.nativoMinimo && compararVersoesApk(latest.nativoMinimo, (atual && atual.nativo) || "0") > 0)
        return { tipo: "apk", url: latest.apk || APK_DOWNLOAD_URL, versao: String(latest.versao || "") };
    return { tipo: "jogo", url: String(latest.url), sha256: String(latest.sha256), versao: String(latest.versao || ""),
        id: String(latest.versao || "web") + "-" + build };
}
// Baixa o latest.json pelo HTTP nativo do Capacitor (o GitHub não libera CORS para a WebView); fora dele, fetch.
async function lerLatestDoApp() {
    const url = APP_BUNDLE_LATEST_URL + "?t=" + Date.now();
    const http = pluginDoApp("CapacitorHttp");
    if (http) {
        const r = await http.get({ url, headers: { "Cache-Control": "no-cache" }, responseType: "json" });
        if (!r || r.status === 404) return null;
        if (r.status < 200 || r.status >= 300) throw new Error("HTTP " + r.status);
        return typeof r.data === "string" ? JSON.parse(r.data) : r.data;
    }
    const r = await fetch(url, { cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
}
// Troca para o pacote baixado só quando é seguro (fora da luta/tutorial/pausa e sem janela aberta).
function trocarPacoteQuandoSeguro(updater, id) {
    if (typeof closeUpdatesModal === "function") { try { closeUpdatesModal(); } catch (e) {} }
    const tentar = () => {
        if (!isSafeToReloadForUpdate()) { setTimeout(tentar, 1000); return; }
        updater.set({ id });
    };
    tentar();
}
let appReadyAvisado = false;
function avisarQueOJogoAbriu() {
    if (appReadyAvisado || !jogoNoApk()) return;
    const updater = pluginDoApp("CapacitorUpdater");
    if (!updater) return;
    // só avisa se o jogo carregou de verdade (scripts principais vivos); senão o plugin volta para a versão anterior
    if (typeof gameState === "undefined" || typeof render !== "function" || typeof setGameState !== "function") return;
    appReadyAvisado = true;
    try { updater.notifyAppReady(); } catch (e) {}
}
async function procurarAtualizacaoNoApp() {
    if (atualizandoAgora) return;
    atualizandoAgora = true;
    const botao = document.getElementById("btn-atualizar-jogo");
    const rotulo = document.getElementById("btn-atualizar-rotulo");
    const fim = (texto) => {
        if (botao) { botao.classList.remove("girando"); botao.disabled = false; }
        atualizandoAgora = false;
        if (rotulo) rotulo.textContent = texto;
        if (texto !== "ATUALIZAR") setTimeout(atualizarRotuloDoBotao, 3000);
    };
    if (botao) { botao.classList.add("girando"); botao.disabled = true; }
    if (rotulo) rotulo.textContent = "VERIFICANDO...";
    let decisao;
    try {
        const latest = await lerLatestDoApp();
        decisao = latest === null ? { tipo: "nada" }
            : decidirAtualizacaoNoApp(latest, { build: versaoWebCarregada().build, nativo: await versaoNativaInstalada() });
    } catch (e) { decisao = { tipo: "offline" }; }
    if (decisao.tipo === "nada") return fim("JÁ ESTÁ ATUALIZADO");
    if (decisao.tipo === "offline") return fim("SEM CONEXÃO");
    if (decisao.tipo === "erro") return fim("ERRO AO ATUALIZAR");
    fim("ATUALIZAR");
    if (decisao.tipo === "apk") {
        const baixar = () => { try { location.href = decisao.url; } catch (e) {} };
        if (typeof showSystemConfirm === "function") showSystemConfirm("NOVA VERSÃO",
            "Esta versão do jogo precisa do app novo. Baixar o APK agora? Depois é só instalar por cima: o progresso continua salvo.",
            baixar, "BAIXAR", "AGORA NÃO");
        return;
    }
    const updater = pluginDoApp("CapacitorUpdater");
    if (!updater) return fim("ERRO AO ATUALIZAR");
    const atualizar = async () => {
        atualizandoAgora = true;
        if (botao) { botao.classList.add("girando"); botao.disabled = true; }
        if (rotulo) rotulo.textContent = "BAIXANDO...";
        try {
            const pacote = await updater.download({ url: decisao.url, version: decisao.id, checksum: decisao.sha256 });
            if (rotulo) rotulo.textContent = "ATUALIZANDO...";
            trocarPacoteQuandoSeguro(updater, pacote.id);
        } catch (e) {
            fim("ERRO AO ATUALIZAR");   // download/sha256 falhou: o jogo atual continua como estava
        }
    };
    if (typeof showSystemConfirm === "function") showSystemConfirm("ATUALIZAR AGORA?",
        "Saiu a versão " + decisao.versao + " do jogo. Atualizar agora? O jogo baixa a versão nova e reinicia; o progresso continua salvo.",
        atualizar, "ATUALIZAR", "AGORA NÃO");
    else atualizar();
}

async function atualizarJogoAgora() {
    if (jogoNoApk()) return procurarAtualizacaoNoApp();
    if (!jogoEstaInstalado()) return baixarApp();
    if (atualizandoAgora) return;
    atualizandoAgora = true;
    const botao = document.getElementById("btn-atualizar-jogo");
    const rotulo = document.getElementById("btn-atualizar-rotulo");
    if (botao) { botao.classList.add("girando"); botao.disabled = true; }
    if (rotulo) rotulo.textContent = "VERIFICANDO...";
    const novaLista = typeof fetch === "function" ? await lerListaUpdatesDoServidor() : null;
    const mudou = novaLista !== null && novaLista !== textoListaUpdates(document);
    if (mudou) {
        if (rotulo) rotulo.textContent = "ATUALIZANDO...";
        try {
            await Promise.all(getGameFileUrls().map(url => fetch(url, { cache: "reload" }).catch(() => null)));
        } catch (e) {}
        try { sessionStorage.setItem("saiyan_atualizou_em", String(Date.now())); } catch (e) {}
        location.reload();
        return;
    }
    if (botao) { botao.classList.remove("girando"); botao.disabled = false; }
    if (rotulo) rotulo.textContent = novaLista === null ? "SEM CONEXÃO" : "JÁ ESTÁ ATUALIZADO";
    setTimeout(atualizarRotuloDoBotao, 3000);
    atualizandoAgora = false;
}

// Verificação automática só no site (no APK, nunca: lá só a setinha procura versão nova).
if (typeof fetch === "function" && typeof location !== "undefined" && /^https?:/.test(location.protocol) && !jogoNoApk()) {
    setTimeout(() => checkForGameUpdate(true), 3000);
    setInterval(() => checkForGameUpdate(true), UPDATE_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForGameUpdate(); });
}

// APK: confirma ao plugin de atualização que este pacote do jogo abriu bem (senão ele volta para o anterior).
if (jogoNoApk()) avisarQueOJogoAbriu();
