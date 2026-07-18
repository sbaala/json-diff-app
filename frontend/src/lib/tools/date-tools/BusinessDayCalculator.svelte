<script lang="ts">
	import { DateService } from '$lib/services/date.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'business-day-calculator',
		name: 'Business Day Calculator',
		description: 'Calculate business days excluding weekends and holidays',
		category: 'date-time',
		icon: 'briefcase',
		keywords: ['business', 'day', 'weekend', 'holiday']
	};

	const today = new Date().toISOString().slice(0, 10);
	let startDate = $state(today);
	let endDate = $state(today);
	let holidays = $state('');
	let error: string | null = $state(null);
	let result = $state<{ business: number; total: number; weekends: number; holidays: number } | null>(
		null
	);

	function calculate() {
		error = null;
		try {
			const start = new Date(startDate);
			const end = new Date(endDate);
			if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Invalid dates');
			if (end < start) throw new Error('End date must be after start date');

			const holidayDates = holidays
				.split(/[,\n]/)
				.map((h) => h.trim())
				.filter((h) => h)
				.map((h) => new Date(h))
				.filter((d) => !isNaN(d.getTime()));

			const totalDays = DateService.getDaysBetween(start, end);
			const business = DateService.getBusinessDaysBetween(
				start,
				new Date(end.getTime() + 86400000),
				holidayDates
			);

			// count weekends
			let weekends = 0;
			const cur = new Date(start);
			while (cur <= end) {
				const d = cur.getDay();
				if (d === 0 || d === 6) weekends++;
				cur.setDate(cur.getDate() + 1);
			}

			result = {
				business,
				total: totalDays + 1,
				weekends,
				holidays: holidayDates.length
			};
		} catch (e) {
			error = (e as Error).message;
			result = null;
		}
	}

	$effect(() => {
		void [startDate, endDate, holidays];
		calculate();
	});
</script>

<div class="tool-wrapper">
	<div class="controls">
		<div class="field">
			<label for="start">Start Date</label>
			<input id="start" type="date" bind:value={startDate} />
		</div>
		<div class="field">
			<label for="end">End Date</label>
			<input id="end" type="date" bind:value={endDate} />
		</div>
	</div>
	<div class="field">
		<label for="hol">Holidays (comma or newline separated, e.g. 2026-01-01)</label>
		<textarea id="hol" bind:value={holidays} placeholder="2026-01-01, 2026-12-25"></textarea>
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else if result}
		<div class="results">
			<div class="stat-card highlight">
				<div class="stat-value">{result.business}</div>
				<div class="stat-label">Business Days</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{result.total}</div>
				<div class="stat-label">Total Days</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{result.weekends}</div>
				<div class="stat-label">Weekend Days</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{result.holidays}</div>
				<div class="stat-label">Holidays</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
	}
	.controls {
		display: flex;
		gap: var(--spacing-md);
		flex-wrap: wrap;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		flex: 1;
		min-width: 180px;
	}
	label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}
	input,
	textarea {
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}
	textarea {
		min-height: 60px;
		resize: vertical;
		font-family: monospace;
	}
	input:focus,
	textarea:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.results {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: var(--spacing-md);
	}
	.stat-card {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
		text-align: center;
	}
	.stat-card.highlight {
		border-color: var(--color-primary);
		background: rgba(99, 102, 241, 0.08);
	}
	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-primary);
	}
	.stat-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-text-muted);
	}
	.error-box {
		padding: var(--spacing-md);
		background: rgba(251, 113, 133, 0.1);
		border: 1px solid var(--color-removed-border);
		border-radius: 4px;
		color: var(--color-removed-border);
		font-size: 0.875rem;
	}
</style>
