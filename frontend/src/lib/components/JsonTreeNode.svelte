<script lang="ts">
	interface Props {
		data: unknown;
		keyName?: string;
		path?: string;
		depth?: number;
		searchTerm?: string;
		expandAll?: boolean;
	}

	let { 
		data, 
		keyName = '', 
		path = '', 
		depth = 0, 
		searchTerm = '',
		expandAll = false 
	}: Props = $props();

	let expanded = $state(depth < 2 || expandAll);
	
	$effect(() => {
		if (expandAll) expanded = true;
	});

	const currentPath = $derived(path ? (keyName ? `${path}.${keyName}` : path) : keyName || 'root');
	
	const dataType = $derived(getDataType(data));
	const isExpandable = $derived(dataType === 'object' || dataType === 'array');
	const childEntries = $derived(isExpandable ? Object.entries(data as object) : []);
	const itemCount = $derived(isExpandable ? childEntries.length : 0);

	const matchesSearch = $derived(
		searchTerm
			? keyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			  (typeof data === 'string' && data.toLowerCase().includes(searchTerm.toLowerCase())) ||
			  (typeof data === 'number' && String(data).includes(searchTerm))
			: false
	);

	function getDataType(value: unknown): string {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (Array.isArray(value)) return 'array';
		return typeof value;
	}

	function formatValue(value: unknown): string {
		if (typeof value === 'string') return `"${value}"`;
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		return String(value);
	}

	function toggle() {
		expanded = !expanded;
	}

	async function copyPath() {
		try {
			await navigator.clipboard.writeText(currentPath);
		} catch {
			// Clipboard not available
		}
	}

	async function copyValue() {
		try {
			const text = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
			await navigator.clipboard.writeText(text);
		} catch {
			// Clipboard not available
		}
	}
</script>

<div class="tree-node" class:highlight={matchesSearch}>
	<div class="node-row" style="padding-left: {depth * 20}px">
		{#if isExpandable}
			<button class="toggle-btn" onclick={toggle} aria-expanded={expanded}>
				<svg class="toggle-icon" class:expanded width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
					<path d="M9 18l6-6-6-6" />
				</svg>
			</button>
		{:else}
			<span class="toggle-spacer"></span>
		{/if}

		<span class="node-content">
			{#if keyName}
				<span class="key">{keyName}</span>
				<span class="colon">:</span>
			{/if}

			{#if isExpandable}
				<span class="bracket">{dataType === 'array' ? '[' : '{'}</span>
				{#if !expanded}
					<span class="collapsed-preview">
						{itemCount} {dataType === 'array' ? 'items' : 'keys'}
					</span>
					<span class="bracket">{dataType === 'array' ? ']' : '}'}</span>
				{/if}
			{:else}
				<span class="value {dataType}">{formatValue(data)}</span>
			{/if}

			<span class="type-badge">{dataType}</span>
		</span>

		<div class="node-actions">
			<button class="action-icon" onclick={copyPath} title="Copy path">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
					<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
				</svg>
			</button>
			<button class="action-icon" onclick={copyValue} title="Copy value">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
				</svg>
			</button>
		</div>
	</div>

	{#if isExpandable && expanded}
		<div class="children">
			{#each childEntries as [childKey, childValue]}
				<svelte:self
					data={childValue}
					keyName={childKey}
					path={currentPath}
					depth={depth + 1}
					{searchTerm}
					{expandAll}
				/>
			{/each}
			<div class="closing-bracket" style="padding-left: {depth * 20}px">
				<span class="toggle-spacer"></span>
				<span class="bracket">{dataType === 'array' ? ']' : '}'}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.tree-node {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.tree-node.highlight {
		background: rgba(139, 92, 246, 0.2);
		border-radius: 4px;
	}

	.node-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		transition: background 0.15s ease;
	}

	.node-row:hover {
		background: var(--color-surface);
	}

	.node-row:hover .node-actions {
		opacity: 1;
	}

	.toggle-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
	}

	.toggle-btn:hover {
		color: var(--color-primary);
	}

	.toggle-icon {
		transition: transform 0.15s ease;
	}

	.toggle-icon.expanded {
		transform: rotate(90deg);
	}

	.toggle-spacer {
		width: 16px;
		flex-shrink: 0;
	}

	.node-content {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
	}

	.key {
		color: var(--color-secondary);
		font-weight: 500;
	}

	.colon {
		color: var(--color-text-muted);
	}

	.bracket {
		color: var(--color-text-muted);
	}

	.collapsed-preview {
		color: var(--color-text-muted);
		font-style: italic;
		font-size: 0.75rem;
		padding: 0 0.25rem;
	}

	.value {
		word-break: break-all;
	}

	.value.string {
		color: var(--color-success);
	}

	.value.number {
		color: #f59e0b;
	}

	.value.boolean {
		color: var(--color-primary);
	}

	.value.null,
	.value.undefined {
		color: var(--color-error);
		font-style: italic;
	}

	.type-badge {
		font-size: 0.625rem;
		padding: 0.125rem 0.375rem;
		background: var(--color-surface);
		color: var(--color-text-muted);
		border-radius: 4px;
		margin-left: 0.5rem;
		text-transform: uppercase;
		font-weight: 600;
	}

	.node-actions {
		display: flex;
		gap: 0.25rem;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.action-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.action-icon:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}

	.children {
		border-left: 1px dashed var(--color-border);
		margin-left: 7px;
	}

	.closing-bracket {
		display: flex;
		align-items: center;
		padding: 0.125rem 0.5rem;
	}
</style>
