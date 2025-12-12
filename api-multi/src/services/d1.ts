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
