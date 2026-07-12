<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { InlineDiffResult, DiffLine } from '$lib/utils/jsonDiff';

	interface Props {
		diffResult: InlineDiffResult;
	}

	let { diffResult }: Props = $props();

	// Current difference navigation
	let currentDiffIndex = $state(0);
	let leftContentEl: HTMLElement | null = null;
	let rightContentEl: HTMLElement | null = null;

	// Separate lines for left and right panels with original indices
	let leftLines = $derived(
		diffResult.lines.filter(l => l.type !== 'added').map((line, idx) => ({
			...line,
			displayIdx: idx,
			originalIdx: diffResult.lines.indexOf(line)
		}))
	);

	let rightLines = $derived(
		diffResult.lines.filter(l => l.type !== 'removed').map((line, idx) => ({
			...line,
			displayIdx: idx,
			originalIdx: diffResult.lines.indexOf(line)
		}))
	);

	// Find all difference positions (indices of changed lines in original array)
	let diffIndices = $derived(
		diffResult.lines
			.map((line, idx) => ({ line, idx }))
			.filter(({ line }) => line.type === 'added' || line.type === 'removed')
			.map(({ idx }) => idx)
	);

	let totalDiffs = $derived(diffIndices.length);
	let hasDiffs = $derived(totalDiffs > 0);

	// Get current diff's original index
	let currentOriginalIdx = $derived(
		hasDiffs ? diffIndices[currentDiffIndex] : -1
	);

	function getLineClass(type: string, originalIdx: number): string {
		const isCurrent = originalIdx === currentOriginalIdx;
		let cls = '';
		switch (type) {
			case 'added': cls = 'line-added'; break;
			case 'removed': cls = 'line-removed'; break;
			case 'modified': cls = 'line-modified'; break;
			default: cls = 'line-unchanged';
		}
		if (isCurrent) cls += ' current-diff';
		return cls;
	}

	function formatLine(line: DiffLine): string {
		return line.line;
	}

	function goToNextDiff() {
		if (currentDiffIndex < totalDiffs - 1) {
			currentDiffIndex++;
			scrollToCurrentDiff();
		}
	}

	function goToPrevDiff() {
		if (currentDiffIndex > 0) {
			currentDiffIndex--;
			scrollToCurrentDiff();
		}
	}

	async function scrollToCurrentDiff() {
		await tick();
		
		const currentLine = diffResult.lines[currentOriginalIdx];
		if (!currentLine) return;

		// Find which panel to scroll
		if (currentLine.type === 'removed' && leftContentEl) {
			const leftIdx = leftLines.findIndex(l => l.originalIdx === currentOriginalIdx);
			if (leftIdx >= 0) {
				const lineEl = leftContentEl.querySelector(`[data-line-idx="${leftIdx}"]`);
				lineEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		} else if (currentLine.type === 'added' && rightContentEl) {
			const rightIdx = rightLines.findIndex(l => l.originalIdx === currentOriginalIdx);
			if (rightIdx >= 0) {
				const lineEl = rightContentEl.querySelector(`[data-line-idx="${rightIdx}"]`);
				lineEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	}

	// Scroll to first diff on mount if there are diffs
	onMount(() => {
		if (hasDiffs) {
			setTimeout(() => scrollToCurrentDiff(), 100);
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'j') {
			e.preventDefault();
			goToNextDiff();
		} else if (e.key === 'ArrowUp' || e.key === 'k') {
			e.preventDefault();
			goToPrevDiff();
		}
	}

	function scrollToTop(side: 'left' | 'right') {
		if (side === 'left') leftContentEl?.scrollTo({ top: 0, behavior: 'smooth' });
		else rightContentEl?.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function scrollToBottom(side: 'left' | 'right') {
		if (side === 'left') leftContentEl?.scrollTo({ top: leftContentEl.scrollHeight, behavior: 'smooth' });
		else rightContentEl?.scrollTo({ top: rightContentEl.scrollHeight, behavior: 'smooth' });
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="side-by-side-diff">
	<!-- Navigation bar -->
	<div class="diff-nav-bar">
		<div class="diff-stats">
			<span class="stat stat-removed">-{diffResult.stats.removed}</span>
			<span class="stat stat-added">+{diffResult.stats.added}</span>
		</div>

		{#if hasDiffs}
			<div class="diff-navigation">
				<button 
					class="nav-btn" 
					onclick={goToPrevDiff} 
					disabled={currentDiffIndex === 0}
					title="Previous difference (↑ or k)"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="18 15 12 9 6 15"/>
					</svg>
				</button>
				
				<span class="diff-counter">
					<strong>{currentDiffIndex + 1}</strong> of <strong>{totalDiffs}</strong>
				</span>
				
				<button 
					class="nav-btn" 
					onclick={goToNextDiff} 
					disabled={currentDiffIndex === totalDiffs - 1}
					title="Next difference (↓ or j)"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="6 9 12 15 18 9"/>
					</svg>
				</button>
			</div>
		{:else}
			<div class="no-diffs">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
					<polyline points="22 4 12 14.01 9 11.01"/>
				</svg>
				<span>No differences found</span>
			</div>
		{/if}

		<div class="keyboard-hints">
			<kbd>↑</kbd><kbd>↓</kbd> navigate
		</div>
	</div>

	<div class="diff-panels">
		<div class="diff-panel left">
			<div class="panel-header">
				<span class="panel-title">Original (Left)</span>
				<div class="panel-actions">
					<span class="line-count">{leftLines.length} lines</span>
					<div class="scroll-btns">
						<button type="button" class="scroll-btn" onclick={() => scrollToTop('left')} title="Scroll to top">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="18 15 12 9 6 15"/>
							</svg>
						</button>
						<button type="button" class="scroll-btn" onclick={() => scrollToBottom('left')} title="Scroll to bottom">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="6 9 12 15 18 9"/>
							</svg>
						</button>
					</div>
				</div>
			</div>
			<div class="diff-content" bind:this={leftContentEl}>
				<div class="line-numbers">
					{#each leftLines as line, i}
						<span 
							class="line-num {getLineClass(line.type, line.originalIdx)}"
							data-line-idx={i}
						>
							{i + 1}
						</span>
					{/each}
				</div>
				<pre class="diff-code">{#each leftLines as line, i}<span 
	class="diff-line {getLineClass(line.type, line.originalIdx)}" 
	data-line-idx={i}
>{formatLine(line)}{#if !line.isClose},{'\n'}{:else}{'\n'}{/if}</span>{/each}</pre>
			</div>
		</div>

		<div class="diff-panel right">
			<div class="panel-header">
				<span class="panel-title">Modified (Right)</span>
				<div class="panel-actions">
					<span class="line-count">{rightLines.length} lines</span>
					<div class="scroll-btns">
						<button type="button" class="scroll-btn" onclick={() => scrollToTop('right')} title="Scroll to top">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="18 15 12 9 6 15"/>
							</svg>
						</button>
						<button type="button" class="scroll-btn" onclick={() => scrollToBottom('right')} title="Scroll to bottom">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="6 9 12 15 18 9"/>
							</svg>
						</button>
					</div>
				</div>
			</div>
			<div class="diff-content" bind:this={rightContentEl}>
				<div class="line-numbers">
					{#each rightLines as line, i}
						<span 
							class="line-num {getLineClass(line.type, line.originalIdx)}"
							data-line-idx={i}
						>
							{i + 1}
						</span>
					{/each}
				</div>
				<pre class="diff-code">{#each rightLines as line, i}<span 
	class="diff-line {getLineClass(line.type, line.originalIdx)}" 
	data-line-idx={i}
>{formatLine(line)}{#if !line.isClose},{'\n'}{:else}{'\n'}{/if}</span>{/each}</pre>
			</div>
		</div>
	</div>
</div>

<style>
	.side-by-side-diff {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--color-bg);
	}

	/* Navigation bar */
	.diff-nav-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 1rem;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
	}

	.diff-stats {
		display: flex;
		gap: 0.5rem;
	}

	.stat {
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.2rem 0.5rem;
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

	.diff-navigation {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--color-bg);
		padding: 0.25rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--color-text);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.nav-btn:hover:not(:disabled) {
		background: var(--color-primary);
		color: white;
	}

	.nav-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.diff-counter {
		font-size: 0.85rem;
		color: var(--color-text);
		padding: 0 0.75rem;
		min-width: 80px;
		text-align: center;
	}

	.diff-counter strong {
		color: var(--color-primary);
	}

	.no-diffs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-success);
		font-size: 0.85rem;
	}

	.keyboard-hints {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.keyboard-hints kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 0.35rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	/* Diff panels */
	.diff-panels {
		display: grid;
		grid-template-columns: 1fr 1fr;
		flex: 1;
		overflow: hidden;
	}

	.diff-panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.diff-panel.left {
		border-right: 2px solid var(--color-border);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}

	.left .panel-header {
		border-left: 3px solid var(--color-error);
	}

	.right .panel-header {
		border-left: 3px solid var(--color-success);
	}

	.panel-title {
		font-size: 0.85rem;
		font-weight: 600;
	}

	.line-count {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		font-family: var(--font-mono);
	}

	.panel-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.scroll-btns {
		display: flex;
		gap: 0.25rem;
	}

	.scroll-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.scroll-btn:hover {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.diff-content {
		display: flex;
		flex: 1;
		overflow: auto;
	}

	.line-numbers {
		display: flex;
		flex-direction: column;
		padding: 0.5rem 0;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		min-width: 40px;
		text-align: right;
		user-select: none;
		flex-shrink: 0;
	}

	.line-num {
		padding: 0 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		min-height: 1.5em;
	}

	.line-num.line-added {
		background: rgba(34, 197, 94, 0.08);
		color: var(--color-success);
	}

	.line-num.line-removed {
		background: rgba(239, 68, 68, 0.08);
		color: var(--color-error);
	}

	.line-num.current-diff {
		background: var(--color-primary) !important;
		color: white !important;
	}

	.diff-code {
		flex: 1;
		margin: 0;
		padding: 0.5rem 0;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.5;
		overflow-x: auto;
	}

	.diff-line {
		display: block;
		padding: 0 0.75rem;
		white-space: pre;
		min-height: 1.5em;
	}

	.line-added {
		background: rgba(34, 197, 94, 0.12);
	}

	.line-removed {
		background: rgba(239, 68, 68, 0.12);
	}

	.line-modified {
		background: rgba(234, 179, 8, 0.12);
	}

	/* Current diff highlight */
	.diff-line.current-diff {
		background: rgba(139, 92, 246, 0.25) !important;
		outline: 2px solid var(--color-primary);
		outline-offset: -2px;
		border-radius: 2px;
	}

	.diff-line.current-diff.line-added {
		background: rgba(34, 197, 94, 0.3) !important;
		outline-color: var(--color-success);
	}

	.diff-line.current-diff.line-removed {
		background: rgba(239, 68, 68, 0.3) !important;
		outline-color: var(--color-error);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.diff-panels {
			grid-template-columns: 1fr;
		}

		.diff-panel.left {
			border-right: none;
			border-bottom: 2px solid var(--color-border);
			max-height: 50%;
		}

		.diff-panel.right {
			max-height: 50%;
		}

		.keyboard-hints {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.diff-nav-bar {
			flex-direction: column;
			gap: 0.5rem;
			padding: 0.5rem;
		}

		.diff-stats {
			order: 2;
		}

		.diff-navigation {
			order: 1;
			width: 100%;
			justify-content: center;
		}

		.stat {
			font-size: 0.7rem;
			padding: 0.15rem 0.35rem;
		}

		.panel-header {
			padding: 0.4rem 0.5rem;
		}

		.panel-title {
			font-size: 0.75rem;
		}

		.line-numbers {
			min-width: 30px;
		}

		.line-num {
			font-size: 0.65rem;
		}

		.diff-code {
			font-size: 0.7rem;
		}
	}
</style>
