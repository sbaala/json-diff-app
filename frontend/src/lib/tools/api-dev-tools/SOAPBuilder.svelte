<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'soap-builder',
		name: 'SOAP Request Builder',
		description: 'Build SOAP XML requests',
		category: 'api-dev',
		icon: 'layers',
		keywords: ['soap', 'xml', 'request', 'builder']
	};

	let namespace = $state('http://example.com/service');
	let nsPrefix = $state('web');
	let operation = $state('GetUser');
	let soapVersion = $state<'1.1' | '1.2'>('1.1');
	let paramsText = $state('userId=123\nincludeDetails=true');
	let output = $state('');

	function build() {
		const params = paramsText
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l.includes('='))
			.map((l) => {
				const [k, ...rest] = l.split('=');
				return { key: k.trim(), value: rest.join('=').trim() };
			});

		const bodyParams = params
			.map((p) => `        <${nsPrefix}:${p.key}>${escapeXml(p.value)}</${nsPrefix}:${p.key}>`)
			.join('\n');

		if (soapVersion === '1.1') {
			output = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:${nsPrefix}="${namespace}">
  <soapenv:Header/>
  <soapenv:Body>
    <${nsPrefix}:${operation}>
${bodyParams}
    </${nsPrefix}:${operation}>
  </soapenv:Body>
</soapenv:Envelope>`;
		} else {
			output = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:${nsPrefix}="${namespace}">
  <soap:Header/>
  <soap:Body>
    <${nsPrefix}:${operation}>
${bodyParams}
    </${nsPrefix}:${operation}>
  </soap:Body>
</soap:Envelope>`;
		}
	}

	function escapeXml(str: string): string {
		return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function copy() {
		navigator.clipboard.writeText(output);
	}

	$effect(() => {
		void [namespace, nsPrefix, operation, soapVersion, paramsText];
		build();
	});
</script>

<div class="tool-wrapper">
	<div class="fields">
		<div class="field">
			<label for="ns">Namespace URI</label>
			<input id="ns" bind:value={namespace} />
		</div>
		<div class="field small">
			<label for="prefix">Prefix</label>
			<input id="prefix" bind:value={nsPrefix} />
		</div>
		<div class="field">
			<label for="op">Operation</label>
			<input id="op" bind:value={operation} />
		</div>
		<div class="field small">
			<label for="ver">SOAP</label>
			<select id="ver" bind:value={soapVersion}>
				<option value="1.1">1.1</option>
				<option value="1.2">1.2</option>
			</select>
		</div>
	</div>

	<div class="field">
		<label for="params">Parameters (key=value per line)</label>
		<textarea id="params" bind:value={paramsText}></textarea>
	</div>

	<div class="field grow">
		<div class="out-header">
			<label>SOAP Envelope</label>
			<button class="copy-btn" onclick={copy}>📋 Copy</button>
		</div>
		<textarea class="output" readonly value={output}></textarea>
	</div>
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.fields { display: flex; gap: var(--spacing-md); flex-wrap: wrap; }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); flex: 1; min-width: 140px; }
	.field.small { flex: 0 0 100px; min-width: 90px; }
	.field.grow { flex: 1; min-height: 0; }
	label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	input, select, textarea { padding: 8px 10px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-size: 0.85rem; }
	input, textarea { font-family: monospace; }
	textarea { min-height: 80px; resize: vertical; }
	input:focus, select:focus, textarea:focus { outline: none; border-color: var(--color-primary); }
	.out-header { display: flex; justify-content: space-between; align-items: center; }
	.copy-btn { background: var(--color-secondary); color: var(--color-text); border: 1px solid var(--color-border); padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
	.copy-btn:hover { background: var(--color-primary); color: white; }
	.output { flex: 1; min-height: 180px; color: var(--color-primary); }
</style>
