// Test environment mock for SvelteKit's $app/environment module
// We explicitly mark browser=false so pocketbase.js avoids client-only behavior during tests
export const browser = false;
