// tests/personagens-075.test.js — versão 0.75: Vegetto (antes Gogeta), Broly (Super) com o Lendário verde-limão,
// Kid Buu com o Buu gordo de transformação, Gotenks novo, malha gola alta e os cabelos de Super Saiyajin no
// construtor (a transformação pode escolher a cor do cabelo), e a troca única dos salvos antigos.
//
// Uso: node tests/personagens-075.test.js

const fs = require("fs");
const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
const html = fs.readFileSync(__dirname + "/../index.html", "utf8");
const ap = (k) => run(`SPRITE_PRESETS.${k}.appearance`);

// ---------- Vegetto ----------
const v = ap("fusao");
check("preset de fusão é o Vegetto", run(`SPRITE_PRESETS.fusao.label`) === "Fusão (Vegetto)" && run(`DEFAULT_CHARACTERS.gogeta.name`) === "VEGETTO");
check("Vegetto: cabelo próprio, Potara amarelos, gi azul-escuro sobre camiseta laranja", v.hairStyle === "vegetto" && v.accessory === "potara_amarelo" &&
    v.outerShirt === "kimono" && v.innerShirt === "camiseta" && v.shirtColor === "#f2780f");
check("Vegetto: calça azul-escura folgada (não branca), luvas e botas brancas de ponta dourada", v.pants === "larga" && v.pantsColor === "#1e2a5e" &&
    v.gloves === "luvas_saiyajin" && v.shoes === "botas_vegetto" && v.build === "musculoso");

// ---------- Broly ----------
const b = ap("broly");
check("Broly base: armadura com gema, coleira, manto na cintura, calça roxa justa, botas de cano escuro", b.outerShirt === "armadura_broly" && b.accessory === "coleira" &&
    b.cape === "manto_cintura" && b.pants === "justa" && b.shoes === "botas_broly" && b.gloves === "munhequeiras_borda" && b.hairStyle === "broly");
const tb = run(`getCharacterTransformations("broly")`);
check("Broly T1 = Super Saiyajin Lendário: verde-limão, olhos sem pupila, sem armadura/coleira, gigante e cicatrizes",
    tb.length === 1 && tb[0].ssj && tb[0].diff.hairColor === "#b6ff3c" && tb[0].diff.eyeType === "vazio" && tb[0].diff.outerShirt === "none" &&
    tb[0].diff.accessory === "none" && tb[0].diff.build === "gigante" && tb[0].diff.scar === "lendario" && !("cape" in tb[0].diff));
const lssj = run(`generateSpriteFrameSvg(spriteTransformAppearance(SPRITE_PRESETS.broly.appearance, getCharacterTransformations("broly")[0]), "idle", 0, { ssj: true, ssjColor: spriteSsjColor(getCharacterTransformations("broly")[0]) })`);
check("Lendário desenha o cabelo verde-limão (sem o amarelo padrão)", lssj.includes("#b6ff3c") && !lssj.includes("#ffe34d"));

// ---------- Majin Buu ----------
const k = ap("majin");
check("Majin Buu base é o Kid Buu: antena longa, furinhos, sorriso sádico, calça bufante, cinto M, braçadeiras e botas pretas",
    k.build === "jovem" && k.headFeature === "antena_longa" && k.bodyMarks === "majin" && k.mouthType === "sadico" && k.pants === "bufante" &&
    k.outerShirt === "faixa_majin" && k.gloves === "bracadeiras_majin" && k.shoes === "botas_majin");
const tk = run(`getCharacterTransformations("majin_buu")`);
check("Majin Buu T1 = Buu gordo: capa com nó, colete, luvas e botas douradas, olhos fechados e boca alegre",
    tk.length === 1 && tk[0].diff.build === "gordo" && tk[0].diff.cape === "capa_no" && tk[0].diff.outerShirt === "colete_buu" &&
    tk[0].diff.gloves === "luvas_douradas" && tk[0].diff.shoes === "botas_douradas" && tk[0].diff.eyeType === "fechado" && tk[0].diff.mouthType === "alegre");

// ---------- Gotenks ----------
const g = ap("gotenks");
check("Gotenks: personagem inicial herói com SUPER GHOST KAMIKAZE e o Super Saiyajin padrão", run(`DEFAULT_CHARACTERS.gotenks.spec`) === "SUPER GHOST KAMIKAZE" &&
    run(`DEFAULT_CHARACTERS.gotenks.align`) === "HERÓI" && run(`getCharacterTransformations("gotenks")[0].ssj`) === true && !!run(`!!characterDB.gotenks`));
check("Gotenks: criança, cabelo de duas cores, colete Metamoran, calça bufante, faixas no tornozelo", g.build === "jovem" && g.hairStyle === "gotenks_bicolor" &&
    g.hairColor2 === "#b58ce0" && g.outerShirt === "colete_metamoran" && g.pants === "bufante" && g.shoes === "sapatilhas_faixa" && g.gloves === "munhequeiras_escuras");
const gs = run(`generateSpriteFrameSvg(SPRITE_PRESETS.gotenks.appearance, "idle", 0)`);
check("cabelo de duas cores usa a cor 2 nas laterais", gs.includes("#b58ce0") || /b58ce0/i.test(gs) || gs.includes(run(`spriteShade("#b58ce0", 0.15)`)));
const gss = run(`generateSpriteFrameSvg(SPRITE_PRESETS.gotenks.appearance, "idle", 0, { ssj: true })`);
check("Gotenks transformado fica todo amarelo (sem o lilás)", gss.includes("#ffe34d") && !gss.includes(run(`spriteShade("#b58ce0", 0.15)`)));

// ---------- construtor ----------
check("malha gola alta é opção do construtor e ninguém usa por padrão", html.includes('value="malha_gola"') && run(`Object.values(SPRITE_PRESETS).every(p => p.appearance.innerShirt !== "malha_gola")`));
check("malha gola alta: manga comprida na cor da camisa", (() => { const s = run(`spriteOutfitSpec(normalizeAppearance(Object.assign({}, SPRITE_PRESETS.goku.appearance, { outerShirt: "none", innerShirt: "malha_gola", shirtColor: "#123456" })), "#f3c29a")`); return s.armUpper === "#123456" && s.armLower === "#123456" && s.torso === "#123456"; })());
const novos = ["ssj_solto", "ssj_volumoso", "ssj_vegeta", "blue_goku", "blue_vegeta"];
check("5 cabelos de Super Saiyajin no construtor e na lista de cabelo de Saiyajin", novos.every(n => html.includes(`value="${n}"`) && run(`SPRITE_SAIYAN_HAIR.includes("${n}")`)));
check("construtor tem COR 2 DO CABELO", html.includes('id="build-hair-color2"') && run(`BUILDER_FIELD_IDS.hairColor2`) === "build-hair-color2");
check("transformação com cor de cabelo própria usa essa cor; sem cor, o amarelo padrão",
    run(`spriteSsjColor({ ssj: true, diff: { hairColor: "#3fd0f0" } })`) === "#3fd0f0" && run(`spriteSsjColor({ ssj: true, diff: {} })`) === undefined &&
    run(`spriteSsjColor({ ssj: false, diff: { hairColor: "#3fd0f0" } })`) === undefined);
const blue = run(`generateSpriteFrameSvg(Object.assign({}, SPRITE_PRESETS.goku.appearance, { hairStyle: "blue_goku" }), "idle", 0, { ssj: true, ssjColor: "#3fd0f0" })`);
check("cabelo Blue fica ciano quando a transformação escolhe a cor", blue.includes("#3fd0f0") && !blue.includes("#ffe34d"));
const svgs = run(`["fusao", "broly", "majin", "gotenks"].map(k => generateSpriteFrameSvg(SPRITE_PRESETS[k].appearance, "attackKi", 2))
    .concat(${JSON.stringify(novos)}.map(n => generateSpriteFrameSvg(Object.assign({}, SPRITE_PRESETS.goku.appearance, { hairStyle: n }), "idle", 0, { ssj: true })))
    .concat([generateSpriteFrameSvg(spriteTransformAppearance(SPRITE_PRESETS.majin.appearance, getCharacterTransformations("majin_buu")[0]), "flyRight", 1)])`);
check("todos os desenhos novos são SVG válidos (sem atributo repetido, sem NaN)", svgs.every(svg => svg.startsWith("<svg") && !svg.includes("NaN") && !/<[^>]*\bstroke-width="[^"]*"[^>]*\bstroke-width=/.test(svg)));

// ---------- salvos antigos: troca uma vez ----------
const antigo = { gender: "masculino", race: "Saiyajin", build: "musculoso", hairStyle: "goku", hairColor: "#111018", eyeType: "serio", irisColor: "#161a24", mouthType: "maligno", earType: "normal", headFeature: "none", bodyMarks: "none", accessory: "potara", outerShirt: "colete_fusao", innerShirt: "regata", pants: "larga", shoes: "botas_saiyajin", gloves: "pulseiras", primaryColor: "#1c3fb0", secondaryColor: "#2a2f45", accentColor: "#f5c518", shirtColor: "#262a3e", pantsColor: "#f4f1e8", kiColor: "#7fd8ff" };
run(`characterDB.gogeta.name = "GOGETA"; characterDB.gogeta.special = "BIG BANG KAMEHAMEHA"; characterDB.gogeta.builderAppearance = normalizeAppearance(${JSON.stringify(antigo)});
     characterDB.broly.builderAppearance = normalizeAppearance(PERSONAGENS_ANTIGOS_075.broly.antiga); characterDB.broly.transformations = [{ name: "Transformação 1", diff: {}, ssj: true, aura: "amarelo" }];
     writeStorage("saiyan_personagens_075", ""); atualizarPersonagens075()`);
check("GOGETA salvo vira VEGETTO (nome, especial e visual)", run(`characterDB.gogeta.name`) === "VEGETTO" && run(`characterDB.gogeta.special`) === "FINAL KAMEHAMEHA" && run(`characterDB.gogeta.builderAppearance.hairStyle`) === "vegetto");
check("Broly antigo salvo passa para o novo e ganha o Lendário", run(`characterDB.broly.builderAppearance.outerShirt`) === "armadura_broly" && run(`getCharacterTransformations("broly")[0].name`) === "Super Saiyajin Lendário");
run(`characterDB.broly.builderAppearance = normalizeAppearance(PERSONAGENS_ANTIGOS_075.broly.antiga); atualizarPersonagens075()`);
check("só uma vez (um Broly mexido depois fica como está)", run(`characterDB.broly.builderAppearance.outerShirt`) === "none");
run(`characterDB.majin_buu.builderAppearance = normalizeAppearance(Object.assign({}, PERSONAGENS_ANTIGOS_075.majin_buu.antiga, { primaryColor: "#00ff00" })); writeStorage("saiyan_personagens_075", ""); atualizarPersonagens075()`);
check("Majin Buu editado pelo jogador não é trocado", run(`characterDB.majin_buu.builderAppearance.primaryColor`) === "#00ff00");

process.exit(summary());
