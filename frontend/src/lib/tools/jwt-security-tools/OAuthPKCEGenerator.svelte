<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { CryptoService } from '$lib/services/crypto.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'oauth-pkce-generator',
		name: 'OAuth PKCE Generator',
		description: 'Generate PKCE code challenge and verifier',
		category: 'jwt-security',
		icon: 'key',
		keywords: ['oauth', 'pkce', 'code', 'challenge']
	};

	let output = $state('');
	let error: string | null = $state(null);
	let codeVerifier = $state('');
	let codeChallenge = $state('');
	let challengeMethod = $state<'S256' | 'plain'>('S256');

	async function generatePKCE() {
		try {
			// Generate 43-128 character random string
			const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
			let verifier = '';
			for (let i = 0; i < 128; i++) {
				verifier += chars.charAt(Math.floor(Math.random() * chars.length));
			}

			codeVerifier = verifier;

			// Generate code challenge
			if (challengeMethod === 'S256') {
				const encoded = new TextEncoder().encode(verifier);
				const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
				const hashArray = Array.from(new Uint8Array(hashBuffer));
				const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

				// Convert hex to base64url
				const binary = String.fromCharCode.apply(null, hashArray as any);
				codeChallenge = btoa(binary)
					.replace(/=/g, '')
					.replace(/\+/g, '-')
					.replace(/\//g, '_');
			} else {
				codeChallenge = verifier;
			}

			output = JSON.stringify(
				{
					code_verifier: codeVerifier,
					code_challenge: codeChallenge,
					challenge_method: challengeMethod
				},
				null,
				2
			);
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleMethodChange(e: Event) {
		challengeMethod = (e.target as HTMLSelectElement).value as typeof challengeMethod;
		generatePKCE();
	}

	function handleClear() {
		output = '';
		error = null;
		codeVerifier = '';
		codeChallenge = '';
	}

	function handleSample() {
		generatePKCE();
	}

	function copyVerifier() {
		navigator.clipboard.writeText(codeVerifier);
	}

	function copyChallenge() {
		navigator.clipboard.writeText(codeChallenge);
	}
</script>

<div class="tool-wrapper">
	<div class="config-section">
		<label for="method">Challenge Method:</label>
		<select id="method" value={challengeMethod} onchange={handleMethodChange}>
			<option value="S256">S256 (SHA256 - Recommended)</option>
			<option value="plain">Plain (Not Recommended)</option>
		</select>
	</div>

	{#if codeVerifier && codeChallenge}
		<div class="pkce-container">
			<div class="pkce-card">
				<div class="card-header">
					<div class="card-title">Code Verifier</div>
					<button class="copy-btn" onclick={copyVerifier}>📋 Copy</button>
				</div>
				<div class="card-value">{codeVerifier}</div>
			</div>

			<div class="pkce-card">
				<div class="card-header">
					<div class="card-title">Code Challenge</div>
					<button class="copy-btn" onclick={copyChallenge}>📋 Copy</button>
				</div>
				<div class="card-value">{codeChallenge}</div>
			</div>

			<div class="flow-info">
				<div class="info-title">PKCE Flow</div>
				<ol class="flow-steps">
					<li>Send <strong>code_challenge</strong> to authorization server</li>
					<li>Authorization server stores it</li>
					<li>User is redirected with authorization code</li>
					<li>Exchange authorization code for token using <strong>code_verifier</strong></li>
					<li>Server verifies verifier matches the stored challenge</li>
				</ol>
			</div>
		</div>
	{:else}
		<div class="empty-state">
			<div class="empty-icon">🔐</div>
			<div class="empty-message">Click Generate to create PKCE codes</div>
		</div>
	{/if}

	{#if error}
		<div class="error-box">
			<div class="error-icon">⚠️</div>
			<div class="error-message">{error}</div>
		</div>
	{/if}

	<div class="tool-footer">
		<button class="action-btn primary" onclick={handleSample}>🔐 Generate</button>
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
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	select {
		flex: 1;
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

	.pkce-container {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.pkce-card {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-sm);
	}

	.card-title {
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-primary);
	}

	.card-value {
		font-family: monospace;
		font-size: 0.75rem;
		word-break: break-all;
		background: var(--color-bg);
		padding: var(--spacing-md);
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
	}

	.flow-info {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
	}

	.info-title {
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
	}

	.flow-steps {
		margin: 0;
		padding-left: var(--spacing-md);
		font-size: 0.875rem;
		color: var(--color-text-muted);
		line-height: 1.6;
	}

	.flow-steps li {
		margin-bottom: var(--spacing-xs);
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		color: var(--color-text-muted);
	}

	.empty-icon {
		font-size: 2.5rem;
		opacity: 0.5;
	}

	.empty-message {
		font-size: 0.875rem;
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
