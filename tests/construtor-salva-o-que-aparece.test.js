// tests/construtor-salva-o-que-aparece.test.js — personagem novo feito no CONSTRUTOR: mudar o modelo/cabelo e clicar
// em SALVAR (sem "USAR ESTE PERSONAGEM") salva o que aparece na prévia, não as animações antigas (o Goku padrão).
// Também confere o padrão novo das teclas do PC e a tela CONTROLE JOYSTICK.
//
// Uso: node tests/construtor-salva-o-que-aparece.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
const mudou = (id) => (h.docL.change || []).forEach(f => f({ target: { id } }));

run("openModal(null)");
run("setBuilderFormFromAppearance(SPRITE_PRESETS.trunks.appearance)");
run("document.getElementById('build-hair-style').value = 'trunks_futuro'");
mudou("build-preset"); mudou("build-hair-style");
run("document.getElementById('char-name').value = 'TRUNKS TESTE'");
run("saveCharacterFromModal()");
const chave = run("Object.keys(characterDB).find(k => characterDB[k].name === 'TRUNKS TESTE')");
check("o personagem novo foi salvo", Boolean(chave));
check("salvo com a aparência do construtor (não a do Goku)", run(`characterDB['${chave}'].builderAppearance && characterDB['${chave}'].builderAppearance.outerShirt`) === "jaqueta_trunks");
check("o card usa o desenho dele", run(`characterDB['${chave}'].animations.idle[0] === getProceduralFrameUrls(characterDB['${chave}'].builderAppearance, 'idle')[0]`) === true);
run("closeModal(); document.getElementById('modal-alert').style.display = 'none'");

// ---------- cor da pele em qualquer raça ----------
run("openModal(null); setBuilderFormFromAppearance(Object.assign({}, SPRITE_PRESETS.trunks.appearance, { race: 'Namekuseijin', skinColor: '' }))");
check("com a cor padrão, a amostra mostra a cor da raça", run("getBuilderAppearanceFromForm(); document.getElementById('build-skin').value") === run("SPRITE_RACE_SKIN.Namekuseijin"));
run("document.getElementById('build-skin').value = '#f3c29a'; escolherCorDaPele()");
check("escolher a cor desmarca o padrão da raça e vale no personagem", run("getBuilderAppearanceFromForm().skinColor") === "#f3c29a");
run("closeModal()");

// ---------- padrão das teclas do PC ----------
check("J1: setas, mouse esquerdo ataca, S carrega, A transforma, espaço parry, Q especial",
    run("JSON.stringify(keyBindings.p1)") === JSON.stringify({ up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", attack: "MouseLeft", charge: "KeyS", transform: "KeyA", parry: "Space", special: "KeyQ" }));
check("J2: teclado numérico", run("keyBindings.p2.up === 'Numpad5' && keyBindings.p2.charge === 'NumpadEnter' && keyBindings.p2.parry === 'Numpad0'") === true);
check("nomes das teclas no mesmo formato", run("getBindingDisplayName('Numpad5') + '|' + getBindingDisplayName('NumpadEnter')") === "NUM 5|NUM ENTER");

// ---------- tela CONTROLE JOYSTICK ----------
run("setGameState('options_gamepad')");
h.calls.length = 0; run("render()");
const textos = h.calls.filter(c => c[0] === "fillText").map(c => String(c[1][0]));
check("sem as linhas de texto embaixo dos botões", !textos.some(t => /NENHUM CONTROLE|XBOX:|MOVER: ANAL/.test(t)));
check("SENSIBILIDADE DO ANALÓGICO", textos.includes("DO ANALÓGICO"));
check("subtítulo sem o trecho do TOUCHPAD", !textos.some(t => /TOUCHPAD também/.test(t)));
run("setGameState('menu')");
process.exit(summary());
