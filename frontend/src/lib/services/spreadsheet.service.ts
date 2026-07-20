import type Handsontable from 'handsontable';

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
		engine: string;
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
			// Formula configuration
			formulas: {
				engine: 'hyperformula'
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
		const rows: string[][] = [];
		let currentRow: string[] = [];
		let currentField = '';
		let insideQuotes = false;

		for (let i = 0; i < csvText.length; i++) {
			const char = csvText[i];
			const nextChar = csvText[i + 1];

			if (char === '"') {
				if (insideQuotes && nextChar === '"') {
					currentField += '"';
					i++;
				} else {
					insideQuotes = !insideQuotes;
				}
			} else if (char === ',' && !insideQuotes) {
				currentRow.push(currentField.trim());
				currentField = '';
			} else if ((char === '\n' || char === '\r') && !insideQuotes) {
				if (currentField || currentRow.length > 0) {
					currentRow.push(currentField.trim());
					if (currentRow.some((field) => field.length > 0)) {
						rows.push(currentRow);
					}
					currentRow = [];
					currentField = '';
				}
				if (char === '\r' && nextChar === '\n') {
					i++;
				}
			} else {
				currentField += char;
			}
		}

		if (currentField || currentRow.length > 0) {
			currentRow.push(currentField.trim());
			if (currentRow.some((field) => field.length > 0)) {
				rows.push(currentRow);
			}
		}

		return rows;
	}

	csvToData(csvText: string): unknown[][] {
		const rows = this.parseCSV(csvText);
		return rows.map((row) =>
			row.map((cell) => {
				if (cell === '') return '';
				if (cell.toLowerCase() === 'true') return true;
				if (cell.toLowerCase() === 'false') return false;
				if (cell.toLowerCase() === 'null') return null;
				const num = parseFloat(cell);
				if (!isNaN(num) && cell.trim() !== '') return num;
				return cell;
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
