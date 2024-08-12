import api from '../lib/api';
import { tokenPricesInUSD } from '$stores/priceStore';
import { type JupiterPriceReponse } from 'shared-types/src/JupiterPriceResponse.interface';

export const priceUpdateService = {
	tokenAddressesToFetchPrice: ['So11111111111111111111111111111111111111112'],
	vsToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
	priceFetchingInterval: 10000,
	priceFetchingIntervalId: null as number | NodeJS.Timeout | null,

	async fetchPriceUpdate() {
		const response = await api.get<JupiterPriceReponse>(`/solana/price`, {
			params: {
				tokenAddresses: this.tokenAddressesToFetchPrice.join(','),
				vsToken: this.vsToken
			}
		});
		for (const tokenAddress in response.data.data) {
			tokenPricesInUSD.update((tokenPricesInUsd) => {
				tokenPricesInUsd[tokenAddress] = response.data.data[tokenAddress].price;
				return tokenPricesInUsd;
			});
		}
	},

	reset() {
		this.removeAllTokensExceptDefault();
		this.stopPriceUpdate();
	},

	removeAllTokensExceptDefault() {
		this.tokenAddressesToFetchPrice = ['So11111111111111111111111111111111111111112'];
	},

	addNewTokenAddressToFetchPrice(tokenAddress: string) {
		this.tokenAddressesToFetchPrice.push(tokenAddress);
	},

	async startPriceUpdate() {
		await this.fetchPriceUpdate();
		this.priceFetchingIntervalId = setInterval(() => {
			this.fetchPriceUpdate();
		}, this.priceFetchingInterval);
	},

	stopPriceUpdate() {
		if (this.priceFetchingIntervalId) {
			clearInterval(this.priceFetchingIntervalId as number);
		}
	}
};
