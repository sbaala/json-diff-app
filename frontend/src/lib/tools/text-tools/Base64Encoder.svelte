<script lang="ts">
	import EncoderDecoder from './EncoderDecoder.svelte';
</script>

<EncoderDecoder
	toolId="base64-encoder"
	toolName="Base64 Encoder"
	toolDescription="Encode/decode Base64"
	defaultEncoding="base64"
	supportedEncodings={['base64', 'base64url']}
/>
