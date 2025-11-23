/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1125843985');
    if (!collection) {
      return;
    }

    collection.fields = collection.fields || [];

    const ensureField = (id, factory) => {
      if (!collection.fields.find((field) => field.id === id)) {
        collection.fields.push(factory());
      }
    };

    const attachments = collection.fields.find((field) => field.name === 'attachments');
    if (attachments) {
      attachments.maxSelect = 10;
      attachments.mimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/heic',
        'image/heif',
        'video/mp4'
      ];
    }

    ensureField('select_media_type', () => new Field({
      hidden: false,
      id: 'select_media_type',
      maxSelect: 1,
      name: 'mediaType',
      presentable: false,
      required: true,
      system: false,
      type: 'select',
      values: ['text', 'images', 'video']
    }));

    ensureField('text_media_alt', () => new Field({
      autogeneratePattern: '',
      hidden: false,
      id: 'text_media_alt',
      max: 2000,
      min: 0,
      name: 'mediaAltText',
      pattern: '',
      presentable: false,
      primaryKey: false,
      required: false,
      system: false,
      type: 'text'
    }));

    ensureField('file_video_poster', () => new Field({
      hidden: false,
      id: 'file_video_poster',
      maxSelect: 1,
      maxSize: 0,
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
      name: 'videoPoster',
      presentable: false,
      protected: false,
      required: false,
      system: false,
      thumbs: ['1024x576f', '640x360f', '320x180f', '64x64f'],
      type: 'file'
    }));

    ensureField('number_video_duration', () => new Field({
      hidden: false,
      id: 'number_video_duration',
      max: 300,
      min: 0,
      name: 'videoDuration',
      onlyInt: true,
      presentable: false,
      required: false,
      system: false,
      type: 'number'
    }));

    ensureField('autodate_published_at', () => new Field({
      hidden: false,
      id: 'autodate_published_at',
      name: 'publishedAt',
      onCreate: true,
      onUpdate: false,
      presentable: false,
      system: false,
      type: 'autodate'
    }));

    const newIndexes = [
      'CREATE INDEX idx_posts_scope_published ON posts (scope, publishedAt DESC)',
      'CREATE INDEX idx_posts_author_published ON posts (author, publishedAt DESC)'
    ];

    collection.indexes = collection.indexes || [];
    for (const index of newIndexes) {
      if (!collection.indexes.includes(index)) {
        collection.indexes.push(index);
      }
    }

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1125843985');
    if (!collection) {
      return;
    }

    collection.fields = collection.fields || [];

    const fieldIdsToRemove = [
      'select_media_type',
      'text_media_alt',
      'file_video_poster',
      'number_video_duration',
      'autodate_published_at'
    ];

    collection.fields = collection.fields.filter((field) => !fieldIdsToRemove.includes(field.id));

    const attachments = collection.fields.find((field) => field.id === 'file1204091606');
    if (attachments) {
      attachments.maxSelect = 0;
      attachments.mimeTypes = null;
    }

    const indexesToRemove = [
      'CREATE INDEX idx_posts_scope_published ON posts (scope, publishedAt DESC)',
      'CREATE INDEX idx_posts_author_published ON posts (author, publishedAt DESC)'
    ];

    collection.indexes = (collection.indexes || []).filter((index) => !indexesToRemove.includes(index));

    return app.save(collection);
  }
);
