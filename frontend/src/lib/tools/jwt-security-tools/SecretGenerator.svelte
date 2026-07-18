<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'secret-generator',
		name: 'Secret Generator',
		description: 'Generate random secrets and API keys',
		category: 'jwt-security',
		icon: 'shield',
		keywords: ['secret', 'generate', 'random', 'key', 'api']
	};

	let output = $state('');
	let error: string | null = $state(null);
	let secretType = $state<'api-key' | 'secret-key' | 'token' | 'password'>('api-key');
	let length = $state(32);
	let count = $state(1);
	let secrets: string[] = $state([]);

	function generateSecret(): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let secret = '';
		for (let i = 0; i < length; i++) {
			secret += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return secret;
	}

	function generateSecrets() {
		try {
			secrets = [];
			for (let i = 0; i < count; i++) {
				secrets.push(generateSecret());
			}
			output = secrets.join('\n');
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleSecretTypeChange(e: Event) {
		secretType = (e.target as HTMLSelectElement).value as typeof secretType;
		if (secretType === 'api-key') length = 32;
		else if (secretType === 'secret-key') length = 64;
		else if (secretType === 'token') length = 48;
		else if (secretType === 'password') length = 16;
		generateSecrets();
	}

	function handleLengthChange(e: Event) {
		length = parseInt((e.target as HTMLInputElement).value) || 32;
		generateSecrets();
	}

	function handleCountChange(e: Event) {
		count = Math.max(1, Math.min(100, parseInt((e.target as HTMLInputElement).value) || 1));
		generateSecrets();
	}

	function handleClear() {
		output = '';
		error = null;
		secrets = [];
	}

	function handleGenerate() {
		generateSecrets();
	}

	function copySingle(secret: string) {
		navigator.clipboard.writeText(secret);
	}

	function copyAll() {
		navigator.clipboard.writeText(output);
	}
</script>

<div class="tool-wrapper">
	<div class="config-section">
		<label for="type">Type:</label>
		<select id="type" value={secretType} onchange={handleSecretTypeChange}>
			<option value="api-key">API Key (32 chars)</option>
			<option value="secret-key">Secret Key (64 chars)</option>
			<option value="token">Token (48 chars)</option>
			<option value="password">Password (16 chars)</option>
		</select>

		<label for="length">Length:</label>
		<input
			id="length"
			type="number"
			bind:value={length}
			onchange={handleLengthChange}
			min="8"
			max="256"
			class="input-field"
		/>

		<label for="count">Count:</label>
		<input
			id="count"
			type="number"
			bind:value={count}
			onchange={handleCountChange}
			min="1"
			max="100"
			class="input-field"
		/>
	</div>

	{#if secrets.length > 0}
		<div class="secrets-container">
			{#if secrets.length === 1}
				<div class="secret-card large">
					<div class="secret-label">Generated Secret</div>
					<div class="secret-value">{secrets[0]}</div>
					<button class="copy-btn" onclick={() => copySingle(secrets[0])}>📋 Copy</button>
				</div>
			{:else}
				<div class="secrets-grid">
					{#each secrets as secret, i}
						<div class="secret-card">
							<div class="secret-label">Secret {i + 1}</div>
							<div class="secret-value">{secret}</div>
							<button class="copy-btn" onclick={() => copySingle(secret)}>📋</button>
						</div>
					{/each}
				</div>
				<button class="copy-all-btn" onclick={copyAll}>📋 Copy All</button>
			{/if}
		</div>
	{/if}

	{#if error}
		<div class="error-box">
			<div class="error-icon">⚠️</div>
			<div class="error-message">{error}</div>
		</div>
	{/if}

	<div class="tool-footer">
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

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
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
		min-width: 100px;
	}

	.input-field:focus,
	select:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.secrets-container {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.secrets-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: var(--spacing-md);
	}

	.secret-card {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.secret-card.large {
		padding: var(--spacing-lg);
	}

	.secret-label {
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-primary);
	}

	.secret-value {
		font-family: monospace;
		font-size: 0.8rem;
		word-break: break-all;
		background: var(--color-bg);
		padding: var(--spacing-sm);
		border-radius: 4px;
		border: 1px solid var(--color-border);
		flex: 1;
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

	.copy-all-btn {
		align-self: flex-end;
		background: var(--color-primary);
		color: white;
		border: 1px solid var(--color-primary);
		padding: 8px 16px;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.copy-all-btn:hover {
		opacity: 0.9;
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
