/**
 * i18n localization system using Svelte 5 runes
 * Provides reactive locale state and translation functions
 */

import { browser } from '$app/environment';

import enUS from './translations/en-US.json';
import ptBR from './translations/pt-BR.json';

type TranslationSchema = typeof ptBR;

type LocaleDefinition = {
	code: string;
	name: string;
	translations: TranslationSchema;
};

const LOCALE_REGISTRY = [
	{
		code: 'pt-BR',
		name: 'Português (Brasil)',
		translations: ptBR as TranslationSchema
	},
	{
		code: 'en-US',
		name: 'English (United States)',
		translations: enUS as TranslationSchema
	}
] as const satisfies ReadonlyArray<LocaleDefinition>;

export type Locale = (typeof LOCALE_REGISTRY)[number]['code'];

const TRANSLATION_MAP = Object.fromEntries(
	LOCALE_REGISTRY.map(({ code, translations }) => [code, translations])
) as Record<Locale, TranslationSchema>;

export const availableLanguages: Array<{ code: Locale; name: string }> = LOCALE_REGISTRY.map(
	({ code, name }) => ({
		code: code as Locale,
		name
	})
);

const localeSet = new Set<Locale>(availableLanguages.map((lang) => lang.code));

const STORAGE_KEY = 'campus.locale';
export const DEFAULT_LOCALE: Locale = 'pt-BR';

// Reactive locale state using Svelte 5 runes
let currentLocale = $state<Locale>(DEFAULT_LOCALE);

function applyDocumentLanguage(locale: Locale) {
	if (!browser) return;
	document.documentElement.lang = locale;
}

export function normalizeLocale(locale: string | null | undefined): Locale {
	if (!locale) return DEFAULT_LOCALE;

	const lower = locale.toLowerCase();

	const directMatch = availableLanguages.find((lang) => lang.code.toLowerCase() === lower);
	if (directMatch) {
		return directMatch.code;
	}

	if (lower === 'en') return 'en-US';
	if (lower === 'pt' || lower.startsWith('pt-br')) return 'pt-BR';

	const fallbackMatch = availableLanguages.find((lang) => {
		const [language] = lang.code.split('-');
		const lowerLanguage = language.toLowerCase();
		return lower === lowerLanguage || lower.startsWith(`${lowerLanguage}-`);
	});

	if (fallbackMatch) {
		return fallbackMatch.code;
	}

	return DEFAULT_LOCALE;
}

/**
 * Get the current locale
 */
export function getCurrentLocale(): Locale {
	return currentLocale;
}

/**
 * Initialize locale from storage or user preference
 */
export function initLocale(): Locale {
	if (!browser) return DEFAULT_LOCALE;

	const storedValue = localStorage.getItem(STORAGE_KEY);
	if (storedValue && storedValue !== DEFAULT_LOCALE) {
		const normalizedStored = normalizeLocale(storedValue);
		currentLocale = normalizedStored;
		if (normalizedStored !== storedValue) {
			localStorage.setItem(STORAGE_KEY, normalizedStored);
		}
		applyDocumentLanguage(normalizedStored);
		return normalizedStored;
	}

	// Always use Brazilian Portuguese as default for new users or if default was stored
	currentLocale = DEFAULT_LOCALE;
	localStorage.setItem(STORAGE_KEY, DEFAULT_LOCALE);
	applyDocumentLanguage(DEFAULT_LOCALE);
	return DEFAULT_LOCALE;
}

/**
 * Check if a locale is valid
 */
export function setLocale(locale: Locale | string): void {
	const normalized = normalizeLocale(locale);
	if (typeof locale === 'string' && !localeSet.has(locale as Locale) && normalized !== locale) {
		console.warn(`Invalid locale: ${locale}. Falling back to ${normalized}`);
	}

	currentLocale = normalized;

	if (browser) {
		localStorage.setItem(STORAGE_KEY, normalized);
		applyDocumentLanguage(normalized);
	}
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
	const keys = path.split('.');
	let result = obj;

	for (const key of keys) {
		if (result && typeof result === 'object' && key in result) {
			result = result[key];
		} else {
			return undefined;
		}
	}

	return result;
}

/**
 * Replace variables in translation strings
 * Example: "Hello {{name}}" with { name: "John" } => "Hello John"
 */
function interpolate(text: string, variables?: Record<string, string | number>): string {
	if (!variables) return text;

	return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		return variables[key]?.toString() ?? match;
	});
}

/**
 * Translate a key to the current locale
 * Supports dot notation for nested keys (e.g., "header.signIn")
 * Supports variable interpolation (e.g., { name: "John" })
 */
export function t(key: string, variables?: Record<string, string | number>): string {
	const locale = currentLocale;
	const translation = TRANSLATION_MAP[locale] ?? TRANSLATION_MAP[DEFAULT_LOCALE];

	let value = getNestedValue(translation, key);
	if (value === undefined && locale !== DEFAULT_LOCALE) {
		value = getNestedValue(TRANSLATION_MAP[DEFAULT_LOCALE], key);
	}

	if (value === undefined) {
		console.warn(`Translation key not found: ${key} for locale: ${locale}`);
		return key;
	}

	if (typeof value !== 'string') {
		console.warn(`Translation value is not a string for key: ${key}`);
		return key;
	}

	return interpolate(value, variables);
}

/**
 * Get the translated language name for a locale code
 */
export function getLanguageName(locale: Locale): string {
	const translation = TRANSLATION_MAP[currentLocale] ?? TRANSLATION_MAP[DEFAULT_LOCALE];
	const value = getNestedValue(translation, `languages.${locale}`);
	if (typeof value === 'string') {
		return value;
	}
	const fallback = getNestedValue(TRANSLATION_MAP[DEFAULT_LOCALE], `languages.${locale}`);
	if (typeof fallback === 'string') {
		return fallback;
	}
	const configured = availableLanguages.find((lang) => lang.code === locale);
	return configured?.name ?? locale;
}

/**
 * Create a reactive translation function that updates when locale changes
 * This returns a derived value that will automatically update components
 */
export function createTranslator() {
	return {
		get t() {
			// Access currentLocale to make this reactive
			const _ = currentLocale;
			return t;
		},
		get locale() {
			return currentLocale;
		}
	};
}
