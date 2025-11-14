import PocketBase from 'pocketbase'
import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { PUBLIC_POCKETBASE_URL } from '$env/static/public'

// Single PocketBase instance for client runtime only. On server we always use event.locals.pb
const defaultOrigin =
	typeof globalThis.window === 'undefined'
		? 'http://127.0.0.1:8090'
		: new URL('/pb', globalThis.window.location.origin).toString().replace(/\/$/, '')
export const pb = new PocketBase(PUBLIC_POCKETBASE_URL || defaultOrigin)

// Writable store tracking current authenticated user model
export const currentUser = writable(pb.authStore.model)

if (browser) {
	// We intentionally do NOT loadFromCookie here because cookie is httpOnly;
	// Instead, server layout load passes current user via data and layout sets store.
	// This avoids exposing the raw token to JS and keeps SSR->CSR hydration consistent.
	pb.authStore.onChange(() => {
		currentUser.set(pb.authStore.model)
	})
}

/**
 * Synchronize PocketBase auth state on the client using session data from the server.
 * @param {string | null | undefined} token
 * @param {import('pocketbase').RecordModel | null | undefined} model
 */
export function hydrateClientAuth(token, model) {
	if (!browser) return
	const nextToken = token ?? null
	const currentToken = pb.authStore.token ?? null
	const currentId = pb.authStore.model?.id ?? null
	const nextId = model?.id ?? null

	if (nextToken === currentToken && nextId === currentId) {
		// Already in sync; avoid redundant save/clear to prevent needless events.
		return
	}

	if (nextToken && model) {
		pb.authStore.save(nextToken, model)
		currentUser.set(pb.authStore.model)
	} else {
		pb.authStore.clear()
		currentUser.set(null)
	}
}
