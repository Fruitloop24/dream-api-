import { Env } from '../types';
import { getAllTiers } from '../config/configLoader';
import { buildStripeHeaders, getDevStripeToken } from './checkout';
import { ensureTierSchema } from '../services/d1';

type CartItem = {
  productId?: string;
  priceId?: string;
  tier?: string;
  quantity?: number;
};

/**
 * List one-off products for a platform (uses tier config).
 */
export async function handleGetProducts(
  env: Env,
  platformId: string,
  corsHeaders: Record<string, string>,
  mode: string = 'live'
): Promise<Response> {
  await ensureTierSchema(env);
  const tiers = await getAllTiers(env, platformId, mode);
  const products = tiers
    .filter((t) => (t.billingMode || 'subscription') === 'one_off')
    .map((t) => ({
      id: t.productId || t.id || t.name,
      key: t.id || t.name,
      name: t.name,
      displayName: t.displayName || t.name,
      description: t.description || '',
      price: t.price,
      currency: 'usd',
      imageUrl: t.imageUrl || null,
      inventory: typeof t.inventory === 'number' ? t.inventory : null,
      soldOut: t.soldOut || (typeof t.inventory === 'number' ? t.inventory <= 0 : false),
      priceId: t.priceId,
      productId: t.productId,
      features: Array.isArray(t.features) ? t.features : t.features ? [t.features] : [],
    }));

  return new Response(JSON.stringify({ products }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create a Stripe Checkout session for a cart of one-off items.
 */
export async function handleCartCheckout(
  platformId: string,
  publishableKey: string,
  env: Env,
  corsHeaders: Record<string, string>,
  origin: string,
  request: Request,
  mode: string = 'live'
): Promise<Response> {
  try {
    await ensureTierSchema(env);
    const body = await request.json().catch(() => ({})) as {
      email?: string;
      successUrl?: string;
      cancelUrl?: string;
      items?: CartItem[];
    };

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return new Response(
        JSON.stringify({ error: 'No items provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tiers = await getAllTiers(env, platformId, mode);
    const oneOffs = tiers.filter((t) => (t.billingMode || 'subscription') === 'one_off');

    const indexByKey = new Map<string, typeof oneOffs[number]>();
    for (const p of oneOffs) {
      if (p.productId) indexByKey.set(p.productId, p);
      if (p.priceId) indexByKey.set(p.priceId, p);
      indexByKey.set(p.id || p.name, p);
      indexByKey.set((p.id || p.name).toLowerCase(), p);
      if (p.name) indexByKey.set(p.name.toLowerCase(), p);
    }

    const lineItems: { price: string; quantity: string }[] = [];

    for (const item of items) {
      const key = item.priceId || item.productId || item.tier || '';
      const product = indexByKey.get(key) || indexByKey.get(key.toLowerCase());
      if (!product || !product.priceId) {
        return new Response(
          JSON.stringify({ error: `Invalid item: ${key || 'unknown'}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (product.soldOut || (typeof product.inventory === 'number' && product.inventory <= 0)) {
        return new Response(
          JSON.stringify({ error: `Item sold out: ${product.displayName || product.name}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const quantity = item.quantity && item.quantity > 0 ? Math.min(item.quantity, 99) : 1;
      if (typeof product.inventory === 'number' && quantity > product.inventory) {
        return new Response(
          JSON.stringify({ error: `Not enough inventory for ${product.displayName || product.name}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      lineItems.push({
        price: product.priceId,
        quantity: quantity.toString(),
      });
    }

    const devStripeData = await getDevStripeToken(platformId, env, mode);
    if (!devStripeData) {
      throw new Error('Developer has not connected their Stripe account');
    }

    const baseUrl = origin || 'https://app.panacea-tech.net';
    const successUrl = body.successUrl || `${baseUrl}/cart?success=true`;
    const cancelUrl = body.cancelUrl || `${baseUrl}/cart?canceled=true`;

    const stripeHeaders = buildStripeHeaders(devStripeData, env);
    const params = new URLSearchParams({
      'mode': 'payment',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      ...(body.email ? { 'customer_email': body.email } : {}),
      'metadata[publishableKey]': publishableKey,
      'metadata[platformId]': platformId,
    });
    lineItems.forEach((item, idx) => {
      params.set(`line_items[${idx}][price]`, item.price);
      params.set(`line_items[${idx}][quantity]`, item.quantity);
    });

    const sessionResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: stripeHeaders,
      body: params.toString(),
    });

    const session = await sessionResp.json() as { url?: string; error?: { message: string } };
    if (!sessionResp.ok) {
      throw new Error(session.error?.message || 'Failed to create checkout session');
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Cart] Checkout error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to create cart checkout' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
