// arenas.js — EDITOR DE ARENAS (v0.92): arenas montadas pelo jogador com peças separadas dos cenários do jogo
// (construções, nave, natureza, chão, céu e enfeites). Cada arena criada vira uma fase de verdade: entra no
// FASES_PADRAO (cenario "criada", sempre liberada), aparece em ARENAS, no mapa, no ranking e na luta, com a
// câmera dando a volta no centro como as fases 3D (cache drawCachedOrbitLayer + céu de 360°).
// Dados: localStorage "saiyan_arenas" (só números e textos — pequeno). Arquivo .arena.json para exportar/anexar
// (formatos/LEIA-ME-ARENAS.md). Carrega depois de mapa.js (usa as funções de desenho de cenarios3d.js e menu.js).

const ARENA_MAX = 7;            // arenas criadas (cabem na tela ARENAS e nas abas do ranking)
const ARENA_PECAS_MAX = 80;     // peças por arena (desempenho no celular)
const ARENA_RAIO = 420;         // a planta vai de -ARENA_RAIO a +ARENA_RAIO (o centro é onde a luta acontece)
const ARENA_FORMATO = "saiyan-fight-arena";
const ARENA_CAMERAS = {
    baixa: { CX: 400, HY: 118, D: 700, H: 110, F: 600, PERTO: 30, CORTE: 220 },
    media: { CX: 400, HY: 78, D: 720, H: 180, F: 580, PERTO: 30, CORTE: 190 },
    alta: { CX: 400, HY: 42, D: 700, H: 250, F: 560, PERTO: 30, CORTE: 160 }
};
const ARENA_CHAOS = {
    grama: { nome: "GRAMA", cor: "#6fbf4a" }, areia: { nome: "AREIA", cor: "#e3c98a" }, mar: { nome: "MAR", cor: "#2f86c9" },
    ladrilho: { nome: "PISO DE LADRILHOS", cor: "#cfd6df" }, terra: { nome: "TERRA", cor: "#a0703f" }, nuvens: { nome: "NUVENS", cor: "#e8f1fb" },
    espaco: { nome: "ESPAÇO", cor: "#1b1638" }, lava: { nome: "LAVA", cor: "#7a1d0c" }, neve: { nome: "NEVE", cor: "#eef4fb" }
};
const ARENA_ABAS = [["construcao", "CONSTRUÇÃO"], ["nave", "NAVE"], ["natureza", "NATUREZA"], ["chao", "CHÃO"], ["planicies", "PLANÍCIES"], ["ceu", "CÉU"], ["efeitos", "EFEITOS"], ["enfeites", "ENFEITES"]];
const ARENA_ANIMADAS_MAX = 10;   // peças que se mexem (desenhadas a cada quadro)
const ARENA_DESFAZER_MAX = 50;   // passos guardados no ↶ DESFAZER do editor
const ARENA_GRADE = 20;          // GRADE ligada: posições de 20 em 20 e giro de 15 em 15 graus
const ARENA_TESTE_ID = "arena_teste";   // fase temporária do TESTAR (só existe durante a luta de teste)
let arenaTeste = null;           // { ed, arena, antes } enquanto a luta de teste do editor acontece
// formatos das peças do chão (gramado, lago, lava...): o mesmo contorno serve de piso ou, com ALTURA, de monte
const ARENA_FORMATOS = [["circulo", "CÍRCULO"], ["oval", "OVAL"], ["feijao", "FEIJÃO"], ["irregular", "IRREGULAR"], ["rio", "RIO RETO"], ["rio_curvo", "RIO EM CURVA"]];

// ---------------- ajudantes de peça (coordenadas locais da peça -> mundo) ----------------
function arEsc(p) { return p.e || 1; }
function arGiro(p) { const a = (p.r || 0) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }
function arPt(p, lx, y, lz) {
    const [c, s] = arGiro(p), e = arEsc(p);
    return [p.x + (lx * c - lz * s) * e, y * e, p.z + (lx * s + lz * c) * e];
}
function arNormal(p, nx, ny, nz) { const [c, s] = arGiro(p); return [nx * c - nz * s, ny, nx * s + nz * c]; }
function arProj(p, lx, y, lz, ang) { const w = arPt(p, lx, y, lz); return trProj(w[0], w[1], w[2], ang); }
// clareia (q > 0) ou escurece (q < 0) uma cor #rrggbb e devolve #rrggbb (dá para misturar de novo)
function arMix(cor, q) {
    const n = parseInt(String(cor).slice(1), 16);
    if (!/^#[0-9a-f]{6}$/i.test(cor)) return cor;
    const f = (v) => Math.round(q >= 0 ? v + (255 - v) * q : v * (1 + q));
    return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, "0")).join("");
}
// luz do sol fixa no mundo: faces viradas para ela mais claras
const AR_SOL = (() => { const v = [-0.45, 0.6, 0.66], n = Math.hypot(...v); return v.map(c => c / n); })();
function arTom(cor, normal) {
    const l = normal[0] * AR_SOL[0] + normal[1] * AR_SOL[1] + normal[2] * AR_SOL[2];
    return arMix(cor, Math.max(-0.35, Math.min(0.25, (l - 0.3) * 0.5)));
}
function arFace(p, pts, n, cor, ang, contorno) {
    const nw = arNormal(p, n[0], n[1], n[2]);
    return c3Face(pts.map(q => arPt(p, q[0], q[1], q[2])), nw, arTom(cor, nw), ang, contorno);
}
// caixa local [x0,x1] x [y0,y1] x [z0,z1]; devolve as faces visíveis por nome (frente +z, tras -z, dir +x, esq -x, topo)
function arCaixa(p, x0, x1, y0, y1, z0, z1, cor, ang, corTopo, contorno) {
    const t = contorno === undefined ? "rgba(40, 50, 70, 0.35)" : contorno, v = {};
    v.tras = arFace(p, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], cor, ang, t);
    v.esq = arFace(p, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], cor, ang, t);
    v.dir = arFace(p, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], cor, ang, t);
    v.frente = arFace(p, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], cor, ang, t);
    v.topo = arFace(p, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0], corTopo || cor, ang, t);
    return v;
}
// polígono num plano local (pontos [lx, y, lz])
function arPoli(p, pts, cor, ang) {
    trPoly(pts.map(q => arProj(p, q[0], q[1], q[2], ang)));
    trG.fillStyle = cor; trG.fill();
}
// retângulo numa face vertical: face "frente"/"tras" (plano z) ou "dir"/"esq" (plano x), de a0..a1 na largura e b0..b1 de altura
function arRetFace(p, face, plano, a0, a1, b0, b1, cor, ang) {
    const q = (a, b) => face === "frente" ? [a, b, plano] : face === "tras" ? [-a, b, plano] : face === "dir" ? [plano, b, -a] : [plano, b, a];
    arPoli(p, [q(a0, b0), q(a1, b0), q(a1, b1), q(a0, b1)], cor, ang);
}
function arOvalFace(p, face, plano, ca, cb, ra, rb, cor, ang) {
    const pts = [];
    for (let i = 0; i < 14; i++) {
        const t = i / 14 * Math.PI * 2, a = ca + Math.cos(t) * ra, b = cb + Math.sin(t) * rb;
        pts.push(face === "frente" ? [a, b, plano] : face === "tras" ? [-a, b, plano] : face === "dir" ? [plano, b, -a] : [plano, b, a]);
    }
    arPoli(p, pts, cor, ang);
}
// grade de janelas numa face (largura -L..L, altura h0..h1)
function arJanelasFace(p, face, plano, L, h0, h1, cols, linhas, ang) {
    const cw = L * 2 / cols, rh = (h1 - h0) / linhas;
    for (let r = 0; r < linhas; r++) for (let c = 0; c < cols; c++) {
        const a0 = -L + c * cw + cw * 0.2, a1 = a0 + cw * 0.6, b0 = h0 + r * rh + rh * 0.2, b1 = b0 + rh * 0.6;
        arRetFace(p, face, plano, a0, a1, b0, b1, "#3a6cbf", ang);
        arRetFace(p, face, plano, a0, a1, b1 - (b1 - b0) * 0.35, b1, "#8db3ea", ang);
    }
}
// disco no chão (raio r) e retângulo no chão
function arDisco(p, r, cor, ang, y) {
    const pts = [];
    for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; pts.push([Math.cos(a) * r * (1 + 0.05 * Math.sin(a * 3 + p.x)), y || 0.5, Math.sin(a) * r]); }
    arPoli(p, pts, cor, ang);
}
function arRetChao(p, w, d, cor, ang, y) { arPoli(p, [[-w, y || 0.5, -d], [w, y || 0.5, -d], [w, y || 0.5, d], [-w, y || 0.5, d]], cor, ang); }
function arLinhaChao(p, a, b, cor, larg, ang) {
    const A = arProj(p, a[0], a[1], a[2], ang), B = arProj(p, b[0], b[1], b[2], ang);
    trG.strokeStyle = cor; trG.lineWidth = Math.max(0.6, larg * A[3]);
    trG.beginPath(); trG.moveTo(A[0], A[1]); trG.lineTo(B[0], B[1]); trG.stroke();
}
// semente fixa de cada peça (a mesma mesmo quando a vista anda ou centra nela)
function arSemente(p) { return p._s !== undefined ? p._s : (p.x || 0) * 0.01 + (p.z || 0) * 0.02; }
// relógio dos efeitos: o da luta durante a partida; nos menus e no editor, o relógio do navegador
function arRelogio() { return typeof gameState !== "undefined" && gameState === "playing" && typeof gameplayClock === "number" ? gameplayClock : performance.now() / 1000; }
// contorno (pontos locais [x, z]) de um formato com raio R; s = semente para o irregular
function arFormaPontos(f, R, s) {
    const pts = [];
    if (f === "rio" || f === "rio_curvo") {
        // faixa comprida com margens onduladas (reta ou em arco)
        const N = 16, L = R * 2.6, W = R * 0.42, curva = f === "rio_curvo";
        const centro = (u) => curva ? [Math.sin(u * 1.1) * R * 1.9, (1 - Math.cos(u * 1.1)) * R * 1.9 - R * 0.6] : [u * L / 2, 0];
        const lado = (u, sinal) => {
            const [cx, cz] = centro(u), e = 0.01, [ax, az] = centro(u + e), dx = ax - cx, dz = az - cz, m = Math.hypot(dx, dz) || 1;
            const w = W * (1 + 0.18 * Math.sin(u * 7 + s) * sinal);
            return [cx - dz / m * w * sinal, cz + dx / m * w * sinal];
        };
        for (let i = 0; i <= N; i++) pts.push(lado(-1 + 2 * i / N, 1));
        for (let i = N; i >= 0; i--) pts.push(lado(-1 + 2 * i / N, -1));
        return pts;
    }
    for (let i = 0; i < 32; i++) {
        const a = i / 32 * Math.PI * 2;
        let rx = R, rz = R;
        if (f === "oval") { rx = R * 1.45; rz = R * 0.7; }
        else if (f === "feijao") { const k = 1 + 0.22 * Math.cos(2 * a) - 0.38 * Math.pow(Math.max(0, Math.sin(a)), 3); rx = R * 1.25 * k; rz = R * 0.8 * k; }
        else if (f === "irregular") { const k = 1 + 0.2 * Math.sin(3 * a + s) + 0.12 * Math.sin(5 * a + s * 2.3); rx = R * k; rz = R * k; }
        else { const k = 1 + 0.05 * Math.sin(a * 3 + s); rx = R * k; rz = R * k; }
        pts.push([Math.cos(a) * rx, Math.sin(a) * rz]);
    }
    return pts;
}
function arRaioForma(p, R) { return arFormaPontos(p.f, R, 1).reduce((m, q) => Math.max(m, Math.hypot(q[0], q[1])), 0); }
// peça do chão com formato: piso plano ou, com altura (p.v), um monte em camadas (base larga embaixo, topo claro)
function arChaoForma(p, R, cor, ang, deco) {
    const pts = arFormaPontos(p.f, R, arSemente(p));
    const alt = Math.max(0, Math.min(3, p.v || 0)) * 22;
    if (!alt) {
        arPoli(p, pts.map(q => [q[0], 0.5, q[1]]), cor, ang);
        if (deco) deco(pts, 0.6);
        return;
    }
    const N = 8;
    for (let i = 0; i <= N; i++) {
        const f = i / N, k = Math.sqrt(1 - f * f * 0.92), y = alt * (1 - (1 - f) * (1 - f)) + 0.5;
        arPoli(p, pts.map(q => [q[0] * k, y, q[1] * k]), arMix(cor, -0.28 + f * 0.4), ang);
    }
    if (deco) deco(pts.map(q => [q[0] * 0.3, q[1] * 0.3]), alt + 0.8);
}
// figura plana virada para a câmera (estátua, placa...): ponto da base na tela + escala
function arBase(p, ang, y) { return trProj(p.x, (y || 0) * arEsc(p), p.z, ang); }

// ---------------- as peças ----------------
// aba, nome, cor padrão, planta (forma na planta de cima: ret [w, d] ou circ r) e o desenho.
// chao: desenhada antes de tudo (plana); ceu: vai no céu de 360° (a = azimute 0-360, h = altura 0-1); texto: tem TEXTO.
const ARENA_PECAS = {
    // ---- CONSTRUÇÃO ----
    bloco: { aba: "construcao", nome: "BLOCO QUADRADO", cor: "#d9dee6", planta: { ret: [15, 15] },
        desenha: (p, ang) => arCaixa(p, -15, 15, 0, 30, -15, 15, p.c, ang) },
    parede: { aba: "construcao", nome: "PAREDE", cor: "#e6e2d6", planta: { ret: [40, 4] },
        desenha: (p, ang) => arCaixa(p, -40, 40, 0, 36, -4, 4, p.c, ang) },
    parede_janelas: { aba: "construcao", nome: "PAREDE COM JANELAS", cor: "#eef2f7", planta: { ret: [40, 4] },
        desenha: (p, ang) => {
            const v = arCaixa(p, -40, 40, 0, 40, -4, 4, p.c, ang);
            if (v.frente) arJanelasFace(p, "frente", 4.3, 40, 4, 38, 4, 2, ang);
            if (v.tras) arJanelasFace(p, "tras", -4.3, 40, 4, 38, 4, 2, ang);
        } },
    parede_porta: { aba: "construcao", nome: "PAREDE COM PORTA", cor: "#f2d9b8", planta: { ret: [40, 4] },
        desenha: (p, ang) => {
            const v = arCaixa(p, -40, 40, 0, 40, -4, 4, p.c, ang);
            [["frente", 4.3], ["tras", -4.3]].forEach(([f, pl]) => {
                if (!v[f]) return;
                arRetFace(p, f, pl, -11, 11, 0, 28, "#f4f4f6", ang);
                arRetFace(p, f, pl, -9, 9, 0, 26, "#7a4a28", ang);
                arRetFace(p, f, pl, 5, 7, 12, 14, "#ffd447", ang);
            });
        } },
    predio: { aba: "construcao", nome: "PRÉDIO", cor: "#3b82f6", planta: { ret: [25, 20] },
        desenha: (p, ang) => {
            const v = arCaixa(p, -25, 25, 0, 72, -20, 20, "#eef2f7", ang, "#f7f9fc");
            if (v.frente) arJanelasFace(p, "frente", 20.3, 25, 6, 68, 3, 5, ang);
            if (v.tras) arJanelasFace(p, "tras", -20.3, 25, 6, 68, 3, 5, ang);
            if (v.dir) arJanelasFace(p, "dir", 25.3, 20, 6, 68, 2, 5, ang);
            if (v.esq) arJanelasFace(p, "esq", -25.3, 20, 6, 68, 2, 5, ang);
            arPoli(p, [[-21, 72.2, -16], [21, 72.2, -16], [21, 72.2, 16], [-21, 72.2, 16]], p.c, ang);
        } },
    casa_domo: { aba: "construcao", nome: "CASINHA REDONDA", cor: "#60a5fa", planta: { circ: 15 },
        desenha: (p, ang) => coCasa({ x: p.x, z: p.z, r: 14 * arEsc(p), faixa: p.c }, ang) },
    domo: { aba: "construcao", nome: "DOMO", cor: "#ffd447", planta: { circ: 42 },
        desenha: (p, ang) => {
            const e = arEsc(p);
            c3Cilindro(p.x, p.z, 0, 6 * e, 42 * e, "#e3e8f0", ang, "#f2f5f9", "rgba(90, 100, 125, 0.4)");
            c3Domo(p.x, p.z, 6 * e, 40 * e, 32 * e, p.c, ang);
        } },
    torre: { aba: "construcao", nome: "TORRE REDONDA", cor: "#e8edf3", planta: { circ: 13 },
        desenha: (p, ang) => {
            const e = arEsc(p);
            c3Cilindro(p.x, p.z, 0, 90 * e, 12 * e, p.c, ang, arMix(p.c, 0.3), "rgba(80, 100, 130, 0.45)");
            const a = c3Anel(p.x, p.z, 74 * e, 12.4 * e, ang);
            trG.fillStyle = "#5b8ed0"; trG.beginPath(); trG.ellipse(a.cx, a.cy, a.rx, a.ry + 3 * a.k * e, 0, 0, Math.PI); trG.fill();
            c3Domo(p.x, p.z, 90 * e, 12 * e, 10 * e, "#d9a53c", ang);
        } },
    torre_mirante: { aba: "construcao", nome: "TORRE MIRANTE", cor: "#f4f7fb", planta: { circ: 15 },
        desenha: (p, ang) => pcTorre(p.x, p.z, ang) },
    pilar: { aba: "construcao", nome: "PILAR", cor: "#cfc6b8", planta: { ret: [9, 9] },
        desenha: (p, ang) => {
            arCaixa(p, -9, 9, 0, 6, -9, 9, p.c, ang);
            arCaixa(p, -6, 6, 6, 62, -6, 6, arMix(p.c, 0.08), ang);
            arCaixa(p, -9, 9, 62, 68, -9, 9, p.c, ang);
        } },
    escada: { aba: "construcao", nome: "ESCADA", cor: "#e2ddd2", planta: { ret: [30, 24] },
        desenha: (p, ang) => { for (let i = 0; i < 4; i++) arCaixa(p, -30, 30, i * 6, i * 6 + 6, -24 + i * 12, 24, p.c, ang); } },
    ringue: { aba: "construcao", nome: "RINGUE DE LUTA", cor: "#d8d4cc", planta: { ret: [80, 80] },
        desenha: (p, ang) => {
            arCaixa(p, -86, 86, 0, 4, -86, 86, arMix(p.c, -0.15), ang);
            arCaixa(p, -80, 80, 4, 10, -80, 80, p.c, ang);
            trG.save();
            for (let i = -60; i <= 60; i += 20) {
                arLinhaChao(p, [i, 10.2, -80], [i, 10.2, 80], "rgba(90, 90, 100, 0.45)", 1, ang);
                arLinhaChao(p, [-80, 10.2, i], [80, 10.2, i], "rgba(90, 90, 100, 0.45)", 1, ang);
            }
            trG.restore();
        } },
    portao: { aba: "construcao", nome: "PORTÃO", cor: "#d9342b", planta: { ret: [36, 5] },
        desenha: (p, ang) => {
            arCaixa(p, -32, -26, 0, 56, -3, 3, p.c, ang);
            arCaixa(p, 26, 32, 0, 56, -3, 3, p.c, ang);
            arCaixa(p, -38, 38, 50, 56, -4, 4, p.c, ang);
            arCaixa(p, -42, 42, 58, 63, -5, 5, "#2b2b2b", ang);
        } },
    // ---- NAVE ----
    casco_nave: { aba: "nave", nome: "CASCO DE NAVE", cor: "#e9edf3", planta: { circ: 90 },
        desenha: (p, ang) => {
            const e = arEsc(p);
            c3Cilindro(p.x, p.z, 10 * e, 24 * e, 90 * e, "#c9d1dd", ang, "#d8dee8", "rgba(70, 80, 100, 0.45)");
            const a = c3Anel(p.x, p.z, 17 * e, 90.5 * e, ang);
            for (let i = -6; i <= 6; i++) {
                const u = i / 7, px = a.cx + u * a.rx, py = a.cy + a.ry * Math.sqrt(1 - u * u);
                trG.fillStyle = "#24345a"; trG.beginPath(); trG.ellipse(px, py, 5 * a.k * e * Math.sqrt(1 - u * u) + 1, 3.4 * a.k * e, 0, 0, Math.PI * 2); trG.fill();
                trG.fillStyle = "#8fb4ea"; trG.beginPath(); trG.ellipse(px - 1.2 * a.k * e, py - 1 * a.k * e, 1.6 * a.k * e * Math.sqrt(1 - u * u) + 0.4, 1 * a.k * e, 0, 0, Math.PI * 2); trG.fill();
            }
            c3Domo(p.x, p.z, 24 * e, 84 * e, 44 * e, p.c, ang);
            const t = c3Anel(p.x, p.z, 24 * e, 84 * e, ang);
            trG.fillStyle = "#ffd447";
            for (let i = -4; i <= 4; i++) { const u = i / 5; trG.beginPath(); trG.arc(t.cx + u * t.rx, t.cy + t.ry * Math.sqrt(1 - u * u) - 2 * t.k, 1.8 * t.k * e, 0, Math.PI * 2); trG.fill(); }
        } },
    perna_aco: { aba: "nave", nome: "PERNA DE AÇO", cor: "#9aa5b5", planta: { ret: [22, 5] },
        desenha: (p, ang) => {
            const A = arProj(p, -14, 46, 0, ang), B = arProj(p, 22, 0, 0, ang), k = A[3] * arEsc(p);
            trG.lineCap = "round";
            trG.strokeStyle = arMix(p.c, -0.3); trG.lineWidth = Math.max(2, 9 * k);
            trG.beginPath(); trG.moveTo(A[0], A[1]); trG.lineTo(B[0], B[1]); trG.stroke();
            trG.strokeStyle = p.c; trG.lineWidth = Math.max(1.4, 6 * k); trG.stroke();
            trG.strokeStyle = "rgba(255, 255, 255, 0.55)"; trG.lineWidth = Math.max(0.6, 1.6 * k);
            trG.beginPath(); trG.moveTo(A[0] - 1.5 * k, A[1]); trG.lineTo(B[0] - 1.5 * k, B[1] - 2 * k); trG.stroke();
            trG.lineCap = "butt";
            trG.fillStyle = arMix(p.c, -0.2);
            trG.beginPath(); trG.ellipse(B[0], B[1], 10 * k, 3.4 * k, 0, 0, Math.PI * 2); trG.fill();
        } },
    parede_metal: { aba: "nave", nome: "PAREDE DE METAL COM JANELAS OVAIS", cor: "#b8c2d0", planta: { ret: [40, 4] },
        desenha: (p, ang) => {
            const v = arCaixa(p, -40, 40, 0, 34, -4, 4, p.c, ang);
            [["frente", 4.3], ["tras", -4.3]].forEach(([f, pl]) => {
                if (!v[f]) return;
                [-24, 0, 24].forEach(a => { arOvalFace(p, f, pl, a, 18, 8, 9, "#24345a", ang); arOvalFace(p, f, pl, a - 2, 21, 3.2, 3.4, "#8fb4ea", ang); });
            });
        } },
    painel_botoes: { aba: "nave", nome: "PAINEL DE BOTÕES", cor: "#5b6577", planta: { ret: [16, 9] },
        desenha: (p, ang) => {
            const v = arCaixa(p, -16, 16, 0, 20, -9, 9, p.c, ang, arMix(p.c, -0.25));
            if (v.frente) { arRetFace(p, "frente", 9.3, -12, 12, 6, 16, "#0f2a3d", ang); arRetFace(p, "frente", 9.4, -10, 2, 8, 14, "#22d3ee", ang); }
            [["#ef4444", -9], ["#facc15", -3], ["#22c55e", 3], ["#3b82f6", 9]].forEach(([cor, lx]) => {
                const q = arProj(p, lx, 20.5, 2, ang);
                trG.fillStyle = cor; trG.beginPath(); trG.ellipse(q[0], q[1], 2.4 * q[3] * arEsc(p), 1.3 * q[3] * arEsc(p), 0, 0, Math.PI * 2); trG.fill();
            });
        } },
    antena: { aba: "nave", nome: "ANTENA", cor: "#ef4444", planta: { circ: 5 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), t = arBase(p, ang, 70), k = b[3] * arEsc(p);
            trG.strokeStyle = "#c7cfdb"; trG.lineWidth = Math.max(1, 2.4 * k);
            trG.beginPath(); trG.moveTo(b[0], b[1]); trG.lineTo(t[0], t[1]); trG.stroke();
            trG.fillStyle = p.c; trG.beginPath(); trG.arc(t[0], t[1], 4 * k, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "rgba(255, 255, 255, 0.6)"; trG.beginPath(); trG.arc(t[0] - 1.2 * k, t[1] - 1.2 * k, 1.4 * k, 0, Math.PI * 2); trG.fill();
        } },
    capsula: { aba: "nave", nome: "CÁPSULA ESPACIAL", cor: "#e9edf3", planta: { circ: 16 },
        desenha: (p, ang) => {
            const c = arBase(p, ang, 16), k = c[3] * arEsc(p), r = 15 * k;
            const g = trG.createRadialGradient(c[0] - r * 0.4, c[1] - r * 0.4, r * 0.1, c[0], c[1], r);
            g.addColorStop(0, "#ffffff"); g.addColorStop(1, arMix(p.c, -0.35));
            trG.strokeStyle = "#8a94a6"; trG.lineWidth = Math.max(1, 2 * k);
            trG.beginPath(); trG.moveTo(c[0] - r * 0.7, c[1] + r * 0.6); trG.lineTo(c[0] - r, c[1] + r * 1.1); trG.moveTo(c[0] + r * 0.7, c[1] + r * 0.6); trG.lineTo(c[0] + r, c[1] + r * 1.1); trG.stroke();
            trG.fillStyle = g; trG.beginPath(); trG.arc(c[0], c[1], r, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "#b91c1c"; trG.beginPath(); trG.ellipse(c[0], c[1] - r * 0.1, r * 0.55, r * 0.4, 0, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "rgba(255, 200, 200, 0.6)"; trG.beginPath(); trG.ellipse(c[0] - r * 0.2, c[1] - r * 0.25, r * 0.18, r * 0.1, -0.4, 0, Math.PI * 2); trG.fill();
        } },
    luz_pista: { aba: "nave", nome: "LUZ DE PISTA", cor: "#7dd3fc", planta: { circ: 4 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), t = arBase(p, ang, 14), k = b[3] * arEsc(p);
            trG.fillStyle = "#6b7280"; trG.fillRect(b[0] - 1.5 * k, t[1], 3 * k, b[1] - t[1]);
            const g = trG.createRadialGradient(t[0], t[1], 0, t[0], t[1], 9 * k);
            g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, p.c); g.addColorStop(1, "rgba(0, 0, 0, 0)");
            trG.fillStyle = g; trG.beginPath(); trG.arc(t[0], t[1], 9 * k, 0, Math.PI * 2); trG.fill();
        } },
    // ---- NATUREZA ----
    coqueiro: { aba: "natureza", nome: "COQUEIRO", cor: "#3fa548", planta: { circ: 10 },
        desenha: (p, ang) => { const e = arEsc(p), [c, s] = arGiro(p); khDrawCoqueiro({ x: p.x, z: p.z, lx: 16 * e * c, lz: 16 * e * s, h: 70 * e }, ang); } },
    palmeira: { aba: "natureza", nome: "PALMEIRA PEQUENA", cor: "#43a84c", planta: { circ: 8 },
        desenha: (p, ang) => pcCoqueiro(p.x, p.z, ang) },
    cipreste: { aba: "natureza", nome: "CIPRESTE", cor: "#1f5a3a", planta: { circ: 6 },
        desenha: (p, ang) => pcCipreste({ x: p.x, z: p.z, h: 34 * arEsc(p) }, ang) },
    arvore: { aba: "natureza", nome: "ÁRVORE REDONDA", cor: "#2f7a32", planta: { circ: 10 },
        desenha: (p, ang) => coArvore({ x: p.x, z: p.z, t: 9 * arEsc(p) }, ang) },
    arbusto: { aba: "natureza", nome: "ARBUSTO", cor: "#3c9440", planta: { circ: 12 },
        desenha: (p, ang) => khDrawArbusto({ x: p.x, z: p.z, r: 12 * arEsc(p) }, ang) },
    pedra: { aba: "natureza", nome: "PEDRA", cor: "#9aa58a", planta: { circ: 14 },
        desenha: (p, ang) => khDrawPedra({ x: p.x, z: p.z, r: 14 * arEsc(p) }, ang) },
    mesa_pedra: { aba: "natureza", nome: "MESA DE PEDRA", cor: "#b8875a", planta: { circ: 30 },
        desenha: (p, ang) => {
            const e = arEsc(p);
            c3Cilindro(p.x, p.z, 0, 90 * e, 30 * e, p.c, ang, arMix(p.c, 0.2), "rgba(80, 50, 30, 0.45)");
            [28, 52, 72].forEach(y => { const a = c3Anel(p.x, p.z, y * e, 30.3 * e, ang); trG.strokeStyle = "rgba(90, 55, 30, 0.45)"; trG.lineWidth = 1; trG.beginPath(); trG.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0.1, Math.PI - 0.1); trG.stroke(); });
        } },
    montanha: { aba: "natureza", nome: "MONTANHA", cor: "#7b8794", planta: { circ: 90 },
        desenha: (p, ang) => {
            const e = arEsc(p), a = c3Anel(p.x, p.z, 0, 90 * e, ang), t = trProj(p.x, 140 * e, p.z, ang);
            const g = trG.createLinearGradient(a.cx - a.rx, 0, a.cx + a.rx, 0);
            g.addColorStop(0, arMix(p.c, 0.15)); g.addColorStop(1, arMix(p.c, -0.3));
            trG.fillStyle = g;
            trG.beginPath(); trG.moveTo(a.cx - a.rx, a.cy); trG.lineTo(t[0], t[1]); trG.lineTo(a.cx + a.rx, a.cy); trG.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI); trG.closePath(); trG.fill();
            const f = 0.28, nx = (q) => t[0] + (q - t[0]) * f, ny = t[1] + (a.cy - t[1]) * f;
            trG.fillStyle = "#f4f7fb";
            trG.beginPath(); trG.moveTo(t[0], t[1]); trG.lineTo(nx(a.cx + a.rx), ny); trG.lineTo(t[0] + (nx(a.cx + a.rx) - t[0]) * 0.4, ny - 4 * a.k); trG.lineTo(t[0], ny + 3 * a.k); trG.lineTo(nx(a.cx - a.rx), ny); trG.closePath(); trG.fill();
        } },
    cristal: { aba: "natureza", nome: "CRISTAL", cor: "#7dd3fc", planta: { circ: 10 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), k = b[3] * arEsc(p);
            [[-6, 30, -0.2], [4, 40, 0.1], [11, 22, 0.35]].forEach(([dx, h, inc]) => {
                const x = b[0] + dx * k, y = b[1], w = 5 * k, tx = x + inc * h * k, ty = y - h * k;
                trG.fillStyle = arMix(p.c, -0.2); trG.beginPath(); trG.moveTo(x - w, y); trG.lineTo(tx, ty); trG.lineTo(x + w, y); trG.closePath(); trG.fill();
                trG.fillStyle = arMix(p.c, 0.35); trG.beginPath(); trG.moveTo(x - w * 0.2, y); trG.lineTo(tx, ty); trG.lineTo(x + w, y); trG.closePath(); trG.fill();
            });
        } },
    // ---- CHÃO (planas) ----
    gramado: { aba: "chao", chao: true, forma: 70, nome: "GRAMADO", cor: "#6fc04e", planta: { circ: 70 }, desenha: (p, ang) => arChaoForma(p, 70, p.c, ang) },
    lago: { aba: "chao", chao: true, forma: 60, nome: "LAGO", cor: "#4aa3df", planta: { circ: 60 },
        desenha: (p, ang) => arChaoForma(p, 60, p.c, ang, (pts, y) => {
            arPoli(p, pts.map(q => [q[0] * 0.66, y, q[1] * 0.66]), arMix(p.c, 0.18), ang);
            arPoli(p, pts.map(q => [q[0] * 0.3, y + 0.1, q[1] * 0.3]), arMix(p.c, 0.32), ang);
        }) },
    areia: { aba: "chao", chao: true, forma: 70, nome: "AREIA", cor: "#e8d39a", planta: { circ: 70 }, desenha: (p, ang) => arChaoForma(p, 70, p.c, ang) },
    terra: { aba: "chao", chao: true, forma: 70, nome: "TERRA", cor: "#9c6b3f", planta: { circ: 70 }, desenha: (p, ang) => arChaoForma(p, 70, p.c, ang) },
    lava: { aba: "chao", chao: true, forma: 60, nome: "LAVA", cor: "#ff5a1f", planta: { circ: 60 },
        desenha: (p, ang) => arChaoForma(p, 60, p.c, ang, (pts, y) => arPoli(p, pts.map(q => [q[0] * 0.55, y, q[1] * 0.55]), "#ffc04d", ang)) },
    neve: { aba: "chao", chao: true, forma: 70, nome: "NEVE", cor: "#eef4fb", planta: { circ: 70 }, desenha: (p, ang) => arChaoForma(p, 70, p.c, ang) },
    piso: { aba: "chao", chao: true, nome: "PISO DE LADRILHOS", cor: "#d9d4c7", planta: { ret: [80, 80] },
        desenha: (p, ang) => {
            arRetChao(p, 80, 80, p.c, ang);
            for (let i = -60; i <= 60; i += 20) { arLinhaChao(p, [i, 0.6, -80], [i, 0.6, 80], "rgba(90, 90, 100, 0.4)", 1, ang); arLinhaChao(p, [-80, 0.6, i], [80, 0.6, i], "rgba(90, 90, 100, 0.4)", 1, ang); }
        } },
    estrada: { aba: "chao", chao: true, nome: "ESTRADA", cor: "#8d96a3", planta: { ret: [100, 13] },
        desenha: (p, ang) => {
            arRetChao(p, 100, 13, p.c, ang);
            for (let i = -90; i < 90; i += 24) arLinhaChao(p, [i, 0.6, 0], [i + 12, 0.6, 0], "rgba(255, 255, 255, 0.8)", 1.4, ang);
        } },
    trilha: { aba: "chao", chao: true, nome: "TRILHA", cor: "#efe4c2", planta: { ret: [80, 7] }, desenha: (p, ang) => arRetChao(p, 80, 7, p.c, ang) },
    // ---- CÉU (no céu de 360°: desenhadas uma vez na faixa) ----
    sol: { aba: "ceu", ceu: true, nome: "SOL", cor: "#fff3b0",
        desenha: (g, x, y, r, p) => {
            const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
            gr.addColorStop(0, "rgba(255, 250, 220, 0.95)"); gr.addColorStop(0.4, "rgba(255, 240, 180, 0.35)"); gr.addColorStop(1, "rgba(255, 240, 180, 0)");
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.4, 0, Math.PI * 2); g.fill();
            g.fillStyle = p.c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        } },
    lua: { aba: "ceu", ceu: true, nome: "LUA", cor: "#d6d3cc", desenha: (g, x, y, r, p, s) => ksPlaneta(g, x, y, r, "lua", s) },
    planeta_gasoso: { aba: "ceu", ceu: true, nome: "PLANETA GASOSO", cor: "#d9b48a",
        desenha: (g, x, y, r, p, s) => {
            ksPlaneta(g, x, y, r, "jupiter", s);
            g.strokeStyle = "rgba(230, 210, 170, 0.75)"; g.lineWidth = Math.max(1, r * 0.12);
            g.beginPath(); g.ellipse(x, y, r * 1.7, r * 0.38, -0.25, 0.15, Math.PI * 2 - 0.15); g.stroke();
        } },
    planeta_oceano: { aba: "ceu", ceu: true, nome: "PLANETA OCEANO", cor: "#2f86c9", desenha: (g, x, y, r, p, s) => ksPlaneta(g, x, y, r, "oceano", s) },
    planeta_terra: { aba: "ceu", ceu: true, nome: "PLANETA TERRA", cor: "#4a9a5a", desenha: (g, x, y, r, p, s) => ksPlaneta(g, x, y, r, "terra", s) },
    nuvem: { aba: "ceu", ceu: true, nome: "NUVEM", cor: "#ffffff", desenha: (g, x, y, r, p, s) => khNuvem(g, x, y + r * 0.6, r * 5, r * 1.6, s) },
    estrelas: { aba: "ceu", ceu: true, nome: "ESTRELAS", cor: "#ffffff",
        desenha: (g, x, y, r, p, s) => {
            g.fillStyle = p.c;
            for (let i = 0; i < 40; i++) { const sx = x + (c3Hash(s * 13 + i) - 0.5) * r * 12, sy = y + (c3Hash(s * 29 + i * 3) - 0.5) * r * 3.2, t = 0.5 + c3Hash(s + i * 7) * 1.1; g.globalAlpha = 0.5 + c3Hash(i + s) * 0.5; g.fillRect(sx, sy, t, t); }
            g.globalAlpha = 1;
        } },
    morros: { aba: "ceu", ceu: true, nome: "MORROS NO HORIZONTE", cor: "#6fa86a", baixo: true,
        desenha: (g, x, y, r, p, s, base) => {
            g.fillStyle = p.c;
            for (let i = 0; i < 6; i++) {
                const cx = x + (i - 2.5) * r * 2.2, l = r * (1.6 + c3Hash(s + i) * 1.4), a = r * (0.5 + c3Hash(s * 3 + i) * 0.7);
                g.beginPath(); g.moveTo(cx - l, base); g.quadraticCurveTo(cx, base - a * 2, cx + l, base); g.closePath(); g.fill();
            }
        } },
    montanhas_neve: { aba: "ceu", ceu: true, nome: "MONTANHAS COM NEVE", cor: "#7b8794", baixo: true,
        desenha: (g, x, y, r, p, s, base) => {
            for (let i = 0; i < 5; i++) {
                const cx = x + (i - 2) * r * 2, l = r * (1.2 + c3Hash(s + i) * 0.8), a = r * (1.2 + c3Hash(s * 5 + i) * 1.2);
                g.fillStyle = arMix(p.c, (i % 2) * -0.15); g.beginPath(); g.moveTo(cx - l, base); g.lineTo(cx, base - a); g.lineTo(cx + l, base); g.closePath(); g.fill();
                g.fillStyle = "#f4f7fb"; g.beginPath(); g.moveTo(cx - l * 0.3, base - a * 0.7); g.lineTo(cx, base - a); g.lineTo(cx + l * 0.3, base - a * 0.7); g.closePath(); g.fill();
            }
        } },
    cidade_longe: { aba: "ceu", ceu: true, nome: "CIDADE AO LONGE", cor: "#e1e8f5", baixo: true,
        desenha: (g, x, y, r, p, s, base) => {
            for (let i = 0; i < 14; i++) {
                const w = r * (0.4 + c3Hash(s + i) * 0.5), h = r * (0.6 + c3Hash(s * 7 + i) * 1.8), bx = x + (i - 7) * r * 0.75;
                g.fillStyle = p.c; g.fillRect(bx, base - h, w, h);
                g.fillStyle = ["#f9a8d4", "#fde68a", "#93c5fd"][i % 3]; g.fillRect(bx, base - h, w, Math.max(1, r * 0.12));
            }
        } },
    ilha_pedra: { aba: "natureza", nome: "ILHA DE PEDRA RACHADA", cor: "#5b86a8", planta: { circ: 50 },
        desenha: (p, ang) => {
            const e = arEsc(p);
            c3Cilindro(p.x, p.z, 0, 16 * e, 50 * e, "#3a2c44", ang, p.c);
            const a = c3Anel(p.x, p.z, 16 * e, 50 * e, ang);
            trG.fillStyle = "rgba(255, 255, 255, 0.18)"; trG.beginPath(); trG.ellipse(a.cx - a.rx * 0.25, a.cy - a.ry * 0.2, a.rx * 0.45, a.ry * 0.4, 0, 0, Math.PI * 2); trG.fill();
            trG.strokeStyle = "#ff8a1e"; trG.lineWidth = Math.max(1, 2 * a.k * e);
            trG.beginPath(); trG.moveTo(a.cx - a.rx * 0.6, a.cy); trG.lineTo(a.cx - a.rx * 0.1, a.cy + a.ry * 0.3); trG.lineTo(a.cx + a.rx * 0.2, a.cy - a.ry * 0.2); trG.lineTo(a.cx + a.rx * 0.6, a.cy + a.ry * 0.1); trG.stroke();
        } },
    // ---- EFEITOS (se mexem: desenhados a cada quadro, por cima do cenário guardado) ----
    coluna_lava: { aba: "efeitos", anim: true, nome: "COLUNA DE LAVA", cor: "#ffb020", planta: { circ: 14 },
        desenha: (p, ang, t) => {
            const b = arBase(p, ang), topo = arBase(p, ang, 260), k = b[3] * arEsc(p), L = 26 * k, x = b[0], y = b[1], fase = arSemente(p);
            const brilho = 0.75 + Math.sin(t * 3 + fase) * 0.25;
            trG.fillStyle = "rgba(40, 26, 24, 0.85)";
            for (let i = 0; i < 7; i++) { const fy = topo[1] + (y - topo[1]) * (i / 9), fx = x + Math.sin(i * 1.7 + fase + t * 0.5) * L * 1.2; trG.beginPath(); trG.arc(fx, fy, L * (1.6 + (6 - i) * 0.35), 0, Math.PI * 2); trG.fill(); }
            trG.fillStyle = "rgba(70, 50, 55, 0.7)";
            for (let i = 0; i < 5; i++) { trG.beginPath(); trG.arc(x + (i - 2) * L * 1.4, topo[1] - L * (1 + (i % 2)), L * 1.8, 0, Math.PI * 2); trG.fill(); }
            const lava = trG.createLinearGradient(x - L, 0, x + L, 0);
            lava.addColorStop(0, "#b3160d"); lava.addColorStop(0.5, `rgba(255, ${Math.round(150 * brilho)}, 40, 1)`); lava.addColorStop(1, "#b3160d");
            trG.fillStyle = lava; trG.fillRect(x - L / 2, topo[1], L, y - topo[1]);
            const altura = y - topo[1];
            trG.fillStyle = p.c;
            for (let i = 0; i < 5; i++) { const f = ((i / 5 - t * 0.9 + fase) % 1 + 1) % 1; trG.fillRect(x - L * 0.12 + Math.sin(i * 2 + t * 3) * L * 0.18, topo[1] + altura * f, L * 0.2, altura * 0.1); }
            trG.fillStyle = "#ff9a2e";
            for (let i = 0; i < 6; i++) { const u = ((t * 0.8 + i / 6 + fase) % 1 + 1) % 1, lado = i % 2 ? 1 : -1; trG.beginPath(); trG.arc(x + lado * L * (0.3 + u * 2.2), topo[1] - L * 2.2 * u * (1 - u) * 4 + altura * u * u * 0.25, Math.max(1, L * 0.16 * (1 - u * 0.5)), 0, Math.PI * 2); trG.fill(); }
            trG.fillStyle = "#d4260f"; trG.beginPath(); trG.ellipse(x, y, L * 2.2, L * 0.4, 0, 0, Math.PI * 2); trG.fill();
        } },
    arco_lava: { aba: "efeitos", anim: true, nome: "ARCO DE LAVA", cor: "#ffd36b", planta: { ret: [70, 6] },
        desenha: (p, ang, t) => {
            const a = arProj(p, -70, 0, 0, ang), b = arProj(p, 70, 0, 0, ang), cima = arProj(p, 0, 190, 0, ang), k = a[3] * arEsc(p);
            trG.lineCap = "round";
            trG.strokeStyle = "rgba(255, 90, 20, 0.55)"; trG.lineWidth = Math.max(2, 9 * k);
            trG.beginPath(); trG.moveTo(a[0], a[1]); trG.quadraticCurveTo(cima[0], cima[1], b[0], b[1]); trG.stroke();
            trG.strokeStyle = p.c; trG.lineWidth = Math.max(1, 3 * k); trG.stroke();
            trG.lineCap = "butt";
            trG.fillStyle = "#fff1b0";
            for (let i = 0; i < 4; i++) {
                const u = ((t * 0.45 + i / 4) % 1 + 1) % 1, v = 1 - u;
                trG.beginPath(); trG.arc(v * v * a[0] + 2 * u * v * cima[0] + u * u * b[0], v * v * a[1] + 2 * u * v * cima[1] + u * u * b[1], Math.max(1.2, 5 * k), 0, Math.PI * 2); trG.fill();
            }
        } },
    brasas: { aba: "efeitos", anim: true, nome: "BRASAS SUBINDO", cor: "#ffb43b", planta: { circ: 30 },
        desenha: (p, ang, t) => {
            for (let i = 0; i < 16; i++) {
                const s = c3Hash(i * 3.3 + arSemente(p) * 10), u = ((t * (0.25 + s * 0.3) + s) % 1 + 1) % 1;
                const q = arProj(p, (c3Hash(i * 5.1) - 0.5) * 60 + Math.sin(t * 2 + i) * 6, u * 110, (c3Hash(i * 7.7) - 0.5) * 60, ang);
                trG.globalAlpha = 1 - u; trG.fillStyle = i % 2 ? p.c : "#ff7a1e";
                trG.fillRect(q[0], q[1], Math.max(1, 2.2 * q[3]), Math.max(1, 4 * q[3]));
            }
            trG.globalAlpha = 1;
        } },
    fumaca: { aba: "efeitos", anim: true, nome: "FUMAÇA", cor: "#4b4246", planta: { circ: 20 },
        desenha: (p, ang, t) => {
            for (let i = 0; i < 8; i++) {
                const u = ((t * 0.18 + i / 8) % 1 + 1) % 1, q = arProj(p, Math.sin(u * 5 + i) * 12, u * 160, 0, ang), r = (10 + u * 30) * q[3] * arEsc(p);
                trG.globalAlpha = 0.55 * (1 - u); trG.fillStyle = p.c;
                trG.beginPath(); trG.arc(q[0], q[1], r, 0, Math.PI * 2); trG.fill();
            }
            trG.globalAlpha = 1;
        } },
    nuvens_passando: { aba: "efeitos", anim: true, nome: "NUVENS PASSANDO", cor: "#ffffff", planta: { ret: [90, 20] },
        desenha: (p, ang, t) => {
            for (let i = 0; i < 4; i++) {
                const u = ((t * 0.05 + i / 4) % 1 + 1) % 1, q = arProj(p, -90 + u * 180, 14 + (i % 2) * 8, (i - 1.5) * 10, ang), k = q[3] * arEsc(p);
                trG.globalAlpha = Math.sin(u * Math.PI) * 0.85; trG.fillStyle = p.c;
                [[-14, 0, 12], [0, -5, 15], [14, 0, 11], [4, 4, 12]].forEach(([dx, dy, r]) => { trG.beginPath(); trG.arc(q[0] + dx * k, q[1] + dy * k, r * k, 0, Math.PI * 2); trG.fill(); });
            }
            trG.globalAlpha = 1;
        } },
    raio: { aba: "efeitos", anim: true, nome: "RAIO", cor: "#fffbe6", planta: { circ: 10 },
        desenha: (p, ang, t) => {
            const fase = arModulo(arSemente(p) * 7, 3.2), ciclo = ((t + fase) % 3.2 + 3.2) % 3.2;
            if (ciclo > 0.22) return;
            const b = arBase(p, ang), semente = Math.floor((t + fase) / 3.2);
            trG.strokeStyle = p.c; trG.lineWidth = 2.2;
            trG.beginPath();
            let rx = b[0] + (c3Hash(semente) - 0.5) * 80, ry = 0;
            trG.moveTo(rx, ry);
            for (let i = 1; i <= 8; i++) { rx += (c3Hash(semente * 7 + i) - 0.5) * 40; ry = b[1] * i / 8; trG.lineTo(i === 8 ? b[0] : rx, ry); }
            trG.stroke();
            trG.fillStyle = `rgba(230, 255, 210, ${0.16 * (1 - ciclo / 0.22)})`; trG.fillRect(0, 0, canvas.width, canvas.height);
        } },
    // ---- ENFEITES ----
    estatua: { aba: "enfeites", nome: "ESTÁTUA", cor: "#b8b2a6", planta: { ret: [10, 10] },
        desenha: (p, ang) => {
            arCaixa(p, -10, 10, 0, 12, -10, 10, arMix(p.c, -0.1), ang);
            const b = arBase(p, ang, 12), k = b[3] * arEsc(p), cor = p.c, esc = arMix(p.c, -0.3);
            const x = b[0], y = b[1];
            trG.fillStyle = esc;
            trG.fillRect(x - 5 * k, y - 18 * k, 4 * k, 18 * k); trG.fillRect(x + 1 * k, y - 18 * k, 4 * k, 18 * k);   // pernas
            trG.fillStyle = cor;
            trG.beginPath(); trG.moveTo(x - 8 * k, y - 34 * k); trG.lineTo(x + 8 * k, y - 34 * k); trG.lineTo(x + 6 * k, y - 17 * k); trG.lineTo(x - 6 * k, y - 17 * k); trG.closePath(); trG.fill();   // tronco
            trG.fillStyle = esc; trG.fillRect(x - 9 * k, y - 30 * k, 18 * k, 5 * k);   // braços cruzados
            trG.fillStyle = cor; trG.beginPath(); trG.arc(x, y - 39 * k, 5 * k, 0, Math.PI * 2); trG.fill();   // cabeça
            trG.beginPath(); trG.moveTo(x - 5 * k, y - 41 * k); trG.lineTo(x - 7 * k, y - 49 * k); trG.lineTo(x - 2 * k, y - 44 * k); trG.lineTo(x, y - 51 * k); trG.lineTo(x + 2 * k, y - 44 * k); trG.lineTo(x + 7 * k, y - 49 * k); trG.lineTo(x + 5 * k, y - 41 * k); trG.closePath(); trG.fill();   // cabelo espetado
        } },
    simbolo: { aba: "enfeites", nome: "SÍMBOLO", cor: "#ff8c1a", texto: "亀", planta: { circ: 6 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), t = arBase(p, ang, 44), k = b[3] * arEsc(p);
            trG.fillStyle = "#6b4a22"; trG.fillRect(b[0] - 1.6 * k, t[1], 3.2 * k, b[1] - t[1]);
            trG.fillStyle = p.c; trG.beginPath(); trG.arc(t[0], t[1], 11 * k, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "#ffffff"; trG.beginPath(); trG.arc(t[0], t[1], 8.5 * k, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "#111111"; trG.font = `bold ${Math.max(4, Math.round(11 * k))}px sans-serif`; trG.textAlign = "center"; trG.textBaseline = "middle";
            trG.fillText(String(p.txt || "亀").slice(0, 2), t[0], t[1] + 0.5 * k);
            trG.textBaseline = "alphabetic";
        } },
    placa: { aba: "enfeites", nome: "PLACA COM TEXTO", cor: "#8b5a2b", texto: "SAIYAN FIGHT", planta: { ret: [22, 3] },
        desenha: (p, ang) => {
            const b = arBase(p, ang), k = b[3] * arEsc(p), x = b[0], y = b[1];
            trG.fillStyle = "#5a3a1c"; trG.fillRect(x - 18 * k, y - 18 * k, 2.5 * k, 18 * k); trG.fillRect(x + 15.5 * k, y - 18 * k, 2.5 * k, 18 * k);
            trG.fillStyle = p.c; trG.fillRect(x - 24 * k, y - 32 * k, 48 * k, 16 * k);
            trG.strokeStyle = arMix(p.c, -0.4); trG.lineWidth = Math.max(0.6, k); trG.strokeRect(x - 24 * k, y - 32 * k, 48 * k, 16 * k);
            trG.fillStyle = "#ffffff"; trG.font = `bold ${Math.max(4, Math.round(7 * k))}px 'Trebuchet MS', sans-serif`; trG.textAlign = "center"; trG.textBaseline = "middle";
            trG.fillText(String(p.txt || "").slice(0, 16), x, y - 24 * k, 44 * k);
            trG.textBaseline = "alphabetic";
        } },
    bandeira: { aba: "enfeites", nome: "BANDEIRA", cor: "#e11d2e", planta: { circ: 5 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), t = arBase(p, ang, 60), k = b[3] * arEsc(p);
            trG.strokeStyle = "#d1d5db"; trG.lineWidth = Math.max(1, 2 * k);
            trG.beginPath(); trG.moveTo(b[0], b[1]); trG.lineTo(t[0], t[1]); trG.stroke();
            trG.fillStyle = p.c;
            trG.beginPath(); trG.moveTo(t[0], t[1]); trG.quadraticCurveTo(t[0] + 12 * k, t[1] - 3 * k, t[0] + 24 * k, t[1] + 2 * k); trG.lineTo(t[0] + 24 * k, t[1] + 15 * k); trG.quadraticCurveTo(t[0] + 12 * k, t[1] + 10 * k, t[0], t[1] + 14 * k); trG.closePath(); trG.fill();
        } },
    lampiao: { aba: "enfeites", nome: "LAMPIÃO", cor: "#ffe08a", planta: { circ: 5 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), t = arBase(p, ang, 40), k = b[3] * arEsc(p);
            trG.fillStyle = "#374151"; trG.fillRect(b[0] - 1.5 * k, t[1], 3 * k, b[1] - t[1]);
            const g = trG.createRadialGradient(t[0], t[1], 0, t[0], t[1], 12 * k);
            g.addColorStop(0, "#ffffff"); g.addColorStop(0.3, p.c); g.addColorStop(1, "rgba(0, 0, 0, 0)");
            trG.fillStyle = g; trG.beginPath(); trG.arc(t[0], t[1], 12 * k, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "#374151"; trG.fillRect(t[0] - 4 * k, t[1] - 6 * k, 8 * k, 2 * k);
        } },
    ampulheta: { aba: "enfeites", nome: "AMPULHETA", cor: "#d4a52a", planta: { circ: 18 },
        desenha: (p, ang) => { const b = arBase(p, ang); trDrawHourglass(b[0], b[1], 0.5, b[3] * 0.35 * arEsc(p)); } },
    esfera_dragao: { aba: "enfeites", nome: "ESFERA DO DRAGÃO", cor: "#ffb52e", planta: { circ: 8 },
        desenha: (p, ang) => {
            arCaixa(p, -7, 7, 0, 10, -7, 7, "#9ca3af", ang);
            const c = arBase(p, ang, 17), k = c[3] * arEsc(p), r = 7 * k;
            const g = trG.createRadialGradient(c[0] - r * 0.35, c[1] - r * 0.4, r * 0.1, c[0], c[1], r);
            g.addColorStop(0, "#fff3c4"); g.addColorStop(0.4, p.c); g.addColorStop(1, arMix(p.c, -0.4));
            trG.fillStyle = g; trG.beginPath(); trG.arc(c[0], c[1], r, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "#e11d2e";
            [[0, -0.35], [-0.35, 0.05], [0.35, 0.05], [0, 0.4]].forEach(([dx, dy]) => { trG.beginPath(); trG.arc(c[0] + dx * r, c[1] + dy * r, r * 0.16, 0, Math.PI * 2); trG.fill(); });
        } }
};

// ---------------- planícies (o chão completo de cada fase) ----------------
// Escolher uma planície troca o chão base e o céu pelos da fase e coloca embaixo de tudo as peças de chão dela
// (ilha de areia, lagos, ringue, ruas...). As peças da planície não contam no limite nem no espaço das outras.
const ARENA_PLANICIES = {
    kame: { nome: "ILHA DO MESTRE KAME", ceu: { topo: "#4da3e8", horizonte: "#d6efff" }, chao: { tipo: "mar", cor: "#2f86c9" },
        pecas: [{ t: "areia", x: 0, z: 0, e: 3.6, f: "irregular", c: "#ecd9a0" }, { t: "gramado", x: -30, z: -40, e: 2.2, f: "irregular", c: "#6fbf4a" }] },
    terra: { nome: "TORNEIO ARTES MARCIAIS", ceu: { topo: "#5aa6e8", horizonte: "#e3f1fb" }, chao: { tipo: "grama", cor: "#6fbf4a" },
        pecas: [{ t: "piso", x: 0, z: 0, e: 2.2, c: "#e2ddd2" }, { t: "trilha", x: 0, z: -260, e: 1.6, r: 90, c: "#efe4c2" }] },
    kaio: { nome: "PLANETA DO SR. KAIOH", ceu: { topo: "#f2c94c", horizonte: "#fff3c4" }, chao: { tipo: "grama", cor: "#6ccf5a" },
        pecas: [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i / 8 * Math.PI * 2; return { t: "estrada", x: Math.cos(a) * 270, z: Math.sin(a) * 270, e: 1.1, r: (a * 180 / Math.PI + 90) % 360, c: "#f1efe6" }; }) },
    namek: { nome: "PLANETA NAMEK", ceu: { topo: "#3fa58a", horizonte: "#bfe8c9" }, chao: { tipo: "grama", cor: "#5fa36a" },
        pecas: [{ t: "lago", x: -260, z: -180, e: 1.6, f: "irregular", c: "#4fb3c9" }, { t: "lago", x: 240, z: 120, e: 1.2, f: "oval", c: "#4fb3c9" }, { t: "lago", x: 60, z: -330, e: 2, f: "feijao", c: "#4fb3c9" }] },
    freeza_ship: { nome: "NAVE DE FREEZA", ceu: { topo: "#4fae8c", horizonte: "#cfeedd" }, chao: { tipo: "grama", cor: "#4f9d6c" },
        pecas: [{ t: "lago", x: 230, z: -200, e: 2.2, f: "irregular", c: "#5cbad0" }, { t: "lago", x: -280, z: 160, e: 1.4, f: "oval", c: "#5cbad0" }, { t: "terra", x: 0, z: 0, e: 2.4, f: "circulo", c: "#8a9a6a" }] },
    namek_explosao: { nome: "NAMEK PRESTES A EXPLODIR", ceu: { topo: "#14361f", horizonte: "#d6c070" }, chao: { tipo: "mar", cor: "#14424f" },
        pecas: [{ t: "lava", x: -220, z: -160, e: 1.4, f: "irregular", c: "#ff5a1f" }, { t: "terra", x: 0, z: 0, e: 2.6, f: "irregular", c: "#5b86a8" }, { t: "lava", x: 260, z: 200, e: 1.1, f: "rio_curvo", c: "#ff5a1f" }] },
    time_room: { nome: "SALA DO TEMPO", ceu: { topo: "#ffffff", horizonte: "#f2f2ee" }, chao: { tipo: "ladrilho", cor: "#f4f4f2" }, pecas: [] },
    cell_games: { nome: "TORNEIO DE CELL", ceu: { topo: "#5aa6e8", horizonte: "#e9e0c4" }, chao: { tipo: "terra", cor: "#b99a6a" },
        pecas: [{ t: "terra", x: -260, z: -200, e: 1.8, f: "irregular", c: "#a5865a" }, { t: "estrada", x: 0, z: 300, e: 2.6, c: "#c8a978" }, { t: "piso", x: 0, z: 0, e: 1.4, c: "#d8d4cc" }] },
    kaioshin: { nome: "PLANETA SUPREMO KAIOH", ceu: { topo: "#7ec8e3", horizonte: "#f7e1b5" }, chao: { tipo: "grama", cor: "#8fd06b" },
        pecas: [{ t: "lago", x: 220, z: -220, e: 1.8, f: "oval", c: "#7fd0e8" }, { t: "gramado", x: -200, z: 120, e: 2, f: "irregular", c: "#a6dc7c" }] },
    plataforma_celestial: { nome: "PLATAFORMA CELESTIAL", ceu: { topo: "#5fb0ea", horizonte: "#e6f4fd" }, chao: { tipo: "nuvens", cor: "#e8f1fb" },
        pecas: [{ t: "gramado", x: 0, z: 0, e: 4.3, f: "circulo", c: "#a9c9e6" }, { t: "piso", x: 0, z: 0, e: 2.2, c: "#cfe3f2" }] },
    capital_oeste: { nome: "CAPITAL DO OESTE", ceu: { topo: "#5aa6e8", horizonte: "#cfe8fa" }, chao: { tipo: "grama", cor: "#9ccf7a" },
        pecas: [{ t: "piso", x: 0, z: 0, e: 4.4, c: "#8d96a3" }, { t: "gramado", x: 0, z: 0, e: 4.6, f: "circulo", c: "#74c454" },
            { t: "estrada", x: 0, z: -420, e: 4.4, c: "#8d96a3" }, { t: "estrada", x: 0, z: 420, e: 4.4, c: "#8d96a3" }] }
};

// ---------------- arena: validar / guardar ----------------
function arenaCorValida(c, padrao) { return typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : padrao; }
function arenaNum(v, min, max, padrao) { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : padrao; }
// limpa uma peça; devolve null se o tipo não existe
function normalizarPecaArena(q) {
    if (!q || typeof q !== "object") return null;
    const def = ARENA_PECAS[q.t];
    if (!def) return null;
    const p = { t: q.t, e: Math.round(arenaNum(q.e, 0.3, 3, 1) * 100) / 100, c: arenaCorValida(q.c, def.cor) };
    if (def.ceu) { p.a = Math.round(arenaNum(q.a, 0, 360, 0)) % 360; p.h = Math.round(arenaNum(q.h, 0, 1, 0.5) * 100) / 100; }
    else { p.x = Math.round(arenaNum(q.x, -ARENA_RAIO, ARENA_RAIO, 0)); p.z = Math.round(arenaNum(q.z, -ARENA_RAIO, ARENA_RAIO, 0)); p.r = ((Math.round(arenaNum(q.r, -3600, 3600, 0)) % 360) + 360) % 360; }
    if (def.texto !== undefined) p.txt = typeof q.txt === "string" ? q.txt.slice(0, 16) : def.texto;
    if (def.forma) {
        p.f = ARENA_FORMATOS.some(f => f[0] === q.f) ? q.f : "circulo";
        p.v = Math.round(arenaNum(q.v, 0, 3, 0) * 10) / 10;
    }
    return p;
}
function arenaPadrao() {
    return { id: "", nome: "MINHA ARENA", cor: "#22d3ee", musica: "classico", minion: "saibaman", camera: "media", movimento: "girar", planicie: "",
        ceu: { topo: "#4f9be0", horizonte: "#cfe8fa" }, chao: { tipo: "grama", cor: ARENA_CHAOS.grama.cor }, pecas: [] };
}
function normalizarArena(a) {
    const d = arenaPadrao();
    if (!a || typeof a !== "object") return d;
    const nome = typeof a.nome === "string" ? a.nome.trim().toUpperCase().slice(0, 24) : "";
    const chaoTipo = a.chao && ARENA_CHAOS[a.chao.tipo] ? a.chao.tipo : "grama";
    return {
        id: typeof a.id === "string" && /^arena_[\w]+$/.test(a.id) ? a.id : "",
        nome: nome || d.nome,
        cor: arenaCorValida(a.cor, d.cor),
        musica: typeof a.musica === "string" && typeof BGM_THEMES === "object" && BGM_THEMES[a.musica] ? a.musica : d.musica,
        minion: typeof a.minion === "string" && a.minion ? a.minion : d.minion,
        camera: ARENA_CAMERAS[a.camera] ? a.camera : "media",
        movimento: a.movimento === "seguir" ? "seguir" : "girar",
        planicie: ARENA_PLANICIES[a.planicie] ? a.planicie : "",
        ceu: { topo: arenaCorValida(a.ceu && a.ceu.topo, d.ceu.topo), horizonte: arenaCorValida(a.ceu && a.ceu.horizonte, d.ceu.horizonte) },
        chao: { tipo: chaoTipo, cor: arenaCorValida(a.chao && a.chao.cor, ARENA_CHAOS[chaoTipo].cor) },
        pecas: (Array.isArray(a.pecas) ? a.pecas : []).map(normalizarPecaArena).filter(Boolean).slice(0, ARENA_PECAS_MAX)
    };
}
function getArenasCriadas() {
    const l = readJsonStorage("saiyan_arenas", []);
    return (Array.isArray(l) ? l : []).map(normalizarArena).filter(a => a.id).slice(0, ARENA_MAX);
}
function salvarArenasCriadas(lista) { return writeStorage("saiyan_arenas", JSON.stringify(lista.map(normalizarArena))); }
// céu escuro? (as fases de céu claro ganham placas escuras atrás do placar)
function arenaCeuClaro(a) {
    const n = parseInt(a.ceu.topo.slice(1), 16), l = (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255;
    return l > 0.35;
}
// coloca as arenas criadas na lista de fases (no fim, sempre liberadas)
function registrarArenasCriadas() {
    for (let i = FASES_PADRAO.length - 1; i >= 0; i--) if (FASES_PADRAO[i].criada) FASES_PADRAO.splice(i, 1);
    const lista = getArenasCriadas();
    if (arenaTeste) lista.push(arenaTeste.arena);   // TESTAR: a arena em edição entra só durante a luta de teste
    lista.forEach((a, i) => {
        FASES_PADRAO.push({ id: a.id, nome: a.nome, posicao: 1000 + i, cor: a.cor, musica: a.musica, cenario: "criada",
            camera: { tipo: a.movimento === "seguir" ? "anda" : "orbita", volta: 10800 }, fundoClaro: arenaCeuClaro(a), minion: a.minion, conquista: null, criada: true, arena: a });
    });
    aplicarOrdemDasFases(typeof getOrdemFasesSalva === "function" ? getOrdemFasesSalva() : null);
    if (typeof atualizarCoresDasFases === "function") atualizarCoresDasFases();
    if (typeof selectedStage !== "undefined" && !getFaseDef(selectedStage)) selectedStage = STAGE_PROGRESSION[0].id;
}

// ---------------- espaço de cada peça (para duas não ocuparem o mesmo lugar) ----------------
// Peças de pé, efeitos e montes (chão com altura) ocupam espaço; pisos planos e o céu não.
function arenaPegada(p) {
    const def = ARENA_PECAS[p.t];
    if (!def || def.ceu || (def.chao && !(p.v > 0))) return null;
    const e = p.e || 1;
    if (def.forma) return { r: arRaioForma(p, def.forma) * e * 0.92, x: p.x, z: p.z };
    if (def.planta && def.planta.ret) return { x: p.x, z: p.z, hw: def.planta.ret[0] * e, hd: def.planta.ret[1] * e, a: (p.r || 0) * Math.PI / 180 };
    return { r: ((def.planta && def.planta.circ) || 8) * e, x: p.x, z: p.z };
}
function arPontoNoRet(px, pz, q) {   // ponto do retângulo q mais perto de (px, pz)
    const c = Math.cos(q.a), s = Math.sin(q.a), dx = px - q.x, dz = pz - q.z;
    const lx = Math.max(-q.hw, Math.min(q.hw, dx * c + dz * s)), lz = Math.max(-q.hd, Math.min(q.hd, -dx * s + dz * c));
    return [q.x + lx * c - lz * s, q.z + lx * s + lz * c];
}
function arRetCantos(q) {
    const c = Math.cos(q.a), s = Math.sin(q.a);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [q.x + u * q.hw * c - v * q.hd * s, q.z + u * q.hw * s + v * q.hd * c]);
}
function arenaPegadasSeTocam(a, b) {
    const folga = 1;
    if (a.r !== undefined && b.r !== undefined) return Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r - folga;
    if (a.r !== undefined || b.r !== undefined) {
        const c = a.r !== undefined ? a : b, q = a.r !== undefined ? b : a, [nx, nz] = arPontoNoRet(c.x, c.z, q);
        return Math.hypot(c.x - nx, c.z - nz) < c.r - folga;
    }
    // dois retângulos: eixos separadores
    const A = arRetCantos(a), B = arRetCantos(b);
    for (const q of [a, b]) for (const ang of [q.a, q.a + Math.PI / 2]) {
        const ax = Math.cos(ang), az = Math.sin(ang), proj = (pts) => pts.map(p => p[0] * ax + p[1] * az);
        const pa = proj(A), pb = proj(B);
        if (Math.max(...pa) - folga <= Math.min(...pb) || Math.max(...pb) - folga <= Math.min(...pa)) return false;
    }
    return true;
}
// a peça i (ou uma peça p fora da lista) invade o espaço de outra?
function arenaPecaColide(pecas, p, ignorar) {
    const g = arenaPegada(p);
    if (!g) return false;
    return pecas.some((q, j) => { if (j === ignorar || q === p) return false; const h = arenaPegada(q); return !!h && arenaPegadasSeTocam(g, h); });
}

// ---------------- desenho da arena (luta, ARENAS, prévia do editor) ----------------
const arCenas = new Map();   // chave -> { passo, canvas, pano, chave }
function arCenaDe(id, a) {
    let c = arCenas.get(id);
    const chave = JSON.stringify(a);
    if (!c || c.chave !== chave) { c = { passo: null, canvas: c ? c.canvas : null, pano: null, chave }; arCenas.set(id, c); }
    return c;
}
function arPanorama(a, cena, cam) {
    if (c3Valida(cena.pano)) return cena.pano;
    const W = Math.round(Math.PI * 2 * cam.F), f = c3NovaFaixa(W, cam.HY + 6);
    if (!f) return null;
    const { c, g } = f, base = cam.HY + 2;
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, a.ceu.topo); ceu.addColorStop(1, a.ceu.horizonte);
    g.fillStyle = ceu; g.fillRect(0, 0, W, c.__h);
    // peças do céu: as de baixo (morros, cidade) por último, encostadas no horizonte
    const pecas = a.pecas.filter(p => ARENA_PECAS[p.t].ceu).sort((p, q) => (ARENA_PECAS[p.t].baixo ? 1 : 0) - (ARENA_PECAS[q.t].baixo ? 1 : 0));
    pecas.forEach((p, i) => {
        const def = ARENA_PECAS[p.t], x = p.a / 360 * W, r = cam.HY * 0.12 * p.e, y = base - 4 - p.h * (cam.HY - 10);
        c3NaVolta(W, x, r * 9, xx => def.desenha(g, xx, y, r, p, i + 1, base));
    });
    cena.pano = c;
    return c;
}
// detalhes do chão (fixos no mundo) para a luta "andar" sobre ele
const AR_DETALHES = (() => {
    const l = [];
    for (let i = 0; i < 90; i++) { const ang = c3Hash(i * 3.1) * Math.PI * 2, r = 60 + c3Hash(i * 7.7) * 1300; l.push({ x: Math.sin(ang) * r, z: Math.cos(ang) * r, s: c3Hash(i * 5.3) }); }
    return l;
})();
const AR_PERIODO = ARENA_RAIO * 2 + 80;   // no modo SEGUIR a planta se repete para os lados
function arModulo(v, m) { return ((v % m) + m) % m; }
function arDesenharChao(a, ang, cam, desl) {
    const ch = a.chao, base = ch.cor;
    const gr = ctx.createLinearGradient(0, cam.HY, 0, canvas.height);
    gr.addColorStop(0, arMix(base, 0.22)); gr.addColorStop(1, arMix(base, -0.22));
    ctx.fillStyle = gr; ctx.fillRect(0, cam.HY + 2, canvas.width, canvas.height - cam.HY);
    const lim = cam.D - cam.PERTO * 2, t = arRelogio();
    if (ch.tipo === "ladrilho") {
        const ox = arModulo(desl.x, 80), oz = arModulo(desl.z, 80);
        ctx.strokeStyle = "rgba(90, 95, 110, 0.35)"; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = -1200; i <= 1200; i += 80) {
            [[[i - ox, -1200], [i - ox, 1200]], [[-1200, i - oz], [1200, i - oz]]].forEach(([p0, p1]) => {
                const seg = c3RecorteChao(p0, p1, ang, lim);
                if (!seg) return;
                const A = trProj(seg[0][0], 0, seg[0][1], ang), B = trProj(seg[1][0], 0, seg[1][1], ang);
                ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
            });
        }
        ctx.stroke();
        return;
    }
    AR_DETALHES.forEach(d => {
        const dx = arModulo(d.x - desl.x + 1300, 2600) - 1300, dz = d.z - desl.z;
        if (trRot(dx, dz, ang)[1] > lim) return;
        const p = trProj(dx, 0, dz, ang), k = p[3];
        if (p[1] < cam.HY) return;
        if (ch.tipo === "grama") { ctx.strokeStyle = arMix(base, -0.3); ctx.lineWidth = Math.max(0.6, 1.2 * k); ctx.beginPath(); ctx.moveTo(p[0] - 3 * k, p[1]); ctx.lineTo(p[0] - 1 * k, p[1] - 6 * k); ctx.moveTo(p[0] + 2 * k, p[1]); ctx.lineTo(p[0] + 3 * k, p[1] - 5 * k); ctx.stroke(); }
        else if (ch.tipo === "mar") { ctx.strokeStyle = "rgba(255, 255, 255, 0.45)"; ctx.lineWidth = Math.max(0.6, 1.4 * k); const o = Math.sin(t * 1.5 + d.s * 6) * 3 * k; ctx.beginPath(); ctx.arc(p[0] + o, p[1], 6 * k, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
        else if (ch.tipo === "nuvens") { ctx.fillStyle = "rgba(255, 255, 255, 0.55)"; ctx.beginPath(); ctx.ellipse(p[0], p[1], 22 * k, 6 * k, 0, 0, Math.PI * 2); ctx.fill(); }
        else if (ch.tipo === "espaco") { ctx.fillStyle = d.s > 0.5 ? "#ffffff" : "#a5b4fc"; ctx.fillRect(p[0], p[1], 1.2 + d.s, 1.2 + d.s); }
        else if (ch.tipo === "lava") { ctx.strokeStyle = "rgba(255, 140, 40, 0.75)"; ctx.lineWidth = Math.max(0.8, 2 * k); ctx.beginPath(); ctx.moveTo(p[0] - 10 * k, p[1]); ctx.lineTo(p[0] - 2 * k, p[1] + 2 * k); ctx.lineTo(p[0] + 9 * k, p[1] - 1 * k); ctx.stroke(); }
        else { ctx.fillStyle = arMix(base, d.s > 0.5 ? -0.25 : 0.2); ctx.beginPath(); ctx.ellipse(p[0], p[1], 3 * k, 1.4 * k, 0, 0, Math.PI * 2); ctx.fill(); }
    });
}
// posições de uma peça na tela: o centro da vista (desl) vira a origem; no modo SEGUIR a planta se repete de lado
function arCopiasDaPeca(p, desl, repete) {
    const z = p.z - desl.z;
    if (!repete) return [{ x: p.x - desl.x, z }];
    const x0 = arModulo(p.x - desl.x + AR_PERIODO / 2, AR_PERIODO) - AR_PERIODO / 2;
    return [x0 - AR_PERIODO, x0, x0 + AR_PERIODO].filter(x => Math.abs(x) < 1350).map(x => ({ x, z }));
}
// opts: desl {x, z} (centro da vista), repete (modo SEGUIR), vermelha (índice da peça que invade outra), anima (desenha
// os efeitos agora: false = deixa para a passada de cada quadro)
function arDesenharCena(a, ang, cam, opts) {
    const desl = opts.desl, repete = !!opts.repete;
    const comPos = (p, pos) => Object.assign({ _s: arSemente(p) }, p, pos);
    const plan = ARENA_PLANICIES[a.planicie];
    if (plan) plan.pecas.forEach(p => arCopiasDaPeca(p, desl, repete).forEach(pos => ARENA_PECAS[p.t].desenha(comPos(Object.assign({ r: 0, f: "circulo", v: 0 }, p), pos), ang)));
    const objs = [];
    a.pecas.forEach((p, i) => {
        const d = ARENA_PECAS[p.t];
        if (d.ceu || (d.anim && !opts.anima)) return;
        const q = i === opts.vermelha ? Object.assign({}, p, { c: "#ff3030" }) : p;
        arCopiasDaPeca(p, desl, repete).forEach(pos => {
            if (d.chao && !(p.v > 0)) { d.desenha(comPos(q, pos), ang); return; }   // piso plano: embaixo de tudo, na ordem
            const z = trRot(pos.x, pos.z, ang)[1];
            if (z > cam.CORTE) return;   // perto da câmera demais: tamparia a luta
            objs.push({ z, p: comPos(q, pos), d, i });
        });
    });
    const t = arRelogio();
    objs.sort((u, v) => u.z - v.z).forEach(o => {
        try { o.d.desenha(o.p, ang, t); } catch (e) { /* peça com erro não derruba o cenário */ }
        if (o.i === opts.vermelha) arDesenharPegadaVermelha(o.p, ang);
    });
}
// área da peça pintada de vermelho no chão (invadindo outra peça)
function arDesenharPegadaVermelha(p, ang) {
    const g = arenaPegada(p);
    if (!g) return;
    const pts = g.r !== undefined
        ? Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return [g.x + Math.cos(a) * g.r, g.z + Math.sin(a) * g.r]; })
        : arRetCantos(g);
    trPoly(pts.map(q => trProj(q[0], 1, q[1], ang)));
    trG.fillStyle = "rgba(255, 30, 30, 0.35)"; trG.fill();
    trG.strokeStyle = "#ff2a2a"; trG.lineWidth = 2; trG.stroke();
}
// efeitos (peças que se mexem): a cada quadro, por cima da camada guardada
function arDesenharAnimadas(a, ang, cam, opts) {
    const t = arRelogio();
    const objs = [];
    a.pecas.forEach(p => {
        const d = ARENA_PECAS[p.t];
        if (!d.anim) return;
        arCopiasDaPeca(p, opts.desl, !!opts.repete).forEach(pos => {
            const z = trRot(pos.x, pos.z, ang)[1];
            if (z <= cam.CORTE) objs.push({ z, p: Object.assign({ _s: arSemente(p) }, p, pos), d });
        });
    });
    objs.sort((u, v) => u.z - v.z).forEach(o => { try { o.d.desenha(o.p, ang, t); } catch (e) { /* ignora */ } });
}
// desenha a arena no ctx do jogo. opts: cam (outra câmera), chave (cache), desl, andado (modo SEGUIR), vermelha
function drawArenaCriada(a, ang, opts) {
    opts = opts || {};
    const cam = opts.cam || ARENA_CAMERAS[a.camera] || ARENA_CAMERAS.media, anterior = trCam;
    const seguir = opts.andado !== undefined;
    const desl = { x: (opts.desl ? opts.desl.x : 0) + (seguir ? opts.andado : 0), z: opts.desl ? opts.desl.z : 0 };
    const cena = arCenaDe(opts.chave || a.id || "_previa", a);
    trCam = cam;
    try {
        const pano = arPanorama(a, cena, cam);
        if (!pano || !c3BlitPanorama(pano, seguir ? 0 : ang, cam.F, cam.CX)) { ctx.fillStyle = a.ceu.topo; ctx.fillRect(0, 0, canvas.width, cam.HY + 2); }
        arDesenharChao(a, ang, cam, desl);
        const o = { desl, repete: seguir, vermelha: opts.vermelha };
        if (seguir || opts.desl) {
            // a vista anda (SEGUIR) ou está centrada numa peça: desenha direto, sem a camada guardada
            trG = ctx;
            arDesenharCena(a, ang, cam, Object.assign({ anima: true }, o));
        } else {
            drawCachedOrbitLayer(cena, ang, (g) => arDesenharCena(a, g, cam, o));
            arDesenharAnimadas(a, ang, cam, o);
        }
    } finally {
        trCam = anterior;
        trG = ctx;
    }
}
function drawArenaCriadaStage(id, scroll) {
    const f = getFaseDef(id);
    if (!f || !f.arena) return;
    if (f.arena.movimento === "seguir") drawArenaCriada(f.arena, 0, { andado: getForwardTravel(scroll) });
    else drawArenaCriada(f.arena, getStageLapAngle(scroll, f.camera.volta || 10800));
}

// ---------------- arquivo .arena.json ----------------
function dadosDaArenaParaArquivo(a) {
    const n = normalizarArena(a), arena = Object.assign({}, n);
    delete arena.id;
    return { formato: ARENA_FORMATO, versao: 1, arena };
}
function validarArquivoArena(dados) {
    if (!dados || typeof dados !== "object" || dados.formato !== ARENA_FORMATO || !dados.arena || typeof dados.arena !== "object") return { erro: "ESTE ARQUIVO NÃO É DE ARENA DO SAIYAN FIGHT." };
    if (!(Number(dados.versao) >= 1)) return { erro: arqErro("VERSÃO DO ARQUIVO INVÁLIDA", dados.versao) };
    if (Number(dados.versao) > 1) return { erro: "ARQUIVO FEITO POR UMA VERSÃO MAIS NOVA DO JOGO. ATUALIZE O JOGO." };
    const a = dados.arena;
    if (typeof a.nome !== "string" || !a.nome.trim()) return { erro: "FALTA O NOME DA ARENA (nome)." };
    if (a.chao !== undefined && (!a.chao || !ARENA_CHAOS[a.chao.tipo])) return { erro: arqErro("TIPO DE CHÃO DESCONHECIDO", a.chao && a.chao.tipo) };
    if (a.camera !== undefined && !ARENA_CAMERAS[a.camera]) return { erro: arqErro("CÂMERA DESCONHECIDA", a.camera) };
    if (a.movimento !== undefined && a.movimento !== "girar" && a.movimento !== "seguir") return { erro: arqErro("MOVIMENTO DESCONHECIDO", a.movimento) };
    if (a.planicie !== undefined && a.planicie !== "" && !ARENA_PLANICIES[a.planicie]) return { erro: arqErro("PLANÍCIE DESCONHECIDA", a.planicie) };
    if (a.pecas !== undefined && !Array.isArray(a.pecas)) return { erro: "LISTA DE PEÇAS INVÁLIDA (pecas)." };
    const pecas = a.pecas || [];
    if (pecas.length > ARENA_PECAS_MAX) return { erro: arqErro("PEÇAS DEMAIS (MÁXIMO 80)", pecas.length) };
    const ruim = pecas.find(q => !q || typeof q !== "object" || !ARENA_PECAS[q.t]);
    if (ruim) return { erro: arqErro("PEÇA DESCONHECIDA", ruim && ruim.t) };
    const n = normalizarArena(a);
    n.id = "";
    return { arena: n };
}

// ---------------- EDITOR DE ARENAS (tela #modal-arena) ----------------
// Visualização grande no canto superior esquerdo (a arena girando/andando, a prévia de uma peça antes de confirmar,
// ou a câmera perto da peça escolhida enquanto ela é ajustada); à direita as abas, as peças e a planta; embaixo os
// dados da arena e o quadro da peça escolhida.
let arenaEd = null;
function arenaEditorAberto() { const m = document.getElementById("modal-arena"); return !!m && m.style.display === "flex"; }
function abrirEditorArenas(id, semRascunho) {
    const lista = getArenasCriadas();
    const a = (id && lista.find(x => x.id === id)) || lista[0] || null;
    arenaEd = { arena: a ? JSON.parse(JSON.stringify(a)) : arenaPadrao(), aba: "construcao", tipo: null, previa: null, sel: -1, vista: "arena",
        mover: true, angulo: 0, andado: 0, arrasto: null, vermelhoAte: 0, baixo: "dados",
        zoom: 1, pan: { x: 0, y: 0 }, grade: false, congelar: false, maximizado: false, dedos: new Map(), pinca: null,
        hist: { pilha: [], i: -1 } };
    const m = document.getElementById("modal-arena");
    if (!m) return;
    arenaRegistrarPasso(true);
    arenaPreencherCampos();
    m.style.display = "flex";
    focusModal(m);
    arenaAjustarPlanta();
    if (!semRascunho) arenaPerguntarRascunho();
}
function fecharEditorArenas() {
    const m = document.getElementById("modal-arena");
    if (m) m.style.display = "none";
    arenaMaximizar(false);
    arenaEd = null;
    restoreFocusAfterModal();
}

// ---- DESFAZER / REFAZER (passos guardados como texto da arena) ----
function arenaRegistrarPasso(inicio) {
    if (!arenaEd) return;
    const h = arenaEd.hist, txt = JSON.stringify(arenaEd.arena);
    if (!inicio && h.pilha[h.i] === txt) return;
    h.pilha = h.pilha.slice(0, h.i + 1);
    h.pilha.push(txt);
    if (h.pilha.length > ARENA_DESFAZER_MAX + 1) h.pilha.shift();
    h.i = h.pilha.length - 1;
    arenaAtualizarFerramentas();
    if (!inicio) arenaGuardarRascunho();
}
function arenaIrParaPasso(i) {
    const h = arenaEd.hist;
    if (i < 0 || i >= h.pilha.length || i === h.i) return;
    h.i = i;
    arenaEd.arena = JSON.parse(h.pilha[i]);
    arenaEd.sel = Math.min(arenaEd.sel, arenaEd.arena.pecas.length - 1);
    arenaEd.arrasto = null;
    arenaEd.vista = arenaEd.sel >= 0 ? "foco" : "arena";
    arenaPreencherCampos();
    arenaAtualizarFerramentas();
    arenaGuardarRascunho();
}
function arenaDesfazer() { if (arenaEd) arenaIrParaPasso(arenaEd.hist.i - 1); }
function arenaRefazer() { if (arenaEd) arenaIrParaPasso(arenaEd.hist.i + 1); }
function arenaAlternarGrade() {
    if (!arenaEd) return;
    arenaEd.grade = !arenaEd.grade;
    arenaAtualizarFerramentas();
    arenaDesenharPlanta();
    arenaDica(null);
}
function arenaAtualizarFerramentas() {
    if (!arenaEd) return;
    const h = arenaEd.hist;
    const liga = (id, pode, ativo) => {
        const b = document.getElementById(id);
        if (!b) return;
        b.disabled = !pode;
        b.style.opacity = pode ? "1" : "0.4";
        if (b.classList) b.classList.toggle("ar-armada", !!ativo);
    };
    liga("arena-desfazer", h.i > 0);
    liga("arena-refazer", h.i < h.pilha.length - 1);
    liga("arena-grade", true, arenaEd.grade);
    const mx = document.getElementById("arena-maximizar");
    if (mx) mx.textContent = T(arenaEd.maximizado ? "MINIMIZAR" : "MAXIMIZAR");
}
// posições e giros presos na grade (quando ligada)
function arenaNaGrade(v) { return arenaEd && arenaEd.grade ? Math.round(v / ARENA_GRADE) * ARENA_GRADE : Math.round(v); }
function arenaGiroNaGrade(v) { return arenaEd && arenaEd.grade ? (Math.round(v / 15) * 15) % 360 : Math.round(v); }

// ---- rascunho (volta sozinho se o navegador fechar sem salvar) ----
let arenaRascunhoTimer = null;
function arenaGuardarRascunho() {
    if (!arenaEd || arenaTeste) return;
    if (arenaRascunhoTimer) clearTimeout(arenaRascunhoTimer);
    const txt = JSON.stringify({ arena: arenaEd.arena, quando: Date.now() });
    arenaRascunhoTimer = setTimeout(() => { arenaRascunhoTimer = null; writeStorage("saiyan_arena_rascunho", txt); }, 1000);
}
function arenaApagarRascunho() {
    if (arenaRascunhoTimer) { clearTimeout(arenaRascunhoTimer); arenaRascunhoTimer = null; }
    writeStorage("saiyan_arena_rascunho", "");
}
function arenaRascunhoGuardado() {
    const d = readJsonStorage("saiyan_arena_rascunho", null);
    if (!d || !d.arena || typeof d.arena !== "object") return null;
    const v = validarArquivoArena({ formato: ARENA_FORMATO, versao: 1, arena: d.arena });
    if (v.erro) return null;
    v.arena.id = d.arena.id || "";
    return v.arena;
}
function arenaPerguntarRascunho() {
    const r = arenaRascunhoGuardado();
    if (!r || !arenaEd) return;
    const salva = getArenasCriadas().find(x => x.id === r.id);
    if (salva && JSON.stringify(normalizarArena(salva)) === JSON.stringify(r)) return;   // nada mudou desde o save
    showSystemConfirm("EDITOR DE ARENAS", `CONTINUAR O RASCUNHO DA ARENA ${r.nome}?`, () => {
        if (!arenaEd) return;
        arenaEd.arena = r;
        arenaEd.sel = -1; arenaEd.vista = "arena";
        arenaPreencherCampos();
        arenaRegistrarPasso();
    }, "CONTINUAR", "COMEÇAR LIMPO");
}

// ---- TESTAR: luta rápida na arena que está sendo editada ----
function arenaEmTeste() { return !!arenaTeste; }
function arenaTestarArena() {
    if (!arenaEd) return;
    arenaLerCampos();
    const a = normalizarArena(arenaEd.arena);
    a.id = ARENA_TESTE_ID;
    arenaTeste = { arena: a, ed: { arena: JSON.parse(JSON.stringify(arenaEd.arena)), aba: arenaEd.aba, tipo: arenaEd.tipo, sel: arenaEd.sel, grade: arenaEd.grade, hist: arenaEd.hist } };
    fecharEditorArenas();
    registrarArenasCriadas();
    arCenas.delete(ARENA_TESTE_ID);
    selectedStage = ARENA_TESTE_ID;
    gameMode = "singleplayer";
    stageMode = "normal";
    startGame();
    setGameState("playing");
}
// a luta de teste acabou (voltou para o menu/mapa): o editor reabre como estava
function arenaVoltarDoTeste() {
    const t = arenaTeste;
    if (!t) return;
    arenaTeste = null;
    registrarArenasCriadas();
    arCenas.delete(ARENA_TESTE_ID);
    if (typeof stageProgress === "object" && stageProgress) delete stageProgress[ARENA_TESTE_ID];
    if (typeof stageWaveRecord === "object" && stageWaveRecord) delete stageWaveRecord[ARENA_TESTE_ID];
    selectedStage = STAGE_PROGRESSION[0].id;
    abrirEditorArenas(t.ed.arena.id, true);
    if (!arenaEd) return;
    arenaEd.arena = t.ed.arena;
    arenaEd.aba = t.ed.aba; arenaEd.tipo = t.ed.tipo; arenaEd.grade = t.ed.grade;
    arenaEd.sel = Math.min(t.ed.sel, arenaEd.arena.pecas.length - 1);
    arenaEd.hist = t.ed.hist;
    arenaEd.vista = arenaEd.sel >= 0 ? "foco" : "arena";
    arenaPreencherCampos();
    arenaAtualizarFerramentas();
}
function arenaValorDe(id) { const el = document.getElementById(id); return el ? el.value : ""; }
function arenaDefinir(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
function arenaMostrar(id, sim) { const el = document.getElementById(id); if (el && el.style) el.style.display = sim ? "" : "none"; }
function arenaPreencherCampos() {
    const a = arenaEd.arena;
    const sel = document.getElementById("arena-lista");
    if (sel) {
        sel.innerHTML = "";
        getArenasCriadas().forEach(x => { const o = document.createElement("option"); o.value = x.id; o.textContent = x.nome; sel.appendChild(o); });
        const nova = document.createElement("option"); nova.value = ""; nova.textContent = "+ NOVA ARENA"; sel.appendChild(nova);
        sel.value = a.id || "";
    }
    arenaDefinir("arena-nome", a.nome); arenaDefinir("arena-cor", a.cor); arenaDefinir("arena-camera", a.camera);
    arenaDefinir("arena-movimento", a.movimento);
    arenaDefinir("arena-ceu-topo", a.ceu.topo); arenaDefinir("arena-ceu-horizonte", a.ceu.horizonte);
    const mus = document.getElementById("arena-musica");
    if (mus) {
        mus.innerHTML = "";
        Object.keys(BGM_THEMES).forEach(k => { const o = document.createElement("option"); o.value = k; o.textContent = BGM_THEMES[k].nome || k; mus.appendChild(o); });
        mus.value = a.musica;
    }
    const mi = document.getElementById("arena-minion");
    if (mi) {
        mi.innerHTML = "";
        getMinionsDisponiveis().forEach(m => { const o = document.createElement("option"); o.value = m.id; o.textContent = m.nome; mi.appendChild(o); });
        mi.value = a.minion;
    }
    const chao = document.getElementById("arena-chao-tipo");
    if (chao && !chao.options.length) Object.keys(ARENA_CHAOS).forEach(k => { const o = document.createElement("option"); o.value = k; o.textContent = ARENA_CHAOS[k].nome; chao.appendChild(o); });
    arenaDefinir("arena-chao-tipo", a.chao.tipo); arenaDefinir("arena-chao-cor", a.chao.cor);
    const forma = document.getElementById("arena-sel-forma");
    if (forma && !forma.options.length) ARENA_FORMATOS.forEach(([k, nome]) => { const o = document.createElement("option"); o.value = k; o.textContent = nome; forma.appendChild(o); });
    const mover = document.getElementById("arena-girar");
    if (mover) mover.checked = arenaEd.mover;
    const zoom = document.getElementById("arena-zoom");
    if (zoom) zoom.value = Math.round(arenaEd.zoom * 100);
    arenaAtualizarFerramentas();
    arenaMostrarAba(arenaEd.aba);
    arenaAtualizarSelecao();
    arenaAtualizarVista();
}
// campos da arena -> arena em edição
function arenaLerCampos() {
    if (!arenaEd) return;
    const a = arenaEd.arena, tipoAntes = a.chao.tipo;
    a.nome = (arenaValorDe("arena-nome") || "").trim().toUpperCase().slice(0, 24) || "MINHA ARENA";
    a.cor = arenaCorValida(arenaValorDe("arena-cor"), a.cor);
    a.musica = BGM_THEMES[arenaValorDe("arena-musica")] ? arenaValorDe("arena-musica") : a.musica;
    a.minion = arenaValorDe("arena-minion") || a.minion;
    a.camera = ARENA_CAMERAS[arenaValorDe("arena-camera")] ? arenaValorDe("arena-camera") : a.camera;
    a.movimento = arenaValorDe("arena-movimento") === "seguir" ? "seguir" : "girar";
    a.ceu.topo = arenaCorValida(arenaValorDe("arena-ceu-topo"), a.ceu.topo);
    a.ceu.horizonte = arenaCorValida(arenaValorDe("arena-ceu-horizonte"), a.ceu.horizonte);
    const tipo = ARENA_CHAOS[arenaValorDe("arena-chao-tipo")] ? arenaValorDe("arena-chao-tipo") : a.chao.tipo;
    if (tipo !== tipoAntes) {   // trocou o tipo de chão: já põe a cor dele
        a.chao = { tipo, cor: ARENA_CHAOS[tipo].cor };
        arenaDefinir("arena-chao-cor", a.chao.cor);
    } else a.chao.cor = arenaCorValida(arenaValorDe("arena-chao-cor"), a.chao.cor);
    const g = document.getElementById("arena-girar");
    arenaEd.mover = !g || g.checked;
    arenaDesenharPlanta();
    arenaRegistrarPasso();
}
// ---- abas e botões das peças ----
function arenaMostrarAba(aba) {
    if (!arenaEd) return;
    arenaEd.aba = aba;
    ARENA_ABAS.forEach(([k]) => { const b = document.getElementById("arena-aba-" + k); if (b && b.classList) b.classList.toggle("active", k === aba); });
    const lista = document.getElementById("arena-pecas");
    if (lista) {
        lista.innerHTML = "";
        const botao = (texto, ativo, acao) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "btn ar-peca" + (ativo ? " ar-armada" : "");
            b.textContent = texto;
            b.onclick = acao;
            lista.appendChild(b);
        };
        if (aba === "planicies") {
            botao("SEM PLANÍCIE", !arenaEd.arena.planicie, () => { arenaEd.arena.planicie = ""; arenaMostrarAba("planicies"); arenaDesenharPlanta(); arenaRegistrarPasso(); });
            Object.keys(ARENA_PLANICIES).forEach(k => botao(ARENA_PLANICIES[k].nome, arenaEd.arena.planicie === k, () => arenaVerPeca("planicie:" + k)));
        } else {
            Object.keys(ARENA_PECAS).filter(k => ARENA_PECAS[k].aba === aba).forEach(k => botao(ARENA_PECAS[k].nome, arenaEd.tipo === k, () => arenaVerPeca(k)));
        }
    }
    arenaDica();
    arenaDesenharPlanta();
}
function arenaDica(texto) {
    const dica = document.getElementById("arena-dica");
    if (!dica || !arenaEd) return;
    dica.classList && dica.classList.toggle("ar-dica-erro", !!texto);
    dica.textContent = texto || (arenaEd.aba === "planicies"
        ? "PLANÍCIES: o chão completo de uma fase. Escolha, veja na tela grande e confirme."
        : arenaEd.aba === "ceu"
            ? "CÉU: escolha uma peça e toque na faixa do céu (esquerda/direita = em volta, altura = mais alto ou mais baixo)."
            : arenaEd.tipo
                ? `Toque na planta ou na tela grande para colocar: ${T(ARENA_PECAS[arenaEd.tipo].nome)}. Peça vermelha = lugar ocupado.`
                : "Escolha uma peça e toque na planta ou na tela grande para colocar. Toque numa peça para escolher e arraste para mover. O centro é onde a luta acontece.");
}
// tocar numa peça da lista: mostra só ela na tela grande, com CONFIRMAR PEÇA / CANCELAR
function arenaVerPeca(k) {
    if (!arenaEd) return;
    arenaEd.previa = k;
    arenaEd.vista = "previa";
    arenaAtualizarVista();
}
function arenaConfirmarPeca() {
    if (!arenaEd || !arenaEd.previa) return;
    const k = arenaEd.previa;
    if (k.startsWith("planicie:")) {
        const id = k.slice(9), pl = ARENA_PLANICIES[id];
        arenaEd.arena.planicie = id;
        arenaEd.arena.ceu = Object.assign({}, pl.ceu);
        arenaEd.arena.chao = Object.assign({}, pl.chao);
        arenaPreencherCampos();
        arenaRegistrarPasso();
    } else {
        if (ARENA_PECAS[k].anim && arenaEd.arena.pecas.filter(p => ARENA_PECAS[p.t].anim).length >= ARENA_ANIMADAS_MAX)
            return showSystemAlert("EDITOR DE ARENAS", "LIMITE DE 10 EFEITOS POR ARENA.");
        arenaEd.tipo = k;
        if (ARENA_PECAS[k].aba !== arenaEd.aba) arenaMostrarAba(ARENA_PECAS[k].aba); else arenaMostrarAba(arenaEd.aba);
    }
    arenaEd.previa = null;
    arenaEd.vista = "arena";
    arenaAtualizarVista();
}
function arenaCancelarPeca() {
    if (!arenaEd) return;
    arenaEd.previa = null;
    arenaEd.vista = arenaEd.sel >= 0 ? "foco" : "arena";
    arenaAtualizarVista();
}
function arenaVerArena() {
    if (!arenaEd) return;
    arenaEd.vista = "arena";
    arenaAtualizarVista();
}
// botões e título por cima da tela grande conforme a vista
function arenaAtualizarVista() {
    if (!arenaEd) return;
    const v = arenaEd.vista, tit = document.getElementById("arena-vista-titulo");
    arenaMostrar("arena-confirmar", v === "previa");
    arenaMostrar("arena-cancelar", v === "previa");
    arenaMostrar("arena-ver-arena", v === "foco");
    if (tit) {
        const p = arenaEd.arena.pecas[arenaEd.sel];
        tit.textContent = v === "previa"
            ? (arenaEd.previa.startsWith("planicie:") ? ARENA_PLANICIES[arenaEd.previa.slice(9)].nome : ARENA_PECAS[arenaEd.previa].nome)
            : v === "foco" && p ? ARENA_PECAS[p.t].nome : arenaEd.arena.nome;
    }
}
// ---- quadro da peça escolhida ----
function arenaAtualizarSelecao() {
    const box = document.getElementById("arena-selecao");
    if (!box || !arenaEd) return;
    const p = arenaEd.arena.pecas[arenaEd.sel];
    arenaMostrar("arena-selecao-vazia", !p);
    arenaMostrar("arena-selecao-campos", !!p);
    if (!p) return;
    const def = ARENA_PECAS[p.t];
    const nome = document.getElementById("arena-sel-nome"); if (nome) nome.textContent = def.nome;
    arenaDefinir("arena-sel-tam", p.e); arenaDefinir("arena-sel-cor", p.c);
    arenaMostrar("arena-sel-giro-grupo", !def.ceu);
    arenaDefinir("arena-sel-giro", def.ceu ? 0 : p.r);
    arenaMostrar("arena-sel-texto-grupo", def.texto !== undefined);
    arenaDefinir("arena-sel-texto", p.txt || "");
    arenaMostrar("arena-sel-forma-grupo", !!def.forma);
    arenaMostrar("arena-sel-altura-grupo", !!def.forma);
    if (def.forma) { arenaDefinir("arena-sel-forma", p.f || "circulo"); arenaDefinir("arena-sel-altura", p.v || 0); }
}
function arenaMudarSelecao() {
    const p = arenaEd && arenaEd.arena.pecas[arenaEd.sel];
    if (!p) return;
    const def = ARENA_PECAS[p.t], antes = Object.assign({}, p);
    p.e = Math.round(arenaNum(arenaValorDe("arena-sel-tam"), 0.3, 3, p.e) * 100) / 100;
    p.c = arenaCorValida(arenaValorDe("arena-sel-cor"), p.c);
    if (!def.ceu) p.r = arenaGiroNaGrade(arenaNum(arenaValorDe("arena-sel-giro"), 0, 359, p.r));
    if (def.texto !== undefined) p.txt = String(arenaValorDe("arena-sel-texto") || "").slice(0, 16);
    if (def.forma) {
        const f = arenaValorDe("arena-sel-forma");
        if (ARENA_FORMATOS.some(x => x[0] === f)) p.f = f;
        p.v = Math.round(arenaNum(arenaValorDe("arena-sel-altura"), 0, 3, p.v || 0) * 10) / 10;
    }
    // maior ou girada, invadiria outra peça: volta como estava e pisca vermelho
    if (arenaPecaColide(arenaEd.arena.pecas, p, arenaEd.sel)) {
        Object.assign(p, antes);
        arenaAtualizarSelecao();
        arenaEd.vermelhoAte = performance.now() + 700;
        arenaDica("LUGAR OCUPADO: a peça invadiria o espaço de outra.");
    }
    arenaEd.vista = "foco";
    arenaAtualizarVista();
    arenaDesenharPlanta();
    arenaRegistrarPasso();
}
function arenaApagarSelecao() {
    if (!arenaEd || arenaEd.sel < 0) return;
    arenaEd.arena.pecas.splice(arenaEd.sel, 1);
    arenaEd.sel = -1;
    arenaEd.vista = "arena";
    arenaAtualizarSelecao(); arenaAtualizarVista(); arenaDesenharPlanta();
    arenaRegistrarPasso();
}
function arenaDuplicarSelecao() {
    const p = arenaEd && arenaEd.arena.pecas[arenaEd.sel];
    if (!p) return;
    if (arenaEd.arena.pecas.length >= ARENA_PECAS_MAX) return showSystemAlert("EDITOR DE ARENAS", "LIMITE DE 80 PEÇAS POR ARENA.");
    if (ARENA_PECAS[p.t].anim && arenaEd.arena.pecas.filter(q => ARENA_PECAS[q.t].anim).length >= ARENA_ANIMADAS_MAX) return showSystemAlert("EDITOR DE ARENAS", "LIMITE DE 10 EFEITOS POR ARENA.");
    const q = Object.assign({}, p);
    if (ARENA_PECAS[p.t].ceu) q.a = (q.a + 20) % 360;
    else {
        // procura um lugar livre ao lado, em voltas cada vez maiores
        let achou = false;
        for (let r = 30; r <= 600 && !achou; r += 30) for (let i = 0; i < 12 && !achou; i++) {
            const a = i / 12 * Math.PI * 2;
            q.x = Math.round(Math.max(-ARENA_RAIO, Math.min(ARENA_RAIO, p.x + Math.cos(a) * r)));
            q.z = Math.round(Math.max(-ARENA_RAIO, Math.min(ARENA_RAIO, p.z + Math.sin(a) * r)));
            achou = !arenaPecaColide(arenaEd.arena.pecas, q, -1);
        }
        if (!achou) return arenaDica("LUGAR OCUPADO: não há espaço livre para duplicar.");
    }
    arenaEd.arena.pecas.push(q);
    arenaEd.sel = arenaEd.arena.pecas.length - 1;
    arenaEd.vista = "foco";
    arenaAtualizarSelecao(); arenaAtualizarVista(); arenaDesenharPlanta();
    arenaRegistrarPasso();
}
function arenaMostrarBaixo(qual) {
    if (!arenaEd) return;
    arenaEd.baixo = qual;
    const b = document.getElementById("arena-baixo");
    if (b && b.setAttribute) b.setAttribute("data-vista", qual);
    ["dados", "peca"].forEach(k => { const t = document.getElementById("arena-baixo-" + k); if (t && t.classList) t.classList.toggle("active", k === qual); });
}
// ---- planta (vista de cima) e faixa do céu ----
const AR_PLANTA = 320;
function arenaPlantaParaMundo(px, py) { const s = AR_PLANTA / (ARENA_RAIO * 2); return [px / s - ARENA_RAIO, py / s - ARENA_RAIO]; }
function arenaMundoParaPlanta(x, z) { const s = AR_PLANTA / (ARENA_RAIO * 2); return [(x + ARENA_RAIO) * s, (z + ARENA_RAIO) * s]; }
function arenaCeuParaPlanta(p) { return [p.a / 360 * AR_PLANTA, 20 + (1 - p.h) * (AR_PLANTA * 0.45 - 30)]; }
function arenaModoCeu() { return !!arenaEd && arenaEd.aba === "ceu"; }
// a planta ocupa o maior quadrado que cabe no espaço que sobra (sem barra de rolagem)
function arenaAjustarPlanta() {
    const cv = document.getElementById("arena-planta"), caixa = cv && cv.parentElement;
    if (!cv || !caixa || !cv.style || !(caixa.clientWidth > 0)) return;
    const lado = Math.max(120, Math.floor(Math.min(caixa.clientWidth, caixa.clientHeight || caixa.clientWidth)));
    cv.style.width = cv.style.height = lado + "px";
}
function arenaDesenharPlantaForma(g, p, def, s) {
    const pts = arFormaPontos(p.f, def.forma, arSemente(p));
    g.beginPath();
    pts.forEach((q, i) => { const x = q[0] * s * p.e, y = q[1] * s * p.e; i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.closePath();
}
function arenaDesenharPlanta() {
    const cv = document.getElementById("arena-planta");
    const g = cv && cv.getContext && cv.getContext("2d");
    if (!g || !arenaEd) return;
    const a = arenaEd.arena, S = AR_PLANTA;
    g.save();
    g.clearRect(0, 0, S, S);
    if (arenaModoCeu()) {
        const H = S * 0.45, gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, a.ceu.topo); gr.addColorStop(1, a.ceu.horizonte);
        g.fillStyle = gr; g.fillRect(0, 0, S, H);
        g.fillStyle = a.chao.cor; g.fillRect(0, H, S, S - H);
        g.fillStyle = "rgba(255, 255, 255, 0.85)"; g.font = "bold 10px sans-serif"; g.textAlign = "center";
        ["N", "L", "S", "O"].forEach((t, i) => g.fillText(T(t), (i / 4) * S + 8, H + 14));
        a.pecas.forEach((p, i) => {
            const def = ARENA_PECAS[p.t];
            if (!def.ceu) return;
            const [x, y] = arenaCeuParaPlanta(p), r = 6 + 4 * p.e;
            g.fillStyle = p.c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
            g.strokeStyle = i === arenaEd.sel ? "#ffd23f" : "rgba(0, 0, 0, 0.6)"; g.lineWidth = i === arenaEd.sel ? 3 : 1; g.stroke();
        });
    } else {
        g.fillStyle = a.chao.cor; g.fillRect(0, 0, S, S);
        const s = S / (ARENA_RAIO * 2);
        // planície embaixo de tudo (mais clara: não dá para escolher)
        const plan = ARENA_PLANICIES[a.planicie];
        if (plan) plan.pecas.forEach(p0 => {
            const p = Object.assign({ r: 0, f: "circulo" }, p0), def = ARENA_PECAS[p.t], [px, py] = arenaMundoParaPlanta(p.x, p.z);
            g.save(); g.translate(px, py); g.rotate((p.r || 0) * Math.PI / 180); g.globalAlpha = 0.6; g.fillStyle = p.c;
            if (def.forma) { arenaDesenharPlantaForma(g, p, def, s); g.fill(); }
            else if (def.planta && def.planta.ret) { const [w, d] = def.planta.ret; g.fillRect(-w * s * p.e, -d * s * p.e, w * 2 * s * p.e, d * 2 * s * p.e); }
            g.restore();
        });
        g.strokeStyle = "rgba(0, 0, 0, 0.12)"; g.lineWidth = 1;
        for (let i = 0; i <= 8; i++) { const v = i / 8 * S; g.beginPath(); g.moveTo(v, 0); g.lineTo(v, S); g.moveTo(0, v); g.lineTo(S, v); g.stroke(); }
        // centro (onde a luta acontece)
        g.strokeStyle = "rgba(255, 210, 63, 0.9)"; g.setLineDash([5, 4]);
        g.beginPath(); g.arc(S / 2, S / 2, 26, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.fillStyle = "rgba(255, 210, 63, 0.95)"; g.font = "bold 9px sans-serif"; g.textAlign = "center"; g.fillText(T("LUTA"), S / 2, S / 2 + 3);
        const vermelha = arenaPecaVermelha();
        const ordem = a.pecas.map((p, i) => i).filter(i => !ARENA_PECAS[a.pecas[i].t].ceu)
            .sort((i, j) => (ARENA_PECAS[a.pecas[j].t].chao && !(a.pecas[j].v > 0) ? 1 : 0) - (ARENA_PECAS[a.pecas[i].t].chao && !(a.pecas[i].v > 0) ? 1 : 0));
        ordem.forEach(i => {
            const p = a.pecas[i], def = ARENA_PECAS[p.t], [px, py] = arenaMundoParaPlanta(p.x, p.z);
            g.save(); g.translate(px, py); g.rotate((p.r || 0) * Math.PI / 180);
            g.fillStyle = i === vermelha ? "#ff3030" : p.c; g.globalAlpha = def.chao && !(p.v > 0) ? 0.85 : 1;
            if (def.forma) { arenaDesenharPlantaForma(g, p, def, s); g.fill(); if (p.v > 0) { g.strokeStyle = "rgba(0, 0, 0, 0.5)"; g.lineWidth = 1.5; g.stroke(); } }
            else if (def.planta && def.planta.ret) { const [w, d] = def.planta.ret; g.fillRect(-w * s * p.e, -d * s * p.e, w * 2 * s * p.e, d * 2 * s * p.e); }
            else { const r = Math.max(3, ((def.planta && def.planta.circ) || 8) * s * p.e); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); }
            g.globalAlpha = 1;
            if (def.anim) { g.fillStyle = "#ffffff"; g.font = "bold 9px sans-serif"; g.textAlign = "center"; g.fillText("✦", 0, 3); }
            if (i === arenaEd.sel || i === vermelha) {
                g.strokeStyle = i === vermelha ? "#ff2a2a" : "#ffd23f"; g.lineWidth = 2.5;
                const r = Math.max(6, (def.forma ? arRaioForma(p, def.forma) : ((def.planta && (def.planta.circ || Math.max(...def.planta.ret))) || 8)) * s * p.e + 3);
                g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
            }
            g.restore();
        });
    }
    g.restore();
    const cont = document.getElementById("arena-contagem");
    if (cont) cont.textContent = `PEÇAS: ${a.pecas.length} / ${ARENA_PECAS_MAX}`;
}
// peça marcada de vermelho (arrastada para um lugar ocupado, ou acabou de tentar invadir outra)
function arenaPecaVermelha() {
    if (!arenaEd) return -1;
    if (arenaEd.arrasto && arenaEd.arrasto.invalido) return arenaEd.arrasto.i;
    if (arenaEd.vermelhoAte > performance.now()) return arenaEd.sel;
    return -1;
}
function arenaPecaNoPonto(px, py) {
    const a = arenaEd.arena, s = AR_PLANTA / (ARENA_RAIO * 2);
    // peças de pé têm prioridade sobre os pisos (desenhados embaixo)
    const plano = (q) => ARENA_PECAS[q.t].chao && !(q.v > 0) ? 1 : 0;
    const ordem = a.pecas.map((p, i) => i).reverse().sort((i, j) => plano(a.pecas[i]) - plano(a.pecas[j]));
    for (const i of ordem) {
        const p = a.pecas[i], def = ARENA_PECAS[p.t];
        if (arenaModoCeu() !== !!def.ceu) continue;
        let x, y, r;
        if (def.ceu) { [x, y] = arenaCeuParaPlanta(p); r = 8 + 4 * p.e; }
        else {
            [x, y] = arenaMundoParaPlanta(p.x, p.z);
            r = Math.max(8, (def.forma ? arRaioForma(p, def.forma) : ((def.planta && (def.planta.circ || Math.max(...def.planta.ret))) || 8)) * s * p.e);
        }
        if (Math.hypot(px - x, py - y) <= r) return i;
    }
    return -1;
}
// (getElementPointFromClient já conta o jogo girado para deitado no celular em pé)
function arenaPontoDoEvento(e) {
    const q = getElementPointFromClient(document.getElementById("arena-planta"), e.clientX, e.clientY, AR_PLANTA, AR_PLANTA);
    return [q.x, q.y];
}
function arenaMoverPara(p, px, py) {
    if (ARENA_PECAS[p.t].ceu) {
        p.a = Math.round(Math.max(0, Math.min(359, px / AR_PLANTA * 360)));
        p.h = Math.round(Math.max(0, Math.min(1, 1 - (py - 20) / (AR_PLANTA * 0.45 - 30))) * 100) / 100;
    } else {
        const [x, z] = arenaPlantaParaMundo(px, py);
        arenaPorPeca(p, x, z);
    }
}
// põe a peça em (x, z) do mundo, presa na grade quando ela está ligada
function arenaPorPeca(p, x, z) {
    p.x = Math.max(-ARENA_RAIO, Math.min(ARENA_RAIO, arenaNaGrade(x)));
    p.z = Math.max(-ARENA_RAIO, Math.min(ARENA_RAIO, arenaNaGrade(z)));
}
function arenaPlantaToque(e) {
    if (!arenaEd) return;
    const [px, py] = arenaPontoDoEvento(e);
    const i = arenaPecaNoPonto(px, py);
    arenaDica();
    if (i >= 0) {
        const p = arenaEd.arena.pecas[i];
        arenaEd.sel = i;
        arenaEd.arrasto = { i, x: p.x, z: p.z, a: p.a, h: p.h, invalido: false };
        arenaEd.vista = "foco";
        arenaMostrarBaixo("peca");
    } else if (arenaEd.tipo && (!!ARENA_PECAS[arenaEd.tipo].ceu === arenaModoCeu())) {
        if (arenaEd.arena.pecas.length >= ARENA_PECAS_MAX) return showSystemAlert("EDITOR DE ARENAS", "LIMITE DE 80 PEÇAS POR ARENA.");
        const def = ARENA_PECAS[arenaEd.tipo];
        if (def.anim && arenaEd.arena.pecas.filter(q => ARENA_PECAS[q.t].anim).length >= ARENA_ANIMADAS_MAX) return showSystemAlert("EDITOR DE ARENAS", "LIMITE DE 10 EFEITOS POR ARENA.");
        const p = normalizarPecaArena({ t: arenaEd.tipo, c: def.cor, e: 1, txt: def.texto });
        arenaMoverPara(p, px, py);
        if (arenaPecaColide(arenaEd.arena.pecas, p, -1)) {
            arenaDica("LUGAR OCUPADO: escolha um espaço livre para a peça.");
            arenaEd.vermelhoAte = performance.now() + 700;
            arenaDesenharPlanta();
            return;
        }
        arenaEd.arena.pecas.push(p);
        arenaEd.sel = arenaEd.arena.pecas.length - 1;
        arenaEd.arrasto = { i: arenaEd.sel, x: p.x, z: p.z, a: p.a, h: p.h, invalido: false, nova: true };
        arenaEd.vista = "foco";
        arenaMostrarBaixo("peca");
    } else {
        arenaEd.sel = -1;
        arenaEd.vista = "arena";
    }
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (er) {}
    arenaAtualizarSelecao(); arenaAtualizarVista(); arenaDesenharPlanta();
}
function arenaPlantaArrasto(e) {
    if (!arenaEd || !arenaEd.arrasto) return;
    const ar = arenaEd.arrasto, p = arenaEd.arena.pecas[ar.i];
    if (!p) return;
    const [px, py] = arenaPontoDoEvento(e);
    arenaMoverPara(p, px, py);
    ar.invalido = arenaPecaColide(arenaEd.arena.pecas, p, ar.i);
    arenaEd.vista = "arena";   // arrastando: vê a arena inteira (e a peça vermelha se o lugar estiver ocupado)
    arenaDesenharPlanta();
}
function arenaPlantaSolta() {
    if (!arenaEd || !arenaEd.arrasto) return;
    const ar = arenaEd.arrasto, p = arenaEd.arena.pecas[ar.i];
    if (p && ar.invalido) {   // lugar ocupado: volta para o último lugar bom
        if (ARENA_PECAS[p.t].ceu) { p.a = ar.a; p.h = ar.h; } else { p.x = ar.x; p.z = ar.z; }
        arenaDica("LUGAR OCUPADO: a peça voltou para onde estava.");
    }
    const pulaFoco = ar.previa;
    arenaEd.arrasto = null;
    arenaEd.congelar = false;
    if (arenaEd.sel >= 0 && !(pulaFoco && ar.movido)) arenaEd.vista = "foco";
    arenaAtualizarVista();
    arenaDesenharPlanta();
    arenaRegistrarPasso();
}
// ---- tela grande: desenhada no canvas do jogo (escondido atrás da tela do editor) e copiada para cá ----
// câmera perto de uma peça (prévia ou peça escolhida), afastada conforme o tamanho dela
const AR_ALTURAS = { coluna_lava: 260, arco_lava: 190, predio: 72, torre: 100, torre_mirante: 90, montanha: 140, mesa_pedra: 90, fumaca: 160, antena: 70, coqueiro: 80, brasas: 110 };
function arenaAlturaPeca(p) { return (AR_ALTURAS[p.t] || 40) * (p.e || 1); }
function arenaRaioPeca(p) {
    const def = ARENA_PECAS[p.t];
    return (def.forma ? arRaioForma(p, def.forma) : def.planta ? (def.planta.circ || Math.max(...def.planta.ret)) : 30) * (p.e || 1);
}
function arenaCameraPerto(p) {
    const def = ARENA_PECAS[p.t], e = p.e || 1;
    const raio = arenaRaioPeca(p);
    const alto = AR_ALTURAS[p.t] || 40;
    const D = Math.max(170, Math.min(900, Math.max(raio * 3.4, alto * e * 2.4) + 110));
    return { CX: 400, HY: 70, D, H: Math.max(60, D * 0.36), F: 560, PERTO: 20, CORTE: D * 0.5 };
}
function arenaVistaAtual() {
    const a = arenaEd.arena;
    if (arenaEd.vista === "previa" && arenaEd.previa) {
        if (arenaEd.previa.startsWith("planicie:")) {
            const pl = ARENA_PLANICIES[arenaEd.previa.slice(9)];
            return { a: Object.assign({}, a, { planicie: arenaEd.previa.slice(9), ceu: pl.ceu, chao: pl.chao, pecas: [] }), opts: { chave: "_vista_planicie" } };
        }
        const def = ARENA_PECAS[arenaEd.previa];
        const p = normalizarPecaArena({ t: arenaEd.previa, x: 0, z: 0, a: 180, h: 0.55, e: 1, c: def.cor, txt: def.texto });
        if (def.ceu) return { a: Object.assign({}, a, { pecas: [p] }), opts: { chave: "_vista_peca", cam: ARENA_CAMERAS.baixa }, angFixo: 0 };
        return { a: Object.assign({}, a, { planicie: "", pecas: [p] }), opts: { chave: "_vista_peca", cam: arenaCameraPerto(p) } };
    }
    const sel = a.pecas[arenaEd.sel];
    if (arenaEd.vista === "foco" && sel && !ARENA_PECAS[sel.t].ceu)
        return { a, opts: { chave: "_vista_foco", cam: arenaCameraPerto(sel), desl: { x: sel.x, z: sel.z }, vermelha: arenaPecaVermelha() } };
    return { a, opts: { chave: "_vista", vermelha: arenaPecaVermelha() } };
}
function desenharPreviaArena(dt) {
    if (!arenaEd) return;
    const cv = document.getElementById("arena-previa");
    const g = cv && cv.getContext && cv.getContext("2d");
    if (!g) return;
    const vista = arenaVistaAtual(), seguir = vista.a.movimento === "seguir" && arenaEd.vista === "arena";
    if (arenaEd.mover && !arenaEd.congelar) {
        if (seguir) arenaEd.andado += (dt || 0) * 70;
        else arenaEd.angulo = (arenaEd.angulo + (dt || 0) * 0.35) % (Math.PI * 2);
    }
    const ang = document.getElementById("arena-angulo");
    if (ang && !arenaEd.mover && !arenaEd.congelar) arenaEd.angulo = Number(ang.value) / 360 * Math.PI * 2;
    else if (ang) ang.value = Math.round(arenaEd.angulo / (Math.PI * 2) * 360);
    applyRenderTransform();
    ctx.save();
    const opts = Object.assign({}, vista.opts);
    if (seguir) opts.andado = arenaEd.andado;
    const angUsado = seguir ? 0 : (vista.angFixo !== undefined ? vista.angFixo : arenaEd.angulo);
    drawArenaCriada(vista.a, angUsado, opts);
    ctx.restore();
    // guarda como a tela grande ficou: é com isso que o toque na tela virá a achar a peça e o chão
    arenaEd.ultimo = { cam: opts.cam || ARENA_CAMERAS[vista.a.camera] || ARENA_CAMERAS.media, ang: angUsado,
        desl: { x: (opts.desl ? opts.desl.x : 0) + (seguir ? arenaEd.andado : 0), z: opts.desl ? opts.desl.z : 0 },
        completa: arenaEd.vista === "arena" && !seguir };
    const z = arenaEd.zoom, vw = canvas.width / z, vh = canvas.height / z;
    arenaLimitarPan();
    g.drawImage(canvasEl, arenaEd.pan.x * renderScale, arenaEd.pan.y * renderScale, vw * renderScale, vh * renderScale, 0, 0, cv.width, cv.height);
}
// ---- zoom, arrastar a vista e tela cheia da visualização grande ----
function arenaLimitarPan() {
    const z = arenaEd.zoom, vw = canvas.width / z, vh = canvas.height / z;
    arenaEd.pan.x = Math.max(0, Math.min(canvas.width - vw, arenaEd.pan.x));
    arenaEd.pan.y = Math.max(0, Math.min(canvas.height - vh, arenaEd.pan.y));
}
// zoom mantendo o ponto [lx, ly] (coordenadas do canvas) embaixo do dedo/cursor
function arenaAplicarZoom(z, centro) {
    if (!arenaEd) return;
    const novo = Math.max(1, Math.min(4, Math.round(z * 100) / 100));
    const c = centro || [arenaEd.pan.x + canvas.width / arenaEd.zoom / 2, arenaEd.pan.y + canvas.height / arenaEd.zoom / 2];
    arenaEd.pan.x = c[0] - (c[0] - arenaEd.pan.x) * (arenaEd.zoom / novo);
    arenaEd.pan.y = c[1] - (c[1] - arenaEd.pan.y) * (arenaEd.zoom / novo);
    arenaEd.zoom = novo;
    arenaLimitarPan();
    const barra = document.getElementById("arena-zoom");
    if (barra) barra.value = Math.round(novo * 100);
}
function arenaZoomDaBarra() {
    const barra = document.getElementById("arena-zoom");
    if (barra && arenaEd) arenaAplicarZoom(Number(barra.value) / 100, null);
}
function arenaMaximizar(sim) {
    const grade = document.getElementById("arena-tela");
    if (arenaEd) arenaEd.maximizado = !!sim;
    if (grade && grade.classList) grade.classList.toggle("ar-max", !!sim);
    arenaAtualizarFerramentas();
    arenaAjustarPlanta();
}
function arenaAlternarMaximizar() { if (arenaEd) arenaMaximizar(!arenaEd.maximizado); }
// ---- tocar e arrastar peças na tela grande ----
// ponto do evento em coordenadas do canvas do jogo (já contando o zoom e o arraste da vista)
function arenaPontoNaPrevia(e) {
    const z = arenaEd.zoom;
    const q = getElementPointFromClient(document.getElementById("arena-previa"), e.clientX, e.clientY, canvas.width / z, canvas.height / z);
    return [arenaEd.pan.x + q.x, arenaEd.pan.y + q.y];
}
// ponto da tela -> chão da arena (o contrário de trProj com y = 0)
function arenaChaoNaTela(lx, ly) {
    const u = arenaEd.ultimo;
    if (!u) return null;
    const cam = u.cam, esc = (ly - cam.HY) / cam.H;
    if (!(esc > 0.02)) return null;
    const rz = cam.D - cam.F / esc, rx = (lx - cam.CX) / esc;
    const c = Math.cos(u.ang), sn = Math.sin(u.ang);
    return [rx * c + rz * sn + u.desl.x, -rx * sn + rz * c + u.desl.z];
}
// projeção com uma câmera qualquer (a tela grande não é desenhada com a trCam da hora do toque)
function arProjCom(cam, x, y, z, ang) {
    const r = trRot(x, z, ang), esc = cam.F / Math.max(cam.PERTO, cam.D - r[1]);
    return [cam.CX + r[0] * esc, cam.HY + (cam.H - y) * esc, r[1], esc];
}
// peça desenhada embaixo do ponto da tela (a mais perto da câmera ganha)
function arenaPecaNaTela(lx, ly) {
    const u = arenaEd.ultimo;
    if (!u || arenaModoCeu()) return -1;
    const a = arenaEd.arena;
    let achado = -1, melhor = -Infinity;
    a.pecas.forEach((p, i) => {
        const def = ARENA_PECAS[p.t];
        if (def.ceu) return;
        const pr = arProjCom(u.cam, p.x - u.desl.x, 0, p.z - u.desl.z, u.ang);
        if (pr[2] > u.cam.D - u.cam.PERTO) return;
        const r = Math.max(10, arenaRaioPeca(p) * pr[3]), alto = arenaAlturaPeca(p) * pr[3];
        if (Math.abs(lx - pr[0]) > r || ly > pr[1] + r * 0.5 || ly < pr[1] - alto - 6) return;
        if (pr[2] > melhor) { melhor = pr[2]; achado = i; }
    });
    return achado;
}
function arenaPreviaToque(e) {
    if (!arenaEd || !arenaEd.ultimo) return;
    arenaEd.dedos.set(e.pointerId, [e.clientX, e.clientY]);
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (er) {}
    if (arenaEd.dedos.size === 2) {   // dois dedos: afastar/juntar dá zoom (celular)
        const [A, B] = Array.from(arenaEd.dedos.values());
        arenaEd.pinca = { d: Math.hypot(A[0] - B[0], A[1] - B[1]) || 1, z: arenaEd.zoom };
        if (arenaEd.arrasto && arenaEd.arrasto.previa) arenaPlantaSolta();
        arenaEd.vistaArrasto = null;
        return;
    }
    if (arenaEd.dedos.size > 2) return;
    const [lx, ly] = arenaPontoNaPrevia(e);
    const i = arenaEd.vista === "previa" ? -1 : arenaPecaNaTela(lx, ly);
    arenaDica();
    if (i >= 0) {   // tocou numa peça: escolhe e já pode arrastar
        const p = arenaEd.arena.pecas[i];
        arenaEd.sel = i;
        arenaEd.arrasto = { i, x: p.x, z: p.z, a: p.a, h: p.h, invalido: false, previa: true, movido: false };
        arenaEd.congelar = true;
        arenaMostrarBaixo("peca");
        arenaAtualizarSelecao(); arenaAtualizarVista(); arenaDesenharPlanta();
        return;
    }
    const chao = arenaEd.vista === "arena" && arenaEd.tipo && !ARENA_PECAS[arenaEd.tipo].ceu ? arenaChaoNaTela(lx, ly) : null;
    if (chao && Math.abs(chao[0]) <= ARENA_RAIO && Math.abs(chao[1]) <= ARENA_RAIO) {   // peça escolhida na lista: toque coloca
        arenaColocarPecaEm(chao[0], chao[1]);
        return;
    }
    if (arenaEd.zoom > 1) arenaEd.vistaArrasto = { x: lx - arenaEd.pan.x, y: ly - arenaEd.pan.y, px: arenaEd.pan.x, py: arenaEd.pan.y };
    else if (arenaEd.vista === "foco") { arenaEd.sel = -1; arenaEd.vista = "arena"; arenaAtualizarSelecao(); arenaAtualizarVista(); arenaDesenharPlanta(); }
}
function arenaPreviaArrasto(e) {
    if (!arenaEd) return;
    if (arenaEd.dedos.has(e.pointerId)) arenaEd.dedos.set(e.pointerId, [e.clientX, e.clientY]);
    if (arenaEd.pinca && arenaEd.dedos.size >= 2) {
        const [A, B] = Array.from(arenaEd.dedos.values());
        const d = Math.hypot(A[0] - B[0], A[1] - B[1]) || 1;
        const meio = { clientX: (A[0] + B[0]) / 2, clientY: (A[1] + B[1]) / 2 };
        arenaAplicarZoom(arenaEd.pinca.z * (d / arenaEd.pinca.d), arenaPontoNaPrevia(meio));
        return;
    }
    if (arenaEd.vistaArrasto) {   // posição do dedo dentro da vista (sem o arraste): o fundo acompanha o dedo
        const v = arenaEd.vistaArrasto, q = getElementPointFromClient(document.getElementById("arena-previa"), e.clientX, e.clientY, canvas.width / arenaEd.zoom, canvas.height / arenaEd.zoom);
        arenaEd.pan.x = v.px - (q.x - v.x);
        arenaEd.pan.y = v.py - (q.y - v.y);
        arenaLimitarPan();
        return;
    }
    const ar = arenaEd.arrasto;
    if (!ar || !ar.previa) return;
    const p = arenaEd.arena.pecas[ar.i];
    if (!p) return;
    const [lx, ly] = arenaPontoNaPrevia(e), chao = arenaChaoNaTela(lx, ly);
    if (!chao) return;
    ar.movido = true;
    arenaPorPeca(p, chao[0], chao[1]);
    ar.invalido = arenaPecaColide(arenaEd.arena.pecas, p, ar.i);
    arenaDesenharPlanta();
}
function arenaPreviaSolta(e) {
    if (!arenaEd) return;
    if (e && e.pointerId !== undefined) arenaEd.dedos.delete(e.pointerId);
    if (arenaEd.dedos.size < 2) arenaEd.pinca = null;
    arenaEd.vistaArrasto = null;
    if (arenaEd.arrasto && arenaEd.arrasto.previa) arenaPlantaSolta();
}
function arenaPreviaRoda(e) {
    if (!arenaEd || !arenaEd.ultimo) return;
    if (e.preventDefault) e.preventDefault();
    const [lx, ly] = arenaPontoNaPrevia(e);
    arenaAplicarZoom(arenaEd.zoom * (e.deltaY > 0 ? 0.88 : 1.14), [lx, ly]);
}
// coloca a peça escolhida na lista em (x, z) do mundo (toque na tela grande)
function arenaColocarPecaEm(x, z) {
    const def = ARENA_PECAS[arenaEd.tipo];
    if (!def) return;
    if (arenaEd.arena.pecas.length >= ARENA_PECAS_MAX) return showSystemAlert("EDITOR DE ARENAS", "LIMITE DE 80 PEÇAS POR ARENA.");
    if (def.anim && arenaEd.arena.pecas.filter(q => ARENA_PECAS[q.t].anim).length >= ARENA_ANIMADAS_MAX) return showSystemAlert("EDITOR DE ARENAS", "LIMITE DE 10 EFEITOS POR ARENA.");
    const p = normalizarPecaArena({ t: arenaEd.tipo, c: def.cor, e: 1, txt: def.texto });
    arenaPorPeca(p, x, z);
    if (arenaPecaColide(arenaEd.arena.pecas, p, -1)) {
        arenaDica("LUGAR OCUPADO: escolha um espaço livre para a peça.");
        arenaEd.vermelhoAte = performance.now() + 700;
        arenaDesenharPlanta();
        return;
    }
    arenaEd.arena.pecas.push(p);
    arenaEd.sel = arenaEd.arena.pecas.length - 1;
    arenaEd.arrasto = { i: arenaEd.sel, x: p.x, z: p.z, a: p.a, h: p.h, invalido: false, previa: true, movido: false };
    arenaEd.congelar = true;
    arenaMostrarBaixo("peca");
    arenaAtualizarSelecao(); arenaAtualizarVista(); arenaDesenharPlanta();
}
// ---- atalhos do teclado (PC) ----
function arenaTeclaAtalho(e) {
    if (!arenaEditorAberto() || !arenaEd) return;
    const alvo = e.target, digitando = alvo && (alvo.tagName === "INPUT" || alvo.tagName === "SELECT" || alvo.tagName === "TEXTAREA");
    if (e.ctrlKey || e.metaKey) {
        const k = (e.key || "").toLowerCase();
        if (k === "z") { e.preventDefault(); e.shiftKey ? arenaRefazer() : arenaDesfazer(); }
        else if (k === "y") { e.preventDefault(); arenaRefazer(); }
        return;
    }
    if (digitando) return;
    const p = arenaEd.arena.pecas[arenaEd.sel];
    const passo = e.shiftKey ? 40 : (arenaEd.grade ? ARENA_GRADE : 5);
    const mexer = (dx, dz) => {
        if (!p || ARENA_PECAS[p.t].ceu) return;
        const antes = { x: p.x, z: p.z };
        arenaPorPeca(p, p.x + dx, p.z + dz);
        if (arenaPecaColide(arenaEd.arena.pecas, p, arenaEd.sel)) { p.x = antes.x; p.z = antes.z; arenaEd.vermelhoAte = performance.now() + 700; arenaDica("LUGAR OCUPADO: a peça invadiria o espaço de outra."); }
        arenaDesenharPlanta();
        arenaRegistrarPasso();
    };
    switch (e.key) {
        case "Delete": case "Backspace": if (p) { e.preventDefault(); arenaApagarSelecao(); } break;
        case "r": case "R": if (p && !ARENA_PECAS[p.t].ceu) { p.r = (p.r + (e.shiftKey ? -15 : 15) + 360) % 360; arenaAtualizarSelecao(); arenaDesenharPlanta(); arenaRegistrarPasso(); } break;
        case "d": case "D": if (p) arenaDuplicarSelecao(); break;
        case "g": case "G": arenaAlternarGrade(); break;
        case "ArrowLeft": e.preventDefault(); mexer(-passo, 0); break;
        case "ArrowRight": e.preventDefault(); mexer(passo, 0); break;
        case "ArrowUp": e.preventDefault(); mexer(0, -passo); break;
        case "ArrowDown": e.preventDefault(); mexer(0, passo); break;
    }
}
// ---- botões da tela ----
function arenaTrocarDaLista() {
    const id = arenaValorDe("arena-lista");
    const a = getArenasCriadas().find(x => x.id === id);
    arenaEd.arena = a ? JSON.parse(JSON.stringify(a)) : arenaPadrao();
    arenaEd.sel = -1; arenaEd.tipo = null; arenaEd.previa = null; arenaEd.vista = "arena";
    arenaEd.hist = { pilha: [], i: -1 };
    arenaRegistrarPasso(true);
    arenaPreencherCampos();
}
function salvarArenaDoEditor() {
    if (!arenaEd) return;
    arenaLerCampos();
    const lista = getArenasCriadas(), a = normalizarArena(arenaEd.arena);
    if (!a.id || !lista.some(x => x.id === a.id)) {
        if (lista.length >= ARENA_MAX) return showSystemAlert("EDITOR DE ARENAS", "LIMITE DE 7 ARENAS CRIADAS. EXCLUA UMA PARA CRIAR OUTRA.");
        a.id = "arena_" + Date.now();
        lista.push(a);
    } else lista[lista.findIndex(x => x.id === a.id)] = a;
    if (!salvarArenasCriadas(lista)) return showSystemAlert("EDITOR DE ARENAS", "O NAVEGADOR NÃO TEM ESPAÇO PARA SALVAR A ARENA.");
    arenaEd.arena = JSON.parse(JSON.stringify(a));
    registrarArenasCriadas();
    if (typeof stageCardThumbs === "object") delete stageCardThumbs[a.id];   // foto do card refeita com o cenário novo
    arenaRegistrarPasso();
    arenaApagarRascunho();
    arenaPreencherCampos();
    showSystemAlert("SUCESSO", `ARENA ${a.nome} SALVA!`);
}
function excluirArenaDoEditor() {
    if (!arenaEd || !arenaEd.arena.id) return;
    const id = arenaEd.arena.id, nome = arenaEd.arena.nome;
    showSystemConfirm("EXCLUIR ARENA", `EXCLUIR A ARENA ${nome}?`, () => {
        salvarArenasCriadas(getArenasCriadas().filter(x => x.id !== id));
        registrarArenasCriadas();
        arCenas.delete(id);
        arenaEd.arena = getArenasCriadas()[0] ? JSON.parse(JSON.stringify(getArenasCriadas()[0])) : arenaPadrao();
        arenaEd.sel = -1; arenaEd.vista = "arena";
        arenaApagarRascunho();
        arenaPreencherCampos();
        arenaRegistrarPasso(true);
    }, "EXCLUIR");
}
function exportarArenaDoEditor() {
    if (!arenaEd) return;
    arenaLerCampos();
    const d = dadosDaArenaParaArquivo(arenaEd.arena);
    arqBaixar(JSON.stringify(d, null, 2), arqNomeDoArquivo(d.arena.nome, ".arena.json"));
}
// texto do .arena.json -> arena nova salva; devolve { id } ou { erro }
function importarArenaDeTexto(texto) {
    let dados;
    try { dados = JSON.parse(texto); } catch (e) { return { erro: "O ARQUIVO NÃO É UM JSON VÁLIDO." }; }
    const v = validarArquivoArena(dados);
    if (v.erro) return v;
    const lista = getArenasCriadas();
    if (lista.length >= ARENA_MAX) return { erro: "LIMITE DE 7 ARENAS CRIADAS. EXCLUA UMA PARA CRIAR OUTRA." };
    v.arena.id = "arena_" + Date.now();
    lista.push(v.arena);
    if (!salvarArenasCriadas(lista)) return { erro: "O NAVEGADOR NÃO TEM ESPAÇO PARA SALVAR A ARENA." };
    registrarArenasCriadas();
    return { id: v.arena.id };
}
async function anexarArquivoArena(input) {
    const f = input && input.files && input.files[0];
    if (input) input.value = "";
    if (!f) return;
    if ((f.size || 0) > ARQ_TAMANHO_MAX) return showSystemAlert("ARQUIVO COM ERRO", "ARQUIVOS GRANDES DEMAIS (MÁXIMO 4 MB NO TOTAL).");
    const r = importarArenaDeTexto(await lerArquivoArq(f, false) || "");
    if (r.erro) return showSystemAlert("ARQUIVO COM ERRO", r.erro);
    const a = getArenasCriadas().find(x => x.id === r.id);
    if (arenaEd) { arenaEd.arena = JSON.parse(JSON.stringify(a)); arenaEd.sel = -1; arenaEd.vista = "arena"; arenaEd.hist = { pilha: [], i: -1 }; arenaRegistrarPasso(true); arenaPreencherCampos(); }
    showSystemAlert("SUCESSO", `ARENA ${a.nome} IMPORTADA!`);
}

registrarArenasCriadas();
// planta: tocar coloca/escolhe, arrastar move (mouse, toque e caneta); a planta acompanha o tamanho da tela
(() => {
    const cv = document.getElementById("arena-planta");
    if (!cv || !cv.addEventListener) return;
    cv.addEventListener("pointerdown", arenaPlantaToque);
    cv.addEventListener("pointermove", arenaPlantaArrasto);
    ["pointerup", "pointercancel"].forEach(t => cv.addEventListener(t, arenaPlantaSolta));
    // tela grande: tocar/arrastar peças, arrastar a vista com zoom, roda do mouse e dois dedos (celular)
    const pv = document.getElementById("arena-previa");
    if (pv && pv.addEventListener) {
        pv.addEventListener("pointerdown", arenaPreviaToque);
        pv.addEventListener("pointermove", arenaPreviaArrasto);
        ["pointerup", "pointercancel"].forEach(t => pv.addEventListener(t, arenaPreviaSolta));
        pv.addEventListener("wheel", arenaPreviaRoda, { passive: false });
    }
    if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("resize", () => { if (arenaEditorAberto()) arenaAjustarPlanta(); });
        window.addEventListener("keydown", arenaTeclaAtalho);
    }
})();
