import { InsertAutoSell } from "../drizzle.types";

export interface BuyTokenDto {
   walletAddress: string;
   tokenAddress: string;
   solAmountIn: string;
   slippageInPercentage: number;
   prioritizationFeeLamports?: number | "auto";
   autoSell?: Omit<InsertAutoSell, "tokenAmountToSell">; // Use 'any' or a more specific type if available
}
