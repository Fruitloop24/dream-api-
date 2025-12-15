export interface Env {
  PLATFORM_TOKENS_KV: KVNamespace;
  CUSTOMER_TOKENS_KV: KVNamespace;
  DB: D1Database;
  STRIPE_CLIENT_ID: string;
  STRIPE_CLIENT_SECRET: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  FRONTEND_URL: string;
}

export type ProjectType = 'saas' | 'store';
