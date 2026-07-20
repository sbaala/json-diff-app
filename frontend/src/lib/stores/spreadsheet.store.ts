import { writable, type Writable } from 'svelte/store';

const generateUUID = () => {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

export interface CellFormat {
	bold?: boolean;
	italic?: boolean;
	color?: string;
	backgroundColor?: string;
	alignment?: 'left' | 'center' | 'right';
	format?: string;
}

export interface SheetSettings {
	formulas: Record<string, string>;
	columnWidths: Record<string, number>;
	merged: Array<{ rows: [number, number]; cols: [number, number] }>;
	formatting: Record<string, CellFormat>;
	hiddenColumns: number[];
	hiddenRows: number[];
}

export interface Sheet {
	sheetId: string;
	sheetName: string;
	data: unknown[][];
	settings: SheetSettings;
}

export interface Workbook {
	id: string;
	name: string;
	sheets: Sheet[];
	lastModified: string;
}

export interface SpreadsheetState {
	workbook: Workbook | null;
	activeSheetId: string | null;
}

function createSpreadsheetStore() {
	const { subscribe, set, update } = writable<SpreadsheetState>({
		workbook: null,
		activeSheetId: null
	});

	return {
		subscribe,
		initWorkbook: (name: string = 'Untitled') => {
			const id = generateUUID();
			const sheet: Sheet = {
				sheetId: generateUUID(),
				sheetName: 'Sheet 1',
				data: [],
				settings: {
					formulas: {},
					columnWidths: {},
					merged: [],
					formatting: {},
					hiddenColumns: [],
					hiddenRows: []
				}
			};

			const workbook: Workbook = {
				id,
				name,
				sheets: [sheet],
				lastModified: new Date().toISOString()
			};

			set({
				workbook,
				activeSheetId: sheet.sheetId
			});
		},

		loadWorkbook: (workbook: Workbook) => {
			const firstSheetId = workbook.sheets[0]?.sheetId || null;
			set({
				workbook,
				activeSheetId: firstSheetId
			});
		},

		importSheets: (sheets: Sheet[], workbookName: string) => {
			if (!sheets || sheets.length === 0) return;

			const workbook: Workbook = {
				id: generateUUID(),
				name: workbookName,
				sheets,
				lastModified: new Date().toISOString()
			};

			const firstSheetId = sheets[0]?.sheetId || null;
			set({
				workbook,
				activeSheetId: firstSheetId
			});
		},

		addSheet: (name?: string) => {
			update((state) => {
				if (!state.workbook) return state;

				const newSheet: Sheet = {
					sheetId: generateUUID(),
					sheetName: name || `Sheet ${state.workbook.sheets.length + 1}`,
					data: [],
					settings: {
						formulas: {},
						columnWidths: {},
						merged: [],
						formatting: {},
						hiddenColumns: [],
						hiddenRows: []
					}
				};

				return {
					...state,
					workbook: {
						...state.workbook,
						sheets: [...state.workbook.sheets, newSheet],
						lastModified: new Date().toISOString()
					},
					activeSheetId: newSheet.sheetId
				};
			});
		},

		deleteSheet: (sheetId: string) => {
			update((state) => {
				if (!state.workbook || state.workbook.sheets.length <= 1) return state;

				const filteredSheets = state.workbook.sheets.filter((s) => s.sheetId !== sheetId);
				const newActiveId =
					state.activeSheetId === sheetId ? filteredSheets[0].sheetId : state.activeSheetId;

				return {
					...state,
					workbook: {
						...state.workbook,
						sheets: filteredSheets,
						lastModified: new Date().toISOString()
					},
					activeSheetId: newActiveId
				};
			});
		},

		renameSheet: (sheetId: string, newName: string) => {
			update((state) => {
				if (!state.workbook) return state;

				return {
					...state,
					workbook: {
						...state.workbook,
						sheets: state.workbook.sheets.map((s) =>
							s.sheetId === sheetId ? { ...s, sheetName: newName } : s
						),
						lastModified: new Date().toISOString()
					}
				};
			});
		},

		setActiveSheet: (sheetId: string) => {
			update((state) => ({
				...state,
				activeSheetId: sheetId
			}));
		},

		updateSheetData: (sheetId: string, data: unknown[][]) => {
			update((state) => {
				if (!state.workbook) return state;

				return {
					...state,
					workbook: {
						...state.workbook,
						sheets: state.workbook.sheets.map((s) =>
							s.sheetId === sheetId ? { ...s, data } : s
						),
						lastModified: new Date().toISOString()
					}
				};
			});
		},

		updateSheetSettings: (sheetId: string, settings: Partial<SheetSettings>) => {
			update((state) => {
				if (!state.workbook) return state;

				return {
					...state,
					workbook: {
						...state.workbook,
						sheets: state.workbook.sheets.map((s) =>
							s.sheetId === sheetId
								? { ...s, settings: { ...s.settings, ...settings } }
								: s
						),
						lastModified: new Date().toISOString()
					}
				};
			});
		},

		renameWorkbook: (newName: string) => {
			update((state) => ({
				...state,
				workbook: state.workbook ? { ...state.workbook, name: newName } : null
			}));
		},

		reset: () => {
			set({
				workbook: null,
				activeSheetId: null
			});
		}
	};
}

export const spreadsheetStore = createSpreadsheetStore();
