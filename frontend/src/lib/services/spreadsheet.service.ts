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
		console.log('🔍 parseCSV() - input length:', csvText.length);
		console.log('  First 100 chars:', JSON.stringify(csvText.substring(0, 100)));

		// Parse CSV using Papa.parse
		console.log('  Calling Papa.parse()...');
		const result = Papa.parse(csvText, {
			header: false,
			dynamicTyping: false,
			skipEmptyLines: false
		});

		console.log('✓ Papa.parse completed:', {
			dataLength: result.data.length,
			errorCount: result.errors ? result.errors.length : 0,
			hasErrors: result.errors && result.errors.length > 0
		});

		if (result.errors && result.errors.length > 0) {
			console.error('  Parse errors:', result.errors);
		}

		// Log detailed row information
		console.log('  Detailed row analysis:');
		for (let i = 0; i < Math.min(3, result.data.length); i++) {
			const row = result.data[i];
			console.log(`    Row ${i}:`, {
				type: typeof row,
				isArray: Array.isArray(row),
				length: Array.isArray(row) ? row.length : 'N/A',
				value: JSON.stringify(row),
				cells: Array.isArray(row) ? row.map((c, idx) => ({ idx, type: typeof c, value: JSON.stringify(c) })) : 'N/A'
			});
		}

		if (result.data.length === 0) {
			console.warn('⚠️  Papa.parse returned empty data');
			return [];
		}

		// Return data as-is; Papa.parse handles the structure
		const parsedData = result.data as string[][];
		console.log('✓ parseCSV() returning', parsedData.length, 'rows');
		return parsedData;
	}

	csvToData(csvText: string): unknown[][] {
		console.log('🔄 csvToData() - input length:', csvText.length);
		const rows = this.parseCSV(csvText);
		console.log('  parseCSV returned', rows.length, 'rows');

		const result = rows.map((row, rowIdx) => {
			const mappedRow = row.map((cell, cellIdx) => {
				const str = String(cell).trim();
				if (str === '') return '';
				if (str.toLowerCase() === 'true') return true;
				if (str.toLowerCase() === 'false') return false;
				if (str.toLowerCase() === 'null') return null;
				const num = parseFloat(str);
				if (!isNaN(num)) return num;
				return str;
			});
			if (rowIdx < 3) {
				console.log(`    Mapped row ${rowIdx}:`, JSON.stringify(mappedRow));
			}
			return mappedRow;
		});

		console.log('✓ csvToData() returning', result.length, 'rows');
		return result;
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
