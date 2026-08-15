/**
 * Stand-in for SvelteKit's `$app/environment`, the only SvelteKit module the
 * reused toolkit imports (from `$lib/stores/theme.ts`). A webview is always a
 * live browser context, so these constants are fixed.
 */
export const browser = true;
export const dev = false;
export const building = false;
export const version = '0.0.0';
