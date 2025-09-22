import { describe, it, expect } from 'vitest';
import { getErrorMessage, isAuthError } from './errors.js';

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
		};

		expect(getErrorMessage(error)).toBe('Invalid email format');
	});

	it('should extract general error messages', () => {
		const error = {
			response: {
				data: {
					message: 'Authentication failed'
				}
			}
		};

		expect(getErrorMessage(error)).toBe('Authentication failed');
	});

	it('should handle simple error messages', () => {
		const error = {
			message: 'Network error'
		};

		expect(getErrorMessage(error)).toBe('Network error');
	});

	it('should return fallback message for unknown errors', () => {
		const error = {};
		expect(getErrorMessage(error)).toBe('An unexpected error occurred');
	});

	it('should handle null/undefined errors', () => {
		expect(getErrorMessage(null)).toBe('An unexpected error occurred');
		expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
	});
});

describe('isAuthError', () => {
	it('should identify 401 status as auth error', () => {
		const error = { status: 401 };
		expect(isAuthError(error)).toBe(true);
	});

	it('should identify 401 response status as auth error', () => {
		const error = { response: { status: 401 } };
		expect(isAuthError(error)).toBe(true);
	});

	it('should not identify other status codes as auth errors', () => {
		const error400 = { status: 400 };
		const error500 = { status: 500 };
		
		expect(isAuthError(error400)).toBe(false);
		expect(isAuthError(error500)).toBe(false);
	});

	it('should handle errors without status', () => {
		const error = { message: 'Some error' };
		expect(isAuthError(error)).toBe(false);
	});
});