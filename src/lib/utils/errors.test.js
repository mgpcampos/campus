import { describe, expect, it, vi } from 'vitest'
import {
	classifyError,
	getErrorMessage,
	getUserMessage,
	isAuthError,
	normalizeError,
	notifyError,
	withRetry
} from './errors.ts'

vi.mock('svelte-sonner', () => {
	return {
		toast: {
			error: vi.fn()
		}
	}
})

describe('getErrorMessage', () => {
	it('should extract field validation errors', () => {
		const error = {
			response: {
				data: {
					data: {
						email: [{ message: 'Invalid email format' }]
					}
				}
			}
		}

		expect(getErrorMessage(error)).toBe('Invalid email format')
	})

	it('should extract general error messages', () => {
		const error = {
			response: {
				data: {
					message: 'Authentication failed'
				}
			}
		}

		expect(getErrorMessage(error)).toBe('Authentication failed')
	})

	it('should handle simple error messages', () => {
		const error = {
			message: 'Network error'
		}

		expect(getErrorMessage(error)).toBe('Network error')
	})

	it('should return fallback message for unknown errors', () => {
		const error = {}
		expect(getErrorMessage(error)).toBe('An unexpected error occurred')
	})

	it('should handle null/undefined errors', () => {
		expect(getErrorMessage(null)).toBe('An unexpected error occurred')
		expect(getErrorMessage(undefined)).toBe('An unexpected error occurred')
	})
})

describe('classifyError & normalizeError', () => {
	it('classifies validation errors', () => {
		const err = {
			response: {
				data: {
					data: { field: [{ message: 'Required' }] }
				}
			}
		}
		const c = classifyError(err)
		expect(c.type).toBe('VALIDATION')
		expect(c.code).toBe('validation_error')
		expect(c.retryable).toBe(false)
	})

	it('classifies auth errors', () => {
		const err = { status: 401, message: 'not authorized' }
		const c = classifyError(err)
		expect(c.type).toBe('AUTH')
		expect(c.code).toBe('auth_required')
	})

	it('classifies network errors by message', () => {
		const err = { message: 'Network failure' }
		const c = classifyError(err)
		expect(['NETWORK', 'OFFLINE']).toContain(c.type)
		expect(['network_error', 'offline']).toContain(c.code)
		expect(c.retryable).toBe(true)
	})

	it('classifies server errors', () => {
		const err = { status: 503, message: 'Service Unavailable' }
		const c = classifyError(err)
		expect(c.type).toBe('SERVER')
		expect(c.code).toBe('server_error')
		expect(c.retryable).toBe(true)
	})

	it('normalizes and memoizes', () => {
		const err = { status: 404, message: 'Not found' }
		const n1 = normalizeError(err, { context: 'fetchPost' })
		const n2 = normalizeError(n1)
		expect(n1).toBe(n2)
		expect(n1.code).toBe('resource_not_found')
		expect(n1.context).toBe('fetchPost')
	})

	it('getUserMessage prefers normalized userMessage', () => {
		const raw = { status: 403, message: 'Forbidden internal detail' }
		const norm = normalizeError(raw)
		expect(getUserMessage(norm)).toBe(norm.userMessage)
	})

	it('classifies OFFLINE when navigator.onLine is false', () => {
		const original = Object.getOwnPropertyDescriptor(global.navigator, 'onLine')
		Object.defineProperty(global.navigator, 'onLine', { configurable: true, value: false })
		try {
			const c = classifyError({ message: 'Some generic error' })
			expect(c.type).toBe('OFFLINE')
			expect(c.code).toBe('offline')
			expect(c.retryable).toBe(true)
		} finally {
			// restore (best effort)
			if (original) {
				Object.defineProperty(global.navigator, 'onLine', original)
			} else {
				Object.defineProperty(global.navigator, 'onLine', { configurable: true, value: true })
			}
		}
	})
})

describe('withRetry', () => {
	it('retries retryable errors and eventually succeeds', async () => {
		vi.useFakeTimers()
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('Network failure 1'))
			.mockRejectedValueOnce(new Error('Network failure 2'))
			.mockResolvedValue('ok')

		const promise = withRetry(() => fn(), { attempts: 3, baseDelay: 5 })

		// Execute all queued timers (backoff delays)
		await vi.runAllTimersAsync()
		const result = await promise

		expect(result).toBe('ok')
		expect(fn).toHaveBeenCalledTimes(3)
		vi.useRealTimers()
	})

	it('stops retrying for non-retryable error', async () => {
		const nonRetryErr = { status: 400, message: 'Bad request' } // classification retryable = false
		const fn = vi.fn().mockRejectedValue(nonRetryErr)

		await expect(withRetry(() => fn(), { attempts: 5 })).rejects.toMatchObject({
			status: 400,
			code: 'unknown_error' // 400 not mapped => UNKNOWN
		})

		expect(fn).toHaveBeenCalledTimes(1)
	})

	it('throws normalized error preserving prototype', async () => {
		class CustomErr extends Error {
			constructor() {
				super('Network issue')
				this.name = 'CustomErr'
			}
		}
		const fn = vi.fn().mockRejectedValue(new CustomErr())
		await expect(withRetry(() => fn(), { attempts: 1 })).rejects.toBeInstanceOf(Error)
	})
})

describe('notifyError', () => {
	it('invokes toast with userMessage and logs', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
			// Swallow console noise during test assertions
		})
		const { toast } = await import('svelte-sonner')
		const err = new Error('Network issue while fetching')
		await notifyError(err, { context: 'fetch.test', showDev: true })
		expect(toast.error).toHaveBeenCalledTimes(1)
		const errorMock = /** @type {any} */ (toast.error)
		const callArgs = errorMock.mock.calls[0]
		expect(callArgs[0]).toMatch(/Network issue|Network/)
		expect(consoleSpy).toHaveBeenCalled()
		consoleSpy.mockRestore()
	})
})

describe('isAuthError', () => {
	it('should identify 401 status as auth error', () => {
		const error = { status: 401 }
		expect(isAuthError(error)).toBe(true)
	})

	it('should identify 401 response status as auth error', () => {
		const error = { response: { status: 401 } }
		expect(isAuthError(error)).toBe(true)
	})

	it('should not identify other status codes as auth errors', () => {
		const error400 = { status: 400 }
		const error500 = { status: 500 }

		expect(isAuthError(error400)).toBe(false)
		expect(isAuthError(error500)).toBe(false)
	})

	it('should handle errors without status', () => {
		const error = { message: 'Some error' }
		expect(isAuthError(error)).toBe(false)
	})
})
