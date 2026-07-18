<script lang="ts">
	export let query: string = '';
	export let placeholder: string = 'Search tools...';
	export let onChange: ((query: string) => void) | undefined = undefined;

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		query = target.value;
		if (onChange) {
			onChange(query);
		}
	}

	function handleClear() {
		query = '';
		if (onChange) {
			onChange('');
		}
	}
</script>

<div class="tool-search">
	<div class="search-input-wrapper">
		<span class="search-icon">🔍</span>
		<input
			class="search-input"
			type="text"
			{placeholder}
			value={query}
			on:input={handleInput}
		/>
		{#if query}
			<button class="clear-btn" on:click={handleClear} title="Clear search">✕</button>
		{/if}
	</div>
</div>

<style>
	.tool-search {
		padding: var(--spacing-md);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		position: relative;
	}

	.search-icon {
		font-size: 1rem;
		color: var(--color-text-secondary);
		pointer-events: none;
	}

	.search-input {
		flex: 1;
		padding: 8px 12px 8px 0;
		background: transparent;
		border: none;
		border-bottom: 2px solid var(--color-border);
		font-size: 0.875rem;
		color: var(--color-text);
		transition: all 0.2s ease;
	}

	.search-input::placeholder {
		color: var(--color-text-secondary);
	}

	.search-input:focus {
		outline: none;
		border-bottom-color: var(--color-primary);
	}

	.clear-btn {
		background: transparent;
		border: none;
		color: var(--color-text-secondary);
		font-size: 1rem;
		cursor: pointer;
		padding: 4px;
		transition: all 0.2s ease;
	}

	.clear-btn:hover {
		color: var(--color-text);
	}

	@media (max-width: 640px) {
		.tool-search {
			padding: var(--spacing-sm);
		}

		.search-input {
			font-size: 0.8125rem;
		}
	}
</style>
