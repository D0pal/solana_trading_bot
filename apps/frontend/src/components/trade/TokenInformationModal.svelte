<script lang="ts">
	import {
		Button,
		Modal,
		Progressbar,
		Tabs,
		TabItem,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Card
	} from 'flowbite-svelte';
	import { tokenInfo } from '$stores/tokenStore';
	import { formatNumber, formatUSD, formatPercentage } from '$utils/formatters';
	import { ArrowUpRightFromSquareOutline, CheckOutline, CloseOutline } from 'flowbite-svelte-icons';
	import { X, Telegram, Discord } from 'svelte-simples';
	import { Globe, Crown } from 'lucide-svelte';
	import CopyToClipboard from '$components/common/CopyToClipboard.svelte';
	import { tokenPricesInUSD } from '$stores/priceStore';

	export let open = false;

	function accountAddressToKnownName(address: string) {
		const knownAccounts: Record<string, string> = {
			'5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1': 'Raydium'
		};
		return knownAccounts[address] || `${address.slice(0, 4)}...${address.slice(-4)}`;
	}

	$: transactions = $tokenInfo.transactions.sort((a, b) => {
		const order = ['5m', '1h', '6h', '24h'];
		return order.indexOf(a.time) - order.indexOf(b.time);
	});

	$: createdOnPumpFun = $tokenInfo.socialMediaLinks.find((link) => link.platform === 'PumpFun');
</script>

<button type="button" class={$$props.class} on:click={() => (open = true)}>
	<slot />
</button>

<Modal headerClass="p-0" classBody="p-0" outsideclose bind:open size="xl" class="w-full">
	<div class="p-4 !mt-0 bg-gray-900 text-white">
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center space-x-2">
				<img src={$tokenInfo.image} alt={$tokenInfo.name} class="w-8 h-8 rounded-full" />
				<h2 class="text-base font-bold">{$tokenInfo.name} ({$tokenInfo.symbol})</h2>
			</div>
		</div>
		<Tabs contentClass="p-4 bg-gray-50 rounded-lg rounded-t-none dark:bg-gray-800 !mt-0" style="pills">
			<TabItem open title="Info">
				<div class="space-y-2">
					<div class="flex justify-between items-center !mt-0 py-3 border-b border-gray-700">
						<span class="text-sm text-gray-400">Address:</span>
						<span class="text-right">
							<a
								href={`https://solscan.io/token/${$tokenInfo.address}`}
								target="_blank"
								rel="noopener noreferrer"
								class="text-blue-500 hover:underline ml-2 inline-flex items-center"
							>
								{$tokenInfo.address.slice(0, 8)}...{$tokenInfo.address.slice(-4)}
							</a>
						</span>
					</div>
					<div class="flex justify-between items-center !mt-0 py-3 border-b border-gray-700">
						<span class="text-sm text-gray-400">Total Supply:</span>
						<span>{formatNumber($tokenInfo.totalSupply / 10 ** $tokenInfo.decimals)}</span>
					</div>
					<div class="flex justify-between items-center !mt-0 py-3 border-b border-gray-700">
						<span class="text-sm text-gray-400">Total Supply Value:</span>
						<span
							>{formatUSD(
								($tokenInfo.totalSupply / 10 ** $tokenInfo.decimals) * $tokenPricesInUSD[$tokenInfo.address]
							)}</span
						>
					</div>
					<!-- <div class="flex justify-between items-center !mt-0 py-3 border-b border-gray-700">
						<span class="text-sm text-gray-400">Unique Holders:</span>
						<span>{formatNumber($tokenInfo.uniqueHolders)}</span>
					</div> -->
					<div class="flex justify-between items-center !mt-0 py-3 border-b border-gray-700">
						<span class="text-sm text-gray-400">Total Liquidity:</span>
						<span>{formatUSD($tokenInfo.totalLiquidtyInUSD)}</span>
					</div>
					<div class="flex justify-between items-center !mt-0 py-3 border-b border-gray-700">
						<span class="text-sm text-gray-400">Mint Authority:</span>
						{#if $tokenInfo.mintAuthority}
							<span class="text-red-500 flex items-center">
								<CloseOutline class="w-4 h-4 mr-1" /> Yes
							</span>
						{:else}
							<span class="text-green-500 flex items-center">
								<CheckOutline class="w-4 h-4 mr-1" /> None
							</span>
						{/if}
					</div>
					<div class="flex justify-between items-center !mt-0 py-3 border-b border-gray-700">
						<span class="text-sm text-gray-400">Freeze Authority:</span>
						{#if $tokenInfo.freezeAuthority}
							<span class="text-red-500 flex items-center">
								<CloseOutline class="w-4 h-4 mr-1" /> Yes
							</span>
						{:else}
							<span class="text-green-500 flex items-center">
								<CheckOutline class="w-4 h-4 mr-1" /> None
							</span>
						{/if}
					</div>
					<div class="flex justify-between items-center !mt-0 py-3 border-b border-gray-700">
						<span class="text-sm text-gray-400">Update Authority:</span>
						{#if $tokenInfo.metadataChangeAuthority}
							<a
								href={`https://solscan.io/address/${$tokenInfo.metadataChangeAuthority}`}
								target="_blank"
								rel="noopener noreferrer"
								class="text-blue-500 hover:underline ml-2 inline-flex items-center"
							>
								<span>
									{$tokenInfo.metadataChangeAuthority.slice(0, 4)}...{$tokenInfo.metadataChangeAuthority.slice(-4)}
								</span>
							</a>
						{:else}
							<span class="text-green-500 flex items-center">
								<CheckOutline class="w-4 h-4 mr-1" /> None
							</span>
						{/if}
					</div>
					<div class="flex justify-between items-center !mt-0 py-3 border-b border-gray-700">
						<span class="text-sm text-gray-400">Created on Pump.Fun:</span>
						<span> {createdOnPumpFun ? 'Yes' : 'No'} </span>
					</div>
					<!-- <div class="flex justify-between items-center !mt-0 py-3 border-b border-gray-700">
						<span class="text-sm text-gray-400">Trading Platforms:</span>
						<span>{$tokenInfo.dexesBeingTradedOn.join(', ')}</span>
					</div> -->
					{#if $tokenInfo.socialMediaLinks.length > 0}
						<div class="flex justify-between items-center !mt-0 py-3 border-gray-700">
							<span class="text-sm text-gray-400">URLs:</span>
							<div class="flex space-x-2">
								{#each $tokenInfo.socialMediaLinks as link}
									<a
										href={link.url}
										target="_blank"
										rel="noopener noreferrer"
										class="text-blue-400 hover:text-blue-300"
									>
										{#if link.platform === 'Twitter'}
											<X size="20" />
										{:else if link.platform === 'Telegram'}
											<Telegram size="20" />
										{:else if link.platform === 'Discord'}
											<Discord size="20" />
										{:else if link.platform != 'PumpFun'}
											<Globe size="20" />
										{/if}
									</a>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</TabItem>
			<TabItem title="Holders">
				<div class="space-y-4">
					<div>
						<h4 class="font-semibold mb-2">Top Holders Distribution</h4>
						<div class="space-y-2">
							<div class="flex text-sm text-gray-400 justify-between">
								<span>Top 5 Holders</span>
								<span>{formatPercentage($tokenInfo.topHoldersTokenSupplyDistribution.top5)}</span>
							</div>
							<Progressbar progress={$tokenInfo.topHoldersTokenSupplyDistribution.top5} size="h-2" color="blue" />
							<div class="flex text-sm text-gray-400 justify-between">
								<span>Top 10 Holders</span>
								<span>{formatPercentage($tokenInfo.topHoldersTokenSupplyDistribution.top10)}</span>
							</div>
							<Progressbar progress={$tokenInfo.topHoldersTokenSupplyDistribution.top10} size="h-2" color="green" />
							<div class="flex text-sm text-gray-400 justify-between">
								<span>Top 20 Holders</span>
								<span>{formatPercentage($tokenInfo.topHoldersTokenSupplyDistribution.top20)}</span>
							</div>
							<Progressbar progress={$tokenInfo.topHoldersTokenSupplyDistribution.top20} size="h-2" color="yellow" />
						</div>
					</div>
					<div>
						<h2 class="font-semibold mb-2">Top 20 Holders</h2>
						<Table>
							<TableHead>
								<TableHeadCell class="text-center px-2">No</TableHeadCell>
								<TableHeadCell>Address</TableHeadCell>
								<TableHeadCell class="text-right pr-2">%</TableHeadCell>
							</TableHead>
							<TableBody tableBodyClass="divide-y">
								{#each $tokenInfo.topHolders as holder, index}
									<TableBodyRow>
										{#if index === 0}
											<TableBodyCell class="text-center px-2"><Crown class="w-4 h-4 text-[#ffc619]" /></TableBodyCell>
										{:else if index === 1}
											<TableBodyCell class="text-center px-2"><Crown class="w-4 h-4 text-[#e5e0d1]" /></TableBodyCell>
										{:else if index === 2}
											<TableBodyCell class="text-center px-2"><Crown class="w-4 h-4 text-[#f6c2a8]" /></TableBodyCell>
										{:else}
											<TableBodyCell class="text-center px-2">{index + 1}</TableBodyCell>
										{/if}
										<TableBodyCell class="flex items-center">
											<CopyToClipboard text={holder.address} />
											<a
												href={`https://solscan.io/address/${holder.address}`}
												target="_blank"
												rel="noopener noreferrer"
												class="text-blue-500 hover:underline ml-1"
											>
												{accountAddressToKnownName(holder.address)}
											</a>
										</TableBodyCell>
										<TableBodyCell class="text-right pr-2"
											>{formatPercentage(holder.percentageOfTotalSupply)}</TableBodyCell
										>
									</TableBodyRow>
								{/each}
							</TableBody>
						</Table>
					</div>
				</div>
			</TabItem>
			<!-- <TabItem title="Transactions">
				<div class="space-y-4">
					<h4 class="font-semibold mb-2">Transaction Data</h4>

					<div class="md:hidden space-y-4">
						{#each transactions as tx}
							<Card>
								<h5 class="mb-2 text-lg font-bold">{tx.time} Data</h5>
								<div class="grid grid-cols-2 gap-2 text-sm">
									<div>Transactions: {tx.txCount}</div>
									<div>Volume: {formatNumber(tx.volume)} {$tokenInfo.symbol}</div>
									<div>Volume (USD): {formatUSD(tx.volumeInUSD)}</div>
									<div>Unique Wallets: {tx.uniqueWallets}</div>
									<div>Buys: {tx.buys}</div>
									<div>Sells: {tx.sells}</div>
									<div class="bg-gray-800 p-3 rounded">
										<div class="text-gray-400 text-xs">VOLUME</div>
										<div class="text-white text-2xl font-bold">{formatUSD(tx.volumeInUSD)}</div>
										<div class="flex justify-between text-sm">
											<span class="text-green-400">{formatUSD(tx.buyVolumeInUSD)}</span>
											<span class="text-red-400">{formatUSD(tx.sellVolumeInUSD)}</span>
										</div>
										<div class="w-full bg-gray-700 rounded-full h-1.5 mt-1">
											<div
												class="bg-green-400 h-1.5 rounded-full"
												style="width: {(tx.buyVolumeInUSD / tx.volumeInUSD) * 100}%"
											></div>
										</div>
									</div>
								</div>
							</Card>
						{/each}
					</div>

					<div class="hidden md:block">
						<Table>
							<TableHead>
								<TableHeadCell>Time</TableHeadCell>
								<TableHeadCell>Transactions</TableHeadCell>
								<TableHeadCell>Volume</TableHeadCell>
								<TableHeadCell>Volume (USD)</TableHeadCell>
								<TableHeadCell>Buys/Sells</TableHeadCell>
								<TableHeadCell>Buy/Sell Volume</TableHeadCell>
							</TableHead>
							<TableBody>
								{#each transactions as tx}
									<TableBodyRow>
										<TableBodyCell>{tx.time}</TableBodyCell>
										<TableBodyCell>{tx.txCount}</TableBodyCell>
										<TableBodyCell>{formatNumber(tx.volume)} {$tokenInfo.symbol}</TableBodyCell>
										<TableBodyCell>{formatUSD(tx.volumeInUSD)}</TableBodyCell>
										<TableBodyCell>{tx.buys}/{tx.sells}</TableBodyCell>
										<TableBodyCell>{formatUSD(tx.buyVolumeInUSD)}/{formatUSD(tx.sellVolumeInUSD)}</TableBodyCell>
									</TableBodyRow>
								{/each}
							</TableBody>
						</Table>
					</div>
				</div>
			</TabItem> -->
		</Tabs>
	</div>
</Modal>
