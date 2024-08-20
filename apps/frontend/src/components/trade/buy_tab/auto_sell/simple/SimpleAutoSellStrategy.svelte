<script lang="ts">
	import { defaultSimpleAutoSell, initializeAutoSell } from '$lib/autoSellPresets';
	import { Label, TabItem } from 'flowbite-svelte';
	import { isSimpleAutoSell, type BuyTokenFormSchema } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	import type { Infer, ValidationErrors } from 'sveltekit-superforms';

	import NumberInput from '$components/common/NumberInput.svelte';

	export let form: Infer<BuyTokenFormSchema>;
	// eslint-disable-next-line svelte/valid-compile
	export let errors: ValidationErrors<Infer<BuyTokenFormSchema>>;
</script>

<TabItem
	class="w-full"
	activeClasses="py-4 border-b-2 border-primary-600"
	inactiveClasses="py-4 text-gray-400"
	defaultClass="w-full"
	open
	title="Simple Auto Sell"
	on:click={() => {
		form.autoSell.strategy = initializeAutoSell(defaultSimpleAutoSell);
	}}
>
	{#if isSimpleAutoSell(form.autoSell.strategy)}
		<div class="flex">
			<div class="mr-2">
				<Label for="first_name" class="mb-2">Profit Percentage</Label>
				<NumberInput
					id="slppage"
					size="sm"
					class="text-right pe-6"
					required
					bind:value={form.autoSell.strategy.profitPercentage}
				>
					<p slot="right">%</p>
				</NumberInput>
				<p class="text-gray-400 text-sm mt-1 font-semibold text-right">
					Profit: <span class="text-white"
						>{parseFloat(((form.inputAmount * form.autoSell.strategy.profitPercentage) / 100).toFixed(4))} SOL</span
					>
				</p>
			</div>
			<div class="ml-2">
				<Label for="last_name" class="mb-2">Loss Percentage</Label>

				<NumberInput
					id="slppage"
					size="sm"
					class="text-right pe-6"
					required
					bind:value={form.autoSell.strategy.stopLossPercentage}
				>
					<p slot="right">%</p>
				</NumberInput>
				<p class="text-gray-400 text-sm mt-1 font-semibold text-right">
					Loss: <span class="text-white"
						>{parseFloat(((form.inputAmount * form.autoSell.strategy.stopLossPercentage) / 100).toFixed(4))} SOL</span
					>
				</p>
			</div>
		</div>
	{/if}
</TabItem>
