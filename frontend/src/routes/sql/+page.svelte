<script lang="ts">
	import { BrandBadge } from '$lib/components';
	import {
		SAMPLE_SQL,
		parseSqlInserts,
		tableToCsv,
		toRecords,
		toRecordsByTable,
		toTables,
		type SqlConvertOptions
	} from '$lib/utils/sqlInsert';

	/** JSON output shapes, in the order they appear in the picker. */
	type JsonShape = 'rows' | 'grouped' | 'statements';
	type View = 'json' | 'table';

	let sqlInput = $state('');
	let view = $state<View>('json');
	let jsonShape = $state<JsonShape>('rows');
	let indent = $state(2);

	// Value handling — the defaults match the parser's own defaults.
	let typedValues = $state(true);
	let nulls = $state<SqlConvertOptions['nulls']>('null');
	let keepExpressions = $state(true);
	let includeTable = $state(false);

	let copied = $state<string | null>(null);
	/** Index into `tables`; only meaningful in the table view. */
	let activeTable = $state(0);

	const parsed = $derived(parseSqlInserts(sqlInput));
	const options = $derived<SqlConvertOptions>({
		typedValues,
		nulls,
		keepExpressions,
		includeTable
	});

	const tables = $derived(toTables(parsed.statements, options));
	const errors = $derived(parsed.issues.filter((issue) => issue.severity === 'error'));
	const warnings = $derived(parsed.issues.filter((issue) => issue.severity === 'warning'));

	/**
	 * `_table` earns its keep only when the flat shape mixes several tables, so
	 * the grouped and per-statement shapes never ask for it.
	 */
	const jsonOutput = $derived.by(() => {
		if (!parsed.statements.length) return '';

		switch (jsonShape) {
			case 'grouped':
				return JSON.stringify(
					toRecordsByTable(parsed.statements, { ...options, includeTable: false }),
					null,
					indent
				);
			case 'statements':
				return JSON.stringify(
					parsed.statements.map((statement) => ({
						table: statement.table,
						columns: statement.columns,
						rows: toRecords([statement], { ...options, includeTable: false })
					})),
					null,
					indent
				);
			default:
				return JSON.stringify(toRecords(parsed.statements, options), null, indent);
		}
	});

	/** Keep the table tab in range as the input changes under it. */
	$effect(() => {
		if (activeTable >= tables.length) activeTable = 0;
	});

	/**
	 * A dump can hold tens of thousands of rows, and every rendered cell is a DOM
	 * node — so the table view grows on demand. Copy, CSV and JSON always use the
	 * full set.
	 */
	const ROW_CHUNK = 500;
	let rowLimit = $state(ROW_CHUNK);

	$effect(() => {
		void [sqlInput, activeTable];
		rowLimit = ROW_CHUNK;
	});

	const shown = $derived(tables[activeTable]);
	const visibleRows = $derived(shown ? shown.rows.slice(0, rowLimit) : []);
	const hiddenRows = $derived(shown ? shown.rows.length - visibleRows.length : 0);
	const columnCount = $derived(
		tables.reduce((total, table) => total + table.columns.length, 0)
	);

	async function copy(text: string, label: string) {
		if (!text) return;
		await navigator.clipboard.writeText(text);
		copied = label;
		setTimeout(() => (copied = null), 2000);
	}

	function download(text: string, filename: string, mime: string) {
		if (!text) return;
		const url = URL.createObjectURL(new Blob([text], { type: mime }));
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	/** A filesystem-safe stem from a table name like `public."my table"`. */
	function slug(name: string): string {
		return name.replace(/[^A-Za-z0-9._-]+/g, '_') || 'table';
	}

	function downloadJson() {
		const stem = parsed.tables.length === 1 ? slug(parsed.tables[0]) : 'sql-inserts';
		download(jsonOutput, `${stem}.json`, 'application/json');
	}

	function downloadCsv() {
		if (!shown) return;
		download(tableToCsv(shown), `${slug(shown.table)}.csv`, 'text/csv');
	}

	function loadSample() {
		sqlInput = SAMPLE_SQL;
	}

	function clearAll() {
		sqlInput = '';
		activeTable = 0;
	}

	/** Cells render as text; only the empty and null cases need a marker. */
	function cellText(value: unknown): string {
		if (value === undefined) return '';
		if (value === null) return 'NULL';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	function isMissing(value: unknown): boolean {
		return value === undefined || value === null;
	}
</script>

<svelte:head>
	<title>SQL INSERT to JSON - VinMi JSON Tools</title>
	<meta
		name="description"
		content="Convert single or multiple SQL INSERT statements into JSON or a table, entirely in your browser."
	/>
</svelte:head>

<div class="container">
	<div class="page-header">
		<BrandBadge />
		<div class="page-header-copy">
			<h1>SQL INSERT → JSON</h1>
			<p>Paste one INSERT or a whole dump — read it back as JSON or as a table</p>
		</div>
	</div>

	<div class="sql-layout">
		<section class="input-section card">
			<div class="section-header">
				<h2>SQL INSERT statements</h2>
				<div class="header-actions">
					<button class="action-btn" onclick={loadSample}>Load Sample</button>
					<button class="action-btn" onclick={clearAll}>Clear</button>
				</div>
			</div>

			<textarea
				class="sql-input"
				bind:value={sqlInput}
				spellcheck="false"
				placeholder={`INSERT INTO users (id, email) VALUES (1, 'ada@example.com');\n\nINSERT INTO users (id, email) VALUES\n  (2, 'grace@example.com'),\n  (3, 'alan@example.com');`}
			></textarea>

			<div class="stats" role="status">
				<span class="stat"><b>{parsed.statements.length}</b> statement{parsed.statements.length === 1 ? '' : 's'}</span>
				<span class="stat"><b>{parsed.rowCount}</b> row{parsed.rowCount === 1 ? '' : 's'}</span>
				<span class="stat"><b>{parsed.tables.length}</b> table{parsed.tables.length === 1 ? '' : 's'}</span>
				<span class="stat"><b>{columnCount}</b> column{columnCount === 1 ? '' : 's'}</span>
				{#if errors.length}
					<span class="stat stat-error"><b>{errors.length}</b> error{errors.length === 1 ? '' : 's'}</span>
				{/if}
				{#if warnings.length}
					<span class="stat stat-warn"><b>{warnings.length}</b> note{warnings.length === 1 ? '' : 's'}</span>
				{/if}
			</div>
		</section>

		<section class="options-section card">
			<div class="option-group">
				<h3>Output</h3>
				<div class="segmented" role="group" aria-label="Output view">
					<button class="segment" class:selected={view === 'json'} onclick={() => (view = 'json')}>
						JSON
					</button>
					<button class="segment" class:selected={view === 'table'} onclick={() => (view = 'table')}>
						Table
					</button>
				</div>

				{#if view === 'json'}
					<label class="field" for="shape">Shape</label>
					<select id="shape" bind:value={jsonShape}>
						<option value="rows">Flat array of rows</option>
						<option value="grouped">Grouped by table</option>
						<option value="statements">One entry per statement</option>
					</select>

					<label class="field" for="indent">Indent</label>
					<select id="indent" bind:value={indent}>
						<option value={2}>2 spaces</option>
						<option value={4}>4 spaces</option>
						<option value={0}>Minified</option>
					</select>
				{/if}
			</div>

			<div class="option-group">
				<h3>Values</h3>
				<label class="check">
					<input type="checkbox" bind:checked={typedValues} />
					<span>Typed values <em>(numbers & booleans, not strings)</em></span>
				</label>

				<label class="field" for="nulls">NULL / DEFAULT</label>
				<select id="nulls" bind:value={nulls}>
					<option value="null">JSON null</option>
					<option value="omit">Omit the key</option>
					<option value="string">Keep as "NULL"</option>
				</select>

				<label class="check">
					<input type="checkbox" bind:checked={keepExpressions} />
					<span>Keep expressions <em>(NOW(), CONCAT(…)) as SQL text</em></span>
				</label>

				{#if view === 'json' && jsonShape === 'rows'}
					<label class="check">
						<input type="checkbox" bind:checked={includeTable} />
						<span>Add <code>_table</code> to every row</span>
					</label>
				{/if}
			</div>
		</section>

		<section class="output-section card">
			<div class="section-header">
				<h2>{view === 'json' ? 'JSON' : 'Table'}</h2>
				<div class="header-actions">
					{#if view === 'json'}
						<button class="action-btn" disabled={!jsonOutput} onclick={() => copy(jsonOutput, 'json')}>
							{copied === 'json' ? '✓ Copied!' : 'Copy JSON'}
						</button>
						<button class="action-btn" disabled={!jsonOutput} onclick={downloadJson}>Download .json</button>
					{:else}
						<button
							class="action-btn"
							disabled={!shown}
							onclick={() => shown && copy(tableToCsv(shown), 'csv')}
						>
							{copied === 'csv' ? '✓ Copied!' : 'Copy CSV'}
						</button>
						<button class="action-btn" disabled={!shown} onclick={downloadCsv}>Download .csv</button>
					{/if}
				</div>
			</div>

			{#if parsed.issues.length}
				<ul class="issues" class:has-error={errors.length > 0}>
					{#each parsed.issues as issue}
						<li class:issue-error={issue.severity === 'error'}>
							<span class="issue-line">line {issue.line}</span>
							{issue.message}
						</li>
					{/each}
				</ul>
			{/if}

			{#if view === 'json'}
				<!-- Read-only textarea rather than a <pre>: the VS Code extension
				     reads `#tool-output` to send a result back to the editor. -->
				<textarea
					id="tool-output"
					class="json-output"
					readonly
					spellcheck="false"
					value={jsonOutput ||
						(sqlInput.trim()
							? 'No INSERT statements found — check the notes above.'
							: 'JSON will appear here…')}
				></textarea>
			{:else if !tables.length}
				<p class="empty">
					{sqlInput.trim()
						? 'No INSERT statements found — check the notes above.'
						: 'Paste INSERT statements to see them as a table.'}
				</p>
			{:else}
				{#if tables.length > 1}
					<div class="table-tabs" role="tablist" aria-label="Tables">
						{#each tables as table, index}
							<button
								class="table-tab"
								class:selected={index === activeTable}
								role="tab"
								aria-selected={index === activeTable}
								onclick={() => (activeTable = index)}
							>
								{table.table}
								<span class="tab-count">{table.rows.length}</span>
							</button>
						{/each}
					</div>
				{/if}

				{#if shown}
					<div class="grid-wrap">
						<table class="grid">
							<thead>
								<tr>
									<th class="row-number" scope="col">#</th>
									{#each shown.columns as column}
										<th scope="col">{column}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each visibleRows as row, index}
									<tr>
										<td class="row-number">{index + 1}</td>
										{#each shown.columns as column}
											<td class:missing={isMissing(row[column])}>{cellText(row[column])}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<div class="table-meta">
						<span>
							{#if hiddenRows}
								Showing {visibleRows.length.toLocaleString()} of
							{/if}
							{shown.rows.length.toLocaleString()} row{shown.rows.length === 1 ? '' : 's'} ·
							{shown.columns.length} column{shown.columns.length === 1 ? '' : 's'} ·
							<code>{shown.table}</code>
						</span>
						{#if hiddenRows}
							<span class="more-actions">
								<button class="action-btn" onclick={() => (rowLimit += ROW_CHUNK)}>
									Show {Math.min(ROW_CHUNK, hiddenRows).toLocaleString()} more
								</button>
								<button class="action-btn" onclick={() => (rowLimit = shown.rows.length)}>
									Show all
								</button>
							</span>
						{/if}
					</div>
				{/if}
			{/if}
		</section>
	</div>
</div>

<style>
	.page-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
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

	.sql-layout {
		display: grid;
		grid-template-columns: 1fr 240px 1.25fr;
		gap: 1rem;
		height: calc(100vh - 220px);
		min-height: 520px;
	}

	.input-section,
	.output-section,
	.options-section {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.section-header h2 {
		font-size: 1rem;
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-size: 0.75rem;
		white-space: nowrap;
		transition: all 0.15s ease;
	}

	.action-btn:hover:not(:disabled) {
		background: var(--color-bg);
		color: var(--color-text);
	}

	.action-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	/* ---- Input ----------------------------------------------------------- */
	.sql-input,
	.json-output {
		flex: 1;
		width: 100%;
		background: var(--color-bg);
		border: none;
		padding: 1rem;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		line-height: 1.55;
		color: var(--color-text);
		resize: none;
		outline: none;
		tab-size: 2;
	}

	.json-output {
		color: var(--color-text-muted);
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.85rem;
		padding: 0.6rem 1rem;
		border-top: 1px solid var(--color-border);
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.stat b {
		color: var(--color-text);
		font-weight: 700;
	}

	.stat-error b {
		color: var(--color-removed, #ef4444);
	}

	.stat-warn b {
		color: var(--color-modified, #f59e0b);
	}

	/* ---- Options --------------------------------------------------------- */
	.options-section {
		gap: 0;
		overflow-y: auto;
	}

	.option-group {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 1rem;
	}

	.option-group + .option-group {
		border-top: 1px solid var(--color-border);
	}

	.option-group h3 {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.segmented {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.25rem;
		padding: 0.25rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}

	.segment {
		padding: 0.45rem 0.5rem;
		border: none;
		border-radius: 5px;
		background: transparent;
		color: var(--color-text-muted);
		font-size: 0.8rem;
		font-weight: 600;
		transition: background var(--transition), color var(--transition);
	}

	.segment:hover {
		color: var(--color-text);
	}

	.segment.selected {
		background: var(--color-primary-soft);
		color: var(--color-primary);
	}

	.field {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.options-section select {
		width: 100%;
		padding: 0.4rem 0.5rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		font-size: 0.8rem;
	}

	.check {
		display: flex;
		align-items: flex-start;
		gap: 0.45rem;
		font-size: 0.78rem;
		line-height: 1.35;
		color: var(--color-text);
		cursor: pointer;
	}

	.check input {
		margin-top: 0.15rem;
		accent-color: var(--color-primary);
	}

	.check em {
		display: block;
		font-style: normal;
		font-size: 0.7rem;
		color: var(--color-text-subtle);
	}

	code {
		font-family: var(--font-mono);
		font-size: 0.9em;
	}

	/* ---- Issues ---------------------------------------------------------- */
	.issues {
		max-height: 6.5rem;
		overflow-y: auto;
		margin: 0;
		padding: 0.5rem 1rem;
		list-style: none;
		border-bottom: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--color-modified, #f59e0b) 10%, transparent);
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.issues.has-error {
		background: color-mix(in srgb, var(--color-removed, #ef4444) 10%, transparent);
	}

	.issues li {
		padding: 0.1rem 0;
	}

	.issues .issue-error {
		color: var(--color-removed, #ef4444);
		font-weight: 600;
	}

	.issue-line {
		display: inline-block;
		min-width: 4.5rem;
		font-family: var(--font-mono);
		color: var(--color-text-subtle);
	}

	/* ---- Table ----------------------------------------------------------- */
	.table-tabs {
		display: flex;
		gap: 0.25rem;
		overflow-x: auto;
		padding: 0.5rem 1rem 0;
	}

	.table-tab {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.7rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		white-space: nowrap;
	}

	.table-tab:hover {
		color: var(--color-text);
	}

	.table-tab.selected {
		background: var(--color-primary-soft);
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.tab-count {
		padding: 0 0.35rem;
		border-radius: var(--radius-full);
		background: var(--color-bg);
		font-size: 0.68rem;
	}

	.grid-wrap {
		flex: 1;
		overflow: auto;
		margin: 0.75rem 0 0;
	}

	.grid {
		border-collapse: collapse;
		width: max-content;
		min-width: 100%;
		font-size: 0.78rem;
	}

	.grid th,
	.grid td {
		padding: 0.4rem 0.7rem;
		border-bottom: 1px solid var(--color-border);
		border-right: 1px solid var(--color-border);
		text-align: left;
		max-width: 26rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.grid thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--color-surface-elevated, var(--color-surface));
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--color-primary);
	}

	.grid tbody tr:hover td {
		background: var(--color-surface-hover);
	}

	.grid td {
		font-family: var(--font-mono);
		color: var(--color-text);
	}

	.row-number {
		position: sticky;
		left: 0;
		background: var(--color-surface);
		color: var(--color-text-subtle) !important;
		text-align: right !important;
		font-size: 0.7rem;
	}

	.grid td.missing {
		color: var(--color-text-subtle);
		font-style: italic;
	}

	.table-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		padding: 0.6rem 1rem;
		border-top: 1px solid var(--color-border);
		font-size: 0.72rem;
		color: var(--color-text-muted);
	}

	.more-actions {
		display: flex;
		gap: 0.4rem;
	}

	.empty {
		flex: 1;
		display: grid;
		place-items: center;
		padding: 2rem;
		color: var(--color-text-subtle);
		font-size: 0.85rem;
		text-align: center;
	}

	/* ---- Responsive ------------------------------------------------------ */
	@media (max-width: 1200px) {
		.sql-layout {
			grid-template-columns: 1fr 220px;
			grid-template-rows: minmax(240px, 1fr) minmax(320px, 1fr);
			height: auto;
		}

		.output-section {
			grid-column: 1 / -1;
			min-height: 420px;
		}
	}

	@media (max-width: 760px) {
		.sql-layout {
			grid-template-columns: 1fr;
			grid-template-rows: none;
		}

		.input-section {
			min-height: 260px;
		}

		.options-section {
			overflow: visible;
		}
	}
</style>
