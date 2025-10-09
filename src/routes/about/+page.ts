import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => ({
	meta: {
		title: 'About Campus',
		description:
			'Learn about Campus, our mission, and the team building a collaborative academic network.',
		ogImage: '/og-default.png'
	}
});
