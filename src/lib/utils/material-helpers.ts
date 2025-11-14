import type { MaterialFormat } from '$lib/types/materials'

/**
 * Auto-detect material format from file MIME type
 * @param file - The file to detect format from
 * @returns The detected format or 'document' as default
 */
export function detectFormatFromFile(file: File | Blob): MaterialFormat {
	const mimeType = file.type

	// Auto-detect format based on MIME type
	if (mimeType.startsWith('video/')) {
		return 'video'
	} else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
		return 'slide'
	} else if (mimeType.includes('csv') || mimeType.includes('dataset')) {
		return 'dataset'
	} else {
		return 'document' // Default for all other files
	}
}

/**
 * Determine material format from provided data
 * @param options - Object containing file, linkUrl, and optional format
 * @returns The determined format
 */
export function determineFormat(options: {
	file?: File | Blob | null
	linkUrl?: string | null
	format?: MaterialFormat | null
}): MaterialFormat {
	const { file, linkUrl, format } = options

	// Use provided format if valid
	if (format) {
		return format
	}

	// Auto-detect from file
	if (file && file instanceof File && file.size > 0) {
		return detectFormatFromFile(file)
	}

	// If link URL provided, format is 'link'
	if (linkUrl) {
		return 'link'
	}

	// Default fallback
	return 'document'
}
