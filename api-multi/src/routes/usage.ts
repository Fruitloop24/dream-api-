/**
 * ============================================================================
 * USAGE TRACKING ROUTES - dream-api
 * ============================================================================
 *
 * ENDPOINTS:
 * POST /api/data   - Process request and track usage (increment counter)
 * GET  /api/usage  - Check current usage and limits
 *
 * PURPOSE:
 * Track API usage per user and enforce tier limits. This is the core of
 * dream-api's value prop: automatic usage tracking + tier enforcement.
 *
 * HOW IT WORKS:
 * 1. Get current usage from KV (usage:{platformId}:{userId})
 * 2. Check if billing period reset needed (monthly by default)
 * 3. Enforce tier limit (from user:{platformId}:tierConfig)
 * 4. Increment counter
 * 5. Update stats for developer dashboard
 *
 * KV STRUCTURE:
 * usage:{platformId}:{userId}     → { count, plan, periodStart, periodEnd }
 * user:{platformId}:tierConfig    → { tiers: [...] }
 * platform:{platformId}:stats     → { totalCalls, users, revenue }
 *
 * MULTI-TENANT:
 * - platformId identifies the developer
 * - userId identifies the end-user
 * - Each developer's users are isolated in KV
 *
 * ============================================================================
 */

import { Env, PlanTier, UsageData } from '../types';
import { getTierConfig } from '../config/configLoader';
import { getCurrentPeriod, shouldResetUsage } from '../services/kv';
import { upsertUsageSnapshot, upsertUsageInDb } from '../services/d1';

/**
 * Handle /api/data - Process request and track usage
 *
 * AUTHENTICATION:
 * - API key mode: userId from X-User-Id header, platformId from API key
 * - JWT mode: userId from JWT, platformId from JWT metadata
 *
 * FLOW:
 * 1. Get current usage from KV: usage:{platformId}:{userId}
 * 2. Reset usage if new billing period (monthly reset for limited tiers)
 * 3. Check if tier limit exceeded (from tier config in KV)
 * 4. Increment usage counter
 * 5. Update platform stats (for developer dashboard)
 * 6. Return success response with usage info
 *
 * PLACEHOLDER:
 * Replace "Request processed successfully" with actual business logic
 * (document processing, AI generation, data transformation, etc.)
 *
 * @param userId - End-user ID (from JWT or X-User-Id header)
 * @param platformId - Developer's platform ID (from API key or JWT metadata)
 * @param plan - User's tier (free, pro, enterprise)
 * @param env - Worker environment
 * @param corsHeaders - CORS headers for response
 */
export async function handleDataRequest(
	userId: string,
	platformId: string,
	plan: PlanTier,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	// Get tier limit from config (using platformId for multi-tenancy)
	const tierConfigs = await getTierConfig(env, platformId);
	const tierLimit = tierConfigs[plan]?.limit ?? 0;

	const currentPeriod = getCurrentPeriod();

	// Use D1 as the source of truth (atomic). KV is just a cache.
	const dbResult = await upsertUsageInDb(
		env,
		platformId,
		userId,
		plan,
		currentPeriod.start,
		currentPeriod.end,
		1,
		tierLimit === Infinity ? 'unlimited' : tierLimit
	);

	if (!dbResult.success || dbResult.usageCount > (tierLimit === Infinity ? Number.MAX_SAFE_INTEGER : tierLimit)) {
		return new Response(
			JSON.stringify({
				error: 'Tier limit reached',
				usageCount: dbResult.usageCount,
				limit: tierLimit === Infinity ? 'unlimited' : tierLimit,
				message: 'Please upgrade to unlock more requests',
			}),
			{
				status: 403,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}

	// Mirror to KV cache (best effort)
	const usageKey = `usage:${platformId}:${userId}`;
	const usageData: UsageData = {
		usageCount: dbResult.usageCount,
		plan,
		lastUpdated: new Date().toISOString(),
		periodStart: currentPeriod.start,
		periodEnd: currentPeriod.end,
	};
	await env.USAGE_KV.put(usageKey, JSON.stringify(usageData));

	// Return success response
	return new Response(
		JSON.stringify({
			success: true,
			data: { message: 'Request processed successfully' },
			usage: {
				count: dbResult.usageCount,
				limit: tierLimit === Infinity ? 'unlimited' : tierLimit,
				plan,
			},
		}),
		{
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		}
	);
}

/**
 * Handle /api/usage - Get current usage and limits
 *
 * RETURNS:
 * - Current usage count (API calls this month)
 * - Tier limit (max calls allowed)
 * - Remaining requests
 * - Billing period dates (start/end)
 * - User's current plan
 *
 * Used by developers' apps to show usage bars, warnings, etc.
 *
 * @param userId - End-user ID
 * @param platformId - Developer's platform ID
 * @param plan - User's tier
 * @param env - Worker environment
 * @param corsHeaders - CORS headers
 */
export async function handleUsageCheck(
	userId: string,
	platformId: string,
	plan: PlanTier,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	const currentPeriod = getCurrentPeriod();

	// Try KV cache first
	const usageKey = `usage:${platformId}:${userId}`;
	const usageDataRaw = await env.USAGE_KV.get(usageKey);
	let usageData: UsageData | null = usageDataRaw ? JSON.parse(usageDataRaw) : null;

	if (!usageData) {
		// Fallback to D1 snapshot
		const fromDb = await env.DB.prepare(
			'SELECT usageCount, plan, periodStart, periodEnd FROM usage_snapshots WHERE platformId = ? AND userId = ?'
		)
			.bind(platformId, userId)
			.first<{ usageCount: number; plan: string; periodStart: string | null; periodEnd: string | null }>();

		if (fromDb) {
			usageData = {
				usageCount: fromDb.usageCount,
				plan: (fromDb.plan as PlanTier) || plan,
				lastUpdated: new Date().toISOString(),
				periodStart: fromDb.periodStart || currentPeriod.start,
				periodEnd: fromDb.periodEnd || currentPeriod.end,
			};
			// Warm KV
			await env.USAGE_KV.put(usageKey, JSON.stringify(usageData));
		} else {
			usageData = {
				usageCount: 0,
				plan,
				lastUpdated: new Date().toISOString(),
				periodStart: currentPeriod.start,
				periodEnd: currentPeriod.end,
			};
		}
	}

	// Get tier limit from config (using platformId for multi-tenancy)
	const tierConfigs = await getTierConfig(env, platformId);
	const tierLimit = tierConfigs[plan]?.limit || 0;

	return new Response(
		JSON.stringify({
			userId,
			plan,
			usageCount: usageData.usageCount,
			limit: tierLimit === Infinity ? 'unlimited' : tierLimit,
			remaining: tierLimit === Infinity ? 'unlimited' : Math.max(0, tierLimit - usageData.usageCount),
			periodStart: usageData.periodStart,
			periodEnd: usageData.periodEnd,
		}),
		{
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		}
	);
}
