import { pb } from '../pocketbase.js';

/** Helper to ensure auth */
function currentUserId() { return pb.authStore.model?.id || null; }

/** @param {string} spaceId */
export async function isSpaceOwner(spaceId) {
  const uid = currentUserId(); if (!uid) return false;
  // Prefer membership role check
  const res = await pb.collection('space_members').getList(1,1,{ filter: `space = "${spaceId}" && user = "${uid}" && role = "owner"`});
  return res.items.length > 0;
}
/** @param {string} spaceId */
export async function isSpaceModerator(spaceId) {
  const uid = currentUserId(); if (!uid) return false;
  const res = await pb.collection('space_members').getList(1,1,{ filter: `space = "${spaceId}" && user = "${uid}" && (role = "moderator" || role = "owner")`});
  return res.items.length > 0;
}
/** @param {string} groupId */
export async function isGroupModerator(groupId) {
  const uid = currentUserId(); if (!uid) return false;
  // group moderator or space owner/moderator
  const group = await pb.collection('groups').getOne(groupId, { expand: 'space' });
  // Check group.moderators relation first
  if (group.moderators?.includes?.(uid)) return true;
  return await isSpaceModerator(group.space);
}

/** Determine if user can moderate a post (delete) */
/** @typedef {{id:string; author?:string; space?:string; group?:string; expand?:any}} PostRecord */
export {};
/** @param {PostRecord} post */
export async function canModeratePost(post) {
  const uid = currentUserId(); if (!uid) return false;
  if (post.author && post.author === uid) return true;
  if (post.space) {
    if (await isSpaceModerator(post.space)) return true;
  }
  if (post.group) {
    // get group for space context
    const group = post.expand?.group || await pb.collection('groups').getOne(post.group);
    if (group.moderators?.includes?.(uid)) return true;
    if (await isSpaceModerator(group.space)) return true;
  }
  return false;
}

/** @param {any} comment */
export async function canModerateComment(comment) {
  const uid = currentUserId(); if (!uid) return false;
  if (comment.author === uid) return true;
  // Need the parent post to evaluate context
  const post = comment.expand?.post || await pb.collection('posts').getOne(comment.post);
  return await canModeratePost(post);
}
