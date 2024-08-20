<script lang="ts">
	import CopyToClipboard from '$components/common/CopyToClipboard.svelte';
	import { walletsService } from '$services/walletsService';
	import { loadingStore } from '$stores/loadingStore';
	import { userInfo } from '$stores/userStore';
	import { formatNumber } from '$utils/formatters';
	import { Button, Input, Label, Modal, Spinner } from 'flowbite-svelte';
	import { Download, Plus, Send, Trash2 } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let createWalletModal = false;
	let newWalletName = '';
	let transferModal = false;
	let selectedWallet: string | null = null;
	let transferAmount: number | null = null;
	let recipientAddress = '';

	onMount(() => {
		walletsService.refreshWallets();
		console.log($userInfo.wallets);
	});

	async function createNewWallet() {
		if (newWalletName.trim()) {
			await walletsService.createWallet(newWalletName);
			createWalletModal = false;
			newWalletName = '';
		}
	}

	async function deleteWallet(address: string) {
		if (confirm('Are you sure you want to delete this wallet?')) {
			await walletsService.deleteWallet(address);
		}
	}

	async function transferFunds() {
		if (selectedWallet && transferAmount && recipientAddress) {
			await walletsService.transferFunds(selectedWallet, recipientAddress, transferAmount);
			transferModal = false;
			selectedWallet = null;
			transferAmount = null;
			recipientAddress = '';
		}
	}

	async function exportPrivateKey(address: string) {
		const privateKey = await walletsService.exportPrivateKey(address);
		console.log(privateKey);
		// Handle the private key (e.g., display it in a modal or allow download)
	}
</script>

<div class="p-4">
	<h1 class="text-2xl font-bold mb-4 text-white">Wallet Management</h1>

	<Button on:click={() => (createWalletModal = true)} class="mb-4">
		<Plus class="mr-2" />
		Create New Wallet
	</Button>
	{#if $loadingStore['refreshWallets'] || $userInfo.wallets === null}
		<div class="text-center"><Spinner /></div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each $userInfo.wallets as wallet}
				<div class="bg-gray-800 p-4 rounded-lg">
					<h2 class="text-lg font-semibold mb-2 text-white">{wallet.name}</h2>
					<p class="text-sm mb-2 text-gray-400">
						Address: {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
						<CopyToClipboard text={wallet.address} />
					</p>
					<p class="text-lg font-bold mb-4 text-white">{formatNumber(wallet.solBalance, 5)} SOL</p>
					<div class="flex space-x-2">
						<Button
							size="sm"
							color="light"
							on:click={() => {
								selectedWallet = wallet.address;
								transferModal = true;
							}}
						>
							<Send class="mr-2" size={16} />
							Transfer
						</Button>
						<Button size="sm" color="light" on:click={() => exportPrivateKey(wallet.address)}>
							<Download class="mr-2" size={16} />
							Export
						</Button>
						<Button color="red" size="sm" on:click={() => deleteWallet(wallet.address)}>
							<Trash2 size={16} />
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<Modal bind:open={createWalletModal} title="Create New Wallet">
	<Label for="walletName">Wallet Name</Label>
	<Input id="walletName" bind:value={newWalletName} placeholder="Enter wallet name" />
	<Button on:click={createNewWallet} class="mt-4">Create Wallet</Button>
</Modal>

<Modal bind:open={transferModal} title="Transfer Funds">
	<Label for="amount">Amount (SOL)</Label>
	<Input id="amount" type="number" bind:value={transferAmount} placeholder="Enter amount to transfer" />
	<Label for="recipient" class="mt-4">Recipient Address</Label>
	<Input id="recipient" bind:value={recipientAddress} placeholder="Enter recipient address" />
	<Button on:click={transferFunds} class="mt-4">Transfer</Button>
</Modal>
