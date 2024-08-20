<script lang="ts">
	import { PUBLIC_WSOL_ADDRESS } from '$env/static/public';
	import { loadingStore } from '$stores/loadingStore';
	import { tokenPricesInUSD } from '$stores/priceStore';
	import { tokenInfo } from '$stores/tokenStore';
	import { Spinner, TabItem } from 'flowbite-svelte';
	import { type BuyTokenFormSchema } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	import type { Infer, ValidationErrors } from 'sveltekit-superforms';
	import AutoSell from './auto_sell/AutoSell.svelte';
	import SwapInput from './SwapInput.svelte';

	export let form: Infer<BuyTokenFormSchema>;
	export let errors: ValidationErrors<Infer<BuyTokenFormSchema>>;

	$: outputSecondaryToken =
		form.inputAmount / $tokenPricesInUSD[$tokenInfo.address] / $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS];
</script>

<TabItem
	activeClasses="bg-[#008F00]"
	inactiveClasses="bg-gray-700"
	defaultClass="text-xl w-full h-full text-white font-bold rounded-lg h-10"
	class="w-full"
	open
>
	<span slot="title">Buy</span>
	<div class="w-full">
		<SwapInput bind:outputAmount={outputSecondaryToken} bind:inputAmount={form.inputAmount} bind:errors />
		<hr class="my-4 border-gray-600" />
		<AutoSell bind:form bind:errors />
		<button
			class="w-full rounded-lg py-2 !bg-[#35d0de] text-black text-lg mt-6 font-bold disabled:!bg-gray-500"
			disabled={$loadingStore['buyTokens']}
		>
			{#if $loadingStore['buyTokens']}
				<Spinner class="mr-3" size="4" color="white" />
			{/if}
			Place Order
		</button>
	</div>
</TabItem>

<!-- <iframe
	id="dextools-widget"
	title="DEXTools Trading Chart"
	width="500"
	height="400"
	src="https://www.dextools.io/widget-chart/en/solana/pe-light/25tXTutLkjtcUX3kqoeRvc7AuBYM7fckBWoVqnQnyDGQ?theme=light&chartType=2&chartResolution=30&drawingToolbars=true"
></iframe> -->
