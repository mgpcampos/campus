/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");
  if (!collection) {
    return;
  }

  const hasField = collection.fields.some((field) => field.name === "prefersDarkMode");
  if (!hasField) {
    collection.fields.push(new BoolField({
      "id": "bool_prefers_dark_mode",
      "name": "prefersDarkMode",
      "system": false,
      "required": false,
      "hidden": false,
      "presentable": false,
      "default": false
    }));
  }

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");
  if (!collection) {
    return;
  }

  collection.fields = collection.fields.filter((field) => field.name !== "prefersDarkMode");

  app.save(collection);
});
