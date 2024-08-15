import { writable } from 'svelte/store';
import { type UserDto } from 'shared-types/src/userInfo.interface';
import type { AutoSellPreset } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';

export const defaultUserInfo: UserDto = {
	wallets: [],
	autoSellPresets: []
};

function createUserStore() {
	const { subscribe, set, update } = writable<UserDto>(defaultUserInfo);

	return {
		subscribe,
		set,
		update,
		addAutoSellPreset: (newPreset: AutoSellPreset) =>
			update((userInfo) => {
				return {
					...userInfo,
					autoSellPresets: [...userInfo.autoSellPresets, newPreset]
				};
			}),
		editAutoSellPreset: (editedPreset: AutoSellPreset) =>
			update((userInfo) => {
				const presetIndex = userInfo.autoSellPresets.findIndex((preset) => preset.id === editedPreset.id);
				const newPresets = [...userInfo.autoSellPresets];
				newPresets[presetIndex] = editedPreset;

				return {
					...userInfo,
					autoSellPresets: newPresets
				};
			}),
		deleteAutoSellPreset: (presetId: string) =>
			update((userInfo) => {
				return {
					...userInfo,
					autoSellPresets: userInfo.autoSellPresets.filter((preset) => preset.id !== presetId)
				};
			})
	};
}

export const userInfo = createUserStore();
