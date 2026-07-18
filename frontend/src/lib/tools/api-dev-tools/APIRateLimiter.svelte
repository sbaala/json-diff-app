<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'api-rate-limiter',
		name: 'API Rate Limiter Calculator',
		description: 'Calculate and simulate API rate limiting',
		category: 'api-dev',
		icon: 'zap',
		keywords: ['rate', 'limit', 'throttle', 'calculator']
	};

	let requestsPerWindow = $state(100);
	let windowSeconds = $state(60);
	let expectedRps = $state(5);

	let result = $derived.by(() => {
		const limitRps = requestsPerWindow / windowSeconds;
		const perMinute = limitRps * 60;
		const perHour = limitRps * 3600;
		const perDay = limitRps * 86400;
		const willExceed = expectedRps > limitRps;
		const utilizationPct = (expectedRps / limitRps) * 100;
		// Token bucket: time to exhaust burst then throttle
		const secondsToExhaust = willExceed
			? requestsPerWindow / (expectedRps - limitRps)
			: Infinity;
		return {
			limitRps,
			perMinute,
			perHour,
			perDay,
			willExceed,
			utilizationPct,
			secondsToExhaust
		};
	});

	function fmt(n: number): string {
		return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
	}
</script>

<div class="tool-wrapper">
	<div class="inputs">
		<div class="field">
			<label for="rpw">Requests per window</label>
			<input id="rpw" type="number" bind:value={requestsPerWindow} min="1" />
		</div>
		<div class="field">
			<label for="win">Window (seconds)</label>
			<input id="win" type="number" bind:value={windowSeconds} min="1" />
		</div>
		<div class="field">
			<label for="rps">Expected traffic (req/sec)</label>
			<input id="rps" type="number" bind:value={expectedRps} min="0" step="0.1" />
		</div>
	</div>

	<div class="status {result.willExceed ? 'warn' : 'ok'}">
		{#if result.willExceed}
			⚠️ Expected traffic exceeds the limit — requests will be throttled
		{:else}
			✓ Within limits at {fmt(result.utilizationPct)}% utilization
		{/if}
	</div>

	<div class="cards">
		<div class="card highlight">
			<div class="card-value">{fmt(result.limitRps)}</div>
			<div class="card-label">Allowed req/sec</div>
		</div>
		<div class="card">
			<div class="card-value">{fmt(result.perMinute)}</div>
			<div class="card-label">Per minute</div>
		</div>
		<div class="card">
			<div class="card-value">{fmt(result.perHour)}</div>
			<div class="card-label">Per hour</div>
		</div>
		<div class="card">
			<div class="card-value">{fmt(result.perDay)}</div>
			<div class="card-label">Per day</div>
		</div>
	</div>

	<div class="util-bar">
		<div class="util-track">
			<div class="util-fill {result.utilizationPct > 100 ? 'over' : ''}" style="width: {Math.min(100, result.utilizationPct)}%"></div>
		</div>
		<span class="util-text">{fmt(result.utilizationPct)}% of limit</span>
	</div>

	{#if result.willExceed && result.secondsToExhaust !== Infinity}
		<div class="note">
			At {expectedRps} req/s against {fmt(result.limitRps)} req/s allowed, a full bucket of
			{requestsPerWindow} tokens is exhausted in ~<strong>{fmt(result.secondsToExhaust)}s</strong>,
			after which requests are limited to {fmt(result.limitRps)}/s.
		</div>
	{/if}
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.inputs { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-md); }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); }
	label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	input { padding: 10px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-size: 0.9rem; }
	input:focus { outline: none; border-color: var(--color-primary); }
	.status { padding: var(--spacing-md); border-radius: 6px; font-weight: 600; }
	.status.ok { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
	.status.warn { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
	.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--spacing-md); }
	.card { background: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: 6px; padding: var(--spacing-md); text-align: center; }
	.card.highlight { border-color: var(--color-primary); background: rgba(99, 102, 241, 0.08); }
	.card-value { font-size: 1.6rem; font-weight: 700; color: var(--color-primary); }
	.card-label { font-size: 0.72rem; text-transform: uppercase; color: var(--color-text-muted); }
	.util-bar { display: flex; align-items: center; gap: var(--spacing-md); }
	.util-track { flex: 1; height: 10px; background: var(--color-border); border-radius: 5px; overflow: hidden; }
	.util-fill { height: 100%; background: #22c55e; transition: width 0.2s ease; }
	.util-fill.over { background: #ef4444; }
	.util-text { font-size: 0.85rem; font-weight: 600; color: var(--color-text-muted); }
	.note { font-size: 0.82rem; color: var(--color-text-muted); background: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-md); }
	@media (max-width: 640px) { .inputs { grid-template-columns: 1fr; } }
</style>
