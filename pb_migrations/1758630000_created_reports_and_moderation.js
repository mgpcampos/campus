/// <reference path="../pb_data/types.d.ts" />
// Migration: add reports and moderation_logs collections; relax posts/comments delete rules to allow space/group owners/moderators
// Also add optional status fields for moderation workflow via collection rules only.
migrate((app) => {
  // Update posts collection rules to allow deletion by related space/group owners/moderators
  try {
    const posts = app.findCollectionByNameOrId('pbc_1125843985');
    // New delete rule: author OR (space.owners/moderators) OR (group.space owners/moderators) OR (group.moderators)
    posts.deleteRule = '@request.auth.id = author || (space.owners.id ?= @request.auth.id) || (space.moderators.id ?= @request.auth.id) || (group.moderators.id ?= @request.auth.id) || (group.space.owners.id ?= @request.auth.id) || (group.space.moderators.id ?= @request.auth.id)';
    app.save(posts);
  } catch (e) {
    console.warn('Posts collection not found to update deleteRule', e);
  }

  try {
    const comments = app.findCollectionByNameOrId('pbc_533777971');
    comments.deleteRule = '@request.auth.id = author || (post.space.owners.id ?= @request.auth.id) || (post.space.moderators.id ?= @request.auth.id) || (post.group.moderators.id ?= @request.auth.id) || (post.group.space.owners.id ?= @request.auth.id) || (post.group.space.moderators.id ?= @request.auth.id)';
    app.save(comments);
  } catch (e) {
    console.warn('Comments collection not found to update deleteRule', e);
  }

  // Reports collection
  const reports = new Collection({
    id: 'pbc_reports_001',
    name: 'reports',
    type: 'base',
    system: false,
  fields: [
      {
        autogeneratePattern: '[a-z0-9]{15}',
        hidden: false,
        id: 'text_pk_report',
        max: 15,
        min: 15,
        name: 'id',
        pattern: '^[a-z0-9]+$',
        presentable: false,
        primaryKey: true,
        required: true,
        system: true,
        type: 'text'
      },
      {
        cascadeDelete: false,
        collectionId: '_pb_users_auth_',
        hidden: false,
        id: 'rel_reporter',
        maxSelect: 1,
        minSelect: 1,
        name: 'reporter',
        presentable: false,
        required: true,
        system: false,
        type: 'relation'
      },
      {
        hidden: false,
        id: 'select_targetType',
        maxSelect: 1,
        name: 'targetType',
        presentable: false,
        required: true,
        system: false,
        type: 'select',
        values: ['post','comment']
      },
      {
        hidden: false,
        id: 'text_targetId',
        max: 15,
        min: 15,
        name: 'targetId',
        pattern: '^[a-z0-9]+$',
        presentable: false,
        primaryKey: false,
        required: true,
        system: false,
        type: 'text'
      },
      {
        hidden: false,
        id: 'text_reason',
        max: 0,
        min: 0,
        name: 'reason',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: true,
        system: false,
        type: 'text'
      },
      {
        hidden: false,
        id: 'select_status',
        maxSelect: 1,
        name: 'status',
        presentable: false,
        required: true,
        system: false,
        type: 'select',
        values: ['open','reviewing','resolved','dismissed']
      },
      {
        hidden: false,
        id: 'autodate_created',
        name: 'created',
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: 'autodate'
      },
      {
        hidden: false,
        id: 'autodate_updated',
        name: 'updated',
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
        type: 'autodate'
      }
    ],
    indexes: [
      'CREATE INDEX idx_reports_target ON reports (targetType, targetId)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != "" && @request.body.reporter = @request.auth.id',
    updateRule: '@request.auth.id != "" && (reporter = @request.auth.id)',
    deleteRule: '@request.auth.id != "" && (reporter = @request.auth.id)'
  });

  app.save(reports);

  // Moderation logs collection
  const logs = new Collection({
    id: 'pbc_modlogs_001',
    name: 'moderation_logs',
    type: 'base',
    system: false,
  fields: [
      {
        autogeneratePattern: '[a-z0-9]{15}',
        hidden: false,
        id: 'text_pk_modlog',
        max: 15,
        min: 15,
        name: 'id',
        pattern: '^[a-z0-9]+$',
        presentable: false,
        primaryKey: true,
        required: true,
        system: true,
        type: 'text'
      },
      {
        cascadeDelete: false,
        collectionId: '_pb_users_auth_',
        hidden: false,
        id: 'rel_actor',
        maxSelect: 1,
        minSelect: 1,
        name: 'actor',
        presentable: false,
        required: true,
        system: false,
        type: 'relation'
      },
      {
        hidden: false,
        id: 'select_action',
        maxSelect: 1,
        name: 'action',
        presentable: false,
        required: true,
        system: false,
        type: 'select',
        values: ['delete_post','delete_comment','resolve_report','dismiss_report']
      },
      {
        hidden: false,
        id: 'json_meta',
        name: 'meta',
        presentable: false,
        required: false,
        system: false,
        type: 'json'
      },
      {
        hidden: false,
        id: 'autodate_created',
        name: 'created',
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: 'autodate'
      }
    ],
    indexes: [],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '', // immutable after creation
    deleteRule: ''
  });

  return app.save(logs);
}, (app) => {
  // Rollback: delete new collections and revert rules (best-effort)
  const reports = app.findCollectionByNameOrId('pbc_reports_001');
  if (reports) app.delete(reports);
  const logs = app.findCollectionByNameOrId('pbc_modlogs_001');
  if (logs) app.delete(logs);
  try {
    const posts = app.findCollectionByNameOrId('pbc_1125843985');
    posts.deleteRule = '@request.auth.id = author';
    app.save(posts);
  } catch {}
  try {
    const comments = app.findCollectionByNameOrId('pbc_533777971');
    comments.deleteRule = '@request.auth.id = author';
    app.save(comments);
  } catch {}
});
