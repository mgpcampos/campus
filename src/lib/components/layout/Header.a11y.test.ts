import { render } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Header from './Header.svelte';
import axe from 'axe-core';

// Mock env and pocketbase early
vi.mock('$lib/pocketbase.js', async () => {
	return await import('../../pocketbase.mock.js');
});
import type { AxeResults, Result } from 'axe-core';

async function runAxe(container: HTMLElement): Promise<AxeResults> {
	return await axe.run(container, { rules: { 'color-contrast': { enabled: true } } });
}

describe('Header accessibility', () => {
	it('has no critical axe violations (basic smoke)', async () => {
		const { container } = render(Header, { props: { id: 'navigation' } });
		const results = await runAxe(container);
		const critical = results.violations.filter((v: Result) => v.impact === 'critical');
		expect(critical).toHaveLength(0);
	});
});
