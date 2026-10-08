// ==================== FASES.JS - ARQUIVOS DAS ARENAS (pasta fases/) ====================
// Cada arena tem um arquivo .json na pasta fases/ (listados em fases/indice.json) com os mesmos campos da cópia
// embutida FASES_PADRAO (game-logic-core.js). O jogo começa sempre com a cópia embutida; quando os arquivos
// carregam (em segundo plano, uma vez), o que estiver neles passa a valer: nome, posição, cor, música, céu claro,
// minion padrão e conquista. Se não carregarem (sem internet, abrindo o index.html direto do computador...),
// nada muda. Ids que ainda não existem no jogo são ignorados por enquanto (o editor/importação de fases vem depois).
// Carrega depois de mapa.js.

// Valida e aplica um arquivo de fase sobre a definição embutida. Devolve true se aplicou.
function aplicarArquivoDeFase(dados) {
    if (!dados || typeof dados !== "object") return false;
    const f = getFaseDef(dados.id);
    if (!f) return false;
    if (typeof dados.nome === "string" && dados.nome.trim()) f.nome = dados.nome.trim().toUpperCase();
    if (Number.isFinite(dados.posicao)) f.posicao = dados.posicao;
    if (typeof dados.cor === "string" && /^#[0-9a-f]{6}$/i.test(dados.cor)) f.cor = dados.cor;
    if (typeof dados.musica === "string" && typeof BGM_THEMES === "object" && BGM_THEMES[dados.musica]) f.musica = dados.musica;
    if (typeof dados.fundoClaro === "boolean") f.fundoClaro = dados.fundoClaro;
    if (typeof dados.minion === "string" && MINIONS_PADRAO.some(m => m.id === dados.minion)) f.minion = dados.minion;
    if (typeof dados.cenario === "string") f.cenario = dados.cenario;
    if (dados.camera && typeof dados.camera === "object") f.camera = { tipo: String(dados.camera.tipo || f.camera.tipo), volta: Number(dados.camera.volta) || 0 };
    if (dados.conquista && typeof dados.conquista.nome === "string") {
        f.conquista = { nome: dados.conquista.nome, desc: String(dados.conquista.desc || "") };
        const c = typeof achievements === "object" && achievements["stage_" + f.id];
        if (c) { c.name = f.conquista.nome; c.desc = f.conquista.desc; }
    }
    return true;
}
// Depois de aplicar os arquivos: refaz a ordem (respeitando a escolhida pelo jogador) e as cores do mapa
function atualizarFasesDosArquivos(lista) {
    let aplicou = 0;
    (lista || []).forEach(d => { if (aplicarArquivoDeFase(d)) aplicou++; });
    if (!aplicou) return 0;
    aplicarOrdemDasFases(getOrdemFasesSalva());
    if (typeof atualizarCoresDasFases === "function") atualizarCoresDasFases();
    return aplicou;
}
function carregarArquivosDeFases() {
    if (typeof fetch !== "function") return Promise.resolve(0);
    const ler = (url) => fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
    return ler("fases/indice.json")
        .then(nomes => Array.isArray(nomes) ? Promise.all(nomes.filter(n => typeof n === "string" && /^[\w-]+\.json$/.test(n)).map(n => ler("fases/" + n))) : [])
        .then(atualizarFasesDosArquivos)
        .catch(() => 0);
}
carregarArquivosDeFases();
