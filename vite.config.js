import { defineConfig } from 'vite';

// base relativo: obrigatório para o WebView do Capacitor carregar os assets a partir de file/https local.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000
  },
  server: { host: true }
});
