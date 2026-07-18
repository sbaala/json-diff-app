<script lang="ts">
	export let value: string = '';
	export let placeholder: string = 'Enter input here...';
	export let label: string = 'Input';
	export let rows: number = 10;
	export let readonly: boolean = false;
	export let disabled: boolean = false;

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		value = target.value;
	}
</script>

<div class="tool-input-wrapper">
	<label for="tool-input" class="input-label">{label}</label>
	<textarea
		id="tool-input"
		class="tool-input"
		bind:value
		on:input={handleInput}
		{placeholder}
		{rows}
		{readonly}
		{disabled}
	></textarea>
</div>

<style>
	.tool-input-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--spacing-xs);
	}

	.input-label {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-text-secondary);
	}

	.tool-input {
		flex: 1;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875rem;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
		resize: none;
		transition: all 0.2s ease;
	}

	.tool-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.tool-input:disabled {
		background: var(--color-surface);
		cursor: not-allowed;
		opacity: 0.5;
	}

	.tool-input:readonly {
		background: var(--color-surface);
		cursor: default;
	}

	@media (prefers-color-scheme: dark) {
		.tool-input:focus {
			box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
		}
	}
</style>
