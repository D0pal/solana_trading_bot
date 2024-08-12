import { writable, type Writable } from 'svelte/store';
import { type TokenInfo } from 'shared-types/src/tokenInfo.interface';

export const defaultTokenInfo: TokenInfo = {
	name: '',
	symbol: '',
	address: '',
	decimals: 0,
	image: '',
	totalSupply: 0,
	totalSupplyPriceInUSD: 0,
	oneTokenPriceInUSD: 0,
	transactions: [],
	mintAuthority: null,
	freezeAuthority: null,
	metadataChangeAuthority: null,
	uniqueHolders: 0,
	topHolders: [],
	totalLiquidtyInUSD: 0,
	topHoldersTokenSupplyDistribution: {
		top5: 0,
		top10: 0,
		top15: 0,
		top20: 0
	},
	verifiedDexScreener: false,
	verifiedBirdEye: false,
	dexesBeingTradedOn: [],
	socialMediaLinks: [],
	tokenPairsInLP: []
};

export const tokenInfo: Writable<TokenInfo> = writable(defaultTokenInfo);
