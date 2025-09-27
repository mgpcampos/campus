import { error, redirect } from '@sveltejs/kit';

/**
 * Middleware to protect routes that require authentication
 * @param {App.Locals} locals - SvelteKit locals object containing pb instance
 * @param {string|null} returnUrl - URL to redirect to after login (optional)
 * @returns {any} - User object if authenticated
 * @throws {Response} - Redirect to login if not authenticated
 */
export function requireAuth(locals, returnUrl = null) {
	if (!locals.pb.authStore.isValid) {
		const loginUrl = returnUrl
			? `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
			: '/auth/login';
		throw redirect(302, loginUrl);
	}

	return locals.pb.authStore.model;
}

/**
 * Check if user is authenticated without throwing
 * @param {App.Locals} locals - SvelteKit locals object containing pb instance
 * @returns {boolean} - True if authenticated
 */
export function isAuthenticated(locals) {
	return locals.pb.authStore.isValid;
}

/**
 * Get current user or null if not authenticated
 * @param {App.Locals} locals - SvelteKit locals object containing pb instance
 * @returns {any} - User object or null
 */
export function getCurrentUser(locals) {
	return locals.pb.authStore.isValid ? locals.pb.authStore.model : null;
}

/**
 * Assert that the current user is authenticated and has admin privileges.
 * @param {App.Locals} locals
 */
export function requireAdmin(locals) {
	const user = requireAuth(locals);
	if (!user?.isAdmin) {
		throw error(403, 'Admins only');
	}
	return user;
}
