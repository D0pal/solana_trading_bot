import { Pair } from '../interfaces/dexscreenerData.interface'
import { TokenTransactions } from 'shared-types/src/tokenInfo.interface'

export function convertPairToTokenTransactions(pair: Pair): TokenTransactions[] {
   const transactions: TokenTransactions[] = [
      {
         time: '5m',
         txCount: `${pair.txns.m5.buys + pair.txns.m5.sells}`,
         volume: pair.volume.m5,
         volumeInUSD: pair.volume.m5 * parseFloat(pair.priceUsd),
         uniqueWallets: 0, // Placeholder, real calculation requires additional data
         buys: pair.txns.m5.buys,
         sells: pair.txns.m5.sells,
         buyVolumeInUSD: pair.txns.m5.buys * parseFloat(pair.priceUsd),
         sellVolumeInUSD: pair.txns.m5.sells * parseFloat(pair.priceUsd),
         buyers: 0, // Placeholder
         sellers: 0, // Placeholder
      },
      {
         time: '1h',
         txCount: `${pair.txns.h1.buys + pair.txns.h1.sells}`,
         volume: pair.volume.h1,
         volumeInUSD: pair.volume.h1 * parseFloat(pair.priceUsd),
         uniqueWallets: 0, // Placeholder
         buys: pair.txns.h1.buys,
         sells: pair.txns.h1.sells,
         buyVolumeInUSD: pair.txns.h1.buys * parseFloat(pair.priceUsd),
         sellVolumeInUSD: pair.txns.h1.sells * parseFloat(pair.priceUsd),
         buyers: 0, // Placeholder
         sellers: 0, // Placeholder
      },
      {
         time: '6h',
         txCount: `${pair.txns.h6.buys + pair.txns.h6.sells}`,
         volume: pair.volume.h6,
         volumeInUSD: pair.volume.h6 * parseFloat(pair.priceUsd),
         uniqueWallets: 0, // Placeholder
         buys: pair.txns.h6.buys,
         sells: pair.txns.h6.sells,
         buyVolumeInUSD: pair.txns.h6.buys * parseFloat(pair.priceUsd),
         sellVolumeInUSD: pair.txns.h6.sells * parseFloat(pair.priceUsd),
         buyers: 0, // Placeholder
         sellers: 0, // Placeholder
      },
      {
         time: '24h',
         txCount: `${pair.txns.h24.buys + pair.txns.h24.sells}`,
         volume: pair.volume.h24,
         volumeInUSD: pair.volume.h24 * parseFloat(pair.priceUsd),
         uniqueWallets: 0, // Placeholder
         buys: pair.txns.h24.buys,
         sells: pair.txns.h24.sells,
         buyVolumeInUSD: pair.txns.h24.buys * parseFloat(pair.priceUsd),
         sellVolumeInUSD: pair.txns.h24.sells * parseFloat(pair.priceUsd),
         buyers: 0, // Placeholder
         sellers: 0, // Placeholder
      },
   ]

   return transactions
}

export function getPairWithMostLiquidity(pairs: Pair[]): Pair | undefined {
   if (pairs.length === 0) return undefined

   // Find the first pair with defined liquidity to start the comparison.
   let maxLiquidityPair: Pair | undefined = pairs.find((pair) => pair.liquidity !== undefined)

   // If no pair has liquidity data, return undefined or the first pair.
   if (!maxLiquidityPair) {
      return pairs[0] // Or return pairs[0] if you prefer to return the first pair by default.
   }

   // Start the loop from the pair after the initial max liquidity pair found
   const startIndex = pairs.indexOf(maxLiquidityPair) + 1

   for (let i = startIndex; i < pairs.length; i++) {
      if (pairs[i].liquidity && pairs[i].liquidity.usd > maxLiquidityPair.liquidity.usd) {
         maxLiquidityPair = pairs[i]
      }
   }

   return maxLiquidityPair
}

export function calculateTotalLiquidityInUsd(pairs: Pair[]): number {
   return pairs.reduce((total, pair) => {
      const liquidity = pair.liquidity?.usd || 0
      return total + liquidity
   }, 0)
}

export function getAllUniqueDexIds(pairs: Pair[]): string[] {
   return [...new Set(pairs.map((pair) => pair.dexId))]
}
