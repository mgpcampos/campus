import { describe, it, expect } from 'vitest';
import { createGroupSchema } from './group.js';

describe('createGroupSchema', () => {
	it('validates correct data', () => {
		const parsed = createGroupSchema.parse({
			space: 'space123',
			name: 'Study Group',
			isPublic: true
		});
		expect(parsed.name).toBe('Study Group');
	});
	it('rejects short name', () => {
		expect(() =>
			createGroupSchema.parse({ space: 'space123', name: 'A', isPublic: true })
		).toThrow();
	});
	it('limits description length', () => {
		const longDesc = 'x'.repeat(1100);
		expect(() =>
			createGroupSchema.parse({
				space: 'space123',
				name: 'Group',
				description: longDesc,
				isPublic: true
			})
		).toThrow();
	});
});
