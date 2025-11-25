/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_profiles_001")

  if (!collection) {
    console.log("[migration] Could not find profiles collection")
    return
  }

  // Make department and role fields optional for automatic profile creation
  // These fields are not provided during user registration
  const fields = collection.fields
  if (fields && fields.length > 0) {
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].name === 'department') {
        fields[i].required = false
        console.log("[migration] Made 'department' field optional")
      }
      if (fields[i].name === 'role') {
        fields[i].required = false
        console.log("[migration] Made 'role' field optional")
      }
    }
  }

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_profiles_001")

  if (!collection) {
    return
  }

  // Revert: make department and role required again
  const fields = collection.fields
  if (fields && fields.length > 0) {
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].name === 'department') {
        fields[i].required = true
      }
      if (fields[i].name === 'role') {
        fields[i].required = true
      }
    }
  }

  return app.save(collection)
})
