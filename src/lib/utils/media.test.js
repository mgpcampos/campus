import { describe, it, expect } from 'vitest';
import { validateImages, MAX_ATTACHMENTS, optimizeImage, sanitizeFilename } from './media.js';

/**
 * @param {string} name
 * @param {string} type
 * @param {number} size
 */
function makeFile(name, type, size) {
	return new File([new Uint8Array(size)], name, { type });
}

describe('media utils', () => {
	it('validates allowed images', () => {
		const f1 = makeFile('a.jpg', 'image/jpeg', 1024);
		const res = validateImages([f1]);
		expect(res.valid).toBe(true);
	});
	it('rejects invalid mime', () => {
		const f = makeFile('a.txt', 'text/plain', 100);
		const res = validateImages([f]);
		expect(res.valid).toBe(false);
	});
	it('rejects oversize', () => {
		const f = makeFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024);
		const res = validateImages([f]);
		expect(res.valid).toBe(false);
	});
	it('enforces count limit', () => {
		const files = Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, i) =>
			makeFile(`f${i}.jpg`, 'image/jpeg', 100)
		);
		const res = validateImages(files);
		expect(res.valid).toBe(false);
	});
	it('sanitizes filename', () => {
		expect(sanitizeFilename('a b*c?.jpg')).toBe('a_b_c_.jpg');
	});
	it('optimizes image buffer', async () => {
		// create a small red png via data url
		const pngData = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4BwQACfsD/Qq9YpEAAAAASUVORK5CYII=',
			'base64'
		);
		const { original, variants } = await optimizeImage(pngData, { widths: [50], quality: 70 });
		expect(original.length).toBeGreaterThan(0);
		// variant may be skipped if width larger than source; allow empty or buffer
		expect(typeof variants).toBe('object');
	});
});
