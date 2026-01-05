export interface Env {
  // Clerk
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_WEBHOOK_SECRET: string;

  // URLs
  FRONTEND_URL: string;
  API_MULTI_URL?: string;

  // Stripe - Platform billing
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;              // $19/mo base subscription
  STRIPE_PRICE_ID_METERED?: string;     // $0.03/user overage (optional)
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_METER_EVENT_NAME?: string;     // Billing meter name (optional)

  // Billing config
  INCLUDED_USERS?: string;              // "2000" - users included in base price
  OVERAGE_RATE?: string;                // "0.03" - per-user overage rate

  // Bindings
  TOKENS_KV: KVNamespace;
  USAGE_KV: KVNamespace;
  DB: D1Database;
  dream_api_assets?: R2Bucket;
  ASSETS?: R2Bucket;                    // Alias for R2
}

export type PlatformPlan = 'free' | 'paid';

export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';

export interface Platform {
  platformId: string;
  clerkUserId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: number;
  currentPeriodEnd?: number;
  createdAt: string;
}

export interface PlatformSubscriptionInfo {
  status: SubscriptionStatus;
  trialEndsAt?: number;
  currentPeriodEnd?: number;
  liveEndUserCount: number;
  includedUsers: number;
  overageRate: number;
  estimatedOverage: number;
}
