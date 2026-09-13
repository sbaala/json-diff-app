<script lang="ts">
	import { onMount } from 'svelte';
	import type { InlineDiffResult, DiffLine, DiffType } from '$lib/utils/jsonDiff';

	interface Props {
		diffResult: InlineDiffResult;
	}

	let { diffResult }: Props = $props();

	// Fixed row height (px) drives the virtual-scroll math; CSS reads it via --row-h
	const ROW_HEIGHT = 22;
	const BUFFER_ROWS = 40;
	// Used until the viewport has been measured (also the jsdom/SSR case)
	const FALLBACK_VISIBLE_ROWS = 40;

	// One row of the side-by-side view. A null type means that side has no line
	// for this row and renders as an empty cell.
	interface DiffRow {
		leftNum: number | null;
		leftText: string;
		leftType: DiffType | null;
		rightNum: number | null;
		rightText: string;
		rightType: DiffType | null;
	}

	// A run of consecutive changed rows; navigation jumps hunk to hunk
	interface Hunk {
		start: number;
		end: number;
	}

	// A value or closing bracket gets a trailing comma when the next line on the
	// same side is a sibling (same depth). Opening brackets never do.
	function needsComma(line: DiffLine, next: DiffLine): boolean {
		return !line.isOpen && next.depth === line.depth;
	}

	// Align left and right lines into rows so both panels share one scroll
	// position. A removed line immediately followed by an added line at the same
	// path (a changed primitive) is shown on a single row.
	let { rows, leftLineCount, rightLineCount, maxLineLength } = $derived.by(() => {
		const lines = diffResult.lines;
		const rows: DiffRow[] = [];
		let leftNum = 0;
		let rightNum = 0;
		let maxLineLength = 0;
		// Previous row per side, so its comma can be appended once its successor is known
		let prevLeft: { row: DiffRow; line: DiffLine } | null = null;
		let prevRight: { row: DiffRow; line: DiffLine } | null = null;

		function placeLeft(row: DiffRow, line: DiffLine) {
			if (prevLeft && needsComma(prevLeft.line, line)) prevLeft.row.leftText += ',';
			row.leftNum = ++leftNum;
			row.leftText = line.line;
			row.leftType = line.type;
			prevLeft = { row, line };
			if (line.line.length > maxLineLength) maxLineLength = line.line.length;
		}

		function placeRight(row: DiffRow, line: DiffLine) {
			if (prevRight && needsComma(prevRight.line, line)) prevRight.row.rightText += ',';
			row.rightNum = ++rightNum;
			row.rightText = line.line;
			row.rightType = line.type;
			prevRight = { row, line };
			if (line.line.length > maxLineLength) maxLineLength = line.line.length;
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const row: DiffRow = {
				leftNum: null,
				leftText: '',
				leftType: null,
				rightNum: null,
				rightText: '',
				rightType: null
			};

			if (line.type === 'removed') {
				placeLeft(row, line);
				const next = lines[i + 1];
				const isChangedPrimitive =
					next?.type === 'added' &&
					next.path === line.path &&
					!line.isOpen && !line.isClose && !next.isOpen && !next.isClose;
				if (isChangedPrimitive) {
					placeRight(row, next);
					i++;
				}
			} else if (line.type === 'added') {
				placeRight(row, line);
			} else {
				placeLeft(row, line);
				placeRight(row, line);
			}
			rows.push(row);
		}

		return { rows, leftLineCount: leftNum, rightLineCount: rightNum, maxLineLength };
	});

	function isChanged(row: DiffRow): boolean {
		return row.leftType === 'removed' || row.rightType === 'added';
	}

	let hunks = $derived.by(() => {
		const out: Hunk[] = [];
		for (let i = 0; i < rows.length; i++) {
			if (!isChanged(rows[i])) continue;
			const last = out[out.length - 1];
			if (last && last.end === i - 1) last.end = i;
			else out.push({ start: i, end: i });
		}
		return out;
	});

	let currentHunk = $state(0);
	let totalHunks = $derived(hunks.length);
	let hasDiffs = $derived(totalHunks > 0);
	let currentRange = $derived<Hunk | null>(hunks[currentHunk] ?? null);

	function inCurrentHunk(rowIdx: number): boolean {
		return currentRange !== null && rowIdx >= currentRange.start && rowIdx <= currentRange.end;
	}

	function cellClass(type: DiffType | null): string {
		if (type === null) return 'empty';
		if (type === 'added' || type === 'removed') return type;
		return '';
	}

	// Virtual scroll: one scroll position shared by both panels
	let scrollTop = $state(0);
	let viewportHeight = $state(0);
	let leftContentEl = $state<HTMLElement | null>(null);
	let rightContentEl = $state<HTMLElement | null>(null);

	let visibleRowCount = $derived(
		viewportHeight > 0 ? Math.ceil(viewportHeight / ROW_HEIGHT) + 1 : FALLBACK_VISIBLE_ROWS
	);
	let firstRow = $derived(Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS));
	let lastRow = $derived(
		Math.min(rows.length, Math.floor(scrollTop / ROW_HEIGHT) + visibleRowCount + BUFFER_ROWS)
	);
	let visibleRows = $derived(rows.slice(firstRow, lastRow));
	let padTop = $derived(firstRow * ROW_HEIGHT);
	let padBottom = $derived((rows.length - lastRow) * ROW_HEIGHT);

	// Gutter fits the widest line number; the width holder keeps the horizontal
	// scroll range stable while different rows are virtualised in and out
	let gutterWidth = $derived(`${String(Math.max(leftLineCount, rightLineCount, 1)).length}ch`);
	let codeWidth = $derived(`${maxLineLength}ch`);

	function handleScroll(source: HTMLElement, target: HTMLElement | null) {
		scrollTop = source.scrollTop;
		if (target && Math.abs(target.scrollTop - source.scrollTop) > 1) {
			target.scrollTop = source.scrollTop;
		}
	}

	function setScroll(el: HTMLElement | null, top: number, behavior: ScrollBehavior) {
		if (!el) return;
		if (typeof el.scrollTo === 'function') el.scrollTo({ top, behavior });
		else el.scrollTop = top;
	}

	function scrollBoth(top: number, behavior: ScrollBehavior = 'smooth') {
		setScroll(leftContentEl, top, behavior);
		setScroll(rightContentEl, top, behavior);
	}

	function scrollToHunk(index: number, behavior: ScrollBehavior = 'smooth') {
		const hunk = hunks[index];
		if (!hunk) return;
		// Center the hunk's first row; long jumps skip the smooth animation
		const top = Math.max(0, hunk.start * ROW_HEIGHT - Math.max(0, viewportHeight - ROW_HEIGHT) / 2);
		const mode: ScrollBehavior = Math.abs(top - scrollTop) > viewportHeight * 4 ? 'auto' : behavior;
		scrollBoth(top, mode);
	}

	function goToNextDiff() {
		if (currentHunk < totalHunks - 1) {
			currentHunk++;
			scrollToHunk(currentHunk);
		}
	}

	function goToPrevDiff() {
		if (currentHunk > 0) {
			currentHunk--;
			scrollToHunk(currentHunk);
		}
	}

	onMount(() => {
		const el = leftContentEl;
		if (!el) return;
		const measure = () => {
			viewportHeight = el.clientHeight;
		};
		measure();
		let observer: ResizeObserver | null = null;
		if (typeof ResizeObserver !== 'undefined') {
			observer = new ResizeObserver(measure);
			observer.observe(el);
		}
		if (hasDiffs) scrollToHunk(0, 'auto');
		return () => observer?.disconnect();
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
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="side-by-side-diff" style="--row-h: {ROW_HEIGHT}px;">
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
					disabled={currentHunk === 0}
					title="Previous change (↑ or k)"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="18 15 12 9 6 15"/>
					</svg>
				</button>

				<span class="diff-counter" title="Change {currentHunk + 1} of {totalHunks}">
					<strong>{currentHunk + 1}</strong> of <strong>{totalHunks}</strong>
				</span>

				<button
					class="nav-btn"
					onclick={goToNextDiff}
					disabled={currentHunk === totalHunks - 1}
					title="Next change (↓ or j)"
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
					<span class="line-count">{leftLineCount} lines</span>
					<div class="scroll-btns">
						<button type="button" class="scroll-btn" onclick={() => scrollBoth(0)} title="Scroll to top">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="18 15 12 9 6 15"/>
							</svg>
						</button>
						<button type="button" class="scroll-btn" onclick={() => scrollBoth(rows.length * ROW_HEIGHT)} title="Scroll to bottom">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="6 9 12 15 18 9"/>
							</svg>
						</button>
					</div>
				</div>
			</div>
			<div
				class="diff-content"
				bind:this={leftContentEl}
				onscroll={(e) => handleScroll(e.currentTarget, rightContentEl)}
			>
				<div
					class="rows"
					style="padding-top: {padTop}px; padding-bottom: {padBottom}px; --gutter-w: {gutterWidth}; --code-w: {codeWidth};"
				>
					<div class="width-holder" aria-hidden="true"></div>
					{#each visibleRows as row, i (firstRow + i)}
						<div class="row {cellClass(row.leftType)}" class:current={inCurrentHunk(firstRow + i)}>
							<span class="num">{row.leftNum ?? ''}</span>
							<span class="code">{row.leftText}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="diff-panel right">
			<div class="panel-header">
				<span class="panel-title">Modified (Right)</span>
				<div class="panel-actions">
					<span class="line-count">{rightLineCount} lines</span>
					<div class="scroll-btns">
						<button type="button" class="scroll-btn" onclick={() => scrollBoth(0)} title="Scroll to top">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="18 15 12 9 6 15"/>
							</svg>
						</button>
						<button type="button" class="scroll-btn" onclick={() => scrollBoth(rows.length * ROW_HEIGHT)} title="Scroll to bottom">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="6 9 12 15 18 9"/>
							</svg>
						</button>
					</div>
				</div>
			</div>
			<div
				class="diff-content"
				bind:this={rightContentEl}
				onscroll={(e) => handleScroll(e.currentTarget, leftContentEl)}
			>
				<div
					class="rows"
					style="padding-top: {padTop}px; padding-bottom: {padBottom}px; --gutter-w: {gutterWidth}; --code-w: {codeWidth};"
				>
					<div class="width-holder" aria-hidden="true"></div>
					{#each visibleRows as row, i (firstRow + i)}
						<div class="row {cellClass(row.rightType)}" class:current={inCurrentHunk(firstRow + i)}>
							<span class="num">{row.rightNum ?? ''}</span>
							<span class="code">{row.rightText}</span>
						</div>
					{/each}
				</div>
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

	/* Virtualised rows */
	.diff-content {
		flex: 1;
		overflow: auto;
		font-family: var(--font-mono);
		font-size: 0.8rem;
	}

	/* max-content so row backgrounds span the full horizontal scroll range */
	.rows {
		width: max-content;
		min-width: 100%;
	}

	.width-holder {
		height: 0;
		width: calc(var(--gutter-w) + var(--code-w) + 3rem);
	}

	.row {
		display: flex;
		height: var(--row-h);
		line-height: var(--row-h);
		white-space: pre;
	}

	.num {
		position: sticky;
		left: 0;
		z-index: 1;
		flex: 0 0 auto;
		box-sizing: content-box;
		min-width: var(--gutter-w);
		padding: 0 0.5rem;
		text-align: right;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		user-select: none;
	}

	.code {
		flex: 1 0 auto;
		padding: 0 0.75rem;
	}

	.row.added {
		background: rgba(34, 197, 94, 0.12);
	}

	/* Gutter stays opaque so code doesn't show through when scrolled sideways */
	.row.added .num {
		color: var(--color-success);
		background: linear-gradient(rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.15)), var(--color-surface);
	}

	.row.removed {
		background: rgba(239, 68, 68, 0.12);
	}

	.row.removed .num {
		color: var(--color-error);
		background: linear-gradient(rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.15)), var(--color-surface);
	}

	/* No counterpart on this side */
	.row.empty {
		background: repeating-linear-gradient(
			-45deg,
			transparent 0 6px,
			rgba(127, 127, 127, 0.08) 6px 12px
		);
	}

	.row.current .num {
		background: var(--color-primary);
		color: white;
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

		.num {
			font-size: 0.65rem;
		}

		.diff-content {
			font-size: 0.7rem;
		}
	}
</style>
