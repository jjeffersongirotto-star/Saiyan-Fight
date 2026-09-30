// Testes unitários das funções puras de gameplay.
// Rodar com: node --test tests/game-logic-core.test.js
// (Node >= 18, sem dependências externas.)

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    removeBackgroundColor,
    colorHexToRgb,
    rgbToHex,
    normalizeBgRemoval,
    getBgRemovalKey,
    pickCornerColor,
    PAD_ACTIONS,
    DEFAULT_PAD_BINDINGS,
    getPadButtonName,
    normalizePadBindings,
    assignPadButton,
    describePadBinding,
    findNextTargetIndex,
    cycleIndex,
    getNextPaletteColor,
    stepNumberValue,
    getScrollToRevealRow,
    stripSvgWhiteBackground,
    NORMAL_ATTACK_DAMAGE,
    WAVE_DIFFICULTY_CAP,
    STAGE_PROGRESSION,
    getStageBossDefeats,
    STAGE_MODE_WAVE_COUNT,
    NORMAL_MODE_WAVES,
    HARD_MODE_WAVES,
    getModeWaveSequence,
    getRealWaveForModeStep,
    isStageUnlockedByProgress,
    isUnlimitedModeUnlocked,
    isHardModeUnlocked,
    getParryComboBonus,
    getBuffedAttackDamage,
    getSuperAttackDamage,
    getBeamClashPush,
    canUseSpecial,
    SPECIAL_DAMAGE_MULTIPLIER,
    TOUCH_HUD_LAYOUT_VERSION,
    getSpecialDamage,
    adjustHudValue,
    getGamepadIntent,
    getAnalogVector,
    getDefaultTouchHudLayout,
    getWaveParams,
    getDominantMoveAction,
    getHitboxRect,
    rectsOverlap,
    circleHitsEntity,
    BOSS_ATTACK_PATTERNS,
    getAvailableBossPatterns,
    shuffleArray
} = require("../game-logic-core.js");

test("getWaveParams: wave 1 é o baseline", () => {
    const p = getWaveParams(1);
    assert.equal(p.bossHp, 4);
    assert.equal(p.speedMult, 0.9);
    assert.equal(p.shootFreq, 102);
    assert.ok(p.aggressiveness > 0);
});

test("getWaveParams: dificuldade cresce com a wave", () => {
    const w1 = getWaveParams(1);
    const w5 = getWaveParams(5);
    assert.ok(w5.bossHp > w1.bossHp, "boss deve ter mais HP em waves avançadas");
    assert.ok(w5.speedMult > w1.speedMult, "boss deve ficar mais rápido");
    assert.ok(w5.aggressiveness > w1.aggressiveness, "boss deve ficar mais agressivo");
});

test("getWaveParams: shootFreq nunca fica abaixo do piso de 30", () => {
    const wLate = getWaveParams(50);
    assert.equal(wLate.shootFreq, 30);
});

test("getDominantMoveAction: direções cardeais", () => {
    assert.equal(getDominantMoveAction(0, -5), "flyUp");
    assert.equal(getDominantMoveAction(0, 5), "flyDown");
    assert.equal(getDominantMoveAction(-5, 0), "flyLeft");
    assert.equal(getDominantMoveAction(5, 0), "flyRight");
});

test("getDominantMoveAction: direções diagonais", () => {
    assert.equal(getDominantMoveAction(5, -5), "flyUpRight");
    assert.equal(getDominantMoveAction(-5, -5), "flyUpLeft");
    assert.equal(getDominantMoveAction(5, 5), "flyDownRight");
    assert.equal(getDominantMoveAction(-5, 5), "flyDownLeft");
});

test("getDominantMoveAction: dentro da deadzone retorna null", () => {
    assert.equal(getDominantMoveAction(1, 1, 3), null);
});

test("getHitboxRect: aplica margem proporcional em torno do centro", () => {
    const entity = { x: 0, y: 0, w: 100, h: 50 };
    const rect = getHitboxRect(entity, 0.2);
    assert.equal(rect.w, 60); // 100 - 2 * (100*0.2)
    assert.equal(rect.h, 30); // 50 - 2 * (50*0.2)
    assert.equal(rect.x, 20);
    assert.equal(rect.y, 10);
});

test("rectsOverlap: detecta sobreposição e ausência dela", () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 5, y: 5, w: 10, h: 10 };
    const c = { x: 100, y: 100, w: 10, h: 10 };
    assert.equal(rectsOverlap(a, b), true);
    assert.equal(rectsOverlap(a, c), false);
});

test("circleHitsEntity: projétil no centro da entidade sempre acerta", () => {
    const entity = { x: 100, y: 100, w: 48, h: 56 };
    const centerX = entity.x + entity.w / 2;
    const centerY = entity.y + entity.h / 2;
    assert.equal(circleHitsEntity(centerX, centerY, 5, entity), true);
});

test("circleHitsEntity: projétil longe da entidade não acerta", () => {
    const entity = { x: 100, y: 100, w: 48, h: 56 };
    assert.equal(circleHitsEntity(0, 0, 5, entity), false);
});

test("getAvailableBossPatterns: desbloqueia padrões progressivamente", () => {
    assert.deepEqual(getAvailableBossPatterns(1), [BOSS_ATTACK_PATTERNS.FAST, BOSS_ATTACK_PATTERNS.TRIPLE]);
    assert.ok(getAvailableBossPatterns(3).includes(BOSS_ATTACK_PATTERNS.HOMING));
    assert.ok(getAvailableBossPatterns(5).includes(BOSS_ATTACK_PATTERNS.SPREAD5));
    assert.ok(!getAvailableBossPatterns(2).includes(BOSS_ATTACK_PATTERNS.HOMING));
});

test("shuffleArray: preserva os elementos, só muda a ordem possivelmente", () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(original);
    assert.deepEqual([...shuffled].sort(), original);
    assert.notEqual(shuffled, original, "deve retornar um novo array, não mutar o original");
});

test("getAnalogVector: dentro da zona morta fica parado", () => {
    const v = getAnalogVector(5, 5, 50, 12);
    assert.deepEqual(v, { x: 0, y: 0, strength: 0 });
});

test("getAnalogVector: força cresce com a distância e trava em 1 no raio máximo", () => {
    const perto = getAnalogVector(25, 0, 50, 12);
    const longe = getAnalogVector(500, 0, 50, 12);
    assert.ok(perto.strength > 0 && perto.strength < 1);
    assert.equal(longe.strength, 1);
    assert.equal(longe.x, 1);
    assert.equal(longe.y, 0);
});

test("getAnalogVector: diagonal nunca passa de força 1", () => {
    const v = getAnalogVector(300, -300, 50, 12);
    assert.ok(Math.hypot(v.x, v.y) <= 1 + 1e-9);
    assert.ok(v.x > 0 && v.y < 0);
});

test("getDefaultTouchHudLayout: tem os 5 botões e não repete referência entre chamadas", () => {
    for (const width of [375, 800]) {
        const layout = getDefaultTouchHudLayout(width);
        assert.deepEqual(Object.keys(layout).sort(), ["attack", "charge", "parry", "special", "transform"]);
    }
    const a = getDefaultTouchHudLayout(800);
    a.attack.x = 0.1;
    assert.notEqual(getDefaultTouchHudLayout(800).attack.x, 0.1);
});

test("getDefaultTouchHudLayout: botões não se sobrepõem e cabem no canvas 800x350", () => {
    for (const width of [375, 800]) {
        const rects = Object.entries(getDefaultTouchHudLayout(width)).map(([key, b]) => ({
            key, x: b.x * 800, y: b.y * 350, w: b.w * b.scale, h: b.h * b.scale
        }));
        rects.forEach((a, i) => {
            assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= 800 && a.y + a.h <= 350, `${a.key} fora da tela (${width})`);
            rects.slice(i + 1).forEach(b => assert.equal(rectsOverlap(a, b), false, `${a.key} x ${b.key} (${width})`));
        });
    }
});

test("getSpecialDamage: o especial causa o TRIPLO do ataque normal (3), transformado ou não", () => {
    assert.equal(NORMAL_ATTACK_DAMAGE, 1);
    assert.equal(SPECIAL_DAMAGE_MULTIPLIER, 3);
    assert.equal(getSpecialDamage(), 3 * NORMAL_ATTACK_DAMAGE);
    assert.equal(getSpecialDamage(true), getSpecialDamage(false));
});

test("canUseSpecial: só com o ki cheio", () => {
    assert.equal(canUseSpecial(100, 100), true);
    assert.equal(canUseSpecial(99.99, 100), false);
    assert.equal(canUseSpecial(0, 100), false);
    assert.equal(canUseSpecial(80, 100), false);
});

test("adjustHudValue: trava nos limites e não acumula erro de ponto flutuante", () => {
    assert.equal(adjustHudValue(1, 0.1, 0.6, 1.6), 1.1);
    assert.equal(adjustHudValue(1.6, 0.1, 0.6, 1.6), 1.6);
    assert.equal(adjustHudValue(0.6, -0.1, 0.6, 1.6), 0.6);
    let v = 0.3;
    for (let i = 0; i < 3; i++) v = adjustHudValue(v, 0.1, 0.3, 1);
    assert.equal(v, 0.6);
});

test("layout touch: CARREGAR fica no canto inferior direito e ATAQUE é o maior botão", () => {
    for (const width of [375, 800]) {
        const l = getDefaultTouchHudLayout(width);
        const cx = (b) => b.x * 800 + (b.w * b.scale) / 2;
        const cy = (b) => b.y * 350 + (b.h * b.scale) / 2;
        const others = Object.keys(l).filter(k => k !== "charge");
        others.forEach(k => {
            assert.ok(cy(l.charge) >= cy(l[k]), `charge deve ser o botão mais baixo (vs ${k})`);
        });
        assert.ok(cx(l.charge) > 700 && cy(l.charge) > 280, "charge no canto inferior direito");
        assert.ok(l.attack.w > l.charge.w && l.attack.h > l.charge.h);
        assert.ok(cx(l.attack) > 400, "botões de ação no lado direito (analógico fica à esquerda)");
    }
});


test("stripSvgWhiteBackground: remove o retângulo branco do SVG (formato do jogo) e mantém o resto", () => {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>\n<rect width='32' height='32' fill='#ffffff'/>\n<rect x='9' y='19' width='14' height='7' fill='#ffffff' stroke='#000'/></svg>";
    const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    const out = decodeURIComponent(stripSvgWhiteBackground(url).split(",")[1]);
    assert.ok(!out.includes("width='32' height='32' fill='#ffffff'"), "fundo removido");
    assert.ok(out.includes("x='9' y='19' width='14' height='7' fill='#ffffff'"), "parte branca do personagem preservada");
    assert.equal(stripSvgWhiteBackground(stripSvgWhiteBackground(url)), stripSvgWhiteBackground(url), "idempotente");
});

test("stripSvgWhiteBackground: aceita base64 e ignora o que não é SVG", () => {
    const svg = "<svg><rect width='32' height='32' fill='#fff'/><circle r='3'/></svg>";
    const url = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
    const out = Buffer.from(stripSvgWhiteBackground(url).split(",")[1], "base64").toString();
    assert.equal(out, "<svg><circle r='3'/></svg>");
    assert.equal(stripSvgWhiteBackground("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
    assert.equal(stripSvgWhiteBackground("https://x/y.svg"), "https://x/y.svg");
    assert.equal(stripSvgWhiteBackground(null), null);
});

function makeImage(w, h, painter) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const c = painter(x, y);
        data.set(c, (y * w + x) * 4);
    }
    return data;
}
const WHITE = [255, 255, 255, 255], RED = [200, 0, 0, 255], BLACK = [0, 0, 0, 255];
const alphaAt = (data, w, x, y) => data[(y * w + x) * 4 + 3];
// Fundo branco com a tolerância que o jogo usa no modo "auto" (ver getCutoutSource em gameplay.js).
const removeWhite = (data, w, h) => removeBackgroundColor(data, w, h, [255, 255, 255], 12);

test("removeBackgroundColor (fundo branco): apaga só o branco ligado à borda; branco de dentro do personagem fica", () => {
    // 20x20 branco; personagem vermelho 8..15 com contorno preto e um "olho" branco fechado no meio
    const w = 20;
    const data = makeImage(w, w, (x, y) => {
        if (x >= 5 && x <= 14 && y >= 5 && y <= 14) {
            if (x === 5 || x === 14 || y === 5 || y === 14) return BLACK;
            if (x >= 8 && x <= 10 && y >= 8 && y <= 10) return WHITE; // olho cercado
            return RED;
        }
        return WHITE;
    });
    const r = removeWhite(data, w, w);
    assert.equal(r.changed, true);
    assert.equal(alphaAt(data, w, 0, 0), 0, "canto virou transparente");
    assert.equal(alphaAt(data, w, 19, 10), 0);
    assert.equal(alphaAt(data, w, 9, 9), 255, "olho branco preservado");
    assert.equal(alphaAt(data, w, 6, 6), 255, "corpo preservado");
    assert.equal(alphaAt(data, w, 5, 5), 255, "contorno preservado");
});

test("removeBackgroundColor (fundo branco): não mexe em imagem já transparente nem em fundo que não é branco", () => {
    const w = 10;
    const transparent = makeImage(w, w, (x, y) => (x > 3 && x < 7 && y > 3 && y < 7 ? RED : [0, 0, 0, 0]));
    assert.equal(removeWhite(transparent, w, w).changed, false);
    const blue = makeImage(w, w, (x, y) => (x > 3 && x < 7 && y > 3 && y < 7 ? WHITE : [0, 0, 255, 255]));
    assert.equal(removeWhite(blue, w, w).changed, false);
    assert.equal(alphaAt(blue, w, 5, 5), 255, "branco do personagem em fundo azul fica");
});

test("removeBackgroundColor (fundo branco): cinza claro do personagem (ex.: pele do Freeza #f0f0f0) não é apagado", () => {
    const w = 12;
    const data = makeImage(w, w, (x, y) => (x >= 3 && x <= 8 && y >= 3 && y <= 8 ? [240, 240, 240, 255] : WHITE));
    removeWhite(data, w, w);
    assert.equal(alphaAt(data, w, 5, 5), 255);
    assert.equal(alphaAt(data, w, 0, 0), 0);
});

test("getScrollToRevealRow: rola só quando a linha não está visível e respeita os limites", () => {
    const step = 150, card = 132, view = 282, max = 300;
    assert.equal(getScrollToRevealRow(0, step, card, view, 0, max), 0, "linha 0 já visível");
    assert.equal(getScrollToRevealRow(1, step, card, view, 0, max), 0, "linha 1 já visível");
    assert.equal(getScrollToRevealRow(2, step, card, view, 0, max), 2 * step + card - view, "desce até mostrar a linha 2 inteira");
    assert.equal(getScrollToRevealRow(0, step, card, view, 150, max), 0, "sobe até a linha 0");
    assert.equal(getScrollToRevealRow(9, step, card, view, 0, max), max, "trava no máximo");
    assert.equal(getScrollToRevealRow(2, step, card, view, 150, max), 150, "visível: não mexe");
});

const padButtons = (on) => Array.from({ length: 18 }, (_, i) => ({ pressed: on.includes(i), value: on.includes(i) ? 1 : 0 }));

test("PS5 padrão: cruz ataca, bola parry, quadrado carrega, triângulo transforma, options pausa", () => {
    const at = (i) => getGamepadIntent({ axes: [0, 0], buttons: padButtons([i]) });
    assert.equal(at(0).attack, true);
    assert.equal(at(1).parry, true);
    assert.equal(at(2).charge, true);
    assert.equal(at(3).transform, true);
    assert.equal(at(9).pause, true);
    assert.equal(at(0).parry, false);
});

test("PS5 padrão: TOUCHPAD (17), R1 e R2 lançam o especial", () => {
    for (const i of [5, 7, 17]) assert.equal(getGamepadIntent({ axes: [0, 0], buttons: padButtons([i]) }).special, true, `botão ${i}`);
    assert.equal(getGamepadIntent({ axes: [0, 0], buttons: padButtons([4]) }).special, false);
});

test("movimento: analógico esquerdo e direcional; zona morta; sem controle = tudo parado", () => {
    const g = (axes, on = []) => getGamepadIntent({ axes, buttons: padButtons(on) });
    assert.equal(g([0.9, -0.8]).right, true);
    assert.equal(g([0.9, -0.8]).up, true);
    assert.equal(g([0.2, -0.2]).left || g([0.2, -0.2]).up, false);
    assert.equal(g([0, 0], [14]).left, true);
    assert.equal(g([0, 0], [13]).down, true);
    assert.equal(Object.values(getGamepadIntent(null)).some(Boolean), false);
});

test("menus usam sempre cruz/bola mesmo depois de remapear o ataque", () => {
    const remapped = assignPadButton(DEFAULT_PAD_BINDINGS, "attack", 2).bindings;
    const i = getGamepadIntent({ axes: [0, 0], buttons: padButtons([0]) }, 0.4, remapped);
    assert.equal(i.confirm, true);
    assert.equal(i.attack, false);
});

test("assignPadButton: atribui o touchpad a uma ação e não mexe no padrão original", () => {
    const before = JSON.stringify(DEFAULT_PAD_BINDINGS);
    const { bindings, displaced } = assignPadButton(DEFAULT_PAD_BINDINGS, "attack", 17);
    assert.deepEqual(bindings.attack, [17]);
    assert.equal(displaced, "special", "o touchpad era do especial");
    assert.ok(!bindings.special.includes(17));
    assert.ok(bindings.special.length > 0, "especial não fica sem botão");
    assert.equal(JSON.stringify(DEFAULT_PAD_BINDINGS), before);
    assert.equal(getGamepadIntent({ axes: [0, 0], buttons: padButtons([17]) }, 0.4, bindings).attack, true);
    assert.equal(getGamepadIntent({ axes: [0, 0], buttons: padButtons([0]) }, 0.4, bindings).attack, false);
});

test("assignPadButton: botão em uso por outra ação => as duas trocam", () => {
    const { bindings, displaced } = assignPadButton(DEFAULT_PAD_BINDINGS, "attack", 1); // bola era o parry
    assert.deepEqual(bindings.attack, [1]);
    assert.deepEqual(bindings.parry, [0], "parry ficou com a cruz (antigo botão do ataque)");
    assert.equal(displaced, "parry");
    for (const a of PAD_ACTIONS) assert.ok(bindings[a].length >= 1, `${a} com botão`);
});

test("assignPadButton: botão livre não desloca ninguém; ação/índice inválidos são ignorados", () => {
    const r = assignPadButton(DEFAULT_PAD_BINDINGS, "charge", 6);
    assert.equal(r.displaced, null);
    assert.deepEqual(r.bindings.charge, [6]);
    assert.deepEqual(assignPadButton(DEFAULT_PAD_BINDINGS, "xxx", 3).bindings, DEFAULT_PAD_BINDINGS);
    assert.deepEqual(assignPadButton(DEFAULT_PAD_BINDINGS, "attack", -1).bindings, DEFAULT_PAD_BINDINGS);
});

test("normalizePadBindings: usa padrão quando faltam/estão corrompidos e limpa valores", () => {
    assert.deepEqual(normalizePadBindings(null), DEFAULT_PAD_BINDINGS);
    assert.deepEqual(normalizePadBindings("lixo"), DEFAULT_PAD_BINDINGS);
    const n = normalizePadBindings({ attack: [2, 2, "x", -4, 99], parry: "oi", charge: [] });
    assert.deepEqual(n.attack, [2]);
    assert.deepEqual(n.parry, DEFAULT_PAD_BINDINGS.parry);
    assert.deepEqual(n.charge, DEFAULT_PAD_BINDINGS.charge);
    assert.deepEqual(n.special, DEFAULT_PAD_BINDINGS.special);
});

test("nomes dos botões PS5", () => {
    assert.equal(getPadButtonName(0), "CRUZ");
    assert.equal(getPadButtonName(3), "TRIÂNGULO");
    assert.equal(getPadButtonName(17), "TOUCHPAD");
    assert.equal(getPadButtonName(25), "BOTÃO 25");
    assert.equal(describePadBinding([5, 7, 17]), "R1 / R2 / TOUCHPAD");
});

test("removeBackgroundColor: apaga fundo de outra cor (ex.: verde) só a partir das bordas", () => {
    const w = 14, GREEN = [0, 255, 0, 255];
    const data = makeImage(w, w, (x, y) => (x >= 4 && x <= 9 && y >= 4 && y <= 9 ? (x === 6 && y === 6 ? GREEN : RED) : GREEN));
    const r = removeBackgroundColor(data, w, w, [0, 255, 0], 10);
    assert.equal(r.changed, true);
    assert.equal(alphaAt(data, w, 0, 0), 0);
    assert.equal(alphaAt(data, w, 6, 6), 255, "verde dentro do personagem preservado");
    assert.equal(alphaAt(data, w, 5, 5), 255);
});

test("removeBackgroundColor: tolerância pega fundo 'sujo' (JPG) e a cor errada não apaga nada", () => {
    const w = 10;
    const noisy = makeImage(w, w, (x, y) => (x > 3 && x < 7 && y > 3 && y < 7 ? RED : [250 - ((x + y) % 3) * 4, 250, 252, 255]));
    assert.equal(removeBackgroundColor(noisy.slice(), w, w, [255, 255, 255], 2).changed, false, "tolerância baixa demais");
    assert.equal(removeBackgroundColor(noisy, w, w, [255, 255, 255], 12).changed, true);
    const blue = makeImage(w, w, () => [0, 0, 255, 255]);
    assert.equal(removeBackgroundColor(blue, w, w, [255, 0, 0], 20).changed, false, "cor errada");
});

test("normalizeBgRemoval / getBgRemovalKey / cores", () => {
    assert.deepEqual(normalizeBgRemoval(undefined), { mode: "auto", color: "#ffffff", tolerance: 8 });
    assert.deepEqual(normalizeBgRemoval({ mode: "color", color: "#0F0", tolerance: 500 }), { mode: "color", color: "#00ff00", tolerance: 60 });
    assert.equal(normalizeBgRemoval({ mode: "xx", color: "lixo", tolerance: "a" }).mode, "auto");
    assert.equal(getBgRemovalKey({ mode: "none" }), "none");
    assert.equal(getBgRemovalKey({ mode: "auto", color: "#123456" }), "auto", "cor não muda a chave do modo automático");
    assert.notEqual(getBgRemovalKey({ mode: "color", color: "#00ff00", tolerance: 5 }), getBgRemovalKey({ mode: "color", color: "#00ff00", tolerance: 9 }));
    assert.deepEqual(colorHexToRgb("#ff8000"), [255, 128, 0]);
    assert.equal(colorHexToRgb("zzz"), null);
    assert.equal(rgbToHex(255, 128, 0), "#ff8000");
});

test("pickCornerColor: pega a cor do canto (ou null se transparente)", () => {
    const w = 6;
    assert.equal(pickCornerColor(makeImage(w, w, () => [10, 20, 30, 255]), w, w), "#0a141e");
    assert.equal(pickCornerColor(makeImage(w, w, () => [0, 0, 0, 0]), w, w), null);
    const cornerOnly = makeImage(w, w, (x, y) => (x === w - 1 && y === w - 1 ? [1, 2, 3, 255] : [0, 0, 0, 0]));
    assert.equal(pickCornerColor(cornerOnly, w, w), "#010203");
});

test("findNextTargetIndex: navegação espacial em grade", () => {
    const grid = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) grid.push({ x: c * 100, y: r * 60, w: 80, h: 40 });
    assert.equal(findNextTargetIndex(grid, 0, 1, 0), 1);
    assert.equal(findNextTargetIndex(grid, 1, 0, 1), 4);
    assert.equal(findNextTargetIndex(grid, 4, -1, 0), 3);
    assert.equal(findNextTargetIndex(grid, 4, 0, -1), 1);
    assert.equal(findNextTargetIndex(grid, 2, 1, 0), -1, "sem alvo à direita");
    assert.equal(findNextTargetIndex(grid, 9, 1, 0), -1, "índice inválido");
});

test("cycleIndex / getNextPaletteColor / stepNumberValue", () => {
    assert.equal(cycleIndex(4, 3, 1), 0);
    assert.equal(cycleIndex(4, 0, -1), 3);
    assert.equal(cycleIndex(0, 0, 1), -1);
    const pal = ["#ff0000", "#00ff00", "#0000ff"];
    assert.equal(getNextPaletteColor(pal, "#FF0000", 1), "#00ff00");
    assert.equal(getNextPaletteColor(pal, "#0000ff", 1), "#ff0000");
    assert.equal(getNextPaletteColor(pal, "#123456", 1), "#ff0000", "cor fora da paleta começa do início");
    assert.equal(getNextPaletteColor(pal, "#123456", -1), "#0000ff");
    assert.equal(stepNumberValue(1, 0.1, 0.5, 2, 1), 1.1);
    assert.equal(stepNumberValue(0.6, 0.1, 0.5, 2, -1), 0.5);
    assert.equal(stepNumberValue(0.5, 0.1, 0.5, 2, -1), 0.5, "trava no mínimo");
    assert.equal(stepNumberValue(32, "any", 1, 999, 1), 33);
});

test("getAvailableBossPatterns: os padrões novos (PINCER, BURST8) só aparecem em ondas altas, e só para o chefe", () => {
    assert.ok(!getAvailableBossPatterns(6).includes(BOSS_ATTACK_PATTERNS.PINCER));
    assert.ok(getAvailableBossPatterns(7).includes(BOSS_ATTACK_PATTERNS.PINCER));
    assert.ok(!getAvailableBossPatterns(8).includes(BOSS_ATTACK_PATTERNS.BURST8));
    assert.ok(getAvailableBossPatterns(9).includes(BOSS_ATTACK_PATTERNS.BURST8));
    assert.ok(getAvailableBossPatterns(9).includes(BOSS_ATTACK_PATTERNS.SPREAD5));
});

test("getWaveParams: cresce até o teto e trava depois (dificuldade some de estatística, some de padrão novo)", () => {
    const atCap = getWaveParams(WAVE_DIFFICULTY_CAP);
    const beyond = getWaveParams(WAVE_DIFFICULTY_CAP + 5);
    const wayBeyond = getWaveParams(WAVE_DIFFICULTY_CAP + 50);
    assert.deepEqual(beyond, atCap, "além do teto os parâmetros ficam idênticos aos do teto");
    assert.deepEqual(wayBeyond, atCap, "mesmo muito além do teto, não passa disso");
    assert.ok(getWaveParams(WAVE_DIFFICULTY_CAP).speedMult > getWaveParams(1).speedMult, "ainda cresce ANTES do teto");
});

test("progressão de arenas: 8 fases, na ordem certa (Cell penúltima, Supremo Kaioh última)", () => {
    assert.equal(STAGE_PROGRESSION.length, 8);
    assert.equal(STAGE_PROGRESSION[0].id, "terra");
    assert.equal(STAGE_PROGRESSION[6].id, "cell_games");
    assert.equal(STAGE_PROGRESSION[7].id, "kaioshin");
});

test("getModeWaveSequence / getRealWaveForModeStep: NORMAL usa 1-5, DIFÍCIL pula pros degraus 2,4,6,8,10", () => {
    assert.deepEqual(NORMAL_MODE_WAVES, [1, 2, 3, 4, 5]);
    assert.deepEqual(HARD_MODE_WAVES, [2, 4, 6, 8, 10]);
    assert.equal(STAGE_MODE_WAVE_COUNT, 5);
    assert.deepEqual(getModeWaveSequence("normal"), NORMAL_MODE_WAVES);
    assert.deepEqual(getModeWaveSequence("hard"), HARD_MODE_WAVES);

    assert.equal(getRealWaveForModeStep("normal", 0), 1, "1ª luta do normal é a onda 1 (mais fácil)");
    assert.equal(getRealWaveForModeStep("normal", 4), 5, "5ª e última luta do normal é a onda 5");
    assert.equal(getRealWaveForModeStep("hard", 0), 2, "1ª luta do difícil já começa na onda 2, não na 1");
    assert.equal(getRealWaveForModeStep("hard", 4), 10, "5ª e última luta do difícil é a onda 10 (o teto)");
    assert.equal(getRealWaveForModeStep("hard", 99), 10, "passar do índice não quebra — trava na última onda da sequência");
});

test("isStageUnlockedByProgress: completar o NORMAL da anterior já libera a próxima", () => {
    const unlockedIds = (progress) => STAGE_PROGRESSION.filter(s => isStageUnlockedByProgress(s.id, progress)).map(s => s.id);
    assert.deepEqual(unlockedIds({}), ["terra"], "do zero, só a 1ª fase está liberada");
    assert.equal(isStageUnlockedByProgress("kaio", {}), false);
    assert.equal(isStageUnlockedByProgress("kaio", { terra: { normalDone: true, hardDone: false } }), true, "completar o NORMAL já basta — não precisa do difícil");
    assert.equal(isStageUnlockedByProgress("namek", { terra: { normalDone: true, hardDone: true } }), false, "pular fase não vale — precisa completar kaio também");
    const allNormal = {}; STAGE_PROGRESSION.forEach(s => { allNormal[s.id] = { normalDone: true, hardDone: false }; });
    assert.equal(unlockedIds(allNormal).length, STAGE_PROGRESSION.length, "com o normal de todas completado, todas liberam");
});

test("isHardModeUnlocked / isUnlimitedModeUnlocked: DIFÍCIL pede o normal DESSA fase; SEM LIMITE pede os dois", () => {
    assert.equal(isHardModeUnlocked("terra", {}), false, "sem ter completado nada, difícil começa bloqueado");
    assert.equal(isHardModeUnlocked("terra", { terra: { normalDone: true, hardDone: false } }), true);
    assert.equal(isUnlimitedModeUnlocked("terra", { terra: { normalDone: true, hardDone: false } }), false, "só o normal ainda não libera o sem limite");
    assert.equal(isUnlimitedModeUnlocked("terra", { terra: { normalDone: true, hardDone: true } }), true, "os dois completados libera o sem limite");
    assert.equal(isHardModeUnlocked("terra", { kaio: { normalDone: true, hardDone: true } }), false, "progresso de OUTRA fase não libera nada aqui");
});

test("getParryComboBonus: bônus de ki cresce em degraus com a sequência de parries", () => {
    assert.equal(getParryComboBonus(0), 0);
    assert.equal(getParryComboBonus(2), 0);
    assert.equal(getParryComboBonus(3), 2);
    assert.equal(getParryComboBonus(5), 2);
    assert.equal(getParryComboBonus(6), 5);
    assert.equal(getParryComboBonus(9), 5);
    assert.equal(getParryComboBonus(10), 10);
    assert.equal(getParryComboBonus(50), 10, "não cresce pra sempre");
});

test("getBuffedAttackDamage / getSuperAttackDamage: bastão mágico soma no ataque normal e dobra o especial", () => {
    assert.equal(getBuffedAttackDamage(1, false), 1);
    assert.equal(getBuffedAttackDamage(1, true), 2);
    const special = getSpecialDamage();
    assert.equal(getSuperAttackDamage(special, false), special);
    assert.equal(getSuperAttackDamage(special, true), special * 2, "especial + bastão = o dobro do especial normal");
});

test("getBeamClashPush: quem aperta o ataque mais vezes empurra o choque para o lado do adversário", () => {
    assert.equal(getBeamClashPush(5, 5), 0, "mesmo número de apertos = choque no meio");
    assert.ok(getBeamClashPush(6, 2) > 0, "p1 apertou mais = empurra a favor de p1 (positivo)");
    assert.ok(getBeamClashPush(2, 6) < 0, "p2 apertou mais = empurra a favor de p2 (negativo)");
    assert.equal(getBeamClashPush(100, 0), 1, "trava no máximo, nunca passa de 1");
    assert.equal(getBeamClashPush(0, 100), -1, "trava no mínimo, nunca passa de -1");
    assert.equal(getBeamClashPush(4, 0, 8), 0.5, "meio caminho do scale = metade do empurrão");
});
