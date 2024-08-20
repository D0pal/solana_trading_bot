<script lang="ts">
	import BuyTab from '$components/trade/buy_tab/BuyTab.svelte';
	import { tradingService } from '$services/tradingService';
	import { loadingStore } from '$stores/loadingStore';
	import { tokenInfo } from '$stores/tokenStore';
	import { userInfo } from '$stores/userStore';
	import { Spinner, Tabs } from 'flowbite-svelte';
	import { buyTokenFormSchema, createBuyTokenFormWithDefaults } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	import { superForm } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import SellTab from './sell_tab/SellTab.svelte';
	import TokenFetcherInput from './shared/TokenFetcherInput.svelte';
	import TransactionSettings from './shared/TransactionSettings.svelte';
	import WalletSelector from './shared/WalletSelector.svelte';

	const defaultFormData = createBuyTokenFormWithDefaults($userInfo.settings);

	const { form, errors, enhance } = superForm(defaultFormData, {
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
					walletAddresses: form.data.walletAddresses,
					slippage: form.data.slippage,
					prioritizationFeeInSolana: form.data.prioritizationFeeInSolana,
					autoSell: form.data.autoSell,
					inputAmount: form.data.inputAmount
				});
			}
		}
	});
</script>

<form method="POST" use:enhance class="bg-gray-800 quicksand rounded-lg p-4 md:w-96 md:mx-auto">
	<TransactionSettings
		bind:prioritizationFeeInSolana={$form.prioritizationFeeInSolana}
		bind:slippage={$form.slippage}
	/>

	<WalletSelector bind:errors={$errors} bind:selectedWallets={$form.walletAddresses} />

	<TokenFetcherInput bind:tokenAddress={$form.tokenAddress} />

	{#if $tokenInfo.name !== ''}
		<Tabs
			tabStyle="full"
			contentClass="rounded-lg mt-4 bg-gray-800"
			defaultClass="flex bg-gray-700 rounded-lg quicksand"
		>
			<BuyTab bind:errors={$errors} bind:form={$form} />
			<SellTab />
		</Tabs>
	{:else if $loadingStore['fetchTokenInfo']}
		<div class="text-center"><Spinner /></div>
	{/if}
</form>
