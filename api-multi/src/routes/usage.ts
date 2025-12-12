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
import { upsertUsageSnapshot } from '../services/d1';

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
	// Get current usage (namespaced by platformId for multi-tenancy)
	const usageKey = `usage:${platformId}:${userId}`;
	const usageDataRaw = await env.USAGE_KV.get(usageKey);

	const currentPeriod = getCurrentPeriod();

	const initialUsageData: UsageData = usageDataRaw
		? JSON.parse(usageDataRaw)
		: {
				usageCount: 0,
				plan,
				lastUpdated: new Date().toISOString(),
				periodStart: currentPeriod.start,
				periodEnd: currentPeriod.end,
		  };

	// Get tier limit from config (using platformId for multi-tenancy)
	const tierConfigs = await getTierConfig(env, platformId);
	const tierLimit = tierConfigs[plan]?.limit || 0;

	const currentUsageData = { ...initialUsageData }; // Create a mutable copy

	// Reset usage if new billing period (for limited tiers)
	if (tierLimit !== Infinity && shouldResetUsage(currentUsageData)) {
		currentUsageData.usageCount = 0;
		currentUsageData.periodStart = currentPeriod.start;
		currentUsageData.periodEnd = currentPeriod.end;
	}

	// Update plan if changed
	currentUsageData.plan = plan;

	// Check if tier limit exceeded
	if (tierLimit !== Infinity && currentUsageData.usageCount >= tierLimit) {
		return new Response(
			JSON.stringify({
				error: 'Tier limit reached',
				usageCount: currentUsageData.usageCount,
				limit: tierLimit,
				message: 'Please upgrade to unlock more requests',
			}),
			{
				status: 403,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}

	// ========================================================================
	// YOUR PRODUCT LOGIC GOES HERE
	// ========================================================================
	// Replace this placeholder with your actual business logic:
	// - Process documents
	// - Make API calls
	// - Run AI models
	// - Generate reports
	// etc.
	//
	// Example:
	// const result = await processDocument(userId, plan, requestBody);
	// ========================================================================

	// Increment usage count
	currentUsageData.usageCount++;
	currentUsageData.lastUpdated = new Date().toISOString();
	await env.USAGE_KV.put(usageKey, JSON.stringify(currentUsageData));
	await upsertUsageSnapshot(
		env,
		platformId,
		userId,
		plan,
		currentUsageData.periodStart,
		currentUsageData.periodEnd,
		currentUsageData.usageCount
	);

	// Return success response
	return new Response(
		JSON.stringify({
			success: true,
			data: { message: 'Request processed successfully' },
			usage: {
				count: currentUsageData.usageCount,
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
	const usageKey = `usage:${platformId}:${userId}`;
	const usageDataRaw = await env.USAGE_KV.get(usageKey);

	const currentPeriod = getCurrentPeriod();

	const usageData: UsageData = usageDataRaw
		? JSON.parse(usageDataRaw)
		: {
				usageCount: 0,
				plan,
				lastUpdated: new Date().toISOString(),
				periodStart: currentPeriod.start,
				periodEnd: currentPeriod.end,
		  };

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
