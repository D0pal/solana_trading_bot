// import { z } from "zod";

// const strategyTypeEnum = z.enum(["simple", "grid"]);
// const stopLossTypeEnum = z.enum(["static", "trailing", "breakeven"]);

// const profitTargetSchema = z.object({
//    multiplier: z.number(),
//    sellPercentage: z.number().min(0).max(100),
//    trailingStopLossAfter: z.number().optional(),
//    done: z.boolean().default(false).optional(),
// });

// const gridSellStrategy = z.object({
//    stopLossType: stopLossTypeEnum,
//    staticStopLoss: z.number(),
//    trailingStopLoss: z.number(),
//    breakEvenInitialStopLoss: z.number(),
//    profitTargets: z
//       .array(profitTargetSchema)
//       .nonempty()
//       .refine((targets) => targets.reduce((sum, target) => sum + target.sellPercentage, 0) <= 100, { message: "Total sell percentage across all profit targets must not exceed 100%" }),
// });

// export const buyTokenFormSchema = z.object({
//    walletAddress: z.string(),
//    tokenAddress: z.string(),
//    inputAmount: z.number(),
//    slippage: z.number().default(5),
//    prioritizationFeeLamports: z.number().default(0),
//    autoSell: z.object({
//       enabled: z.boolean().default(false),
//       strategy: strategyTypeEnum,
//       simpleStrategy: z.object({
//          profitPercentage: z.number(),
//          stopLossPercentage: z.number(),
//       }),
//       gridStrategy: gridSellStrategy,
//    }),
// });

// export type BuyTokenFormSchema = typeof buyTokenFormSchema;
// export type BuyTokenDto = z.infer<BuyTokenFormSchema>;

// export type StrategyType = z.infer<typeof strategyTypeEnum>;
// export type StopLossType = z.infer<typeof stopLossTypeEnum>;
// export type GridSellStrategyParams = z.infer<typeof gridSellStrategy>;
// export type ProfitTarget = z.infer<typeof profitTargetSchema>;

import { object, string, number, boolean, array, minLength, union, literal, minValue, maxValue, pipe, custom, variant, InferInput } from "valibot";

// const strategyTypeEnum = enum_(["simple", "grid"]);
// const stopLossTypeEnum = enum_(["static", "trailing", "breakeven"]);

const profitTargetSchema = object({
   multiplier: pipe(number(), minValue(1)),
   sellPercentage: pipe(number(), minValue(0), maxValue(100)),
});

const baseAutoSellSchema = object({
   enabled: boolean(),
});

const simpleAutoSellStrategy = object({
   ...baseAutoSellSchema.entries,
   ...object({
      strategy: literal("simple"),
      profitPercentage: pipe(number(), minValue(0)),
      stopLossPercentage: pipe(number(), minValue(0), maxValue(100)),
   }).entries,
});

const baseGridAutoSellStrategy = {
   strategy: literal("grid"),
   profitTargets: pipe(
      array(profitTargetSchema),
      minLength(1)
      // custom((input) => {
      //    const totalSellPercentage = input.reduce((sum, target) => sum + target.sellPercentage, 0);
      //    return totalSellPercentage <= 100 || "Total sell percentage across all profit targets must not exceed 100%";
      // })
   ),
};

const staticStopLossGrid = object({
   ...baseGridAutoSellStrategy,
   stopLossType: literal("static"),
   staticStopLoss: pipe(number(), minValue(0), maxValue(100)),
});

const trailingStopLossGrid = object({
   ...baseGridAutoSellStrategy,
   stopLossType: literal("trailing"),
   initialTrailingStopLoss: pipe(number(), minValue(0), maxValue(100)),
   profitTargets: array(object({ ...profitTargetSchema.entries, ...object({ trailingStopLossAfter: pipe(number(), minValue(0)) }) }.entries)),
});

const breakEvenStopLossGrid = object({
   ...baseGridAutoSellStrategy,
   stopLossType: literal("breakeven"),
   breakEvenInitialStopLoss: pipe(number(), minValue(0), maxValue(100)),
});

const gridAutoSellStrategy = variant("stopLossType", [staticStopLossGrid, trailingStopLossGrid, breakEvenStopLossGrid]);

const autoSellSchema = variant("strategy", [simpleAutoSellStrategy, gridAutoSellStrategy]);

export const buyTokenFormSchema = object({
   walletAddress: string(),
   tokenAddress: string(),
   inputAmount: pipe(number(), minValue(0)),
   slippage: pipe(number(), minValue(0), maxValue(100)),
   prioritizationFeeLamports: pipe(number(), minValue(0)),
   autoSell: autoSellSchema,
});

export type BuyTokenFormSchema = typeof buyTokenFormSchema;
export type BuyTokenDto = InferInput<typeof buyTokenFormSchema>;

// import { z } from "zod";

// const strategyTypeEnum = z.enum(["simple", "grid"]);
// const stopLossTypeEnum = z.enum(["static", "trailing", "breakeven"]);

// const profitTargetSchema = z.object({
//    multiplier: z.number().min(1),
//    sellPercentage: z.number().min(0).max(100),
// });

// const baseAutoSellSchema = z.object({
//    enabled: z.boolean(),
// });

// const simpleAutoSellStrategy = baseAutoSellSchema.extend({
//    strategy: z.literal("simple"),
//    profitPercentage: z.number(),
//    stopLossPercentage: z.number(),
// });

// const baseGridAutoSellStrategy = baseAutoSellSchema.extend({
//    profitTargets: z
//       .array(profitTargetSchema)
//       .nonempty()
//       .refine((targets) => targets.reduce((sum, target) => sum + target.sellPercentage, 0) <= 100, {
//          message: "Total sell percentage across all profit targets must not exceed 100%",
//       }),
// });

// const gridStaticStopLossStrategy = baseGridAutoSellStrategy.extend({
//    strategy: z.literal("grid-static"),
//    staticStopLoss: z.number(),
// });

// const gridTrailingStopLossStrategy = baseGridAutoSellStrategy.extend({
//    strategy: z.literal("grid-trailing"),
//    initialTrailingStopLoss: z.number(),
//    profitTargets: z.array(
//       profitTargetSchema.extend({
//          trailingStopLossAfter: z.number(),
//       })
//    ),
// });

// const gridBreakEvenStopLossStrategy = baseGridAutoSellStrategy.extend({
//    strategy: z.literal("grid-breakeven"),
//    breakEvenInitialStopLoss: z.number(),
// });

// const autoSellSchema = z.discriminatedUnion("strategy", [simpleAutoSellStrategy, gridStaticStopLossStrategy, gridTrailingStopLossStrategy, gridBreakEvenStopLossStrategy]);

// export const buyTokenFormSchema = z.object({
//    walletAddress: z.string(),
//    tokenAddress: z.string(),
//    inputAmount: z.number().positive(),
//    slippage: z.number().default(5),
//    prioritizationFeeLamports: z.number().default(0),
//    autoSell: autoSellSchema,
// });

// export type BuyTokenFormSchema = typeof buyTokenFormSchema;
// export type BuyTokenDto = z.infer<typeof buyTokenFormSchema>;

// export type SimpleAutoSellPreset = z.infer<typeof simpleAutoSellStrategy>;
// export type GridStaticAutoSellPreset = z.infer<typeof gridStaticStopLossStrategy>;
// export type GridTrailingAutoSellPreset = z.infer<typeof gridTrailingStopLossStrategy>;
// export type GridBreakEvenAutoSellPreset = z.infer<typeof gridBreakEvenStopLossStrategy>;

// export type AutoSellPreset = SimpleAutoSellPreset | GridStaticAutoSellPreset | GridTrailingAutoSellPreset | GridBreakEvenAutoSellPreset;
// export type GridStrategy = GridStaticAutoSellPreset | GridTrailingAutoSellPreset | GridBreakEvenAutoSellPreset;

// export interface UserPresets {
//    autoSellPresets: AutoSellPreset[];
//    // Other preset types can be added here
// }

// export function isGridStrategy(strategy: AutoSellPreset): strategy is GridStrategy {
//    return strategy && (strategy.strategy.startsWith("grid") as boolean);
// }
