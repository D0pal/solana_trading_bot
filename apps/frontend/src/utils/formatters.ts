// utils/formatters.ts

export function formatNumber(num: number, maximumFractionDigits: number = 2): string {
	return new Intl.NumberFormat('en-US', { maximumFractionDigits: maximumFractionDigits }).format(num);
}

export function formatUSD(num: number): string {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export function formatPercentage(num: number): string {
	return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(num / 100);
}
