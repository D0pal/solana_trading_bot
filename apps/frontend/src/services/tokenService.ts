import { loadingStore } from '$stores/loadingStore';
import type { TokenInfo } from 'shared-types/src/tokenInfo.interface';
import toast from 'svelte-french-toast';
import api from '../lib/api';
import { defaultTokenInfo, tokenInfo } from '../stores/tokenStore';
import { priceUpdateService } from './priceUpdateService';

export const tokenService = {
	async fetchTokenInfo(tokenAddress: string) {
		this.reset();
		const loadingKey = 'fetchTokenInfo';
		loadingStore.setLoading(loadingKey, true);

		try {
			priceUpdateService.addNewTokenAddressToFetchPrice(tokenAddress);
			await priceUpdateService.startPriceUpdate();
			const response = await api.get(`/solanaToken/${tokenAddress}`);
			tokenInfo.update(() => response.data as TokenInfo);
		} catch (error) {
			console.error(error);
			toast.error('Failed to fetch token info');
		} finally {
			loadingStore.setLoading(loadingKey, false);
		}
	},
	reset() {
		priceUpdateService.reset();
		tokenInfo.update(() => defaultTokenInfo);
	}
};
