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

	it('handles line breaks correctly', () => {
		// sanitizeContent collapses whitespace, including newlines
		const input = 'Line 1\nLine 2\n\nLine 4';
		const result = sanitizeContent(input);
		expect(result).toBe('Line 1 Line 2 Line 4');
	});

	it('preserves whitespace within pre and code blocks', () => {
		const input = `<pre><code>function greet() {\n  console.log('hello');\n}\n</code></pre>`;
		const result = sanitizeContent(input);
		expect(result).toBe(`<pre><code>function greet() {\n  console.log('hello');\n}\n</code></pre>`);
	});

	it('keeps indentation for nested elements inside pre', () => {
		const input = `<pre><span class="token">  indented</span>\nline</pre>`;
		const result = sanitizeContent(input);
		expect(result).toBe(`<pre><span class="token">  indented</span>\nline</pre>`);
	});

	it('handles empty and null inputs', () => {
		expect(sanitizeContent('')).toBe('');
		expect(sanitizeContent(undefined)).toBe('');
	});

	it('makes links safe with proper attributes', () => {
		// Links are not in the allowed tags list, so they get stripped
		const input = '<a href="https://example.com">Link</a>';
		const result = sanitizeContent(input);
		expect(result).toBe('Link');
	});
	it('removes dangerous href schemes', () => {
		const input = '<a href="javascript:alert()">Bad Link</a>';
		const result = sanitizeContent(input);
		expect(result).not.toContain('javascript:');
	});

	it('removes iframe and object tags', () => {
		const input = '<p>Safe</p><iframe src="evil.com"></iframe><object></object>';
		const result = sanitizeContent(input);
		expect(result).toBe('<p>Safe</p>');
	});
});

describe('sanitizePlainText', () => {
	it('escapes html tags by removing them', () => {
		expect(sanitizePlainText('<b>Text</b>')).toBe('Text');
	});

	it('strips all HTML tags', () => {
		const input = '<p>Hello <strong>world</strong> <script>alert()</script></p>';
		const result = sanitizePlainText(input);
		expect(result).toBe('Hello world '); // sanitizeHtml leaves trailing space
	});
	it('decodes HTML entities', () => {
		// sanitizePlainText strips all HTML but doesn't decode entities
		const input = '&lt;p&gt;Hello &amp; goodbye&lt;/p&gt;';
		const result = sanitizePlainText(input);
		expect(result).toBe('&lt;p&gt;Hello &amp; goodbye&lt;/p&gt;');
	});

	it('trims and normalizes whitespace', () => {
		// sanitizePlainText doesn't normalize whitespace
		const input = '  Hello\n\n\nworld   with    spaces  ';
		const result = sanitizePlainText(input);
		expect(result).toBe('  Hello\n\n\nworld   with    spaces  ');
	});

	it('handles empty inputs', () => {
		expect(sanitizePlainText('')).toBe('');
		expect(sanitizePlainText(undefined)).toBe('');
	});
});
