<script lang="ts">
	import { Label, Input, InputAddon, ButtonGroup, Toggle, TabItem, Tabs, Select, Progressbar } from 'flowbite-svelte';
	import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
	import { ArrowUpDown } from 'lucide-svelte';
	import { Button } from 'flowbite-svelte';
	import { tokenInfo } from '$stores/tokenStore';
	import { tokenPricesInUSD } from '$stores/priceStore';
	import { PUBLIC_WSOL_ADDRESS } from '$env/static/public';
	import TokenInformationModal from './TokenInformationModal.svelte';
	import { InfoCircleOutline } from 'flowbite-svelte-icons';
	import VolatileMarketProjections from './VolatileMarketProjections.svelte';
	import type { VolatileMarketStrategy } from '$lib/VolatileMarketStrategy';
	import { VolatileTokenTrader } from '$lib/VolatileMarketStrategy';
	import { formatNumber } from '$utils/formatters';
	import type { SuperForm, Infer } from 'sveltekit-superforms';
	import type { BuyTokenFormSchema, StopLossType, ProfitTarget } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	// import { initializeAutoSell } from '$lib/autoSellPresets';

	export let form: Infer<BuyTokenFormSchema>;

	type ProjectedNetPL = {
		targetPrice: number;
		sellPercentage: number;
		projectedNetPL: number;
	};

	form.autoSell.gridStrategy = {
		stopLossType: 'static',
		staticStopLoss: 5,
		trailingStopLoss: 10,
		breakEvenInitialStopLoss: 0,
		profitTargets: [
			{ multiplier: 1.1, sellPercentage: 20, trailingStopLossAfter: 10 },
			{ multiplier: 1.3, sellPercentage: 30, trailingStopLossAfter: 15 },
			{ multiplier: 1.5, sellPercentage: 50, trailingStopLossAfter: 20 }
		]
	};

	$: initialBuyPrice = form.inputAmount / outputSecondaryToken;

	$: oneSolPriceInUsd = $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS]; // Use the store value
	$: oneSolInSecondaryToken = $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS] / $tokenPricesInUSD[$tokenInfo.address]; // Calculated from store value
	$: oneSecondaryTokenInSol = $tokenPricesInUSD[$tokenInfo.address] / $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS]; // Calculated from store value

	$: outputSecondaryToken = form.inputAmount / oneSecondaryTokenInSol;

	const solInputPresets = [0.1, 0.5, 1, 10];

	function calculateWorstCaseScenario(
		initialInvestment: number,
		stopLossType: StopLossType,
		initialStopLossPercentage: number
	): number {
		switch (stopLossType) {
			case 'trailing':
			case 'static':
				const lossAmount = initialInvestment * (initialStopLossPercentage / 100);
				return -lossAmount;
			case 'breakeven':
				return -initialInvestment * (initialStopLossPercentage / 100);
		}
	}

	// Pure function for calculating projected net P/L
	function calculateProjectedNetPL(
		initialInvestment: number,
		initialTokens: number,
		targets: ProfitTarget[],
		stopLossType: StopLossType,
		initialStopLossPercentage: number
	): ProjectedNetPL[] {
		if (initialInvestment === 0 || initialTokens === 0) return [];

		const initialPrice = initialInvestment / initialTokens;
		let remainingTokens = initialTokens;
		let accumulativeProceedsFromSale = 0;
		let highestPrice = initialPrice;
		let currentStopLossPercentage = initialStopLossPercentage;

		return targets.map(({ multiplier, sellPercentage, trailingStopLossAfter }, index) => {
			const targetPrice = initialPrice * multiplier;
			highestPrice = Math.max(highestPrice, targetPrice);

			const tokensSold = initialTokens * (sellPercentage / 100);
			const proceedsFromSale = tokensSold * targetPrice;

			accumulativeProceedsFromSale += proceedsFromSale;
			remainingTokens -= tokensSold;

			// Update the stop loss percentage if specified
			if (stopLossType === 'trailing' && trailingStopLossAfter !== undefined) {
				currentStopLossPercentage = trailingStopLossAfter;
			}

			let stopLossPrice: number;
			switch (stopLossType) {
				case 'trailing':
					stopLossPrice = highestPrice * (1 - currentStopLossPercentage / 100);
					break;
				case 'breakeven':
					stopLossPrice = initialPrice;
					break;
				case 'static':
				default:
					stopLossPrice = initialPrice * (1 - currentStopLossPercentage / 100);
			}

			const proceedsFromStopLoss = remainingTokens * stopLossPrice;
			const totalProceeds = accumulativeProceedsFromSale + proceedsFromStopLoss;
			const projectedNetPL = totalProceeds - initialInvestment;

			return {
				targetPrice,
				sellPercentage,
				projectedNetPL
			};
		});
	}

	// Reactive statement to update results
	$: results = calculateProjectedNetPL(
		form.inputAmount,
		outputSecondaryToken,
		form.autoSell.gridStrategy.profitTargets,
		form.autoSell.gridStrategy.stopLossType,
		form.autoSell.gridStrategy.stopLossType === 'trailing'
			? form.autoSell.gridStrategy.trailingStopLoss
			: form.autoSell.gridStrategy.staticStopLoss
	);

	$: worstCaseScenario = {
		scenario: 'Initial Stop Loss',
		sellPercentage: 100,
		stopLossPercentage:
			form.autoSell.gridStrategy.stopLossType === 'trailing'
				? form.autoSell.gridStrategy.trailingStopLoss
				: form.autoSell.gridStrategy.staticStopLoss,
		projectedNetPL: calculateWorstCaseScenario(
			form.inputAmount,
			form.autoSell.gridStrategy.stopLossType,
			form.autoSell.gridStrategy.stopLossType === 'trailing'
				? form.autoSell.gridStrategy.trailingStopLoss
				: form.autoSell.gridStrategy.staticStopLoss
		)
	};

	function formatValue(value: number, placeholder: string): string | undefined {
		return value === 0 ? undefined : value.toString();
	}

	function addProfitTarget() {
		form.autoSell.gridStrategy.profitTargets = [
			...form.autoSell.gridStrategy.profitTargets,
			{ multiplier: 0, sellPercentage: 0 }
		];
	}

	function removeProfitTarget(index: number) {
		form.autoSell.gridStrategy.profitTargets = form.autoSell.gridStrategy.profitTargets.filter((_, i) => i !== index);
	}

	$: totalSellPercentage = form.autoSell.gridStrategy.profitTargets.reduce(
		(acc, target) => acc + (target.sellPercentage == 0 ? 0 : parseFloat(target.sellPercentage.toString())),
		0
	);
</script>

<div class="w-full">
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
				<Input
					id="input-addon"
					type="number"
					class="focus:!ring-0 !text-white !font-bold text-right text-lg !border-0"
					placeholder="0.00"
					min="0.0000001"
					step="0.0000001"
					bind:value={form.inputAmount}
				/>
				<p class="text-gray-400 pr-2.5 -mt-2 mb-1 text-xs font-semibold text-right">
					≈ <span class="">${(form.inputAmount * oneSolPriceInUsd).toFixed(2)}</span>
				</p>
			</div>

			<Button class="!bg-[#35d0de] !text-black font-bold">MAX</Button>
		</ButtonGroup>
		<div class="flex justify-between mt-3">
			{#each solInputPresets as preset}
				<button
					class="!bg-gray-700 w-full mr-2 last-of-type:mr-0 py-1 rounded-lg text-base !text-white !font-bold"
					on:click={() => (form.inputAmount = preset)}>{preset} SOL</button
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
				value={formatValue(outputSecondaryToken, '')}
				readonly
			/>
		</ButtonGroup>
		<p class="text-gray-400 text-sm mt-1 font-semibold text-right">
			1 SOL ≈ {formatNumber(parseFloat(oneSolInSecondaryToken.toFixed(2)))}
			{$tokenInfo.symbol}
		</p>
	</div>
	<hr class="my-4 border-gray-600" />
	<div class="flex justify-between mt-4 bg-gray-700 p-2 rounded-lg">
		<p class="text-white font-bold">Enable Auto Sell</p>
		<Toggle
			classDiv="peer-focus:ring-0 {form.autoSell.enabled ? '!bg-[#35d0de]' : '!bg-gray-500'}"
			bind:checked={form.autoSell.enabled}
		/>
	</div>
	{#if form.autoSell.enabled}
		<Tabs contentClass="mt-4" defaultClass="flex" tabStyle="underline">
			<TabItem
				class="w-full"
				activeClasses="py-4 border-b-2 border-primary-600"
				inactiveClasses="py-4 text-gray-400"
				defaultClass="w-full"
				open
				title="Simple Auto Sell"
				on:click={() => (form.autoSell.strategy = 'simple')}
			>
				<div class="flex">
					<div class="mr-2">
						<Label for="first_name" class="mb-2">Profit Percentage</Label>
						<Input
							type="number"
							id="slppage"
							size="sm"
							class="text-right"
							required
							bind:value={form.autoSell.simpleStrategy.profitPercentage}
						>
							<p slot="right">%</p>
						</Input>
						<p class="text-gray-400 text-sm mt-1 font-semibold text-right">
							Profit: <span class="text-white"
								>{parseFloat(((form.inputAmount * form.autoSell.simpleStrategy.profitPercentage) / 100).toFixed(4))} SOL</span
							>
						</p>
					</div>
					<div class="ml-2">
						<Label for="last_name" class="mb-2">Loss Percentage</Label>

						<Input
							type="number"
							id="slppage"
							size="sm"
							class="text-right"
							required
							bind:value={form.autoSell.simpleStrategy.stopLossPercentage}
						>
							<p slot="right">%</p>
						</Input>
						<p class="text-gray-400 text-sm mt-1 font-semibold text-right">
							Loss: <span class="text-white"
								>{parseFloat(((form.inputAmount * form.autoSell.simpleStrategy.stopLossPercentage) / 100).toFixed(4))} SOL</span
							>
						</p>
					</div>
				</div>
			</TabItem>
			<TabItem
				class="w-full"
				activeClasses="py-4 border-b-2 border-primary-600"
				inactiveClasses="py-4 text-gray-400"
				defaultClass="w-full"
				title="Grid Auto Sell"
				on:click={() => (form.autoSell.strategy = 'grid')}
			>
				<div class="mb-4">
					<Label for="stop_loss_type" class="mb-2">Stop Loss Type</Label>
					<Select id="stop_loss_type" class="mt-2" bind:value={form.autoSell.gridStrategy.stopLossType}>
						<option value="static">Static Stop Loss</option>
						<option value="trailing">Trailing Stop Loss</option>
						<option value="breakeven">Breakeven Stop Loss</option>
					</Select>
				</div>

				{#if form.autoSell.gridStrategy.stopLossType === 'static'}
					<div class="">
						<Label for="static_stop_loss" class="mb-2">Static Stop Loss Percentage</Label>
						<div class="bg-gray-700 rounded-lg border-gray-600 border">
							<Input
								type="number"
								id="static_stop_loss"
								size="sm"
								class="text-right border-0 focus:!ring-0"
								required
								bind:value={form.autoSell.gridStrategy.staticStopLoss}
							>
								<p slot="right">%</p>
							</Input>
							<p class="text-gray-400 text-right text-xs pr-2.5 mb-1">
								Projected Minimum P/L: <span class="font-bold text-[#ff6b6b] ml-2"
									>{worstCaseScenario.projectedNetPL} SOL</span
								>
							</p>
						</div>
					</div>
				{:else if form.autoSell.gridStrategy.stopLossType === 'trailing'}
					<div class="">
						<Label for="trailing_stop_loss" class="mb-2">Trailing Stop Loss Percentage</Label>
						<div class="bg-gray-700 rounded-lg border-gray-600 border">
							<Input
								type="number"
								id="trailing_stop_loss"
								size="sm"
								class="text-right border-0 focus:!ring-0"
								required
								bind:value={form.autoSell.gridStrategy.trailingStopLoss}
							>
								<p slot="right">%</p>
							</Input>
							<p class="text-gray-400 text-right text-xs pr-2.5 mb-1">
								Projected Minimum P/L: <span class="font-bold text-[#ff6b6b] ml-2"
									>{worstCaseScenario.projectedNetPL} SOL</span
								>
							</p>
						</div>
					</div>
				{:else if form.autoSell.gridStrategy.stopLossType === 'breakeven'}
					<div class="">
						<Label for="breakeven_initial_stop_loss" class="mb-2">Initial Stop Loss Percentage</Label>
						<div class="bg-gray-700 rounded-lg border-gray-600 border">
							<Input
								type="number"
								id="breakeven_initial_stop_loss"
								size="sm"
								class="text-right border-0 focus:!ring-0"
								required
								bind:value={form.autoSell.gridStrategy.breakEvenInitialStopLoss}
							>
								<p slot="right">%</p>
							</Input>
							<p class="text-gray-400 text-right text-xs pr-2.5 mb-1">
								Projected Minimum P/L: <span class="font-bold text-[#ff6b6b] ml-2"
									>{worstCaseScenario.projectedNetPL} SOL</span
								>
							</p>
						</div>
					</div>
				{/if}

				<p class="mb-2 mt-4 text-center font-bold text-white">Profit Targets</p>

				<Table class="table-fixed" divClass="-mx-4">
					<TableHead>
						<TableHeadCell class="px-2 !w-[22.5%] text-center">Increase</TableHeadCell>
						<TableHeadCell class="px-2 !w-[22.5%] text-center">Sell %</TableHeadCell>
						{#if form.autoSell.gridStrategy.stopLossType === 'trailing'}
							<TableHeadCell class="px-2 !w-[22.5%] text-center">Trailing Stop Loss %</TableHeadCell>
						{/if}
						<TableHeadCell class="px-2 !w-[22.5%] text-center">Projected Minimum P/L</TableHeadCell>
						<TableHeadCell class="px-2 !w-[10%] text-center"></TableHeadCell>
					</TableHead>
					<TableBody tableBodyClass="divide-y">
						{#each form.autoSell.gridStrategy.profitTargets as target, index}
							<TableBodyRow>
								<TableBodyCell class="px-2">
									<Input
										type="number"
										size="sm"
										class="text-right pe-6"
										min="0"
										step="0.01"
										required
										bind:value={target.multiplier}
									>
										<p slot="right">x</p>
									</Input>
								</TableBodyCell>
								<TableBodyCell class="px-2">
									<Input type="number" size="sm" class="text-right pe-6" required bind:value={target.sellPercentage}>
										<p slot="right">%</p>
									</Input>
								</TableBodyCell>
								{#if form.autoSell.gridStrategy.stopLossType === 'trailing'}
									<TableBodyCell class="px-2">
										<Input
											type="number"
											size="sm"
											class="text-right pe-6"
											required
											bind:value={target.trailingStopLossAfter}
										>
											<p slot="right">%</p>
										</Input>
									</TableBodyCell>
								{/if}
								<TableBodyCell class="px-1">
									<p class="text-white font-bold text-center">
										{results[index]?.projectedNetPL.toFixed(4) == undefined
											? '0'
											: parseFloat(results[index]?.projectedNetPL.toFixed(3))}
										<span class="text-[0.6rem] font-normal">SOL</span>
									</p>
								</TableBodyCell>
								{#if index !== 0}
									<TableBodyCell class="px-2 pl-0">
										<Button class="px-1 py-1 !bg-[#A0A5B1]" size="sm" on:click={() => removeProfitTarget(index)}>
											<svg class="w-4 h-4" fill="#fff" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
												<path
													fill-rule="evenodd"
													d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
													clip-rule="evenodd"
												></path>
											</svg>
										</Button>
									</TableBodyCell>
								{/if}
							</TableBodyRow>
						{/each}
						<TableBodyRow class="!w-full">
							<TableBodyCell class="px-2" colspan={form.autoSell.gridStrategy.stopLossType === 'trailing' ? 5 : 4}>
								<div class="w-full flex justify-center">
									<Button
										class="!bg-[#3A3D4A] text-base !px-3.5 !py-1 focus:outline-none focus:ring-0"
										on:click={addProfitTarget}>+ Add Profit Target</Button
									>
								</div>
							</TableBodyCell>
						</TableBodyRow>
					</TableBody>
				</Table>
				<div class="w-[80%] mx-auto">
					<Progressbar
						progress={totalSellPercentage}
						size="h-3"
						class="my-4 max-w-full"
						divClass="totalSellPercentageProgress bg-gray-600 rounded-full {totalSellPercentage > 100
							? 'totalSellPercentageProgressRed'
							: 'totalSellPercentageProgressGreen'}"
						labelOutside="Total Sell %"
						classLabelOutside={totalSellPercentage > 100 ? 'totalSellPercentageLabelRedText' : ''}
					/>
				</div>
			</TabItem>
		</Tabs>
	{/if}
	<button class="w-full rounded-lg py-2 !bg-[#35d0de] text-black text-lg mt-6 font-bold">Place Order</button>
</div>

<!-- <iframe
	id="dextools-widget"
	title="DEXTools Trading Chart"
	width="500"
	height="400"
	src="https://www.dextools.io/widget-chart/en/solana/pe-light/25tXTutLkjtcUX3kqoeRvc7AuBYM7fckBWoVqnQnyDGQ?theme=light&chartType=2&chartResolution=30&drawingToolbars=true"
></iframe> -->

<style>
	:global(.totalSellPercentageProgress > div) {
		max-width: 100%;
	}

	:global(.totalSellPercentageProgressRed > div) {
		background-color: #ff6b6b !important;
	}

	:global(.totalSellPercentageProgressGreen > div) {
		background-color: #4caf50 !important;
	}

	:global(.totalSellPercentageLabelRedText > span:nth-child(2)) {
		color: #ff6b6b !important;
		font-weight: 700;
	}
</style>
