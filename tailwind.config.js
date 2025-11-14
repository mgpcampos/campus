/** @type {import('tailwindcss').Config} */
export default {
	// Using explicit content paths helps Tailwind tree-shake correctly and is
	// still recommended even though v4 can infer some defaults.
	content: [
		'./src/**/*.{html,svelte,js,ts}',
		'./src/lib/**/*.{svelte,js,ts}',
		'./src/routes/**/*.{svelte,js,ts}'
	],
	darkMode: 'class',
	theme: {
		extend: {
			// Most colors are driven by CSS variables declared in app.css.
			// Provide semantic bindings here for any utilities that need static fallbacks.
			colors: {
				background: 'oklch(var(--background) / <alpha-value>)',
				foreground: 'oklch(var(--foreground) / <alpha-value>)'
			},
			borderRadius: {
				sm: 'var(--radius-sm)',
				DEFAULT: 'var(--radius)',
				md: 'var(--radius-md)',
				lg: 'var(--radius-lg)',
				xl: 'var(--radius-xl)'
			}
		}
	},
	plugins: [
		// Tailwind v4 plugin packages work through the Vite integration; declarative
		// usage here still activates forms & typography features as expected.
		import('@tailwindcss/forms'),
		import('@tailwindcss/typography')
	]
}
