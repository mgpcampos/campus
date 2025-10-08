/**
 * Materials Search Terms Aggregator
 * Generates denormalized search keywords from material metadata
 */

/**
 * Normalizes text for search indexing
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, ' ') // Replace punctuation with spaces
		.replace(/\s+/g, ' '); // Collapse multiple spaces
}

/**
 * Extracts meaningful keywords from text
 * @param {string} text
 * @param {number} minLength - Minimum keyword length
 * @returns {string[]}
 */
function extractKeywords(text, minLength = 3) {
	const normalized = normalizeText(text);
	const words = normalized.split(' ').filter((word) => word.length >= minLength);
	return [...new Set(words)]; // Remove duplicates
}

/**
 * Aggregates search terms from material metadata
 * @param {Object} material - Material record
 * @param {string} material.title
 * @param {string} [material.description]
 * @param {string} [material.courseCode]
 * @param {string[]} [material.tags]
 * @param {string} material.format
 * @returns {string} - Space-separated search terms
 */
export function aggregateMaterialSearchTerms(material) {
	const terms = [];

	// Extract from title (highest priority)
	if (material.title) {
		terms.push(...extractKeywords(material.title, 2));
	}

	// Extract from description
	if (material.description) {
		terms.push(...extractKeywords(material.description, 3));
	}

	// Add course code segments
	if (material.courseCode) {
		terms.push(normalizeText(material.courseCode));
	}

	// Add tags
	if (Array.isArray(material.tags)) {
		material.tags.forEach((tag) => {
			terms.push(normalizeText(tag));
		});
	}

	// Add format as a searchable term
	if (material.format) {
		terms.push(material.format.toLowerCase());
	}

	// Remove duplicates and join
	return [...new Set(terms)].join(' ');
}

/**
 * Updates the keywords field for existing materials (for migration/batch updates)
 * @param {Object} material - Material record
 * @param {string} [material.title]
 * @param {string[]} [material.tags]
 * @param {string} [material.courseCode]
 * @returns {string} - Extracted keywords for manual indexing
 */
export function extractMaterialKeywords(material) {
	const keywords = [];

	if (material.title) {
		keywords.push(...extractKeywords(material.title, 2));
	}

	if (Array.isArray(material.tags)) {
		material.tags.forEach((/** @type {string} */ tag) => {
			keywords.push(normalizeText(tag));
		});
	}

	if (material.courseCode) {
		keywords.push(normalizeText(material.courseCode));
	}

	return [...new Set(keywords)].slice(0, 50).join(' '); // Limit to 50 keywords
}
