import { createClerkClient } from '@clerk/backend';
import Stripe from 'stripe';
import { Env } from './types';
import { getPlatformFromPublishableKey, isEventProcessed, recordEvent, upsertSubscription, decrementInventory, getModeForPublishableKey, ensureStripeTokenSchema } from './services/d1';

async function resolvePlatformId(env: Env, publishableKey: string | undefined | null): Promise<string | null> {
	if (!publishableKey) return null;
	const fromKv = await env.TOKENS_KV.get(`publishablekey:${publishableKey}:platformId`);
	if (fromKv) return fromKv;
	const fromDb = await getPlatformFromPublishableKey(env, publishableKey);
	if (fromDb) {
		await env.TOKENS_KV.put(`publishablekey:${publishableKey}:platformId`, fromDb);
	}
	return fromDb ?? null;
}

async function getDevStripeToken(platformId: string, env: Env, mode: string = 'live'): Promise<{ accessToken: string; stripeUserId: string } | null> {
	const stripeDataJson =
		(await env.TOKENS_KV.get(`platform:${platformId}:stripeToken:${mode}`)) ||
		(await env.TOKENS_KV.get(`platform:${platformId}:stripeToken`));
	if (stripeDataJson) return JSON.parse(stripeDataJson) as { accessToken: string; stripeUserId: string };

	await ensureStripeTokenSchema(env);
	const row = await env.DB.prepare(
		'SELECT accessToken, stripeUserId FROM stripe_tokens WHERE platformId = ? AND (mode = ? OR mode IS NULL) ORDER BY createdAt DESC LIMIT 1'
	)
		.bind(platformId, mode)
		.first<{ accessToken: string; stripeUserId: string }>();
	return row ?? null;
}

async function fetchLineItems(sessionId: string, accessToken: string): Promise<Array<{ priceId: string; quantity: number }>> {
	const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!resp.ok) {
		const errText = await resp.text();
		throw new Error(`Failed to fetch line items: ${errText}`);
	}

	const data = await resp.json() as { data?: Array<{ price?: { id?: string } | string; quantity?: number }> };
	const items = (data.data || []).map((li) => {
		const priceId = typeof li.price === 'string' ? li.price : li.price?.id;
		return { priceId: priceId || '', quantity: li.quantity || 1 };
	}).filter((li) => li.priceId);

	return items;
}

/**
 * ============================================================================
 * STRIPE CONNECT WEBHOOK - Handles events from ALL connected accounts
 * ============================================================================
 *
 * This webhook receives events from your DEVs' Stripe accounts (via Connect).
 * One endpoint, one signing secret, all connected accounts.
 *
 * The event.account field tells us which connected account the event is from.
 * We can use this to look up the platformId and update the right customer.
 *
 * Events we care about:
 * - checkout.session.completed → Customer paid, update plan
 * - customer.subscription.updated → Plan changed
 * - customer.subscription.deleted → Downgrade to free
 *
 * Future dashboard events:
 * - invoice.paid → Track MRR
 * - invoice.payment_failed → Alert dev
 * ============================================================================
 */

export async function handleStripeWebhook(
	request: Request,
	env: Env
): Promise<Response> {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		return new Response(JSON.stringify({ error: 'No signature' }), { status: 400 });
	}

	// Verify webhook signature
	// NOTE: We use a placeholder key here because constructEventAsync only needs
	// the webhook signing secret (not the API key) for signature verification.
	// The Stripe client is just used for its crypto utilities.
	const stripe = new Stripe('sk_placeholder_for_webhook_verification', {
		apiVersion: '2025-09-30.clover',
	});

	let event: Stripe.Event;
	try {
		// Require webhook secret in production (fail hard if missing)
		if (!env.STRIPE_WEBHOOK_SECRET) {
			console.error('❌ STRIPE_WEBHOOK_SECRET required - webhook signature verification mandatory');
			return new Response(
				JSON.stringify({ error: 'Webhook secret not configured' }),
				{ status: 500 }
			);
		}

		// Verify the webhook signature (ASYNC for Cloudflare Workers)
		// Cloudflare Workers use SubtleCrypto which requires async context
		event = await stripe.webhooks.constructEventAsync(
			body,
			signature,
			env.STRIPE_WEBHOOK_SECRET
		);
		console.log('✅ Webhook signature verified');
	} catch (err: unknown) { // Changed 'any' to 'unknown'
		console.error('❌ Webhook signature verification failed:', (err as Error).message); // Type assertion
		return new Response(JSON.stringify({ error: `Webhook Error: ${(err as Error).message}` }), { status: 400 });
	}

	// ============================================================================
	// IDEMPOTENCY CHECK
	// ============================================================================
	const alreadyProcessed = await isEventProcessed(env, event.id);
	if (alreadyProcessed) {
		console.log(`⏭️ Event ${event.id} already processed (idempotent), returning success`);
		return new Response(JSON.stringify({ received: true, idempotent: true }), { status: 200 });
	}

	const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
	let eventPlatformId: string | null = null;

	// Handle different event types
	switch (event.type) {
		case 'checkout.session.completed': {
			// For checkout, userId is in client_reference_id
			const session = event.data.object as Stripe.Checkout.Session;
			const userId = session.client_reference_id || session.metadata?.userId;

			console.log(`[Webhook] checkout.session.completed - userId: ${userId}`);
			console.log(`[Webhook] session metadata:`, JSON.stringify(session.metadata));

			// Subscription checkout
			if (session.mode === 'subscription') {
				if (!userId) {
					console.error('No userId in checkout session');
					return new Response(JSON.stringify({ error: 'No userId' }), { status: 400 });
				}

				// Get tier from session metadata (sent during checkout)
				const tier = session.metadata?.tier;
				if (!tier) {
					console.error('❌ No tier metadata in checkout session');
					return new Response(JSON.stringify({ error: 'Missing tier metadata' }), { status: 400 });
				}

				console.log(`[Webhook] Attempting to update user ${userId} to plan: ${tier}`);
				console.log(`[Webhook] Clerk secret key exists: ${!!env.CLERK_SECRET_KEY}`);

				// Update Clerk user metadata with purchased tier
				try {
					// Fetch existing metadata to preserve publishableKey
					const existingUser = await clerkClient.users.getUser(userId);
					const existingPk = existingUser.publicMetadata?.publishableKey as string | undefined;
					const pkFromSession = session.metadata?.publishableKey as string | undefined;
					const publishableKey = existingPk || pkFromSession;
					eventPlatformId = await resolvePlatformId(env, publishableKey);

					await clerkClient.users.updateUserMetadata(userId, {
						publicMetadata: {
							...existingUser.publicMetadata,
							plan: tier,
							stripeCustomerId: session.customer as string,
							...(publishableKey ? { publishableKey } : {}),
						},
					});
					console.log(`✅ Updated user ${userId} to ${tier} plan after checkout`);

					// Upsert subscription snapshot (if we can resolve platform)
					if (eventPlatformId) {
						await upsertSubscription(env, {
							platformId: eventPlatformId,
							userId,
							publishableKey: publishableKey || null,
							subscriptionId: (session.subscription as string) || null,
							stripeCustomerId: (session.customer as string) || null,
							plan: tier,
							amount: session.amount_total ?? null,
							currency: session.currency ?? null,
							status: 'active',
							priceId: (session.metadata as any)?.priceId ?? null,
							productId: null,
							currentPeriodEnd: null,
							canceledAt: null,
							cancelReason: null,
						});
					} else {
						console.warn(`[Webhook] Could not resolve platformId for pk ${publishableKey}, skipping subscription upsert`);
					}
				} catch (err: unknown) { // Changed 'any' to 'unknown'
					const error = err as Error;
					console.error(`❌ Failed to update user ${userId}:`, error.message);
					console.error(`❌ Full error:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
					return new Response(
						JSON.stringify({ error: 'Failed to update user metadata', details: error.message }),
						{ status: 500 }
					);
				}
			}

			// One-off checkout: decrement inventory
			if (session.mode === 'payment') {
				const publishableKey = session.metadata?.publishableKey as string | undefined;
				eventPlatformId = await resolvePlatformId(env, publishableKey);
				const eventMode = (await getModeForPublishableKey(env, publishableKey || '')) || (publishableKey?.startsWith('pk_test_') ? 'test' : 'live');
				if (!eventPlatformId) {
					console.warn('[Webhook] No platformId resolved for one-off checkout');
					break;
				}

				const stripeToken = await getDevStripeToken(eventPlatformId, env, eventMode);
				if (!stripeToken) {
					console.warn('[Webhook] No Stripe token for platform during one-off inventory update');
					break;
				}

				const items = await fetchLineItems(session.id, stripeToken.accessToken);
				if (items.length === 0) {
					console.warn('[Webhook] No line items found for one-off session');
					break;
				}

				await decrementInventory(env, eventPlatformId, items, eventMode);
				console.log(`[Webhook] Decremented inventory for platform ${eventPlatformId}`, items);
			}
			break;
		}

		case 'customer.subscription.created':
		case 'customer.subscription.updated': {
			// Extract customer metadata (should include userId)
			const subscription = event.data.object as Stripe.Subscription;
			const subUserId = subscription.metadata?.userId;

			if (!subUserId) {
				console.error('No userId in subscription metadata');
				return new Response(JSON.stringify({ error: 'No userId' }), { status: 400 });
			}

			// Get tier from subscription metadata
			// IMPORTANT: Should always be present - if not, fail explicitly
			const subTier = subscription.metadata?.tier;
			if (!subTier) {
				console.error('❌ No tier metadata in subscription');
				return new Response(JSON.stringify({ error: 'Missing tier metadata' }), { status: 400 });
			}

			// Update Clerk user metadata with subscription tier
			try {
				const existingUser = await clerkClient.users.getUser(subUserId);
				const existingPk = existingUser.publicMetadata?.publishableKey as string | undefined;
				const pkFromSub = subscription.metadata?.publishableKey as string | undefined;
				const publishableKey = existingPk || pkFromSub;
				eventPlatformId = await resolvePlatformId(env, publishableKey);

				await clerkClient.users.updateUserMetadata(subUserId, {
					publicMetadata: {
						...existingUser.publicMetadata,
						plan: subTier,
						stripeCustomerId: subscription.customer as string,
						subscriptionId: subscription.id,
						...(publishableKey ? { publishableKey } : {}),
					},
				});
				console.log(`✅ Updated user ${subUserId} to ${subTier} plan`);

				const item = subscription.items.data[0];
				const price = item?.price;
				const priceId = price?.id ?? null;
				const productId = typeof price?.product === 'string' ? price.product : price?.product?.id ?? null;
				const amount = price?.unit_amount ?? null;
				const currency = price?.currency ?? null;
				const currentPeriodEndUnix =
					subscription.current_period_end ||
					item?.current_period_end || // fallback if subscription.current_period_end missing
					null;
				const currentPeriodEnd = currentPeriodEndUnix
					? new Date(currentPeriodEndUnix * 1000).toISOString()
					: null;
				const canceledAt = subscription.canceled_at
					? new Date(subscription.canceled_at * 1000).toISOString()
					: null;

				if (eventPlatformId) {
					await upsertSubscription(env, {
						platformId: eventPlatformId,
						userId: subUserId,
						publishableKey: publishableKey || null,
						subscriptionId: subscription.id,
						stripeCustomerId: subscription.customer as string,
						plan: subTier,
						priceId,
						productId,
						amount: amount ?? null,
						currency: currency ?? null,
						status: subscription.status,
						currentPeriodEnd,
						canceledAt,
						cancelReason: (subscription.cancellation_details as any)?.comment ?? null,
					});
				} else {
					console.warn(`[Webhook] Could not resolve platformId for pk ${publishableKey}, skipping subscription upsert`);
				}
			} catch (err: unknown) { // Changed 'any' to 'unknown'
				console.error(`❌ Failed to update user ${subUserId}:`, (err as Error).message); // Type assertion
				return new Response(
					JSON.stringify({ error: 'Failed to update user metadata' }),
					{ status: 500 }
				);
			}
			break;
		}

		case 'customer.subscription.deleted': {
			const deletedSubscription = event.data.object as Stripe.Subscription;
			const deletedUserId = deletedSubscription.metadata?.userId;

			if (!deletedUserId) {
				console.error('No userId in deleted subscription metadata');
				return new Response(JSON.stringify({ error: 'No userId' }), { status: 400 });
			}

			// Downgrade user back to free
			try {
				await clerkClient.users.updateUser(deletedUserId, {
					publicMetadata: {
						plan: 'free',
					},
				});
				console.log(`✅ Downgraded user ${deletedUserId} to free plan`);

				const publishableKey = deletedSubscription.metadata?.publishableKey as string | undefined;
				eventPlatformId = await resolvePlatformId(env, publishableKey);

				const item = deletedSubscription.items.data[0];
				const price = item?.price;
				const priceId = price?.id ?? null;
				const productId = typeof price?.product === 'string' ? price.product : price?.product?.id ?? null;
				const amount = price?.unit_amount ?? null;
				const currency = price?.currency ?? null;
				const canceledAt = deletedSubscription.canceled_at
					? new Date(deletedSubscription.canceled_at * 1000).toISOString()
					: new Date().toISOString();

				if (eventPlatformId) {
					await upsertSubscription(env, {
						platformId: eventPlatformId,
						userId: deletedUserId,
						publishableKey: publishableKey || null,
						subscriptionId: deletedSubscription.id,
						stripeCustomerId: deletedSubscription.customer as string,
						plan: 'free',
						priceId,
						productId,
						amount: amount ?? null,
						currency: currency ?? null,
						status: 'canceled',
						currentPeriodEnd: null,
						canceledAt,
						cancelReason: (deletedSubscription.cancellation_details as any)?.comment ?? 'canceled',
					});
				} else {
					console.warn(`[Webhook] Could not resolve platformId for pk ${publishableKey}, skipping subscription cancel upsert`);
				}
			} catch (err: unknown) { // Changed 'any' to 'unknown'
				console.error(`❌ Failed to downgrade user ${deletedUserId}:`, (err as Error).message); // Type assertion
				return new Response(
					JSON.stringify({ error: 'Failed to update user metadata' }),
					{ status: 500 }
				);
			}
			break;
		}

		default:
			console.log(`Unhandled event type: ${event.type}`);
	}

	// Record event for idempotency/audit in D1
	await recordEvent(env, event.id, eventPlatformId, event.type, 'stripe-webhook', body);

	return new Response(JSON.stringify({ received: true }), { status: 200 });
}
