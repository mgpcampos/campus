import { pb } from '../pocketbase.js';
import { writable, get } from 'svelte/store';

/** @type {import('svelte/store').Writable<any[]>} */
export const feedPosts = writable([]); // array of post records
/** @type {import('svelte/store').Writable<{scope:string; space:string|null; group:string|null}>} */
export const feedContext = writable({ scope: 'global', space: null, group: null });
/** @type {import('svelte/store').Writable<{connected:boolean; lastEvent:number}>} */
export const realtimeStatus = writable({ connected: true, lastEvent: Date.now() });

/** @type {null | (()=>void)} */
let postsUnsub = null;
/** @type {null | ReturnType<typeof setInterval>} */
let heartbeatInterval = null;

/**
 * @param {any} record
 * @param {{scope:string; space:string|null; group:string|null}} ctx
 */
function matchesContext(record, ctx) {
  if (ctx.scope === 'global') return record.scope === 'global';
  if (ctx.scope === 'space') return record.scope === 'space' && record.space === ctx.space;
  if (ctx.scope === 'group') return record.scope === 'group' && record.group === ctx.group;
  return false;
}

/**
 * @param {{scope:string; space:string|null; group:string|null}} ctx
 */
export async function subscribeFeed(ctx) {
  feedContext.set(ctx);
  await unsubscribeFeed();
  postsUnsub = await pb.collection('posts').subscribe('*', (e) => {
    realtimeStatus.update(s => ({ ...s, lastEvent: Date.now() }));
  const current = /** @type {any[]} */(get(feedPosts));
    if (!matchesContext(e.record, ctx)) return;
    if (e.action === 'create') {
      feedPosts.set([e.record, ...current]);
    } else if (e.action === 'update') {
      feedPosts.set(current.map(p => p.id === e.record.id ? { ...p, ...e.record } : p));
    } else if (e.action === 'delete') {
      feedPosts.set(current.filter(p => p.id !== e.record.id));
    }
  });
  startHeartbeat();
  return postsUnsub;
}

export async function unsubscribeFeed() {
  if (postsUnsub) {
    try { postsUnsub(); } catch { /* ignore unsubscribe error */ }
    try { pb.collection('posts').unsubscribe('*'); } catch { /* ignore collection unsubscribe error */ }
    postsUnsub = null;
  }
  stopHeartbeat();
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    const status = get(realtimeStatus);
    const diff = Date.now() - status.lastEvent;
    if (diff > 30000 && status.connected) {
      realtimeStatus.set({ ...status, connected: false });
    } else if (diff <= 30000 && !status.connected) {
      realtimeStatus.set({ ...status, connected: true });
    }
  }, 5000);
}

function stopHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = null;
}

// Simple polling fallback when disconnected
/** @type {null | ReturnType<typeof setInterval>} */
let pollInterval = null;
/**
 * @param {() => Promise<void>} fetchFn
 */
export function enablePolling(fetchFn) {
  disablePolling();
  pollInterval = setInterval(async () => {
    const status = get(realtimeStatus);
    if (status.connected) return; // skip if reconnected
    try {
      await fetchFn();
    } catch { /* polling fetch failed, ignore */ }
  }, 15000);
}
export function disablePolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = null;
}

// Notifications subscription will live elsewhere
