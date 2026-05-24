import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import path from 'path';

export default defineConfig({
  plugins: [
    angular()
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@env': path.resolve(__dirname, './src/environments'),
    },
  },
});