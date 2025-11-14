export type PocketBaseErrorLike = {
	status?: number
}

/**
 * Extract a numeric status code from a PocketBase error-like object.
 */
export function getPocketBaseStatus(error: unknown): number | undefined {
	if (typeof error !== 'object' || error === null) {
		return undefined
	}

	if ('status' in error) {
		const status = (error as PocketBaseErrorLike).status
		return typeof status === 'number' ? status : undefined
	}

	return undefined
}
