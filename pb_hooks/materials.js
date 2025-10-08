/// <reference path="../pb_data/types.d.ts" />

/**
 * Materials Collection Hooks
 * Automatically updates search terms on material create/update
 */

// Helper to normalize text for search
function normalizeText(text) {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, ' ')
		.replace(/\s+/g, ' ');
}

// Extract keywords from text
function extractKeywords(text, minLength = 3) {
	const normalized = normalizeText(text);
	const words = normalized.split(' ').filter((word) => word.length >= minLength);
	return Array.from(new Set(words));
}

// Aggregate search terms from material metadata
function aggregateSearchTerms(material) {
	const terms = [];

	if (material.title) {
		terms.push(...extractKeywords(material.title, 2));
	}

	if (material.description) {
		terms.push(...extractKeywords(material.description, 3));
	}

	if (material.courseCode) {
		terms.push(normalizeText(material.courseCode));
	}

	if (Array.isArray(material.tags)) {
		material.tags.forEach((tag) => {
			terms.push(normalizeText(tag));
		});
	}

	if (material.format) {
		terms.push(material.format.toLowerCase());
	}

	return Array.from(new Set(terms)).join(' ');
}

// Extract keywords for the keywords field
function extractKeywordField(material) {
	const keywords = [];

	if (material.title) {
		keywords.push(...extractKeywords(material.title, 2));
	}

	if (Array.isArray(material.tags)) {
		material.tags.forEach((tag) => {
			keywords.push(normalizeText(tag));
		});
	}

	if (material.courseCode) {
		keywords.push(normalizeText(material.courseCode));
	}

	return Array.from(new Set(keywords)).slice(0, 50).join(' ');
}

// Hook: Update search terms before creating a material
onRecordCreate((e) => {
	if (e.record.collection().name !== 'materials') return;

	const material = e.record;

	// Generate search terms
	material.set('searchTerms', aggregateSearchTerms(material));
	material.set('keywords', extractKeywordField(material));
}, 'materials');

// Hook: Update search terms before updating a material
onRecordUpdate((e) => {
	if (e.record.collection().name !== 'materials') return;

	const material = e.record;

	// Regenerate search terms
	material.set('searchTerms', aggregateSearchTerms(material));
	material.set('keywords', extractKeywordField(material));
}, 'materials');

// Cron job: Refresh search terms nightly for all materials
// Runs at 2:00 AM daily
cronAdd('materials-search-refresh', '0 2 * * *', () => {
	const materials = $app.findRecordsByFilter('materials', '', '-created', 500);

	materials.forEach((material) => {
		try {
			material.set('searchTerms', aggregateSearchTerms(material));
			material.set('keywords', extractKeywordField(material));
			$app.save(material);
		} catch (err) {
			console.error(`Failed to update search terms for material ${material.id}:`, err);
		}
	});

	console.log(`Updated search terms for ${materials.length} materials`);
});
