import { Env } from '../types';

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
};

type EventRow = {
	type: string;
	createdAt: string;
};

export async function handleDashboard(
	env: Env,
	platformId: string,
	corsHeaders: Record<string, string>
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
		const subsResult = await env.DB.prepare(
			'SELECT userId, plan, status, currentPeriodEnd, canceledAt, priceId, productId, amount, currency FROM subscriptions WHERE platformId = ?'
		)
			.bind(platformId)
			.all<SubscriptionRow>();
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
			'SELECT clerkUserId as userId, email, status, createdAt FROM end_users WHERE platformId = ?'
		)
			.bind(platformId)
			.all<EndUserRow>();
		const users = usersResult.results || [];

		// Latest API key (for pk)
		const keyResult = await env.DB.prepare(
			'SELECT publishableKey, secretKeyHash FROM api_keys WHERE platformId = ? ORDER BY createdAt DESC LIMIT 1'
		)
			.bind(platformId)
			.first<ApiKeyRow>();

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

		const customers = subscriptions.map((sub) => {
			const u = usageMap.get(sub.userId);
			const e = userMap.get(sub.userId);
			const plan = sub.plan || u?.plan || 'free';
			const limit =
				tierLimitByName[plan] ||
				(typeof plan === 'string' ? tierLimitByName[plan.toLowerCase()] : undefined) ||
				0;
			return {
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
			};
		});

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
