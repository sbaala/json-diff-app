<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { CryptoService } from '$lib/services/crypto.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'hash-generator',
		name: 'Hash Generator',
		description: 'Generate hashes (MD5, SHA1, SHA256, SHA512)',
		category: 'jwt-security',
		icon: 'key',
		keywords: ['hash', 'md5', 'sha', 'generate', 'checksum']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let algorithm = $state<'SHA256' | 'SHA512' | 'SHA1' | 'MD5'>('SHA256');
	let hashResults = $state<
		| {
				sha256?: string;
				sha512?: string;
				sha1?: string;
				md5?: string;
		  }
		| null
	>(null);

	async function generateHash() {
		if (!input) {
			output = '';
			hashResults = null;
			error = null;
			return;
		}

		try {
			const results: typeof hashResults = {};

			if (algorithm === 'SHA256') {
				results.sha256 = await CryptoService.sha256(input);
			} else if (algorithm === 'SHA512') {
				results.sha512 = await CryptoService.sha512(input);
			} else if (algorithm === 'SHA1') {
				results.sha1 = await CryptoService.sha1(input);
			} else if (algorithm === 'MD5') {
				results.md5 = await CryptoService.md5(input);
			}

			hashResults = results;
			output = Object.values(results).join('');
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
			hashResults = null;
		}
	}

	function handleInput() {
		generateHash();
	}

	function handleAlgorithmChange(e: Event) {
		algorithm = (e.target as HTMLSelectElement).value as typeof algorithm;
		generateHash();
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
		hashResults = null;
	}

	function handleSample() {
		input = 'Hello World!';
		generateHash();
	}

	function copyHash(value: string) {
		navigator.clipboard.writeText(value);
	}
</script>

<div class="tool-wrapper">
	<ToolContainer
		{tool}
		bind:input
		bind:output
		bind:error
		onClear={handleClear}
		onSample={handleSample}
	/>

	<div class="tool-controls">
		<label for="algorithm">Algorithm:</label>
		<select id="algorithm" value={algorithm} onchange={handleAlgorithmChange}>
			<option value="SHA256">SHA256</option>
			<option value="SHA512">SHA512</option>
			<option value="SHA1">SHA1</option>
			<option value="MD5">MD5</option>
		</select>
	</div>

	{#if hashResults}
		<div class="results-grid">
			{#each Object.entries(hashResults).filter(([, v]) => v) as [alg, hash]}
				<div class="hash-card">
					<div class="hash-label">{alg}</div>
					<div class="hash-value">{hash}</div>
					<button class="copy-btn" onclick={() => copyHash(hash)}>📋 Copy</button>
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
	}

	.tool-controls {
		display: flex;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-top: 1px solid var(--color-border);
		align-items: center;
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	select {
		flex: 1;
		max-width: 300px;
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	select:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		flex: 1;
		overflow-y: auto;
	}

	.hash-card {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.hash-label {
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-primary);
	}

	.hash-value {
		font-family: monospace;
		font-size: 0.75rem;
		word-break: break-all;
		background: var(--color-bg);
		padding: var(--spacing-sm);
		border-radius: 4px;
		border: 1px solid var(--color-border);
	}

	.copy-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.copy-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}
</style>
