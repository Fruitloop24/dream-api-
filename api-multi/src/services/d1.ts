import { Env, PlanTier } from '../types';

type SubscriptionInput = {
	platformId: string | null;
	userId: string;
	publishableKey?: string | null;
	priceId?: string | null;
	productId?: string | null;
	plan?: string | null;
	amount?: number | null;
	currency?: string | null;
	status?: string | null;
	currentPeriodEnd?: string | null;
	canceledAt?: string | null;
	cancelReason?: string | null;
};

export async function getPlatformFromSecretHash(
	env: Env,
	secretKeyHash: string
): Promise<{ platformId: string; publishableKey: string } | null> {
	const row = await env.DB.prepare(
		'SELECT platformId, publishableKey FROM api_keys WHERE secretKeyHash = ? LIMIT 1'
	)
		.bind(secretKeyHash)
		.first<{ platformId: string; publishableKey: string }>();
	return row ?? null;
}

export async function getPlatformFromPublishableKey(env: Env, pk: string): Promise<string | null> {
	const row = await env.DB.prepare(
		'SELECT platformId FROM api_keys WHERE publishableKey = ? LIMIT 1'
	)
		.bind(pk)
		.first<{ platformId: string }>();
	return row?.platformId ?? null;
}

export async function upsertEndUser(
	env: Env,
	platformId: string,
	publishableKey: string,
	clerkUserId: string,
	email?: string | null,
	status: string = 'active'
) {
	await env.DB.prepare(
		'INSERT OR REPLACE INTO end_users (platformId, publishableKey, clerkUserId, email, status, updatedAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
	)
		.bind(platformId, publishableKey, clerkUserId, email ?? null, status)
		.run();
}

export async function upsertUsageSnapshot(
	env: Env,
	platformId: string,
	userId: string,
	plan: PlanTier | string,
	periodStart: string | undefined,
	periodEnd: string | undefined,
	usageCount: number
) {
	await env.DB.prepare(
		'INSERT OR REPLACE INTO usage_snapshots (platformId, userId, plan, periodStart, periodEnd, usageCount, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
	)
		.bind(platformId, userId, plan, periodStart ?? null, periodEnd ?? null, usageCount)
		.run();
}

export async function upsertUsageInDb(
	env: Env,
	platformId: string,
	userId: string,
	plan: PlanTier | string,
	periodStart: string,
	periodEnd: string,
	incrementBy: number,
	limit: number | 'unlimited'
): Promise<{ success: boolean; usageCount: number; limit: number | 'unlimited'; plan: string }> {
	const isUnlimited = limit === 'unlimited' || limit === Infinity;
	const currentLimit = isUnlimited ? Number.MAX_SAFE_INTEGER : (limit as number);

	// Upsert + atomic increment with guard
	const result = await env.DB.prepare(
		`INSERT INTO usage_snapshots (platformId, userId, plan, periodStart, periodEnd, usageCount, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(platformId, userId) DO UPDATE SET
       plan=excluded.plan,
       periodStart=excluded.periodStart,
       periodEnd=excluded.periodEnd,
       usageCount=CASE
         WHEN usage_snapshots.usageCount + ? > ? THEN usage_snapshots.usageCount
         ELSE usage_snapshots.usageCount + ?
       END,
       updatedAt=CURRENT_TIMESTAMP
     WHERE usage_snapshots.usageCount + ? <= ?`
	)
		.bind(platformId, userId, plan, periodStart, periodEnd, incrementBy, incrementBy, currentLimit, incrementBy, currentLimit)
		.run();

	const row = await env.DB.prepare(
		'SELECT usageCount FROM usage_snapshots WHERE platformId = ? AND userId = ?'
	)
		.bind(platformId, userId)
		.first<{ usageCount: number }>();

	if (!row) {
		return { success: false, usageCount: 0, limit, plan: plan.toString() };
	}

	const success = row.usageCount <= currentLimit;
	return { success, usageCount: row.usageCount, limit, plan: plan.toString() };
}

export async function isEventProcessed(env: Env, eventId: string): Promise<boolean> {
	const row = await env.DB.prepare('SELECT eventId FROM events WHERE eventId = ? LIMIT 1')
		.bind(eventId)
		.first<{ eventId: string }>();
	return !!row;
}

export async function recordEvent(
	env: Env,
	eventId: string,
	platformId: string | null,
	type: string,
	source: string,
	payloadJson: string
) {
	await env.DB.prepare(
		'INSERT INTO events (platformId, source, type, eventId, payload_json) VALUES (?, ?, ?, ?, ?)'
	)
		.bind(platformId, source, type, eventId, payloadJson)
		.run();
}

export async function upsertSubscription(env: Env, sub: SubscriptionInput) {
	await env.DB.prepare(
		`INSERT OR REPLACE INTO subscriptions
      (platformId, userId, publishableKey, priceId, productId, plan, amount, currency, status, currentPeriodEnd, canceledAt, cancelReason, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
	)
		.bind(
			sub.platformId,
			sub.userId,
			sub.publishableKey ?? null,
			sub.priceId ?? null,
			sub.productId ?? null,
			sub.plan ?? null,
			sub.amount ?? null,
			sub.currency ?? null,
			sub.status ?? null,
			sub.currentPeriodEnd ?? null,
			sub.canceledAt ?? null,
			sub.cancelReason ?? null
		)
		.run();
}
