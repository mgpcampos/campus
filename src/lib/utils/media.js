// Configuration constants
export const ALLOWED_IMAGE_MIME = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/heic',
	'image/heif'
]
export const ALLOWED_VIDEO_MIME = ['video/mp4']
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_VIDEO_SIZE_BYTES = 250 * 1024 * 1024 // 250MB ceiling for 5 minute H.264 uploads
export const MAX_ATTACHMENTS = 10

/** @type {any} */
let sharpModule = null

async function loadSharp() {
	if (typeof window !== 'undefined') {
		throw new Error('optimizeImage is only available server-side')
	}
	if (!sharpModule) {
		const mod = await import('sharp')
		sharpModule = mod.default ?? mod
	}
	return sharpModule
}

/**
 * Validate an array of File (or Blob-like) objects for upload
 * @param {File[]} files
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateImages(files = []) {
	const errors = []
	if (files.length > MAX_ATTACHMENTS) {
		errors.push(`Maximum ${MAX_ATTACHMENTS} attachments allowed`)
	}
	for (const f of files) {
		if (!ALLOWED_IMAGE_MIME.includes(f.type)) {
			errors.push(`${f.name || 'file'} has invalid type ${f.type}`)
		}
		if (f.size > MAX_IMAGE_SIZE_BYTES) {
			errors.push(`${f.name || 'file'} exceeds size limit of 10MB`)
		}
	}
	return { valid: errors.length === 0, errors }
}

/**
 * Validate a single video attachment (<= 5 minutes, MP4 container)
 * @param {File | null | undefined} file
 * @param {number | null | undefined} durationSeconds
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateVideo(file, durationSeconds) {
	const errors = []
	if (!file) {
		errors.push('Video file is required')
		return { valid: false, errors }
	}
	if (!ALLOWED_VIDEO_MIME.includes(file.type)) {
		errors.push('Video must be encoded as H.264 MP4')
	}
	if (file.size > MAX_VIDEO_SIZE_BYTES) {
		errors.push('Video exceeds maximum size of 250MB')
	}
	if (typeof durationSeconds === 'number') {
		if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
			errors.push('Video duration could not be determined')
		} else if (durationSeconds > 300) {
			errors.push('Video duration must be 5 minutes (300s) or less')
		}
	}
	return { valid: errors.length === 0, errors }
}

/**
 * Validate attachments for a feed post given selected media type.
 * @param {{ mediaType: 'text'|'images'|'video'; attachments?: File[]; poster?: File | null; videoDuration?: number | null }} params
 */
export function validatePostMedia(params) {
	const attachments = params.attachments ?? []
	switch (params.mediaType) {
		case 'text':
			if (attachments.length > 0) {
				return { valid: false, errors: ['Text posts cannot include attachments'] }
			}
			return { valid: true, errors: [] }
		case 'images':
			return validateImages(attachments)
		case 'video': {
			const [file] = attachments
			const { valid, errors } = validateVideo(file, params.videoDuration ?? null)
			if (attachments.length !== 1) {
				errors.push('Video posts require exactly one video')
			}
			return { valid: valid && errors.length === 0, errors }
		}
		default:
			return { valid: false, errors: ['Unsupported media type'] }
	}
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
	const sharp = await loadSharp()
	const image = sharp(buffer, { failOn: 'none' })
	const metadata = await image.metadata()

	// Only process raster images we recognize
	if (!metadata.format) {
		return { original: buffer, variants: {}, meta: metadata }
	}

	/** @type {Record<string, Buffer>} */
	const variants = {}
	for (const w of widths) {
		if (metadata.width && metadata.width < w) continue // skip upscaling
		variants[w] = await image.clone().resize({ width: w }).webp({ quality }).toBuffer()
	}

	// Also produce a moderately compressed main version (no resize)
	const originalOptimized = await image.clone().webp({ quality }).toBuffer()

	return { original: originalOptimized, variants, meta: metadata }
}

/**
 * Sanitize filename (server-side safety)
 * @param {string} name
 */
export function sanitizeFilename(name = '') {
	return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}
