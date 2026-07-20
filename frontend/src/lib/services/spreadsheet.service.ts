import type Handsontable from 'handsontable';
import HyperFormula from 'hyperformula';
import Papa from 'papaparse';

export interface HandsontableConfig {
	rowHeaders: boolean;
	colHeaders: boolean;
	undo: boolean;
	redo: boolean;
	allowInsertRow: boolean;
	allowInsertColumn: boolean;
	contextMenu: string[];
	mergeCells: boolean;
	autoWrapRow: boolean;
	autoWrapColumn: boolean;
	outsideClickDeselects: boolean;
	licenseKey: string;
	formulas?: {
		engine: any;
	};
	hiddenColumns?: {
		columns: number[];
	};
	hiddenRows?: {
		rows: number[];
	};
}

export class SpreadsheetService {
	getDefaultConfig(): any {
		return {
			rowHeaders: true,
			colHeaders: true,
			undo: true,
			redo: true,
			allowInsertRow: true,
			allowInsertColumn: true,
			contextMenu: [
				'row_above',
				'row_below',
				'remove_row',
				'col_left',
				'col_right',
				'remove_column',
				'undo',
				'redo',
				'---------',
				'copy',
				'cut',
				'paste'
			],
			mergeCells: true,
			autoWrapRow: true,
			autoWrapColumn: true,
			outsideClickDeselects: false,
			licenseKey: 'non-commercial-and-evaluation',
			// Formula configuration - use actual HyperFormula instance
			formulas: {
				engine: HyperFormula
			},
			// Column/row visibility
			hiddenColumns: {
				columns: [],
				indicators: true
			},
			hiddenRows: {
				rows: [],
				indicators: true
			},
			// Cell properties
			cell: [
				{
					row: 0,
					col: 0,
					readOnly: false
				}
			],
			// Cells type
			type: 'text',
			// Rendering
			renderer: 'base',
			// Allow all features
			allowInvalid: false,
			copyPaste: {
				pasteMode: 'overwrite'
			}
		};
	}

	parseCSV(csvText: string): string[][] {
		console.log('Parsing CSV - input length:', csvText.length);

		// Parse CSV using Papa.parse
		const result = Papa.parse(csvText, {
			header: false,
			dynamicTyping: false,
			skipEmptyLines: false
		});

		console.log('Papa.parse result:', {
			dataLength: result.data.length,
			errorCount: result.errors.length,
			errors: result.errors
		});

		if (result.errors && result.errors.length > 0) {
			console.error('Papa.parse errors:', result.errors);
		}

		// Log sample rows
		for (let i = 0; i < Math.min(5, result.data.length); i++) {
			console.log(`  Row ${i}:`, result.data[i]);
		}

		if (result.data.length === 0) {
			console.warn('⚠️  Papa.parse returned empty data');
			return [];
		}

		// Return data as-is; Papa.parse handles the structure
		return result.data as string[][];
	}

	csvToData(csvText: string): unknown[][] {
		const rows = this.parseCSV(csvText);
		return rows.map((row) =>
			row.map((cell) => {
				const str = String(cell).trim();
				if (str === '') return '';
				if (str.toLowerCase() === 'true') return true;
				if (str.toLowerCase() === 'false') return false;
				if (str.toLowerCase() === 'null') return null;
				const num = parseFloat(str);
				if (!isNaN(num)) return num;
				return str;
			})
		);
	}

	dataToCSV(data: unknown[][]): string {
		return data
			.map((row) =>
				row
					.map((cell) => {
						if (cell === null || cell === undefined) return '';
						const str = String(cell);
						if (str.includes(',') || str.includes('"') || str.includes('\n')) {
							return `"${str.replace(/"/g, '""')}"`;
						}
						return str;
					})
					.join(',')
			)
			.join('\n');
	}

	dataToJSON(data: unknown[][]): Record<string, unknown>[] {
		if (data.length === 0) return [];

		const headers = data[0] as string[];
		return data.slice(1).map((row) => {
			const obj: Record<string, unknown> = {};
			headers.forEach((header, index) => {
				obj[header] = (row as unknown[])[index];
			});
			return obj;
		});
	}
}

export const spreadsheetService = new SpreadsheetService();
