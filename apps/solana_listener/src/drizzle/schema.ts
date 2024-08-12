import { pgTable, pgEnum, pgSchema, AnyPgColumn } from 'drizzle-orm/pg-core'
import { serial, varchar, text, integer, numeric, boolean, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const usersTable = pgTable('users_table', {
   id: serial('id').primaryKey(),
   name: text('name').notNull(),
   age: integer('age').notNull(),
   email: text('email').notNull().unique(),
})

// Enum for TokenTransactions time
export const timeEnum = pgEnum('time', ['5m', '1h', '6h', '12h', '24h'])
export const dexTransactionTypeEnum = pgEnum('dex_transaction_type', ['buy', 'sell', 'add_liquidity', 'remove_liquidity', 'init_lp'])
export const primaryTokenNameEnum = pgEnum('primary_token_name', ['WSOL', 'USDC'])
export const dexNameEnum = pgEnum('dex_name', ['Raydium'])

// TokenInfo Table
export const tokenPairInfo = pgTable('token_pair_info', {
   id: serial('id').primaryKey(),
   primaryTokenName: primaryTokenNameEnum('primary_token_name').notNull(),
   initialPrimaryTokenAmountInLP: numeric('initial_primary_token_in_lp').notNull(),
   secondaryTokenAddress: varchar('secondary_token_address', { length: 44 }).notNull(),
   initialSecondaryTokenAmountInLP: numeric('initial_secondary_token_in_lp').notNull(),
   tokenPairCreator: varchar('token_pair_creator', { length: 44 }),
   timestamp: timestamp('timestamp').notNull(),
   creationTransaction: varchar('creation_transaction', { length: 90 }).notNull(),
   verifiedDexScreener: boolean('verified_dex_screener'),
   verifiedBirdEye: boolean('verified_bird_eye'),
   dexName: dexNameEnum('dex_name').notNull(),
})

// TokenTransactions Table
export const tokenPairTransactionsTable = pgTable('token_pair_transactions', {
   id: serial('id').primaryKey(),
   tokenPairId: integer('token_pair_id').notNull(),
   time: timeEnum('time'),
   txCount: integer('tx_count'),
   volume: numeric('volume'),
   volumeInUSD: numeric('volume_in_usd'),
   uniqueWallets: integer('unique_wallets'),
   buys: integer('buys'),
   sells: integer('sells'),
   buyVolumeInUSD: numeric('buy_volume_in_usd'),
   sellVolumeInUSD: numeric('sell_volume_in_usd'),
   buyers: integer('buyers'),
   sellers: integer('sellers'),
})

export const dexTransactionsTable = pgTable('dex_transactions', {
   id: serial('id').primaryKey(),
   transactionId: varchar('transaction_id', { length: 90 }).notNull(),
   timestamp: timestamp('timestamp').notNull(),
   blockNumber: integer('block_number').notNull(),
   signer: varchar('signer', { length: 44 }).notNull(),
   primaryTokenName: primaryTokenNameEnum('primary_token_address').notNull(), // WSOL or USDC
   primaryTokenAmount: numeric('primary_token_amount', { precision: 20, scale: 8 }).notNull(), // Amount of WSOL or USDC
   primaryTokenPrice: numeric('primary_token_price', { precision: 20, scale: 8 }).notNull(), // Price of WSOL or USDC
   secondaryTokenAddress: varchar('secondary_token_address', { length: 44 }).notNull(), // Random token
   secondaryTokenAmount: numeric('secondary_token_amount', { precision: 20, scale: 8 }).notNull(), // Amount of the random token
   secondaryTokenPrice: numeric('secondary_token_price', { precision: 20, scale: 8 }).notNull(), // Price of the random token
   transactionType: dexTransactionTypeEnum('transaction_type').notNull(), // Buy, Sell, AddLiquidity, RemoveLiquidity
   transactionValueInUsd: numeric('transaction_value_in_usd', { precision: 20, scale: 8 }).notNull(), // Value of the transaction in USD
   dexName: dexNameEnum('dex_name').notNull(), // Name of the DEX
   isUsingJupiter: boolean('is_using_jupiter').notNull(), // Whether Jupiter is used
})

export const dexTransactionsErrorsTable = pgTable('dex_transactions_errors', {
   id: serial('id').primaryKey(),
   transactionId: varchar('transaction_id', { length: 87 }).notNull(),
   signer: varchar('signer', { length: 44 }).notNull(),
   error: text('error').notNull(),
   dexName: dexNameEnum('dex_name').notNull(),
})

// Relations
// export const tokenInfoRelations = relations(tokenPairInfo, ({ one, many }) => ({
//    transactions: many(tokenTransactionsTable),
// }))

// export const tokenTransactionsRelations = relations(tokenTransactionsTable, ({ one }) => ({
//    token: one(tokenPairInfo, {
//       fields: [tokenTransactionsTable.tokenAddress],
//       references: [tokenPairInfo.address],
//    }),
// }))

export type InsertUser = typeof usersTable.$inferInsert
export type SelectUser = typeof usersTable.$inferSelect

export type InsertTokenPairInfo = typeof tokenPairInfo.$inferInsert
export type SelectTokenPairInfo = typeof tokenPairInfo.$inferSelect

export type InsertTokenPairTransactions = typeof tokenPairTransactionsTable.$inferInsert
export type SelectTokenPairTransactions = typeof tokenPairTransactionsTable.$inferSelect

export type InsertDexTransactionLogs = typeof dexTransactionsTable.$inferInsert
export type SelectDexTransactionLogs = typeof dexTransactionsTable.$inferSelect
