import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
	plugins: [svelte()],
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, 'src/lib'),
			'$env/static/public': path.resolve(__dirname, 'src/mocks/env-public.ts'),
			'$app/stores': path.resolve(__dirname, 'src/mocks/app-stores.ts'),
			'$app/environment': path.resolve(__dirname, 'src/mocks/app-environment.ts'),
			'$app/navigation': path.resolve(__dirname, 'src/mocks/app-navigation.ts'),
			'$app/forms': path.resolve(__dirname, 'src/mocks/app-forms.ts')
		},
		// Ensure browser conditions so Svelte 5 lifecycle APIs (mount/onMount) are available under Vitest
		conditions: mode === 'test' ? ['browser'] : []
	},
	test: {
		include: [
			'src/**/*.{test,spec}.{js,ts}',
			'tests/integration/**/*.{test,spec}.{js,ts}',
			'specs/**/contracts/tests/**/*.{test,spec}.{js,ts}'
		],
		exclude: ['tests/e2e/**/*', 'node_modules/**/*'],
		environment: 'jsdom',
		setupFiles: ['./vitest-setup-client.ts']
	}
}))
