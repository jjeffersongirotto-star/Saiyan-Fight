// tests/gi-camisa.test.js — a blusa roxa do "Gi com faixa na cintura" (Piccolo, Gohan) é a CAMISA: escolher
// "Nenhuma (pele à mostra)" deixa o peito nu (só a faixa fica); personagens salvos antes passam a usar a regata.
//
// Uso: node tests/gi-camisa.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

const pic = run(`SPRITE_PRESETS.piccolo.appearance`);
const spec = (mud) => run(`spriteOutfitSpec(normalizeAppearance(Object.assign({}, SPRITE_PRESETS.piccolo.appearance, ${JSON.stringify(mud)})), "#7ec850")`);
check("Piccolo de gi: a blusa roxa vem da camisa (regata na cor da roupa)", pic.innerShirt === "regata" && pic.shirtColor === pic.primaryColor && spec({}).torso === pic.primaryColor);
check("gi sem camisa: peito à mostra (pele, com músculos)", (() => { const s = spec({ innerShirt: "nenhuma" }); return s.bare === true && s.torso !== pic.primaryColor; })());
check("gi sem camisa desenha diferente do gi com camisa", run(`generateSpriteFrameSvg(Object.assign({}, SPRITE_PRESETS.piccolo.appearance, { innerShirt: "nenhuma" }), "idle", 0) !== generateSpriteFrameSvg(SPRITE_PRESETS.piccolo.appearance, "idle", 0)`));
check("transformação sem camisa fica sem camisa", run(`spriteTransformAppearance(SPRITE_PRESETS.piccolo.appearance, { diff: { innerShirt: "nenhuma" } }).innerShirt`) === "nenhuma");
check("Piccolo salvo antes (gi sem camisa) passa a ter a blusa como camisa", (() => {
    const a = run(`(() => { const a = Object.assign({}, SPRITE_PRESETS.piccolo.appearance, { innerShirt: "nenhuma", shirtColor: "#20336f" }); spriteGiVirouCamisa(a); return a; })()`);
    return a.innerShirt === "regata" && a.shirtColor === pic.primaryColor;
})());
check("outras roupas não são mexidas pela conversão", run(`spriteGiVirouCamisa(Object.assign({}, SPRITE_PRESETS.goku.appearance, { innerShirt: "nenhuma" }))`) === false);
summary();
