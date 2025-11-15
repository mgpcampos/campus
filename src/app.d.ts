import type PocketBase from 'pocketbase'

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	/* biome-ignore lint/style/noNamespace: SvelteKit relies on this namespace for ambient types */
	namespace App {
		// interface Error {}
		interface Locals {
			pb: PocketBase
			user?: import('pocketbase').RecordModel | null
			sessionToken?: string | null
			sessionId?: string | null
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}
