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
	 * @param {string | null | undefined} token
	 * @param {import('pocketbase').RecordModel | null | undefined} model
	 */
	save(token, model) {
		const nextToken = token ?? null
		const nextModel = model ?? null
		this.token = nextToken
		this.model = nextModel
		currentUser.set(nextModel)
		this.listener?.(nextToken, nextModel)
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
 * @param {string | null | undefined} token
 * @param {import('pocketbase').RecordModel | null | undefined} model
 */
export function hydrateClientAuth(token, model) {
	if (token && model) {
		authStore.save(token, model)
	} else {
		authStore.clear()
	}
}
