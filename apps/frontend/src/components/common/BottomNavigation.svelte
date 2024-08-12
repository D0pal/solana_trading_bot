<script>
	import { Wallet, CopyPlus, Crosshair, ArrowLeftRight } from 'lucide-svelte';
	import { page } from '$app/stores';
</script>

<nav class="md:hidden text-gray-400 fixed quicksand w-screen bottom-0 bg-gray-800 flex">
	<div
		class="w-full h-full flex flex-col py-4 items-center justify-center"
		class:navLi={$page.url.pathname === '/dashboard/trade'}
	>
		<ArrowLeftRight size={20} />
		<a href="/dashboard/trade">Trade</a>
	</div>
	<div
		class="w-full h-full flex py-4 flex-col items-center justify-center"
		class:navLi={$page.url.pathname === '/dashboard/sniper'}
	>
		<Crosshair size={20} />
		<a href="/dashboard/sniper">Sniper</a>
	</div>
	<div
		class="w-full h-full flex py-4 flex-col items-center justify-center"
		class:navLi={$page.url.pathname === '/dashboard/copy-trade'}
	>
		<CopyPlus size={20} />
		<a href="/dashboard/copy-trade">Copy Trade</a>
	</div>
	<div
		class="w-full h-full flex py-4 flex-col items-center justify-center"
		class:navLi={$page.url.pathname === '/dashboard/wallets'}
	>
		<Wallet size={20} />
		<a href="/dashboard/wallets">Wallets</a>
	</div>
</nav>
