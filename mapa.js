// ==================== MAPA DE PROGRESSO (cenário em 3D) ====================
// Só desenho do fundo do mapa de fases (os cliques, a rolagem e os círculos das fases ficam em menu.js; a
// geometria do caminho e a mistura dos ambientes em game-logic-core.js). Carrega depois de cenarios3d.js.
//
// O mapa é visto em perspectiva: céu em cima, horizonte em MAPA_HORIZONTE_Y e o chão descendo até a tela,
// com a estrada das fases deitada nele. Cada trecho de 10 fases tem um ambiente de Dragon Ball (MAPA_AMBIENTES)
// e, perto da divisa entre dois trechos, tudo muda aos poucos ao longo de ~3 fases (getMapaMistura): as cores
// do céu e do chão se misturam, a paisagem do horizonte de um some enquanto a do outro aparece e os objetos do
// chão vão trocando de um ambiente para o outro.
// Profundidade (paralaxe): a paisagem do horizonte anda devagar, as fileiras de objetos lá longe um pouco mais,
// a estrada na velocidade da rolagem e a fileira da frente mais rápido.
// Desempenho: as cores são uma faixa pequena feita uma vez e esticada (1 drawImage); cada paisagem de
// horizonte é uma imagem guardada (no máximo 3 na memória); cada objeto é um desenho guardado e copiado
// (algumas dezenas de drawImage por quadro).

const MAPA_HY = MAPA_HORIZONTE_Y;
const MAPA_DECOR_W = 1600;          // largura da paisagem de horizonte (repete)
const MAPA_DECOR_VEL = 0.3;         // paralaxe da paisagem de horizonte
const MAPA_PALETA_PASSO = 8;        // 1 coluna da faixa de cores a cada 8 px do mapa

// Ambientes na ordem dos trechos (fases 1-10, 11-20...). Trechos além da lista repetem o último.
const MAPA_AMBIENTES = [
    { nome: "terra", ceu: ["#3b7fd6", "#c4e6fb"], chao: ["#a6d872", "#4e9a3a"], decor: mapaDecorTerra, objetos: ["arvore", "arvore", "capsula", "mesa", "pedra"] },
    { nome: "namek", ceu: ["#4f9e68", "#dcf2b4"], chao: ["#8ad6c6", "#3f93a8"], decor: mapaDecorNamek, objetos: ["namek_arvore", "namek_arvore", "namek_casa", "espigao", "pedra_azul"] },
    { nome: "espaco", ceu: ["#05030f", "#3a1a5a"], chao: ["#6a4a86", "#2c1c40"], decor: mapaDecorEspaco, objetos: ["cratera", "rocha_roxa", "cristal_roxo", "nave_saiyajin", "cratera"] },
    { nome: "deserto_cell", ceu: ["#5aa0e0", "#f2e4c4"], chao: ["#efe0b4", "#c4a06c"], decor: mapaDecorDeserto, objetos: ["agulha", "agulha", "pedra_areia", "mesa_areia"] },
    { nome: "kaioshin", ceu: ["#3a1a6a", "#f2bede"], chao: ["#b2eaa8", "#4a9a6a"], decor: mapaDecorKaioshin, objetos: ["arvore_rosa", "arvore_rosa", "cristal", "arbusto"] },
    { nome: "bills", ceu: ["#0a0620", "#5a1f7a"], chao: ["#74a462", "#2a4a3a"], decor: mapaDecorBills, objetos: ["piramide", "arvore_bills", "rocha_flutuante", "pilar"] }
];
function mapaAmbiente(t) { return MAPA_AMBIENTES[Math.max(0, Math.min(t, MAPA_AMBIENTES.length - 1))]; }

// ---------- cores (céu e chão), misturadas coluna a coluna numa faixa pequena ----------
function mapaHex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mapaMisturaCor(c1, c2, w) {
    const a = mapaHex(c1), b = mapaHex(c2);
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * w)},${Math.round(a[1] + (b[1] - a[1]) * w)},${Math.round(a[2] + (b[2] - a[2]) * w)})`;
}
let mapaPaleta = null;
function getMapaPaleta() {
    if (mapaPaleta) return mapaPaleta;
    if (typeof document === "undefined" || !document.createElement) return null;
    const largura = getMapaLargura(getMapaTotalFases()) + 800;
    const c = document.createElement("canvas");
    c.width = Math.ceil(largura / MAPA_PALETA_PASSO) + 2;
    c.height = 350;
    const g = c.getContext && c.getContext("2d");
    if (!g || typeof g.createLinearGradient !== "function") return null;
    for (let i = 0; i < c.width; i++) {
        const m = getMapaMistura(i * MAPA_PALETA_PASSO), A = mapaAmbiente(m.a), B = mapaAmbiente(m.b);
        const ceu = g.createLinearGradient(0, 0, 0, MAPA_HY);
        ceu.addColorStop(0, mapaMisturaCor(A.ceu[0], B.ceu[0], m.w));
        ceu.addColorStop(1, mapaMisturaCor(A.ceu[1], B.ceu[1], m.w));
        g.fillStyle = ceu;
        g.fillRect(i, 0, 1, MAPA_HY);
        const chao = g.createLinearGradient(0, MAPA_HY, 0, 350);
        const longe = mapaMisturaCor(A.chao[0], B.chao[0], m.w), perto = mapaMisturaCor(A.chao[1], B.chao[1], m.w);
        chao.addColorStop(0, mapaMisturaCor(A.ceu[1], B.ceu[1], m.w));   // névoa no horizonte
        chao.addColorStop(0.06, longe);
        chao.addColorStop(1, perto);
        g.fillStyle = chao;
        g.fillRect(i, MAPA_HY, 1, 350 - MAPA_HY);
    }
    mapaPaleta = c;
    return c;
}

// ---------- paisagem do horizonte (uma imagem por ambiente, repetindo de lado) ----------
const mapaDecorCache = new Map();   // nome do ambiente -> faixa (c3NovaFaixa)
function getMapaDecor(amb) {
    let c = mapaDecorCache.get(amb.nome);
    if (c3Valida(c)) return c;
    const f = typeof document !== "undefined" && document.createElement ? c3NovaFaixa(MAPA_DECOR_W, MAPA_HY + 16) : null;
    if (!f || typeof f.g.createLinearGradient !== "function") return null;
    amb.decor(f.g, MAPA_DECOR_W, MAPA_HY + 2, mapaSorteio(amb.nome.length * 97 + 13));
    if (mapaDecorCache.size >= 3) mapaDecorCache.delete(mapaDecorCache.keys().next().value);
    mapaDecorCache.set(amb.nome, f.c);
    return f.c;
}
function mapaSorteio(semente) {
    let s = (semente * 9301 + 49297) % 233280 || 1;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
// repete na emenda da faixa (para o desenho não ficar cortado na volta)
function mapaNaVolta(W, x, larg, desenha) { [-W, 0, W].forEach(dx => { if (x + dx + larg > 0 && x + dx - larg < W) desenha(x + dx); }); }

function mapaMontanhas(g, W, base, alt, cor, luz, rnd, passo, redonda) {
    let x = 0;
    const picos = [];
    while (x < W) { const pw = passo * (0.6 + rnd() * 0.8); picos.push([x, pw, alt * (0.45 + rnd() * 0.55), 0.4 + rnd() * 0.2]); x += pw; }
    picos[picos.length - 1][1] += W - x;   // a última fecha a volta certinho
    [-W, 0, W].forEach(dx => {
        g.fillStyle = cor;
        g.beginPath(); g.moveTo(dx, base + 20);
        picos.forEach(([px, pw, ph, pf]) => {
            if (redonda) g.quadraticCurveTo(dx + px + pw / 2, base - ph * 1.6, dx + px + pw, base);
            else { g.lineTo(dx + px + pw * pf, base - ph); g.lineTo(dx + px + pw, base); }
        });
        g.lineTo(dx + W, base + 20); g.closePath(); g.fill();
        if (!luz || redonda) return;
        g.fillStyle = luz;
        picos.forEach(([px, pw, ph, pf]) => { g.beginPath(); g.moveTo(dx + px + pw * pf, base - ph); g.lineTo(dx + px + pw, base); g.lineTo(dx + px + pw * (pf + 0.12), base); g.closePath(); g.fill(); });
    });
}
function mapaNuvem(g, x, y, s, cor, sombra) {
    g.fillStyle = sombra; [[0, 3, 1.1], [-0.9, 4, 0.75], [0.95, 4, 0.8]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s * 16, y + dy, s * 12 * r, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = cor; [[0, 0, 1.1], [-0.9, 2, 0.75], [0.95, 2, 0.8], [0.4, -3, 0.7]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s * 16, y + dy, s * 12 * r, 0, Math.PI * 2); g.fill(); });
}
function mapaEstrelas(g, W, ate, rnd, n) {
    for (let i = 0; i < n; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`; g.fillRect(rnd() * W, rnd() * ate, rnd() < 0.15 ? 2 : 1.2, rnd() < 0.15 ? 2 : 1.2); }
}
function mapaPlaneta(g, W, x, y, r, cor, anel) {
    mapaNaVolta(W, x, r * 2, xx => {
        const gr = g.createRadialGradient(xx - r * 0.4, y - r * 0.4, r * 0.1, xx, y, r);
        gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.25, cor); gr.addColorStop(1, "#100820");
        g.fillStyle = gr; g.beginPath(); g.arc(xx, y, r, 0, Math.PI * 2); g.fill();
        if (anel) { g.strokeStyle = "rgba(255,255,255,0.3)"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(xx, y, r * 1.7, r * 0.35, -0.3, 0, Math.PI * 2); g.stroke(); }
    });
}
function mapaMesaLonge(g, W, x, base, larg, alt, cor, topo) {
    mapaNaVolta(W, x, larg, xx => {
        g.fillStyle = cor;
        g.beginPath(); g.moveTo(xx - larg / 2, base); g.lineTo(xx - larg * 0.42, base - alt); g.lineTo(xx + larg * 0.42, base - alt); g.lineTo(xx + larg / 2, base); g.closePath(); g.fill();
        g.fillStyle = topo; g.fillRect(xx - larg * 0.42, base - alt, larg * 0.84, 2);
    });
}

function mapaDecorTerra(g, W, base, rnd) {
    for (let i = 0; i < 12; i++) { const x = rnd() * W, y = 18 + rnd() * 40, s = 0.7 + rnd() * 0.8; mapaNaVolta(W, x, 40 * s, xx => mapaNuvem(g, xx, y, s, "rgba(255,255,255,0.95)", "rgba(190,210,235,0.8)")); }
    mapaMontanhas(g, W, base, 34, "#8aa6d6", "#a8c0e6", rnd, 120, false);
    for (let i = 0; i < 7; i++) mapaMesaLonge(g, W, rnd() * W, base + 2, 24 + rnd() * 20, 18 + rnd() * 16, "#b0866a", "#7fa356");
}
function mapaDecorNamek(g, W, base, rnd) {
    for (let i = 0; i < 3; i++) { const x = 200 + i * 520 + rnd() * 100, y = 22 + rnd() * 18; mapaNaVolta(W, x, 20, xx => { g.fillStyle = "rgba(255,255,230,0.85)"; g.beginPath(); g.arc(xx, y, 9 + rnd() * 3, 0, Math.PI * 2); g.fill(); }); }
    for (let i = 0; i < 7; i++) { const x = rnd() * W, y = 20 + rnd() * 34, s = 0.6 + rnd() * 0.6; mapaNaVolta(W, x, 30 * s, xx => mapaNuvem(g, xx, y, s, "rgba(240,255,225,0.85)", "rgba(170,210,170,0.6)")); }
    mapaMontanhas(g, W, base, 26, "#6fa89e", null, rnd, 150, true);
    for (let i = 0; i < 14; i++) {
        const x = rnd() * W, alt = 18 + rnd() * 30;
        mapaNaVolta(W, x, 10, xx => {
            g.fillStyle = "#7fa898"; g.beginPath(); g.moveTo(xx - 5, base + 2); g.lineTo(xx - 2.5, base - alt); g.lineTo(xx + 2.5, base - alt); g.lineTo(xx + 5, base + 2); g.fill();
            g.fillStyle = "#3f8f5a"; g.beginPath(); g.arc(xx, base - alt - 3, 5, 0, Math.PI * 2); g.fill();
        });
    }
}
function mapaDecorEspaco(g, W, base, rnd) {
    mapaEstrelas(g, W, base, rnd, 320);
    mapaPlaneta(g, W, W * 0.12, 36, 18, "#c87a4a", true);
    mapaPlaneta(g, W, W * 0.48, 46, 28, "#4a7ac8", false);
    mapaPlaneta(g, W, W * 0.8, 26, 11, "#d8c06a", true);
    // nave (disco) ao longe
    const nx = W * 0.3;
    g.fillStyle = "#c8c0e0"; g.beginPath(); g.ellipse(nx, 70, 26, 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#e8e0ff"; g.beginPath(); g.ellipse(nx, 66, 15, 7, 0, Math.PI, 0); g.fill();
    g.fillStyle = "#ff6a8a"; for (let i = -2; i <= 2; i++) g.fillRect(nx + i * 8 - 1, 71, 2, 1.5);
    mapaMontanhas(g, W, base, 30, "#3a2050", "#5a3a78", rnd, 90, false);
}
function mapaDecorDeserto(g, W, base, rnd) {
    for (let i = 0; i < 9; i++) { const x = rnd() * W, y = 18 + rnd() * 36, s = 0.6 + rnd() * 0.7; mapaNaVolta(W, x, 40 * s, xx => mapaNuvem(g, xx, y, s, "rgba(255,255,255,0.95)", "rgba(190,205,225,0.6)")); }
    mapaMontanhas(g, W, base, 30, "#c8b090", "#dcc8a8", rnd, 130, false);
    for (let i = 0; i < 12; i++) {
        const x = rnd() * W, alt = 14 + rnd() * 26, larg = 5 + rnd() * 6;
        mapaNaVolta(W, x, larg, xx => {
            g.fillStyle = "#b8946e"; g.beginPath(); g.moveTo(xx - larg, base + 2); g.lineTo(xx - larg * 0.3, base - alt); g.lineTo(xx + larg * 0.2, base - alt * 0.96); g.lineTo(xx + larg, base + 2); g.fill();
        });
    }
    // ringue do Cell bem longe
    const rx = W * 0.55;
    g.fillStyle = "#f0ece4"; g.fillRect(rx - 26, base - 4, 52, 4);
    g.fillStyle = "#e0dad0"; [-22, 22].forEach(dx => g.fillRect(rx + dx - 1.5, base - 14, 3, 10));
}
function mapaDecorKaioshin(g, W, base, rnd) {
    mapaEstrelas(g, W, base * 0.6, rnd, 90);
    mapaPlaneta(g, W, W * 0.22, 40, 26, "#7ac8e8", false);
    mapaPlaneta(g, W, W * 0.7, 30, 16, "#e8a050", true);
    mapaMontanhas(g, W, base, 26, "#b48ad6", null, rnd, 140, true);
    for (let i = 0; i < 16; i++) {
        const x = rnd() * W, alt = 10 + rnd() * 16, larg = 3 + rnd() * 3;
        mapaNaVolta(W, x, larg, xx => { g.fillStyle = "rgba(190,240,255,0.9)"; g.beginPath(); g.moveTo(xx - larg, base + 2); g.lineTo(xx, base - alt); g.lineTo(xx + larg, base + 2); g.fill(); });
    }
}
function mapaDecorBills(g, W, base, rnd) {
    mapaEstrelas(g, W, base, rnd, 220);
    const cx = W * 0.5, cy = 40;
    for (let i = 0; i < 140; i++) { const a = i * 0.25, r = i * 0.6; g.fillStyle = `rgba(230,200,255,${0.6 - i / 280})`; g.fillRect(cx + Math.cos(a) * r * 1.8, cy + Math.sin(a) * r * 0.5, 1.5, 1.5); }
    for (let i = 0; i < 6; i++) {
        const x = rnd() * W, y = 30 + rnd() * 40, s = 8 + rnd() * 8;
        mapaNaVolta(W, x, s, xx => {
            g.fillStyle = "#6a4a3a"; g.beginPath(); g.moveTo(xx - s, y); g.lineTo(xx + s, y); g.lineTo(xx + s * 0.2, y + s * 1.3); g.closePath(); g.fill();
            g.fillStyle = "#4a9a5a"; g.beginPath(); g.ellipse(xx, y, s, s * 0.25, 0, 0, Math.PI * 2); g.fill();
        });
    }
    mapaMontanhas(g, W, base, 32, "#3a1a5a", "#5a2a7a", rnd, 100, false);
}

// ---------- objetos do chão (desenho guardado por tipo, base no meio de baixo) ----------
const MAPA_OBJ_W = 70, MAPA_OBJ_H = 90, MAPA_OBJ_BASE = 84;
const mapaObjCache = new Map();
function getMapaObjeto(tipo) {
    const k = typeof renderScale === "number" ? renderScale : 1;
    const chave = tipo + "|" + k;
    if (mapaObjCache.has(chave)) return mapaObjCache.get(chave);
    let c = null;
    if (typeof document !== "undefined" && document.createElement) {
        c = document.createElement("canvas");
        const esc = k * 1.4;   // um pouco maior: a fileira da frente aparece ampliada
        c.width = Math.ceil(MAPA_OBJ_W * esc); c.height = Math.ceil(MAPA_OBJ_H * esc);
        const g = c.getContext && c.getContext("2d");
        if (g && typeof g.scale === "function") {
            g.scale(esc, esc);
            // sombra no chão
            g.fillStyle = "rgba(0, 0, 0, 0.22)";
            g.beginPath(); g.ellipse(35, MAPA_OBJ_BASE, 22, 4.5, 0, 0, Math.PI * 2); g.fill();
            (MAPA_OBJ_DESENHO[tipo] || MAPA_OBJ_DESENHO.pedra)(g, 35, MAPA_OBJ_BASE);
        } else c = null;
    }
    mapaObjCache.set(chave, c);
    return c;
}
function mapaArvore(g, x, b, r, tronco, copa, luz, alt) {
    g.fillStyle = tronco; g.fillRect(x - r * 0.14, b - alt, r * 0.28, alt);
    g.fillStyle = copa; g.beginPath(); g.arc(x, b - alt - r * 0.6, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = luz; g.beginPath(); g.arc(x - r * 0.3, b - alt - r * 0.9, r * 0.45, 0, Math.PI * 2); g.fill();
}
const MAPA_OBJ_DESENHO = {
    arvore: (g, x, b) => { mapaArvore(g, x - 8, b, 13, "#6a4a2a", "#3f8f3f", "#6cc25a", 16); mapaArvore(g, x + 9, b, 10, "#6a4a2a", "#2f7f35", "#5cb24e", 12); },
    capsula: (g, x, b) => {
        g.fillStyle = "#e8e8f0"; g.fillRect(x - 22, b - 6, 44, 6);
        g.fillStyle = "#f8f8fc"; g.beginPath(); g.ellipse(x, b - 6, 20, 18, 0, Math.PI, 0); g.fill();
        g.fillStyle = "#d4d4e0"; g.beginPath(); g.ellipse(x + 6, b - 6, 12, 15, 0, Math.PI * 1.5, 0); g.fill();
        g.fillStyle = "#4fa6e8"; g.fillRect(x - 12, b - 15, 6, 4); g.fillRect(x + 4, b - 15, 6, 4);
        g.fillStyle = "#e85a3a"; g.font = "bold 6px sans-serif"; g.textAlign = "center"; g.fillText("CC", x, b - 2);
    },
    mesa: (g, x, b) => {
        g.fillStyle = "#b0714a"; g.beginPath(); g.moveTo(x - 20, b); g.lineTo(x - 15, b - 54); g.lineTo(x + 15, b - 54); g.lineTo(x + 20, b); g.closePath(); g.fill();
        g.fillStyle = "#8a5436"; g.beginPath(); g.moveTo(x + 4, b); g.lineTo(x + 6, b - 54); g.lineTo(x + 15, b - 54); g.lineTo(x + 20, b); g.closePath(); g.fill();
        g.fillStyle = "#7fa356"; g.beginPath(); g.ellipse(x, b - 54, 15, 3, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x - 19 + k, b - k * 13); g.lineTo(x + 19 - k, b - k * 13); g.stroke(); }
    },
    pedra: (g, x, b) => mapaPedra(g, x, b, 14, "#8a8a7a", "#b4b4a2"),
    namek_arvore: (g, x, b) => {
        g.strokeStyle = "#7b8b4a"; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(x, b); g.quadraticCurveTo(x - 4, b - 30, x + 2, b - 56); g.stroke();
        g.fillStyle = "#2f8a4a"; g.beginPath(); g.arc(x + 2, b - 62, 11, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#7ad06a"; g.beginPath(); g.arc(x - 2, b - 66, 5, 0, Math.PI * 2); g.fill();
    },
    namek_casa: (g, x, b) => {
        g.fillStyle = "#e8f0e0"; g.beginPath(); g.ellipse(x, b - 4, 18, 24, 0, Math.PI, 0); g.fill(); g.fillRect(x - 18, b - 4, 36, 4);
        g.fillStyle = "#c8d6c0"; g.beginPath(); g.ellipse(x + 6, b - 4, 10, 20, 0, Math.PI * 1.5, 0); g.fill();
        g.fillStyle = "#3a5a4a"; [[-7, -14], [6, -10], [-1, -22]].forEach(([dx, dy]) => { g.beginPath(); g.arc(x + dx, b + dy, 3, 0, Math.PI * 2); g.fill(); });
    },
    espigao: (g, x, b) => {
        g.fillStyle = "#8ab09a"; g.beginPath(); g.moveTo(x - 10, b); g.lineTo(x - 5, b - 60); g.lineTo(x + 5, b - 60); g.lineTo(x + 10, b); g.fill();
        g.fillStyle = "#6a9080"; g.beginPath(); g.moveTo(x + 2, b); g.lineTo(x + 3, b - 60); g.lineTo(x + 5, b - 60); g.lineTo(x + 10, b); g.fill();
        g.fillStyle = "#2f8a4a"; g.beginPath(); g.arc(x, b - 66, 9, 0, Math.PI * 2); g.fill();
    },
    pedra_azul: (g, x, b) => mapaPedra(g, x, b, 13, "#6a9aa8", "#9ac8d4"),
    cratera: (g, x, b) => {
        g.fillStyle = "rgba(20,8,30,0.6)"; g.beginPath(); g.ellipse(x, b - 3, 24, 7, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(190,150,220,0.7)"; g.lineWidth = 2; g.beginPath(); g.ellipse(x, b - 4, 24, 7, 0, Math.PI, 0); g.stroke();
    },
    rocha_roxa: (g, x, b) => mapaPedra(g, x, b, 16, "#5a3a78", "#8a6aa8"),
    cristal_roxo: (g, x, b) => {
        [[-8, 26, 6], [3, 40, 8], [12, 22, 5]].forEach(([dx, alt, l]) => {
            g.fillStyle = "#b07ae0"; g.beginPath(); g.moveTo(x + dx - l, b); g.lineTo(x + dx, b - alt); g.lineTo(x + dx + l, b); g.fill();
            g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.moveTo(x + dx - l * 0.2, b); g.lineTo(x + dx, b - alt); g.lineTo(x + dx + l * 0.3, b); g.fill();
        });
    },
    nave_saiyajin: (g, x, b) => {
        g.fillStyle = "rgba(20,8,30,0.55)"; g.beginPath(); g.ellipse(x, b - 2, 26, 6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#e8e8f0"; g.beginPath(); g.arc(x, b - 14, 14, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#b8b8c8"; g.beginPath(); g.arc(x + 4, b - 12, 10, -0.5, 1.8); g.fill();
        g.fillStyle = "#c83a4a"; g.beginPath(); g.ellipse(x - 2, b - 17, 6, 5, 0, 0, Math.PI * 2); g.fill();
    },
    agulha: (g, x, b) => {
        g.fillStyle = "#b08a64"; g.beginPath(); g.moveTo(x - 13, b); g.lineTo(x - 4, b - 70); g.lineTo(x + 3, b - 67); g.lineTo(x + 13, b); g.fill();
        g.fillStyle = "#8a6848"; g.beginPath(); g.moveTo(x, b); g.lineTo(x + 3, b - 67); g.lineTo(x + 13, b); g.fill();
    },
    pedra_areia: (g, x, b) => mapaPedra(g, x, b, 15, "#c4a072", "#e0c49a"),
    mesa_areia: (g, x, b) => {
        g.fillStyle = "#c8a070"; g.beginPath(); g.moveTo(x - 24, b); g.lineTo(x - 18, b - 36); g.lineTo(x + 18, b - 36); g.lineTo(x + 24, b); g.closePath(); g.fill();
        g.fillStyle = "#a07c52"; g.beginPath(); g.moveTo(x + 6, b); g.lineTo(x + 8, b - 36); g.lineTo(x + 18, b - 36); g.lineTo(x + 24, b); g.closePath(); g.fill();
    },
    arvore_rosa: (g, x, b) => { mapaArvore(g, x - 6, b, 13, "#7a5a8a", "#f0a0c8", "#ffd0e8", 18); mapaArvore(g, x + 10, b, 9, "#7a5a8a", "#e88ab8", "#ffd0e8", 12); },
    cristal: (g, x, b) => {
        [[-6, 30, 6], [5, 44, 7]].forEach(([dx, alt, l]) => {
            g.fillStyle = "rgba(170,236,255,0.95)"; g.beginPath(); g.moveTo(x + dx - l, b); g.lineTo(x + dx, b - alt); g.lineTo(x + dx + l, b); g.fill();
            g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.moveTo(x + dx - l * 0.2, b); g.lineTo(x + dx, b - alt); g.lineTo(x + dx + l * 0.25, b); g.fill();
        });
    },
    arbusto: (g, x, b) => { [[-10, 10], [8, 9], [0, 12]].forEach(([dx, r], i) => { g.fillStyle = i === 2 ? "#5ab06a" : "#3f8a52"; g.beginPath(); g.arc(x + dx, b - r * 0.8, r, 0, Math.PI * 2); g.fill(); }); },
    piramide: (g, x, b) => {
        g.fillStyle = "#c8a060"; g.beginPath(); g.moveTo(x - 26, b); g.lineTo(x, b - 34); g.lineTo(x + 26, b); g.fill();
        g.fillStyle = "#9a7440"; g.beginPath(); g.moveTo(x, b - 34); g.lineTo(x + 26, b); g.lineTo(x + 6, b); g.fill();
    },
    arvore_bills: (g, x, b) => {
        g.strokeStyle = "#5a3a5a"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, b); g.lineTo(x, b - 40); g.stroke();
        [[-12, -46, 10, "#e8c040"], [10, -50, 9, "#d07ad8"], [0, -60, 11, "#7ad0c8"]].forEach(([dx, dy, r, cor]) => { g.fillStyle = cor; g.beginPath(); g.arc(x + dx, b + dy, r, 0, Math.PI * 2); g.fill(); });
    },
    rocha_flutuante: (g, x, b) => {
        g.fillStyle = "#6a4a3a"; g.beginPath(); g.moveTo(x - 16, b - 44); g.lineTo(x + 16, b - 44); g.lineTo(x + 3, b - 18); g.closePath(); g.fill();
        g.fillStyle = "#4a9a5a"; g.beginPath(); g.ellipse(x, b - 44, 16, 4, 0, 0, Math.PI * 2); g.fill();
    },
    pilar: (g, x, b) => {
        g.fillStyle = "#8a6aa8"; g.fillRect(x - 6, b - 56, 12, 56);
        g.fillStyle = "#6a4a88"; g.fillRect(x + 1, b - 56, 5, 56);
        g.fillStyle = "#c8a0e0"; g.fillRect(x - 9, b - 60, 18, 5);
    }
};
function mapaPedra(g, x, b, r, cor, luz) {
    g.fillStyle = cor; g.beginPath(); g.ellipse(x, b - r * 0.5, r, r * 0.75, 0, Math.PI, 0); g.lineTo(x + r, b); g.lineTo(x - r, b); g.closePath(); g.fill();
    g.fillStyle = luz; g.beginPath(); g.ellipse(x - r * 0.3, b - r * 0.85, r * 0.45, r * 0.3, -0.2, 0, Math.PI * 2); g.fill();
}

// Fileiras de objetos, de longe para perto: y (faixa na tela), paralaxe, tamanho, espaçamento e quantos aparecem
const MAPA_FILEIRAS = [
    { y0: MAPA_HY + 6, y1: MAPA_HY + 16, vel: 0.55, esc: 0.38, passo: 64, dens: 0.75, alfa: 0.8 },
    { y0: MAPA_HY + 20, y1: MAPA_HY + 38, vel: 0.72, esc: 0.55, passo: 80, dens: 0.6, alfa: 0.92 },
    { y0: 288, y1: 318, vel: 1.12, esc: 0.95, passo: 118, dens: 0.55, alfa: 1 },
    { y0: 338, y1: 356, vel: 1.32, esc: 1.3, passo: 150, dens: 0.5, alfa: 1 }
];
function drawMapaObjetos(rolagem) {
    MAPA_FILEIRAS.forEach((f, fi) => {
        const desloc = rolagem * f.vel;
        const n0 = Math.floor((desloc - 120) / f.passo), n1 = Math.ceil((desloc + 920) / f.passo);
        ctx.globalAlpha = f.alfa;
        for (let n = n0; n <= n1; n++) {
            const semente = n * 7 + fi * 1013;
            if (c3Hash(semente) > f.dens) continue;
            const x = n * f.passo + c3Hash(semente + 1) * f.passo * 0.6 - desloc;
            if (x < -80 || x > 880) continue;
            const m = getMapaMistura(x + rolagem);
            const amb = mapaAmbiente(c3Hash(semente + 2) < m.w ? m.b : m.a);
            const tipo = amb.objetos[Math.floor(c3Hash(semente + 3) * amb.objetos.length) % amb.objetos.length];
            const img = getMapaObjeto(tipo);
            if (!img) continue;
            const y = f.y0 + c3Hash(semente + 4) * (f.y1 - f.y0);
            const s = f.esc * (0.85 + c3Hash(semente + 5) * 0.3);
            ctx.drawImage(img, x - 35 * s, y - MAPA_OBJ_BASE * s, MAPA_OBJ_W * s, MAPA_OBJ_H * s);
        }
    });
    ctx.globalAlpha = 1;
}

// Paisagem do horizonte dos ambientes visíveis. Na divisa, cada uma passa por uma máscara em degradê com o
// peso dela ao longo da tela (numa camada de apoio reaproveitada), então a troca é suave, sem faixas.
let mapaCamadaApoio = null;
function drawMapaHorizonte(rolagem) {
    const desloc = ((rolagem * MAPA_DECOR_VEL) % MAPA_DECOR_W + MAPA_DECOR_W) % MAPA_DECOR_W, H = MAPA_HY + 16;
    const passo = 40, pesos = [];
    for (let x = 0; x <= 800; x += passo) pesos.push(getMapaMistura(rolagem + x));
    const usados = new Set();
    pesos.forEach(m => { usados.add(Math.min(m.a, MAPA_AMBIENTES.length - 1)); if (m.w > 0) usados.add(Math.min(m.b, MAPA_AMBIENTES.length - 1)); });
    // copia só o pedaço que aparece (a faixa tem 1600 de largura; a tela, 800), em até 2 partes na emenda
    const desenhar = (g, img) => {
        const k = img.__k || 1, larg1 = Math.min(800, MAPA_DECOR_W - desloc);
        g.drawImage(img, desloc * k, 0, larg1 * k, img.height, 0, 0, larg1, H);
        if (larg1 < 800) g.drawImage(img, 0, 0, (800 - larg1) * k, img.height, larg1, 0, 800 - larg1, H);
    };
    usados.forEach(t => {
        const img = getMapaDecor(MAPA_AMBIENTES[t]);
        if (!img) return;
        const ws = pesos.map(m => pesoAmbiente(m, t));
        if (ws.every(w => w >= 0.999)) { desenhar(ctx, img); return; }   // só ele na tela
        // onde o peso é 1: copia direto (recortado); onde está entre 0 e 1: passa pela máscara, só nesse trecho
        let cheio0 = null, misto0 = null, misto1 = null;
        const cheios = [];
        ws.forEach((w, i) => {
            const x = i * passo;
            if (w >= 0.999) { if (cheio0 === null) cheio0 = x; }
            else { if (cheio0 !== null) { cheios.push([cheio0, x]); cheio0 = null; } }
            if (w > 0.001 && w < 0.999) { if (misto0 === null) misto0 = Math.max(0, x - passo); misto1 = Math.min(800, x + passo); }
        });
        if (cheio0 !== null) cheios.push([cheio0, 800]);
        cheios.forEach(([x0, x1]) => {
            if (misto0 !== null) { if (x0 < misto1 && x1 > misto0) { if (x0 >= misto0) x0 = misto1; else x1 = misto0; } }
            if (x1 <= x0) return;
            ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, H); ctx.clip(); desenhar(ctx, img); ctx.restore();
        });
        if (misto0 === null) return;
        // camada de apoio em resolução 1x (só durante a troca de ambiente; fica um pouco mais suave, ninguém nota)
        if (!mapaCamadaApoio && typeof document !== "undefined" && document.createElement) {
            mapaCamadaApoio = document.createElement("canvas");
            mapaCamadaApoio.width = 800; mapaCamadaApoio.height = H;
        }
        const g = mapaCamadaApoio && mapaCamadaApoio.getContext && mapaCamadaApoio.getContext("2d");
        if (!g || typeof g.createLinearGradient !== "function") return;
        const larg = misto1 - misto0;
        g.globalCompositeOperation = "source-over";
        g.clearRect(0, 0, larg, H);
        g.save(); g.translate(-misto0, 0); desenhar(g, img); g.restore();
        const gr = g.createLinearGradient(0, 0, larg, 0);
        ws.forEach((w, i) => { const x = i * passo - misto0; if (x >= 0 && x <= larg) gr.addColorStop(x / larg, `rgba(0,0,0,${Math.max(0, Math.min(1, w)).toFixed(3)})`); });
        g.globalCompositeOperation = "destination-in";
        g.fillStyle = gr;
        g.fillRect(0, 0, larg, H);
        g.globalCompositeOperation = "source-over";
        ctx.drawImage(mapaCamadaApoio, 0, 0, larg, H, misto0, 0, larg, H);
    });
}
// peso do ambiente t (trechos além da lista contam como o último)
function pesoAmbiente(m, t) {
    const ult = MAPA_AMBIENTES.length - 1;
    return (Math.min(m.a, ult) === t ? 1 - m.w : 0) + (Math.min(m.b, ult) === t ? m.w : 0);
}

// Fundo do mapa na rolagem atual: cores, paisagem do horizonte e os objetos do chão
function drawMapaFundo(rolagem) {
    const paleta = getMapaPaleta();
    ctx.save();
    if (paleta) {
        ctx.imageSmoothingEnabled = true;   // a faixa de cores é pequena e esticada: suave, sem degraus
        ctx.drawImage(paleta, rolagem / MAPA_PALETA_PASSO, 0, 800 / MAPA_PALETA_PASSO, 350, 0, 0, 800, 350);
    } else {
        ctx.fillStyle = "#0a1024";
        ctx.fillRect(0, 0, 800, 350);
    }
    ctx.restore();
    drawMapaHorizonte(rolagem);
    drawMapaObjetos(rolagem);
}

// Estrada ligando as fases, deitada no chão em perspectiva: mais larga perto (embaixo) e achatada na
// vertical. acesaAte = índice (em `pontos`) da última fase liberada: a estrada até ela é dourada.
function mapaLarguraEstrada(y) { return 7 + Math.max(0, y - MAPA_HY) * 0.06; }
function drawMapaEstrada(pontos, acesaAte) {
    if (pontos.length < 2) return;
    // amostra as curvas (mesma curva de antes: bezier entre as fases)
    const amostras = [];   // { x, y, i } (i = índice da fase anterior)
    for (let i = 1; i < pontos.length; i++) {
        const a = pontos[i - 1], b = pontos[i], mx = (a.x + b.x) / 2;
        for (let k = i === 1 ? 0 : 1; k <= 10; k++) {
            const t = k / 10, u = 1 - t;
            amostras.push({
                x: u * u * u * a.x + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * b.x,
                y: u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y,
                i: i - 1 + t
            });
        }
    }
    const fita = (lista, extra) => {
        const esq = [], dir = [];
        lista.forEach((p, k) => {
            const q0 = lista[Math.max(0, k - 1)], q1 = lista[Math.min(lista.length - 1, k + 1)];
            let tx = q1.x - q0.x, ty = q1.y - q0.y;
            const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
            const w = (mapaLarguraEstrada(p.y) + extra) / 2;
            // normal do chão: achatada na vertical (o chão está deitado)
            const nx = -ty * w, ny = tx * w * 0.55;
            esq.push([p.x + nx, p.y + ny]); dir.push([p.x - nx, p.y - ny]);
        });
        ctx.beginPath();
        esq.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        for (let k = dir.length - 1; k >= 0; k--) ctx.lineTo(dir[k][0], dir[k][1]);
        ctx.closePath();
    };
    ctx.save();
    fita(amostras.map(p => ({ x: p.x + 2, y: p.y + 3 })), 6); ctx.fillStyle = "rgba(20, 14, 10, 0.3)"; ctx.fill();   // sombra
    fita(amostras, 5); ctx.fillStyle = "#5a4a3a"; ctx.fill();                                                    // meio-fio
    fita(amostras, 0); ctx.fillStyle = "#9a8a72"; ctx.fill();
    const acesa = amostras.filter(p => p.i <= acesaAte);
    if (acesa.length > 1) { fita(acesa, 0); ctx.fillStyle = "#e8c070"; ctx.fill(); fita(acesa, -mapaLarguraEstrada(200) * 0.55); ctx.fillStyle = "#f6dc96"; ctx.fill(); }
    // faixa do meio tracejada
    ctx.beginPath();
    amostras.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.setLineDash([6, 8]); ctx.strokeStyle = "rgba(255, 245, 210, 0.6)"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
}

// Sombra no chão embaixo do círculo de uma fase (dá a sensação de que ele flutua sobre a estrada)
function drawMapaSombraFase(x, y, r) {
    ctx.fillStyle = "rgba(10, 8, 20, 0.32)";
    ctx.beginPath(); ctx.ellipse(x + 3, y + r * 0.82, r * 1.02, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
}

// Placa de madeira acima da primeira fase futura (cx, base = ponto onde o poste encosta no círculo)
function drawMapaPlaca(cx, base) {
    const w = 168, h = 34, y = base - 14 - h;
    ctx.save();
    ctx.fillStyle = "#5a3a1e";
    ctx.fillRect(cx - 3, y + h - 2, 6, base - (y + h) + 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(cx - w / 2 + 3, y + 3, w, h);
    ctx.fillStyle = "#8a5a2c";
    ctx.fillRect(cx - w / 2, y, w, h);
    ctx.fillStyle = "#a06a34";
    ctx.fillRect(cx - w / 2, y, w, 4);
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - w / 2, y, w, h);
    ctx.fillStyle = "#3a2410";
    [[-w / 2 + 5, 5], [w / 2 - 5, 5], [-w / 2 + 5, h - 5], [w / 2 - 5, h - 5]].forEach(([dx, dy]) => ctx.fillRect(cx + dx - 1, y + dy - 1, 2, 2));
    ctx.textAlign = "center";
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#ffe08a";
    ctx.fillText("ADVERSÁRIOS MAIS FORTES VIRÃO!", cx, y + 15, w - 12);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.fillText("PREPARE-SE", cx, y + 28, w - 12);
    ctx.restore();
}
