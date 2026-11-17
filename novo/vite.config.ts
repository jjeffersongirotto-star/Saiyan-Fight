import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// build = número de commits (o mesmo BUILD_WEB que o app compara na setinha ATUALIZAR); SAIYAN_BUILD troca
function numeroDoBuild(): number {
  const env = parseInt(process.env.SAIYAN_BUILD ?? '', 10);
  if (Number.isFinite(env)) return env;
  try { return parseInt(execSync('git rev-list --count HEAD').toString().trim(), 10) || 0; } catch { return 0; }
}

// base './': o build funciona em qualquer endereço (site em /Saiyan-Fight/, prévia do CI e dentro do APK, servido do próprio celular)
const BUILD = numeroDoBuild();

// Phaser menor no build (v0.145): 'phaser' vira src/phaser-leve.js (só os módulos usados) e as chaves de compilação
// do Phaser (o webpack dele troca "typeof WEBGL_RENDERER" etc.) são trocadas aqui. Sem som do Phaser (o nosso é sintetizado).
const CHAVES_PHASER: Record<string, boolean> = {
  WEBGL_RENDERER: true, CANVAS_RENDERER: true, FEATURE_SOUND: false, PLUGIN_CAMERA3D: false, PLUGIN_FBINSTANT: false, WEBGL_DEBUG: false,
};
const phaserLeve: Plugin = {
  name: 'phaser-leve',
  enforce: 'pre',
  apply: 'build',
  config: () => ({ resolve: { alias: [{ find: /^phaser$/, replacement: fileURLToPath(new URL('./src/phaser-leve.js', import.meta.url)) }] } }),
  transform(codigo, id) {
    if (!id.includes('/node_modules/phaser/src/')) return null;
    return codigo.replace(/typeof (WEBGL_RENDERER|CANVAS_RENDERER|FEATURE_SOUND|PLUGIN_CAMERA3D|PLUGIN_FBINSTANT|WEBGL_DEBUG)\b/g, (_, k: string) => (CHAVES_PHASER[k] ? '"boolean"' : '""'));
  },
};

export default defineConfig({
  base: './',
  define: { __VERSAO__: JSON.stringify(pkg.version), __BUILD__: JSON.stringify(BUILD) },
  // versao.json no site: o jogo aberto compara com ele para acender o aviso de versão nova (src/app/aviso.ts)
  plugins: [phaserLeve, {
    name: 'versao-json',
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'versao.json', source: JSON.stringify({ versao: pkg.version, build: BUILD }) }); },
  }],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600, // o Phaser sozinho tem ~1,2 MB (fica num arquivo separado, em cache)
    rollupOptions: { output: { manualChunks: (id) => (id.includes('/node_modules/phaser/') || id.includes('/src/phaser-leve.js') ? 'phaser' : undefined) } },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
