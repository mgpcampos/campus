const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred'

type PocketBaseFieldError = { message?: string } | string

type PocketBaseErrorData = {
	data?: Record<string, PocketBaseFieldError[]>
	message?: unknown
}

type PocketBaseResponse = {
	status?: number
	data?: PocketBaseErrorData
}

type ErrorLike = {
	status?: number
	response?: PocketBaseResponse
	message?: unknown
	name?: string
	__normalized?: boolean
	userMessage?: string
	devMessage?: string
	code?: string
	retryable?: boolean
	context?: string
	[key: string]: unknown
}

const CLASSIFICATION_PRESETS = {
	UNKNOWN: { type: 'UNKNOWN', code: 'unknown_error', retryable: false },
	VALIDATION: { type: 'VALIDATION', code: 'validation_error', retryable: false },
	AUTH: { type: 'AUTH', code: 'auth_required', retryable: false },
	PERMISSION: { type: 'PERMISSION', code: 'forbidden', retryable: false },
	NOT_FOUND: { type: 'NOT_FOUND', code: 'resource_not_found', retryable: false },
	CONFLICT: { type: 'CONFLICT', code: 'conflict', retryable: false },
	RATE_LIMIT: { type: 'RATE_LIMIT', code: 'rate_limited', retryable: true },
	OFFLINE: { type: 'OFFLINE', code: 'offline', retryable: true },
	NETWORK: { type: 'NETWORK', code: 'network_error', retryable: true },
	SERVER: { type: 'SERVER', code: 'server_error', retryable: true }
} as const

type ClassificationDetail = (typeof CLASSIFICATION_PRESETS)[keyof typeof CLASSIFICATION_PRESETS]

const STATUS_CLASSIFICATIONS: Record<number, keyof typeof CLASSIFICATION_PRESETS> = {
	401: 'AUTH',
	403: 'PERMISSION',
	404: 'NOT_FOUND',
	409: 'CONFLICT',
	429: 'RATE_LIMIT'
}

export type ClassifiedError = {
	type: string
	code: string
	status?: number
	retryable: boolean
	userMessage: string
	devMessage: string
	cause?: unknown
}

type NormalizedBase = ClassifiedError & {
	__normalized: true
	context?: string
	message: string
}

export type NormalizedErrorResult =
	| (Error & NormalizedBase)
	| (NormalizedBase & { toString(): string })

type NormalizeOptions = { context?: string }
type NotifyOptions = NormalizeOptions & { showDev?: boolean; description?: string }
type RetryOptions = NormalizeOptions & {
	attempts?: number
	baseDelay?: number
	factor?: number
	onAttempt?: (error: NormalizedErrorResult, attempt: number) => void
}
type ErrorToastOptions = NormalizeOptions & {
	onError?: (error: NormalizedErrorResult | undefined) => void
	rethrow?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function asErrorLike(value: unknown): ErrorLike | undefined {
	return isRecord(value) ? (value as ErrorLike) : undefined
}

export function getErrorMessage(error: unknown): string {
	let message = DEFAULT_ERROR_MESSAGE
	const err = asErrorLike(error)
	const data = err?.response?.data

	const fieldGroups = data?.data ? Object.values(data.data) : undefined
	if (fieldGroups && fieldGroups.length > 0) {
		const fieldErrors = fieldGroups.flat() as PocketBaseFieldError[]
		for (const entry of fieldErrors) {
			if (typeof entry === 'string' && entry.length > 0) {
				message = entry
				break
			}
			if (isRecord(entry) && typeof entry.message === 'string' && entry.message.length > 0) {
				message = entry.message
				break
			}
		}
	}

	if (typeof data?.message === 'string' && data.message.length > 0) {
		message = data.message
	}

	if (typeof err?.message === 'string' && err.message.length > 0) {
		message = err.message
	}

	return message
}

export function isAuthError(error: unknown): boolean {
	const err = asErrorLike(error)
	const status = err?.status ?? err?.response?.status
	return status === 401
}

export function classifyError(error: unknown): ClassifiedError {
	const err = asErrorLike(error)
	const status = err?.status ?? err?.response?.status
	const classification = determineClassification(err, status)
	const { type, code, retryable } = classification

	const userMessageMap: Record<string, string> = {
		validation_error: 'Please correct the highlighted fields.',
		auth_required: 'You need to sign in to continue.',
		forbidden: 'You do not have permission to perform this action.',
		resource_not_found: 'The requested resource was not found.',
		conflict: 'This action conflicts with existing data.',
		rate_limited: 'Too many requests. Please wait and try again.',
		offline: 'You appear to be offline. Check your connection.',
		network_error: 'Network issue. Please retry.',
		server_error: 'A server error occurred. Try again shortly.'
	}

	const userMessage = userMessageMap[code] ?? 'Something went wrong.'
	const devMessage = getErrorMessage(error) || DEFAULT_ERROR_MESSAGE

	return {
		type,
		code,
		status,
		retryable,
		userMessage,
		devMessage,
		cause: error
	}
}

function determineClassification(
	err: ErrorLike | undefined,
	status: number | undefined
): ClassificationDetail {
	if (hasValidationIssues(err)) {
		return CLASSIFICATION_PRESETS.VALIDATION
	}

	const statusClassification = getStatusClassification(status)
	if (statusClassification) {
		return statusClassification
	}

	if (isOffline()) {
		return CLASSIFICATION_PRESETS.OFFLINE
	}

	if (isNetworkError(err)) {
		return CLASSIFICATION_PRESETS.NETWORK
	}

	if (isServerError(status)) {
		return CLASSIFICATION_PRESETS.SERVER
	}

	return CLASSIFICATION_PRESETS.UNKNOWN
}

function hasValidationIssues(err: ErrorLike | undefined): boolean {
	return Boolean(err?.response?.data?.data || err?.name === 'ZodError')
}

function getStatusClassification(status: number | undefined): ClassificationDetail | undefined {
	if (typeof status !== 'number') return undefined
	const presetKey = STATUS_CLASSIFICATIONS[status]
	return presetKey ? CLASSIFICATION_PRESETS[presetKey] : undefined
}

function isServerError(status: number | undefined): boolean {
	return typeof status === 'number' && status >= 500 && status <= 599
}

function isNetworkError(err: ErrorLike | undefined): boolean {
	if (typeof err?.message !== 'string') return false
	return err.message.toLowerCase().includes('network')
}

function isOffline(): boolean {
	const nav = globalThis.navigator === undefined ? undefined : globalThis.navigator
	return Boolean(nav && nav.onLine === false)
}

export function logError(meta: unknown): void {
	try {
		if (!isRecord(meta)) return
		const code = typeof meta.code === 'string' ? meta.code : 'unknown'
		const devMessage = typeof meta.devMessage === 'string' ? meta.devMessage : undefined
		const message = typeof meta.message === 'string' ? meta.message : undefined
		const msg = devMessage || message || 'No message'
		console.error('[ERROR]', code, msg, { meta })
	} catch {
		// noop: logging transport unavailable
	}
}

export function normalizeError(
	error: unknown,
	options: NormalizeOptions = {}
): NormalizedErrorResult {
	const err = asErrorLike(error)
	if (err?.__normalized) {
		return err as NormalizedErrorResult
	}

	const classification = classifyError(error)

	if (error instanceof Error) {
		const enhanced = Object.assign(error, {
			__normalized: true as const,
			...classification,
			context: options.context,
			message: classification.devMessage
		}) as Error & NormalizedBase
		logError(enhanced)
		return enhanced
	}

	const fallback: NormalizedBase & { toString(): string } = {
		__normalized: true,
		...classification,
		context: options.context,
		message: classification.devMessage,
		toString() {
			return `[${classification.code}] ${classification.devMessage}`
		}
	}
	logError(fallback)
	return fallback
}

export function getUserMessage(error: unknown): string {
	const err = asErrorLike(error)
	if (typeof err?.userMessage === 'string' && err.userMessage.length > 0) {
		return err.userMessage
	}
	return classifyError(error).userMessage
}

export function toErrorPayload(error: unknown, options: NormalizeOptions = {}) {
	const n = normalizeError(error, options)
	return {
		code: n.code,
		message: n.userMessage,
		retryable: n.retryable,
		status: n.status
	}
}

export async function notifyError(
	error: unknown,
	options: NotifyOptions = {}
): Promise<NormalizedErrorResult | undefined> {
	if (globalThis.window === undefined) return undefined
	try {
		const mod = await import('svelte-sonner')
		const toastFn = mod.toast
		const normalized = normalizeError(error, { context: options.context })
		logError(normalized)
		const description =
			options.description ?? (options.showDev ? normalized.devMessage : undefined)
		toastFn.error(normalized.userMessage, { description })
		return normalized
	} catch {
		return undefined
	}
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	const { attempts = 3, baseDelay = 250, factor = 2, context, onAttempt } = options
	let lastError: NormalizedErrorResult | undefined
	for (let i = 0; i < attempts; i++) {
		try {
			return await fn()
		} catch (error) {
			const normalized = normalizeError(error, { context })
			lastError = normalized
			if (!normalized.retryable || i === attempts - 1) {
				throw normalized
			}
			onAttempt?.(normalized, i + 1)
			const delay = baseDelay * factor ** i
			await new Promise((resolve) => setTimeout(resolve, delay))
		}
	}
	throw lastError ?? normalizeError(new Error('Retry attempts exhausted'), { context })
}

export async function withErrorToast<T>(
	fn: () => Promise<T>,
	options: ErrorToastOptions = {}
): Promise<T | undefined> {
	try {
		return await fn()
	} catch (error) {
		const normalized = await notifyError(error, { context: options.context })
		options.onError?.(normalized)
		if (options.rethrow && normalized) {
			throw normalized
		}
		return undefined
	}
}
