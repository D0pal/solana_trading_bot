<script lang="ts">
	import { PUBLIC_BACKEND_URL } from '$env/static/public';
	import axios from 'axios';
	import type { BuyTokenDto } from 'shared-types/src/dto/BuyToken.dto';
	import type { SellTokenDto } from 'shared-types/src/dto/SellToken.dto';

	async function buyTokens() {
		const buyTokenDto: BuyTokenDto = {
			solAmountIn: '20000000',
			walletAddress: '9ZSsGKz3eigKk2yZAzLJRV5jxQfNChkNwWpfattWjU3E',
			slippageInPercentage: 15,
			tokenAddress: '93CRzwgrZsHmXjS7T9GadUzZkyCoXerF9AgAcMZ3pump',
			autoSell: {
				userId: 6,
				walletId: 1,
				solAmountProfitTrigger: '23000000',
				solAmountLossTrigger: '17000000',
				slippage: '15',
				tokenAddressToSell: '93CRzwgrZsHmXjS7T9GadUzZkyCoXerF9AgAcMZ3pump'
			}
		};
		const { data } = await axios.post(PUBLIC_BACKEND_URL + '/user/buy-token', buyTokenDto, {
			withCredentials: true
		});
	}

	async function sellTokens() {
		const sellTokenDto: SellTokenDto = {
			tokenAmountIn: '3574930000',
			walletAddress: '9ZSsGKz3eigKk2yZAzLJRV5jxQfNChkNwWpfattWjU3E',
			slippageInPercentage: 15,
			tokenAddress: '93CRzwgrZsHmXjS7T9GadUzZkyCoXerF9AgAcMZ3pump'
		};

		const { data } = await axios.post(PUBLIC_BACKEND_URL + '/user/sell-token', sellTokenDto, {
			withCredentials: true
		});
	}
</script>

<h1>WELCOME TO THE DASHBOARD</h1>

<button on:click={buyTokens}>Buy Tokens!!!</button>

<button on:click={sellTokens}>Sell Tokens!!!</button>
