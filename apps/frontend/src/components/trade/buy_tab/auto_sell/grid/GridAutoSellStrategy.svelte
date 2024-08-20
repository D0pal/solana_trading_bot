<script lang="ts">
	import NumberInput from '$components/common/NumberInput.svelte';
	import { defaultGridStaticAutoSell, defaultGridTrailingAutoSell, initializeAutoSell } from '$lib/autoSellPresets';
	import { formatNumber } from '$utils/formatters';
	import {
		Button,
		Label,
		Progressbar,
		Select,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import type {
		AutoSellStrategy,
		GridStrategy,
		TrailingProfitTarget
	} from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	import { createEventDispatcher } from 'svelte';

	export let strategy: GridStrategy;
	export let inputAmount: number = 0;
	export let outputAmount: number = 0;

	const dispatch = createEventDispatcher();

	type ProjectedNetPL = {
		targetPrice: number;
		sellPercentage: number;
		projectedNetPL: number;
	};

	function calculateWorstCaseScenario(initialInvestment: number, strategy: GridStrategy): number {
		switch (strategy.stopLossType) {
			case 'trailing':
			case 'static': {
				const lossAmount = initialInvestment * (strategy.stopLossPercentage / 100);
				return -lossAmount;
			}
			case 'breakeven':
				return -initialInvestment * (strategy.stopLossPercentage / 100);
		}
	}

	function calculateProjectedNetPL(
		initialInvestment: number,
		initialTokens: number,
		strategy: GridStrategy
	): ProjectedNetPL[] {
		if (initialInvestment === 0 || initialTokens === 0) return [];

		const initialPrice = initialInvestment / initialTokens;
		let remainingTokens = initialTokens;
		let accumulativeProceedsFromSale = 0;
		let highestPrice = initialPrice;
		let currentStopLossPercentage = strategy.stopLossPercentage;

		return strategy.profitTargets.map((target) => {
			const { multiplier, sellPercentage } = target;
			const targetPrice = initialPrice * multiplier;
			highestPrice = Math.max(highestPrice, targetPrice);

			const tokensSold = initialTokens * (sellPercentage / 100);
			const proceedsFromSale = tokensSold * targetPrice;

			accumulativeProceedsFromSale += proceedsFromSale;
			remainingTokens -= tokensSold;

			if (strategy.stopLossType === 'trailing') {
				currentStopLossPercentage = (target as TrailingProfitTarget).trailingStopLossAfter;
			}

			let stopLossPrice: number;
			switch (strategy.stopLossType) {
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

	$: results = calculateProjectedNetPL(inputAmount, outputAmount, strategy);
	$: worstCaseScenario = calculateWorstCaseScenario(inputAmount, strategy);

	function addProfitTarget() {
		const baseTarget = { multiplier: 0, sellPercentage: 0 };

		if (strategy.stopLossType === 'trailing') {
			strategy.profitTargets = [...strategy.profitTargets, { ...baseTarget, trailingStopLossAfter: 0 }];
		} else {
			strategy.profitTargets = [...strategy.profitTargets, baseTarget];
		}
		dispatch('change', strategy);
	}

	function removeProfitTarget(index: number) {
		strategy.profitTargets = strategy.profitTargets.filter((_, i) => i !== index);
		dispatch('change', strategy);
	}

	$: totalSellPercentage = strategy.profitTargets.reduce(
		(acc, target) => acc + (target.sellPercentage == 0 ? 0 : parseFloat(target.sellPercentage.toString())),
		0
	);

	function handleStrategyChange() {
		dispatch('change', strategy);
	}

	function handleSelectChange() {
		let newStrategy: AutoSellStrategy;
		switch (strategy.stopLossType) {
			case 'trailing':
				newStrategy = initializeAutoSell(defaultGridTrailingAutoSell);
				break;
			case 'breakeven':
				newStrategy = initializeAutoSell(defaultGridStaticAutoSell);
				break;
			case 'static':
				newStrategy = initializeAutoSell(defaultGridStaticAutoSell);
				break;
		}
		dispatch('change', newStrategy);
	}
</script>

<div>
	<div class="flex space-x-2 items-center">
		<div class="w-3/5">
			<Label for="stop_loss_type" class="mb-2">Stop Loss Type</Label>
			<Select id="stop_loss_type" class="mt-2" bind:value={strategy.stopLossType} on:change={handleSelectChange}>
				<option value="static">Static Stop Loss</option>
				<option value="trailing">Trailing Stop Loss</option>
				<option value="breakeven">Breakeven Stop Loss</option>
			</Select>
		</div>

		<div class="w-2/5">
			<Label for="trailing_stop_loss" class="mb-2 capitalize">Stop Loss %</Label>
			<div class="bg-gray-700 rounded-lg border-gray-600 border">
				<NumberInput
					id="trailing_stop_loss"
					size="sm"
					class="text-right border-0 focus:!ring-0 pe-6"
					required
					bind:value={strategy.stopLossPercentage}
					on:change={handleStrategyChange}
				>
					<p slot="right">%</p>
				</NumberInput>
			</div>
		</div>
	</div>
	<div class="text-gray-400 text-right flex items-center justify-end text-xs mb-1 overflow-clip">
		<p class="text-right">Projected <br /> Loss:</p>
		<span class="font-bold text-[#ff6b6b] ml-2">{formatNumber(worstCaseScenario)} SOL</span>
	</div>

	<p class="mb-2 mt-4 text-center font-bold text-white">Profit Targets</p>

	<Table class="table-fixed" divClass="-mx-4">
		<TableHead>
			<TableHeadCell class="px-2 !w-[22.5%] text-center">Increase</TableHeadCell>
			<TableHeadCell class="px-2 !w-[22.5%] text-center">Sell %</TableHeadCell>
			{#if strategy.stopLossType === 'trailing'}
				<TableHeadCell class="px-2 !w-[22.5%] text-center">Trailing Stop Loss %</TableHeadCell>
			{/if}
			<TableHeadCell class="px-2 !w-[22.5%] text-center">Projected Minimum P/L</TableHeadCell>
			<TableHeadCell class="px-2 !w-[10%] text-center"></TableHeadCell>
		</TableHead>
		<TableBody tableBodyClass="divide-y">
			{#each strategy.profitTargets as target, index}
				<TableBodyRow>
					<TableBodyCell class="px-2">
						<NumberInput
							size="sm"
							class="text-right pe-5 ps-0"
							min={0}
							step={0.01}
							required
							bind:value={target.multiplier}
							on:change={handleStrategyChange}
						>
							<p slot="right">x</p>
						</NumberInput>
					</TableBodyCell>
					<TableBodyCell class="px-2">
						<NumberInput
							size="sm"
							class="text-right pe-6 ps-0"
							required
							bind:value={target.sellPercentage}
							on:change={handleStrategyChange}
						>
							<p slot="right">%</p>
						</NumberInput>
					</TableBodyCell>
					{#if strategy.stopLossType === 'trailing' && 'trailingStopLossAfter' in target}
						<TableBodyCell class="px-2">
							<NumberInput
								size="sm"
								class="text-right pe-6 ps-0"
								required
								bind:value={target.trailingStopLossAfter}
								on:change={handleStrategyChange}
							>
								<p slot="right">%</p>
							</NumberInput>
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
				<TableBodyCell class="px-2" colspan={strategy.stopLossType === 'trailing' ? 5 : 4}>
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
</div>

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
