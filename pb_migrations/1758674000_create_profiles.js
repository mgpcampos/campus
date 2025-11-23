/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Create profiles collection
  const profilesCollection = new Collection({
    "createRule": null,
    "deleteRule": null,
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
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation_user",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "user",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_display_name",
        "max": 0,
        "min": 0,
        "name": "displayName",
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
        "id": "text_department",
        "max": 0,
        "min": 0,
        "name": "department",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
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
        "values": [
          "student",
          "professor",
          "researcher",
          "staff"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_biography",
        "max": 0,
        "min": 0,
        "name": "biography",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_pronouns",
        "max": 0,
        "min": 0,
        "name": "pronouns",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "json_links",
        "maxSize": 0,
        "name": "links",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
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
    "id": "pbc_profiles_001",
    "indexes": [
      "CREATE UNIQUE INDEX idx_profiles_user ON profiles (user)",
      "CREATE INDEX idx_profiles_department_role ON profiles (department, role)"
    ],
    "listRule": "@request.auth.id != \"\"",
    "name": "profiles",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && (user = @request.auth.id || @request.auth.is_admin = true)",
    "viewRule": "@request.auth.id != \"\""
  });

  app.save(profilesCollection);

  // Create publication_records collection
  const publicationRecordsCollection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210257",
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
        "id": "text_title",
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
        "id": "text_doi",
        "max": 0,
        "min": 0,
        "name": "doi",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_slug_hash",
        "max": 0,
        "min": 0,
        "name": "slugHash",
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
        "id": "text_abstract",
        "max": 0,
        "min": 0,
        "name": "abstract",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number_year",
        "max": 2100,
        "min": 1900,
        "name": "year",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_venue",
        "max": 0,
        "min": 0,
        "name": "venue",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "json_authors",
        "maxSize": 0,
        "name": "authors",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
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
    "id": "pbc_publication_records_001",
    "indexes": [
      "CREATE UNIQUE INDEX idx_publications_slug ON publication_records (slugHash)",
      "CREATE UNIQUE INDEX idx_publications_doi ON publication_records (doi) WHERE doi IS NOT NULL AND doi != ''"
    ],
    "listRule": "@request.auth.id != \"\"",
    "name": "publication_records",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "@request.auth.id != \"\""
  });

  app.save(publicationRecordsCollection);

  // Create profile_publications join table
  const profilePublicationsCollection = new Collection({
    "createRule": "@request.auth.id != \"\" && @request.body.profile.user = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && profile.user = @request.auth.id",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210258",
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
        "collectionId": "pbc_profiles_001",
        "hidden": false,
        "id": "relation_profile",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "profile",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_publication_records_001",
        "hidden": false,
        "id": "relation_publication",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "publication",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select_contribution_role",
        "maxSelect": 1,
        "name": "contributionRole",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "author",
          "editor",
          "advisor"
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
    "id": "pbc_profile_publications_001",
    "indexes": [
      "CREATE UNIQUE INDEX idx_profile_publications_unique ON profile_publications (profile, publication)"
    ],
    "listRule": "@request.auth.id != \"\"",
    "name": "profile_publications",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && profile.user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\""
  });

  app.save(profilePublicationsCollection);
}, (app) => {
  // Rollback
  const profilesCollection = app.findCollectionByNameOrId("pbc_profiles_001");
  if (profilesCollection) {
    app.delete(profilesCollection);
  }

  const publicationRecordsCollection = app.findCollectionByNameOrId("pbc_publication_records_001");
  if (publicationRecordsCollection) {
    app.delete(publicationRecordsCollection);
  }

  const profilePublicationsCollection = app.findCollectionByNameOrId("pbc_profile_publications_001");
  if (profilePublicationsCollection) {
    app.delete(profilePublicationsCollection);
  }
});
