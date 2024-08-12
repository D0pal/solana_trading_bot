<script lang="ts">
	import BottomNavigation from '$components/common/BottomNavigation.svelte';
	import Navbar from '$components/common/Navbar.svelte';
	import '../../app.css';
	import { onMount } from 'svelte';
	import { userInfo } from '$stores/userStore';
	import type { PageData } from './$types';

	export let data: PageData;

	onMount(() => {
		if (data.userInfo) {
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
