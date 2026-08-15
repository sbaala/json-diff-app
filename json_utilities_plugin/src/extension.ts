import * as vscode from 'vscode';
import { pickComparisonText, readActiveEditorText } from './editor';
import { ToolPanel } from './panel';
import { TOOL_CATEGORIES, TOOLS } from '../../frontend/src/lib/tools/registry';

/**
 * The toolkit's full-page utilities. Kept in step with `webview/pages.ts`,
 * which owns the lazy imports; the host only needs ids and labels.
 */
const PAGES: { id: string; name: string; description: string }[] = [
	{ id: 'format', name: 'Formatter', description: 'Beautify, minify and sort JSON' },
	{ id: 'viewer', name: 'Tree Viewer', description: 'Interactive tree explorer' },
	{ id: 'grid', name: 'Grid', description: 'Spreadsheet-style table view' },
	{ id: 'compare', name: 'JSON Diff', description: 'Side-by-side structural diff' },
	{ id: 'text', name: 'Text Diff', description: 'Line-by-line comparison' },
	{ id: 'convert', name: 'Convert', description: 'JSON ↔ YAML / CSV / XML' },
	{ id: 'lint', name: 'Lint', description: 'Validate and lint schemas' },
	{ id: 'graph', name: 'Graph', description: 'Visual structure rendering' },
	{ id: 'visualize', name: 'Charts', description: 'Intelligent data visualization' },
	{ id: 'flow', name: 'Flow Diagram', description: 'Build and export flow diagrams' },
	{ id: 'spreadsheet', name: 'Spreadsheet', description: 'Formulas and import/export' }
];

/** Honour the setting that decides whether tools open pre-filled. */
function seedInput(): string {
	const enabled = vscode.workspace
		.getConfiguration('vinmiTools')
		.get<boolean>('loadSelectionOnOpen', true);
	return enabled ? readActiveEditorText() : '';
}

/** Quick pick across the whole toolkit, grouped by category. */
async function promptForTool(): Promise<string | undefined> {
	type Item = vscode.QuickPickItem & { toolId?: string };

	const items: Item[] = [
		{ label: 'Pages', kind: vscode.QuickPickItemKind.Separator },
		...PAGES.map((page) => ({
			label: page.name,
			detail: page.description,
			toolId: page.id
		}))
	];

	for (const [categoryId, category] of Object.entries(TOOL_CATEGORIES)) {
		const inCategory = TOOLS.filter((tool) => tool.category === categoryId);
		if (!inCategory.length) continue;

		items.push({ label: category.name, kind: vscode.QuickPickItemKind.Separator });
		for (const tool of inCategory) {
			items.push({
				label: tool.name,
				description: tool.keywords.slice(0, 4).join(', '),
				detail: tool.description,
				toolId: tool.id
			});
		}
	}

	const picked = await vscode.window.showQuickPick(items, {
		title: `VinMi Tools — ${PAGES.length} pages, ${TOOLS.length} utilities`,
		placeHolder: 'Search by name, description, or keyword',
		matchOnDescription: true,
		matchOnDetail: true
	});

	return picked?.toolId;
}

export function activate(context: vscode.ExtensionContext): void {
	const { extensionUri } = context;

	/** Register a command that opens one specific tool, seeded from the editor. */
	const openTool = (command: string, toolId: string | null) =>
		vscode.commands.registerCommand(command, () =>
			ToolPanel.show(extensionUri, toolId, seedInput())
		);

	context.subscriptions.push(
		openTool('vinmiTools.openDashboard', null),

		// The headline commands open the full pages, which are richer than the
		// same-named single-purpose registry tools.
		openTool('vinmiTools.format', 'format'),
		openTool('vinmiTools.viewer', 'viewer'),
		openTool('vinmiTools.grid', 'grid'),
		openTool('vinmiTools.visualize', 'visualize'),
		openTool('vinmiTools.graph', 'graph'),
		openTool('vinmiTools.convert', 'convert'),
		openTool('vinmiTools.lint', 'lint'),
		openTool('vinmiTools.textDiff', 'text'),
		openTool('vinmiTools.flow', 'flow'),
		openTool('vinmiTools.spreadsheet', 'spreadsheet'),

		// No page equivalent — this one stays a registry tool.
		openTool('vinmiTools.validate', 'json-validator'),

		vscode.commands.registerCommand('vinmiTools.runTool', async () => {
			const toolId = await promptForTool();
			if (toolId) ToolPanel.show(extensionUri, toolId, seedInput());
		}),

		vscode.commands.registerCommand('vinmiTools.compare', async () => {
			const left = readActiveEditorText();
			const right = await pickComparisonText();
			if (right === undefined) return;
			// The offline comparator, so a diff works without the API.
			ToolPanel.show(extensionUri, 'json-comparator', left, right);
		})
	);
}

export function deactivate(): void {
	// The panel disposes itself through the subscriptions above.
}
