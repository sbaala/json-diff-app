<script lang="ts">
	import EncoderDecoder from './EncoderDecoder.svelte';
</script>

<EncoderDecoder
	toolId="unicode-converter"
	toolName="Unicode Converter"
	toolDescription="Convert between Unicode and character representations"
	defaultEncoding="unicode"
	supportedEncodings={['unicode', 'hex']}
/>
