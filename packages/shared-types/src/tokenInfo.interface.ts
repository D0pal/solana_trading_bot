export interface TokenInfo {
   name: string;
   symbol: string;
   address: string;
   decimals: number;
   image: string;
   totalSupply: number;
   totalSupplyPriceInUSD: number;
   oneTokenPriceInUSD: number;
   transactions: TokenTransactions[];
   mintAuthority: string | null;
   freezeAuthority: string | null;
   metadataChangeAuthority: string | null;
   uniqueHolders: number;
   topHolders: TokenHolderInfo[];
   totalLiquidtyInUSD: number;
   topHoldersTokenSupplyDistribution: TopHoldersTokenSupplyDistribution;
   verifiedDexScreener: boolean;
   verifiedBirdEye: boolean;
   dexesBeingTradedOn: string[];
   socialMediaLinks: URLInfo[];
   tokenPairsInLP?: TokenPairsInLP[];
}

export interface TokenPairsInLP {
   primaryTokenName: "WSOL" | "USDC";
   primaryTokenAmountInLP: number;
   primaryTokenAmountInLPUSD: number;
   secondaryTokenAmountInLP: number;
   secondaryTokenAmountInLPUSD: number;
   initialPrimaryTokenInLP: number;
   initialSecondaryTokenInLP: number;
   percentageOfTotalSupplyLockedInLP: number;
   percentageOfTotalSupplyLockedInLPUSD: number;
   createdOnPumpFun: boolean;
   timestamp: Date;
   tokenPairCreator: string;
   areTokensLockedInLP: boolean;
   dexName: "Raydium";
}

export interface TokenHolderInfo {
   address: string;
   balance: number;
   worthInUSD: number;
   percentageOfTotalSupply: number;
}

export interface TokenTransactions {
   time: "5m" | "1h" | "6h" | "12h" | "24h";
   txCount: string;
   volume: number;
   volumeInUSD: number;
   uniqueWallets: number;
   buys: number;
   sells: number;
   buyVolumeInUSD: number;
   sellVolumeInUSD: number;
   buyers: number;
   sellers: number;
}

export interface TopTradersHoldingPercentageOfWholeSupply {
   topTradersLimit: "5" | "10" | "15" | "20";
   percentageSummed: number;
}

export interface TopHoldersTokenSupplyDistribution {
   top5: number;
   top10: number;
   top15: number;
   top20: number;
}

export type URLInfo = {
   url: string;
   platform?: string;
};
