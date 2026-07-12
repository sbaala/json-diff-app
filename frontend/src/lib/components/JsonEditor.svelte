<script lang="ts">
	interface Props {
		value: string;
		label: string;
		placeholder?: string;
		error?: string | null;
		onchange?: (value: string) => void;
	}

	let { value = $bindable(), label, placeholder = '', error = null, onchange }: Props = $props();

	let lineCount = $derived(value.split('\n').length);

	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		value = target.value;
		onchange?.(value);
	}

	function formatJson() {
		try {
			const parsed = JSON.parse(value);
			value = JSON.stringify(parsed, null, 2);
			onchange?.(value);
		} catch {
			// Invalid JSON, don't format
		}
	}

	function minifyJson() {
		try {
			const parsed = JSON.parse(value);
			value = JSON.stringify(parsed);
			onchange?.(value);
		} catch {
			// Invalid JSON, don't minify
		}
	}

	function clearEditor() {
		value = '';
		onchange?.('');
	}
</script>

<div class="editor-container">
	<div class="editor-header">
		<span class="editor-label">{label}</span>
		<div class="editor-actions">
			<button type="button" class="action-btn" onclick={formatJson} title="Format JSON">
				Format
			</button>
			<button type="button" class="action-btn" onclick={minifyJson} title="Minify JSON">
				Minify
			</button>
			<button type="button" class="action-btn" onclick={clearEditor} title="Clear">
				Clear
			</button>
		</div>
	</div>
	<div class="editor-wrapper" class:has-error={error}>
		<div class="line-numbers">
			{#each Array(Math.max(lineCount, 10)) as _, i}
				<span>{i + 1}</span>
			{/each}
		</div>
		<textarea
			class="editor-textarea"
			{placeholder}
			{value}
			oninput={handleInput}
			spellcheck="false"
		></textarea>
	</div>
	{#if error}
		<div class="error-message">{error}</div>
	{/if}
</div>

<style>
	.editor-container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	.editor-label {
		font-weight: 600;
		color: var(--color-text);
	}

	.editor-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text-muted);
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.editor-wrapper {
		display: flex;
		flex: 1;
		overflow: hidden;
		border-radius: 0 0 var(--radius) var(--radius);
	}

	.editor-wrapper.has-error {
		border: 2px solid var(--color-error);
	}

	.line-numbers {
		display: flex;
		flex-direction: column;
		padding: 1rem 0.5rem;
		background: var(--color-bg);
		border-right: 1px solid var(--color-border);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-text-muted);
		text-align: right;
		user-select: none;
		min-width: 3rem;
	}

	.line-numbers span {
		line-height: 1.5;
	}

	.editor-textarea {
		flex: 1;
		padding: 1rem;
		border: none;
		resize: none;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.5;
		background: var(--color-surface);
		color: var(--color-text);
		outline: none;
	}

	.editor-textarea::placeholder {
		color: var(--color-text-muted);
	}

	.error-message {
		padding: 0.5rem 1rem;
		background: var(--color-removed);
		color: var(--color-error);
		font-size: 0.875rem;
		border-top: 1px solid var(--color-removed-border);
	}
</style>
