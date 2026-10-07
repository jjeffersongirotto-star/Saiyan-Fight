// ==================== MAPA DE PROGRESSO (cenário) ====================
// Só desenho do fundo do mapa de fases (a lógica de cliques e os círculos das fases ficam em menu.js; a geometria
// do caminho em game-logic-core.js). Cada trecho de 10 fases tem um ambiente de Dragon Ball, desenhado UMA vez
// numa imagem (na resolução real da tela) e só copiado a cada quadro conforme o mapa rola. Variações dentro do
// trecho vêm de um sorteio com semente fixa: o mapa é sempre igual. Carrega depois de menu.js.

const MAPA_TRECHO_W = MAPA_FASES_POR_TRECHO * MAPA_PASSO_X;
// Ambientes na ordem dos trechos (fases 1-10, 11-20...). Trechos além da lista repetem o último.
const MAPA_AMBIENTES = [
    { nome: "terra", desenhar: mapaTerra },
    { nome: "namek", desenhar: mapaNamek },
    { nome: "espaco", desenhar: mapaEspaco },
    { nome: "deserto_cell", desenhar: mapaDesertoCell },
    { nome: "kaioshin", desenhar: mapaKaioshin },
    { nome: "bills", desenhar: mapaBills }
];
const mapaCacheTrechos = new Map();   // "trecho|renderScale" -> canvas

function mapaSorteio(semente) {
    let s = (semente * 9301 + 49297) % 233280 || 1;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function mapaImagemTrecho(t) {
    const chave = t + "|" + renderScale;
    let c = mapaCacheTrechos.get(chave);
    if (c) return c;
    if (typeof document === "undefined" || !document.createElement) return null;
    c = document.createElement("canvas");
    c.width = Math.round(MAPA_TRECHO_W * renderScale);
    c.height = Math.round(350 * renderScale);
    const g = c.getContext && c.getContext("2d");
    if (!g || typeof g.scale !== "function") return null;
    g.scale(renderScale, renderScale);
    const amb = MAPA_AMBIENTES[Math.min(t, MAPA_AMBIENTES.length - 1)];
    amb.desenhar(g, MAPA_TRECHO_W, 350, mapaSorteio(t * 131 + 7), t);
    // 3 imagens de trecho bastam (a tela mostra no máximo 2 ao mesmo tempo)
    if (mapaCacheTrechos.size >= 3) mapaCacheTrechos.delete(mapaCacheTrechos.keys().next().value);
    mapaCacheTrechos.set(chave, c);
    return c;
}

// Fundo do mapa na rolagem atual: os trechos visíveis, lado a lado, com uma emenda suave entre ambientes
function drawMapaFundo(rolagem) {
    const t0 = Math.floor(rolagem / MAPA_TRECHO_W), t1 = Math.floor((rolagem + 800) / MAPA_TRECHO_W);
    for (let t = t0; t <= t1; t++) {
        const img = mapaImagemTrecho(t);
        const x = t * MAPA_TRECHO_W - rolagem;
        if (img) ctx.drawImage(img, x, 0, MAPA_TRECHO_W, 350);
        else { ctx.fillStyle = "#0a1024"; ctx.fillRect(x, 0, MAPA_TRECHO_W, 350); }
        if (t > t0) mapaEmenda(x);
    }
}

// Emenda entre dois ambientes: uma névoa larga em degradê, para a troca de cenário não ser um corte seco
function mapaEmenda(x) {
    const gr = ctx.createLinearGradient(x - 110, 0, x + 110, 0);
    gr.addColorStop(0, "rgba(10, 14, 30, 0)");
    gr.addColorStop(0.5, "rgba(10, 14, 30, 0.62)");
    gr.addColorStop(1, "rgba(10, 14, 30, 0)");
    ctx.fillStyle = gr;
    ctx.fillRect(x - 110, 0, 220, 350);
}

// ---------- peças de cenário ----------
function mapaCeu(g, w, h, cores) {
    const gr = g.createLinearGradient(0, 0, 0, h);
    cores.forEach((c, i) => gr.addColorStop(i / (cores.length - 1), c));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
function mapaEstrelas(g, w, ate, rnd, n) {
    for (let i = 0; i < n; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.6})`; const r = rnd() * 1.1 + 0.3; g.fillRect(rnd() * w, rnd() * ate, r, r); }
}
// serra de montanhas (pontudas ou arredondadas) com um lado iluminado
function mapaMontanhas(g, w, base, alt, cor, luz, rnd, passo, redonda) {
    let x = -20;
    g.fillStyle = cor; g.beginPath(); g.moveTo(x, base + 80);
    const picos = [];
    while (x < w + 40) {
        const pw = passo * (0.6 + rnd() * 0.8), ph = alt * (0.45 + rnd() * 0.55);
        picos.push([x, pw, ph]);
        if (redonda) g.quadraticCurveTo(x + pw / 2, base - ph * 1.6, x + pw, base);
        else { g.lineTo(x + pw * (0.4 + rnd() * 0.2), base - ph); g.lineTo(x + pw, base); }
        x += pw;
    }
    g.lineTo(w + 40, base + 80); g.closePath(); g.fill();
    if (!luz || redonda) return;
    g.fillStyle = luz;
    picos.forEach(([px, pw, ph]) => { g.beginPath(); g.moveTo(px + pw * 0.5, base - ph); g.lineTo(px + pw, base); g.lineTo(px + pw * 0.62, base); g.closePath(); g.fill(); });
}
// mesa de pedra (rochedo de topo plano, típico de Dragon Ball)
function mapaMesa(g, x, base, larg, alt, cor, topo, sombra) {
    g.fillStyle = cor;
    g.beginPath(); g.moveTo(x - larg * 0.5, base); g.lineTo(x - larg * 0.42, base - alt); g.lineTo(x + larg * 0.42, base - alt); g.lineTo(x + larg * 0.5, base); g.closePath(); g.fill();
    g.fillStyle = sombra; g.beginPath(); g.moveTo(x + larg * 0.1, base); g.lineTo(x + larg * 0.18, base - alt); g.lineTo(x + larg * 0.42, base - alt); g.lineTo(x + larg * 0.5, base); g.closePath(); g.fill();
    g.fillStyle = topo; g.beginPath(); g.ellipse(x, base - alt, larg * 0.43, larg * 0.07, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 1;
    for (let k = 1; k < 4; k++) { const yy = base - alt * k / 4; g.beginPath(); g.moveTo(x - larg * (0.5 - 0.02 * k), yy); g.lineTo(x + larg * (0.5 - 0.02 * k), yy); g.stroke(); }
}
function mapaNuvem(g, x, y, s, cor, sombra) {
    g.fillStyle = sombra; [[0, 3, 1.1], [-0.9, 4, 0.75], [0.95, 4, 0.8]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s * 16, y + dy, s * 12 * r, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = cor; [[0, 0, 1.1], [-0.9, 2, 0.75], [0.95, 2, 0.8], [0.4, -3, 0.7]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s * 16, y + dy, s * 12 * r, 0, Math.PI * 2); g.fill(); });
}
function mapaArvoreRedonda(g, x, y, r, tronco, copa, luz) {
    g.fillStyle = tronco; g.fillRect(x - r * 0.12, y - r * 1.2, r * 0.24, r * 1.2);
    g.fillStyle = copa; g.beginPath(); g.arc(x, y - r * 1.5, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = luz; g.beginPath(); g.arc(x - r * 0.3, y - r * 1.75, r * 0.45, 0, Math.PI * 2); g.fill();
}
function mapaChao(g, w, topo, h, cor1, cor2, rnd, pontos) {
    const gr = g.createLinearGradient(0, topo, 0, h);
    gr.addColorStop(0, cor1); gr.addColorStop(1, cor2);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 40) g.lineTo(x, topo + Math.sin(x * 0.011) * 6 + Math.sin(x * 0.037) * 3);
    g.lineTo(w, h); g.closePath(); g.fill();
    if (pontos) for (let i = 0; i < w / 6; i++) { g.fillStyle = pontos[i % pontos.length]; g.fillRect(rnd() * w, topo + 10 + rnd() * (h - topo - 10), 2, 1.5); }
}

// ---------- ambientes ----------
// Fases 1-10: Terra — fim de tarde, mesas de pedra, colinas verdes, casinhas cápsula e o mar
function mapaTerra(g, w, h, rnd) {
    mapaCeu(g, w, h, ["#2b4f9a", "#7fa8e0", "#f5b46a", "#f08a4b"]);
    for (let i = 0; i < 9; i++) mapaNuvem(g, rnd() * w, 30 + rnd() * 60, 0.8 + rnd() * 0.9, "rgba(255,240,225,0.9)", "rgba(230,150,120,0.6)");
    mapaMontanhas(g, w, 170, 70, "#7a6aa8", "#9a8ac4", rnd, 110, false);
    for (let i = 0; i < 8; i++) mapaMesa(g, 60 + i * 165 + rnd() * 60, 205, 50 + rnd() * 40, 60 + rnd() * 50, "#b0714a", "#7fa356", "#8a5436");
    mapaChao(g, w, 200, h, "#6fae4e", "#3f7a36", rnd, ["#8acb5e", "#2f6a2c", "#c9e08a"]);
    // mar com a ilha da casa do Kame num canto
    g.fillStyle = "#2f7fc8"; g.beginPath(); g.ellipse(w * 0.62, h - 8, 170, 40, 0, Math.PI, 0); g.fill();
    g.fillStyle = "rgba(255,255,255,0.35)"; for (let i = 0; i < 18; i++) g.fillRect(w * 0.62 - 150 + rnd() * 300, h - 40 + rnd() * 30, 8, 1.2);
    g.fillStyle = "#e8d39a"; g.beginPath(); g.ellipse(w * 0.62, h - 26, 32, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f08aa8"; g.fillRect(w * 0.62 - 9, h - 44, 18, 14); g.fillStyle = "#d0384e"; g.beginPath(); g.moveTo(w * 0.62 - 12, h - 44); g.lineTo(w * 0.62, h - 54); g.lineTo(w * 0.62 + 12, h - 44); g.fill();
    for (let i = 0; i < 26; i++) mapaArvoreRedonda(g, rnd() * w, 230 + rnd() * 110, 5 + rnd() * 5, "#6a4a2a", "#3f8f3f", "#6cc25a");
    // casinhas cápsula (domos brancos)
    for (let i = 0; i < 4; i++) {
        const x = 120 + i * 320 + rnd() * 80, y = 238 + rnd() * 40;
        g.fillStyle = "#f2f2f6"; g.beginPath(); g.ellipse(x, y, 16, 12, 0, Math.PI, 0); g.fill(); g.fillRect(x - 16, y, 32, 5);
        g.fillStyle = "#4fa6e8"; g.fillRect(x - 6, y - 5, 4, 3); g.fillRect(x + 2, y - 5, 4, 3);
    }
}
// Fases 11-20: Namek — céu verde, água verde-azulada, árvores de copa redonda em espigões
function mapaNamek(g, w, h, rnd) {
    mapaCeu(g, w, h, ["#4f9a6a", "#9ed49a", "#c8ecb0", "#7ec890"]);
    for (let i = 0; i < 3; i++) { g.fillStyle = "rgba(240,255,230,0.7)"; g.beginPath(); g.arc(150 + i * 450 + rnd() * 80, 40 + rnd() * 20, 10 + rnd() * 6, 0, Math.PI * 2); g.fill(); }
    mapaMontanhas(g, w, 185, 60, "#5f8f8a", null, rnd, 140, true);
    g.fillStyle = "#3fa8a0"; g.fillRect(0, 195, w, 30);
    g.fillStyle = "rgba(220,255,240,0.4)"; for (let i = 0; i < 40; i++) g.fillRect(rnd() * w, 198 + rnd() * 24, 10, 1.2);
    for (let i = 0; i < 14; i++) {
        // espigão de pedra com árvores redondas no alto
        const x = rnd() * w, alt = 50 + rnd() * 60, base = 205;
        g.fillStyle = "#8ab09a"; g.beginPath(); g.moveTo(x - 8, base); g.lineTo(x - 4, base - alt); g.lineTo(x + 4, base - alt); g.lineTo(x + 8, base); g.fill();
        mapaArvoreRedonda(g, x, base - alt + 4, 10 + rnd() * 5, "#6a7a5a", "#2f8a4a", "#7ad06a");
    }
    mapaChao(g, w, 222, h, "#5fbf6a", "#2f7a52", rnd, ["#8adf7a", "#2a6a4a"]);
    for (let i = 0; i < 30; i++) mapaArvoreRedonda(g, rnd() * w, 245 + rnd() * 100, 5 + rnd() * 5, "#5a6a4a", "#2f9a4a", "#8ae07a");
    // casas namekuseijins (domos com janelas redondas)
    for (let i = 0; i < 5; i++) {
        const x = 90 + i * 260 + rnd() * 60, y = 262 + rnd() * 50;
        g.fillStyle = "#e8f0e0"; g.beginPath(); g.ellipse(x, y, 13, 15, 0, Math.PI, 0); g.fill(); g.fillRect(x - 13, y, 26, 4);
        g.fillStyle = "#3a5a4a"; g.beginPath(); g.arc(x - 4, y - 6, 2.4, 0, Math.PI * 2); g.arc(x + 5, y - 3, 2.4, 0, Math.PI * 2); g.fill();
    }
}
// Fases 21-30: espaço — estrelas, planetas, destroços e o chão roxo de um planeta conquistado
function mapaEspaco(g, w, h, rnd) {
    mapaCeu(g, w, h, ["#05030f", "#140a2e", "#2a1050", "#3a1a5a"]);
    mapaEstrelas(g, w, 230, rnd, 260);
    [[0.15, 50, 26, "#c87a4a"], [0.55, 70, 40, "#4a7ac8"], [0.85, 40, 16, "#d8c06a"]].forEach(([fx, y, r, cor]) => {
        const x = fx * w + rnd() * 60;
        const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
        gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.25, cor); gr.addColorStop(1, "#100820");
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, r * 1.6, r * 0.35, -0.3, 0, Math.PI * 2); g.stroke();
    });
    // nave (disco) ao longe
    const nx = w * 0.35 + rnd() * 100;
    g.fillStyle = "#c8c0e0"; g.beginPath(); g.ellipse(nx, 120, 46, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#e8e0ff"; g.beginPath(); g.ellipse(nx, 114, 26, 12, 0, Math.PI, 0); g.fill();
    g.fillStyle = "#ff6a8a"; for (let i = -3; i <= 3; i++) g.fillRect(nx + i * 12 - 1.5, 121, 3, 2);
    mapaMontanhas(g, w, 210, 50, "#3a2050", "#5a3a78", rnd, 90, false);
    mapaChao(g, w, 212, h, "#5a3a6a", "#2a1838", rnd, ["#7a5a8a", "#3a2048", "#a07ab0"]);
    for (let i = 0; i < 18; i++) {   // crateras
        const x = rnd() * w, y = 240 + rnd() * 100, r = 6 + rnd() * 12;
        g.fillStyle = "rgba(20,8,30,0.55)"; g.beginPath(); g.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(170,130,200,0.5)"; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y - 1, r, r * 0.35, 0, Math.PI, 0); g.stroke();
    }
}
// Fases 31-40: deserto do Cell — areia clara, agulhas de pedra e o ringue ao longe
function mapaDesertoCell(g, w, h, rnd) {
    mapaCeu(g, w, h, ["#6aa8e0", "#a8d4f0", "#f0e2c0", "#e8d0a0"]);
    for (let i = 0; i < 7; i++) mapaNuvem(g, rnd() * w, 30 + rnd() * 50, 0.7 + rnd() * 0.7, "rgba(255,255,255,0.95)", "rgba(180,200,220,0.6)");
    mapaMontanhas(g, w, 190, 55, "#c0a888", "#d8c4a4", rnd, 120, false);
    for (let i = 0; i < 12; i++) {   // agulhas de pedra
        const x = rnd() * w, alt = 50 + rnd() * 80, larg = 12 + rnd() * 14;
        g.fillStyle = "#b08a64"; g.beginPath(); g.moveTo(x - larg, 210); g.lineTo(x - larg * 0.3, 210 - alt); g.lineTo(x + larg * 0.2, 210 - alt * 0.96); g.lineTo(x + larg, 210); g.fill();
        g.fillStyle = "#8a6848"; g.beginPath(); g.moveTo(x, 210); g.lineTo(x + larg * 0.2, 210 - alt * 0.96); g.lineTo(x + larg, 210); g.fill();
    }
    mapaChao(g, w, 208, h, "#e8d4a4", "#c8a874", rnd, ["#f4e4bc", "#b8946a"]);
    // ringue do Cell ao longe (plataforma branca com pilares)
    const rx = w * 0.5 + rnd() * 100;
    g.fillStyle = "#f0ece4"; g.beginPath(); g.moveTo(rx - 60, 232); g.lineTo(rx + 60, 232); g.lineTo(rx + 70, 240); g.lineTo(rx - 70, 240); g.fill();
    g.fillStyle = "#c8c0b0"; g.fillRect(rx - 70, 240, 140, 6);
    g.fillStyle = "#e0dad0"; [-58, 58].forEach(dx => g.fillRect(rx + dx - 3, 212, 6, 22));
    for (let i = 0; i < 24; i++) { g.fillStyle = "rgba(140,110,80,0.5)"; g.beginPath(); g.ellipse(rnd() * w, 255 + rnd() * 90, 6 + rnd() * 10, 2, 0, 0, Math.PI * 2); g.fill(); }
}
// Fases 41-50: mundo dos Kaioshins — céu rosa-violeta, colinas cristalinas e planetas gigantes
function mapaKaioshin(g, w, h, rnd) {
    mapaCeu(g, w, h, ["#3a1a6a", "#8a4ab0", "#e890c8", "#f0b8d8"]);
    mapaEstrelas(g, w, 120, rnd, 80);
    [[0.25, 70, 46, "#7ac8e8"], [0.75, 55, 30, "#e8a050"]].forEach(([fx, y, r, cor]) => {
        const x = fx * w; const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.3, cor); gr.addColorStop(1, "rgba(60,20,90,0.9)");
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    });
    mapaMontanhas(g, w, 195, 60, "#a070c8", null, rnd, 120, true);
    for (let i = 0; i < 16; i++) {   // cristais
        const x = rnd() * w, alt = 18 + rnd() * 30, larg = 6 + rnd() * 6;
        g.fillStyle = "rgba(180,240,255,0.85)"; g.beginPath(); g.moveTo(x - larg, 214); g.lineTo(x, 214 - alt); g.lineTo(x + larg, 214); g.fill();
        g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.moveTo(x - larg * 0.2, 214); g.lineTo(x, 214 - alt); g.lineTo(x + larg * 0.25, 214); g.fill();
    }
    mapaChao(g, w, 212, h, "#7ad08a", "#3a8a6a", rnd, ["#a0e8a0", "#2a7050"]);
    for (let i = 0; i < 20; i++) mapaArvoreRedonda(g, rnd() * w, 245 + rnd() * 100, 5 + rnd() * 5, "#7a5a8a", "#f0a0c8", "#ffd0e8");
}
// Fases 51-60: planeta de Bills — noite violeta, ilhas de pedra flutuando e pirâmides
function mapaBills(g, w, h, rnd) {
    mapaCeu(g, w, h, ["#0a0620", "#2a0f4a", "#5a1f7a", "#2a0f4a"]);
    mapaEstrelas(g, w, 200, rnd, 200);
    // espiral de estrelas
    const cx = w * 0.5, cy = 70;
    for (let i = 0; i < 160; i++) { const a = i * 0.25, r = i * 0.9; g.fillStyle = `rgba(230,200,255,${0.6 - i / 320})`; g.fillRect(cx + Math.cos(a) * r * 1.8, cy + Math.sin(a) * r * 0.5, 1.5, 1.5); }
    for (let i = 0; i < 6; i++) {   // ilhas flutuantes
        const x = 100 + i * 210 + rnd() * 60, y = 80 + rnd() * 70, s = 16 + rnd() * 14;
        g.fillStyle = "#6a4a3a"; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.lineTo(x + s * 0.2, y + s * 1.3); g.closePath(); g.fill();
        g.fillStyle = "#4a9a5a"; g.beginPath(); g.ellipse(x, y, s, s * 0.25, 0, 0, Math.PI * 2); g.fill();
    }
    mapaMontanhas(g, w, 205, 55, "#3a1a5a", "#5a2a7a", rnd, 110, false);
    for (let i = 0; i < 5; i++) {   // pirâmides
        const x = 140 + i * 260 + rnd() * 50, b = 214, s = 26 + rnd() * 18;
        g.fillStyle = "#c8a060"; g.beginPath(); g.moveTo(x - s, b); g.lineTo(x, b - s * 1.1); g.lineTo(x + s, b); g.fill();
        g.fillStyle = "#9a7440"; g.beginPath(); g.moveTo(x, b - s * 1.1); g.lineTo(x + s, b); g.lineTo(x + s * 0.2, b); g.fill();
    }
    mapaChao(g, w, 212, h, "#5a8a4a", "#2a4a3a", rnd, ["#7aaa5a", "#2a3a2a"]);
    for (let i = 0; i < 22; i++) mapaArvoreRedonda(g, rnd() * w, 245 + rnd() * 100, 5 + rnd() * 5, "#4a3a2a", "#2f6a4a", "#5aa06a");
}

// Estrada ligando as fases (curva suave). acesaAte = índice da última fase liberada (a estrada até ela brilha).
function drawMapaEstrada(pontos, acesaAte) {
    if (pontos.length < 2) return;
    const caminho = (de, ate) => {
        ctx.beginPath();
        ctx.moveTo(pontos[de].x, pontos[de].y);
        for (let i = de + 1; i <= ate; i++) {
            const a = pontos[i - 1], b = pontos[i], mx = (a.x + b.x) / 2;
            ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
        }
    };
    const fim = pontos.length - 1;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    caminho(0, fim); ctx.strokeStyle = "rgba(20, 14, 10, 0.55)"; ctx.lineWidth = 17; ctx.stroke();
    caminho(0, fim); ctx.strokeStyle = "#8a7a64"; ctx.lineWidth = 12; ctx.stroke();
    const acesa = Math.max(0, Math.min(fim, acesaAte));
    if (acesa > 0) { caminho(0, acesa); ctx.strokeStyle = "#e8c070"; ctx.lineWidth = 12; ctx.stroke(); }
    caminho(0, fim); ctx.setLineDash([6, 8]); ctx.strokeStyle = "rgba(255, 245, 210, 0.55)"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
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
