const publicEnv = (() => {
	if (typeof import.meta !== 'undefined' && import.meta.env) {
		return import.meta.env;
	}
	if (typeof process !== 'undefined' && process.env) {
		return process.env;
	}
	return {};
})();

const analyticsSampleRate = (() => {
	const rawValue = publicEnv.PUBLIC_ANALYTICS_SAMPLE_RATE ?? '1';
	const parsed = Number.parseFloat(rawValue);
	if (Number.isNaN(parsed)) return 1;
	return Math.min(1, Math.max(0, parsed));
})();

const inferredPocketBaseUrl = (() => {
	if (publicEnv.PUBLIC_POCKETBASE_URL) return publicEnv.PUBLIC_POCKETBASE_URL;
	if (typeof window !== 'undefined') {
		return new URL('/pb', window.location.origin).toString().replace(/\/$/, '');
	}
	return 'http://127.0.0.1:8090';
})();

export const config = {
	// PocketBase configuration
	pocketbase: {
		url: inferredPocketBaseUrl
	},

	// App configuration
	app: {
		name: 'Campus',
		description: 'A lightweight social network for the education community',
		version: '0.0.1',
		origin: publicEnv.PUBLIC_SITE_URL || 'http://localhost:4173',
		robots:
			publicEnv.PUBLIC_ROBOTS || (publicEnv.PUBLIC_SITE_URL ? 'index,follow' : 'noindex, nofollow')
	},

	// File upload limits
	files: {
		maxSize: 5 * 1024 * 1024, // 5MB
		allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
		maxFiles: 4
	},

	// Content limits
	content: {
		maxPostLength: 2000,
		maxCommentLength: 1000,
		maxBioLength: 500,
		maxNameLength: 100,
		maxUsernameLength: 30,
		minUsernameLength: 3
	},

	analytics: {
		enabled: publicEnv.PUBLIC_ENABLE_ANALYTICS === 'true',
		sampleRate: analyticsSampleRate,
		flushIntervalMs: 8000,
		endpoint: '/api/analytics'
	},

	// Support configuration
	support: {
		email: publicEnv.PUBLIC_SUPPORT_EMAIL || 'support@example.com'
	}
};
