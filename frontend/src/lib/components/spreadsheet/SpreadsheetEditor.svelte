<script lang="ts">
	import { onMount } from 'svelte';
	import Handsontable from 'handsontable';
	import 'handsontable/dist/handsontable.full.min.css';
	import { spreadsheetStore } from '$lib/stores/spreadsheet.store';
	import { spreadsheetStorageService } from '$lib/services/spreadsheet-storage.service';
	import { spreadsheetService } from '$lib/services/spreadsheet.service';
	import SheetTabs from './SheetTabs.svelte';
	import SpreadsheetToolbar from './SpreadsheetToolbar.svelte';
	import FileUploadZone from './FileUploadZone.svelte';
	import ExportDialog from './ExportDialog.svelte';

	let containerElement: HTMLDivElement;
	let handsontable: Handsontable | null = null;
	let showUploadZone = true;
	let showExportDialog = false;
	let spreadsheetState: any;

	const config = spreadsheetService.getDefaultConfig();

	spreadsheetStore.subscribe((state) => {
		spreadsheetState = state;
	});

	onMount(() => {
		// Initialize empty workbook if none exists
		if (!spreadsheetState.workbook) {
			spreadsheetStore.initWorkbook();
		}
	});

	function initializeHandsontable() {
		console.log('initializeHandsontable called');
		console.log('State check:', {
			containerElement: !!containerElement,
			workbook: !!spreadsheetState.workbook,
			activeSheetId: !!spreadsheetState.activeSheetId,
			showUploadZone
		});

		if (!containerElement || !spreadsheetState.workbook || !spreadsheetState.activeSheetId) {
			console.log('❌ Cannot initialize - missing:', {
				containerElement: !!containerElement,
				workbook: !!spreadsheetState.workbook,
				activeSheetId: !!spreadsheetState.activeSheetId
			});
			return;
		}

		console.log('✓ All conditions met, proceeding...');

		// Destroy existing instance
		if (handsontable) {
			console.log('Destroying existing Handsontable instance');
			handsontable.destroy();
		}

		const activeSheet = spreadsheetState.workbook.sheets.find(
			(s) => s.sheetId === spreadsheetState.activeSheetId
		);

		if (!activeSheet) {
			console.error('❌ Active sheet not found:', spreadsheetState.activeSheetId);
			console.error('Available sheets:', spreadsheetState.workbook.sheets.map((s) => s.sheetId));
			return;
		}

		console.log('✓ Active sheet found:', {
			sheetName: activeSheet.sheetName,
			dataLength: activeSheet.data.length,
			firstRow: activeSheet.data[0],
			sheetData: activeSheet.data
		});

		const currentWorkbook = spreadsheetState.workbook;
		const currentSheetId = spreadsheetState.activeSheetId;

		console.log('Creating Handsontable with config:', {
			containerElement: containerElement.id,
			containerSize: {
				width: containerElement.offsetWidth,
				height: containerElement.offsetHeight,
				computed: window.getComputedStyle(containerElement)
			},
			parentSize: {
				width: containerElement.parentElement?.offsetWidth,
				height: containerElement.parentElement?.offsetHeight
			},
			dataToPass: activeSheet.data.length,
			firstRow: activeSheet.data[0]
		});

		console.log('Container details:', {
			offsetWidth: containerElement.offsetWidth,
			offsetHeight: containerElement.offsetHeight,
			clientWidth: containerElement.clientWidth,
			clientHeight: containerElement.clientHeight,
			scrollWidth: containerElement.scrollWidth,
			scrollHeight: containerElement.scrollHeight
		});

		try {
			const htConfig = {
				...config,
				colHeaders: true,
				rowHeaders: true,
				stretchH: 'all',
				afterChange(changes: any) {
					if (changes && currentWorkbook && currentSheetId) {
						const data = handsontable!.getData() as unknown[][];
						spreadsheetStore.updateSheetData(currentSheetId, data);
						spreadsheetStorageService.autoSave(currentWorkbook);
					}
				},
				afterCreateRow() {
					if (currentWorkbook) {
						spreadsheetStorageService.autoSave(currentWorkbook);
					}
				},
				afterRemoveRow() {
					if (currentWorkbook) {
						spreadsheetStorageService.autoSave(currentWorkbook);
					}
				},
				afterCreateCol() {
					if (currentWorkbook) {
						spreadsheetStorageService.autoSave(currentWorkbook);
					}
				},
				afterRemoveCol() {
					if (currentWorkbook) {
						spreadsheetStorageService.autoSave(currentWorkbook);
					}
				},
				afterPaste() {
					if (currentWorkbook) {
						const data = handsontable!.getData() as unknown[][];
						spreadsheetStore.updateSheetData(currentSheetId, data);
						spreadsheetStorageService.autoSave(currentWorkbook);
					}
				}
			};

			console.log('Data to load length:', activeSheet.data.length);
			console.log('Data to load first row:', activeSheet.data[0]);

			handsontable = new Handsontable(containerElement, htConfig);

			console.log('✓ Handsontable created successfully');

			// Load data using the standard loadData method
			console.log('Loading data into Handsontable...');
			handsontable.loadData(activeSheet.data);
			console.log('✓ Data loaded successfully');
			console.log('Handsontable data:', handsontable.getData());
			console.log('Handsontable dimensions:', {
				rows: handsontable.countRows(),
				cols: handsontable.countCols()
			});

			// Force render to display data
			console.log('Calling handsontable.render()...');
			handsontable.render();
			console.log('✓ Render complete - data should be visible now');

			// Log first cell content to verify data is there
			const cellContent = handsontable.getDataAtCell(0, 0);
			console.log('First cell content [0,0]:', cellContent);
		} catch (error) {
			console.error('❌ Error creating Handsontable:', error);
		}

		showUploadZone = false;
	}

	function handleAutoSave() {
		if (spreadsheetState.workbook) {
			spreadsheetStorageService.autoSave(spreadsheetState.workbook);
		}
	}

	function handleFileSelect(event: CustomEvent<{ sheets: any[]; name: string }>) {
		const { sheets, name } = event.detail;

		console.log('handleFileSelect called with:', { sheetCount: sheets.length, workbookName: name });

		if (sheets.length === 0) {
			console.error('No sheets to load');
			return;
		}

		// Log sheet details
		sheets.forEach((sheet, idx) => {
			console.log(`Sheet ${idx}:`, {
				name: sheet.sheetName,
				rows: sheet.data.length,
				cols: sheet.data[0]?.length || 0
			});
		});

		// Generate workbook ID
		const workbookId = crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});

		// Create workbook object
		const workbook = {
			id: workbookId,
			name,
			sheets,
			lastModified: new Date().toISOString()
		};

		console.log('Workbook created:', {
			activeSheetId: sheets[0]?.sheetId,
			sheetCount: sheets.length
		});

		// Import sheets into store (creates workbook and sets active sheet)
		spreadsheetStore.importSheets(sheets, name);

		// Save to persistent storage immediately
		spreadsheetStorageService.saveWorkbook(workbook);

		// Hide upload overlay - this will trigger reactive statement which initializes Handsontable
		showUploadZone = false;
	}

	function handleSheetChange(event: CustomEvent<string>) {
		const sheetId = event.detail;
		spreadsheetStore.setActiveSheet(sheetId);
		initializeHandsontable();
	}

	function handleUndo() {
		handsontable?.undo();
	}

	function handleRedo() {
		handsontable?.redo();
	}

	function handleFormat(event: CustomEvent<any>) {
		const format = event.detail;
		if (!handsontable) return;

		const selected = handsontable.getSelected();
		if (!selected || selected.length === 0) return;

		// Apply formatting through Handsontable's CSS class system
		const [startRow, startCol, endRow, endCol] = selected[0];
		const start = Math.min(startRow, endRow);
		const end = Math.max(startRow, endRow);
		const colStart = Math.min(startCol, endCol);
		const colEnd = Math.max(startCol, endCol);

		for (let row = start; row <= end; row++) {
			for (let col = colStart; col <= colEnd; col++) {
				handsontable.setCellMeta(row, col, 'format', format);
			}
		}

		handsontable.render();
		handleAutoSave();
	}

	function handleExport(event: CustomEvent<'xlsx' | 'csv' | 'json'>) {
		const format = event.detail;
		if (!spreadsheetState.workbook || !spreadsheetState.activeSheetId || !handsontable) return;

		const data = handsontable.getData();
		const sheet = spreadsheetState.workbook.sheets.find(
			(s) => s.sheetId === spreadsheetState.activeSheetId
		);
		if (!sheet) return;

		let content: string;
		let filename: string;
		let mimeType: string;

		if (format === 'csv') {
			content = spreadsheetService.dataToCSV(data);
			filename = `${sheet.sheetName}.csv`;
			mimeType = 'text/csv;charset=utf-8;';
		} else if (format === 'json') {
			const json = spreadsheetService.dataToJSON(data);
			content = JSON.stringify(json, null, 2);
			filename = `${sheet.sheetName}.json`;
			mimeType = 'application/json;charset=utf-8;';
		} else {
			// For XLSX, we'd need a library like xlsx or exceljs
			// For now, we'll just export as CSV
			console.warn('XLSX export not yet implemented, exporting as CSV');
			content = spreadsheetService.dataToCSV(data);
			filename = `${sheet.sheetName}.csv`;
			mimeType = 'text/csv;charset=utf-8;';
		}

		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	$: if (
		spreadsheetState.workbook &&
		spreadsheetState.activeSheetId &&
		containerElement &&
		!showUploadZone
	) {
		initializeHandsontable();
	}
</script>

<div class="spreadsheet-editor">
	<SpreadsheetToolbar
		handsontableRef={handsontable}
		on:undo={handleUndo}
		on:redo={handleRedo}
		on:export={handleExport}
		on:format={handleFormat}
	/>

	{#if spreadsheetState.workbook}
		<SheetTabs
			sheets={spreadsheetState.workbook.sheets}
			activeSheetId={spreadsheetState.activeSheetId}
			on:sheetChange={handleSheetChange}
			on:addSheet={() => spreadsheetStore.addSheet()}
			on:deleteSheet={(e) => spreadsheetStore.deleteSheet(e.detail)}
			on:renameSheet={(e) => spreadsheetStore.renameSheet(e.detail.sheetId, e.detail.newName)}
		/>
	{/if}

	<div class="content-wrapper">
		{#if spreadsheetState.workbook && spreadsheetState.activeSheetId}
			<div class="handsontable-wrapper">
				<div bind:this={containerElement} class="handsontable-container"></div>
			</div>
		{/if}

		{#if showUploadZone}
			<div class="upload-overlay">
				<FileUploadZone on:fileSelect={handleFileSelect} />
			</div>
		{/if}
	</div>
</div>

<style>
	.spreadsheet-editor {
		display: flex;
		flex-direction: column;
		height: 100vh;
		gap: 0;
		background-color: var(--color-bg);
		color: var(--color-text);
	}

	.content-wrapper {
		flex: 1;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.handsontable-wrapper {
		flex: 1;
		overflow: hidden;
		background-color: var(--color-surface);
		width: 100%;
		height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.handsontable-container {
		width: 100%;
		height: 100%;
		min-height: 0;
		flex: 1;
		overflow: auto;
	}

	.upload-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(0, 0, 0, 0.1);
		z-index: 10;
	}
</style>
