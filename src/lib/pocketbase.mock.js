// Test mock for $lib/pocketbase.js to avoid real network and env dependency
import { writable } from 'svelte/store'

export const currentUser = writable(/** @type {import('pocketbase').RecordModel | null} */ (null))

const noop = () => undefined

const authStore = {
	/** @type {string | null} */
	token: null,
	/** @type {import('pocketbase').RecordModel | null} */
	model: null,
	/** @type {((token: string | null, model: import('pocketbase').RecordModel | null) => void) | null} */
	listener: null,
	/**
	 * @param {string | null} token
	 * @param {import('pocketbase').RecordModel | null} model
	 */
	save(token = null, model = null) {
		this.token = token
		this.model = model
		currentUser.set(model)
		this.listener?.(token, model)
	},
	clear() {
		this.token = null
		this.model = null
		currentUser.set(null)
		this.listener?.(null, null)
	},
	/**
	 * @param {(token: string | null, model: import('pocketbase').RecordModel | null) => void} callback
	 */
	onChange(callback) {
		this.listener = callback
		return () => {
			if (this.listener === callback) {
				this.listener = null
			}
		}
	}
}

export const pb = {
	authStore,
	collection: () => ({
		getList: async () => ({ items: [] }),
		subscribe: async () => noop,
		unsubscribe: noop,
		update: async () => ({}),
		create: async () => ({}),
		getFirstListItem: async () => ({ id: 'u-mention' })
	})
}

/**
 * @param {string | null} token
 * @param {import('pocketbase').RecordModel | null} model
 */
export function hydrateClientAuth(token = null, model = null) {
	if (token && model) {
		authStore.save(token, model)
	} else {
		authStore.clear()
	}
}
