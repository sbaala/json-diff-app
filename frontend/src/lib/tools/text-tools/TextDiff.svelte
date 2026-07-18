<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'text-diff',
		name: 'Text Diff',
		description: 'Compare and highlight differences in text',
		category: 'text-utils',
		icon: 'diff',
		keywords: ['diff', 'compare', 'text', 'difference']
	};

	let leftText = $state('');
	let rightText = $state('');

	interface DiffRow {
		type: 'equal' | 'added' | 'removed' | 'modified';
		left: string;
		right: string;
		leftNo: number | null;
		rightNo: number | null;
	}

	let rows = $state<DiffRow[]>([]);
	let stats = $state({ added: 0, removed: 0, modified: 0 });

	// LCS-based line diff
	function computeDiff() {
		const a = leftText.split('\n');
		const b = rightText.split('\n');
		const m = a.length;
		const n = b.length;

		const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
		for (let i = m - 1; i >= 0; i--) {
			for (let j = n - 1; j >= 0; j--) {
				dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
			}
		}

		const result: DiffRow[] = [];
		let i = 0;
		let j = 0;
		let added = 0;
		let removed = 0;
		let modified = 0;

		while (i < m && j < n) {
			if (a[i] === b[j]) {
				result.push({ type: 'equal', left: a[i], right: b[j], leftNo: i + 1, rightNo: j + 1 });
				i++;
				j++;
			} else if (dp[i + 1][j] >= dp[i][j + 1]) {
				result.push({ type: 'removed', left: a[i], right: '', leftNo: i + 1, rightNo: null });
				removed++;
				i++;
			} else {
				result.push({ type: 'added', left: '', right: b[j], leftNo: null, rightNo: j + 1 });
				added++;
				j++;
			}
		}
		while (i < m) {
			result.push({ type: 'removed', left: a[i], right: '', leftNo: i + 1, rightNo: null });
			removed++;
			i++;
		}
		while (j < n) {
			result.push({ type: 'added', left: '', right: b[j], leftNo: null, rightNo: j + 1 });
			added++;
			j++;
		}

		rows = leftText === '' && rightText === '' ? [] : result;
		stats = { added, removed, modified };
	}

	function handleClear() {
		leftText = '';
		rightText = '';
		rows = [];
		stats = { added: 0, removed: 0, modified: 0 };
	}

	function handleSample() {
		leftText = 'apple\nbanana\ncherry\ndate';
		rightText = 'apple\nblueberry\ncherry\nelderberry\ndate';
		computeDiff();
	}

	$effect(() => {
		void [leftText, rightText];
		computeDiff();
	});
</script>

<div class="tool-wrapper">
	<div class="inputs">
		<div class="input-col">
			<label for="left">Original</label>
			<textarea id="left" bind:value={leftText} placeholder="Original text..."></textarea>
		</div>
		<div class="input-col">
			<label for="right">Changed</label>
			<textarea id="right" bind:value={rightText} placeholder="Changed text..."></textarea>
		</div>
	</div>

	{#if rows.length > 0}
		<div class="stats-bar">
			<span class="stat added">+{stats.added} added</span>
			<span class="stat removed">-{stats.removed} removed</span>
		</div>
		<div class="diff-view">
			{#each rows as row}
				<div class="diff-row {row.type}">
					<span class="line-no">{row.leftNo ?? ''}</span>
					<span class="line-content">{row.left}</span>
					<span class="line-no">{row.rightNo ?? ''}</span>
					<span class="line-content">{row.right}</span>
				</div>
			{/each}
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
		gap: var(--spacing-md);
		padding: var(--spacing-md);
	}
	.inputs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--spacing-md);
		min-height: 150px;
	}
	.input-col {
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
		flex: 1;
		min-height: 120px;
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
	.stats-bar {
		display: flex;
		gap: var(--spacing-md);
		font-size: 0.8rem;
		font-weight: 600;
	}
	.stat.added {
		color: #22c55e;
	}
	.stat.removed {
		color: #ef4444;
	}
	.diff-view {
		flex: 1;
		overflow: auto;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-bg);
		font-family: monospace;
		font-size: 0.8rem;
	}
	.diff-row {
		display: grid;
		grid-template-columns: 40px 1fr 40px 1fr;
		gap: var(--spacing-sm);
		padding: 2px 8px;
		white-space: pre-wrap;
		word-break: break-all;
	}
	.diff-row.added {
		background: rgba(34, 197, 94, 0.12);
	}
	.diff-row.removed {
		background: rgba(239, 68, 68, 0.12);
	}
	.line-no {
		color: var(--color-text-muted);
		text-align: right;
		user-select: none;
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
