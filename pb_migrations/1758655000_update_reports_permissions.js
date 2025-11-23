/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('pbc_reports_001');
  if (!collection) {
    return;
  }

  if (!collection.fields.find((field) => field.name === 'post')) {
    collection.fields.push(new RelationField({
      "id": 'relation_report_post',
      "name": 'post',
      "system": false,
      "required": false,
      "presentable": false,
      "cascadeDelete": true,
      "collectionId": 'pbc_1125843985',
      "maxSelect": 1,
      "minSelect": 0
    }));
  }

  if (!collection.fields.find((field) => field.name === 'comment')) {
    collection.fields.push(new RelationField({
      "id": 'relation_report_comment',
      "name": 'comment',
      "system": false,
      "required": false,
      "presentable": false,
      "cascadeDelete": true,
      "collectionId": 'pbc_533777971',
      "maxSelect": 1,
      "minSelect": 0
    }));
  }

  const postModerationRule = 'post != null && (post.author = @request.auth.id || post.space.owners.id ?= @request.auth.id || post.space.moderators.id ?= @request.auth.id || (post.group != null && (post.group.moderators.id ?= @request.auth.id || post.group.space.owners.id ?= @request.auth.id || post.group.space.moderators.id ?= @request.auth.id)))';
  const commentModerationRule = 'comment != null && (comment.author = @request.auth.id || (comment.post != null && (comment.post.space.owners.id ?= @request.auth.id || comment.post.space.moderators.id ?= @request.auth.id || (comment.post.group != null && (comment.post.group.moderators.id ?= @request.auth.id || comment.post.group.space.owners.id ?= @request.auth.id || comment.post.group.space.moderators.id ?= @request.auth.id)))))';

  const accessRule = `@request.auth.id != "" && (reporter = @request.auth.id || @request.auth.isAdmin = true || (${postModerationRule}) || (${commentModerationRule}))`;

  collection.listRule = accessRule;
  collection.viewRule = accessRule;
  collection.updateRule = accessRule;
  collection.deleteRule = accessRule;

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('pbc_reports_001');
  if (!collection) {
    return;
  }

  collection.fields = collection.fields.filter((field) => !['relation_report_post', 'relation_report_comment'].includes(field.id));

  collection.listRule = '@request.auth.id != ""';
  collection.viewRule = '@request.auth.id != ""';
  collection.updateRule = '@request.auth.id != "" && (reporter = @request.auth.id)';
  collection.deleteRule = '@request.auth.id != "" && (reporter = @request.auth.id)';

  app.save(collection);
});
