export interface TokenInfo {
   name: string
   symbol: string
   address: string
   decimals: number
   totalSupply: number
   totalSupplyPriceInUSD: number
   oneTokenPriceInUSD: number
   transactions: TokenTransactions[]
   mintAuthority: string | null
   freezeAuthority: string | null
   metadataChangeAuthority: string | null
   areTokensLockedInLP: boolean
   creationTransaction: string
   uniqueHolders: number
   topHolders: TokenHolderInfo[]
   topHoldersTokenSupplyDistribution: TopHoldersTokenSupplyDistribution
   tokenCreator: string
   createdAt: Date
   verifiedDexScreener: boolean
   verifiedBirdEye: boolean
   socialMediaLinks: URLInfo[]
   initialSolanaLockedInLP: number
   initialTokenLockedInLP: number
   percentageOfTotalSupplyLockedInLP: number
   percentageOfTotalSupplyLockedInLPUSD: number
   createdOnPumpFun: boolean
}

export interface TokenHolderInfo {
   address: string
   balance: number
   worthInUSD: number
   percentageOfTotalSupply: number
}

export interface TokenTransactions {
   time: '5m' | '1h' | '6h' | '12h' | '24h'
   txCount: string
   volume: number
   volumeInUSD: number
   uniqueWallets: number
   buys: number
   sells: number
   buyVolumeInUSD: number
   sellVolumeInUSD: number
   buyers: number
   sellers: number
}

export interface TopTradersHoldingPercentageOfWholeSupply {
   topTradersLimit: '5' | '10' | '15' | '20'
   percentageSummed: number
}

export interface TopHoldersTokenSupplyDistribution {
   top5: number
   top10: number
   top15: number
   top20: number
}

export type URLInfo = {
   url: string
   platform?: string
}
