import { type UserDto, type UserWalletInfo } from 'shared-types/src/userInfo.interface';
import type { AutoSellPreset, UserSettings } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
import { writable } from 'svelte/store';

export const defaultUserInfo: UserDto = {
	wallets: [],
	autoSellPresets: [],
	settings: {
		prioritizationFeeInSolana: 0,
		slippage: 0
	}
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
			}),
		updateSettings: (newSettings: UserSettings) =>
			update((userInfo) => {
				return {
					...userInfo,
					settings: newSettings
				};
			}),
		updateWallets: (wallets: UserWalletInfo[]) =>
			update((userInfo) => {
				return {
					...userInfo,
					wallets
				};
			})
	};
}

export const userInfo = createUserStore();
