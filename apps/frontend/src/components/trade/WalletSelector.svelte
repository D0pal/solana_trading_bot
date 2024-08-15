<script lang="ts">
	import { FileCopyOutline } from 'flowbite-svelte-icons';
	import { AccordionItem, Accordion, Modal } from 'flowbite-svelte';
	import { TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, TableSearch } from 'flowbite-svelte';
	import { copyToClipboard } from '$utils/copyToClipboard';
	import { userInfo } from '$stores/userStore';
	import { Radio } from 'flowbite-svelte';
	import type { BuyTokenFormSchema } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	import type { ValidationErrors, Infer } from 'sveltekit-superforms';

	export let walletAddress: string;
	export let errors: ValidationErrors<Infer<BuyTokenFormSchema>>;

	$: wallets = $userInfo.wallets.map((wallet) => ({
		...wallet,
		checked: false,
		modalOpen: false,
		searchTerm: '',
		tokenHoldings: []
	}));

	$: filteredTokenHoldings = (
		/** @type {{ tokenHoldings: any[]; searchTerm: string; }} */ wallet: { tokenHoldings: any[]; searchTerm: string }
	) => {
		return wallet.tokenHoldings.filter((token: { name: string }) =>
			token.name.toLowerCase().includes(wallet.searchTerm.toLowerCase())
		);
	};

	let isAccordionOpen = false;

	$: if (errors.walletAddress) {
		isAccordionOpen = true;
	}
</script>

<Accordion>
	<AccordionItem bind:open={isAccordionOpen} paddingDefault="p-0" class="h-12 rounded-lg px-5">
		<span slot="header" class="text-white font-bold">Wallets</span>
		{#each wallets as wallet}
			<div class="flex p-2 justify-between w-full">
				<Radio
					name="wallets"
					value={wallet.address}
					bind:group={walletAddress}
					class="p-1 text-[#35d0de] focus:ring-0"
					aria-invalid={errors.walletAddress}
				/>
				<div class="flex w-full items-center justify-between">
					<div class="flex items-center">
						<p class="text-white font-bold">
							{wallet.name.length > 5 ? `${wallet.name.substring(0, 5)}..` : wallet.name}
						</p>

						<p class="ml-1 flex items-center">
							(<button on:click={() => copyToClipboard(wallet.address)} class="">
								<FileCopyOutline class="w-4 h-4 text-gray-500 hover:!text-white" />
							</button>{wallet.address.length > 4 ? `${wallet.address.substring(0, 4)}..` : wallet.address})
						</p>

						<p class="text-white font-bold text-sm ml-2">{parseFloat(wallet.solBalance.toFixed(4))} SOL</p>
					</div>
				</div>
				<button
					class=" px-2 py-1 bg-[#35d0de] text-sm rounded-lg text-black font-bold"
					type="button"
					on:click={() => (wallet.modalOpen = true)}>View</button
				>
			</div>
			<Modal title="Token Holdings" bind:open={wallet.modalOpen} autoclose outsideclose={true}>
				<div class="flex items-center justify-center">
					<p>Wallet:</p>
					<p class="text-white ml-2 font-bold">
						{wallet.name.length > 5 ? `${wallet.name.substring(0, 5)}...` : wallet.name}
					</p>
					<p class="ml-1 flex items-center text-gray-400">
						(<button on:click={() => copyToClipboard(wallet.address)} class="">
							<FileCopyOutline class="w-4 h-4 text-gray-500 hover:!text-white" />
						</button>{wallet.address.length > 5 ? `${wallet.address.substring(0, 5)}...` : wallet.address})
					</p>
					<p class="text-white font-bold ml-2">- {parseFloat(wallet.solBalance.toFixed(4))} SOL</p>
				</div>
				<TableSearch
					inputClass="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 ps-10 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="Search by token name"
					hoverable={true}
					bind:inputValue={wallet.searchTerm}
				>
					<TableHead>
						<TableHeadCell>Token</TableHeadCell>
						<TableHeadCell>Balance</TableHeadCell>
					</TableHead>
					<TableBody tableBodyClass="divide-y">
						{#each filteredTokenHoldings(wallet) as token}
							<TableBodyRow>
								<TableBodyCell class="pr-0">
									<div class="text-white flex items-center">
										<p class="font-bold">{token.name}</p>
										<span class="flex ml-1 text-gray-400 items-center">
											(<button on:click={() => copyToClipboard(wallet.address)} class="">
												<FileCopyOutline class="w-4 h-4 text-gray-500 hover:!text-white" />
											</button>{token.address.length > 5 ? `${token.address.substring(0, 5)}...` : token.address})
										</span>
									</div>
								</TableBodyCell>
								<TableBodyCell>{token.balance}</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</TableSearch>
			</Modal>
		{/each}
		{#if errors.walletAddress}
			<p class="text-red-500 text-sm text-center pb-2">{errors.walletAddress[0]}</p>
		{/if}
	</AccordionItem>
</Accordion>
