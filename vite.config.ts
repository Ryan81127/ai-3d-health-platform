import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 以相對路徑載入，可直接放在 GitHub Pages 子路徑；public/ 內的舊版原型會原樣複製到 dist/。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 1600 },
});
