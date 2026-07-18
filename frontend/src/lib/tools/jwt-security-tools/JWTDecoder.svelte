<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'jwt-decoder',
		name: 'JWT Decoder',
		description: 'Decode and inspect JWT tokens',
		category: 'jwt-security',
		icon: 'unlock',
		keywords: ['jwt', 'decode', 'token', 'inspect']
	};

	let input = $state('');
	let error: string | null = $state(null);
	let output = $state('');
	let decodedData = $state<{
		header?: Record<string, any>;
		payload?: Record<string, any>;
		signature?: string;
		isValid?: boolean;
	} | null>(null);

	function decodeJWT() {
		if (!input.trim()) {
			decodedData = null;
			output = '';
			error = null;
			return;
		}

		try {
			const parts = input.trim().split('.');
			if (parts.length !== 3) {
				throw new Error('Invalid JWT format. Expected 3 parts separated by dots.');
			}

			const [headerB64, payloadB64, signatureB64] = parts;

			const base64Decode = (str: string) => {
				const padding = 4 - (str.length % 4);
				const padded = str + '='.repeat(padding > 0 && padding < 4 ? padding : 0);
				try {
					return JSON.parse(atob(padded));
				} catch {
					return atob(padded);
				}
			};

			const header = base64Decode(headerB64);
			const payload = base64Decode(payloadB64);

			decodedData = {
				header: typeof header === 'string' ? {} : header,
				payload: typeof payload === 'string' ? {} : payload,
				signature: signatureB64,
				isValid: signatureB64.length > 0
			};

			output = JSON.stringify(
				{
					header: decodedData.header,
					payload: decodedData.payload,
					signature: decodedData.signature
				},
				null,
				2
			);
			error = null;
		} catch (e) {
			error = (e as Error).message;
			decodedData = null;
			output = '';
		}
	}

	function handleInput() {
		decodeJWT();
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
		decodedData = null;
	}

	function handleSample() {
		input =
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
		decodeJWT();
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

	{#if decodedData}
		<div class="details-panel">
			<div class="section">
				<div class="section-title">Header</div>
				<pre class="code-block">{JSON.stringify(decodedData.header, null, 2)}</pre>
			</div>

			<div class="section">
				<div class="section-title">Payload</div>
				<pre class="code-block">{JSON.stringify(decodedData.payload, null, 2)}</pre>
			</div>

			<div class="section">
				<div class="section-title">Signature</div>
				<pre class="code-block" style="word-break: break-all;">{decodedData.signature}</pre>
			</div>

			{#if decodedData.payload && typeof decodedData.payload === 'object'}
				<div class="section">
					<div class="section-title">Claims</div>
					<div class="claims-grid">
						{#each Object.entries(decodedData.payload) as [key, value]}
							<div class="claim-item">
								<div class="claim-key">{key}</div>
								<div class="claim-value">{String(value)}</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="tool-footer">
		<button class="action-btn" onclick={handleSample}>📋 Sample</button>
		<button class="action-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.details-panel {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.section {
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

	.code-block {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
		font-family: monospace;
		font-size: 0.8rem;
		overflow-x: auto;
		margin: 0;
	}

	.claims-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-sm);
	}

	.claim-item {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
	}

	.claim-key {
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		color: var(--color-primary);
		margin-bottom: 4px;
	}

	.claim-value {
		font-family: monospace;
		font-size: 0.8rem;
		word-break: break-all;
		color: var(--color-text-muted);
	}

	.tool-footer {
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
