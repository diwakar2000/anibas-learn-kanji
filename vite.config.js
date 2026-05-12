import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/anibas-learn-kanji/' : '/',
  plugins: [svelte()],
  server: {
    host: '127.0.0.1'
  },
  preview: {
    host: '127.0.0.1'
  }
}));
