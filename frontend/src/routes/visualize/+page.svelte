<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		extractDatasets,
		suggestCharts,
		type ChartMapping,
		type ChartSuggestion,
		type ChartType,
		type Dataset
	} from '$lib/utils/vizAnalyzer';
	import { prepareChart, MAX_SERIES, type Prepared } from '$lib/utils/vizPrep';
	import {
		BarChart,
		DataTable,
		HeatmapChart,
		LineChart,
		ScatterChart,
		StatTiles,
		TreemapChart
	} from '$lib/components/viz';

	let jsonInput = $state('');
	let error = $state<string | null>(null);
	let datasets = $state<Dataset[]>([]);
	let activeDs = $state(0);
	let suggestions = $state<ChartSuggestion[]>([]);
	let chartType = $state<ChartType>('bar');
	let mapping = $state<ChartMapping>({ y: [] });
	let activeSuggestion = $state<string | null>(null);
	let showTable = $state(false);
	let showMapping = $state(false);

	const CHART_LABELS: Record<ChartType, string> = {
		bar: 'Bar',
		hbar: 'Bar (horizontal)',
		'grouped-bar': 'Grouped bar',
		'stacked-bar': 'Stacked bar',
		line: 'Line',
		area: 'Area',
		scatter: 'Scatter',
		histogram: 'Histogram',
		heatmap: 'Heatmap',
		treemap: 'Treemap',
		kpi: 'Stat tiles',
		table: 'Table'
	};

	const dataset = $derived(datasets[activeDs] ?? null);
	const basicSugs = $derived(suggestions.filter((s) => s.tier === 'basic' && s.type !== 'table'));
	const advancedSugs = $derived(suggestions.filter((s) => s.tier === 'advanced'));

	const prepared = $derived.by<Prepared | null>(() => {
		if (!dataset) return null;
		if (chartType === 'table') return { kind: 'table', data: null };
		return prepareChart(chartType, dataset, mapping);
	});

	// Field lists for the mapping controls
	const axisFields = $derived(dataset ? dataset.fields.filter((f) => f.kind !== 'other') : []);
	const numericFields = $derived(dataset ? dataset.fields.filter((f) => f.kind === 'number') : []);
	const splitFields = $derived(
		dataset
			? dataset.fields.filter((f) => (f.kind === 'category' || f.kind === 'boolean') && f.uniqueCount <= 12)
			: []
	);
	const needsX = $derived(!['histogram', 'kpi', 'table'].includes(chartType));
	const multiY = $derived(['grouped-bar', 'stacked-bar', 'line', 'area'].includes(chartType));
	const needsSeries = $derived(chartType === 'heatmap');
	const allowsSeries = $derived(['stacked-bar', 'scatter', 'heatmap'].includes(chartType));

	function analyze() {
		error = null;
		datasets = [];
		suggestions = [];
		activeSuggestion = null;
		showTable = false;

		if (!jsonInput.trim()) {
			error = 'Please enter JSON to analyze';
			return;
		}
		let parsed: unknown;
		try {
			parsed = JSON.parse(jsonInput);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid JSON';
			return;
		}
		const found = extractDatasets(parsed);
		if (found.length === 0) {
			error =
				'No chartable data found. The analyzer looks for arrays of objects, arrays of numbers, or objects with numeric values.';
			return;
		}
		datasets = found;
		selectDataset(0);
	}

	function selectDataset(idx: number) {
		activeDs = idx;
		const ds = datasets[idx];
		suggestions = suggestCharts(ds);
		const top = suggestions.find((s) => s.type !== 'table');
		if (top) applySuggestion(top);
		else {
			chartType = 'table';
			mapping = { y: [] };
		}
	}

	function applySuggestion(s: ChartSuggestion) {
		activeSuggestion = s.id;
		chartType = s.type;
		mapping = { x: s.mapping.x, y: [...s.mapping.y], series: s.mapping.series };
	}

	function setChartType(t: ChartType) {
		chartType = t;
		activeSuggestion = null;
		// Fill required slots with sensible defaults when empty
		if (mapping.y.length === 0 && numericFields.length > 0) {
			mapping = { ...mapping, y: [numericFields[0].name] };
		}
		if (!multiY && mapping.y.length > 1) {
			mapping = { ...mapping, y: [mapping.y[0]] };
		}
		if (needsX && !mapping.x && axisFields.length > 0) {
			mapping = { ...mapping, x: axisFields[0].name };
		}
		if (needsSeries && !mapping.series && splitFields.length > 0) {
			mapping = { ...mapping, series: splitFields.find((f) => f.name !== mapping.x)?.name };
		}
	}

	function toggleY(name: string) {
		activeSuggestion = null;
		if (mapping.y.includes(name)) {
			mapping = { ...mapping, y: mapping.y.filter((y) => y !== name) };
		} else if (multiY) {
			if (mapping.y.length < MAX_SERIES) mapping = { ...mapping, y: [...mapping.y, name] };
		} else {
			mapping = { ...mapping, y: [name] };
		}
	}

	function loadSample() {
		jsonInput = JSON.stringify(
			{
				company: 'VinMi Analytics',
				metrics: { revenue: 128400, customers: 342, churn_rate: 2.4, nps: 61 },
				monthly_sales: [
					{ month: '2026-01', region: 'North', product: 'Basic', revenue: 12400, units: 310, satisfaction: 4.1 },
					{ month: '2026-01', region: 'South', product: 'Pro', revenue: 18100, units: 210, satisfaction: 4.4 },
					{ month: '2026-02', region: 'North', product: 'Basic', revenue: 13900, units: 342, satisfaction: 4.0 },
					{ month: '2026-02', region: 'South', product: 'Pro', revenue: 17400, units: 198, satisfaction: 4.5 },
					{ month: '2026-03', region: 'North', product: 'Pro', revenue: 15800, units: 388, satisfaction: 4.2 },
					{ month: '2026-03', region: 'South', product: 'Basic', revenue: 19600, units: 224, satisfaction: 4.6 },
					{ month: '2026-04', region: 'North', product: 'Basic', revenue: 14100, units: 351, satisfaction: 4.3 },
					{ month: '2026-04', region: 'South', product: 'Pro', revenue: 21500, units: 240, satisfaction: 4.5 },
					{ month: '2026-05', region: 'North', product: 'Pro', revenue: 16700, units: 402, satisfaction: 4.4 },
					{ month: '2026-05', region: 'South', product: 'Basic', revenue: 22800, units: 251, satisfaction: 4.7 },
					{ month: '2026-06', region: 'North', product: 'Basic', revenue: 18200, units: 430, satisfaction: 4.5 },
					{ month: '2026-06', region: 'South', product: 'Pro', revenue: 24100, units: 265, satisfaction: 4.8 }
				],
				expenses_by_team: { Engineering: 42000, Sales: 26500, Marketing: 18200, Support: 9800, Operations: 12400 }
			},
			null,
			2
		);
		analyze();
	}

	onMount(() => {
		const params = $page.url.searchParams;
		if (params.has('sample')) {
			loadSample();
			const dsName = params.get('ds');
			const di = datasets.findIndex((d) => d.label === dsName);
			if (di >= 0) selectDataset(di);
			const chart = params.get('chart');
			const s = chart ? suggestions.find((x) => x.type === chart) : null;
			if (s) applySuggestion(s);
		}
	});

	function clearAll() {
		jsonInput = '';
		error = null;
		datasets = [];
		suggestions = [];
		activeSuggestion = null;
	}
</script>

<svelte:head>
	<title>Visualize - VinMi JSON Tools</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<h1>JSON Visualizer</h1>
		<p>Paste JSON — intelligent chart suggestions from your data's shape, basic to advanced</p>
	</div>

	<div class="viz-layout">
		<!-- Left: JSON input -->
		<div class="input-panel card">
			<div class="panel-header">
				<h2>Input JSON</h2>
				<div class="header-actions">
					<button class="action-btn" onclick={loadSample}>Load Sample</button>
					<button class="action-btn" onclick={clearAll}>Clear</button>
				</div>
			</div>
			<textarea
				class="json-input"
				bind:value={jsonInput}
				placeholder="Paste any JSON — arrays of objects, nested data, key/value metrics…"
				spellcheck="false"
			></textarea>
			<div class="panel-footer">
				<button class="btn btn-primary" onclick={analyze}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 3v18h18" />
						<rect x="7" y="12" width="3" height="6" rx="1" />
						<rect x="12" y="8" width="3" height="10" rx="1" />
						<rect x="17" y="5" width="3" height="13" rx="1" />
					</svg>
					Analyze & Visualize
				</button>
			</div>
		</div>

		<!-- Right: intelligent builder -->
		<div class="viz-panel card">
			<div class="panel-header">
				<h2>Visualization</h2>
				{#if dataset}
					<div class="header-actions">
						<button class="action-btn" class:active={showMapping} onclick={() => (showMapping = !showMapping)}>
							Customize fields
						</button>
						<button class="action-btn" class:active={showTable} onclick={() => (showTable = !showTable)}>
							Data table
						</button>
					</div>
				{/if}
			</div>

			{#if error}
				<div class="error-banner">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<path d="M12 8v4M12 16h.01" />
					</svg>
					{error}
				</div>
			{/if}

			{#if dataset}
				<div class="builder">
					{#if datasets.length > 1}
						<div class="control-row">
							<span class="control-label">Dataset</span>
							<div class="chip-row">
								{#each datasets as ds, i}
									<button class="chip" class:selected={i === activeDs} onclick={() => selectDataset(i)}>
										{ds.label}
										<span class="chip-meta">{ds.rows.length} rows</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					{#if basicSugs.length > 0}
						<div class="control-row">
							<span class="control-label">Suggested · Basic</span>
							<div class="chip-row">
								{#each basicSugs as s}
									<button
										class="chip suggestion"
										class:selected={activeSuggestion === s.id}
										title={s.reason}
										onclick={() => applySuggestion(s)}
									>
										<span class="chip-type">{CHART_LABELS[s.type]}</span>
										{s.title}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					{#if advancedSugs.length > 0}
						<div class="control-row">
							<span class="control-label">Suggested · Advanced</span>
							<div class="chip-row">
								{#each advancedSugs as s}
									<button
										class="chip suggestion"
										class:selected={activeSuggestion === s.id}
										title={s.reason}
										onclick={() => applySuggestion(s)}
									>
										<span class="chip-type">{CHART_LABELS[s.type]}</span>
										{s.title}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					{#if showMapping}
						<div class="mapping card-inset">
							<div class="control-row">
								<span class="control-label">Chart type</span>
								<div class="chip-row">
									{#each Object.entries(CHART_LABELS) as [t, label]}
										{#if t !== 'table'}
											<button class="chip small" class:selected={chartType === t} onclick={() => setChartType(t as ChartType)}>
												{label}
											</button>
										{/if}
									{/each}
								</div>
							</div>

							{#if needsX}
								<div class="control-row">
									<label class="control-label" for="x-field">X / group</label>
									<select id="x-field" bind:value={mapping.x} onchange={() => (activeSuggestion = null)}>
										{#each axisFields as f}
											<option value={f.name}>{f.name} ({f.kind})</option>
										{/each}
									</select>
								</div>
							{/if}

							{#if chartType !== 'table'}
								<div class="control-row">
									<span class="control-label">{multiY ? 'Y values' : 'Y value'}</span>
									<div class="chip-row">
										{#each numericFields as f}
											<button class="chip small" class:selected={mapping.y.includes(f.name)} onclick={() => toggleY(f.name)}>
												{f.name}
											</button>
										{/each}
									</div>
								</div>
							{/if}

							{#if allowsSeries}
								<div class="control-row">
									<label class="control-label" for="series-field">{chartType === 'heatmap' ? 'Split (rows)' : 'Split by'}</label>
									<select id="series-field" bind:value={mapping.series} onchange={() => (activeSuggestion = null)}>
										{#if !needsSeries}<option value={undefined}>(none)</option>{/if}
										{#each splitFields as f}
											<option value={f.name}>{f.name} ({f.uniqueCount} values)</option>
										{/each}
									</select>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Chart -->
					<div class="chart-area">
						{#if prepared}
							{#if prepared.kind === 'error'}
								<div class="chart-hint">{prepared.message}</div>
							{:else if prepared.kind === 'bar'}
								<BarChart data={prepared.data} />
							{:else if prepared.kind === 'line'}
								<LineChart data={prepared.data} />
							{:else if prepared.kind === 'scatter'}
								<ScatterChart data={prepared.data} />
							{:else if prepared.kind === 'heatmap'}
								<HeatmapChart data={prepared.data} />
							{:else if prepared.kind === 'treemap'}
								<TreemapChart data={prepared.data} />
							{:else if prepared.kind === 'kpi'}
								<StatTiles data={prepared.data} />
							{:else if prepared.kind === 'table'}
								<DataTable {dataset} />
							{/if}
						{/if}
					</div>

					{#if showTable && chartType !== 'table'}
						<div class="table-section">
							<h3>Data · {dataset.path}</h3>
							<DataTable {dataset} />
						</div>
					{/if}
				</div>
			{:else if !error}
				<div class="empty-state">
					<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
						<path d="M3 3v18h18" />
						<rect x="7" y="12" width="3" height="6" rx="1" />
						<rect x="12" y="8" width="3" height="10" rx="1" />
						<rect x="17" y="5" width="3" height="13" rx="1" />
					</svg>
					<h3>No Data Analyzed</h3>
					<p>Enter JSON and click "Analyze & Visualize" — the builder detects datasets, classifies fields, and suggests the charts that fit</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.page-header {
		margin-bottom: 0.75rem;
	}

	.page-header h1 {
		font-size: 1.5rem;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		margin-bottom: 0.25rem;
	}

	.page-header p {
		color: var(--color-text-muted);
	}

	.viz-layout {
		display: grid;
		grid-template-columns: 340px 1fr;
		gap: 1rem;
		min-height: calc(100vh - 220px);
		align-items: stretch;
	}

	.input-panel,
	.viz-panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.panel-header h2 {
		font-size: 1rem;
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.action-btn {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-size: 0.75rem;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: var(--color-bg);
		color: var(--color-text);
	}

	.action-btn.active {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.json-input {
		flex: 1;
		min-height: 300px;
		background: var(--color-bg);
		border: none;
		color: var(--color-text);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		padding: 1rem;
		resize: none;
		outline: none;
		line-height: 1.5;
	}

	.json-input::placeholder {
		color: var(--color-text-muted);
	}

	.panel-footer {
		padding: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.panel-footer .btn {
		width: 100%;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-removed);
		border-bottom: 1px solid var(--color-removed-border);
		color: var(--color-error);
		font-size: 0.875rem;
	}

	.builder {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		overflow: auto;
	}

	.control-row {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.control-label {
		flex-shrink: 0;
		width: 110px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
		padding-top: 0.45rem;
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.chip {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		padding: 0.4rem 0.7rem;
		border-radius: 8px;
		font-size: 0.78rem;
		text-align: left;
		transition: all 0.15s ease;
		cursor: pointer;
	}

	.chip:hover {
		border-color: var(--color-primary);
	}

	.chip.selected {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, var(--color-bg));
	}

	.chip.small {
		padding: 0.3rem 0.6rem;
		font-size: 0.72rem;
	}

	.chip-type {
		display: block;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-primary);
		margin-bottom: 0.1rem;
	}

	.chip-meta {
		margin-left: 0.4rem;
		font-size: 0.68rem;
		color: var(--color-text-muted);
	}

	.mapping {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 10px;
	}

	.mapping select {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		border-radius: 6px;
		padding: 0.35rem 0.5rem;
		font-size: 0.8rem;
		max-width: 260px;
	}

	.chart-area {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 0.75rem;
		min-height: 300px;
	}

	.chart-hint {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 260px;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		text-align: center;
		padding: 1rem;
	}

	.table-section h3 {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin-bottom: 0.5rem;
		font-family: var(--font-mono);
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		text-align: center;
		padding: 2rem;
	}

	.empty-state svg {
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		font-size: 1.125rem;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.empty-state p {
		max-width: 34rem;
	}

	@media (max-width: 900px) {
		.viz-layout {
			grid-template-columns: 1fr;
		}

		.input-panel {
			min-height: 260px;
		}

		.control-row {
			flex-direction: column;
			gap: 0.35rem;
		}

		.control-label {
			width: auto;
			padding-top: 0;
		}
	}
</style>
