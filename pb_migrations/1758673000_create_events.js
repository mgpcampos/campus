/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Create events collection
  const eventsCollection = new Collection({
    "createRule": "@request.auth.id != \"\" && @request.body.createdBy = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && createdBy = @request.auth.id",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1234567890",
        "max": 0,
        "min": 0,
        "name": "title",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2345678901",
        "max": 0,
        "min": 0,
        "name": "description",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select3456789012",
        "maxSelect": 1,
        "name": "scopeType",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "global",
          "space",
          "group",
          "course"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text4567890123",
        "max": 0,
        "min": 0,
        "name": "scopeId",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "date5678901234",
        "max": "",
        "min": "",
        "name": "start",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date6789012345",
        "max": "",
        "min": "",
        "name": "end",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "json7890123456",
        "maxSize": 0,
        "name": "location",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "number8901234567",
        "max": null,
        "min": 0,
        "name": "reminderLeadMinutes",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation9012345678",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "createdBy",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text0123456789",
        "max": 0,
        "min": 0,
        "name": "icsUid",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate_created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_updated",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_events_001",
    "indexes": [
      "CREATE INDEX idx_events_scope_window ON events (scopeType, scopeId, start, end)",
      "CREATE INDEX idx_events_createdBy ON events (createdBy)"
    ],
    "listRule": "@request.auth.id != \"\"",
    "name": "events",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && createdBy = @request.auth.id",
    "viewRule": "@request.auth.id != \"\""
  });

  app.save(eventsCollection);

  // Create event_participants collection
  const participantsCollection = new Collection({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\" && user = @request.auth.id",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_events_001",
        "hidden": false,
        "id": "relation1111111111",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "event",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation2222222222",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "user",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select3333333333",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "going",
          "maybe",
          "declined"
        ]
      },
      {
        "hidden": false,
        "id": "autodate_created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_updated",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_event_participants_001",
    "indexes": [
      "CREATE UNIQUE INDEX idx_event_participants_unique ON event_participants (event, user)",
      "CREATE INDEX idx_event_participants_user ON event_participants (user)"
    ],
    "listRule": "@request.auth.id != \"\"",
    "name": "event_participants",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\""
  });

  app.save(participantsCollection);
}, (app) => {
  // Rollback
  const eventsCollection = app.findCollectionByNameOrId("pbc_events_001");
  if (eventsCollection) {
    app.delete(eventsCollection);
  }

  const participantsCollection = app.findCollectionByNameOrId("pbc_event_participants_001");
  if (participantsCollection) {
    app.delete(participantsCollection);
  }
});
