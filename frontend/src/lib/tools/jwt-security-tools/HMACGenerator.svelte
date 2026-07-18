<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { CryptoService } from '$lib/services/crypto.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'hmac-generator',
		name: 'HMAC Generator',
		description: 'Generate HMAC signatures with various algorithms',
		category: 'jwt-security',
		icon: 'key',
		keywords: ['hmac', 'signature', 'generate', 'hash']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let secret = $state('your-secret-key');
	let algorithm = $state<'SHA256' | 'SHA512'>('SHA256');
	let outputFormat = $state<'hex' | 'base64'>('hex');

	async function generateHMAC() {
		if (!input || !secret) {
			output = '';
			error = null;
			return;
		}

		try {
			let result: string;

			if (algorithm === 'SHA256') {
				result = await CryptoService.hmacSha256(input, secret);
			} else {
				result = await CryptoService.hmacSha512(input, secret);
			}

			if (outputFormat === 'base64') {
				result = btoa(result);
			}

			output = result;
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleInput() {
		generateHMAC();
	}

	function handleSecretChange() {
		generateHMAC();
	}

	function handleAlgorithmChange(e: Event) {
		algorithm = (e.target as HTMLSelectElement).value as typeof algorithm;
		generateHMAC();
	}

	function handleFormatChange(e: Event) {
		outputFormat = (e.target as HTMLSelectElement).value as typeof outputFormat;
		generateHMAC();
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
		secret = 'your-secret-key';
	}

	function handleSample() {
		input = 'Hello World!';
		secret = 'your-secret-key';
		generateHMAC();
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
		<label for="secret">Secret:</label>
		<input
			id="secret"
			type="password"
			bind:value={secret}
			onchange={handleSecretChange}
			placeholder="Enter your secret key"
			class="input-field"
		/>

		<label for="algorithm">Algorithm:</label>
		<select id="algorithm" value={algorithm} onchange={handleAlgorithmChange}>
			<option value="SHA256">HMAC-SHA256</option>
			<option value="SHA512">HMAC-SHA512</option>
		</select>

		<label for="format">Format:</label>
		<select id="format" value={outputFormat} onchange={handleFormatChange}>
			<option value="hex">Hex</option>
			<option value="base64">Base64</option>
		</select>
	</div>
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
		flex-wrap: wrap;
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	.input-field,
	select {
		flex: 1;
		min-width: 150px;
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.input-field:focus,
	select:focus {
		outline: none;
		border-color: var(--color-primary);
	}
</style>
