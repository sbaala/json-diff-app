<script lang="ts">
	interface LintIssue {
		line: number;
		column: number;
		message: string;
		severity: 'error' | 'warning';
		fixable: boolean;
	}

	let jsonInput = $state('');
	let fixedOutput = $state('');
	let issues = $state<LintIssue[]>([]);
	let error = $state<string | null>(null);
	let copySuccess = $state(false);
	let autoFixApplied = $state(false);

	function lintJson() {
		error = null;
		issues = [];
		fixedOutput = '';
		autoFixApplied = false;

		if (!jsonInput.trim()) {
			error = 'Please enter JSON to lint';
			return;
		}

		// Try parsing first
		try {
			JSON.parse(jsonInput);
			fixedOutput = JSON.stringify(JSON.parse(jsonInput), null, 2);
			issues = [{ line: 0, column: 0, message: 'JSON is valid!', severity: 'warning', fixable: false }];
			return;
		} catch {
			// Continue to fix
		}

		// Try to fix common issues
		const { fixed, foundIssues } = autoFixJson(jsonInput);
		issues = foundIssues;

		// Try parsing the fixed version
		try {
			JSON.parse(fixed);
			fixedOutput = JSON.stringify(JSON.parse(fixed), null, 2);
			autoFixApplied = true;
		} catch (e) {
			// Still broken, show the partially fixed version and error
			fixedOutput = fixed;
			const errorMsg = e instanceof Error ? e.message : 'Unknown error';
			const match = errorMsg.match(/position (\d+)/);
			const position = match ? parseInt(match[1]) : 0;
			const { line, column } = getLineColumn(fixed, position);
			issues.push({
				line,
				column,
				message: `Unable to auto-fix: ${errorMsg}`,
				severity: 'error',
				fixable: false
			});
		}
	}

	function autoFixJson(input: string): { fixed: string; foundIssues: LintIssue[] } {
		let fixed = input;
		const foundIssues: LintIssue[] = [];

		// Fix 1: Add missing quotes around unquoted keys
		const unquotedKeyRegex = /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
		let match;
		while ((match = unquotedKeyRegex.exec(input)) !== null) {
			const { line, column } = getLineColumn(input, match.index + match[1].length);
			foundIssues.push({
				line,
				column,
				message: `Unquoted key "${match[2]}" - added quotes`,
				severity: 'warning',
				fixable: true
			});
		}
		fixed = fixed.replace(unquotedKeyRegex, '$1"$2":');

		// Fix 2: Replace single quotes with double quotes
		const singleQuoteRegex = /'([^'\\]*(\\.[^'\\]*)*)'/g;
		let singleQuoteMatch;
		const tempFixed = fixed;
		while ((singleQuoteMatch = singleQuoteRegex.exec(tempFixed)) !== null) {
			const { line, column } = getLineColumn(input, singleQuoteMatch.index);
			foundIssues.push({
				line,
				column,
				message: 'Single quotes found - replaced with double quotes',
				severity: 'warning',
				fixable: true
			});
		}
		fixed = fixed.replace(singleQuoteRegex, '"$1"');

		// Fix 3: Remove trailing commas before ] or }
		const trailingCommaRegex = /,(\s*[}\]])/g;
		let trailingMatch;
		while ((trailingMatch = trailingCommaRegex.exec(fixed)) !== null) {
			const { line, column } = getLineColumn(input, trailingMatch.index);
			foundIssues.push({
				line,
				column,
				message: 'Trailing comma removed',
				severity: 'warning',
				fixable: true
			});
		}
		fixed = fixed.replace(trailingCommaRegex, '$1');

		// Fix 4: Add missing commas between elements (simple cases)
		// Look for }" or ]" or ""
		fixed = fixed.replace(/}(\s*)"([^}])/g, (_, space, next) => {
			foundIssues.push({
				line: 0,
				column: 0,
				message: 'Missing comma after object - added',
				severity: 'warning',
				fixable: true
			});
			return `},${space}"${next}`;
		});

		fixed = fixed.replace(/](\s*)"([^}])/g, (_, space, next) => {
			foundIssues.push({
				line: 0,
				column: 0,
				message: 'Missing comma after array - added',
				severity: 'warning',
				fixable: true
			});
			return `],${space}"${next}`;
		});

		fixed = fixed.replace(/"(\s*)"(?!")/g, (_, space) => {
			foundIssues.push({
				line: 0,
				column: 0,
				message: 'Missing comma between strings - added',
				severity: 'warning',
				fixable: true
			});
			return `",${space}"`;
		});

		// Fix 5: Replace undefined with null
		fixed = fixed.replace(/:\s*undefined\b/g, ': null');
		if (input.includes('undefined')) {
			foundIssues.push({
				line: 0,
				column: 0,
				message: 'Replaced "undefined" with "null"',
				severity: 'warning',
				fixable: true
			});
		}

		// Fix 6: Fix boolean case sensitivity
		fixed = fixed.replace(/:\s*True\b/g, ': true');
		fixed = fixed.replace(/:\s*False\b/g, ': false');
		fixed = fixed.replace(/:\s*TRUE\b/g, ': true');
		fixed = fixed.replace(/:\s*FALSE\b/g, ': false');
		if (/True|False|TRUE|FALSE/.test(input)) {
			foundIssues.push({
				line: 0,
				column: 0,
				message: 'Fixed boolean case (True/False → true/false)',
				severity: 'warning',
				fixable: true
			});
		}

		// Fix 7: Fix None to null (Python style)
		fixed = fixed.replace(/:\s*None\b/g, ': null');
		if (input.includes('None')) {
			foundIssues.push({
				line: 0,
				column: 0,
				message: 'Replaced Python "None" with "null"',
				severity: 'warning',
				fixable: true
			});
		}

		// Fix 8: Remove comments (// and /* */)
		const commentRegex = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
		if (commentRegex.test(fixed)) {
			foundIssues.push({
				line: 0,
				column: 0,
				message: 'Removed comments (not valid in JSON)',
				severity: 'warning',
				fixable: true
			});
		}
		fixed = fixed.replace(commentRegex, '');

		// Fix 9: Escape unescaped special characters in strings
		// This is complex, so we'll just note it might be an issue
		if (/[^\\"]\n/.test(fixed)) {
			foundIssues.push({
				line: 0,
				column: 0,
				message: 'Possible unescaped newlines in strings detected',
				severity: 'warning',
				fixable: false
			});
		}

		return { fixed, foundIssues };
	}

	function getLineColumn(text: string, position: number): { line: number; column: number } {
		const lines = text.substring(0, position).split('\n');
		return {
			line: lines.length,
			column: lines[lines.length - 1].length + 1
		};
	}

	function applyFix() {
		if (fixedOutput) {
			jsonInput = fixedOutput;
			lintJson();
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(fixedOutput);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 2000);
		} catch {
			error = 'Failed to copy to clipboard';
		}
	}

	function loadBrokenSample() {
		jsonInput = `{
  name: "John Doe",
  'age': 30,
  active: True,
  data: None,
  tags: ['important', "urgent"],
  // This is a comment
  nested: {
    value: undefined,
    items: [1, 2, 3,]
  }
  missing_comma: "here"
  "another": "field"
}`;
	}

	function clearAll() {
		jsonInput = '';
		fixedOutput = '';
		issues = [];
		error = null;
		autoFixApplied = false;
	}

	const validIssuesCount = $derived(issues.filter(i => i.severity === 'warning' && i.fixable).length);
	const errorCount = $derived(issues.filter(i => i.severity === 'error').length);
</script>

<svelte:head>
	<title>Lint & Fix JSON - Freebies JSON Tools</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<h1>JSON Lint & Fix</h1>
		<p>Validate JSON and automatically fix common errors</p>
	</div>

	<div class="lint-layout">
		<div class="input-section card">
			<div class="section-header">
				<h2>Input JSON</h2>
				<div class="header-actions">
					<button class="action-btn" onclick={loadBrokenSample}>Load Broken Sample</button>
					<button class="action-btn" onclick={clearAll}>Clear</button>
				</div>
			</div>
			<textarea
				class="json-input"
				bind:value={jsonInput}
				placeholder={`Paste your JSON here to lint and fix...\n\nCommon issues we can fix:\n• Unquoted keys\n• Single quotes instead of double\n• Trailing commas\n• undefined → null\n• True/False → true/false\n• Python None → null\n• Comments removal`}
				spellcheck="false"
			></textarea>
			<div class="input-footer">
				<button class="btn btn-primary" onclick={lintJson}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M9 12l2 2 4-4"/>
						<circle cx="12" cy="12" r="10"/>
					</svg>
					Lint & Fix
				</button>
			</div>
		</div>

		<div class="output-section card">
			<div class="section-header">
				<h2>
					Fixed Output
					{#if autoFixApplied}
						<span class="fixed-badge">Auto-fixed</span>
					{/if}
				</h2>
				<div class="header-actions">
					{#if fixedOutput}
						<button class="action-btn" onclick={applyFix}>Apply to Input</button>
						<button class="action-btn" onclick={copyToClipboard}>
							{copySuccess ? '✓ Copied!' : 'Copy'}
						</button>
					{/if}
				</div>
			</div>

			{#if issues.length > 0}
				<div class="issues-panel">
					<div class="issues-header">
						<span class="issues-title">
							{#if errorCount > 0}
								<span class="error-count">{errorCount} error{errorCount > 1 ? 's' : ''}</span>
							{/if}
							{#if validIssuesCount > 0}
								<span class="warning-count">{validIssuesCount} issue{validIssuesCount > 1 ? 's' : ''} fixed</span>
							{/if}
							{#if errorCount === 0 && validIssuesCount === 0}
								<span class="success-text">JSON is valid!</span>
							{/if}
						</span>
					</div>
					<div class="issues-list">
						{#each issues as issue}
							<div class="issue-item" class:error={issue.severity === 'error'} class:warning={issue.severity === 'warning'}>
								<span class="issue-icon">
									{#if issue.severity === 'error'}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<circle cx="12" cy="12" r="10"/>
											<path d="M15 9l-6 6M9 9l6 6"/>
										</svg>
									{:else}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M9 12l2 2 4-4"/>
											<circle cx="12" cy="12" r="10"/>
										</svg>
									{/if}
								</span>
								{#if issue.line > 0}
									<span class="issue-location">Line {issue.line}:{issue.column}</span>
								{/if}
								<span class="issue-message">{issue.message}</span>
								{#if issue.fixable}
									<span class="fixed-tag">Fixed</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="output-wrapper">
				<pre class="output-content" class:has-errors={errorCount > 0}>{fixedOutput || 'Fixed JSON will appear here...'}</pre>
			</div>
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

	.lint-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		height: calc(100vh - 220px);
		min-height: 500px;
	}

	.input-section,
	.output-section {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.section-header h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
	}

	.fixed-badge {
		font-size: 0.625rem;
		padding: 0.25rem 0.5rem;
		background: var(--color-success);
		color: white;
		border-radius: 4px;
		font-weight: 600;
		text-transform: uppercase;
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
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: var(--color-bg);
		color: var(--color-text);
	}

	.json-input {
		flex: 1;
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

	.input-footer {
		padding: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.input-footer .btn {
		width: 100%;
	}

	.issues-panel {
		border-bottom: 1px solid var(--color-border);
		max-height: 200px;
		overflow: auto;
	}

	.issues-header {
		padding: 0.75rem 1rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	.issues-title {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.error-count {
		color: var(--color-error);
	}

	.warning-count {
		color: var(--color-success);
	}

	.success-text {
		color: var(--color-success);
	}

	.issues-list {
		padding: 0.5rem;
	}

	.issue-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		font-size: 0.75rem;
		border-radius: 4px;
	}

	.issue-item.error {
		background: var(--color-removed);
		color: var(--color-error);
	}

	.issue-item.warning {
		background: rgba(16, 185, 129, 0.1);
		color: var(--color-success);
	}

	.issue-icon {
		flex-shrink: 0;
	}

	.issue-location {
		color: var(--color-text-muted);
		font-family: var(--font-mono);
	}

	.issue-message {
		flex: 1;
	}

	.fixed-tag {
		font-size: 0.625rem;
		padding: 0.125rem 0.375rem;
		background: var(--color-success);
		color: white;
		border-radius: 3px;
		font-weight: 600;
	}

	.output-wrapper {
		flex: 1;
		overflow: auto;
		background: var(--color-bg);
	}

	.output-content {
		padding: 1rem;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text);
		white-space: pre;
		min-height: 100%;
	}

	.output-content.has-errors {
		opacity: 0.7;
	}

	@media (max-width: 900px) {
		.lint-layout {
			grid-template-columns: 1fr;
			height: auto;
		}

		.input-section,
		.output-section {
			min-height: 350px;
		}
	}
</style>
