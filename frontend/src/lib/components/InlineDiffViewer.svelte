<script lang="ts">
	import type { DiffLine, InlineDiffResult } from '$lib/utils/jsonDiff';

	interface Props {
		diffResult: InlineDiffResult;
	}

	let { diffResult }: Props = $props();
	
	function getLineClass(type: string): string {
		switch (type) {
			case 'added': return 'line-added';
			case 'removed': return 'line-removed';
			case 'modified': return 'line-modified';
			default: return 'line-unchanged';
		}
	}

	function getLinePrefix(type: string): string {
		switch (type) {
			case 'added': return '+';
			case 'removed': return '-';
			default: return ' ';
		}
	}
</script>

<div class="inline-diff">
	<div class="diff-stats">
		<span class="stat stat-added">+{diffResult.stats.added} added</span>
		<span class="stat stat-removed">-{diffResult.stats.removed} removed</span>
		<span class="stat stat-unchanged">{diffResult.stats.unchanged} unchanged</span>
	</div>
	
	<div class="diff-content">
		<div class="line-numbers">
			{#each diffResult.lines as _, i}
				<span class="line-num">{i + 1}</span>
			{/each}
		</div>
		<pre class="diff-code">{#each diffResult.lines as line, i}<span class="diff-line {getLineClass(line.type)}"><span class="prefix">{getLinePrefix(line.type)}</span>{line.line}{#if i < diffResult.lines.length - 1 && !line.isClose && diffResult.lines[i + 1] && !diffResult.lines[i + 1].isClose && line.depth === diffResult.lines[i + 1].depth},{/if}
</span>{/each}</pre>
	</div>
</div>

<style>
	.inline-diff {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--color-bg);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.diff-stats {
		display: flex;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
	}

	.stat {
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.stat-added {
		background: rgba(34, 197, 94, 0.15);
		color: var(--color-success);
	}

	.stat-removed {
		background: rgba(239, 68, 68, 0.15);
		color: var(--color-error);
	}

	.stat-unchanged {
		background: var(--color-bg);
		color: var(--color-text-muted);
	}

	.diff-content {
		display: flex;
		flex: 1;
		overflow: auto;
	}

	.line-numbers {
		display: flex;
		flex-direction: column;
		padding: 0.5rem;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		min-width: 45px;
		text-align: right;
		user-select: none;
		flex-shrink: 0;
	}

	.line-num {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		padding: 0 0.5rem;
	}

	.diff-code {
		flex: 1;
		margin: 0;
		padding: 0.5rem 0;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.6;
		overflow-x: auto;
	}

	.diff-line {
		display: block;
		padding: 0 0.75rem 0 0.25rem;
		white-space: pre;
		min-height: 1.6em;
	}

	.prefix {
		display: inline-block;
		width: 1.5em;
		text-align: center;
		font-weight: 600;
		user-select: none;
	}

	.line-added {
		background: rgba(34, 197, 94, 0.12);
		border-left: 3px solid var(--color-success);
	}

	.line-added .prefix {
		color: var(--color-success);
	}

	.line-removed {
		background: rgba(239, 68, 68, 0.12);
		border-left: 3px solid var(--color-error);
	}

	.line-removed .prefix {
		color: var(--color-error);
	}

	.line-unchanged {
		border-left: 3px solid transparent;
	}

	.line-unchanged .prefix {
		color: var(--color-text-muted);
	}

	.line-modified {
		background: rgba(234, 179, 8, 0.12);
		border-left: 3px solid #eab308;
	}

	/* Responsive styles */
	@media (max-width: 640px) {
		.diff-stats {
			gap: 0.5rem;
			padding: 0.5rem;
		}

		.stat {
			font-size: 0.75rem;
			padding: 0.2rem 0.4rem;
		}

		.line-numbers {
			min-width: 35px;
		}

		.diff-code {
			font-size: 0.75rem;
		}
	}
</style>
