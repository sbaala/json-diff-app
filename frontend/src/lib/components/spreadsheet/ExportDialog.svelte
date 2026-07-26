<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let isOpen = false;
	export let sheets: any[] = [];
	export let activeSheetName: string = 'Sheet';

	const dispatch = createEventDispatcher<{
		export: { format: 'xlsx' | 'csv' | 'json'; allSheets: boolean };
		close: void;
	}>();

	let exportAllSheets = false;
	let selectedFormat: 'xlsx' | 'csv' | 'json' = 'csv';

	function handleExport() {
		dispatch('export', {
			format: selectedFormat,
			allSheets: exportAllSheets
		});
		close();
	}

	function close() {
		isOpen = false;
		dispatch('close');
	}
</script>

{#if isOpen}
	<div class="dialog-overlay" on:click={close} role="presentation">
		<div class="dialog" on:click={(e) => e.stopPropagation()}>
			<h3>Export Spreadsheet</h3>

			<div class="export-options">
				<div class="format-section">
					<label>Format:</label>
					<div class="format-buttons">
						<button
							class="format-btn"
							class:active={selectedFormat === 'csv'}
							on:click={() => (selectedFormat = 'csv')}
						>
							CSV
						</button>
						<button
							class="format-btn"
							class:active={selectedFormat === 'json'}
							on:click={() => (selectedFormat = 'json')}
						>
							JSON
						</button>
						<button
							class="format-btn"
							class:active={selectedFormat === 'xlsx'}
							on:click={() => (selectedFormat = 'xlsx')}
							title="XLSX export coming soon"
							disabled
						>
							XLSX (soon)
						</button>
					</div>
				</div>

				{#if sheets.length > 1}
					<div class="sheets-section">
						<label>
							<input type="checkbox" bind:checked={exportAllSheets} />
							Export all sheets
						</label>
						<p class="help-text">
							{#if exportAllSheets}
								All {sheets.length} sheets will be included in the export
							{:else}
								Only "{activeSheetName}" will be exported
							{/if}
						</p>
					</div>
				{/if}

				<div class="format-info">
					{#if selectedFormat === 'csv'}
						<p><strong>CSV Format</strong></p>
						<p>
							Plain text format, compatible with Excel, Google Sheets, and other spreadsheet
							applications.
						</p>
					{:else if selectedFormat === 'json'}
						<p><strong>JSON Format</strong></p>
						<p>
							Structured data format with headers as object keys. Good for data processing and web
							applications.
						</p>
					{:else}
						<p><strong>XLSX Format</strong></p>
						<p>Coming soon! Full Excel format with formatting, formulas, and multiple sheets.</p>
					{/if}
				</div>
			</div>

			<div class="dialog-buttons">
				<button class="btn-cancel" on:click={close}>Cancel</button>
				<button
					class="btn-export"
					on:click={handleExport}
					disabled={selectedFormat === 'xlsx'}
				>
					Export as {selectedFormat.toUpperCase()}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.dialog-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.dialog {
		background-color: var(--color-surface);
		border-radius: 8px;
		padding: 24px;
		max-width: 500px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
		color: var(--color-text);
	}

	h3 {
		margin: 0 0 24px 0;
		font-size: 20px;
		font-weight: 600;
	}

	.export-options {
		margin-bottom: 24px;
	}

	.format-section,
	.sheets-section {
		margin-bottom: 16px;
	}

	label {
		display: block;
		margin-bottom: 8px;
		font-weight: 500;
		font-size: 14px;
	}

	.format-buttons {
		display: flex;
		gap: 8px;
	}

	.format-btn {
		flex: 1;
		padding: 10px;
		background-color: var(--color-bg);
		border: 2px solid transparent;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text);
		transition: all 0.2s;
	}

	.format-btn:hover:not(:disabled) {
		border-color: var(--color-primary);
		background-color: var(--color-secondary);
	}

	.format-btn.active {
		background-color: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.format-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.help-text {
		margin: 8px 0 0 0;
		font-size: 12px;
		color: var(--color-text-secondary);
	}

	.format-info {
		background-color: var(--color-bg);
		border-left: 4px solid var(--color-primary);
		padding: 12px;
		border-radius: 4px;
		margin-top: 16px;
	}

	.format-info p {
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
	}

	.format-info p:first-child {
		font-weight: 600;
		color: var(--color-primary);
		margin-bottom: 8px;
	}

	.dialog-buttons {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}

	button {
		padding: 10px 20px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s;
	}

	.btn-cancel {
		background-color: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-cancel:hover {
		background-color: var(--color-border);
	}

	.btn-export {
		background-color: var(--color-primary);
		color: white;
	}

	.btn-export:hover:not(:disabled) {
		background-color: var(--color-secondary);
	}

	.btn-export:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
