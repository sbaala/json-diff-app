<script lang="ts">
	export let value: string = '';
	export let label: string = 'Output';
	export let error: string | null = null;
	export let isLoading: boolean = false;

	function copyToClipboard() {
		navigator.clipboard.writeText(value).then(() => {
			// Visual feedback handled by parent
		});
	}
</script>

<div class="tool-output-wrapper">
	<div class="output-header">
		<label for="tool-output" class="output-label">{label}</label>
		{#if value && !error}
			<button class="copy-btn" on:click={copyToClipboard} title="Copy output">📋 Copy</button>
		{/if}
	</div>

	{#if isLoading}
		<div class="tool-output loading">
			<div class="spinner"></div>
			<span>Processing...</span>
		</div>
	{:else if error}
		<div class="tool-output error">
			<div class="error-icon">⚠️</div>
			<div class="error-message">{error}</div>
		</div>
	{:else if value}
		<textarea id="tool-output" class="tool-output" value={value} readonly rows={10}></textarea>
	{:else}
		<div class="tool-output empty">
			<div class="empty-message">Output will appear here</div>
		</div>
	{/if}
</div>

<style>
	.tool-output-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--spacing-xs);
	}

	.output-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.output-label {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-text-secondary);
	}

	.copy-btn {
		background: var(--color-primary);
		color: white;
		border: none;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.copy-btn:hover {
		background: var(--color-primary-hover, var(--color-primary));
		opacity: 0.9;
	}

	.tool-output {
		flex: 1;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875rem;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
		resize: none;
		min-height: 120px;
	}

	.tool-output.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		border: none;
		background: transparent;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.tool-output.error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-sm);
		border: 1px solid var(--color-removed);
		background: rgba(239, 68, 68, 0.1);
		color: var(--color-removed);
	}

	.error-icon {
		font-size: 1.5rem;
	}

	.error-message {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875rem;
		text-align: center;
		max-width: 100%;
		word-break: break-word;
		white-space: pre-wrap;
	}

	.tool-output.empty {
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px dashed var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
	}

	.empty-message {
		font-size: 0.875rem;
	}
</style>
