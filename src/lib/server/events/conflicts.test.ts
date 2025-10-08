import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasConflict, validateEventData, getUserEvents } from './conflicts';
import type { ConflictCheckParams } from './conflicts';

// Mock PocketBase
const mockPocketBase = () => {
	const mockCollection = {
		getFullList: vi.fn(),
		getOne: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	};

	return {
		collection: vi.fn(() => mockCollection),
		_mockCollection: mockCollection
	};
};

describe('conflicts module', () => {
	describe('validateEventData', () => {
		it('should accept valid event data', () => {
			const start = new Date('2025-10-10T10:00:00Z');
			const end = new Date('2025-10-10T12:00:00Z');

			expect(() => {
				validateEventData({
					title: 'Test Event',
					start,
					end,
					scopeType: 'space',
					scopeId: 'space123'
				});
			}).not.toThrow();
		});

		it('should reject empty title', () => {
			const start = new Date('2025-10-10T10:00:00Z');
			const end = new Date('2025-10-10T12:00:00Z');

			expect(() => {
				validateEventData({
					title: '',
					start,
					end,
					scopeType: 'space',
					scopeId: 'space123'
				});
			}).toThrow('Event title is required');
		});

		it('should reject end before start', () => {
			const start = new Date('2025-10-10T12:00:00Z');
			const end = new Date('2025-10-10T10:00:00Z');

			expect(() => {
				validateEventData({
					title: 'Test Event',
					start,
					end,
					scopeType: 'space',
					scopeId: 'space123'
				});
			}).toThrow('Event start time must be before end time');
		});

		it('should reject non-global events without scopeId', () => {
			const start = new Date('2025-10-10T10:00:00Z');
			const end = new Date('2025-10-10T12:00:00Z');

			expect(() => {
				validateEventData({
					title: 'Test Event',
					start,
					end,
					scopeType: 'space'
				});
			}).toThrow('scopeId is required for space events');
		});

		it('should reject global events with scopeId', () => {
			const start = new Date('2025-10-10T10:00:00Z');
			const end = new Date('2025-10-10T12:00:00Z');

			expect(() => {
				validateEventData({
					title: 'Test Event',
					start,
					end,
					scopeType: 'global',
					scopeId: 'space123'
				});
			}).toThrow('scopeId should not be provided for global events');
		});

		it('should reject invalid scopeType', () => {
			const start = new Date('2025-10-10T10:00:00Z');
			const end = new Date('2025-10-10T12:00:00Z');

			expect(() => {
				validateEventData({
					title: 'Test Event',
					start,
					end,
					scopeType: 'invalid' as any,
					scopeId: 'space123'
				});
			}).toThrow('Invalid scopeType: invalid');
		});
	});

	describe('hasConflict', () => {
		let pb: any;

		beforeEach(() => {
			pb = mockPocketBase();
		});

		it('should detect overlapping events', async () => {
			pb._mockCollection.getFullList.mockResolvedValue([
				{
					id: 'event1',
					title: 'Existing Event',
					start: '2025-10-10T10:00:00Z',
					end: '2025-10-10T12:00:00Z',
					scopeType: 'space',
					scopeId: 'space123'
				}
			]);

			const result = await hasConflict(pb as any, {
				scopeType: 'space',
				scopeId: 'space123',
				start: new Date('2025-10-10T11:00:00Z'),
				end: new Date('2025-10-10T13:00:00Z')
			});

			expect(result.hasConflict).toBe(true);
			expect(result.conflictingEvents).toHaveLength(1);
		});

		it('should not detect conflicts for non-overlapping events', async () => {
			pb._mockCollection.getFullList.mockResolvedValue([]);

			const result = await hasConflict(pb as any, {
				scopeType: 'space',
				scopeId: 'space123',
				start: new Date('2025-10-10T14:00:00Z'),
				end: new Date('2025-10-10T16:00:00Z')
			});

			expect(result.hasConflict).toBe(false);
			expect(result.conflictingEvents).toBeUndefined();
		});

		it('should ignore event being updated', async () => {
			pb._mockCollection.getFullList.mockResolvedValue([]);

			const result = await hasConflict(pb as any, {
				scopeType: 'space',
				scopeId: 'space123',
				start: new Date('2025-10-10T10:00:00Z'),
				end: new Date('2025-10-10T12:00:00Z'),
				ignoreId: 'event1'
			});

			expect(result.hasConflict).toBe(false);
		});

		it('should reject invalid time range', async () => {
			await expect(
				hasConflict(pb as any, {
					scopeType: 'space',
					scopeId: 'space123',
					start: new Date('2025-10-10T12:00:00Z'),
					end: new Date('2025-10-10T10:00:00Z')
				})
			).rejects.toThrow('Event start time must be before end time');
		});
	});

	describe('getUserEvents', () => {
		let pb: any;

		beforeEach(() => {
			pb = mockPocketBase();
		});

		it('should fetch events for a user', async () => {
			const mockEvents = [
				{
					id: 'event1',
					title: 'User Event',
					start: '2025-10-10T10:00:00Z',
					end: '2025-10-10T12:00:00Z',
					scopeType: 'space',
					scopeId: 'space123',
					createdBy: 'user123'
				}
			];

			pb._mockCollection.getFullList.mockResolvedValue(mockEvents);

			const events = await getUserEvents(pb as any, 'user123');

			expect(events).toEqual(mockEvents);
			expect(pb._mockCollection.getFullList).toHaveBeenCalled();
		});

		it('should filter events by date range', async () => {
			pb._mockCollection.getFullList.mockResolvedValue([]);

			await getUserEvents(pb as any, 'user123', {
				from: new Date('2025-10-01T00:00:00Z'),
				to: new Date('2025-10-31T23:59:59Z')
			});

			expect(pb._mockCollection.getFullList).toHaveBeenCalled();
		});

		it('should filter events by scope', async () => {
			pb._mockCollection.getFullList.mockResolvedValue([]);

			await getUserEvents(pb as any, 'user123', {
				scopeType: 'space',
				scopeId: 'space123'
			});

			expect(pb._mockCollection.getFullList).toHaveBeenCalled();
		});
	});
});
