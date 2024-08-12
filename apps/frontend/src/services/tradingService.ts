import api from '../lib/api';
import type { BuyTokenDto } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';

export const tradingService = {
	async buyTokens(buyTokenFormData: BuyTokenDto) {
		await api.post(`/user/buy-token/`, buyTokenFormData);
	}
};
