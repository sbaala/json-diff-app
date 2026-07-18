<script lang="ts">
	import { DateService } from '$lib/services/date.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'cron-parser',
		name: 'Cron Parser',
		description: 'Parse and explain cron expressions',
		category: 'date-time',
		icon: 'info',
		keywords: ['cron', 'parse', 'explain', 'expression']
	};

	let cron = $state('');
	let explanation = $state('');
	let error: string | null = $state(null);

	function parseCron() {
		if (!cron.trim()) {
			explanation = '';
			error = null;
			return;
		}

		try {
			const result = DateService.parseCronExpression(cron);
			if (result.startsWith('Invalid')) {
				error = result;
				explanation = '';
			} else {
				explanation = result;
				error = null;
			}
		} catch (e) {
			error = (e as Error).message;
			explanation = '';
		}
	}

	function handleInput() {
		parseCron();
	}

	function handleSample(sampleCron: string) {
		cron = sampleCron;
		parseCron();
	}

	function handleClear() {
		cron = '';
		explanation = '';
		error = null;
	}

	const samples = [
		{ label: '* * * * * (every minute)', value: '* * * * *' },
		{ label: '0 * * * * (every hour)', value: '0 * * * *' },
		{ label: '0 0 * * * (daily at midnight)', value: '0 0 * * *' },
		{ label: '0 0 1 * * (monthly on 1st)', value: '0 0 1 * *' },
		{ label: '0 0 * * 0 (weekly on Sunday)', value: '0 0 * * 0' }
	];
</script>

<div class="cron-container">
	<div class="header">
		<h2 class="title">Cron Expression Parser</h2>
		<p class="description">{tool.description}</p>
	</div>

	<div class="input-section">
		<label for="cron-input">Cron Expression</label>
		<div class="input-help">Format: minute hour day month day_of_week</div>
		<input
			id="cron-input"
			type="text"
			class="cron-input"
			bind:value={cron}
			oninput={handleInput}
			placeholder="e.g., 0 * * * * or 30 2 * * 1"
		/>
	</div>

	<div class="samples-section">
		<label>Quick samples:</label>
		<div class="samples-grid">
			{#each samples as sample}
				<button class="sample-btn" onclick={() => handleSample(sample.value)}>
					{sample.label}
				</button>
			{/each}
		</div>
	</div>

	{#if error}
		<div class="error-box">
			<div class="error-icon">⚠️</div>
			<div class="error-message">{error}</div>
		</div>
	{:else if explanation}
		<div class="result-box">
			<div class="result-label">Explanation</div>
			<div class="result-text">{explanation}</div>
		</div>
	{:else if cron}
		<div class="placeholder">Enter a valid cron expression</div>
	{/if}

	<div class="footer">
		<button class="action-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>
</div>

<style>
	.cron-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--color-surface);
		border-radius: 8px;
		overflow: hidden;
	}

	.header {
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface-elevated);
	}

	.title {
		margin: 0 0 var(--spacing-xs) 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.description {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.input-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
	}

	.input-section label {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-text-muted);
	}

	.input-help {
		font-size: 0.75rem;
		color: var(--color-text-subtle);
		font-style: italic;
	}

	.cron-input {
		padding: 10px 12px;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: monospace;
	}

	.cron-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.samples-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
	}

	.samples-section label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.samples-grid {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.sample-btn {
		text-align: left;
		padding: 8px 12px;
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: monospace;
	}

	.sample-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.error-box {
		display: flex;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background: rgba(251, 113, 133, 0.1);
		border-bottom: 1px solid var(--color-removed-border);
		color: var(--color-removed-border);
		flex: 1;
		min-height: 0;
	}

	.error-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.error-message {
		font-size: 0.875rem;
		overflow-y: auto;
	}

	.result-box {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-left: 4px solid var(--color-primary);
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	.result-label {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-text-muted);
	}

	.result-text {
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--color-text);
	}

	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.footer {
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
