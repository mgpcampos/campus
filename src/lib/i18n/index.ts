/**
 * i18n module exports
 * Central export point for all internationalization functionality
 */

export {
	availableLanguages,
	createTranslator,
	DEFAULT_LOCALE,
	getCurrentLocale,
	getLanguageName,
	initLocale,
	type Locale,
	normalizeLocale,
	setLocale,
	t
} from './locale.svelte.js'
