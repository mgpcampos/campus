/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");

  if (!collection.fields.find((field) => field.name === "isAdmin")) {
    collection.fields.push(new BoolField({
      "id": "bool_is_admin",
      "name": "isAdmin",
      "system": false,
      "required": false,
      "hidden": false,
      "presentable": false
    }));
  }

  collection.listRule = '@request.auth.id != "" && (@request.auth.id = id || @request.auth.isAdmin = true)';
  collection.viewRule = '@request.auth.id != "" && (@request.auth.id = id || @request.auth.isAdmin = true)';
  collection.updateRule = '@request.auth.id = id || @request.auth.isAdmin = true';
  collection.deleteRule = '@request.auth.id = id || @request.auth.isAdmin = true';

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");

  collection.fields = collection.fields.filter((field) => field.name !== "isAdmin");

  collection.listRule = '@request.auth.id = id';
  collection.viewRule = '@request.auth.id = id';
  collection.updateRule = '@request.auth.id = id';
  collection.deleteRule = '@request.auth.id = id';

  return app.save(collection);
})
