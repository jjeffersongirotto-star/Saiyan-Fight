// tests/transformacao-editor.test.js — aba TRANSFORMAÇÃO do editor (v0.113): cada forma tem nome, aura e altura; o
// desenho vem do conjunto de sprites (a imagem de cada cartão é a forma daquele nível). Sem construtor nem
// "COPIAR O CORPO DE".
//
// Uso: node tests/transformacao-editor.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
h.carregarPacotes(["freeza"]);

run(`openModal("freeza_1"); switchEditorTab("transformacao")`);
check("Freeza tem Golden e Black depois do ciborgue", JSON.stringify(run(`tempTransformations.slice(-2).map(t => t.name)`)) === JSON.stringify(["Golden Freeza", "Black Freeza"]));
check("sem COPIAR O CORPO DE", !require("fs").readFileSync(__dirname + "/../index.html", "utf8").includes("transform-copy-from"));
check("um cartão por transformação", run(`document.getElementById("transform-list").children.length`) === run("tempTransformations.length"));
check("a imagem de cada cartão é a forma daquele nível no conjunto de sprites", run(`getTransformThumbnail(5) === getCharacterAnimationFrames("freeza_1", "idle", 6)[0] && getTransformThumbnail(0) !== getTransformThumbnail(5)`));
run(`addTransformation()`);
const n = run(`tempTransformations.length`);
check("+ acrescenta uma forma só com nome e aura", JSON.stringify(run(`tempTransformations[${n - 1}]`)) === JSON.stringify({ name: "Transformação " + n, aura: "amarelo" }));
run("closeModal()");
process.exit(summary());
