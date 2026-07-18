<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'aes-crypto',
		name: 'AES Encrypt/Decrypt',
		description: 'Encrypt and decrypt data with AES',
		category: 'jwt-security',
		icon: 'lock',
		keywords: ['aes', 'encrypt', 'decrypt', 'crypto']
	};

	let mode = $state<'encrypt' | 'decrypt'>('encrypt');
	let input = $state('');
	let passphrase = $state('');
	let output = $state('');
	let error: string | null = $state(null);

	async function deriveKey(pass: string, salt: Uint8Array): Promise<CryptoKey> {
		const baseKey = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(pass),
			'PBKDF2',
			false,
			['deriveKey']
		);
		return crypto.subtle.deriveKey(
			{ name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
			baseKey,
			{ name: 'AES-GCM', length: 256 },
			false,
			['encrypt', 'decrypt']
		);
	}

	async function run() {
		error = null;
		if (!input || !passphrase) {
			output = '';
			return;
		}
		try {
			if (mode === 'encrypt') {
				const salt = crypto.getRandomValues(new Uint8Array(16));
				const iv = crypto.getRandomValues(new Uint8Array(12));
				const key = await deriveKey(passphrase, salt);
				const ct = await crypto.subtle.encrypt(
					{ name: 'AES-GCM', iv: iv as BufferSource },
					key,
					new TextEncoder().encode(input)
				);
				// Package salt + iv + ciphertext as base64
				const combined = new Uint8Array(salt.length + iv.length + ct.byteLength);
				combined.set(salt, 0);
				combined.set(iv, salt.length);
				combined.set(new Uint8Array(ct), salt.length + iv.length);
				output = btoa(String.fromCharCode(...combined));
			} else {
				const combined = Uint8Array.from(atob(input.trim()), (c) => c.charCodeAt(0));
				const salt = combined.slice(0, 16);
				const iv = combined.slice(16, 28);
				const ct = combined.slice(28);
				const key = await deriveKey(passphrase, salt);
				const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ct);
				output = new TextDecoder().decode(pt);
			}
		} catch (e) {
			error = mode === 'decrypt' ? 'Decryption failed — wrong passphrase or corrupt data' : (e as Error).message;
			output = '';
		}
	}

	function swap() {
		mode = mode === 'encrypt' ? 'decrypt' : 'encrypt';
		input = output;
		output = '';
		run();
	}

	function copyOut() {
		navigator.clipboard.writeText(output);
	}

	function handleSample() {
		mode = 'encrypt';
		input = 'Secret message to protect';
		passphrase = 'strong-passphrase';
		run();
	}

	$effect(() => {
		void [input, passphrase, mode];
		run();
	});
</script>

<div class="tool-wrapper">
	<div class="mode-tabs">
		<button class="mode-tab" class:active={mode === 'encrypt'} onclick={() => (mode = 'encrypt')}>
			🔒 Encrypt
		</button>
		<button class="mode-tab" class:active={mode === 'decrypt'} onclick={() => (mode = 'decrypt')}>
			🔓 Decrypt
		</button>
	</div>

	<div class="note">AES-256-GCM with PBKDF2 key derivation (100k iterations). Salt & IV are embedded in the output.</div>

	<div class="field">
		<label for="pass">Passphrase</label>
		<input id="pass" type="text" bind:value={passphrase} placeholder="Enter passphrase" />
	</div>

	<div class="field grow">
		<label for="input">{mode === 'encrypt' ? 'Plaintext' : 'Ciphertext (Base64)'}</label>
		<textarea id="input" bind:value={input} placeholder={mode === 'encrypt' ? 'Text to encrypt...' : 'Base64 ciphertext...'}></textarea>
	</div>

	<div class="actions">
		<button class="btn" onclick={handleSample}>📋 Sample</button>
		<button class="btn" onclick={swap}>⇅ Swap</button>
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else if output}
		<div class="field grow">
			<label>{mode === 'encrypt' ? 'Ciphertext (Base64)' : 'Plaintext'}</label>
			<div class="output-box">
				<code>{output}</code>
				<button class="copy-btn" onclick={copyOut}>📋</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
	}
	.mode-tabs {
		display: flex;
		gap: var(--spacing-sm);
	}
	.mode-tab {
		flex: 1;
		background: var(--color-surface-elevated);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 10px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
	}
	.mode-tab.active {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}
	.note {
		font-size: 0.78rem;
		color: var(--color-text-muted);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	.field.grow {
		flex: 1;
		min-height: 0;
	}
	label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}
	input,
	textarea {
		padding: 10px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.85rem;
	}
	textarea {
		flex: 1;
		min-height: 80px;
		resize: vertical;
		word-break: break-all;
	}
	input:focus,
	textarea:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.actions {
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
	.btn:hover {
		background: var(--color-primary);
		color: white;
	}
	.output-box {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-sm);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
	}
	.output-box code {
		flex: 1;
		font-family: monospace;
		font-size: 0.8rem;
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
	.error-box {
		padding: var(--spacing-md);
		background: rgba(251, 113, 133, 0.1);
		border: 1px solid var(--color-removed-border);
		border-radius: 4px;
		color: var(--color-removed-border);
		font-size: 0.875rem;
	}
</style>
