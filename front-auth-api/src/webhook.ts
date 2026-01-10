/// <reference types="@cloudflare/workers-types" />
import { createClerkClient } from '@clerk/backend';
import Stripe from 'stripe';
import { Env, SubscriptionStatus } from './types';

// ============================================================================
// SUBSCRIPTION ENFORCEMENT CONSTANTS
// ============================================================================
// Grace period: Days after subscription ends before API access is blocked
const GRACE_PERIOD_DAYS = 7;

// ============================================================================
// KV CACHE FOR SUBSCRIPTION STATUS
// ============================================================================
// We cache subscription status in KV for fast lookups in api-multi.
// This avoids D1 queries on every API call while ensuring subscription enforcement.
//
// Key format: platform:{platformId}:subscription
// Value: JSON { status, currentPeriodEnd, gracePeriodEnd }
// ============================================================================

interface SubscriptionCache {
    status: SubscriptionStatus;
    currentPeriodEnd: number | null;
    gracePeriodEnd: number | null;
}

/**
 * Write subscription status to KV cache for fast api-multi lookups
 * Called after every D1 update to keep cache in sync
 *
 * IMPORTANT: Writes to BOTH KV namespaces:
 * - TOKENS_KV (front-auth-api's KV) - for consistency
 * - API_MULTI_KV (api-multi's KV) - for enforcement (this is what api-multi reads)
 */
async function cacheSubscriptionStatus(
    env: Env,
    platformId: string,
    status: SubscriptionStatus,
    currentPeriodEnd: number | null
): Promise<void> {
    const gracePeriodEnd = currentPeriodEnd
        ? currentPeriodEnd + (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
        : null;

    const cache: SubscriptionCache = {
        status,
        currentPeriodEnd,
        gracePeriodEnd,
    };

    const cacheJson = JSON.stringify(cache);
    const kvOptions = { expirationTtl: 30 * 24 * 60 * 60 }; // TTL: 30 days

    // Write to BOTH KV namespaces
    await Promise.all([
        env.TOKENS_KV.put(`platform:${platformId}:subscription`, cacheJson, kvOptions),
        env.API_MULTI_KV.put(`platform:${platformId}:subscription`, cacheJson, kvOptions),
    ]);

    console.log(`[Subscription Cache] Updated ${platformId} in BOTH KVs: ${status}, grace ends: ${gracePeriodEnd ? new Date(gracePeriodEnd).toISOString() : 'N/A'}`);
}

async function getPlatformIdFromDb(userId: string, env: Env): Promise<string | null> {
    const row = await env.DB.prepare('SELECT platformId FROM platforms WHERE clerkUserId = ?')
        .bind(userId)
        .first<{ platformId: string }>();
    return row?.platformId ?? null;
}

async function getPlatformIdByStripeCustomer(customerId: string, env: Env): Promise<string | null> {
    const row = await env.DB.prepare('SELECT platformId FROM platforms WHERE stripeCustomerId = ?')
        .bind(customerId)
        .first<{ platformId: string }>();
    return row?.platformId ?? null;
}

/**
 * Update platform subscription status in D1
 */
async function updatePlatformSubscription(
    env: Env,
    platformId: string,
    data: {
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
        subscriptionStatus?: SubscriptionStatus;
        trialEndsAt?: number | null;
        currentPeriodEnd?: number | null;
    }
): Promise<void> {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.stripeCustomerId !== undefined) {
        updates.push('stripeCustomerId = ?');
        values.push(data.stripeCustomerId);
    }
    if (data.stripeSubscriptionId !== undefined) {
        updates.push('stripeSubscriptionId = ?');
        values.push(data.stripeSubscriptionId);
    }
    if (data.subscriptionStatus !== undefined) {
        updates.push('subscriptionStatus = ?');
        values.push(data.subscriptionStatus);
    }
    if (data.trialEndsAt !== undefined) {
        updates.push('trialEndsAt = ?');
        values.push(data.trialEndsAt);
    }
    if (data.currentPeriodEnd !== undefined) {
        updates.push('currentPeriodEnd = ?');
        values.push(data.currentPeriodEnd);
    }

    if (updates.length === 0) return;

    values.push(platformId);
    await env.DB.prepare(`UPDATE platforms SET ${updates.join(', ')} WHERE platformId = ?`)
        .bind(...values)
        .run();
}

async function isEventProcessed(eventId: string, env: Env): Promise<boolean> {
    const row = await env.DB.prepare('SELECT eventId FROM events WHERE eventId = ?')
        .bind(eventId)
        .first<{ eventId: string }>();
    return !!row;
}

async function recordEvent(
    eventId: string,
    platformId: string | null,
    type: string,
    source: string,
    payloadJson: string,
    env: Env
) {
    await env.DB.prepare(
        'INSERT INTO events (platformId, source, type, eventId, payload_json) VALUES (?, ?, ?, ?, ?)'
    )
        .bind(platformId, source, type, eventId, payloadJson)
        .run();
}

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
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-11-17.clover',
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
    } catch (err: any) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { status: 400 });
    }

    // ============================================================================
    // IDEMPOTENCY CHECK (D1 events table)
    // ============================================================================
    let derivedUserId: string | null = null;
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        derivedUserId = session.client_reference_id || (session.metadata?.userId as string | undefined) || null;
    } else if (
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.deleted'
    ) {
        const subscription = event.data.object as Stripe.Subscription;
        derivedUserId = (subscription.metadata?.userId as string | undefined) || null;
    }

    const platformId = derivedUserId ? await getPlatformIdFromDb(derivedUserId, env) : null;
    const alreadyProcessed = await isEventProcessed(event.id, env);

    if (alreadyProcessed) {
        console.log(`⏭️ Event ${event.id} already processed (idempotent), returning success`);
        return new Response(JSON.stringify({ received: true, idempotent: true }), { status: 200 });
    }

    const clerkClient = createClerkClient({
        secretKey: env.CLERK_SECRET_KEY,
        publishableKey: env.CLERK_PUBLISHABLE_KEY
    });

    // Handle different event types
    switch (event.type) {
        case 'checkout.session.completed': {
            // For checkout, userId is in client_reference_id
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.client_reference_id || session.metadata?.userId;

            if (!userId) {
                console.error('No userId in checkout session');
                return new Response(JSON.stringify({ error: 'No userId' }), { status: 400 });
            }

            // Get tier from session metadata (sent during checkout)
            const tier = session.metadata?.tier || 'paid';

            // Update Clerk user metadata with purchased tier
            try {
                await clerkClient.users.updateUserMetadata(userId, {
                    publicMetadata: {
                        plan: tier,
                        stripeCustomerId: session.customer as string,
                    },
                });
                console.log(`Updated user ${userId} to ${tier} plan after checkout`);

                // Also update D1 platforms table
                const userPlatformId = await getPlatformIdFromDb(userId, env);
                if (userPlatformId && session.subscription) {
                    // Fetch the subscription to get actual status (trialing vs active)
                    const sub = await stripe.subscriptions.retrieve(session.subscription as string) as Stripe.Subscription;

                    let status: SubscriptionStatus;
                    switch (sub.status) {
                        case 'trialing': status = 'trialing'; break;
                        case 'active': status = 'active'; break;
                        case 'past_due': status = 'past_due'; break;
                        default: status = 'active';
                    }

                    const trialEnd = sub.trial_end ? sub.trial_end * 1000 : null;
                    // Handle null current_period_end (can happen during trial operations)
                    const periodEnd = (sub as any).current_period_end
                        ? (sub as any).current_period_end * 1000
                        : (trialEnd || Date.now() + 14 * 24 * 60 * 60 * 1000);

                    await updatePlatformSubscription(env, userPlatformId, {
                        stripeCustomerId: session.customer as string,
                        stripeSubscriptionId: session.subscription as string,
                        subscriptionStatus: status,
                        trialEndsAt: trialEnd,
                        currentPeriodEnd: periodEnd,
                    });

                    // Cache subscription status in KV for fast api-multi lookups
                    await cacheSubscriptionStatus(env, userPlatformId, status, periodEnd);

                    console.log(`Updated platform ${userPlatformId} with subscription: ${status}, trial ends: ${trialEnd}`);
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                console.error(`Failed to update user ${userId}:`, msg);
                return new Response(
                    JSON.stringify({ error: 'Failed to update user metadata', details: msg }),
                    { status: 500 }
                );
            }
            break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            const subUserId = subscription.metadata?.userId;
            const customerId = subscription.customer as string;

            // Map Stripe status to our status
            let status: SubscriptionStatus;
            switch (subscription.status) {
                case 'trialing': status = 'trialing'; break;
                case 'active': status = 'active'; break;
                case 'past_due': status = 'past_due'; break;
                case 'canceled':
                case 'unpaid': status = 'canceled'; break;
                default: status = 'active';
            }

            const trialEnd = subscription.trial_end ? subscription.trial_end * 1000 : null;
            // Handle null current_period_end (can happen during trial operations)
            const periodEnd = (subscription as any).current_period_end
                ? (subscription as any).current_period_end * 1000
                : (trialEnd || Date.now() + 14 * 24 * 60 * 60 * 1000);

            // Update D1 first (by customer ID if we have it)
            let subPlatformId = await getPlatformIdByStripeCustomer(customerId, env);
            if (!subPlatformId && subUserId) {
                subPlatformId = await getPlatformIdFromDb(subUserId, env);
            }

            if (subPlatformId) {
                await updatePlatformSubscription(env, subPlatformId, {
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: subscription.id,
                    subscriptionStatus: status,
                    trialEndsAt: trialEnd,
                    currentPeriodEnd: periodEnd,
                });

                // Cache subscription status in KV for fast api-multi lookups
                await cacheSubscriptionStatus(env, subPlatformId, status, periodEnd);

                console.log(`Updated platform ${subPlatformId} subscription: ${status}`);
            }

            // Update Clerk if we have userId
            if (subUserId) {
                const subTier = subscription.metadata?.tier || 'paid';
                try {
                    await clerkClient.users.updateUserMetadata(subUserId, {
                        publicMetadata: {
                            plan: status === 'canceled' ? 'free' : subTier,
                            stripeCustomerId: customerId,
                            subscriptionId: subscription.id,
                        },
                    });
                    console.log(`Updated user ${subUserId} to ${subTier} plan`);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Unknown error';
                    console.error(`Failed to update user ${subUserId}:`, msg);
                }
            }
            break;
        }

        case 'customer.subscription.deleted': {
            const deletedSubscription = event.data.object as Stripe.Subscription;
            const deletedUserId = deletedSubscription.metadata?.userId;
            const deletedCustomerId = deletedSubscription.customer as string;

            // Update D1
            let deletedPlatformId = await getPlatformIdByStripeCustomer(deletedCustomerId, env);
            if (!deletedPlatformId && deletedUserId) {
                deletedPlatformId = await getPlatformIdFromDb(deletedUserId, env);
            }

            if (deletedPlatformId) {
                // Get current period end before marking as canceled
                const platform = await env.DB.prepare(
                    'SELECT currentPeriodEnd FROM platforms WHERE platformId = ?'
                ).bind(deletedPlatformId).first<{ currentPeriodEnd: number | null }>();

                await updatePlatformSubscription(env, deletedPlatformId, {
                    subscriptionStatus: 'canceled',
                    stripeSubscriptionId: undefined,
                });

                // Cache subscription status in KV - use existing period end for grace calculation
                const periodEnd = platform?.currentPeriodEnd ?? Date.now();
                await cacheSubscriptionStatus(env, deletedPlatformId, 'canceled', periodEnd);

                console.log(`Marked platform ${deletedPlatformId} as canceled`);
            }

            // Downgrade user in Clerk
            if (deletedUserId) {
                try {
                    await clerkClient.users.updateUserMetadata(deletedUserId, {
                        publicMetadata: {
                            plan: 'free',
                        },
                    });
                    console.log(`Downgraded user ${deletedUserId} to free plan`);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Unknown error';
                    console.error(`Failed to downgrade user ${deletedUserId}:`, msg);
                }
            }
            break;
        }

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed in D1
    await recordEvent(
        event.id,
        platformId,
        event.type,
        'stripe-webhook',
        body,
        env
    );

    return new Response(JSON.stringify({ received: true }), { status: 200 });
}
