import {
   ParsedTransaction,
   ParsedTransactionMeta,
   TransactionVersion,
   ParsedBlockResponse,
   ParsedMessageAccount,
   ParsedMessage,
} from '@solana/web3.js'
export type ParsedBlockTransaction = Omit<
   {
      transaction: ParsedTransaction
      meta: ParsedTransactionMeta | null
      version?: TransactionVersion
   },
   'transaction'
> & {
   transaction: ParsedTransaction & {
      accountKeys: ParsedMessageAccount[]
   }
}
