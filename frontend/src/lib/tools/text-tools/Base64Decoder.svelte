<script lang="ts">
	import EncoderDecoder from './EncoderDecoder.svelte';
</script>

<EncoderDecoder
	toolId="base64-decoder"
	toolName="Base64 Decoder"
	toolDescription="Decode Base64 to text"
	defaultEncoding="base64"
	supportedEncodings={['base64', 'base64url']}
	defaultMode="decode"
/>
