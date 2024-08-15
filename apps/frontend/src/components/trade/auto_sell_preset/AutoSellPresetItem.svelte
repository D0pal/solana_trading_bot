<script lang="ts">
	import { Button, Input, Label, Modal, Spinner, Range } from 'flowbite-svelte';
	import { type AutoSellPreset, isGridStrategy } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	import { CogOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import NumberInput from '$components/common/NumberInput.svelte';
	import GridAutoSellStrategy from '$components/trade/GridAutoSellStrategy.svelte';
	import pkg from 'lodash';
	import { loadingStore } from '$stores/loadingStore';
	import { createEventDispatcher } from 'svelte';
	import { Trash2 } from 'lucide-svelte';
	import { formatNumber } from '$utils/formatters';

	const { cloneDeep } = pkg;

	const dispatch = createEventDispatcher();

	export let preset: AutoSellPreset;
	export let onSelect: (preset: AutoSellPreset) => void;

	function getStrategyColor(strategy: string): string {
		switch (strategy) {
			case 'simple':
				return 'bg-blue-500';
			case 'grid':
				return 'bg-green-500';
			default:
				return 'bg-gray-500';
		}
	}

	function getStopLossColor(type: string): string {
		switch (type) {
			case 'static':
				return 'bg-purple-500';
			case 'trailing':
				return 'bg-pink-500';
			case 'breakeven':
				return 'bg-yellow-500';
			default:
				return 'bg-gray-500';
		}
	}

	function getSummary(preset: AutoSellPreset): string {
		if (preset.strategy.strategyName === 'simple') {
			return `${preset.strategy.profitPercentage}% profit, ${preset.strategy.stopLossPercentage}% stop loss`;
		} else {
			return `${preset.strategy.profitTargets.length} targets, ${preset.strategy.stopLossPercentage}% ${preset.strategy.stopLossType} initial stop loss`;
		}
	}

	let editedPreset: AutoSellPreset;
	let autoSellEditModal = false;
	let areYouSureModal = false;

	let simulationSolAmount = 1;
	const SOL_TO_TOKEN_RATE = 1000;

	$: simulationTokenAmount = simulationSolAmount * SOL_TO_TOKEN_RATE;

	function openEditModal() {
		editedPreset = cloneDeep(preset); // Create a deep copy
		autoSellEditModal = true;
	}

	function handleSaveEditedPreset() {
		dispatch('edit', editedPreset);
	}

	function handleDeletePreset() {
		dispatch('delete', editedPreset);
	}

	let wasLoadingForEdit = false;
	let wasLoadingForDelete = false;

	$: if (wasLoadingForEdit && !$loadingStore['editAutoSellPreset']) {
		handleCloseEditModal();
		wasLoadingForEdit = false;
	}

	$: if (wasLoadingForDelete && !$loadingStore['deleteAutoSellPreset']) {
		handleCloseAreYouSureModal();
		wasLoadingForDelete = false;
	}

	$: if ($loadingStore['editAutoSellPreset']) {
		wasLoadingForEdit = true;
	}

	$: if ($loadingStore['deleteAutoSellPreset']) {
		wasLoadingForDelete = true;
	}

	function handleCloseEditModal() {
		autoSellEditModal = false;
	}

	function handleCloseAreYouSureModal() {
		areYouSureModal = false;
		handleCloseEditModal();
	}
</script>

<div class="bg-gray-800 border-b p-4 transition-colors duration-200 last-of-type:border-0">
	<div class="flex justify-between items-center">
		<div>
			<div class="flex items-center space-x-2">
				<h3 class="text-base font-bold text-white">{preset.name}</h3>
				<Button on:click={openEditModal} size="xs" class="p-0 !bg-transparent"><CogOutline color="#35d0de" /></Button>
			</div>

			<div class="flex space-x-2 my-2">
				<span
					class="text-xs font-bold quicksand px-2 text-black py-1 rounded {getStrategyColor(
						preset.strategy.strategyName
					)} !bg-gray-400"
				>
					{preset.strategy.strategyName.toUpperCase()}
				</span>
				{#if preset.strategy.strategyName === 'grid'}
					<span
						class="text-xs font-bold quicksand text-white px-2 py-1 rounded {getStopLossColor(
							preset.strategy.stopLossType
						)} !bg-slate-600"
					>
						{preset.strategy.stopLossType.toUpperCase()}
					</span>
				{/if}
			</div>
		</div>
		<Button size="xs" color="blue" class="font-bold text-white" on:click={() => onSelect(preset)}>Select</Button>
	</div>
	<p class="text-xs font-bold quicksand text-gray-400">{getSummary(preset)}</p>
</div>

<Modal title="Edit preset" bind:open={autoSellEditModal} class={areYouSureModal ? 'opacity-25' : ''}>
	<div class="flex flex-col space-y-6">
		<div class="flex mb-4 justify-start space-x-4 items-center">
			<h3 class="font-medium text-xl text-gray-900 dark:text-white">
				{preset.name}
			</h3>
			<button
				on:click={() => {
					areYouSureModal = true;
				}}
				type="button"
				class=""
			>
				<Trash2 color="red" />
			</button>
		</div>
		<Label class="space-y-2">
			<span>Preset Name</span>
			<Input bind:value={preset.name} type="text" name="name" placeholder="Enter the name for the preset..." required />
		</Label>

		{#if isGridStrategy(editedPreset.strategy)}
			<div class="bg-gray-700 p-4 rounded-lg mb-4">
				<h4 class="text-lg font-bold mb-2">Preset Simulator</h4>
				<p class="text-sm text-gray-300 mb-4">
					Use this simulator to see how your preset would perform with different input amounts. This is for testing
					purposes only and uses a fixed rate of 1 SOL = 1000 Tokens.
				</p>

				<Label class="mb-2">Input SOL Amount</Label>
				<Range bind:value={simulationSolAmount} min={0.1} max={10} step={0.1} class="!bg-gray-600" />
				<p class="text-sm text-gray-300 mt-1">
					Input: {formatNumber(simulationSolAmount)} SOL ({formatNumber(simulationTokenAmount)} Tokens)
				</p>
			</div>
			<GridAutoSellStrategy
				strategy={editedPreset.strategy}
				inputAmount={simulationSolAmount}
				outputAmount={simulationTokenAmount}
				on:change={() => {}}
			/>
		{/if}

		<Button on:click={handleSaveEditedPreset} class="w-full" disabled={$loadingStore['editAutoSellPreset']}>
			{#if $loadingStore['editAutoSellPreset']}
				<Spinner class="mr-3" size="4" color="white" />
			{/if}
			Save Preset
		</Button>
	</div>
</Modal>

<Modal bind:open={areYouSureModal} size="xs">
	<div class="text-center">
		<ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" />
		<h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
			Are you sure you want to delete the preset <span class="font-bold">{editedPreset.name}</span>?
		</h3>
		<Button on:click={handleDeletePreset} color="red" class="me-2" disabled={$loadingStore['deleteAutoSellPreset']}>
			{#if $loadingStore['deleteAutoSellPreset']}
				<Spinner class="mr-3" size="4" color="white" />
			{/if}
			Yes, I'm sure
		</Button>
		<Button
			disabled={$loadingStore['deleteAutoSellPreset']}
			on:click={() => (areYouSureModal = false)}
			color="alternative">No, cancel</Button
		>
	</div>
</Modal>
