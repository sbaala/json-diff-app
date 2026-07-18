<script lang="ts">
	import EncoderDecoder from './EncoderDecoder.svelte';
</script>

<EncoderDecoder
	toolId="html-encoder"
	toolName="HTML Entity Encoder"
	toolDescription="Encode/decode HTML entities"
	defaultEncoding="html"
	supportedEncodings={['html']}
/>
