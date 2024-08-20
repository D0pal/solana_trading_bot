<script lang="ts">
	import { PUBLIC_WSOL_ADDRESS } from '$env/static/public';
	import { tokenPricesInUSD } from '$stores/priceStore';
	import { tokenInfo } from '$stores/tokenStore';
	import { formatNumber } from '$utils/formatters';
	import { Button, ButtonGroup, Helper, Input, InputAddon, Label } from 'flowbite-svelte';
	import { InfoCircleOutline } from 'flowbite-svelte-icons';
	import { ArrowUpDown } from 'lucide-svelte';
	import { type BuyTokenFormSchema } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	import type { Infer, ValidationErrors } from 'sveltekit-superforms';
	import TokenInformationModal from '../shared/TokenInformationModal.svelte';

	import NumberInput from '$components/common/NumberInput.svelte';

	export let inputAmount: number;
	export let outputAmount: number;
	export let errors: ValidationErrors<Infer<BuyTokenFormSchema>>;

	const oneSolPriceInUsd = $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS]; // Use the store value
	$: oneSolInSecondaryToken = $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS] / $tokenPricesInUSD[$tokenInfo.address]; // Calculated from store value

	const solInputPresets = [0.1, 0.5, 1, 10];

	function formatValue(value: number): string | undefined {
		return value === 0 ? undefined : value.toString();
	}
</script>

<div>
	<div class="flex justify-between items-center mb-2">
		<Label for="input-addon" class="font-bold">You're Paying</Label>
	</div>

	<ButtonGroup class="w-full">
		<InputAddon class="pr-2">
			<div class="w-6 h-6">
				<img src="/solana-logo.png" class="rounded-full object-cover" alt="Solana" />
			</div>
		</InputAddon>
		<InputAddon class="pl-0 quicksand !text-white !font-bold">SOL</InputAddon>
		<div class="bg-gray-700">
			<NumberInput
				id="input-addon"
				class="focus:!ring-0 !text-white !font-bold text-right text-lg !border-0 z-0"
				placeholder="0.00"
				min={0.0000001}
				step={0.0000001}
				bind:value={inputAmount}
				aria-invalid={errors.inputAmount ? 'true' : undefined}
			/>

			<div class="z-10 relative">
				<p class="text-gray-400 pr-2.5 -mt-2 mb-1 text-xs font-semibold text-right z-10">
					≈ <span class="">${(inputAmount * oneSolPriceInUsd).toFixed(2)}</span>
				</p>
			</div>
		</div>

		<Button class="!bg-[#35d0de] !text-black font-bold">MAX</Button>
	</ButtonGroup>
	{#if errors.inputAmount}
		<Helper class="mt-2" color="red">
			{errors.inputAmount}
		</Helper>
	{/if}
	<div class="flex justify-between mt-3">
		{#each solInputPresets as preset}
			<button
				class="!bg-gray-700 w-full mr-2 last-of-type:mr-0 py-1 rounded-lg text-base !text-white !font-bold"
				type="button"
				on:click={() => (inputAmount = preset)}>{preset} SOL</button
			>
		{/each}
	</div>
</div>
<ArrowUpDown class="w-6 h-6 mx-auto mt-4 -mb-2 text-white" />
<div>
	<Label for="input-addon" class="mb-2 font-bold">To Receive</Label>
	<ButtonGroup class="w-full">
		<TokenInformationModal class="flex !rounded-r-none">
			<InputAddon class="pr-2">
				<div class="w-6 h-6">
					<img src={$tokenInfo.image} class="rounded-full object-cover" alt={$tokenInfo.name} />
				</div>
			</InputAddon>
			<InputAddon class="pl-0 quicksand !rounded-r-none !text-white !font-bold"
				>{$tokenInfo.symbol} <InfoCircleOutline class="ml-1 w-4 h-4 text-gray-400" />
			</InputAddon>
		</TokenInformationModal>
		<Input
			id="input-addon"
			type="number"
			class="focus:!ring-0 !text-white !font-bold text-right text-lg !border-0"
			placeholder=""
			min="0.00000001"
			step="0.00000001"
			value={formatValue(outputAmount)}
			readonly
		/>
	</ButtonGroup>
	<p class="text-gray-400 text-sm mt-1 font-semibold text-right">
		1 SOL ≈ {formatNumber(parseFloat(oneSolInSecondaryToken.toFixed(2)))}
		{$tokenInfo.symbol}
	</p>
</div>
