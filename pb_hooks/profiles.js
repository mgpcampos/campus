/// <reference path="../pb_data/types.d.ts" />

/**
 * Profiles Collection Hooks
 * Automatically creates an academic profile when a new user is created
 * 
 * Profile fields match user registration fields:
 * - user: relation to the created user
 * - displayName: from user's name field
 */

// Hook: Automatically create profile after user creation
// Listen to all record creations and filter for users collection internally
onRecordAfterCreateSuccess((e) => {
	const collectionName = e.record.collection().name;
	
	// Only handle users collection (auth collection)
	if (collectionName !== 'users') {
		return;
	}

	const user = e.record;
	console.log(`[profiles.js] User created: ${user.id}, attempting to create profile...`);

	// Check if profile already exists for this user
	try {
		const existingProfile = $app.findFirstRecordByFilter(
			'profiles',
			`user = "${user.id}"`
		);

		if (existingProfile) {
			console.log(`[profiles.js] Profile already exists for user ${user.id}`);
			return;
		}
	} catch (err) {
		// No existing profile found, which is expected for new users
		console.log(`[profiles.js] No existing profile found for user ${user.id}, creating new one...`);
	}

	// Create the academic profile with registration-available fields only
	try {
		const profilesCollection = $app.findCollectionByNameOrId('profiles');

		const profile = new Record(profilesCollection, {
			user: user.id,
			displayName: user.get('name') || user.get('username') || 'User'
		});

		$app.save(profile);
		console.log(`[profiles.js] Successfully created profile for user ${user.id}`);
	} catch (err) {
		console.error(`[profiles.js] Failed to create profile for user ${user.id}:`, err);
	}
});
