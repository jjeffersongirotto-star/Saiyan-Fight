// arquivos.js — ARQUIVOS DE PERSONAGEM (v0.91): exportar um personagem num arquivo .saiyan.json e anexar (importar)
// arquivos feitos no jogo ou fora dele. É um arquivo de DADOS (JSON), nunca código: nada nele é executado, então um
// arquivo de fora não consegue quebrar o jogo. O formato está em formatos/LEIA-ME.md (com exemplos).
//
// Três jeitos de desenhar o personagem (um só por arquivo):
//   builderAppearance (+ transformations) — feito no CONSTRUTOR (refeito pelo sprites.js ao carregar)
//   minionClassico { modelo, cores }      — Saibaman / Cell Jr. clássicos (minions.js)
//   animations { idle: [...], ... }       — quadros prontos: imagens "data:image/..." ou nomes de imagens anexadas junto
//   folha { imagem, largura, altura, movimentos: { idle: [0, 1, 2], ... } } — uma folha de sprites cortada em grade
// Carrega depois de database.js (usa characterDB, saveCharacterData, SUB_ANIM_KEYS...).

const ARQ_FORMATO_PERSONAGEM = "saiyan-fight-personagem";
const ARQ_VERSAO = 1;
const ARQ_TAMANHO_MAX = 4 * 1024 * 1024;   // 4 MB (o armazenamento do navegador é pequeno)
const ARQ_ALINHAMENTOS = ["HERÓI", "ANTI-HERÓI", "VILÃO", "MINION"];
const ARQ_AURAS = ["gelo", "amarelo", "vermelho", "rosa", "azul", "verde", "preto", "roxo"];
const ARQ_TIROS = ["small", "normal", "large"];
const ARQ_IMAGEM_DADOS = /^data:image\/(png|jpeg|gif|webp|svg\+xml)[;,]/i;

// erro com um detalhe opcional entre colchetes (o texto fixo é traduzido; o detalhe é nome de campo/arquivo)
function arqErro(msg, detalhe) { return detalhe === undefined ? msg : `${msg} [${detalhe}]`; }
function arqNomeImagem(n) { return String(n || "").trim().toLowerCase().replace(/^.*[\\/]/, ""); }

// ---------- exportar ----------
function dadosDoPersonagemParaArquivo(key) {
    const c = characterDB[key];
    if (!c) return null;
    const p = {
        name: c.name, alignment: c.alignment || "HERÓI", aura: c.aura || "gelo", special: c.special || "",
        projColor: c.projColor || "#00ffff", projSize: c.projSize || "normal",
        altura: typeof getAlturaPersonagem === "function" ? getAlturaPersonagem(key, 0) : (c.altura || 175)
    };
    if (c.minionClassico) p.minionClassico = normalizarMinionClassico(c.minionClassico);
    else if (c.builderAppearance) {
        p.builderAppearance = normalizeAppearance(c.builderAppearance);
        p.transformations = JSON.parse(JSON.stringify(getCharacterTransformations(key)));
    } else {
        p.animations = {};
        SUB_ANIM_KEYS.forEach(k => { const l = c.animations && c.animations[k]; if (Array.isArray(l) && l.length) p.animations[k] = l.slice(); });
        if (!p.animations.idle && c.defaultUrl) p.animations.idle = [c.defaultUrl];
        if (c.fpsSettings) p.fpsSettings = Object.assign({}, c.fpsSettings);
        if (Array.isArray(c.transformations)) p.transformations = JSON.parse(JSON.stringify(c.transformations));
    }
    return { formato: ARQ_FORMATO_PERSONAGEM, versao: ARQ_VERSAO, personagem: p };
}
function arqNomeDoArquivo(nome, ext) {
    const base = String(nome || "personagem").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return (base || "personagem") + ext;
}
function arqBaixar(texto, nomeArquivo) {
    const blob = new Blob([texto], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nomeArquivo;
    (document.getElementById("game-container") || document.body).appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); if (a.remove) a.remove(); }, 1000);
}
function exportarPersonagemEditado() {
    if (!editingKey || !characterDB[editingKey]) return showSystemAlert("ARQUIVO", "SALVE O PERSONAGEM ANTES DE EXPORTAR O ARQUIVO.");
    const dados = dadosDoPersonagemParaArquivo(editingKey);
    arqBaixar(JSON.stringify(dados, null, 2), arqNomeDoArquivo(dados.personagem.name, ".saiyan.json"));
}

// ---------- validar (sem DOM: testável) ----------
// Confere a estrutura e devolve { erro } ou { p } com o personagem limpo. Imagens por nome ficam como nome (a
// troca pelas imagens anexadas é em resolverImagensDoArquivo).
function validarArquivoPersonagem(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) return { erro: "ESTE ARQUIVO NÃO É DE PERSONAGEM DO SAIYAN FIGHT." };
    if (dados.formato !== ARQ_FORMATO_PERSONAGEM || !dados.personagem || typeof dados.personagem !== "object") return { erro: "ESTE ARQUIVO NÃO É DE PERSONAGEM DO SAIYAN FIGHT." };
    if (!(Number(dados.versao) >= 1)) return { erro: arqErro("VERSÃO DO ARQUIVO INVÁLIDA", dados.versao) };
    if (Number(dados.versao) > ARQ_VERSAO) return { erro: "ARQUIVO FEITO POR UMA VERSÃO MAIS NOVA DO JOGO. ATUALIZE O JOGO." };
    const d = dados.personagem;
    const nome = typeof d.name === "string" ? d.name.trim().toUpperCase().slice(0, 30) : "";
    if (!nome) return { erro: "FALTA O NOME DO PERSONAGEM (name)." };
    const alinhamento = d.alignment === undefined ? "HERÓI" : String(d.alignment).toUpperCase();
    if (!ARQ_ALINHAMENTOS.includes(alinhamento)) return { erro: arqErro("ALINHAMENTO INVÁLIDO", d.alignment) };
    const aura = d.aura === undefined ? "amarelo" : String(d.aura).toLowerCase();
    if (!ARQ_AURAS.includes(aura)) return { erro: arqErro("COR DA AURA INVÁLIDA", d.aura) };
    const p = {
        name: nome, alignment: alinhamento, aura,
        special: typeof d.special === "string" && d.special.trim() ? d.special.trim().toUpperCase().slice(0, 30) : "KAMEHAMEHA",
        projColor: typeof d.projColor === "string" && /^#[0-9a-f]{6}$/i.test(d.projColor) ? d.projColor : "#00ffff",
        projSize: ARQ_TIROS.includes(d.projSize) ? d.projSize : "normal",
        altura: Math.max(50, Math.min(500, Math.round(Number(d.altura)) || 175))
    };
    const fontes = ["builderAppearance", "minionClassico", "animations", "folha"].filter(k => d[k] !== undefined && d[k] !== null);
    if (!fontes.length) return { erro: "FALTA O DESENHO: builderAppearance, minionClassico, animations OU folha." };
    if (fontes.length > 1) return { erro: arqErro("USE SÓ UM DESENHO POR ARQUIVO", fontes.join(", ")) };
    const fonte = fontes[0];
    if (fonte === "builderAppearance") {
        if (typeof d.builderAppearance !== "object" || Array.isArray(d.builderAppearance)) return { erro: arqErro("DESENHO INVÁLIDO", "builderAppearance") };
        p.builderAppearance = d.builderAppearance;
    } else if (fonte === "minionClassico") {
        const mc = normalizarMinionClassico(d.minionClassico);
        if (!mc) return { erro: arqErro("MODELO DE MINION DESCONHECIDO", typeof d.minionClassico === "object" ? d.minionClassico.modelo : d.minionClassico) };
        p.minionClassico = mc;
    } else if (fonte === "animations") {
        const a = d.animations;
        if (typeof a !== "object" || Array.isArray(a)) return { erro: arqErro("DESENHO INVÁLIDO", "animations") };
        const desconhecido = Object.keys(a).find(k => !SUB_ANIM_KEYS.includes(k));
        if (desconhecido) return { erro: arqErro("MOVIMENTO DESCONHECIDO", desconhecido) };
        if (!Array.isArray(a.idle) || !a.idle.length) return { erro: "FALTA O MOVIMENTO idle (PARADO)." };
        for (const k of Object.keys(a)) {
            if (!Array.isArray(a[k]) || a[k].some(u => typeof u !== "string" || !u.trim())) return { erro: arqErro("LISTA DE QUADROS INVÁLIDA", k) };
        }
        p.animations = {};
        Object.keys(a).forEach(k => { p.animations[k] = a[k].map(u => u.trim()); });
    } else {
        const f = d.folha;
        if (typeof f !== "object" || Array.isArray(f) || typeof f.imagem !== "string") return { erro: arqErro("DESENHO INVÁLIDO", "folha") };
        const largura = Math.round(Number(f.largura)), altura = Math.round(Number(f.altura));
        if (!(largura > 0) || !(altura > 0)) return { erro: "FOLHA DE SPRITES: largura E altura DO QUADRO PRECISAM SER NÚMEROS MAIORES QUE ZERO." };
        const mov = f.movimentos;
        if (typeof mov !== "object" || Array.isArray(mov) || !mov) return { erro: arqErro("DESENHO INVÁLIDO", "folha.movimentos") };
        const desconhecido = Object.keys(mov).find(k => !SUB_ANIM_KEYS.includes(k));
        if (desconhecido) return { erro: arqErro("MOVIMENTO DESCONHECIDO", desconhecido) };
        if (!Array.isArray(mov.idle) || !mov.idle.length) return { erro: "FALTA O MOVIMENTO idle (PARADO)." };
        for (const k of Object.keys(mov)) {
            if (!Array.isArray(mov[k]) || mov[k].some(n => !(Number.isInteger(n) && n >= 0))) return { erro: arqErro("LISTA DE QUADROS INVÁLIDA", k) };
        }
        p.folha = { imagem: f.imagem.trim(), largura, altura, espaco: Math.max(0, Math.round(Number(f.espaco)) || 0), movimentos: mov };
    }
    if (d.fpsSettings && typeof d.fpsSettings === "object") {
        p.fpsSettings = {};
        SUB_ANIM_KEYS.forEach(k => { const v = Number(d.fpsSettings[k]); if (v > 0) p.fpsSettings[k] = Math.max(1, Math.min(60, Math.round(v))); });
    }
    if (d.transformations !== undefined) {
        const t = d.transformations;
        if (!Array.isArray(t) || t.some(x => !x || typeof x !== "object" || (x.diff !== undefined && (typeof x.diff !== "object" || Array.isArray(x.diff))))) return { erro: "TRANSFORMAÇÕES INVÁLIDAS (transformations)." };
        if (t.length) p.transformations = t.slice(0, 12).map((x, i) => ({
            name: typeof x.name === "string" && x.name.trim() ? x.name.trim().slice(0, 30) : `Transformação ${i + 1}`,
            diff: x.diff || {}, ssj: !!x.ssj, aura: ARQ_AURAS.includes(x.aura) ? x.aura : "amarelo",
            ...(Number(x.altura) > 0 ? { altura: Math.max(50, Math.min(500, Math.round(Number(x.altura)))) } : {})
        }));
    }
    return { p };
}

// ---------- imagens ----------
// troca nomes de imagem pelas imagens anexadas (data URL); devolve o erro da primeira que faltar
function resolverImagemDoArquivo(ref, imagens) {
    if (ARQ_IMAGEM_DADOS.test(ref)) return { url: ref };
    if (/^data:/i.test(ref)) return { erro: arqErro("IMAGEM INVÁLIDA", ref.slice(0, 30)) };
    const url = imagens[arqNomeImagem(ref)];
    return url ? { url } : { erro: arqErro("IMAGEM NÃO ENCONTRADA. ANEXE A IMAGEM JUNTO COM O ARQUIVO", ref) };
}
function carregarImagemArq(url) {
    return new Promise(res => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => res(null);
        img.src = url;
    });
}
// recorta a folha em quadros (grade: largura x altura, com espaco entre eles; numerados da esquerda para a direita)
async function cortarFolhaDoArquivo(folha, imagens) {
    const r = resolverImagemDoArquivo(folha.imagem, imagens);
    if (r.erro) return r;
    const img = await carregarImagemArq(r.url);
    if (!img || !img.naturalWidth) return { erro: arqErro("IMAGEM INVÁLIDA", folha.imagem) };
    const passoX = folha.largura + folha.espaco, passoY = folha.altura + folha.espaco;
    const colunas = Math.max(1, Math.floor((img.naturalWidth + folha.espaco) / passoX));
    const linhas = Math.max(1, Math.floor((img.naturalHeight + folha.espaco) / passoY));
    const cache = {}, animations = {};
    for (const k of Object.keys(folha.movimentos)) {
        animations[k] = [];
        for (const n of folha.movimentos[k]) {
            if (n >= colunas * linhas) return { erro: arqErro("FOLHA DE SPRITES: QUADRO FORA DA IMAGEM", `${k} ${n}`) };
            if (!cache[n]) {
                const c = document.createElement("canvas");
                c.width = folha.largura; c.height = folha.altura;
                const g = c.getContext("2d");
                g.imageSmoothingEnabled = false;
                g.drawImage(img, (n % colunas) * passoX, Math.floor(n / colunas) * passoY, folha.largura, folha.altura, 0, 0, folha.largura, folha.altura);
                cache[n] = c.toDataURL("image/png");
            }
            animations[k].push(cache[n]);
        }
    }
    return { animations };
}
// personagem validado -> entrada do characterDB (imagens resolvidas, desenho aplicado)
async function montarPersonagemDoArquivo(p, imagens) {
    const c = {
        name: p.name, imageObj: null, alignment: p.alignment, aura: p.aura, special: p.special,
        projColor: p.projColor, projSize: p.projSize, scale: 1, altura: p.altura,
        frameWidth: 32, frameHeight: 32, totalFrames: 1, bgRemoval: { mode: "none" }
    };
    if (p.transformations) c.transformations = p.transformations;
    if (p.minionClassico) return { c: aplicarMinionClassico(c, p.minionClassico) };
    if (p.builderAppearance) {
        c.builderAppearance = normalizeAppearance(p.builderAppearance);
        Object.assign(c, buildProceduralAnimations(c.builderAppearance));
        c.defaultUrl = generateSpriteFrameUrl(c.builderAppearance, "idle", 0);
        return { c };
    }
    let animations;
    if (p.folha) {
        const r = await cortarFolhaDoArquivo(p.folha, imagens);
        if (r.erro) return r;
        animations = r.animations;
    } else {
        animations = {};
        for (const k of Object.keys(p.animations)) {
            animations[k] = [];
            for (const ref of p.animations[k]) {
                const r = resolverImagemDoArquivo(ref, imagens);
                if (r.erro) return r;
                animations[k].push(r.url);
            }
        }
    }
    // movimentos que faltam usam o PARADO (como no editor)
    c.animations = {};
    c.fpsSettings = {};
    SUB_ANIM_KEYS.forEach(k => {
        c.animations[k] = (animations[k] && animations[k].length ? animations[k] : animations.idle).slice();
        c.fpsSettings[k] = (p.fpsSettings && p.fpsSettings[k]) || 12;
    });
    c.defaultUrl = c.animations.idle[0];
    return { c };
}

// ---------- anexar (campo ANEXAR ARQUIVO do editor) ----------
function lerArquivoArq(file, comoDados) {
    return new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => res(null);
        if (comoDados) r.readAsDataURL(file); else r.readAsText(file);
    });
}
// texto do .json + imagens { nome: dataURL } -> adiciona o personagem; devolve { key } ou { erro }
async function importarPersonagemDeTexto(texto, imagens) {
    let dados;
    try { dados = JSON.parse(texto); } catch (e) { return { erro: "O ARQUIVO NÃO É UM JSON VÁLIDO." }; }
    const v = validarArquivoPersonagem(dados);
    if (v.erro) return v;
    const m = await montarPersonagemDoArquivo(v.p, imagens || {});
    if (m.erro) return m;
    const key = "char_" + Date.now();
    characterDB[key] = m.c;
    if (!saveCharacterData()) { delete characterDB[key]; return { erro: "O NAVEGADOR NÃO TEM ESPAÇO PARA SALVAR ESTE PERSONAGEM." }; }
    loadImageSecure(m.c.defaultUrl, (img) => { if (characterDB[key]) characterDB[key].imageObj = img; });
    return { key };
}
async function anexarArquivoPersonagem(input) {
    const files = Array.from((input && input.files) || []);
    if (input) input.value = "";
    if (!files.length) return;
    const jsons = files.filter(f => /\.json$/i.test(f.name));
    if (!jsons.length) return showSystemAlert("ARQUIVO COM ERRO", "ANEXE UM ARQUIVO .json DE PERSONAGEM (PODE JUNTO COM AS IMAGENS).");
    if (jsons.length > 1) return showSystemAlert("ARQUIVO COM ERRO", "ANEXE SÓ UM ARQUIVO .json POR VEZ.");
    if (files.reduce((t, f) => t + (f.size || 0), 0) > ARQ_TAMANHO_MAX) return showSystemAlert("ARQUIVO COM ERRO", "ARQUIVOS GRANDES DEMAIS (MÁXIMO 4 MB NO TOTAL).");
    const texto = await lerArquivoArq(jsons[0], false);
    const imagens = {};
    for (const f of files) {
        if (f === jsons[0]) continue;
        const url = await lerArquivoArq(f, true);
        if (typeof url === "string" && ARQ_IMAGEM_DADOS.test(url)) imagens[arqNomeImagem(f.name)] = url;
    }
    const r = await importarPersonagemDeTexto(texto || "", imagens);
    if (r.erro) return showSystemAlert("ARQUIVO COM ERRO", r.erro);
    const nome = characterDB[r.key].name;
    closeModal();
    showSystemAlert("SUCESSO", `PERSONAGEM ${nome} IMPORTADO!`);
}
