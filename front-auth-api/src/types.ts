export interface Env {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  FRONTEND_URL: string;
  API_MULTI_URL?: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_WEBHOOK_SECRET: string;
  TOKENS_KV: KVNamespace;
  USAGE_KV: KVNamespace;
  DB: D1Database;
  dream_api_assets?: R2Bucket;
}

export type PlatformPlan = 'free' | 'paid';
