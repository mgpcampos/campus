import { describe, it, expect } from 'vitest';
import { createGroupSchema } from './group.js';

describe('createGroupSchema', () => {
  it('validates correct data', () => {
    const parsed = createGroupSchema.parse({ name: 'Study Group', isPublic: true });
    expect(parsed.name).toBe('Study Group');
  });
  it('rejects short name', () => {
    expect(() => createGroupSchema.parse({ name: 'A', isPublic: true })).toThrow();
  });
  it('limits description length', () => {
    const longDesc = 'x'.repeat(600);
    expect(() => createGroupSchema.parse({ name: 'Group', description: longDesc, isPublic: true })).toThrow();
  });
});
