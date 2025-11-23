/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name: 'notifications',
    type: 'base',
    system: false,
    fields: [
      {
        autogeneratePattern: '[a-z0-9]{15}',
        hidden: false,
        id: 'text_pk_notification',
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
        cascadeDelete: true,
        collectionId: '_pb_users_auth_',
        hidden: false,
        id: 'rel_notif_user',
        maxSelect: 1,
        minSelect: 1,
        name: 'user',
        presentable: false,
        required: true,
        system: false,
        type: 'relation'
      },
      {
        cascadeDelete: true,
        collectionId: '_pb_users_auth_',
        hidden: false,
        id: 'rel_notif_actor',
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
        id: 'select_notif_type',
        maxSelect: 1,
        name: 'type',
        presentable: false,
        required: true,
        system: false,
        type: 'select',
        values: ['like', 'comment', 'mention']
      },
      {
        cascadeDelete: true,
        collectionId: 'pbc_1125843985',
        hidden: false,
        id: 'rel_notif_post',
        maxSelect: 1,
        minSelect: 0,
        name: 'post',
        presentable: false,
        required: false,
        system: false,
        type: 'relation'
      },
      {
        cascadeDelete: true,
        collectionId: 'pbc_533777971',
        hidden: false,
        id: 'rel_notif_comment',
        maxSelect: 1,
        minSelect: 0,
        name: 'comment',
        presentable: false,
        required: false,
        system: false,
        type: 'relation'
      },
      {
        hidden: false,
        id: 'bool_notif_read',
        name: 'read',
        presentable: false,
        required: true,
        system: false,
        type: 'bool'
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
      'CREATE INDEX `idx_notifications_user_read` ON `notifications` (`user`, `read`)',
      'CREATE INDEX `idx_notifications_user_created` ON `notifications` (`user`, `created` DESC)'
    ],
    listRule: '@request.auth.id = user',
    viewRule: '@request.auth.id = user',
    createRule: null,
    updateRule: '@request.auth.id = user',
    deleteRule: '@request.auth.id = user',
    options: {}
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId('notifications');
    if (collection) {
      return app.delete(collection);
    }
  } catch (err) {
    console.warn('Failed to drop notifications collection', err);
  }
  return true;
});