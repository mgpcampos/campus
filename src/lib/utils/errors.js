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

/**
 * Classify an error into a standardized taxonomy
 * @param {any} error
 * @returns {{
 *  type: string;
 *  code: string;
 *  status?: number;
 *  retryable: boolean;
 *  userMessage: string;
 *  devMessage: string;
 *  cause?: any;
 * }}
 */
export function classifyError(error) {
	const status = error?.status || error?.response?.status;
	const offline = typeof navigator !== 'undefined' && !navigator.onLine;
	let type = 'UNKNOWN';
	let code = 'unknown_error';
	let retryable = false;

	// Validation (PocketBase format or Zod)
	if (error?.response?.data?.data || error?.name === 'ZodError') {
		type = 'VALIDATION';
		code = 'validation_error';
		retryable = false;
	}
	// Auth
	else if (status === 401) {
		type = 'AUTH';
		code = 'auth_required';
		retryable = false;
	}
	// Permission
	else if (status === 403) {
		type = 'PERMISSION';
		code = 'forbidden';
		retryable = false;
	}
	// Not Found
	else if (status === 404) {
		type = 'NOT_FOUND';
		code = 'resource_not_found';
		retryable = false;
	}
	// Conflict
	else if (status === 409) {
		type = 'CONFLICT';
		code = 'conflict';
		retryable = false;
	}
	// Rate limit
	else if (status === 429) {
		type = 'RATE_LIMIT';
		code = 'rate_limited';
		retryable = true;
	}
	// Offline
	else if (offline) {
		type = 'OFFLINE';
		code = 'offline';
		retryable = true;
	}
	// Network
	else if (error?.message?.toLowerCase?.().includes('network')) {
		type = 'NETWORK';
		code = 'network_error';
		retryable = true;
	}
	// Server
	else if (status >= 500 && status <= 599) {
		type = 'SERVER';
		code = 'server_error';
		retryable = true;
	}

	const rawMessage = getErrorMessage(error);

	/** @type {Record<string,string>} */
	const userMessageMap = {
		validation_error: 'Please correct the highlighted fields.',
		auth_required: 'You need to sign in to continue.',
		forbidden: 'You do not have permission to perform this action.',
		resource_not_found: 'The requested resource was not found.',
		conflict: 'This action conflicts with existing data.',
		rate_limited: 'Too many requests. Please wait and try again.',
		offline: 'You appear to be offline. Check your connection.',
		network_error: 'Network issue. Please retry.',
		server_error: 'A server error occurred. Try again shortly.'
	};

	const userMessage = Object.prototype.hasOwnProperty.call(userMessageMap, code)
		? userMessageMap[code]
		: 'Something went wrong.';
	return {
		type,
		code,
		status,
		retryable,
		userMessage,
		devMessage: rawMessage,
		cause: error
	};
}

/**
 * Lightweight logging stub (can be replaced with external logging later)
 * @param {any} meta
 */
export function logError(meta) {
	try {
		if (!meta) return;
		const code = meta.code || 'unknown';
		const msg = meta.devMessage || meta.message || 'No message';
		console.error('[ERROR]', code, msg, { meta });
	} catch {
		/* noop: logging transport unavailable */
	}
}

/**
 * Normalize an unknown error into a standardized shape used across UI
 * @param {any} error
 * @param {{ context?: string }} [options]
 */
export function normalizeError(error, options = {}) {
	if (error?.__normalized) return error;
	const classification = classifyError(error);

	// Preserve Error prototype so test frameworks (toThrow) that rely on instanceof
	// and access to stack/message methods still work.
	if (error instanceof Error) {
		const e = error;
		// Attach normalized metadata directly on the original Error object
		Object.assign(e, {
			__normalized: true,
			type: classification.type,
			code: classification.code,
			status: classification.status,
			retryable: classification.retryable,
			userMessage: classification.userMessage,
			devMessage: classification.devMessage,
			context: options.context,
			message: classification.devMessage // ensure message string present
		});
		logError(e);
		return e;
	}

	// Fallback to plain object when original isn't an Error instance
	const o = {
		__normalized: true,
		...classification,
		context: options.context,
		message: classification.devMessage,
		toString() {
			return `[${classification.code}] ${classification.devMessage}`;
		}
	};
	logError(o);
	return o;
}

/**
 * Convenience helper to extract a safe user message from any error
 * (Prefers normalized userMessage if present)
 * @param {any} error
 * @returns {string}
 */
export function getUserMessage(error) {
	if (!error) return 'Something went wrong.';
	if (error.userMessage) return error.userMessage;
	return classifyError(error).userMessage;
}

/**
 * Build a lightweight serializable payload suitable for API/json responses
 * @param {any} error
 * @param {{ context?: string }} [options]
 * @returns {{ code: string; message: string; retryable: boolean; status?: number }}
 */
export function toErrorPayload(error, options = {}) {
	const n = normalizeError(error, options);
	return {
		code: n.code,
		message: n.userMessage,
		retryable: n.retryable,
		status: n.status
	};
}

/**
 * Notify user about an error (toast + optional console detail)
 * Safe for SSR (no-op on server)
 * @param {any} error
 * @param {{ context?: string; showDev?: boolean; description?: string }} [options]
 */
export async function notifyError(error, options = {}) {
	if (typeof window === 'undefined') return;
	try {
		const mod = await import('svelte-sonner');
		const toastFn = mod.toast;
		const n = normalizeError(error, { context: options.context });
		logError(n);
		const description = options.description || (options.showDev ? n.devMessage : undefined);
		toastFn.error(n.userMessage, { description });
		return n;
	} catch {
		return; // toast system not available
	}
}

/**
 * Retry helper with exponential backoff leveraging retryable flag
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ attempts?: number; baseDelay?: number; factor?: number; context?: string; onAttempt?: (error:any, attempt:number)=>void }} [options]
 * @returns {Promise<T>}
 */
export async function withRetry(fn, options = {}) {
	const { attempts = 3, baseDelay = 250, factor = 2, context, onAttempt } = options;
	let lastError;
	for (let i = 0; i < attempts; i++) {
		try {
			return await fn();
		} catch (e) {
			const n = normalizeError(e, { context });
			lastError = n;
			if (!n.retryable || i === attempts - 1) {
				throw n;
			}
			onAttempt?.(n, i + 1);
			const delay = baseDelay * Math.pow(factor, i);
			await new Promise((r) => setTimeout(r, delay));
		}
	}
	throw lastError;
}

/**
 * Helper to wrap async UI actions with consistent error toast + loading
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ onError?: (normalized:any)=>void; rethrow?: boolean; context?: string }} [options]
 * @returns {Promise<T|undefined>}
 */
export async function withErrorToast(fn, options = {}) {
	try {
		return await fn();
	} catch (e) {
		const n = await notifyError(e, { context: options.context });
		options.onError?.(n);
		if (options.rethrow) throw n;
	}
}
