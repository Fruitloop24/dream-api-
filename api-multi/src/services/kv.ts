/**
 * ============================================================================
 * KV STORAGE & BILLING PERIOD UTILITIES
 * ============================================================================
 *
 * Helper functions for:
 * - Getting/updating usage data in Cloudflare KV
 * - Calculating billing periods (rolling 30 days by default)
 * - Determining when to reset usage counters
 */

import { UsageData } from '../types';

/**
 * Get current billing period (rolling 30 days from "today")
 *
 * BILLING PERIOD: Today 00:00 UTC → Today + 29 days 23:59 UTC
 *
 * @returns { start: YYYY-MM-DD, end: YYYY-MM-DD }
 */
export function getCurrentPeriod(): { start: string; end: string } {
	const now = new Date();
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const end = new Date(start.getTime() + 29 * 24 * 60 * 60 * 1000); // +29 days inclusive

	// Normalize end to end-of-day UTC
	end.setUTCHours(23, 59, 59, 999);

	return {
		start: start.toISOString().split('T')[0], // YYYY-MM-DD
		end: end.toISOString().split('T')[0], // YYYY-MM-DD
	};
}

/**
 * Check if usage data needs reset for new billing period
 *
 * LOGIC (rolling 30 days):
 * - If no period tracked → needs reset (first time user)
 * - If current date is after periodEnd → needs reset
 *
 * APPLIES TO: Free tier only (Pro tier has unlimited usage)
 *
 * @param usageData - Current usage data from KV
 * @returns true if usage should be reset to 0
 */
export function shouldResetUsage(usageData: UsageData): boolean {
	// If no period tracked, needs reset (first time user)
	if (!usageData.periodStart || !usageData.periodEnd) {
		return true;
	}

	// If current date is after period end, needs reset (new billing period)
	const now = new Date();
	const periodEnd = new Date(`${usageData.periodEnd}T23:59:59.999Z`);
	return now > periodEnd;
}
