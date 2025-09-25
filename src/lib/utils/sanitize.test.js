import { describe, it, expect } from 'vitest';
import { sanitizeContent, sanitizePlainText } from './sanitize.js';

describe('sanitizeContent', () => {
	it('removes script tags', () => {
		const dirty = '<p>Hello<script>alert(1)</script>World</p>';
		expect(sanitizeContent(dirty)).toBe('<p>HelloWorld</p>');
	});
	it('keeps allowed formatting', () => {
		const dirty = '<strong>Bold</strong> <em>Italic</em> <u>Under</u>';
		expect(sanitizeContent(dirty)).toBe('<strong>Bold</strong> <em>Italic</em> <u>Under</u>');
	});
	it('strips disallowed attributes', () => {
		const dirty = '<p onclick="evil()">Test</p>';
		expect(sanitizeContent(dirty)).toBe('<p>Test</p>');
	});
});

describe('sanitizePlainText', () => {
	it('escapes html tags by removing them', () => {
		expect(sanitizePlainText('<b>Text</b>')).toBe('Text');
	});
});
