import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// Same escape hatch as SVELTEKIT_OUTDIR in svelte.config.js: lets tooling
	// avoid root-owned caches left by a dev server started with sudo.
	cacheDir: process.env.VITE_CACHE_DIR ?? 'node_modules/.vite',
	plugins: [sveltekit(), svelteTesting()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./vitest-setup.ts']
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:8000',
				changeOrigin: true
			}
		}
	}
});
