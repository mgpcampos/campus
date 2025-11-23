/// <reference path="../pb_data/types.d.ts" />
// Adds indexes to improve common query performance patterns.
// NOTE: If any index already exists, PocketBase will ignore duplicates.
migrate((app) => {
  // posts: queries filter by author, space, group, created (sorting)
  const posts = app.findCollectionByNameOrId('posts');
  if (posts) {
    // created DESC sorts benefit from index on created
    posts.indexes = posts.indexes || [];
    const toAdd = [
      'CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created)',
      'CREATE INDEX IF NOT EXISTS idx_posts_scope_created ON posts(scope, created)',
      'CREATE INDEX IF NOT EXISTS idx_posts_space_created ON posts(space, created)',
      'CREATE INDEX IF NOT EXISTS idx_posts_group_created ON posts(group, created)',
      'CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author, created)'
    ];
    for (const stmt of toAdd) {
      if (!posts.indexes.includes(stmt)) posts.indexes.push(stmt);
    }
    app.save(posts);
  }

  const comments = app.findCollectionByNameOrId('comments');
  if (comments) {
    comments.indexes = comments.indexes || [];
    const toAdd = [
      'CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post, created)'
    ];
    for (const stmt of toAdd) {
      if (!comments.indexes.includes(stmt)) comments.indexes.push(stmt);
    }
    app.save(comments);
  }

  const likes = app.findCollectionByNameOrId('likes');
  if (likes) {
    likes.indexes = likes.indexes || [];
    const toAdd = [
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_post_user ON likes(post, user)'
    ];
    for (const stmt of toAdd) {
      if (!likes.indexes.includes(stmt)) likes.indexes.push(stmt);
    }
    app.save(likes);
  }

  const spaceMembers = app.findCollectionByNameOrId('space_members');
  if (spaceMembers) {
    spaceMembers.indexes = spaceMembers.indexes || [];
    const toAdd = [
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_space_members_unique ON space_members(space, user)'
    ];
    for (const stmt of toAdd) {
      if (!spaceMembers.indexes.includes(stmt)) spaceMembers.indexes.push(stmt);
    }
    app.save(spaceMembers);
  }

  const groupMembers = app.findCollectionByNameOrId('group_members');
  if (groupMembers) {
    groupMembers.indexes = groupMembers.indexes || [];
    const toAdd = [
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_unique ON group_members(group, user)'
    ];
    for (const stmt of toAdd) {
      if (!groupMembers.indexes.includes(stmt)) groupMembers.indexes.push(stmt);
    }
    app.save(groupMembers);
  }
}, (app) => {
  // Rollback: removing indexes by recreating collections without them could be destructive; we'll simply leave them (no-op) or you can implement manual removal.
  // For safety, this rollback doesn't drop indexes to avoid performance regressions on rollback. Adjust if strict reversibility required.
});
