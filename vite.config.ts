import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  // Keep sveltekit first to ensure its aliases (like $lib) register early
  plugins: [sveltekit(), tailwindcss()],
  resolve: {
    alias: {
      // Explicit fallback alias in case plugin order/caching caused loss of default alias
      $lib: path.resolve('./src/lib')
    }
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    setupFiles: ['src/setupTests.js'],
    globals: true,
    // Clear cache issues when aliases previously failed
    clearMocks: true
  }
});