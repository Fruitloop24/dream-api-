import { Env, PlanTier } from '../types';

type SubscriptionInput = {
	platformId: string | null;
	userId: string;
	publishableKey?: string | null;
	subscriptionId?: string | null;
	stripeCustomerId?: string | null;
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

// Track whether we already checked/added tier columns for inventory
let tierSchemaChecked = false;
let apiKeySchemaChecked = false;
let stripeTokenSchemaChecked = false;
let usageSchemaChecked = false;

export async function ensureApiKeySchema(env: Env) {
	if (apiKeySchemaChecked) return;
	apiKeySchemaChecked = true;
	try {
		await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN projectId TEXT').run();
	} catch (err) {
		/* no-op if exists */
	}
	try {
		await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN projectType TEXT').run();
	} catch (err) {
		/* no-op if exists */
	}
	try {
		await env.DB.prepare('ALTER TABLE api_keys ADD COLUMN mode TEXT DEFAULT \'live\'').run();
	} catch (err) {
		/* no-op if exists */
	}
}

export async function ensureStripeTokenSchema(env: Env) {
	if (stripeTokenSchemaChecked) return;
	stripeTokenSchemaChecked = true;
	try {
		await env.DB.prepare('ALTER TABLE stripe_tokens ADD COLUMN mode TEXT DEFAULT \'live\'').run();
	} catch (err) {
		/* no-op */
	}
}

export async function ensureTierSchema(env: Env) {
	if (tierSchemaChecked) return;
	tierSchemaChecked = true;
	try {
		await env.DB.prepare('ALTER TABLE tiers ADD COLUMN projectId TEXT').run();
	} catch (err) {
		/* no-op if exists */
	}
	try {
		await env.DB.prepare('ALTER TABLE tiers ADD COLUMN projectType TEXT').run();
	} catch (err) {
		/* no-op if exists */
	}
	try {
		await env.DB.prepare('ALTER TABLE tiers ADD COLUMN inventory INTEGER').run();
	} catch (err) {
		/* no-op if exists */
	}
	try {
		await env.DB.prepare('ALTER TABLE tiers ADD COLUMN soldOut INTEGER DEFAULT 0').run();
	} catch (err) {
		/* no-op if exists */
	}
	try {
		await env.DB.prepare('ALTER TABLE tiers ADD COLUMN mode TEXT DEFAULT \'live\'').run();
	} catch (err) {
		/* no-op if exists */
	}
}

export async function ensureUsageSchema(env: Env) {
	if (usageSchemaChecked) return;
	usageSchemaChecked = true;
	try {
		await env.DB.prepare('ALTER TABLE usage_counts ADD COLUMN projectId TEXT').run();
	} catch (err) {
		/* no-op */
	}
}

export async function getPlatformFromSecretHash(
	env: Env,
	secretKeyHash: string
): Promise<{ platformId: string; publishableKey: string; mode?: string; projectId?: string | null; projectType?: string | null } | null> {
	await ensureApiKeySchema(env);
	const row = await env.DB.prepare(
		'SELECT platformId, publishableKey, mode, projectId, projectType FROM api_keys WHERE secretKeyHash = ? LIMIT 1'
	)
		.bind(secretKeyHash)
		.first<{ platformId: string; publishableKey: string; mode?: string; projectId?: string | null; projectType?: string | null }>();
	return row ?? null;
}

export async function getPlatformFromPublishableKey(env: Env, pk: string): Promise<string | null> {
	await ensureTierSchema(env);
	const row = await env.DB.prepare(
		'SELECT platformId FROM api_keys WHERE publishableKey = ? LIMIT 1'
	)
		.bind(pk)
		.first<{ platformId: string }>();
	return row?.platformId ?? null;
}

export async function getModeForPublishableKey(env: Env, pk: string): Promise<string | null> {
	const row = await env.DB.prepare(
		'SELECT mode FROM api_keys WHERE publishableKey = ? LIMIT 1'
	)
		.bind(pk)
		.first<{ mode: string | null }>();
	return row?.mode ?? null;
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
	const nowIso = new Date().toISOString();

	// Upsert + atomic increment with guard
	await env.DB.prepare(
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
		.bind(
			platformId,
			userId,
			plan,
			periodStart,
			periodEnd,
			incrementBy, // initial insert usageCount
			incrementBy, // CASE guard +
			currentLimit, // CASE guard limit
			incrementBy, // CASE increment
			incrementBy, // WHERE guard +
			currentLimit // WHERE guard limit
		)
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

// Lightweight one-time schema helper so we can ship new columns safely without a migration runner.
let subscriptionSchemaChecked = false;
export async function ensureSubscriptionSchema(env: Env) {
	if (subscriptionSchemaChecked) return;
	subscriptionSchemaChecked = true;
	// Add new columns if they are missing; ignore "duplicate column" errors.
	try {
		await env.DB.prepare('ALTER TABLE subscriptions ADD COLUMN subscriptionId TEXT').run();
	} catch (err) {
		/* no-op if exists */
	}
	try {
		await env.DB.prepare('ALTER TABLE subscriptions ADD COLUMN stripeCustomerId TEXT').run();
	} catch (err) {
		/* no-op if exists */
	}
}

export async function upsertSubscription(env: Env, sub: SubscriptionInput) {
	await ensureSubscriptionSchema(env);
	await env.DB.prepare(
		`INSERT OR REPLACE INTO subscriptions
      (platformId, userId, publishableKey, subscriptionId, stripeCustomerId, priceId, productId, plan, amount, currency, status, currentPeriodEnd, canceledAt, cancelReason, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
	)
		.bind(
			sub.platformId,
			sub.userId,
			sub.publishableKey ?? null,
			sub.subscriptionId ?? null,
			sub.stripeCustomerId ?? null,
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

export async function decrementInventory(
	env: Env,
	platformId: string,
	items: { priceId: string; quantity: number }[],
	mode: string = 'live'
): Promise<void> {
	if (!items.length) return;
	await ensureTierSchema(env);

	for (const item of items) {
		const qty = Math.max(1, Math.floor(item.quantity || 1));
		await env.DB.prepare(
			`UPDATE tiers
       SET
         inventory = CASE
           WHEN inventory IS NULL THEN NULL
           WHEN inventory - ? < 0 THEN 0
           ELSE inventory - ?
         END,
         soldOut = CASE
           WHEN inventory IS NULL THEN soldOut
           WHEN inventory - ? <= 0 THEN 1
           ELSE 0
       END
       WHERE platformId = ? AND priceId = ? AND (mode = ? OR mode IS NULL)`
		)
			.bind(qty, qty, qty, platformId, item.priceId, mode)
			.run();
	}
}
