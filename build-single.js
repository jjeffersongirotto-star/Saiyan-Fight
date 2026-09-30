// Gera jogo-arquivo-unico.html (todos os .js embutidos, mesma ordem do index.html).
// Uso:  node build-single.js           -> regenera o arquivo
//       node build-single.js --check   -> só confere se está atualizado (sai com erro se estiver velho)
// Sem dependências; só Node. Não faz parte do jogo: é uma ferramenta de manutenção.
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8");
const index = read("index.html");

const head = index
    .slice(0, index.indexOf("    <script src="))
    .replace('<meta name="viewport" content="width=device-width, initial-scale=1.0">',
             '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
const scripts = [...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
if (!scripts.length) throw new Error("Nenhum <script src> encontrado no index.html");

let out = head;
for (const file of scripts) {
    out += `    <script>\n    // ==================== ${file} ====================\n${read(file)}\n    </script>\n\n`;
}
out = out.replace(/\n+$/, "") + "\n</body>\n</html>";

const target = path.join(dir, "jogo-arquivo-unico.html");
if (process.argv.includes("--check")) {
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
    if (current !== out) {
        console.error("jogo-arquivo-unico.html está DESATUALIZADO. Rode: node build-single.js");
        process.exit(1);
    }
    console.log("jogo-arquivo-unico.html está atualizado.");
} else {
    fs.writeFileSync(target, out);
    console.log(`Gerado jogo-arquivo-unico.html (${scripts.join(", ")})`);
}
