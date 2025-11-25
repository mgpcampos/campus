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
onRecordAfterCreateSuccess((e) => {
	// Only handle users collection
	if (e.record.collection().name !== 'users') return;

	const user = e.record;

	// Check if profile already exists for this user
	try {
		const existingProfile = $app.findFirstRecordByFilter(
			'profiles',
			`user = "${user.id}"`
		);

		if (existingProfile) {
			console.log(`Profile already exists for user ${user.id}`);
			return;
		}
	} catch (err) {
		// No existing profile found, which is expected
	}

	// Create the academic profile with registration-available fields only
	try {
		const profilesCollection = $app.findCollectionByNameOrId('profiles');

		const profile = new Record(profilesCollection, {
			user: user.id,
			displayName: user.get('name') || user.get('username') || 'User'
		});

		$app.save(profile);
		console.log(`Created profile for user ${user.id}`);
	} catch (err) {
		console.error(`Failed to create profile for user ${user.id}:`, err);
	}
}, 'users');
