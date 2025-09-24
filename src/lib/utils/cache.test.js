import { describe, it, expect } from 'vitest';
import { LruTtlCache, getOrSet } from './cache.js';

describe('LruTtlCache', () => {
  it('stores and retrieves values before expiry', () => {
    const c = new LruTtlCache({ defaultTtlMs: 50 });
    c.set('a', 123);
    expect(c.get('a')).toBe(123);
  });
  it('expires values after ttl', async () => {
    const c = new LruTtlCache({ defaultTtlMs: 5 });
    c.set('k', 'v');
    await new Promise(r => setTimeout(r, 10));
    expect(c.get('k')).toBeUndefined();
  });
  it('evicts oldest when over capacity', () => {
    const c = new LruTtlCache({ max: 2, defaultTtlMs: 1000 });
    c.set('a',1);c.set('b',2);c.set('c',3);
    expect(c.get('a')).toBeUndefined();
    expect(c.get('b')).toBe(2);
    expect(c.get('c')).toBe(3);
  });
  it('getOrSet works', async () => {
    const c = new LruTtlCache({ defaultTtlMs: 100 });
    let calls = 0;
    const v1 = await getOrSet(c, 'x', async () => { calls++; return 42; });
    const v2 = await getOrSet(c, 'x', async () => { calls++; return 43; });
    expect(v1).toBe(42);
    expect(v2).toBe(42);
    expect(calls).toBe(1);
  });
});
