<script lang="ts">
	import { Tooltip, Button } from 'flowbite-svelte';
	import { copyToClipboard } from '$utils/copyToClipboard';
	import { FileCopyOutline } from 'flowbite-svelte-icons';

	export let text: string;
	let tooltipText = 'Copy to clipboard';

	async function handleCopy() {
		await copyToClipboard(text);
		tooltipText = 'Copied!';
		setTimeout(() => {
			tooltipText = 'Copy to clipboard';
		}, 2000); // Reset after 2 seconds
	}
</script>

<button on:click={handleCopy}>
	<FileCopyOutline class="text-gray-500 w-4 h-4" />
</button>
<Tooltip>
	<p>{tooltipText}</p>
</Tooltip>
