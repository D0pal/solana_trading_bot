/* eslint-disable @typescript-eslint/no-unused-vars */
import api from '$lib/api';
import { genericServiceCall } from '$lib/apiUtils';
import { loadingStore } from '$stores/loadingStore';
import { userInfo } from '$stores/userStore';
import type { AutoSellPreset, UserSettings } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
import toast from 'svelte-french-toast';

export const userService = {
	async addAutoSellPreset(autoSellPreset: AutoSellPreset) {
		return genericServiceCall({
			method: 'post',
			url: '/user/add-auto-sell-preset',
			loadingKey: 'addAutoSellPreset',
			payload: autoSellPreset,
			successMessage: 'Auto-sell preset added successfully',
			onSuccess: () => userInfo.addAutoSellPreset(autoSellPreset)
		});
	},

	async editAutoSellPreset(autoSellPreset: AutoSellPreset) {
		return genericServiceCall({
			method: 'post',
			url: '/user/edit-auto-sell-preset',
			loadingKey: 'editAutoSellPreset',
			payload: autoSellPreset,
			successMessage: 'Auto-sell preset updated successfully',
			onSuccess: () => userInfo.editAutoSellPreset(autoSellPreset)
		});
	},

	async deleteAutoSellPreset(autoSellPresetId: string) {
		return genericServiceCall({
			method: 'delete',
			url: `/user/delete-auto-sell-preset/${autoSellPresetId}`,
			loadingKey: 'deleteAutoSellPreset',
			successMessage: 'Auto-sell preset deleted successfully',
			onSuccess: () => userInfo.deleteAutoSellPreset(autoSellPresetId)
		});
	},

	async updateUserSettings(userSettings: UserSettings) {
		return genericServiceCall({
			method: 'post',
			url: '/user/update-user-settings',
			loadingKey: 'updateUserSettings',
			payload: userSettings,
			onSuccess: () => userInfo.updateSettings(userSettings)
		});
	}
};
