import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => ({
	meta: {
		title: 'Terms of Service | Campus',
		description:
			'Campus terms of service outlining acceptable use, responsibilities, and user rights.',
		ogImage: '/og-default.png'
	}
});
