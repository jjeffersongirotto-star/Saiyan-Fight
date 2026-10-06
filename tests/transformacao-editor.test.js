// tests/transformacao-editor.test.js — editor de transformações: trocar a raça mostra a pele da raça na hora,
// tirar uma peça (Nenhum) fica salvo na transformação, e uma transformação nova pode copiar o corpo de outra.
//
// Uso: node tests/transformacao-editor.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;

run(`openModal("freeza_1"); switchEditorTab("transformacao")`);
check("COPIAR O CORPO DE lista a original e as transformações do Freeza", run(`document.getElementById("transform-copy-from").options.length`) === 1 + run(`tempTransformations.length`));
check("Freeza tem Golden e Black depois do ciborgue", JSON.stringify(run(`tempTransformations.slice(-2).map(t => t.name)`)) === JSON.stringify(["Golden Freeza", "Black Freeza"]));

// nova transformação copiando a forma final (3ª)
run(`document.getElementById("transform-copy-from").value = "2"; addTransformation()`);
const n = run(`tempTransformations.length`);
check("a nova começa com o corpo da forma escolhida", run(`JSON.stringify(tempTransformations[${n - 1}].diff) === JSON.stringify(tempTransformations[2].diff)`));
check("e abre no construtor já com essa forma", run(`document.getElementById("build-body-marks").value`) === "freeza");

// trocar a raça com cor própria marcada: volta para a cor da raça e a prévia muda
run(`document.getElementById("build-skin-auto").checked = false; document.getElementById("build-skin").value = "#cdb8ea";`);
const antes = run(`spriteSkin(getBuilderAppearanceFromForm())`);
run(`document.getElementById("build-race").value = "Namekuseijin"; escolherRaca()`);
check("trocar a raça aplica a pele da raça", run(`document.getElementById("build-skin-auto").checked`) === true && run(`spriteSkin(getBuilderAppearanceFromForm())`) !== antes);

// tirar o rabo (Nenhum) fica salvo no diff
run(`document.getElementById("build-tail").value = "none"; finishTransformationEdit(null)`);
check("tirar uma peça fica salvo na transformação", run(`tempTransformations[${n - 1}].diff.tail`) === "none" && run(`tempTransformations[${n - 1}].diff.race`) === "Namekuseijin");
process.exit(summary());   // a prévia do construtor deixa um setInterval rodando
