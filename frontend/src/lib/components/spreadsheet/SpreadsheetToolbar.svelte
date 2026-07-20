<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let handsontableRef: any = null;

	const dispatch = createEventDispatcher<{
		undo: void;
		redo: void;
		export: 'xlsx' | 'csv' | 'json';
		import: void;
		format: { bold?: boolean; italic?: boolean; color?: string; backgroundColor?: string };
	}>();

	let showExportMenu = false;
	let showFormattingMenu = false;
	let selectedColor = '#000000';
	let selectedBgColor = '#ffffff';

	function handleExport(format: 'xlsx' | 'csv' | 'json') {
		dispatch('export', format);
		showExportMenu = false;
	}

	function applyBold() {
		if (!handsontableRef) return;
		const selectedCells = handsontableRef.getSelected();
		if (selectedCells && selectedCells.length > 0) {
			dispatch('format', { bold: true });
		}
	}

	function applyItalic() {
		if (!handsontableRef) return;
		const selectedCells = handsontableRef.getSelected();
		if (selectedCells && selectedCells.length > 0) {
			dispatch('format', { italic: true });
		}
	}

	function applyColor() {
		if (!handsontableRef) return;
		dispatch('format', { color: selectedColor });
	}

	function applyBackgroundColor() {
		if (!handsontableRef) return;
		dispatch('format', { backgroundColor: selectedBgColor });
	}

	function mergeCells() {
		if (!handsontableRef) return;
		const selected = handsontableRef.getSelected();
		if (selected && selected.length > 0) {
			const [startRow, startCol, endRow, endCol] = selected[0];
			try {
				handsontableRef.mergeCells(startRow, startCol, endRow, endCol);
			} catch (e) {
				console.error('Error merging cells:', e);
			}
		}
	}

	function unmergeCells() {
		if (!handsontableRef) return;
		const selected = handsontableRef.getSelected();
		if (selected && selected.length > 0) {
			const [startRow, startCol] = selected[0];
			try {
				handsontableRef.unmergeCells(startRow, startCol);
			} catch (e) {
				console.error('Error unmerging cells:', e);
			}
		}
	}
</script>

<div class="toolbar">
	<div class="toolbar-section">
		<button
			class="toolbar-btn"
			on:click={() => dispatch('undo')}
			title="Undo (Ctrl+Z)"
			aria-label="Undo"
		>
			↶ Undo
		</button>
		<button
			class="toolbar-btn"
			on:click={() => dispatch('redo')}
			title="Redo (Ctrl+Y)"
			aria-label="Redo"
		>
			↷ Redo
		</button>
	</div>

	<div class="toolbar-section">
		<button
			class="toolbar-btn bold-btn"
			on:click={applyBold}
			title="Bold (Ctrl+B)"
			aria-label="Bold"
		>
			<strong>B</strong>
		</button>
		<button
			class="toolbar-btn italic-btn"
			on:click={applyItalic}
			title="Italic (Ctrl+I)"
			aria-label="Italic"
		>
			<em>I</em>
		</button>

		<div class="color-picker-wrapper">
			<label for="text-color" title="Text Color">
				<span class="color-label">A</span>
			</label>
			<input
				id="text-color"
				type="color"
				bind:value={selectedColor}
				on:change={applyColor}
				title="Text Color"
				class="color-input"
			/>
		</div>

		<div class="color-picker-wrapper">
			<label for="bg-color" title="Background Color">
				<span class="color-label bg">■</span>
			</label>
			<input
				id="bg-color"
				type="color"
				bind:value={selectedBgColor}
				on:change={applyBackgroundColor}
				title="Background Color"
				class="color-input"
			/>
		</div>

		<button class="toolbar-btn" on:click={mergeCells} title="Merge Cells" aria-label="Merge Cells">
			⊟ Merge
		</button>
		<button
			class="toolbar-btn"
			on:click={unmergeCells}
			title="Unmerge Cells"
			aria-label="Unmerge Cells"
		>
			⊞ Unmerge
		</button>
	</div>

	<div class="toolbar-section">
		<div class="export-menu-wrapper">
			<button
				class="toolbar-btn"
				on:click={() => (showExportMenu = !showExportMenu)}
				title="Export spreadsheet"
				aria-label="Export"
			>
				⬇ Export
			</button>
			{#if showExportMenu}
				<div class="export-menu">
					<button on:click={() => handleExport('xlsx')}>Export as XLSX</button>
					<button on:click={() => handleExport('csv')}>Export as CSV</button>
					<button on:click={() => handleExport('json')}>Export as JSON</button>
				</div>
			{/if}
		</div>
	</div>

	<div class="toolbar-section info">
		<span>💡 Tip: Right-click cells for more options | Formulas: =SUM(), =IF(), etc.</span>
	</div>
</div>

<svelte:window on:click={() => (showExportMenu = false)} />

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 12px 16px;
		background-color: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
	}

	.toolbar-section {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.toolbar-btn {
		padding: 8px 12px;
		background-color: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		color: var(--color-text);
		transition: all 0.2s;
		white-space: nowrap;
	}

	.toolbar-btn:hover {
		background-color: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.toolbar-btn:active {
		opacity: 0.8;
	}

	.export-menu-wrapper {
		position: relative;
	}

	.export-menu {
		position: absolute;
		top: 100%;
		left: 0;
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		z-index: 100;
		min-width: 180px;
		margin-top: 4px;
	}

	.export-menu button {
		display: block;
		width: 100%;
		padding: 10px 16px;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		font-size: 14px;
		color: var(--color-text);
		transition: background-color 0.2s;
	}

	.export-menu button:hover {
		background-color: var(--color-bg);
	}

	.export-menu button:first-child {
		border-radius: 4px 4px 0 0;
	}

	.export-menu button:last-child {
		border-radius: 0 0 4px 4px;
	}

	.info {
		margin-left: auto;
		font-size: 12px;
		color: var(--color-text-secondary);
		flex: 1;
		text-align: right;
	}

	.bold-btn strong {
		font-weight: 900;
	}

	.italic-btn em {
		font-style: italic;
		font-weight: bold;
	}

	.color-picker-wrapper {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.color-label {
		display: inline-block;
		width: 20px;
		height: 20px;
		text-align: center;
		line-height: 20px;
		font-size: 14px;
		font-weight: bold;
		color: var(--color-text);
		cursor: pointer;
	}

	.color-label.bg {
		font-size: 16px;
	}

	.color-input {
		width: 32px;
		height: 32px;
		padding: 2px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		cursor: pointer;
		opacity: 0;
		position: absolute;
		left: 0;
		top: 0;
	}

	.color-input:hover {
		opacity: 0.3;
	}

	/* Separator between sections */
	.toolbar-section:not(:last-child)::after {
		content: '';
		display: inline-block;
		width: 1px;
		height: 24px;
		background-color: var(--color-border);
		margin: 0 8px;
	}

	@media (max-width: 1024px) {
		.info {
			display: none;
		}

		.toolbar-section {
			gap: 4px;
		}

		.toolbar-btn {
			padding: 6px 10px;
			font-size: 12px;
		}
	}
</style>
