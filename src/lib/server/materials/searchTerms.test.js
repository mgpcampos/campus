import { describe, it, expect } from 'vitest';
import { aggregateMaterialSearchTerms, extractMaterialKeywords } from './searchTerms.js';

describe('Material Search Terms', () => {
	describe('aggregateMaterialSearchTerms', () => {
		it('should extract keywords from title', () => {
			const material = {
				title: 'Introduction to Machine Learning',
				format: 'document'
			};
			const terms = aggregateMaterialSearchTerms(material);
			expect(terms).toContain('introduction');
			expect(terms).toContain('machine');
			expect(terms).toContain('learning');
			expect(terms).toContain('document');
		});

		it('should include tags and course code', () => {
			const material = {
				title: 'Test',
				courseCode: 'CS101',
				tags: ['algorithms', 'data-structures'],
				format: 'slide'
			};
			const terms = aggregateMaterialSearchTerms(material);
			expect(terms).toContain('cs101');
			expect(terms).toContain('algorithms');
			expect(terms).toContain('data-structures');
		});

		it('should normalize and deduplicate terms', () => {
			const material = {
				title: 'Python Python Programming',
				description: 'Learn Python programming basics',
				format: 'video'
			};
			const terms = aggregateMaterialSearchTerms(material);
			const termArray = terms.split(' ');
			const pythonOccurrences = termArray.filter((t) => t === 'python').length;
			expect(pythonOccurrences).toBe(1);
		});
	});

	describe('extractMaterialKeywords', () => {
		it('should extract limited keywords for indexing', () => {
			const material = {
				title: 'Database Design Fundamentals',
				tags: ['sql', 'nosql', 'relational'],
				courseCode: 'DB201'
			};
			const keywords = extractMaterialKeywords(material);
			expect(keywords).toContain('database');
			expect(keywords).toContain('sql');
			expect(keywords).toContain('db201');
		});

		it('should handle missing fields gracefully', () => {
			const material = {
				title: 'Test'
			};
			const keywords = extractMaterialKeywords(material);
			expect(keywords).toBe('test');
		});
	});
});
