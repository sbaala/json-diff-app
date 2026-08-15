import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

/** The SvelteKit app whose components this extension reuses verbatim. */
const frontendSrc = path.resolve(here, '../frontend/src');

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			// Reuse the toolkit's components/services/registry as-is. Nothing is
			// copied, so the extension can never drift from the web app.
			$lib: path.join(frontendSrc, 'lib'),
			// Two files in the reused tree touch SvelteKit: `$lib/stores/theme.ts`
			// needs `browser`, and the /visualize page reads the `page` store.
			// Small shims stand in for both.
			'$app/environment': path.join(here, 'webview/shims/app-environment.ts'),
			'$app/stores': path.join(here, 'webview/shims/app-stores.ts')
		}
	},
	build: {
		outDir: 'dist/webview',
		emptyOutDir: true,
		// A VS Code webview loads assets over vscode-resource:// with a strict
		// CSP, so everything must resolve to predictable local filenames.
		rollupOptions: {
			input: path.join(here, 'webview/main.ts'),
			output: {
				entryFileNames: 'main.js',
				assetFileNames: 'main.[ext]',
				// Tools are lazily imported by loader.ts; inlining them keeps the
				// webview to two files and avoids per-chunk CSP nonce plumbing.
				manualChunks: undefined,
				inlineDynamicImports: true
			}
		}
	}
});
