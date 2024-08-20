<script lang="ts">
	import NumberInput from '$components/common/NumberInput.svelte';
	import { userService } from '$services/userService';
	import { Button, Modal } from 'flowbite-svelte';

	export let slippage: number;
	export let prioritizationFeeInSolana: number;
	let settingsModal = false;

	function saveSettings() {
		userService.updateUserSettings({
			slippage,
			prioritizationFeeInSolana
		});
		settingsModal = false;
	}
</script>

<div class="flex justify-between items-center mb-4 form-padding">
	<h2 class="text-2xl pl-5 text-white font-bold text-center">Trade</h2>
	<button
		type="button"
		class="bg-gray-600 text-white text-sm px-2 rounded-lg font-semibold"
		on:click={() => (settingsModal = true)}>Slippage: {slippage}%</button
	>
</div>

<Modal title="Transaction Settings" bind:open={settingsModal} autoclose>
	<div class="flex items-center justify-between">
		<div class="w-3/4">
			<p>Custom slippage</p>
		</div>
		<div class="w-1/4">
			<NumberInput id="slppage" size="sm" class="text-right pe-6 ps-0" required bind:value={slippage}>
				<p slot="right">%</p>
			</NumberInput>
		</div>
	</div>
	<div class="flex items-center justify-between">
		<div class="w-1/4">
			<p>Prioritization Fee In Solana</p>
		</div>
		<div class="w-3/4">
			<NumberInput id="slppage" size="sm" class="text-right pe-11 ps-0" required bind:value={prioritizationFeeInSolana}>
				<p slot="right">SOL</p>
			</NumberInput>
		</div>
	</div>
	<Button on:click={saveSettings} class="w-full !bg-[#35d0de] text-black font-bold">Save</Button>
</Modal>
