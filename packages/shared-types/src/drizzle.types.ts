import {
   usersTable,
   authProvidersTable,
   userWalletsTable,
   autoSellTable,
   tokenPairInfo,
   tokenPairTransactionsTable,
   dexTransactionsTable,
   dexTransactionsErrorsTable,
} from "backend/src/drizzle/schema";

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertAuthProvider = typeof authProvidersTable.$inferInsert;
export type SelectAuthProvider = typeof authProvidersTable.$inferSelect;

export type InsertUserWallet = typeof userWalletsTable.$inferInsert;
export type SelectUserWallet = typeof userWalletsTable.$inferSelect;

export type InsertAutoSell = typeof autoSellTable.$inferInsert;
export type SelectAutoSell = typeof autoSellTable.$inferSelect;

export type InsertTokenPairInfo = typeof tokenPairInfo.$inferInsert;
export type SelectTokenPairInfo = typeof tokenPairInfo.$inferSelect;

export type InsertTokenPairTransactions = typeof tokenPairTransactionsTable.$inferInsert;
export type SelectTokenPairTransactions = typeof tokenPairTransactionsTable.$inferSelect;

export type InsertDexTransactionLogs = typeof dexTransactionsTable.$inferInsert;
export type SelectDexTransactionLogs = typeof dexTransactionsTable.$inferSelect;

export type InsertDexTransactionErrors = typeof dexTransactionsErrorsTable.$inferInsert;
export type SelectDexTransactionErrors = typeof dexTransactionsErrorsTable.$inferSelect;

export enum AutoSellStrategy {
   SIMPLE = "simple",
   GRID = "grid",
}

export interface SimpleStrategyParams {
   profitPercentage: number;
   lossPercentage: number;
}

export interface ProfitTarget {
   multiplier: number;
   sellPercentage: number;
}

export interface GridStrategyParams {
   stopLossType: "static" | "trailing" | "breakeven";
   stopLossPercentage: number;
   profitTargets: ProfitTarget[];
}

export interface AutoSellDto {
   walletAddress: string;
   tokenAddress: string;
   tokenAmountToSell: string;
   strategy: AutoSellStrategy;
   strategyParams: SimpleStrategyParams | GridStrategyParams;
   initialPrice: number;
}
