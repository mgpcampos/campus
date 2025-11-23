/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");
  if (!collection) {
    return;
  }

  const hasField = collection.fields.some((field) => field.name === "locale");
  if (!hasField) {
    collection.fields.push(new TextField({
      "id": "text_locale",
      "name": "locale",
      "system": false,
      "required": false,
      "hidden": false,
      "presentable": false,
      "min": 0,
      "max": 0,
      "pattern": ""
    }));
  }

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");
  if (!collection) {
    return;
  }

  collection.fields = collection.fields.filter((field) => field.name !== "locale");

  app.save(collection);
});
