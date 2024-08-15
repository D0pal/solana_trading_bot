import {
   object,
   string,
   number,
   boolean,
   array,
   minLength,
   union,
   literal,
   minValue,
   maxValue,
   pipe,
   reduceItems,
   variant,
   InferInput,
   InferOutput,
   optional,
   transform,
   regex,
   maxLength,
   check,
} from "valibot";

const addressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const baseProfitTargetSchema = object({
   multiplier: pipe(number(), minValue(1)),
   sellPercentage: pipe(number(), minValue(0), maxValue(100)),
   done: optional(boolean()),
});

const trailingProfitTargetSchema = object({
   ...baseProfitTargetSchema.entries,
   trailingStopLossAfter: pipe(number(), minValue(0)),
});

const simpleAutoSellStrategy = object({
   strategyName: literal("simple"),
   profitPercentage: pipe(number(), minValue(0)),
   stopLossPercentage: pipe(number(), minValue(0)),
});

const baseGridAutoSellStrategy = object({
   strategyName: literal("grid"),
   stopLossPercentage: pipe(number(), minValue(0), maxValue(100)),
   profitTargets: pipe(
      array(baseProfitTargetSchema),
      check((array) => {
         const totalSellPercentage = array.reduce((sum, target) => sum + target.sellPercentage, 0);
         return totalSellPercentage <= 100;
      }, "Total sell percentage must be less than or equal to 100")
   ),
});

const staticStopLossGrid = object({
   ...baseGridAutoSellStrategy.entries,
   stopLossType: literal("static"),
});

const trailingStopLossGrid = object({
   ...baseGridAutoSellStrategy.entries,
   stopLossType: literal("trailing"),
   profitTargets: array(trailingProfitTargetSchema),
});

const breakEvenStopLossGrid = object({
   ...baseGridAutoSellStrategy.entries,
   stopLossType: literal("breakeven"),
});

const gridAutoSellStrategy = variant("stopLossType", [staticStopLossGrid, trailingStopLossGrid, breakEvenStopLossGrid]);

const autoSellStrategies = variant("strategyName", [simpleAutoSellStrategy, gridAutoSellStrategy]);

const autoSellSchema = object({
   enabled: boolean(),
   strategy: autoSellStrategies,
});

export const buyTokenFormSchema = object({
   walletAddress: pipe(string(), regex(addressRegex, "Please select an address"), minLength(32), maxLength(44)),
   tokenAddress: pipe(string(), regex(addressRegex, "Invalid address"), minLength(32), maxLength(44)),
   inputAmount: pipe(number(), minValue(0.0000001)),
   slippage: pipe(number(), minValue(0), maxValue(100)),
   prioritizationFeeLamports: pipe(number(), minValue(0)),
   autoSell: autoSellSchema,
});

const autoSellPresetSchema = object({
   id: string(),
   name: string(),
   strategy: autoSellStrategies,
});

export type BuyTokenFormSchema = typeof buyTokenFormSchema;
export type BuyTokenDto = InferOutput<typeof buyTokenFormSchema>;

export type BaseProfitTarget = InferInput<typeof baseProfitTargetSchema>;
export type TrailingProfitTarget = InferInput<typeof trailingProfitTargetSchema>;

export type SimpleAutoSellPreset = InferInput<typeof simpleAutoSellStrategy>;
export type GridStaticAutoSellPreset = InferInput<typeof staticStopLossGrid>;
export type GridTrailingAutoSellPreset = InferInput<typeof trailingStopLossGrid>;
export type GridBreakEvenAutoSellPreset = InferInput<typeof breakEvenStopLossGrid>;
export type AutoSellStrategy = SimpleAutoSellPreset | GridStaticAutoSellPreset | GridTrailingAutoSellPreset | GridBreakEvenAutoSellPreset;

export type AutoSellPreset = InferInput<typeof autoSellPresetSchema>;
export type GridStrategy = GridStaticAutoSellPreset | GridTrailingAutoSellPreset | GridBreakEvenAutoSellPreset;

export function isSimpleAutoSell(autoSell: AutoSellStrategy): autoSell is SimpleAutoSellPreset {
   return autoSell.strategyName === "simple";
}

export function isGridStrategy(autoSell: AutoSellStrategy): autoSell is GridStrategy {
   return autoSell.strategyName === "grid";
}

export function isGridTrailingStopLoss(autoSell: GridStrategy): autoSell is GridTrailingAutoSellPreset {
   return autoSell.stopLossType === "trailing";
}
