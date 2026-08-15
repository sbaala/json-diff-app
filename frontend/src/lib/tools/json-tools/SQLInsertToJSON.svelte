<script lang="ts">
	/**
	 * One-shot `INSERT` → JSON/CSV conversion for the tools catalog.
	 *
	 * The `/sql` page is the richer surface — it renders a real grid and reports
	 * per-line issues. Both share `$lib/utils/sqlInsert`, so they can never
	 * disagree about what a statement means.
	 */
	import { ToolContainer } from '$lib/components/tools';
	import type { ToolMetadata } from '$lib/types';
	import {
		SAMPLE_SQL,
		parseSqlInserts,
		tableToCsv,
		toRecords,
		toRecordsByTable,
		toTables
	} from '$lib/utils/sqlInsert';

	const tool: ToolMetadata = {
		id: 'sql-insert-to-json',
		name: 'SQL INSERT → JSON',
		description: 'Convert single or multiple SQL INSERT statements into JSON or CSV',
		category: 'json-api',
		icon: 'database',
		keywords: ['sql', 'insert', 'values', 'table', 'csv']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let shape = $state<'rows' | 'grouped' | 'csv'>('rows');
	/** Advisory parse issues. Kept out of `error` so the result stays copyable. */
	let notes = $state<string[]>([]);

	function transform() {
		notes = [];
		if (!input.trim()) {
			output = '';
			error = null;
			return;
		}

		const parsed = parseSqlInserts(input);
		if (!parsed.statements.length) {
			output = '';
			const reason = parsed.issues.find((issue) => issue.severity === 'error') ?? parsed.issues[0];
			error = reason
				? `line ${reason.line}: ${reason.message}`
				: 'No INSERT statements found.';
			return;
		}

		if (shape === 'csv') {
			// One CSV block per table, labelled when there is more than one.
			const tables = toTables(parsed.statements);
			output = tables
				.map((table) => (tables.length > 1 ? `-- ${table.table}\n` : '') + tableToCsv(table))
				.join('\n\n');
		} else if (shape === 'grouped') {
			output = JSON.stringify(toRecordsByTable(parsed.statements), null, 2);
		} else {
			const multiTable = parsed.tables.length > 1;
			output = JSON.stringify(toRecords(parsed.statements, { includeTable: multiTable }), null, 2);
		}

		// Statements parsed, so anything left is advisory rather than fatal.
		error = null;
		notes = parsed.issues.map((issue) => `line ${issue.line}: ${issue.message}`);
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}

	function handleSample() {
		input = SAMPLE_SQL;
	}

	$effect(() => {
		void [input, shape];
		transform();
	});
</script>

<div class="tool-wrapper">
	<ToolContainer {tool} bind:input bind:output bind:error onClear={handleClear} onSample={handleSample} />
	<div class="tool-controls">
		<label for="sql-shape">Output:</label>
		<select id="sql-shape" bind:value={shape}>
			<option value="rows">JSON — flat array of rows</option>
			<option value="grouped">JSON — grouped by table</option>
			<option value="csv">CSV — one block per table</option>
		</select>
		{#if notes.length}
			<details class="notes">
				<summary>{notes.length} note{notes.length === 1 ? '' : 's'}</summary>
				<ul>
					{#each notes as note}
						<li>{note}</li>
					{/each}
				</ul>
			</details>
		{/if}
	</div>
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
	}
	.tool-controls {
		display: flex;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-top: 1px solid var(--color-border);
		align-items: center;
		flex-wrap: wrap;
	}
	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}
	select {
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}
	select:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.notes {
		margin-left: auto;
		font-size: 0.78rem;
		color: var(--color-text-muted);
		max-width: 100%;
	}
	.notes summary {
		cursor: pointer;
		color: var(--color-modified, #f59e0b);
	}
	.notes ul {
		margin: 0.4rem 0 0;
		padding-left: 1.1rem;
		max-height: 6rem;
		overflow-y: auto;
	}
</style>
