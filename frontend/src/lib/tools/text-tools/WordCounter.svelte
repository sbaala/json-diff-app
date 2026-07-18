<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { TextService } from '$lib/services/text.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'word-counter',
		name: 'Word Counter',
		description: 'Count words, characters, lines, and more',
		category: 'text-utils',
		icon: 'bar-chart-2',
		keywords: ['count', 'word', 'character', 'line', 'statistics']
	};

	let input = $state('');
	let error: string | null = $state(null);
	let stats = $state<{
		characters: number;
		charactersNoSpaces: number;
		words: number;
		lines: number;
		paragraphs: number;
	} | null>(null);

	$effect(() => {
		void input;
		transform();
	});

	function transform() {
		if (!input) {
			stats = null;
			error = null;
			return;
		}

		try {
			stats = TextService.statistics(input);
			error = null;
		} catch (e) {
			error = (e as Error).message;
			stats = null;
		}
	}

	function handleInput() {
		transform();
	}

	function handleClear() {
		input = '';
		stats = null;
		error = null;
	}

	function handleSample() {
		input = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Second paragraph with more content.
And a third paragraph here.`;
		transform();
	}
</script>

<div class="tool-wrapper">
	<div class="input-section">
		<label for="word-input" class="input-label">Input</label>
		<textarea
			id="word-input"
			class="input-area"
			bind:value={input}
			onchange={handleInput}
			oninput={handleInput}
			placeholder="Paste text here..."
		></textarea>
	</div>

	<div class="divider"></div>

	{#if error}
		<div class="error-box">
			<div class="error-icon">⚠️</div>
			<div class="error-message">{error}</div>
		</div>
	{:else if stats}
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-value">{stats.characters}</div>
				<div class="stat-label">Characters (with spaces)</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{stats.charactersNoSpaces}</div>
				<div class="stat-label">Characters (no spaces)</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{stats.words}</div>
				<div class="stat-label">Words</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{stats.lines}</div>
				<div class="stat-label">Lines</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{stats.paragraphs}</div>
				<div class="stat-label">Paragraphs</div>
			</div>
		</div>
	{:else}
		<div class="empty-state">
			<div class="empty-icon">📊</div>
			<div class="empty-message">Statistics will appear here</div>
		</div>
	{/if}

	<div class="tool-footer">
		<button class="action-btn" onclick={handleSample}>📝 Sample</button>
		<button class="action-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--color-surface);
		border-radius: 8px;
		overflow: hidden;
	}

	.input-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		padding: var(--spacing-md);
		flex: 0 0 40%;
		border-bottom: 1px solid var(--color-border);
	}

	.input-label {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-text-secondary);
	}

	.input-area {
		flex: 1;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875rem;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
		resize: none;
	}

	.input-area:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.divider {
		height: 1px;
		background: var(--color-border);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		flex: 1;
		overflow-y: auto;
	}

	.stat-card {
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		text-align: center;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-primary);
		margin-bottom: var(--spacing-xs);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.error-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		color: var(--color-removed-border);
		background: rgba(251, 113, 133, 0.1);
		flex: 1;
	}

	.error-icon {
		font-size: 2rem;
	}

	.error-message {
		font-size: 0.875rem;
		text-align: center;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		flex: 1;
		color: var(--color-text-muted);
	}

	.empty-icon {
		font-size: 2.5rem;
		opacity: 0.5;
	}

	.empty-message {
		font-size: 0.875rem;
	}

	.tool-footer {
		display: flex;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border-top: 1px solid var(--color-border);
		background: var(--color-surface-elevated);
		justify-content: flex-end;
	}

	.action-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 8px 16px;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}
</style>
