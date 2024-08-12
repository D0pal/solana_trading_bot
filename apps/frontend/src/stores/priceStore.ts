import { writable, type Writable } from 'svelte/store';

interface TokenPricesInUsd {
	[tokenAddress: string]: number;
}

export const tokenPricesInUSD: Writable<TokenPricesInUsd> = writable({});
