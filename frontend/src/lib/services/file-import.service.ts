import * as XLSX from 'xlsx';
import { spreadsheetService } from './spreadsheet.service';
import type { Sheet } from '$lib/stores/spreadsheet.store';

export interface ImportResult {
	sheets: Sheet[];
	workbookName: string;
	error?: string;
}

export class FileImportService {
	async importFile(file: File): Promise<ImportResult> {
		const ext = file.name.split('.').pop()?.toLowerCase();

		try {
			if (ext === 'csv') {
				return this.importCSV(file);
			} else if (ext === 'json') {
				return this.importJSON(file);
			} else if (ext === 'xlsx' || ext === 'xls') {
				return this.importExcel(file);
			} else {
				return {
					sheets: [],
					workbookName: file.name,
					error: 'Unsupported file format. Please use CSV, JSON, XLSX, or XLS.'
				};
			}
		} catch (error) {
			console.error('File import error:', error);
			return {
				sheets: [],
				workbookName: file.name,
				error: `Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	private async importCSV(file: File): Promise<ImportResult> {
		const content = await file.text();
		const data = spreadsheetService.csvToData(content);

		const sheet: Sheet = {
			sheetId: this.generateId(),
			sheetName: file.name.replace(/\.csv$/i, ''),
			data,
			settings: this.defaultSheetSettings()
		};

		return {
			sheets: [sheet],
			workbookName: file.name.replace(/\.[^/.]+$/, '')
		};
	}

	private async importJSON(file: File): Promise<ImportResult> {
		const content = await file.text();
		const parsed = JSON.parse(content);

		let data: unknown[][] = [];

		if (Array.isArray(parsed)) {
			if (parsed.length === 0) {
				data = [];
			} else if (typeof parsed[0] === 'object' && parsed[0] !== null) {
				// Array of objects - convert to tabular format
				const headers = Object.keys(parsed[0]);
				data = [
					headers,
					...parsed.map((obj: any) => headers.map((h) => obj[h] ?? ''))
				];
			} else {
				// Array of primitives or mixed
				data = parsed.map((item) => [item]);
			}
		} else if (typeof parsed === 'object' && parsed !== null) {
			// Single object - convert to key-value pairs
			const entries = Object.entries(parsed);
			data = [['Key', 'Value'], ...entries];
		} else {
			data = [[parsed]];
		}

		const sheet: Sheet = {
			sheetId: this.generateId(),
			sheetName: file.name.replace(/\.json$/i, ''),
			data,
			settings: this.defaultSheetSettings()
		};

		return {
			sheets: [sheet],
			workbookName: file.name.replace(/\.[^/.]+$/, '')
		};
	}

	private async importExcel(file: File): Promise<ImportResult> {
		const buffer = await file.arrayBuffer();
		const workbook = XLSX.read(buffer, { type: 'array' });

		const sheets: Sheet[] = workbook.SheetNames.map((sheetName) => {
			const worksheet = workbook.Sheets[sheetName];
			const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

			return {
				sheetId: this.generateId(),
				sheetName,
				data: data as unknown[][],
				settings: this.defaultSheetSettings()
			};
		});

		return {
			sheets,
			workbookName: file.name.replace(/\.[^/.]+$/, '')
		};
	}

	async importFromText(text: string, format: 'csv' | 'json' = 'csv'): Promise<ImportResult> {
		try {
			let data: unknown[][];

			if (format === 'csv') {
				data = spreadsheetService.csvToData(text);
			} else {
				const parsed = JSON.parse(text);
				if (Array.isArray(parsed)) {
					data = parsed;
				} else {
					data = [Object.entries(parsed)];
				}
			}

			const sheet: Sheet = {
				sheetId: this.generateId(),
				sheetName: 'Pasted Data',
				data,
				settings: this.defaultSheetSettings()
			};

			return {
				sheets: [sheet],
				workbookName: 'Pasted Data'
			};
		} catch (error) {
			return {
				sheets: [],
				workbookName: 'Pasted Data',
				error: `Failed to parse data: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	private defaultSheetSettings() {
		return {
			formulas: {},
			columnWidths: {},
			merged: [],
			formatting: {},
			hiddenColumns: [],
			hiddenRows: []
		};
	}

	private generateId(): string {
		return crypto.randomUUID
			? crypto.randomUUID()
			: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
					const r = (Math.random() * 16) | 0;
					const v = c === 'x' ? r : (r & 0x3) | 0x8;
					return v.toString(16);
				});
	}
}

export const fileImportService = new FileImportService();
