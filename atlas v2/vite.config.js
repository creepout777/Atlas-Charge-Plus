import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: ['chrome64', 'edge79', 'firefox67', 'safari12'],
  },
  server: {
    port: 3000,
    open: true
  }
});
