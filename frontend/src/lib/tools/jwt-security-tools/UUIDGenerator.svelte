<script lang="ts">
	import { CryptoService } from '$lib/services/crypto.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'uuid-generator',
		name: 'UUID Generator',
		description: 'Generate UUIDs (v1, v4, v5)',
		category: 'jwt-security',
		icon: 'hash',
		keywords: ['uuid', 'generate', 'unique', 'identifier']
	};

	let generatedUUIDs: string[] = $state([]);
	let count = $state(1);
	let uuidVersion = $state<'v4' | 'v5'>('v4');
	let namespace = $state('');
	let name = $state('');

	function generateUUIDs() {
		if (uuidVersion === 'v5' && (!namespace || !name)) {
			return;
		}

		generatedUUIDs = [];
		const numCount = Math.min(parseInt(count.toString()) || 1, 100);

		for (let i = 0; i < numCount; i++) {
			if (uuidVersion === 'v4') {
				generatedUUIDs.push(CryptoService.generateUUID());
			} else {
				generatedUUIDs.push(CryptoService.generateUUIDv5(namespace, `${name}-${i}`));
			}
		}
	}

	function handleVersionChange(e: Event) {
		uuidVersion = (e.target as HTMLSelectElement).value as typeof uuidVersion;
	}

	function handleCountChange() {
		if (generatedUUIDs.length > 0) {
			generateUUIDs();
		}
	}

	function copyToClipboard(uuid: string) {
		navigator.clipboard.writeText(uuid);
	}

	function copyAll() {
		navigator.clipboard.writeText(generatedUUIDs.join('\n'));
	}

	function handleClear() {
		generatedUUIDs = [];
		count = 1;
		namespace = '';
		name = '';
	}
</script>

<div class="uuid-container">
	<div class="header">
		<h2 class="title">UUID Generator</h2>
		<p class="description">{tool.description}</p>
	</div>

	<div class="controls-section">
		<div class="control-group">
			<label for="version">UUID Version:</label>
			<select id="version" value={uuidVersion} onchange={handleVersionChange}>
				<option value="v4">UUID v4 (Random)</option>
				<option value="v5">UUID v5 (Namespace)</option>
			</select>
		</div>

		{#if uuidVersion === 'v5'}
			<div class="control-group">
				<label for="namespace">Namespace:</label>
				<input
					id="namespace"
					type="text"
					bind:value={namespace}
					placeholder="e.g., my-app"
				/>
			</div>
			<div class="control-group">
				<label for="name">Name:</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					placeholder="e.g., user-123"
				/>
			</div>
		{/if}

		<div class="control-group">
			<label for="count">Count (1-100):</label>
			<input
				id="count"
				type="number"
				bind:value={count}
				min="1"
				max="100"
				onchange={handleCountChange}
			/>
		</div>

		<button class="generate-btn" onclick={generateUUIDs}>Generate</button>
	</div>

	{#if generatedUUIDs.length > 0}
		<div class="results-section">
			<div class="results-header">
				<div class="result-count">{generatedUUIDs.length} UUID{generatedUUIDs.length !== 1 ? 's' : ''}</div>
				<button class="copy-all-btn" onclick={copyAll}>📋 Copy All</button>
			</div>
			<div class="uuids-list">
				{#each generatedUUIDs as uuid (uuid)}
					<div class="uuid-item">
						<code class="uuid-value">{uuid}</code>
						<button class="copy-btn" onclick={() => copyToClipboard(uuid)} title="Copy UUID">
							📋
						</button>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="placeholder">Click "Generate" to create UUIDs</div>
	{/if}

	<div class="footer">
		<button class="action-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>
</div>

<style>
	.uuid-container {
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

	.controls-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface-elevated);
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.control-group label {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-text-muted);
	}

	.control-group input,
	.control-group select {
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.control-group input:focus,
	.control-group select:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.generate-btn {
		padding: 10px 16px;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.generate-btn:hover {
		background: var(--color-primary-hover, var(--color-primary));
		opacity: 0.9;
	}

	.results-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-md);
	}

	.result-count {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-text-muted);
		letter-spacing: 0.5px;
	}

	.copy-all-btn {
		padding: 8px 12px;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.copy-all-btn:hover {
		background: var(--color-primary-hover, var(--color-primary));
		opacity: 0.9;
	}

	.uuids-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.uuid-item {
		display: flex;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		align-items: center;
		justify-content: space-between;
	}

	.uuid-value {
		font-family: monospace;
		font-size: 0.8125rem;
		color: var(--color-primary);
		overflow: auto;
		flex: 1;
		white-space: nowrap;
	}

	.copy-btn {
		padding: 4px 8px;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.copy-btn:hover {
		background: var(--color-primary);
		border-color: var(--color-primary);
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
