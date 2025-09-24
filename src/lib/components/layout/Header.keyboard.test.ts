import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Header from './Header.svelte';

// Mock currentUser store minimal
vi.mock('$lib/pocketbase.js', async () => {
  return await import('../../pocketbase.mock.js');
});

vi.mock('$app/stores', async () => {
  const { readable } = await import('svelte/store');
  return {
    page: readable({ url: new URL('http://localhost/') })
  };
});

describe('Header keyboard navigation', () => {
  it('opens mobile menu moves focus then Escape closes and restores focus', async () => {
    const { container } = render(Header, { props: { id: 'navigation' } });
    const getToggle = () => container.querySelector('button[aria-controls="mobile-menu"]') as HTMLElement | null;
    await waitFor(() => expect(getToggle()).toBeTruthy());
    const toggle = getToggle()!;
    toggle.click();
    const firstLink = () => container.querySelector('#mobile-menu a') as HTMLElement | null;
    await waitFor(() => {
      expect(firstLink()).toBeTruthy();
      expect(firstLink()).toHaveFocus();
    });
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(container.querySelector('#mobile-menu')).toBeNull();
      expect(toggle).toHaveFocus();
    });
  });
});
