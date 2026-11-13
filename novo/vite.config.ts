import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// build = número de commits (o mesmo BUILD_WEB que o app compara na setinha ATUALIZAR); SAIYAN_BUILD troca
function numeroDoBuild(): number {
  const env = parseInt(process.env.SAIYAN_BUILD ?? '', 10);
  if (Number.isFinite(env)) return env;
  try { return parseInt(execSync('git rev-list --count HEAD').toString().trim(), 10) || 0; } catch { return 0; }
}

// base './': o build funciona em qualquer endereço (site em /Saiyan-Fight/, prévia do CI e dentro do APK, servido do próprio celular)
export default defineConfig({
  base: './',
  define: { __VERSAO__: JSON.stringify(pkg.version), __BUILD__: JSON.stringify(numeroDoBuild()) },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600, // o Phaser sozinho tem ~1,2 MB (fica num arquivo separado, em cache)
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
