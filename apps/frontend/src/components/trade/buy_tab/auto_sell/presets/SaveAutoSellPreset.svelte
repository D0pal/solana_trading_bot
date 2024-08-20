<script lang="ts">
	import { Modal, Label, Button, Input, Spinner } from 'flowbite-svelte';
	import { Save } from 'lucide-svelte';
	import { loadingStore } from '$stores/loadingStore';

	export let onSavePreset: (presetName: string) => void;
	let saveModal = false;
	let presetName = '';

	$: isLoading = $loadingStore['addAutoSellPreset'];

	let wasLoading = false;

	$: if (wasLoading && !isLoading) {
		handleClose();
		wasLoading = false;
	}

	$: if (isLoading) {
		wasLoading = true;
	}

	function handleClose() {
		saveModal = false;
		presetName = '';
	}
</script>

<button on:click={() => (saveModal = true)} type="button" class="flex items-center">
	<Save size="28" color="#35d0de" class="font-bold text-white">Save Preset</Save>
</button>

<Modal bind:open={saveModal} size="xs" autoclose={false} class="w-full">
	<div class="flex flex-col space-y-6">
		<h3 class="mb-4 text-xl font-medium text-gray-900 dark:text-white">Save Auto Sell Preset</h3>
		<Label class="space-y-2">
			<span>Preset Name</span>
			<Input bind:value={presetName} type="text" name="name" placeholder="Enter the name for the preset..." required />
		</Label>
		<Button
			on:click={() => {
				onSavePreset(presetName);
			}}
			class="w-full"
			disabled={isLoading}
		>
			{#if isLoading}
				<Spinner class="mr-3" size="4" color="white" />
			{/if}
			Save Preset
		</Button>
	</div>
</Modal>
