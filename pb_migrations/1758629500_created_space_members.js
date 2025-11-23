/// <reference path="../pb_data/types.d.ts" />
// Migration: create space_members collection to track user memberships and roles within spaces.
// Roles: member, moderator, owner (owner also stored in spaces.owners but duplicated here for uniform queries)
// API Rules logic:
// list/view: authenticated users can view memberships of spaces they belong to OR public spaces
// create: authenticated user creating membership for themselves only
// update/delete: only user themselves (for leaving) OR space owners/moderators (cannot demote/remove last owner)
// Some of the more complex owner-protection logic may need to be enforced in hooks later; basic rules here.
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_540001234", // arbitrary unique id
    "name": "space_members",
    "type": "base",
    "system": false,
      "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text_pk_member",
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
        "cascadeDelete": false,
        "collectionId": "pbc_3929545014", // spaces
        "hidden": false,
        "id": "rel_space",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "space",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_", // users
        "hidden": false,
        "id": "rel_user",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "user",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select_role",
        "maxSelect": 1,
        "name": "role",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["member", "moderator", "owner"]
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
    "indexes": [
      // Unique composite index to prevent duplicate membership
      "CREATE UNIQUE INDEX idx_space_user_unique ON space_members (space, user)"
    ],
    // Authenticated users can list memberships for spaces they are in or public spaces
    // Using OR condition referencing the space relation
    "listRule": "@request.auth.id != '' && (user = @request.auth.id || space.isPublic = true || space.owners.id ?= @request.auth.id)",
    "viewRule": "@request.auth.id != '' && (user = @request.auth.id || space.isPublic = true || space.owners.id ?= @request.auth.id)",
    // Create membership: user creates for themselves only, require space is public OR they are owner (private invites in future)
    "createRule": "@request.auth.id != '' && @request.body.user = @request.auth.id && (space.isPublic = true || space.owners.id ?= @request.auth.id)",
    // Update (role changes): only space owners or moderators (owners.id or moderators.id includes auth)
    "updateRule": "@request.auth.id != '' && (space.owners.id ?= @request.auth.id || space.moderators.id ?= @request.auth.id)",
    // Delete (leave or removal): user leaving themselves OR owners/moderators removing
    "deleteRule": "@request.auth.id != '' && (user = @request.auth.id || space.owners.id ?= @request.auth.id || space.moderators.id ?= @request.auth.id)",
    "options": {}
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_540001234");
  return app.delete(collection);
});
