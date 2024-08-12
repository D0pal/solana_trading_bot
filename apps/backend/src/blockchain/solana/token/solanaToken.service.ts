/* eslint-disable @typescript-eslint/no-unused-vars */
// src/blockchain/solana/token/token.service.ts
import { Inject, Injectable } from '@nestjs/common'
import { SolanaService } from '../solana.service'
import { getMint, getAccount, AccountLayout } from '@solana/spl-token'
import { PublicKey as SolanaPublicKey } from '@solana/web3.js'
import { PublicKey as UmiPublicKey } from '@metaplex-foundation/umi-public-keys'
import { fetchMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'
import { TokenHolderInfo, TokenInfo, TokenTransactions, URLInfo } from 'shared-types/src/tokenInfo.interface'
import axios from 'axios'
import { DexScreenerResponse } from 'src/common/interfaces/dexscreenerData.interface'
import {
   getPairWithMostLiquidity,
   convertPairToTokenTransactions,
   calculateTotalLiquidityInUsd,
   getAllUniqueDexIds,
} from 'src/common/helpers/convertDexscreenerData'
import { sleep } from 'src/common/helpers/sleep'
import { SelectDexTransactionLogs } from 'src/drizzle/schema'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider'
import * as schema from 'src/drizzle/schema'
import { gte, and, eq } from 'drizzle-orm'
import * as fs from 'fs'

@Injectable()
export class SolanaTokenService {
   constructor(
      private solanaService: SolanaService,
      @Inject(DrizzleAsyncProvider)
      private db: PostgresJsDatabase<typeof schema>,
   ) {}

   async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
      this.fetchTransactionsFromDatabase(tokenAddress)
      const mint = await getMint(this.solanaService.quickNodeConnection, new SolanaPublicKey(tokenAddress))

      const tokenMetadata = await fetchMetadata(
         this.solanaService.umi,
         findMetadataPda(this.solanaService.umi, {
            mint: tokenAddress as UmiPublicKey,
         }),
      )

      // console.log(tokenMetadata)

      const dexScreenerData: DexScreenerResponse = await this.fetchFromDexScreener(tokenAddress)
      const pairWithMostLiquidity = getPairWithMostLiquidity(dexScreenerData.pairs)
      const topHolders = await this.fetchTopHolders(
         tokenAddress,
         Number(mint.supply) / 10 ** mint.decimals,
         parseFloat(pairWithMostLiquidity.priceUsd),
      )

      const oneTokenPriceInUSD = await this.fetchTokenPrice(tokenAddress)
      const socialMediaAndImage = await this.fetchSocialMediaLinksAndImage(tokenMetadata.uri)

      // Initialize and populate the TokenInfo object
      const tokenInfo: TokenInfo = {
         name: tokenMetadata.name, // Replace with actual fetched data
         symbol: tokenMetadata.symbol, // Replace with actual fetched data
         address: tokenAddress,
         decimals: mint.decimals,
         totalSupply: Number(mint.supply),
         totalSupplyPriceInUSD: (Number(mint.supply) / 10 ** mint.decimals) * oneTokenPriceInUSD,
         oneTokenPriceInUSD: oneTokenPriceInUSD,
         transactions: convertPairToTokenTransactions(pairWithMostLiquidity),
         mintAuthority: mint.mintAuthority ? mint.mintAuthority.toBase58() : null,
         freezeAuthority: mint.freezeAuthority ? mint.freezeAuthority.toBase58() : null,
         metadataChangeAuthority: tokenMetadata.updateAuthority,
         uniqueHolders: 0,
         totalLiquidtyInUSD: calculateTotalLiquidityInUsd(dexScreenerData.pairs),
         topHolders: topHolders,
         topHoldersTokenSupplyDistribution: this.getTopRanksExcludingOwners(topHolders),
         verifiedDexScreener: await this.checkVerifiedDexScreener(tokenAddress),
         dexesBeingTradedOn: getAllUniqueDexIds(dexScreenerData.pairs),
         verifiedBirdEye: await this.checkVerifiedBirdEye(tokenAddress),
         socialMediaLinks: socialMediaAndImage.urlInfo,
         image: socialMediaAndImage.image,
      }

      return tokenInfo
   }

   private getTopRanksExcludingOwners(elements: TokenHolderInfo[]) {
      // 5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1 = Raydium
      const excludedOwners = ['5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1']

      const filteredElements = elements.filter((element) => !excludedOwners.includes(element.address))

      return {
         top5: filteredElements.slice(0, 5).reduce((acc, curr) => acc + curr.percentageOfTotalSupply, 0),
         top10: filteredElements.slice(0, 10).reduce((acc, curr) => acc + curr.percentageOfTotalSupply, 0),
         top15: filteredElements.slice(0, 15).reduce((acc, curr) => acc + curr.percentageOfTotalSupply, 0),
         top20: filteredElements.slice(0, 20).reduce((acc, curr) => acc + curr.percentageOfTotalSupply, 0),
      }
   }

   private async fetchFromDexScreener(tokenAddress: string): Promise<DexScreenerResponse> {
      try {
         const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`)
         return response.data as DexScreenerResponse
      } catch (error) {
         console.error('Error fetching data from DexScreener:', error)
         throw error
      }
   }

   // private async fetchTokenPairInfo(tokenAddress: string): Promise<TokenPairsInLP[]> {}

   private async fetchTransactionsFromDatabase(tokenAddress: string) {
      const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)

      const transactions: SelectDexTransactionLogs[] = await this.db
         .select()
         .from(schema.dexTransactionsTable)
         .where(and(gte(schema.dexTransactionsTable.timestamp, yesterday), eq(schema.dexTransactionsTable.secondaryTokenAddress, tokenAddress)))

      fs.writeFileSync('transactions.json', JSON.stringify(transactions, null, 2))

      // function splitAndAggregateTransactions(transactions, timeFrame) {
      //    const timeFrames = {
      //       '5m': 5,
      //       '1h': 60,
      //       '6h': 360,
      //       '12h': 720,
      //       '24h': 1440,
      //    }
      //    const minutesPerFrame = timeFrames[timeFrame]

      //    // Organize transactions into buckets based on time intervals
      //    const buckets = {}

      //    transactions.forEach((tx) => {
      //       // Calculate the bucket key as the start of the interval
      //       const intervalStart = moment(tx.timestamp)
      //          .startOf('minute')
      //          .subtract(moment(tx.timestamp).minute() % minutesPerFrame, 'minutes')
      //       const key = intervalStart.format()

      //       if (!buckets[key]) {
      //          buckets[key] = []
      //       }
      //       buckets[key].push(tx)
      //    })

      //    // Process each bucket to generate aggregated results
      //    const results = []

      //    Object.keys(buckets).forEach((key) => {
      //       const aggregatedData = aggregateTransactions(buckets[key], timeFrame)
      //       results.push(aggregatedData)
      //    })

      //    return results
      // }

      // function aggregateTransactions(transactions, timeFrame) {
      //    const aggregated = {
      //       time: timeFrame,
      //       txCount: transactions.length.toString(),
      //       volume: 0,
      //       volumeInUSD: 0,
      //       uniqueWallets: new Set(),
      //       buys: 0,
      //       sells: 0,
      //       buyVolumeInUSD: 0,
      //       sellVolumeInUSD: 0,
      //       buyers: new Set(),
      //       sellers: new Set(),
      //    }

      //    transactions.forEach((tx) => {
      //       aggregated.volume += tx.primaryTokenAmount + tx.secondaryTokenAmount
      //       aggregated.volumeInUSD += tx.transactionValueInUsd
      //       aggregated.uniqueWallets.add(tx.signer)

      //       if (tx.transactionType === 'buy') {
      //          aggregated.buys++
      //          aggregated.buyVolumeInUSD += tx.transactionValueInUsd
      //          aggregated.buyers.add(tx.signer)
      //       } else if (tx.transactionType === 'sell') {
      //          aggregated.sells++
      //          aggregated.sellVolumeInUSD += tx.transactionValueInUsd
      //          aggregated.sellers.add(tx.signer)
      //       }
      //    })

      //    aggregated.uniqueWallets = aggregated.uniqueWallets.size
      //    aggregated.buyers = aggregated.buyers.size
      //    aggregated.sellers = aggregated.sellers.size

      //    return aggregated
      // }

      // return results
   }

   private async fetchTopHolders(tokenAddress: string, totalSupply: number, oneTokenPriceInUSD: number): Promise<TokenHolderInfo[]> {
      const tokenLargestAccounts = await this.solanaService.quickNodeConnection.getTokenLargestAccounts(new SolanaPublicKey(tokenAddress))
      const tokenAccountInfo = await this.solanaService.defaultSolanaConnection.getMultipleAccountsInfo(
         tokenLargestAccounts.value.map((account) => account.address),
      )
      const tokenHolders: TokenHolderInfo[] = []
      for (let i = 0; i < tokenLargestAccounts.value.length; i++) {
         const account = tokenLargestAccounts.value[i]
         const tokenAccountData = AccountLayout.decode(tokenAccountInfo[i].data)
         tokenHolders.push({
            address: tokenAccountData.owner.toBase58(),
            balance: account.uiAmount,
            worthInUSD: account.uiAmount * oneTokenPriceInUSD,
            percentageOfTotalSupply: (account.uiAmount / totalSupply) * 100,
         })
      }
      return tokenHolders
   }

   private async checkTokensLockedInLP(tokenAddress: string): Promise<boolean> {
      // Implement the logic to check if tokens are locked in LP
      return false
   }

   private async fetchTokenCreator(tokenAddress: string): Promise<string> {
      // Implement the logic to fetch token creator
      return ''
   }

   private async checkVerifiedDexScreener(tokenAddress: string): Promise<boolean> {
      // Implement the logic to check if verified on Dex Screener
      return false
   }

   private async checkVerifiedBirdEye(tokenAddress: string): Promise<boolean> {
      // Implement the logic to check if verified on BirdEye
      return false
   }

   private async fetchSocialMediaLinksAndImage(url: string): Promise<{ image: string; urlInfo: URLInfo[] }> {
      try {
         const response = await axios.get(url)
         const data = response.data
         console.log(data)

         const links: URLInfo[] = []
         const socialMediaPatterns = {
            Facebook: [/facebook\.com/, /fb\.com/],
            Twitter: [/x\.com/],
            Instagram: [/instagram\.com/, /instagr\.am/],
            LinkedIn: [/linkedin\.com/],
            YouTube: [/youtube\.com/, /youtu\.be/],
            TikTok: [/tiktok\.com/],
            Reddit: [/reddit\.com/],
            Telegram: [/t\.me/],
            PumpFun: [/pump\.fun/],
         }

         function checkValue(value: any): void {
            if (typeof value === 'string' && isValidURL(value)) {
               const urlInfo: URLInfo = { url: value }
               for (const [name, patterns] of Object.entries(socialMediaPatterns)) {
                  if (patterns.some((pattern) => pattern.test(value))) {
                     urlInfo.platform = name
                     break
                  } else {
                     urlInfo.platform = 'Website'
                  }
               }
               links.push(urlInfo)
            } else if (typeof value === 'object' && value !== null) {
               for (const key in value) {
                  checkValue(value[key])
               }
            }
         }

         function isValidURL(url: string): boolean {
            try {
               new URL(url)
               return true
            } catch (_) {
               return false
            }
         }

         checkValue(data)
         return { image: data.image, urlInfo: links.filter((link) => link.url != data.image) }
      } catch (error) {
         console.error('Error fetching data:', error)
         return { image: '', urlInfo: [] }
      }
   }

   private async fetchTokenPrice(tokenAddress: string): Promise<number> {
      const response = await axios.get(`https://api-v3.raydium.io/mint/price?mints=${tokenAddress}`)
      return response.data.data[tokenAddress]
   }
}
