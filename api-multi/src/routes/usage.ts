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
 * FILTERING:
 * - platformId: identifies the developer (owner)
 * - publishableKey: identifies the project (pk_test_xxx or pk_live_xxx)
 * - userId: identifies the end-user
 *
 * ============================================================================
 */

import { Env, PlanTier } from '../types';
import { getTierConfig } from '../config/configLoader';
import { getCurrentPeriod } from '../services/kv';
import { ensureUsageSchema } from '../services/d1';

/**
 * Handle /api/data - Process request and track usage
 */
export async function handleDataRequest(
	userId: string,
	platformId: string,
	plan: PlanTier,
	env: Env,
	corsHeaders: Record<string, string>,
	mode: string = 'live',
	publishableKey: string | null = null
): Promise<Response> {
	await ensureUsageSchema(env);

	// Get tier limit from config
	const tierConfigs = await getTierConfig(env, platformId, mode, publishableKey);
	const tierLimit = tierConfigs[plan]?.limit ?? 0;
	const isUnlimited = tierLimit === Infinity;
	const limitNumber = isUnlimited ? Number.MAX_SAFE_INTEGER : tierLimit;

	const currentPeriod = getCurrentPeriod();

	// Ensure a row exists in usage_counts (keyed by platformId + publishableKey + userId)
	await env.DB.prepare(
		`INSERT OR IGNORE INTO usage_counts (platformId, publishableKey, userId, plan, periodStart, periodEnd, usageCount, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
	)
		.bind(platformId, publishableKey, userId, plan, currentPeriod.start, currentPeriod.end)
		.run();

	// Load current usage
	let row = await env.DB.prepare(
		'SELECT usageCount, plan, periodStart, periodEnd FROM usage_counts WHERE platformId = ? AND userId = ? AND (publishableKey = ? OR publishableKey IS NULL)'
	)
		.bind(platformId, userId, publishableKey)
		.first<{ usageCount: number; plan: string; periodStart: string | null; periodEnd: string | null }>();

	let usageCount = row?.usageCount ?? 0;
	let periodStart = row?.periodStart || currentPeriod.start;
	let periodEnd = row?.periodEnd || currentPeriod.end;

	// Reset period if expired
	const now = new Date();
	const periodEndDate = new Date(`${periodEnd}T23:59:59.999Z`);
	if (!isUnlimited && now > periodEndDate) {
		usageCount = 0;
		periodStart = currentPeriod.start;
		periodEnd = currentPeriod.end;
		await env.DB.prepare(
			'UPDATE usage_counts SET usageCount = 0, periodStart = ?, periodEnd = ?, updatedAt = CURRENT_TIMESTAMP WHERE platformId = ? AND userId = ? AND (publishableKey = ? OR publishableKey IS NULL)'
		)
			.bind(periodStart, periodEnd, platformId, userId, publishableKey)
			.run();
	}

	// Enforce limit before increment
	if (!isUnlimited && usageCount >= limitNumber) {
		return new Response(
			JSON.stringify({
				error: 'Tier limit reached',
				usageCount,
				limit: tierLimit,
				message: 'Please upgrade to unlock more requests',
			}),
			{
				status: 403,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}

	// Increment in D1
	const updated = await env.DB.prepare(
		'UPDATE usage_counts SET usageCount = usageCount + 1, plan = ?, periodStart = ?, periodEnd = ?, updatedAt = CURRENT_TIMESTAMP WHERE platformId = ? AND userId = ? AND (publishableKey = ? OR publishableKey IS NULL) RETURNING usageCount'
	)
		.bind(plan, periodStart, periodEnd, platformId, userId, publishableKey)
		.first<{ usageCount: number }>();

	usageCount = updated?.usageCount ?? usageCount + 1;

	// Return success response
	return new Response(
		JSON.stringify({
			success: true,
			data: { message: 'Request processed successfully' },
			usage: {
				count: usageCount,
				limit: isUnlimited ? 'unlimited' : tierLimit,
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
 */
export async function handleUsageCheck(
	userId: string,
	platformId: string,
	plan: PlanTier,
	env: Env,
	corsHeaders: Record<string, string>,
	mode: string = 'live',
	publishableKey: string | null = null
): Promise<Response> {
	await ensureUsageSchema(env);
	const currentPeriod = getCurrentPeriod();

	const fromDb = await env.DB.prepare(
		'SELECT usageCount, plan, periodStart, periodEnd FROM usage_counts WHERE platformId = ? AND userId = ? AND (publishableKey = ? OR publishableKey IS NULL)'
	)
		.bind(platformId, userId, publishableKey)
		.first<{ usageCount: number; plan: string; periodStart: string | null; periodEnd: string | null }>();

	const usageCount = fromDb?.usageCount ?? 0;
	const periodStart = fromDb?.periodStart || currentPeriod.start;
	const periodEnd = fromDb?.periodEnd || currentPeriod.end;

	// Get tier limit from config
	const tierConfigs = await getTierConfig(env, platformId, mode, publishableKey);
	const tierLimit = tierConfigs[plan]?.limit || 0;

	return new Response(
		JSON.stringify({
			userId,
			plan,
			usageCount,
			limit: tierLimit === Infinity ? 'unlimited' : tierLimit,
			remaining: tierLimit === Infinity ? 'unlimited' : Math.max(0, tierLimit - usageCount),
			periodStart,
			periodEnd,
		}),
		{
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		}
	);
}
