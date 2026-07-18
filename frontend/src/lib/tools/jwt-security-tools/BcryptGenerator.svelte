<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'bcrypt-generator',
		name: 'Password Hash Generator',
		description: 'Generate salted password hashes (PBKDF2)',
		category: 'jwt-security',
		icon: 'lock',
		keywords: ['bcrypt', 'password', 'hash', 'generate', 'pbkdf2']
	};

	let password = $state('');
	let iterations = $state(100000);
	let error: string | null = $state(null);
	let hashOutput = $state('');
	let verifyHash = $state('');
	let verifyPassword = $state('');
	let verifyResult = $state<'match' | 'nomatch' | ''>('');

	function toB64(buf: ArrayBuffer): string {
		return btoa(String.fromCharCode(...new Uint8Array(buf)));
	}

	async function pbkdf2(pw: string, salt: Uint8Array, iters: number): Promise<ArrayBuffer> {
		const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, [
			'deriveBits'
		]);
		return crypto.subtle.deriveBits(
			{ name: 'PBKDF2', salt: salt as BufferSource, iterations: iters, hash: 'SHA-256' },
			key,
			256
		);
	}

	async function generate() {
		error = null;
		if (!password) {
			hashOutput = '';
			return;
		}
		try {
			const salt = crypto.getRandomValues(new Uint8Array(16));
			const derived = await pbkdf2(password, salt, iterations);
			// Format: pbkdf2-sha256$iterations$saltB64$hashB64
			hashOutput = `pbkdf2-sha256$${iterations}$${toB64(salt.buffer)}$${toB64(derived)}`;
		} catch (e) {
			error = (e as Error).message;
		}
	}

	async function verify() {
		verifyResult = '';
		if (!verifyHash || !verifyPassword) return;
		try {
			const parts = verifyHash.split('$');
			if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') {
				error = 'Invalid hash format for verification';
				return;
			}
			const iters = parseInt(parts[1]);
			const salt = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
			const derived = await pbkdf2(verifyPassword, salt, iters);
			verifyResult = toB64(derived) === parts[3] ? 'match' : 'nomatch';
			error = null;
		} catch (e) {
			error = (e as Error).message;
		}
	}

	function copyHash() {
		navigator.clipboard.writeText(hashOutput);
	}

	function handleSample() {
		password = 'MySecurePassword123';
		generate();
	}
</script>

<div class="tool-wrapper">
	<div class="note">
		ℹ️ True bcrypt requires a native binding. This tool uses <strong>PBKDF2-SHA256</strong>,
		a secure, verifiable password-hashing scheme available in the browser.
	</div>

	<div class="section">
		<div class="section-title">Generate Hash</div>
		<div class="field">
			<label for="pw">Password</label>
			<input id="pw" type="text" bind:value={password} placeholder="Enter password" />
		</div>
		<div class="field">
			<label for="iter">Iterations (cost): {iterations.toLocaleString()}</label>
			<input id="iter" type="range" min="10000" max="500000" step="10000" bind:value={iterations} />
		</div>
		<div class="btn-row">
			<button class="btn primary" onclick={generate}>🔐 Generate</button>
			<button class="btn" onclick={handleSample}>📋 Sample</button>
		</div>
		{#if hashOutput}
			<div class="hash-box">
				<code>{hashOutput}</code>
				<button class="copy-btn" onclick={copyHash}>📋</button>
			</div>
		{/if}
	</div>

	<div class="section">
		<div class="section-title">Verify Password</div>
		<div class="field">
			<label for="vh">Hash</label>
			<input id="vh" bind:value={verifyHash} placeholder="pbkdf2-sha256$..." />
		</div>
		<div class="field">
			<label for="vp">Password to check</label>
			<input id="vp" bind:value={verifyPassword} placeholder="Password" />
		</div>
		<button class="btn primary" onclick={verify}>✓ Verify</button>
		{#if verifyResult === 'match'}
			<div class="verify-result match">✓ Password matches the hash</div>
		{:else if verifyResult === 'nomatch'}
			<div class="verify-result nomatch">✗ Password does not match</div>
		{/if}
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{/if}
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		overflow-y: auto;
	}
	.note {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		background: rgba(99, 102, 241, 0.08);
		border: 1px solid rgba(99, 102, 241, 0.25);
		border-radius: 4px;
		padding: var(--spacing-sm);
	}
	.section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
	}
	.section-title {
		font-weight: 600;
		font-size: 0.85rem;
		text-transform: uppercase;
		color: var(--color-primary);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	label {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		font-weight: 600;
	}
	input {
		padding: 8px 10px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.85rem;
	}
	input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.btn-row {
		display: flex;
		gap: var(--spacing-sm);
	}
	.btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.btn.primary {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}
	.hash-box {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
	}
	.hash-box code {
		flex: 1;
		font-family: monospace;
		font-size: 0.75rem;
		word-break: break-all;
		color: var(--color-primary);
	}
	.copy-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 4px 10px;
		border-radius: 4px;
		cursor: pointer;
	}
	.verify-result {
		padding: var(--spacing-sm);
		border-radius: 4px;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.verify-result.match {
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
	}
	.verify-result.nomatch {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}
	.error-box {
		padding: var(--spacing-md);
		background: rgba(251, 113, 133, 0.1);
		border: 1px solid var(--color-removed-border);
		border-radius: 4px;
		color: var(--color-removed-border);
		font-size: 0.875rem;
	}
</style>
