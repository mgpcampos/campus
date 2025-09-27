import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
	const isProduction = mode === 'production';
	const shouldEmitSourcemap = isProduction && process.env.BUNDLE_SOURCEMAP === 'true';

	return {
		// Keep sveltekit first to ensure its aliases (like $lib) register early
		plugins: [sveltekit(), tailwindcss()],
		resolve: {
			alias: {
				// Explicit fallback alias in case plugin order/caching caused loss of default alias
				$lib: path.resolve('./src/lib')
			}
		},
		build: {
			target: 'es2022',
			cssCodeSplit: true,
			sourcemap: shouldEmitSourcemap,
			assetsInlineLimit: 4096,
			chunkSizeWarningLimit: 900,
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (!id.includes('node_modules')) return;
						if (id.includes('lucide-svelte')) return 'icons';
						if (id.includes('date-fns')) return 'date-fns';
						if (id.includes('sveltekit-superforms') || id.includes('zod')) return 'forms';
						if (id.includes('pocketbase')) return 'pocketbase-client';
						return 'vendor';
					}
				}
			}
		},
		esbuild: {
			legalComments: 'none',
			drop: isProduction ? ['console', 'debugger'] : []
		},
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}'],
			environment: 'jsdom',
			setupFiles: ['src/setupTests.js'],
			globals: true,
			// Clear cache issues when aliases previously failed
			clearMocks: true,
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						name: 'client',
						environment: 'browser',
						browser: {
							enabled: true,
							provider: 'playwright',
							instances: [{ browser: 'chromium' }]
						},
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**'],
						setupFiles: ['./vitest-setup-client.ts']
					}
				},
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				}
			]
		}
	};
});
