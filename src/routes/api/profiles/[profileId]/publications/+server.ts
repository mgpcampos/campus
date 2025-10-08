import { json, error } from '@sveltejs/kit';
import { normalizeError, toErrorPayload } from '$lib/utils/errors.js';
import { addPublicationToProfile } from '$lib/server/profiles/publications.js';
import type { PublicationCreateInput } from '$lib/../types/profiles.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, request, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		const { profileId } = params;

		// Verify profile exists and check permissions
		const profile = await locals.pb.collection('profiles').getOne(profileId);

		// Check permissions: owner or admin
		if (profile.user !== locals.user?.id && !locals.user?.is_admin) {
			return error(403, 'You do not have permission to add publications to this profile');
		}

		const body = await request.json();

		const publicationData: PublicationCreateInput = {
			title: body.title,
			doi: body.doi,
			year: body.year,
			venue: body.venue,
			abstract: body.abstract,
			authors: body.authors,
			materialId: body.materialId
		};

		// Validate required fields
		if (!publicationData.title) {
			return error(400, 'Missing required field: title');
		}

		// Validate year if provided
		if (publicationData.year !== undefined) {
			if (publicationData.year < 1900 || publicationData.year > 2100) {
				return error(400, 'Year must be between 1900 and 2100');
			}
		}

		// Add publication to profile (with deduplication)
		const result = await addPublicationToProfile(locals.pb, profileId, {
			...publicationData,
			contributionRole: body.contributionRole || 'author'
		});

		return json(
			{
				publication: result.publication,
				link: result.link,
				wasNewPublication: result.wasNewPublication,
				message: result.wasNewPublication
					? 'Publication created and linked successfully'
					: 'Existing publication linked successfully'
			},
			{ status: 201 }
		);
	} catch (err: any) {
		if (err?.status === 404) {
			return error(404, 'Profile not found');
		}

		const n = normalizeError(err, { context: 'api:addPublication' });
		console.error('Error adding publication:', n.toString());
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		const { profileId } = params;

		// Verify profile exists
		await locals.pb.collection('profiles').getOne(profileId);

		// Get all publications for this profile
		const links = await locals.pb.collection('profile_publications').getFullList({
			filter: `profile = "${profileId}"`,
			expand: 'publication,publication.material',
			sort: '-publication.year,-created'
		});

		const publications = links.map((link: any) => ({
			...link.expand?.publication,
			contributionRole: link.contributionRole,
			linkId: link.id,
			linkCreated: link.created
		}));

		return json({
			publications,
			total: publications.length
		});
	} catch (err: any) {
		if (err?.status === 404) {
			return error(404, 'Profile not found');
		}

		const n = normalizeError(err, { context: 'api:getPublications' });
		console.error('Error fetching publications:', n.toString());
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 });
	}
}
