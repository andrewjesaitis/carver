import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/carver/',
  build: {
    outDir: 'dist/carver',
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/algorithm/vitest.setup.ts'],
  },
});
