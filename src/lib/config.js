import { PUBLIC_POCKETBASE_URL } from '$env/static/public';

export const config = {
	// PocketBase configuration
	pocketbase: {
		url: PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
	},
	
	// App configuration
	app: {
		name: 'Campus',
		description: 'A lightweight social network for the education community',
		version: '0.0.1'
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
	}
};