/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />

// Axe-core injection for accessibility tests
import 'axe-core/axe.min.js';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Global env mock for tests referencing PocketBase URL
vi.mock('$env/static/public', () => ({ PUBLIC_POCKETBASE_URL: 'http://127.0.0.1:8090' }));
