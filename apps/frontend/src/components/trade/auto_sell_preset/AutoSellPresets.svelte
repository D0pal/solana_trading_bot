<script lang="ts">
	import { AccordionItem, Accordion, Modal } from 'flowbite-svelte';
	import type { AutoSellPreset, AutoSellStrategy } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	import AutoSellPresetItem from './AutoSellPresetItem.svelte';

	export let presets: AutoSellPreset[];
	export let onSelectPreset: (preset: AutoSellPreset) => void;

	let accordionOpen = false;
</script>

<Accordion class=" w-full">
	<AccordionItem bind:open={accordionOpen} paddingDefault="p-0" class="h-12 rounded-lg px-5">
		<span slot="header" class="text-white font-bold">Presets</span>
		{#each presets as preset (preset.name)}
			<AutoSellPresetItem
				on:edit
				on:delete
				{preset}
				onSelect={() => {
					onSelectPreset(preset);
					accordionOpen = false;
				}}
			/>
		{/each}
	</AccordionItem>
</Accordion>
