<script lang="ts">
	import { DateService } from '$lib/services/date.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'timestamp-generator',
		name: 'Timestamp Generator',
		description: 'Generate Unix timestamps in various formats',
		category: 'date-time',
		icon: 'plus',
		keywords: ['timestamp', 'generate', 'unix', 'epoch']
	};

	let now = $state(new Date());

	let formats = $derived([
		{ label: 'Unix (seconds)', value: String(Math.floor(now.getTime() / 1000)) },
		{ label: 'Unix (milliseconds)', value: String(now.getTime()) },
		{ label: 'ISO 8601', value: now.toISOString() },
		{ label: 'UTC String', value: now.toUTCString() },
		{ label: 'Local String', value: now.toLocaleString() },
		{ label: 'Date only', value: DateService.format(now, 'YYYY-MM-DD') },
		{ label: 'Time only', value: DateService.format(now, 'HH:mm:ss') },
		{ label: 'RFC 2822', value: now.toUTCString() }
	]);

	let ticking = $state(true);
	let timer: ReturnType<typeof setInterval> | undefined;

	$effect(() => {
		if (ticking) {
			timer = setInterval(() => {
				now = new Date();
			}, 1000);
		}
		return () => {
			if (timer) clearInterval(timer);
		};
	});

	function refresh() {
		now = new Date();
	}

	function copy(value: string) {
		navigator.clipboard.writeText(value);
	}
</script>

<div class="tool-wrapper">
	<div class="controls">
		<button class="ctrl-btn" onclick={refresh}>🔄 Refresh</button>
		<label class="toggle">
			<input type="checkbox" bind:checked={ticking} /> Live update
		</label>
	</div>

	<div class="formats">
		{#each formats as f}
			<div class="format-row">
				<span class="format-label">{f.label}</span>
				<span class="format-value">{f.value}</span>
				<button class="copy-btn" onclick={() => copy(f.value)}>📋</button>
			</div>
		{/each}
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
	.controls {
		display: flex;
		gap: var(--spacing-md);
		align-items: center;
	}
	.ctrl-btn {
		background: var(--color-primary);
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.toggle {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-size: 0.85rem;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.formats {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	.format-row {
		display: grid;
		grid-template-columns: 200px 1fr auto;
		gap: var(--spacing-md);
		align-items: center;
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 10px 14px;
	}
	.format-label {
		font-weight: 600;
		font-size: 0.8rem;
		color: var(--color-primary);
	}
	.format-value {
		font-family: monospace;
		font-size: 0.85rem;
		color: var(--color-text);
		word-break: break-all;
	}
	.copy-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 4px 10px;
		border-radius: 4px;
		cursor: pointer;
	}
	.copy-btn:hover {
		background: var(--color-primary);
		color: white;
	}
	@media (max-width: 640px) {
		.format-row {
			grid-template-columns: 1fr auto;
		}
		.format-label {
			grid-column: 1 / -1;
		}
	}
</style>
