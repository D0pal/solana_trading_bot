<script lang="ts">
	import BottomNavigation from '$components/common/BottomNavigation.svelte';
	import Navbar from '$components/common/Navbar.svelte';
	import '../../app.css';
	import { onMount } from 'svelte';
	import { userInfo } from '$stores/userStore';
	import type { PageData } from './$types';
	import { Toaster } from 'svelte-french-toast';
	const toastPosition = 'top-right';

	export let data: PageData;

	onMount(() => {
		if (data.userInfo) {
			// data.userInfo.autoSellPresets = [
			// 	{
			// 		name: 'My first preset',
			// 		strategy: {
			// 			strategyName: 'grid',
			// 			stopLossType: 'trailing',
			// 			stopLossPercentage: 5,
			// 			profitTargets: [
			// 				{ multiplier: 1.25, sellPercentage: 20, trailingStopLossAfter: 10 },
			// 				{ multiplier: 1.5, sellPercentage: 40, trailingStopLossAfter: 15 },
			// 				{ multiplier: 2, sellPercentage: 30, trailingStopLossAfter: 20 },
			// 				{ multiplier: 3, sellPercentage: 10, trailingStopLossAfter: 20 }
			// 			]
			// 		}
			// 	},
			// 	{
			// 		name: 'Top Strategy',
			// 		strategy: {
			// 			strategyName: 'grid',
			// 			stopLossType: 'static',
			// 			stopLossPercentage: 5,
			// 			profitTargets: [
			// 				{ multiplier: 1.5, sellPercentage: 20 },
			// 				{ multiplier: 1.7, sellPercentage: 30 },
			// 				{ multiplier: 2, sellPercentage: 50 }
			// 			]
			// 		}
			// 	},
			// 	{
			// 		name: 'Trailing Test',
			// 		strategy: {
			// 			strategyName: 'grid',
			// 			stopLossType: 'trailing',
			// 			stopLossPercentage: 5,
			// 			profitTargets: [
			// 				{ multiplier: 1.1, sellPercentage: 20, trailingStopLossAfter: 10 },
			// 				{ multiplier: 1.5, sellPercentage: 40, trailingStopLossAfter: 15 },
			// 				{ multiplier: 4, sellPercentage: 30, trailingStopLossAfter: 20 },
			// 				{ multiplier: 6, sellPercentage: 5, trailingStopLossAfter: 20 },
			// 				{ multiplier: 8, sellPercentage: 5, trailingStopLossAfter: 20 }
			// 			]
			// 		}
			// 	}
			// ];
			userInfo.set(data.userInfo);
		}
	});

	$: console.log(data);
</script>

<main class=" pb-40 px-2">
	<Navbar />
	<slot />
</main>
<BottomNavigation />

<Toaster position={toastPosition} />
