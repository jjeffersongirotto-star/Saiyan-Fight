// ============================================================================
// sprites.js — gerador PROCEDURAL de sprites dos personagens (Dragon Ball).
// Estilo: 2D "cel-shading" com volume que parece 3D (degradês, luz vindo de cima/esquerda, sombras de contato,
// brilho de contorno e reflexos). Cada personagem é um "boneco" de partes (corpo, membros, cabeça, cabelo, roupa,
// cauda, capa, acessórios...) desenhado em SVG; as animações são poses (ângulos dos braços/pernas, inclinação,
// balanço do cabelo/capa/cauda) interpoladas quadro a quadro. Nada é imagem fixa: mudar a aparência muda tudo.
//
// Sem dependência de DOM: só devolve texto SVG / data URL. Carrega no navegador (<script>) e no Node (testes).
// ============================================================================

const SPRITE_VIEW = { w: 96, h: 112 };            // mesma proporção da caixa do personagem no jogo (48x56)
const SPRITE_RASTER_SCALE = 1.5;                   // pixels reais por unidade do viewBox (nitidez)
const SPRITE_OUTLINE = "#15110f";
const SPRITE_LIGHT = { x: -0.62, y: -0.78 };       // direção da luz (cima/esquerda)
SPRITE_TURN = 3.4;                                 // viés de "virado para a direita" (ombro/quadril/olhar) — postura de luta, não de frente pra câmera

const SPRITE_STATES = ["idle", "flyRight", "flyLeft", "flyUp", "flyDown", "flyUpRight", "flyUpLeft", "flyDownRight", "flyDownLeft", "parry", "attackKi", "chargeKi", "transform"];
const SPRITE_FRAME_COUNTS = {
    idle: 4, flyRight: 4, flyLeft: 4, flyUp: 4, flyDown: 4, flyUpRight: 4, flyUpLeft: 4, flyDownRight: 4, flyDownLeft: 4,
    parry: 4, attackKi: 5, chargeKi: 4, transform: 5
};

// Funções de cor vêm do game-logic-core.js (navegador: globais; Node: require).
const _spriteCore = (typeof module !== "undefined" && module.exports && typeof require === "function") ? require("./game-logic-core.js") : null;
const _sHexToRgb = _spriteCore ? _spriteCore.colorHexToRgb : colorHexToRgb;
const _sRgbToHex = _spriteCore ? _spriteCore.rgbToHex : rgbToHex;

function spriteMix(a, b, t) {
    const ca = _sHexToRgb(a) || [128, 128, 128], cb = _sHexToRgb(b) || [128, 128, 128];
    return _sRgbToHex(ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t);
}
// amt > 0 clareia, amt < 0 escurece
function spriteShade(hex, amt) {
    return amt >= 0 ? spriteMix(hex, "#ffffff", Math.min(1, amt)) : spriteMix(hex, "#000000", Math.min(1, -amt));
}
const _n2 = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------------------
// Contexto de desenho: guarda os <defs> (degradês) do SVG e gera ids únicos.
// ---------------------------------------------------------------------------
function spriteCtx() {
    const R = { defs: [], n: 0 };
    R.id = () => `g${++R.n}`;
    // degradê linear; (x1,y1)-(x2,y2) em coordenadas do viewBox (userSpaceOnUse)
    // Sombras recortadas (R.cel): cada cor do degradê vira uma faixa chapada, como pintura de desenho animado.
    R.steps = (stops) => {
        if (!R.cel || stops.length < 2) return stops;
        const out = [];
        stops.forEach(([o, c, al], i) => {
            const start = i === 0 ? 0 : (stops[i - 1][0] + o) / 2, end = i === stops.length - 1 ? 1 : (o + stops[i + 1][0]) / 2;
            out.push([_n2(start), c, al], [_n2(end), c, al]);
        });
        return out;
    };
    R.lin = (x1, y1, x2, y2, stops) => {
        stops = R.steps(stops);
        const id = R.id();
        R.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${_n2(x1)}" y1="${_n2(y1)}" x2="${_n2(x2)}" y2="${_n2(y2)}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`).join("")}</linearGradient>`);
        return `url(#${id})`;
    };
    R.rad = (cx, cy, r, stops, fx, fy) => {
        stops = R.steps(stops);
        const id = R.id();
        R.defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${_n2(cx)}" cy="${_n2(cy)}" r="${_n2(r)}"${fx !== undefined ? ` fx="${_n2(fx)}" fy="${_n2(fy)}"` : ""}>${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`).join("")}</radialGradient>`);
        return `url(#${id})`;
    };
    R.blur = (std) => {
        const id = R.id();
        R.defs.push(`<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${std}"/></filter>`);
        return `url(#${id})`;
    };
    return R;
}

// ---------------------------------------------------------------------------
// Aparência: valores padrão + normalização (aceita aparências antigas do jogo)
// ---------------------------------------------------------------------------
const SPRITE_RACE_SKIN = {
    "Saiyajin": "#f3c29a", "Humano": "#f3c29a", "Namekuseijin": "#62c24a", "Raça Freeza": "#f1eef6",
    "Majin": "#ff9fc9", "Android": "#f6d3b0", "Kaioshin": "#c9a6e8", "Alienígena": "#8d76e0", "ET/Alienígena genérico": "#8d76e0"
};

const SPRITE_DEFAULT_APPEARANCE = {
    race: "Saiyajin", build: "normal", proporcao: "classico", skinColor: "",
    hairStyle: "goku", hairColor: "#16110f",
    eyeType: "normal", irisColor: "#1a1210", scleraColor: "#ffffff",
    earType: "normal", mouthType: "smile", accessory: "none", hat: "none",
    innerShirt: "regata", outerShirt: "kimono", pants: "larga", shoes: "botas_artes", gloves: "pulseiras",
    primaryColor: "#f26a0f", secondaryColor: "#1f4fbf", accentColor: "#ffd23f",
    cape: "none", capeColor: "#ffffff", tail: "none", wings: "none", backWeapon: "none",
    symbol: "none", scar: "none", kiColor: "#5be3ff"
};

// Valores do jogo antigo (32x32) que mudaram de nome/uso.
const SPRITE_LEGACY_MAP = {
    outerShirt: { kimono: "kimono" }, tail: { saiyan_belt: "cinto_saiyajin" }, shoes: { botas_artes: "botas_artes" }
};

function normalizeAppearance(app) {
    const a = Object.assign({}, SPRITE_DEFAULT_APPEARANCE, app || {});
    for (const key of Object.keys(SPRITE_LEGACY_MAP)) {
        if (SPRITE_LEGACY_MAP[key][a[key]]) a[key] = SPRITE_LEGACY_MAP[key][a[key]];
    }
    if (a.race === "ET/Alienígena genérico") a.race = "Alienígena";
    if (a.innerShirt === "regata" && a.outerShirt === "none") a.innerShirt = "regata";
    return a;
}

function spriteSkin(a) {
    return a.skinColor && /^#[0-9a-f]{6}$/i.test(a.skinColor) ? a.skinColor : (SPRITE_RACE_SKIN[a.race] || SPRITE_RACE_SKIN.Saiyajin);
}

// Proporções por tipo de corpo. Tudo em unidades do viewBox (96x112), centrado em x=48, pés em y≈106.
// As diferenças são exageradas de propósito (não proporcionais à anatomia real): no tamanho renderizado do
// jogo (48x56 px) uma diferença sutil de 20-30% em espessura de membro é quase invisível, então "magro" e
// "musculoso" precisam ficar claramente diferentes já na prévia do construtor (~100x100 px).
function spriteBuild(a) {
    // headScale/headY/shoulderY/hipY/torsoTop/torsoBottom: onde ficam cabeça, ombros, quadril e o tronco (proporções);
    // hairScale: tamanho do cabelo em relação à cabeça; cel: sombras recortadas (estilo desenho animado).
    const base = { sw: 30, ww: 20, hw: 22, arm: 8.2, leg: 10.8, headRx: 12.2, headRy: 13.6, scale: 1, l1: 14.5, l2: 13.5, t1: 15.5, t2: 15, bulk: 0,
        headScale: 1, headY: 27, shoulderY: 48.2, hipY: 75, torsoTop: 45, torsoBottom: 77, hairScale: 1, cel: false };
    let B;
    switch (a.build) {
        case "magro": B = Object.assign(base, { sw: 22, ww: 13.5, hw: 16, arm: 5.4, leg: 8, headRx: 12.6, headRy: 14, bulk: -1 }); break;
        case "musculoso": B = Object.assign(base, { sw: 40, ww: 27, hw: 27, arm: 13.2, leg: 15, headRx: 11.6, headRy: 12.8, bulk: 1 }); break;
        case "gigante": B = Object.assign(base, { sw: 48, ww: 32, hw: 33, arm: 16, leg: 16.5, headRx: 12.2, headRy: 12.2, scale: 1.05, bulk: 1 }); break;
        case "jovem": B = Object.assign(base, { sw: 20, ww: 13, hw: 15, arm: 5, leg: 7.4, headRx: 14.4, headRy: 15, scale: 0.78, bulk: -1 }); break;
        default: B = base;
    }
    if (a.proporcao === "anime") Object.assign(B, SPRITE_ANIME_BODY.comum, SPRITE_ANIME_BODY[a.build] || SPRITE_ANIME_BODY.normal);
    return B;
}

// Proporções "anime" (como os sprites de luta de Dragon Ball): cabeça menor, pernas longas, ombros largos e
// cintura fina (~5 cabeças de altura, contra ~3,4 do boneco clássico), sombras recortadas.
const SPRITE_ANIME_BODY = {
    comum: { headRx: 12.2, headRy: 13.6, headScale: 1, headY: 21.4, torsoTop: 36.5, torsoBottom: 62, shoulderY: 39.2, hipY: 60.4,
        l1: 15.5, l2: 14.5, t1: 22, t2: 22, hairScale: 1, cel: true, bulk: 0, scale: 0.94, pixel: true, bigEyes: true },
    normal: { sw: 29, ww: 16, hw: 18, arm: 7.4, leg: 8.2 },
    musculoso: { sw: 34, ww: 17.5, hw: 20, arm: 8.8, leg: 9.2 },
    magro: { sw: 24, ww: 14, hw: 16, arm: 5.4, leg: 7 },
    gigante: { sw: 40, ww: 24, hw: 25, arm: 10, leg: 11, scale: 1.05 },
    jovem: { sw: 21, ww: 13, hw: 15, arm: 5, leg: 6.6, headScale: 0.86, scale: 0.8 }
};

// ---------------------------------------------------------------------------
// Peças básicas
// ---------------------------------------------------------------------------
// Membro cilíndrico com "volume": contorno escuro + cor base + faixa de luz + faixa de sombra.
function spriteLimb(x1, y1, x2, y2, w, color, opts) {
    const o = opts || {};
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    if (nx * SPRITE_LIGHT.x + ny * SPRITE_LIGHT.y < 0) { nx = -nx; ny = -ny; }   // normal apontando para a luz
    const P = `x1="${_n2(x1)}" y1="${_n2(y1)}" x2="${_n2(x2)}" y2="${_n2(y2)}"`;
    const off = (k, ww) => `x1="${_n2(x1 + nx * k)}" y1="${_n2(y1 + ny * k)}" x2="${_n2(x2 + nx * k)}" y2="${_n2(y2 + ny * k)}"`;
    const cap = o.cap || "round";
    return `<line ${P} stroke="${SPRITE_OUTLINE}" stroke-width="${_n2(w + 2.2)}" stroke-linecap="${cap}"/>` +
        `<line ${P} stroke="${color}" stroke-width="${_n2(w)}" stroke-linecap="${cap}"/>` +
        `<line ${off(-w * 0.27)} stroke="${spriteShade(color, -0.34)}" stroke-width="${_n2(w * 0.3)}" stroke-linecap="${cap}" opacity="0.55"/>` +
        `<line ${off(w * 0.2)} stroke="${spriteShade(color, 0.42)}" stroke-width="${_n2(w * 0.26)}" stroke-linecap="${cap}" opacity="0.6"/>`;
}

// Membro "anatômico" (estilo anime): mais grosso numa ponta que na outra (ombro→cotovelo, coxa→joelho), com
// contorno, cor chapada, faixa de sombra do lado oposto à luz e um filete de luz — como sprites de luta desenhados.
function spriteMuscle(x1, y1, x2, y2, w1, w2, color, opts) {
    const o = opts || {};
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    if (nx * SPRITE_LIGHT.x + ny * SPRITE_LIGHT.y < 0) { nx = -nx; ny = -ny; }   // n aponta para a luz
    const bulge = o.bulge === undefined ? 0.12 : o.bulge;                        // barriga do músculo (curva)
    const sweep = (dx * ny - dy * nx) > 0 ? 0 : 1;                               // pontas arredondadas sempre para fora
    const shape = (k1, k2, off) => {
        const a1 = [x1 + nx * (w1 / 2 * k1 + off), y1 + ny * (w1 / 2 * k1 + off)], b1 = [x1 - nx * (w1 / 2 * k1 - off), y1 - ny * (w1 / 2 * k1 - off)];
        const a2 = [x2 + nx * (w2 / 2 * k2 + off), y2 + ny * (w2 / 2 * k2 + off)], b2 = [x2 - nx * (w2 / 2 * k2 - off), y2 - ny * (w2 / 2 * k2 - off)];
        const mA = [(a1[0] + a2[0]) / 2 + nx * w1 * bulge * k1, (a1[1] + a2[1]) / 2 + ny * w1 * bulge * k1];
        const mB = [(b1[0] + b2[0]) / 2 - nx * w1 * bulge * k1, (b1[1] + b2[1]) / 2 - ny * w1 * bulge * k1];
        const r1 = w1 / 2 * k1, r2 = w2 / 2 * k2;
        return `M${_n2(a1[0])} ${_n2(a1[1])} Q${_n2(mA[0])} ${_n2(mA[1])} ${_n2(a2[0])} ${_n2(a2[1])} A${_n2(r2)} ${_n2(r2)} 0 0 ${sweep} ${_n2(b2[0])} ${_n2(b2[1])} Q${_n2(mB[0])} ${_n2(mB[1])} ${_n2(b1[0])} ${_n2(b1[1])} A${_n2(r1)} ${_n2(r1)} 0 0 ${sweep} ${_n2(a1[0])} ${_n2(a1[1])} Z`;
    };
    const dark = spriteShade(color, -0.36), light = spriteShade(color, 0.38);
    const base = `<path d="${shape(1, 1, 0)}" fill="${color}" stroke="${SPRITE_OUTLINE}" stroke-width="1.3" stroke-linejoin="round"/>`;
    const fill = `<path d="${shape(1, 1, 0)}" fill="${color}"/>`;
    const shade = `<path d="${shape(0.42, 0.42, -Math.min(w1, w2) * 0.3)}" fill="${dark}"/>` +
        `<path d="${shape(0.16, 0.16, Math.min(w1, w2) * 0.24)}" fill="${light}" opacity="0.85"/>`;
    if (o.parts) return { base, fill, shade };
    return base + shade;
}

// Junta duas partes de um membro (coxa+canela, braço+antebraço) como UMA peça: primeiro os contornos das duas,
// depois as cores por cima — assim o contorno preto fica só na volta de fora, sem risco no joelho/cotovelo.
function spriteJoined(a, b) {
    return a.base + b.base + a.fill + b.fill + a.shade + b.shade;
}

// Faixa fina (punho, barra da calça, borda da bota): segmento curto com ponta reta, perpendicular ao membro.
function spriteBand(px, py, toX, toY, w, color, thick) {
    const dx = toX - px, dy = toY - py, len = Math.hypot(dx, dy) || 1, t = thick || 1.7;
    return spriteLimb(px, py, px + dx / len * t, py + dy / len * t, w, color, { cap: "butt" });
}

// Ponto final de um segmento: ângulo em graus medido a partir de "reto para baixo", positivo = para a direita da imagem.
function spriteSeg(x, y, deg, len) {
    const r = deg * Math.PI / 180;
    return [x + Math.sin(r) * len, y + Math.cos(r) * len];
}

function spriteEllipse(cx, cy, rx, ry, fill, extra) {
    return `<ellipse cx="${_n2(cx)}" cy="${_n2(cy)}" rx="${_n2(rx)}" ry="${_n2(ry)}" fill="${fill}" stroke="${SPRITE_OUTLINE}" stroke-width="1.1"${extra ? " " + extra : ""}/>`;
}

function spritePath(d, fill, extra, stroke) {
    const st = stroke === undefined ? SPRITE_OUTLINE : stroke;
    return `<path d="${d}" fill="${fill}"${st ? ` stroke="${st}" stroke-width="1.1" stroke-linejoin="round"` : ""}${extra ? " " + extra : ""}/>`;
}

// Espinho de cabelo (polígono curvo): base (bx,by) com largura bw, ponta (tx,ty), curva lateral "curv".
function spriteSpike(bx, by, tx, ty, bw, curv) {
    const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const b1 = [bx + nx * bw / 2, by + ny * bw / 2], b2 = [bx - nx * bw / 2, by - ny * bw / 2];
    const mx = (bx + tx) / 2, my = (by + ty) / 2, c = curv || 0;
    return `M${_n2(b1[0])} ${_n2(b1[1])} Q${_n2(mx + nx * (bw * 0.35 + c))} ${_n2(my + ny * (bw * 0.35 + c))} ${_n2(tx)} ${_n2(ty)} Q${_n2(mx - nx * (bw * 0.35 - c))} ${_n2(my - ny * (bw * 0.35 - c))} ${_n2(b2[0])} ${_n2(b2[1])} Z`;
}

// ---------------------------------------------------------------------------
// CABELO (coordenadas locais da cabeça: origem no centro, y negativo = para cima)
// ---------------------------------------------------------------------------
// Devolve { back, front }: "back" desenha atrás da cabeça/pescoço, "front" por cima. `sway` (-1..1) balança as pontas
// para os lados, `lift` (-1..1) levanta/abaixa (ex.: voando para baixo o cabelo sobe).
function spriteHair(R, style, color, sway, lift, ssj, anime) {
    const hs = ssj ? 1.16 : 1;                       // Super Saiyajin: cabelo mais alto
    const dark = spriteShade(color, -0.42), mid = spriteShade(color, -0.12), light = spriteShade(color, 0.42);
    const fill = R.lin(-6, -34, 8, 6, [[0, light], [0.38, color], [1, dark]]);
    const sp = (bx, by, tx, ty, bw, curv) => {
        const h = Math.max(0, -ty);
        return spriteSpike(bx, by, tx * hs + sway * h * 0.24, ty * hs - lift * h * 0.14, bw, curv);
    };
    const piece = (d) => spritePath(d, fill);
    const shine = (d) => spritePath(d, light, `opacity="0.55"`, "");
    const cap = (d) => piece(d || "M-12.9 -1 C-14.4 -15 -6.4 -17.4 0 -17.4 C6.4 -17.4 14.4 -15 12.9 -1 L10.6 -5.2 Q6 -9.6 0 -8.2 Q-6 -9.6 -10.6 -5.2 Z");
    const capShine = spritePath("M-8 -14 Q-2 -17 4 -15.4 Q-2 -14.2 -7 -10 Z", light, `opacity="0.5"`, "");
    const spikes = (list) => list.map(([bx, by, tx, ty, bw, c]) => piece(sp(bx, by, tx, ty, bw, c))).join("");
    const shines = (list) => list.map(([bx, by, tx, ty, bw, c]) => shine(sp(bx - 1.2, by - 1, tx - 1.8, ty + 2, bw * 0.34, c))).join("");
    let back = "", front = "";

    switch (style) {
        case "goku": {
            if (anime) {
                // Silhueta do cabelo do Goku (Z) como no anime: espeto alto no topo inclinado para a esquerda,
                // espetos grandes e curvos para a esquerda (3) e para a direita (3), franja em mechas na testa.
                // Pontos em coordenadas da cabeça; as pontas balançam com o movimento (sway/lift).
                const tip = (x, y) => { const h = Math.max(0, -y - 4); return [x * hs + sway * h * 0.22, y * hs - lift * h * 0.12]; };
                const P = (pt) => `${_n2(pt[0])} ${_n2(pt[1])}`;
                // preto chapado com sombra embaixo (sem o degradê claro no alto, que no pixel art vira mancha cinza)
                const animeFill = R.lin(0, -40, 0, 8, [[0, spriteShade(color, ssj ? 0.18 : 0.05)], [0.7, color], [1, dark]]);
                const piece = (dd) => spritePath(dd, animeFill);
                // contorno: [ponta, vale seguinte]; cada lado do espeto é uma curva levemente convexa
                const outline = [
                    [-12, 4],
                    { t: [-24.4, 5.9], v: [-15.1, -0.2] },     // espeto de baixo, esquerda
                    { t: [-35.9, -4.6], v: [-17.1, -10] },     // espeto do meio, esquerda
                    { t: [-37.3, -27.5], v: [-11, -22.2] },    // espeto grande de cima, esquerda
                    { t: [-7, -43], v: [5, -19], k: 0.07 },    // espeto alto do topo (lado esquerdo quase reto)
                    { t: [31, -15.3], v: [17.1, -10] },        // espeto de cima, direita
                    { t: [35.9, -9.5], v: [15.1, -3.9] },      // espeto do meio, direita
                    { t: [19.5, 7.6], v: [12.2, 4.7] }         // espeto de baixo, direita
                ];
                // Medidas tiradas do desenho do anime (em "larguras de rosto"): espetos largos na base, com o lado
                // de cima abaulado e o de baixo côncavo, como labaredas.
                let d = `M${P(outline[0])}`, prev = outline[0];
                for (let i = 1; i < outline.length; i++) {
                    const { t, v } = outline[i], T = tip(t[0], t[1]), k = outline[i].k === undefined ? 0.2 : outline[i].k;
                    const c1 = [(prev[0] + T[0]) / 2 + (T[1] - prev[1]) * k, (prev[1] + T[1]) / 2 - (T[0] - prev[0]) * k];
                    const c2 = [(T[0] + v[0]) / 2 + (v[1] - T[1]) * 0.08, (T[1] + v[1]) / 2 - (v[0] - T[0]) * 0.08];
                    d += ` Q${P(c1)} ${P(T)} Q${P(c2)} ${P(v)}`;
                    prev = v;
                }
                d += " Z";
                back = piece(d);
                // faixas de brilho (cinza no cabelo preto) ao longo de cada espeto grande
                const glowColor = spriteShade(color, ssj ? 0.45 : 0.2);   // cinza escuro no cabelo preto (como no anime)
                const glow = (b, t, w) => spritePath(spriteSpike(b[0], b[1], tip(t[0], t[1])[0], tip(t[0], t[1])[1], w, 0), glowColor, `opacity="0.9"`, "");
                back += glow([-13, -23], [-33, -26.5], 2.4) + glow([-4, -23], [-7.4, -40], 2.6) + glow([-16, -8], [-32, -5], 3) +
                    glow([14, -12], [28, -15], 3) + glow([14, -7], [32, -9.5], 2.6);
                // franja: mechas pontudas caindo na testa (sem cobrir os olhos)
                front = cap() + capShine +
                    piece(spriteSpike(-9, -9, -11, -1, 7.4, 1)) +
                    piece(spriteSpike(-3, -12, -2.6, -1.4, 8, 0.4)) +
                    piece(spriteSpike(3.5, -12, 6.4, -2.6, 7, -0.6)) +
                    piece(spriteSpike(9.5, -9, 12.8, -0.4, 5, -0.4));
                break;
            }
            const big = [[-11, -9, -22, -19, 9, -1], [-6, -13, -13, -32, 9.5, -1], [1, -14, 5, -35, 10, 0], [7, -13, 16, -30, 9, 1], [11, -8, 22, -16, 8, 1], [-12.4, -3, -19.5, 3, 6, 0], [12.4, -3, 19.5, 3, 6, 0]];
            back = spikes(big) + shines(big.slice(0, 5));
            front = cap() + capShine + spikes([[-6, -10, -7.8, -0.4, 5.8, 0.4], [-0.5, -11, 2.2, -1.6, 5.8, -0.4], [6, -10, 9, -1.2, 5.2, 0]]);
            break;
        }
        case "vegeta": {
            const flame = [[-10, -8, -13.5, -27, 8.5, 0.5], [-5, -12, -6.5, -37, 9, 0.6], [1, -13, 1.5, -40, 9.5, 0], [7, -12, 8.5, -36, 9, -0.6], [11, -8, 14.5, -28, 8.5, -0.5]];
            back = spikes(flame) + shines(flame.slice(1, 4));
            front = cap("M-13 -2 C-14.4 -15 -6.4 -17.4 0 -17.4 C6.4 -17.4 14.4 -15 13 -2 L11.2 -6.2 L6.4 -10.2 L0 -4.6 L-6.4 -10.2 L-11.2 -6.2 Z") + capShine;
            break;
        }
        case "trunks_futuro": case "android17": {
            back = piece("M-13.6 -4 C-16 8 -15.5 16 -11 20 L11 20 C15.5 16 16 8 13.6 -4 Z");
            front = cap() + capShine +
                piece("M-13.4 -3 C-13.2 -15 -2.5 -15.4 1 -13 Q-5.6 -7.5 -8.4 2.4 Q-12.2 3 -13.4 -3 Z") +
                piece("M13.4 -3 C13.2 -15 4.5 -15 1 -13 Q7 -7 9 2.4 Q12.4 3 13.4 -3 Z") +
                piece("M-12.6 0 L-14.8 15 Q-11.6 15.4 -9.6 10 L-9 0 Z") + piece("M12.6 0 L14.8 15 Q11.6 15.4 9.6 10 L9 0 Z");
            break;
        }
        case "trunks_kid": {
            const s = [[-9, -11, -15, -21, 7, 0], [-3, -14, -4, -27, 7.5, 0], [4, -14, 8, -27, 7.5, 0], [10, -10, 16, -19, 7, 0]];
            back = spikes(s);
            front = cap() + capShine + spikes([[-5, -10, -6.5, -2, 5.5, 0], [2, -11, 4, -1.6, 5.5, 0]]);
            break;
        }
        case "gohan": {
            const s = [[-9, -11, -16.5, -24, 8.5, -0.5], [-3, -14, -3.5, -31, 8.5, 0], [4, -14, 9, -30, 8.5, 0.6], [10, -10, 18, -21, 7.5, 0.8]];
            back = spikes(s) + shines(s.slice(0, 3));
            front = cap() + capShine + spikes([[-2, -11, -5, 3, 6.4, 0], [5.6, -11, 9.6, 2, 6.2, 0], [-8, -10, -11.4, -0.6, 5, 0]]);
            break;
        }
        case "bardock": {
            const s = [[-11, -8, -24, -14, 9, -1], [-9, -12, -20, -30, 9.5, -1], [-4, -14, -8, -39, 10, 0], [2, -15, 3, -42, 10, 0], [8, -14, 15.5, -37, 9.5, 0.6], [12, -10, 24, -27, 9, 1], [13, -4, 25, -8, 8, 1]];
            back = spikes(s) + shines(s.slice(1, 5));
            front = cap() + capShine + spikes([[-6, -10, -8.4, -0.6, 5.6, 0], [0.5, -11, 2.8, -1.2, 5.4, 0]]);
            break;
        }
        case "raditz": case "broly": {
            const long = style === "raditz";
            const bottom = long ? 76 : 40;
            back = piece(`M-12 -8 C-25 4 -31 ${bottom * 0.5} -27 ${bottom} L-18 ${bottom + 8} L-11 ${bottom * 0.6} L0 ${bottom + 6} L11 ${bottom * 0.6} L18 ${bottom + 8} L27 ${bottom} C31 ${bottom * 0.5} 25 4 12 -8 Z`) +
                spikes([[-9, -12, -14, -31, 9.5, -1], [-2, -14, -3, -36, 10, 0], [6, -13, 12, -33, 9.5, 1]]);
            front = cap() + capShine + spikes([[-6, -10, -8, -0.4, 5.8, 0.4], [0, -11, 2.4, -1.4, 5.6, 0], [6, -10, 9.4, -1, 5.2, 0]]);
            break;
        }
        case "gotenks": {
            const s = [[-8, -11, -14.5, -33, 12, -1], [0, -14, 0.5, -39, 12.5, 0], [8, -11, 15, -33, 12, 1]];
            back = spikes(s) + shines(s);
            front = cap() + capShine + spikes([[-4, -10, -6, -1, 5.6, 0], [3, -10, 6.4, -1.4, 5.6, 0]]);
            break;
        }
        case "android18": {
            back = piece("M-13.6 -3 C-15.6 6 -14.6 13 -10.8 15 L10.8 15 C14.6 13 15.6 6 13.6 -3 Z");
            front = cap() + capShine + piece("M-13.4 -3 C-13 -14 8 -16 13.4 -3 Q9 -9 0 -8.6 Q-8 -9 -13.4 -3 Z") +
                piece("M-13 -1 Q-15 8 -11.6 13 Q-10 8 -9.6 -1 Z") + piece("M13 -1 Q15 8 11.6 13 Q10 8 9.6 -1 Z");
            break;
        }
        case "kaioshin_moicano": {
            back = piece(`M-4.6 -13 C-6 -22 -3.6 -27 ${_n2(0.2 + sway * 3)} -28.6 C3.6 -27 6 -22 4.6 -13 Z`);
            front = piece("M-9 -8 C-9.4 -13 -6.4 -14.6 -4.4 -13 L-4.6 -8 Z") + piece("M9 -8 C9.4 -13 6.4 -14.6 4.4 -13 L4.6 -8 Z");
            break;
        }
        default: break;   // careca
    }
    return { back, front };
}

const SPRITE_SAIYAN_HAIR = ["goku", "vegeta", "gohan", "bardock", "raditz", "broly", "gotenks", "trunks_futuro", "trunks_kid"];

// ---------------------------------------------------------------------------
// ROSTO (olhos, sobrancelhas, nariz, boca)
// ---------------------------------------------------------------------------
function spriteEyes(R, a, pose, skin, browColor, big) {
    const type = pose.eyes && pose.eyes !== "open" ? pose.eyes : a.eyeType;
    const T = {
        normal: { rx: 3.3, ry: 2.8, lid: 0.12, brow: -3, browY: -4.6, iris: 1 },
        serio: { rx: 3.6, ry: 2.35, lid: 0.34, brow: -13, browY: -3.8, iris: 1 },
        bravo: { rx: 3.5, ry: 2.5, lid: 0.3, brow: -20, browY: -3.6, iris: 0.92 },
        angry: { rx: 3.5, ry: 2.5, lid: 0.3, brow: -20, browY: -3.6, iris: 0.92 },
        gentil: { rx: 3.3, ry: 3.1, lid: 0.05, brow: 4, browY: -5.4, iris: 1.05 },
        wide: { rx: 3.6, ry: 3.5, lid: 0, brow: 6, browY: -6, iris: 0.8 },
        freeza: { rx: 3.8, ry: 2.3, lid: 0.4, brow: -6, browY: -3.4, iris: 1, noBrow: true },
        android: { rx: 3.3, ry: 2.6, lid: 0.18, brow: -5, browY: -4.2, iris: 1 },
        fechado: { closed: true, brow: -3, browY: -4.4 }
    };
    let t = T[type] || T.normal;
    if (pose.eyes === "closed") t = T.fechado;
    // pixel art: olhos maiores para continuarem legíveis no tamanho do jogo (branco do olho + pupila)
    if (big && !t.closed) t = Object.assign({}, t, { rx: t.rx * 1.22, ry: t.ry * 1.3, browY: t.browY - 0.8 });
    const look = (pose.lookX || 0), lookY = (pose.lookY || 0);
    let out = "";
    for (const side of [-1, 1]) {
        const ex = side * 5.4 + look * 0.9, ey = 1.3 + lookY * 0.5;
        if (t.closed) {
            out += `<path d="M${_n2(ex - 3.4)} ${_n2(ey + 0.6)} Q${_n2(ex)} ${_n2(ey + 2.8)} ${_n2(ex + 3.4)} ${_n2(ey + 0.6)}" fill="none" stroke="${SPRITE_OUTLINE}" stroke-width="1.3" stroke-linecap="round"/>`;
        } else {
            const ix = ex + look * 1.4, iy = ey + lookY * 0.8;
            const irisR = Math.min(t.rx, t.ry) * 0.86 * t.iris;
            const iris = R.rad(ix, iy, irisR * 1.15, [[0, spriteShade(a.irisColor, 0.32)], [0.6, a.irisColor], [1, spriteShade(a.irisColor, -0.5)]]);
            out += `<ellipse cx="${_n2(ex)}" cy="${_n2(ey)}" rx="${t.rx}" ry="${t.ry}" fill="${a.scleraColor}" stroke="${SPRITE_OUTLINE}" stroke-width="0.9"/>`;
            out += `<clipPath id="ec${side > 0 ? "r" : "l"}${R.n}"><ellipse cx="${_n2(ex)}" cy="${_n2(ey)}" rx="${t.rx}" ry="${t.ry}"/></clipPath>`;
            out += `<g clip-path="url(#ec${side > 0 ? "r" : "l"}${R.n})"><circle cx="${_n2(ix)}" cy="${_n2(iy)}" r="${_n2(irisR)}" fill="${iris}"/><circle cx="${_n2(ix)}" cy="${_n2(iy)}" r="${_n2(irisR * 0.46)}" fill="#0a0808"/><circle cx="${_n2(ix - irisR * 0.34)}" cy="${_n2(iy - irisR * 0.4)}" r="${_n2(irisR * 0.24)}" fill="#ffffff"/>` +
                `<rect x="${_n2(ex - t.rx - 1)}" y="${_n2(ey - t.ry - 1)}" width="${_n2(t.rx * 2 + 2)}" height="${_n2(t.ry * 2 * t.lid + 1)}" fill="${spriteShade(skin, -0.28)}"/></g>`;
            out += `<path d="M${_n2(ex - t.rx)} ${_n2(ey - 0.2)} Q${_n2(ex)} ${_n2(ey - t.ry * 1.55)} ${_n2(ex + t.rx)} ${_n2(ey - 0.2)}" fill="none" stroke="${SPRITE_OUTLINE}" stroke-width="1.25" stroke-linecap="round"/>`;
        }
        if (!t.noBrow) {
            const ang = t.brow * side;                    // sobrancelha inclina para dentro quando brava
            const bx = ex, by = ey + t.browY;
            const r = ang * Math.PI / 180, hx = Math.cos(r) * 3.6, hy = Math.sin(r) * 3.6;
            out += `<path d="M${_n2(bx - hx)} ${_n2(by + hy)} Q${_n2(bx)} ${_n2(by - 0.9)} ${_n2(bx + hx)} ${_n2(by - hy)}" fill="none" stroke="${browColor}" stroke-width="1.7" stroke-linecap="round"/>`;
        }
    }
    return out;
}

// Olhos/boca de anime em pixel art (rosto virado para a direita): olho da frente maior, pupila olhando para o
// adversário, traço grosso de cílio em cima e sobrancelha inclinada para o centro (cara de luta).
function spriteAnimeFace(a, pose, skin, browColor) {
    const type = pose.eyes && pose.eyes !== "open" ? pose.eyes : a.eyeType;
    const closed = pose.eyes === "closed" || type === "fechado";
    const angry = ["angry", "bravo", "serio", "freeza"].includes(type);
    const wide = type === "wide";
    const ly = (pose.lookY || 0) * 0.6;
    let s = "";
    const eye = (x, y, k, inner) => {
        // inner = -1: canto de dentro do olho fica à esquerda (olho da frente); +1: à direita (olho de trás)
        const w = 4.2 * k, up = angry ? 1.6 : 1.1;
        if (closed) {
            s += `<path d="M${_n2(x - w)} ${_n2(y + 0.4)} Q${_n2(x)} ${_n2(y + 2.4)} ${_n2(x + w)} ${_n2(y + 0.2)}" fill="none" stroke="${SPRITE_OUTLINE}" stroke-width="1.8" stroke-linecap="round"/>`;
        } else {
            const top = wide ? -3.4 : -2.4;
            s += `<path d="M${_n2(x - w)} ${_n2(y - 1 + (inner < 0 ? up * 0.6 : 0))} L${_n2(x + w)} ${_n2(y + top + (inner > 0 ? up * 0.6 : 0))} L${_n2(x + w * 0.85)} ${_n2(y + 2.6)} L${_n2(x - w * 0.8)} ${_n2(y + 2.8)} Z" fill="${a.scleraColor || "#ffffff"}"/>`;
            const px = x + w * 0.28 + (pose.lookX || 0) * 0.5;
            s += `<rect x="${_n2(px - 1.3 * k)}" y="${_n2(y - 1.2 + ly)}" width="${_n2(2.6 * k)}" height="${_n2(wide ? 2.6 : 3.6)}" fill="${spriteShade(a.irisColor, -0.3)}"/>`;
            s += `<path d="M${_n2(x - w - 0.6)} ${_n2(y - 1.2 + (inner < 0 ? up * 0.6 : 0))} L${_n2(x + w + 0.6)} ${_n2(y + top - 0.3 + (inner > 0 ? up * 0.6 : 0))}" stroke="${SPRITE_OUTLINE}" stroke-width="2" stroke-linecap="round"/>`;
        }
        // sobrancelha: ponta de dentro mais baixa (determinado/bravo)
        const by = y - (wide ? 6.4 : 5.4), tilt = angry ? 2.6 : 1.4;
        const x1 = x - w - 0.4, x2 = x + w + 0.2;
        const y1 = by + (inner < 0 ? tilt : -tilt * 0.4), y2 = by + (inner < 0 ? -tilt * 0.4 : tilt);
        s += `<path d="M${_n2(x1)} ${_n2(y1)} L${_n2(x2)} ${_n2(y2)}" stroke="${browColor}" stroke-width="2.2" stroke-linecap="round"/>`;
    };
    eye(4.4, 1.2, 1, -1);      // olho da frente (lado do adversário)
    eye(-5, 1.4, 0.78, 1);     // olho de trás, menor (perspectiva)
    // nariz e boca
    s += `<path d="M8.6 4.4 L9.6 6.4 L7.8 6.8" fill="none" stroke="${spriteShade(skin, -0.45)}" stroke-width="1.1" stroke-linejoin="round"/>`;
    const mouth = pose.mouth && pose.mouth !== "auto" ? pose.mouth : a.mouthType;
    if (mouth === "shout" || mouth === "grito") s += `<path d="M1.6 8.4 L7.2 8 L6.2 11.6 L2.6 11.8 Z" fill="#4a0d0d" stroke="${SPRITE_OUTLINE}" stroke-width="1"/>`;
    else if (mouth === "smile") s += `<path d="M0.6 9 Q3 10.2 5.4 8.6" fill="none" stroke="${spriteShade(skin, -0.5)}" stroke-width="1.1" stroke-linecap="round"/>`;
    else s += `<path d="M1 9.4 L5 9.1" stroke="${spriteShade(skin, -0.5)}" stroke-width="1.1" stroke-linecap="round"/>`;
    return s;
}

function spriteMouth(a, pose, skin) {
    const type = pose.mouth && pose.mouth !== "auto" ? pose.mouth : a.mouthType;
    const lx = (pose.lookX || 0) * 0.8;
    const lip = a.race === "Raça Freeza" ? "#5b2a86" : "#7a3428";
    switch (type) {
        case "grito": case "shout":
            return `<path d="M${_n2(-4.4 + lx)} 8.2 Q${_n2(lx)} 15.4 ${_n2(4.4 + lx)} 8.2 Z" fill="#4a0d0d" stroke="${SPRITE_OUTLINE}" stroke-width="1"/><path d="M${_n2(-3.6 + lx)} 8.6 L${_n2(3.6 + lx)} 8.6 L${_n2(3 + lx)} 10 L${_n2(-3 + lx)} 10 Z" fill="#fff"/><ellipse cx="${_n2(lx)}" cy="12.6" rx="2.2" ry="1.2" fill="#d9666a"/>`;
        case "serio": case "set":
            return `<path d="M${_n2(-3.2 + lx)} 9.8 Q${_n2(lx)} 10.5 ${_n2(3.2 + lx)} 9.8" fill="none" stroke="${lip}" stroke-width="1.15" stroke-linecap="round"/>`;
        case "maligno": case "grin":
            return `<path d="M${_n2(-3.8 + lx)} 9.9 Q${_n2(lx)} 11.6 ${_n2(4.2 + lx)} 8.4" fill="none" stroke="${lip}" stroke-width="1.2" stroke-linecap="round"/><path d="M${_n2(2.4 + lx)} 10.6 L${_n2(3.1 + lx)} 12 L${_n2(3.6 + lx)} 10.2 Z" fill="#fff" stroke="${SPRITE_OUTLINE}" stroke-width="0.4"/>`;
        default:
            return `<path d="M${_n2(-3.6 + lx)} 9 Q${_n2(lx)} 12.4 ${_n2(3.6 + lx)} 9" fill="none" stroke="${lip}" stroke-width="1.15" stroke-linecap="round"/>`;
    }
}

// Cabeça inteira (pescoço, orelhas, rosto, cabelo, acessórios) desenhada em coordenadas locais e depois posicionada.
function spriteHead(R, a, B, pose, ctx) {
    const skin = ctx.skin, ssj = !!ctx.ssj;
    const hairStyle = a.hairStyle;
    const hairColor = ssj && SPRITE_SAIYAN_HAIR.includes(hairStyle) ? "#ffe34d" : a.hairColor;
    const hair = spriteHair(R, hairStyle, hairColor, pose.hairSway || 0, pose.hairLift || 0, ssj && SPRITE_SAIYAN_HAIR.includes(hairStyle), B.cel);
    const rx = B.headRx, ry = B.headRy;
    const faceFill = R.rad(-4.2, -5.2, 22, [[0, spriteShade(skin, 0.28)], [0.5, skin], [1, spriteShade(skin, -0.38)]]);
    const isFreeza = a.race === "Raça Freeza", isNamek = a.race === "Namekuseijin", isMajin = a.race === "Majin";
    const browColor = hairStyle === "careca" || hairColor === a.hairColor && !hair.front ? spriteShade(skin, -0.5) : spriteShade(hairColor, -0.35);

    let s = "";
    if (B.bigEyes && !isFreeza && !isNamek && a.race !== "Kaioshin" && a.earType !== "pontuda") {
        // Rosto de anime pensado para pixel art: virado 3/4 para o adversário (direita), queixo marcado,
        // olhos grandes com branco + pupila, sobrancelha grossa — legível mesmo com poucos pixels.
        s += `<path d="M-6.4 ${_n2(ry - 6)} L-6.4 ${_n2(ry + 2.6)} L6 ${_n2(ry + 2.6)} L5.6 ${_n2(ry - 6)} Z" fill="${spriteShade(skin, -0.3)}" stroke="${SPRITE_OUTLINE}" stroke-width="1"/>`;
        if (a.earType !== "nenhuma") s += spriteEllipse(-rx + 0.6, 1.4, 2.6, 3.6, spriteShade(skin, -0.12));
        const face = R.lin(-10, -8, 10, 12, [[0, spriteShade(skin, 0.22)], [0.55, skin], [1, spriteShade(skin, -0.3)]]);
        s += spritePath(`M${_n2(-rx + 0.6)} -1 C${_n2(-rx)} -15 ${_n2(rx)} -15 ${_n2(rx + 0.2)} -1 L${_n2(rx - 0.6)} 4.6 L7.6 10.8 L2.6 ${_n2(ry - 0.6)} L-3.6 11.6 L${_n2(-rx + 1.6)} 5.4 Z`, face);
        s += spriteAnimeFace(a, pose, skin, browColor);
        if (a.scar === "bochecha") s += `<path d="M7 4.6 L10.4 6.6" stroke="#8a2a20" stroke-width="1.1" stroke-linecap="round"/>`;
        const hairWrapA = (svg) => B.hairScale !== 1 && svg ? `<g transform="scale(${_n2(B.hairScale)})">${svg}</g>` : svg;
        s += hairWrapA(hair.front);
        s += spriteHeadAccessory(R, a, ctx, skin, pose, rx, ry);
        return { back: hairWrapA(hair.back), front: s };
    }
    // pescoço
    s += `<path d="M-5.2 ${ry - 5} L-5 ${ry + 5} L5 ${ry + 5} L5.2 ${ry - 5} Z" fill="${spriteShade(skin, -0.24)}" stroke="${SPRITE_OUTLINE}" stroke-width="1"/>`;
    // orelhas
    const ear = (side) => {
        const x = side * (rx - 0.2);
        if (a.earType === "pontuda" || isNamek || a.race === "Kaioshin") {
            return spritePath(`M${_n2(x - side * 1.2)} -1 L${_n2(x + side * 10)} -7.4 L${_n2(x + side * 2.6)} 5.2 Z`, spriteShade(skin, -0.08));
        }
        if (isFreeza || a.earType === "nenhuma" || a.earType === "freeza_placa") return "";
        return spriteEllipse(x + side * 0.4, 1.6, 2.4, 3.4, spriteShade(skin, -0.1));
    };
    s += ear(-1) + ear(1);
    // rosto
    s += `<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="${faceFill}" stroke="${SPRITE_OUTLINE}" stroke-width="1.2"/>`;
    // queixo/bochecha: sombra inferior e luz de contorno no lado direito
    s += `<path d="M${-rx + 1.5} 5 Q0 ${ry + 2.6} ${rx - 1.5} 5 Q0 ${ry - 3} ${-rx + 1.5} 5 Z" fill="${spriteShade(skin, -0.5)}" opacity="0.28"/>`;
    s += `<path d="M${rx - 1.2} -5 Q${rx + 0.4} 3 ${rx - 3.6} 9" fill="none" stroke="${spriteShade(skin, 0.5)}" stroke-width="1.1" stroke-linecap="round" opacity="0.45"/>`;
    // Raça: detalhes de cabeça
    if (isFreeza) {
        const dome = R.lin(-10, -16, 8, 2, [[0, "#c9a6f0"], [0.45, "#7f4fc0"], [1, "#3f1f70"]]);
        s += spritePath(`M${-rx + 0.6} -2.6 C${-rx - 0.6} -16.6 ${rx + 0.6} -16.6 ${rx - 0.6} -2.6 Q0 -8.4 ${-rx + 0.6} -2.6 Z`, dome);
        s += spritePath("M-6 -12 Q-1 -15.4 4 -14.4 Q-1 -12 -5 -8.4 Z", "#f3e3ff", `opacity="0.55"`, "");
        s += spritePath("M-9.6 -10 L-13.6 -19.6 L-6.2 -13.6 Z", "#f7f2fb") + spritePath("M9.6 -10 L13.6 -19.6 L6.2 -13.6 Z", "#f7f2fb");
    }
    if (isNamek) {
        s += `<path d="M-4 -9.6 Q0 -11.2 4 -9.6 M-3 -7.4 Q0 -8.8 3 -7.4" fill="none" stroke="${spriteShade(skin, -0.45)}" stroke-width="0.9" stroke-linecap="round"/>`;
    }
    // olhos e boca
    const eyeShift = (pose.lookX || 0) * 0.9;
    s += `<g transform="translate(${_n2(eyeShift)} 0)">`;
    s += spriteEyes(R, a, pose, skin, browColor, B.bigEyes);
    s += `<path d="M${_n2(0.4)} 4.2 Q${_n2(1.9)} 6 ${_n2(0.2)} 6.9" fill="none" stroke="${spriteShade(skin, -0.5)}" stroke-width="0.85" stroke-linecap="round"/>`;
    s += spriteMouth(a, pose, skin);
    s += `</g>`;
    if (a.scar === "olho") s += `<path d="M-8.6 -3.2 L-3.4 7" stroke="#8a2a20" stroke-width="1.1" stroke-linecap="round"/><path d="M-9.2 -1.6 L-6.6 -2.6 M-5.4 4.2 L-2.6 3" stroke="#8a2a20" stroke-width="0.7"/>`;
    if (a.scar === "bochecha") s += `<path d="M4.4 4.4 L9 7" stroke="#8a2a20" stroke-width="1.1" stroke-linecap="round"/>`;
    // sombra do cabelo na testa
    if (hair.front) s += `<path d="M${-rx + 1.6} -3 Q0 -6.4 ${rx - 1.6} -3 L${rx - 2.6} -1.8 Q0 -4.4 ${-rx + 2.6} -1.8 Z" fill="#000" opacity="0.13"/>`;
    const hairWrap = (svg) => B.hairScale !== 1 && svg ? `<g transform="scale(${_n2(B.hairScale)})">${svg}</g>` : svg;
    s += hairWrap(hair.front);
    s += spriteHeadAccessory(R, a, ctx, skin, pose, rx, ry);
    return { back: hairWrap(hair.back), front: s };
}

function spriteHeadAccessory(R, a, ctx, skin, pose, rx, ry) {
    let s = "";
    const acc = a.accessory;
    const hat = a.hat && a.hat !== "none" ? a.hat : (acc === "turbante" || acc === "faixa" ? acc : "none");
    const sway = pose.hairSway || 0;
    if (acc === "antenas") {
        const ant = (side) => `<path d="M${side * 4.4} -12.6 Q${side * 6.4 + sway * 2} -20.6 ${_n2(side * 9 + sway * 3)} -25.4" fill="none" stroke="${SPRITE_OUTLINE}" stroke-width="3.4" stroke-linecap="round"/><path d="M${side * 4.4} -12.6 Q${side * 6.4 + sway * 2} -20.6 ${_n2(side * 9 + sway * 3)} -25.4" fill="none" stroke="${spriteShade(skin, 0.02)}" stroke-width="2" stroke-linecap="round"/><circle cx="${_n2(side * 9 + sway * 3)}" cy="-25.6" r="1.7" fill="${spriteShade(skin, 0.15)}" stroke="${SPRITE_OUTLINE}" stroke-width="0.8"/>`;
        s += ant(-1) + ant(1);
    }
    if (acc === "chifres") {
        const horn = (side) => spritePath(`M${side * 6} -12 Q${side * 9} -17 ${side * 13} -22 Q${side * 12} -14 ${side * 10.4} -9 Z`, "#f3ecf8");
        s += horn(-1) + horn(1);
    }
    if (acc === "majin_antena") {
        s += `<path d="M2 -13 Q9 -22 4 -30" fill="none" stroke="${SPRITE_OUTLINE}" stroke-width="4" stroke-linecap="round"/><path d="M2 -13 Q9 -22 4 -30" fill="none" stroke="${spriteShade(skin, 0.05)}" stroke-width="2.6" stroke-linecap="round"/><circle cx="4" cy="-31" r="3.2" fill="${R.rad(3, -32, 4, [[0, spriteShade(skin, 0.4)], [1, spriteShade(skin, -0.15)]])}" stroke="${SPRITE_OUTLINE}" stroke-width="0.9"/>`;
    }
    if (hat === "turbante") {
        const fab = R.lin(-12, -18, 12, 0, [[0, "#ffffff"], [0.55, "#e6e9f0"], [1, "#a9b1c6"]]);
        s += spritePath(`M${-rx - 0.8} -2.4 C${-rx - 1.6} -20.6 ${rx + 1.6} -20.6 ${rx + 0.8} -2.4 Q0 -7.6 ${-rx - 0.8} -2.4 Z`, fab);
        s += `<path d="M-10 -8 Q-3 -14 5 -13 M-8 -4.6 Q0 -9.6 9 -8.6" fill="none" stroke="#8a93ab" stroke-width="0.8" opacity="0.8"/>`;
        s += spritePath(`M${-rx - 0.8} -3.6 Q0 -8.6 ${rx + 0.8} -3.6 L${rx + 0.6} -1.4 Q0 -6.2 ${-rx - 0.6} -1.4 Z`, spriteShade(a.secondaryColor, 0.05));
    }
    if (hat === "faixa") {
        const band = R.lin(0, -8, 0, 0, [[0, spriteShade(a.primaryColor === "#ffffff" ? "#d21e2e" : "#d21e2e", 0.25)], [1, "#8f1220"]]);
        s += spritePath(`M${-rx - 0.6} -6.6 Q0 -11.6 ${rx + 0.6} -6.6 L${rx + 0.6} -2.6 Q0 -7.6 ${-rx - 0.6} -2.6 Z`, band);
        s += spritePath(`M${rx - 0.6} -5 Q${rx + 8} ${-3 + sway * 3} ${rx + 12 + sway * 6} ${1 + sway * 4} L${rx + 9 + sway * 5} ${3.4 + sway * 3} Q${rx + 5} ${-1.4} ${rx - 1.6} -2.4 Z`, "#b3182a");
    }
    if (acc === "scouter") {
        s += `<path d="M-12.4 -0.6 Q-14 4 -11.6 8" fill="none" stroke="#2b2b30" stroke-width="1.6" stroke-linecap="round"/>`;
        s += `<ellipse cx="${_n2(-5.4 + (pose.lookX || 0) * 0.9)}" cy="1.6" rx="5" ry="4.3" fill="${R.lin(-9, -3, -2, 6, [[0, "#b8ffd8", 0.75], [1, "#20b866", 0.6]])}" stroke="#123d28" stroke-width="1"/>`;
        s += `<path d="M-8.6 -0.6 Q-6 -2.8 -3 -1.6" fill="none" stroke="#fff" stroke-width="0.9" opacity="0.8" stroke-linecap="round"/>`;
        s += `<circle cx="-11.6" cy="-2.4" r="1.4" fill="#e23b3b" stroke="#123d28" stroke-width="0.6"/>`;
    }
    if (acc === "potara") {
        const earring = (side) => `<circle cx="${side * (rx + 0.2)}" cy="7.6" r="2.6" fill="none" stroke="${a.accentColor}" stroke-width="1.5"/><circle cx="${side * (rx + 0.2)}" cy="10.4" r="1.9" fill="${R.rad(side * rx - 0.4, 9.8, 2.6, [[0, "#c8ffd6"], [0.6, "#2fae5c"], [1, "#0e5a2a"]])}" stroke="${SPRITE_OUTLINE}" stroke-width="0.7"/>`;
        s += earring(-1) + earring(1);
    }
    return s;
}

// ---------------------------------------------------------------------------
// ROUPAS: cada "outerShirt" define cores de tronco/braços/pernas e o desenho por cima do corpo.
// ---------------------------------------------------------------------------
function spriteOutfitSpec(a, skin, anime) {
    const P = a.primaryColor, S = a.secondaryColor, A = a.accentColor;
    const hasInner = a.innerShirt && a.innerShirt !== "nenhuma";
    const spec = { kind: a.outerShirt, torso: skin, armUpper: skin, armLower: skin, sleeve: null, leg: skin, legWide: false, legCover: a.pants !== "nenhuma" };
    switch (a.outerShirt) {
        case "kimono":
            if (anime) {
                // como no anime: gi sem manga, braços de fora e só a manguinha curta da camiseta de baixo no ombro
                Object.assign(spec, { torso: P, sleeve: hasInner ? { color: S, frac: 0.3 } : null, leg: P, legWide: true });
                break;
            }
            Object.assign(spec, { torso: P, armUpper: hasInner ? S : skin, armLower: hasInner ? S : skin, sleeve: { color: P, frac: 0.58 }, leg: P, legWide: true });
            break;
        case "armadura_saiyajin":
            Object.assign(spec, { torso: P, armUpper: P, armLower: P, leg: P });
            break;
        case "jaqueta_trunks":
            Object.assign(spec, { torso: P, armUpper: P, armLower: P, leg: spriteShade(S, -0.05), legWide: false });
            break;
        case "colete_fusao":
            Object.assign(spec, { torso: hasInner ? spriteShade(S, -0.1) : skin, leg: "#f4f1e8", legWide: true });
            break;
        case "roupa_kaioshin":
            Object.assign(spec, { torso: P, leg: S, legWide: true });
            break;
        case "gi_piccolo":
            Object.assign(spec, { torso: P, leg: P, legWide: true });
            break;
        case "armadura_freeza":
            Object.assign(spec, { torso: skin, legCover: false });
            break;
        case "traje_android":
            Object.assign(spec, { torso: P, armUpper: P, armLower: P, leg: S });
            break;
        default:   // "none": camiseta regata opcional
            Object.assign(spec, { torso: hasInner ? S : skin, leg: P, legWide: a.pants === "larga" });
    }
    // A calça (justa/larga) sempre reflete a escolha do jogador, independente do traje — antes cada traje
    // travava a largura da perna no próprio switch acima e ignorava a.pants.
    if (a.pants === "justa") spec.legWide = false;
    else if (a.pants === "larga") spec.legWide = true;
    if (a.pants === "nenhuma") spec.legCover = false;
    return spec;
}

function spriteBootSpec(a) {
    switch (a.shoes) {
        case "botas_artes": return { color: a.secondaryColor, trim: a.accentColor, h: 0.5 };
        case "botas_saiyajin": return { color: "#f4f4f6", trim: a.accentColor, h: 0.5 };
        case "botas_trunks": return { color: "#6d4b2b", trim: "#3d2913", h: 0.5 };
        case "botas_kaioshin": return { color: "#efd28a", trim: a.secondaryColor, h: 0.45 };
        case "botas_marrons": return { color: "#5a3d2b", trim: "#2f2015", h: 0.5 };
        default: return null;
    }
}

function spriteGloveSpec(a) {
    if (a.gloves === "luvas_saiyajin") return { color: "#f4f4f6", trim: a.accentColor, full: true };
    if (a.gloves === "luvas_pretas") return { color: "#2a2a30", trim: a.accentColor, full: true };
    if (a.gloves === "pulseiras") return { color: a.secondaryColor, trim: null, full: false };
    return null;
}

// Desenha o volume do tronco + roupa. Coordenadas do viewBox; centro em x=48.
function spriteTorso(R, a, B, spec, skin, pose) {
    const sw = B.sw, ww = B.ww, hw = B.hw;
    const x0 = 48 - sw / 2, x1 = 48 + sw / 2, y0 = 45, yw = 69, yh = 77;
    const breath = pose.breath || 0;
    const y0b = y0 - breath;
    const body = `M${_n2(x0)} ${_n2(y0b + 1)} Q${_n2(x0 - 1.6)} 56 ${_n2(48 - ww / 2)} ${yw} L${_n2(48 - hw / 2)} ${yh} L${_n2(48 + hw / 2)} ${yh} L${_n2(48 + ww / 2)} ${yw} Q${_n2(x1 + 1.6)} 56 ${_n2(x1)} ${_n2(y0b + 1)} Q48 ${_n2(y0b - 4)} ${_n2(x0)} ${_n2(y0b + 1)} Z`;
    const base = spec.torso;
    const fill = R.lin(x0, 46, x1, 70, [[0, spriteShade(base, 0.32)], [0.45, base], [1, spriteShade(base, -0.42)]]);
    let s = spritePath(body, fill);
    let d = "";
    const lapel = spriteShade(base, -0.28);
    switch (spec.kind) {
        case "kimono": {
            const inner = a.innerShirt !== "nenhuma" ? a.secondaryColor : skin;
            d += spritePath(`M${_n2(48 - 6.4)} ${_n2(y0b)} L48 ${_n2(y0b + 15)} L${_n2(48 + 6.4)} ${_n2(y0b)} Z`, R.lin(48, y0b, 48, y0b + 15, [[0, spriteShade(inner, 0.2)], [1, spriteShade(inner, -0.35)]]));
            d += `<path d="M${_n2(48 - 6.6)} ${_n2(y0b)} L${_n2(48 + 3)} ${_n2(yw - 1)} M${_n2(48 + 6.6)} ${_n2(y0b)} L${_n2(48 - 3)} ${_n2(yw - 1)}" stroke="${lapel}" stroke-width="1.3" fill="none" opacity="0.85"/>`;
            const belt = R.lin(0, 65, 0, 72, [[0, spriteShade(a.secondaryColor, 0.3)], [1, spriteShade(a.secondaryColor, -0.4)]]);
            d += spritePath(`M${_n2(48 - ww / 2 - 1.4)} 65.4 L${_n2(48 + ww / 2 + 1.4)} 65.4 L${_n2(48 + ww / 2 + 2.2)} 71.6 L${_n2(48 - ww / 2 - 2.2)} 71.6 Z`, belt);
            d += spritePath("M43 70 L40.6 78 L44.6 76.6 L45.6 71 Z", spriteShade(a.secondaryColor, -0.1)) + spritePath("M46 70.6 L45 79 L48.4 77 L48.6 71 Z", spriteShade(a.secondaryColor, -0.2));
            break;
        }
        case "armadura_saiyajin": {
            const plate = R.lin(x0, 46, x1, 66, [[0, "#ffffff"], [0.55, "#e9edf5"], [1, "#a8b0c4"]]);
            d += spritePath(`M${_n2(x0 + 2.6)} ${_n2(y0b + 2)} Q48 ${_n2(y0b - 2)} ${_n2(x1 - 2.6)} ${_n2(y0b + 2)} L${_n2(x1 - 3.4)} 60 Q${_n2(x1 - 4)} 65 ${_n2(48 + ww / 2 + 0.6)} 66.6 L${_n2(48 - ww / 2 - 0.6)} 66.6 Q${_n2(x0 + 4)} 65 ${_n2(x0 + 3.4)} 60 Z`, plate);
            d += `<path d="M48 ${_n2(y0b + 1)} L48 65" stroke="${spriteShade(a.accentColor, -0.15)}" stroke-width="1.1" opacity="0.9"/>`;
            d += `<path d="M${_n2(x0 + 3)} ${_n2(y0b + 2.4)} Q48 ${_n2(y0b - 1)} ${_n2(x1 - 3)} ${_n2(y0b + 2.4)}" fill="none" stroke="${a.accentColor}" stroke-width="1.4"/>`;
            d += spritePath(`M${_n2(48 - ww / 2 - 1)} 66.6 L${_n2(48 + ww / 2 + 1)} 66.6 L${_n2(48 + hw / 2 + 0.4)} 77 L${_n2(48 - hw / 2 - 0.4)} 77 Z`, R.lin(0, 66, 0, 77, [[0, "#f7f8fb"], [1, "#b5bccb"]]));
            d += `<path d="M48 67 L48 77" stroke="#8791a8" stroke-width="0.8"/><path d="M${_n2(48 - ww / 2)} 70.6 L${_n2(48 + ww / 2)} 70.6" stroke="${a.accentColor}" stroke-width="1"/>`;
            break;
        }
        case "jaqueta_trunks": {
            const shirt = a.secondaryColor;
            d += spritePath(`M${_n2(48 - 5.6)} ${_n2(y0b - 0.6)} L48 ${_n2(y0b + 12)} L${_n2(48 + 5.6)} ${_n2(y0b - 0.6)} Z`, spriteShade(shirt, 0.05));
            d += `<path d="M48 ${_n2(y0b + 12)} L48 ${yh - 1}" stroke="${spriteShade(base, -0.55)}" stroke-width="1.1"/>`;
            d += spritePath(`M${_n2(48 - 8)} ${_n2(y0b - 2.4)} L${_n2(48 - 4)} ${_n2(y0b + 2)} L${_n2(48 - 0.8)} ${_n2(y0b - 1)} L${_n2(48 - 3.6)} ${_n2(y0b - 5)} Z`, spriteShade(base, 0.12));
            d += spritePath(`M${_n2(48 + 8)} ${_n2(y0b - 2.4)} L${_n2(48 + 4)} ${_n2(y0b + 2)} L${_n2(48 + 0.8)} ${_n2(y0b - 1)} L${_n2(48 + 3.6)} ${_n2(y0b - 5)} Z`, spriteShade(base, -0.08));
            d += `<path d="M${_n2(x0 + 1.4)} 62 Q${_n2(48 - ww / 2)} 68 ${_n2(48 - ww / 2 - 0.4)} ${yh - 1} M${_n2(x1 - 1.4)} 62 Q${_n2(48 + ww / 2)} 68 ${_n2(48 + ww / 2 + 0.4)} ${yh - 1}" stroke="${spriteShade(base, -0.4)}" stroke-width="0.8" fill="none" opacity="0.7"/>`;
            d += spritePath(`M${_n2(48 - hw / 2)} ${yh - 3} L${_n2(48 + hw / 2)} ${yh - 3} L${_n2(48 + hw / 2)} ${yh} L${_n2(48 - hw / 2)} ${yh} Z`, spriteShade(shirt, -0.1), "", "");
            break;
        }
        case "colete_fusao": {
            const vest = R.lin(x0, 46, x1, 72, [[0, spriteShade(a.primaryColor, 0.3)], [0.5, a.primaryColor], [1, spriteShade(a.primaryColor, -0.42)]]);
            d += spritePath(`M${_n2(x0 + 0.8)} ${_n2(y0b + 1)} L${_n2(48 - 6)} ${_n2(y0b)} L${_n2(48 - 2.4)} 62 L${_n2(48 - ww / 2 - 0.4)} 71 L${_n2(x0 + 4)} 71 Q${_n2(x0 - 0.4)} 58 ${_n2(x0 + 0.8)} ${_n2(y0b + 1)} Z`, vest);
            d += spritePath(`M${_n2(x1 - 0.8)} ${_n2(y0b + 1)} L${_n2(48 + 6)} ${_n2(y0b)} L${_n2(48 + 2.4)} 62 L${_n2(48 + ww / 2 + 0.4)} 71 L${_n2(x1 - 4)} 71 Q${_n2(x1 + 0.4)} 58 ${_n2(x1 - 0.8)} ${_n2(y0b + 1)} Z`, vest);
            d += `<path d="M${_n2(48 - 6)} ${_n2(y0b)} L${_n2(48 - 2.4)} 62 L${_n2(48 - ww / 2 - 0.4)} 71 M${_n2(48 + 6)} ${_n2(y0b)} L${_n2(48 + 2.4)} 62 L${_n2(48 + ww / 2 + 0.4)} 71" stroke="${a.accentColor}" stroke-width="1.5" fill="none" stroke-linejoin="round"/>`;
            const sash = R.lin(0, 66, 0, 73, [[0, spriteShade(a.accentColor, 0.3)], [1, spriteShade(a.accentColor, -0.3)]]);
            d += spritePath(`M${_n2(48 - ww / 2 - 1.6)} 66 L${_n2(48 + ww / 2 + 1.6)} 66 L${_n2(48 + ww / 2 + 2.2)} 72.6 L${_n2(48 - ww / 2 - 2.2)} 72.6 Z`, sash);
            d += spritePath("M50 71 L48.8 79 L52.6 77.6 L53.4 71.4 Z", spriteShade(a.accentColor, -0.15));
            break;
        }
        case "roupa_kaioshin": {
            d += spritePath(`M${_n2(48 - 7)} ${_n2(y0b - 0.4)} L48 ${_n2(y0b + 9)} L${_n2(48 + 7)} ${_n2(y0b - 0.4)} L${_n2(48 + 9)} ${_n2(y0b + 2)} L48 ${_n2(y0b + 12)} L${_n2(48 - 9)} ${_n2(y0b + 2)} Z`, a.accentColor);
            const sash = R.lin(0, 64, 0, 74, [[0, spriteShade(a.accentColor, 0.35)], [1, spriteShade(a.accentColor, -0.25)]]);
            d += spritePath(`M${_n2(48 - ww / 2 - 1.6)} 64 L${_n2(48 + ww / 2 + 1.6)} 64 L${_n2(48 + ww / 2 + 2.4)} 73 L${_n2(48 - ww / 2 - 2.4)} 73 Z`, sash);
            d += spritePath("M46 72 L44 81 L48.6 79.2 L49 72.4 Z", spriteShade(a.accentColor, -0.15));
            break;
        }
        case "gi_piccolo": {
            d += `<path d="M${_n2(48 - 6)} ${_n2(y0b)} L${_n2(48 + 4)} ${yw - 2} M${_n2(48 + 6)} ${_n2(y0b)} L${_n2(48 - 4)} ${yw - 2}" stroke="${lapel}" stroke-width="1.3" fill="none"/>`;
            const sash = R.lin(0, 65, 0, 73, [[0, spriteShade(a.secondaryColor, 0.3)], [1, spriteShade(a.secondaryColor, -0.4)]]);
            d += spritePath(`M${_n2(48 - ww / 2 - 1.4)} 65.4 L${_n2(48 + ww / 2 + 1.4)} 65.4 L${_n2(48 + ww / 2 + 2.2)} 72.6 L${_n2(48 - ww / 2 - 2.2)} 72.6 Z`, sash);
            d += spritePath("M44 72 L42 79.6 L46.4 78.4 L47 72.4 Z", spriteShade(a.secondaryColor, -0.15));
            break;
        }
        case "armadura_freeza": {
            const purple = R.lin(x0, 48, x1, 70, [[0, "#b98be6"], [0.5, "#7a46bd"], [1, "#3a1d6a"]]);
            d += spritePath(`M${_n2(48 - 9)} ${_n2(y0b + 3)} Q48 ${_n2(y0b - 1)} ${_n2(48 + 9)} ${_n2(y0b + 3)} L${_n2(48 + 8)} 62 Q48 66 ${_n2(48 - 8)} 62 Z`, purple);
            d += `<path d="M48 ${_n2(y0b + 2)} L48 63" stroke="#2a1150" stroke-width="0.9"/><ellipse cx="42" cy="53" rx="2.4" ry="1.5" fill="#e7d3ff" opacity="0.6"/>`;
            d += spritePath(`M${_n2(48 - ww / 2)} 67 Q48 71 ${_n2(48 + ww / 2)} 67 L${_n2(48 + hw / 2)} ${yh} L${_n2(48 - hw / 2)} ${yh} Z`, spriteShade(spec.torso, -0.16));
            break;
        }
        case "traje_android": {
            d += spritePath(`M${_n2(48 - 8)} ${_n2(y0b - 1)} L${_n2(48 + 8)} ${_n2(y0b - 1)} L${_n2(48 + 9)} ${_n2(y0b + 5)} L48 ${_n2(y0b + 8)} L${_n2(48 - 9)} ${_n2(y0b + 5)} Z`, a.accentColor);
            d += `<path d="M48 ${_n2(y0b + 8)} L48 ${yh - 1}" stroke="${spriteShade(base, -0.5)}" stroke-width="1"/>`;
            d += spritePath(`M${_n2(48 - ww / 2 - 1)} 66 L${_n2(48 + ww / 2 + 1)} 66 L${_n2(48 + ww / 2 + 1.6)} 70.4 L${_n2(48 - ww / 2 - 1.6)} 70.4 Z`, spriteShade(a.secondaryColor, 0.1));
            break;
        }
        default: {
            if (spec.torso === skin) {
                const line = spriteShade(skin, -0.42);
                if (B.bulk > 0) {
                    // peitoral + abdômen definidos (personagem musculoso/gigante de torso nu)
                    d += `<path d="M${_n2(48 - 9)} 50 Q${_n2(48 - 4.6)} 56.4 48 52.6 Q${_n2(48 + 4.6)} 56.4 ${_n2(48 + 9)} 50" fill="none" stroke="${line}" stroke-width="1.3" stroke-linecap="round"/>`;
                    d += `<path d="M48 52.6 L48 68" stroke="${line}" stroke-width="1.2" opacity="0.85"/>`;
                    [58.4, 62.6, 66.8].forEach(y => {
                        d += `<path d="M${_n2(48 - 4.6)} ${y} Q48 ${_n2(y + 1.4)} ${_n2(48 + 4.6)} ${y}" fill="none" stroke="${line}" stroke-width="0.9" opacity="0.65"/>`;
                    });
                    d += `<path d="M${_n2(48 - 9.4)} 51 Q${_n2(48 - 10.6)} 60 ${_n2(48 - 7.6)} 68" fill="none" stroke="${spriteShade(skin, 0.5)}" stroke-width="1" opacity="0.4" stroke-linecap="round"/>`;
                } else {
                    d += `<path d="M${_n2(48 - 8)} 50.6 Q${_n2(48 - 4)} 55 48 52.4 Q${_n2(48 + 4)} 55 ${_n2(48 + 8)} 50.6 M48 52.4 L48 66 M${_n2(48 - 4.8)} 58.6 L${_n2(48 - 1.2)} 59.4 M${_n2(48 + 4.8)} 58.6 L${_n2(48 + 1.2)} 59.4 M${_n2(48 - 4.4)} 63.6 L${_n2(48 - 1.2)} 64.2 M${_n2(48 + 4.4)} 63.6 L${_n2(48 + 1.2)} 64.2" fill="none" stroke="${line}" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/>`;
                }
            }
            if (a.pants !== "nenhuma") {
                const belt = R.lin(0, 66, 0, 72, [[0, spriteShade(a.accentColor, 0.2)], [1, spriteShade(a.accentColor, -0.35)]]);
                d += spritePath(`M${_n2(48 - ww / 2 - 1)} 67.4 L${_n2(48 + ww / 2 + 1)} 67.4 L${_n2(48 + ww / 2 + 1.6)} 72 L${_n2(48 - ww / 2 - 1.6)} 72 Z`, belt);
            }
        }
    }
    s += d;
    // dobras de tecido / luz de contorno
    s += `<path d="M${_n2(x1 - 1)} ${_n2(y0b + 5)} Q${_n2(x1 + 0.4)} 58 ${_n2(48 + ww / 2 - 0.6)} 68" fill="none" stroke="${spriteShade(base, 0.55)}" stroke-width="1.1" opacity="0.4" stroke-linecap="round"/>`;
    s += `<path d="M${_n2(x0 + 4)} 58 Q${_n2(x0 + 6)} 62 ${_n2(48 - ww / 2 + 1)} 66" fill="none" stroke="${spriteShade(base, -0.5)}" stroke-width="0.8" opacity="0.28"/>`;
    return s;
}

// Símbolo pequeno no peito.
function spriteSymbol(a, B) {
    if (!a.symbol || a.symbol === "none") return "";
    const cx = 48 - B.sw * 0.22, cy = 54;
    const o = SPRITE_OUTLINE;
    switch (a.symbol) {
        case "kame": return `<circle cx="${_n2(cx)}" cy="${cy}" r="4.4" fill="#fff8e0" stroke="${o}" stroke-width="0.8"/><path d="M${_n2(cx - 2.4)} ${cy - 1.6} L${_n2(cx + 2.4)} ${cy - 1.6} M${_n2(cx)} ${cy - 2.6} L${_n2(cx)} ${cy + 2.6} M${_n2(cx - 2.2)} ${cy + 0.6} L${_n2(cx + 2.2)} ${cy + 0.6}" stroke="#c0392b" stroke-width="0.9" fill="none"/>`;
        case "kai": return `<circle cx="${_n2(cx)}" cy="${cy}" r="4.4" fill="#fff8e0" stroke="${o}" stroke-width="0.8"/><path d="M${_n2(cx - 2.6)} ${cy - 2.4} L${_n2(cx + 2.6)} ${cy - 2.4} M${_n2(cx)} ${cy - 3} L${_n2(cx)} ${cy + 3} M${_n2(cx - 2.4)} ${cy + 1} L${_n2(cx + 2.4)} ${cy + 1}" stroke="#c0392b" stroke-width="0.9" fill="none"/>`;
        case "cc": return `<circle cx="${_n2(cx)}" cy="${cy}" r="4.2" fill="#ffffff" stroke="${o}" stroke-width="0.8"/><path d="M${_n2(cx - 3.4)} ${cy + 0.4} A3.6 3.6 0 0 1 ${_n2(cx + 3.4)} ${cy + 0.4}" fill="none" stroke="#d92b2b" stroke-width="1.2"/><circle cx="${_n2(cx)}" cy="${cy + 0.6}" r="1.4" fill="#d92b2b"/>`;
        case "redribbon": return `<rect x="${_n2(cx - 4)}" y="${cy - 3.6}" width="8" height="7.2" rx="1.2" fill="#c0281f" stroke="${o}" stroke-width="0.8"/><path d="M${_n2(cx - 2)} ${cy + 2} L${_n2(cx - 2)} ${cy - 1.6} L${_n2(cx + 2)} ${cy + 1.6} L${_n2(cx + 2)} ${cy - 2}" stroke="#ffe066" stroke-width="1" fill="none"/>`;
        case "saiyajin": return `<path d="M${_n2(cx - 3.4)} ${cy + 3.2} L${_n2(cx)} ${cy - 3.6} L${_n2(cx + 3.4)} ${cy + 3.2} Z" fill="${a.accentColor}" stroke="${o}" stroke-width="0.8"/>`;
        default: return "";
    }
}

// ---------------------------------------------------------------------------
// MEMBROS
// ---------------------------------------------------------------------------
function spriteHand(R, cx, cy, r, color, open, ang) {
    const fill = R.rad(cx - r * 0.4, cy - r * 0.5, r * 1.9, [[0, spriteShade(color, 0.4)], [0.55, color], [1, spriteShade(color, -0.4)]]);
    if (open) {
        return `<g transform="rotate(${_n2(ang || 0)} ${_n2(cx)} ${_n2(cy)})"><ellipse cx="${_n2(cx)}" cy="${_n2(cy)}" rx="${_n2(r * 1.25)}" ry="${_n2(r * 1.5)}" fill="${fill}" stroke="${SPRITE_OUTLINE}" stroke-width="1"/><path d="M${_n2(cx - r * 0.5)} ${_n2(cy - r * 0.6)} L${_n2(cx - r * 0.5)} ${_n2(cy - r * 1.4)} M${_n2(cx)} ${_n2(cy - r * 0.7)} L${_n2(cx)} ${_n2(cy - r * 1.5)} M${_n2(cx + r * 0.5)} ${_n2(cy - r * 0.6)} L${_n2(cx + r * 0.5)} ${_n2(cy - r * 1.4)}" stroke="${SPRITE_OUTLINE}" stroke-width="0.6" opacity="0.7"/></g>`;
    }
    return `<circle cx="${_n2(cx)}" cy="${_n2(cy)}" r="${_n2(r)}" fill="${fill}" stroke="${SPRITE_OUTLINE}" stroke-width="1"/>` +
        `<path d="M${_n2(cx - r * 0.5)} ${_n2(cy - r * 0.15)} l${_n2(r * 0.25)} ${_n2(r * 0.7)} M${_n2(cx)} ${_n2(cy - r * 0.2)} l0 ${_n2(r * 0.75)} M${_n2(cx + r * 0.5)} ${_n2(cy - r * 0.15)} l${_n2(-r * 0.25)} ${_n2(r * 0.7)}" stroke="${spriteShade(color, -0.55)}" stroke-width="0.6" fill="none" opacity="0.65"/>`;
}

// Devolve { svg, hand:[x,y], elbow:[x,y] }. angles = [ombro, cotovelo] em graus (0 = braço reto para baixo).
function spriteArm(R, a, B, spec, glove, skin, side, angles, handKind) {
    const sx = 48 + side * (B.sw / 2 - 3.2) + SPRITE_TURN * (side > 0 ? 0.4 : -0.15), sy = B.shoulderY;
    const e = spriteSeg(sx, sy, angles[0], B.l1);
    const h = spriteSeg(e[0], e[1], angles[1], B.l2);
    const w = B.arm;
    let s = "";
    if (B.cel) {
        // anime: deltoide largo afinando no cotovelo; antebraço forte afinando no punho; manga do kimono larga.
        s += spriteJoined(spriteMuscle(sx, sy, e[0], e[1], w * 1.35, w * 0.9, spec.armUpper, { bulge: 0.16, parts: true }),
            spriteMuscle(e[0], e[1], h[0], h[1], w * 1.0, w * 0.72, spec.armLower, { bulge: 0.14, parts: true }));
        if (spec.sleeve) {
            const p = [sx + (e[0] - sx) * spec.sleeve.frac, sy + (e[1] - sy) * spec.sleeve.frac];
            s += spriteMuscle(sx, sy, p[0], p[1], w * 1.42, w * 1.2, spec.sleeve.color, { bulge: 0.04 });
        }
        if (glove) {
            const from = glove.full ? 0.5 : 0.6, to = glove.full ? 1 : 0.86;
            const q1 = [e[0] + (h[0] - e[0]) * from, e[1] + (h[1] - e[1]) * from], q2 = [e[0] + (h[0] - e[0]) * to, e[1] + (h[1] - e[1]) * to];
            s += spriteMuscle(q1[0], q1[1], q2[0], q2[1], w * 0.98, w * 0.86, glove.color, { bulge: 0 });
            if (glove.trim) s += spriteBand(q1[0], q1[1], q2[0], q2[1], w * 1.0, glove.trim, 1.5);
        }
        const handColor = glove && glove.full ? glove.color : skin;
        const dirA = Math.atan2(h[0] - e[0], -(h[1] - e[1])) * 180 / Math.PI;
        s += spriteHand(R, h[0], h[1], w * 0.52, handColor, handKind === "open", dirA + 180);
        return { svg: s, hand: h, elbow: e };
    }
    s += spriteLimb(sx, sy, e[0], e[1], w, spec.armUpper);
    // Bíceps: corpo "musculoso"/"gigante" ganha um bojo visível no meio do braço superior (senão a diferença
    // de espessura sozinha é sutil demais para notar no tamanho do jogo). "magro"/"jovem" não ganham nada extra.
    if (B.bulk > 0) {
        const mx = sx + (e[0] - sx) * 0.52, my = sy + (e[1] - sy) * 0.52;
        const bulgeR = w * (0.62 + B.bulk * 0.16);
        const bulgeFill = R.rad(mx - bulgeR * 0.3, my - bulgeR * 0.4, bulgeR * 1.6, [[0, spriteShade(spec.armUpper, 0.4)], [0.6, spec.armUpper], [1, spriteShade(spec.armUpper, -0.4)]]);
        s += `<ellipse cx="${_n2(mx)}" cy="${_n2(my)}" rx="${_n2(bulgeR)}" ry="${_n2(bulgeR * 0.82)}" fill="${bulgeFill}" stroke="${SPRITE_OUTLINE}" stroke-width="0.9"/>`;
        s += `<path d="M${_n2(mx - bulgeR * 0.3)} ${_n2(my - bulgeR * 0.4)} q${_n2(bulgeR * 0.3)} ${_n2(-bulgeR * 0.15)} ${_n2(bulgeR * 0.55)} ${_n2(bulgeR * 0.1)}" fill="none" stroke="${spriteShade(spec.armUpper, 0.55)}" stroke-width="0.8" opacity="0.6" stroke-linecap="round"/>`;
    }
    s += spriteLimb(e[0], e[1], h[0], h[1], w * 0.94, spec.armLower);
    if (spec.sleeve) {
        const p = [sx + (e[0] - sx) * spec.sleeve.frac, sy + (e[1] - sy) * spec.sleeve.frac];
        s += spriteLimb(sx, sy, p[0], p[1], w * 1.2, spec.sleeve.color);
        s += spriteBand(p[0], p[1], e[0], e[1], w * 1.22, spriteShade(spec.sleeve.color, -0.3), 1.6);
    }
    if (glove) {
        const from = glove.full ? 0.5 : 0.62, to = glove.full ? 1 : 0.8;
        const q1 = [e[0] + (h[0] - e[0]) * from, e[1] + (h[1] - e[1]) * from], q2 = [e[0] + (h[0] - e[0]) * to, e[1] + (h[1] - e[1]) * to];
        s += spriteLimb(q1[0], q1[1], q2[0], q2[1], w * 1.1, glove.color, { cap: glove.full ? "round" : "butt" });
        if (glove.trim) s += spriteBand(q1[0], q1[1], q2[0], q2[1], w * 1.16, glove.trim, 1.7);
    }
    const handColor = glove && glove.full ? glove.color : skin;
    const dir = Math.atan2(h[0] - e[0], -(h[1] - e[1])) * 180 / Math.PI;   // orientação da mão
    s += spriteHand(R, h[0], h[1], w * 0.56, handColor, handKind === "open", dir + 180);
    return { svg: s, hand: h, elbow: e };
}

function spriteLeg(R, a, B, spec, boot, skin, side, angles) {
    const hx = 48 + side * B.hw * 0.23 + SPRITE_TURN * (side > 0 ? 0.35 : -0.12), hy = B.hipY;
    const k = spriteSeg(hx, hy, angles[0], B.t1);
    const f = spriteSeg(k[0], k[1], angles[1], B.t2);
    const w = B.leg * (spec.legWide ? 1.13 : 1);
    const color = spec.legCover ? spec.leg : skin;
    let s = "";
    if (B.cel) {
        // anime: coxa larga afinando no joelho; calça folgada (gi) cai larga até a bota.
        const wide = spec.legCover && spec.legWide;
        s += spriteJoined(spriteMuscle(hx, hy, k[0], k[1], w * (wide ? 1.55 : 1.3), w * (wide ? 1.22 : 0.92), color, { bulge: wide ? 0.08 : 0.14, parts: true }),
            spriteMuscle(k[0], k[1], f[0], f[1], w * (wide ? 1.22 : 0.95), w * (wide ? 1.12 : 0.66), color, { bulge: wide ? 0.04 : 0.12, parts: true }));
        if (boot) {
            const from = [f[0] + (k[0] - f[0]) * boot.h, f[1] + (k[1] - f[1]) * boot.h];
            s += spriteMuscle(from[0], from[1], f[0], f[1], w * 0.98, w * 0.86, boot.color, { bulge: 0 });
            s += spriteBand(from[0], from[1], f[0], f[1], w * 1.04, boot.trim, 1.8);
        }
        const fc = boot ? boot.color : skin;
        s += `<g transform="rotate(${_n2(angles[1] * 0.45 + side * 4)} ${_n2(f[0])} ${_n2(f[1])})">` +
            `<path d="M${_n2(f[0] - 3.4)} ${_n2(f[1] - 1)} L${_n2(f[0] + 3.4)} ${_n2(f[1] - 1)} Q${_n2(f[0] + side * 7.6 + (side < 0 ? 2 : 0))} ${_n2(f[1] + 0.4)} ${_n2(f[0] + side * 6.4 + (side < 0 ? 1.4 : 0))} ${_n2(f[1] + 3.6)} L${_n2(f[0] - 3.8)} ${_n2(f[1] + 3.6)} Z" fill="${fc}" stroke="${SPRITE_OUTLINE}" stroke-width="1.2" stroke-linejoin="round"/>` +
            `<path d="M${_n2(f[0] - 3.6)} ${_n2(f[1] + 2.4)} L${_n2(f[0] + side * 6.2)} ${_n2(f[1] + 2.4)}" stroke="${spriteShade(fc, -0.45)}" stroke-width="1.3"/></g>`;
        return { svg: s, foot: f, knee: k };
    }
    s += spriteLimb(hx, hy, k[0], k[1], w, color);
    s += spriteLimb(k[0], k[1], f[0], f[1], w * (spec.legWide ? 0.98 : 0.94), color);
    if (spec.legCover && spec.legWide) {   // barra da calça frouxa
        const c = [k[0] + (f[0] - k[0]) * 0.72, k[1] + (f[1] - k[1]) * 0.72];
        s += spriteBand(c[0], c[1], f[0], f[1], w * 1.02, spriteShade(color, -0.22), 1.6);
    }
    if (boot) {
        const from = [f[0] + (k[0] - f[0]) * boot.h, f[1] + (k[1] - f[1]) * boot.h];
        s += spriteLimb(from[0], from[1], f[0], f[1], w * 1.06, boot.color, { cap: "butt" });
        s += spriteBand(from[0], from[1], f[0], f[1], w * 1.12, boot.trim, 2);
    }
    const footColor = boot ? boot.color : skin;
    const footFill = R.rad(f[0] - 2, f[1] - 1.5, 8, [[0, spriteShade(footColor, 0.36)], [0.6, footColor], [1, spriteShade(footColor, -0.45)]]);
    s += `<g transform="rotate(${_n2(angles[1] * 0.45 + side * 6)} ${_n2(f[0])} ${_n2(f[1])})"><ellipse cx="${_n2(f[0] + side * 2.6)}" cy="${_n2(f[1] + 1.6)}" rx="5.4" ry="3.3" fill="${footFill}" stroke="${SPRITE_OUTLINE}" stroke-width="1"/><path d="M${_n2(f[0] - 2)} ${_n2(f[1] + 4.2)} L${_n2(f[0] + side * 6.6)} ${_n2(f[1] + 4.4)}" stroke="${spriteShade(footColor, -0.65)}" stroke-width="1" opacity="0.7"/></g>`;
    return { svg: s, foot: f, knee: k };
}

// Curva cônica (cauda, capa): amostra uma Bézier cúbica e desenha segmentos com espessura decrescente.
function spriteTaper(pts, w0, w1, color, tipColor) {
    const [p0, p1, p2, p3] = pts;
    const N = 12;
    const at = (t) => {
        const u = 1 - t;
        return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
    };
    let o = "", c = "", h = "";
    for (let i = 0; i < N; i++) {
        const A = at(i / N), Bp = at((i + 1) / N), w = w0 + (w1 - w0) * ((i + 0.5) / N);
        const col = tipColor && i > N * 0.72 ? tipColor : color;
        o += `<line x1="${_n2(A[0])}" y1="${_n2(A[1])}" x2="${_n2(Bp[0])}" y2="${_n2(Bp[1])}" stroke="${SPRITE_OUTLINE}" stroke-width="${_n2(w + 2.2)}" stroke-linecap="round"/>`;
        c += `<line x1="${_n2(A[0])}" y1="${_n2(A[1])}" x2="${_n2(Bp[0])}" y2="${_n2(Bp[1])}" stroke="${col}" stroke-width="${_n2(w)}" stroke-linecap="round"/>`;
        h += `<line x1="${_n2(A[0] - 0.7)}" y1="${_n2(A[1] - 0.7)}" x2="${_n2(Bp[0] - 0.7)}" y2="${_n2(Bp[1] - 0.7)}" stroke="${spriteShade(col, 0.5)}" stroke-width="${_n2(Math.max(0.6, w * 0.28))}" stroke-linecap="round" opacity="0.55"/>`;
    }
    return o + c + h;
}

// ---------------------------------------------------------------------------
// PARTES ATRÁS DO CORPO: asas, capa, cauda, arma nas costas
// ---------------------------------------------------------------------------
function spriteBack(R, a, B, pose, skin) {
    let s = "";
    const flap = pose.wing || 0;
    if (a.wings === "morcego" || a.wings === "anjo") {
        const bat = a.wings === "morcego";
        const wf = bat ? R.lin(50, 30, 92, 70, [[0, "#6a3fa8"], [1, "#2b1650"]]) : R.lin(50, 30, 92, 70, [[0, "#ffffff"], [1, "#c9d3ea"]]);
        const up = flap * 4;
        const wing = (m) => spritePath(`M${48 + m * 8} 48 C${48 + m * 22} ${30 + up} ${48 + m * 36} ${26 + up} ${48 + m * 42} ${20 + up} C${48 + m * 40} ${32 + up} ${48 + m * 36} ${36 + up} ${48 + m * 39} ${46 + up} C${48 + m * 33} ${43 + up} ${48 + m * 28} ${47 + up} ${48 + m * 30} ${56 + up} C${48 + m * 24} ${52 + up} ${48 + m * 18} ${56 + up} ${48 + m * 12} ${64}Z`, wf);
        s += wing(-1) + wing(1);
    }
    if (a.cape === "capa" || a.cape === "capa_ombreiras") {
        const sway = (pose.capeSway || 0) * 11;
        const cc = a.capeColor || "#ffffff";
        const x0 = 48 - B.sw / 2 - 1, x1 = 48 + B.sw / 2 + 1, yb = 96;
        const fill = R.lin(x0, 46, x1, yb, [[0, spriteShade(cc, 0.12)], [0.6, cc], [1, spriteShade(cc, -0.4)]]);
        s += spritePath(`M${_n2(x0)} 46 C${_n2(x0 - 4)} 62 ${_n2(x0 - 9 + sway)} 80 ${_n2(x0 - 10 + sway)} ${yb} Q${_n2(48 + sway * 1.2)} ${yb + 5 + Math.abs(sway) * 0.3} ${_n2(x1 + 10 + sway)} ${yb} C${_n2(x1 + 9 + sway)} 80 ${_n2(x1 + 4)} 62 ${_n2(x1)} 46 Z`, fill);
        s += `<path d="M${_n2(x0 - 5 + sway * 0.4)} 70 Q${_n2(x0 - 7 + sway * 0.8)} 84 ${_n2(x0 - 9 + sway)} ${yb - 3} M${_n2(x1 + 5 + sway * 0.4)} 70 Q${_n2(x1 + 7 + sway * 0.8)} 84 ${_n2(x1 + 9 + sway)} ${yb - 3}" stroke="${spriteShade(cc, -0.4)}" stroke-width="0.8" fill="none" opacity="0.6"/>`;
    }
    const sw = pose.tailSwing || 0;
    if (a.tail === "saiyajin") {
        // Base no quadril de trás (esquerdo, lado oposto ao adversário) para não cruzar com a perna da frente
        // avançada na postura de luta, e curva para trás/lado — fica visível contra o fundo, não escondida.
        s += spriteTaper([[48 - B.ww / 2 + 1, 73], [36 - sw * 2, 80], [30 - sw * 5, 66], [33 - sw * 7, 50]], 4.6, 2.6, "#8a5a2b", "#c9a26a");
    }
    if (a.tail === "freeza") {
        s += spriteTaper([[47, 77], [36 - sw * 2, 92], [58 + sw * 4, 104], [78 + sw * 6, 92]], 6.6, 2.4, "#f1eef6", "#7f4fc0");
    }
    if (a.backWeapon === "espada_trunks") {
        s += spriteLimb(60.4, 34, 32.6, 86, 4.4, "#2f2620");
        s += spriteLimb(52, 48.6, 50.6, 51.4, 4.8, "#d7b25a");
        s += spriteLimb(60.4, 34, 65.2, 25.6, 3.4, "#4a3324");
        s += spriteLimb(59.2, 36, 62.4, 30.4, 3.6, "#8d1f2a");
        s += spriteLimb(57.4, 34.2, 63.6, 33.6, 1.8, "#e6c75f", { cap: "butt" });
        s += `<circle cx="65.6" cy="24.8" r="2" fill="#e6c75f" stroke="${SPRITE_OUTLINE}" stroke-width="0.8"/>`;
    }
    if (a.backWeapon === "bastao") {
        s += spriteLimb(66, 20, 30, 98, 3.4, "#c62b22");
        s += spriteLimb(66, 20, 65, 22, 3.8, "#f2c94c") + spriteLimb(30, 98, 31, 96, 3.8, "#f2c94c");
    }
    return s;
}

// Ombreiras (por cima dos braços)
function spriteShoulderPads(R, a, B) {
    let s = "";
    const pad = (side, color, trim) => {
        const cx = 48 + side * (B.sw / 2 - 0.6), cy = 47;
        const fill = R.lin(cx - 9, cy - 5, cx + 9, cy + 5, [[0, spriteShade(color, 0.3)], [1, spriteShade(color, -0.35)]]);
        return `<g transform="rotate(${side * 14} ${_n2(cx)} ${cy})"><ellipse cx="${_n2(cx)}" cy="${cy}" rx="${_n2(8.6 + B.arm * 0.12)}" ry="4.8" fill="${fill}" stroke="${SPRITE_OUTLINE}" stroke-width="1.1"/><ellipse cx="${_n2(cx)}" cy="${cy + 3.6}" rx="${_n2(7.6 + B.arm * 0.12)}" ry="1.3" fill="${trim}" stroke="${SPRITE_OUTLINE}" stroke-width="0.6"/></g>`;
    };
    if (a.cape === "ombreiras" || a.cape === "capa_ombreiras") {
        const cc = a.capeColor || "#ffffff";
        s += pad(-1, cc, spriteShade(cc, -0.3)) + pad(1, cc, spriteShade(cc, -0.3));
    }
    if (a.outerShirt === "armadura_saiyajin") {
        s += pad(-1, "#f4f4f6", a.accentColor) + pad(1, "#f4f4f6", a.accentColor);
    }
    if (a.outerShirt === "armadura_freeza") {
        s += pad(-1, "#7f4fc0", "#3a1d6a") + pad(1, "#7f4fc0", "#3a1d6a");
    }
    return s;
}

// ---------------------------------------------------------------------------
// EFEITOS
// ---------------------------------------------------------------------------
function spriteKiBall(R, x, y, r, color, flick) {
    const glow = R.rad(x, y, r * 2.4, [[0, color, 0.85], [0.45, color, 0.35], [1, color, 0]]);
    const core = R.rad(x, y, r, [[0, "#ffffff"], [0.45, spriteShade(color, 0.6)], [1, color]]);
    let rays = "";
    for (let k = 0; k < 8; k++) {
        const ang = (k * 45 + flick * 22) * Math.PI / 180, l0 = r * 1.05, l1 = r * (1.7 + (k % 2) * 0.5);
        rays += `<line x1="${_n2(x + Math.cos(ang) * l0)}" y1="${_n2(y + Math.sin(ang) * l0)}" x2="${_n2(x + Math.cos(ang) * l1)}" y2="${_n2(y + Math.sin(ang) * l1)}" stroke="${spriteShade(color, 0.5)}" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>`;
    }
    return `<circle cx="${_n2(x)}" cy="${_n2(y)}" r="${_n2(r * 2.4)}" fill="${glow}"/>${rays}<circle cx="${_n2(x)}" cy="${_n2(y)}" r="${_n2(r)}" fill="${core}"/>`;
}

function spriteSparks(amount, seed, color) {
    let s = "";
    for (let k = 0; k < 7; k++) {
        const ang = (k * 51 + seed * 29) * Math.PI / 180, r0 = 24 + (k % 3) * 4, r1 = r0 + 9 + (k % 2) * 6;
        const cx = 48, cy = 66;
        const x0 = cx + Math.cos(ang) * r0 * 0.8, y0 = cy + Math.sin(ang) * r0;
        const x1 = cx + Math.cos(ang + 0.16) * (r0 + r1) / 2 * 0.8, y1 = cy + Math.sin(ang + 0.16) * (r0 + r1) / 2;
        const x2 = cx + Math.cos(ang - 0.05) * r1 * 0.8, y2 = cy + Math.sin(ang - 0.05) * r1;
        s += `<path d="M${_n2(x0)} ${_n2(y0)} L${_n2(x1)} ${_n2(y1)} L${_n2(x2)} ${_n2(y2)}" fill="none" stroke="${k % 2 ? "#ffffff" : color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="${_n2(Math.min(1, amount) * 0.85)}"/>`;
    }
    return s;
}

// ---------------------------------------------------------------------------
// POSES: cada estado é um conjunto de ângulos por quadro; o ciclo fecha em si mesmo (fluido).
// ---------------------------------------------------------------------------
const SPRITE_FLY_DIRS = {
    flyRight: [1, 0], flyLeft: [-1, 0], flyUp: [0, -1], flyDown: [0, 1],
    flyUpRight: [1, -1], flyUpLeft: [-1, -1], flyDownRight: [1, 1], flyDownLeft: [-1, 1]
};

function spritePoseFor(state, i, n) {
    const ph = (i / n) * Math.PI * 2, sn = Math.sin(ph), cs = Math.cos(ph);
    const P = {
        bob: 0, shiftX: 0, lean: 0, crouch: 0, breath: 0,
        armL: [-14, -8], armR: [14, 8], legL: [-7, -4], legR: [7, 4], handL: "fist", handR: "fist",
        hairSway: 0, hairLift: 0, capeSway: 0, tailSwing: sn, wing: sn, lookX: 0.32, lookY: 0,
        eyes: "open", mouth: "auto", ki: null, shield: 0, flash: 0, sparks: 0, ssj: false
    };
    if (state === "idle") {
        // Postura de luta pronta, virada para o adversário (à direita): perna direita (frente) avançada e mais
        // flexionada, perna esquerda (trás) recuada quase esticada — peso distribuído, não uma base simétrica.
        // Braço da frente (direito) semi-estendido em guarda; braço de trás (esquerdo) recolhido perto do corpo.
        Object.assign(P, {
            bob: 1.3 * sn, breath: 0.6 * sn,
            armL: [-24 + 2 * sn, -108 + 4 * sn], armR: [46 - 3 * sn, 30 + 4 * sn],
            legL: [-10 - 0.5 * sn, -3], legR: [26 + 0.6 * sn, 14],
            handL: "fist", handR: "fist",
            hairSway: 0.22 * sn, hairLift: 0.15 * cs, capeSway: 0.3 * sn
        });
    } else if (SPRITE_FLY_DIRS[state]) {
        const [dx, dy] = SPRITE_FLY_DIRS[state];
        const lean = dx * (dy === 0 ? 15 : dy < 0 ? 11 : 20);
        const trail = -dx * (dy === 0 ? 1 : 0.8);
        Object.assign(P, {
            bob: 1.7 * sn, lean,
            legL: [-8 + trail * 20 + 5 * sn, -12 + trail * 30 + 9 * sn], legR: [8 + trail * 20 - 5 * sn, 10 + trail * 30 - 9 * sn],
            hairSway: -dx * 0.95 + 0.2 * sn, hairLift: dy < 0 ? -0.7 : dy > 0 ? 0.9 : 0.1 * cs, capeSway: -dx * 1.0 + 0.3 * sn,
            tailSwing: -dx * 0.6 + 0.4 * sn, lookX: dx * 1.2, lookY: dy * 0.9, mouth: "serio", wing: -0.6 + 0.6 * sn
        });
        if (dx !== 0) {
            const lead = dx, back = -dx;
            const leadArm = [lead * (60 + (dy < 0 ? 14 : dy > 0 ? -6 : 0)), lead * (82 + (dy < 0 ? 10 : 0)) + 5 * cs * lead];
            const backArm = [back * (34) + 4 * sn, back * (46) + 6 * sn];
            if (dx > 0) { P.armR = leadArm; P.armL = backArm; } else { P.armL = leadArm; P.armR = backArm; }
        } else if (dy < 0) {
            P.armL = [-24 + 4 * sn, -16 + 6 * sn]; P.armR = [24 - 4 * sn, 16 - 6 * sn];
        } else {
            P.armL = [-158 + 4 * sn, -172 + 3 * sn]; P.armR = [158 - 4 * sn, 172 - 3 * sn]; P.bob = 1.2 * sn - 1;
        }
    } else if (state === "attackKi") {
        const F = [
            { lean: -8, armR: [14, -40], armL: [-16, -52], ki: 3.4, eyes: "angry", mouth: "set", shiftX: -1 },
            { lean: 4, armR: [62, 80], armL: [38, 66], ki: 8, eyes: "angry", mouth: "set", shiftX: 0 },
            { lean: 11, armR: [86, 90], armL: [64, 84], ki: 14, eyes: "angry", mouth: "shout", shiftX: 0.6 },
            { lean: 8, armR: [88, 92], armL: [68, 86], ki: 17, eyes: "angry", mouth: "shout", shiftX: -0.8 },
            { lean: 3, armR: [70, 84], armL: [46, 72], ki: 9, eyes: "open", mouth: "set", shiftX: 0 }
        ][i % 5];
        Object.assign(P, {
            lean: F.lean, armR: F.armR, armL: F.armL, shiftX: F.shiftX, eyes: F.eyes, mouth: F.mouth, crouch: 1.5,
            legL: [-17, -10], legR: [15, 22], hairSway: -0.5, hairLift: 0.3, capeSway: -0.7, tailSwing: -0.5, lookX: 1.2,
            ki: { r: F.ki, follow: "R", ox: 9, flick: i, alpha: i === 4 ? 0.7 : 1 }
        });
    } else if (state === "chargeKi") {
        Object.assign(P, {
            crouch: 4, shiftX: (i % 2 ? 1 : -1) * 0.9, armL: [-40, -16], armR: [40, 16], legL: [-27, -8], legR: [27, 8],
            eyes: i % 2 ? "angry" : "closed", mouth: i === 1 || i === 3 ? "shout" : "set", hairLift: 0.65 + 0.35 * sn, hairSway: 0.3 * sn, capeSway: 0.5 * sn,
            sparks: 0.55 + 0.45 * Math.abs(sn), lookY: 0.3, tailSwing: sn
        });
    } else if (state === "parry") {
        const F = [
            { armL: [-32, -104], armR: [32, 104], shield: 0.3 },
            { armL: [-22, 140], armR: [22, -140], shield: 0.85 },
            { armL: [-22, 142], armR: [22, -142], shield: 1 },
            { armL: [-24, 132], armR: [24, -132], shield: 0.55 }
        ][i % 4];
        Object.assign(P, {
            armL: F.armL, armR: F.armR, shield: F.shield, lean: -3, crouch: 1, eyes: "angry", mouth: "set",
            legL: [-14, -8], legR: [14, 8], handL: "open", handR: "open", hairSway: 0.3, capeSway: 0.5, shiftX: i === 2 ? 0.5 : 0
        });
    } else if (state === "transform") {
        const F = [
            { crouch: 5, armL: [-32, -12], armR: [32, 12], sparks: 0.5, eyes: "angry", mouth: "set", flash: 0 },
            { crouch: 2, armL: [-58, -42], armR: [58, 42], sparks: 0.85, eyes: "closed", mouth: "shout", flash: 0.25, hairLift: 0.8 },
            { crouch: -2, armL: [-84, -176], armR: [84, 176], sparks: 1, eyes: "wide", mouth: "shout", flash: 0.95, ssj: true, hairLift: 0.9, bob: -3 },
            { crouch: -1, armL: [-52, -150], armR: [52, 150], sparks: 0.8, eyes: "angry", mouth: "shout", flash: 0.6, ssj: true, hairLift: 0.7, bob: -2 },
            { crouch: 1, armL: [-30, -14], armR: [30, 14], sparks: 0.35, eyes: "angry", mouth: "set", flash: 0.25, ssj: true, hairLift: 0.5, bob: -1 }
        ][i % 5];
        Object.assign(P, F, { legL: [-20 + F.crouch, -8], legR: [20 - F.crouch, 8], shiftX: (i % 2 ? 0.8 : -0.8) * (F.sparks > 0.5 ? 1 : 0.3), hairSway: 0.25 * sn, capeSway: 0.4 * sn });
    }
    return P;
}

// ---------------------------------------------------------------------------
// FIGURA COMPLETA
// ---------------------------------------------------------------------------
const SPRITE_FIG_SCALE = 0.85;

function spriteRenderFigure(a, pose, opts) {
    const R = spriteCtx();
    const B = spriteBuild(a);
    R.cel = B.cel;
    R.pixel = !!B.pixel;
    const skin = spriteSkin(a);
    const ssj = !!(opts && opts.ssj) || pose.ssj;
    const ctx = { skin, ssj };
    const spec = spriteOutfitSpec(a, skin, B.cel);
    const boot = spriteBootSpec(a);
    const glove = spriteGloveSpec(a);
    const kiColor = (opts && opts.kiColor) || a.kiColor || "#5be3ff";

    const armL = spriteArm(R, a, B, spec, glove, skin, -1, pose.armL, pose.handL);
    const armR = spriteArm(R, a, B, spec, glove, skin, 1, pose.armR, pose.handR);
    const legL = spriteLeg(R, a, B, spec, boot, skin, -1, pose.legL);
    const legR = spriteLeg(R, a, B, spec, boot, skin, 1, pose.legR);

    const hy = B.headY - (pose.breath || 0);
    const headParts = spriteHead(R, a, B, pose, ctx);
    const headWrap = (svg) => `<g transform="translate(48 ${_n2(hy)}) rotate(${_n2((pose.lean || 0) * -0.25 + (pose.lookX || 0) * 1.2)}) scale(${_n2(B.headRx / 12.2 * B.headScale)} ${_n2(B.headRy / 13.6 * B.headScale)})">${svg}</g>`;
    // O tronco é desenhado no espaço padrão (ombros y=45, quadril y=77) e encaixado entre torsoTop e torsoBottom.
    const tk = (B.torsoBottom - B.torsoTop) / 32;
    const torsoWrap = (svg) => tk === 1 && B.torsoTop === 45 ? svg : `<g transform="translate(0 ${_n2(B.torsoTop - 45 * tk)}) scale(1 ${_n2(tk)})">${svg}</g>`;

    let fig = "";
    fig += spriteBack(R, a, B, pose, skin);
    fig += headWrap(headParts.back);          // cabelo comprido fica ATRÁS do corpo
    fig += legL.svg + legR.svg;
    fig += armL.svg;                          // braço de trás (esquerdo, lado oposto ao adversário) some atrás do tronco
    let torso = spriteTorso(R, a, B, spec, skin, pose);
    if (a.tail === "cinto_saiyajin") {
        torso += spritePath(`M${_n2(48 - B.ww / 2 - 1)} 66.6 L${_n2(48 + B.ww / 2 + 1)} 66.6 L${_n2(48 + B.ww / 2 + 1.6)} 71.4 L${_n2(48 - B.ww / 2 - 1.6)} 71.4 Z`, R.lin(0, 66, 0, 72, [[0, "#b98a52"], [1, "#6d4522"]]));
        torso += spriteTaper([[40, 70], [37, 76], [39, 82 + (pose.tailSwing || 0) * 1.5], [41, 86]], 3.4, 2.2, "#8a5a2b", "#c9a26a");
    }
    torso += spriteSymbol(a, B);
    fig += torsoWrap(torso);
    fig += armR.svg;                          // braço da frente (direito, rumo ao adversário) fica por cima
    fig += torsoWrap(spriteShoulderPads(R, a, B));

    // cabeça (com leve inclinação e olhar)
    fig += headWrap(headParts.front);

    R.cel = false;   // efeitos (ki, escudo, brilho, aura) continuam com degradê suave
    if (pose.ki) {
        const h = pose.ki.follow === "R" ? armR.hand : armL.hand;
        fig += spriteKiBall(R, h[0] + (pose.ki.ox || 0), h[1], pose.ki.r, kiColor, pose.ki.flick || 0);
    }
    if (pose.shield > 0) {
        const sh = R.rad(48, 62, 40, [[0.55, kiColor, 0], [0.86, kiColor, 0.25 * pose.shield], [1, "#ffffff", 0.75 * pose.shield]]);
        fig += `<ellipse cx="48" cy="62" rx="33" ry="43" fill="${sh}" stroke="${spriteShade(kiColor, 0.55)}" stroke-width="1.6" opacity="${_n2(0.9 * pose.shield)}"/>`;
        fig += `<path d="M22 46 Q48 28 74 46" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="${_n2(0.7 * pose.shield)}"/>`;
    }

    // luz de contorno (rim light) sobre a figura toda + brilho dourado quando transformado
    let behind = "";
    if (pose.flash > 0 || ssj) {
        const f = Math.max(pose.flash, ssj ? 0.4 : 0);
        behind += `<ellipse cx="48" cy="62" rx="${_n2(30 + f * 14)}" ry="${_n2(46 + f * 12)}" fill="${R.rad(48, 62, 56, [[0, "#fff7b8", 0.85 * f], [0.55, "#ffd93b", 0.45 * f], [1, "#ffb300", 0]])}"/>`;
    }
    let front = "";
    if (pose.sparks > 0) front += spriteSparks(pose.sparks, (opts && opts.seed) || 0, ssj ? "#ffe34d" : kiColor);
    if (pose.flash > 0.5) front += `<ellipse cx="48" cy="60" rx="34" ry="46" fill="${R.rad(48, 60, 52, [[0, "#ffffff", 0.75 * pose.flash], [1, "#ffffff", 0]])}"/>`;

    const scale = SPRITE_FIG_SCALE * B.scale;
    const bob = (pose.bob || 0) + (pose.crouch || 0);
    const t = `translate(${_n2(48 + (pose.shiftX || 0))} ${_n2(SPRITE_FEET_Y + bob)}) scale(${_n2(scale)}) translate(-48 -${SPRITE_FEET_Y_LOCAL})`;
    const rot = `rotate(${_n2(pose.lean || 0)} 48 70)`;
    return { R, body: `<g transform="${t}"><g transform="${rot}">${behind}${fig}${front}</g></g>` };
}
const SPRITE_FEET_Y = 103;          // linha do chão no viewBox
const SPRITE_FEET_Y_LOCAL = 106;    // onde ficam os pés no desenho local (antes da escala)

function generateSpriteFrameSvg(appearance, state, frameIndex, opts) {
    const a = normalizeAppearance(appearance);
    const n = SPRITE_FRAME_COUNTS[state] || 1;
    const idx = ((frameIndex % n) + n) % n;
    const pose = spritePoseFor(SPRITE_STATES.includes(state) ? state : "idle", idx, n);
    const { R, body } = spriteRenderFigure(a, pose, Object.assign({ seed: idx }, opts || {}));
    const W = Math.round(SPRITE_VIEW.w * SPRITE_RASTER_SCALE), H = Math.round(SPRITE_VIEW.h * SPRITE_RASTER_SCALE);
    if (R.pixel) {
        // Estilo pixel art: sem suavização de bordas (cores chapadas, sem "borrado") e traços com pelo menos ~1 pixel
        // na tela do jogo (no jogo, 1 pixel = 2 unidades deste desenho) — senão os contornos internos somem.
        const crisp = body.replace(/stroke-width="([\d.]+)"/g, (m, v) => `stroke-width="${_n2(+v >= 1 ? Math.max(+v, 1.9) : +v)}"`);
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${SPRITE_VIEW.w} ${SPRITE_VIEW.h}" shape-rendering="crispEdges"><defs>${R.defs.join("")}</defs>${crisp}</svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${SPRITE_VIEW.w} ${SPRITE_VIEW.h}"><defs>${R.defs.join("")}</defs>${body}</svg>`;
}

function spriteSvgToUrl(svg) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function generateSpriteFrameUrl(appearance, state, frameIndex, opts) {
    return spriteSvgToUrl(generateSpriteFrameSvg(appearance, state, frameIndex, opts));
}

// Todos os quadros de um estado (com cache: gerar SVG é barato, mas não precisa repetir a cada partida).
const _spriteFrameCache = {};
function getProceduralFrameUrls(appearance, state, opts) {
    const a = normalizeAppearance(appearance);
    const o = opts || {};
    const key = JSON.stringify([a, state, !!o.ssj, o.kiColor || ""]);
    if (_spriteFrameCache[key]) return _spriteFrameCache[key];
    const n = SPRITE_FRAME_COUNTS[state] || 1;
    const frames = [];
    for (let i = 0; i < n; i++) frames.push(generateSpriteFrameUrl(a, state, i, o));
    _spriteFrameCache[key] = frames;
    return frames;
}

// ---------------------------------------------------------------------------
// MODELOS (presets): personagens do anime montados com as peças do construtor.
// ---------------------------------------------------------------------------
const SPRITE_PRESETS = {
    goku: { label: "Goku", appearance: { race: "Saiyajin", build: "musculoso", proporcao: "anime", hairStyle: "goku", hairColor: "#16110f", eyeType: "normal", irisColor: "#1a1210", mouthType: "smile", outerShirt: "kimono", innerShirt: "regata", pants: "larga", shoes: "botas_artes", gloves: "pulseiras", primaryColor: "#f2680d", secondaryColor: "#1c45b0", accentColor: "#f7d23c", symbol: "kai", kiColor: "#5be3ff" } },
    vegeta: { label: "Vegeta", appearance: { race: "Saiyajin", build: "normal", hairStyle: "vegeta", hairColor: "#100e18", eyeType: "serio", irisColor: "#161a24", mouthType: "serio", outerShirt: "armadura_saiyajin", innerShirt: "malha", pants: "justa", shoes: "botas_saiyajin", gloves: "luvas_saiyajin", primaryColor: "#1b3fa0", secondaryColor: "#f4f4f8", accentColor: "#e8b93a", kiColor: "#ffe45a" } },
    piccolo: { label: "Piccolo", appearance: { race: "Namekuseijin", build: "musculoso", hairStyle: "careca", eyeType: "bravo", irisColor: "#151515", earType: "pontuda", mouthType: "serio", accessory: "antenas", hat: "turbante", outerShirt: "gi_piccolo", innerShirt: "nenhuma", pants: "larga", shoes: "botas_marrons", gloves: "nenhuma", primaryColor: "#5b2e91", secondaryColor: "#20336f", accentColor: "#f5f5f7", cape: "capa_ombreiras", capeColor: "#f6f6f8", kiColor: "#e9ff7a" } },
    freeza: { label: "Freeza (final)", appearance: { race: "Raça Freeza", build: "magro", hairStyle: "careca", eyeType: "freeza", irisColor: "#d81f3f", earType: "nenhuma", mouthType: "serio", accessory: "chifres", outerShirt: "armadura_freeza", innerShirt: "nenhuma", pants: "nenhuma", shoes: "descalco", gloves: "nenhuma", primaryColor: "#7f4fc0", secondaryColor: "#3a1d6a", accentColor: "#e7d3ff", tail: "freeza", kiColor: "#ff5be0" } },
    trunks: { label: "Trunks do Futuro", appearance: { race: "Saiyajin", build: "normal", hairStyle: "trunks_futuro", hairColor: "#8c7ee0", eyeType: "serio", irisColor: "#2a4a86", mouthType: "serio", outerShirt: "jaqueta_trunks", innerShirt: "malha", pants: "justa", shoes: "botas_trunks", gloves: "nenhuma", primaryColor: "#3f66c8", secondaryColor: "#20263a", accentColor: "#d7b25a", symbol: "cc", backWeapon: "espada_trunks", kiColor: "#9fd0ff" } },
    gohan: { label: "Gohan (jovem)", appearance: { race: "Saiyajin", build: "normal", hairStyle: "gohan", hairColor: "#16110f", eyeType: "gentil", irisColor: "#1a1210", mouthType: "smile", outerShirt: "gi_piccolo", innerShirt: "nenhuma", pants: "larga", shoes: "botas_marrons", gloves: "nenhuma", primaryColor: "#5b2e91", secondaryColor: "#20336f", accentColor: "#f5f5f7", cape: "capa_ombreiras", capeColor: "#f6f6f8", kiColor: "#ffd45b" } },
    kaioshin: { label: "Supremo Sr. Kaio", appearance: { race: "Kaioshin", build: "magro", hairStyle: "kaioshin_moicano", hairColor: "#f4f4f4", eyeType: "gentil", irisColor: "#2a2a44", earType: "pontuda", mouthType: "smile", accessory: "potara", outerShirt: "roupa_kaioshin", innerShirt: "nenhuma", pants: "larga", shoes: "botas_kaioshin", gloves: "nenhuma", primaryColor: "#5648b8", secondaryColor: "#f3eedd", accentColor: "#f2c94c", kiColor: "#c9a0ff" } },
    fusao: { label: "Fusão (Gogeta)", appearance: { race: "Saiyajin", build: "musculoso", hairStyle: "goku", hairColor: "#111018", eyeType: "serio", irisColor: "#161a24", mouthType: "maligno", accessory: "potara", outerShirt: "colete_fusao", innerShirt: "malha", pants: "larga", shoes: "botas_saiyajin", gloves: "pulseiras", primaryColor: "#1c3fb0", secondaryColor: "#2a2f45", accentColor: "#f5c518", kiColor: "#7fd8ff" } },
    bardock: { label: "Bardock", appearance: { race: "Saiyajin", build: "musculoso", hairStyle: "bardock", hairColor: "#0e0c10", eyeType: "bravo", irisColor: "#141014", mouthType: "maligno", hat: "faixa", accessory: "scouter", outerShirt: "armadura_saiyajin", innerShirt: "malha", pants: "justa", shoes: "botas_saiyajin", gloves: "luvas_pretas", primaryColor: "#2b2430", secondaryColor: "#5a4636", accentColor: "#b88a3a", tail: "cinto_saiyajin", scar: "bochecha", kiColor: "#ff9a5b" } },
    android17: { label: "Androide 17", appearance: { race: "Android", build: "normal", hairStyle: "android17", hairColor: "#12121a", eyeType: "android", irisColor: "#3a6fa8", mouthType: "serio", outerShirt: "traje_android", innerShirt: "malha", pants: "justa", shoes: "botas_marrons", gloves: "nenhuma", primaryColor: "#24262f", secondaryColor: "#2f3a55", accentColor: "#e8752a", kiColor: "#ffe07a" } },
    android18: { label: "Androide 18", appearance: { race: "Android", build: "magro", hairStyle: "android18", hairColor: "#ffe27a", eyeType: "android", irisColor: "#4aa3e8", mouthType: "serio", outerShirt: "traje_android", innerShirt: "malha", pants: "justa", shoes: "botas_marrons", gloves: "nenhuma", primaryColor: "#33507a", secondaryColor: "#20293a", accentColor: "#f4f1e8", kiColor: "#a9e3ff" } },
    majin: { label: "Majin Buu", appearance: { race: "Majin", build: "gigante", hairStyle: "careca", eyeType: "normal", irisColor: "#101010", mouthType: "smile", accessory: "majin_antena", outerShirt: "none", innerShirt: "nenhuma", pants: "larga", shoes: "botas_marrons", gloves: "nenhuma", primaryColor: "#f4f1e8", secondaryColor: "#7a3f8f", accentColor: "#d7a23a", cape: "capa", capeColor: "#5a2f7a", kiColor: "#ff9de0" } },
    raditz: { label: "Raditz", appearance: { race: "Saiyajin", build: "musculoso", hairStyle: "raditz", hairColor: "#0e0c10", eyeType: "serio", irisColor: "#141014", mouthType: "maligno", accessory: "scouter", outerShirt: "armadura_saiyajin", innerShirt: "malha", pants: "justa", shoes: "botas_saiyajin", gloves: "luvas_pretas", primaryColor: "#232c48", secondaryColor: "#c9c2b8", accentColor: "#c9a13a", tail: "saiyajin", kiColor: "#ff7ad9" } },
    broly: { label: "Broly", appearance: { race: "Saiyajin", build: "gigante", hairStyle: "broly", hairColor: "#213018", eyeType: "bravo", irisColor: "#1a2a1a", mouthType: "serio", outerShirt: "none", innerShirt: "nenhuma", pants: "larga", shoes: "descalco", gloves: "pulseiras", primaryColor: "#8a6a2a", secondaryColor: "#c9a13a", accentColor: "#e8c04a", kiColor: "#7dff7a" } }
};


if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        SPRITE_VIEW, SPRITE_STATES, SPRITE_FRAME_COUNTS, SPRITE_PRESETS, SPRITE_DEFAULT_APPEARANCE,
        normalizeAppearance, spritePoseFor, generateSpriteFrameSvg, generateSpriteFrameUrl, getProceduralFrameUrls, spriteSvgToUrl,
        spriteMix, spriteShade
    };
}
