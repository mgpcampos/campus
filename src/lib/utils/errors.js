/**
 * Extract error message from PocketBase error response
 * @param {any} error - The error object from PocketBase
 * @returns {string} - User-friendly error message
 */
export function getErrorMessage(error) {
	if (error?.response?.data) {
		const data = error.response.data;
		
		// Handle validation errors
		if (data.data) {
			const fieldErrors = Object.values(data.data).flat();
			if (fieldErrors.length > 0) {
				return fieldErrors[0].message || fieldErrors[0];
			}
		}
		
		// Handle general errors
		if (data.message) {
			return data.message;
		}
	}
	
	// Fallback to error message or generic message
	return error?.message || 'An unexpected error occurred';
}

/**
 * Check if error is a PocketBase authentication error
 * @param {any} error - The error object
 * @returns {boolean} - True if it's an auth error
 */
export function isAuthError(error) {
	return error?.status === 401 || error?.response?.status === 401;
}