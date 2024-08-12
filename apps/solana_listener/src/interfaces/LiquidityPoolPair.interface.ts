import { PublicKey } from '@solana/web3.js'
import BigDecimal from 'src/common/BigDecimal'

interface NewTokenLpData {
   public_key: PublicKey
   amountPutInLp: BigDecimal
   tokenAOrB: 'A' | 'B'
}

interface WsolOrUsdcLpData {
   wsolOrUsdcAccount: 'WSOL' | 'USDC'
   public_key: PublicKey
   amountPutInLp: BigDecimal
   tokenAOrB: 'A' | 'B'
}

export interface LiquidityPoolPair {
   wsolOrUsdcData: WsolOrUsdcLpData
   newToken: NewTokenLpData
   pair_address: string
   creator_address: string
   creation_tx: string
   date_created: Date
}
