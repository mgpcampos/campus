import sanitizeHtml from 'sanitize-html'

// Define a conservative allowlist: basic formatting only
const allowedTags = [
	'b',
	'i',
	'em',
	'strong',
	'u',
	's',
	'p',
	'br',
	'ul',
	'ol',
	'li',
	'blockquote',
	'code',
	'pre',
	'span'
]

const allowedAttributes = {
	span: ['class']
}

const whitespaceSensitiveTags = new Set(['pre', 'code'])

/**
 * @typedef {import('sanitize-html').IOptions & {
 *  onOpenTag?: (tagName: string, attribs: Record<string, string>) => void;
 *  onCloseTag?: (tagName: string) => void;
 * }} SanitizeOptions
 */

/**
 * Sanitize user-provided rich text or plain text content.
 * Strips disallowed tags & attributes and normalizes whitespace.
 * @param {string} input
 * @returns {string}
 */
export function sanitizeContent(input = '') {
	if (typeof input !== 'string') return ''
	const trimmed = input.trim()
	if (!trimmed) return ''
	let preserveWhitespaceDepth = 0

	/** @param {string} tagName */
	const handleOpenTag = (tagName) => {
		if (whitespaceSensitiveTags.has(tagName)) {
			preserveWhitespaceDepth += 1
		}
	}

	/** @param {string} tagName */
	const handleCloseTag = (tagName) => {
		if (whitespaceSensitiveTags.has(tagName) && preserveWhitespaceDepth > 0) {
			preserveWhitespaceDepth -= 1
		}
	}

	/**
	 * @param {string} text
	 * @param {string} [tagName]
	 */
	const normalizeText = (text, tagName) => {
		if (preserveWhitespaceDepth > 0 || (tagName && whitespaceSensitiveTags.has(tagName))) {
			return text
		}
		return text.replaceAll(/\s+/g, ' ')
	}

	/** @type {SanitizeOptions} */
	const options = {
		allowedTags,
		allowedAttributes,
		disallowedTagsMode: 'discard',
		onOpenTag: handleOpenTag,
		onCloseTag: handleCloseTag,
		textFilter: normalizeText
	}

	const cleaned = sanitizeHtml(trimmed, options)
	return cleaned
}

/**
 * Sanitizes plain text (no HTML allowed) - escapes angle brackets.
 * @param {string} input
 */
export function sanitizePlainText(input = '') {
	return sanitizeHtml(input || '', { allowedTags: [], allowedAttributes: {} })
}
