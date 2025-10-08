import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		const { profileId } = params;

		// Fetch profile with user and publications
		const profile = await locals.pb.collection('profiles').getOne(profileId, {
			expand: 'user'
		});

		// Fetch publications
		const publicationLinks = await locals.pb.collection('profile_publications').getFullList({
			filter: `profile = "${profileId}"`,
			expand: 'publication,publication.material',
			sort: '-publication.year,-created'
		});

		const publications = publicationLinks.map((link: any) => ({
			...link.expand?.publication,
			contributionRole: link.contributionRole,
			linkId: link.id
		}));

		return {
			profile,
			publications
		};
	} catch (err: any) {
		if (err?.status === 404) {
			return error(404, 'Profile not found');
		}
		throw error(500, 'Error loading profile');
	}
}
