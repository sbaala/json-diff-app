<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { DateService } from '$lib/services/date.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'iso8601-converter',
		name: 'ISO8601 Converter',
		description: 'Convert dates to/from ISO 8601 format',
		category: 'date-time',
		icon: 'calendar',
		keywords: ['iso8601', 'date', 'format', 'convert']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);

	function convert() {
		if (!input.trim()) {
			output = '';
			error = null;
			return;
		}
		try {
			const date = new Date(input.trim());
			if (isNaN(date.getTime())) throw new Error('Unrecognized date format');

			const lines = [
				`ISO 8601:        ${date.toISOString()}`,
				`ISO (local):     ${DateService.format(date, 'YYYY-MM-DDTHH:mm:ss')}`,
				`UTC String:      ${date.toUTCString()}`,
				`Unix (seconds):  ${DateService.toUnix(date)}`,
				`Unix (millis):   ${date.getTime()}`,
				`RFC 2822:        ${date.toUTCString()}`,
				`Date only:       ${DateService.format(date, 'YYYY-MM-DD')}`,
				`Time only:       ${DateService.format(date, 'HH:mm:ss')}`,
				`Locale:          ${date.toLocaleString()}`,
				`Week number:     ${DateService.getWeekNumber(date)}`,
				`Quarter:         Q${DateService.getQuarter(date)}`,
				`Day of week:     ${date.toLocaleDateString('en-US', { weekday: 'long' })}`
			];
			output = lines.join('\n');
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}

	function handleSample() {
		input = new Date().toISOString();
		convert();
	}

	$effect(() => {
		void input;
		convert();
	});
</script>

<ToolContainer {tool} bind:input bind:output bind:error onClear={handleClear} onSample={handleSample} />
