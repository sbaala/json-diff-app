import { readable } from 'svelte/store';

/**
 * Stand-in for SvelteKit's `$app/stores`.
 *
 * A webview has no router, so `page` is a fixed snapshot. The only consumer in
 * the reused tree is `/visualize`, which reads `$page.url.searchParams` to
 * preselect a chart — absent those params it falls back to auto-detection,
 * which is the behaviour we want when the page is opened from a command.
 */
export const page = readable({
	url: new URL('https://vinmi.local/'),
	params: {} as Record<string, string>,
	route: { id: null as string | null },
	status: 200,
	error: null as Error | null,
	data: {} as Record<string, unknown>,
	form: undefined as unknown
});

export const navigating = readable(null);
export const updated = Object.assign(readable(false), { check: async () => false });
