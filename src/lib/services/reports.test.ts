import { describe, it, expect, vi } from 'vitest';
import { reportContent, updateReportStatus } from './reports.js';

vi.mock('../pocketbase.js', () => {
	type Report = {
		id?: string;
		reporter?: string;
		targetType?: string;
		targetId?: string;
		reason?: string;
		status?: string;
		post?: string | null;
		comment?: string | null;
	};
	const create = vi.fn(async (data: Report) => ({ id: 'r1', ...data }));
	const getPost = vi.fn(async () => ({ id: 'p1', author: 'u2' }));
	const getComment = vi.fn(async () => ({ id: 'c1', post: 'p1', author: 'u2' }));
	const update = vi.fn(async (_id: string, data: Partial<Report>) => ({ id: 'r1', ...data }));
	const moderationLogCreate = vi.fn();
	return {
		pb: {
			authStore: { model: { id: 'user1' } },
			collection: (name: string) => {
				if (name === 'reports')
					return {
						create,
						getOne: vi.fn(async () => ({
							id: 'r1',
							targetType: 'post',
							targetId: 'p1',
							reporter: 'user1',
							post: 'p1',
							expand: {
								post: { id: 'p1', author: 'u2' }
							}
						})),
						update
					};
				if (name === 'posts') return { getOne: getPost };
				if (name === 'moderation_logs') return { create: moderationLogCreate };
				if (name === 'comments') return { getOne: getComment };
				return { getOne: vi.fn(), create: vi.fn(), update: vi.fn() };
			}
		}
	};
});

vi.mock('./permissions.js', () => ({
	canModeratePost: vi.fn(async () => true),
	canModerateComment: vi.fn(async () => true)
}));

describe('reports service', () => {
	it('creates report', async () => {
		const r = await reportContent({ targetType: 'post', targetId: 'p1', reason: 'spam' });
		expect(r.id).toBe('r1');
		expect(r.reason).toBe('spam');
		expect(r.post).toBe('p1');
	});
	it('updates report status', async () => {
		const updated = await updateReportStatus('r1', 'resolved');
		expect(updated.status).toBe('resolved');
	});
});
