export interface KeyboardShortcut {
	key: string;
	ctrlKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
	metaKey?: boolean;
	handler: () => void;
}

export class KeyboardShortcutsService {
	private shortcuts: KeyboardShortcut[] = [];
	private listening = false;

	register(shortcuts: KeyboardShortcut[]): void {
		this.shortcuts.push(...shortcuts);
	}

	startListening(): void {
		if (this.listening) return;
		this.listening = true;

		window.addEventListener('keydown', this.handleKeydown.bind(this));
	}

	stopListening(): void {
		if (!this.listening) return;
		this.listening = false;

		window.removeEventListener('keydown', this.handleKeydown.bind(this));
	}

	private handleKeydown(event: KeyboardEvent): void {
		for (const shortcut of this.shortcuts) {
			if (
				event.key === shortcut.key &&
				event.ctrlKey === (shortcut.ctrlKey ?? false) &&
				event.shiftKey === (shortcut.shiftKey ?? false) &&
				event.altKey === (shortcut.altKey ?? false) &&
				event.metaKey === (shortcut.metaKey ?? false)
			) {
				event.preventDefault();
				shortcut.handler();
				return;
			}
		}
	}

	clear(): void {
		this.shortcuts = [];
		this.stopListening();
	}

	static getSpreadsheetShortcuts(handlers: {
		undo: () => void;
		redo: () => void;
		bold: () => void;
		italic: () => void;
		copy: () => void;
		paste: () => void;
		cut: () => void;
	}): KeyboardShortcut[] {
		const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac');
		const ctrl = isMac ? 'metaKey' : 'ctrlKey';

		return [
			{ key: 'z', [ctrl]: true, handler: handlers.undo },
			{ key: 'y', [ctrl]: true, handler: handlers.redo },
			{ key: 'z', [ctrl]: true, shiftKey: true, handler: handlers.redo },
			{ key: 'b', [ctrl]: true, handler: handlers.bold },
			{ key: 'i', [ctrl]: true, handler: handlers.italic },
			{ key: 'c', [ctrl]: true, handler: handlers.copy },
			{ key: 'v', [ctrl]: true, handler: handlers.paste },
			{ key: 'x', [ctrl]: true, handler: handlers.cut }
		];
	}
}

export const keyboardShortcutsService = new KeyboardShortcutsService();
