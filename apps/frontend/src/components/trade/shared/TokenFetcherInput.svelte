<script lang="ts">
	import { tokenService } from '$services/tokenService';
	import { Input } from 'flowbite-svelte';
	import { SearchOutline } from 'flowbite-svelte-icons';

	export let tokenAddress: string;

	function searchTokenInputChanged(e: Event) {
		tokenService.reset();

		const target = e.target as HTMLInputElement;
		const tokenAddress = target.value;
		console.log(tokenAddress.length);
		if (tokenAddress.length >= 40) {
			tokenService.fetchTokenInfo(tokenAddress);
		}
	}
</script>

<Input
	id="search"
	on:input={searchTokenInputChanged}
	bind:value={tokenAddress}
	class="!bg-gray-700 my-6 "
	placeholder="Paste token address"
	size="lg"
>
	<SearchOutline slot="left" class="w-6 h-6 text-gray-500  dark:text-gray-400" />
</Input>
