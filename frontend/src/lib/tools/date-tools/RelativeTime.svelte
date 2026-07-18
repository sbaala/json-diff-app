<script lang="ts">
	import { DateService } from '$lib/services/date.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'relative-time',
		name: 'Relative Time',
		description: 'Convert dates to relative times (2 hours ago, etc)',
		category: 'date-time',
		icon: 'clock',
		keywords: ['relative', 'time', 'ago', 'humanize']
	};

	let input = $state('');
	let error: string | null = $state(null);
	let relative = $state('');
	let absolute = $state('');
	let direction = $state<'past' | 'future' | ''>('');

	function compute() {
		if (!input.trim()) {
			relative = '';
			absolute = '';
			error = null;
			return;
		}
		try {
			let date: Date;
			const trimmed = input.trim();
			if (/^\d{10}$/.test(trimmed)) date = new Date(parseInt(trimmed) * 1000);
			else if (/^\d{13}$/.test(trimmed)) date = new Date(parseInt(trimmed));
			else date = new Date(trimmed);

			if (isNaN(date.getTime())) throw new Error('Unrecognized date format');

			const now = new Date();
			direction = date.getTime() > now.getTime() ? 'future' : 'past';

			if (direction === 'future') {
				const seconds = Math.floor((date.getTime() - now.getTime()) / 1000);
				relative = 'in ' + humanize(seconds);
			} else {
				relative = DateService.formatRelative(date);
			}
			absolute = date.toLocaleString();
			error = null;
		} catch (e) {
			error = (e as Error).message;
			relative = '';
			absolute = '';
		}
	}

	function humanize(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
		if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
		if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`;
		if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo`;
		return `${Math.floor(seconds / 31536000)}y`;
	}

	function handleClear() {
		input = '';
		relative = '';
		absolute = '';
		error = null;
	}

	function handleSample() {
		input = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
		compute();
	}

	$effect(() => {
		void input;
		compute();
	});
</script>

<div class="tool-wrapper">
	<div class="field">
		<label for="dt">Date, ISO string, or Unix timestamp</label>
		<input id="dt" bind:value={input} placeholder="2026-01-01T00:00:00Z or 1735689600" />
	</div>

	<div class="quick">
		<button class="quick-btn" onclick={handleSample}>3 hours ago</button>
		<button class="quick-btn" onclick={() => { input = new Date().toISOString(); }}>Now</button>
		<button class="quick-btn" onclick={() => { input = new Date(Date.now() + 86400000 * 7).toISOString(); }}>Next week</button>
		<button class="quick-btn" onclick={handleClear}>Clear</button>
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else if relative}
		<div class="result-card {direction}">
			<div class="relative-text">{relative}</div>
			<div class="absolute-text">{absolute}</div>
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
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}
	input {
		padding: 10px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.9rem;
		font-family: monospace;
	}
	input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.quick {
		display: flex;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}
	.quick-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
	}
	.quick-btn:hover {
		background: var(--color-primary);
		color: white;
	}
	.result-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-lg);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}
	.result-card.future {
		border-color: #22c55e;
	}
	.result-card.past {
		border-color: var(--color-primary);
	}
	.relative-text {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-primary);
	}
	.absolute-text {
		font-size: 0.9rem;
		color: var(--color-text-muted);
		font-family: monospace;
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
