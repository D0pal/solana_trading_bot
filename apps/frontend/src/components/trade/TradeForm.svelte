<script lang="ts">
	import WalletSelector from './WalletSelector.svelte';

	import { buyTokenFormSchema, type BuyTokenDto } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	import BuyTradeForm from '$components/trade/BuyTradeForm.svelte';
	import { Tabs, TabItem } from 'flowbite-svelte';
	import { Input, Label, Button } from 'flowbite-svelte';
	import { SearchOutline, FileCopyOutline } from 'flowbite-svelte-icons';
	import { AccordionItem, Accordion, Modal, Spinner } from 'flowbite-svelte';
	import { tokenInfo } from '$stores/tokenStore';
	import { tokenService } from '$services/tokenService';
	import { superForm, defaults } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import { tradingService } from '$services/tradingService';
	import NumberInput from '$components/common/NumberInput.svelte';

	const buyTokenForm = defaults(valibot(buyTokenFormSchema));

	const { form, errors, enhance } = superForm(buyTokenForm, {
		SPA: true,
		dataType: 'json',
		validators: valibot(buyTokenFormSchema),
		onUpdate({ form }) {
			console.log(form.data);
			console.log(form.valid);
			console.log(form.errors);
			if (form.valid) {
				tradingService.buyTokens({
					tokenAddress: form.data.tokenAddress,
					walletAddress: form.data.walletAddress,
					slippage: form.data.slippage,
					prioritizationFeeLamports: 103928,
					autoSell: form.data.autoSell,
					inputAmount: form.data.inputAmount
				});
			}
		}
	});

	let slippageModal = false;

	function searchTokenInputChanged(e: Event) {
		tokenService.reset();

		const target = e.target as HTMLInputElement;
		const tokenAddress = target.value;
		console.log(tokenAddress.length);
		if (tokenAddress.length >= 40) {
			tokenService.fetchTokenInfo(tokenAddress);
		}
	}
</script>

<form method="POST" use:enhance class="bg-gray-800 quicksand rounded-lg p-4 md:w-96 md:mx-auto">
	<div class="flex justify-between items-center mb-4 form-padding">
		<h2 class="text-2xl pl-5 text-white font-bold text-center">Trade</h2>
		<button
			type="button"
			class="bg-gray-600 text-white text-sm px-2 rounded-lg font-semibold"
			on:click={() => (slippageModal = true)}>Slippage: {$form.slippage}%</button
		>
	</div>

	<WalletSelector bind:errors={$errors} bind:walletAddress={$form.walletAddress}></WalletSelector>
	<Input
		id="search"
		on:input={searchTokenInputChanged}
		bind:value={$form.tokenAddress}
		class="!bg-gray-700 my-6 "
		placeholder="Paste token address"
		size="lg"
	>
		<SearchOutline slot="left" class="w-6 h-6 text-gray-500  dark:text-gray-400" />
	</Input>
	{#if $tokenInfo.name !== ''}
		<Tabs
			tabStyle="full"
			contentClass="rounded-lg mt-4 bg-gray-800"
			defaultClass="flex bg-gray-700 rounded-lg quicksand"
		>
			<TabItem
				activeClasses="bg-[#008F00]"
				inactiveClasses="bg-gray-700"
				defaultClass="text-xl w-full h-full text-white font-bold rounded-lg h-10"
				class="w-full"
				open
			>
				<span slot="title">Buy</span>
				<BuyTradeForm bind:errors={$errors} bind:form={$form} />
			</TabItem>
			<TabItem
				activeClasses="bg-[#B30000]"
				inactiveClasses="bg-gray-700"
				defaultClass="text-xl w-full h-full text-white font-bold rounded-lg h-10"
				class="w-full"
			>
				<span slot="title">Sell</span>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					<b>Dashboard:</b>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna
					aliqua.
				</p>
			</TabItem>
		</Tabs>
	{:else if tokenService.loading}
		<div class="text-center"><Spinner /></div>
	{/if}
</form>

<Modal title="Swap Slippage Tolerance" bind:open={slippageModal} autoclose>
	<div class="flex items-center justify-between">
		<div class="w-3/4">
			<p>Custom slippage</p>
		</div>
		<div class="w-1/4">
			<NumberInput id="slppage" size="sm" class="text-right pe-6 ps-0" required bind:value={$form.slippage}>
				<p slot="right">%</p>
			</NumberInput>
		</div>
	</div>
	<Button class="w-full !bg-[#35d0de] text-black font-bold">Save</Button>
</Modal>
