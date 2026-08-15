import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Shared by the Vite build and svelte-check. Deliberately minimal: this is a
 * plain Svelte app (no SvelteKit), because a VS Code webview does its own
 * routing and asset loading.
 */
export default {
	preprocess: vitePreprocess()
};
