import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCollection = {
  create: vi.fn(),
  getList: vi.fn(),
  delete: vi.fn()
};

vi.mock('../pocketbase.js', () => ({
  pb: {
    authStore: { model: { id: 'user123' } },
    collection: vi.fn(() => mockCollection)
  }
}));

import { joinSpace, leaveSpace, isMember, getMembershipRole } from './memberships.js';

describe('Memberships Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('joinSpace creates membership', async () => {
    mockCollection.create.mockResolvedValue({ id: 'mem1' });
    const result = await joinSpace('space1');
    expect(mockCollection.create).toHaveBeenCalledWith({ space: 'space1', user: 'user123', role: 'member' });
    expect(result).toEqual({ id: 'mem1' });
  });

  it('leaveSpace deletes membership', async () => {
    mockCollection.getList.mockResolvedValue({ items: [{ id: 'mem1' }] });
    mockCollection.delete.mockResolvedValue(true);
    const result = await leaveSpace('space1');
    expect(mockCollection.delete).toHaveBeenCalledWith('mem1');
    expect(result).toBe(true);
  });

  it('isMember returns true when membership exists', async () => {
    mockCollection.getList.mockResolvedValue({ items: [{ id: 'mem1', role: 'member' }] });
    const result = await isMember('space1');
    expect(result).toBe(true);
  });

  it('getMembershipRole returns role', async () => {
    mockCollection.getList.mockResolvedValue({ items: [{ id: 'mem1', role: 'moderator' }] });
    const result = await getMembershipRole('space1');
    expect(result).toBe('moderator');
  });
});
