<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'regex-tester',
		name: 'Regex Tester',
		description: 'Test and debug regular expressions',
		category: 'text-utils',
		icon: 'search',
		keywords: ['regex', 'regular', 'expression', 'test', 'match']
	};

	let pattern = $state('');
	let flags = $state('g');
	let testString = $state('');
	let error: string | null = $state(null);

	interface MatchInfo {
		match: string;
		index: number;
		groups: string[];
	}
	let matches = $state<MatchInfo[]>([]);
	let highlighted = $state('');

	function run() {
		error = null;
		matches = [];
		highlighted = testString;

		if (!pattern || !testString) return;

		try {
			const re = new RegExp(pattern, flags);
			const found: MatchInfo[] = [];

			if (flags.includes('g')) {
				let m: RegExpExecArray | null;
				let guard = 0;
				while ((m = re.exec(testString)) !== null && guard < 10000) {
					found.push({ match: m[0], index: m.index, groups: m.slice(1) });
					if (m.index === re.lastIndex) re.lastIndex++;
					guard++;
				}
			} else {
				const m = re.exec(testString);
				if (m) found.push({ match: m[0], index: m.index, groups: m.slice(1) });
			}

			matches = found;

			// Build highlighted output
			if (found.length > 0) {
				let result = '';
				let last = 0;
				for (const f of found) {
					result += escapeHtml(testString.slice(last, f.index));
					result += `<mark>${escapeHtml(f.match)}</mark>`;
					last = f.index + f.match.length;
				}
				result += escapeHtml(testString.slice(last));
				highlighted = result;
			}
		} catch (e) {
			error = (e as Error).message;
		}
	}

	function escapeHtml(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	function handleClear() {
		pattern = '';
		testString = '';
		flags = 'g';
		matches = [];
		error = null;
		highlighted = '';
	}

	function handleSample() {
		pattern = '\\b(\\w+)@(\\w+\\.\\w+)\\b';
		flags = 'g';
		testString = 'Contact: john@example.com or jane@test.org for details.';
		run();
	}

	$effect(() => {
		void [pattern, flags, testString];
		run();
	});
</script>

<div class="tool-wrapper">
	<div class="pattern-row">
		<span class="delim">/</span>
		<input class="pattern-input" bind:value={pattern} placeholder="pattern" spellcheck="false" />
		<span class="delim">/</span>
		<input class="flags-input" bind:value={flags} placeholder="flags" maxlength="6" spellcheck="false" />
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{/if}

	<div class="test-section">
		<label for="test">Test String</label>
		<textarea id="test" bind:value={testString} placeholder="Text to test against..."></textarea>
	</div>

	<div class="results">
		<div class="result-header">
			<span class="match-count">{matches.length} {matches.length === 1 ? 'match' : 'matches'}</span>
		</div>
		{#if matches.length > 0}
			<div class="highlight-box">{@html highlighted}</div>
			<div class="match-list">
				{#each matches as m, i}
					<div class="match-item">
						<span class="match-idx">#{i + 1} @ {m.index}</span>
						<span class="match-text">{m.match}</span>
						{#if m.groups.length > 0}
							<span class="match-groups">groups: {m.groups.map((g) => g ?? '∅').join(', ')}</span>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

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
		gap: var(--spacing-md);
		padding: var(--spacing-md);
	}
	.pattern-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
	}
	.delim {
		color: var(--color-text-muted);
		font-family: monospace;
		font-size: 1.1rem;
	}
	.pattern-input {
		flex: 1;
		background: transparent;
		border: none;
		color: var(--color-text);
		font-family: monospace;
		font-size: 0.95rem;
	}
	.flags-input {
		width: 60px;
		background: transparent;
		border: none;
		color: var(--color-primary);
		font-family: monospace;
		font-size: 0.95rem;
	}
	.pattern-input:focus,
	.flags-input:focus {
		outline: none;
	}
	.error-box {
		padding: var(--spacing-sm);
		background: rgba(251, 113, 133, 0.1);
		border: 1px solid var(--color-removed-border);
		border-radius: 4px;
		color: var(--color-removed-border);
		font-size: 0.85rem;
	}
	.test-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	label {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-primary);
	}
	textarea {
		min-height: 100px;
		font-family: monospace;
		font-size: 0.85rem;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
		resize: vertical;
	}
	textarea:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.results {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}
	.match-count {
		font-weight: 600;
		color: var(--color-primary);
		font-size: 0.85rem;
	}
	.highlight-box {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
		font-family: monospace;
		font-size: 0.85rem;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.highlight-box :global(mark) {
		background: var(--color-primary);
		color: white;
		border-radius: 2px;
		padding: 0 2px;
	}
	.match-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	.match-item {
		display: flex;
		gap: var(--spacing-md);
		align-items: center;
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 6px 10px;
		font-size: 0.8rem;
		flex-wrap: wrap;
	}
	.match-idx {
		color: var(--color-text-muted);
		font-family: monospace;
	}
	.match-text {
		font-family: monospace;
		color: var(--color-primary);
		font-weight: 600;
	}
	.match-groups {
		color: var(--color-text-muted);
		font-family: monospace;
	}
	.tool-footer {
		display: flex;
		gap: var(--spacing-sm);
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
