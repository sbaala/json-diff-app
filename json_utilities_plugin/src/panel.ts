import * as vscode from 'vscode';
import { applyToActiveEditor, openAsNewFile, readActiveEditorText } from './editor';
import type { HostMessage, Theme, WebviewMessage } from './protocol';

const VIEW_TYPE = 'vinmiTools.panel';
const THEMES: readonly Theme[] = ['midnight', 'daylight', 'slate', 'ocean', 'sandstone'];

/** Resolve the configured theme, falling back to the active VS Code theme kind. */
function resolveTheme(): Theme {
	const configured = vscode.workspace
		.getConfiguration('vinmiTools')
		.get<string>('theme', 'auto');

	if (configured !== 'auto' && THEMES.includes(configured as Theme)) {
		return configured as Theme;
	}

	const kind = vscode.window.activeColorTheme.kind;
	const isLight =
		kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight;
	return isLight ? 'daylight' : 'midnight';
}

function makeNonce(): string {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let text = '';
	for (let i = 0; i < 32; i++) {
		text += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
	}
	return text;
}

/**
 * A single reusable tool panel. Opening another tool reuses the same webview
 * rather than stacking panels, which matches how the web app navigates.
 */
export class ToolPanel {
	private static current: ToolPanel | undefined;

	private readonly disposables: vscode.Disposable[] = [];
	private ready = false;
	private pending: HostMessage[] = [];

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri
	) {
		this.panel.webview.html = this.render();

		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

		this.panel.webview.onDidReceiveMessage(
			(message: WebviewMessage) => this.handleMessage(message),
			null,
			this.disposables
		);

		// Keep panel chrome in step with the editor when the theme is on `auto`.
		vscode.window.onDidChangeActiveColorTheme(
			() => this.post({ type: 'setTheme', theme: resolveTheme() }),
			null,
			this.disposables
		);

		vscode.workspace.onDidChangeConfiguration(
			(event) => {
				if (event.affectsConfiguration('vinmiTools.theme')) {
					this.post({ type: 'setTheme', theme: resolveTheme() });
				}
			},
			null,
			this.disposables
		);
	}

	/**
	 * Show `toolId` (or the dashboard when null), reusing the existing panel.
	 * `input` seeds the tool's first text area.
	 */
	static show(
		extensionUri: vscode.Uri,
		toolId: string | null,
		input: string,
		secondaryInput?: string
	): void {
		const column = vscode.window.activeTextEditor
			? vscode.ViewColumn.Beside
			: vscode.ViewColumn.One;

		if (ToolPanel.current) {
			ToolPanel.current.panel.reveal(column, true);
			ToolPanel.current.post({ type: 'open', toolId, input, secondaryInput });
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			VIEW_TYPE,
			'VinMi Tools',
			{ viewColumn: column, preserveFocus: true },
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview')]
			}
		);

		// The two SVGs are the same VinMi tile tuned for dark vs. light chrome;
		// VS Code swaps between them as the editor theme changes.
		panel.iconPath = {
			light: vscode.Uri.joinPath(extensionUri, 'media', 'tab-icon-light.svg'),
			dark: vscode.Uri.joinPath(extensionUri, 'media', 'tab-icon-dark.svg')
		};

		ToolPanel.current = new ToolPanel(panel, extensionUri);
		ToolPanel.current.post({ type: 'open', toolId, input, secondaryInput });
	}

	/** Queue messages until the webview signals it has mounted. */
	private post(message: HostMessage): void {
		if (this.ready) {
			void this.panel.webview.postMessage(message);
		} else {
			this.pending.push(message);
		}
	}

	private async handleMessage(message: WebviewMessage): Promise<void> {
		switch (message.type) {
			case 'ready': {
				this.ready = true;
				this.post({ type: 'setTheme', theme: resolveTheme() });
				const queued = this.pending;
				this.pending = [];
				for (const queuedMessage of queued) {
					await this.panel.webview.postMessage(queuedMessage);
				}
				break;
			}

			case 'applyToEditor':
				await applyToActiveEditor(message.text);
				break;

			case 'openAsNewFile':
				await openAsNewFile(message.text, message.languageId);
				break;

			case 'loadFromEditor':
				this.post({ type: 'setInput', input: readActiveEditorText() });
				break;

			case 'notify': {
				const show = {
					info: vscode.window.showInformationMessage,
					warn: vscode.window.showWarningMessage,
					error: vscode.window.showErrorMessage
				}[message.level];
				void show(`VinMi Tools: ${message.message}`);
				break;
			}
		}
	}

	private render(): string {
		const webview = this.panel.webview;
		const assets = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview');
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(assets, 'main.js'));
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(assets, 'main.css'));
		const nonce = makeNonce();

		// Svelte writes component styles into a stylesheet, but a handful of
		// reused components set `style="…"` attributes, so inline styles stay
		// allowed while scripts remain nonce-locked.
		const csp = [
			"default-src 'none'",
			`img-src ${webview.cspSource} data: blob:`,
			`font-src ${webview.cspSource}`,
			`style-src ${webview.cspSource} 'unsafe-inline'`,
			`script-src 'nonce-${nonce}'`,
			// The JSON Diff page computes its comparison on the VinMi API; every
			// other page and tool runs entirely in the webview.
			'connect-src https://json-diff-api-933362628329.us-east1.run.app'
		].join('; ');

		return `<!DOCTYPE html>
<html lang="en" data-theme="${resolveTheme()}">
<head>
	<meta charset="UTF-8" />
	<meta http-equiv="Content-Security-Policy" content="${csp}" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<link rel="stylesheet" href="${styleUri}" />
	<title>VinMi Tools</title>
</head>
<body>
	<div id="app"></div>
	<script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}

	private dispose(): void {
		ToolPanel.current = undefined;
		this.panel.dispose();
		while (this.disposables.length) {
			this.disposables.pop()?.dispose();
		}
	}
}
