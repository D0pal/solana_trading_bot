import { writable } from 'svelte/store';

function createLoadingStore() {
	const { subscribe, update } = writable<Record<string, boolean>>({});

	return {
		subscribe,
		setLoading: (key: string, isLoading: boolean) => update((state) => ({ ...state, [key]: isLoading })),
		isLoading: (key: string) => {
			let loading = false;
			subscribe((state) => {
				loading = !!state[key];
			})();
			return loading;
		}
	};
}

export const loadingStore = createLoadingStore();
