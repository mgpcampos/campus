/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_profiles_001")

  // Make department and role fields optional for automatic profile creation
  // These fields are not provided during user registration
  const fields = collection.fields || collection.schema
  if (fields) {
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].name === 'department' || fields[i].name === 'role') {
        fields[i].required = false
      }
    }
  }

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_profiles_001")

  // Revert: make department and role required again
  const fields = collection.fields || collection.schema
  if (fields) {
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].name === 'department' || fields[i].name === 'role') {
        fields[i].required = true
      }
    }
  }

  return app.save(collection)
})
