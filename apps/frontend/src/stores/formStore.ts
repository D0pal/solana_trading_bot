import { writable } from 'svelte/store';

export function createForm(initialData: unknown) {
	const { subscribe, set, update } = writable(initialData);

	return {
		subscribe,
		updateFormData: (key: string, value: unknown) => {
			update(formData => {
				const keys = key.split('.');
				let current = formData;
				for (let i = 0; i < keys.length - 1; i++) {
					current = current[keys[i]];
				}
				current[keys[keys.length - 1]] = value;
				return formData;
			});
		},
		reset: () => set(initialData),
		formData: { subscribe }
	};
}