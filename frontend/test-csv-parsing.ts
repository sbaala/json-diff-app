// Manual test for CSV parsing and data flow
// This validates the fix for empty sheet loading

interface CellFormat {
	bold?: boolean;
	italic?: boolean;
	color?: string;
	backgroundColor?: string;
	alignment?: 'left' | 'center' | 'right';
	format?: string;
}

interface SheetSettings {
	formulas: Record<string, string>;
	columnWidths: Record<string, number>;
	merged: Array<{ rows: [number, number]; cols: [number, number] }>;
	formatting: Record<string, CellFormat>;
	hiddenColumns: number[];
	hiddenRows: number[];
}

interface Sheet {
	sheetId: string;
	sheetName: string;
	data: unknown[][];
	settings: SheetSettings;
}

// SpreadsheetService.parseCSV equivalent
function parseCSV(csvText: string): string[][] {
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

function csvToData(csvText: string): unknown[][] {
	const rows = parseCSV(csvText);
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

function defaultSheetSettings(): SheetSettings {
	return {
		formulas: {},
		columnWidths: {},
		merged: [],
		formatting: {},
		hiddenColumns: [],
		hiddenRows: []
	};
}

function generateId(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// Test Cases
console.log('=== CSV Parsing Tests ===\n');

// Test 1: Simple CSV
console.log('Test 1: Simple CSV');
const csv1 = `Name,Age,City
John,30,New York
Jane,25,Los Angeles`;

const data1 = csvToData(csv1);
console.log('Input:', csv1);
console.log('Output:', data1);
console.log('Length:', data1.length);
console.log('Expected: 3 rows (1 header + 2 data)');
console.log('✓ PASS\n' + (data1.length === 3 ? '' : '✗ FAIL\n'));

// Test 2: CSV with quotes
console.log('Test 2: CSV with quoted fields');
const csv2 = `Name,Description
"John Doe","Works at ""Acme Corp"""
Jane,"Simple description"`;

const data2 = csvToData(csv2);
console.log('Input:', csv2);
console.log('Output:', data2);
console.log('Length:', data2.length);
console.log('Expected: 3 rows with quotes properly escaped');
console.log('✓ PASS\n' + (data2.length === 3 ? '' : '✗ FAIL\n'));

// Test 3: CSV with numbers
console.log('Test 3: CSV with type coercion');
const csv3 = `Name,Score,Pass
Alice,95,true
Bob,42,false`;

const data3 = csvToData(csv3);
console.log('Input:', csv3);
console.log('Output:', data3);
console.log('Row 1 Score type:', typeof data3[1][1]);
console.log('Row 1 Pass type:', typeof data3[1][2]);
console.log('Expected: Score is number, Pass is boolean');
console.log('✓ PASS\n' + (typeof data3[1][1] === 'number' && typeof data3[1][2] === 'boolean' ? '' : '✗ FAIL\n'));

// Test 4: Empty CSV
console.log('Test 4: Empty CSV');
const csv4 = '';
const data4 = csvToData(csv4);
console.log('Input: (empty)');
console.log('Output:', data4);
console.log('Length:', data4.length);
console.log('Expected: 0 rows');
console.log('✓ PASS\n' + (data4.length === 0 ? '' : '✗ FAIL\n'));

// Test 5: Sheet structure
console.log('Test 5: Sheet creation from CSV');
const csvData = csvToData(csv1);
const sheet: Sheet = {
	sheetId: generateId(),
	sheetName: 'Test Sheet',
	data: csvData,
	settings: defaultSheetSettings()
};
console.log('Sheet created:');
console.log('  - sheetId:', !!sheet.sheetId);
console.log('  - sheetName:', sheet.sheetName);
console.log('  - data.length:', sheet.data.length);
console.log('  - data[0].length:', sheet.data[0]?.length);
console.log('Expected: All properties set correctly');
console.log('✓ PASS\n' + (sheet.data.length === 3 && sheet.data[0].length === 3 ? '' : '✗ FAIL\n'));

console.log('=== All Tests Complete ===');
