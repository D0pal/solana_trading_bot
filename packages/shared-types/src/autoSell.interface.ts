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
