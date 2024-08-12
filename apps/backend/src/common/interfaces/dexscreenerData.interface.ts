export interface DexScreenerResponse {
   schemaVersion: string
   pairs: Pair[]
}

export interface Pair {
   chainId: string
   dexId: string
   url: string
   pairAddress: string
   labels?: string[]
   baseToken: Token
   quoteToken: Token
   priceNative: string
   priceUsd: string
   txns: Transactions
   volume: Volume
   priceChange: PriceChange
   liquidity: Liquidity
   fdv: number
   pairCreatedAt: number
   info?: Info
}

interface Token {
   address: string
   name: string
   symbol: string
}

interface Transactions {
   m5: TransactionDetail
   h1: TransactionDetail
   h6: TransactionDetail
   h24: TransactionDetail
}

interface TransactionDetail {
   buys: number
   sells: number
}

interface Volume {
   h24: number
   h6: number
   h1: number
   m5: number
}

interface PriceChange {
   m5: number
   h1: number
   h6: number
   h24: number
}

interface Liquidity {
   usd: number
   base: number
   quote: number
}

interface Info {
   imageUrl: string
   websites: Website[]
   socials: Social[]
}

interface Website {
   label: string
   url: string
}

interface Social {
   url: string
   type: string
}
