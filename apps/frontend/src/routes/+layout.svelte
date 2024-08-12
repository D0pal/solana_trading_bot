<script lang="ts">
	import '../app.css';
	export let data;

	$: console.log(data);
</script>

<slot />
