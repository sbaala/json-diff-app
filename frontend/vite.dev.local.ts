import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Throwaway dev config: same as vite.config.ts but points the Vite cache dir
// at a writable location, because node_modules/.vite is owned by root here.
export default defineConfig({
	plugins: [sveltekit()],
	cacheDir: '.vite-cache-local',
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:8000',
				changeOrigin: true
			}
		}
	}
});
