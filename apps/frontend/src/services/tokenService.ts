import type { TokenInfo } from 'shared-types/src/tokenInfo.interface';
import api from '../lib/api';
import { defaultTokenInfo, tokenInfo } from '../stores/tokenStore';
import { priceUpdateService } from './priceUpdateService';

export const tokenService = {
	loading: false,
	async fetchTokenInfo(tokenAddress: string) {
		this.reset();
		this.loading = true;
		priceUpdateService.addNewTokenAddressToFetchPrice(tokenAddress);
		await priceUpdateService.startPriceUpdate();

		const response = await api.get(`/solanaToken/${tokenAddress}`);
		tokenInfo.update(() => response.data as TokenInfo);
		this.loading = false;
	},
	reset() {
		priceUpdateService.reset();
		tokenInfo.update(() => defaultTokenInfo);
	}
};
