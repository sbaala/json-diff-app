import * as vscode from 'vscode';

/**
 * Text the user most likely wants to work on: the selection when there is one,
 * otherwise the whole active document.
 */
export function readActiveEditorText(): string {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return '';

	const selection = editor.selection;
	return selection.isEmpty
		? editor.document.getText()
		: editor.document.getText(selection);
}

/**
 * Write text back over whatever `readActiveEditorText` would have read, so a
 * round trip through a tool replaces exactly the range it came from.
 */
export async function applyToActiveEditor(text: string): Promise<boolean> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showWarningMessage('VinMi Tools: no active editor to write to.');
		return false;
	}

	const document = editor.document;
	const target = editor.selection.isEmpty
		? new vscode.Range(
				document.positionAt(0),
				document.positionAt(document.getText().length)
			)
		: editor.selection;

	const applied = await editor.edit((builder) => builder.replace(target, text));
	if (!applied) {
		vscode.window.showErrorMessage('VinMi Tools: could not apply the edit.');
	}
	return applied;
}

/** Open text in a new untitled editor, leaving the user's files untouched. */
export async function openAsNewFile(text: string, languageId = 'json'): Promise<void> {
	const document = await vscode.workspace.openTextDocument({
		content: text,
		language: languageId
	});
	await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
}

/**
 * Ask the user for a second JSON file to compare against, preferring other
 * files already open so the common case is one keystroke.
 */
export async function pickComparisonText(): Promise<string | undefined> {
	const openDocuments = vscode.workspace.textDocuments.filter(
		(doc) =>
			!doc.isUntitled &&
			doc.uri.scheme === 'file' &&
			doc !== vscode.window.activeTextEditor?.document
	);

	type Item = vscode.QuickPickItem & { document?: vscode.TextDocument; browse?: boolean };

	const items: Item[] = openDocuments.map((doc) => ({
		label: vscode.workspace.asRelativePath(doc.uri),
		description: 'open editor',
		document: doc
	}));
	items.push({ label: '$(folder-opened) Choose a file…', browse: true });

	const picked = await vscode.window.showQuickPick(items, {
		title: 'Compare against',
		placeHolder: 'Select the file to compare with'
	});
	if (!picked) return undefined;

	if (picked.document) return picked.document.getText();

	const uris = await vscode.window.showOpenDialog({
		canSelectMany: false,
		openLabel: 'Compare',
		filters: { JSON: ['json', 'jsonc'], 'All files': ['*'] }
	});
	if (!uris?.length) return undefined;

	const bytes = await vscode.workspace.fs.readFile(uris[0]);
	return Buffer.from(bytes).toString('utf8');
}
