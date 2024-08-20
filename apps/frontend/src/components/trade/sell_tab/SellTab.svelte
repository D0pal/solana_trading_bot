<!-- <script lang="ts">
	import { Label, Input, InputAddon, ButtonGroup } from 'flowbite-svelte';
	import { ArrowUpDown } from 'lucide-svelte';
	import { Button } from 'flowbite-svelte';
	import { tokenInfo } from '$stores/tokenStore';
	import { tokenPricesInUSD } from '$stores/priceStore';
	import { PUBLIC_WSOL_ADDRESS } from '$env/static/public';
	import TokenInformationModal from './TokenInformationModal.svelte';
	import { InfoCircleOutline } from 'flowbite-svelte-icons';
	import { formatNumber } from '$utils/formatters';

	// export let form: Infer<BuyTokenFormSchema>;
	// export let errors: ValidationErrors<Infer<BuyTokenFormSchema>>;

	// $: inputTokenAmount = formData.inputAmount;
	// $: oneSolPriceInUsd = $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS];
	// $: oneSecondaryTokenInSol = $tokenPricesInUSD[$tokenInfo.address] / $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS];
	// $: outputSolana = inputTokenAmount * oneSecondaryTokenInSol;

	// function onInputTokenChange(e: Event) {
	// 	const target = e.target as HTMLInputElement;
	// 	const value = parseFloat(target.value) || 0;
	// 	updateFormData('inputAmount', value);
	// }
</script>

<div class="w-full">
	<div>
		<Label for="input-addon" class="font-bold">You're Selling</Label>
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
			<div class="bg-gray-700">
				<Input
					id="input-addon"
					type="number"
					class="focus:!ring-0 !text-white !font-bold text-right text-lg !border-0"
					placeholder="0.00"
					value={inputTokenAmount}
					on:input={onInputTokenChange}
				/>
				<p class="text-gray-400 pr-2.5 -mt-2 mb-1 text-xs font-semibold text-right">
					≈ <span class="">${(inputTokenAmount * $tokenPricesInUSD[$tokenInfo.address]).toFixed(2)}</span>
				</p>
			</div>
			<Button class="!bg-[#35d0de] !text-black font-bold">MAX</Button>
		</ButtonGroup>
	</div>

	<ArrowUpDown class="w-6 h-6 mx-auto mt-4 -mb-2 text-white" />

	<div>
		<Label for="output-addon" class="mb-2 font-bold">To Receive</Label>
		<ButtonGroup class="w-full">
			<InputAddon class="pr-2">
				<div class="w-6 h-6">
					<img src="/solana-logo.png" class="rounded-full object-cover" alt="Solana" />
				</div>
			</InputAddon>
			<InputAddon class="pl-0 quicksand !text-white !font-bold">SOL</InputAddon>
			<Input
				id="output-addon"
				type="number"
				class="focus:!ring-0 !text-white !font-bold text-right text-lg !border-0"
				placeholder=""
				value={outputSolana}
				readonly
			/>
		</ButtonGroup>
		<p class="text-gray-400 text-sm mt-1 font-semibold text-right">
			1 {$tokenInfo.symbol} ≈ {formatNumber(parseFloat(oneSecondaryTokenInSol.toFixed(8)))} SOL
		</p>
	</div>
</div> -->
