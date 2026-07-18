<script lang="ts">
	import EncoderDecoder from './EncoderDecoder.svelte';
</script>

<EncoderDecoder
	toolId="url-encoder"
	toolName="URL Encoder"
	toolDescription="Encode/decode URLs and query parameters"
	defaultEncoding="url"
	supportedEncodings={['url', 'base64']}
/>
