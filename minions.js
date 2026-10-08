// minions.js — MINIONS CLÁSSICOS (v0.90): o Saibaman e o Cell Jr. originais do jogo, desenhados à mão em canvas
// (de frente, num espaço de 64x80 reduzido para a caixa de 32x40), com as poses próprias deles: brotar, saltar,
// voar (4 quadros), investir, agarrar e arremessado. Cada modelo de MINION_MODELOS tem o desenho, as cores
// originais (padrao), as cores que o editor deixa trocar (editaveis) e as que acompanham outra (deriva: mudam o
// mesmo tanto que a cor de origem; sem edição ficam exatamente as originais). Um personagem com
// minionClassico = { modelo, cores } é sempre desenhado por aqui (luta, cards, editor) — nunca pelo construtor.
// Carrega antes de database.js (os personagens iniciais Saibaman e Cell Jr. nascem destes desenhos).

// Saibaman: cabeça grande e bulbosa com sulcos, olhos vermelhos enormes, corpo magro e curvado e garras. Cada pose é
// desenhada uma vez numa imagem guardada (2x, para ficar nítida) e só copiada a cada quadro.
const SAIBAMAN_SPRITE_SCALE = 3, SAIBAMAN_SPRITE_PAD = 8;
const MINION_DRAW_SCALE = 1.3;   // desenhados um pouco maiores que a caixa de colisão (os pés no mesmo lugar)
const saibamanSpriteCache = new Map();

// Minions desenhados de frente (como nas referências), num espaço de 64x80 reduzido para a caixa de 32x40.
// Contorno escuro, sombra de um tom e brilho em cima (cel-shading). Poses: voar (padrão), saltar e agarrar.
function minionLimb(g, pts, larg, cor, contorno, aneis) {
    g.lineCap = "round"; g.lineJoin = "round";
    const traco = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => g.lineTo(p[0], p[1])); };
    g.strokeStyle = contorno; g.lineWidth = larg + 2.4; traco(); g.stroke();
    g.strokeStyle = cor; g.lineWidth = larg; traco(); g.stroke();
    if (!aneis) return;
    // anéis/escamas atravessando o membro
    g.strokeStyle = aneis; g.lineWidth = 0.9;
    for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0) || 1;
        const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
        for (let t = 0.2; t < 1; t += 0.22) {
            const cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t;
            g.beginPath(); g.moveTo(cx - nx * larg * 0.45, cy - ny * larg * 0.45); g.quadraticCurveTo(cx + (x1 - x0) / len, cy + (y1 - y0) / len, cx + nx * larg * 0.45, cy + ny * larg * 0.45); g.stroke();
        }
    }
}
function minionClaws(g, x, y, dir, tam, cor, borda) {
    // três garras brancas curvas
    g.fillStyle = cor || "#eef3f8"; g.strokeStyle = borda || "#3a4656"; g.lineWidth = 0.7;
    for (let k = -1; k <= 1; k++) {
        const a = dir + k * 0.45;
        g.beginPath();
        g.moveTo(x + Math.cos(a + 1.3) * tam * 0.35, y + Math.sin(a + 1.3) * tam * 0.35);
        g.quadraticCurveTo(x + Math.cos(a) * tam * 1.1, y + Math.sin(a) * tam * 1.1 - 1, x + Math.cos(a) * tam * 1.25, y + Math.sin(a) * tam * 1.25);
        g.lineTo(x + Math.cos(a - 1.3) * tam * 0.35, y + Math.sin(a - 1.3) * tam * 0.35);
        g.closePath(); g.fill(); g.stroke();
    }
}
function minionPose(pose, frame) {
    const sway = pose === "voar" ? Math.sin(frame / 4 * Math.PI * 2) : 0;
    if (pose === "saltar") return { sway, bracos: [[[20, 33], [14, 24], [12, 14]], [[44, 33], [50, 24], [52, 14]]], maos: [[12, 13, -Math.PI / 2], [52, 13, -Math.PI / 2]], pernas: [[[28, 50], [26, 62], [25, 74]], [[36, 50], [38, 62], [39, 74]]] };
    if (pose === "agarrar") return { sway, bracos: [[[20, 33], [9, 38], [4, 44]], [[44, 33], [55, 38], [60, 44]]], maos: [[4, 45, Math.PI * 0.75], [60, 45, Math.PI * 0.25]], pernas: [[[28, 50], [19, 60], [17, 73]], [[36, 50], [45, 60], [47, 73]]] };
    return { sway, bracos: [[[20, 33], [12, 42 + sway], [14, 53 + sway]], [[44, 33], [52, 42 - sway], [50, 53 - sway]]], maos: [[14, 54 + sway, Math.PI / 2], [50, 54 - sway, Math.PI / 2]],
        pernas: [[[28, 50], [19, 59 + sway], [17, 72]], [[36, 50], [45, 59 - sway], [47, 72]]] };
}

function traceSaibamanFigure(g, pose, frame, C) {
    C = C || MINION_MODELOS.saibaman.padrao;
    g.save(); g.scale(0.5, 0.5);
    const pele = C.pele, sombra = C.sombra, claro = C.claro, linha = C.linha, aneis = C.aneis;
    const P = minionPose(pose, frame);
    // pernas agachadas com anéis e pés de garras
    P.pernas.forEach((pts, i) => {
        minionLimb(g, pts, 7.5, pele, linha, aneis);
        const [fx, fy] = pts[pts.length - 1];
        g.fillStyle = sombra; g.strokeStyle = linha; g.lineWidth = 1.1;
        g.beginPath(); g.ellipse(fx, fy + 1, 5.5, 3, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        minionClaws(g, fx + (i ? 2 : -2), fy + 3, i ? 0.3 : Math.PI - 0.3, 5, C.garras, C.garraBorda);
    });
    // tronco: peitoral liso em placas e barriga segmentada
    g.fillStyle = pele; g.strokeStyle = linha; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(19, 31); g.quadraticCurveTo(32, 27, 45, 31); g.lineTo(42, 44); g.quadraticCurveTo(32, 53, 22, 44); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = sombra;
    g.beginPath(); g.moveTo(22, 44); g.quadraticCurveTo(32, 53, 42, 44); g.lineTo(40, 41); g.quadraticCurveTo(32, 48, 24, 41); g.closePath(); g.fill();
    g.strokeStyle = linha; g.lineWidth = 1;
    g.beginPath(); g.moveTo(32, 31); g.lineTo(32, 49); g.stroke();
    g.beginPath(); g.moveTo(21, 38); g.quadraticCurveTo(26.5, 41, 31.5, 38); g.moveTo(32.5, 38); g.quadraticCurveTo(37.5, 41, 43, 38); g.stroke();
    g.beginPath(); g.moveTo(25, 45); g.lineTo(39, 45); g.stroke();
    g.fillStyle = "rgba(255, 255, 255, 0.35)";
    g.beginPath(); g.ellipse(26, 34, 3.5, 1.6, -0.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(38, 34, 3.5, 1.6, 0.3, 0, Math.PI * 2); g.fill();
    // braços com anéis e mãos de garras
    P.bracos.forEach((pts, i) => {
        minionLimb(g, pts, 6.5, pele, linha, aneis);
        const [hx, hy, dir] = P.maos[i];
        g.fillStyle = sombra; g.beginPath(); g.arc(pts[2][0], pts[2][1], 3.4, 0, Math.PI * 2); g.fill();
        minionClaws(g, hx, hy, dir, 5, C.garras, C.garraBorda);
    });
    // orelhas pontudas
    g.fillStyle = pele; g.strokeStyle = linha; g.lineWidth = 1.1;
    [[1, 19], [-1, 45]].forEach(([d, x]) => { g.beginPath(); g.moveTo(x, 21); g.lineTo(x - d * 9, 15); g.lineTo(x + d * 1, 27); g.closePath(); g.fill(); g.stroke(); });
    // cabeça grande em forma de cérebro, com o sulco no meio e veios
    const cab = g.createRadialGradient(28, 8, 2, 32, 15, 18);
    cab.addColorStop(0, C.cabLuz); cab.addColorStop(0.55, claro); cab.addColorStop(1, C.cabBorda);
    g.fillStyle = cab; g.strokeStyle = linha; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(19, 24); g.bezierCurveTo(13, 12, 20, 0, 32, 0); g.bezierCurveTo(44, 0, 51, 12, 45, 24); g.quadraticCurveTo(39, 31, 32, 31); g.quadraticCurveTo(25, 31, 19, 24); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = C.sulco; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(32, 1); g.bezierCurveTo(31, 6, 33, 10, 32, 16); g.stroke();
    g.lineWidth = 0.7;
    [[22, 8, 27, 6, 28, 11], [21, 14, 25, 12, 27, 16], [42, 8, 37, 6, 36, 11], [43, 14, 39, 12, 37, 16], [25, 3, 28, 4, 29, 7], [39, 3, 36, 4, 35, 7]].forEach(v => {
        g.beginPath(); g.moveTo(v[0], v[1]); g.quadraticCurveTo(v[2], v[3] + 2, v[2] + (v[4] - v[2]) / 2, v[3]); g.quadraticCurveTo(v[4], v[5] - 2, v[4], v[5]); g.stroke();
    });
    // testa franzida, olhos vermelhos puxados e boca aberta
    g.fillStyle = C.testa;
    g.beginPath(); g.moveTo(22, 20); g.quadraticCurveTo(32, 16, 42, 20); g.lineTo(42, 22); g.quadraticCurveTo(32, 19, 22, 22); g.closePath(); g.fill();
    [[26.5, 23.5, 0.38], [37.5, 23.5, -0.38]].forEach(([x, y, r]) => {
        g.fillStyle = C.olhos; g.strokeStyle = C.olhoBorda; g.lineWidth = 1;
        g.beginPath(); g.ellipse(x, y, 4.6, 2.1, r, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = C.olhoBrilho; g.beginPath(); g.ellipse(x - 1, y - 0.6, 1.4, 0.6, r, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = C.boca; g.strokeStyle = linha; g.lineWidth = 1;
    g.beginPath(); g.moveTo(28.5, 27.3); g.quadraticCurveTo(32, 26.4, 35.5, 27.3); g.quadraticCurveTo(32, 31.5, 28.5, 27.3); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = C.lingua; g.beginPath(); g.ellipse(32, 29, 1.8, 0.8, 0, 0, Math.PI * 2); g.fill();
    g.restore();
}

// Cell Jr. (Torneio de Cell): mesmo tamanho, poses e mecânica do Saibaman. Atarracado, armadura azul-marinho
// brilhante (ombros, peito, cinto, canelas), painéis azul-claros com manchas escuras (crista, barriga, braços,
// coxas), crista de duas abas, rosto claro com marcas roxas e queixeira amarela, mãos brancas, asas escuras e
// botas amarelas. Desenhado de frente.
function traceCellJrFigure(g, pose, frame, C) {
    C = C || MINION_MODELOS.celljr.padrao;
    g.save(); g.scale(0.5, 0.5);
    const azul = C.azul, azulClaro = C.azulClaro, marinho = C.marinho, marinhoBrilho = C.marinhoBrilho, linha = C.linha, mancha = C.mancha;
    const P = minionPose(pose, frame);
    const manchas = (pts, r) => { g.fillStyle = mancha; pts.forEach(([x, y], i) => { g.beginPath(); g.ellipse(x, y, r * (0.8 + (i % 3) * 0.2), r * 0.7, i * 0.7, 0, Math.PI * 2); g.fill(); }); };
    const forma = (pts, cor) => { g.fillStyle = cor; g.strokeStyle = linha; g.lineWidth = 1.2; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); g.stroke(); };
    const brilho = (x, y, rx, ry) => { g.fillStyle = "rgba(255, 255, 255, 0.35)"; g.beginPath(); g.ellipse(x, y, rx, ry, -0.4, 0, Math.PI * 2); g.fill(); };
    // asas escuras atrás dos ombros (batem ao voar)
    const bate = P.sway * 2;
    forma([[22, 32], [6, 24 - bate], [3, 44], [14, 52], [22, 44]], C.asas);
    forma([[42, 32], [58, 24 - bate], [61, 44], [50, 52], [42, 44]], C.asas);
    g.strokeStyle = C.asaVeio; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(20, 34); g.lineTo(7, 30 - bate); g.moveTo(44, 34); g.lineTo(57, 30 - bate); g.stroke();
    // pernas: coxa azul manchada, joelheira e canela marinho, bota amarela pontuda
    P.pernas.forEach((pts, i) => {
        const [h, k, f] = pts;
        minionLimb(g, [h, k], 9, azul, linha);
        manchas([[(h[0] + k[0]) / 2 - 1.5, (h[1] + k[1]) / 2], [(h[0] + k[0]) / 2 + 2, (h[1] + k[1]) / 2 + 3]], 1.2);
        minionLimb(g, [k, f], 8.5, marinho, linha);
        g.fillStyle = marinhoBrilho; g.strokeStyle = linha; g.lineWidth = 1;
        g.beginPath(); g.arc(k[0], k[1], 4, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = azulClaro; g.beginPath(); g.arc(k[0] - 1, k[1] - 1, 1.6, 0, Math.PI * 2); g.fill();
        const d = i ? 1 : -1;
        forma([[f[0] - 5, f[1] - 1], [f[0] + 5, f[1] - 1], [f[0] + 6 * d + (d > 0 ? 2 : -2), f[1] + 5], [f[0] - 4 * d, f[1] + 5]], C.botas);
        g.fillStyle = C.botaBrilho; g.fillRect(f[0] - 3, f[1], 5, 1.2);
    });
    // barriga azul manchada, cinto e protetor marinho
    forma([[23, 42], [41, 42], [40, 51], [24, 51]], azul);
    manchas([[27, 45], [33, 47], [38, 44.5], [30, 49], [36, 49.5]], 1.2);
    forma([[22.5, 50], [41.5, 50], [41, 54], [23, 54]], marinho);
    forma([[29, 53.5], [35, 53.5], [33.5, 58], [30.5, 58]], marinho);
    // peitoral marinho grande e brilhante
    forma([[18, 30], [46, 30], [44, 41], [32, 44], [20, 41]], marinho);
    g.strokeStyle = marinhoBrilho; g.lineWidth = 1;
    g.beginPath(); g.moveTo(32, 31); g.lineTo(32, 43); g.moveTo(21, 37); g.quadraticCurveTo(26, 41, 31, 37); g.moveTo(33, 37); g.quadraticCurveTo(38, 41, 43, 37); g.stroke();
    brilho(25, 33, 4, 1.6); brilho(39, 33, 4, 1.6);
    // braços: azul manchado em cima, antebraço marinho e punho branco
    P.bracos.forEach((pts, i) => {
        const [o, c, m] = pts;
        minionLimb(g, [o, c], 7, azul, linha);
        manchas([[(o[0] + c[0]) / 2, (o[1] + c[1]) / 2]], 1.2);
        minionLimb(g, [c, m], 7, marinho, linha);
        g.fillStyle = C.maos; g.strokeStyle = linha; g.lineWidth = 1;
        g.beginPath(); g.arc(m[0], m[1], 3.6, 0, Math.PI * 2); g.fill(); g.stroke();
        g.strokeStyle = C.maoLinha; g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(m[0] - 2, m[1]); g.lineTo(m[0] + 2, m[1]); g.stroke();
    });
    // ombreiras redondas marinho com brilho
    [[17, 32], [47, 32]].forEach(([x, y]) => {
        g.fillStyle = marinho; g.strokeStyle = linha; g.lineWidth = 1.2;
        g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); g.stroke();
        brilho(x - 2, y - 3, 3, 1.4);
    });
    // crista de duas abas (azul manchado) e o meio marinho brilhante
    forma([[29, 14], [22, 1], [14, 5], [15, 18], [22, 24], [27, 22]], azul);
    forma([[35, 14], [42, 1], [50, 5], [49, 18], [42, 24], [37, 22]], azul);
    manchas([[19, 8], [22, 14], [17, 13], [24, 19], [45, 8], [42, 14], [47, 13], [40, 19]], 1.3);
    forma([[26, 8], [32, 3], [38, 8], [38, 17], [26, 17]], marinho);
    brilho(30, 7, 2.5, 1.2);
    // rosto claro, olhos, marcas roxas e a queixeira amarela
    forma([[25.5, 15], [38.5, 15], [38, 23], [32, 28.5], [26, 23]], C.rosto);
    [[29, 18.5, 0.25], [35, 18.5, -0.25]].forEach(([x, y, r]) => {
        g.fillStyle = C.olhos; g.beginPath(); g.ellipse(x, y, 2.1, 1.1, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = linha; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x - 2.4, y - 1.6 + r * 2); g.lineTo(x + 2.4, y - 1.6 - r * 2); g.stroke();
    });
    g.fillStyle = C.marcas; g.fillRect(26.6, 19.5, 1.2, 4); g.fillRect(36.2, 19.5, 1.2, 4);
    g.strokeStyle = C.queixeira; g.lineWidth = 2.4; g.lineJoin = "round";
    g.beginPath(); g.moveTo(25.5, 21); g.lineTo(28, 26); g.lineTo(32, 29); g.lineTo(36, 26); g.lineTo(38.5, 21); g.stroke();
    g.strokeStyle = C.queixeiraBorda; g.lineWidth = 0.6; g.stroke();
    g.strokeStyle = linha; g.lineWidth = 0.7; g.beginPath(); g.moveTo(30.5, 24.5); g.quadraticCurveTo(32, 25.3, 33.5, 24.5); g.stroke();
    g.restore();
}

// Modelos clássicos. editaveis: [chave, rótulo no editor]; deriva: chave -> cor de origem.
const MINION_MODELOS = {
    saibaman: {
        nome: "SAIBAMAN", rotulo: "Saibaman (clássico)", desenho: traceSaibamanFigure,
        padrao: { pele: "#6fc046", sombra: "#3f8a28", claro: "#a9e46f", linha: "#14320b", aneis: "rgba(20, 60, 12, 0.55)",
            cabLuz: "#d4f59a", cabBorda: "#78c24c", sulco: "rgba(40, 90, 20, 0.85)", testa: "rgba(60, 120, 30, 0.45)",
            olhos: "#e0263a", olhoBorda: "#3a0408", olhoBrilho: "#ff9aa4", boca: "#b5202f", lingua: "#ff7b88",
            garras: "#eef3f8", garraBorda: "#3a4656" },
        editaveis: [["pele", "PELE"], ["olhos", "OLHOS"], ["boca", "BOCA"], ["garras", "GARRAS"], ["linha", "CONTORNO"]],
        deriva: { sombra: "pele", claro: "pele", aneis: "pele", cabLuz: "pele", cabBorda: "pele", sulco: "pele", testa: "pele",
            olhoBorda: "olhos", olhoBrilho: "olhos", lingua: "boca", garraBorda: "garras" }
    },
    celljr: {
        nome: "CELL JR.", rotulo: "Cell Jr. (clássico)", desenho: traceCellJrFigure,
        padrao: { azul: "#3f9ae6", azulClaro: "#8fd0ff", marinho: "#14215a", marinhoBrilho: "#3a52a8", linha: "#060b22", mancha: "#122a6e",
            asas: "#1d1446", asaVeio: "#4a3b8c", botas: "#f0a624", botaBrilho: "rgba(255, 240, 180, 0.6)", maos: "#f2f4f8", maoLinha: "#9aa6b8",
            rosto: "#eeebf5", olhos: "#c2183a", marcas: "#9c4bc4", queixeira: "#f2b630", queixeiraBorda: "#a76d0e" },
        editaveis: [["azul", "PELE"], ["mancha", "MANCHAS"], ["marinho", "ARMADURA"], ["asas", "ASAS"], ["rosto", "ROSTO"], ["olhos", "OLHOS"],
            ["marcas", "MARCAS"], ["queixeira", "QUEIXEIRA"], ["maos", "MÃOS"], ["botas", "BOTAS"], ["linha", "CONTORNO"]],
        deriva: { azulClaro: "azul", marinhoBrilho: "marinho", asaVeio: "asas", botaBrilho: "botas", maoLinha: "maos", queixeiraBorda: "queixeira" }
    }
};
// poses usadas pelos movimentos do editor (a luta usa as fases do minion direto)
const MINION_POSES_DOS_MOVIMENTOS = { idle: "voar", flyUp: "saltar", flyUpRight: "saltar", flyUpLeft: "saltar", chargeKi: "agarrar" };

// cores #rrggbb / rgba(...) <-> HSL, para as cores derivadas acompanharem a cor editada
function minionCorParaRgba(cor) {
    const m = /^rgba?\(([^)]+)\)$/.exec(cor);
    if (m) { const p = m[1].split(",").map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    const n = parseInt(String(cor).slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
}
function minionRgbParaHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
}
function minionHslParaRgb(h, s, l) {
    if (!s) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
// a cor "orig" muda o mesmo tanto (matiz, saturação, luz) que a origem mudou de "antes" para "depois"
function minionCorRelativa(orig, antes, depois) {
    const o = minionCorParaRgba(orig), a = minionCorParaRgba(antes), d = minionCorParaRgba(depois);
    const ho = minionRgbParaHsl(o[0], o[1], o[2]), ha = minionRgbParaHsl(a[0], a[1], a[2]), hd = minionRgbParaHsl(d[0], d[1], d[2]);
    const lim = (v) => Math.max(0, Math.min(1, v));
    const rgb = minionHslParaRgb((ho[0] + hd[0] - ha[0] + 1) % 1, lim(ho[1] + hd[1] - ha[1]), lim(ho[2] + hd[2] - ha[2])).map(v => Math.round(v));
    if (o[3] < 1) return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${o[3]})`;
    return "#" + rgb.map(v => v.toString(16).padStart(2, "0")).join("");
}
function minionCorValida(c) { return typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c); }

// minionClassico guardado no personagem -> { modelo, cores } limpo (só cores editáveis e válidas)
function normalizarMinionClassico(mc) {
    if (!mc) return null;
    const modelo = typeof mc === "string" ? mc : mc.modelo;
    const M = MINION_MODELOS[modelo];
    if (!M) return null;
    const cores = {};
    const editadas = (typeof mc === "object" && mc.cores) || {};
    M.editaveis.forEach(([k]) => { if (minionCorValida(editadas[k]) && editadas[k].toLowerCase() !== M.padrao[k]) cores[k] = editadas[k].toLowerCase(); });
    return { modelo, cores };
}
// paleta completa do minion (sem nenhuma cor editada = exatamente a original)
const minionPaletas = new Map();
function getMinionPaleta(mc) {
    const n = normalizarMinionClassico(mc);
    if (!n) return MINION_MODELOS.saibaman.padrao;
    const M = MINION_MODELOS[n.modelo], chave = n.modelo + JSON.stringify(n.cores);
    let p = minionPaletas.get(chave);
    if (p) return p;
    p = Object.assign({}, M.padrao, n.cores);
    Object.keys(M.deriva).forEach(k => {
        const origem = M.deriva[k];
        if (n.cores[origem]) p[k] = minionCorRelativa(M.padrao[k], M.padrao[origem], n.cores[origem]);
    });
    minionPaletas.set(chave, p);
    return p;
}
function minionAssinaturaClassica(mc) { const n = normalizarMinionClassico(mc); return n ? n.modelo + JSON.stringify(n.cores) : ""; }

// Uma pose do minion clássico numa tela (escala SAIBAMAN_SPRITE_SCALE, com margem SAIBAMAN_SPRITE_PAD)
function desenharMinionClassico(mc, pose, frame) {
    const n = normalizarMinionClassico(mc) || { modelo: "saibaman", cores: {} };
    const c = document.createElement("canvas");
    c.width = (32 + SAIBAMAN_SPRITE_PAD * 2) * SAIBAMAN_SPRITE_SCALE;
    c.height = (40 + SAIBAMAN_SPRITE_PAD * 2) * SAIBAMAN_SPRITE_SCALE;
    const g = c.getContext && c.getContext("2d");
    if (g) {
        g.scale(SAIBAMAN_SPRITE_SCALE, SAIBAMAN_SPRITE_SCALE);
        g.translate(SAIBAMAN_SPRITE_PAD, SAIBAMAN_SPRITE_PAD + 1);
        MINION_MODELOS[n.modelo].desenho(g, pose, frame, getMinionPaleta(n));
    }
    return c;
}
// Movimentos do editor feitos com o desenho clássico (as mesmas imagens da luta): parado/voando = voar (4 quadros),
// subir = saltar, carregar = agarrar; o resto usa o voo.
const minionAnimacoesCache = new Map();
function minionClassicoAnimacoes(mc) {
    const chave = minionAssinaturaClassica(mc);
    let r = minionAnimacoesCache.get(chave);
    if (r) return r;
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
    minionAnimacoesCache.set(chave, r);
    return r;
}
// aplica o desenho clássico num personagem (animações e imagem refeitas a partir do modelo e das cores)
function aplicarMinionClassico(c, mc) {
    const n = normalizarMinionClassico(mc);
    if (!c || !n) return c;
    const a = minionClassicoAnimacoes(n);
    c.minionClassico = n;
    c.builderAppearance = null;
    c.animations = JSON.parse(JSON.stringify(a.animations));
    c.fpsSettings = Object.assign({}, a.fpsSettings);
    if (a.defaultUrl) c.defaultUrl = a.defaultUrl;
    return c;
}
