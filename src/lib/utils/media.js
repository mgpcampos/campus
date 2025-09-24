import sharp from 'sharp';

// Configuration constants
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_ATTACHMENTS = 4;

/**
 * Validate an array of File (or Blob-like) objects for upload
 * @param {File[]} files
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateImages(files = []) {
	const errors = [];
	if (files.length > MAX_ATTACHMENTS) {
		errors.push(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
	}
	for (const f of files) {
		if (!ALLOWED_IMAGE_MIME.includes(f.type)) {
			errors.push(`${f.name || 'file'} has invalid type ${f.type}`);
		}
		if (f.size > MAX_IMAGE_SIZE_BYTES) {
			errors.push(`${f.name || 'file'} exceeds size limit of 10MB`);
		}
	}
	return { valid: errors.length === 0, errors };
}

/**
 * Optimize an image Buffer using sharp - outputs WebP by default
 * Creates multiple responsive sizes for potential future use.
 * @param {Buffer} buffer
 * @param {Object} options
 * @param {number[]} [options.widths] widths to generate
 * @param {number} [options.quality] quality (0-100)
 * @returns {Promise<{original: Buffer, variants: Record<string, Buffer>, meta: any}>}
 */
export async function optimizeImage(buffer, { widths = [320, 640, 960], quality = 80 } = {}) {
	const image = sharp(buffer, { failOn: 'none' });
	const metadata = await image.metadata();

	// Only process raster images we recognize
	if (!metadata.format) {
		return { original: buffer, variants: {}, meta: metadata };
	}

	/** @type {Record<string, Buffer>} */
	const variants = {};
	for (const w of widths) {
		if (metadata.width && metadata.width < w) continue; // skip upscaling
		variants[w] = await image.clone().resize({ width: w }).webp({ quality }).toBuffer();
	}

	// Also produce a moderately compressed main version (no resize)
	const originalOptimized = await image.clone().webp({ quality }).toBuffer();

	return { original: originalOptimized, variants, meta: metadata };
}

/**
 * Sanitize filename (server-side safety)
 * @param {string} name
 */
export function sanitizeFilename(name = '') {
	return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
