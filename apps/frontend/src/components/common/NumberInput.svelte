<script lang="ts">
	import { Input, type FormSizeType } from 'flowbite-svelte';
	export let id: string = '';
	export let value: number;
	export let placeholder: string = '';
	export let min: number = 0;
	export let step: number = 1;
	export let size: FormSizeType = 'md';
	export let required: boolean = false;
	export let ariaInvalid: boolean | undefined = undefined;

	function onChange(e: Event) {
		const target = e.target as HTMLInputElement;
		value = parseFloat(target.value);
	}
</script>

<Input
	type="number"
	{placeholder}
	{min}
	{step}
	{id}
	{size}
	{required}
	class={$$props.class}
	aria-invalid={ariaInvalid}
	value={value?.toString() ?? ''}
	on:input={onChange}
>
	<svelte:fragment slot="left">
		<slot name="left" />
	</svelte:fragment>

	<svelte:fragment slot="default"></svelte:fragment>

	<svelte:fragment slot="right">
		<slot name="right" />
	</svelte:fragment>
</Input>
