import type { CellFormat } from '$lib/stores/spreadsheet.store';

export class SpreadsheetFormatterService {
	formatCell(value: unknown, format?: string): string {
		if (value === null || value === undefined) return '';

		const str = String(value);

		if (!format) return str;

		try {
			switch (format) {
				case 'currency':
					return this.formatCurrency(Number(value));
				case 'percent':
					return this.formatPercent(Number(value));
				case 'date':
					return this.formatDate(value);
				case 'time':
					return this.formatTime(value);
				case 'datetime':
					return this.formatDateTime(value);
				case 'number':
					return this.formatNumber(Number(value));
				default:
					return str;
			}
		} catch {
			return str;
		}
	}

	private formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(value);
	}

	private formatPercent(value: number): string {
		return `${(value * 100).toFixed(2)}%`;
	}

	private formatDate(value: unknown): string {
		const date = new Date(String(value));
		return date.toLocaleDateString('en-US');
	}

	private formatTime(value: unknown): string {
		const date = new Date(String(value));
		return date.toLocaleTimeString('en-US');
	}

	private formatDateTime(value: unknown): string {
		const date = new Date(String(value));
		return date.toLocaleString('en-US');
	}

	private formatNumber(value: number, decimals: number = 2): string {
		return value.toFixed(decimals);
	}

	getCellStyleCSS(format: CellFormat): string {
		const styles: string[] = [];

		if (format.bold) styles.push('font-weight: bold');
		if (format.italic) styles.push('font-style: italic');
		if (format.color) styles.push(`color: ${format.color}`);
		if (format.backgroundColor) styles.push(`background-color: ${format.backgroundColor}`);

		switch (format.alignment) {
			case 'left':
				styles.push('text-align: left');
				break;
			case 'center':
				styles.push('text-align: center');
				break;
			case 'right':
				styles.push('text-align: right');
				break;
		}

		return styles.join('; ');
	}

	applyFormatToRange(
		data: unknown[][],
		format: CellFormat,
		startRow: number,
		endRow: number,
		startCol: number,
		endCol: number
	): void {
		// This would be applied through Handsontable's styling API
		// Placeholder for future formatting implementation
	}

	parseNumberFormat(formatString: string): { decimals?: number; format?: string } {
		const result: { decimals?: number; format?: string } = {};

		if (formatString.includes('0.00')) {
			result.decimals = 2;
		} else if (formatString.includes('0.0')) {
			result.decimals = 1;
		}

		if (formatString.includes('%')) {
			result.format = 'percent';
		} else if (formatString.includes('$')) {
			result.format = 'currency';
		} else if (formatString.includes('mm/dd/yyyy')) {
			result.format = 'date';
		}

		return result;
	}
}

export const spreadsheetFormatterService = new SpreadsheetFormatterService();
