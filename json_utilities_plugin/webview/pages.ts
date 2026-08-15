/**
 * The toolkit's full-page utilities.
 *
 * These are distinct from — and richer than — the single-purpose entries in
 * `$lib/tools/registry`. `/grid`, `/visualize`, `/spreadsheet` and friends have
 * no registry equivalent at all, so the extension surfaces both catalogues:
 * pages for sustained work, registry tools for one-shot conversions.
 *
 * Each page is the same `+page.svelte` the web app routes to, imported lazily
 * so a panel only pays for the page it opens.
 */

export interface PageMetadata {
	id: string;
	name: string;
	description: string;
	/** Set when the page needs network access beyond the webview sandbox. */
	requiresBackend?: boolean;
	load: () => Promise<{ default: unknown }>;
}

export const PAGES: PageMetadata[] = [
	{
		id: 'format',
		name: 'Formatter',
		description: 'Beautify, minify and sort JSON',
		load: () => import('../../frontend/src/routes/format/+page.svelte')
	},
	{
		id: 'viewer',
		name: 'Tree Viewer',
		description: 'Interactive tree explorer',
		load: () => import('../../frontend/src/routes/viewer/+page.svelte')
	},
	{
		id: 'grid',
		name: 'Grid',
		description: 'Spreadsheet-style table view',
		load: () => import('../../frontend/src/routes/grid/+page.svelte')
	},
	{
		id: 'compare',
		name: 'JSON Diff',
		description: 'Side-by-side structural diff',
		requiresBackend: true,
		load: () => import('../../frontend/src/routes/compare/+page.svelte')
	},
	{
		id: 'text',
		name: 'Text Diff',
		description: 'Line-by-line comparison',
		load: () => import('../../frontend/src/routes/text/+page.svelte')
	},
	{
		id: 'convert',
		name: 'Convert',
		description: 'JSON ↔ YAML / CSV / XML',
		load: () => import('../../frontend/src/routes/convert/+page.svelte')
	},
	{
		id: 'lint',
		name: 'Lint',
		description: 'Validate and lint schemas',
		load: () => import('../../frontend/src/routes/lint/+page.svelte')
	},
	{
		id: 'graph',
		name: 'Graph',
		description: 'Visual structure rendering',
		load: () => import('../../frontend/src/routes/graph/+page.svelte')
	},
	{
		id: 'visualize',
		name: 'Charts',
		description: 'Intelligent data visualization',
		load: () => import('../../frontend/src/routes/visualize/+page.svelte')
	},
	{
		id: 'flow',
		name: 'Flow Diagram',
		description: 'Build and export flow diagrams',
		load: () => import('../../frontend/src/routes/flow/+page.svelte')
	},
	{
		id: 'spreadsheet',
		name: 'Spreadsheet',
		description: 'Full spreadsheet with formulas and import/export',
		load: () => import('../../frontend/src/routes/spreadsheet/+page.svelte')
	}
];

export function findPage(id: string): PageMetadata | undefined {
	return PAGES.find((page) => page.id === id);
}
