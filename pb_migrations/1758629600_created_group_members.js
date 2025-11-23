/// <reference path="../pb_data/types.d.ts" />
// Migration: create group_members collection to track user memberships and roles within groups.
// Roles: member, moderator. Space owners/moderators implicitly can manage groups but are not auto inserted here.
// API Rules logic:
// list/view: authenticated users can view memberships if they are:
//   - the member themselves OR
//   - a moderator of the group OR
//   - a space owner/moderator (via group.space relation) OR
//   - the group is public (group.isPublic = true)
// create: authenticated user creating membership for themselves only AND group is public OR user is space owner/moderator
// update: space owners/moderators OR group.moderators may modify (eg promote/demote)
// delete: user themselves OR space owners/moderators OR group.moderators
// NOTE: Enforcing that a user must already be a space member before joining a group can't be expressed purely in rules; enforce in app logic.
migrate((app) => {
  const collection = new Collection({
    id: "pbc_640001234", // arbitrary unique id
    name: "group_members",
    type: "base",
    system: false,
  fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_pk_member",
        max: 15,
        min: 15,
        name: "id",
        pattern: "^[a-z0-9]+$",
        presentable: false,
        primaryKey: true,
        required: true,
        system: true,
        type: "text"
      },
      {
        cascadeDelete: false,
        collectionId: "pbc_3346940990", // groups
        hidden: false,
        id: "rel_group",
        maxSelect: 1,
        minSelect: 1,
        name: "group",
        presentable: false,
        required: true,
        system: false,
        type: "relation"
      },
      {
        cascadeDelete: false,
        collectionId: "_pb_users_auth_", // users
        hidden: false,
        id: "rel_user",
        maxSelect: 1,
        minSelect: 1,
        name: "user",
        presentable: false,
        required: true,
        system: false,
        type: "relation"
      },
      {
        hidden: false,
        id: "select_role",
        maxSelect: 1,
        name: "role",
        presentable: false,
        required: true,
        system: false,
        type: "select",
        values: ["member", "moderator"]
      },
      {
        hidden: false,
        id: "autodate_created",
        name: "created",
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: "autodate"
      },
      {
        hidden: false,
        id: "autodate_updated",
        name: "updated",
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
        type: "autodate"
      }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_group_user_unique ON group_members (group, user)"
    ],
    listRule: "@request.auth.id != '' && (user = @request.auth.id || group.isPublic = true || group.moderators.id ?= @request.auth.id || group.space.owners.id ?= @request.auth.id || group.space.moderators.id ?= @request.auth.id)",
    viewRule: "@request.auth.id != '' && (user = @request.auth.id || group.isPublic = true || group.moderators.id ?= @request.auth.id || group.space.owners.id ?= @request.auth.id || group.space.moderators.id ?= @request.auth.id)",
    createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id && (group.isPublic = true || group.space.owners.id ?= @request.auth.id || group.space.moderators.id ?= @request.auth.id)",
    updateRule: "@request.auth.id != '' && (group.moderators.id ?= @request.auth.id || group.space.owners.id ?= @request.auth.id || group.space.moderators.id ?= @request.auth.id)",
    deleteRule: "@request.auth.id != '' && (user = @request.auth.id || group.moderators.id ?= @request.auth.id || group.space.owners.id ?= @request.auth.id || group.space.moderators.id ?= @request.auth.id)",
    options: {}
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_640001234");
  return app.delete(collection);
});
