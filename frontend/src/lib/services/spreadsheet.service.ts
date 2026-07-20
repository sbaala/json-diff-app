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
		// Use PapaParse for robust CSV parsing
		const result = Papa.parse(csvText.trim(), {
			header: false,
			dynamicTyping: false,
			skipEmptyLines: false
		});

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
