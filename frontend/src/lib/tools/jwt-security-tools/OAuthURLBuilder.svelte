<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'oauth-url-builder',
		name: 'OAuth URL Builder',
		description: 'Build OAuth authorization URLs',
		category: 'jwt-security',
		icon: 'share-2',
		keywords: ['oauth', 'url', 'authorize', 'builder']
	};

	let authEndpoint = $state('https://accounts.google.com/o/oauth2/v2/auth');
	let clientId = $state('your-client-id');
	let redirectUri = $state('https://myapp.com/callback');
	let responseType = $state('code');
	let scope = $state('openid email profile');
	let stateParam = $state('random-state-value');
	let codeChallenge = $state('');

	let url = $derived.by(() => {
		try {
			const base = new URL(authEndpoint);
			const params = new URLSearchParams();
			if (clientId) params.set('client_id', clientId);
			if (redirectUri) params.set('redirect_uri', redirectUri);
			if (responseType) params.set('response_type', responseType);
			if (scope) params.set('scope', scope);
			if (stateParam) params.set('state', stateParam);
			if (codeChallenge) {
				params.set('code_challenge', codeChallenge);
				params.set('code_challenge_method', 'S256');
			}
			base.search = params.toString();
			return base.toString();
		} catch {
			return '';
		}
	});

	function copyUrl() {
		navigator.clipboard.writeText(url);
	}
</script>

<div class="tool-wrapper">
	<div class="fields">
		<div class="field">
			<label for="ep">Authorization Endpoint</label>
			<input id="ep" bind:value={authEndpoint} />
		</div>
		<div class="field">
			<label for="cid">Client ID</label>
			<input id="cid" bind:value={clientId} />
		</div>
		<div class="field">
			<label for="ru">Redirect URI</label>
			<input id="ru" bind:value={redirectUri} />
		</div>
		<div class="field">
			<label for="rt">Response Type</label>
			<select id="rt" bind:value={responseType}>
				<option value="code">code (Authorization Code)</option>
				<option value="token">token (Implicit)</option>
				<option value="id_token">id_token</option>
				<option value="code id_token">code id_token (Hybrid)</option>
			</select>
		</div>
		<div class="field">
			<label for="scope">Scope</label>
			<input id="scope" bind:value={scope} />
		</div>
		<div class="field">
			<label for="state">State</label>
			<input id="state" bind:value={stateParam} />
		</div>
		<div class="field">
			<label for="cc">PKCE Code Challenge (optional)</label>
			<input id="cc" bind:value={codeChallenge} placeholder="S256 challenge" />
		</div>
	</div>

	{#if url}
		<div class="output">
			<label>Authorization URL</label>
			<div class="url-box">{url}</div>
			<button class="copy-btn" onclick={copyUrl}>📋 Copy URL</button>
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
		overflow-y: auto;
	}
	.fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--spacing-md);
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
	input,
	select {
		padding: 8px 10px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.85rem;
	}
	input:focus,
	select:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.output {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}
	.url-box {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-md);
		font-family: monospace;
		font-size: 0.8rem;
		word-break: break-all;
		color: var(--color-primary);
	}
	.copy-btn {
		align-self: flex-start;
		background: var(--color-primary);
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	@media (max-width: 640px) {
		.fields {
			grid-template-columns: 1fr;
		}
	}
</style>
