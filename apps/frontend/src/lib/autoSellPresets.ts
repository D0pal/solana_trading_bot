import type {
	AutoSellStrategy,
	GridBreakEvenAutoSellPreset,
	GridStaticAutoSellPreset,
	GridTrailingAutoSellPreset,
	SimpleAutoSellPreset
} from 'shared-types/src/zodSchemas/BuyTokenFormSchema';

export const defaultSimpleAutoSell: SimpleAutoSellPreset = {
	strategyName: 'simple',
	profitPercentage: 10,
	stopLossPercentage: 5
};

export const defaultGridStaticAutoSell: GridStaticAutoSellPreset = {
	strategyName: 'grid',
	stopLossType: 'static',
	stopLossPercentage: 5,
	profitTargets: [
		{ multiplier: 1.1, sellPercentage: 20 },
		{ multiplier: 1.3, sellPercentage: 30 },
		{ multiplier: 1.5, sellPercentage: 50 }
	]
};

export const defaultGridTrailingAutoSell: GridTrailingAutoSellPreset = {
	strategyName: 'grid',
	stopLossType: 'trailing',
	stopLossPercentage: 5,
	profitTargets: [
		{ multiplier: 1.1, sellPercentage: 20, trailingStopLossAfter: 10 },
		{ multiplier: 1.3, sellPercentage: 30, trailingStopLossAfter: 15 },
		{ multiplier: 1.5, sellPercentage: 50, trailingStopLossAfter: 20 }
	]
};

export const defaultGridBreakEvenAutoSell: GridBreakEvenAutoSellPreset = {
	strategyName: 'grid',
	stopLossType: 'breakeven',
	stopLossPercentage: 5,
	profitTargets: [
		{ multiplier: 1.1, sellPercentage: 20 },
		{ multiplier: 1.3, sellPercentage: 30 },
		{ multiplier: 1.5, sellPercentage: 50 }
	]
};

export function initializeAutoSell(preset?: AutoSellStrategy): AutoSellStrategy {
	if (!preset) {
		return defaultSimpleAutoSell; // Or whichever default you prefer
	}
	return preset;
}
