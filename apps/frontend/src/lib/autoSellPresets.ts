// import type {
// 	AutoSellPreset,
// 	GridBreakEvenAutoSellPreset,
// 	GridStaticAutoSellPreset,
// 	GridTrailingAutoSellPreset,
// 	SimpleAutoSellPreset
// } from 'shared-types/src/zodSchemas/BuyTokenFormSchema';

// export const defaultSimpleAutoSell: SimpleAutoSellPreset = {
// 	enabled: true,
// 	strategy: 'simple',
// 	profitPercentage: 10,
// 	stopLossPercentage: 5
// };

// export const defaultGridStaticAutoSell: GridStaticAutoSellPreset = {
// 	enabled: true,
// 	strategy: 'grid-static',
// 	staticStopLoss: 5,
// 	profitTargets: [
// 		{ multiplier: 1.1, sellPercentage: 20 },
// 		{ multiplier: 1.3, sellPercentage: 30 },
// 		{ multiplier: 1.5, sellPercentage: 50 }
// 	]
// };

// export const defaultGridTrailingAutoSell: GridTrailingAutoSellPreset = {
// 	enabled: true,
// 	strategy: 'grid-trailing',
// 	initialTrailingStopLoss: 5,
// 	profitTargets: [
// 		{ multiplier: 1.1, sellPercentage: 20, trailingStopLossAfter: 10 },
// 		{ multiplier: 1.3, sellPercentage: 30, trailingStopLossAfter: 15 },
// 		{ multiplier: 1.5, sellPercentage: 50, trailingStopLossAfter: 20 }
// 	]
// };

// export const defaultGridBreakEvenAutoSell: GridBreakEvenAutoSellPreset = {
// 	enabled: true,
// 	strategy: 'grid-breakeven',
// 	breakEvenInitialStopLoss: 5,
// 	profitTargets: [
// 		{ multiplier: 1.1, sellPercentage: 20 },
// 		{ multiplier: 1.3, sellPercentage: 30 },
// 		{ multiplier: 1.5, sellPercentage: 50 }
// 	]
// };

// export function initializeAutoSell(preset?: AutoSellPreset): AutoSellPreset {
// 	if (!preset) {
// 		return defaultGridStaticAutoSell; // Or whichever default you prefer
// 	}
// 	return preset;
// }
