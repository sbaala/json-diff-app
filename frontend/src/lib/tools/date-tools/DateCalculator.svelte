<script lang="ts">
	import { DateService } from '$lib/services/date.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'date-calculator',
		name: 'Date Calculator',
		description: 'Calculate differences and add/subtract days',
		category: 'date-time',
		icon: 'calculator',
		keywords: ['date', 'calculate', 'difference', 'days']
	};

	let mode = $state<'difference' | 'add' | 'subtract'>('difference');
	let date1 = $state('');
	let date2 = $state('');
	let daysToAdd = $state('');
	let result = $state('');
	let error: string | null = $state(null);

	function calculateDifference() {
		if (!date1 || !date2) {
			result = '';
			error = null;
			return;
		}

		try {
			const d1 = new Date(date1);
			const d2 = new Date(date2);
			if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
				throw new Error('Invalid dates');
			}
			const days = DateService.getDaysBetween(d1, d2);
			result = `${days} days`;
			error = null;
		} catch (e) {
			error = (e as Error).message;
			result = '';
		}
	}

	function calculateAddDays() {
		if (!date1 || !daysToAdd) {
			result = '';
			error = null;
			return;
		}

		try {
			const d = new Date(date1);
			if (isNaN(d.getTime())) throw new Error('Invalid date');
			const days = parseInt(daysToAdd);
			if (isNaN(days)) throw new Error('Invalid number of days');
			const newDate = DateService.addDays(d, days);
			result = DateService.toIso(newDate);
			error = null;
		} catch (e) {
			error = (e as Error).message;
			result = '';
		}
	}

	function handleModeChange(e: Event) {
		mode = (e.target as HTMLSelectElement).value as typeof mode;
		result = '';
		error = null;
	}

	function handleCalculate() {
		switch (mode) {
			case 'difference':
				calculateDifference();
				break;
			case 'add':
			case 'subtract':
				calculateAddDays();
				break;
		}
	}

	function handleClear() {
		date1 = '';
		date2 = '';
		daysToAdd = '';
		result = '';
		error = null;
	}

	function handleNow() {
		date1 = new Date().toISOString().split('T')[0];
	}
</script>

<div class="calc-container">
	<div class="header">
		<h2 class="title">Date Calculator</h2>
		<p class="description">{tool.description}</p>
	</div>

	<div class="mode-selector">
		<label for="mode">Mode:</label>
		<select id="mode" value={mode} onchange={handleModeChange}>
			<option value="difference">Calculate difference</option>
			<option value="add">Add days</option>
			<option value="subtract">Subtract days</option>
		</select>
	</div>

	{#if error}
		<div class="error-box">
			<div class="error-icon">⚠️</div>
			<div class="error-message">{error}</div>
		</div>
	{/if}

	<div class="inputs-section">
		{#if mode === 'difference'}
			<div class="input-pair">
				<label for="date1">Date 1</label>
				<input
					id="date1"
					type="date"
					bind:value={date1}
					oninput={calculateDifference}
				/>
			</div>
			<div class="input-pair">
				<label for="date2">Date 2</label>
				<input
					id="date2"
					type="date"
					bind:value={date2}
					oninput={calculateDifference}
				/>
			</div>
		{:else}
			<div class="input-pair">
				<label for="date1">Date</label>
				<div class="input-with-button">
					<input
						id="date1"
						type="date"
						bind:value={date1}
						oninput={handleCalculate}
					/>
					<button class="quick-btn" onclick={handleNow}>Today</button>
				</div>
			</div>
			<div class="input-pair">
				<label for="days">Days to {mode}</label>
				<input
					id="days"
					type="number"
					bind:value={daysToAdd}
					oninput={handleCalculate}
					placeholder="Enter number of days"
				/>
			</div>
		{/if}
	</div>

	{#if result}
		<div class="result-box">
			<div class="result-label">Result</div>
			<div class="result-value">{result}</div>
		</div>
	{:else if !error}
		<div class="placeholder">Enter dates to calculate</div>
	{/if}

	<div class="footer">
		<button class="action-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>
</div>

<style>
	.calc-container {
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

	.mode-selector {
		display: flex;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-bottom: 1px solid var(--color-border);
		align-items: center;
	}

	.mode-selector label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	.mode-selector select {
		flex: 1;
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.mode-selector select:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.error-box {
		display: flex;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background: rgba(251, 113, 133, 0.1);
		border-bottom: 1px solid var(--color-removed-border);
		color: var(--color-removed-border);
	}

	.error-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.error-message {
		font-size: 0.875rem;
	}

	.inputs-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		flex: 1;
		min-height: 0;
	}

	.input-pair {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.input-pair label {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-text-muted);
	}

	.input-pair input {
		padding: 10px 12px;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.input-pair input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.input-with-button {
		display: flex;
		gap: var(--spacing-sm);
	}

	.input-with-button input {
		flex: 1;
	}

	.quick-btn {
		padding: 10px 16px;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
		font-weight: 500;
	}

	.quick-btn:hover {
		background: var(--color-primary-hover, var(--color-primary));
		opacity: 0.9;
	}

	.result-box {
		padding: var(--spacing-md);
		margin: var(--spacing-md);
		background: var(--color-surface-elevated);
		border: 2px solid var(--color-primary);
		border-radius: 6px;
		text-align: center;
	}

	.result-label {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-text-muted);
		margin-bottom: var(--spacing-xs);
	}

	.result-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-primary);
		font-family: monospace;
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
