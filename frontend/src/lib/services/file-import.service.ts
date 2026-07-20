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

		console.log('🔍 Importing file:', file.name);
		console.log('  Extension:', ext);
		console.log('  MIME type:', file.type);
		console.log('  Size:', file.size, 'bytes');

		// Detect if this might be an Excel file even if extension says CSV
		if (file.type && file.type.includes('spreadsheet')) {
			console.log('⚠️  File MIME type indicates spreadsheet format');
		}

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
			console.error('❌ File import error:', error);
			return {
				sheets: [],
				workbookName: file.name,
				error: `Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	private async importCSV(file: File): Promise<ImportResult> {
		console.log('📁 Importing CSV file:', file.name);
		console.log('  File type:', file.type);
		console.log('  File size:', file.size, 'bytes');

		// Read file content using FileReader for better reliability
		let content: string;
		try {
			content = await this.readFileAsText(file);
		} catch (error) {
			console.error('❌ Failed to read file:', error);
			return {
				sheets: [],
				workbookName: file.name.replace(/\.[^/.]+$/, ''),
				error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}

		console.log('✓ File read completed');
		console.log('  Content length:', content.length);
		console.log('  Content bytes:', content.split('').map((c, i) => i < 30 ? c.charCodeAt(0) : null).filter(c => c !== null));

		if (content.length === 0) {
			console.error('❌ File content is empty!');
			return {
				sheets: [],
				workbookName: file.name.replace(/\.[^/.]+$/, ''),
				error: 'File is empty - no data to parse'
			};
		}

		console.log('  First 10 chars:', JSON.stringify(content.substring(0, 10)));
		console.log('  First line:', JSON.stringify(content.split('\n')[0]));

		// Check for and remove BOM if present
		if (content.charCodeAt(0) === 0xFEFF) {
			console.log('⚠️  BOM detected, removing');
			content = content.slice(1);
		}

		// Log line breaks
		const lineCount = content.split('\n').length;
		const crlfCount = content.split('\r\n').length - 1;
		console.log('  Line breaks: LF:', lineCount - 1, '| CRLF:', crlfCount);

		// Check if content is just whitespace
		const trimmed = content.trim();
		if (trimmed.length === 0) {
			console.warn('⚠️  File content is empty or only whitespace');
			return {
				sheets: [],
				workbookName: file.name.replace(/\.[^/.]+$/, ''),
				error: 'CSV file is empty'
			};
		}

		console.log('📋 Calling csvToData()...');
		const data = spreadsheetService.csvToData(content);
		console.log('✓ Parsed CSV data:');
		console.log('  - Total rows:', data.length);
		console.log('  - First row:', JSON.stringify(data[0]));
		console.log('  - Second row:', JSON.stringify(data[1]));
		console.log('  - Third row:', JSON.stringify(data[2]));
		if (data.length > 0) {
			console.log('  - First row type:', typeof data[0]);
			console.log('  - First row is array?:', Array.isArray(data[0]));
			if (Array.isArray(data[0])) {
				console.log('  - First row cells:', data[0].length);
				console.log('  - First cell type:', typeof data[0][0]);
				console.log('  - First cell value:', JSON.stringify(data[0][0]));
			}
		}

		if (data.length === 0) {
			console.warn('⚠️  CSV parsing resulted in no rows');
			return {
				sheets: [],
				workbookName: file.name.replace(/\.[^/.]+$/, ''),
				error: 'CSV file appears to be empty after parsing'
			};
		}

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
		console.log('📊 Importing Excel file:', file.name);
		console.log('  File type:', file.type);
		console.log('  File size:', file.size, 'bytes');

		let buffer: ArrayBuffer;
		try {
			buffer = await file.arrayBuffer();
		} catch (error) {
			console.error('❌ Failed to read Excel file:', error);
			return {
				sheets: [],
				workbookName: file.name.replace(/\.[^/.]+$/, ''),
				error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}

		console.log('✓ File read as ArrayBuffer, size:', buffer.byteLength);

		let workbook;
		try {
			workbook = XLSX.read(buffer, { type: 'array' });
		} catch (error) {
			console.error('❌ Failed to parse Excel file:', error);
			return {
				sheets: [],
				workbookName: file.name.replace(/\.[^/.]+$/, ''),
				error: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}

		console.log('✓ Excel workbook parsed');
		console.log('  Sheet names:', workbook.SheetNames);

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

	private readFileAsText(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				const result = event.target?.result;
				if (typeof result === 'string') {
					resolve(result);
				} else {
					reject(new Error('FileReader did not return a string'));
				}
			};
			reader.onerror = () => {
				reject(new Error(`FileReader error: ${reader.error?.message || 'Unknown'}`));
			};
			reader.onabort = () => {
				reject(new Error('FileReader was aborted'));
			};
			reader.readAsText(file, 'UTF-8');
		});
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
