<script lang="ts">
	import { DateService } from '$lib/services/date.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'unix-timestamp',
		name: 'Unix Timestamp Converter',
		description: 'Convert between Unix timestamps and dates',
		category: 'date-time',
		icon: 'clock',
		keywords: ['timestamp', 'unix', 'epoch', 'date']
	};

	let timestamp = $state('');
	let date = $state('');
	let error: string | null = $state(null);

	function timestampToDate() {
		if (!timestamp) {
			date = '';
			error = null;
			return;
		}

		try {
			const ts = parseInt(timestamp);
			if (isNaN(ts)) throw new Error('Invalid timestamp');
			const d = DateService.timestampToDate(ts);
			date = DateService.toIso(d);
			error = null;
		} catch (e) {
			error = (e as Error).message;
			date = '';
		}
	}

	function dateToTimestamp() {
		if (!date) {
			timestamp = '';
			error = null;
			return;
		}

		try {
			const d = new Date(date);
			if (isNaN(d.getTime())) throw new Error('Invalid date');
			timestamp = DateService.toUnix(d).toString();
			error = null;
		} catch (e) {
			error = (e as Error).message;
			timestamp = '';
		}
	}

	function handleTimestampInput() {
		timestampToDate();
	}

	function handleDateInput() {
		dateToTimestamp();
	}

	function handleNow() {
		timestamp = Math.floor(Date.now() / 1000).toString();
		timestampToDate();
	}

	function handleNowDate() {
		date = new Date().toISOString();
		dateToTimestamp();
	}

	function handleClear() {
		timestamp = '';
		date = '';
		error = null;
	}
</script>

<div class="converter-container">
	<div class="header">
		<h2 class="title">Unix Timestamp Converter</h2>
		<p class="description">{tool.description}</p>
	</div>

	{#if error}
		<div class="error-box">
			<div class="error-icon">⚠️</div>
			<div class="error-message">{error}</div>
		</div>
	{/if}

	<div class="converter-layout">
		<div class="input-column">
			<label for="timestamp-input" class="column-label">Unix Timestamp (seconds)</label>
			<div class="input-group">
				<input
					id="timestamp-input"
					type="number"
					class="input-field"
					bind:value={timestamp}
					oninput={handleTimestampInput}
					placeholder="e.g. 1704067200"
				/>
				<button class="quick-btn" onclick={handleNow}>Now</button>
			</div>
		</div>

		<div class="divider"></div>

		<div class="input-column">
			<label for="date-input" class="column-label">ISO 8601 Date</label>
			<div class="input-group">
				<input
					id="date-input"
					type="datetime-local"
					class="input-field"
					bind:value={date}
					oninput={handleDateInput}
				/>
				<button class="quick-btn" onclick={handleNowDate}>Now</button>
			</div>
		</div>
	</div>

	<div class="footer">
		<button class="action-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>
</div>

<style>
	.converter-container {
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

	.converter-layout {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 0;
		flex: 1;
		min-height: 0;
	}

	.input-column {
		display: flex;
		flex-direction: column;
		padding: var(--spacing-md);
		gap: var(--spacing-sm);
	}

	.column-label {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-text-muted);
	}

	.input-group {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
	}

	.input-field {
		flex: 1;
		padding: 10px 12px;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: monospace;
	}

	.input-field:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
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

	.divider {
		width: 1px;
		background: var(--color-border);
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

	@media (max-width: 768px) {
		.converter-layout {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto auto;
		}

		.divider {
			height: 1px;
			width: 100%;
		}
	}
</style>
