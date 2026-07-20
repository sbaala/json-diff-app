import type { Workbook } from '$lib/stores/spreadsheet.store';

const STORAGE_KEY = 'spreadsheet_workbooks';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
const WARN_STORAGE_SIZE = 3 * 1024 * 1024; // 3MB (60%)

interface StorageData {
	version: string;
	spreadsheets: Workbook[];
}

export class SpreadsheetStorageService {
	private debounceTimer: NodeJS.Timeout | null = null;

	getStorageUsage(): { used: number; percentage: number } {
		if (typeof localStorage === 'undefined') return { used: 0, percentage: 0 };

		let used = 0;
		for (const key in localStorage) {
			if (localStorage.hasOwnProperty(key)) {
				used += localStorage[key].length + key.length;
			}
		}
		return { used, percentage: (used / MAX_STORAGE_SIZE) * 100 };
	}

	loadWorkbooks(): Workbook[] {
		if (typeof localStorage === 'undefined') return [];

		try {
			const data = localStorage.getItem(STORAGE_KEY);
			if (!data) return [];

			const parsed: StorageData = JSON.parse(data);
			if (parsed.version !== '1.0') {
				console.warn('Unknown storage version:', parsed.version);
				return [];
			}

			return parsed.spreadsheets || [];
		} catch (error) {
			console.error('Failed to load workbooks from storage:', error);
			return [];
		}
	}

	loadWorkbook(id: string): Workbook | null {
		const workbooks = this.loadWorkbooks();
		return workbooks.find((wb) => wb.id === id) || null;
	}

	saveWorkbook(workbook: Workbook): boolean {
		if (typeof localStorage === 'undefined') {
			console.warn('localStorage not available');
			return false;
		}

		try {
			const workbooks = this.loadWorkbooks();
			const index = workbooks.findIndex((wb) => wb.id === workbook.id);

			if (index >= 0) {
				workbooks[index] = workbook;
			} else {
				workbooks.push(workbook);
			}

			const data: StorageData = { version: '1.0', spreadsheets: workbooks };
			const serialized = JSON.stringify(data);

			const { used: currentUsed } = this.getStorageUsage();
			const newSize = currentUsed + serialized.length;

			if (newSize > MAX_STORAGE_SIZE) {
				console.warn('Storage quota exceeded (>5MB)');
				return false;
			}

			if (newSize > WARN_STORAGE_SIZE) {
				console.warn(`Storage usage high: ${((newSize / MAX_STORAGE_SIZE) * 100).toFixed(1)}%`);
			}

			localStorage.setItem(STORAGE_KEY, serialized);
			return true;
		} catch (error) {
			console.error('Failed to save workbook to storage:', error);
			if (error instanceof Error && error.name === 'QuotaExceededError') {
				console.warn('localStorage quota exceeded');
			}
			return false;
		}
	}

	deleteWorkbook(id: string): boolean {
		if (typeof localStorage === 'undefined') return false;

		try {
			const workbooks = this.loadWorkbooks();
			const filtered = workbooks.filter((wb) => wb.id !== id);

			if (filtered.length === workbooks.length) return false;

			const data: StorageData = { version: '1.0', spreadsheets: filtered };
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
			return true;
		} catch (error) {
			console.error('Failed to delete workbook from storage:', error);
			return false;
		}
	}

	clearAll(): void {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (error) {
			console.error('Failed to clear storage:', error);
		}
	}

	autoSave(workbook: Workbook, callback?: (success: boolean) => void): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			const success = this.saveWorkbook(workbook);
			callback?.(success);
		}, 2000); // 2 second debounce
	}
}

export const spreadsheetStorageService = new SpreadsheetStorageService();
