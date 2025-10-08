import { json, error } from '@sveltejs/kit';
import { normalizeError, toErrorPayload } from '$lib/utils/errors.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	const { materialId } = params;

	try {
		// Fetch material with uploader details
		const material = await locals.pb
			.collection('materials')
			.getOne(materialId, { expand: 'uploader' });

		// Log material view to analytics
		try {
			await locals.pb.collection('material_access_logs').create({
				material: materialId,
				user: locals.pb.authStore.record?.id,
				action: 'view'
			});

			await locals.pb.collection('analytics_events').create({
				type: 'event',
				name: 'material_view',
				sessionId: locals.sessionId || 'unknown',
				user: locals.pb.authStore.record?.id,
				metadata: {
					materialId,
					format: material.format,
					visibility: material.visibility
				}
			});
		} catch (loggingError) {
			// Log but don't fail the request
			console.error('Failed to log material view:', loggingError);
		}

		return json(material);
	} catch (err) {
		const n = normalizeError(err, { context: 'api:getMaterial' });
		console.error('Error fetching material:', n.toString());
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 });
	}
}
