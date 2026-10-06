// ============================================================================
// conjuntos.js — CONJUNTOS DE SPRITES de cada personagem (aba ANIMAÇÕES do editor).
//
// ORIGINAL (botão dourado, sempre existe) = as animações do próprio personagem (desenho do jogo ou sprite sheet).
// FORMAS = conjuntos de quadros montados pelo jogador: "base" ou "transformação N" (só a próxima depois da última).
// GRUPOS (botões azuis) = 1 forma base + transformação 1 (+ as seguintes, opcionais). O personagem usa o ORIGINAL
// ou um grupo (spriteActive). Na luta, o grupo ativo dá a base e cada TRANSFORMAR sobe uma transformação; acabando,
// fica na última. Uma base sozinha não pode ser usada.
//
// Guardado no personagem: spriteForms [{ id, tipo:"base"|"transf", nivel, fps, animations | pacote+variante }],
// spriteGroups [{ id, nome, base, transfs:[ids] }], spriteActive ("original" | id do grupo).
// Os quadros das formas do jogador ficam no IndexedDB (cabem bem mais que os ~5 MB do localStorage); as formas
// de pacotes embutidos (ex.: Vegeta) vêm de conjuntos/<nome>.json, carregado só quando é preciso.
//
// Carrega ANTES do database.js (que chama estas funções ao salvar/carregar). Nada aqui roda no carregamento.
// ============================================================================

const CONJ_ESTADOS = ["idle", "flyRight", "flyLeft", "flyDown", "flyUp", "flyUpRight", "flyUpLeft", "flyDownRight", "flyDownLeft", "parry", "attackKi", "chargeKi", "transform"];
const CONJ_FPS_PADRAO = 12;

// ---------------------------------------------------------------------------------------------------------------
// Pacotes embutidos: quadros recortados prontos, com a geometria para ficarem do tamanho dos lutadores do jogo
// (pés na linha 103 do quadro 96x112 e o centro em x=48, como os desenhos de sprites.js).
// ---------------------------------------------------------------------------------------------------------------
const CONJ_PACOTES = {
    vegeta: { arquivo: "conjuntos/vegeta.json", personagem: "vegeta", nome: "VEGETA SPRITES", marca: "saiyan_conjunto_vegeta" }
};
const conjPacoteDados = {};        // nome -> { normal: { estado: [urls] }, ssj: {...}, fps }
const conjPacoteCarregando = {};

// Cada quadro vira um SVG com a imagem recortada na posição/escala certas e "crispEdges": a luta trata como os
// outros lutadores em pixel art (mesmo tamanho na tela e pés no chão).
function conjEmbrulharQuadro(d, q) {
    const [x, y, w, h, b64] = q, k = d.k || 1;
    const n = (v) => Math.round(v * 100) / 100;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="168" viewBox="0 0 96 112" shape-rendering="crispEdges">` +
        `<image x="${n(48 + (x - d.centroX) / k)}" y="${n(103 + (y - d.pesY) / k)}" width="${n(w / k)}" height="${n(h / k)}" preserveAspectRatio="none" ` +
        `style="image-rendering:pixelated" href="data:image/png;base64,${b64}"/></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function conjRegistrarPacote(nome, d) {
    const pronto = { fps: d.fps || 10 };
    ["normal", "ssj"].forEach(v => {
        if (!d[v]) return;
        pronto[v] = {};
        CONJ_ESTADOS.forEach(st => { pronto[v][st] = (d[v][st] || []).map(q => conjEmbrulharQuadro(d, q)); });
    });
    conjPacoteDados[nome] = pronto;
    conjPacoteCarregando[nome] = false;
    conjAoMudar();
}

function conjCarregarPacote(nome) {
    const p = CONJ_PACOTES[nome];
    if (!p || conjPacoteDados[nome] || conjPacoteCarregando[nome] || typeof fetch !== "function") return;
    conjPacoteCarregando[nome] = true;
    try {
        fetch(p.arquivo).then(r => r.json()).then(d => conjRegistrarPacote(nome, d)).catch(() => { conjPacoteCarregando[nome] = false; });
    } catch (e) { conjPacoteCarregando[nome] = false; }
}

// Algo mudou (pacote carregou, formas lidas do IndexedDB): refaz a área do editor e deixa os lutadores serem
// preparados de novo com os quadros certos.
function conjAoMudar() {
    if (conjTemp && typeof document !== "undefined") renderConjuntos();
    if (typeof backgroundWork !== "undefined" && backgroundWork) backgroundWork.warmedFor = null;
}

// ---------------------------------------------------------------------------------------------------------------
// Quadros de uma forma / do grupo ativo (usado pela luta: getCharacterAnimationFrames em gameplay.js)
// ---------------------------------------------------------------------------------------------------------------
function conjQuadrosDaForma(f, st) {
    if (!f) return null;
    let a = f.animations;
    if (f.pacote) {
        const p = conjPacoteDados[f.pacote];
        if (!p) { conjCarregarPacote(f.pacote); return null; }
        a = p[f.variante];
    }
    if (!a) return null;
    if (Array.isArray(a[st]) && a[st].length) return a[st];
    return Array.isArray(a.idle) && a.idle.length ? a.idle : null;
}

function conjFormaPorId(formas, id) { return (formas || []).find(f => f && f.id === id) || null; }

function conjGrupoAtivo(c) {
    if (!c || !c.spriteActive || c.spriteActive === "original") return null;
    return (c.spriteGroups || []).find(g => g && g.id === c.spriteActive) || null;
}

// nível 0 = base; nível N = transformação N do grupo (passando do fim, fica na última)
function conjFormaDoNivel(c, g, nivel) {
    const t = g.transfs || [];
    const id = nivel > 0 && t.length ? t[Math.min(nivel, t.length) - 1] : g.base;
    return conjFormaPorId(c.spriteForms, id);
}

function conjuntoQuadros(charKey, st, nivel) {
    const c = typeof characterDB !== "undefined" ? characterDB[charKey] : null;
    const g = conjGrupoAtivo(c);
    if (!g) return null;
    return conjQuadrosDaForma(conjFormaDoNivel(c, g, nivel | 0), st);
}

function conjuntoFps(charKey, st, nivel) {
    const c = typeof characterDB !== "undefined" ? characterDB[charKey] : null;
    const g = conjGrupoAtivo(c);
    if (!g) return null;
    const f = conjFormaDoNivel(c, g, nivel | 0);
    if (!f) return null;
    if (f.pacote) return (conjPacoteDados[f.pacote] && conjPacoteDados[f.pacote].fps) || 10;
    return (f.fps && f.fps[st]) || CONJ_FPS_PADRAO;
}

// ---------------------------------------------------------------------------------------------------------------
// IndexedDB: os quadros das formas do jogador (imagens) ficam fora do localStorage
// ---------------------------------------------------------------------------------------------------------------
let conjIdbPromessa = null;
function conjIdb() {
    if (typeof indexedDB === "undefined" || !indexedDB) return Promise.resolve(null);
    if (!conjIdbPromessa) {
        conjIdbPromessa = new Promise(resolve => {
            try {
                const req = indexedDB.open("saiyan_conjuntos", 1);
                req.onupgradeneeded = () => { try { req.result.createObjectStore("formas"); } catch (e) { /* já existe */ } };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            } catch (e) { resolve(null); }
        });
    }
    return conjIdbPromessa;
}
function conjIdbFazer(modo, acao) {
    return conjIdb().then(db => new Promise(resolve => {
        if (!db) return resolve(null);
        try {
            const tx = db.transaction("formas", modo), loja = tx.objectStore("formas"), req = acao(loja);
            tx.oncomplete = () => resolve(req ? req.result : true);
            tx.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
    }));
}
const conjIdbSalvar = (id, dados) => conjIdbFazer("readwrite", l => l.put(dados, id));
const conjIdbApagar = (id) => conjIdbFazer("readwrite", l => l.delete(id));
function conjIdbLerTudo() {
    return conjIdb().then(db => new Promise(resolve => {
        if (!db) return resolve(null);
        try {
            const tudo = {}, req = db.transaction("formas", "readonly").objectStore("formas").openCursor();
            req.onsuccess = () => { const cur = req.result; if (cur) { tudo[cur.key] = cur.value; cur.continue(); } else resolve(tudo); };
            req.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
    }));
}

// Como a forma vai para o localStorage (saveCharacterData): sem as imagens, que vão para o IndexedDB. Sem
// IndexedDB (navegador antigo), as imagens ficam junto, como era antes.
function conjFormaParaSalvar(f) {
    const r = Object.assign({}, f);
    if (f.pacote || !f.animations) return r;
    if (typeof indexedDB === "undefined" || !indexedDB) return r;
    if (!f.__noIdb) {
        conjIdbSalvar(f.id, { animations: f.animations, fps: f.fps || {} });
        Object.defineProperty(f, "__noIdb", { value: true, enumerable: false, configurable: true });
    }
    delete r.animations;
    r.noIdb = true;
    return r;
}

// Depois de carregar os personagens: põe os pacotes embutidos (uma vez) e busca as imagens no IndexedDB.
function conjuntosAoCarregar() {
    if (typeof characterDB === "undefined") return;
    let mudou = false;
    for (const nome in CONJ_PACOTES) {
        const p = CONJ_PACOTES[nome], c = characterDB[p.personagem];
        if (!c || readStorage(p.marca) === "1") continue;
        writeStorage(p.marca, "1");
        c.spriteForms = (c.spriteForms || []).filter(f => f.pacote !== nome);
        const base = { id: "pk_" + nome + "_base", tipo: "base", nivel: 0, pacote: nome, variante: "normal" };
        const t1 = { id: "pk_" + nome + "_t1", tipo: "transf", nivel: 1, pacote: nome, variante: "ssj" };
        c.spriteForms.push(base, t1);
        c.spriteGroups = (c.spriteGroups || []).filter(g => g.id !== "g_" + nome);
        c.spriteGroups.push({ id: "g_" + nome, nome: p.nome, base: base.id, transfs: [t1.id] });
        if (!c.spriteActive) c.spriteActive = "original";
        mudou = true;
    }
    if (mudou && typeof saveCharacterData === "function") saveCharacterData();
    const faltando = [];
    for (const k in characterDB) (characterDB[k].spriteForms || []).forEach(f => { if (f.noIdb && !f.animations) faltando.push(f); });
    if (faltando.length) conjIdbLerTudo().then(tudo => {
        if (!tudo) return;
        faltando.forEach(f => {
            const d = tudo[f.id];
            if (!d) return;
            f.animations = d.animations;
            if (d.fps) f.fps = d.fps;
            Object.defineProperty(f, "__noIdb", { value: true, enumerable: false, configurable: true });
        });
        conjAoMudar();
    });
}

// ---------------------------------------------------------------------------------------------------------------
// EDITOR (aba ANIMAÇÕES): cópia de trabalho; só vai para o personagem ao SALVAR PERSONAGEM
// ---------------------------------------------------------------------------------------------------------------
let conjTemp = null;      // { formas, grupos, ativo }
let conjEdicao = null;    // forma em montagem: { formaId (null = nova), stash: { anim, fps, salvos } }
const conjMarcadas = new Set();
let conjIconeN = 0;

function conjAbrirEditor(c) {
    conjTemp = {
        formas: (c && c.spriteForms ? c.spriteForms : []).map(f => f),
        grupos: (c && c.spriteGroups ? c.spriteGroups : []).map(g => Object.assign({}, g, { transfs: (g.transfs || []).slice() })),
        ativo: (c && c.spriteActive) || "original"
    };
    conjEdicao = null;
    conjMarcadas.clear();
    renderConjuntos();
}

function conjFecharEditor() { conjTemp = null; conjEdicao = null; conjMarcadas.clear(); }

function conjEstaEditando() { return !!conjEdicao; }

// Botões que mexem nos quadros só funcionam montando uma forma (o ORIGINAL não é alterado por eles).
function conjExigirEdicao() {
    if (conjEstaEditando()) return true;
    showSystemAlert("MONTE UMA FORMA", "TOQUE EM NOVA FORMA (OU EDITAR, NUMA FORMA JÁ CRIADA) PARA MEXER NOS QUADROS. ADICIONAR QUADRO AO MOVIMENTO JÁ COMEÇA UMA FORMA NOVA.");
    return false;
}

// Aplicado no personagem ao salvar (saveCharacterFromModal); formas apagadas saem também do IndexedDB.
function conjAplicarNoPersonagem(c, anteriores) {
    if (!conjTemp || !c) return;
    const ids = new Set(conjTemp.formas.map(f => f.id));
    (anteriores || []).forEach(f => { if (f && !f.pacote && !ids.has(f.id)) conjIdbApagar(f.id); });
    c.spriteForms = conjTemp.formas.slice();
    c.spriteGroups = conjTemp.grupos.map(g => Object.assign({}, g, { transfs: g.transfs.slice() }));
    c.spriteActive = conjTemp.grupos.some(g => g.id === conjTemp.ativo) ? conjTemp.ativo : "original";
}

function conjNomeForma(f) { return f.tipo === "base" ? "FORMA BASE" : "TRANSFORMAÇÃO " + f.nivel; }

function conjMaiorNivel(excetoId) {
    return conjTemp.formas.filter(f => f.tipo === "transf" && f.id !== excetoId).reduce((m, f) => Math.max(m, f.nivel), 0);
}

function conjNovaForma(silencioso) {
    if (!conjTemp || conjEstaEditando()) return;
    conjIniciarEdicao(null, null);
    if (!silencioso) conjStatus("Montando uma forma nova: adicione os quadros de cada movimento e toque em SALVAR FORMA.");
}

function conjEditarForma(id) {
    const f = conjFormaPorId(conjTemp && conjTemp.formas, id);
    if (!f || conjEstaEditando()) return;
    if (f.pacote && !conjPacoteDados[f.pacote]) {
        conjCarregarPacote(f.pacote);
        return showSystemAlert("CARREGANDO", "OS QUADROS DESTA FORMA AINDA ESTÃO CARREGANDO. TENTE DE NOVO EM UM INSTANTE.");
    }
    const fonte = f.pacote ? conjPacoteDados[f.pacote][f.variante] : (f.animations || {});
    const anim = {};
    CONJ_ESTADOS.forEach(st => { anim[st] = Array.from(fonte[st] || []); });
    const fps = {};
    CONJ_ESTADOS.forEach(st => { fps[st] = f.pacote ? ((conjPacoteDados[f.pacote] && conjPacoteDados[f.pacote].fps) || 10) : ((f.fps && f.fps[st]) || CONJ_FPS_PADRAO); });
    conjIniciarEdicao(f.id, { anim, fps });
    conjStatus("Editando " + conjNomeForma(f) + ". Toque em SALVAR FORMA para guardar.");
}

function conjIniciarEdicao(formaId, conteudo) {
    conjEdicao = { formaId, stash: { anim: tempAnimations, fps: tempFps, salvos: savedSpriteMotionPreviewFrames } };
    tempAnimations = {};
    tempFps = {};
    CONJ_ESTADOS.forEach(st => {
        tempAnimations[st] = conteudo ? Array.from(conteudo.anim[st] || []) : [];
        tempFps[st] = conteudo ? conteudo.fps[st] : CONJ_FPS_PADRAO;
    });
    savedSpriteMotionPreviewFrames = {};
    spriteMotionPreviewFrame = 0;
    if (typeof selectedPreviewFrameIndices !== "undefined") selectedPreviewFrameIndices.clear();
    conjAtualizarTudo();
}

function conjTerminarEdicao() {
    if (!conjEdicao) return;
    const s = conjEdicao.stash;
    tempAnimations = s.anim;
    tempFps = s.fps;
    savedSpriteMotionPreviewFrames = s.salvos;
    conjEdicao = null;
    spriteMotionPreviewFrame = 0;
    if (typeof selectedPreviewFrameIndices !== "undefined") selectedPreviewFrameIndices.clear();
    conjAtualizarTudo();
}

function conjCancelarForma() {
    conjTerminarEdicao();
    conjStatus("Forma descartada.");
}

function conjSalvarForma() {
    if (!conjEdicao) return;
    const sel = document.getElementById("conj-salvar-como");
    const escolha = sel ? sel.value : "base";
    const anim = {};
    CONJ_ESTADOS.forEach(st => { anim[st] = Array.from(savedSpriteMotionPreviewFrames[st] || tempAnimations[st] || []).filter(Boolean); });
    if (!anim.idle.length) return showSystemAlert("FALTA O PARADO", "COLOQUE PELO MENOS UM QUADRO NO MOVIMENTO PARADO ANTES DE SALVAR A FORMA.");
    const fps = {};
    CONJ_ESTADOS.forEach(st => { fps[st] = tempFps[st] || CONJ_FPS_PADRAO; });
    const nivel = escolha === "base" ? 0 : Number(escolha);
    if (nivel > conjMaiorNivel(conjEdicao.formaId) + 1) return showSystemAlert("TRANSFORMAÇÃO", "CRIE AS TRANSFORMAÇÕES EM ORDEM: SÓ A PRÓXIMA DEPOIS DA ÚLTIMA.");
    const forma = { id: conjEdicao.formaId || ("f_" + Date.now() + "_" + Math.floor(Math.random() * 1e4)), tipo: nivel ? "transf" : "base", nivel, fps, animations: anim };
    const i = conjTemp.formas.findIndex(f => f.id === forma.id);
    if (i >= 0) conjTemp.formas[i] = forma; else conjTemp.formas.push(forma);
    // a forma editada mudou de nível: grupos que a usavam como transformação/base deixam de ser válidos
    conjTemp.grupos = conjTemp.grupos.filter(g => conjGrupoValido(g));
    if (!conjTemp.grupos.some(g => g.id === conjTemp.ativo)) conjTemp.ativo = "original";
    conjTerminarEdicao();
    conjStatus(conjNomeForma(forma) + " salva. Toque em SALVAR PERSONAGEM para guardar tudo.");
}

function conjGrupoValido(g) {
    const base = conjFormaPorId(conjTemp.formas, g.base);
    if (!base || base.tipo !== "base" || !g.transfs.length) return false;
    return g.transfs.every((id, i) => { const f = conjFormaPorId(conjTemp.formas, id); return f && f.tipo === "transf" && f.nivel === i + 1; });
}

function conjApagarForma(id) {
    const f = conjFormaPorId(conjTemp.formas, id);
    if (!f) return;
    const usados = conjTemp.grupos.filter(g => g.base === id || g.transfs.includes(id));
    const aviso = usados.length ? ` ELA ESTÁ EM ${usados.map(g => g.nome).join(", ")}, QUE TAMBÉM SERÁ APAGADO.` : "";
    showSystemConfirm("APAGAR FORMA", `APAGAR ${conjNomeForma(f)}?${aviso}`, () => {
        conjTemp.formas = conjTemp.formas.filter(x => x.id !== id);
        conjTemp.grupos = conjTemp.grupos.filter(g => !usados.includes(g));
        if (!conjTemp.grupos.some(g => g.id === conjTemp.ativo)) conjTemp.ativo = "original";
        conjMarcadas.delete(id);
        renderConjuntos();
    }, "APAGAR", "CANCELAR");
}

function conjApagarGrupo(id) {
    const g = conjTemp.grupos.find(x => x.id === id);
    if (!g) return;
    showSystemConfirm("APAGAR CONJUNTO", `APAGAR O CONJUNTO ${g.nome}? AS FORMAS CONTINUAM SALVAS.`, () => {
        conjTemp.grupos = conjTemp.grupos.filter(x => x.id !== id);
        if (conjTemp.ativo === id) conjTemp.ativo = "original";
        renderConjuntos();
    }, "APAGAR", "CANCELAR");
}

// AGRUPAR: as formas marcadas precisam ter 1 base e a transformação 1 (as seguintes, em ordem, são opcionais)
function conjAgrupar() {
    const formas = conjTemp.formas.filter(f => conjMarcadas.has(f.id));
    const bases = formas.filter(f => f.tipo === "base");
    const transfs = formas.filter(f => f.tipo === "transf").sort((a, b) => a.nivel - b.nivel);
    if (bases.length !== 1) return showSystemAlert("AGRUPAR", "MARQUE UMA FORMA BASE (SÓ UMA).");
    if (!transfs.length || transfs[0].nivel !== 1) return showSystemAlert("AGRUPAR", "MARQUE TAMBÉM A TRANSFORMAÇÃO 1.");
    if (transfs.some((f, i) => f.nivel !== i + 1)) return showSystemAlert("AGRUPAR", "AS TRANSFORMAÇÕES PRECISAM ESTAR EM ORDEM (1, 2, 3...), SEM REPETIR NEM PULAR.");
    const campo = document.getElementById("conj-nome-grupo");
    const nome = (campo && campo.value.trim().toUpperCase()) || ("CONJUNTO " + (conjTemp.grupos.length + 1));
    conjTemp.grupos.push({ id: "g_" + Date.now(), nome, base: bases[0].id, transfs: transfs.map(f => f.id) });
    conjMarcadas.clear();
    if (campo) campo.value = "";
    renderConjuntos();
    conjStatus(`Conjunto ${nome} criado. Toque nele para usar.`);
}

function conjEscolher(id) {
    const g = conjTemp.grupos.find(x => x.id === id);
    const titulo = id === "original" ? "ANIMAÇÕES PADRÃO" : "USAR CONJUNTO";
    const msg = id === "original" ? "VOLTAR ÀS ANIMAÇÕES PADRÃO DO PERSONAGEM?" : `USAR O CONJUNTO ${g ? g.nome : ""}?`;
    showSystemConfirm(titulo, msg + " (VALE AO TOCAR EM SALVAR PERSONAGEM.)", () => {
        conjTemp.ativo = id;
        renderConjuntos();
        conjStatus("Escolhido. Toque em SALVAR PERSONAGEM para confirmar.");
    }, "SIM", "NÃO");
}

function conjMarcar(id, ligado) { if (ligado) conjMarcadas.add(id); else conjMarcadas.delete(id); }

function conjStatus(txt) {
    const el = typeof document !== "undefined" ? document.getElementById("conj-status") : null;
    if (el) el.textContent = txt || "";
}

function conjAtualizarTudo() {
    renderConjuntos();
    if (typeof renderSpriteAssignedFrames === "function") renderSpriteAssignedFrames();
    if (typeof renderSpriteMotionPreview === "function") renderSpriteMotionPreview();
    const fpsEl = typeof document !== "undefined" ? document.getElementById("sprite-active-fps") : null;
    if (fpsEl && typeof activeSpriteMovement !== "undefined") fpsEl.value = tempFps[activeSpriteMovement] || CONJ_FPS_PADRAO;
}

// Desenho do botão: contorno de um lutador forte (pose de força, braços dobrados), com sombreamento.
function conjIcone(cor) {
    const n = ++conjIconeN, P = cor === "azul" ? ["#e8f4ff", "#7cc4ff", "#1d4fa8", "#0b2252"] : ["#fff8d6", "#ffd75e", "#b37a12", "#4a2c05"];
    return `<svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true"><defs><linearGradient id="cjg${n}" x1="0.2" y1="0" x2="0.8" y2="1">` +
        `<stop offset="0" stop-color="${P[0]}"/><stop offset="0.45" stop-color="${P[1]}"/><stop offset="1" stop-color="${P[2]}"/></linearGradient></defs>` +
        `<g fill="url(#cjg${n})" stroke="${P[3]}" stroke-width="2" stroke-linejoin="round">` +
        `<path d="M24 12 L22 4 L28 8 L32 1 L36 8 L42 4 L40 12 Q42 20 32 22 Q22 20 24 12 Z"/>` +
        `<path d="M32 22 Q20 22 15 27 Q9 25 6 19 Q4 14 9 12 Q13 12 13 17 Q15 21 19 22 Q14 31 19 38 L23 44 L20 61 L28 61 L32 48 L36 61 L44 61 L41 44 L45 38 Q50 31 45 22 Q49 21 51 17 Q51 12 55 12 Q60 14 58 19 Q55 25 49 27 Q44 22 32 22 Z"/></g>` +
        `<path d="M25 28 Q32 33 39 28 M32 31 L32 41 M27 36 L37 36" fill="none" stroke="${P[3]}" stroke-width="1.4" opacity="0.7"/>` +
        `<path d="M10 15 Q12 17 14 20 M54 15 Q52 17 50 20" fill="none" stroke="${P[0]}" stroke-width="1.6" opacity="0.8"/></svg>`;
}

function conjEsc(t) { return String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function renderConjuntos() {
    if (typeof document === "undefined") return;
    const linhaC = document.getElementById("conj-linha-conjuntos"), linhaF = document.getElementById("conj-linha-formas");
    if (!linhaC || !linhaF || !conjTemp) return;
    const ativo = conjTemp.ativo;
    let html = `<button type="button" class="conj-btn conj-dourado${ativo === "original" ? " em-uso" : ""}" onclick="conjEscolher('original')" aria-pressed="${ativo === "original"}">` +
        conjIcone("ouro") + `<span class="conj-nome">ORIGINAL</span>${ativo === "original" ? '<span class="conj-tag">EM USO</span>' : ""}</button>`;
    conjTemp.grupos.forEach(g => {
        const usa = ativo === g.id;
        html += `<span class="conj-grupo"><button type="button" class="conj-btn conj-azul${usa ? " em-uso" : ""}" onclick="conjEscolher('${g.id}')" aria-pressed="${usa}">` +
            conjIcone("azul") + `<span class="conj-nome">${conjEsc(g.nome)}</span>${usa ? '<span class="conj-tag">EM USO</span>' : ""}</button>` +
            `<button type="button" class="conj-x" title="Apagar conjunto" aria-label="Apagar conjunto ${conjEsc(g.nome)}" onclick="conjApagarGrupo('${g.id}')">✕</button></span>`;
    });
    linhaC.innerHTML = html;

    let f = "";
    if (conjEdicao) {
        const forma = conjFormaPorId(conjTemp.formas, conjEdicao.formaId);
        const max = conjMaiorNivel(conjEdicao.formaId);
        let opts = `<option value="base">Forma base</option>`;
        for (let n = 1; n <= max + 1; n++) opts += `<option value="${n}">Transformação ${n}</option>`;
        f = `<span class="conj-editando">${forma ? "EDITANDO " + conjNomeForma(forma) : "MONTANDO FORMA NOVA"}</span>` +
            `<label for="conj-salvar-como" class="conj-rotulo">SALVAR COMO</label><select id="conj-salvar-como">${opts}</select>` +
            `<button type="button" class="btn" onclick="conjSalvarForma()">SALVAR FORMA</button>` +
            `<button type="button" class="btn conj-btn-cinza" onclick="conjCancelarForma()">CANCELAR FORMA</button>`;
        linhaF.innerHTML = f;
        const sel = document.getElementById("conj-salvar-como");
        if (sel && forma) sel.value = forma.tipo === "base" ? "base" : String(forma.nivel);
        return;
    }
    const agrupa = conjTemp.formas.length >= 2;
    conjTemp.formas.forEach(fm => {
        const q = conjQuadrosDaForma(fm, "idle");
        f += `<span class="conj-forma">` + (q && q[0] ? `<img src="${q[0]}" alt="">` : `<span class="conj-forma-vazia">...</span>`) +
            `<span class="conj-forma-nome">${conjNomeForma(fm)}</span>` +
            (agrupa ? `<label class="conj-marca"><input type="checkbox" ${conjMarcadas.has(fm.id) ? "checked" : ""} onchange="conjMarcar('${fm.id}', this.checked)"> agrupar</label>` : "") +
            `<button type="button" class="btn conj-mini" onclick="conjEditarForma('${fm.id}')">EDITAR</button>` +
            `<button type="button" class="btn conj-mini conj-btn-vermelho" onclick="conjApagarForma('${fm.id}')">APAGAR</button></span>`;
    });
    f += `<button type="button" class="btn" onclick="conjNovaForma()">+ NOVA FORMA</button>`;
    if (agrupa) f += `<input type="text" id="conj-nome-grupo" class="conj-nome-grupo" maxlength="18" placeholder="Nome do conjunto" aria-label="Nome do conjunto">` +
        `<button type="button" class="btn conj-btn-agrupar" onclick="conjAgrupar()">AGRUPAR</button>`;
    linhaF.innerHTML = f;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { CONJ_ESTADOS, conjEmbrulharQuadro, conjQuadrosDaForma };
}
