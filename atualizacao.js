// ==================== ATUALIZACAO.JS - JOGO SE ATUALIZA SOZINHO ====================
// Quando sai uma versão nova no GitHub Pages, o celular pode continuar rodando a cópia antiga guardada pelo
// navegador (até uns 10 minutos, ou mais numa aba/app que ficou aberto). Aqui o jogo confere, de tempos em
// tempos, se algum arquivo mudou no servidor — só pergunta (HEAD), sem baixar nada — e, se mudou, baixa os
// arquivos novos e recarrega sozinho. Nunca recarrega no meio da luta ou com uma janela aberta (ex.: editor
// com alterações não salvas): espera voltar a um menu. Personagens, conquistas e recordes ficam no
// localStorage e não se perdem.
// Carregar por último (usa gameState/isModalCoveringScreen do menu.js).

const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;   // de 10 em 10 minutos com o jogo aberto
const UPDATE_MIN_GAP_MS = 2 * 60 * 1000;           // e ao voltar para o jogo, no máximo a cada 2 minutos
let lastUpdateCheck = 0;
let updateCheckRunning = false;
let updatePending = false;

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
async function atualizarJogoAgora() {
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
    setTimeout(() => { if (rotulo && !atualizandoAgora) rotulo.textContent = "ATUALIZAR"; }, 3000);
    atualizandoAgora = false;
}

if (typeof fetch === "function" && typeof location !== "undefined" && /^https?:/.test(location.protocol)) {
    setTimeout(() => checkForGameUpdate(true), 3000);
    setInterval(() => checkForGameUpdate(true), UPDATE_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForGameUpdate(); });
}
