// ==================== CENARIOS3D.JS - FASES EM 3D (KAIOH, TORNEIO, SUPREMO KAIOH, NAMEK) ====================
// Cenários das fases redesenhados no estilo do jogo (nenhuma imagem do anime é usada), em 3D com perspectiva:
//  - Planeta do Sr. Kaioh: o planetinha verde gira e os lutadores voam por cima da estrada dando a volta nele.
//  - Torneio de Artes Marciais e Planeta Supremo Kaioh: câmera gira em volta dos lutadores no meio da arena
//    (mesma câmera do Torneio de Cell, ver caProj/caPoly em menu.js).
//  - Planeta Namek e Namek Prestes a Explodir: câmera andando de lado (na direção dos lutadores); o caminho é gerado aos poucos
//    (árvores, morros, pedras sempre um pouco diferentes, mas no mesmo estilo).
// Só desenha — chamado por drawStageBackground (menu.js) durante o render. Carrega depois de menu.js.

// Número pseudoaleatório fixo para um inteiro (o mesmo trecho do caminho sempre sai igual).
function c3Hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

// Copia uma paisagem de 360° (faixa) deslocada conforme o ângulo da câmera que gira em volta do centro.
function c3BlitPanorama(pano, ang, F, CX) {
    if (!pano) return false;
    const W = pano.width;
    let u0 = (-(ang + Math.PI) * F) % W;
    if (u0 < 0) u0 += W;
    const x0 = CX - u0;
    ctx.drawImage(pano, x0, 0);
    ctx.drawImage(pano, x0 + W, 0);
    if (x0 > 0) ctx.drawImage(pano, x0 - W, 0);
    return true;
}

function c3NovaFaixa(largura, altura) {
    const c = document.createElement("canvas");
    c.width = largura;
    c.height = altura;
    const g = c.getContext && c.getContext("2d");
    return g ? { c, g } : null;
}

// Desenha algo numa faixa de 360° repetindo nas emendas (para não ficar cortado na volta).
function c3NaVolta(W, x, larg, desenha) {
    [-W, 0, W].forEach(dx => { if (x + dx + larg > 0 && x + dx - larg < W) desenha(x + dx); });
}

// ==================== PLANETA DO SR. KAIOH ====================
// O planetinha visto um pouco de cima, bem perto: a estrada branca do equador fica na horizontal, no meio da
// tela, e o planeta gira em volta do eixo de pé — os lutadores voam por cima da estrada dando a volta nele.
const KP = { CX: 400, CY: 268, R: 196, INCL: 0.24, ROLL: -0.32 };   // ROLL: planeta inclinado (rua sobe para a direita)

// ponto na superfície (latitude, longitude) -> tela; d > 0 = lado virado para a câmera
function kpProj(lat, lon, ang, alt = 0) {
    const r = KP.R + alt;
    const cl = Math.cos(lat), x3 = cl * Math.sin(lon + ang), y3 = Math.sin(lat), z3 = cl * Math.cos(lon + ang);
    const ci = Math.cos(KP.INCL), si = Math.sin(KP.INCL);
    const dx = r * x3, dy = -r * (y3 * ci - z3 * si), cr = Math.cos(KP.ROLL), sr = Math.sin(KP.ROLL);
    return { x: KP.CX + dx * cr - dy * sr, y: KP.CY + dx * sr + dy * cr, d: z3 * ci + y3 * si, nx: x3, ny: -(y3 * ci - z3 * si) };
}

// Coisas em cima do planeta: casinhas, árvores, o carro e o poço; e manchas de grama (giram junto e mostram
// o movimento). Latitude/longitude em graus.
const KP_COISAS = (() => {
    const lista = [
        // a casa do Sr. Kaioh (duas cúpulas juntas) logo na beira da pista
        { tipo: "casa", lat: 15, lon: 14, tam: 0.75 }, { tipo: "casa", lat: 14, lon: 6, tam: 1 },
        { tipo: "arvore", lat: 30, lon: -22, tam: 1.15 }, { tipo: "arvore", lat: 46, lon: 52, tam: 0.9 },
        { tipo: "arvore", lat: -28, lon: 75, tam: 1.05 }, { tipo: "arvore", lat: 18, lon: 140, tam: 1 },
        { tipo: "arvore", lat: -24, lon: -120, tam: 1.1 }, { tipo: "arvore", lat: 36, lon: -160, tam: 0.95 },
        { tipo: "arvore", lat: -32, lon: 200, tam: 0.9 }, { tipo: "arvore", lat: 24, lon: 230, tam: 1 },
        { tipo: "carro", lat: 0, lon: 60, tam: 1 }, { tipo: "poco", lat: 24, lon: -4, tam: 1 }
    ];
    return lista.map(o => Object.assign({}, o, { lat: o.lat * Math.PI / 180, lon: o.lon * Math.PI / 180 }));
})();
const KP_MANCHAS = (() => {
    const m = [];
    for (let i = 0; i < 70; i++) {
        let lat = (c3Hash(i) * 2 - 1) * 1.25;
        if (Math.abs(lat) < 0.16) lat += lat < 0 ? -0.2 : 0.2;   // não em cima da estrada
        m.push({ lat, lon: c3Hash(i + 99) * Math.PI * 2, tam: 6 + c3Hash(i + 7) * 16, claro: c3Hash(i + 3) > 0.5 });
    }
    return m;
})();

function kpDrawCoisa(o, p) {
    // de pé na superfície: no meio do planeta ficam retas e, perto da borda, se inclinam para fora
    const ang = Math.asin(Math.max(-1, Math.min(1, p.nx)));
    const k = o.tam;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang + KP.ROLL);
    if (o.tipo === "arvore") {
        ctx.fillStyle = "#7a5530";
        ctx.fillRect(-3 * k, -18 * k, 6 * k, 18 * k);
        ctx.fillStyle = "#2f8a3e";
        [[0, -34, 17], [-13, -24, 12], [13, -24, 12], [-7, -44, 11], [8, -43, 11]].forEach(([x, y, r]) => {
            ctx.beginPath(); ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = "#4fb05a";
        [[-5, -38, 7], [6, -30, 6], [-11, -26, 5]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2); ctx.fill(); });
    } else if (o.tipo === "casa") {
        // casinha redonda laranja (cúpula) com porta
        const g = ctx.createRadialGradient(-6 * k, -18 * k, 2, 0, -10 * k, 22 * k);
        g.addColorStop(0, "#ffd08a"); g.addColorStop(1, "#e8742a");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, 20 * k, 22 * k, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#a9461a"; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.strokeStyle = "rgba(169, 70, 26, 0.6)";
        ctx.beginPath(); ctx.ellipse(0, -2 * k, 17 * k, 13 * k, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ctx.fillStyle = "#5b2a12";
        ctx.beginPath(); ctx.ellipse(4 * k, 0, 5 * k, 9 * k, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.ellipse(-8 * k, -12 * k, 3.5 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.tipo === "carro") {
        ctx.fillStyle = "#e23b3b";
        ctx.beginPath(); ctx.ellipse(0, -6 * k, 13 * k, 7 * k, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillRect(-15 * k, -7 * k, 30 * k, 6 * k);
        ctx.fillStyle = "#bfe6ff";
        ctx.fillRect(-5 * k, -11 * k, 9 * k, 4 * k);
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(-9 * k, -1 * k, 3 * k, 0, Math.PI * 2); ctx.arc(9 * k, -1 * k, 3 * k, 0, Math.PI * 2); ctx.fill();
    } else {
        // poço de pedra
        ctx.fillStyle = "#cfd6dc";
        ctx.fillRect(-9 * k, -8 * k, 18 * k, 8 * k);
        ctx.fillStyle = "#8d9aa6";
        ctx.beginPath(); ctx.ellipse(0, -8 * k, 9 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#4a7fb5";
        ctx.beginPath(); ctx.ellipse(0, -8 * k, 6 * k, 1.8 * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

let kpCeu = null;
function getKaioSky() {
    if (kpCeu) return kpCeu;
    const f = c3NovaFaixa(canvas.width, canvas.height);
    if (!f) return null;
    const { c, g } = f;
    const ceu = g.createLinearGradient(0, 0, 0, c.height);
    ceu.addColorStop(0, "#f2a3cf"); ceu.addColorStop(0.55, "#f7c4de"); ceu.addColorStop(1, "#fbe0ec");
    g.fillStyle = ceu;
    g.fillRect(0, 0, c.width, c.height);
    // nuvens rosadas bem clarinhas
    g.fillStyle = "rgba(255, 240, 248, 0.6)";
    [[90, 50, 50], [640, 70, 64], [330, 30, 38], [730, 180, 40], [40, 200, 34]].forEach(([x, y, r]) => {
        g.beginPath(); g.ellipse(x, y, r * 1.8, r * 0.45, 0, 0, Math.PI * 2); g.fill();
    });
    kpCeu = c;
    return c;
}

function drawKaioPlanetStage(ang) {
    const ceu = getKaioSky();
    if (ceu) ctx.drawImage(ceu, 0, 0);
    else { ctx.fillStyle = "#f7c4de"; ctx.fillRect(0, 0, canvas.width, canvas.height); }

    // mar de nuvens douradas lá embaixo (o Caminho da Serpente), andando devagar
    const t = (typeof gameplayClock === "number" ? gameplayClock : 0);
    ctx.fillStyle = "#f2b640";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width; x += 20) ctx.lineTo(x, 300 + Math.sin(x * 0.03 + t * 0.6) * 6 + Math.sin(x * 0.011) * 10);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 220, 120, 0.85)";
    for (let i = 0; i < 9; i++) {
        const x = ((i * 113 - t * 14) % (canvas.width + 120) + canvas.width + 120) % (canvas.width + 120) - 60;
        ctx.beginPath(); ctx.ellipse(x, 312 + (i % 3) * 12, 46, 9, 0, 0, Math.PI * 2); ctx.fill();
    }

    // coisas atrás do planeta (as que passam da borda aparecem por trás)
    const coisas = KP_COISAS.map(o => ({ o, p: kpProj(o.lat, o.lon, ang) }));
    coisas.filter(c => c.p.d <= 0 && c.p.d > -0.35).forEach(c => kpDrawCoisa(c.o, c.p));

    // o planeta: bola verde com luz vindo do alto à esquerda
    const g = ctx.createRadialGradient(KP.CX - KP.R * 0.35, KP.CY - KP.R * 0.45, KP.R * 0.1, KP.CX, KP.CY, KP.R);
    g.addColorStop(0, "#e6f8a2"); g.addColorStop(0.45, "#9fdc5a"); g.addColorStop(0.85, "#6cbf3c"); g.addColorStop(1, "#4f9c2c");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(KP.CX, KP.CY, KP.R, 0, Math.PI * 2); ctx.fill();

    // manchas de grama (giram com o planeta — é o que mostra os lutadores dando a volta)
    KP_MANCHAS.forEach(m => {
        const p = kpProj(m.lat, m.lon, ang);
        if (p.d < 0.08) return;
        ctx.fillStyle = m.claro ? "rgba(225, 250, 160, 0.45)" : "rgba(60, 140, 40, 0.35)";
        // achatadas perto da borda (vistas de lado)
        const rx = m.tam * Math.max(0.2, Math.sqrt(Math.max(0, 1 - p.nx * p.nx))), ry = m.tam * 0.5 * Math.max(0.2, p.d);
        ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, KP.ROLL, 0, Math.PI * 2); ctx.fill();
    });

    // a estrada branca do equador (cruzando o planeta inclinado)
    const meia = 0.12, passos = 36, borda = [];
    for (let i = 0; i <= passos; i++) { const mu = -Math.PI / 2 + i / passos * Math.PI; borda.push(kpProj(meia, mu - ang, ang)); }
    const bordaB = [];
    for (let i = passos; i >= 0; i--) { const mu = -Math.PI / 2 + i / passos * Math.PI; bordaB.push(kpProj(-meia, mu - ang, ang)); }
    ctx.fillStyle = "#f6f2e2";
    ctx.beginPath();
    borda.concat(bordaB).forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c9c2a6"; ctx.lineWidth = 1.5;
    ctx.beginPath(); borda.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    ctx.beginPath(); bordaB.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    // marquinhas na estrada que passam com o giro
    ctx.strokeStyle = "rgba(170, 160, 130, 0.55)"; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 48; i++) {
        const lon = i / 48 * Math.PI * 2;
        const a = kpProj(meia * 0.55, lon, ang), b = kpProj(-meia * 0.55, lon, ang);
        if (a.d < 0.15) continue;
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    // brilho na borda do planeta
    ctx.strokeStyle = "rgba(240, 255, 200, 0.7)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(KP.CX, KP.CY, KP.R - 1.5, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();

    // coisas na frente
    coisas.filter(c => c.p.d > 0).sort((a, b) => a.p.d - b.p.d).forEach(c => kpDrawCoisa(c.o, c.p));
}

// ==================== TORNEIO DE ARTES MARCIAIS ====================
// Igual ao Torneio de Cell: os lutadores no meio da arena e a câmera girando em volta deles, na altura deles.
// Em volta: o muro com a plateia, os guarda-sóis azuis, o portão com as duas cabeças de demônio e a escadaria
// e, ao fundo, o templo de telhado marrom. Usa a câmera da arena (caProj/caPoly/caLine em menu.js).
const TA_MURO_R = 540, TA_MURO_ALT = 34, TA_PORTAO_Z = -450;

let taPanorama = null;
function getTerraPanorama() {
    if (taPanorama) return taPanorama;
    const W = Math.round(Math.PI * 2 * CA_F), base = CA_HY + 4;
    const f = c3NovaFaixa(W, CA_HY + 8);
    if (!f) return null;
    const { c, g } = f;
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, "#3f8ee0"); ceu.addColorStop(0.7, "#9ad0f5"); ceu.addColorStop(1, "#dff1fb");
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, c.height);
    g.fillStyle = "rgba(255, 255, 255, 0.92)";
    for (let i = 0; i < 12; i++) {
        const x = c3Hash(i + 40) * W, y = 16 + c3Hash(i + 41) * 50, r = 10 + c3Hash(i + 42) * 12;
        c3NaVolta(W, x, r * 4, x0 => {
            [[0, 0, 1], [r * 1.1, -r * 0.4, 1.2], [r * 2.3, 0, 0.9]].forEach(b => { g.beginPath(); g.arc(x0 + b[0], y + b[1], r * b[2], 0, Math.PI * 2); g.fill(); });
        });
    }
    // copas de árvores ao longe, por trás do muro da plateia
    for (let i = 0; i < 70; i++) {
        const x = i / 70 * W + c3Hash(i) * 20, r = 12 + c3Hash(i + 5) * 16;
        g.fillStyle = i % 2 ? "#2f7a3a" : "#3e8f44";
        c3NaVolta(W, x, r, x0 => { g.beginPath(); g.arc(x0, base - 6 - c3Hash(i + 9) * 10, r, 0, Math.PI * 2); g.fill(); });
    }
    // o templo do torneio, atrás do portão (direção do portão = metade da faixa)
    const tx = W / 2, tl = 300, ty = base - 8;
    g.fillStyle = "#f3efe4";
    g.fillRect(tx - tl / 2, ty - 34, tl, 34);
    g.fillStyle = "#c0392b";
    g.fillRect(tx - tl / 2, ty - 34, tl, 4);
    g.fillStyle = "#3b4a8c";
    for (let i = 0; i < 9; i++) g.fillRect(tx - tl / 2 + 14 + i * 32, ty - 24, 18, 8);
    g.fillStyle = "#8a5a2b";   // telhado marrom (de palha)
    g.beginPath();
    g.moveTo(tx - tl / 2 - 20, ty - 32); g.lineTo(tx - tl / 2 + 30, ty - 76); g.lineTo(tx + tl / 2 - 30, ty - 76); g.lineTo(tx + tl / 2 + 20, ty - 32);
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(60, 35, 15, 0.45)"; g.lineWidth = 1;
    for (let i = 0; i < 30; i++) { const x = tx - tl / 2 + 10 + i * 10; g.beginPath(); g.moveTo(x, ty - 74); g.lineTo(x - 6, ty - 34); g.stroke(); }
    g.fillStyle = "#f7f3e8";   // placa do torneio
    g.fillRect(tx - 60, ty - 74, 120, 18);
    g.strokeStyle = "#c0392b"; g.lineWidth = 2; g.strokeRect(tx - 60, ty - 74, 120, 18);
    g.fillStyle = "#c0392b"; g.font = "bold 11px monospace"; g.textAlign = "center";
    g.fillText("TORNEIO", tx, ty - 61);
    taPanorama = c;
    return c;
}

// Fachada do portão (desenhada uma vez): escadaria roxa no meio subindo até a porta, colunas douradas e as
// duas cabeças de demônio com chifres nos painéis vermelhos.
let taPortao = null;
const TA_PORTAO = { larg: 240, alt: 150 };
function getTerraGate() {
    if (taPortao) return taPortao;
    const E = 2, f = c3NovaFaixa(TA_PORTAO.larg * E, TA_PORTAO.alt * E);
    if (!f) return null;
    const { c, g } = f;
    g.scale(E, E);
    const L = TA_PORTAO.larg, A = TA_PORTAO.alt, cx = L / 2;
    // painéis vermelhos dos lados
    [[8, 70], [L - 78, 70]].forEach(([x, w]) => {
        g.fillStyle = "#c0392b"; g.fillRect(x, A - 92, w, 92);
        g.fillStyle = "#e8b04a"; g.fillRect(x, A - 96, w, 6);
        // cabeça de demônio: rosto cinza, chifres, olhos e presas
        const hx = x + w / 2, hy = A - 50;
        g.fillStyle = "#6b6f78";
        g.beginPath(); g.moveTo(hx - 22, hy - 18); g.quadraticCurveTo(hx - 36, hy - 44, hx - 20, hy - 46); g.quadraticCurveTo(hx - 24, hy - 30, hx - 12, hy - 22); g.fill();
        g.beginPath(); g.moveTo(hx + 22, hy - 18); g.quadraticCurveTo(hx + 36, hy - 44, hx + 20, hy - 46); g.quadraticCurveTo(hx + 24, hy - 30, hx + 12, hy - 22); g.fill();
        g.fillStyle = "#9aa0aa";
        g.beginPath(); g.ellipse(hx, hy, 26, 24, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#4b4f57";
        g.beginPath(); g.ellipse(hx - 10, hy - 6, 7, 5, 0.3, 0, Math.PI * 2); g.ellipse(hx + 10, hy - 6, 7, 5, -0.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#f3d250";
        g.beginPath(); g.arc(hx - 10, hy - 6, 2.2, 0, Math.PI * 2); g.arc(hx + 10, hy - 6, 2.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#3a3d44"; g.fillRect(hx - 13, hy + 8, 26, 8);
        g.fillStyle = "#ffffff";
        for (let i = 0; i < 5; i++) g.fillRect(hx - 12 + i * 5.2, hy + 8, 3, 4);
    });
    // colunas douradas ornamentadas
    [[cx - 46, 16], [cx + 30, 16]].forEach(([x, w]) => {
        g.fillStyle = "#e8b04a"; g.fillRect(x, A - 128, w, 128);
        g.fillStyle = "#c0392b"; for (let i = 0; i < 5; i++) g.fillRect(x + 3, A - 120 + i * 24, w - 6, 12);
        g.fillStyle = "#b8862e"; g.fillRect(x - 3, A - 134, w + 6, 8);
    });
    // escadaria roxa até a porta
    g.fillStyle = "#c9b8e8";
    for (let i = 0; i < 7; i++) {
        const w = 60 - i * 3, y = A - 8 - i * 10;
        g.fillRect(cx - w / 2, y, w, 8);
        g.fillStyle = i % 2 ? "#c9b8e8" : "#b7a3dd";
    }
    g.fillStyle = "#f3efe4"; g.fillRect(cx - 22, A - 108, 44, 34);
    g.fillStyle = "#c0392b"; g.beginPath(); g.arc(cx, A - 92, 8, 0, Math.PI * 2); g.fill();
    taPortao = c;
    return c;
}

function taDrawGate(ang) {
    const z = TA_PORTAO_Z, L = TA_PORTAO.larg, A = TA_PORTAO.alt;
    const TL = caProj(-L / 2, A + CA_CHAO, z, ang), TR = caProj(L / 2, A + CA_CHAO, z, ang), BL = caProj(-L / 2, CA_CHAO, z, ang);
    if (CA_D - TL[2] < CA_PERTO * 3 || CA_D - TR[2] < CA_PERTO * 3) return;   // atrás da câmera
    const tex = getTerraGate();
    const ux = TR[0] - TL[0], uy = TR[1] - TL[1], vx = BL[0] - TL[0], vy = BL[1] - TL[1];
    const deFrente = ux * vy - uy * vx > 0;
    ctx.save();
    if (tex && deFrente) {
        ctx.transform(ux / tex.width, uy / tex.width, vx / tex.height, vy / tex.height, TL[0], TL[1]);
        ctx.drawImage(tex, 0, 0);
    } else {
        // visto por trás: parede de pedra
        const BR = caProj(L / 2, CA_CHAO, z, ang);
        ctx.fillStyle = "#b9a98f";
        ctx.beginPath(); ctx.moveTo(TL[0], TL[1] + (BL[1] - TL[1]) * 0.36); ctx.lineTo(TR[0], TR[1] + (BR[1] - TR[1]) * 0.36); ctx.lineTo(BR[0], BR[1]); ctx.lineTo(BL[0], BL[1]); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
}

// Muro com a plateia em volta da arena (em 3D, só a parte na frente da câmera).
const TA_PLATEIA_CORES = ["#e74c3c", "#f1c40f", "#3498db", "#2ecc71", "#ecf0f1", "#9b59b6", "#e67e22", "#34495e", "#f5cba7"];
// Cada pedaço do muro (com as cabeças da plateia em cima) é uma textura pronta, desenhada com uma transformação
// afim: poucas chamadas por quadro em vez de centenas de retângulos.
const TA_PLATEIA_ALT = 26;   // altura das cabeças acima do muro
let taPlateiaTex = null;
function getTerraCrowdTiles() {
    if (taPlateiaTex) return taPlateiaTex;
    const lista = [];
    for (let v = 0; v < 4; v++) {
        const f = c3NovaFaixa(48, TA_MURO_ALT + TA_PLATEIA_ALT);
        if (!f) return null;
        const { c, g } = f;
        for (let fil = 0; fil < 3; fil++) {
            for (let j = 0; j < 4; j++) {
                const x = (j + 0.5 + (fil % 2) * 0.5) / 4.5 * 48, y = TA_PLATEIA_ALT - 6 - fil * 7;
                g.fillStyle = TA_PLATEIA_CORES[(v * 7 + j * 3 + fil * 5) % TA_PLATEIA_CORES.length];
                g.fillRect(x - 3, y, 6, 6);
                g.fillStyle = "#2b1d14";
                g.fillRect(x - 2, y - 4, 4, 4);
            }
        }
        g.fillStyle = v % 2 ? "#c9a07a" : "#bf966f";
        g.fillRect(0, TA_PLATEIA_ALT, 48, TA_MURO_ALT);
        g.fillStyle = "#8d2d22";
        g.fillRect(0, TA_PLATEIA_ALT, 48, 3);
        lista.push(c);
    }
    return (taPlateiaTex = lista);
}
function taDrawCrowdWall(ang) {
    const N = 72, R = TA_MURO_R, lim = CA_D - CA_PERTO * 3;
    const tiles = getTerraCrowdTiles();
    if (!tiles) return;
    const segs = [];
    for (let i = 0; i < N; i++) {
        const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2;
        if (Math.abs(Math.cos(((a0 + a1) / 2) - (ang + Math.PI))) < 0.02) continue;
        const r0 = caRot(Math.sin(a0) * R, Math.cos(a0) * R, ang), r1 = caRot(Math.sin(a1) * R, Math.cos(a1) * R, ang);
        if (r0[1] > lim || r1[1] > lim) continue;
        segs.push({ i, a0, a1, d: (r0[1] + r1[1]) / 2 });
    }
    const topo = CA_CHAO + TA_MURO_ALT + TA_PLATEIA_ALT;
    ctx.save();   // mantém o tremor de tela (translate) que já está aplicado
    const base = ctx.getTransform ? ctx.getTransform() : null;
    segs.sort((a, b) => a.d - b.d).forEach(sg => {
        const TL = caProj(Math.sin(sg.a0) * R, topo, Math.cos(sg.a0) * R, ang), TR = caProj(Math.sin(sg.a1) * R, topo, Math.cos(sg.a1) * R, ang);
        const BL = caProj(Math.sin(sg.a0) * R, CA_CHAO, Math.cos(sg.a0) * R, ang);
        const tex = tiles[sg.i % tiles.length];
        // 2% a mais de largura para não aparecer fresta entre pedaços vizinhos
        const ux = (TR[0] - TL[0]) * 1.02, uy = (TR[1] - TL[1]) * 1.02;
        if (base) ctx.setTransform(base);
        ctx.transform(ux / tex.width, uy / tex.width, (BL[0] - TL[0]) / tex.height, (BL[1] - TL[1]) / tex.height, TL[0], TL[1]);
        ctx.drawImage(tex, 0, 0);
        if (!base) ctx.restore(), ctx.save();
    });
    ctx.restore();
}

// Guarda-sol azul (de pé, igual de todos os lados).
function taDrawParasol(px, py, k) {
    ctx.strokeStyle = "#ecf0f1"; ctx.lineWidth = Math.max(1, 3 * k);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 90 * k); ctx.stroke();
    const g = ctx.createRadialGradient(px - 12 * k, py - 104 * k, 2, px, py - 92 * k, 46 * k);
    g.addColorStop(0, "#7ec8ff"); g.addColorStop(0.6, "#2e86de"); g.addColorStop(1, "#1b5fa8");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(px, py - 88 * k, 44 * k, 26 * k, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(px - 44 * k, py - 90 * k, 88 * k, 4 * k);
}

function drawTerraArenaStage(ang) {
    if (!c3BlitPanorama(getTerraPanorama(), ang, CA_F, CA_CX)) { ctx.fillStyle = "#9ad0f5"; ctx.fillRect(0, 0, canvas.width, CA_HY + 6); }
    const grama = ctx.createLinearGradient(0, CA_HY, 0, canvas.height);
    grama.addColorStop(0, "#7fbf5a"); grama.addColorStop(0.3, "#5fa844"); grama.addColorStop(1, "#3f8a2f");
    ctx.fillStyle = grama;
    ctx.fillRect(0, CA_HY + 4, canvas.width, canvas.height - CA_HY);
    // faixas mais claras do gramado (passam por baixo e mostram o giro)
    ctx.strokeStyle = "rgba(170, 220, 120, 0.35)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let v = -600; v <= 600; v += 60) caLine(v, CA_CHAO, -600, v, CA_CHAO, 600, ang);
    ctx.stroke();

    taDrawCrowdWall(ang);
    taDrawGate(ang);

    // o tablado: lateral azul e o piso de azulejos claros
    const W = CA_W;
    const ladoVisivel = (mx, mz) => caRot(mx, mz, ang)[1] > 0;
    const cantos = [[-W, -W], [W, -W], [W, W], [-W, W]];
    for (let i = 0; i < 4; i++) {
        const A = cantos[i], C = cantos[(i + 1) % 4];
        if (!ladoVisivel((A[0] + C[0]) / 2, (A[1] + C[1]) / 2)) continue;
        ctx.fillStyle = "#2c3e9e";
        if (caPoly([[A[0], 0, A[1]], [C[0], 0, C[1]], [C[0], CA_CHAO, C[1]], [A[0], CA_CHAO, A[1]]], ang)) ctx.fill();
        ctx.fillStyle = "#c0392b";
        if (caPoly([[A[0], 0, A[1]], [C[0], 0, C[1]], [C[0], -4, C[1]], [A[0], -4, A[1]]], ang)) ctx.fill();
    }
    ctx.fillStyle = "#dedbea";
    if (caPoly([[-W, 0, -W], [W, 0, -W], [W, 0, W], [-W, 0, W]], ang)) ctx.fill();
    ctx.strokeStyle = "rgba(150, 140, 180, 0.6)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let v = -W; v <= W; v += 40) { caLine(v, 0, -W, v, 0, W, ang); caLine(-W, 0, v, W, 0, v, ang); }
    ctx.stroke();

    // guarda-sóis azuis em volta, do mais longe para o mais perto
    [[-330, -330], [330, -330], [330, 330], [-330, 330]]
        .map(([x, z]) => caProj(x, CA_CHAO, z, ang))
        .filter(p => CA_D - p[2] > CA_PERTO * 3)
        .sort((a, b) => a[2] - b[2])
        .forEach(p => taDrawParasol(p[0], p[1], p[3]));
}

// ==================== PLANETA SUPREMO KAIOH ====================
// Gramado verde com morros, pedras e penhascos de rocha, céu roxo com várias luas transparentes. Mesma câmera
// da arena (girando em volta dos lutadores, que ficam no meio do gramado), sem tablado.
let ksPanorama = null;
function ksLua(g, x, y, r) {
    const lua = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    lua.addColorStop(0, "rgba(255, 255, 255, 0.95)"); lua.addColorStop(0.5, "rgba(214, 205, 245, 0.75)"); lua.addColorStop(1, "rgba(150, 130, 210, 0.55)");
    g.fillStyle = lua;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255, 255, 255, 0.5)"; g.lineWidth = Math.max(1, r * 0.06);
    g.beginPath(); g.arc(x + r * 0.1, y + r * 0.15, r * 0.55, Math.PI * 0.9, Math.PI * 1.7); g.stroke();   // redemoinho
    g.beginPath(); g.arc(x - r * 0.15, y - r * 0.05, r * 0.3, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
    g.strokeStyle = "rgba(255, 255, 255, 0.7)"; g.lineWidth = 1;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
}
function getKaioshinPanorama() {
    if (ksPanorama) return ksPanorama;
    const W = Math.round(Math.PI * 2 * CA_F), base = CA_HY + 4;
    const f = c3NovaFaixa(W, CA_HY + 8);
    if (!f) return null;
    const { c, g } = f;
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, "#6f55c9"); ceu.addColorStop(0.55, "#a690e0"); ceu.addColorStop(0.9, "#e4c6ec"); ceu.addColorStop(1, "#f6d6e2");
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, c.height);
    // várias luas de tamanhos diferentes espalhadas pelo céu
    for (let i = 0; i < 26; i++) {
        const x = c3Hash(i + 200) * W, r = i % 3 === 0 ? 28 + c3Hash(i + 201) * 22 : 6 + c3Hash(i + 202) * 16, y = 10 + r + c3Hash(i + 203) * (base - 46 - r * 2);
        c3NaVolta(W, x, r, x0 => ksLua(g, x0, Math.max(r + 4, y), r));
    }
    // morros verdes ao longe, com penhascos de rocha clara
    const morro = (u, fases) => fases.reduce((h, f) => h + Math.sin(u / W * Math.PI * 2 * f[0] + f[1]) * f[2], 0);
    g.fillStyle = "#7bc65a";
    g.beginPath(); g.moveTo(0, base);
    for (let u = 0; u <= W; u += 6) g.lineTo(u, base - 10 - Math.max(0, morro(u, [[6, 0.4, 12], [13, 1.3, 7], [27, 2.1, 3]])));
    g.lineTo(W, base); g.closePath(); g.fill();
    [[0.07, 70, 34], [0.24, 50, 26], [0.43, 90, 40], [0.61, 60, 30], [0.83, 80, 36]].forEach(([pos, larg, alt]) => {
        c3NaVolta(W, pos * W, larg, x0 => {
            g.fillStyle = "#62b048";   // topo de grama inclinado
            g.beginPath(); g.moveTo(x0 - larg, base - 6); g.lineTo(x0 - larg * 0.4, base - alt - 8); g.lineTo(x0 + larg * 0.5, base - alt); g.lineTo(x0 + larg, base - 6); g.closePath(); g.fill();
            g.fillStyle = "#d8b48c";   // face de rocha
            g.beginPath(); g.moveTo(x0 + larg * 0.1, base - alt - 3); g.lineTo(x0 + larg * 0.5, base - alt); g.lineTo(x0 + larg * 0.62, base - 4); g.lineTo(x0 + larg * 0.05, base - 4); g.closePath(); g.fill();
            g.strokeStyle = "rgba(140, 100, 70, 0.6)"; g.lineWidth = 1;
            for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x0 + larg * (0.15 + k * 0.1), base - alt + 2); g.lineTo(x0 + larg * (0.12 + k * 0.1), base - 6); g.stroke(); }
            g.fillStyle = "#2f7a3a";
            g.beginPath(); g.arc(x0 - larg * 0.2, base - alt - 4, 3, 0, Math.PI * 2); g.arc(x0 + larg * 0.3, base - alt - 2, 2.5, 0, Math.PI * 2); g.fill();
        });
    });
    ksPanorama = c;
    return c;
}

// Pedras e tufos de grama fixos no chão (passam perto da câmera conforme ela gira).
const KS_CHAO = (() => {
    const itens = [];
    for (let i = 0; i < 60; i++) {
        const a = c3Hash(i + 300) * Math.PI * 2, r = 120 + c3Hash(i + 301) * 1400;
        itens.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, tipo: i % 4 === 0 ? "pedra" : i % 4 === 1 ? "tufo" : i % 4 === 2 ? "morrinho" : "mancha", tam: 14 + c3Hash(i + 302) * 30 });
    }
    return itens;
})();

function drawKaioshinStage(ang) {
    if (!c3BlitPanorama(getKaioshinPanorama(), ang, CA_F, CA_CX)) { ctx.fillStyle = "#a690e0"; ctx.fillRect(0, 0, canvas.width, CA_HY + 6); }
    const grama = ctx.createLinearGradient(0, CA_HY, 0, canvas.height);
    grama.addColorStop(0, "#9fd77a"); grama.addColorStop(0.3, "#6fc04e"); grama.addColorStop(1, "#4fa23a");
    ctx.fillStyle = grama;
    ctx.fillRect(0, CA_HY + 4, canvas.width, canvas.height - CA_HY);
    const lim = CA_D - CA_PERTO * 2;
    KS_CHAO
        .map(it => ({ it, r: caRot(it.x, it.z, ang) }))
        .filter(o => o.r[1] < lim)
        .sort((a, b) => a.r[1] - b.r[1])
        .forEach(({ it }) => {
            const p = caProj(it.x, CA_CHAO, it.z, ang), k = p[3], t = it.tam;
            if (p[1] < CA_HY) return;
            if (it.tipo === "pedra") {
                const g = ctx.createRadialGradient(p[0] - t * 0.3 * k, p[1] - t * 0.6 * k, 1, p[0], p[1] - t * 0.3 * k, t * k);
                g.addColorStop(0, "#e9c7a6"); g.addColorStop(0.6, "#b98b68"); g.addColorStop(1, "#8a5f44");
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.ellipse(p[0], p[1] - t * 0.32 * k, t * k, t * 0.55 * k, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(40, 90, 30, 0.35)";
                ctx.beginPath(); ctx.ellipse(p[0] + t * 0.15 * k, p[1], t * 1.05 * k, t * 0.18 * k, 0, 0, Math.PI * 2); ctx.fill();
            } else if (it.tipo === "tufo") {
                ctx.strokeStyle = "#3f9a3a"; ctx.lineWidth = Math.max(1, 1.6 * k);
                ctx.beginPath();
                for (let j = -2; j <= 2; j++) { ctx.moveTo(p[0] + j * 3 * k, p[1]); ctx.lineTo(p[0] + j * 5.5 * k, p[1] - 11 * k); }
                ctx.stroke();
            } else if (it.tipo === "morrinho") {
                // ondulação do gramado: morrinho baixo, claro em cima e com sombra embaixo
                ctx.fillStyle = "rgba(40, 110, 40, 0.25)";
                ctx.beginPath(); ctx.ellipse(p[0] + t * 0.4 * k, p[1], t * 3 * k, t * 0.5 * k, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(170, 230, 120, 0.6)";
                ctx.beginPath(); ctx.ellipse(p[0], p[1] - t * 0.25 * k, t * 2.6 * k, t * 0.55 * k, 0, Math.PI, 0); ctx.fill();
            } else {
                ctx.fillStyle = "rgba(150, 215, 110, 0.45)";
                ctx.beginPath(); ctx.ellipse(p[0], p[1], t * 2 * k, t * 0.35 * k, 0, 0, Math.PI * 2); ctx.fill();
            }
        });
}

// ==================== NAMEK: CÂMERA ANDANDO PARA A FRENTE ====================
// A câmera avança em linha reta (getForwardTravel). O caminho é dividido em fileiras; cada fileira tem coisas
// sorteadas por c3Hash a partir do número dela — sempre iguais para a mesma fileira, mas diferentes entre si
// (tamanhos, alturas, posições), mantendo o mesmo estilo do ambiente.
const NF = { CX: 400, HY: 150, H: 90, F: 420, PERTO: 26, FILEIRA: 90, LONGE: 2700 };

// mundo -> tela (z = distância à frente da câmera)
function nfProj(x, y, z) {
    const esc = NF.F / Math.max(NF.PERTO, z);
    return [NF.CX + x * esc, NF.HY + (NF.H - y) * esc, esc];
}

// A câmera anda de lado, na direção em que os lutadores estão virados (como nas outras arenas). Cada fileira
// fica numa posição ao longo do caminho (n * FILEIRA); o "x" de cada item vira a distância até a câmera (os
// dois lados do caminho viram faixas de profundidade diferentes). As coisas perto passam rápido e as longe
// devagar. Desenha da mais longe para a mais perto e chama desenhar(item com x = posição na tela, z).
function nfProfundidade(it) {
    return 240 + Math.abs(it.x) * 1.3 + (it.x < 0 ? 45 : 0);
}
function nfPercorrer(andado, gerarFileira, desenhar) {
    const alcance = NF.LONGE + 400;
    const primeira = Math.floor((andado - alcance) / NF.FILEIRA), ultima = Math.ceil((andado + alcance) / NF.FILEIRA);
    const lista = [];
    for (let n = primeira; n <= ultima; n++) {
        gerarFileira(n).forEach(it => {
            const z = nfProfundidade(it), lado = n * NF.FILEIRA + (it.dz || 0) - andado;
            if (Math.abs(lado) * NF.F / z > canvas.width) return;   // fora da tela
            lista.push([z, it, lado]);
        });
    }
    lista.sort((a, b) => b[0] - a[0]);
    lista.forEach(([z, it, lado]) => desenhar(Object.assign({}, it, { x: lado }), z));
}

// Risquinhos no chão em várias distâncias, passando de lado (os de perto mais rápido): mostram o movimento.
function nfFaixasDoChao(andado, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    [190, 240, 310, 420, 600, 900, 1400].forEach((z, fila) => {
        const k = NF.F / z, passo = 70, meia = canvas.width / 2 / k + passo;
        for (let n = Math.floor((andado - meia) / passo); n * passo - andado < meia; n++) {
            const h = c3Hash(n * 7 + fila * 131);
            if (h < 0.45) continue;
            const [x, y] = nfProj(n * passo + h * 40 - andado, 0, z + h * 30);
            const r = (12 + h * 22) * k;
            ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, Math.max(0.6, r * 0.09), 0, 0, Math.PI * 2);
        }
    });
    ctx.fill();
}

// ---------- Planeta Namek ----------
let nmCeu = null;
function getNamekSky() {
    if (nmCeu) return nmCeu;
    const f = c3NovaFaixa(canvas.width, NF.HY + 6);
    if (!f) return null;
    const { c, g } = f;
    const ceu = g.createLinearGradient(0, 0, 0, NF.HY);
    ceu.addColorStop(0, "#3fb34a"); ceu.addColorStop(0.55, "#9ad84f"); ceu.addColorStop(1, "#eef3b0");
    g.fillStyle = ceu;
    g.fillRect(0, 0, c.width, c.height);
    // morros claros lá longe, apagados pela distância
    g.fillStyle = "rgba(170, 205, 220, 0.75)";
    g.beginPath(); g.moveTo(0, NF.HY + 2);
    for (let x = 0; x <= c.width; x += 10) g.lineTo(x, NF.HY - 8 - Math.abs(Math.sin(x * 0.013)) * 16 - Math.abs(Math.sin(x * 0.031 + 1)) * 8);
    g.lineTo(c.width, NF.HY + 2); g.closePath(); g.fill();
    nmCeu = c;
    return c;
}

// O que tem em cada fileira de Namek: árvores altas de copa azul nos lados, morros de pedra rosada com topo
// azul, manchas de grama azul-escura e trechos de areia.
function nmFileira(n) {
    const itens = [], h = (k) => c3Hash(n * 13 + k);
    if (h(1) < 0.3) {
        const lado = h(2) < 0.5 ? -1 : 1;
        itens.push({ tipo: "arvore", x: lado * (150 + h(3) * 520), alto: 150 + h(4) * 150, copa: 34 + h(5) * 26, dz: h(6) * 60 });
    }
    if (h(7) < 0.12) {
        const lado = h(8) < 0.5 ? -1 : 1;
        itens.push({ tipo: "arvore", x: lado * (700 + h(9) * 700), alto: 200 + h(10) * 200, copa: 40 + h(11) * 30, dz: h(12) * 60 });
    }
    if (h(13) < 0.26) {
        const lado = h(14) < 0.5 ? -1 : 1;
        itens.push({ tipo: "morro", x: lado * (380 + h(15) * 900), larg: 220 + h(16) * 300, alto: 120 + h(17) * 180, dz: h(18) * 60, inclina: h(19) });
    }
    if (h(20) < 0.7) itens.push({ tipo: h(21) < 0.3 ? "areia" : "mancha", x: (h(22) * 2 - 1) * 900, larg: 60 + h(23) * 160, dz: h(24) * 80 });
    return itens;
}

function nmDesenhar(it, z) {
    if (z < NF.PERTO) return;
    const [x, y, k] = nfProj(it.x, 0, z);
    if (it.tipo === "mancha" || it.tipo === "areia") {
        ctx.fillStyle = it.tipo === "areia" ? "rgba(240, 220, 170, 0.55)" : "rgba(40, 80, 170, 0.35)";
        ctx.beginPath(); ctx.ellipse(x, y, it.larg * k, it.larg * 0.12 * k + 0.5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (it.tipo === "arvore") {
        const topo = nfProj(it.x, it.alto, z), larg = Math.max(1.5, 8 * k);
        if (x + it.copa * 1.4 * k < -50 || x - it.copa * 1.4 * k > canvas.width + 50) return;
        // tronco alto e fino
        const tronco = ctx.createLinearGradient(x - larg, 0, x + larg, 0);
        tronco.addColorStop(0, "#c98a5e"); tronco.addColorStop(0.5, "#e2a878"); tronco.addColorStop(1, "#9c6440");
        ctx.fillStyle = tronco;
        ctx.fillRect(x - larg / 2, topo[1], larg, y - topo[1]);
        // copa azul redonda e fofa (vários tufos), escura embaixo e clara em cima
        const r = it.copa * k, cy = topo[1] - r * 0.5;
        const tufos = [[0, 0.1, 1], [-0.55, 0.05, 0.6], [0.55, 0.08, 0.6], [-0.3, -0.45, 0.6], [0.3, -0.45, 0.6], [0, -0.7, 0.45], [-0.6, 0.45, 0.45], [0.6, 0.45, 0.45]];
        ctx.fillStyle = "#1a4596";
        tufos.forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(x + dx * r, cy + dy * r + r * 0.12, rr * r * 0.75, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = "#3a76dc";
        tufos.forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(x + dx * r - r * 0.06, cy + dy * r, rr * r * 0.62, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = "#86b5f6";
        [[-0.3, -0.5, 0.28], [0.15, -0.65, 0.2], [-0.62, -0.05, 0.18]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(x + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = "#0f2a62";
        ctx.beginPath(); ctx.arc(x, cy + r * 0.72, r * 0.22, 0, Math.PI * 2); ctx.fill();
    } else if (it.tipo === "morro") {
        const L = it.larg * k, A = it.alto * k;
        if (x + L < -50 || x - L > canvas.width + 50) return;
        // paredão de pedra rosada com faixas, topo coberto de grama azul
        ctx.fillStyle = "#e7b59a";
        ctx.beginPath();
        ctx.moveTo(x - L / 2, y); ctx.lineTo(x - L / 2 + L * 0.08, y - A); ctx.lineTo(x + L / 2 - L * 0.1 * it.inclina, y - A * 0.94); ctx.lineTo(x + L / 2, y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#cf8f78";
        ctx.fillRect(x + L * 0.12, y - A * 0.92, L * 0.3, A * 0.92);
        ctx.strokeStyle = "rgba(160, 95, 80, 0.55)"; ctx.lineWidth = Math.max(1, 1.5 * k);
        ctx.beginPath();
        for (let i = 1; i < 6; i++) { const xx = x - L / 2 + L * i / 6; ctx.moveTo(xx, y - A * 0.9); ctx.lineTo(xx - L * 0.02, y); }
        ctx.stroke();
        ctx.fillStyle = "#4f86d8";
        ctx.beginPath();
        ctx.moveTo(x - L / 2 - L * 0.02, y - A + A * 0.08); ctx.quadraticCurveTo(x, y - A - A * 0.12, x + L / 2 + L * 0.02, y - A * 0.9);
        ctx.lineTo(x + L / 2 - L * 0.06, y - A * 0.78); ctx.quadraticCurveTo(x, y - A * 0.9, x - L / 2 + L * 0.04, y - A * 0.82);
        ctx.closePath(); ctx.fill();
    }
}

function drawNamekStage(andado) {
    const ceu = getNamekSky();
    if (ceu) ctx.drawImage(ceu, 0, 0); else { ctx.fillStyle = "#9ad84f"; ctx.fillRect(0, 0, canvas.width, NF.HY); }
    // nuvens amareladas passando devagar
    const t = typeof gameplayClock === "number" ? gameplayClock : 0;
    ctx.fillStyle = "rgba(250, 245, 170, 0.6)";
    for (let i = 0; i < 5; i++) {
        const x = ((i * 190 - t * 6) % 1000 + 1000) % 1000 - 100, y = 24 + (i % 3) * 22;
        ctx.beginPath(); ctx.ellipse(x, y, 70, 16, 0, 0, Math.PI * 2); ctx.ellipse(x + 40, y - 8, 46, 14, 0, 0, Math.PI * 2); ctx.fill();
    }
    // chão azul de Namek, mais claro lá longe
    const chao = ctx.createLinearGradient(0, NF.HY, 0, canvas.height);
    chao.addColorStop(0, "#b8d3f2"); chao.addColorStop(0.2, "#79a8ea"); chao.addColorStop(1, "#3567c9");
    ctx.fillStyle = chao;
    ctx.fillRect(0, NF.HY + 2, canvas.width, canvas.height - NF.HY);
    nfFaixasDoChao(andado, "rgba(30, 70, 160, 0.16)");
    nfPercorrer(andado, nmFileira, nmDesenhar);
}

// ---------- Namek Prestes a Explodir ----------
// Mesma câmera andando de lado. Céu verde-escuro com raios, colunas de lava com fumaça escura, brasas e
// pedras caindo, ilhas de pedra rachadas na água e arcos de lava entre elas.
let nxCeu = null;
function getNamekExplodingSky() {
    if (nxCeu) return nxCeu;
    const f = c3NovaFaixa(canvas.width, NF.HY + 6);
    if (!f) return null;
    const { c, g } = f;
    const ceu = g.createLinearGradient(0, 0, 0, NF.HY);
    ceu.addColorStop(0, "#14361f"); ceu.addColorStop(0.45, "#2f6b35"); ceu.addColorStop(0.85, "#8fa74c"); ceu.addColorStop(1, "#d6c070");
    g.fillStyle = ceu;
    g.fillRect(0, 0, c.width, c.height);
    // nuvens de tempestade escuras
    g.fillStyle = "rgba(20, 35, 25, 0.55)";
    for (let i = 0; i < 9; i++) {
        const x = c3Hash(i + 500) * c.width, y = 10 + c3Hash(i + 501) * 60, r = 30 + c3Hash(i + 502) * 40;
        g.beginPath(); g.ellipse(x, y, r * 2.2, r * 0.5, 0, 0, Math.PI * 2); g.fill();
    }
    // terra rachada ao longe com brilho de lava
    g.fillStyle = "#5e5a4a";
    g.beginPath(); g.moveTo(0, NF.HY + 2);
    for (let x = 0; x <= c.width; x += 12) g.lineTo(x, NF.HY - 4 - Math.abs(Math.sin(x * 0.02)) * 10);
    g.lineTo(c.width, NF.HY + 2); g.closePath(); g.fill();
    nxCeu = c;
    return c;
}

function nxFileira(n) {
    const itens = [], h = (k) => c3Hash(n * 17 + k + 1000);
    if (h(1) < 0.5) itens.push({ tipo: "ilha", x: (h(2) * 2 - 1) * 900, larg: 60 + h(3) * 130, racha: h(4) < 0.5, dz: h(5) * 70 });
    if (h(6) < 0.13) {
        const lado = h(7) < 0.5 ? -1 : 1;
        itens.push({ tipo: "coluna", x: lado * (260 + h(8) * 700), alto: 300 + h(9) * 260, larg: 26 + h(10) * 22, fase: h(11) * 6, dz: h(12) * 60 });
    }
    if (h(13) < 0.08) itens.push({ tipo: "arco", x: (h(14) * 2 - 1) * 700, abre: 120 + h(15) * 200, alto: 90 + h(16) * 120, dz: h(17) * 60 });
    if (h(18) < 0.5) itens.push({ tipo: "onda", x: (h(19) * 2 - 1) * 900, larg: 80 + h(20) * 200, dz: h(21) * 80 });
    return itens;
}

function nxDesenhar(it, z) {
    if (z < NF.PERTO) return;
    const [x, y, k] = nfProj(it.x, 0, z);
    const t = typeof gameplayClock === "number" ? gameplayClock : 0;
    if (it.tipo === "onda") {
        ctx.fillStyle = "rgba(150, 220, 220, 0.25)";
        ctx.beginPath(); ctx.ellipse(x, y, it.larg * k, it.larg * 0.06 * k + 0.5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (it.tipo === "ilha") {
        const L = it.larg * k, A = 18 * k, topo = L * 0.18;
        if (x + L < -40 || x - L > canvas.width + 40) return;
        // lado escuro e tampo azulado da pedra
        ctx.fillStyle = "#3a2c44";
        ctx.beginPath(); ctx.ellipse(x, y, L, topo, 0, 0, Math.PI); ctx.lineTo(x - L, y - A); ctx.ellipse(x, y - A, L, topo, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#5b86a8";
        ctx.beginPath(); ctx.ellipse(x, y - A, L, topo, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.beginPath(); ctx.ellipse(x - L * 0.25, y - A - topo * 0.2, L * 0.45, topo * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        if (it.racha) {
            ctx.strokeStyle = "#ff8a1e"; ctx.lineWidth = Math.max(1, 2 * k);
            ctx.beginPath(); ctx.moveTo(x - L * 0.6, y - A); ctx.lineTo(x - L * 0.1, y - A + topo * 0.3); ctx.lineTo(x + L * 0.2, y - A - topo * 0.2); ctx.lineTo(x + L * 0.6, y - A + topo * 0.1); ctx.stroke();
        }
    } else if (it.tipo === "coluna") {
        const topo = nfProj(it.x, it.alto, z), L = it.larg * k;
        if (x + L * 6 < -40 || x - L * 6 > canvas.width + 40) return;
        const brilho = 0.75 + Math.sin(t * 3 + it.fase) * 0.25;
        // fumaça escura subindo em volta e por cima
        ctx.fillStyle = "rgba(40, 26, 24, 0.85)";
        for (let i = 0; i < 7; i++) {
            const fy = topo[1] + (y - topo[1]) * (i / 9), fx = x + Math.sin(i * 1.7 + it.fase + t * 0.5) * L * 1.2;
            ctx.beginPath(); ctx.arc(fx, fy, L * (1.6 + (6 - i) * 0.35), 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "rgba(70, 50, 55, 0.7)";
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + (i - 2) * L * 1.4, topo[1] - L * (1 + (i % 2)), L * 1.8, 0, Math.PI * 2); ctx.fill(); }
        // a lava subindo
        const lava = ctx.createLinearGradient(x - L, 0, x + L, 0);
        lava.addColorStop(0, "#b3160d"); lava.addColorStop(0.5, `rgba(255, ${Math.round(150 * brilho)}, 40, 1)`); lava.addColorStop(1, "#b3160d");
        ctx.fillStyle = lava;
        ctx.fillRect(x - L / 2, topo[1], L, y - topo[1]);
        // faixas claras subindo pela coluna (a lava jorrando para cima)
        const altura = y - topo[1];
        ctx.fillStyle = "#ffd36b";
        for (let i = 0; i < 5; i++) {
            const f = ((i / 5 - t * 0.9 + it.fase) % 1 + 1) % 1;   // 1 = embaixo, 0 = no topo
            ctx.fillRect(x - L * 0.12 + Math.sin(i * 2 + t * 3) * L * 0.18, topo[1] + altura * f, L * 0.2, altura * 0.1);
        }
        // respingos saindo do topo e caindo pelos lados
        ctx.fillStyle = "#ff9a2e";
        for (let i = 0; i < 6; i++) {
            const u = ((t * 0.8 + i / 6 + it.fase) % 1 + 1) % 1, lado = i % 2 ? 1 : -1;
            const gx = x + lado * L * (0.3 + u * 2.2), gy = topo[1] - L * 2.2 * u * (1 - u) * 4 + altura * u * u * 0.25;
            ctx.beginPath(); ctx.arc(gx, gy, Math.max(1, L * 0.16 * (1 - u * 0.5)), 0, Math.PI * 2); ctx.fill();
        }
        // base espalhando no chão
        ctx.fillStyle = "#d4260f";
        ctx.beginPath(); ctx.ellipse(x, y, L * 2.2, L * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    } else if (it.tipo === "arco") {
        const a = nfProj(it.x - it.abre / 2, 0, z), b = nfProj(it.x + it.abre / 2, 0, z), cima = nfProj(it.x, it.alto * 1.8, z);
        if (Math.max(a[0], b[0]) < -40 || Math.min(a[0], b[0]) > canvas.width + 40) return;
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(255, 90, 20, 0.55)"; ctx.lineWidth = Math.max(2, 9 * k);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(cima[0], cima[1], b[0], b[1]); ctx.stroke();
        ctx.strokeStyle = "#ffd36b"; ctx.lineWidth = Math.max(1, 3 * k); ctx.stroke();
        // gotas de lava correndo ao longo do arco (de uma ponta à outra)
        ctx.fillStyle = "#fff1b0";
        for (let i = 0; i < 4; i++) {
            const u = ((t * 0.45 + i / 4 + (it.dz || 0) * 0.01) % 1 + 1) % 1, v = 1 - u;
            const px = v * v * a[0] + 2 * u * v * cima[0] + u * u * b[0], py = v * v * a[1] + 2 * u * v * cima[1] + u * u * b[1];
            ctx.beginPath(); ctx.arc(px, py, Math.max(1.2, 5 * k), 0, Math.PI * 2); ctx.fill();
        }
    }
}

function drawNamekExplodingStage(andado) {
    const ceu = getNamekExplodingSky();
    if (ceu) ctx.drawImage(ceu, 0, 0); else { ctx.fillStyle = "#2f6b35"; ctx.fillRect(0, 0, canvas.width, NF.HY); }
    const t = typeof gameplayClock === "number" ? gameplayClock : 0;
    // raio de vez em quando (com clarão rápido)
    const ciclo = t % 3.2;
    if (ciclo < 0.18) {
        const semente = Math.floor(t / 3.2);
        ctx.strokeStyle = "rgba(255, 255, 230, 0.95)"; ctx.lineWidth = 2;
        ctx.beginPath();
        let rx = 120 + c3Hash(semente) * 560, ry = 0;
        ctx.moveTo(rx, ry);
        for (let i = 0; i < 7; i++) { rx += (c3Hash(semente * 7 + i) - 0.5) * 50; ry += NF.HY / 7; ctx.lineTo(rx, ry); }
        ctx.stroke();
        ctx.fillStyle = `rgba(230, 255, 210, ${0.18 * (1 - ciclo / 0.18)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // água escura, mais clara lá longe
    const agua = ctx.createLinearGradient(0, NF.HY, 0, canvas.height);
    agua.addColorStop(0, "#7fb3a8"); agua.addColorStop(0.2, "#3f8590"); agua.addColorStop(1, "#14424f");
    ctx.fillStyle = agua;
    ctx.fillRect(0, NF.HY + 2, canvas.width, canvas.height - NF.HY);
    nfFaixasDoChao(andado, "rgba(10, 40, 50, 0.2)");
    nfPercorrer(andado, nxFileira, nxDesenhar);
    // brasas e pedrinhas caindo do céu (na frente de tudo do cenário)
    for (let i = 0; i < 26; i++) {
        const vel = 40 + c3Hash(i + 700) * 70, x = (c3Hash(i + 701) * canvas.width + Math.sin(t + i) * 10) % canvas.width;
        const y = ((c3Hash(i + 702) * canvas.height + t * vel) % (canvas.height + 30)) - 15;
        if (i % 5 === 0) { ctx.fillStyle = "#2b2324"; ctx.beginPath(); ctx.ellipse(x, y, 3, 4, 0, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.fillStyle = i % 2 ? "#ffb43b" : "#ff7a1e"; ctx.fillRect(x, y, 2, 5); }
    }
}
