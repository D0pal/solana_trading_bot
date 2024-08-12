<script lang="ts">
	import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
	import type { VolatileMarketStrategy, Projection } from '$lib/VolatileMarketStrategy';
	import { calculateProjections } from '$lib/VolatileMarketStrategy';

	export let strategy: VolatileMarketStrategy;
	export let initialInvestment: number;

	$: projections = calculateProjections(strategy, initialInvestment);
</script>

<div class="mt-6">
	<h3 class="text-xl font-bold mb-4">Potential Outcomes</h3>
	<Table hoverable={true}>
		<TableHead>
			<TableHeadCell>Scenario</TableHeadCell>
			<TableHeadCell>Profit/Loss (SOL)</TableHeadCell>
			<TableHeadCell>Profit/Loss (%)</TableHeadCell>
		</TableHead>
		<TableBody>
			{#each projections as projection}
				<TableBodyRow>
					<TableBodyCell>{projection.scenario}</TableBodyCell>
					<TableBodyCell class={projection.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}>
						{projection.profitLoss.toFixed(2)} SOL
					</TableBodyCell>
					<TableBodyCell class={projection.profitLossPercentage >= 0 ? 'text-green-500' : 'text-red-500'}>
						{projection.profitLossPercentage.toFixed(2)}%
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</div>
