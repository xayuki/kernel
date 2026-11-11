import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api/tokenjuice': {
        target: 'https://api.tokenjuice.ai/v1',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/api\/tokenjuice/, '')
      }
    }
  }
});
