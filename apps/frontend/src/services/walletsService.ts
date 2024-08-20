import { genericServiceCall } from '$lib/apiUtils';
import { userInfo } from '$stores/userStore';
import type { UserWalletInfo } from 'shared-types/src/userInfo.interface';

export const walletsService = {
	async refreshWallets() {
		return genericServiceCall<null, UserWalletInfo[]>({
			method: 'get',
			url: '/user/wallets',
			loadingKey: 'refreshWallets',
			onSuccess: (data) => userInfo.updateWallets(data)
		});
	},

	async createWallet(name: string) {
		return genericServiceCall<{ name: string }, { message: string }>({
			method: 'post',
			url: '/user/wallets',
			loadingKey: 'createWallet',
			payload: { name },
			successMessage: 'Wallet created successfully', // fallback message
			onSuccess: () => this.refreshWallets()
		});
	},

	async deleteWallet(address: string) {
		return genericServiceCall<null, { message: string }>({
			method: 'delete',
			url: `/user/wallets/${address}`,
			loadingKey: 'deleteWallet',
			successMessage: 'Wallet deleted successfully', // fallback message
			onSuccess: () => this.refreshWallets()
		});
	},

	async transferFunds(fromAddress: string, toAddress: string, amount: number) {
		return genericServiceCall<{ fromAddress: string; toAddress: string; amount: number }, { message: string }>({
			method: 'post',
			url: '/user/transfer',
			loadingKey: 'transferFunds',
			payload: { fromAddress, toAddress, amount },
			successMessage: 'Funds transferred successfully', // fallback message
			onSuccess: () => this.refreshWallets()
		});
	},

	async exportPrivateKey(address: string) {
		return genericServiceCall<null, { privateKey: string }>({
			method: 'get',
			url: `/user/wallets/${address}/export`,
			loadingKey: 'exportPrivateKey'
		});
	},

	async importWallet(privateKey: string, name: string) {
		return genericServiceCall<{ privateKey: string; name: string }, { message: string }>({
			method: 'post',
			url: '/user/wallets/import',
			loadingKey: 'importWallet',
			payload: { privateKey, name },
			successMessage: 'Wallet imported successfully', // fallback message
			onSuccess: () => this.refreshWallets()
		});
	},

	async splitFunds(fromAddress: string, toAddresses: string[], amount: number) {
		return genericServiceCall<{ fromAddress: string; toAddresses: string[]; amount: number }, { message: string }>({
			method: 'post',
			url: '/user/split-funds',
			loadingKey: 'splitFunds',
			payload: { fromAddress, toAddresses, amount },
			successMessage: 'Funds split successfully', // fallback message
			onSuccess: () => this.refreshWallets()
		});
	}
};
