// minions.js — MINIONS (v0.113: só os desenhos do Gemini). O Saibaman e o Cell Jr. são tiras de imagem em
// minions/<modelo>.webp: 8 células de 144x168 (corpo no meio, virado para a ESQUERDA) na ordem de
// MINION_IMAGEM_POSES. Um personagem com minionClassico = { modelo } é sempre desenhado por estas imagens (luta,
// cards, editor). Os desenhos antigos feitos em canvas e o editor de cores foram removidos.
// Carrega antes de database.js (os personagens iniciais Saibaman e Cell Jr. nascem destas imagens).

const SAIBAMAN_SPRITE_SCALE = 3, SAIBAMAN_SPRITE_PAD = 8;
const MINION_DRAW_SCALE = 1.3;   // desenhados um pouco maiores que a caixa de colisão (os pés no mesmo lugar)
const saibamanSpriteCache = new Map();

const MINION_MODELOS = {
    saibaman: { nome: "SAIBAMAN" },
    celljr: { nome: "CELL JR." }
};
// poses usadas pelos movimentos do editor (a luta usa as fases do minion direto)
const MINION_POSES_DOS_MOVIMENTOS = { idle: "voar", flyUp: "saltar", flyUpRight: "saltar", flyUpLeft: "saltar", chargeKi: "agarrar" };

// { modelo } válido (as cores editadas das versões antigas são ignoradas: o desenho é sempre a imagem)
function normalizarMinionClassico(mc) {
    if (!mc || !MINION_MODELOS[mc.modelo]) return null;
    return { modelo: mc.modelo, cores: {} };
}
function minionAssinaturaClassica(mc) {
    const n = normalizarMinionClassico(mc);
    return n ? n.modelo + "|" : "";
}

const MINION_IMAGENS = { saibaman: "minions/saibaman.webp", celljr: "minions/celljr.webp" };
const MINION_IMAGEM_POSES = ["saltar", "voar0", "voar1", "voar2", "voar3", "investir", "agarrar", "arremessado"];
const minionImagens = {};
function minionImagemPronta(n) {
    if (!n || !MINION_IMAGENS[n.modelo]) return null;
    let im = minionImagens[n.modelo];
    if (!im && typeof Image !== "undefined") {
        im = minionImagens[n.modelo] = new Image();
        im.onload = () => {
            // a imagem chegou: refaz os desenhos guardados (luta, cards e quadros do editor)
            saibamanSpriteCache.clear();
            minionAnimacoesCache.clear();
            if (typeof characterDB === "object") {
                for (const k in characterDB) { const c = characterDB[k]; if (c && c.minionClassico) aplicarMinionClassico(c, c.minionClassico); }
            }
        };
        im.src = MINION_IMAGENS[n.modelo];
    }
    return im && im.complete && im.naturalWidth ? im : null;
}

// Uma pose do minion numa tela (escala SAIBAMAN_SPRITE_SCALE, com margem SAIBAMAN_SPRITE_PAD); vazia enquanto a
// imagem não chegou
function desenharMinionClassico(mc, pose, frame) {
    const n = normalizarMinionClassico(mc) || { modelo: "saibaman", cores: {} };
    const c = document.createElement("canvas");
    c.width = (32 + SAIBAMAN_SPRITE_PAD * 2) * SAIBAMAN_SPRITE_SCALE;
    c.height = (40 + SAIBAMAN_SPRITE_PAD * 2) * SAIBAMAN_SPRITE_SCALE;
    const g = c.getContext && c.getContext("2d");
    const img = g ? minionImagemPronta(n) : null;
    if (img) {
        const i = Math.max(0, MINION_IMAGEM_POSES.indexOf(pose === "voar" ? "voar" + ((frame | 0) % 4) : pose));
        const cw = img.naturalWidth / MINION_IMAGEM_POSES.length;
        g.drawImage(img, i * cw, 0, cw, img.naturalHeight, 0, 0, c.width, c.height);
    }
    return c;
}
// Movimentos do editor feitos com as mesmas imagens da luta: parado/voando = voar (4 quadros), subir = saltar,
// carregar = agarrar; o resto usa o voo.
const minionAnimacoesCache = new Map();
function minionClassicoAnimacoes(mc) {
    const chave = minionAssinaturaClassica(mc);
    let r = minionAnimacoesCache.get(chave);
    if (r) return r;
    const pronta = minionImagemPronta(normalizarMinionClassico(mc));
    const url = (pose, f) => {
        const c = desenharMinionClassico(mc, pose, f);
        try { return c.toDataURL ? c.toDataURL("image/png") : null; } catch (e) { return null; }
    };
    const voo = [0, 1, 2, 3].map(f => url("voar", f)).filter(Boolean);
    const outras = { saltar: [url("saltar", 0)].filter(Boolean), agarrar: [url("agarrar", 0)].filter(Boolean) };
    const animations = {}, fpsSettings = {};
    SUB_ANIM_KEYS.forEach(k => {
        const pose = MINION_POSES_DOS_MOVIMENTOS[k];
        animations[k] = (pose && outras[pose] && outras[pose].length ? outras[pose] : voo).slice();
        fpsSettings[k] = 8;
    });
    r = { animations, fpsSettings, defaultUrl: voo[0] || null };
    if (pronta) minionAnimacoesCache.set(chave, r);   // só guarda depois que a imagem chegou
    return r;
}
// aplica o desenho do minion num personagem (animações e imagem refeitas a partir da imagem do modelo)
function aplicarMinionClassico(c, mc) {
    const n = normalizarMinionClassico(mc);
    if (!c || !n) return c;
    const a = minionClassicoAnimacoes(n);
    c.minionClassico = n;
    delete c.builderAppearance;
    c.animations = JSON.parse(JSON.stringify(a.animations));
    c.fpsSettings = Object.assign({}, a.fpsSettings);
    if (a.defaultUrl) c.defaultUrl = a.defaultUrl;
    return c;
}
