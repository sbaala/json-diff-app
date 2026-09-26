<script lang="ts">
	import { tick, untrack } from 'svelte';

	/**
	 * Virtualized JSON tree for large documents. The data is flattened once into
	 * a pre-order node table; only the rows in the viewport are rendered, so
	 * multi-MB files stay responsive even fully expanded. Search matches can be
	 * stepped through with next()/prev(), which expand the match's ancestors
	 * and scroll it into view.
	 */
	interface Props {
		data: unknown;
		searchTerm?: string;
		expandAll?: boolean;
		matchCount?: number;
		currentMatch?: number;
		/** Shows an "Inspect" action on non-empty objects/arrays; path is from `data`. */
		onInspect?: (path: string[]) => void;
		/** Makes non-empty object/array rows clickable; path is from `data`. */
		onSelect?: (path: string[]) => void;
		/** Highlighted row; its ancestors are expanded and it is scrolled into view. */
		selectedPath?: string[] | null;
	}

	let {
		data,
		searchTerm = '',
		expandAll = false,
		matchCount = $bindable(0),
		currentMatch = $bindable(0),
		onInspect,
		onSelect,
		selectedPath = null
	}: Props = $props();

	const ROW_HEIGHT = 24;
	const INDENT = 18;
	const BUFFER_ROWS = 20;
	const DEFAULT_OPEN_DEPTH = 2;

	type NodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

	interface FlatTree {
		keys: (string | null)[];
		values: unknown[];
		types: NodeType[];
		depth: Int32Array;
		parent: Int32Array;
		end: Int32Array; // index one past the node's last descendant
		count: Int32Array; // child count for containers
		size: number;
	}

	function typeOf(value: unknown): NodeType {
		if (value === null) return 'null';
		if (Array.isArray(value)) return 'array';
		const t = typeof value;
		if (t === 'object') return 'object';
		if (t === 'string' || t === 'number' || t === 'boolean') return t;
		return 'null';
	}

	function flatten(root: unknown): FlatTree {
		const keys: (string | null)[] = [];
		const values: unknown[] = [];
		const types: NodeType[] = [];
		const depthArr: number[] = [];
		const parentArr: number[] = [];
		const countArr: number[] = [];

		// Iterative DFS so deeply nested input can't blow the call stack.
		const stack: { value: unknown; key: string | null; depth: number; parent: number }[] = [
			{ value: root, key: null, depth: 0, parent: -1 }
		];
		while (stack.length) {
			const { value, key, depth, parent } = stack.pop()!;
			const idx = keys.length;
			const type = typeOf(value);
			keys.push(key);
			types.push(type);
			values.push(type === 'object' || type === 'array' ? null : value);
			depthArr.push(depth);
			parentArr.push(parent);
			if (type === 'array') {
				const arr = value as unknown[];
				countArr.push(arr.length);
				for (let i = arr.length - 1; i >= 0; i--) {
					stack.push({ value: arr[i], key: String(i), depth: depth + 1, parent: idx });
				}
			} else if (type === 'object') {
				const entries = Object.entries(value as Record<string, unknown>);
				countArr.push(entries.length);
				for (let i = entries.length - 1; i >= 0; i--) {
					stack.push({ value: entries[i][1], key: entries[i][0], depth: depth + 1, parent: idx });
				}
			} else {
				countArr.push(0);
			}
		}

		const size = keys.length;
		const end = new Int32Array(size);
		// In pre-order a node's subtree ends where the next node at depth <= its own begins.
		for (let i = size - 1; i >= 0; i--) {
			end[i] = i + 1;
			const n = countArr[i];
			if (n > 0) {
				let j = i + 1;
				for (let c = 0; c < n; c++) j = end[j];
				end[i] = j;
			}
		}

		return {
			keys,
			values,
			types,
			depth: Int32Array.from(depthArr),
			parent: Int32Array.from(parentArr),
			end,
			count: Int32Array.from(countArr),
			size
		};
	}

	const tree = $derived(flatten(data));

	// Expansion state lives in a typed array; `version` is bumped to recompute rows.
	let expanded = $state.raw(new Uint8Array(0));
	let version = $state(0);

	$effect.pre(() => {
		const t = tree;
		const open = new Uint8Array(t.size);
		if (expandAll) open.fill(1);
		else for (let i = 0; i < t.size; i++) if (t.depth[i] < DEFAULT_OPEN_DEPTH) open[i] = 1;
		expanded = open;
		untrack(() => version++);
	});

	/** Visible rows: a node index for an opening/leaf row, ~index for a closing bracket row. */
	const rows = $derived.by(() => {
		void version;
		const t = tree;
		const open = expanded;
		const out: number[] = [];
		const stack: number[] = [];
		let i = 0;
		while (i < t.size) {
			while (stack.length && t.end[stack[stack.length - 1]] <= i) out.push(~stack.pop()!);
			out.push(i);
			if (t.count[i] > 0 && open[i]) {
				stack.push(i);
				i++;
			} else {
				i = t.end[i];
			}
		}
		while (stack.length) out.push(~stack.pop()!);
		return out;
	});

	// ---- Search ------------------------------------------------------------
	let debouncedTerm = $state('');
	$effect(() => {
		const term = searchTerm;
		const handle = setTimeout(() => (debouncedTerm = term.trim().toLowerCase()), 150);
		return () => clearTimeout(handle);
	});

	const matches = $derived.by(() => {
		const q = debouncedTerm;
		const t = tree;
		const out: number[] = [];
		if (!q) return out;
		for (let i = 0; i < t.size; i++) {
			const k = t.keys[i];
			if (k !== null && k.toLowerCase().includes(q)) {
				out.push(i);
				continue;
			}
			const type = t.types[i];
			if (type === 'string' || type === 'number' || type === 'boolean' || type === 'null') {
				if (String(t.values[i]).toLowerCase().includes(q)) out.push(i);
			}
		}
		return out;
	});

	const matchSet = $derived(new Set(matches));
	let activeIndex = $state(-1);
	const activeNode = $derived(activeIndex >= 0 ? matches[activeIndex] : -1);

	$effect(() => {
		matchCount = matches.length;
		currentMatch = activeIndex + 1;
	});

	// Jump to the first match whenever the result set changes.
	$effect(() => {
		const m = matches;
		untrack(() => {
			activeIndex = -1;
			if (m.length) goTo(0);
		});
	});

	export function next() {
		if (matches.length) goTo((activeIndex + 1) % matches.length);
	}

	export function prev() {
		if (matches.length) goTo((activeIndex - 1 + matches.length) % matches.length);
	}

	function goTo(index: number) {
		activeIndex = index;
		const node = matches[index];
		const t = tree;
		let changed = false;
		for (let p = t.parent[node]; p >= 0; p = t.parent[p]) {
			if (!expanded[p]) {
				expanded[p] = 1;
				changed = true;
			}
		}
		if (changed) version++;
		tick().then(() => scrollToNode(node));
	}

	// ---- Virtual scrolling ---------------------------------------------------
	let viewport: HTMLDivElement | undefined = $state();
	let scrollTop = $state(0);
	let viewportHeight = $state(0);

	const firstRow = $derived(Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS));
	const lastRow = $derived(
		Math.min(rows.length, Math.ceil((scrollTop + (viewportHeight || 800)) / ROW_HEIGHT) + BUFFER_ROWS)
	);
	const visibleRows = $derived(rows.slice(firstRow, lastRow));

	function scrollToNode(node: number) {
		if (!viewport) return;
		const rowIdx = rows.indexOf(node);
		if (rowIdx < 0) return;
		const top = rowIdx * ROW_HEIGHT;
		const h = viewport.clientHeight;
		if (top < viewport.scrollTop || top + ROW_HEIGHT > viewport.scrollTop + h) {
			viewport.scrollTop = Math.max(0, top - h / 2 + ROW_HEIGHT / 2);
		}
	}

	function toggle(i: number) {
		expanded[i] = expanded[i] ? 0 : 1;
		version++;
	}

	// ---- Selection ------------------------------------------------------------
	function nodeAt(path: string[]): number {
		const t = tree;
		let n = 0;
		for (const seg of path) {
			let c = n + 1;
			while (c < t.end[n] && t.keys[c] !== seg) c = t.end[c];
			if (c >= t.end[n]) return -1;
			n = c;
		}
		return n;
	}

	const selectedNode = $derived(selectedPath ? nodeAt(selectedPath) : -1);

	$effect(() => {
		const node = selectedNode;
		if (node < 0) return;
		untrack(() => {
			const t = tree;
			let changed = false;
			for (let p = t.parent[node]; p >= 0; p = t.parent[p]) {
				if (!expanded[p]) {
					expanded[p] = 1;
					changed = true;
				}
			}
			if (changed) version++;
			tick().then(() => scrollToNode(node));
		});
	});

	function selectRow(e: MouseEvent, i: number) {
		if ((e.target as Element).closest('button')) return;
		onSelect?.(pathSegments(i));
	}

	// ---- Row helpers ----------------------------------------------------------
	function isIndexKey(i: number): boolean {
		const p = tree.parent[i];
		return p >= 0 && tree.types[p] === 'array';
	}

	function pathOf(i: number): string {
		const parts: string[] = [];
		for (let n = i; n > 0; n = tree.parent[n]) {
			const k = tree.keys[n]!;
			parts.push(isIndexKey(n) ? `[${k}]` : /^[A-Za-z_$][\w$]*$/.test(k) ? `.${k}` : `["${k}"]`);
		}
		return 'root' + parts.reverse().join('');
	}

	function pathSegments(i: number): string[] {
		const parts: string[] = [];
		for (let n = i; n > 0; n = tree.parent[n]) parts.push(tree.keys[n]!);
		return parts.reverse();
	}

	function formatValue(i: number): string {
		const v = tree.values[i];
		return tree.types[i] === 'string' ? JSON.stringify(v) : String(v);
	}

	function subtreeValue(i: number): unknown {
		const t = tree;
		if (t.types[i] !== 'object' && t.types[i] !== 'array') return t.values[i];
		// Rebuild from the node table so we don't need to keep a path into `data`.
		const isArr = t.types[i] === 'array';
		const out: Record<string, unknown> | unknown[] = isArr ? [] : {};
		for (let c = i + 1; c < t.end[i]; c = t.end[c]) {
			const v = subtreeValue(c);
			if (isArr) (out as unknown[]).push(v);
			else (out as Record<string, unknown>)[t.keys[c]!] = v;
		}
		return out;
	}

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			// Clipboard not available
		}
	}

	function copyValue(i: number) {
		const v = subtreeValue(i);
		copy(typeof v === 'object' && v !== null ? JSON.stringify(v, null, 2) : String(v));
	}
</script>

<div
	class="tree-viewport"
	bind:this={viewport}
	bind:clientHeight={viewportHeight}
	onscroll={(e) => (scrollTop = e.currentTarget.scrollTop)}
	style="--row-h: {ROW_HEIGHT}px"
>
	<div class="tree-spacer" style="height: {rows.length * ROW_HEIGHT}px">
		<div class="tree-rows" style="transform: translateY({firstRow * ROW_HEIGHT}px)">
			{#each visibleRows as row (row)}
				{#if row < 0}
					{@const i = ~row}
					<div class="node-row" style="padding-left: {tree.depth[i] * INDENT + 8}px">
						<span class="toggle-spacer"></span>
						<span class="bracket">{tree.types[i] === 'array' ? ']' : '}'}</span>
					</div>
				{:else}
					{@const i = row}
					{@const type = tree.types[i]}
					{@const container = type === 'object' || type === 'array'}
					{@const selectable = !!onSelect && container && tree.count[i] > 0}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
					<div
						class="node-row"
						class:match={matchSet.has(i)}
						class:active={i === activeNode}
						class:selectable
						class:selected={i === selectedNode}
						style="padding-left: {tree.depth[i] * INDENT + 8}px"
						onclick={selectable ? (e) => selectRow(e, i) : undefined}
					>
						{#if container && tree.count[i] > 0}
							<button class="toggle-btn" onclick={() => toggle(i)} aria-expanded={!!expanded[i]} aria-label="Toggle">
								<svg class="toggle-icon" class:expanded={!!expanded[i]} width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
									<path d="M9 18l6-6-6-6" />
								</svg>
							</button>
						{:else}
							<span class="toggle-spacer"></span>
						{/if}

						<span class="node-content">
							{#if tree.keys[i] !== null}
								<span class="key" class:index={isIndexKey(i)}>{tree.keys[i]}</span>
								<span class="colon">:</span>
							{/if}
							{#if container}
								{@const open = tree.count[i] > 0 && expanded[i]}
								<span class="bracket">{type === 'array' ? '[' : '{'}</span>
								{#if !open}
									<span class="collapsed-preview">
										{tree.count[i]} {type === 'array' ? 'items' : 'keys'}
									</span>
									<span class="bracket">{type === 'array' ? ']' : '}'}</span>
								{/if}
							{:else}
								<span class="value {type}" title={type === 'string' ? String(tree.values[i]) : undefined}>{formatValue(i)}</span>
							{/if}
						</span>

						<span class="node-actions">
							{#if onInspect && container && tree.count[i] > 0}
								<button class="action-icon inspect" onclick={() => onInspect(pathSegments(i))} title="Inspect as grid (search, filter, sort)">
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="3" y="3" width="18" height="18" rx="2" />
										<path d="M3 9h18M3 15h18M9 3v18" />
									</svg>
								</button>
							{/if}
							<button class="action-icon" onclick={() => copy(pathOf(i))} title="Copy path">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
									<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
								</svg>
							</button>
							<button class="action-icon" onclick={() => copyValue(i)} title="Copy value">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
								</svg>
							</button>
						</span>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>

<style>
	.tree-viewport {
		height: 100%;
		overflow: auto;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}

	.tree-spacer {
		position: relative;
	}

	.tree-rows {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		will-change: transform;
	}

	.node-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		height: var(--row-h);
		padding-right: 0.5rem;
		white-space: nowrap;
		border-radius: 4px;
	}

	.node-row:hover {
		background: var(--color-surface);
	}

	.node-row:hover .node-actions {
		opacity: 1;
	}

	.node-row.match {
		background: var(--color-primary-soft);
	}

	.node-row.selectable {
		cursor: pointer;
	}

	.node-row.selected {
		background: color-mix(in srgb, var(--color-secondary) 22%, transparent);
		box-shadow: inset 3px 0 0 var(--color-secondary);
	}

	.node-row.active {
		background: color-mix(in srgb, var(--color-primary) 32%, transparent);
		box-shadow: inset 3px 0 0 var(--color-primary);
	}

	.toggle-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
	}

	.toggle-btn:hover {
		color: var(--color-primary);
	}

	.toggle-icon {
		transition: transform 0.12s ease;
	}

	.toggle-icon.expanded {
		transform: rotate(90deg);
	}

	.toggle-spacer {
		width: 16px;
		flex-shrink: 0;
	}

	.node-content {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.key {
		color: var(--color-secondary);
		font-weight: 500;
		flex-shrink: 0;
	}

	.key.index {
		color: var(--color-text-muted);
	}

	.colon,
	.bracket {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.collapsed-preview {
		color: var(--color-text-muted);
		font-style: italic;
		font-size: 0.75rem;
		padding: 0 0.25rem;
		flex-shrink: 0;
	}

	.value {
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.value.string {
		color: var(--color-success);
	}

	.value.number {
		color: #f59e0b;
	}

	.value.boolean {
		color: var(--color-primary);
	}

	.value.null {
		color: var(--color-error);
		font-style: italic;
	}

	.node-actions {
		display: flex;
		gap: 0.25rem;
		opacity: 0;
		flex-shrink: 0;
		transition: opacity 0.12s ease;
	}

	.action-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0;
	}

	.action-icon:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
</style>
