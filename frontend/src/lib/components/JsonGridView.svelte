<script lang="ts">
	import {
		buildGrid,
		getCell,
		formatCell,
		cellText,
		parseFilter,
		compareCells,
		toCsv,
		isContainer,
		KEY_COLUMN_ID,
		type GridColumn
	} from '$lib/utils/gridModel';

	/**
	 * Virtualized, filterable table for one JSON object/array. Global search
	 * matches anywhere in a row (nested values included); each column has its
	 * own filter (see parseFilter for the syntax). Nested cells drill in via
	 * onDrill with a path relative to `data`.
	 */
	interface Props {
		data: unknown;
		searchTerm?: string;
		name?: string;
		onDrill?: (path: string[]) => void;
	}

	let { data, searchTerm = '', name = 'data', onDrill }: Props = $props();

	const ROW_HEIGHT = 28;
	const BUFFER_ROWS = 15;
	const CHAR_WIDTH = 7.4;

	let flatten = $state(false);
	let showFilters = $state(true);
	let showColumnMenu = $state(false);
	let hidden = $state<Set<string>>(new Set());
	let filters = $state<Record<string, string>>({});
	let sort = $state<{ id: string; dir: 1 | -1 } | null>(null);

	const model = $derived(buildGrid(data, flatten));
	const visibleColumns = $derived(model.columns.filter((c) => !hidden.has(c.id)));
	const keyLabel = $derived(model.kind === 'array' ? '#' : 'key');

	// ---- Filtering & sorting -------------------------------------------------
	let applied = $state<{ term: string; filters: Record<string, string> }>({ term: '', filters: {} });
	$effect(() => {
		const next = { term: searchTerm.trim().toLowerCase(), filters: { ...filters } };
		const handle = setTimeout(() => (applied = next), 150);
		return () => clearTimeout(handle);
	});

	// Stringified rows for global search, built only once search is in use.
	const searchIndex = $derived(
		applied.term
			? model.rows.map((r) => `${r.key}\u0000${cellText(r.value)}`.toLowerCase())
			: null
	);

	const activeFilterCount = $derived(Object.values(filters).filter((v) => v.trim()).length);

	const filtered = $derived.by(() => {
		const m = model;
		const { term } = applied;
		const colById = new Map(m.columns.map((c) => [c.id, c]));
		const tests = Object.entries(applied.filters)
			.map(([id, raw]) => [id, parseFilter(raw)] as const)
			.filter(([id, fn]) => fn && (id === KEY_COLUMN_ID || colById.has(id)));

		const out: number[] = [];
		for (let i = 0; i < m.rows.length; i++) {
			if (searchIndex && !searchIndex[i].includes(term)) continue;
			const row = m.rows[i];
			let ok = true;
			for (const [id, fn] of tests) {
				const v = id === KEY_COLUMN_ID ? row.key : getCell(m, row, colById.get(id)!);
				if (!fn!(v)) {
					ok = false;
					break;
				}
			}
			if (ok) out.push(i);
		}

		if (sort) {
			const { id, dir } = sort;
			const col = colById.get(id);
			const keyOf = (i: number) =>
				id === KEY_COLUMN_ID
					? m.kind === 'array'
						? i
						: m.rows[i].key
					: col
						? getCell(m, m.rows[i], col)
						: undefined;
			const keys = new Map(out.map((i) => [i, keyOf(i)]));
			out.sort((a, b) => {
				const va = keys.get(a);
				const vb = keys.get(b);
				// Empty cells stay last in both directions
				const ea = va === undefined || va === null;
				const eb = vb === undefined || vb === null;
				if (ea || eb) return ea === eb ? a - b : ea ? 1 : -1;
				return compareCells(va, vb) * dir || a - b;
			});
		}
		return out;
	});

	function toggleSort(id: string) {
		if (!sort || sort.id !== id) sort = { id, dir: 1 };
		else if (sort.dir === 1) sort = { id, dir: -1 };
		else sort = null;
	}

	function clearFilters() {
		filters = {};
	}

	function toggleColumn(id: string) {
		const next = new Set(hidden);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		hidden = next;
	}

	// ---- Column widths (estimated from a sample of rows) ---------------------
	const widths = $derived.by(() => {
		const sample = model.rows.slice(0, 200);
		const w = new Map<string, number>();
		for (const c of model.columns) {
			let chars = c.label.length + 2;
			for (const r of sample) chars = Math.max(chars, formatCell(getCell(model, r, c)).length);
			w.set(c.id, Math.min(320, Math.max(72, chars * CHAR_WIDTH + 24)));
		}
		const keyChars = model.rows.reduce((n, r) => Math.max(n, r.key.length), keyLabel.length);
		w.set(KEY_COLUMN_ID, Math.min(220, Math.max(64, keyChars * CHAR_WIDTH + 30)));
		return w;
	});
	const tableWidth = $derived(
		visibleColumns.reduce((s, c) => s + widths.get(c.id)!, widths.get(KEY_COLUMN_ID)!)
	);

	// ---- Virtual scrolling ---------------------------------------------------
	let viewport: HTMLDivElement | undefined = $state();
	let scrollTop = $state(0);
	let viewportHeight = $state(0);

	const firstRow = $derived(Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS));
	const lastRow = $derived(
		Math.min(filtered.length, Math.ceil((scrollTop + (viewportHeight || 800)) / ROW_HEIGHT) + BUFFER_ROWS)
	);
	const visibleRows = $derived(filtered.slice(firstRow, lastRow));

	// Back to the top when the result set changes
	$effect(() => {
		void filtered;
		if (viewport) viewport.scrollTop = 0;
	});

	// ---- Export ----------------------------------------------------------------
	function download(content: string, filename: string, type: string) {
		const url = URL.createObjectURL(new Blob([content], { type }));
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function safeName() {
		return name.replace(/[^\w.-]+/g, '_') || 'data';
	}

	function exportCsv() {
		download(toCsv(model, filtered, visibleColumns), `${safeName()}.csv`, 'text/csv');
	}

	function filteredJson(): unknown {
		const rows = filtered.map((i) => model.rows[i]);
		return model.kind === 'array'
			? rows.map((r) => r.value)
			: Object.fromEntries(rows.map((r) => [r.key, r.value]));
	}

	let copied = $state(false);
	async function copyJson() {
		try {
			await navigator.clipboard.writeText(JSON.stringify(filteredJson(), null, 2));
			copied = true;
			setTimeout(() => (copied = false), 1200);
		} catch {
			// Clipboard not available
		}
	}

	let menuEl: HTMLDivElement | undefined = $state();
	function handleWindowClick(e: MouseEvent) {
		if (showColumnMenu && menuEl && !menuEl.contains(e.target as Node)) showColumnMenu = false;
	}

	function isHit(v: unknown, term: string): boolean {
		return !!term && v !== undefined && cellText(v).toLowerCase().includes(term);
	}

	function sortIndicator(id: string): string {
		return sort?.id === id ? (sort.dir === 1 ? '▲' : '▼') : '';
	}

	function kindOf(v: unknown): string {
		if (v === undefined) return 'empty';
		if (v === null) return 'null';
		if (Array.isArray(v)) return 'nested';
		return typeof v === 'object' ? 'nested' : typeof v;
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div class="grid-root">
	<div class="grid-toolbar">
		<span class="grid-count">
			<b>{filtered.length.toLocaleString()}</b>
			{#if filtered.length !== model.rows.length}of {model.rows.length.toLocaleString()}{/if}
			rows · <b>{visibleColumns.length}</b> columns
			{#if model.truncatedColumns}
				<span class="warn" title="Too many distinct keys to show them all">(+{model.truncatedColumns} hidden)</span>
			{/if}
		</span>
		<div class="grid-actions">
			<button class="tool-btn" class:on={showFilters} onclick={() => (showFilters = !showFilters)} title="Show column filters">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
				Filters{#if activeFilterCount}<span class="badge">{activeFilterCount}</span>{/if}
			</button>
			{#if activeFilterCount}
				<button class="tool-btn" onclick={clearFilters}>Clear filters</button>
			{/if}
			<button
				class="tool-btn"
				class:on={flatten}
				onclick={() => (flatten = !flatten)}
				disabled={!model.keyed}
				title="Spread nested objects into dotted columns (e.g. pricing.free)"
			>
				Flatten nested
			</button>
			<div class="menu-wrap" bind:this={menuEl}>
				<button class="tool-btn" class:on={showColumnMenu} onclick={() => (showColumnMenu = !showColumnMenu)}>
					Columns{#if hidden.size}<span class="badge">{hidden.size} hidden</span>{/if}
				</button>
				{#if showColumnMenu}
					<div class="column-menu" role="menu">
						<div class="menu-head">
							<button class="link-btn" onclick={() => (hidden = new Set())}>Show all</button>
							<button class="link-btn" onclick={() => (hidden = new Set(model.columns.map((c) => c.id)))}>Hide all</button>
						</div>
						{#each model.columns as c (c.id)}
							<label class="menu-item">
								<input type="checkbox" checked={!hidden.has(c.id)} onchange={() => toggleColumn(c.id)} />
								<span title={c.label}>{c.label}</span>
							</label>
						{/each}
					</div>
				{/if}
			</div>
			<button class="tool-btn" onclick={exportCsv} title="Download visible rows and columns as CSV">CSV</button>
			<button class="tool-btn" onclick={copyJson} title="Copy the filtered rows as JSON">{copied ? 'Copied' : 'Copy JSON'}</button>
		</div>
	</div>

	{#if model.rows.length === 0}
		<div class="grid-empty">Nothing to show — this {model.kind} is empty.</div>
	{:else}
		<div
			class="grid-viewport"
			bind:this={viewport}
			bind:clientHeight={viewportHeight}
			onscroll={(e) => (scrollTop = e.currentTarget.scrollTop)}
			style="--row-h: {ROW_HEIGHT}px"
		>
			<table style="width: {tableWidth}px">
				<colgroup>
					<col style="width: {widths.get(KEY_COLUMN_ID)}px" />
					{#each visibleColumns as c (c.id)}
						<col style="width: {widths.get(c.id)}px" />
					{/each}
				</colgroup>
				<thead>
					<tr class="head-row">
						<th class="key-col">
							<button class="head-btn" onclick={() => toggleSort(KEY_COLUMN_ID)}>
								<span>{keyLabel}</span><span class="sort">{sortIndicator(KEY_COLUMN_ID)}</span>
							</button>
						</th>
						{#each visibleColumns as c (c.id)}
							<th>
								<button class="head-btn" onclick={() => toggleSort(c.id)} title="{c.label} — click to sort">
									<span class="head-label">{c.label}</span><span class="sort">{sortIndicator(c.id)}</span>
								</button>
							</th>
						{/each}
					</tr>
					{#if showFilters}
						<tr class="filter-row">
							<th class="key-col">
								<input
									placeholder="filter"
									bind:value={filters[KEY_COLUMN_ID]}
									title="Text = contains · =x exact · !x excludes · >n, <n, >=n, <=n compare"
								/>
							</th>
							{#each visibleColumns as c (c.id)}
								<th>
									<input
										placeholder="filter"
										bind:value={filters[c.id]}
										title="Text = contains · =x exact · !x excludes · >n, <n, >=n, <=n compare"
									/>
								</th>
							{/each}
						</tr>
					{/if}
				</thead>
				<tbody>
					{#if firstRow > 0}
						<tr class="spacer" style="height: {firstRow * ROW_HEIGHT}px"><td colspan={visibleColumns.length + 1}></td></tr>
					{/if}
					{#each visibleRows as ri (ri)}
						{@const row = model.rows[ri]}
						<tr>
							<td class="key-col" class:hit={isHit(row.key, applied.term)}>
								{#if isContainer(row.value) && onDrill}
									<button class="drill key-drill" onclick={() => onDrill([row.key])} title="Open this row">{row.key}</button>
								{:else}
									{row.key}
								{/if}
							</td>
							{#each visibleColumns as c (c.id)}
								{@const v = getCell(model, row, c)}
								<td class={kindOf(v)} class:hit={isHit(v, applied.term)} title={typeof v === 'string' && v.length > 30 ? v : undefined}>
									{#if isContainer(v) && onDrill}
										<button class="drill" onclick={() => onDrill([row.key, ...c.path])} title="Open {c.label}">{formatCell(v)}</button>
									{:else}
										{formatCell(v)}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
					{#if lastRow < filtered.length}
						<tr class="spacer" style="height: {(filtered.length - lastRow) * ROW_HEIGHT}px"><td colspan={visibleColumns.length + 1}></td></tr>
					{/if}
				</tbody>
			</table>
			{#if filtered.length === 0}
				<div class="grid-empty">No rows match the current search/filters.</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.grid-root {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.grid-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.4rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	.grid-count {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.grid-count b {
		color: var(--color-primary);
		font-weight: 600;
	}

	.warn {
		color: var(--color-warning, #f59e0b);
	}

	.grid-actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.tool-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		padding: 0.25rem 0.6rem;
		border-radius: 6px;
		font-size: 0.72rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.tool-btn:hover:not(:disabled) {
		color: var(--color-text);
		background: var(--color-bg);
	}

	.tool-btn.on {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.tool-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.badge {
		background: var(--color-primary-soft);
		color: var(--color-primary);
		border-radius: 999px;
		padding: 0 0.4rem;
		font-size: 0.68rem;
	}

	.menu-wrap {
		position: relative;
	}

	.column-menu {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		z-index: 30;
		width: 240px;
		max-height: 320px;
		overflow: auto;
		padding: 0.375rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
	}

	.menu-head {
		display: flex;
		justify-content: space-between;
		padding: 0.125rem 0.25rem 0.375rem;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 0.25rem;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--color-primary);
		font-size: 0.72rem;
		cursor: pointer;
		padding: 0;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0.25rem;
		font-size: 0.75rem;
		font-family: var(--font-mono);
		color: var(--color-text);
		cursor: pointer;
		border-radius: 4px;
	}

	.menu-item:hover {
		background: var(--color-bg);
	}

	.menu-item span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.grid-viewport {
		flex: 1;
		min-height: 0;
		overflow: auto;
		position: relative;
	}

	table {
		table-layout: fixed;
		border-collapse: separate;
		border-spacing: 0;
		font-family: var(--font-mono);
		font-size: 0.78rem;
	}

	thead th {
		position: sticky;
		z-index: 2;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		border-right: 1px solid var(--color-border);
		padding: 0;
		text-align: left;
		font-weight: 600;
	}

	.head-row th {
		top: 0;
		height: 30px;
	}

	.filter-row th {
		top: 30px;
		padding: 3px 4px;
	}

	.head-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.25rem;
		width: 100%;
		height: 100%;
		padding: 0 0.5rem;
		background: none;
		border: none;
		color: var(--color-secondary);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		text-align: left;
	}

	.head-btn:hover {
		color: var(--color-primary);
	}

	.head-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sort {
		font-size: 0.6rem;
		color: var(--color-primary);
		flex-shrink: 0;
	}

	.filter-row input {
		width: 100%;
		box-sizing: border-box;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text);
		font: inherit;
		font-weight: 400;
		font-size: 0.72rem;
		padding: 2px 5px;
		outline: none;
	}

	.filter-row input:focus {
		border-color: var(--color-primary);
	}

	.filter-row input::placeholder {
		color: var(--color-text-muted);
		opacity: 0.6;
	}

	th.key-col {
		left: 0;
		z-index: 3;
	}

	td {
		height: var(--row-h);
		padding: 0 0.5rem;
		border-bottom: 1px solid var(--color-border);
		border-right: 1px solid var(--color-border);
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	td.key-col {
		position: sticky;
		left: 0;
		z-index: 1;
		background: var(--color-surface);
		color: var(--color-text-muted);
	}

	tbody tr:not(.spacer):hover td {
		background: color-mix(in srgb, var(--color-primary) 8%, var(--color-bg));
	}

	tr.spacer td {
		padding: 0;
		border: none;
	}

	td.string {
		color: var(--color-success);
	}

	td.number {
		color: #f59e0b;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	td.boolean {
		color: var(--color-primary);
	}

	td.null {
		color: var(--color-error);
		font-style: italic;
	}

	td.hit {
		background: var(--color-primary-soft) !important;
		box-shadow: inset 0 -2px 0 var(--color-primary);
	}

	.drill {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: var(--color-text-muted);
		font-style: italic;
		cursor: pointer;
		text-decoration: underline dotted;
		text-underline-offset: 3px;
	}

	.drill:hover {
		color: var(--color-primary);
	}

	.key-drill {
		font-style: normal;
	}

	.grid-empty {
		padding: 2rem;
		text-align: center;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
</style>
