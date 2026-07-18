<script lang="ts">
	import Self from './JsonNode.svelte';

	interface Props {
		value: unknown;
		keyName: string;
		isRoot?: boolean;
	}
	const { value, keyName, isRoot = false }: Props = $props();

	let expanded = $state(true);

	const isObject = value !== null && typeof value === 'object';
	const isArray = Array.isArray(value);
	const entries = isObject ? Object.entries(value as Record<string, unknown>) : [];

	function typeClass(v: unknown): string {
		if (v === null) return 'null';
		if (typeof v === 'string') return 'string';
		if (typeof v === 'number') return 'number';
		if (typeof v === 'boolean') return 'boolean';
		return 'other';
	}

	function preview(v: unknown): string {
		if (typeof v === 'string') return `"${v}"`;
		if (v === null) return 'null';
		return String(v);
	}
</script>

{#if isObject}
	<div class="node">
		<button class="toggle" onclick={() => (expanded = !expanded)}>
			<span class="arrow">{expanded ? '▼' : '▶'}</span>
			<span class="key">{keyName}</span>
			<span class="bracket">{isArray ? `[${entries.length}]` : `{${entries.length}}`}</span>
		</button>
		{#if expanded}
			<div class="children">
				{#each entries as [k, v]}
					<Self value={v} keyName={k} />
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<div class="leaf">
		<span class="key">{keyName}:</span>
		<span class="value {typeClass(value)}">{preview(value)}</span>
	</div>
{/if}

<style>
	.node { margin-left: 0; }
	.toggle { display: flex; align-items: center; gap: 6px; background: transparent; border: none; cursor: pointer; padding: 2px 0; color: var(--color-text); font-family: monospace; font-size: 0.85rem; }
	.arrow { color: var(--color-text-muted); font-size: 0.7rem; width: 12px; }
	.key { color: var(--color-primary); font-weight: 600; }
	.bracket { color: var(--color-text-muted); }
	.children { margin-left: 16px; border-left: 1px dashed var(--color-border); padding-left: 8px; }
	.leaf { display: flex; gap: 6px; padding: 2px 0 2px 18px; font-family: monospace; font-size: 0.85rem; }
	.leaf .key { color: var(--color-primary); }
	.value.string { color: #22c55e; }
	.value.number { color: #f59e0b; }
	.value.boolean { color: #a855f7; }
	.value.null { color: var(--color-text-muted); font-style: italic; }
</style>
