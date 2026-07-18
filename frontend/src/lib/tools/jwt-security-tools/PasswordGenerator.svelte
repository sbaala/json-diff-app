<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'password-generator',
		name: 'Password Generator',
		description: 'Generate secure random passwords',
		category: 'jwt-security',
		icon: 'lock',
		keywords: ['password', 'generate', 'random', 'secure', 'strength']
	};

	let output = $state('');
	let error: string | null = $state(null);
	let length = $state(16);
	let useUppercase = $state(true);
	let useLowercase = $state(true);
	let useNumbers = $state(true);
	let useSpecial = $state(true);
	let excludeAmbiguous = $state(false);
	let count = $state(1);
	let passwords: string[] = $state([]);
	let strength = $state<'weak' | 'fair' | 'good' | 'strong' | ''>('');

	function calculateStrength(pwd: string): typeof strength {
		let score = 0;
		if (pwd.length >= 8) score++;
		if (pwd.length >= 12) score++;
		if (pwd.length >= 16) score++;
		if (/[a-z]/.test(pwd)) score++;
		if (/[A-Z]/.test(pwd)) score++;
		if (/[0-9]/.test(pwd)) score++;
		if (/[^a-zA-Z0-9]/.test(pwd)) score++;

		if (score <= 2) return 'weak';
		if (score <= 4) return 'fair';
		if (score <= 5) return 'good';
		return 'strong';
	}

	function generatePassword(): string {
		let chars = '';
		if (useLowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
		if (useUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		if (useNumbers) chars += '0123456789';
		if (useSpecial) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

		if (excludeAmbiguous) {
			chars = chars.replace(/[0OIl1]/g, '');
		}

		if (!chars) {
			throw new Error('Select at least one character type');
		}

		let password = '';
		for (let i = 0; i < length; i++) {
			password += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return password;
	}

	function generatePasswords() {
		try {
			passwords = [];
			for (let i = 0; i < count; i++) {
				passwords.push(generatePassword());
			}
			if (passwords.length === 1) {
				strength = calculateStrength(passwords[0]);
			} else {
				strength = '';
			}
			output = passwords.join('\n');
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
			passwords = [];
			strength = '';
		}
	}

	function handleLengthChange() {
		generatePasswords();
	}

	function handleCheckboxChange() {
		generatePasswords();
	}

	function handleCountChange() {
		count = Math.max(1, Math.min(100, count));
		generatePasswords();
	}

	function handleClear() {
		output = '';
		error = null;
		passwords = [];
		strength = '';
	}

	function handleGenerate() {
		generatePasswords();
	}

	function copySingle(pwd: string) {
		navigator.clipboard.writeText(pwd);
	}

	function copyAll() {
		navigator.clipboard.writeText(output);
	}
</script>

<div class="tool-wrapper">
	<div class="config-section">
		<div class="config-row">
			<label for="length">Length:</label>
			<input
				id="length"
				type="range"
				bind:value={length}
				onchange={handleLengthChange}
				min="8"
				max="64"
				class="slider"
			/>
			<span class="length-value">{length}</span>
		</div>

		<div class="config-row">
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
	</div>

	<div class="options-section">
		<div class="checkbox-group">
			<label>
				<input
					type="checkbox"
					bind:checked={useLowercase}
					onchange={handleCheckboxChange}
				/>
				Lowercase (a-z)
			</label>
			<label>
				<input
					type="checkbox"
					bind:checked={useUppercase}
					onchange={handleCheckboxChange}
				/>
				Uppercase (A-Z)
			</label>
			<label>
				<input type="checkbox" bind:checked={useNumbers} onchange={handleCheckboxChange} />
				Numbers (0-9)
			</label>
			<label>
				<input type="checkbox" bind:checked={useSpecial} onchange={handleCheckboxChange} />
				Special (!@#$%^&*)
			</label>
			<label>
				<input
					type="checkbox"
					bind:checked={excludeAmbiguous}
					onchange={handleCheckboxChange}
				/>
				Exclude Ambiguous (0, O, I, l, 1)
			</label>
		</div>
	</div>

	{#if passwords.length > 0}
		<div class="passwords-container">
			{#if passwords.length === 1}
				<div class="password-card large">
					<div class="card-header">
						<div class="password-value">{passwords[0]}</div>
						<button class="copy-btn" onclick={() => copySingle(passwords[0])}>📋</button>
					</div>
					{#if strength}
						<div class="strength-bar">
							<div class="strength-indicator {strength}" />
							<span class="strength-text">{strength.charAt(0).toUpperCase() + strength.slice(1)}</span>
						</div>
					{/if}
				</div>
			{:else}
				<div class="passwords-grid">
					{#each passwords as pwd, i}
						<div class="password-card">
							<div class="card-header">
								<div class="card-label">Pwd {i + 1}</div>
								<button class="copy-btn" onclick={() => copySingle(pwd)}>📋</button>
							</div>
							<div class="password-value">{pwd}</div>
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
		<button class="action-btn primary" onclick={handleGenerate}>🔐 Generate</button>
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

	.config-section,
	.options-section {
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-radius: 6px;
	}

	.config-row {
		display: flex;
		gap: var(--spacing-md);
		align-items: center;
		margin-bottom: var(--spacing-md);
	}

	.config-row:last-child {
		margin-bottom: 0;
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		cursor: pointer;
	}

	.slider {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background: var(--color-border);
		outline: none;
		-webkit-appearance: none;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--color-primary);
		cursor: pointer;
	}

	.slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--color-primary);
		cursor: pointer;
		border: none;
	}

	.length-value {
		min-width: 40px;
		text-align: right;
		font-weight: 600;
		color: var(--color-primary);
	}

	.input-field {
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
		width: 80px;
	}

	.input-field:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.checkbox-group {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-md);
	}

	.checkbox-group label {
		margin-bottom: 0;
	}

	.checkbox-group input[type='checkbox'] {
		cursor: pointer;
	}

	.passwords-container {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.passwords-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--spacing-md);
	}

	.password-card {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.password-card.large {
		padding: var(--spacing-lg);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.card-label {
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		color: var(--color-primary);
	}

	.password-value {
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
		white-space: nowrap;
	}

	.copy-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.strength-bar {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-size: 0.75rem;
	}

	.strength-indicator {
		flex: 1;
		height: 4px;
		border-radius: 2px;
		background: var(--color-border);
	}

	.strength-indicator.weak {
		background: #ef4444;
	}

	.strength-indicator.fair {
		background: #f97316;
	}

	.strength-indicator.good {
		background: #eab308;
	}

	.strength-indicator.strong {
		background: #22c55e;
	}

	.strength-text {
		font-weight: 600;
		color: var(--color-text-muted);
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
