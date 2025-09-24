import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig(({ mode }) => ({
	plugins: [svelte()],
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, 'src/lib'),
			'$env/static/public': path.resolve(__dirname, 'src/mocks/env-public.ts'),
			'$app/stores': path.resolve(__dirname, 'src/mocks/app-stores.ts'),
			'$app/environment': path.resolve(__dirname, 'src/mocks/app-environment.ts')
		},
		// Ensure browser conditions so Svelte 5 lifecycle APIs (mount/onMount) are available under Vitest
		conditions: mode === 'test' ? ['browser'] : []
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest-setup-client.ts']
	}
}));
