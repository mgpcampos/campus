import { pb } from '../pocketbase.js';
import { canModeratePost, canModerateComment } from './permissions.js';

/** Delete post with permission check and log */
/** @param {string} postId */
export async function deletePostModerated(postId) {
  if (!pb.authStore.model?.id) throw new Error('Not authenticated');
  const post = await pb.collection('posts').getOne(postId);
  if (!(await canModeratePost(post))) throw new Error('Not authorized to delete post');
  await pb.collection('posts').delete(postId);
  await pb.collection('moderation_logs').create({
    actor: pb.authStore.model.id,
    action: 'delete_post',
    meta: { postId }
  });
  return true;
}

/** Delete comment with permission check and log */
/** @param {string} commentId */
export async function deleteCommentModerated(commentId) {
  if (!pb.authStore.model?.id) throw new Error('Not authenticated');
  const comment = await pb.collection('comments').getOne(commentId);
  if (!(await canModerateComment(comment))) throw new Error('Not authorized to delete comment');
  await pb.collection('comments').delete(commentId);
  await pb.collection('moderation_logs').create({
    actor: pb.authStore.model.id,
    action: 'delete_comment',
    meta: { commentId, postId: comment.post }
  });
  return true;
}
