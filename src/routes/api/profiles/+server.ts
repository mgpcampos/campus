import { json, error } from '@sveltejs/kit';
import { normalizeError, toErrorPayload } from '$lib/utils/errors.js';
import type { ProfileCreateInput } from '$lib/../types/profiles.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		const userId = url.searchParams.get('userId');
		const department = url.searchParams.get('department');
		const role = url.searchParams.get('role');

		// Build filter
		const filters = [];

		if (userId) {
			filters.push(`user = "${userId}"`);
		}

		if (department) {
			filters.push(`department ~ "${department}"`);
		}

		if (role) {
			filters.push(`role = "${role}"`);
		}

		const filterString = filters.length > 0 ? filters.join(' && ') : '';

		const profiles = await locals.pb.collection('profiles').getList(1, 50, {
			filter: filterString,
			expand: 'user',
			sort: '-created'
		});

		return json({
			profiles: profiles.items,
			total: profiles.totalItems,
			page: profiles.page,
			perPage: profiles.perPage
		});
	} catch (err) {
		const n = normalizeError(err, { context: 'api:getProfiles' });
		console.error('Error fetching profiles:', n.toString());
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		const body = await request.json();

		const profileData: ProfileCreateInput = {
			user: body.user,
			displayName: body.displayName,
			department: body.department,
			role: body.role,
			biography: body.biography,
			pronouns: body.pronouns,
			links: body.links
		};

		// Validate required fields
		if (
			!profileData.user ||
			!profileData.displayName ||
			!profileData.department ||
			!profileData.role
		) {
			return error(400, 'Missing required fields: user, displayName, department, role');
		}

		// Validate role
		const validRoles = ['student', 'professor', 'researcher', 'staff'];
		if (!validRoles.includes(profileData.role)) {
			return error(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
		}

		// Only allow creating profile for self or if admin
		if (profileData.user !== locals.user?.id && !locals.user?.is_admin) {
			return error(403, 'You can only create profiles for yourself');
		}

		// Check if profile already exists for this user
		try {
			const existing = await locals.pb
				.collection('profiles')
				.getFirstListItem(`user = "${profileData.user}"`);

			if (existing) {
				return error(409, 'Profile already exists for this user');
			}
		} catch (err: any) {
			// 404 is expected if no profile exists
			if (err?.status !== 404) {
				throw err;
			}
		}

		// Create profile
		const profile = await locals.pb.collection('profiles').create({
			user: profileData.user,
			displayName: profileData.displayName,
			department: profileData.department,
			role: profileData.role,
			biography: profileData.biography || '',
			pronouns: profileData.pronouns || '',
			links: profileData.links || []
		});

		return json(
			{
				profile,
				message: 'Profile created successfully'
			},
			{ status: 201 }
		);
	} catch (err) {
		const n = normalizeError(err, { context: 'api:createProfile' });
		console.error('Error creating profile:', n.toString());
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 });
	}
}
