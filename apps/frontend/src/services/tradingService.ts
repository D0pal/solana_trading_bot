import { loadingStore } from '$stores/loadingStore';
import toast from 'svelte-french-toast';
import api from '../lib/api';
import type { BuyTokenDto } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';

export const tradingService = {
	async buyTokens(buyTokenFormData: BuyTokenDto) {
		const loadingKey = 'buyTokens';
		loadingStore.setLoading(loadingKey, true);
		try {
			const response = await api.post<{ message: string }>(`/user/buy-token/`, buyTokenFormData);
			toast.success(response.data.message);
		} catch (err) {
			console.error(err);
		} finally {
			loadingStore.setLoading(loadingKey, false);
		}
	}
};
