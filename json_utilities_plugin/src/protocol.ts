/** Messages exchanged between the extension host and a tool webview. */

export type Theme = 'midnight' | 'daylight' | 'slate' | 'ocean' | 'sandstone';

/** Extension host → webview. */
export type HostMessage =
	| { type: 'open'; toolId: string | null; input: string; secondaryInput?: string }
	| { type: 'setInput'; input: string }
	| { type: 'setTheme'; theme: Theme };

/** Webview → extension host. */
export type WebviewMessage =
	| { type: 'ready' }
	| { type: 'applyToEditor'; text: string }
	| { type: 'openAsNewFile'; text: string; languageId?: string }
	| { type: 'loadFromEditor' }
	| { type: 'notify'; level: 'info' | 'warn' | 'error'; message: string };
