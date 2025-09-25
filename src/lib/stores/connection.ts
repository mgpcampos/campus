import { writable } from 'svelte/store';

/**
 * Reactive online/offline state.
 * Defaults to true (SSR safe) and updated on client hydration.
 */
export const online = writable(true);

/**
 * Initialize connection listeners.
 * Returns a dispose function to remove listeners.
 */
export function initConnectionListeners() {
	if (typeof window === 'undefined') return;
	online.set(navigator.onLine);
	const handleOnline = () => online.set(true);
	const handleOffline = () => online.set(false);
	window.addEventListener('online', handleOnline);
	window.addEventListener('offline', handleOffline);
	return () => {
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
	};
}
