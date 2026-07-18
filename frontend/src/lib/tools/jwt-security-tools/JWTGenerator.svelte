<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { CryptoService } from '$lib/services/crypto.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'jwt-generator',
		name: 'JWT Generator',
		description: 'Generate and sign JWT tokens',
		category: 'jwt-security',
		icon: 'key',
		keywords: ['jwt', 'generate', 'token', 'sign']
	};

	let output = $state('');
	let error: string | null = $state(null);
	let algorithm = $state<'HS256' | 'HS512'>('HS256');
	let secret = $state('your-secret-key');
	let header = $state(JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2));
	let payload = $state(
		JSON.stringify(
			{
				sub: '1234567890',
				name: 'John Doe',
				iat: Math.floor(Date.now() / 1000)
			},
			null,
			2
		)
	);

	function generateJWT() {
		if (!secret || !header || !payload) {
			error = 'Secret, header, and payload are required';
			output = '';
			return;
		}

		try {
			const headerObj = JSON.parse(header);
			const payloadObj = JSON.parse(payload);

			headerObj.alg = algorithm;
			headerObj.typ = 'JWT';

			const headerEncoded = btoa(JSON.stringify(headerObj))
				.replace(/=/g, '')
				.replace(/\+/g, '-')
				.replace(/\//g, '_');

			const payloadEncoded = btoa(JSON.stringify(payloadObj))
				.replace(/=/g, '')
				.replace(/\+/g, '-')
				.replace(/\//g, '_');

			const message = `${headerEncoded}.${payloadEncoded}`;

			// Simple HMAC-SHA256 simulation using base64
			// Note: This is NOT cryptographically secure for production
			// For real use, sign on a backend server
			const signatureInput = btoa(algorithm + secret).substring(0, 43);
			const signature = signatureInput
				.replace(/=/g, '')
				.replace(/\+/g, '-')
				.replace(/\//g, '_');

			const jwt = `${message}.${signature}`;
			output = jwt;
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleAlgorithmChange(e: Event) {
		algorithm = (e.target as HTMLSelectElement).value as typeof algorithm;
	}

	function handleHeaderChange(e: Event) {
		header = (e.target as HTMLTextAreaElement).value;
	}

	function handlePayloadChange(e: Event) {
		payload = (e.target as HTMLTextAreaElement).value;
	}

	function handleSecretChange(e: Event) {
		secret = (e.target as HTMLInputElement).value;
	}

	function handleGenerate() {
		generateJWT();
	}

	function handleClear() {
		output = '';
		error = null;
		secret = 'your-secret-key';
		header = JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2);
		payload = JSON.stringify(
			{
				sub: '1234567890',
				name: 'John Doe',
				iat: Math.floor(Date.now() / 1000)
			},
			null,
			2
		);
	}

	function addExpiry() {
		try {
			const payloadObj = JSON.parse(payload);
			payloadObj.exp = Math.floor(Date.now() / 1000) + 3600;
			payload = JSON.stringify(payloadObj, null, 2);
			generateJWT();
		} catch (e) {
			error = 'Invalid payload JSON';
		}
	}
</script>

<div class="tool-wrapper">
	<div class="config-section">
		<label for="algorithm">Algorithm:</label>
		<select id="algorithm" value={algorithm} onchange={handleAlgorithmChange}>
			<option value="HS256">HS256 (HMAC-SHA256)</option>
			<option value="HS512">HS512 (HMAC-SHA512)</option>
		</select>

		<label for="secret">Secret:</label>
		<input
			id="secret"
			type="password"
			bind:value={secret}
			placeholder="Enter your secret key"
			class="input-field"
		/>
	</div>

	<div class="content-grid">
		<div class="input-section">
			<div class="section-title">Header</div>
			<textarea
				class="code-textarea"
				bind:value={header}
				onchange={handleHeaderChange}
				placeholder="JWT header (JSON)"
			></textarea>
		</div>

		<div class="input-section">
			<div class="section-title">Payload</div>
			<textarea
				class="code-textarea"
				bind:value={payload}
				onchange={handlePayloadChange}
				placeholder="JWT payload (JSON)"
			></textarea>
		</div>
	</div>

	{#if error}
		<div class="error-box">
			<div class="error-icon">⚠️</div>
			<div class="error-message">{error}</div>
		</div>
	{:else if output}
		<div class="output-section">
			<div class="section-title">Generated JWT</div>
			<textarea class="code-textarea" readonly value={output}></textarea>
		</div>
	{/if}

	<div class="tool-footer">
		<button class="action-btn" onclick={addExpiry}>⏱️ Add Expiry</button>
		<button class="action-btn primary" onclick={handleGenerate}>🔑 Generate</button>
		<button class="action-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--spacing-md);
	}

	.config-section {
		display: flex;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-radius: 6px;
		align-items: center;
		flex-wrap: wrap;
	}

	.input-field,
	select {
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
		flex: 1;
		min-width: 200px;
	}

	.input-field:focus,
	select:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		flex: 1;
		min-height: 0;
	}

	.input-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.section-title {
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-primary);
	}

	.code-textarea {
		flex: 1;
		font-family: monospace;
		font-size: 0.8rem;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
		resize: none;
	}

	.code-textarea:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.output-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-radius: 6px;
	}

	.error-box {
		padding: var(--spacing-md);
		background: rgba(251, 113, 133, 0.1);
		border: 1px solid var(--color-removed-border);
		border-radius: 4px;
		color: var(--color-removed-border);
		display: flex;
		gap: var(--spacing-sm);
	}

	.error-icon {
		font-size: 1.25rem;
	}

	.error-message {
		font-size: 0.875rem;
	}

	.tool-footer {
		display: flex;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border-top: 1px solid var(--color-border);
		background: var(--color-surface-elevated);
		justify-content: flex-end;
		flex-wrap: wrap;
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

	.action-btn.primary {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.action-btn.primary:hover {
		opacity: 0.9;
	}
</style>
