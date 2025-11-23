/// <reference path="../pb_data/types.d.ts" />
// Migration: add parent relation field to comments for threading support
// Forward: adds optional self-relation field `parent` pointing to comments collection
// Backward: removes the field

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_533777971"); // comments

  // Avoid duplicate addition if re-run
  if (!collection.fields.find(f => f.name === 'parent')) {
    collection.fields.push(new Field({
      "cascadeDelete": false,
      "collectionId": "pbc_533777971",
      "hidden": false,
      "id": "relation_parent_comment",
      "maxSelect": 0,
      "minSelect": 0,
      "name": "parent",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "relation"
    }));
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_533777971");
  collection.fields = collection.fields.filter(f => f.name !== 'parent');
  return app.save(collection);
});
