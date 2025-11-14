import { get } from 'svelte/store'
import { online } from '../stores/connection.js'
import { normalizeError, withRetry } from './errors.ts'

/**
 * Wrapper for API calls that handles offline scenarios gracefully
 * @template T
 * @param {() => Promise<T>} apiCall
 * @param {{
 *   fallback?: () => Promise<T> | T;
 *   offlineMessage?: string;
 *   enableRetry?: boolean;
 *   context?: string;
 * }} [options]
 * @returns {Promise<T>}
 */
export async function withOfflineSupport(apiCall, options = {}) {
	const {
		fallback,
		offlineMessage = 'This action requires an internet connection',
		enableRetry = true,
		context = 'api'
	} = options

	const isOnline = get(online)

	if (!isOnline) {
		if (fallback) {
			try {
				return await fallback()
			} catch {
				throw normalizeError(new Error(offlineMessage), { context })
			}
		} else {
			throw normalizeError(new Error(offlineMessage), { context })
		}
	}

	const wrappedCall = enableRetry ? () => withRetry(apiCall, { context }) : apiCall

	try {
		return await wrappedCall()
	} catch (error) {
		// If we detect we went offline during the call, try fallback
		if (!get(online) && fallback) {
			try {
				return await fallback()
			} catch {
				// Return the original error if fallback also fails
				throw error
			}
		}
		throw error
	}
}

/**
 * Creates a queue for offline actions to be retried when connection is restored
 */
class OfflineQueue {
	constructor() {
		/** @type {{ id: string, action: () => Promise<any>, retryCount: number }[]} */
		this.queue = []
		/** @type {Set<string>} */
		this.processing = new Set()
		this.isListening = false
	}

	/**
	 * Add an action to the offline queue
	 * @param {() => Promise<any>} action
	 * @param {string} [id] - Optional ID to prevent duplicates
	 */
	enqueue(action, id = Math.random().toString(36)) {
		// Prevent duplicates
		if (id && this.queue.some((item) => item.id === id)) {
			return
		}

		this.queue.push({ id, action, retryCount: 0 })
		this.startListening()
	}

	/**
	 * Process queue when connection is restored
	 */
	async processQueue() {
		if (!get(online) || this.queue.length === 0) return

		const toProcess = [...this.queue]
		this.queue = []

		for (const item of toProcess) {
			if (this.processing.has(item.id)) continue

			this.processing.add(item.id)
			try {
				await item.action()
			} catch {
				// Re-queue if retryable and under retry limit
				if (item.retryCount < 3) {
					this.queue.push({ ...item, retryCount: item.retryCount + 1 })
				}
			} finally {
				this.processing.delete(item.id)
			}
		}
	}

	/**
	 * Start listening for connection changes
	 */
	startListening() {
		if (this.isListening) return
		this.isListening = true

		online.subscribe((isOnline) => {
			if (isOnline && this.queue.length > 0) {
				// Small delay to ensure connection is stable
				setTimeout(() => this.processQueue(), 1000)
			}
		})
	}

	/**
	 * Get queue status
	 */
	getStatus() {
		return {
			pending: this.queue.length,
			processing: this.processing.size
		}
	}
}

export const offlineQueue = new OfflineQueue()
