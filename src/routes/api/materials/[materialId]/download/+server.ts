import { error } from '@sveltejs/kit'
import { normalizeError } from '$lib/utils/errors.ts'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	const { materialId } = params

	try {
		// Fetch material to get file info
		const material = await locals.pb.collection('materials').getOne(materialId)

		// Check if material has a file
		if (!material.file && !material.linkUrl) {
			return error(404, 'Material has no downloadable file')
		}

		// Log download access
		try {
			await locals.pb.collection('material_access_logs').create({
				material: materialId,
				user: locals.user?.id,
				action: 'download'
			})

			await locals.pb.collection('analytics_events').create({
				eventType: 'material_download',
				userId: locals.user?.id,
				sessionId: locals.sessionId || 'unknown',
				metadata: {
					materialId,
					format: material.format,
					visibility: material.visibility,
					hasFile: !!material.file
				}
			})
		} catch (loggingError) {
			console.error('Failed to log material download:', loggingError)
		}

		// For links, redirect to the external URL
		if (material.linkUrl) {
			// Redirect to external link
			return new Response(null, {
				status: 302,
				headers: {
					Location: material.linkUrl
				}
			})
		}

		// For files, proxy the download from PocketBase storage
		if (material.file) {
			const fileUrl = locals.pb.files.getUrl(material, material.file)
			const fileResponse = await fetch(fileUrl)

			if (!fileResponse.ok) {
				return error(500, 'Failed to retrieve file')
			}

			const blob = await fileResponse.blob()
			const headers = new Headers()
			headers.set(
				'Content-Type',
				fileResponse.headers.get('Content-Type') || 'application/octet-stream'
			)
			headers.set('Content-Disposition', `attachment; filename="${material.title}"`)

			return new Response(blob, {
				status: 200,
				headers
			})
		}

		return error(404, 'No downloadable content found')
	} catch (err) {
		const normalized = normalizeError(err, { context: 'download material' })
		console.error('Error downloading material:', normalized)
		return error(normalized.status || 500, normalized.userMessage || 'Failed to download material')
	}
}
