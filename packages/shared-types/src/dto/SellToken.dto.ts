export interface SellTokenDto {
   walletAddress: string;
   tokenAddress: string;
   tokenAmountIn: string;
   slippageInPercentage: number;
   prioritizationFeeLamports?: number | "auto";
}
