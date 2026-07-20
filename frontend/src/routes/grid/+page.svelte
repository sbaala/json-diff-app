<script lang="ts">
	import { tick } from 'svelte';

	// Tab interface
	interface TabState {
		id: number;
		name: string;
		jsonInput: string;
		parsedData: unknown;
		error: string | null;
		globalSearch: string;
		expandedPaths: Set<string>;
		currentPath: string[];
		showInput: boolean;
		columnFilters: Record<string, string>;
		hiddenColumns: Set<string>;
		showColumnMenu: boolean;
		showFilterRow: boolean;
		flattenEnabled: boolean;
		flattenableKeys: string[];
	}

	// Tab management
	let tabIdCounter = $state(1);
	let tabs = $state<TabState[]>([createNewTabState(1)]);
	let activeTabId = $state(1);

	function createNewTabState(id: number): TabState {
		return {
			id,
			name: `Tab ${id}`,
			jsonInput: '',
			parsedData: null,
			error: null,
			globalSearch: '',
			expandedPaths: new Set(),
			currentPath: [],
			showInput: true,
			columnFilters: {},
			hiddenColumns: new Set(),
			showColumnMenu: false,
			showFilterRow: true,
			flattenEnabled: false,
			flattenableKeys: []
		};
	}

	// Active tab derived state
	let activeTab = $derived(tabs.find(t => t.id === activeTabId)!);

	// Proxy state getters/setters for active tab
	let jsonInput = $derived(activeTab.jsonInput);
	let parsedData = $derived(activeTab.parsedData);
	let error = $derived(activeTab.error);
	let globalSearch = $derived(activeTab.globalSearch);
	let expandedPaths = $derived(activeTab.expandedPaths);
	let currentPath = $derived(activeTab.currentPath);
	let showInput = $derived(activeTab.showInput);
	let columnFilters = $derived(activeTab.columnFilters);
	let hiddenColumns = $derived(activeTab.hiddenColumns);
	let showColumnMenu = $derived(activeTab.showColumnMenu);
	let showFilterRow = $derived(activeTab.showFilterRow);
	let flattenEnabled = $derived(activeTab.flattenEnabled);
	let flattenableKeys = $derived(activeTab.flattenableKeys);

	// Tab operations
	function addTab() {
		tabIdCounter++;
		const newTab = createNewTabState(tabIdCounter);
		tabs = [...tabs, newTab];
		activeTabId = newTab.id;
	}

	function closeTab(id: number) {
		if (tabs.length === 1) return; // Don't close last tab
		const idx = tabs.findIndex(t => t.id === id);
		tabs = tabs.filter(t => t.id !== id);
		if (activeTabId === id) {
			// Switch to adjacent tab
			activeTabId = tabs[Math.min(idx, tabs.length - 1)].id;
		}
	}

	function switchTab(id: number) {
		activeTabId = id;
	}

	function renameTab(id: number) {
		const tab = tabs.find(t => t.id === id);
		if (!tab) return;
		const newName = prompt('Tab name:', tab.name);
		if (newName && newName.trim()) {
			tab.name = newName.trim();
			tabs = [...tabs]; // trigger reactivity
		}
	}

	// Derived - current data at path
	let currentData = $derived.by(() => {
		if (!activeTab.parsedData) return null;
		let data: unknown = activeTab.parsedData;
		for (const key of activeTab.currentPath) {
			if (data && typeof data === 'object') {
				data = (data as Record<string, unknown>)[key];
			}
		}
		return data;
	});

	// Check if data is an array of objects (tabular)
	function isTabularArray(data: unknown): data is Record<string, unknown>[] {
		if (!Array.isArray(data) || data.length === 0) return false;
		return data.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));
	}

	// Detect keys where most rows have a plain object (not array) — candidates for flattening
	function detectFlattenableKeys(data: Record<string, unknown>[]): string[] {
		if (data.length === 0) return [];
		const allKeys = new Set<string>();
		data.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));

		const result: string[] = [];
		for (const key of allKeys) {
			// A key is flattenable if >=80% of rows have a non-null, non-array object there
			let objCount = 0;
			for (const row of data) {
				const val = row[key];
				if (val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
					objCount++;
				}
			}
			if (objCount >= data.length * 0.8) {
				result.push(key);
			}
		}
		return result;
	}

	// Flatten data: promote nested object keys to top level with dot-notation
	function flattenData(data: Record<string, unknown>[], keysToFlatten: string[]): Record<string, unknown>[] {
		if (keysToFlatten.length === 0) return data;
		const flatKeySet = new Set(keysToFlatten);
		return data.map(row => {
			const flat: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(row)) {
				if (flatKeySet.has(key) && value && typeof value === 'object' && !Array.isArray(value)) {
					// Spread nested object keys with prefix
					for (const [nestedKey, nestedVal] of Object.entries(value as Record<string, unknown>)) {
						flat[`${key}.${nestedKey}`] = nestedVal;
					}
				} else {
					flat[key] = value;
				}
			}
			return flat;
		});
	}

	// Get the effective data for grid display (respects flatten toggle)
	function getEffectiveData(data: Record<string, unknown>[]): Record<string, unknown>[] {
		if (activeTab.flattenEnabled && activeTab.flattenableKeys.length > 0) {
			return flattenData(data, activeTab.flattenableKeys);
		}
		return data;
	}

	// Get all unique keys from array of objects
	function getTableColumns(data: Record<string, unknown>[]): string[] {
		const keys = new Set<string>();
		data.forEach(item => Object.keys(item).forEach(k => keys.add(k)));
		return Array.from(keys);
	}

	// Get visible columns
	function getVisibleColumns(allColumns: string[]): string[] {
		return allColumns.filter(col => !activeTab.hiddenColumns.has(col));
	}

	// Filter rows based on global search and column filters
	function filterRows(data: Record<string, unknown>[]): Record<string, unknown>[] {
		let filtered = data;

		// Apply global search
		if (activeTab.globalSearch.trim()) {
			const lowerTerm = activeTab.globalSearch.toLowerCase();
			filtered = filtered.filter(row => {
				return Object.values(row).some(val => {
					const str = formatCellValue(val);
					return str.toLowerCase().includes(lowerTerm);
				});
			});
		}

		// Apply column filters
		for (const [col, filterVal] of Object.entries(activeTab.columnFilters)) {
			if (!filterVal.trim()) continue;
			const lowerFilter = filterVal.toLowerCase();
			filtered = filtered.filter(row => {
				const cellVal = formatCellValue(row[col]);
				return cellVal.toLowerCase().includes(lowerFilter);
			});
		}

		return filtered;
	}

	// Format cell value for display
	function formatCellValue(value: unknown): string {
		if (value === null) return 'null';
		if (value === undefined) return '';
		if (typeof value === 'object') {
			if (Array.isArray(value)) return `[${value.length} items]`;
			return `{${Object.keys(value).length} keys}`;
		}
		return String(value);
	}

	// Check if value is expandable
	function isExpandable(value: unknown): boolean {
		return typeof value === 'object' && value !== null;
	}

	// Get value type for styling
	function getValueType(value: unknown): string {
		if (value === null) return 'null';
		if (Array.isArray(value)) return 'array';
		if (typeof value === 'object') return 'object';
		return typeof value;
	}

	// File input reference
	let fileInput = $state<HTMLInputElement | null>(null);

	// Parse a CSV string into an array of objects (RFC 4180-ish: handles quotes, commas, newlines)
	function parseCsv(text: string): Record<string, unknown>[] {
		const rows: string[][] = [];
		let field = '';
		let row: string[] = [];
		let inQuotes = false;
		// Strip UTF-8 BOM (common in Excel exports) and normalize line endings
		const src = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

		for (let i = 0; i < src.length; i++) {
			const char = src[i];
			if (inQuotes) {
				if (char === '"') {
					if (src[i + 1] === '"') {
						field += '"';
						i++;
					} else {
						inQuotes = false;
					}
				} else {
					field += char;
				}
			} else if (char === '"') {
				inQuotes = true;
			} else if (char === ',') {
				row.push(field);
				field = '';
			} else if (char === '\n') {
				row.push(field);
				rows.push(row);
				field = '';
				row = [];
			} else {
				field += char;
			}
		}
		// Flush trailing field/row
		if (field.length > 0 || row.length > 0) {
			row.push(field);
			rows.push(row);
		}

		// Drop trailing empty rows
		while (rows.length > 0 && rows[rows.length - 1].every(c => c.trim() === '')) {
			rows.pop();
		}
		if (rows.length === 0) return [];

		const headers = rows[0].map((h, idx) => h.trim() || `column_${idx + 1}`);
		return rows.slice(1).map(cells => {
			const obj: Record<string, unknown> = {};
			headers.forEach((header, idx) => {
				obj[header] = coerceCsvValue(cells[idx] ?? '');
			});
			return obj;
		});
	}

	// Heuristic: does this text look like CSV rather than JSON?
	function looksLikeCsv(text: string): boolean {
		const trimmed = text.trim();
		if (!trimmed) return false;
		// JSON almost always starts with { or [
		if (trimmed[0] === '{' || trimmed[0] === '[') return false;
		const firstLine = trimmed.split('\n')[0];
		// A CSV header row should contain at least one comma
		return firstLine.includes(',');
	}

	// Coerce CSV string cells into numbers/booleans/null where sensible
	function coerceCsvValue(raw: string): unknown {
		const val = raw.trim();
		if (val === '') return '';
		if (val === 'true') return true;
		if (val === 'false') return false;
		if (val === 'null') return null;
		// Numeric (but not things like "01" zip codes or values with leading zeros)
		if (/^-?\d+(\.\d+)?$/.test(val) && !/^0\d/.test(val)) {
			const num = Number(val);
			if (Number.isFinite(num)) return num;
		}
		return raw;
	}

	// Load parsed data directly (used by both JSON and CSV file uploads)
	function loadParsedData(data: unknown, sourceText: string) {
		activeTab.jsonInput = sourceText;
		activeTab.parsedData = data;
		activeTab.error = null;
		activeTab.currentPath = [];
		activeTab.expandedPaths.clear();
		activeTab.columnFilters = {};
		activeTab.hiddenColumns = new Set();
		resetFlatten();
		activeTab.showInput = false;
	}

	// Handle file upload (JSON or CSV)
	async function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';

			if (isCsv) {
				const data = parseCsv(text);
				if (data.length === 0) {
					activeTab.error = 'CSV file appears to be empty or has no data rows';
					activeTab.showInput = true;
				} else {
					loadParsedData(data, JSON.stringify(data, null, 2));
				}
			} else {
				const data = JSON.parse(text);
				loadParsedData(data, text);
			}
		} catch (err) {
			activeTab.error = err instanceof Error ? `Failed to load file: ${err.message}` : 'Failed to load file';
			activeTab.parsedData = null;
			activeTab.showInput = true;
		} finally {
			// Reset so the same file can be re-uploaded
			input.value = '';
		}
	}

	function triggerFileUpload() {
		fileInput?.click();
	}

	// Parse pasted input — auto-detects CSV vs JSON
	function parseJson() {
		activeTab.error = null;
		const text = activeTab.jsonInput;
		if (!text.trim()) {
			activeTab.parsedData = null;
			return;
		}

		// CSV path: detect comma-separated tabular text
		if (looksLikeCsv(text)) {
			try {
				const data = parseCsv(text);
				if (data.length === 0) {
					activeTab.error = 'CSV has headers but no data rows';
					activeTab.parsedData = null;
					return;
				}
				activeTab.parsedData = data;
				activeTab.currentPath = [];
				activeTab.expandedPaths.clear();
				activeTab.columnFilters = {};
				activeTab.hiddenColumns = new Set();
				resetFlatten();
				activeTab.showInput = false;
				return;
			} catch (e) {
				activeTab.error = e instanceof Error ? `Failed to parse CSV: ${e.message}` : 'Failed to parse CSV';
				activeTab.parsedData = null;
				return;
			}
		}

		// JSON path
		try {
			activeTab.parsedData = JSON.parse(text);
			activeTab.currentPath = [];
			activeTab.expandedPaths.clear();
			activeTab.columnFilters = {};
			activeTab.hiddenColumns = new Set();
			resetFlatten();
			activeTab.showInput = false;
		} catch (e) {
			activeTab.error = e instanceof Error ? e.message : 'Invalid JSON';
			activeTab.parsedData = null;
		}
	}

	// Navigate to path
	function navigateTo(path: string[]) {
		activeTab.currentPath = path;
		activeTab.columnFilters = {};
		activeTab.hiddenColumns = new Set();
		resetFlatten();
	}

	// Navigate into a cell
	function drillDown(key: string) {
		activeTab.currentPath = [...activeTab.currentPath, key];
		activeTab.columnFilters = {};
		activeTab.hiddenColumns = new Set();
		resetFlatten();
	}

	// Reset flatten state and re-detect for current data
	function resetFlatten() {
		activeTab.flattenEnabled = false;
		activeTab.flattenableKeys = [];
	}

	// Auto-detect flattenable keys when data changes and offer flatten
	function autoDetectFlatten(data: Record<string, unknown>[]) {
		const detected = detectFlattenableKeys(data);
		activeTab.flattenableKeys = detected;
		// Auto-enable if there are flattenable keys and the raw columns are sparse
		if (detected.length > 0) {
			const rawCols = getTableColumns(data);
			const objectCols = rawCols.filter(c => detected.includes(c));
			// Auto-flatten if more than half the columns are objects
			if (objectCols.length > 0 && rawCols.length <= objectCols.length + 3) {
				activeTab.flattenEnabled = true;
			}
		}
	}

	// Toggle row expansion
	function toggleExpand(pathKey: string) {
		const newSet = new Set(activeTab.expandedPaths);
		if (newSet.has(pathKey)) {
			newSet.delete(pathKey);
		} else {
			newSet.add(pathKey);
		}
		activeTab.expandedPaths = newSet;
	}

	// Toggle column visibility
	function toggleColumn(col: string) {
		const newSet = new Set(activeTab.hiddenColumns);
		if (newSet.has(col)) {
			newSet.delete(col);
		} else {
			newSet.add(col);
		}
		activeTab.hiddenColumns = newSet;
	}

	// Show all columns
	function showAllColumns() {
		activeTab.hiddenColumns = new Set();
	}

	// Hide all columns except selected
	function hideAllColumns(except: string[] = []) {
		if (!isTabularArray(currentData)) return;
		const effective = getEffectiveData(currentData);
		const allCols = getTableColumns(effective);
		activeTab.hiddenColumns = new Set(allCols.filter(c => !except.includes(c)));
	}

	// Clear all filters
	function clearAllFilters() {
		activeTab.globalSearch = '';
		activeTab.columnFilters = {};
	}

	// Update column filter
	function setColumnFilter(col: string, value: string) {
		activeTab.columnFilters = { ...activeTab.columnFilters, [col]: value };
	}

	// Check if any filters are active
	function hasActiveFilters(): boolean {
		if (activeTab.globalSearch.trim()) return true;
		return Object.values(activeTab.columnFilters).some(v => v.trim());
	}

	// Export to CSV (only visible columns)
	function exportToCsv() {
		if (!isTabularArray(currentData)) return;

		const effective = getEffectiveData(currentData);
		const allColumns = getTableColumns(effective);
		const columns = getVisibleColumns(allColumns);
		const rows = filterRows(effective);

		const csvContent = [
			columns.map(c => `"${c.replace(/"/g, '""')}"`).join(','),
			...rows.map(row =>
				columns.map(col => {
					const val = row[col];
					const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
					return `"${str.replace(/"/g, '""')}"`;
				}).join(',')
			)
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'data.csv';
		link.click();
		URL.revokeObjectURL(link.href);
	}

	// Clear and reset
	function clearAll() {
		activeTab.jsonInput = '';
		activeTab.parsedData = null;
		activeTab.error = null;
		activeTab.globalSearch = '';
		activeTab.columnFilters = {};
		activeTab.hiddenColumns = new Set();
		activeTab.currentPath = [];
		activeTab.expandedPaths.clear();
		resetFlatten();
		activeTab.showInput = true;
	}

	// Edit/back to input
	function editJson() {
		activeTab.showInput = true;
	}

	// Load sample data
	function loadSample() {
		activeTab.jsonInput = JSON.stringify({
			"users": [
				{ "id": 1, "name": "John Doe", "email": "john@example.com", "age": 30, "active": true, "department": "Engineering", "address": { "city": "New York", "zip": "10001" } },
				{ "id": 2, "name": "Jane Smith", "email": "jane@example.com", "age": 25, "active": true, "department": "Marketing", "address": { "city": "Los Angeles", "zip": "90001" } },
				{ "id": 3, "name": "Bob Wilson", "email": "bob@example.com", "age": 35, "active": false, "department": "Engineering", "address": { "city": "Chicago", "zip": "60601" } },
				{ "id": 4, "name": "Alice Brown", "email": "alice@example.com", "age": 28, "active": true, "department": "Sales", "address": { "city": "Houston", "zip": "77001" } },
				{ "id": 5, "name": "Charlie Davis", "email": "charlie@example.com", "age": 42, "active": true, "department": "Engineering", "address": { "city": "Phoenix", "zip": "85001" } }
			],
			"products": [
				{ "sku": "PRD-001", "name": "Laptop", "price": 999.99, "stock": 50, "category": "Electronics" },
				{ "sku": "PRD-002", "name": "Keyboard", "price": 79.99, "stock": 200, "category": "Accessories" },
				{ "sku": "PRD-003", "name": "Mouse", "price": 29.99, "stock": 150, "category": "Accessories" }
			],
			"settings": {
				"theme": "dark",
				"notifications": true,
				"language": "en"
			}
		}, null, 2);
		activeTab.error = null;
	}

	// Expand all arrays
	function expandAll() {
		if (!currentData || !isTabularArray(currentData)) return;
		const effective = getEffectiveData(currentData);
		const rows = filterRows(effective);
		const newSet = new Set<string>();
		rows.forEach((_, idx) => newSet.add(String(idx)));
		activeTab.expandedPaths = newSet;
	}

	// Collapse all
	function collapseAll() {
		activeTab.expandedPaths = new Set();
	}

	// Close column menu when clicking outside
	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.column-menu-wrapper')) {
			activeTab.showColumnMenu = false;
		}
	}

	// Auto-detect flattenable keys when currentData changes
	$effect(() => {
		if (currentData && isTabularArray(currentData)) {
			// Only detect on initial load or path change (when flattenableKeys is empty)
			if (activeTab.flattenableKeys.length === 0) {
				const detected = detectFlattenableKeys(currentData);
				if (detected.length > 0) {
					activeTab.flattenableKeys = detected;
					// Auto-enable if most columns are objects (like API responses with attributes)
					const rawCols = getTableColumns(currentData);
					const objectCols = rawCols.filter(c => detected.includes(c));
					if (objectCols.length > 0 && rawCols.length <= objectCols.length + 3) {
						activeTab.flattenEnabled = true;
					}
				}
			}
		}
	});
</script>

<svelte:head>
	<title>JSON Grid - Freebies JSON Tools</title>
</svelte:head>

<svelte:window onclick={handleClickOutside} />

<input
	type="file"
	accept=".json,.csv,application/json,text/csv"
	bind:this={fileInput}
	onchange={handleFileUpload}
	style="display: none;"
/>

<div class="container">
	<div class="page-header">
		<div class="header-info">
			<h2>JSON Grid Viewer</h2>
			<p>View JSON data in table format with column filters</p>
		</div>
		<div class="header-actions">
			{#if !showInput && parsedData}
				<button type="button" class="btn btn-secondary" onclick={editJson}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
					</svg>
					<span class="btn-text">Edit</span>
				</button>
			{/if}
			<button type="button" class="btn btn-secondary" onclick={triggerFileUpload}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
					<polyline points="17 8 12 3 7 8"/>
					<line x1="12" y1="3" x2="12" y2="15"/>
				</svg>
				<span class="btn-text">Upload</span>
			</button>
			<button type="button" class="btn btn-secondary" onclick={loadSample}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
					<polyline points="14 2 14 8 20 8"/>
				</svg>
				<span class="btn-text">Sample</span>
			</button>
			<button type="button" class="btn btn-secondary" onclick={clearAll}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="3 6 5 6 21 6"/>
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
				</svg>
				<span class="btn-text">Clear</span>
			</button>
		</div>
	</div>

	<!-- Tab Bar -->
	<div class="tab-bar">
		<div class="tab-list">
			{#each tabs as tab (tab.id)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					class="tab-item"
					class:active={tab.id === activeTabId}
					onclick={() => switchTab(tab.id)}
					ondblclick={() => renameTab(tab.id)}
					title="Double-click to rename"
				>
					<span class="tab-name">{tab.name}</span>
					{#if tab.parsedData}
						<span class="tab-dot"></span>
					{/if}
					{#if tabs.length > 1}
						<button
							type="button"
							class="tab-close"
							onclick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
							title="Close tab"
						>
							<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="18" y1="6" x2="6" y2="18"/>
								<line x1="6" y1="6" x2="18" y2="18"/>
							</svg>
						</button>
					{/if}
				</div>
			{/each}
		</div>
		<button type="button" class="tab-add" onclick={addTab} title="New tab">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="12" y1="5" x2="12" y2="19"/>
				<line x1="5" y1="12" x2="19" y2="12"/>
			</svg>
		</button>
	</div>

	<div class="main-content card">
		{#if showInput}
			<!-- Input Mode -->
			<div class="input-section">
				<div class="editor-header">
					<span>Paste JSON, or upload a JSON / CSV file</span>
					<div class="editor-header-actions">
						<button type="button" class="btn btn-secondary btn-sm" onclick={triggerFileUpload}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
								<polyline points="17 8 12 3 7 8"/>
								<line x1="12" y1="3" x2="12" y2="15"/>
							</svg>
							Upload File
						</button>
						<button type="button" class="btn btn-primary btn-sm" onclick={parseJson}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polygon points="5 3 19 12 5 21 5 3"/>
						</svg>
						View as Grid
						</button>
					</div>
				</div>
				<textarea
					class="json-input"
					bind:value={activeTab.jsonInput}
					placeholder="Paste your JSON here..."
					spellcheck="false"
				></textarea>
				{#if error}
					<div class="error-message">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10"/>
							<line x1="12" y1="8" x2="12" y2="12"/>
							<line x1="12" y1="16" x2="12.01" y2="16"/>
						</svg>
						{error}
					</div>
				{/if}
			</div>
		{:else if parsedData}
			<!-- Grid View Mode -->
			<div class="grid-view">
				<!-- Breadcrumb navigation -->
				<div class="breadcrumb-bar">
					<div class="breadcrumb">
						<button
							type="button"
							class="breadcrumb-item"
							class:active={currentPath.length === 0}
							onclick={() => navigateTo([])}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
								<polyline points="9 22 9 12 15 12 15 22"/>
							</svg>
							Root
						</button>
						{#each currentPath as segment, idx}
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="breadcrumb-sep">
								<polyline points="9 18 15 12 9 6"/>
							</svg>
							<button
								type="button"
								class="breadcrumb-item"
								class:active={idx === currentPath.length - 1}
								onclick={() => navigateTo(currentPath.slice(0, idx + 1))}
							>
								{segment}
							</button>
						{/each}
					</div>

					<div class="grid-actions">
						{#if isTabularArray(currentData)}
							<!-- Flatten toggle (shown if flattenable keys detected) -->
							{#if activeTab.flattenableKeys.length > 0}
								<button
									type="button"
									class="btn btn-sm btn-secondary"
									class:active={activeTab.flattenEnabled}
									onclick={() => { activeTab.flattenEnabled = !activeTab.flattenEnabled; activeTab.columnFilters = {}; activeTab.hiddenColumns = new Set(); }}
									title={activeTab.flattenEnabled ? `Flatten ON \u2014 expanding: ${activeTab.flattenableKeys.join(', ')}` : `Flatten nested objects: ${activeTab.flattenableKeys.join(', ')}`}
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M21 3H3v7h18V3z"/>
										<path d="M21 14H3v7h18v-7z"/>
									</svg>
									<span class="btn-text">Flatten</span>
									{#if activeTab.flattenEnabled}
										<span class="badge flatten-badge">{activeTab.flattenableKeys.length}</span>
									{/if}
								</button>
							{/if}

							<!-- Column visibility toggle -->
							<div class="column-menu-wrapper">
								<button
									type="button"
									class="btn btn-sm btn-secondary"
									class:active={activeTab.showColumnMenu}
									onclick={(e) => { e.stopPropagation(); activeTab.showColumnMenu = !activeTab.showColumnMenu; }}
									title="Show/Hide columns"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
										<line x1="12" y1="3" x2="12" y2="21"/>
									</svg>
									<span class="btn-text">Columns</span>
									{#if activeTab.hiddenColumns.size > 0}
										<span class="badge">{activeTab.hiddenColumns.size}</span>
									{/if}
								</button>

								{#if activeTab.showColumnMenu}
									{@const effectiveMenuData = getEffectiveData(currentData)}
									{@const allCols = getTableColumns(effectiveMenuData)}
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<div class="column-menu" onclick={(e) => e.stopPropagation()}>
										<div class="column-menu-header">
											<span>Visible Columns</span>
											<div class="column-menu-actions">
												<button type="button" onclick={showAllColumns} title="Show all">All</button>
												<button type="button" onclick={() => hideAllColumns()} title="Hide all">None</button>
											</div>
										</div>
										<div class="column-list">
											{#each allCols as col}
												<label class="column-item">
													<input
														type="checkbox"
														checked={!activeTab.hiddenColumns.has(col)}
														onchange={() => toggleColumn(col)}
													/>
													<span>{col}</span>
												</label>
											{/each}
										</div>
									</div>
								{/if}
							</div>

							<!-- Toggle filter row -->
							<button
								type="button"
								class="btn btn-sm btn-secondary"
								class:active={activeTab.showFilterRow}
								onclick={() => activeTab.showFilterRow = !activeTab.showFilterRow}
								title="Toggle column filters"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
								</svg>
							</button>

							<button type="button" class="btn btn-sm btn-secondary" onclick={expandAll} title="Expand all rows">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="15 3 21 3 21 9"/>
									<polyline points="9 21 3 21 3 15"/>
									<line x1="21" y1="3" x2="14" y2="10"/>
									<line x1="3" y1="21" x2="10" y2="14"/>
								</svg>
							</button>
							<button type="button" class="btn btn-sm btn-secondary" onclick={collapseAll} title="Collapse all rows">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="4 14 10 14 10 20"/>
									<polyline points="20 10 14 10 14 4"/>
									<line x1="14" y1="10" x2="21" y2="3"/>
									<line x1="3" y1="21" x2="10" y2="14"/>
								</svg>
							</button>
							<button type="button" class="btn btn-sm btn-secondary" onclick={exportToCsv} title="Export to CSV">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
									<polyline points="7 10 12 15 17 10"/>
									<line x1="12" y1="15" x2="12" y2="3"/>
								</svg>
								<span class="btn-text">CSV</span>
							</button>
						{/if}
					</div>
				</div>

				<!-- Global Search bar -->
				{#if isTabularArray(currentData)}
					{@const effectiveData = getEffectiveData(currentData)}
					{@const allCols = getTableColumns(effectiveData)}
					{@const filteredRows = filterRows(effectiveData)}
					<div class="filter-bar">
						<div class="search-box">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="11" cy="11" r="8"/>
								<line x1="21" y1="21" x2="16.65" y2="16.65"/>
							</svg>
							<input
								type="text"
								placeholder="Global search..."
								bind:value={activeTab.globalSearch}
							/>
							{#if activeTab.globalSearch}
								<button type="button" class="clear-search" onclick={() => activeTab.globalSearch = ''} title="Clear search">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<line x1="18" y1="6" x2="6" y2="18"/>
										<line x1="6" y1="6" x2="18" y2="18"/>
									</svg>
								</button>
							{/if}
						</div>

						<div class="filter-info">
							{#if hasActiveFilters()}
								<button type="button" class="clear-filters-btn" onclick={clearAllFilters} title="Clear all filters">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<line x1="18" y1="6" x2="6" y2="18"/>
										<line x1="6" y1="6" x2="18" y2="18"/>
									</svg>
									Clear filters
								</button>
							{/if}
							<span class="row-count">
								{filteredRows.length} of {effectiveData.length} rows
								{#if activeTab.hiddenColumns.size > 0}
									• {allCols.length - activeTab.hiddenColumns.size}/{allCols.length} columns
								{/if}
							</span>
						</div>
					</div>
				{/if}

				<!-- Grid content -->
				<div class="grid-content">
					{#if isTabularArray(currentData)}
						<!-- Table view for arrays of objects -->
						{@const effectiveData = getEffectiveData(currentData)}
						{@const allColumns = getTableColumns(effectiveData)}
						{@const columns = getVisibleColumns(allColumns)}
						{@const filteredRows = filterRows(effectiveData)}
						<div class="table-wrapper">
							<table class="data-table">
								<thead>
									<tr class="header-row">
										<th class="row-num">#</th>
										{#each columns as col}
											<th>
												<div class="th-content">
													{#if col.includes('.')}
														<span class="th-label" title={col}>
															<span class="th-prefix">{col.split('.')[0]}.</span>{col.split('.').slice(1).join('.')}
														</span>
													{:else}
														<span class="th-label">{col}</span>
													{/if}
													<button
														type="button"
														class="hide-col-btn"
														onclick={() => toggleColumn(col)}
														title="Hide column"
													>
														<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
															<line x1="18" y1="6" x2="6" y2="18"/>
															<line x1="6" y1="6" x2="18" y2="18"/>
														</svg>
													</button>
												</div>
											</th>
										{/each}
									</tr>
									{#if activeTab.showFilterRow}
										<tr class="filter-row">
											<th class="row-num">
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
												</svg>
											</th>
											{#each columns as col}
												<th>
													<input
														type="text"
														class="column-filter"
														placeholder="Filter..."
														value={activeTab.columnFilters[col] ?? ''}
														oninput={(e) => setColumnFilter(col, (e.target as HTMLInputElement).value)}
													/>
												</th>
											{/each}
										</tr>
									{/if}
								</thead>
								<tbody>
									{#each filteredRows as row, rowIdx}
										{@const isExpanded = activeTab.expandedPaths.has(String(rowIdx))}
										{@const originalRow = currentData[rowIdx] ?? row}
										<tr class:expanded={isExpanded}>
											<td class="row-num">
												<button
													type="button"
													class="expand-btn"
													onclick={() => toggleExpand(String(rowIdx))}
													title={isExpanded ? 'Collapse' : 'Expand'}
												>
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
														{#if isExpanded}
															<line x1="5" y1="12" x2="19" y2="12"/>
														{:else}
															<line x1="12" y1="5" x2="12" y2="19"/>
															<line x1="5" y1="12" x2="19" y2="12"/>
														{/if}
													</svg>
												</button>
												{rowIdx + 1}
											</td>
											{#each columns as col}
												{@const cellValue = row[col]}
												<td class="cell-{getValueType(cellValue)}">
													{#if isExpandable(cellValue)}
														<button
															type="button"
															class="cell-expand"
															onclick={() => drillDown(String(rowIdx))}
															title="View details"
														>
															{formatCellValue(cellValue)}
															<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																<polyline points="9 18 15 12 9 6"/>
															</svg>
														</button>
													{:else}
														{formatCellValue(cellValue)}
													{/if}
												</td>
											{/each}
										</tr>
										{#if isExpanded}
											<tr class="expanded-row">
												<td colspan={columns.length + 1}>
													<div class="expanded-content">
														<pre>{JSON.stringify(originalRow, null, 2)}</pre>
													</div>
												</td>
											</tr>
										{/if}
									{/each}
									{#if filteredRows.length === 0}
										<tr>
											<td colspan={columns.length + 1} class="no-results">
												<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<circle cx="11" cy="11" r="8"/>
													<line x1="21" y1="21" x2="16.65" y2="16.65"/>
													<line x1="8" y1="11" x2="14" y2="11"/>
												</svg>
												No results match your filters
											</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					{:else if Array.isArray(currentData)}
						<!-- Simple array view -->
						<div class="simple-array">
							<div class="array-header">
								<span>Array with {currentData.length} items</span>
							</div>
							<div class="array-items">
								{#each currentData as item, idx}
									<div class="array-item">
										<span class="item-index">{idx}</span>
										{#if isExpandable(item)}
											<button
												type="button"
												class="cell-expand"
												onclick={() => drillDown(String(idx))}
											>
												{formatCellValue(item)}
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<polyline points="9 18 15 12 9 6"/>
												</svg>
											</button>
										{:else}
											<span class="item-value type-{getValueType(item)}">{formatCellValue(item)}</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{:else if typeof currentData === 'object' && currentData !== null}
						<!-- Object view -->
						<div class="object-view">
							<div class="object-header">
								<span>Object with {Object.keys(currentData).length} keys</span>
							</div>
							<div class="object-entries">
								{#each Object.entries(currentData as Record<string, unknown>) as [key, value]}
									<div class="object-entry">
										<span class="entry-key">{key}</span>
										{#if isExpandable(value)}
											<button
												type="button"
												class="cell-expand"
												onclick={() => drillDown(key)}
											>
												{formatCellValue(value)}
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<polyline points="9 18 15 12 9 6"/>
												</svg>
											</button>
										{:else}
											<span class="entry-value type-{getValueType(value)}">{formatCellValue(value)}</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<!-- Primitive value -->
						<div class="primitive-view">
							<span class="type-{getValueType(currentData)}">{formatCellValue(currentData)}</span>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Empty state -->
			<div class="empty-state">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
					<line x1="3" y1="9" x2="21" y2="9"/>
					<line x1="9" y1="21" x2="9" y2="9"/>
				</svg>
				<h3>No data loaded</h3>
				<p>Paste JSON, upload a JSON / CSV file, or load a sample to view as grid</p>
				<div class="empty-actions">
					<button type="button" class="btn btn-primary" onclick={triggerFileUpload}>
						Upload JSON / CSV
					</button>
					<button type="button" class="btn btn-secondary" onclick={loadSample}>
						Load Sample Data
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Tab Bar */
	.tab-bar {
		display: flex;
		align-items: center;
		gap: 0;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 8px 8px 0 0;
		padding: 0.5rem 0.5rem 0;
		margin-bottom: -1px;
		overflow-x: auto;
	}

	.tab-list {
		display: flex;
		gap: 0.25rem;
		flex: 1;
		overflow-x: auto;
	}

	.tab-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-bottom: none;
		border-radius: 6px 6px 0 0;
		color: var(--color-text-muted);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
		position: relative;
	}

	.tab-item:hover {
		color: var(--color-text);
		background: var(--color-bg);
	}

	.tab-item.active {
		background: var(--color-surface);
		color: var(--color-text);
		border-color: var(--color-primary);
		border-bottom: 2px solid var(--color-surface);
		margin-bottom: -1px;
		z-index: 1;
	}

	.tab-name {
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tab-dot {
		width: 6px;
		height: 6px;
		background: var(--color-success);
		border-radius: 50%;
	}

	.tab-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 3px;
		color: var(--color-text-muted);
		cursor: pointer;
		opacity: 0;
		transition: all 0.15s ease;
	}

	.tab-item:hover .tab-close {
		opacity: 1;
	}

	.tab-close:hover {
		background: var(--color-error);
		color: white;
	}

	.tab-add {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-muted);
		cursor: pointer;
		margin-left: 0.25rem;
		transition: all 0.15s ease;
	}

	.tab-add:hover {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
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
		border-top-left-radius: 0;
	}

	/* Input Section */
	.input-section {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
		font-weight: 500;
	}

	.editor-header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.empty-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.json-input {
		flex: 1;
		min-height: 400px;
		padding: 1rem;
		background: var(--color-surface);
		border: none;
		color: var(--color-text);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.5;
		resize: none;
		outline: none;
	}

	.json-input::placeholder {
		color: var(--color-text-muted);
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border-top: 1px solid rgba(239, 68, 68, 0.3);
		color: var(--color-error);
		font-size: 0.875rem;
	}

	/* Grid View */
	.grid-view {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
	}

	/* Breadcrumb */
	.breadcrumb-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 1rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.breadcrumb-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.65rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.breadcrumb-item:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.breadcrumb-item.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.breadcrumb-sep {
		color: var(--color-text-muted);
	}

	.grid-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	/* Column Menu */
	.column-menu-wrapper {
		position: relative;
	}

	.column-menu-wrapper .btn.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		margin-left: 4px;
		background: var(--color-error);
		border-radius: 8px;
		font-size: 0.65rem;
		font-weight: 600;
		color: white;
	}

	.column-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 4px;
		min-width: 200px;
		max-height: 300px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 100;
		overflow: hidden;
	}

	.column-menu-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.column-menu-actions {
		display: flex;
		gap: 0.5rem;
	}

	.column-menu-actions button {
		padding: 0.15rem 0.4rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.65rem;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.column-menu-actions button:hover {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.column-list {
		max-height: 250px;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.column-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.column-item:hover {
		background: var(--color-bg);
	}

	.column-item input {
		width: 14px;
		height: 14px;
		cursor: pointer;
	}

	/* Filter Bar */
	.filter-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 1rem;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		max-width: 300px;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}

	.search-box svg {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.search-box input {
		flex: 1;
		background: transparent;
		border: none;
		color: var(--color-text);
		font-size: 0.875rem;
		outline: none;
	}

	.search-box input::placeholder {
		color: var(--color-text-muted);
	}

	.clear-search {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.2rem;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.clear-search:hover {
		background: var(--color-border);
		color: var(--color-text);
	}

	.filter-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.clear-filters-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.65rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 6px;
		color: var(--color-error);
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.clear-filters-btn:hover {
		background: var(--color-error);
		border-color: var(--color-error);
		color: white;
	}

	.row-count {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	/* Grid Content */
	.grid-content {
		flex: 1;
		overflow: auto;
	}

	/* Table */
	.table-wrapper {
		overflow: auto;
		height: 100%;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.6rem 0.8rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}

	.data-table th {
		background: var(--color-bg);
		font-weight: 600;
		position: sticky;
		top: 0;
		z-index: 2;
	}

	.header-row th {
		top: 0;
	}

	.filter-row th {
		top: 33px; /* Approximate height of header row */
		background: var(--color-surface);
		padding: 0.3rem 0.5rem;
		z-index: 1;
	}

	.th-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.th-label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.th-prefix {
		color: var(--color-text-muted);
		font-weight: 400;
		font-size: 0.7rem;
	}

	.flatten-badge {
		background: var(--color-success, #22c55e);
	}

	.hide-col-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 3px;
		color: var(--color-text-muted);
		opacity: 0;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	th:hover .hide-col-btn {
		opacity: 1;
	}

	.hide-col-btn:hover {
		background: var(--color-error);
		color: white;
	}

	.column-filter {
		width: 100%;
		padding: 0.35rem 0.5rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text);
		font-size: 0.75rem;
		outline: none;
	}

	.column-filter:focus {
		border-color: var(--color-primary);
	}

	.column-filter::placeholder {
		color: var(--color-text-muted);
	}

	.data-table tbody tr:hover {
		background: rgba(139, 92, 246, 0.05);
	}

	.data-table tbody tr.expanded {
		background: rgba(139, 92, 246, 0.08);
	}

	.row-num {
		width: 60px;
		min-width: 60px;
		color: var(--color-text-muted);
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	td.row-num {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.expand-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		padding: 0;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text-muted);
		cursor: pointer;
		flex-shrink: 0;
	}

	.expand-btn:hover {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.cell-expand {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.5rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-primary);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.cell-expand:hover {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	/* Cell types */
	.cell-string { color: var(--color-success); }
	.cell-number { color: var(--color-info, #3b82f6); }
	.cell-boolean { color: var(--color-warning, #eab308); }
	.cell-null { color: var(--color-text-muted); font-style: italic; }
	.cell-object, .cell-array { color: var(--color-text); }

	/* No results */
	.no-results {
		text-align: center;
		padding: 2rem !important;
		color: var(--color-text-muted);
	}

	.no-results svg {
		margin-bottom: 0.5rem;
		opacity: 0.5;
	}

	/* Expanded row */
	.expanded-row td {
		padding: 0;
		background: var(--color-bg);
	}

	.expanded-content {
		padding: 1rem;
		max-height: 300px;
		overflow: auto;
	}

	.expanded-content pre {
		margin: 0;
		padding: 1rem;
		background: var(--color-surface);
		border-radius: 8px;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-all;
	}

	/* Object/Array views */
	.object-view, .simple-array {
		padding: 1rem;
	}

	.object-header, .array-header {
		padding: 0.5rem 0.75rem;
		background: var(--color-bg);
		border-radius: 6px;
		margin-bottom: 1rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.object-entries, .array-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.object-entry, .array-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 6px;
	}

	.entry-key, .item-index {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		color: var(--color-primary);
		min-width: 100px;
	}

	.item-index {
		min-width: 40px;
		color: var(--color-text-muted);
	}

	.entry-value, .item-value {
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}

	.type-string { color: var(--color-success); }
	.type-number { color: var(--color-info, #3b82f6); }
	.type-boolean { color: var(--color-warning, #eab308); }
	.type-null { color: var(--color-text-muted); font-style: italic; }

	/* Primitive view */
	.primitive-view {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		font-family: var(--font-mono);
		font-size: 1.25rem;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		text-align: center;
		color: var(--color-text-muted);
		flex: 1;
	}

	.empty-state svg {
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		margin-bottom: 0.5rem;
		color: var(--color-text);
	}

	.empty-state p {
		margin-bottom: 1.5rem;
	}

	/* Button variants */
	.btn-sm {
		padding: 0.35rem 0.5rem;
		font-size: 0.8rem;
	}

	.btn-sm.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.breadcrumb-bar {
			flex-direction: column;
			align-items: flex-start;
		}

		.filter-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.search-box {
			max-width: none;
		}

		.filter-info {
			flex-wrap: wrap;
			justify-content: center;
		}

		.row-count {
			text-align: center;
		}

		.data-table th,
		.data-table td {
			padding: 0.5rem;
			font-size: 0.8rem;
		}

		.column-menu {
			right: auto;
			left: 0;
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

		.entry-key {
			min-width: 60px;
		}

		.grid-actions {
			flex-wrap: wrap;
		}
	}
</style>