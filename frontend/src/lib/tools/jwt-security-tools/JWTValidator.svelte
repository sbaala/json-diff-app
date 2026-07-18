<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'jwt-validator',
		name: 'JWT Validator',
		description: 'Validate JWT tokens with signature verification',
		category: 'jwt-security',
		icon: 'shield-check',
		keywords: ['jwt', 'validate', 'token', 'signature']
	};

	let token = $state('');
	let secret = $state('');
	let error: string | null = $state(null);
	let checks = $state<Array<{ label: string; ok: boolean; detail: string }>>([]);
	let payload = $state<Record<string, unknown> | null>(null);

	function b64urlDecode(str: string): string {
		const padded = str.replace(/-/g, '+').replace(/_/g, '/');
		return decodeURIComponent(escape(atob(padded + '==='.slice((padded.length + 3) % 4))));
	}

	async function validate() {
		error = null;
		checks = [];
		payload = null;
		if (!token.trim()) return;

		const parts = token.trim().split('.');
		if (parts.length !== 3) {
			error = 'Invalid JWT structure (expected 3 parts)';
			return;
		}

		let header: any;
		let body: any;
		try {
			header = JSON.parse(b64urlDecode(parts[0]));
			body = JSON.parse(b64urlDecode(parts[1]));
			payload = body;
		} catch {
			error = 'Failed to decode header/payload';
			return;
		}

		const result: typeof checks = [];
		result.push({ label: 'Structure', ok: true, detail: '3 valid parts' });
		result.push({ label: 'Algorithm', ok: !!header.alg, detail: header.alg || 'missing' });

		// Signature verification (HS256/HS512 only)
		if (secret && (header.alg === 'HS256' || header.alg === 'HS512')) {
			try {
				const hash = header.alg === 'HS256' ? 'SHA-256' : 'SHA-512';
				const key = await crypto.subtle.importKey(
					'raw',
					new TextEncoder().encode(secret),
					{ name: 'HMAC', hash },
					false,
					['sign']
				);
				const sig = await crypto.subtle.sign(
					'HMAC',
					key,
					new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
				);
				const computed = btoa(String.fromCharCode(...new Uint8Array(sig)))
					.replace(/\+/g, '-')
					.replace(/\//g, '_')
					.replace(/=/g, '');
				const valid = computed === parts[2];
				result.push({
					label: 'Signature',
					ok: valid,
					detail: valid ? 'Verified ✓' : 'Does not match secret'
				});
			} catch (e) {
				result.push({ label: 'Signature', ok: false, detail: (e as Error).message });
			}
		} else if (secret) {
			result.push({
				label: 'Signature',
				ok: false,
				detail: `Cannot verify ${header.alg} in-browser (only HS256/HS512)`
			});
		} else {
			result.push({ label: 'Signature', ok: false, detail: 'No secret provided — not verified' });
		}

		// Expiry
		const now = Math.floor(Date.now() / 1000);
		if (body.exp !== undefined) {
			const expired = now > body.exp;
			result.push({
				label: 'Expiration (exp)',
				ok: !expired,
				detail: expired
					? `Expired ${new Date(body.exp * 1000).toLocaleString()}`
					: `Valid until ${new Date(body.exp * 1000).toLocaleString()}`
			});
		}
		if (body.nbf !== undefined) {
			const notYet = now < body.nbf;
			result.push({
				label: 'Not Before (nbf)',
				ok: !notYet,
				detail: notYet ? `Not valid until ${new Date(body.nbf * 1000).toLocaleString()}` : 'Active'
			});
		}
		if (body.iat !== undefined) {
			result.push({
				label: 'Issued At (iat)',
				ok: true,
				detail: new Date(body.iat * 1000).toLocaleString()
			});
		}

		checks = result;
	}

	function handleSample() {
		token =
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
		secret = 'your-256-bit-secret';
	}

	function handleClear() {
		token = '';
		secret = '';
		checks = [];
		error = null;
		payload = null;
	}

	$effect(() => {
		void [token, secret];
		validate();
	});
</script>

<div class="tool-wrapper">
	<div class="field">
		<label for="token">JWT Token</label>
		<textarea id="token" bind:value={token} placeholder="Paste JWT here..."></textarea>
	</div>
	<div class="field">
		<label for="secret">Secret (for HS256/HS512 verification)</label>
		<input id="secret" type="text" bind:value={secret} placeholder="Signing secret" />
	</div>

	<div class="quick">
		<button class="quick-btn" onclick={handleSample}>📋 Sample</button>
		<button class="quick-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else if checks.length > 0}
		<div class="checks">
			{#each checks as c}
				<div class="check-row {c.ok ? 'ok' : 'fail'}">
					<span class="check-icon">{c.ok ? '✓' : '✗'}</span>
					<span class="check-label">{c.label}</span>
					<span class="check-detail">{c.detail}</span>
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
		gap: var(--spacing-md);
		padding: var(--spacing-md);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}
	textarea,
	input {
		padding: 10px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.85rem;
	}
	textarea {
		min-height: 80px;
		resize: vertical;
		word-break: break-all;
	}
	textarea:focus,
	input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.quick {
		display: flex;
		gap: var(--spacing-sm);
	}
	.quick-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
	}
	.quick-btn:hover {
		background: var(--color-primary);
		color: white;
	}
	.checks {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	.check-row {
		display: grid;
		grid-template-columns: 24px 160px 1fr;
		gap: var(--spacing-sm);
		align-items: center;
		padding: 10px 14px;
		border-radius: 4px;
		border: 1px solid var(--color-border);
		font-size: 0.85rem;
	}
	.check-row.ok {
		background: rgba(34, 197, 94, 0.08);
		border-color: rgba(34, 197, 94, 0.3);
	}
	.check-row.fail {
		background: rgba(239, 68, 68, 0.08);
		border-color: rgba(239, 68, 68, 0.3);
	}
	.check-icon {
		font-weight: bold;
		text-align: center;
	}
	.check-row.ok .check-icon {
		color: #22c55e;
	}
	.check-row.fail .check-icon {
		color: #ef4444;
	}
	.check-label {
		font-weight: 600;
	}
	.check-detail {
		color: var(--color-text-muted);
		font-family: monospace;
		font-size: 0.8rem;
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
