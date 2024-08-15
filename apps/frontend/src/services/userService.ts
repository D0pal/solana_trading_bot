/* eslint-disable @typescript-eslint/no-unused-vars */
import api from '$lib/api';
import type { AutoSellPreset } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';
import { userInfo } from '$stores/userStore';
import toast from 'svelte-french-toast';
import { loadingStore } from '$stores/loadingStore';

export const userService = {
	async addAutoSellPreset(autoSellPreset: AutoSellPreset) {
		const loadingKey = 'addAutoSellPreset';
		loadingStore.setLoading(loadingKey, true);

		try {
			const response = await api.post<{ message: string }>('/user/add-auto-sell-preset', autoSellPreset);
			toast.success(response.data.message);
			userInfo.addAutoSellPreset(autoSellPreset);
		} catch (err) {
			console.error(err);
		} finally {
			loadingStore.setLoading(loadingKey, false);
		}
	},

	async editAutoSellPreset(autoSellPreset: AutoSellPreset) {
		const loadingKey = 'editAutoSellPreset';
		loadingStore.setLoading(loadingKey, true);

		try {
			const response = await api.post<{ message: string }>('/user/edit-auto-sell-preset', autoSellPreset);
			toast.success(response.data.message);
			userInfo.editAutoSellPreset(autoSellPreset);
		} catch (err) {
			console.error(err);
		} finally {
			loadingStore.setLoading(loadingKey, false);
		}
	},

	async deleteAutoSellPreset(autoSellPresetId: string) {
		const loadingKey = 'deleteAutoSellPreset';
		loadingStore.setLoading(loadingKey, true);

		try {
			const response = await api.delete<{ message: string }>('/user/delete-auto-sell-preset/' + autoSellPresetId);
			toast.success(response.data.message);
			userInfo.deleteAutoSellPreset(autoSellPresetId);
		} catch (err) {
			console.error(err);
		} finally {
			loadingStore.setLoading(loadingKey, false);
		}
	}
};
