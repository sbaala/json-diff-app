/** Typed access to the webview↔host channel. */

export type Theme = 'midnight' | 'daylight' | 'slate' | 'ocean' | 'sandstone';

export type HostMessage =
	| { type: 'open'; toolId: string | null; input: string; secondaryInput?: string }
	| { type: 'setInput'; input: string }
	| { type: 'setTheme'; theme: Theme };

export type WebviewMessage =
	| { type: 'ready' }
	| { type: 'applyToEditor'; text: string }
	| { type: 'openAsNewFile'; text: string; languageId?: string }
	| { type: 'loadFromEditor' }
	| { type: 'notify'; level: 'info' | 'warn' | 'error'; message: string };

interface VsCodeApi {
	postMessage(message: WebviewMessage): void;
	getState(): unknown;
	setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

// `acquireVsCodeApi` may only be called once per webview.
const api = acquireVsCodeApi();

export function post(message: WebviewMessage): void {
	api.postMessage(message);
}

export function onHostMessage(handler: (message: HostMessage) => void): () => void {
	const listener = (event: MessageEvent<HostMessage>) => handler(event.data);
	window.addEventListener('message', listener);
	return () => window.removeEventListener('message', listener);
}
