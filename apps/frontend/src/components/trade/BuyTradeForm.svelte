<script lang="ts">
	import { Label, Input, InputAddon, ButtonGroup, Toggle, TabItem, Tabs, Spinner } from 'flowbite-svelte';
	import { Helper } from 'flowbite-svelte';
	import { ArrowUpDown } from 'lucide-svelte';
	import { Button } from 'flowbite-svelte';
	import { tokenInfo } from '$stores/tokenStore';
	import { tokenPricesInUSD } from '$stores/priceStore';
	import { PUBLIC_WSOL_ADDRESS } from '$env/static/public';
	import TokenInformationModal from './TokenInformationModal.svelte';
	import { InfoCircleOutline } from 'flowbite-svelte-icons';
	import { formatNumber } from '$utils/formatters';
	import type { Infer, ValidationErrors } from 'sveltekit-superforms';
	import {
		type BuyTokenFormSchema,
		type GridStrategy,
		isSimpleAutoSell,
		isGridStrategy,
		type AutoSellPreset
	} from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
	import {
		initializeAutoSell,
		defaultGridStaticAutoSell,
		defaultSimpleAutoSell,
		defaultGridTrailingAutoSell
	} from '$lib/autoSellPresets';

	import NumberInput from '$components/common/NumberInput.svelte';
	import AutoSellPresets from './auto_sell_preset/AutoSellPresets.svelte';
	import { userInfo } from '$stores/userStore';
	import { userService } from '$services/userService';
	import { loadingStore } from '$stores/loadingStore';
	import GridAutoSellStrategy from './GridAutoSellStrategy.svelte';
	import SaveAutoSellPreset from './auto_sell_preset/SaveAutoSellPreset.svelte';

	export let form: Infer<BuyTokenFormSchema>;
	export let errors: ValidationErrors<Infer<BuyTokenFormSchema>>;

	$: initialBuyPrice = form.inputAmount / outputSecondaryToken;

	$: oneSolPriceInUsd = $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS]; // Use the store value
	$: oneSolInSecondaryToken = $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS] / $tokenPricesInUSD[$tokenInfo.address]; // Calculated from store value
	$: oneSecondaryTokenInSol = $tokenPricesInUSD[$tokenInfo.address] / $tokenPricesInUSD[PUBLIC_WSOL_ADDRESS]; // Calculated from store value

	$: outputSecondaryToken = form.inputAmount / oneSecondaryTokenInSol;

	const solInputPresets = [0.1, 0.5, 1, 10];

	function formatValue(value: number, placeholder: string): string | undefined {
		return value === 0 ? undefined : value.toString();
	}

	function selectPreset(preset: AutoSellPreset) {
		form.autoSell.strategy = preset.strategy;
	}

	function saveCurrentAsPreset(presetName: string) {
		userService.addAutoSellPreset({
			id: '',
			name: presetName,
			strategy: form.autoSell.strategy
		});
	}

	function handleGridStrategyChange(event: CustomEvent<GridStrategy>) {
		form.autoSell.strategy = event.detail;
	}

	function handleEditPreset(event: CustomEvent<AutoSellPreset>) {
		userService.editAutoSellPreset(event.detail);
	}

	function handleDeletePreset(event: CustomEvent<AutoSellPreset>) {
		userService.deleteAutoSellPreset(event.detail.id);
	}
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
				<NumberInput
					id="input-addon"
					class="focus:!ring-0 !text-white !font-bold text-right text-lg !border-0 z-0"
					placeholder="0.00"
					min={0.0000001}
					step={0.0000001}
					bind:value={form.inputAmount}
					aria-invalid={errors.inputAmount ? 'true' : undefined}
				/>

				<div class="z-10 relative">
					<p class="text-gray-400 pr-2.5 -mt-2 mb-1 text-xs font-semibold text-right z-10">
						≈ <span class="">${(form.inputAmount * oneSolPriceInUsd).toFixed(2)}</span>
					</p>
				</div>
			</div>

			<Button class="!bg-[#35d0de] !text-black font-bold">MAX</Button>
		</ButtonGroup>
		{#if errors.inputAmount}
			<Helper class="mt-2" color="red">
				{errors.inputAmount}
			</Helper>
		{/if}
		<div class="flex justify-between mt-3">
			{#each solInputPresets as preset}
				<button
					class="!bg-gray-700 w-full mr-2 last-of-type:mr-0 py-1 rounded-lg text-base !text-white !font-bold"
					type="button"
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
			on:change={() => {
				if (form.autoSell.enabled) {
					form.autoSell.strategy = initializeAutoSell(defaultSimpleAutoSell);
				}
			}}
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
				on:click={() => {
					form.autoSell.strategy = initializeAutoSell(defaultSimpleAutoSell);
				}}
			>
				{#if isSimpleAutoSell(form.autoSell.strategy)}
					<div class="flex">
						<div class="mr-2">
							<Label for="first_name" class="mb-2">Profit Percentage</Label>
							<NumberInput
								id="slppage"
								size="sm"
								class="text-right pe-6"
								required
								bind:value={form.autoSell.strategy.profitPercentage}
							>
								<p slot="right">%</p>
							</NumberInput>
							<p class="text-gray-400 text-sm mt-1 font-semibold text-right">
								Profit: <span class="text-white"
									>{parseFloat(((form.inputAmount * form.autoSell.strategy.profitPercentage) / 100).toFixed(4))} SOL</span
								>
							</p>
						</div>
						<div class="ml-2">
							<Label for="last_name" class="mb-2">Loss Percentage</Label>

							<NumberInput
								id="slppage"
								size="sm"
								class="text-right pe-6"
								required
								bind:value={form.autoSell.strategy.stopLossPercentage}
							>
								<p slot="right">%</p>
							</NumberInput>
							<p class="text-gray-400 text-sm mt-1 font-semibold text-right">
								Loss: <span class="text-white"
									>{parseFloat(((form.inputAmount * form.autoSell.strategy.stopLossPercentage) / 100).toFixed(4))} SOL</span
								>
							</p>
						</div>
					</div>
				{/if}
			</TabItem>

			<TabItem
				class="w-full"
				activeClasses="py-4 border-b-2 border-primary-600"
				inactiveClasses="py-4 text-gray-400"
				defaultClass="w-full"
				title="Grid Auto Sell"
				on:click={() => {
					form.autoSell.strategy = initializeAutoSell(defaultGridStaticAutoSell);
				}}
			>
				<div class="w-full mb-4 flex items-start space-x-2">
					<div class="w-full">
						<AutoSellPresets
							on:edit={handleEditPreset}
							on:delete={handleDeletePreset}
							presets={$userInfo.autoSellPresets}
							onSelectPreset={selectPreset}
						/>
					</div>
					<div class="w-1/12 h-12 flex items-center">
						<SaveAutoSellPreset onSavePreset={saveCurrentAsPreset} />
					</div>
				</div>

				{#if isGridStrategy(form.autoSell.strategy)}
					<GridAutoSellStrategy
						strategy={form.autoSell.strategy}
						inputAmount={form.inputAmount}
						outputAmount={outputSecondaryToken}
						on:change={handleGridStrategyChange}
					/>
				{/if}
			</TabItem>
		</Tabs>
	{/if}
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
