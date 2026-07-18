<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'timezone-converter',
		name: 'Timezone Converter',
		description: 'Convert times between different timezones',
		category: 'date-time',
		icon: 'globe',
		keywords: ['timezone', 'time', 'utc', 'zone']
	};

	const zones = [
		'UTC',
		'America/New_York',
		'America/Chicago',
		'America/Denver',
		'America/Los_Angeles',
		'Europe/London',
		'Europe/Paris',
		'Europe/Berlin',
		'Asia/Kolkata',
		'Asia/Dubai',
		'Asia/Singapore',
		'Asia/Tokyo',
		'Australia/Sydney'
	];

	let dateTime = $state(new Date().toISOString().slice(0, 16));
	let sourceZone = $state('UTC');
	let error: string | null = $state(null);
	let results = $state<Array<{ zone: string; formatted: string }>>([]);

	function convert() {
		error = null;
		try {
			// Interpret the entered wall-clock time as being in the source zone.
			const base = new Date(dateTime);
			if (isNaN(base.getTime())) throw new Error('Invalid date/time');

			// Find the UTC instant that shows `dateTime` in sourceZone
			const asUtcGuess = new Date(dateTime + ':00Z');
			const shown = new Date(
				asUtcGuess.toLocaleString('en-US', { timeZone: sourceZone })
			);
			const offset = asUtcGuess.getTime() - shown.getTime();
			const instant = new Date(asUtcGuess.getTime() + offset);

			results = zones.map((zone) => ({
				zone,
				formatted: instant.toLocaleString('en-US', {
					timeZone: zone,
					dateStyle: 'medium',
					timeStyle: 'long'
				})
			}));
		} catch (e) {
			error = (e as Error).message;
			results = [];
		}
	}

	function setNow() {
		dateTime = new Date().toISOString().slice(0, 16);
		convert();
	}

	$effect(() => {
		void [dateTime, sourceZone];
		convert();
	});
</script>

<div class="tool-wrapper">
	<div class="controls">
		<div class="field">
			<label for="dt">Date & Time</label>
			<input id="dt" type="datetime-local" bind:value={dateTime} />
		</div>
		<div class="field">
			<label for="zone">Source Timezone</label>
			<select id="zone" bind:value={sourceZone}>
				{#each zones as z}
					<option value={z}>{z}</option>
				{/each}
			</select>
		</div>
		<button class="now-btn" onclick={setNow}>Now</button>
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else}
		<div class="results">
			{#each results as r}
				<div class="zone-row" class:source={r.zone === sourceZone}>
					<span class="zone-name">{r.zone}</span>
					<span class="zone-time">{r.formatted}</span>
				</div>
			{/each}
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
		align-items: flex-end;
		flex-wrap: wrap;
		background: var(--color-surface-elevated);
		padding: var(--spacing-md);
		border-radius: 6px;
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
	select {
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}
	input:focus,
	select:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.now-btn {
		background: var(--color-primary);
		color: white;
		border: none;
		padding: 9px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}
	.results {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	.zone-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 14px;
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		gap: var(--spacing-md);
	}
	.zone-row.source {
		border-color: var(--color-primary);
		background: rgba(99, 102, 241, 0.08);
	}
	.zone-name {
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--color-primary);
	}
	.zone-time {
		font-family: monospace;
		font-size: 0.85rem;
		color: var(--color-text);
		text-align: right;
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
