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
    "Saiyajin": "#f3c29a", "Humano": "#f7d1b1", "Namekuseijin": "#62c24a", "Raça Freeza": "#f1eef6",
    "Majin": "#ff9fc9", "Android": "#f6d3b0", "Bio-Androide": "#eee2ef", "Kaioshin": "#c9a6e8", "Alienígena": "#8d76e0", "ET/Alienígena genérico": "#8d76e0"
};

const SPRITE_DEFAULT_APPEARANCE = {
    gender: "masculino", race: "Saiyajin", build: "normal", skinColor: "",
    hairStyle: "goku", hairColor: "#16110f",
    eyeType: "normal", irisColor: "#1a1210", scleraColor: "#ffffff",
    earType: "normal", mouthType: "smile", headFeature: "none", bodyMarks: "none", accessory: "none", hat: "none",
    innerShirt: "regata", outerShirt: "kimono", pants: "larga", shoes: "botas_artes", gloves: "pulseiras",
    primaryColor: "#f26a0f", secondaryColor: "#1f4fbf", accentColor: "#ffd23f", shirtColor: "#1f4fbf", pantsColor: "#f26a0f",
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
    delete a.proporcao;   // escolha de estilo de versões antigas (só existe o desenho atual)
    if (!app || app.bodyMarks === undefined) spriteLegacyFeatures(a, app || {});
    if (!app || app.pantsColor === undefined) spriteLegacyClothes(a);
    if (a.innerShirt === "regata" && a.outerShirt === "none") a.innerShirt = "regata";
    return a;
}

// Aparência salva antes de as características ficarem separadas da raça: orelhas, antenas/chifres, domo e placas
// do Freeza, buracos do Majin, marcas do Namek/Cell eram decididos pela raça (ou misturados no "acessório").
// Converte para os campos novos sem mudar o desenho de quem já existia.
const SPRITE_RACE_FEATURES = {
    "Namekuseijin": { earType: "pontuda", bodyMarks: "namek" }, "Kaioshin": { earType: "pontuda", bodyMarks: "none" },
    "Majin": { earType: "majin", bodyMarks: "none" }, "Raça Freeza": { earType: "nenhuma", bodyMarks: "freeza" },
    "Bio-Androide": { earType: "normal", bodyMarks: "cell" }
};
function spriteLegacyFeatures(a, raw) {
    const byRace = SPRITE_RACE_FEATURES[a.race] || { earType: "normal", bodyMarks: "none" };
    if (a.earType === "freeza_placa") a.earType = "nenhuma";
    // antes, a raça mandava nas orelhas (Namek/Kaioshin pontudas, Freeza sem, Majin com buracos); senão, a escolha
    if (a.earType !== "pontuda") a.earType = byRace.earType !== "normal" ? byRace.earType : (a.earType === "nenhuma" ? "nenhuma" : "normal");
    a.bodyMarks = byRace.bodyMarks;
    if (["antenas", "majin_antena", "chifres"].includes(a.accessory)) { a.headFeature = a.accessory; a.accessory = "none"; }
    if (raw.gender === undefined && a.hairStyle === "android18") a.gender = "feminino";
}

// Aparência salva antes de cada peça de roupa ter sua própria parte do corpo: a "roupa de cima" decidia a cor
// da calça e das mangas (e a armadura Saiyajin pintava o corpo todo). Converte para camisa/calça com cor própria,
// mantendo o mesmo desenho.
function spriteLegacyClothes(a) {
    const P = a.primaryColor, S = a.secondaryColor, o = a.outerShirt, inner = a.innerShirt;
    const oldLeg = { jaqueta_trunks: spriteShade(S, -0.05), colete_fusao: "#f4f1e8", roupa_kaioshin: S, traje_android: S }[o];
    a.pantsColor = oldLeg || P;
    a.shirtColor = S;
    if (o === "armadura_saiyajin") { a.innerShirt = "malha"; a.shirtColor = P; }   // o macacão por baixo da armadura
    else if (o === "armadura_freeza") { a.innerShirt = "nenhuma"; a.pants = "nenhuma"; }
    else if (o === "colete_fusao") { if (inner !== "nenhuma") { a.innerShirt = "regata"; a.shirtColor = spriteShade(S, -0.1); } }
    else if (o === "kimono") { if (inner !== "nenhuma") a.innerShirt = "camiseta"; }   // a camiseta de manguinha do Goku
    else if (o === "jaqueta_trunks") { if (inner === "nenhuma") a.innerShirt = "regata"; }
    else if (o !== "traje_android" && o !== "armadura_cell" && inner === "malha") a.innerShirt = "regata";
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
    // hairScale: tamanho do cabelo em relação à cabeça; sw/ww/hw: ombros/cintura/quadril; arm/leg: grossura dos membros.
    const B = Object.assign({}, SPRITE_ANIME_BODY.comum, SPRITE_ANIME_BODY[a.build] || SPRITE_ANIME_BODY.normal);
    if (a.gender === "feminino") {
        // corpo feminino: ombros e cintura mais finos, quadril um pouco mais largo, braços e pernas mais delicados
        B.sw *= 0.86; B.ww *= B.belly ? 0.94 : 0.86; B.hw *= 1.06; B.arm *= 0.86; B.leg *= 0.94; B.female = true;
    }
    // quanto os músculos aparecem (marcas e volume): bem marcados no musculoso/gigante, leves no magro/jovem,
    // só tônus no corpo feminino e nenhum no gordo (Majin Boo)
    B.mus = B.belly ? 0 : (SPRITE_MUSCLE_LEVEL[a.build] !== undefined ? SPRITE_MUSCLE_LEVEL[a.build] : 0.7);
    if (B.female) B.mus *= 0.45;
    return B;
}

const SPRITE_MUSCLE_LEVEL = { musculoso: 1, gigante: 1, normal: 0.7, magro: 0.4, jovem: 0.35, gordo: 0 };

// Linha de músculo desenhada ao longo de um membro: de t0 a t1 do segmento, deslocada da linha do meio por "off"
// (em larguras do membro; positivo = lado da luz) e curvada por "curv". É o traço que separa bíceps/tríceps,
// quadríceps, panturrilha etc. — como nos desenhos de Dragon Ball.
function spriteMuscleLine(x1, y1, x2, y2, w, t0, t1, off, curv, color, width, opacity) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    if (nx * SPRITE_LIGHT.x + ny * SPRITE_LIGHT.y < 0) { nx = -nx; ny = -ny; }
    const at = (t, o) => [x1 + dx * t + nx * o * w, y1 + dy * t + ny * o * w];
    const p0 = at(t0, off), p1 = at(t1, off), m = at((t0 + t1) / 2, off + curv);
    return `<path d="M${_n2(p0[0])} ${_n2(p0[1])} Q${_n2(m[0])} ${_n2(m[1])} ${_n2(p1[0])} ${_n2(p1[1])}" fill="none" stroke="${color}" stroke-width="${_n2(width)}" stroke-linecap="round" opacity="${_n2(opacity)}"/>`;
}

// Raça do Freeza (formas 1 a 3): braços, pernas, barriga e cauda rosados com listras; rosto, mãos e pés na cor da pele.
const SPRITE_MARCAS_ROSA = ["listras_freeza", "carapaca_freeza"];
const SPRITE_ROSA_FREEZA = "#ee7d98";
const SPRITE_METAL = "#c3ccd9";

// Formas do Cell: cor de cada parte do corpo à mostra (verde escuro/claro, chapas pretas), como nas referências.
// up = bíceps, lo = antebraço, coxa, canela, tronco = cor de fundo do tronco; verdes = onde vão as pintas pretas.
const SPRITE_CELL = {
    cell_imperfeito: { L: "#86bf3e", D: "#3e8a2c", up: "L", lo: "D", coxa: "L", canela: "D", tronco: "L", pe: "D" },
    cell_semi: { L: "#b5cf45", D: "#2f9440", up: "L", lo: "K", coxa: "L", canela: "K", tronco: "D", pe: "K" },
    cell_perfeito: { L: "#a6d54a", D: "#a6d54a", pinta: "#2f7a2a", up: "L", lo: "L", coxa: "L", canela: "K", tronco: "L", pe: "K" }   // perfeito: tudo verde claro, pintas verde escuro
};
const SPRITE_CELL_PRETO = "#17141c", SPRITE_CELL_LARANJA = "#e8662a", SPRITE_CELL_JUNTA = "#2e3a8c";
function spriteCellCores(a) {
    const c = SPRITE_CELL[a.bodyMarks];
    if (!c) return null;
    const cor = (k) => k === "K" ? SPRITE_CELL_PRETO : c[k];
    return { L: c.L, D: c.D, pinta: c.pinta || "#141414", up: cor(c.up), lo: cor(c.lo), coxa: cor(c.coxa), canela: cor(c.canela), tronco: cor(c.tronco), pe: cor(c.pe), verde: (x) => x === c.L || x === c.D };
}
// Pintas pretas espalhadas ao longo de um membro verde (posições fixas por "semente", sempre iguais)
function spriteCellPintas(x1, y1, x2, y2, w1, w2, n, semente, cor) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    let s = "";
    for (let i = 0; i < n; i++) {
        const r1 = Math.abs(Math.sin((i + 1) * 12.9898 + semente * 78.233)), r2 = Math.abs(Math.sin((i + 1) * 39.346 + semente * 11.135));
        const t = 0.12 + 0.76 * ((i + r1 * 0.8) / n), w = w1 + (w2 - w1) * t, off = (r2 - 0.5) * w * 0.62;
        const rr = w * (0.08 + r1 * 0.06);
        s += `<ellipse cx="${_n2(x1 + dx * t + nx * off)}" cy="${_n2(y1 + dy * t + ny * off)}" rx="${_n2(rr)}" ry="${_n2(rr * 0.8)}" fill="${cor || "#141414"}"/>`;
    }
    return s;
}   // partes de metal do Freeza ciborgue
const SPRITE_MARCAS_FREEZA = ["freeza", "listras_freeza", "carapaca_freeza", "metal_freeza"];   // lábios roxos
function spriteLimbSkin(a, skin) { return SPRITE_MARCAS_ROSA.includes(a.bodyMarks) ? SPRITE_ROSA_FREEZA : skin; }

// Listras atravessando um membro (pele listrada do Freeza, estrias do Namek, segmentos de metal): n traços
// perpendiculares de t0 a t1, acompanhando a grossura do membro (w1 no início, w2 no fim).
function spriteStripes(x1, y1, x2, y2, w1, w2, t0, t1, n, color, width, opacity, frac) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, ux = dx / len, uy = dy / len;
    let d = "";
    for (let i = 0; i < n; i++) {
        const t = n === 1 ? (t0 + t1) / 2 : t0 + (t1 - t0) * i / (n - 1);
        const cx = x1 + dx * t, cy = y1 + dy * t, h = (w1 + (w2 - w1) * t) * (frac || 0.44);
        d += `M${_n2(cx - nx * h)} ${_n2(cy - ny * h)} Q${_n2(cx + ux * 0.8)} ${_n2(cy + uy * 0.8)} ${_n2(cx + nx * h)} ${_n2(cy + ny * h)} `;
    }
    return `<path d="${d.trim()}" fill="none" stroke="${color}" stroke-width="${_n2(width)}" stroke-linecap="round" opacity="${_n2(opacity)}"/>`;
}

// Meia peça sobre um membro (braçadeira/caneleira do Freeza): o lado da sombra numa segunda cor, com frisos.
function spriteHalfGuard(x1, y1, x2, y2, w1, w2, color, ribs) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    if (nx * SPRITE_LIGHT.x + ny * SPRITE_LIGHT.y < 0) { nx = -nx; ny = -ny; }   // n aponta para a luz; a peça fica do outro lado
    const p = [[x1 - nx * w1 * 0.06, y1 - ny * w1 * 0.06], [x2 - nx * w2 * 0.06, y2 - ny * w2 * 0.06], [x2 - nx * w2 * 0.5, y2 - ny * w2 * 0.5], [x1 - nx * w1 * 0.5, y1 - ny * w1 * 0.5]];
    const fill = `<path d="M${p.map(q => `${_n2(q[0])} ${_n2(q[1])}`).join(" L")} Z" fill="${color}" stroke="${SPRITE_OUTLINE}" stroke-width="0.7" stroke-linejoin="round"/>`;
    const lines = ribs ? spriteStripes(x1 - nx * w1 * 0.28, y1 - ny * w1 * 0.28, x2 - nx * w2 * 0.28, y2 - ny * w2 * 0.28, w1 * 0.5, w2 * 0.5, 0.18, 0.82, ribs, spriteShade(color, -0.45), 0.7, 0.85) : "";
    return fill + lines;
}

// Sapatos do Cell: preto com pontas laranjas dos lados (2ª forma) ou amarelo-laranja comprido de ponta (perfeito).
function spriteCellShoe(f, side, rot, tipo) {
    const o = SPRITE_OUTLINE, x = f[0], y = f[1], sd = side;
    let g;
    if (tipo === "semi") {
        g = `<path d="M${_n2(x - sd * 3.8)} ${_n2(y - 2)} L${_n2(x + sd * 3)} ${_n2(y - 2)} Q${_n2(x + sd * 7)} ${_n2(y)} ${_n2(x + sd * 8)} ${_n2(y + 3.4)} L${_n2(x - sd * 4.2)} ${_n2(y + 3.8)} Z" fill="${SPRITE_CELL_PRETO}" stroke="${o}" stroke-width="1.1" stroke-linejoin="round"/>`;
        g += `<path d="M${_n2(x + sd * 4.4)} ${_n2(y + 0.4)} L${_n2(x + sd * 9.4)} ${_n2(y + 3.6)} L${_n2(x + sd * 4)} ${_n2(y + 3.8)} Z M${_n2(x - sd * 2.4)} ${_n2(y + 1.6)} L${_n2(x - sd * 6)} ${_n2(y + 3.8)} L${_n2(x - sd * 2)} ${_n2(y + 3.8)} Z" fill="${SPRITE_CELL_LARANJA}" stroke="${o}" stroke-width="0.7" stroke-linejoin="round"/>`;
    } else {
        const ouro = "#f2c24a";
        g = `<path d="M${_n2(x - sd * 3.6)} ${_n2(y - 2.4)} L${_n2(x + sd * 2.6)} ${_n2(y - 2.4)} Q${_n2(x + sd * 6)} ${_n2(y - 0.6)} ${_n2(x + sd * 10.6)} ${_n2(y + 1.6)} Q${_n2(x + sd * 7)} ${_n2(y + 3.8)} ${_n2(x - sd * 4)} ${_n2(y + 3.8)} Z" fill="${ouro}" stroke="${o}" stroke-width="1.1" stroke-linejoin="round"/>`;
        g += `<path d="M${_n2(x - sd * 2.6)} ${_n2(y - 1.2)} Q${_n2(x + sd * 3)} ${_n2(y - 1.2)} ${_n2(x + sd * 8)} ${_n2(y + 1.2)}" fill="none" stroke="#fff3c2" stroke-width="0.9" opacity="0.8"/>`;
    }
    return `<g transform="rotate(${_n2(rot)} ${_n2(x)} ${_n2(y)})">${g}</g>`;
}

// Pé de 3 dedos (raça do Freeza): sola comprida, dedos para a frente e garras pretas.
function spriteClawFoot(f, side, rot, color) {
    const o = SPRITE_OUTLINE, x = f[0], y = f[1], sd = side;
    const dark = spriteShade(color, -0.4), light = spriteShade(color, 0.35);
    let g = `<path d="M${_n2(x - sd * 3.6)} ${_n2(y - 1.4)} L${_n2(x + sd * 2.6)} ${_n2(y - 1.2)} Q${_n2(x + sd * 4.4)} ${_n2(y + 0.4)} ${_n2(x + sd * 4.6)} ${_n2(y + 3.2)} L${_n2(x - sd * 3.8)} ${_n2(y + 3.6)} Z" fill="${color}" stroke="${o}" stroke-width="1.1" stroke-linejoin="round"/>`;
    [[0.4, 1.1, 8.6], [2.0, 2.4, 9.6], [3.4, 3.4, 8.2]].forEach(([dy0, dy1, len]) => {
        const bx = x + sd * 3, tx = x + sd * len;
        g += `<path d="M${_n2(bx)} ${_n2(y + dy0 - 0.9)} Q${_n2(tx - sd * 1.2)} ${_n2(y + dy1 - 1.1)} ${_n2(tx)} ${_n2(y + dy1)} Q${_n2(tx - sd * 1.4)} ${_n2(y + dy1 + 0.9)} ${_n2(bx)} ${_n2(y + dy0 + 0.9)} Z" fill="${color}" stroke="${o}" stroke-width="0.9" stroke-linejoin="round"/>`;
        g += `<path d="M${_n2(tx - sd * 0.2)} ${_n2(y + dy1 - 0.7)} L${_n2(tx + sd * 1.8)} ${_n2(y + dy1 + 0.2)} L${_n2(tx - sd * 0.2)} ${_n2(y + dy1 + 0.8)} Z" fill="#141018"/>`;
    });
    g += `<path d="M${_n2(x - sd * 3)} ${_n2(y - 0.4)} L${_n2(x + sd * 2.4)} ${_n2(y - 0.2)}" stroke="${light}" stroke-width="0.9" opacity="0.7"/>`;
    g += `<path d="M${_n2(x - sd * 3.4)} ${_n2(y + 2.8)} L${_n2(x + sd * 3.6)} ${_n2(y + 2.6)}" stroke="${dark}" stroke-width="1"/>`;
    return `<g transform="rotate(${_n2(rot)} ${_n2(x)} ${_n2(y)})">${g}</g>`;
}

// Proporções de anime (como os sprites de luta de Dragon Ball): cabeça menor, pernas longas, ombros largos e
// cintura fina (~5 cabeças de altura), sombras recortadas.
const SPRITE_ANIME_BODY = {
    comum: { headRx: 12.2, headRy: 13.6, headScale: 1, headY: 21.4, torsoTop: 36.5, torsoBottom: 62, shoulderY: 39.2, hipY: 60.4,
        l1: 15.5, l2: 14.5, t1: 22, t2: 22, hairScale: 1, bulk: 0, scale: 0.94 },
    normal: { sw: 29, ww: 16, hw: 18, arm: 7.4, leg: 8.2 },
    musculoso: { sw: 34, ww: 17.5, hw: 20, arm: 8.8, leg: 9.2 },
    magro: { sw: 24, ww: 14, hw: 16, arm: 5.4, leg: 7 },
    gigante: { sw: 40, ww: 24, hw: 25, arm: 10, leg: 11, scale: 1.05 },
    jovem: { sw: 21, ww: 13, hw: 15, arm: 5, leg: 6.6, headScale: 0.86, scale: 0.8 },
    // gordo (Majin Boo): barrigão redondo, pernas curtas, cabeça um pouco maior
    gordo: { sw: 30, ww: 46, hw: 34, arm: 9, leg: 10.5, torsoTop: 40, torsoBottom: 77, shoulderY: 43.5, hipY: 75, t1: 14.5, t2: 14.5,
        l1: 13, l2: 12.5, headY: 26.5, headScale: 1.04, belly: true }
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
    const base = `<line ${P} stroke="${SPRITE_OUTLINE}" stroke-width="${_n2(w + 2.2)}" stroke-linecap="${cap}"/>`;
    const fill = `<line ${P} stroke="${color}" stroke-width="${_n2(w)}" stroke-linecap="${cap}"/>`;
    const shade = `<line ${off(-w * 0.27)} stroke="${spriteShade(color, -0.34)}" stroke-width="${_n2(w * 0.3)}" stroke-linecap="${cap}" opacity="0.55"/>` +
        `<line ${off(w * 0.2)} stroke="${spriteShade(color, 0.42)}" stroke-width="${_n2(w * 0.26)}" stroke-linecap="${cap}" opacity="0.6"/>`;
    if (o.parts) return { base, fill, shade };   // para juntar membros sem risco na junta (spriteJoined)
    return base + fill + shade;
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

// Placa brilhante oval sobre um membro (ex.: Freeza forma final: antebraço e canela roxos).
function spritePlate(R, x1, y1, x2, y2, t, len, w, color) {
    const cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t;
    const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    const fill = R.lin(cx - w, cy - w, cx + w, cy + w, [[0, spriteShade(color, 0.45)], [0.4, color], [1, spriteShade(color, -0.4)]]);
    return `<g transform="rotate(${_n2(ang)} ${_n2(cx)} ${_n2(cy)})"><ellipse cx="${_n2(cx)}" cy="${_n2(cy)}" rx="${_n2(len / 2)}" ry="${_n2(w / 2)}" fill="${fill}" stroke="${SPRITE_OUTLINE}" stroke-width="1"/></g>`;
}

// Pintas pretas ao longo de um segmento (Cell), alternando de lado.
function spriteSpots(x1, y1, x2, y2, ts, r) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    return ts.map((t, i) => {
        const side = (i % 2 ? 1 : -1) * r * 0.9;
        return `<ellipse cx="${_n2(x1 + dx * t + nx * side)}" cy="${_n2(y1 + dy * t + ny * side)}" rx="${_n2(r)}" ry="${_n2(r * 0.8)}" fill="#141414"/>`;
    }).join("");
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
function spriteHair(R, style, color, sway, lift, ssj) {
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
    // Cabelo de anime desenhado como UMA silhueta: lista de pontos { t: ponta, v: vale, k: curvatura } a partir
    // da têmpora esquerda. As pontas balançam com o movimento; preto/cor chapada com sombra embaixo.
    const animeTip = (x, y) => { const h = Math.max(0, -y - 4); return [x * hs + sway * h * 0.22, y * hs - lift * h * 0.12]; };
    const animeFill = R.lin(0, -40, 0, 8, [[0, spriteShade(color, ssj ? 0.18 : 0.05)], [0.7, color], [1, dark]]);
    const animeGlowColor = spriteShade(color, ssj ? 0.45 : 0.2);
    const animePiece = (dd) => spritePath(dd, animeFill);
    const animeSilhouette = (outline) => {
        const P = (pt) => `${_n2(pt[0])} ${_n2(pt[1])}`;
        let d = `M${P(outline[0])}`, prev = outline[0];
        for (let i = 1; i < outline.length; i++) {
            const { t, v } = outline[i], T = animeTip(t[0], t[1]), k = outline[i].k === undefined ? 0.2 : outline[i].k;
            const c1 = [(prev[0] + T[0]) / 2 + (T[1] - prev[1]) * k, (prev[1] + T[1]) / 2 - (T[0] - prev[0]) * k];
            const c2 = [(T[0] + v[0]) / 2 + (v[1] - T[1]) * 0.08, (T[1] + v[1]) / 2 - (v[0] - T[0]) * 0.08];
            d += ` Q${P(c1)} ${P(T)} Q${P(c2)} ${P(v)}`;
            prev = v;
        }
        return animePiece(d + " Z");
    };
    const animeGlow = (b, t, w) => spritePath(spriteSpike(b[0], b[1], animeTip(t[0], t[1])[0], animeTip(t[0], t[1])[1], w, 0), animeGlowColor, `opacity="0.9"`, "");
    const animeCap = () => spritePath("M-12.9 -1 C-14.4 -15 -6.4 -17.4 0 -17.4 C6.4 -17.4 14.4 -15 12.9 -1 L10.6 -5.2 Q6 -9.6 0 -8.2 Q-6 -9.6 -10.6 -5.2 Z", animeFill);

    switch (style) {
        case "goku": {
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
        case "vegeta": {
            // Chama alta do Vegeta: lados quase retos subindo das têmporas, coroa de espetos no alto e o "bico"
            // (entradas) na testa.
            const tipV = (x, y) => { const h = Math.max(0, -y - 4); return [x * hs + sway * h * 0.18, y * hs - lift * h * 0.1]; };
            const pts = [[-12.6, -1], [-15.6, -16], [-15, -29, 1], [-11, -27], [-8.4, -40, 1], [-3.6, -33], [1, -46, 1], [4.6, -33], [9, -40, 1], [11.4, -27], [15.4, -29, 1], [15.8, -16], [12.8, -1]];
            let d = "";
            pts.forEach((p, i) => { const q = p[2] ? tipV(p[0], p[1]) : p; d += `${i ? " L" : "M"}${_n2(q[0])} ${_n2(q[1])}`; });
            const vFill = R.lin(0, -44, 0, 0, [[0, spriteShade(color, ssj ? 0.18 : 0.06)], [0.7, color], [1, dark]]);
            const vGlow = spriteShade(color, ssj ? 0.45 : 0.2);
            back = spritePath(d + " Z", vFill) +
                spritePath(spriteSpike(-6, -22, tipV(-8.4, -38)[0], tipV(-8.4, -38)[1], 2.6, 0), vGlow, 'opacity="0.9"', "") +
                spritePath(spriteSpike(0, -24, tipV(1, -43)[0], tipV(1, -43)[1], 2.8, 0), vGlow, 'opacity="0.9"', "");
            front = spritePath("M-13 -2 C-14.4 -15 -6.4 -17.4 0 -17.4 C6.4 -17.4 14.4 -15 13 -2 L11.6 -6.6 L6.8 -9 L0 -3 L-6.8 -9 L-11.6 -6.6 Z", vFill);
            break;
        }
        case "android17": {
            // liso e comprido até o ombro, repartido no meio, com as pontas para fora
            back = piece("M-13.8 -4 C-17 10 -16.6 20 -13.4 25 L-8 22 L0 24 L8 22 L13.4 25 C16.6 20 17 10 13.8 -4 Z");
            front = cap() + capShine +
                piece("M-13.4 -3 C-13.2 -15 -3 -15.6 0 -13 Q-4.6 -6 -6.4 4 Q-11.6 4.6 -13.4 -3 Z") +
                piece("M13.4 -3 C13.2 -15 3 -15.6 0 -13 Q4.6 -6 6.4 4 Q11.6 4.6 13.4 -3 Z") +
                piece("M-12.8 0 L-16 20 Q-12.6 21 -10.4 13 L-9.4 0 Z") + piece("M12.8 0 L16 20 Q12.6 21 10.4 13 L9.4 0 Z");
            break;
        }
        case "trunks_futuro": {
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
            // Gohan (saga Cell): espetos menores que os do pai, abertos para cima/lados, e a mecha solta na testa.
            back = animeSilhouette([[-12, 4], { t: [-20, 3], v: [-14, -4] }, { t: [-25, -16], v: [-11.5, -13] }, { t: [-13, -33], v: [-3.5, -19] },
                { t: [2, -37], v: [5.5, -19] }, { t: [18, -30], v: [11.5, -12] }, { t: [26, -13], v: [13.5, -5] }, { t: [19, 4], v: [12, 4] }]) +
                animeGlow([-5, -20], [-11, -31], 2.4) + animeGlow([2, -21], [2, -34], 2.4);
            front = animeCap() + animePiece(spriteSpike(-7, -10, -9.6, -2.6, 7, 0.8)) + animePiece(spriteSpike(-1, -11, 0.4, -3.4, 6.4, 0)) +
                animePiece(spriteSpike(5.4, -10, 9.8, 2.6, 4.6, -0.8));   // a mecha solta, comprida
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
        case "ssj_longo": {
            // Cabelo longo de Super Saiyajin (como a 3ª fase do anime): juba de espetos que desce pelas costas até
            // o quadril, coroa de espetos no alto e franja em mechas na testa.
            const L = 46;
            const juba = R.lin(0, -10, 0, L + 5, [[0, spriteShade(color, 0.05)], [0.75, color], [1, spriteShade(color, -0.22)]]);
            back = spritePath(`M-13 -6 C-23 -2 -27 14 -25 ${L * 0.5} L-31 ${L * 0.6} L-22 ${L * 0.68} L-27 ${L * 0.84} L-15 ${L * 0.8} L-14 ${L} L-6 ${L * 0.88} L0 ${L + 5} L6 ${L * 0.88} L14 ${L} L15 ${L * 0.8} L27 ${L * 0.84} L22 ${L * 0.68} L31 ${L * 0.6} L25 ${L * 0.5} C27 14 23 -2 13 -6 Z`, juba) +
                spritePath(spriteSpike(-12, 6, -20, L * 0.55, 3, 0), spriteShade(color, -0.15), `opacity="0.8"`, "") +
                spritePath(spriteSpike(12, 6, 20, L * 0.55, 3, 0), spriteShade(color, -0.15), `opacity="0.8"`, "");
            const coroa = [[-10, -10, -18, -29, 9.5, -1], [-3, -13, -5, -36, 10, -0.3], [4, -13, 8, -34, 10, 0.5], [10, -9, 19, -26, 9, 1], [-13, -4, -25, -13, 8.5, -1], [13, -4, 25, -13, 8.5, 1]];
            back += spikes(coroa) + shines(coroa.slice(0, 4));
            front = cap() + capShine + spikes([[-7, -10, -10.5, 1.4, 6, 0.4], [-1, -11, 0.4, 2.4, 6.2, 0], [5, -10, 8.6, 1.2, 5.6, -0.4]]);
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
        case "cell_crista": {
            // Crista do Cell (forma perfeita): coroa verde com três pontas e pintas pretas, cobrindo o alto da cabeça.
            const green = color, gFill = R.lin(0, -32, 0, 4, [[0, spriteShade(green, 0.3)], [0.55, green], [1, spriteShade(green, -0.35)]]);
            const tipC = (x, y) => [x + sway * Math.max(0, -y) * 0.08, y - lift * Math.max(0, -y) * 0.05];
            const pts = [[-12.6, 2], [-15.4, -6], tipC(-19.5, -27), [-8.6, -16.5], tipC(0, -32), [8.6, -16.5], tipC(19.5, -27), [15.4, -6], [12.6, 2]];
            let d = pts.map((q, i) => `${i ? "L" : "M"}${_n2(q[0])} ${_n2(q[1])}`).join(" ") + " Q0 -9 -12.6 2 Z";
            back = spritePath(d, gFill);
            const spot = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${_n2(r * 0.8)}" fill="#141414"/>`;
            back += spot(-12, -14, 1.7) + spot(-6.4, -21, 1.5) + spot(6.4, -21, 1.5) + spot(12, -14, 1.7) + spot(0, -25, 1.5) + spot(-15, -6.5, 1.2) + spot(15, -6.5, 1.2);
            front = spritePath("M-12.9 -1 C-14.4 -15 -6.4 -17.4 0 -17.4 C6.4 -17.4 14.4 -15 12.9 -1 L11 -6 Q6 -10.6 0 -9.8 Q-6 -10.6 -11 -6 Z", gFill) +
                spot(-7, -12.5, 1.3) + spot(5, -13, 1.3);
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

const SPRITE_SAIYAN_HAIR = ["goku", "vegeta", "gohan", "bardock", "raditz", "broly", "gotenks", "trunks_futuro", "trunks_kid", "ssj_longo"];

// ---------------------------------------------------------------------------
// TRANSFORMAÇÕES: cada uma guarda só o que muda em relação ao personagem base (diff); a aparência de cada
// transformação é o base + essas diferenças. "ssj" = o efeito padrão (cabelo de Saiyajin amarelo e mais alto).
// ---------------------------------------------------------------------------
const SPRITE_DEFAULT_TRANSFORMATION = { name: "Transformação 1", diff: {}, ssj: true, aura: "amarelo" };

function spriteTransformAppearance(base, t) {
    return normalizeAppearance(Object.assign({}, base, (t && t.diff) || {}));
}

function spriteAppearanceDiff(base, edited) {
    const a = normalizeAppearance(base), b = normalizeAppearance(edited), d = {};
    for (const k of Object.keys(b)) if (b[k] !== a[k]) d[k] = b[k];
    return d;
}

// ---------------------------------------------------------------------------
// ROSTO (olhos, sobrancelhas, boca)
// ---------------------------------------------------------------------------
// Olhos/boca de anime em pixel art (rosto virado para a direita): olho da frente maior, pupila olhando para o
// adversário, traço grosso de cílio em cima e sobrancelha inclinada para o centro (cara de luta).
function spriteAnimeFace(a, pose, skin, browColor) {
    const type = pose.eyes && pose.eyes !== "open" ? pose.eyes : a.eyeType;
    const closed = pose.eyes === "closed" || type === "fechado";
    const angry = ["angry", "bravo", "serio", "freeza"].includes(type);
    const fierce = type === "bravo";      // bravo: mais fechado e franzido que o sério
    const kind = type === "gentil";       // gentil: olho aberto e redondo, sobrancelha levantada
    const robot = type === "android";     // androide: pupila pequena e fria, sem brilho
    const wide = type === "wide";
    const ly = (pose.lookY || 0) * 0.6;
    const noBrow = a.eyeType === "freeza";
    const freezaLips = SPRITE_MARCAS_FREEZA.includes(a.bodyMarks);
    const lipColor = freezaLips ? "#5b2a86" : spriteShade(skin, -0.5);
    let s = "";
    const eye = (x, y, k, inner) => {
        // inner = -1: canto de dentro do olho fica à esquerda (olho da frente); +1: à direita (olho de trás)
        const w = 4.2 * k, up = fierce ? 2.4 : angry ? 1.6 : kind ? 0.5 : 1.1;
        if (closed) {
            s += `<path d="M${_n2(x - w)} ${_n2(y + 0.4)} Q${_n2(x)} ${_n2(y + 2.4)} ${_n2(x + w)} ${_n2(y + 0.2)}" fill="none" stroke="${SPRITE_OUTLINE}" stroke-width="1.8" stroke-linecap="round"/>`;
        } else {
            const top = wide ? -3.4 : fierce ? -1.7 : kind ? -3 : -2.4;
            s += `<path d="M${_n2(x - w)} ${_n2(y - 1 + (inner < 0 ? up * 0.6 : 0))} L${_n2(x + w)} ${_n2(y + top + (inner > 0 ? up * 0.6 : 0))} L${_n2(x + w * 0.85)} ${_n2(y + 2.6)} L${_n2(x - w * 0.8)} ${_n2(y + 2.8)} Z" fill="${a.scleraColor || "#ffffff"}"/>`;
            const px = x + w * 0.28 + (pose.lookX || 0) * 0.5;
            const pw = robot ? 1.7 : 2.6, ph = wide ? 2.6 : robot ? 2.4 : kind ? 4.2 : fierce ? 3 : 3.6;
            s += `<rect x="${_n2(px - pw / 2 * k)}" y="${_n2(y - 1.2 + ly + (kind ? -0.6 : 0))}" width="${_n2(pw * k)}" height="${_n2(ph)}" fill="${spriteShade(a.irisColor, robot ? 0.1 : -0.3)}"/>`;
            if (kind) s += `<rect x="${_n2(px + 0.2 * k)}" y="${_n2(y - 1.6 + ly)}" width="1" height="1" fill="#ffffff"/>`;   // brilho no olho
            s += `<path d="M${_n2(x - w - 0.6)} ${_n2(y - 1.2 + (inner < 0 ? up * 0.6 : 0))} L${_n2(x + w + 0.6)} ${_n2(y + top - 0.3 + (inner > 0 ? up * 0.6 : 0))}" stroke="${SPRITE_OUTLINE}" stroke-width="2" stroke-linecap="round"/>`;
            if (a.gender === "feminino") {   // cílios na ponta de fora do olho
                const ex = inner < 0 ? x + w + 0.6 : x - w - 0.6, ey = inner < 0 ? y + top - 0.3 : y - 1.2;
                s += `<path d="M${_n2(ex)} ${_n2(ey)} L${_n2(ex - inner * 1.8)} ${_n2(ey - 1.8)}" stroke="${SPRITE_OUTLINE}" stroke-width="1.4" stroke-linecap="round"/>`;
            }
        }
        if (noBrow) return;
        // sobrancelha: ponta de dentro mais baixa (determinado/bravo)
        const by = y - (wide ? 6.4 : kind ? 6.2 : fierce ? 4.6 : 5.4), tilt = fierce ? 3.6 : angry ? 2.6 : kind ? -0.8 : robot ? 0.4 : 1.4;
        const x1 = x - w - 0.4, x2 = x + w + 0.2;
        const y1 = by + (inner < 0 ? tilt : -tilt * 0.4), y2 = by + (inner < 0 ? -tilt * 0.4 : tilt);
        s += `<path d="M${_n2(x1)} ${_n2(y1)} L${_n2(x2)} ${_n2(y2)}" stroke="${browColor}" stroke-width="${fierce ? 2.6 : 2.2}" stroke-linecap="round"/>`;
    };
    eye(4.4, 1.2, 1, -1);      // olho da frente (lado do adversário)
    eye(-5, 1.4, 0.78, 1);     // olho de trás, menor (perspectiva)
    // nariz e boca
    if (!["cell_imperfeito", "cell_semi"].includes(a.bodyMarks)) s += `<path d="M8.6 4.4 L9.6 6.4 L7.8 6.8" fill="none" stroke="${spriteShade(skin, -0.45)}" stroke-width="1.1" stroke-linejoin="round"/>`;
    const mouth = pose.mouth && pose.mouth !== "auto" ? pose.mouth : a.mouthType;
    if (mouth === "shout" || mouth === "grito") s += `<path d="M1.6 8.4 L7.2 8 L6.2 11.6 L2.6 11.8 Z" fill="#4a0d0d" stroke="${SPRITE_OUTLINE}" stroke-width="1"/>`;
    else if (mouth === "smile") s += `<path d="M0.6 9 Q3 10.2 5.4 8.6" fill="none" stroke="${lipColor}" stroke-width="1.1" stroke-linecap="round"/>`;
    else if (mouth === "risada") {
        // risada maligna: boca larga aberta, fileira de dentes de cima e canto puxado para cima
        s += `<path d="M0.2 8.4 Q3.4 8.8 7.6 7 Q6.8 11.6 3.4 12 Q0.8 11.6 0.2 8.4 Z" fill="#3a0d14" stroke="${lipColor}" stroke-width="1.1" stroke-linejoin="round"/>`;
        s += `<path d="M0.8 8.7 Q3.6 9.1 7 7.4 L6.6 9.2 Q3.6 10.4 1 9.9 Z" fill="#ffffff"/><path d="M2.6 8.9 L2.6 10 M4.4 8.7 L4.4 9.9 M5.9 8.1 L5.9 9.4" stroke="#b9b4c8" stroke-width="0.5"/>`;
    }
    else if (mouth === "maligno" || mouth === "grin") s += `<path d="M0.8 9.8 L3.6 9.6 Q5.4 9.2 6.4 7.6" fill="none" stroke="${lipColor}" stroke-width="1.2" stroke-linecap="round"/><path d="M4.4 9.6 L4.9 10.9 L5.4 9.4 Z" fill="#ffffff"/>`;   // sorriso de canto, com o caninho
    else s += `<path d="M1 9.4 L5 9.1" stroke="${lipColor}" stroke-width="${freezaLips ? 1.6 : 1.1}" stroke-linecap="round"/>`;
    return s;
}

// Cabeça inteira (pescoço, orelhas, rosto, cabelo, acessórios) desenhada em coordenadas locais e depois posicionada.
function spriteHead(R, a, B, pose, ctx) {
    const skin = ctx.skin, ssj = !!ctx.ssj;
    const hairStyle = a.hairStyle;
    const hairColor = ssj && SPRITE_SAIYAN_HAIR.includes(hairStyle) ? "#ffe34d" : a.hairColor;
    const hair = spriteHair(R, hairStyle, hairColor, pose.hairSway || 0, pose.hairLift || 0, ssj && SPRITE_SAIYAN_HAIR.includes(hairStyle));
    const rx = B.headRx, ry = B.headRy;
    const ear = a.earType, marks = a.bodyMarks;
    const browColor = hairStyle === "careca" || hairColor === a.hairColor && !hair.front ? spriteShade(skin, -0.5) : spriteShade(hairColor, -0.35);

    let s = "";
    // Rosto de anime pensado para pixel art: virado 3/4 para o adversário (direita), queixo marcado,
    // olhos grandes com branco + pupila, sobrancelha grossa — legível mesmo com poucos pixels.
    // pescoço: contorno só dos lados, sem a linha de baixo — encaixa no peito sem risco (como coxa + canela)
    s += `<path d="M-6.4 ${_n2(ry - 6)} L-6.4 ${_n2(ry + 3.4)} L6 ${_n2(ry + 3.4)} L5.6 ${_n2(ry - 6)} Z" fill="${spriteShade(skin, -0.3)}"/>`;
    s += `<path d="M-6.4 ${_n2(ry - 6)} L-6.4 ${_n2(ry + 2.4)} M5.6 ${_n2(ry - 6)} L6 ${_n2(ry + 2.4)}" stroke="${SPRITE_OUTLINE}" stroke-width="1" stroke-linecap="round"/>`;
    if (ear === "pontuda") s += spritePath(`M${_n2(-rx + 1.4)} -2.4 L${_n2(-rx - 9)} -9.6 L${_n2(-rx + 2.2)} 5.4 Z`, spriteShade(skin, -0.1));   // orelha pontuda (Piccolo/Kaioshin)
    else if (ear === "normal") s += spriteEllipse(-rx + 0.6, 1.4, 2.6, 3.6, spriteShade(skin, -0.12));
    const face = R.lin(-10, -8, 10, 12, [[0, spriteShade(skin, 0.22)], [0.55, skin], [1, spriteShade(skin, -0.3)]]);
    s += spritePath(`M${_n2(-rx + 0.6)} -1 C${_n2(-rx)} -15 ${_n2(rx)} -15 ${_n2(rx + 0.2)} -1 L${_n2(rx - 0.6)} 4.6 L7.6 10.8 L2.6 ${_n2(ry - 0.6)} L-3.6 11.6 L${_n2(-rx + 1.6)} 5.4 Z`, face);
    if (marks === "freeza") {
        // forma final: domo roxo brilhante no alto da cabeça + marcas roxas sob os olhos
        const dome = R.lin(-10, -16, 8, 2, [[0, "#c9a6f0"], [0.45, "#7f4fc0"], [1, "#3f1f70"]]);
        s += spritePath(`M${_n2(-rx + 0.4)} -3 C${_n2(-rx - 0.4)} -17 ${_n2(rx + 0.4)} -17 ${_n2(rx)} -3 Q0 -9.4 ${_n2(-rx + 0.4)} -3 Z`, dome);
        s += spritePath("M-6 -12.4 Q-1 -15.4 3 -14.6 Q-1 -12.4 -4.6 -9.4 Z", "#f3e3ff", `opacity="0.7"`, "");
        s += `<path d="M2.4 4.4 L5.4 5.6 M-6.4 4.4 L-4.2 5.2" stroke="#7f4fc0" stroke-width="1.2" stroke-linecap="round"/>`;
    }
    if (marks === "metal_freeza") s += `<path d="M-6.4 4.4 L-4.2 5.2" stroke="${a.primaryColor}" stroke-width="1.2" stroke-linecap="round"/>`;
    if (marks === "namek") {
        s += `<path d="M-4 -9.6 Q0 -11.2 4 -9.6 M-3 -7.4 Q0 -8.8 3 -7.4" fill="none" stroke="${spriteShade(skin, -0.45)}" stroke-width="0.9" stroke-linecap="round"/>`;
        // estrias do pescoço (músculos do pescoço do Namek)
        s += `<path d="M-3.6 ${_n2(ry - 4.6)} L-2.8 ${_n2(ry + 1.8)} M0 ${_n2(ry - 4)} L0.4 ${_n2(ry + 2)} M3.2 ${_n2(ry - 4.6)} L3.4 ${_n2(ry + 1.8)}" stroke="${spriteShade(skin, -0.45)}" stroke-width="0.7" opacity="0.8"/>`;
    }
    if (SPRITE_MARCAS_ROSA.includes(marks)) {
        // bochechas e queixo rosados com listras (formas 1 a 3 do Freeza)
        const bochecha = (d) => spritePath(d, SPRITE_ROSA_FREEZA, `stroke="${spriteShade(SPRITE_ROSA_FREEZA, -0.45)}" stroke-width="0.7"`, "");
        s += bochecha(`M${_n2(rx - 2.4)} 1.6 L${_n2(rx + 0.4)} 1 L${_n2(rx - 0.2)} 5 L7.4 10 L5.4 8.6 Z`);
        s += bochecha(`M${_n2(-rx + 3.4)} 1.4 L-5.6 4 L-4.4 10.4 L${_n2(-rx + 2.6)} 6 Z`);
        s += `<path d="M${_n2(rx - 1.8)} 2.8 L${_n2(rx + 0.2)} 2.4 M${_n2(rx - 2)} 4.6 L${_n2(rx - 0.2)} 4.4 M8.4 6.6 L${_n2(rx - 1.2)} 6.4 M7.6 8.4 L9.2 8.2 M${_n2(-rx + 3.4)} 3.4 L-5.8 5.2 M${_n2(-rx + 3.2)} 5.6 L-5.2 7.4 M-6.6 8.6 L-4.8 9.4" stroke="#a8344f" stroke-width="0.6"/>`;
    }
    if (ear === "majin") s += `<circle cx="-9" cy="-5" r="1.1" fill="${spriteShade(skin, -0.55)}"/><circle cx="-10" cy="-0.6" r="1.1" fill="${spriteShade(skin, -0.55)}"/><circle cx="-8.6" cy="3.8" r="1" fill="${spriteShade(skin, -0.55)}"/>`;
    if (marks === "cell") s += `<path d="M3.4 4.6 L4.6 9.6 M-5.6 4.6 L-4.8 9" stroke="#b0457e" stroke-width="1.2" stroke-linecap="round"/>`;   // marcas do Cell
    s += spriteAnimeFace(a, pose, skin, browColor);
    if (marks === "cell_imperfeito") {
        // boca oval laranja em bico, com riscos seguidos
        s += `<ellipse cx="3.6" cy="9.6" rx="3.6" ry="2.6" fill="${SPRITE_CELL_LARANJA}" stroke="${SPRITE_OUTLINE}" stroke-width="0.9"/><path d="M0.8 8.8 L6.4 8.8 M0.6 10 L6.6 10 M1.2 11.2 L6 11.2" stroke="#8a2f10" stroke-width="0.5"/>`;
    }
    if (marks === "cell_semi" || marks === "cell_perfeito") {
        // contorno do rosto (laterais e queixo): laranja no semi-perfeito, amarelo no perfeito
        const cor = marks === "cell_semi" ? SPRITE_CELL_LARANJA : "#f2d24a";
        s += `<path d="M${_n2(-rx + 2)} -2 L${_n2(-rx + 2.2)} 5 L-3.4 11 L2.6 ${_n2(ry - 1.4)} L7.2 10.2 L${_n2(rx - 1)} 4.2 L${_n2(rx - 0.6)} -2" fill="none" stroke="${cor}" stroke-width="1.8" stroke-linejoin="round"/>`;
        if (marks === "cell_perfeito") s += `<path d="M-7.6 -1 L-7.2 7 M10.6 -1 L10 5.6" stroke="#7a3fb0" stroke-width="1.4" stroke-linecap="round"/>`;   // faixas roxas
    }
    if (a.scar === "bochecha") s += `<path d="M7 4.6 L10.4 6.6" stroke="#8a2a20" stroke-width="1.1" stroke-linecap="round"/>`;
    if (a.scar === "olho") s += `<path d="M2.6 -4.6 L5.6 6.2" stroke="#8a2a20" stroke-width="1.2" stroke-linecap="round"/>`;   // corte vertical no olho
    const hairWrap = (svg) => B.hairScale !== 1 && svg ? `<g transform="scale(${_n2(B.hairScale)})">${svg}</g>` : svg;
    s += hairWrap(hair.front);
    s += spriteHeadAccessory(R, a, ctx, skin, pose, rx, ry);
    return { back: hairWrap(hair.back), front: s };
}

// Cabeças da raça do Freeza (vistas em 3/4, rosto para a direita). Capacete (1ª e 2ª formas): chapa roxa no alto
// da cabeça dando volume para cima, o capacete branco em volta dela e descendo dos lados até um "fone" chato e
// redondo sobre a orelha; os chifres saem dos lados, acima do fone. 3ª forma: crânio alto subindo reto, domo roxo
// comprido e espinhos brancos dos dois lados. Ciborgue: topo da cabeça e a parte da frente do rosto de metal, com a
// lente verde no lugar do olho da frente (o olho de trás e o resto do rosto continuam do Freeza).
function spriteFreezaHead(R, a, rx, ry) {
    const hf = a.headFeature, o = SPRITE_OUTLINE;
    const branco = R.lin(-14, -26, 12, 8, [[0, "#ffffff"], [0.55, "#ecebf2"], [1, "#a8a6b8"]]);
    const roxo = R.lin(-10, -34, 8, -6, [[0, spriteShade(a.primaryColor, 0.6)], [0.4, a.primaryColor], [1, spriteShade(a.primaryColor, -0.55)]]);
    const metal = R.lin(-12, -22, 12, 8, [[0, "#f2f6ff"], [0.45, "#b8c4d8"], [1, "#5a6a88"]]);
    const P = (q) => `${_n2(q[0])} ${_n2(q[1])}`;
    let s = "";
    // chifre reto em "L": sai para o lado e sobe (2ª forma) ou só para o lado subindo pouco (1ª forma)
    const chifre = (pts, w) => {
        const n = pts.length, L = [], Rr = [];
        for (let i = 0; i < n - 1; i++) {
            const p = pts[i], q = pts[i + 1], prev = pts[Math.max(0, i - 1)];
            const dx = (q[0] - prev[0]) || (q[0] - p[0]), dy = (q[1] - prev[1]) || (q[1] - p[1]), len = Math.hypot(dx, dy) || 1;
            const ww = w * (1 - i / (n - 1) * 0.55);
            L.push([p[0] - dy / len * ww, p[1] + dx / len * ww]); Rr.push([p[0] + dy / len * ww, p[1] - dx / len * ww]);
        }
        const d = `M${L.map(P).join(" L")} L${P(pts[n - 1])} L${Rr.reverse().map(P).join(" L")} Z`;
        const brilho = `M${pts.slice(0, n - 1).map(q => P([q[0], q[1] - w * 0.35])).join(" L")}`;
        return `<path d="${d}" fill="#1d1a22" stroke="${o}" stroke-width="0.8" stroke-linejoin="round"/><path d="${brilho}" fill="none" stroke="#77738a" stroke-width="0.7" stroke-linecap="round"/>`;
    };
    // capacete branco + chapa roxa (domoTopo = altura do topo da chapa; inset = quanto a borda branca aparece)
    const capacete = (domoTopo, inset) => {
        let c = "";
        // tiras laterais descendo até o fone (lado de trás e o da frente, mais estreito pela perspectiva)
        c += spritePath(`M${_n2(-rx - 1.2)} -7 L${_n2(-rx + 2.8)} -6.4 L${_n2(-rx + 3)} 0 L${_n2(-rx - 0.4)} 0.6 Z`, branco);
        c += spritePath(`M${_n2(rx + 1.2)} -7 L${_n2(rx - 1.6)} -5.6 L${_n2(rx - 1)} -0.2 L${_n2(rx + 1)} 0 Z`, branco);
        // "fones" chatos e redondos sobre as orelhas
        c += `<ellipse cx="${_n2(-rx + 0.8)}" cy="2.6" rx="4.2" ry="5.4" fill="${branco}" stroke="${o}" stroke-width="1"/><ellipse cx="${_n2(-rx + 0.8)}" cy="2.6" rx="2.6" ry="3.6" fill="#d8d6e2" stroke="#9a97ac" stroke-width="0.7"/>`;
        c += `<ellipse cx="${_n2(rx + 0.2)}" cy="2.4" rx="1.9" ry="4.8" fill="${branco}" stroke="${o}" stroke-width="1"/>`;
        // casco branco em volta da chapa, com a borda da testa em "V" entre os olhos
        c += spritePath(`M${_n2(-rx - 1.4)} -5.6 C${_n2(-rx - 2.8)} ${_n2(domoTopo - 5)} ${_n2(rx + 2.6)} ${_n2(domoTopo - 5)} ${_n2(rx + 1.4)} -5.6 L${_n2(rx - 0.6)} -4.4 Q${_n2(rx - 3.4)} -6.4 1.6 -3.2 Q-4 -6.4 ${_n2(-rx + 1.8)} -4.4 Z`, branco);
        // chapa roxa dando volume para cima
        c += spritePath(`M${_n2(-rx - 1.4 + inset)} ${_n2(-6.6 - inset * 0.3)} C${_n2(-rx - 2.2 + inset)} ${_n2(domoTopo - 1)} ${_n2(rx + 2 - inset)} ${_n2(domoTopo - 1)} ${_n2(rx + 1.4 - inset)} ${_n2(-6.6 - inset * 0.3)} Q${_n2(rx - 3.6)} ${_n2(-8.6 - inset * 0.4)} 1.6 ${_n2(-5.6 - inset * 0.6)} Q-4 ${_n2(-8.6 - inset * 0.4)} ${_n2(-rx - 1.4 + inset)} ${_n2(-6.6 - inset * 0.3)} Z`, roxo);
        c += `<ellipse cx="-3" cy="${_n2(domoTopo * 0.62)}" rx="${_n2(4.6 - inset * 0.4)}" ry="1.9" fill="#ffffff" opacity="0.6" transform="rotate(-12 -3 ${_n2(domoTopo * 0.62)})"/>`;
        return c;
    };
    if (hf === "capacete_freeza") {
        s += chifre([[-rx - 1, -4.6], [-rx - 9, -6.4], [-rx - 17, -10.6]], 2.4);   // chifres longos para os lados, subindo pouco
        s += chifre([[rx + 0.6, -5], [rx + 8, -6.8], [rx + 15, -11]], 2.2);
        s += capacete(-24, 2.2);                                                    // chapa grande e alta
    }
    if (hf === "capacete_chifres") {
        s += chifre([[-rx - 0.6, -5], [-rx - 6.6, -6.4], [-rx - 7.4, -15], [-rx - 6.4, -27]], 3.4);   // para o lado e depois para cima
        s += chifre([[rx + 0.2, -5.4], [rx + 6, -6.8], [rx + 6.6, -15.4], [rx + 5.4, -27]], 3.2);
        s += capacete(-20, 4.4);                                                    // chapa menor
    }
    if (hf === "cabeca_longa") {
        // crânio alto subindo reto, continuando a cabeça; espinhos brancos dos dois lados, simétricos
        const espinho = (bx, by, tx, ty, bw) => {
            const L = Math.hypot(tx - bx, ty - by) || 1, nx = -(ty - by) / L * bw / 2, ny = (tx - bx) / L * bw / 2;
            return spritePath(`M${_n2(bx + nx)} ${_n2(by + ny)} Q${_n2((bx + tx) / 2 + nx * 0.5)} ${_n2((by + ty) / 2 + ny * 0.5)} ${_n2(tx)} ${_n2(ty)} Q${_n2((bx + tx) / 2 - nx * 0.5)} ${_n2((by + ty) / 2 - ny * 0.5)} ${_n2(bx - nx)} ${_n2(by - ny)} Z`, "#f2f1f6");
        };
        [[-1, -10], [-1, -21], [1, -10], [1, -21]].forEach(([sd, y]) => {
            const bx = sd < 0 ? -rx - 0.4 : rx - 0.6;
            s += espinho(bx, y, bx + sd * 9, y - 9, 8);
        });
        s += espinho(-rx + 2, -30, -rx - 3, -40, 7) + espinho(rx - 3, -30, rx + 1.6, -40, 7);
        s += spritePath(`M${_n2(-rx - 1.4)} -5.4 C${_n2(-rx - 3)} -24 ${_n2(-rx - 1.6)} -44 0 -44 C${_n2(rx + 1.6)} -44 ${_n2(rx + 3)} -24 ${_n2(rx + 1.4)} -5.4 L${_n2(rx - 0.6)} -4.4 Q${_n2(rx - 3.4)} -6.4 1.6 -3.2 Q-4 -6.4 ${_n2(-rx + 1.8)} -4.4 Z`, branco);
        s += spritePath(`M${_n2(-rx + 1.6)} -7 C${_n2(-rx + 0.2)} -24 ${_n2(-rx + 1.2)} -40.6 0 -40.6 C${_n2(rx - 1.2)} -40.6 ${_n2(rx - 0.2)} -24 ${_n2(rx - 1.6)} -7 Q${_n2(rx - 3.6)} -8.8 1.6 -6 Q-4 -8.8 ${_n2(-rx + 1.6)} -7 Z`, roxo);
        s += `<path d="M-4 -12 Q-5.4 -26 -2 -36" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.55"/>`;
        // placas brancas dos lados do rosto, como a borda do capacete
        s += spritePath(`M${_n2(-rx - 1.2)} -6 L${_n2(-rx + 2.8)} -5.4 L${_n2(-rx + 3)} 4 L${_n2(-rx - 0.2)} 5 Z`, branco);
    }
    if (hf === "meia_cabeca_metal") {
        // topo da cabeça de metal (no lugar do domo) com gomos azuis e rebites
        s += spritePath(`M${_n2(-rx + 0.4)} -3 C${_n2(-rx - 0.4)} -18 ${_n2(rx + 0.4)} -18 ${_n2(rx)} -3 Q0 -9.4 ${_n2(-rx + 0.4)} -3 Z`, metal);
        s += `<path d="M-5 -15.4 Q-6 -10 -7 -5.4 M1 -16.4 L1 -8.4 M6.6 -14.6 Q7.4 -10 7.6 -6" fill="none" stroke="#2a3a6a" stroke-width="0.9"/>`;
        [[-8, -6.6], [-2, -8.6], [4, -9], [9.4, -6.4]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="0.6" fill="#2a3a6a"/>`; });
        // placa de metal na frente do rosto, em volta do olho da frente, descendo pela bochecha
        s += spritePath(`M1.6 -4.4 L${_n2(rx + 0.4)} -4.4 L${_n2(rx - 0.2)} 4.6 L8.2 9.4 L5.6 8.8 L4.6 5.6 Q1.6 4.6 1.6 2 Z`, metal);
        s += `<path d="M1.8 1.4 L-0.2 1.6" stroke="#2a3a6a" stroke-width="0.8"/>`;
        // lente verde no lugar do olho da frente
        s += `<ellipse cx="5.2" cy="1" rx="3" ry="2.7" fill="${R.rad(4.4, 0.2, 3.2, [[0, "#d9fff4"], [0.45, "#3fe0b8"], [1, "#0a6a5a"]])}" stroke="${o}" stroke-width="0.9"/>`;
        s += `<ellipse cx="4.4" cy="0.1" rx="0.9" ry="0.6" fill="#ffffff" opacity="0.85"/>`;
    }
    return s;
}

// Cabeças do Cell. 1ª forma: capacete de inseto verde escuro com duas pontas grandes que sobem e se cruzam
// para trás e a chapa oval preta no meio. 2ª e perfeito: chapa preta redonda no alto da cabeça e duas pontas
// verde-escuras subindo pelas laterais (mais altas no perfeito), com verde em volta da chapa. Pintas no verde.
function spriteCellHead(R, a, rx, ry) {
    const hf = a.headFeature, o = SPRITE_OUTLINE;
    const cel = spriteCellCores(a) || { L: "#86bf3e", D: "#3e8a2c" };
    const verde = (c) => R.lin(-14, -36, 12, 4, [[0, spriteShade(c, 0.35)], [0.5, c], [1, spriteShade(c, -0.4)]]);
    const pinta = (x, y, r) => `<ellipse cx="${_n2(x)}" cy="${_n2(y)}" rx="${_n2(r)}" ry="${_n2(r * 0.8)}" fill="${cel.pinta || "#141414"}"/>`;
    const ponta = (b, c, t, w, cor) => {
        const L = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1, nx = -(c[1] - b[1]) / L * w, ny = (c[0] - b[0]) / L * w;
        const P = (q) => `${_n2(q[0])} ${_n2(q[1])}`;
        return spritePath(`M${P([b[0] + nx, b[1] + ny])} Q${P([c[0] + nx * 0.6, c[1] + ny * 0.6])} ${P(t)} Q${P([c[0] - nx * 0.6, c[1] - ny * 0.6])} ${P([b[0] - nx, b[1] - ny])} Z`, verde(cor));
    };
    const borda = `L${_n2(-rx - 1.4)} 6 Q${_n2(-rx + 1.6)} 9.6 ${_n2(-rx + 5)} 8 L${_n2(-rx + 4)} 1 Q${_n2(-rx + 4)} -4.6 -1 -6.4 Q${_n2(rx - 3)} -7.4`;
    let s = "";
    if (hf === "capacete_cell1") {
        // duas pontas grandes que sobem e se cruzam para trás
        s += ponta([-7, -12], [-6, -32], [-24, -32], 6.4, cel.D);
        s += spritePath(`M${_n2(rx + 0.8)} -3.6 C${_n2(rx + 2)} -19.6 ${_n2(-rx - 3.4)} -21.4 ${_n2(-rx - 2.4)} -4 ${borda} ${_n2(rx + 0.8)} -3.6 Z`, verde(cel.D));
        s += ponta([6, -13], [4, -34], [-20, -38], 7, cel.D);
        s += `<ellipse cx="1.4" cy="-11" rx="2.6" ry="5.6" fill="${SPRITE_CELL_PRETO}" stroke="${o}" stroke-width="0.8" transform="rotate(-8 1.4 -11)"/><ellipse cx="0.6" cy="-13" rx="0.9" ry="2" fill="#ffffff" opacity="0.5"/>`;
        [[-9, -10, 1.2], [-4, -17, 1], [7, -12, 1], [-1, -25, 1.2], [-12, -29, 1], [-6, -30, 1.1], [-15, -33, 0.9], [-9, 2, 1]].forEach(([x, y, r]) => { s += pinta(x, y, r); });
    }
    if (hf === "capacete_cell2" || hf === "capacete_cell3") {
        const alto = hf === "capacete_cell3" ? -40 : -30;
        const lados = hf === "capacete_cell3" ? cel.L : cel.D;   // perfeito: verde claro em volta da chapa
        // duas pontas verde-escuras subindo pelas laterais
        s += ponta([-rx + 2, -8], [-rx - 3, alto * 0.55], [-rx - 1, alto], 4, cel.D);
        s += ponta([rx - 3, -8], [rx + 2, alto * 0.55], [rx + 0.4, alto], 3.6, cel.D);
        s += spritePath(`M${_n2(rx + 0.8)} -3.6 C${_n2(rx + 2)} -19.6 ${_n2(-rx - 3.4)} -21.4 ${_n2(-rx - 2.4)} -4 ${borda} ${_n2(rx + 0.8)} -3.6 Z`, verde(lados));
        // chapa preta redonda no alto da cabeça
        s += spritePath(`M${_n2(-rx + 3.2)} -7 C${_n2(-rx + 2.6)} -21 ${_n2(rx - 2.6)} -21 ${_n2(rx - 3)} -7 Q0 -10.4 ${_n2(-rx + 3.2)} -7 Z`, R.lin(-6, -20, 6, -6, [[0, "#4a4458"], [0.45, SPRITE_CELL_PRETO], [1, "#050407"]]));
        s += `<ellipse cx="-2.6" cy="-15" rx="2.6" ry="1.4" fill="#ffffff" opacity="0.35"/>`;
        [[-rx + 0.6, -10, 1], [rx - 1, -11, 1], [-rx - 1.4, alto * 0.5, 1.1], [rx + 1, alto * 0.5, 1], [-rx - 1, alto * 0.75, 0.9], [rx + 0.6, alto * 0.78, 0.9], [-rx + 1, 2, 1]].forEach(([x, y, r], i) => {
            s += pinta(x, y, r);
        });
    }
    return s;
}

function spriteHeadAccessory(R, a, ctx, skin, pose, rx, ry) {
    let s = "";
    const acc = a.accessory;
    const hat = a.hat && a.hat !== "none" ? a.hat : (acc === "turbante" || acc === "faixa" ? acc : "none");
    const sway = pose.hairSway || 0;
    if (a.headFeature === "antenas") {
        const ant = (side) => `<path d="M${side * 4.4} -12.6 Q${side * 6.4 + sway * 2} -20.6 ${_n2(side * 9 + sway * 3)} -25.4" fill="none" stroke="${SPRITE_OUTLINE}" stroke-width="3.4" stroke-linecap="round"/><path d="M${side * 4.4} -12.6 Q${side * 6.4 + sway * 2} -20.6 ${_n2(side * 9 + sway * 3)} -25.4" fill="none" stroke="${spriteShade(skin, 0.02)}" stroke-width="2" stroke-linecap="round"/><circle cx="${_n2(side * 9 + sway * 3)}" cy="-25.6" r="1.7" fill="${spriteShade(skin, 0.15)}" stroke="${SPRITE_OUTLINE}" stroke-width="0.8"/>`;
        s += ant(-1) + ant(1);
    }
    if (a.headFeature === "chifres") {
        const horn = (side) => spritePath(`M${side * 6} -12 Q${side * 9} -17 ${side * 13} -22 Q${side * 12} -14 ${side * 10.4} -9 Z`, "#f3ecf8");
        s += horn(-1) + horn(1);
    }
    if (["capacete_freeza", "capacete_chifres", "cabeca_longa", "meia_cabeca_metal"].includes(a.headFeature)) s += spriteFreezaHead(R, a, rx, ry);
    if (["capacete_cell1", "capacete_cell2", "capacete_cell3"].includes(a.headFeature)) s += spriteCellHead(R, a, rx, ry);
    if (a.headFeature === "majin_antena") {
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
// Roupa de cima: covers = cobre o tronco com a cor principal; chest = cobre o peito; sleeves = mangas da própria
// roupa. Cada escolha mexe só na sua parte: a calça (pernas) e a camisa (por baixo) têm opção e cor próprias.
const SPRITE_OUTFITS = {
    kimono: { covers: true, chest: true }, gi_piccolo: { covers: true, chest: true }, roupa_kaioshin: { covers: true, chest: true },
    armadura_saiyajin: { chest: true }, jaqueta_trunks: { covers: true, chest: true, sleeves: "full" },
    colete_fusao: {}, colete_buu: {}, traje_android: { covers: true, chest: true, sleeves: "full" },
    armadura_cell: { covers: true, chest: true, sleeves: "cell" }, armadura_freeza: { chest: true }, armadura_exercito: { chest: true }
};
function spriteOutfitSpec(a, skin) {
    const o = SPRITE_OUTFITS[a.outerShirt] || {};
    const inner = a.innerShirt && a.innerShirt !== "nenhuma" ? a.innerShirt : null;
    const limb = spriteLimbSkin(a, skin);   // raça do Freeza: membros e barriga rosados listrados
    const cel = spriteCellCores(a);         // formas do Cell: cada parte do corpo com o seu verde/preto
    const spec = { kind: a.outerShirt, torso: inner ? a.shirtColor : (cel ? cel.tronco : limb), armUpper: cel ? cel.up : limb, armLower: cel ? cel.lo : limb, sleeve: null,
        leg: a.pantsColor, legSkin: cel ? cel.coxa : limb, legLower: cel ? cel.canela : null, legWide: a.pants === "larga", legCover: a.pants !== "nenhuma", bare: !inner && !o.chest };
    // camisa por baixo: camiseta = manguinha curta; malha = manga comprida; regata = sem manga
    if (inner === "camiseta") spec.sleeve = { color: a.shirtColor, frac: 0.3 };
    if (inner === "malha") spec.armUpper = spec.armLower = a.shirtColor;
    if (o.covers) spec.torso = a.primaryColor;
    if (o.sleeves === "full") { spec.armUpper = spec.armLower = a.primaryColor; spec.sleeve = null; }
    if (o.sleeves === "cell") { spec.armUpper = a.primaryColor; spec.armLower = a.secondaryColor; spec.sleeve = null; spec.spots = true; }
    return spec;
}

function spriteBootSpec(a) {
    switch (a.shoes) {
        case "botas_artes": return { color: a.secondaryColor, trim: a.accentColor, h: 0.5 };
        case "botas_saiyajin": return { color: "#f4f4f6", trim: a.accentColor, h: 0.5 };
        case "botas_trunks": return { color: "#6d4b2b", trim: "#3d2913", h: 0.5 };
        case "botas_kaioshin": return { color: "#efd28a", trim: a.secondaryColor, h: 0.45 };
        case "botas_marrons": return { color: "#5a3d2b", trim: "#2f2015", h: 0.5 };
        case "botas_cell": return { color: "#2a2532", trim: "#e9e3ee", h: 0.42 };
        case "caneleiras_freeza": return { color: "#f4f4f2", trim: "#8a4a1a", h: 0.62, guard: true, claws: true };
        case "pes_garras": return { claws: true };
        case "sapato_cell": return { sapato: "semi" };
        case "sapato_ponta": return { sapato: "perfeito" };
        default: return null;
    }
}

function spriteGloveSpec(a) {
    if (a.gloves === "luvas_saiyajin") return { color: "#f4f4f6", trim: a.accentColor, full: true };
    if (a.gloves === "luvas_pretas") return { color: "#2a2a30", trim: a.accentColor, full: true };
    if (a.gloves === "pulseiras") return { color: a.secondaryColor, trim: null, full: false };
    if (a.gloves === "bracadeiras_freeza") return { color: "#f4f4f2", trim: null, full: false, guard: "#8a4a1a" };
    return null;
}

// Silhueta do tronco (ombros → cintura → quadril), no espaço padrão do tronco (ombros y=45, quadril y=77).
function spriteTorsoBodyPath(B, pose) {
    const sw = B.sw, ww = B.ww, hw = B.hw;
    const x0 = 48 - sw / 2, x1 = 48 + sw / 2, yw = 69, yh = 77;
    const y0b = 45 - (pose.breath || 0);
    if (B.belly) {
        // barrigão redondo: alarga bem abaixo do peito e fecha arredondado no quadril
        const bx = ww / 2;
        return `M${_n2(x0)} ${_n2(y0b + 1)} C${_n2(x0 - 3)} 50 ${_n2(48 - bx)} 54 ${_n2(48 - bx)} 63 C${_n2(48 - bx)} 72 ${_n2(48 - hw / 2 - 3)} ${yh} ${_n2(48 - hw / 2)} ${yh} L${_n2(48 + hw / 2)} ${yh} C${_n2(48 + hw / 2 + 3)} ${yh} ${_n2(48 + bx)} 72 ${_n2(48 + bx)} 63 C${_n2(48 + bx)} 54 ${_n2(x1 + 3)} 50 ${_n2(x1)} ${_n2(y0b + 1)} Q48 ${_n2(y0b - 4)} ${_n2(x0)} ${_n2(y0b + 1)} Z`;
    }
    return `M${_n2(x0)} ${_n2(y0b + 1)} Q${_n2(x0 - 1.6)} 56 ${_n2(48 - ww / 2)} ${yw} L${_n2(48 - hw / 2)} ${yh} L${_n2(48 + hw / 2)} ${yh} L${_n2(48 + ww / 2)} ${yw} Q${_n2(x1 + 1.6)} 56 ${_n2(x1)} ${_n2(y0b + 1)} Q48 ${_n2(y0b - 4)} ${_n2(x0)} ${_n2(y0b + 1)} Z`;
}

// Contorno do tronco, desenhado ANTES das pernas: assim as pernas cobrem a borda de baixo dele e o tronco (sem
// contorno próprio) cobre o topo das coxas — quadril sem risco entre tronco e pernas (como coxa + canela).
function spriteTorsoOutline(B, pose) {
    return `<path d="${spriteTorsoBodyPath(B, pose)}" fill="${SPRITE_OUTLINE}" stroke="${SPRITE_OUTLINE}" stroke-width="3.8" stroke-linejoin="round"/>`;
}

// Desenha o volume do tronco + roupa. Coordenadas do viewBox; centro em x=48.
function spriteTorso(R, a, B, spec, skin, pose) {
    const sw = B.sw, ww = B.ww, hw = B.hw;
    const x0 = 48 - sw / 2, x1 = 48 + sw / 2, y0 = 45, yw = 69, yh = 77;
    const breath = pose.breath || 0;
    const y0b = y0 - breath;
    const body = spriteTorsoBodyPath(B, pose);
    const base = spec.torso;
    const fill = R.lin(x0, 46, x1, 70, [[0, spriteShade(base, 0.32)], [0.45, base], [1, spriteShade(base, -0.42)]]);
    let s = spritePath(body, fill, "", "");   // o contorno vem de spriteTorsoOutline (por baixo das pernas)
    if (base === SPRITE_ROSA_FREEZA) {
        // pele rosada listrada (raça do Freeza): faixas horizontais do peito ao quadril, levemente curvas
        let st = "";
        for (let y = y0b + 4; y < yh - 0.5; y += 2.3) {
            // meia largura do corpo nessa altura (ombros → cintura → quadril), para a listra não sair do contorno
            const hwy = y < yw ? sw / 2 + (ww / 2 - sw / 2) * (y - y0b) / (yw - y0b) : ww / 2 + (hw / 2 - ww / 2) * (y - yw) / (yh - yw);
            st += `M${_n2(48 - hwy + 0.8)} ${_n2(y)} Q48 ${_n2(y + 1.1)} ${_n2(48 + hwy - 0.8)} ${_n2(y)} `;
        }
        s += `<path d="${st}" fill="none" stroke="#a8344f" stroke-width="0.7" opacity="0.8"/>`;
    }
    let d = "";
    const lapel = spriteShade(base, -0.28);
    switch (spec.kind) {
        case "kimono": {
            const inner = a.innerShirt !== "nenhuma" ? a.shirtColor : skin;
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
            const shirt = a.innerShirt !== "nenhuma" ? a.shirtColor : skin;
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
            // forma final: o corpo liso é a própria armadura — músculos marcados e a gota roxa brilhante no meio do
            // peito (as placas dos ombros ficam em spriteShoulderPads); sem cueca, a virilha só tem a sombra do quadril
            d += spriteBareTorsoMuscles(Object.assign({}, B, { mus: Math.max(B.mus, 0.7), female: false }), spec.torso, ww, y0b);
            if (a.bodyMarks === "metal_freeza") {
                // ciborgue: metade direita do peito e da barriga em placas de metal (a esquerda continua do Freeza)
                const met = R.lin(48, y0b, x1, yh, [[0, "#eef3fb"], [0.5, SPRITE_METAL], [1, "#5a6a88"]]);
                d += spritePath(`M48 ${_n2(y0b - 1.6)} Q${_n2(48 + sw * 0.3)} ${_n2(y0b - 2)} ${_n2(x1)} ${_n2(y0b + 1)} Q${_n2(x1 + 1.6)} 56 ${_n2(48 + ww / 2)} ${yw} L${_n2(48 + hw / 2)} ${yh} L48 ${yh} Z`, met);
                d += `<path d="M48 54 L${_n2(x1 - 0.6)} 52.6 M48 60 L${_n2(48 + ww / 2 + 0.6)} 60 M48 65.6 L${_n2(48 + ww / 2)} 65.6 M${_n2(48 + sw * 0.24)} ${_n2(y0b + 1)} L${_n2(48 + sw * 0.22)} 53.4" stroke="#2a3a6a" stroke-width="0.8"/>`;
                [[48 + sw * 0.34, 50], [48 + ww * 0.3, 63], [48 + ww * 0.3, 68.4]].forEach(([x, y]) => { d += `<circle cx="${_n2(x)}" cy="${y}" r="0.6" fill="#2a3a6a"/>`; });
            }
            const gema = R.lin(44, y0b + 5, 52, y0b + 16, [[0, spriteShade(a.primaryColor, 0.55)], [0.45, a.primaryColor], [1, spriteShade(a.primaryColor, -0.5)]]);
            d += spritePath(`M${_n2(48 - 5.2)} ${_n2(y0b + 6.4)} Q48 ${_n2(y0b + 4.2)} ${_n2(48 + 5.2)} ${_n2(y0b + 6.4)} Q${_n2(48 + 4.6)} ${_n2(y0b + 11.6)} 48 ${_n2(y0b + 16)} Q${_n2(48 - 4.6)} ${_n2(y0b + 11.6)} ${_n2(48 - 5.2)} ${_n2(y0b + 6.4)} Z`, gema);
            d += `<ellipse cx="${_n2(48 - 1.8)}" cy="${_n2(y0b + 7.4)}" rx="2" ry="1" fill="#ffffff" opacity="0.7"/>`;
            d += `<path d="M${_n2(48 - hw / 2 + 1)} ${yh - 1.5} Q48 ${yh + 1.6} ${_n2(48 + hw / 2 - 1)} ${yh - 1.5}" fill="none" stroke="${spriteShade(spec.torso, -0.4)}" stroke-width="0.9" opacity="0.7"/>`;
            break;
        }
        case "armadura_exercito": {
            // armadura do exército do Freeza: colar branco, peitoral roxo com borda branca e a barriga dourada em
            // arco com frisos (as ombreiras douradas grandes ficam em spriteShoulderPads)
            const roxo = R.lin(x0, y0b, x1, 60, [[0, spriteShade(a.primaryColor, 0.45)], [0.5, a.primaryColor], [1, spriteShade(a.primaryColor, -0.45)]]);
            const ouro = R.lin(0, 57, 0, 67, [[0, spriteShade(a.accentColor, 0.4)], [0.55, a.accentColor], [1, spriteShade(a.accentColor, -0.5)]]);
            d += spritePath(`M${_n2(x0 + 2.4)} ${_n2(y0b + 4.4)} Q48 ${_n2(y0b + 0.2)} ${_n2(x1 - 2.4)} ${_n2(y0b + 4.4)} L${_n2(x1 - 1.6)} 54 Q${_n2(x1 - 2)} 59 ${_n2(48 + ww / 2 + 0.6)} 60.6 L${_n2(48 - ww / 2 - 0.6)} 60.6 Q${_n2(x0 + 2)} 59 ${_n2(x0 + 1.6)} 54 Z`, roxo);
            d += `<path d="M${_n2(x0 + 2)} 54.4 Q${_n2(x0 + 2.6)} 59.6 ${_n2(48 - ww / 2 - 0.6)} 60.8 L${_n2(48 + ww / 2 + 0.6)} 60.8 Q${_n2(x1 - 2.6)} 59.6 ${_n2(x1 - 2)} 54.4" fill="none" stroke="#f4f4f2" stroke-width="1.5"/>`;
            d += `<path d="M48 ${_n2(y0b + 3)} L48 58 M${_n2(48 - sw * 0.3)} ${_n2(y0b + 10)} Q${_n2(48 - sw * 0.14)} ${_n2(y0b + 12.6)} 48 ${_n2(y0b + 10.4)} Q${_n2(48 + sw * 0.14)} ${_n2(y0b + 12.6)} ${_n2(48 + sw * 0.3)} ${_n2(y0b + 10)}" fill="none" stroke="${spriteShade(a.primaryColor, -0.5)}" stroke-width="0.9" opacity="0.8"/>`;
            d += `<ellipse cx="${_n2(48 - sw * 0.18)}" cy="${_n2(y0b + 6.4)}" rx="3" ry="1.5" fill="#ffffff" opacity="0.4"/>`;
            d += spritePath(`M${_n2(x0 + 2.4)} ${_n2(y0b + 1.6)} Q48 ${_n2(y0b - 3.4)} ${_n2(x1 - 2.4)} ${_n2(y0b + 1.6)} L${_n2(x1 - 3.2)} ${_n2(y0b + 4.4)} Q48 ${_n2(y0b + 0.2)} ${_n2(x0 + 3.2)} ${_n2(y0b + 4.4)} Z`, "#f4f4f2");   // colar branco
            const bx = ww * 0.42;
            d += spritePath(`M${_n2(48 - bx)} 67 L${_n2(48 - bx)} 61.4 Q48 56.8 ${_n2(48 + bx)} 61.4 L${_n2(48 + bx)} 67 Z`, ouro, `stroke="${spriteShade(a.accentColor, -0.7)}" stroke-width="0.8" stroke-linejoin="round"`, "");
            d += `<path d="M${_n2(48 - bx * 0.5)} 60.4 L${_n2(48 - bx * 0.5)} 66.6 M48 59.4 L48 66.6 M${_n2(48 + bx * 0.5)} 60.4 L${_n2(48 + bx * 0.5)} 66.6" stroke="${spriteShade(a.accentColor, -0.5)}" stroke-width="0.8" opacity="0.85"/>`;
            break;
        }
        case "armadura_cell": {
            // abdômen escuro segmentado no meio e pintas pretas na carapaça verde
            d += spritePath(`M${_n2(48 - 6)} 56 L${_n2(48 + 6)} 56 L${_n2(48 + ww / 2 - 1)} ${yh} L${_n2(48 - ww / 2 + 1)} ${yh} Z`, a.secondaryColor);
            d += `<path d="M${_n2(48 - 6)} 61 L${_n2(48 + 6)} 61 M${_n2(48 - 7)} 66 L${_n2(48 + 7)} 66 M${_n2(48 - 7.4)} 71 L${_n2(48 + 7.4)} 71" stroke="${spriteShade(a.secondaryColor, 0.35)}" stroke-width="0.9"/>`;
            [[42, 50, 1.8], [54, 50, 1.8], [38, 56, 1.4], [58, 56, 1.4], [48, 52.4, 1.2], [40, 63, 1.2], [56, 63, 1.2]].forEach(([x, y, r]) => {
                d += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${_n2(r * 0.8)}" fill="#141414"/>`;
            });
            break;
        }
        case "colete_buu": {
            // colete preto curto e aberto, com borda dourada; barriga à mostra; cinto preto com "M" dourado
            const vest = "#24202a", trim = a.accentColor;
            d += spritePath(`M${_n2(x0)} ${_n2(y0b + 1)} L${_n2(48 - 4)} ${_n2(y0b)} L${_n2(48 - 7)} 60 L${_n2(48 - ww / 2 + 2)} 62 C${_n2(48 - ww / 2 - 1)} 55 ${_n2(x0 - 2)} 50 ${_n2(x0)} ${_n2(y0b + 1)} Z`, vest);
            d += spritePath(`M${_n2(x1)} ${_n2(y0b + 1)} L${_n2(48 + 4)} ${_n2(y0b)} L${_n2(48 + 7)} 60 L${_n2(48 + ww / 2 - 2)} 62 C${_n2(48 + ww / 2 + 1)} 55 ${_n2(x1 + 2)} 50 ${_n2(x1)} ${_n2(y0b + 1)} Z`, vest);
            d += `<path d="M${_n2(48 - 4)} ${_n2(y0b)} L${_n2(48 - 7)} 60 L${_n2(48 - ww / 2 + 2)} 62 M${_n2(48 + 4)} ${_n2(y0b)} L${_n2(48 + 7)} 60 L${_n2(48 + ww / 2 - 2)} 62" stroke="${trim}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`;
            d += `<path d="M47 66 Q48 67.4 49 66" stroke="${spriteShade(skin, -0.45)}" stroke-width="1" fill="none"/>`;   // umbigo
            d += spritePath(`M${_n2(48 - hw / 2 - 2)} 71 L${_n2(48 + hw / 2 + 2)} 71 L${_n2(48 + hw / 2 + 2)} 76 L${_n2(48 - hw / 2 - 2)} 76 Z`, "#1d1a22");
            d += `<rect x="45" y="71.2" width="6" height="4.6" fill="${trim}" stroke="${SPRITE_OUTLINE}" stroke-width="0.6"/><path d="M46 75 L46 72 L48 74 L50 72 L50 75" stroke="#1d1a22" stroke-width="0.8" fill="none"/>`;
            break;
        }
        case "traje_android": {
            d += spritePath(`M${_n2(48 - 8)} ${_n2(y0b - 1)} L${_n2(48 + 8)} ${_n2(y0b - 1)} L${_n2(48 + 9)} ${_n2(y0b + 5)} L48 ${_n2(y0b + 8)} L${_n2(48 - 9)} ${_n2(y0b + 5)} Z`, a.accentColor);
            d += `<path d="M48 ${_n2(y0b + 8)} L48 ${yh - 1}" stroke="${spriteShade(base, -0.5)}" stroke-width="1"/>`;
            d += spritePath(`M${_n2(48 - ww / 2 - 1)} 66 L${_n2(48 + ww / 2 + 1)} 66 L${_n2(48 + ww / 2 + 1.6)} 70.4 L${_n2(48 - ww / 2 - 1.6)} 70.4 Z`, spriteShade(a.secondaryColor, 0.1));
            break;
        }
        default: {
            if (spec.torso === skin || base === SPRITE_ROSA_FREEZA || (spriteCellCores(a) && spec.bare)) d += spriteBareTorsoMuscles(B, base, ww, y0b);
            else if (B.mus > 0.3 && base !== SPRITE_ROSA_FREEZA && !spriteCellCores(a)) {
                // com camisa/malha: o tecido marca o peitoral e o abdômen por baixo
                const dobra = spriteShade(base, -0.4), k = B.mus;
                d += `<path d="M${_n2(48 - sw * 0.33)} ${_n2(y0b + 9)} Q${_n2(48 - sw * 0.16)} ${_n2(y0b + 12.4)} 48 ${_n2(y0b + 9.6)} Q${_n2(48 + sw * 0.16)} ${_n2(y0b + 12.4)} ${_n2(48 + sw * 0.33)} ${_n2(y0b + 9)}" fill="none" stroke="${dobra}" stroke-width="${_n2(0.8 + 0.4 * k)}" stroke-linecap="round" opacity="${_n2(0.3 + 0.3 * k)}"/>`;
                d += `<path d="M48 ${_n2(y0b + 11)} L48 66 M${_n2(48 - 4)} 61 Q48 62 ${_n2(48 + 4)} 61" fill="none" stroke="${dobra}" stroke-width="0.8" opacity="${_n2(0.18 + 0.22 * k)}"/>`;
                d += `<path d="M${_n2(48 - sw * 0.3)} ${_n2(y0b + 4)} Q${_n2(48 - sw * 0.18)} ${_n2(y0b + 2.6)} ${_n2(48 - 2)} ${_n2(y0b + 4.6)}" fill="none" stroke="${spriteShade(base, 0.5)}" stroke-width="1" opacity="${_n2(0.25 + 0.2 * k)}" stroke-linecap="round"/>`;
            }
            if (a.pants !== "nenhuma") {
                const belt = R.lin(0, 66, 0, 72, [[0, spriteShade(a.accentColor, 0.2)], [1, spriteShade(a.accentColor, -0.35)]]);
                d += spritePath(`M${_n2(48 - ww / 2 - 1)} 67.4 L${_n2(48 + ww / 2 + 1)} 67.4 L${_n2(48 + ww / 2 + 1.6)} 72 L${_n2(48 - ww / 2 - 1.6)} 72 Z`, belt);
            }
        }
    }
    if (spec.bare) d += spriteTorsoMarks(R, a, B, skin, x0, x1, ww, y0b);
    const bare = spec.bare;   // peito à mostra (sem camisa e sem roupa de cima que cubra o peito)
    if (bare && a.scar === "peito") d += `<path d="M${_n2(48 + 1)} 50.6 L${_n2(48 + 8)} 61 M${_n2(48 + 7.6)} 51.4 L${_n2(48 + 2)} 60" stroke="#8a2a20" stroke-width="1.2" stroke-linecap="round"/>`;
    if (bare && B.female) {
        // top: personagem feminina sem roupa em cima nunca fica com o peito de fora
        const top = a.secondaryColor;
        d += `<path d="M${_n2(x0 + 3)} ${_n2(y0b + 1)} L${_n2(x0 + 4.4)} 49.4 M${_n2(x1 - 3)} ${_n2(y0b + 1)} L${_n2(x1 - 4.4)} 49.4" stroke="${spriteShade(top, -0.2)}" stroke-width="1.4" stroke-linecap="round"/>`;
        d += spritePath(`M${_n2(x0 + 1)} 49.4 Q48 46.8 ${_n2(x1 - 1)} 49.4 L${_n2(x1 - 1.6)} 56 Q48 57.6 ${_n2(x0 + 1.6)} 56 Z`, R.lin(0, 48, 0, 57, [[0, spriteShade(top, 0.25)], [1, spriteShade(top, -0.3)]]));
    }
    if (a.pants === "nenhuma" && a.outerShirt !== "armadura_freeza" && !spriteCellCores(a)) {
        // sem calça: sempre de cueca (a do Freeza é a armadura do próprio corpo)
        const brief = a.secondaryColor;
        d += spritePath(`M${_n2(48 - ww / 2 - 0.8)} 69.4 L${_n2(48 + ww / 2 + 0.8)} 69.4 L${_n2(48 + hw / 2 + 0.8)} ${yh} Q${_n2(48 + 3)} ${_n2(yh + 2.6)} 48 ${_n2(yh + 3.6)} Q${_n2(48 - 3)} ${_n2(yh + 2.6)} ${_n2(48 - hw / 2 - 0.8)} ${yh} Z`,
            R.lin(0, 69, 0, yh + 3, [[0, spriteShade(brief, 0.25)], [1, spriteShade(brief, -0.35)]]));
        if (!SPRITE_MARCAS_FREEZA.includes(a.bodyMarks)) d += `<path d="M${_n2(48 - ww / 2 - 0.6)} 71 L${_n2(48 + ww / 2 + 0.6)} 71" stroke="${a.accentColor}" stroke-width="1.2"/>`;
    }
    s += d;
    // dobras de tecido / luz de contorno
    s += `<path d="M${_n2(x1 - 1)} ${_n2(y0b + 5)} Q${_n2(x1 + 0.4)} 58 ${_n2(48 + ww / 2 - 0.6)} 68" fill="none" stroke="${spriteShade(base, 0.55)}" stroke-width="1.1" opacity="0.4" stroke-linecap="round"/>`;
    s += `<path d="M${_n2(x0 + 4)} 58 Q${_n2(x0 + 6)} 62 ${_n2(48 - ww / 2 + 1)} 66" fill="none" stroke="${spriteShade(base, -0.5)}" stroke-width="0.8" opacity="0.28"/>`;
    return s;
}

// Marcas da raça sobre o tronco à mostra: carapaça branca com gota roxa (Freeza 2ª e 3ª formas), placas de
// metal (ciborgue) e gomos rosados + estrias no peito verde (Namek).
function spriteTorsoMarks(R, a, B, skin, x0, x1, ww, y0b) {
    const m = a.bodyMarks;
    let d = "";
    if (m === "carapaca_freeza") {
        const branco = R.lin(x0, y0b, x1, 62, [[0, "#ffffff"], [0.55, "#eceaf2"], [1, "#a9a6b8"]]);
        // desce pelas laterais até a cintura; no meio fica um recorte com a barriga rosada listrada acima do short
        const cx = ww * 0.3;
        d += spritePath(`M${_n2(x0 - 1)} ${_n2(y0b + 1)} Q48 ${_n2(y0b - 4.4)} ${_n2(x1 + 1)} ${_n2(y0b + 1)} Q${_n2(x1 + 1.4)} 58 ${_n2(48 + ww / 2 + 0.8)} 69.8 L${_n2(48 + cx)} 69.8 L${_n2(48 + cx)} 64.4 Q48 61.6 ${_n2(48 - cx)} 64.4 L${_n2(48 - cx)} 69.8 L${_n2(48 - ww / 2 - 0.8)} 69.8 Q${_n2(x0 - 1.4)} 58 ${_n2(x0 - 1)} ${_n2(y0b + 1)} Z`, branco);
        d += `<path d="M${_n2(x0 + 2)} 60 Q${_n2(x0 + 3.4)} 64 ${_n2(48 - cx - 1.6)} 68 M${_n2(x1 - 2)} 60 Q${_n2(x1 - 3.4)} 64 ${_n2(48 + cx + 1.6)} 68" fill="none" stroke="#9d9ab0" stroke-width="0.8" opacity="0.8"/>`;
        d += `<path d="M${_n2(48 - B.sw * 0.3)} ${_n2(y0b + 8.4)} Q${_n2(48 - B.sw * 0.14)} ${_n2(y0b + 11.4)} 48 ${_n2(y0b + 9.4)} Q${_n2(48 + B.sw * 0.14)} ${_n2(y0b + 11.4)} ${_n2(48 + B.sw * 0.3)} ${_n2(y0b + 8.4)}" fill="none" stroke="#8d8aa0" stroke-width="1" opacity="0.8"/>`;
        const gema = R.lin(44, 52, 52, 62, [[0, spriteShade(a.primaryColor, 0.6)], [0.45, a.primaryColor], [1, spriteShade(a.primaryColor, -0.5)]]);
        d += spritePath(`M${_n2(48 - 6)} ${_n2(y0b + 11)} Q48 ${_n2(y0b + 9)} ${_n2(48 + 6)} ${_n2(y0b + 11)} Q${_n2(48 + 5)} ${_n2(y0b + 15.4)} 48 ${_n2(y0b + 17.6)} Q${_n2(48 - 5)} ${_n2(y0b + 15.4)} ${_n2(48 - 6)} ${_n2(y0b + 11)} Z`, gema);
        d += `<ellipse cx="${_n2(48 - 2)}" cy="${_n2(y0b + 11.8)}" rx="2.4" ry="1" fill="#ffffff" opacity="0.7"/>`;
    }
    const cel = spriteCellCores(a);
    if (cel) {
        const sw = B.sw, hw = B.hw, yh = 77, P = (x, y) => `${_n2(x)} ${_n2(y)}`;
        const listras = (x0r, x1r, y0r, y1r, passo) => {
            let st = "";
            for (let y = y0r + passo * 0.6; y < y1r - 0.4; y += passo) st += `M${_n2(x0r)} ${_n2(y)} L${_n2(x1r)} ${_n2(y)} `;
            return `<path d="${st}" stroke="#8a2f10" stroke-width="0.7" opacity="0.85"/>`;
        };
        const laranja = (d) => spritePath(d, R.lin(40, 50, 56, 72, [[0, "#ffa060"], [0.5, SPRITE_CELL_LARANJA], [1, "#a8401a"]]));
        const preto = (d) => spritePath(d, R.lin(44, 48, 52, 66, [[0, "#4a4458"], [0.4, SPRITE_CELL_PRETO], [1, "#050407"]]));
        if (m === "cell_imperfeito") {
            // topo do peito e ombros verde escuro, placa laranja riscada até a cintura, escudo preto no meio do peito
            d += spritePath(`M${P(x0 - 1, y0b + 1)} Q48 ${_n2(y0b - 4.4)} ${P(x1 + 1, y0b + 1)} L${P(x1 - 1.4, y0b + 8)} Q48 ${_n2(y0b + 10.6)} ${P(x0 + 1.4, y0b + 8)} Z`, cel.D);
            d += laranja(`M${P(48 - ww * 0.46, y0b + 9)} Q48 ${_n2(y0b + 11.4)} ${P(48 + ww * 0.46, y0b + 9)} L${P(48 + ww * 0.42, 69)} L${P(48 - ww * 0.42, 69)} Z`);
            d += listras(48 - ww * 0.44, 48 + ww * 0.44, y0b + 10, 69, 2.2);
            d += preto(`M${P(48 - 4.6, y0b + 4)} L${P(48 + 4.6, y0b + 4)} L${P(48 + 3.6, y0b + 13)} L${P(48, y0b + 17)} L${P(48 - 3.6, y0b + 13)} Z`);
            d += `<ellipse cx="${_n2(48 - 1.4)}" cy="${_n2(y0b + 6.6)}" rx="1.6" ry="2.4" fill="#ffffff" opacity="0.5"/>`;
            d += laranja(`M${P(48 - hw * 0.34, 69.4)} L${P(48 + hw * 0.34, 69.4)} L${P(48 + hw * 0.2, yh + 2.4)} Q48 ${_n2(yh + 4)} ${P(48 - hw * 0.2, yh + 2.4)} Z`) + listras(48 - hw * 0.3, 48 + hw * 0.3, 69.6, yh + 2.6, 1.9);
            d += spriteCellPintas(x0 + 1, 52, 48 - ww * 0.46, 66, 3.2, 3.2, 3, 21, cel.pinta) + spriteCellPintas(x1 - 1, 52, 48 + ww * 0.46, 66, 3.2, 3.2, 3, 22, cel.pinta);
            d += spriteCellPintas(x0 + 3, y0b + 2.4, x1 - 3, y0b + 2.4, 4, 4, 5, 23, cel.pinta);
        }
        if (m === "cell_semi") {
            // verde escuro no peito/costas; barriga com chapa preta no meio e laterais laranja riscadas até a virilha
            d += preto(`M${P(48 - 3.6, y0b + 10)} L${P(48 + 3.6, y0b + 10)} L${P(48 + 3, 67)} Q48 69 ${P(48 - 3, 67)} Z`);
            d += laranja(`M${P(48 - 3.8, y0b + 12)} L${P(48 - ww * 0.48, y0b + 14)} L${P(48 - ww * 0.42, 69.6)} L${P(48 - 3.4, 69.6)} Z`) + laranja(`M${P(48 + 3.8, y0b + 12)} L${P(48 + ww * 0.48, y0b + 14)} L${P(48 + ww * 0.42, 69.6)} L${P(48 + 3.4, 69.6)} Z`);
            d += listras(48 - ww * 0.46, 48 - 3.6, y0b + 13, 69.6, 2.1) + listras(48 + 3.6, 48 + ww * 0.46, y0b + 13, 69.6, 2.1);
            d += spritePath(`M${P(48 - hw * 0.46, 69.2)} L${P(48 + hw * 0.46, 69.2)} L${P(48 + hw * 0.3, yh + 3)} Q48 ${_n2(yh + 5)} ${P(48 - hw * 0.3, yh + 3)} Z`, cel.D);
            d += laranja(`M${P(48 - hw * 0.26, 70.4)} L${P(48 + hw * 0.26, 70.4)} L${P(48 + hw * 0.16, yh + 2.2)} Q48 ${_n2(yh + 3.4)} ${P(48 - hw * 0.16, yh + 2.2)} Z`) + listras(48 - hw * 0.24, 48 + hw * 0.24, 70.6, yh + 2.4, 1.8);
            d += spriteCellPintas(x0 + 2, y0b + 3, x1 - 2, y0b + 3, 5, 5, 6, 24, cel.pinta) + spriteCellPintas(x0 + 3, y0b + 8, 48 - 5, y0b + 8, 4, 4, 2, 25, cel.pinta) + spriteCellPintas(48 + 5, y0b + 8, x1 - 3, y0b + 8, 4, 4, 2, 26, cel.pinta);
        }
        if (m === "cell_perfeito") {
            // peito e ombros pretos, chapa preta no meio da barriga, faixa roxa na cintura e protetor oval preto
            d += preto(`M${P(x0 - 1, y0b + 1)} Q48 ${_n2(y0b - 4.4)} ${P(x1 + 1, y0b + 1)} L${P(x1 - 0.6, y0b + 11)} Q${_n2(48 + sw * 0.2)} ${_n2(y0b + 15)} ${P(48, y0b + 12.6)} Q${_n2(48 - sw * 0.2)} ${_n2(y0b + 15)} ${P(x0 + 0.6, y0b + 11)} Z`);
            d += `<path d="M48 ${_n2(y0b + 2)} L48 ${_n2(y0b + 12)}" stroke="#3a3448" stroke-width="0.9"/>`;
            d += preto(`M${P(48 - 3, y0b + 12)} L${P(48 + 3, y0b + 12)} L${P(48 + 2.6, 66)} L${P(48 - 2.6, 66)} Z`);
            d += spriteCellPintas(x0 + 2, 58, 48 - 4, 64, 4, 4, 3, 27, cel.pinta) + spriteCellPintas(48 + 4, 58, x1 - 2, 64, 4, 4, 3, 28, cel.pinta);
            d += spritePath(`M${P(48 - ww / 2 - 0.8, 66)} L${P(48 + ww / 2 + 0.8, 66)} L${P(48 + ww / 2 + 1, 70)} L${P(48 - ww / 2 - 1, 70)} Z`, "#5a2a8a");
            d += `<path d="M${P(48 - ww / 2, 67.6)} L${P(48 + ww / 2, 67.6)}" stroke="#8a5ac0" stroke-width="0.7"/>`;
            d += spritePath(`M${P(48 - hw * 0.4, 70)} L${P(48 + hw * 0.4, 70)} L${P(48 + 2.2, yh + 3)} L${P(48 - 2.2, yh + 3)} Z`, "#5a2a8a");
            d += `<ellipse cx="48" cy="${_n2(yh - 1)}" rx="${_n2(hw * 0.2)}" ry="4" fill="${SPRITE_CELL_PRETO}" stroke="${SPRITE_OUTLINE}" stroke-width="0.9"/>`;
        }
    }
    if (m === "namek") {
        // centro do abdômen rosado com estrias e linhas finas na pele verde do peitoral
        const rosa = "#e5938f";
        d += spritePath(`M${_n2(48 - ww * 0.26)} ${_n2(y0b + 12)} Q48 ${_n2(y0b + 10.6)} ${_n2(48 + ww * 0.26)} ${_n2(y0b + 12)} L${_n2(48 + ww * 0.22)} 68 Q48 69.6 ${_n2(48 - ww * 0.22)} 68 Z`, rosa, `stroke="${spriteShade(skin, -0.5)}" stroke-width="0.8"`, "");
        let st = "";
        for (let y = y0b + 14; y < 67.5; y += 2.2) st += `M${_n2(48 - ww * 0.22)} ${_n2(y)} L${_n2(48 + ww * 0.22)} ${_n2(y)} `;
        d += `<path d="${st}" stroke="#9c4a4a" stroke-width="0.6" opacity="0.8"/>`;
        d += `<path d="M${_n2(48 - B.sw * 0.38)} ${_n2(y0b + 3)} Q${_n2(48 - B.sw * 0.3)} ${_n2(y0b + 7)} ${_n2(48 - B.sw * 0.34)} ${_n2(y0b + 10)} M${_n2(48 + B.sw * 0.38)} ${_n2(y0b + 3)} Q${_n2(48 + B.sw * 0.3)} ${_n2(y0b + 7)} ${_n2(48 + B.sw * 0.34)} ${_n2(y0b + 10)}" fill="none" stroke="${spriteShade(skin, -0.45)}" stroke-width="0.6" opacity="0.7"/>`;
    }
    return d;
}

// Peito à mostra: peitoral em duas placas com sombra embaixo e luz em cima, abdômen em gomos (3 pares), linha do
// meio, oblíquos e serrátil nas laterais — tudo na força do porte físico (B.mus). Corpo feminino: só tônus leve.
function spriteBareTorsoMuscles(B, skin, ww, y0b) {
    const k = B.mus;
    if (k <= 0) return "";
    const line = spriteShade(skin, -0.45), dark = spriteShade(skin, -0.3), light = spriteShade(skin, 0.45);
    let d = "";
    if (B.female) {
        d += `<path d="M48 ${_n2(y0b + 13)} L48 65.6 M${_n2(48 - ww * 0.36)} 57 Q${_n2(48 - ww * 0.3)} 62 ${_n2(48 - ww * 0.22)} 67 M${_n2(48 + ww * 0.36)} 57 Q${_n2(48 + ww * 0.3)} 62 ${_n2(48 + ww * 0.22)} 67" fill="none" stroke="${line}" stroke-width="0.8" stroke-linecap="round" opacity="0.4"/>`;
        return d + `<path d="M47.2 65.4 Q48 66.6 48.8 65.4" stroke="${line}" stroke-width="0.8" fill="none" opacity="0.6"/>`;
    }
    const pw = B.sw * (0.3 + 0.06 * k), top = y0b + 3.2, bot = y0b + 10.4 + 1.2 * k;
    for (const sd of [-1, 1]) {
        const X = (v) => _n2(48 + sd * v);
        // sombra embaixo do peitoral (meia-lua) + contorno de baixo + luz no alto do peito
        d += `<path d="M${X(0.6)} ${_n2(bot - 1.8)} Q${X(pw * 0.55)} ${_n2(bot + 1.2)} ${X(pw)} ${_n2(top + 3.4)} Q${X(pw * 0.62)} ${_n2(bot + 3.4)} ${X(0.6)} ${_n2(bot + 1.2)} Z" fill="${dark}" opacity="${_n2(0.45 + 0.3 * k)}"/>`;
        d += `<path d="M${X(0.6)} ${_n2(bot - 1.8)} Q${X(pw * 0.55)} ${_n2(bot + 1.2)} ${X(pw)} ${_n2(top + 3.4)}" fill="none" stroke="${line}" stroke-width="${_n2(0.9 + 0.6 * k)}" stroke-linecap="round"/>`;
        d += `<path d="M${X(pw * 0.25)} ${_n2(top + 1.6)} Q${X(pw * 0.6)} ${_n2(top + 0.2)} ${X(pw * 0.86)} ${_n2(top + 2.6)}" fill="none" stroke="${light}" stroke-width="${_n2(1 + 0.8 * k)}" stroke-linecap="round" opacity="${_n2(0.35 + 0.25 * k)}"/>`;
        // oblíquos: do lado das costelas até a cintura (o "V")
        d += `<path d="M${X(ww * 0.5 + 2.4)} ${_n2(bot + 1)} Q${X(ww * 0.46)} 62 ${X(ww * 0.3)} 69.4" fill="none" stroke="${line}" stroke-width="${_n2(0.7 + 0.5 * k)}" stroke-linecap="round" opacity="${_n2(0.45 + 0.4 * k)}"/>`;
        // serrátil (dentes nas costelas) só em quem é bem musculoso
        if (k > 0.8) [0, 1, 2].forEach(i => {
            const yy = bot + 0.6 + i * 2.2;
            d += `<path d="M${X(ww * 0.5 + 2.6 - i * 0.3)} ${_n2(yy)} l${_n2(-sd * 1.8)} ${_n2(0.9)}" stroke="${line}" stroke-width="0.7" stroke-linecap="round" opacity="0.6"/>`;
        });
    }
    // abdômen: linha do meio e 3 pares de gomos (luz em cima de cada gomo, sulco escuro embaixo)
    const aw = ww * 0.26 + 1.4 * k, a0 = bot + 1.6, step = (68.4 - a0) / 3;
    d += `<path d="M48 ${_n2(bot - 1.6)} L48 ${_n2(68.6)}" stroke="${line}" stroke-width="${_n2(0.8 + 0.5 * k)}" opacity="${_n2(0.55 + 0.35 * k)}"/>`;
    for (let i = 0; i < 3; i++) {
        const y = a0 + i * step;
        for (const sd of [-1, 1]) {
            const X = (v) => _n2(48 + sd * v);
            if (i > 0) d += `<path d="M${X(0.8)} ${_n2(y)} Q${X(aw * 0.55)} ${_n2(y + 0.9)} ${X(aw)} ${_n2(y - 0.3)}" fill="none" stroke="${line}" stroke-width="${_n2(0.7 + 0.4 * k)}" stroke-linecap="round" opacity="${_n2(0.45 + 0.4 * k)}"/>`;
            d += `<path d="M${X(1.4)} ${_n2(y + step * 0.32)} L${X(aw - 0.8)} ${_n2(y + step * 0.26)}" stroke="${light}" stroke-width="${_n2(Math.max(0.8, step * 0.32))}" stroke-linecap="round" opacity="${_n2(0.18 + 0.22 * k)}"/>`;
        }
    }
    return d + `<path d="M47.2 ${_n2(68)} Q48 ${_n2(69.2)} 48.8 ${_n2(68)}" stroke="${line}" stroke-width="0.8" fill="none" opacity="0.7"/>`;
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
function spriteHand(R, cx, cy, r, color, open, ang, parts) {
    const fill = R.rad(cx - r * 0.4, cy - r * 0.5, r * 1.9, [[0, spriteShade(color, 0.4)], [0.55, color], [1, spriteShade(color, -0.4)]]);
    if (parts) {
        // em duas partes, para juntar ao antebraço sem risco no pulso: o contorno vai por baixo do braço e o
        // preenchimento (sem contorno) por cima
        const full = spriteHand(R, cx, cy, r, color, open, ang);
        const base = full.replace(/fill="url\([^)]*\)"/, `fill="${SPRITE_OUTLINE}"`).replace(/<path[^>]*\/>/g, "").replace(/stroke-width="1"/, `stroke-width="3.8"`);
        return { base, fill: full.replace(/ stroke="#15110f" stroke-width="1"/, "") };
    }
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
    // anime: deltoide largo afinando no cotovelo; antebraço forte afinando no punho; manga do kimono larga.
    const mus = B.mus || 0;
    if (a.bodyMarks === "metal_freeza" && side < 0) spec = Object.assign({}, spec, { armUpper: SPRITE_METAL, armLower: SPRITE_METAL });
    const up = spriteMuscle(sx, sy, e[0], e[1], w * 1.35, w * 0.9, spec.armUpper, { bulge: 0.16 + 0.08 * mus, parts: true });
    const lo = spriteMuscle(e[0], e[1], h[0], h[1], w * (1.0 + 0.06 * mus), w * 0.72, spec.armLower, { bulge: 0.14 + 0.06 * mus, parts: true });
    const handColor = glove && glove.full ? glove.color : (spec.armLower === SPRITE_METAL ? SPRITE_METAL : skin);
    const dirA = Math.atan2(h[0] - e[0], -(h[1] - e[1])) * 180 / Math.PI;
    const mao = spriteHand(R, h[0], h[1], w * 0.52, handColor, handKind === "open", dirA + 180, true);
    s += up.base + lo.base + mao.base + up.fill + lo.fill + up.shade + lo.shade;   // braço + mão sem risco no pulso
    if (mus > 0) {
        const lin = (c) => spriteShade(c, -0.48), luz = (c) => spriteShade(c, 0.48);
        const peleUp = spec.armUpper === skin || spec.armUpper === SPRITE_ROSA_FREEZA;
        if (peleUp) {
            // separação bíceps/tríceps (sombra do lado de trás) e brilho na barriga do bíceps
            s += spriteMuscleLine(sx, sy, e[0], e[1], w, 0.4, 0.9, -0.2, -0.16, lin(spec.armUpper), 0.6 + 0.4 * mus, 0.3 + 0.35 * mus);
            s += spriteMuscleLine(sx, sy, e[0], e[1], w, 0.5, 0.78, 0.22, 0.1, luz(spec.armUpper), 0.8 + 0.6 * mus, 0.18 + 0.2 * mus);
        } else if (mus > 0.3) {
            s += spriteMuscleLine(sx, sy, e[0], e[1], w, 0.45, 0.85, -0.15, -0.18, lin(spec.armUpper), 0.7, 0.2 + 0.2 * mus);   // dobra da manga no bíceps
        }
        if (spec.armLower === skin || spec.armLower === SPRITE_ROSA_FREEZA) {
            // antebraço: músculo grosso perto do cotovelo afinando no punho
            s += spriteMuscleLine(e[0], e[1], h[0], h[1], w, 0.1, 0.55, 0.14, 0.18, lin(spec.armLower), 0.5 + 0.4 * mus, 0.25 + 0.3 * mus);
        }
    }
    s += spriteArmMarks(R, a, B, spec, skin, sx, sy, e, h, w, side);
    if (spec.spots) s += spriteSpots(sx, sy, e[0], e[1], [0.35, 0.68], w * 0.26);
    if (spec.sleeve) {
        const p = [sx + (e[0] - sx) * spec.sleeve.frac, sy + (e[1] - sy) * spec.sleeve.frac];
        s += spriteMuscle(sx, sy, p[0], p[1], w * 1.42, w * 1.2, spec.sleeve.color, { bulge: 0.04 });
    }
    if (glove) {
        const from = glove.full ? 0.5 : 0.6, to = glove.full ? 1 : 0.86;
        const q1 = [e[0] + (h[0] - e[0]) * from, e[1] + (h[1] - e[1]) * from], q2 = [e[0] + (h[0] - e[0]) * to, e[1] + (h[1] - e[1]) * to];
        if (glove.guard) {
            // braçadeira do Freeza: branca, larga, cobrindo do meio do antebraço ao punho, com a parte de fora marrom
            const g1 = [e[0] + (h[0] - e[0]) * 0.5, e[1] + (h[1] - e[1]) * 0.5], g2 = [e[0] + (h[0] - e[0]) * 0.9, e[1] + (h[1] - e[1]) * 0.9];
            s += spriteMuscle(g1[0], g1[1], g2[0], g2[1], w * 1.14, w * 1.02, glove.color, { bulge: 0.02 });
            s += spriteHalfGuard(g1[0], g1[1], g2[0], g2[1], w * 1.14, w * 1.02, glove.guard, 0);
        } else {
            s += spriteMuscle(q1[0], q1[1], q2[0], q2[1], w * 0.98, w * 0.86, glove.color, { bulge: 0 });
            if (glove.trim) s += spriteBand(q1[0], q1[1], q2[0], q2[1], w * 1.0, glove.trim, 1.5);
        }
    }
    s += mao.fill;
    return { svg: s, hand: h, elbow: e };
}

// Marcas no braço à mostra: listras rosadas (Freeza 1–3), placas roxas (forma final), segmentos de metal
// (ciborgue) e placas rosadas com estrias + faixa vermelha no punho (Namek).
function spriteArmMarks(R, a, B, spec, skin, sx, sy, e, h, w, side) {
    const m = a.bodyMarks;
    let s = "";
    if (spec.armUpper === SPRITE_ROSA_FREEZA) s += spriteStripes(sx, sy, e[0], e[1], w * 1.35, w * 0.9, 0.12, 0.94, 9, "#a8344f", 0.7, 0.8);
    if (spec.armLower === SPRITE_ROSA_FREEZA) s += spriteStripes(e[0], e[1], h[0], h[1], w * 1.05, w * 0.72, 0.08, 0.6, 5, "#a8344f", 0.7, 0.8);
    const cel = spriteCellCores(a);
    if (cel) {
        if (cel.verde(spec.armUpper)) s += spriteCellPintas(sx, sy, e[0], e[1], w * 1.35, w * 0.9, 5, 1 + side, cel.pinta);
        if (cel.verde(spec.armLower)) s += spriteCellPintas(e[0], e[1], h[0], h[1], w, w * 0.72, 4, 5 + side, cel.pinta);
        if (m === "cell_imperfeito") {
            s += `<ellipse cx="${_n2(e[0])}" cy="${_n2(e[1])}" rx="${_n2(w * 0.46)}" ry="${_n2(w * 0.36)}" fill="${SPRITE_CELL_JUNTA}" stroke="${SPRITE_OUTLINE}" stroke-width="0.7"/>`;
            s += `<ellipse cx="${_n2(sx)}" cy="${_n2(sy + 1.6)}" rx="${_n2(w * 0.5)}" ry="${_n2(w * 0.3)}" fill="${SPRITE_CELL_JUNTA}"/>`;
        }
        if (m === "cell_perfeito") s += `<ellipse cx="${_n2(e[0])}" cy="${_n2(e[1])}" rx="${_n2(w * 0.5)}" ry="${_n2(w * 0.42)}" fill="${cel.L}" stroke="${SPRITE_OUTLINE}" stroke-width="0.7"/>`;   // cotovelo verde
    }
    // forma final: faixa roxa perto do punho (no ciborgue, só no braço direito, que continua do Freeza)
    if ((m === "freeza" || m === "metal_freeza") && spec.armLower === skin) s += spritePlate(R, e[0], e[1], h[0], h[1], 0.72, B.l2 * 0.46, w * 0.86, a.primaryColor);
    if (m === "metal_freeza" && spec.armUpper === SPRITE_METAL) {
        const junta = "#2a3a6a";
        s += spriteStripes(sx, sy, e[0], e[1], w * 1.35, w * 0.9, 0.35, 0.8, 3, junta, 0.9, 0.9);
        s += spriteStripes(e[0], e[1], h[0], h[1], w, w * 0.72, 0.25, 0.85, 4, junta, 0.9, 0.9);
        s += `<circle cx="${_n2(e[0])}" cy="${_n2(e[1])}" r="${_n2(w * 0.42)}" fill="${junta}" stroke="${SPRITE_OUTLINE}" stroke-width="0.7"/>`;
    }
    if (m === "namek") {
        // placas rosadas com estrias no braço (ombro/bíceps e antebraço), separadas pela pele verde
        const rosa = "#e5938f", estria = "#9c4a4a";
        const placa = (p1, p2, t0, t1, w1, w2) => {
            const q1 = [p1[0] + (p2[0] - p1[0]) * t0, p1[1] + (p2[1] - p1[1]) * t0], q2 = [p1[0] + (p2[0] - p1[0]) * t1, p1[1] + (p2[1] - p1[1]) * t1];
            return spriteMuscle(q1[0], q1[1], q2[0], q2[1], w1, w2, rosa, { bulge: 0.1 }) + spriteStripes(q1[0], q1[1], q2[0], q2[1], w1, w2, 0.1, 0.9, 6, estria, 0.6, 0.85, 0.38);
        };
        if (spec.armUpper === skin) s += placa([sx, sy], e, 0.16, 0.86, w * 1.0, w * 0.66);
        if (spec.armLower === skin) {
            s += placa(e, h, 0.12, 0.74, w * 0.78, w * 0.56);
            const b1 = [e[0] + (h[0] - e[0]) * 0.8, e[1] + (h[1] - e[1]) * 0.8], b2 = [e[0] + (h[0] - e[0]) * 0.9, e[1] + (h[1] - e[1]) * 0.9];
            s += spriteMuscle(b1[0], b1[1], b2[0], b2[1], w * 0.8, w * 0.76, "#b3262e", { bulge: 0 });   // faixa vermelha no punho
        }
    }
    return s;
}

function spriteLegMarks(R, a, B, color, hx, hy, k, f, w, colorLo, side) {
    const m = a.bodyMarks;
    let s = "";
    const cel = spriteCellCores(a);
    if (cel) {
        // Cell: pintas só nas partes verdes; juntas azuis (1ª forma) e joelheira verde escura (2ª forma)
        if (cel.verde(color)) s += spriteCellPintas(hx, hy, k[0], k[1], w * 1.3, w * 0.92, 6, 3 + side, cel.pinta);
        if (cel.verde(colorLo)) s += spriteCellPintas(k[0], k[1], f[0], f[1], w * 0.95, w * 0.66, 4, 7 + side, cel.pinta);
        if (m === "cell_imperfeito") {
            s += `<ellipse cx="${_n2(k[0])}" cy="${_n2(k[1])}" rx="${_n2(w * 0.5)}" ry="${_n2(w * 0.36)}" fill="${SPRITE_CELL_JUNTA}" stroke="${SPRITE_OUTLINE}" stroke-width="0.7"/>`;
            s += `<ellipse cx="${_n2(f[0])}" cy="${_n2(f[1] - 1)}" rx="${_n2(w * 0.4)}" ry="${_n2(w * 0.26)}" fill="${SPRITE_CELL_JUNTA}"/>`;
        } else {
            const kc = m === "cell_semi" ? cel.D : cel.L;   // joelho verde por cima da canela preta
            s += `<ellipse cx="${_n2(k[0])}" cy="${_n2(k[1])}" rx="${_n2(w * 0.5)}" ry="${_n2(w * 0.42)}" fill="${kc}" stroke="${SPRITE_OUTLINE}" stroke-width="0.8"/>`;
            s += spriteCellPintas(k[0] - w * 0.3, k[1], k[0] + w * 0.3, k[1], w * 0.5, w * 0.5, 2, 11 + side, cel.pinta);
        }
    }
    if (color === SPRITE_ROSA_FREEZA) {
        s += spriteStripes(hx, hy, k[0], k[1], w * 1.3, w * 0.92, 0.08, 0.94, 10, "#a8344f", 0.7, 0.8);
        s += spriteStripes(k[0], k[1], f[0], f[1], w * 0.95, w * 0.66, 0.06, 0.5, 4, "#a8344f", 0.7, 0.8);
    }
    if (m === "freeza") s += spritePlate(R, k[0], k[1], f[0], f[1], 0.42, B.t2 * 0.55, w * 0.78, a.primaryColor);   // placa roxa na canela
    if (m === "metal_freeza" && color === SPRITE_METAL) {
        s += spriteStripes(hx, hy, k[0], k[1], w * 1.3, w * 0.92, 0.3, 0.85, 3, "#2a3a6a", 0.9, 0.9);
        s += spriteStripes(k[0], k[1], f[0], f[1], w * 0.95, w * 0.66, 0.3, 0.85, 3, "#2a3a6a", 0.9, 0.9);
        const joelho = R.rad(k[0] - 1, k[1] - 1, w * 0.7, [[0, "#ffb27a"], [0.6, "#d06a2a"], [1, "#7a3412"]]);
        s += `<ellipse cx="${_n2(k[0])}" cy="${_n2(k[1])}" rx="${_n2(w * 0.62)}" ry="${_n2(w * 0.52)}" fill="${joelho}" stroke="${SPRITE_OUTLINE}" stroke-width="0.8"/>`;   // joelheira cobre
    }
    return s;
}

function spriteLeg(R, a, B, spec, boot, skin, side, angles) {
    const hx = 48 + side * B.hw * 0.23 + SPRITE_TURN * (side > 0 ? 0.35 : -0.12), hy = B.hipY;
    const k = spriteSeg(hx, hy, angles[0], B.t1);
    const f = spriteSeg(k[0], k[1], angles[1], B.t2);
    const w = B.leg * (spec.legWide ? 1.13 : 1);
    const color = spec.legCover ? spec.leg : (a.bodyMarks === "metal_freeza" ? SPRITE_METAL : (spec.legSkin || skin));
    let s = "";
    // anime: coxa larga afinando no joelho; calça folgada (gi) cai larga até a bota.
    const wide = spec.legCover && spec.legWide;
    const coxa = spriteMuscle(hx, hy, k[0], k[1], w * (wide ? 1.55 : 1.3), w * (wide ? 1.22 : 0.92), color, { bulge: wide ? 0.08 : 0.14, parts: true });
    const colorLo = !spec.legCover && spec.legLower ? spec.legLower : color;
    const canela = spriteMuscle(k[0], k[1], f[0], f[1], w * (wide ? 1.22 : 0.95 + 0.05 * (B.mus || 0)), w * (wide ? 1.12 : 0.66), colorLo, { bulge: wide ? 0.04 : 0.12 + 0.06 * (B.mus || 0), parts: true });
    // pé comum: contorno por baixo da canela (sem risco no tornozelo), preenchimento no fim
    const fc = boot && boot.color && !boot.guard ? boot.color : skin;
    const pePath = `M${_n2(f[0] - 3.4)} ${_n2(f[1] - 1)} L${_n2(f[0] + 3.4)} ${_n2(f[1] - 1)} Q${_n2(f[0] + side * 7.6 + (side < 0 ? 2 : 0))} ${_n2(f[1] + 0.4)} ${_n2(f[0] + side * 6.4 + (side < 0 ? 1.4 : 0))} ${_n2(f[1] + 3.6)} L${_n2(f[0] - 3.8)} ${_n2(f[1] + 3.6)} Z`;
    const peGiro = `rotate(${_n2(angles[1] * 0.45 + side * 4)} ${_n2(f[0])} ${_n2(f[1])})`;
    const garras = boot && boot.claws;
    const sapatoCell = boot && boot.sapato;
    const peBase = garras || sapatoCell ? "" : `<g transform="${peGiro}"><path d="${pePath}" fill="${SPRITE_OUTLINE}" stroke="${SPRITE_OUTLINE}" stroke-width="3.8" stroke-linejoin="round"/></g>`;
    s += coxa.base + canela.base + peBase + coxa.fill + canela.fill + coxa.shade + canela.shade;
    const mus = B.mus || 0;
    if (mus > 0) {
        const lin = spriteShade(color, -0.48), luz = spriteShade(color, 0.48);
        if (color === skin || color === SPRITE_ROSA_FREEZA) {
            // quadríceps (gota acima do joelho) e panturrilha
            s += spriteMuscleLine(hx, hy, k[0], k[1], w, 0.35, 0.92, 0.2, 0.26, lin, 0.6 + 0.4 * mus, 0.3 + 0.35 * mus);
            s += spriteMuscleLine(k[0], k[1], f[0], f[1], w, 0.1, 0.55, -0.28, -0.2, lin, 0.5 + 0.4 * mus, 0.28 + 0.32 * mus);
        } else if (mus > 0.3) {
            // calça: dobra do tecido marcando a coxa
            s += spriteMuscleLine(hx, hy, k[0], k[1], w, 0.35, 0.85, 0.18, 0.22, lin, 0.7, 0.18 + 0.2 * mus);
        }
    }
    if (!spec.legCover) s += spriteLegMarks(R, a, B, color, hx, hy, k, f, w, colorLo, side);
    if (a.bodyMarks === "cell") s += spriteSpots(hx, hy, k[0], k[1], [0.3, 0.66], w * 0.28);   // pintas do Cell (corpo, não calça)
    if (boot && boot.guard) {
        // caneleira do Freeza: branca, do meio da canela ao tornozelo, com a parte de fora marrom e frisos
        const from = [f[0] + (k[0] - f[0]) * boot.h, f[1] + (k[1] - f[1]) * boot.h], to = [f[0] + (k[0] - f[0]) * 0.06, f[1] + (k[1] - f[1]) * 0.06];
        s += spriteMuscle(from[0], from[1], to[0], to[1], w * 1.12, w * 1.0, boot.color, { bulge: 0.03 });
        s += spriteHalfGuard(from[0], from[1], to[0], to[1], w * 1.12, w * 1.0, boot.trim, 4);
    } else if (boot && boot.color) {
        const from = [f[0] + (k[0] - f[0]) * boot.h, f[1] + (k[1] - f[1]) * boot.h];
        s += spriteMuscle(from[0], from[1], f[0], f[1], w * 0.98, w * 0.86, boot.color, { bulge: 0 });
        s += spriteBand(from[0], from[1], f[0], f[1], w * 1.04, boot.trim, 1.8);
    }
    const celP = spriteCellCores(a);
    if (garras) return { svg: s + spriteClawFoot(f, side, angles[1] * 0.45 + side * 4, a.bodyMarks === "metal_freeza" ? SPRITE_METAL : (celP ? celP.pe : skin)), foot: f, knee: k };
    if (boot && boot.sapato) return { svg: s + spriteCellShoe(f, side, angles[1] * 0.45 + side * 4, boot.sapato), foot: f, knee: k };
    s += `<g transform="${peGiro}"><path d="${pePath}" fill="${fc}"/>` +
        `<path d="M${_n2(f[0] - 3.6)} ${_n2(f[1] + 2.4)} L${_n2(f[0] + side * 6.2)} ${_n2(f[1] + 2.4)}" stroke="${spriteShade(fc, -0.45)}" stroke-width="1.3"/></g>`;
    return { svg: s, foot: f, knee: k };
}

// Curva cônica (cauda, capa): amostra uma Bézier cúbica e desenha segmentos com espessura decrescente.
function spriteTaper(pts, w0, w1, color, tipColor, stripe) {
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
        if (stripe && col === color) {
            // listras/gomos atravessando a cauda (duas por trecho)
            for (const t of [0.25, 0.75]) {
                const P = [A[0] + (Bp[0] - A[0]) * t, A[1] + (Bp[1] - A[1]) * t], L = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]) || 1;
                const nx = -(Bp[1] - A[1]) / L * w * 0.48, ny = (Bp[0] - A[0]) / L * w * 0.48;
                h += `<line x1="${_n2(P[0] - nx)}" y1="${_n2(P[1] - ny)}" x2="${_n2(P[0] + nx)}" y2="${_n2(P[1] + ny)}" stroke="${stripe}" stroke-width="0.7" opacity="0.85"/>`;
            }
        }
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
    if (a.wings === "cell_abertas") {
        // asas de inseto pretas abertas nas costas, longas, apontando para baixo e para fora
        const up = flap * 3;
        const wf = R.lin(40, 40, 80, 110, [[0, "#3c3848"], [0.6, "#16131c"], [1, "#0b0a0f"]]);
        const asa = (m) => spritePath(`M${48 + m * 3} 46 C${48 + m * 20} ${44 + up} ${48 + m * 32} ${56 + up} ${48 + m * 33} ${76 + up} C${48 + m * 32} ${92 + up} ${48 + m * 26} ${104 + up} ${48 + m * 22} ${108 + up} C${48 + m * 20} ${92} ${48 + m * 12} ${70} ${48 + m * 4} 58 Z`, wf);
        s += asa(-1) + asa(1);
        s += `<path d="M${48 - 6} 50 C${48 - 22} ${54 + up} ${48 - 28} ${70 + up} ${48 - 24} ${100 + up} M${48 + 6} 50 C${48 + 22} ${54 + up} ${48 + 28} ${70 + up} ${48 + 24} ${100 + up}" stroke="#5b5070" stroke-width="0.8" fill="none" opacity="0.7"/>`;
    }
    if (a.tail === "cell") {
        // rabo grande do Cell: verde com pintas (1ª forma) ou meio preto/meio laranja riscado (2ª), ponta bege de ferrão
        const semi = a.bodyMarks === "cell_semi";
        const cel = spriteCellCores(a) || { D: "#3e8a2c" };
        const pts = [[44, 74], [24, 84], [16, 104], [4, 92]];
        s += spriteTaper(pts, 7.4, 4.4, semi ? SPRITE_CELL_PRETO : cel.D, null, null);
        if (semi) s += spriteTaper(pts.map(([x, y]) => [x + 0.6, y - 1.6]), 3.8, 2.2, SPRITE_CELL_LARANJA, null, "#8a2f10");
        else s += spriteCellPintas(44, 74, 18, 98, 6, 5, 6, 31, cel.pinta);
        // ferrão: base em anel bege e ponta fina
        s += `<ellipse cx="4" cy="92" rx="3.4" ry="2.6" fill="#e2c79a" stroke="${SPRITE_OUTLINE}" stroke-width="0.9"/><path d="M2.6 90.6 L-6 86 L2 93.6 Z" fill="#d8b884" stroke="${SPRITE_OUTLINE}" stroke-width="0.8" stroke-linejoin="round"/>`;
    }
    if (a.wings === "cell") {
        // asas de inseto do Cell: pretas, fechadas nas costas, apontando para baixo, com borda verde
        const up = flap * 2;
        const wf = R.lin(40, 40, 60, 90, [[0, "#3a3742"], [1, "#121116"]]);
        const wing = (m) => spritePath(`M${48 + m * 4} 47 C${48 + m * 15} ${48 + up} ${48 + m * 19} ${62 + up} ${48 + m * 16} ${84 + up} C${48 + m * 12} ${76 + up} ${48 + m * 8} ${64} ${48 + m * 4} 58 Z`, wf);
        s += wing(-1) + wing(1);
        s += `<path d="M${48 - 14} ${50 + up} C${48 - 17.5} ${62 + up} ${48 - 16.6} ${74 + up} ${48 - 15.4} ${80 + up} M${48 + 14} ${50 + up} C${48 + 17.5} ${62 + up} ${48 + 16.6} ${74 + up} ${48 + 15.4} ${80 + up}" stroke="${a.primaryColor}" stroke-width="1.4" fill="none"/>`;
    }
    if (a.cape === "capa" || a.cape === "capa_ombreiras") {
        const sway = (pose.capeSway || 0) * 11;
        const cc = a.capeColor || "#ffffff";
        const x0 = 48 - B.sw / 2 - 1, x1 = 48 + B.sw / 2 + 1, yb = 118;   // tronco encolhido do anime: a capa desce mais
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
        const tw = 1.5;   // rabo grosso (visível no pixel art)
        // rosado listrado com ponta roxa (formas 1 a 3), de metal em gomos (ciborgue) ou liso na cor do corpo (forma final)
        const rosa = SPRITE_MARCAS_ROSA.includes(a.bodyMarks), metal = a.bodyMarks === "metal_freeza";
        const cor = rosa ? SPRITE_ROSA_FREEZA : (metal ? "#c3ccd9" : skin);
        s += spriteTaper([[47, 77], [36 - sw * 2, 92], [58 + sw * 4, 104], [78 + sw * 6, 92]], 6.6 * tw, 2.4 * tw, cor, rosa ? a.primaryColor : null, rosa ? "#a8344f" : (metal ? "#2a3a6a" : null));
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
    const dome = (side, rx, ry, base, rim) => {
        // placa arredondada com cúpula brilhante (ombros da raça do Freeza / ciborgue)
        const cx = 48 + side * (B.sw / 2 - 0.4), cy = 46.6;
        const f = R.rad(cx - side * 1.6 - 1.4, cy - 2, rx * 1.3, [[0, spriteShade(base, 0.6)], [0.45, base], [1, spriteShade(base, -0.5)]]);
        return (rim ? `<ellipse cx="${_n2(cx + side * 1.2)}" cy="${_n2(cy + 0.4)}" rx="${_n2(rx + 3.6)}" ry="${_n2(ry + 2.2)}" fill="${rim}" stroke="${SPRITE_OUTLINE}" stroke-width="1"/>` : "") +
            `<ellipse cx="${_n2(cx)}" cy="${_n2(cy)}" rx="${_n2(rx)}" ry="${_n2(ry)}" fill="${f}" stroke="${SPRITE_OUTLINE}" stroke-width="0.9"/>` +
            `<ellipse cx="${_n2(cx - side * 1.4 - 1)}" cy="${_n2(cy - ry * 0.4)}" rx="${_n2(rx * 0.35)}" ry="${_n2(ry * 0.25)}" fill="#ffffff" opacity="0.7"/>`;
    };
    const bracoNu = !(a.innerShirt && a.innerShirt !== "nenhuma") && !["jaqueta_trunks", "traje_android", "armadura_cell"].includes(a.outerShirt);
    if (a.outerShirt === "armadura_freeza") {
        const metal = a.bodyMarks === "metal_freeza";   // ciborgue: ombro esquerdo (de trás) de cobre, o direito continua roxo
        s += dome(-1, 4.6, 3.6, metal ? "#d06a2a" : a.primaryColor) + dome(1, 4.6, 3.6, a.primaryColor);
    } else if (a.bodyMarks === "carapaca_freeza" && bracoNu) {
        s += dome(-1, 6.2, 4.4, a.primaryColor, "#f2f1f6") + dome(1, 6.2, 4.4, a.primaryColor, "#f2f1f6");   // placas largas e proeminentes
    }
    const celO = spriteCellCores(a);
    if (celO && bracoNu && (a.bodyMarks === "cell_semi" || a.bodyMarks === "cell_perfeito")) {
        // ombros do Cell: grandes, verde escuro com pintas (semi-perfeito) ou pretos (perfeito)
        const cor = a.bodyMarks === "cell_semi" ? celO.D : SPRITE_CELL_PRETO;
        [-1, 1].forEach(side => {
            const cx = 48 + side * (B.sw / 2 - 0.6), cy = 46.4;
            s += `<ellipse cx="${_n2(cx)}" cy="${cy}" rx="${_n2(5.6 + B.arm * 0.2)}" ry="4.6" fill="${R.lin(cx - 6, cy - 4, cx + 6, cy + 5, [[0, spriteShade(cor, 0.4)], [0.5, cor], [1, spriteShade(cor, -0.45)]])}" stroke="${SPRITE_OUTLINE}" stroke-width="1"/>`;
            if (a.bodyMarks === "cell_semi") s += spriteCellPintas(cx - 4, cy, cx + 4, cy, 6, 6, 3, 40 + side, celO.pinta);
            else s += `<ellipse cx="${_n2(cx - side * 1.2 - 1)}" cy="${cy - 1.6}" rx="2" ry="1" fill="#ffffff" opacity="0.3"/>`;
        });
    }
    if (a.outerShirt === "armadura_exercito") {
        // ombreiras do exército do Freeza: largas, douradas com frisos e borda branca, apontando para os lados
        const asa = (side) => {
            const r = 48 + side * (B.sw / 2 + 13), m = 48 + side * 4;
            const f = R.lin(m, 41, m, 51, [[0, spriteShade(a.accentColor, 0.2)], [0.45, a.accentColor], [1, spriteShade(a.accentColor, -0.55)]]);
            let g = spritePath(`M${_n2(m)} 43.4 Q${_n2(48 + side * (B.sw / 2 + 3))} 38.4 ${_n2(r)} 43.4 Q${_n2(r + side * 1.6)} 47.6 ${_n2(r - side * 1.6)} 50.6 L${_n2(48 + side * (B.sw / 2 - 3))} 51.6 Q${_n2(m + side * 2)} 48 ${_n2(m)} 43.4 Z`, f, `stroke="#f4f4f2" stroke-width="1.6"`, "");
            let fr = "";
            for (let i = 1; i <= 4; i++) { const x = m + (r - m) * (i / 5); fr += `M${_n2(x)} ${_n2(42.4 + i * 0.2)} L${_n2(x - side * 0.6)} ${_n2(49.4 - i * 0.1)} `; }
            g += `<path d="${fr}" stroke="${spriteShade(a.accentColor, -0.5)}" stroke-width="0.8" opacity="0.85"/>`;
            return g + `<path d="M${_n2(m)} 43.4 Q${_n2(48 + side * (B.sw / 2 + 3))} 38.4 ${_n2(r)} 43.4 Q${_n2(r + side * 1.6)} 47.6 ${_n2(r - side * 1.6)} 50.6 L${_n2(48 + side * (B.sw / 2 - 3))} 51.6 Q${_n2(m + side * 2)} 48 ${_n2(m)} 43.4 Z" fill="none" stroke="${SPRITE_OUTLINE}" stroke-width="0.7"/>`;
        };
        s += asa(-1) + asa(1);
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
    R.cel = true;
    const skin = spriteSkin(a);
    const ssj = !!(opts && opts.ssj) || pose.ssj;
    const ctx = { skin, ssj };
    const spec = spriteOutfitSpec(a, skin);
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
    fig += torsoWrap(spriteBack(R, a, B, pose, skin));   // capa/asas/cauda acompanham ombros e quadril
    fig += headWrap(headParts.back);          // cabelo comprido fica ATRÁS do corpo
    fig += torsoWrap(spriteTorsoOutline(B, pose));
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
        // escudo do parry: envolve o corpo inteiro (é a área que rebate, PARRY_RADIUS em gameplay.js), menor que a aura
        const sh = R.rad(48, 60, 50, [[0.55, kiColor, 0], [0.86, kiColor, 0.25 * pose.shield], [1, "#ffffff", 0.75 * pose.shield]]);
        fig += `<ellipse cx="48" cy="60" rx="42" ry="50" fill="${sh}" stroke="${spriteShade(kiColor, 0.55)}" stroke-width="1.8" opacity="${_n2(0.9 * pose.shield)}"/>`;
        fig += `<path d="M14 40 Q48 14 82 40" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="${_n2(0.7 * pose.shield)}"/>`;
    }

    // luz de contorno (rim light) sobre a figura toda + brilho dourado quando transformado
    let behind = "";
    const ssjGlow = ssj && !(opts && opts.noGlow);   // na luta a aura de ki já faz o brilho (menu.js)
    if (pose.flash > 0 || ssjGlow) {
        const f = Math.max(pose.flash, ssjGlow ? 0.4 : 0);
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
    // Estilo pixel art: sem suavização de bordas (cores chapadas, sem "borrado") e traços com pelo menos ~1 pixel
    // na tela do jogo (no jogo, 1 pixel = 2 unidades deste desenho) — senão os contornos internos somem.
    const crisp = body.replace(/stroke-width="([\d.]+)"/g, (m, v) => `stroke-width="${_n2(+v >= 1 ? Math.max(+v, 1.9) : +v)}"`);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${SPRITE_VIEW.w} ${SPRITE_VIEW.h}" shape-rendering="crispEdges"><defs>${R.defs.join("")}</defs>${crisp}</svg>`;
}

function spriteSvgToUrl(svg) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function generateSpriteFrameUrl(appearance, state, frameIndex, opts) {
    return spriteSvgToUrl(generateSpriteFrameSvg(appearance, state, frameIndex, opts));
}

// Todos os quadros de um estado (com cache: gerar SVG é barato, mas não precisa repetir a cada partida).
// Guarda no máximo SPRITE_FRAME_CACHE_MAX movimentos (o construtor cria uma aparência nova a cada ajuste;
// sem limite a memória só crescia). Os mais antigos saem primeiro.
const _spriteFrameCache = new Map();
const SPRITE_FRAME_CACHE_MAX = 400;
function getProceduralFrameUrls(appearance, state, opts) {
    const a = normalizeAppearance(appearance);
    const o = opts || {};
    const key = JSON.stringify([a, state, !!o.ssj, o.kiColor || "", !!o.noGlow]);
    if (_spriteFrameCache.has(key)) return _spriteFrameCache.get(key);
    const n = SPRITE_FRAME_COUNTS[state] || 1;
    const frames = [];
    for (let i = 0; i < n; i++) frames.push(generateSpriteFrameUrl(a, state, i, o));
    if (_spriteFrameCache.size >= SPRITE_FRAME_CACHE_MAX) _spriteFrameCache.delete(_spriteFrameCache.keys().next().value);
    _spriteFrameCache.set(key, frames);
    return frames;
}

// ---------------------------------------------------------------------------
// MODELOS (presets): personagens do anime montados com as peças do construtor.
// ---------------------------------------------------------------------------
const SPRITE_PRESETS = {
    goku: { label: "Goku", appearance: { gender: "masculino", race: "Saiyajin", build: "musculoso", hairStyle: "goku", hairColor: "#16110f", eyeType: "normal", irisColor: "#1a1210", mouthType: "smile", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "none", outerShirt: "kimono", innerShirt: "camiseta", pants: "larga", shoes: "botas_artes", gloves: "pulseiras", primaryColor: "#f2680d", secondaryColor: "#1c45b0", accentColor: "#f7d23c", shirtColor: "#1c45b0", pantsColor: "#f2680d", symbol: "kai", kiColor: "#5be3ff" } },
    vegeta: { label: "Vegeta", appearance: { gender: "masculino", race: "Saiyajin", build: "normal", hairStyle: "vegeta", hairColor: "#100e18", eyeType: "serio", irisColor: "#161a24", mouthType: "serio", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "none", outerShirt: "armadura_saiyajin", innerShirt: "malha", pants: "justa", shoes: "botas_saiyajin", gloves: "luvas_saiyajin", primaryColor: "#1b3fa0", secondaryColor: "#f4f4f8", accentColor: "#e8b93a", shirtColor: "#1b3fa0", pantsColor: "#1b3fa0", kiColor: "#ffe45a" } },
    piccolo: { label: "Piccolo", appearance: { gender: "masculino", race: "Namekuseijin", build: "musculoso", hairStyle: "careca", eyeType: "bravo", irisColor: "#151515", mouthType: "serio", earType: "pontuda", headFeature: "antenas", bodyMarks: "namek", accessory: "none", hat: "turbante", outerShirt: "gi_piccolo", innerShirt: "nenhuma", pants: "larga", shoes: "botas_marrons", gloves: "nenhuma", primaryColor: "#5b2e91", secondaryColor: "#20336f", accentColor: "#f5f5f7", shirtColor: "#20336f", pantsColor: "#5b2e91", cape: "capa_ombreiras", capeColor: "#f6f6f8", kiColor: "#e9ff7a" } },
    freeza: { label: "Freeza", appearance: { gender: "masculino", race: "Raça Freeza", build: "magro", skinColor: "#cdb8ea", hairStyle: "careca", eyeType: "freeza", irisColor: "#d81f3f", mouthType: "maligno", earType: "nenhuma", headFeature: "capacete_freeza", bodyMarks: "listras_freeza", accessory: "none", outerShirt: "armadura_exercito", innerShirt: "nenhuma", pants: "nenhuma", shoes: "caneleiras_freeza", gloves: "bracadeiras_freeza", primaryColor: "#8a3fc0", secondaryColor: "#17141c", accentColor: "#d0962e", shirtColor: "#17141c", pantsColor: "#17141c", tail: "freeza", kiColor: "#ff5be0" } },
    trunks: { label: "Trunks do Futuro", appearance: { gender: "masculino", race: "Saiyajin", build: "normal", hairStyle: "trunks_futuro", hairColor: "#8c7ee0", eyeType: "serio", irisColor: "#2a4a86", mouthType: "serio", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "none", outerShirt: "jaqueta_trunks", innerShirt: "malha", pants: "justa", shoes: "botas_trunks", gloves: "nenhuma", primaryColor: "#3f66c8", secondaryColor: "#20263a", accentColor: "#d7b25a", shirtColor: "#20263a", pantsColor: "#1e2437", symbol: "cc", backWeapon: "espada_trunks", kiColor: "#9fd0ff" } },
    gohan: { label: "Gohan (jovem)", appearance: { gender: "masculino", race: "Saiyajin", build: "normal", hairStyle: "gohan", hairColor: "#16110f", eyeType: "gentil", irisColor: "#1a1210", mouthType: "smile", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "none", outerShirt: "gi_piccolo", innerShirt: "nenhuma", pants: "larga", shoes: "botas_marrons", gloves: "nenhuma", primaryColor: "#5b2e91", secondaryColor: "#20336f", accentColor: "#f5f5f7", shirtColor: "#20336f", pantsColor: "#5b2e91", cape: "capa_ombreiras", capeColor: "#f6f6f8", kiColor: "#ffd45b" } },
    kaioshin: { label: "Supremo Sr. Kaio", appearance: { gender: "masculino", race: "Kaioshin", build: "magro", hairStyle: "kaioshin_moicano", hairColor: "#f4f4f4", eyeType: "gentil", irisColor: "#2a2a44", mouthType: "smile", earType: "pontuda", headFeature: "none", bodyMarks: "none", accessory: "potara", outerShirt: "roupa_kaioshin", innerShirt: "nenhuma", pants: "larga", shoes: "botas_kaioshin", gloves: "nenhuma", primaryColor: "#5648b8", secondaryColor: "#f3eedd", accentColor: "#f2c94c", shirtColor: "#f3eedd", pantsColor: "#f3eedd", kiColor: "#c9a0ff" } },
    fusao: { label: "Fusão (Gogeta)", appearance: { gender: "masculino", race: "Saiyajin", build: "musculoso", hairStyle: "goku", hairColor: "#111018", eyeType: "serio", irisColor: "#161a24", mouthType: "maligno", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "potara", outerShirt: "colete_fusao", innerShirt: "regata", pants: "larga", shoes: "botas_saiyajin", gloves: "pulseiras", primaryColor: "#1c3fb0", secondaryColor: "#2a2f45", accentColor: "#f5c518", shirtColor: "#262a3e", pantsColor: "#f4f1e8", kiColor: "#7fd8ff" } },
    bardock: { label: "Bardock", appearance: { gender: "masculino", race: "Saiyajin", build: "musculoso", hairStyle: "bardock", hairColor: "#0e0c10", eyeType: "bravo", irisColor: "#141014", mouthType: "maligno", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "scouter", hat: "faixa", outerShirt: "armadura_saiyajin", innerShirt: "malha", pants: "justa", shoes: "botas_saiyajin", gloves: "luvas_pretas", primaryColor: "#2b2430", secondaryColor: "#5a4636", accentColor: "#b88a3a", shirtColor: "#2b2430", pantsColor: "#2b2430", tail: "cinto_saiyajin", scar: "bochecha", kiColor: "#ff9a5b" } },
    android17: { label: "Androide 17", appearance: { gender: "masculino", race: "Android", build: "normal", hairStyle: "android17", hairColor: "#12121a", eyeType: "android", irisColor: "#3a6fa8", mouthType: "serio", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "none", outerShirt: "traje_android", innerShirt: "malha", pants: "justa", shoes: "botas_marrons", gloves: "nenhuma", primaryColor: "#24262f", secondaryColor: "#2f3a55", accentColor: "#e8752a", shirtColor: "#2f3a55", pantsColor: "#2f3a55", kiColor: "#ffe07a" } },
    android18: { label: "Androide 18", appearance: { gender: "feminino", race: "Android", build: "magro", hairStyle: "android18", hairColor: "#ffe27a", eyeType: "android", irisColor: "#4aa3e8", mouthType: "serio", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "none", outerShirt: "traje_android", innerShirt: "malha", pants: "justa", shoes: "botas_marrons", gloves: "nenhuma", primaryColor: "#33507a", secondaryColor: "#20293a", accentColor: "#f4f1e8", shirtColor: "#20293a", pantsColor: "#20293a", kiColor: "#a9e3ff" } },
    majin: { label: "Majin Buu", appearance: { gender: "masculino", race: "Majin", build: "gordo", hairStyle: "careca", eyeType: "normal", irisColor: "#101010", mouthType: "smile", earType: "majin", headFeature: "majin_antena", bodyMarks: "none", accessory: "none", outerShirt: "colete_buu", innerShirt: "nenhuma", pants: "larga", shoes: "botas_kaioshin", gloves: "luvas_saiyajin", primaryColor: "#f4f1e8", secondaryColor: "#7a3f8f", accentColor: "#d7a23a", shirtColor: "#7a3f8f", pantsColor: "#f4f1e8", cape: "capa", capeColor: "#5a2f7a", kiColor: "#ff9de0" } },
    raditz: { label: "Raditz", appearance: { gender: "masculino", race: "Saiyajin", build: "musculoso", hairStyle: "raditz", hairColor: "#0e0c10", eyeType: "serio", irisColor: "#141014", mouthType: "maligno", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "scouter", outerShirt: "armadura_saiyajin", innerShirt: "malha", pants: "justa", shoes: "botas_saiyajin", gloves: "luvas_pretas", primaryColor: "#232c48", secondaryColor: "#c9c2b8", accentColor: "#c9a13a", shirtColor: "#232c48", pantsColor: "#232c48", tail: "saiyajin", kiColor: "#ff7ad9" } },
    cell: { label: "Cell", appearance: { gender: "masculino", race: "Bio-Androide", build: "normal", skinColor: "#86bf3e", hairStyle: "careca", hairColor: "#3e8a2c", eyeType: "serio", irisColor: "#d0466e", mouthType: "serio", earType: "nenhuma", headFeature: "capacete_cell1", bodyMarks: "cell_imperfeito", accessory: "none", outerShirt: "none", innerShirt: "nenhuma", pants: "nenhuma", shoes: "pes_garras", gloves: "nenhuma", primaryColor: "#3e8a2c", secondaryColor: "#17141c", accentColor: "#e8662a", shirtColor: "#17141c", pantsColor: "#3e8a2c", wings: "cell_abertas", tail: "cell", kiColor: "#7dff7a" } },
    broly: { label: "Broly", appearance: { gender: "masculino", race: "Saiyajin", build: "gigante", hairStyle: "broly", hairColor: "#213018", eyeType: "bravo", irisColor: "#1a2a1a", mouthType: "serio", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "none", outerShirt: "none", innerShirt: "nenhuma", pants: "larga", shoes: "descalco", gloves: "pulseiras", primaryColor: "#8a6a2a", secondaryColor: "#c9a13a", accentColor: "#e8c04a", shirtColor: "#c9a13a", pantsColor: "#8a6a2a", kiColor: "#7dff7a" } }
};


if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        SPRITE_VIEW, SPRITE_STATES, SPRITE_FRAME_COUNTS, SPRITE_PRESETS, SPRITE_DEFAULT_APPEARANCE,
        normalizeAppearance, spriteTransformAppearance, spriteAppearanceDiff, SPRITE_DEFAULT_TRANSFORMATION, SPRITE_SAIYAN_HAIR, spritePoseFor, generateSpriteFrameSvg, generateSpriteFrameUrl, getProceduralFrameUrls, spriteSvgToUrl,
        spriteMix, spriteShade
    };
}
