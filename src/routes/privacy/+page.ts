import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => ({
	meta: {
		title: 'Privacy Policy | Campus',
		description: 'Campus privacy policy outlining data collection, usage, and user rights.',
		ogImage: '/og-default.png'
	}
});
