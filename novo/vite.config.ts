import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base './': o build funciona em qualquer endereço (prévia do CI, pasta local e, no futuro, dentro do APK)
export default defineConfig({
  base: './',
  define: { __VERSAO__: JSON.stringify(pkg.version) },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600, // o Phaser sozinho tem ~1,2 MB (fica num arquivo separado, em cache)
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
