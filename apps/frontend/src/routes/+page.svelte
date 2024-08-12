<script>
	import TelegramLoginWidget from '$components/TelegramLoginWidget.svelte';
	import { PUBLIC_BACKEND_URL } from '$env/static/public';
	import { Card } from 'flowbite-svelte';
	async function getStatus() {
		const res = await fetch(PUBLIC_BACKEND_URL + '/user', {
			credentials: 'include'
		});
		const data = await res.json();
		console.log(data);
	}
</script>

<h1 class="text-3xl font-bold underline">Hello world!</h1>

<TelegramLoginWidget />

<button on:click={getStatus}> GET STATUS</button>

<Card href="/cards">
	<h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
		Noteworthy technology acquisitions 2021
	</h5>
	<p class="font-normal text-gray-700 dark:text-gray-400 leading-tight">
		Here are the biggest enterprise technology acquisitions of 2021 so far, in reverse chronological
		order.
	</p>
</Card>

<style lang="postcss">
	:global(html) {
		background-color: theme(colors.gray.100);
	}
</style>
