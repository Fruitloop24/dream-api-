import { Env } from '../types';

// Dashboard aggregator for a single platformId. Pulls data from D1 and KV and
// optionally filters by a specific publishableKey for per-key views.

type TierRow = {
	name: string;
	displayName: string | null;
	price: number;
	limit: number | null;
	priceId: string | null;
	productId: string | null;
	popular: number | null;
};

type SubscriptionRow = {
	userId: string;
	plan: string | null;
	status: string | null;
	currentPeriodEnd: string | null;
	canceledAt: string | null;
	priceId: string | null;
	productId: string | null;
	amount: number | null;
	currency: string | null;
};

type UsageRow = {
	userId: string;
	usageCount: number | null;
	plan: string | null;
	periodStart: string | null;
	periodEnd: string | null;
};

type EndUserRow = {
	userId: string;
	email: string | null;
	status: string | null;
	createdAt?: string | null;
};

type ApiKeyRow = {
	publishableKey: string;
	secretKeyHash: string;
	createdAt?: string;
	status?: string | null;
};

type EventRow = {
	type: string;
	createdAt: string;
};

type StripeTokenRow = {
	stripeUserId: string;
};

export async function handleDashboard(
	env: Env,
	platformId: string,
	corsHeaders: Record<string, string>,
	filterPk?: string | null
): Promise<Response> {
	try {
		// Tiers (for limits and display)
		const tiersResult = await env.DB.prepare(
			'SELECT name, displayName, price, "limit", priceId, productId, popular FROM tiers WHERE platformId = ?'
		)
			.bind(platformId)
			.all<TierRow>();
		const tiers = (tiersResult.results || []).map((t) => ({
			name: t.name,
			displayName: t.displayName || t.name,
			price: t.price,
			limit: t.limit === null ? 'unlimited' : t.limit,
			priceId: t.priceId,
			productId: t.productId,
			popular: !!t.popular,
		}));

		// Subscriptions
		let subsQuery = 'SELECT userId, plan, status, currentPeriodEnd, canceledAt, priceId, productId, amount, currency, publishableKey FROM subscriptions WHERE platformId = ?';
		const subsResult = await env.DB.prepare(subsQuery)
			.bind(platformId)
			.all<SubscriptionRow & { publishableKey?: string | null }>();
		const subscriptions = subsResult.results || [];

		// Usage
		const usageResult = await env.DB.prepare(
			'SELECT userId, usageCount, plan, periodStart, periodEnd FROM usage_counts WHERE platformId = ?'
		)
			.bind(platformId)
			.all<UsageRow>();
		const usage = usageResult.results || [];

		// End-users
		const usersResult = await env.DB.prepare(
			'SELECT clerkUserId as userId, email, status, createdAt, publishableKey FROM end_users WHERE platformId = ?'
		)
			.bind(platformId)
			.all<EndUserRow & { publishableKey?: string | null }>();
		const users = usersResult.results || [];

		// Latest API key (for pk)
		const keyResult = await env.DB.prepare(
			'SELECT publishableKey, secretKeyHash FROM api_keys WHERE platformId = ? ORDER BY createdAt DESC LIMIT 1'
		)
			.bind(platformId)
			.first<ApiKeyRow>();
		const allKeysResult = await env.DB.prepare(
			'SELECT publishableKey, secretKeyHash, createdAt, status FROM api_keys WHERE platformId = ? ORDER BY createdAt DESC'
		)
			.bind(platformId)
			.all<ApiKeyRow>();

		// Stripe account info (no secrets)
		const stripeResult = await env.DB.prepare(
			'SELECT stripeUserId FROM stripe_tokens WHERE platformId = ? LIMIT 1'
		)
			.bind(platformId)
			.first<StripeTokenRow>();

		// Recent events (webhook visibility)
		const eventsResult = await env.DB.prepare(
			'SELECT type, createdAt FROM events WHERE platformId = ? ORDER BY createdAt DESC LIMIT 5'
		)
			.bind(platformId)
			.all<EventRow>();
		const events = eventsResult.results || [];

		// Build lookups
		const tierLimitByName: Record<string, number | 'unlimited'> = {};
		tiers.forEach((t) => {
			const limit = t.limit === 'unlimited' ? 'unlimited' : Number(t.limit ?? 0);
			tierLimitByName[t.name] = limit;
			if (t.displayName && t.displayName !== t.name) {
				tierLimitByName[t.displayName] = limit;
			}
		});

		const usageMap = new Map<string, UsageRow>();
		for (const u of usage) usageMap.set(u.userId, u);

		const userMap = new Map<string, EndUserRow>();
		for (const u of users) userMap.set(u.userId, u);

		// Fetch labels for keys from KV (optional)
		const keyLabels = new Map<string, string>();
		if (allKeysResult.results) {
			await Promise.all(
				allKeysResult.results.map(async (k) => {
					const lbl = await env.TOKENS_KV.get(`keylabel:${k.publishableKey}`);
					if (lbl) keyLabels.set(k.publishableKey, lbl);
				})
			);
		}

		// Build customers from subscriptions first
		const customerMap = new Map<string, any>();
		for (const sub of subscriptions) {
			if (filterPk && sub.publishableKey && sub.publishableKey !== filterPk) continue;
			const u = usageMap.get(sub.userId);
			const e = userMap.get(sub.userId);
			const plan = sub.plan || u?.plan || 'free';
			const limit =
				tierLimitByName[plan] ||
				(typeof plan === 'string' ? tierLimitByName[plan.toLowerCase()] : undefined) ||
				0;
			customerMap.set(sub.userId, {
				userId: sub.userId,
				email: e?.email || null,
				plan,
				status: sub.status || 'active',
				usageCount: u?.usageCount ?? 0,
				limit,
				periodStart: u?.periodStart || null,
				periodEnd: u?.periodEnd || null,
				currentPeriodEnd: sub.currentPeriodEnd,
				canceledAt: sub.canceledAt,
				priceId: sub.priceId,
				productId: sub.productId,
				amount: sub.amount,
				currency: sub.currency,
				publishableKey: sub.publishableKey || null,
			});
		}

		// Add any end-users without subscriptions
		for (const e of users) {
			if (filterPk && e.publishableKey && e.publishableKey !== filterPk) continue;
			if (customerMap.has(e.userId)) continue;
			const u = usageMap.get(e.userId);
			const plan = u?.plan || 'free';
			const limit =
				tierLimitByName[plan] ||
				(typeof plan === 'string' ? tierLimitByName[plan.toLowerCase()] : undefined) ||
				0;
			customerMap.set(e.userId, {
				userId: e.userId,
				email: e.email || null,
				plan,
				status: 'none',
				usageCount: u?.usageCount ?? 0,
				limit,
				periodStart: u?.periodStart || null,
				periodEnd: u?.periodEnd || null,
				currentPeriodEnd: null,
				canceledAt: null,
				priceId: null,
				productId: null,
				amount: null,
				currency: null,
				publishableKey: e.publishableKey || null,
			});
		}

		const customers = Array.from(customerMap.values());

		const activeSubs = subscriptions.filter((s) => s.status === 'active').length;
		const cancelingSubs = subscriptions.filter((s) => !!s.canceledAt).length;
		const mrr = subscriptions
			.filter((s) => s.status === 'active' && typeof s.amount === 'number')
			.reduce((sum, s) => sum + (s.amount || 0), 0);
		const usageTotal = usage.reduce((sum, u) => sum + (u.usageCount || 0), 0);

		const response = {
			metrics: {
				activeSubs,
				cancelingSubs,
				mrr,
				usageThisPeriod: usageTotal,
			},
			customers,
			tiers,
			keys: {
				publishableKey: keyResult?.publishableKey || null,
				secretKeyMasked: keyResult ? '********' : null,
				platformId,
				apiKeys: (allKeysResult.results || []).map((k) => ({
					publishableKey: k.publishableKey,
					createdAt: k.createdAt || null,
					label: keyLabels.get(k.publishableKey) || null,
					status: k.status || null,
				})),
				stripeAccountId: stripeResult?.stripeUserId || null,
			},
			webhook: {
				lastEventAt: events[0]?.createdAt || null,
				recent: events,
			},
		};

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('[Dashboard] Error building dashboard:', error);
		return new Response(
			JSON.stringify({ error: 'Failed to load dashboard' }),
			{ status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
		);
	}
}
