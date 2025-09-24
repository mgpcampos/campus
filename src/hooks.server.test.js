import { describe, it, expect } from 'vitest';
// Using relative import because $lib alias resolution not active in this isolated test context
import { rateLimit } from './lib/utils/rate-limit.js';

describe('rateLimit (hooks server duplicate)', () => {
  it('allows initial bursts within token limit and then blocks', () => {
    const ip = '127.0.0.1-test';
    let allowed = 0;
    for (let i = 0; i < 35; i++) {
      if (rateLimit(ip)) allowed++;
    }
    // Should allow up to 30 tokens
    expect(allowed).toBeGreaterThanOrEqual(28);
    expect(allowed).toBeLessThanOrEqual(30);
  });
});
