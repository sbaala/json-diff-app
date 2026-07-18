<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'mime-type-lookup',
		name: 'MIME Type Lookup',
		description: 'Look up MIME types by file extension',
		category: 'api-dev',
		icon: 'file',
		keywords: ['mime', 'type', 'content', 'extension']
	};

	const mimeTypes: Record<string, { mime: string; description: string; extensions: string[] }> = {
		'application/json': {
			mime: 'application/json',
			description: 'JSON data',
			extensions: ['.json']
		},
		'application/xml': {
			mime: 'application/xml',
			description: 'XML document',
			extensions: ['.xml']
		},
		'application/pdf': {
			mime: 'application/pdf',
			description: 'PDF document',
			extensions: ['.pdf']
		},
		'text/html': {
			mime: 'text/html',
			description: 'HTML document',
			extensions: ['.html', '.htm']
		},
		'text/plain': {
			mime: 'text/plain',
			description: 'Plain text file',
			extensions: ['.txt']
		},
		'text/css': {
			mime: 'text/css',
			description: 'CSS stylesheet',
			extensions: ['.css']
		},
		'application/javascript': {
			mime: 'application/javascript',
			description: 'JavaScript code',
			extensions: ['.js', '.mjs']
		},
		'text/csv': {
			mime: 'text/csv',
			description: 'CSV data',
			extensions: ['.csv']
		},
		'image/jpeg': {
			mime: 'image/jpeg',
			description: 'JPEG image',
			extensions: ['.jpg', '.jpeg']
		},
		'image/png': {
			mime: 'image/png',
			description: 'PNG image',
			extensions: ['.png']
		},
		'image/svg+xml': {
			mime: 'image/svg+xml',
			description: 'SVG image',
			extensions: ['.svg']
		},
		'image/gif': {
			mime: 'image/gif',
			description: 'GIF image',
			extensions: ['.gif']
		},
		'audio/mpeg': {
			mime: 'audio/mpeg',
			description: 'MP3 audio',
			extensions: ['.mp3']
		},
		'video/mp4': {
			mime: 'video/mp4',
			description: 'MP4 video',
			extensions: ['.mp4']
		},
		'application/zip': {
			mime: 'application/zip',
			description: 'ZIP archive',
			extensions: ['.zip']
		},
		'application/gzip': {
			mime: 'application/gzip',
			description: 'GZIP archive',
			extensions: ['.gz', '.gzip']
		}
	};

	let searchQuery = $state('');
	let filteredMimes = $state(Object.entries(mimeTypes));

	function handleSearch(e: Event) {
		const query = (e.target as HTMLInputElement).value.toLowerCase();
		searchQuery = query;

		if (!query) {
			filteredMimes = Object.entries(mimeTypes);
			return;
		}

		filteredMimes = Object.entries(mimeTypes).filter(
			([, info]) =>
				info.mime.toLowerCase().includes(query) ||
				info.description.toLowerCase().includes(query) ||
				info.extensions.some((ext) => ext.toLowerCase().includes(query))
		);
	}

	function copyMime(mime: string) {
		navigator.clipboard.writeText(mime);
	}
</script>

<div class="tool-wrapper">
	<div class="search-section">
		<input
			type="text"
			placeholder="Search by extension or MIME type..."
			bind:value={searchQuery}
			onchange={handleSearch}
			oninput={handleSearch}
			class="search-input"
		/>
	</div>

	<div class="mime-list">
		{#if filteredMimes.length === 0}
			<div class="empty-message">No MIME types found matching "{searchQuery}"</div>
		{:else}
			{#each filteredMimes as [, info]}
				<div class="mime-card">
					<div class="mime-header">
						<div class="mime-type">{info.mime}</div>
						<button class="copy-btn" onclick={() => copyMime(info.mime)}>📋</button>
					</div>
					<div class="mime-description">{info.description}</div>
					<div class="mime-extensions">
						<span class="extensions-label">Extensions:</span>
						{#each info.extensions as ext}
							<span class="extension-badge">{ext}</span>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
	}

	.search-section {
		display: flex;
		gap: var(--spacing-md);
	}

	.search-input {
		flex: 1;
		padding: 10px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.mime-list {
		flex: 1;
		overflow-y: auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--spacing-md);
	}

	.empty-message {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--color-text-muted);
		text-align: center;
	}

	.mime-card {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.mime-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-sm);
	}

	.mime-type {
		font-weight: 600;
		font-size: 0.9rem;
		font-family: monospace;
		color: var(--color-primary);
		word-break: break-all;
		flex: 1;
	}

	.mime-description {
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.mime-extensions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		align-items: center;
		font-size: 0.75rem;
	}

	.extensions-label {
		font-weight: 600;
		color: var(--color-primary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.extension-badge {
		background: var(--color-bg);
		color: var(--color-text);
		padding: 2px 6px;
		border-radius: 3px;
		border: 1px solid var(--color-border);
		font-family: monospace;
	}

	.copy-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 6px 10px;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.copy-btn:hover {
		background: var(--color-primary);
		color: white;
	}
</style>
