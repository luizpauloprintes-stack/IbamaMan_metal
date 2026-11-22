import { defineConfig } from 'vite';

// base relativo: obrigatório para o WebView do Capacitor carregar os assets a partir de file/https local.
export default defineConfig({
  base: './',
  // número da build (GitHub Actions) mostrado na capa, para conferir qual versão está instalada
  define: { __BUILD__: JSON.stringify(process.env.GITHUB_RUN_NUMBER || 'dev') },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000
  },
  server: { host: true }
});
