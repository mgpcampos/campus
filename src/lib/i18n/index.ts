/**
 * i18n module exports
 * Central export point for all internationalization functionality
 */

export {
	type Locale,
	availableLanguages,
	getCurrentLocale,
	initLocale,
	setLocale,
	t,
	getLanguageName,
	createTranslator,
	normalizeLocale,
	DEFAULT_LOCALE
} from './locale.svelte.js';
