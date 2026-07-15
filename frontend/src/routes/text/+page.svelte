<script lang="ts">
	import { onMount, tick } from 'svelte';

	// Constants for large file handling
	const LARGE_FILE_THRESHOLD = 50000; // 50KB - warn user
	const MAX_LINES_RENDER = 10000; // Max lines to render at once

	let leftText = $state('');
	let rightText = $state('');
	let showResults = $state(false);
	let ignoreWhitespace = $state(false);
	let ignoreCase = $state(false);
	let isComparing = $state(false);

	interface DiffLine {
		type: 'added' | 'removed' | 'unchanged';
		lineNum: number;
		content: string;
	}

	let leftLines = $state<DiffLine[]>([]);
	let rightLines = $state<DiffLine[]>([]);
	let stats = $state({ added: 0, removed: 0, unchanged: 0 });

	// Navigation state
	let currentDiffIndex = $state(0);
	let leftContentEl: HTMLElement | null = null;
	let rightContentEl: HTMLElement | null = null;
	let leftEditorEl: HTMLTextAreaElement | null = null;
	let rightEditorEl: HTMLTextAreaElement | null = null;

	// Find diff indices
	let diffIndices = $derived.by(() => {
		const indices: number[] = [];
		leftLines.forEach((line, idx) => {
			if (line.type !== 'unchanged') indices.push(idx);
		});
		return indices;
	});

	let rightDiffIndices = $derived.by(() => {
		const indices: number[] = [];
		rightLines.forEach((line, idx) => {
			if (line.type !== 'unchanged') indices.push(idx);
		});
		return indices;
	});

	let totalDiffs = $derived(diffIndices.length + rightDiffIndices.length);
	let hasDiffs = $derived(totalDiffs > 0);

	// File size warnings
	let leftSize = $derived(new Blob([leftText]).size);
	let rightSize = $derived(new Blob([rightText]).size);
	let isLargeFile = $derived(leftSize > LARGE_FILE_THRESHOLD || rightSize > LARGE_FILE_THRESHOLD);
	let totalLines = $derived(leftText.split('\n').length + rightText.split('\n').length);
	let isTooManyLines = $derived(totalLines > MAX_LINES_RENDER);

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
	}

	async function computeTextDiff() {
		if (!leftText.trim() && !rightText.trim()) return;

		isComparing = true;
		await tick();

		// Use setTimeout to let UI update
		setTimeout(() => {
			let leftArr = leftText.split('\n');
			let rightArr = rightText.split('\n');

			// Truncate if too many lines
			if (leftArr.length > MAX_LINES_RENDER) {
				leftArr = leftArr.slice(0, MAX_LINES_RENDER);
			}
			if (rightArr.length > MAX_LINES_RENDER) {
				rightArr = rightArr.slice(0, MAX_LINES_RENDER);
			}

			let leftCompare = leftArr.map(l => {
				let line = l;
				if (ignoreWhitespace) line = line.trim();
				if (ignoreCase) line = line.toLowerCase();
				return line;
			});

			let rightCompare = rightArr.map(l => {
				let line = l;
				if (ignoreWhitespace) line = line.trim();
				if (ignoreCase) line = line.toLowerCase();
				return line;
			});

			const diff = computeLCSDiff(leftCompare, rightCompare, leftArr, rightArr);
			leftLines = diff.leftLines;
			rightLines = diff.rightLines;
			stats = diff.stats;
			currentDiffIndex = 0;
			showResults = true;
			isComparing = false;

			// Scroll to first diff after render
			setTimeout(() => scrollToCurrentDiff(), 100);
		}, 50);
	}

	function computeLCSDiff(
		leftCompare: string[], 
		rightCompare: string[],
		leftOrig: string[],
		rightOrig: string[]
	): { leftLines: DiffLine[]; rightLines: DiffLine[]; stats: typeof stats } {
		const m = leftCompare.length;
		const n = rightCompare.length;
		
		// Optimized LCS for large files
		const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
		
		for (let i = 1; i <= m; i++) {
			for (let j = 1; j <= n; j++) {
				if (leftCompare[i - 1] === rightCompare[j - 1]) {
					dp[i][j] = dp[i - 1][j - 1] + 1;
				} else {
					dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
				}
			}
		}

		const result: { type: 'added' | 'removed' | 'unchanged'; leftIdx: number | null; rightIdx: number | null }[] = [];
		let i = m, j = n;

		while (i > 0 || j > 0) {
			if (i > 0 && j > 0 && leftCompare[i - 1] === rightCompare[j - 1]) {
				result.unshift({ type: 'unchanged', leftIdx: i - 1, rightIdx: j - 1 });
				i--;
				j--;
			} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
				result.unshift({ type: 'added', leftIdx: null, rightIdx: j - 1 });
				j--;
			} else {
				result.unshift({ type: 'removed', leftIdx: i - 1, rightIdx: null });
				i--;
			}
		}

		const left: DiffLine[] = [];
		const right: DiffLine[] = [];
		let leftNum = 0;
		let rightNum = 0;

		for (const item of result) {
			if (item.type === 'unchanged') {
				leftNum++;
				rightNum++;
				left.push({ type: 'unchanged', lineNum: leftNum, content: leftOrig[item.leftIdx!] });
				right.push({ type: 'unchanged', lineNum: rightNum, content: rightOrig[item.rightIdx!] });
			} else if (item.type === 'removed') {
				leftNum++;
				left.push({ type: 'removed', lineNum: leftNum, content: leftOrig[item.leftIdx!] });
			} else {
				rightNum++;
				right.push({ type: 'added', lineNum: rightNum, content: rightOrig[item.rightIdx!] });
			}
		}

		const added = result.filter(r => r.type === 'added').length;
		const removed = result.filter(r => r.type === 'removed').length;
		const unchanged = result.filter(r => r.type === 'unchanged').length;

		return { leftLines: left, rightLines: right, stats: { added, removed, unchanged } };
	}

	// Navigation functions
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
		
		// Find which side and index
		if (currentDiffIndex < diffIndices.length && leftContentEl) {
			const lineIdx = diffIndices[currentDiffIndex];
			const lineEl = leftContentEl.querySelector(`[data-line-idx="${lineIdx}"]`);
			lineEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		} else if (rightContentEl) {
			const rightIdx = currentDiffIndex - diffIndices.length;
			if (rightIdx >= 0 && rightIdx < rightDiffIndices.length) {
				const lineIdx = rightDiffIndices[rightIdx];
				const lineEl = rightContentEl.querySelector(`[data-line-idx="${lineIdx}"]`);
				lineEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	}

	function scrollToTop(side: 'left' | 'right' | 'editor-left' | 'editor-right') {
		if (side === 'left') leftContentEl?.scrollTo({ top: 0, behavior: 'smooth' });
		else if (side === 'right') rightContentEl?.scrollTo({ top: 0, behavior: 'smooth' });
		else if (side === 'editor-left') leftEditorEl?.scrollTo({ top: 0, behavior: 'smooth' });
		else if (side === 'editor-right') rightEditorEl?.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function scrollToBottom(side: 'left' | 'right' | 'editor-left' | 'editor-right') {
		if (side === 'left') leftContentEl?.scrollTo({ top: leftContentEl.scrollHeight, behavior: 'smooth' });
		else if (side === 'right') rightContentEl?.scrollTo({ top: rightContentEl.scrollHeight, behavior: 'smooth' });
		else if (side === 'editor-left') leftEditorEl?.scrollTo({ top: leftEditorEl.scrollHeight, behavior: 'smooth' });
		else if (side === 'editor-right') rightEditorEl?.scrollTo({ top: rightEditorEl.scrollHeight, behavior: 'smooth' });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!showResults) return;
		if (e.key === 'ArrowDown' || e.key === 'j') {
			e.preventDefault();
			goToNextDiff();
		} else if (e.key === 'ArrowUp' || e.key === 'k') {
			e.preventDefault();
			goToPrevDiff();
		}
	}

	function handleClear() {
		leftText = '';
		rightText = '';
		leftLines = [];
		rightLines = [];
		stats = { added: 0, removed: 0, unchanged: 0 };
		showResults = false;
	}

	function handleSwap() {
		const temp = leftText;
		leftText = rightText;
		rightText = temp;
		showResults = false;
	}

	function handleEdit() {
		showResults = false;
	}

	async function handleFileUpload(e: Event, side: 'left' | 'right') {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			if (side === 'left') leftText = text;
			else rightText = text;
			showResults = false;
		} catch {
			// Handle error silently
		}
	}

	function loadSample() {
		leftText = `Hello World
This is a sample text
for comparing differences.
Line four stays the same.
This line will be removed.
Another unchanged line.`;

		rightText = `Hello World
This is a modified text
for comparing differences.
Line four stays the same.
A new line was added here.
Another unchanged line.
One more new line.`;
		showResults = false;
	}

	function getLineClass(type: string, lineIdx: number, side: 'left' | 'right'): string {
		let cls = '';
		switch (type) {
			case 'added': cls = 'line-added'; break;
			case 'removed': cls = 'line-removed'; break;
			default: cls = 'line-unchanged';
		}
		
		// Check if this is current diff
		if (type !== 'unchanged') {
			if (side === 'left' && diffIndices[currentDiffIndex] === lineIdx) {
				cls += ' current-diff';
			} else if (side === 'right') {
				const rightIdx = currentDiffIndex - diffIndices.length;
				if (rightIdx >= 0 && rightDiffIndices[rightIdx] === lineIdx) {
					cls += ' current-diff';
				}
			}
		}
		return cls;
	}
</script>

<svelte:head>
	<title>Text Compare - Freebies JSON Tools</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="container">
	<div class="page-header">
		<div class="header-info">
			<h2>Text Comparison</h2>
			<p>Side-by-side text diff view</p>
		</div>
		<div class="header-actions">
			{#if showResults}
				<button type="button" class="btn btn-secondary" onclick={handleEdit}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
					</svg>
					<span class="btn-text">Edit</span>
				</button>
			{/if}
			<button type="button" class="btn btn-secondary" onclick={loadSample}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
					<polyline points="14 2 14 8 20 8"/>
				</svg>
				<span class="btn-text">Sample</span>
			</button>
			<button type="button" class="btn btn-secondary" onclick={handleSwap}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="17 1 21 5 17 9"/>
					<path d="M3 11V9a4 4 0 0 1 4-4h14"/>
					<polyline points="7 23 3 19 7 15"/>
					<path d="M21 13v2a4 4 0 0 1-4 4H3"/>
				</svg>
				<span class="btn-text">Swap</span>
			</button>
			<button type="button" class="btn btn-secondary" onclick={handleClear}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="3 6 5 6 21 6"/>
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
				</svg>
				<span class="btn-text">Clear</span>
			</button>
		</div>
	</div>

	<div class="main-content card">
		{#if !showResults}
			<!-- Compare bar at top -->
			<div class="compare-bar">
				<div class="options">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={ignoreWhitespace} />
						<span>Ignore whitespace</span>
					</label>
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={ignoreCase} />
						<span>Ignore case</span>
					</label>
				</div>
				{#if isLargeFile}
					<span class="large-warning">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
							<line x1="12" y1="9" x2="12" y2="13"/>
							<line x1="12" y1="17" x2="12.01" y2="17"/>
						</svg>
						<span class="warning-text">Large file - may take time</span>
					</span>
				{/if}
				<button type="button" class="btn btn-primary" onclick={computeTextDiff} disabled={isComparing}>
					{#if isComparing}
						<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" stroke-opacity="0.3"/>
							<path d="M12 2a10 10 0 0 1 10 10"/>
						</svg>
						Comparing...
					{:else}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="20" x2="18" y2="10"/>
							<line x1="12" y1="20" x2="12" y2="4"/>
							<line x1="6" y1="20" x2="6" y2="14"/>
						</svg>
						Compare Text
					{/if}
				</button>
			</div>

			<!-- File info bar -->
			<div class="file-info-bar">
				<div class="file-info">
					<span class="file-label">Left:</span>
					<span class="line-count">{leftText.split('\n').filter(l => l).length} lines</span>
					<span class="file-size" class:large={leftSize > LARGE_FILE_THRESHOLD}>{formatSize(leftSize)}</span>
					<label class="upload-btn">
						<input type="file" accept=".txt,.md,.log,.json,.xml,.csv,.html,.css,.js,.ts" onchange={(e) => handleFileUpload(e, 'left')} hidden />
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
							<polyline points="17 8 12 3 7 8"/>
							<line x1="12" y1="3" x2="12" y2="15"/>
						</svg>
						<span class="upload-text">Upload</span>
					</label>
				</div>
				<div class="file-info">
					<span class="file-label">Right:</span>
					<span class="line-count">{rightText.split('\n').filter(l => l).length} lines</span>
					<span class="file-size" class:large={rightSize > LARGE_FILE_THRESHOLD}>{formatSize(rightSize)}</span>
					<label class="upload-btn">
						<input type="file" accept=".txt,.md,.log,.json,.xml,.csv,.html,.css,.js,.ts" onchange={(e) => handleFileUpload(e, 'right')} hidden />
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
							<polyline points="17 8 12 3 7 8"/>
							<line x1="12" y1="3" x2="12" y2="15"/>
						</svg>
						<span class="upload-text">Upload</span>
					</label>
				</div>
			</div>

			<!-- Editors -->
			<div class="editors-grid">
				<div class="editor-panel">
					<div class="editor-header">
						<span>Original Text</span>
						<div class="scroll-btns">
							<button type="button" class="scroll-btn" onclick={() => scrollToTop('editor-left')} title="Scroll to top">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="18 15 12 9 6 15"/>
								</svg>
							</button>
							<button type="button" class="scroll-btn" onclick={() => scrollToBottom('editor-left')} title="Scroll to bottom">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="6 9 12 15 18 9"/>
								</svg>
							</button>
						</div>
					</div>
					<textarea 
						class="text-editor"
						bind:value={leftText}
						bind:this={leftEditorEl}
						placeholder="Paste or type the original text here..."
						spellcheck="false"
					></textarea>
				</div>
				<div class="editor-panel">
					<div class="editor-header">
						<span>Modified Text</span>
						<div class="scroll-btns">
							<button type="button" class="scroll-btn" onclick={() => scrollToTop('editor-right')} title="Scroll to top">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="18 15 12 9 6 15"/>
								</svg>
							</button>
							<button type="button" class="scroll-btn" onclick={() => scrollToBottom('editor-right')} title="Scroll to bottom">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="6 9 12 15 18 9"/>
								</svg>
							</button>
						</div>
					</div>
					<textarea 
						class="text-editor"
						bind:value={rightText}
						bind:this={rightEditorEl}
						placeholder="Paste or type the modified text here..."
						spellcheck="false"
					></textarea>
				</div>
			</div>
		{:else}
			<!-- Results Mode: Side-by-side diff with navigation -->
			<div class="diff-nav-bar">
				<div class="diff-stats">
					<span class="stat stat-removed">-{stats.removed}</span>
					<span class="stat stat-added">+{stats.added}</span>
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
						<span class="panel-title">Original</span>
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
								<span class="line-num {getLineClass(line.type, i, 'left')}" data-line-idx={i}>{line.lineNum}</span>
							{/each}
						</div>
						<pre class="diff-code">{#each leftLines as line, i}<span class="diff-line {getLineClass(line.type, i, 'left')}" data-line-idx={i}>{line.content}
</span>{/each}</pre>
					</div>
				</div>

				<div class="diff-panel right">
					<div class="panel-header">
						<span class="panel-title">Modified</span>
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
								<span class="line-num {getLineClass(line.type, i, 'right')}" data-line-idx={i}>{line.lineNum}</span>
							{/each}
						</div>
						<pre class="diff-code">{#each rightLines as line, i}<span class="diff-line {getLineClass(line.type, i, 'right')}" data-line-idx={i}>{line.content}
</span>{/each}</pre>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header-info h2 {
		margin-bottom: 0.25rem;
	}

	.header-info p {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-text {
		margin-left: 0.35rem;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - 200px);
		overflow: hidden;
	}

	/* Compare bar at top */
	.compare-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
	}

	.options {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.checkbox-label input {
		width: 1rem;
		height: 1rem;
	}

	.large-warning {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.75rem;
		background: rgba(234, 179, 8, 0.1);
		border: 1px solid rgba(234, 179, 8, 0.3);
		border-radius: 6px;
		color: #eab308;
		font-size: 0.8rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.spinner {
		animation: spin 1s linear infinite;
	}

	/* File info bar */
	.file-info-bar {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.file-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.file-label {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		font-weight: 500;
	}

	.line-count {
		font-size: 0.8rem;
		color: var(--color-text);
		font-family: var(--font-mono);
	}

	.file-size {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		font-family: var(--font-mono);
	}

	.file-size.large {
		color: #eab308;
	}

	.upload-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text);
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.upload-btn:hover {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.upload-text {
		display: inline;
	}

	/* Editors */
	.editors-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		flex: 1;
		min-height: 350px;
	}

	.editor-panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.editor-panel:first-child {
		border-right: 1px solid var(--color-border);
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
		font-size: 0.85rem;
		font-weight: 500;
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
		background: var(--color-surface);
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

	.text-editor {
		flex: 1;
		padding: 1rem;
		background: var(--color-surface);
		border: none;
		color: var(--color-text);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.5;
		resize: none;
		outline: none;
		overflow: auto;
	}

	.text-editor::placeholder {
		color: var(--color-text-muted);
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

	.panel-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
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
		.editors-grid {
			grid-template-columns: 1fr;
			min-height: auto;
		}

		.editor-panel {
			min-height: 180px;
		}

		.editor-panel:first-child {
			border-right: none;
			border-bottom: 1px solid var(--color-border);
		}

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

		.compare-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.options {
			justify-content: center;
		}

		.keyboard-hints {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
		}

		.header-actions {
			width: 100%;
		}

		.header-actions .btn {
			flex: 1;
			justify-content: center;
		}

		.btn-text {
			display: none;
		}

		.file-info-bar {
			flex-direction: column;
		}

		.file-info {
			width: 100%;
			justify-content: space-between;
		}

		.upload-text {
			display: none;
		}

		.compare-bar {
			gap: 0.5rem;
			padding: 0.5rem;
		}

		.large-warning .warning-text {
			display: none;
		}

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
