import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// A dev server accidentally started with sudo leaves root-owned files in
		// the default outDir; the override lets tooling run against a clean dir.
		outDir: process.env.SVELTEKIT_OUTDIR ?? '.svelte-kit',
		alias: {
			$lib: './src/lib',
			$components: './src/lib/components'
		}
	}
};

export default config;
