export interface Env {
  PLATFORM_TOKENS_KV: KVNamespace;
  CUSTOMER_TOKENS_KV: KVNamespace;
  DB: D1Database;
  STRIPE_CLIENT_ID: string;
  STRIPE_CLIENT_SECRET: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  FRONTEND_URL: string;
  CLERK_JWT_TEMPLATE?: string;
  ALLOWED_ORIGINS?: string; // Comma-separated list of allowed origins
}

export type ProjectType = 'saas' | 'store';
