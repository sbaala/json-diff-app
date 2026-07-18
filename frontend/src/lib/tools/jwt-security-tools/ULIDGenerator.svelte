<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'ulid-generator',
		name: 'ULID Generator',
		description: 'Generate ULIDs (sortable unique identifiers)',
		category: 'jwt-security',
		icon: 'hash',
		keywords: ['ulid', 'generate', 'unique', 'sortable']
	};

	const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

	let count = $state(5);
	let ulids = $state<string[]>([]);

	function encodeTime(now: number): string {
		let str = '';
		for (let i = 9; i >= 0; i--) {
			str = ENCODING[now % 32] + str;
			now = Math.floor(now / 32);
		}
		return str;
	}

	function encodeRandom(): string {
		const bytes = new Uint8Array(16);
		crypto.getRandomValues(bytes);
		let str = '';
		for (let i = 0; i < 16; i++) str += ENCODING[bytes[i] % 32];
		return str;
	}

	function generateUlid(): string {
		return encodeTime(Date.now()) + encodeRandom();
	}

	function generate() {
		const n = Math.max(1, Math.min(100, count));
		ulids = Array.from({ length: n }, () => generateUlid());
	}

	function copy(u: string) {
		navigator.clipboard.writeText(u);
	}

	function copyAll() {
		navigator.clipboard.writeText(ulids.join('\n'));
	}

	generate();
</script>

<div class="tool-wrapper">
	<div class="controls">
		<label for="count">Count:</label>
		<input id="count" type="number" bind:value={count} min="1" max="100" />
		<button class="gen-btn" onclick={generate}>🎲 Generate</button>
		{#if ulids.length > 1}
			<button class="copy-all-btn" onclick={copyAll}>📋 Copy All</button>
		{/if}
	</div>

	<div class="info-note">
		ULIDs are lexicographically sortable — the first 10 chars encode the timestamp,
		the last 16 are random. Sortable by creation time.
	</div>

	<div class="ulid-list">
		{#each ulids as u}
			<div class="ulid-row">
				<span class="ulid-time">{u.slice(0, 10)}</span><span class="ulid-rand">{u.slice(10)}</span>
				<button class="copy-btn" onclick={() => copy(u)}>📋</button>
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
	label {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		font-weight: 600;
	}
	input {
		width: 80px;
		padding: 8px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
	}
	.gen-btn,
	.copy-all-btn {
		background: var(--color-primary);
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.copy-all-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}
	.info-note {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		background: var(--color-surface-elevated);
		padding: var(--spacing-sm);
		border-radius: 4px;
		border: 1px solid var(--color-border);
	}
	.ulid-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	.ulid-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 8px 12px;
		font-family: monospace;
		font-size: 0.9rem;
	}
	.ulid-time {
		color: var(--color-primary);
		font-weight: 600;
	}
	.ulid-rand {
		color: var(--color-text-muted);
		flex: 1;
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
</style>
