<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'http-status-lookup',
		name: 'HTTP Status Lookup',
		description: 'Look up HTTP status codes and meanings',
		category: 'api-dev',
		icon: 'info',
		keywords: ['http', 'status', 'code', 'lookup', 'error']
	};

	const statusCodes: Record<number, { message: string; description: string; category: string }> =
		{
			200: {
				message: 'OK',
				description: 'Request succeeded. Response depends on HTTP method used.',
				category: '2xx Success'
			},
			201: {
				message: 'Created',
				description: 'Request succeeded, and a new resource was created as a result.',
				category: '2xx Success'
			},
			204: {
				message: 'No Content',
				description: 'Request succeeded but there is no content to send.',
				category: '2xx Success'
			},
			304: {
				message: 'Not Modified',
				description: 'Response has not been modified, can use cached version.',
				category: '3xx Redirection'
			},
			400: {
				message: 'Bad Request',
				description:
					'Server cannot process the request due to client error (e.g., malformed syntax).',
				category: '4xx Client Error'
			},
			401: {
				message: 'Unauthorized',
				description: 'Authentication is required and has failed or has not been provided.',
				category: '4xx Client Error'
			},
			403: {
				message: 'Forbidden',
				description: 'Client does not have access rights to the content.',
				category: '4xx Client Error'
			},
			404: {
				message: 'Not Found',
				description: 'Server cannot find the requested resource.',
				category: '4xx Client Error'
			},
			429: {
				message: 'Too Many Requests',
				description: 'User has sent too many requests in a given amount of time (rate limiting).',
				category: '4xx Client Error'
			},
			500: {
				message: 'Internal Server Error',
				description:
					'Server encountered an unexpected condition that prevented it from fulfilling the request.',
				category: '5xx Server Error'
			},
			502: {
				message: 'Bad Gateway',
				description:
					'Invalid response from upstream server. Often happens with reverse proxies.',
				category: '5xx Server Error'
			},
			503: {
				message: 'Service Unavailable',
				description:
					'Server is not ready to handle the request. Often due to maintenance or overload.',
				category: '5xx Server Error'
			},
			504: {
				message: 'Gateway Timeout',
				description:
					'Upstream server failed to respond in time. Often happens with reverse proxies.',
				category: '5xx Server Error'
			}
		};

	let searchQuery = $state('');
	let filteredStatuses = $state(Object.entries(statusCodes));

	function handleSearch(e: Event) {
		const query = (e.target as HTMLInputElement).value.toLowerCase();
		searchQuery = query;

		if (!query) {
			filteredStatuses = Object.entries(statusCodes);
			return;
		}

		filteredStatuses = Object.entries(statusCodes).filter(
			([code, info]) =>
				code.includes(query) ||
				info.message.toLowerCase().includes(query) ||
				info.description.toLowerCase().includes(query)
		);
	}

	function copyCode(code: string) {
		navigator.clipboard.writeText(code);
	}
</script>

<div class="tool-wrapper">
	<div class="search-section">
		<input
			type="text"
			placeholder="Search by code or keyword..."
			bind:value={searchQuery}
			onchange={handleSearch}
			oninput={handleSearch}
			class="search-input"
		/>
	</div>

	<div class="status-list">
		{#if filteredStatuses.length === 0}
			<div class="empty-message">No status codes found matching "{searchQuery}"</div>
		{:else}
			{#each filteredStatuses as [code, info]}
				<div class="status-card">
					<div class="status-header">
						<div class="status-code">{code}</div>
						<div class="status-message">{info.message}</div>
						<div class="status-category">{info.category}</div>
						<button class="copy-btn" onclick={() => copyCode(code)}>📋</button>
					</div>
					<div class="status-description">{info.description}</div>
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

	.status-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.empty-message {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--color-text-muted);
		text-align: center;
	}

	.status-card {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.status-header {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.status-code {
		font-weight: 700;
		font-size: 1.25rem;
		color: var(--color-primary);
		min-width: 50px;
	}

	.status-message {
		font-weight: 600;
		font-size: 0.95rem;
		flex: 1;
	}

	.status-category {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		background: var(--color-primary);
		color: white;
		padding: 4px 8px;
		border-radius: 3px;
		white-space: nowrap;
	}

	.copy-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 6px 10px;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.copy-btn:hover {
		background: var(--color-primary);
		color: white;
	}

	.status-description {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		line-height: 1.5;
		margin-top: var(--spacing-xs);
	}
</style>
