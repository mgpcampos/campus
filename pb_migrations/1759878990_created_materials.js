/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\" && @request.body.uploader = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && uploader = @request.auth.id",
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
        "id": "relation1668006755",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "uploader",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text724990059",
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
        "id": "text1843675174",
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text4022337646",
        "max": 0,
        "min": 0,
        "name": "courseCode",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "json1874629670",
        "maxSize": 0,
        "name": "tags",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "select3736761055",
        "maxSelect": 0,
        "name": "format",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "document",
          "slide",
          "dataset",
          "video",
          "link"
        ]
      },
      {
        "hidden": false,
        "id": "file2359244304",
        "maxSelect": 0,
        "maxSize": 0,
        "mimeTypes": null,
        "name": "file",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": null,
        "type": "file"
      },
      {
        "exceptDomains": null,
        "hidden": false,
        "id": "url132039695",
        "name": "linkUrl",
        "onlyDomains": null,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "url"
      },
      {
        "hidden": false,
        "id": "select1368277760",
        "maxSelect": 0,
        "name": "visibility",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "institution",
          "course",
          "group",
          "public"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2858399070",
        "max": 0,
        "min": 0,
        "name": "keywords",
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
        "id": "text1331459335",
        "max": 0,
        "min": 0,
        "name": "searchTerms",
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
    "id": "pbc_4282183725",
    "indexes": [],
    "listRule": "@request.auth.id != \"\" && (visibility = 'public' || visibility = 'institution' || (visibility = 'course' && courseCode != '') || (visibility = 'group'))",
    "name": "materials",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && uploader = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && (visibility = 'public' || visibility = 'institution' || (visibility = 'course' && courseCode != '') || (visibility = 'group'))"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4282183725");

  return app.delete(collection);
})
