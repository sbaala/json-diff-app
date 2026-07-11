<script lang="ts">
	import { JsonEditor, SideBySideDiff, StatsPanel } from '$lib/components';
	import { compareJson, getStatistics } from '$lib/api';
	import { computeInlineDiff, type InlineDiffResult } from '$lib/utils/jsonDiff';
	import type { CompareResponse, StatisticsResponse, AnnotatedNode } from '$lib/types';

	// Constants
	const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
	const CLIENT_SIDE_THRESHOLD = 3 * 1024 * 1024; // 3MB - use client-side diff below this
	const LARGE_FILE_THRESHOLD = 1 * 1024 * 1024; // 1MB

	// State
	let leftJson = $state('');
	let rightJson = $state('');
	let leftError = $state<string | null>(null);
	let rightError = $state<string | null>(null);
	let isLoading = $state(false);
	let ignoreOrder = $state(false);
	let progress = $state(0);
	let progressMessage = $state('');
	let showResults = $state(false);

	// File info
	let leftFileSize = $derived(new Blob([leftJson]).size);
	let rightFileSize = $derived(new Blob([rightJson]).size);
	let totalSize = $derived(leftFileSize + rightFileSize);
	let isLargeFile = $derived(leftFileSize > LARGE_FILE_THRESHOLD || rightFileSize > LARGE_FILE_THRESHOLD);

	// Results
	let compareResult = $state<CompareResponse | null>(null);
	let statistics = $state<StatisticsResponse | null>(null);
	let inlineDiffResult = $state<InlineDiffResult | null>(null);

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
	}

	function validateJson(value: string, label: string): { valid: boolean; data?: unknown; error?: string } {
		if (!value.trim()) {
			return { valid: false, error: 'JSON is required' };
		}
		
		const size = new Blob([value]).size;
		if (size > MAX_FILE_SIZE) {
			return { valid: false, error: `File too large (${formatFileSize(size)}). Maximum size is 10MB.` };
		}
		
		try {
			const data = JSON.parse(value);
			return { valid: true, data };
		} catch (e) {
			const error = e instanceof Error ? e.message : 'Invalid JSON';
			return { valid: false, error };
		}
	}

	function computeClientSideStats(left: unknown, right: unknown): StatisticsResponse {
		function countKeys(obj: unknown, depth = 0): { keys: number; arrays: number; objects: number; maxDepth: number } {
			if (Array.isArray(obj)) {
				let result = { keys: 0, arrays: 1, objects: 0, maxDepth: depth };
				for (const item of obj) {
					const sub = countKeys(item, depth + 1);
					result.keys += sub.keys;
					result.arrays += sub.arrays;
					result.objects += sub.objects;
					result.maxDepth = Math.max(result.maxDepth, sub.maxDepth);
				}
				return result;
			} else if (typeof obj === 'object' && obj !== null) {
				let result = { keys: Object.keys(obj).length, arrays: 0, objects: 1, maxDepth: depth };
				for (const val of Object.values(obj)) {
					const sub = countKeys(val, depth + 1);
					result.keys += sub.keys;
					result.arrays += sub.arrays;
					result.objects += sub.objects;
					result.maxDepth = Math.max(result.maxDepth, sub.maxDepth);
				}
				return result;
			}
			return { keys: 0, arrays: 0, objects: 0, maxDepth: depth };
		}

		const leftStats = countKeys(left);
		const rightStats = countKeys(right);

		return {
			total_keys_left: leftStats.keys,
			total_keys_right: rightStats.keys,
			depth_left: leftStats.maxDepth,
			depth_right: rightStats.maxDepth,
			array_count_left: leftStats.arrays,
			array_count_right: rightStats.arrays,
			object_count_left: leftStats.objects,
			object_count_right: rightStats.objects
		};
	}

	async function handleCompare() {
		const leftResult = validateJson(leftJson, 'Left');
		const rightResult = validateJson(rightJson, 'Right');

		leftError = leftResult.valid ? null : (leftResult.error ?? null);
		rightError = rightResult.valid ? null : (rightResult.error ?? null);

		if (!leftResult.valid || !rightResult.valid) {
			return;
		}

		isLoading = true;
		progress = 0;
		progressMessage = 'Preparing comparison...';
		compareResult = null;
		inlineDiffResult = null;
		statistics = null;
		showResults = false;

		try {
			const useClientSide = totalSize < CLIENT_SIDE_THRESHOLD;

			if (useClientSide) {
				progress = 30;
				progressMessage = 'Computing diff client-side...';
				
				// Use setTimeout to allow UI to update before heavy computation
				await new Promise<void>(resolve => {
					setTimeout(() => {
						inlineDiffResult = computeInlineDiff(leftResult.data, rightResult.data, ignoreOrder);
						resolve();
					}, 50);
				});
				
				progress = 70;
				progressMessage = 'Calculating statistics...';
				await new Promise(resolve => setTimeout(resolve, 50));

				statistics = computeClientSideStats(leftResult.data, rightResult.data);

				compareResult = {
					is_equal: inlineDiffResult!.stats.added === 0 && 
					          inlineDiffResult!.stats.removed === 0,
					diff_count: inlineDiffResult!.stats.added + inlineDiffResult!.stats.removed,
					added_count: inlineDiffResult!.stats.added,
					removed_count: inlineDiffResult!.stats.removed,
					modified_count: 0,
					differences: [],
					left_tree: {} as AnnotatedNode,
					right_tree: {} as AnnotatedNode
				};

				progress = 100;
				progressMessage = 'Complete!';
			} else {
				progress = 20;
				progressMessage = 'Parsing JSON documents...';
				await new Promise(resolve => setTimeout(resolve, 100));

				const request = {
					left_json: leftResult.data as Record<string, unknown>,
					right_json: rightResult.data as Record<string, unknown>,
					ignore_order: ignoreOrder
				};

				progress = 40;
				progressMessage = 'Sending to server for comparison...';
				await new Promise(resolve => setTimeout(resolve, 100));

				const [compResult, statsResult] = await Promise.all([
					compareJson(request),
					getStatistics(request)
				]);

				progress = 80;
				progressMessage = 'Processing results...';
				await new Promise(resolve => setTimeout(resolve, 100));

				compareResult = compResult;
				statistics = statsResult;
				inlineDiffResult = computeInlineDiff(leftResult.data, rightResult.data, ignoreOrder);

				progress = 100;
				progressMessage = 'Complete!';
			}

			showResults = true;
		} catch (e) {
			const error = e instanceof Error ? e.message : 'Comparison failed';
			leftError = error;
		} finally {
			setTimeout(() => {
				isLoading = false;
				progress = 0;
				progressMessage = '';
			}, 300);
		}
	}

	function handleClear() {
		leftJson = '';
		rightJson = '';
		leftError = null;
		rightError = null;
		compareResult = null;
		statistics = null;
		inlineDiffResult = null;
		showResults = false;
	}

	function handleSwap() {
		const temp = leftJson;
		leftJson = rightJson;
		rightJson = temp;
		compareResult = null;
		statistics = null;
		inlineDiffResult = null;
		showResults = false;
	}

	function handleEdit() {
		showResults = false;
	}

	async function handleFileUpload(e: Event, side: 'left' | 'right') {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (file.size > MAX_FILE_SIZE) {
			const error = `File too large (${formatFileSize(file.size)}). Maximum size is 10MB.`;
			if (side === 'left') leftError = error;
			else rightError = error;
			return;
		}

		try {
			const text = await file.text();
			if (side === 'left') {
				leftJson = text;
				leftError = null;
			} else {
				rightJson = text;
				rightError = null;
			}
			showResults = false;
		} catch {
			const error = 'Failed to read file';
			if (side === 'left') leftError = error;
			else rightError = error;
		}
	}

	function loadSampleData() {
		leftJson = JSON.stringify(
			{
				name: 'John Doe',
				age: 30,
				email: 'john@example.com',
				address: {
					city: 'New York',
					zip: '10001'
				},
				hobbies: ['reading', 'gaming', 'coding']
			},
			null,
			2
		);

		rightJson = JSON.stringify(
			{
				name: 'John Doe',
				age: 31,
				phone: '555-1234',
				address: {
					city: 'Boston',
					zip: '02101',
					state: 'MA'
				},
				hobbies: ['reading', 'gaming', 'music']
			},
			null,
			2
		);
		showResults = false;
	}
</script>

<svelte:head>
	<title>Compare JSON - Freebies JSON Tools</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<div class="header-info">
			<h2>Compare JSON</h2>
			<p>
				Side-by-side comparison up to 10MB
				{#if totalSize > 0}
					<span class="size-badge" class:client-side={totalSize < CLIENT_SIDE_THRESHOLD}>
						{totalSize < CLIENT_SIDE_THRESHOLD ? 'Client-side' : 'Server-side'}
					</span>
				{/if}
			</p>
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
			<button type="button" class="btn btn-secondary" onclick={loadSampleData}>
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

	<div class="main-layout" class:has-stats={showResults && statistics}>
		<div class="content-area card">
			{#if !showResults}
				<!-- Input Mode: Show editors -->
				<div class="compare-bar">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={ignoreOrder} />
						<span>Ignore array order</span>
					</label>
					{#if isLargeFile}
						<span class="large-file-warning">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
								<line x1="12" y1="9" x2="12" y2="13"/>
								<line x1="12" y1="17" x2="12.01" y2="17"/>
							</svg>
							<span class="warning-text">Large file - may take time</span>
						</span>
					{/if}
					<button
						type="button"
						class="btn btn-primary"
						onclick={handleCompare}
						disabled={isLoading}
					>
						{#if isLoading}
							<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10" stroke-opacity="0.3"/>
								<path d="M12 2a10 10 0 0 1 10 10"/>
							</svg>
							Comparing...
						{:else}
							Compare JSON
						{/if}
					</button>
				</div>

				{#if isLoading && progress > 0}
					<div class="progress-container">
						<div class="progress-bar">
							<div class="progress-fill" style="width: {progress}%"></div>
						</div>
						<span class="progress-text">{progressMessage}</span>
					</div>
				{/if}

				<div class="file-info-bar">
					<div class="file-info">
						<span class="file-label">Left:</span>
						<span class="file-size" class:large={leftFileSize > LARGE_FILE_THRESHOLD}>{formatFileSize(leftFileSize)}</span>
						<label class="upload-btn">
							<input type="file" accept=".json,application/json" onchange={(e) => handleFileUpload(e, 'left')} hidden />
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
								<polyline points="17 8 12 3 7 8"/>
								<line x1="12" y1="3" x2="12" y2="15"/>
							</svg>
							<span class="upload-text">Upload</span>
						</label>
					</div>
					<div class="size-limit">Max: 10MB</div>
					<div class="file-info">
						<span class="file-label">Right:</span>
						<span class="file-size" class:large={rightFileSize > LARGE_FILE_THRESHOLD}>{formatFileSize(rightFileSize)}</span>
						<label class="upload-btn">
							<input type="file" accept=".json,application/json" onchange={(e) => handleFileUpload(e, 'right')} hidden />
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
								<polyline points="17 8 12 3 7 8"/>
								<line x1="12" y1="3" x2="12" y2="15"/>
							</svg>
							<span class="upload-text">Upload</span>
						</label>
					</div>
				</div>

				<div class="editors-grid">
					<div class="editor-panel">
						<JsonEditor
							bind:value={leftJson}
							label="Left JSON (Original)"
							placeholder={`{"key": "value"}`}
							error={leftError}
						/>
					</div>
					<div class="editor-panel">
						<JsonEditor
							bind:value={rightJson}
							label="Right JSON (Modified)"
							placeholder={`{"key": "value"}`}
							error={rightError}
						/>
					</div>
				</div>
			{:else if inlineDiffResult}
				<!-- Results Mode: Show side-by-side diff -->
				<SideBySideDiff diffResult={inlineDiffResult} />
			{/if}
		</div>

		{#if showResults && statistics}
			<div class="stats-sidebar card">
				<StatsPanel {compareResult} {statistics} />
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
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.size-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.15rem 0.5rem;
		background: var(--color-bg);
		border-radius: 20px;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
	}

	.size-badge.client-side {
		background: rgba(34, 197, 94, 0.15);
		border-color: var(--color-success);
		color: var(--color-success);
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-text {
		margin-left: 0.35rem;
	}

	.main-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		min-height: calc(100vh - 200px);
	}

	.main-layout.has-stats {
		grid-template-columns: 1fr 260px;
	}

	.content-area {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 500px;
	}

	.stats-sidebar {
		height: fit-content;
		position: sticky;
		top: 80px;
	}

	.editors-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		flex: 1;
		min-height: 350px;
	}

	.editor-panel {
		display: flex;
		flex-direction: column;
	}

	.editor-panel:first-child {
		border-right: 1px solid var(--color-border);
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

	/* File upload bar styles */
	.file-info-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 1rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
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

	.file-size {
		font-size: 0.8rem;
		color: var(--color-text);
		font-family: var(--font-mono);
	}

	.file-size.large {
		color: #eab308;
	}

	.size-limit {
		font-size: 0.75rem;
		color: var(--color-text-muted);
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

	/* Warning and progress styles */
	.large-file-warning {
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

	.progress-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--color-bg);
	}

	.progress-bar {
		width: 100%;
		max-width: 300px;
		height: 6px;
		background: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.spinner {
		animation: spin 1s linear infinite;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.main-layout.has-stats {
			grid-template-columns: 1fr;
		}

		.stats-sidebar {
			position: static;
		}
	}

	@media (max-width: 768px) {
		.editors-grid {
			grid-template-columns: 1fr;
			min-height: auto;
		}

		.editor-panel {
			min-height: 200px;
		}

		.editor-panel:first-child {
			border-right: none;
			border-bottom: 1px solid var(--color-border);
		}

		.content-area {
			min-height: auto;
		}
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.header-actions {
			width: 100%;
			flex-wrap: wrap;
		}

		.header-actions .btn {
			flex: 1;
			min-width: 0;
			justify-content: center;
			padding: 0.5rem 0.35rem;
		}

		.btn-text {
			display: none;
		}

		.file-info-bar {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.file-info {
			width: 100%;
			justify-content: space-between;
		}

		.size-limit {
			align-self: center;
		}

		.compare-bar {
			flex-direction: column;
			gap: 0.75rem;
		}

		.large-file-warning .warning-text {
			display: none;
		}

		.upload-text {
			display: none;
		}
	}
</style>
