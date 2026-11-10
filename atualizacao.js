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
// ATUALIZAR na janela UPDATES o jogo pergunta à página de Releases do GitHub se saiu um APK mais novo e oferece
// baixá-lo (instala por cima, sem perder o progresso). Sem apertar, o app nunca baixa nem recarrega nada sozinho.

const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;   // de 10 em 10 minutos com o jogo aberto
const UPDATE_MIN_GAP_MS = 2 * 60 * 1000;           // e ao voltar para o jogo, no máximo a cada 2 minutos
let lastUpdateCheck = 0;
let updateCheckRunning = false;
let updatePending = false;

// APK Android: endereço fixo do APK mais novo (a CI publica também com este nome) e a API da última versão.
const APK_DOWNLOAD_URL = "https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/latest/download/Saiyan-Fight.apk";
const APK_RELEASES_API = "https://api.github.com/repos/jjeffersongirotto-star/Saiyan-Fight/releases/latest";
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
    if (jogoNoApk()) return false;   // no APK só a setinha procura versão nova (procurarApkNovo)
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

// APK: só roda quando o jogador aperta a setinha. Pergunta à página de Releases qual é o APK mais novo e, se for
// mais novo que este (VERSAO_APK, gerado em www/versao-apk.js), oferece baixar; nada é baixado sem ele confirmar.
async function procurarApkNovo() {
    if (atualizandoAgora) return;
    atualizandoAgora = true;
    const botao = document.getElementById("btn-atualizar-jogo");
    const rotulo = document.getElementById("btn-atualizar-rotulo");
    if (botao) { botao.classList.add("girando"); botao.disabled = true; }
    if (rotulo) rotulo.textContent = "VERIFICANDO...";
    let novo = null, erro = false;
    try {
        const resposta = await fetch(APK_RELEASES_API, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
        if (resposta && resposta.ok) {
            const rel = await resposta.json();
            const atual = typeof VERSAO_APK === "string" ? VERSAO_APK : "0";
            if (rel && rel.tag_name && compararVersoesApk(rel.tag_name, atual) > 0) {
                const apk = (rel.assets || []).find(a => a && a.name === "Saiyan-Fight.apk") || (rel.assets || []).find(a => a && /\.apk$/i.test(a.name || ""));
                novo = apk && apk.browser_download_url ? apk.browser_download_url : APK_DOWNLOAD_URL;
            }
        } else if (!resposta || resposta.status !== 404) erro = true;   // 404 = ainda não há nenhuma versão publicada
    } catch (e) { erro = true; }
    if (botao) { botao.classList.remove("girando"); botao.disabled = false; }
    atualizandoAgora = false;
    if (novo) {
        if (rotulo) rotulo.textContent = "ATUALIZAR";
        const baixar = () => { try { location.href = novo; } catch (e) {} };
        if (typeof showSystemConfirm === "function") showSystemConfirm("NOVA VERSÃO",
            "Saiu uma versão nova do app. Baixar agora? Depois é só instalar por cima: o progresso continua salvo.",
            baixar, "BAIXAR", "AGORA NÃO");
        else baixar();
        return;
    }
    if (rotulo) rotulo.textContent = erro ? "SEM CONEXÃO" : "JÁ ESTÁ ATUALIZADO";
    setTimeout(atualizarRotuloDoBotao, 3000);
}

async function atualizarJogoAgora() {
    if (jogoNoApk()) return procurarApkNovo();
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
