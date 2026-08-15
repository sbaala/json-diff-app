<script lang="ts">
	import type { Tab } from '$lib/stores/tabManager';

	interface Props {
		tabs: Tab<any>[];
		activeTabId: string;
		onSelectTab: (id: string) => void;
		onAddTab: () => void;
		onRemoveTab: (id: string) => void;
		onRenameTab: (id: string, newName: string) => void;
		onToggleRename?: (id: string) => void;
	}

	let { tabs = [], activeTabId = '', onSelectTab, onAddTab, onRemoveTab, onRenameTab, onToggleRename }: Props = $props();

	let editingId = $state<string | null>(null);
	let editingValue = $state('');

	function startEdit(tab: Tab<any>) {
		editingId = tab.id;
		editingValue = tab.name;
	}

	function finishEdit(id: string) {
		if (editingValue.trim()) {
			onRenameTab(id, editingValue.trim());
		}
		editingId = null;
		editingValue = '';
	}

	function handleKeydown(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter') {
			finishEdit(id);
		} else if (e.key === 'Escape') {
			editingId = null;
			editingValue = '';
		}
	}
</script>

<div class="tab-bar">
	<div class="tabs-list" role="tablist">
		{#each tabs as tab (tab.id)}
			<div class="tab-wrapper">
				<button
					class="tab"
					class:active={tab.id === activeTabId}
					onclick={() => onSelectTab(tab.id)}
					role="tab"
					aria-selected={tab.id === activeTabId}
					aria-label={tab.name}
				>
					{#if editingId === tab.id}
						<input
							type="text"
							class="tab-name-input"
							value={editingValue}
							onchange={(e) => (editingValue = e.currentTarget.value)}
							onkeydown={(e) => handleKeydown(e, tab.id)}
							onblur={() => finishEdit(tab.id)}
							onclick={(e) => e.stopPropagation()}
						/>
					{:else}
						<span
							class="tab-name"
							ondblclick={(e) => {
								e.stopPropagation();
								startEdit(tab);
							}}
							role="button"
							tabindex="0"
							onkeydown={(e) => {
								if ((e.key === 'Enter' || e.key === ' ') && e.target === document.activeElement) {
									e.preventDefault();
									startEdit(tab);
								}
							}}
							title="Double-click to rename"
						>
							{tab.name}
						</span>
					{/if}
				</button>

				{#if tabs.length > 1}
					<button
						class="tab-close"
						title="Close tab"
						onclick={(e) => {
							e.stopPropagation();
							onRemoveTab(tab.id);
						}}
						aria-label="Close {tab.name}"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				{/if}
			</div>
		{/each}

		<button class="add-tab-btn" title="Add new tab" onclick={onAddTab}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
		</button>
	</div>
</div>

<style>
	.tab-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		min-height: 44px;
		overflow-x: auto;
		overflow-y: hidden;
	}

	.tabs-list {
		display: flex;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
	}

	.tab-wrapper {
		display: flex;
		align-items: center;
		gap: 0;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 6px 6px 0 0;
		cursor: pointer;
		transition: all 0.15s ease;
		user-select: none;
		white-space: nowrap;
		min-width: 120px;
		max-width: 200px;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.tab:hover {
		background: var(--color-bg);
		border-color: var(--color-primary);
	}

	.tab.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.tab-name {
		flex: 1;
		font-size: 0.875rem;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		cursor: text;
	}

	.tab-name-input {
		flex: 1;
		background: var(--color-bg);
		border: 1px solid var(--color-primary);
		color: var(--color-text);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		outline: none;
	}

	.tab.active .tab-name-input {
		background: rgba(255, 255, 255, 0.1);
		border-color: white;
		color: white;
	}

	.tab-close {
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.tab-close:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	.tab-wrapper:has(.tab.active) .tab-close:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.add-tab-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		padding: 0.5rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
		font-family: inherit;
	}

	.add-tab-btn:hover {
		background: var(--color-bg);
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	@media (max-width: 768px) {
		.tab-bar {
			padding: 0.5rem;
		}

		.tab {
			min-width: 100px;
			max-width: 150px;
		}
	}
</style>
