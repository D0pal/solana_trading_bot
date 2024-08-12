// src/lib/VolatileMarketStrategy.ts

export interface VolatileMarketStrategy {
	initialStopLoss: number;
	quickProfitTarget: number;
	trailingStopLoss: number;
	volumeThreshold: number;
	timeBasedExit: number; // in milliseconds
}

export interface Projection {
	scenario: string;
	profitLoss: number;
	profitLossPercentage: number;
}

export class VolatileTokenTrader {
	private strategy: VolatileMarketStrategy;
	private entryPrice: number;
	private entryTime: number;
	private highestPrice: number;
	private currentStopLoss: number;

	constructor(strategy: VolatileMarketStrategy, entryPrice: number) {
		this.strategy = strategy;
		this.entryPrice = entryPrice;
		this.entryTime = Date.now();
		this.highestPrice = entryPrice;
		this.currentStopLoss = entryPrice * (1 - strategy.initialStopLoss);
	}

	updatePrice(currentPrice: number, currentVolume: number): string {
		this.highestPrice = Math.max(this.highestPrice, currentPrice);

		// Check for quick profit target
		if (currentPrice >= this.entryPrice * (1 + this.strategy.quickProfitTarget)) {
			return 'SELL_PARTIAL';
		}

		// Update trailing stop loss
		const newStopLoss = this.highestPrice * (1 - this.strategy.trailingStopLoss);
		this.currentStopLoss = Math.max(this.currentStopLoss, newStopLoss);

		// Check if stop loss is hit
		if (currentPrice <= this.currentStopLoss) {
			return 'SELL_ALL';
		}

		// Check volume-based exit
		if (currentVolume < this.strategy.volumeThreshold) {
			return 'VOLUME_ALERT';
		}

		// Check time-based exit
		if (Date.now() - this.entryTime > this.strategy.timeBasedExit) {
			return 'TIME_EXIT';
		}

		return 'HOLD';
	}

	getCurrentStopLoss(): number {
		return this.currentStopLoss;
	}
}

export function calculateProjections(strategy: VolatileMarketStrategy, initialInvestment: number): Projection[] {
	const projections: Projection[] = [];

	// Worst-case scenario: Initial stop loss hit
	projections.push({
		scenario: 'Worst Case (Stop Loss Hit)',
		profitLoss: -initialInvestment * strategy.initialStopLoss,
		profitLossPercentage: -strategy.initialStopLoss * 100
	});

	// Best-case scenario: Quick profit target hit, then trailing stop loss at 2x initial price
	projections.push({
		scenario: 'Best Case (Quick Profit + Continued Growth)',
		profitLoss: initialInvestment * (strategy.quickProfitTarget + 1),
		profitLossPercentage: (strategy.quickProfitTarget + 1) * 100
	});

	// Moderate case: Quick profit target hit, then immediate reversal
	projections.push({
		scenario: 'Moderate Case (Quick Profit Only)',
		profitLoss: initialInvestment * strategy.quickProfitTarget,
		profitLossPercentage: strategy.quickProfitTarget * 100
	});

	// Time-based exit scenario: Assuming 10% growth before time exit
	projections.push({
		scenario: 'Time-Based Exit (10% Growth)',
		profitLoss: initialInvestment * 0.1,
		profitLossPercentage: 10
	});

	// Volume-based exit scenario: Assuming 5% growth before volume drop
	projections.push({
		scenario: 'Volume-Based Exit (5% Growth)',
		profitLoss: initialInvestment * 0.05,
		profitLossPercentage: 5
	});

	return projections;
}
