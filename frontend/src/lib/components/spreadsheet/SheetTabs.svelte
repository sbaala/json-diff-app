<script lang="ts">
	import type { Sheet } from '$lib/stores/spreadsheet.store';
	import { createEventDispatcher } from 'svelte';

	export let sheets: Sheet[] = [];
	export let activeSheetId: string | null = null;

	const dispatch = createEventDispatcher<{
		sheetChange: string;
		addSheet: void;
		deleteSheet: string;
		renameSheet: { sheetId: string; newName: string };
	}>();

	let renamingSheetId: string | null = null;
	let renamingValue: string = '';
	let contextMenuSheetId: string | null = null;
	let contextMenuX = 0;
	let contextMenuY = 0;

	function handleTabClick(sheetId: string) {
		dispatch('sheetChange', sheetId);
	}

	function handleRightClick(e: MouseEvent, sheetId: string) {
		e.preventDefault();
		contextMenuSheetId = sheetId;
		contextMenuX = e.clientX;
		contextMenuY = e.clientY;
	}

	function startRename(sheet: Sheet) {
		renamingSheetId = sheet.sheetId;
		renamingValue = sheet.sheetName;
		contextMenuSheetId = null;
	}

	function confirmRename() {
		if (renamingSheetId && renamingValue.trim()) {
			dispatch('renameSheet', { sheetId: renamingSheetId, newName: renamingValue.trim() });
		}
		renamingSheetId = null;
	}

	function handleDeleteSheet(sheetId: string) {
		if (sheets.length > 1) {
			dispatch('deleteSheet', sheetId);
		}
		contextMenuSheetId = null;
	}

	function closeContextMenu() {
		contextMenuSheetId = null;
	}
</script>

<svelte:window on:click={closeContextMenu} />

<div class="sheet-tabs">
	<div class="tabs-container">
		{#each sheets as sheet (sheet.sheetId)}
			{#if renamingSheetId === sheet.sheetId}
				<div class="tab renaming">
					<input
						type="text"
						bind:value={renamingValue}
						on:blur={confirmRename}
						on:keydown={(e) => {
							if (e.key === 'Enter') confirmRename();
							if (e.key === 'Escape') (renamingSheetId = null);
						}}
						autoFocus
					/>
				</div>
			{:else}
				<div
					class="tab"
					class:active={activeSheetId === sheet.sheetId}
					on:click={() => handleTabClick(sheet.sheetId)}
					on:contextmenu={(e) => handleRightClick(e, sheet.sheetId)}
					role="button"
					tabindex="0"
				>
					{sheet.sheetName}
				</div>
			{/if}
		{/each}
	</div>

	<button class="add-sheet-btn" on:click={() => dispatch('addSheet', undefined)} title="Add Sheet">
		+
	</button>

	{#if contextMenuSheetId}
		<div class="context-menu" style="left: {contextMenuX}px; top: {contextMenuY}px">
			<button on:click={() => startRename(sheets.find((s) => s.sheetId === contextMenuSheetId)!)}>
				Rename Sheet
			</button>
			{#if sheets.length > 1}
				<button on:click={() => handleDeleteSheet(contextMenuSheetId!)}>Delete Sheet</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.sheet-tabs {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		background-color: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		overflow-x: auto;
	}

	.tabs-container {
		display: flex;
		gap: 4px;
		flex: 1;
	}

	.tab {
		padding: 8px 16px;
		background-color: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px 4px 0 0;
		cursor: pointer;
		font-size: 14px;
		transition: background-color 0.2s;
	}

	.tab:hover {
		background-color: var(--color-secondary);
	}

	.tab.active {
		background-color: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.tab.renaming input {
		padding: 4px 8px;
		border: 1px solid var(--color-primary);
		border-radius: 4px;
		background-color: var(--color-bg);
		color: var(--color-text);
		font-size: 14px;
	}

	.add-sheet-btn {
		padding: 8px 12px;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
		transition: background-color 0.2s;
	}

	.add-sheet-btn:hover {
		background-color: var(--color-secondary);
	}

	.context-menu {
		position: fixed;
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		min-width: 150px;
	}

	.context-menu button {
		display: block;
		width: 100%;
		padding: 12px;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		font-size: 14px;
		color: var(--color-text);
		transition: background-color 0.2s;
	}

	.context-menu button:hover {
		background-color: var(--color-bg);
	}

	.context-menu button:first-child {
		border-radius: 4px 4px 0 0;
	}

	.context-menu button:last-child {
		border-radius: 0 0 4px 4px;
	}
</style>
