<script lang="ts">
	export let isLoading: boolean = false;
	export let onClear: (() => void) | undefined = undefined;
	export let onCopy: (() => void) | undefined = undefined;
	export let onSample: (() => void) | undefined = undefined;
	export let canCopy: boolean = true;
	export let copiedFeedback: boolean = false;

	async function handleCopy() {
		if (onCopy) {
			onCopy();
			copiedFeedback = true;
			setTimeout(() => {
				copiedFeedback = false;
			}, 2000);
		}
	}

	function handleClear() {
		if (onClear) {
			onClear();
		}
	}

	function handleSample() {
		if (onSample) {
			onSample();
		}
	}
</script>

<div class="tool-actions">
	{#if onSample}
		<button class="action-btn" on:click={handleSample} disabled={isLoading} title="Load sample data">
			📝 Sample
		</button>
	{/if}

	{#if onCopy}
		<button
			class="action-btn"
			class:copied={copiedFeedback}
			on:click={handleCopy}
			disabled={!canCopy || isLoading}
			title="Copy output to clipboard"
		>
			{copiedFeedback ? '✓ Copied!' : '📋 Copy'}
		</button>
	{/if}

	{#if onClear}
		<button class="action-btn" on:click={handleClear} disabled={isLoading} title="Clear all">
			🗑️ Clear
		</button>
	{/if}
</div>

<style>
	.tool-actions {
		display: flex;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
		justify-content: flex-end;
		flex-wrap: wrap;
	}

	.action-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 8px 16px;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.action-btn:hover:not(:disabled) {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.action-btn.copied {
		background: var(--color-added);
		color: white;
		border-color: var(--color-added);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.tool-actions {
			flex-direction: column;
		}

		.action-btn {
			width: 100%;
		}
	}
</style>
