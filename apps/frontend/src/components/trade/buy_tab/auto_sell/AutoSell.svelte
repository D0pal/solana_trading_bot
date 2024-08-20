<script lang="ts">
	import SimpleAutoSellStrategy from './simple/SimpleAutoSellStrategy.svelte';

	import { PUBLIC_WSOL_ADDRESS } from '$env/static/public';
	import { defaultGridStaticAutoSell, defaultSimpleAutoSell, initializeAutoSell } from '$lib/autoSellPresets';
	import { tokenPricesInUSD } from '$stores/priceStore';
	import { tokenInfo } from '$stores/tokenStore';
	import { TabItem, Tabs, Toggle } from 'flowbite-svelte';
	import {
		isGridStrategy,
		type AutoSellPreset,
		type BuyTokenFormSchema,
		type GridStrategy
	} from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	import type { Infer, ValidationErrors } from 'sveltekit-superforms';

	import { userService } from '$services/userService';
	import { userInfo } from '$stores/userStore';
	import GridAutoSellStrategy from './grid/GridAutoSellStrategy.svelte';
	import AutoSellPresets from './presets/AutoSellPresets.svelte';
	import SaveAutoSellPreset from './presets/SaveAutoSellPreset.svelte';

	export let form: Infer<BuyTokenFormSchema>;
	// eslint-disable-next-line svelte/valid-compile
	export let errors: ValidationErrors<Infer<BuyTokenFormSchema>>;

	$: outputSecondaryToken =
		form.inputAmount / $tokenPricesInUSD[$tokenInfo.address] / $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS];

	function selectPreset(preset: AutoSellPreset) {
		form.autoSell.strategy = preset.strategy;
	}

	function saveCurrentAsPreset(presetName: string) {
		userService.addAutoSellPreset({
			id: '',
			name: presetName,
			strategy: form.autoSell.strategy
		});
	}

	function handleGridStrategyChange(event: CustomEvent<GridStrategy>) {
		form.autoSell.strategy = event.detail;
	}

	function handleEditPreset(event: CustomEvent<AutoSellPreset>) {
		userService.editAutoSellPreset(event.detail);
	}

	function handleDeletePreset(event: CustomEvent<AutoSellPreset>) {
		userService.deleteAutoSellPreset(event.detail.id);
	}
</script>

<div class="flex justify-between mt-4 bg-gray-700 p-2 rounded-lg">
	<p class="text-white font-bold">Enable Auto Sell</p>
	<Toggle
		classDiv="peer-focus:ring-0 {form.autoSell.enabled ? '!bg-[#35d0de]' : '!bg-gray-500'}"
		bind:checked={form.autoSell.enabled}
		on:change={() => {
			if (form.autoSell.enabled) {
				form.autoSell.strategy = initializeAutoSell(defaultSimpleAutoSell);
			}
		}}
	/>
</div>
{#if form.autoSell.enabled}
	<Tabs contentClass="mt-4" defaultClass="flex" tabStyle="underline">
		<SimpleAutoSellStrategy bind:form bind:errors />

		<TabItem
			class="w-full"
			activeClasses="py-4 border-b-2 border-primary-600"
			inactiveClasses="py-4 text-gray-400"
			defaultClass="w-full"
			title="Grid Auto Sell"
			on:click={() => {
				form.autoSell.strategy = initializeAutoSell(defaultGridStaticAutoSell);
			}}
		>
			<div class="w-full mb-4 flex items-start space-x-2">
				<div class="w-full">
					<AutoSellPresets
						on:edit={handleEditPreset}
						on:delete={handleDeletePreset}
						presets={$userInfo.autoSellPresets}
						onSelectPreset={selectPreset}
					/>
				</div>
				<div class="w-1/12 h-12 flex items-center">
					<SaveAutoSellPreset onSavePreset={saveCurrentAsPreset} />
				</div>
			</div>

			{#if isGridStrategy(form.autoSell.strategy)}
				<GridAutoSellStrategy
					strategy={form.autoSell.strategy}
					inputAmount={form.inputAmount}
					outputAmount={outputSecondaryToken}
					on:change={handleGridStrategyChange}
				/>
			{/if}
		</TabItem>
	</Tabs>
{/if}
