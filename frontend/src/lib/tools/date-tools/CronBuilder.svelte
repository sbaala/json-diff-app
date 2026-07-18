<script lang="ts">
	import { DateService } from '$lib/services/date.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'cron-builder',
		name: 'Cron Builder',
		description: 'Build and test cron expressions visually',
		category: 'date-time',
		icon: 'settings',
		keywords: ['cron', 'schedule', 'expression', 'build']
	};

	let minute = $state('*');
	let hour = $state('*');
	let dayOfMonth = $state('*');
	let month = $state('*');
	let dayOfWeek = $state('*');

	let expression = $derived(`${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`);
	let description = $derived(DateService.parseCronExpression(expression));

	const presets = [
		{ label: 'Every minute', values: ['*', '*', '*', '*', '*'] },
		{ label: 'Every hour', values: ['0', '*', '*', '*', '*'] },
		{ label: 'Daily midnight', values: ['0', '0', '*', '*', '*'] },
		{ label: 'Weekly (Sun)', values: ['0', '0', '*', '*', '0'] },
		{ label: 'Monthly (1st)', values: ['0', '0', '1', '*', '*'] },
		{ label: 'Weekdays 9am', values: ['0', '9', '*', '*', '1-5'] }
	];

	function applyPreset(values: string[]) {
		[minute, hour, dayOfMonth, month, dayOfWeek] = values;
	}

	function copyExpr() {
		navigator.clipboard.writeText(expression);
	}
</script>

<div class="tool-wrapper">
	<div class="presets">
		{#each presets as p}
			<button class="preset-btn" onclick={() => applyPreset(p.values)}>{p.label}</button>
		{/each}
	</div>

	<div class="fields">
		<div class="field">
			<label for="min">Minute</label>
			<input id="min" bind:value={minute} placeholder="*" />
			<span class="hint">0-59</span>
		</div>
		<div class="field">
			<label for="hr">Hour</label>
			<input id="hr" bind:value={hour} placeholder="*" />
			<span class="hint">0-23</span>
		</div>
		<div class="field">
			<label for="dom">Day (Month)</label>
			<input id="dom" bind:value={dayOfMonth} placeholder="*" />
			<span class="hint">1-31</span>
		</div>
		<div class="field">
			<label for="mon">Month</label>
			<input id="mon" bind:value={month} placeholder="*" />
			<span class="hint">1-12</span>
		</div>
		<div class="field">
			<label for="dow">Day (Week)</label>
			<input id="dow" bind:value={dayOfWeek} placeholder="*" />
			<span class="hint">0-6</span>
		</div>
	</div>

	<div class="output-box">
		<code class="expression">{expression}</code>
		<button class="copy-btn" onclick={copyExpr}>📋 Copy</button>
	</div>

	<div class="desc-box">
		<span class="desc-label">Description</span>
		<span class="desc-text">{description}</span>
	</div>
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
	}
	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
	}
	.preset-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.preset-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: var(--spacing-sm);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}
	input {
		padding: 8px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.9rem;
		text-align: center;
	}
	input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.hint {
		font-size: 0.7rem;
		color: var(--color-text-muted);
		text-align: center;
	}
	.output-box {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-md);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
	}
	.expression {
		font-family: monospace;
		font-size: 1.25rem;
		color: var(--color-primary);
		font-weight: 600;
		letter-spacing: 2px;
	}
	.copy-btn {
		background: var(--color-primary);
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.desc-box {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
	}
	.desc-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-primary);
	}
	.desc-text {
		font-size: 0.95rem;
		color: var(--color-text);
	}
	@media (max-width: 640px) {
		.fields {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
