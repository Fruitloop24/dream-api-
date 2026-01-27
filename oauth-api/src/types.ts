export interface Env {
  PLATFORM_TOKENS_KV: KVNamespace;
  CUSTOMER_TOKENS_KV: KVNamespace;
  DB: D1Database;
  STRIPE_CLIENT_ID: string;
  STRIPE_CLIENT_SECRET: string;  // Platform's live secret key (for OAuth token exchange)
  // Platform Stripe keys for API calls on behalf of connected accounts
  // Mode is determined by which key we use (not by OAuth token)
  STRIPE_SECRET_KEY_TEST?: string;  // sk_test_xxx - for creating test products
  STRIPE_SECRET_KEY_LIVE?: string;  // sk_live_xxx - for creating live products
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  FRONTEND_URL: string;
  CLERK_JWT_TEMPLATE?: string;
  ALLOWED_ORIGINS?: string; // Comma-separated list of allowed origins
}

export type ProjectType = 'saas' | 'store';
