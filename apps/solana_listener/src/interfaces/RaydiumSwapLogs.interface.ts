import { PublicKey } from '@solana/web3.js'
import BigDecimal from 'src/common/BigDecimal'

export interface RaydiumInitLogs {
   log_type: number
   time: BigDecimal
   pc_decimals: number
   coin_decimals: number
   pc_lot_size: BigDecimal
   coin_lot_size: BigDecimal
   pc_amount: BigDecimal
   coin_amount: BigDecimal
   market: PublicKey
}

export enum RaydiumSwapDirection {
   BoughtBaseToken = 0,
   BoughtQuoteToken = 1,
}

export interface RaydiumSwapLogs {
   direction: RaydiumSwapDirection
   amount_in: BigDecimal
   amount_out: BigDecimal
   base_token_amount_before: BigDecimal
   base_token_amount_after: BigDecimal
   quote_token_amount_before: BigDecimal
   quote_token_amount_after: BigDecimal
}

export interface RaydiumRemoveLiquidityLogs {
   lp_token_amount_burn: BigDecimal
   base_token_amount_out: BigDecimal
   quote_token_amount_out: BigDecimal

   base_token_amount_before: BigDecimal
   base_token_amount_after: BigDecimal

   quote_token_amount_before: BigDecimal
   quote_token_amount_after: BigDecimal

   lp_token_amount_before: BigDecimal
   lp_token_amount_after: BigDecimal
}

export interface RaydiumAddLiquidityLogs {
   lp_token_amount_mint: BigDecimal
   base_token_amount_in: BigDecimal
   quote_token_amount_in: BigDecimal

   base_token_amount_before: BigDecimal
   base_token_amount_after: BigDecimal

   quote_token_amount_before: BigDecimal
   quote_token_amount_after: BigDecimal

   lp_token_amount_before: BigDecimal
   lp_token_amount_after: BigDecimal
}

export function isRaydiumSwapLogs(logs: any): logs is RaydiumSwapLogs {
   return logs.direction !== undefined
}

export function isRaydiumRemoveLiquidityLogs(logs: any): logs is RaydiumRemoveLiquidityLogs {
   return logs.lp_token_amount_burn !== undefined
}

export function isRaydiumAddLiquidityLogs(logs: any): logs is RaydiumAddLiquidityLogs {
   return logs.lp_token_amount_mint !== undefined
}
