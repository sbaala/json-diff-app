<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fileImportService } from '$lib/services/file-import.service';
	import type { Sheet } from '$lib/stores/spreadsheet.store';

	const dispatch = createEventDispatcher<{
		fileSelect: { sheets: Sheet[]; name: string };
	}>();

	let isDragging = false;
	let fileInput: HTMLInputElement;
	let isLoading = false;
	let errorMessage = '';

	async function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;

		isLoading = true;
		errorMessage = '';

		const file = files[0];

		try {
			const result = await fileImportService.importFile(file);

			if (result.error) {
				errorMessage = result.error;
				console.error('Import error:', result.error);
				return;
			}

			if (result.sheets.length === 0) {
				errorMessage = 'No data found in file.';
				return;
			}

			dispatch('fileSelect', {
				sheets: result.sheets,
				name: result.workbookName
			});
		} catch (error) {
			errorMessage = `Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`;
			console.error('Error parsing file:', error);
		} finally {
			isLoading = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files) {
			handleFiles(e.dataTransfer.files);
		}
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		handleFiles(input.files);
	}

	async function handlePaste(e: ClipboardEvent) {
		const text = e.clipboardData?.getData('text/plain');
		if (!text) return;

		isLoading = true;
		errorMessage = '';

		try {
			const result = await fileImportService.importFromText(text, 'csv');

			if (result.error) {
				errorMessage = result.error;
				return;
			}

			dispatch('fileSelect', {
				sheets: result.sheets,
				name: result.workbookName
			});
		} catch (error) {
			errorMessage = `Error parsing pasted content: ${error instanceof Error ? error.message : 'Unknown error'}`;
			console.error('Error parsing pasted content:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:window on:paste={handlePaste} />

<div
	class="upload-zone"
	class:dragging={isDragging}
	on:dragover={handleDragOver}
	on:dragleave={handleDragLeave}
	on:drop={handleDrop}
	role="region"
	aria-label="File upload area"
>
	<div class="upload-content">
		{#if isLoading}
			<div class="loading">
				<div class="spinner" />
				<p>Loading file...</p>
			</div>
		{:else if errorMessage}
			<div class="error">
				<p class="error-icon">⚠️</p>
				<p class="error-text">{errorMessage}</p>
				<button class="upload-btn" on:click={() => fileInput?.click()}>
					Try Again
				</button>
			</div>
		{:else}
			<div class="upload-icon">📁</div>
			<h2>Upload CSV or Excel File</h2>
			<p>Drag and drop your file here or click to browse</p>

			<button class="upload-btn" on:click={() => fileInput?.click()}>
				Choose File
			</button>

			<p class="upload-hint">Or paste CSV data directly (Ctrl+V)</p>
		{/if}
	</div>

	<input
		bind:this={fileInput}
		type="file"
		accept=".csv,.json,.xlsx,.xls"
		on:change={handleFileInput}
		style="display: none;"
	/>
</div>

<style>
	.upload-zone {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		padding: 40px;
		background-color: var(--color-bg);
		border: 2px dashed var(--color-border);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		margin: 16px;
	}

	.upload-zone.dragging {
		background-color: var(--color-secondary);
		border-color: var(--color-primary);
		opacity: 0.9;
	}

	.upload-content {
		text-align: center;
	}

	.upload-icon {
		font-size: 48px;
		margin-bottom: 16px;
	}

	h2 {
		margin: 0 0 8px 0;
		font-size: 20px;
		color: var(--color-text);
	}

	p {
		margin: 8px 0;
		color: var(--color-text-secondary);
		font-size: 14px;
	}

	.upload-btn {
		padding: 12px 24px;
		margin-top: 16px;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 16px;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.upload-btn:hover {
		background-color: var(--color-secondary);
	}

	.upload-hint {
		margin-top: 24px;
		font-size: 12px;
		font-style: italic;
	}

	.loading {
		text-align: center;
	}

	.spinner {
		width: 40px;
		height: 40px;
		margin: 0 auto 16px;
		border: 4px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error {
		text-align: center;
	}

	.error-icon {
		font-size: 48px;
		margin-bottom: 16px;
	}

	.error-text {
		color: #ff6b6b;
		margin-bottom: 16px;
		font-weight: 500;
	}
</style>
