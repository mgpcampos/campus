/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Create profiles for existing users who don't have one
  // Only uses fields available from user registration (user relation + displayName)
  const users = app.findRecordsByFilter('users', '', '', 0, null)
  const profilesCollection = app.findCollectionByNameOrId('profiles')

  for (const user of users) {
    try {
      // Check if profile already exists
      const existingProfile = app.findFirstRecordByFilter(
        'profiles',
        `user = "${user.id}"`
      )

      if (existingProfile) {
        continue // Skip if profile already exists
      }
    } catch (err) {
      // No existing profile found, create one
    }

    try {
      // Create profile with only registration-available fields
      const profile = new Record(profilesCollection, {
        user: user.id,
        displayName: user.get('name') || user.get('username') || 'User'
        // All other fields are optional and left for user to fill later
      })

      app.save(profile)
      console.log(`Created profile for existing user ${user.id}`)
    } catch (err) {
      console.error(`Failed to create profile for user ${user.id}:`, err)
    }
  }
}, (app) => {
  // Down migration: Remove auto-created profiles
  // Note: This is intentionally left empty to preserve data
  // If you need to rollback, manually delete profiles as needed
  console.log('Rollback: No automatic cleanup of profiles to preserve data')
})
