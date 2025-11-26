/**
 * Validation error translation helper
 * Maps English validation messages to translation keys
 */

import { t } from '$lib/i18n'

// Map of English error messages to translation keys
const ERROR_MESSAGE_MAP: Record<string, string> = {
	'Please enter a valid email address': 'validation.emailInvalid',
	'Password must be at least 8 characters long': 'validation.passwordMinLength',
	'Password is required': 'validation.passwordRequired',
	"Passwords don't match": 'validation.passwordMismatch',
	'Username must be at least 3 characters long': 'validation.usernameMinLength',
	'Username must be no more than 30 characters long': 'validation.usernameMaxLength',
	'Username can only contain letters, numbers, and underscores':
		'validation.usernameInvalidChars',
	'Name is required': 'validation.nameRequired',
	'Name must be no more than 100 characters': 'validation.nameMaxLength',
	'Bio must be no more than 500 characters': 'validation.bioMaxLength',
	'Title is required': 'validation.titleRequired',
	'This field is required': 'validation.required',
	'Invalid email': 'validation.email',
	'Enter a valid email': 'validation.email'
}

/**
 * Translate a validation error message
 * @param message - The English error message
 * @returns The translated error message
 */
export function translateValidationError(message: string): string {
	const translationKey = ERROR_MESSAGE_MAP[message]
	if (translationKey) {
		return t(translationKey)
	}
	// Return the original message if no translation is found
	return message
}

/**
 * Translate all validation errors in an object
 * @param errors - Object with field names as keys and error messages as values
 * @returns Object with the same structure but translated messages
 */
export function translateValidationErrors<T extends Record<string, string | string[] | undefined>>(
	errors: T
): T {
	const translated = {} as T
	for (const [key, value] of Object.entries(errors)) {
		if (Array.isArray(value)) {
			translated[key as keyof T] = value.map(translateValidationError) as T[keyof T]
		} else if (typeof value === 'string') {
			translated[key as keyof T] = translateValidationError(value) as T[keyof T]
		} else {
			translated[key as keyof T] = value as T[keyof T]
		}
	}
	return translated
}
